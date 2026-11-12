#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { appendFileSync, existsSync, readFileSync, realpathSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

// GitHub inputs are untrusted data, never shell fragments. Keep invocation shell-free.
function integer(name, fallback, minimum, maximum) {
  const raw = process.env[name] ?? String(fallback);
  if (!/^(0|[1-9]\d*)$/.test(raw)) throw new Error(`${name} must be an unsigned decimal integer`);
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${name} must be between ${minimum} and ${maximum}`);
  }
  return String(value);
}
function inside(root, target) {
  const relative = path.relative(root, target);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}
function checkPath(root, target) {
  if (!inside(root, target)) throw new Error('Output directory must be a child of the caller workspace');
  // Resolve the deepest existing ancestor to reject symlink escapes before running the CLI.
  let ancestor = target;
  while (!existsSync(ancestor)) ancestor = path.dirname(ancestor);
  const actual = realpathSync(ancestor);
  if (actual !== root && !inside(root, actual)) throw new Error('Output directory traverses a symlink outside the workspace');
}
function execute(command, args, cwd) {
  const result = spawnSync(command, args, { cwd, encoding: 'utf8', shell: false, maxBuffer: 32 * 1024 * 1024 });
  if (result.stderr) process.stderr.write(result.stderr);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${path.basename(command)} failed with exit ${result.status}: ${result.stdout ?? ''}`);
  return result.stdout;
}
function emitOutput(name, value) {
  const text = String(value);
  let delimiter;
  do { delimiter = `fusion_${randomUUID()}`; } while (text.split(/\r?\n/).includes(delimiter));
  appendFileSync(process.env.GITHUB_OUTPUT, `${name}<<${delimiter}\n${text}\n${delimiter}\n`);
}
function code(text) {
  return String(text).replace(/[\r\n]/g, ' ').replace(/`/g, '\\`');
}
try {
  const limit = integer('FUSION_LATEST_LIMIT', 12, 1, 100);
  const advisoryLimit = integer('FUSION_ADVISORY_LIMIT', 3, 1, 10);
  const seed = integer('FUSION_SEED_LAST_TURN', 0, 0, 999999998);
  if (!process.env.FUSION_ACTION_PATH || !process.env.GITHUB_WORKSPACE || !process.env.GITHUB_OUTPUT) {
    throw new Error('FUSION_ACTION_PATH, GITHUB_WORKSPACE, and GITHUB_OUTPUT are required');
  }
  const actionPath = realpathSync(process.env.FUSION_ACTION_PATH);
  const workspace = realpathSync(process.env.GITHUB_WORKSPACE);
  const requested = process.env.FUSION_OUTPUT_DIRECTORY ?? 'global-fusion-output';
  if (!requested.trim() || /[\u0000-\u001f\u007f*?\[\]{}!]/.test(requested)) throw new Error('Invalid output directory (control characters and artifact globs are forbidden)');
  const outputDir = path.resolve(workspace, requested);
  checkPath(workspace, outputDir);
  for (const protectedPath of ['src', 'tests', '.github', 'docs', 'skill', 'node_modules', '.git']) {
    const target = path.join(actionPath, protectedPath);
    if (outputDir === target || inside(target, outputDir)) throw new Error('Output directory overlaps protected Action files');
  }
  execute(process.platform === 'win32' ? 'npm.cmd' : 'npm', ['ci', '--ignore-scripts', '--no-audit', '--no-fund'], actionPath);
  const stdout = execute(process.execPath, [path.join(actionPath, 'src/cli.mjs'), 'run', '--output', outputDir, '--limit', limit, '--advisory-limit', advisoryLimit, '--seed-last-turn', seed], workspace);
  let receipt;
  try { receipt = JSON.parse(stdout.trim()); } catch { throw new Error('CLI did not return a valid JSON receipt'); }
  if (!Number.isSafeInteger(receipt.turn) || receipt.turn < 1) throw new Error('Invalid completed turn receipt');
  const outputs = { report: 'report_path', analysis: 'analysis_path', social: 'social_path', manifest: 'manifest_path' };
  // Verify all receipt artifacts before emitting any successful outputs.
  for (const key of [...Object.values(outputs), 'digest_path']) {
    if (typeof receipt[key] !== 'string') throw new Error(`Receipt missing ${key}`);
    const artifact = path.resolve(workspace, receipt[key]);
    if (!inside(outputDir, artifact) || !existsSync(artifact) || !inside(outputDir, realpathSync(artifact))) {
      throw new Error(`Receipt artifact is missing or outside archive: ${key}`);
    }
  }
  const manifest = JSON.parse(readFileSync(receipt.manifest_path, 'utf8'));
  if (manifest.turn !== receipt.turn || manifest.transaction_state !== 'committed' || !Array.isArray(manifest.files)) {
    throw new Error('Manifest is not a committed receipt for this turn');
  }
  for (const file of manifest.files) {
    if (typeof file.path !== 'string') throw new Error('Invalid manifest file path');
    const filename = path.resolve(receipt.digest_path, file.path);
    if (!inside(receipt.digest_path, filename) || !inside(receipt.digest_path, realpathSync(filename))) {
      throw new Error('Manifest file escapes digest directory');
    }
    const bytes = readFileSync(filename);
    if (bytes.length !== file.bytes || createHash('sha256').update(bytes).digest('hex') !== file.sha256) {
      throw new Error(`Manifest integrity check failed: ${file.path}`);
    }
  }
  emitOutput('turn', receipt.turn);
  for (const [name, key] of Object.entries(outputs)) emitOutput(name, path.resolve(workspace, receipt[key]));
  if (process.env.GITHUB_STEP_SUMMARY) {
    const summary = [
      '## Global Fusion Threat Intelligence Digest', '',
      `Completed local archive turn **${receipt.turn}**.`, '',
      ...Object.entries(outputs).map(([name, key]) => `- ${name}: \`${code(receipt[key])}\``), '',
      'Inputs are official public source publications. Severity is operational triage, not a claim of local compromise.',
      'Six social drafts were prepared; nothing was posted. Retain/download the archive before the runner expires.', ''
    ].join('\n');
    appendFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
  process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`Global Fusion Action: ${error.message}\n`);
  process.exitCode = 1;
}
