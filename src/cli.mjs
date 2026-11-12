#!/usr/bin/env node
import { readFileSync, realpathSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { collectIntelligence, runDigest } from './index.mjs';
import { createApiServer } from './api.mjs';
import { startMcpServer } from './mcp.mjs';
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version;
const HELP = `Global Fusion Digest ${version} (Node.js 22+)\n\nUsage:\n  global-fusion run --output DIR [--limit N] [--advisory-limit N] [--seed-last-turn N]\n  global-fusion analyze [--limit N] [--advisory-limit N]\n  global-fusion serve [--host 127.0.0.1] [--port 8787] [--allow-insecure-remote]\n  global-fusion mcp\n  global-fusion --help | --version\n\nSource requests are bounded and official-only. run commits an immutable local\narchive and then advances its counter. analyze, REST, MCP are read-only.\nRemote HTTP requires FUSION_API_TOKEN plus --allow-insecure-remote behind TLS.\nNo social posting or engagement observation is performed.\n`;
export async function main(argv = process.argv.slice(2)) {
  if (!argv.length || ['--help', '-h', 'help'].includes(argv[0])) { process.stdout.write(HELP); return; }
  if (argv[0] === '--version') { process.stdout.write(version + '\n'); return; }
  const [command, ...args] = argv;
  const allowed = {
    run: ['output', 'limit', 'advisory-limit', 'seed-last-turn', 'timeout-ms'],
    analyze: ['limit', 'advisory-limit', 'timeout-ms'],
    serve: ['host', 'port', 'allow-insecure-remote'], mcp: [],
  }[command];
  if (!allowed) throw new Error(`Unknown command ${command}; use --help`);
  const flags = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--help') { process.stdout.write(HELP); return; }
    const name = args[i].startsWith('--') ? args[i].slice(2) : '';
    if (!allowed.includes(name) || Object.hasOwn(flags, name)) throw new Error(`Unknown or duplicate option ${args[i]}`);
    if (name === 'allow-insecure-remote') { flags[name] = true; continue; }
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error(`Missing value for --${name}`);
    flags[name] = args[++i];
  }
  const number = (name, fallback) => {
    if (flags[name] === undefined) return fallback;
    if (!/^\d+$/.test(flags[name])) throw new Error(`--${name} requires a nonnegative integer`);
    return Number(flags[name]);
  };
  const options = { limit: number('limit', 12), advisoryLimit: number('advisory-limit', 3), timeoutMs: number('timeout-ms', 35000) };
  if (command === 'run') {
    if (!flags.output) throw new Error('run requires --output DIR');
    process.stdout.write(JSON.stringify(await runDigest({ ...options, outputDir: flags.output, seedLastTurn: number('seed-last-turn', 0) })) + '\n');
  } else if (command === 'analyze') process.stdout.write(JSON.stringify(await collectIntelligence(options), null, 2) + '\n');
  else if (command === 'mcp') await startMcpServer();
  else {
    const host = flags.host ?? '127.0.0.1', port = number('port', 8787);
    if (!Number.isInteger(port) || port < 0 || port > 65535) throw new Error('--port must be between 0 and 65535');
    const server = createApiServer({ host, allowInsecureRemote: Boolean(flags['allow-insecure-remote']) });
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, host, resolve); });
    process.stderr.write(`Global Fusion read-only API listening on ${host}:${server.address().port}\n`);
    const close = () => { server.close(); setTimeout(() => { server.closeAllConnections(); }, 1000).unref(); };
    process.once('SIGINT', close); process.once('SIGTERM', close);
  }
}
// npm's bin is a symlink. Node resolves import.meta.url to its real target but
// keeps argv[1] as the link, so compare real paths or installed CLIs do nothing.
if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) {
  main().catch(error => {
    process.stderr.write(JSON.stringify({ error: error.message, ...(error.source_status ? { source_status: error.source_status } : {}) }) + '\n');
    process.exitCode = 1;
  });
}
