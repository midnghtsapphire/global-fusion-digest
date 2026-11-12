import test from 'node:test';
import assert from 'node:assert/strict';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
const exec = promisify(execFile);
const cli = new URL('../src/cli.mjs', import.meta.url).pathname;
const preload = new URL('./fixture-preload.mjs', import.meta.url).pathname;
const run = args => exec(process.execPath, ['--import', preload, cli, ...args], { timeout: 20000 });

test('CLI help/version/analyze and run emit machine-readable receipts', async () => {
  assert.match((await run(['--help'])).stdout, /global-fusion run/);
  assert.equal((await run(['--version'])).stdout.trim(), '1.0.0');
  const analysis = JSON.parse((await run(['analyze', '--limit', '1', '--advisory-limit', '0'])).stdout); assert.equal(analysis.recent_kev.length, 1);
  const dir = await mkdtemp(join(tmpdir(), 'fusion-cli-'));
  const result = await run(['run', '--output', dir, '--limit', '2', '--advisory-limit', '1', '--seed-last-turn', '9']);
  assert.equal(result.stderr, ''); const receipt = JSON.parse(result.stdout); assert.equal(receipt.turn, 10);
  for (const key of ['digest_path', 'report_path', 'analysis_path', 'social_path', 'manifest_path']) assert.ok(receipt[key].startsWith(dir));
  assert.equal(JSON.parse(await readFile(receipt.manifest_path, 'utf8')).turn, 10);
});
test('CLI errors fail visibly rather than silently ignore options', async () => {
  for (const args of [['run'], ['analyze', '--limit', '0'], ['analyze', '--limit', '2', '--limit', '3'], ['analyze', '--unknown', '1'], ['serve', '--host', '0.0.0.0']]) {
    await assert.rejects(run(args), e => e.code === 1 && e.stderr.includes('error'));
  }
});
test('SDK client initializes MCP stdio, lists and executes read-only tools', async () => {
  const transport = new StdioClientTransport({ command: process.execPath, args: ['--import', preload, cli, 'mcp'], stderr: 'pipe' });
  const client = new Client({ name: 'fusion-test-client', version: '1.0.0' });
  try {
    await client.connect(transport);
    const list = await client.listTools(); assert.deepEqual(list.tools.map(t => t.name).sort(), ['fusion_collect_intelligence', 'fusion_render_digest']);
    assert.ok(list.tools.every(t => t.annotations.readOnlyHint && !t.annotations.destructiveHint));
    const collected = await client.callTool({ name: 'fusion_collect_intelligence', arguments: { limit: 2, advisoryLimit: 1 } });
    assert.equal(collected.isError, undefined); assert.equal(JSON.parse(collected.content[0].text).catalog_entry_count, 2);
    const rendered = await client.callTool({ name: 'fusion_render_digest', arguments: { turn: 7, limit: 2, advisoryLimit: 1 } });
    const digest = JSON.parse(rendered.content[0].text); assert.equal(digest.turn, 7); assert.equal(digest.publication_state, 'not_published'); assert.equal(digest.engagement, null);
    const invalid = await client.callTool({ name: 'fusion_collect_intelligence', arguments: { limit: 1000 } }); assert.equal(invalid.isError, true);
  } finally { await client.close(); }
});
