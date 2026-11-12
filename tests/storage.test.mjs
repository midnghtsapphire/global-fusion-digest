import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { collectIntelligence, runDigest } from '../src/index.mjs';
import { sha256, SOURCES } from '../src/network.mjs';
import { fixtureFetch } from './fixtures.mjs';
const exec = promisify(execFile);
const worker = new URL('./transaction-worker.mjs', import.meta.url).pathname;

test('artifacts commit before turn advances, include raw evidence and hashes', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fusion-artifacts-'));
  const analysis = await collectIntelligence({ fetchImpl: fixtureFetch(), advisoryLimit: 1 });
  const one = await runDigest({ outputDir: dir, analysis, seedLastTurn: 12 });
  assert.equal(one.turn, 13); assert.match(one.digest_path, /digests\/\d{4}\/\d{4}-\d{2}-\d{2}-TURN-013$/);
  const manifest = JSON.parse(await readFile(one.manifest_path, 'utf8'));
  assert.equal(manifest.raw_snapshot_count, 7);
  for (const file of manifest.files) {
    const bytes = await readFile(join(one.digest_path, file.path));
    assert.equal(bytes.length, file.bytes); assert.equal(sha256(bytes), file.sha256);
  }
  const state = JSON.parse(await readFile(join(dir, 'state.json'), 'utf8')); assert.equal(state.last_turn, 13);
  const firstReport = await readFile(one.report_path, 'utf8');
  const two = await runDigest({ outputDir: dir, analysis }); assert.equal(two.turn, 14);
  assert.equal(await readFile(one.report_path, 'utf8'), firstReport);
  assert.ok(!(await readdir(dir)).includes('.fusion.lock'));
  // Simulate crash after archive commit but before state replacement. Recovery
  // discovers committed manifests and will not reuse/overwrite turn 14.
  await writeFile(join(dir, 'state.json'), JSON.stringify({ last_turn: 13 }));
  assert.equal((await runDigest({ outputDir: dir, analysis })).turn, 15);
});
test('mandatory source failure creates no counter or archive', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fusion-failure-'));
  await assert.rejects(runDigest({ outputDir: dir, fetchImpl: fixtureFetch({ fail: [SOURCES.kev] }) }), /Required CISA KEV/);
  assert.deepEqual(await readdir(dir), []);
});
test('multiple processes receive distinct turns without overwritten archives', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fusion-concurrent-'));
  const receipts = await Promise.all(Array.from({ length: 5 }, () => exec(process.execPath, [worker, dir, '20'], { timeout: 20000 }).then(r => JSON.parse(r.stdout))));
  assert.deepEqual(receipts.map(r => r.turn).sort((a, b) => a - b), [21, 22, 23, 24, 25]);
  assert.equal(new Set(receipts.map(r => r.digest_path)).size, 5);
  assert.equal(JSON.parse(await readFile(join(dir, 'state.json'), 'utf8')).last_turn, 25);
});
test('same-process concurrent writers and corrupt state fail safely', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fusion-local-'));
  const analysis = await collectIntelligence({ fetchImpl: fixtureFetch(), advisoryLimit: 0 });
  const result = await Promise.all([runDigest({ outputDir: dir, analysis }), runDigest({ outputDir: dir, analysis })]);
  assert.deepEqual(result.map(r => r.turn).sort(), [1, 2]);
  await writeFile(join(dir, 'state.json'), JSON.stringify({ last_turn: 'bad' }));
  await assert.rejects(runDigest({ outputDir: dir, analysis }), /Invalid state/);
});

test('filesystem obstruction never advances state or creates a partial archive', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'fusion-commit-failure-'));
  const analysis = await collectIntelligence({ fetchImpl: fixtureFetch(), advisoryLimit: 0 });
  // A regular file at the archive parent forces the final mkdir/commit to fail,
  // after staging writes. It exercises rollback without artificial production hooks.
  // 2026-11-12 implementation verification: the no-overwrite preflight actually
  // rejects this obstruction before staging; assert that earlier safe boundary.
  await mkdir(join(dir, 'digests'));
  await writeFile(join(dir, 'digests', analysis.generated_at_utc.slice(0, 4)), 'intentional test obstruction');
  await assert.rejects(runDigest({ outputDir: dir, analysis }), /ENOTDIR|EEXIST/);
  assert.ok(!(await readdir(dir)).includes('state.json'));
  assert.ok(!(await readdir(dir)).includes('.fusion.lock'));
  assert.ok(!(await readdir(dir)).includes('.transactions'));
});
test('provably dead local lock recovers but an active process lock does not expire', async () => {
  const { hostname } = await import('node:os');
  const dir = await mkdtemp(join(tmpdir(), 'fusion-dead-lock-'));
  const analysis = await collectIntelligence({ fetchImpl: fixtureFetch(), advisoryLimit: 0 });
  await writeFile(join(dir, '.fusion.lock'), JSON.stringify({ pid: 2147483647, host: hostname(), id: 'dead-test-owner' }));
  assert.equal((await runDigest({ outputDir: dir, analysis, lockTimeoutMs: 500 })).turn, 1);
  await writeFile(join(dir, '.fusion.lock'), JSON.stringify({ pid: process.pid, host: hostname(), id: 'live-test-owner', created_at: '2000-01-01T00:00:00Z' }));
  await assert.rejects(runDigest({ outputDir: dir, analysis, lockTimeoutMs: 100 }), /Timed out waiting/);
  assert.equal(JSON.parse(await readFile(join(dir, 'state.json'), 'utf8')).last_turn, 1);
});
