#!/usr/bin/env node
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const runner = fileURLToPath(new URL('./run-action.mjs', import.meta.url));
const repo = path.resolve(path.dirname(runner), '../..');
const cases = [
  { FUSION_LATEST_LIMIT: '1; echo injected' },
  { FUSION_LATEST_LIMIT: '-1' },
  { FUSION_LATEST_LIMIT: '0' },
  { FUSION_LATEST_LIMIT: '101' },
  { FUSION_ADVISORY_LIMIT: '11' },
  { FUSION_ADVISORY_LIMIT: '0' },
  { FUSION_SEED_LAST_TURN: '999999999' },
  { FUSION_SEED_LAST_TURN: '9007199254740991' },
  { FUSION_OUTPUT_DIRECTORY: '../outside-workspace' },
  { FUSION_OUTPUT_DIRECTORY: '/' },
  { FUSION_OUTPUT_DIRECTORY: '.github/archive' },
  { FUSION_OUTPUT_DIRECTORY: '**' },
  { FUSION_OUTPUT_DIRECTORY: 'line\nbreak' }
];
for (const input of cases) {
  const result = spawnSync(process.execPath, [runner], {
    encoding: 'utf8',
    env: { ...process.env, FUSION_ACTION_PATH: repo, GITHUB_WORKSPACE: repo,
      GITHUB_OUTPUT: '/dev/null', FUSION_LATEST_LIMIT: '12', FUSION_ADVISORY_LIMIT: '3',
      FUSION_SEED_LAST_TURN: '0', FUSION_OUTPUT_DIRECTORY: 'safe-action-output', ...input }
  });
  assert.equal(result.status, 1, `Expected rejected input: ${JSON.stringify(input)}`);
  assert.match(result.stderr, /Global Fusion Action:/);
}
console.log(`Action input validation passed (${cases.length} negative cases; no npm/network invocation).`);
