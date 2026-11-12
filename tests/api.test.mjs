import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApiServer, createIntelligenceCache } from '../src/api.mjs';
import { collectIntelligence } from '../src/index.mjs';
import { fixtureFetch } from './fixtures.mjs';

async function withServer(options, fn) {
  const server = createApiServer(options); server.listen(0, '127.0.0.1'); await once(server, 'listening');
  try { await fn(`http://127.0.0.1:${server.address().port}`); } finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
}
test('REST bearer handling, query bounds and read-only digest response', async () => {
  const analysis = await collectIntelligence({ fetchImpl: fixtureFetch(), advisoryLimit: 1 });
  let calls = 0;
  await withServer({ token: 'test-private-token', collect: async () => { calls++; return analysis; } }, async url => {
    assert.equal((await fetch(url + '/health')).status, 401);
    assert.equal((await fetch(url + '/health', { headers: { authorization: 'Bearer incorrect' } })).status, 401);
    const headers = { authorization: 'Bearer test-private-token' };
    assert.equal((await fetch(url + '/health', { headers })).status, 200);
    for (const path of ['/v1/intelligence?limit=101', '/v1/intelligence?limit=-1', '/v1/intelligence?limit=1.5', '/v1/digest?turn=-2', '/v1/intelligence?source=https://evil.test', '/v1/intelligence?limit=1&limit=2', '/v1/intelligence?advisoryLimit=1&advisory-limit=1']) assert.equal((await fetch(url + path, { headers })).status, 400, path);
    assert.equal((await fetch(url + '/v1/intelligence', { method: 'POST', headers })).status, 405);
    assert.equal((await fetch(url + '/missing', { headers })).status, 404);
    const a = await (await fetch(url + '/v1/intelligence?limit=2&advisoryLimit=1', { headers })).json(); assert.equal(a.catalog_entry_count, 2);
    const response = await fetch(url + '/v1/digest?turn=25&limit=2&advisoryLimit=1', { headers });
    assert.match(response.headers.get('content-type'), /utf-8/);
    const digest = await response.json(); assert.equal(digest.turn, 25); assert.ok(digest.report.includes('Turn 25')); assert.equal(Object.keys(digest.social).length, 6); assert.equal(digest.engagement, null);
    assert.equal(calls, 1);
    const spec = await (await fetch(url + '/openapi.json', { headers })).json(); assert.equal(spec.openapi, '3.1.0');
    assert.ok(!JSON.stringify(spec).includes('test-private-token'));
  });
});
test('non-loopback fails closed without auth and explicit transport acknowledgement', () => {
  assert.throws(() => createApiServer({ host: '0.0.0.0' }), /Non-loopback/);
  assert.throws(() => createApiServer({ host: '0.0.0.0', token: 'private' }), /Non-loopback/);
  const server = createApiServer({ host: '0.0.0.0', token: 'private', allowInsecureRemote: true }); server.close();
});
test('REST upstream source failures return 502 and visible source_status', async () => {
  await withServer({ collect: async () => { throw Object.assign(new Error('Required KEV unavailable'), { source_status: [{ name: 'CISA KEV', status: 'error' }] }); } }, async url => {
    const r = await fetch(url + '/v1/intelligence'); assert.equal(r.status, 502); assert.equal((await r.json()).source_status[0].status, 'error');
  });
});
test('cache coalesces inflight work and bounds capacity before starting requests', async () => {
  let finish, calls = 0;
  const cache = createIntelligenceCache({ maxEntries: 1, collect: () => { calls++; return new Promise(resolve => { finish = resolve; }); } });
  const first = cache.get({ limit: 1, advisoryLimit: 0 }); const second = cache.get({ limit: 1, advisoryLimit: 0 });
  await new Promise(resolve => setImmediate(resolve));
  await assert.rejects(cache.get({ limit: 2, advisoryLimit: 0 }), /capacity/); assert.equal(calls, 1);
  finish({ value: 1 }); assert.deepEqual(await first, await second); assert.deepEqual(await cache.get({ limit: 1, advisoryLimit: 0 }), { value: 1 });
});
test('request rate is bounded', async () => {
  await withServer({ rateLimit: 1 }, async url => {
    assert.equal((await fetch(url + '/health')).status, 200); const r = await fetch(url + '/health'); assert.equal(r.status, 429); assert.ok(r.headers.get('retry-after'));
  });
});
