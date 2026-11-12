import { createServer } from 'node:http';
import { timingSafeEqual } from 'node:crypto';
import { collectIntelligence, buildReport, buildSocialDrafts } from './index.mjs';
import { integerOption } from './network.mjs';

export const OPENAPI = {
  openapi: '3.1.0', info: { title: 'Global Fusion Digest', version: '1.0.0', description: 'Read-only official-source intelligence. No turn persistence or publishing.' },
  servers: [{ url: 'http://127.0.0.1:8787' }],
  components: { securitySchemes: { bearerAuth: { type: 'http', scheme: 'bearer' } } },
  security: [{ bearerAuth: [] }, {}],
  paths: Object.fromEntries([
    ['/health', 'Service liveness; does not assert source health', []],
    ['/v1/intelligence', 'Collect source-grounded intelligence', ['limit', 'advisoryLimit']],
    ['/v1/digest', 'Render a read-only digest; does not increment persistent turn state', ['limit', 'advisoryLimit', 'turn']],
    ['/openapi.json', 'Read the API contract', []],
  ].map(([path, summary, parameters]) => [path, { get: {
    summary, parameters: parameters.map(name => ({ name, in: 'query', schema: { type: 'integer', minimum: name === 'limit' ? 1 : 0, maximum: name === 'turn' ? 999999999 : name === 'limit' ? 100 : 10, default: name === 'turn' ? 0 : name === 'limit' ? 12 : 3 } })),
    responses: { 200: { description: 'JSON response' }, 400: { description: 'Invalid request' }, 401: { description: 'Bearer token required when configured' }, 429: { description: 'Request capacity exceeded' }, 502: { description: 'Mandatory KEV source unavailable; source_status included' } },
  } }]))
};
export function createIntelligenceCache({ ttlMs = 60000, maxEntries = 32, collect = collectIntelligence } = {}) {
  integerOption(ttlMs, 'cache ttlMs', 0, 3600000, 60000);
  integerOption(maxEntries, 'cache maxEntries', 1, 100, 32);
  const entries = new Map();
  return {
    async get(options) {
      const key = `${options.limit}:${options.advisoryLimit}`;
      const current = entries.get(key);
      if (current && (current.pending || Date.now() < current.expires)) return current.value;
      entries.delete(key);
      while (entries.size >= maxEntries) {
        const evict = [...entries].find(([, value]) => !value.pending);
        if (!evict) throw Object.assign(new Error('Intelligence cache is at request capacity'), { statusCode: 429 });
        entries.delete(evict[0]);
      }
      const entry = { pending: true, expires: 0 };
      entry.value = Promise.resolve().then(() => collect(options)).then(analysis => {
        entry.pending = false; entry.expires = Date.now() + ttlMs; return analysis;
      }, error => { if (entries.get(key) === entry) entries.delete(key); throw error; });
      entries.set(key, entry);
      return entry.value;
    },
    clear() { entries.clear(); },
  };
}
function equalToken(provided, expected) {
  const a = Buffer.from(provided), b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
const send = (res, status, value) => {
  if (res.destroyed) return;
  const text = JSON.stringify(value) + '\n';
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(text), 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
  res.end(text);
};
export function createApiHandler({ token = process.env.FUSION_API_TOKEN, cache, collect = collectIntelligence, maxConcurrent = 8, rateLimit = 120, rateWindowMs = 60000 } = {}) {
  if (token !== undefined && (typeof token !== 'string' || !token.length)) throw new TypeError('Configured API token must be a nonempty string');
  integerOption(maxConcurrent, 'maxConcurrent', 1, 100, 8);
  integerOption(rateLimit, 'rateLimit', 1, 10000, 120);
  integerOption(rateWindowMs, 'rateWindowMs', 100, 3600000, 60000);
  const intelligenceCache = cache ?? createIntelligenceCache({ collect });
  if (typeof intelligenceCache.get !== 'function') throw new TypeError('cache must provide async get(options)');
  let active = 0, windowStart = Date.now(), requests = 0;
  return async (req, res) => {
    try {
      if (String(req.url).length > 2048) return send(res, 414, { error: 'Request URL too long' });
      if (req.method !== 'GET') { req.resume(); res.setHeader('allow', 'GET'); return send(res, 405, { error: 'Read-only API accepts GET only' }); }
      if (token && !equalToken(req.headers.authorization ?? '', `Bearer ${token}`)) {
        res.setHeader('www-authenticate', 'Bearer'); return send(res, 401, { error: 'Valid bearer token required' });
      }
      // Deliberately global, bounded rate accounting: client-controlled forwarded
      // headers must not create an unbounded IP map or bypass a shared limit.
      if (Date.now() - windowStart >= rateWindowMs) { windowStart = Date.now(); requests = 0; }
      if (++requests > rateLimit) { res.setHeader('retry-after', String(Math.ceil(rateWindowMs / 1000))); return send(res, 429, { error: 'Request rate limit exceeded' }); }
      const url = new URL(req.url, 'http://localhost');
      const path = url.pathname;
      if (path === '/health' && !url.search) return send(res, 200, { status: 'ok', service: 'global-fusion-digest', version: '1.0.0', read_only: true });
      if (path === '/openapi.json' && !url.search) return send(res, 200, { ...OPENAPI, security: token ? [{ bearerAuth: [] }] : [] });
      if (!['/v1/intelligence', '/v1/digest'].includes(path)) return send(res, 404, { error: 'Not found' });
      const allowed = path === '/v1/digest' ? ['limit', 'advisoryLimit', 'advisory-limit', 'turn'] : ['limit', 'advisoryLimit', 'advisory-limit'];
      for (const [key] of url.searchParams) if (!allowed.includes(key) || url.searchParams.getAll(key).length > 1) return send(res, 400, { error: 'Unknown or duplicate query parameter' });
      if (url.searchParams.has('advisoryLimit') && url.searchParams.has('advisory-limit')) return send(res, 400, { error: 'Duplicate advisory limit aliases' });
      const param = (name, min, max, fallback) => {
        const value = url.searchParams.get(name);
        if (value !== null && !/^\d+$/.test(value)) throw new RangeError(`${name} must be an integer`);
        return integerOption(value === null ? undefined : Number(value), name, min, max, fallback);
      };
      const limit = param('limit', 1, 100, 12);
      const advisoryLimit = param(url.searchParams.has('advisory-limit') ? 'advisory-limit' : 'advisoryLimit', 0, 10, 3);
      const turn = path === '/v1/digest' ? param('turn', 0, 999999999, 0) : 0;
      if (active >= maxConcurrent) return send(res, 429, { error: 'Concurrent request capacity exceeded' });
      active++;
      try {
        const analysis = await intelligenceCache.get({ limit, advisoryLimit });
        return send(res, 200, path === '/v1/intelligence' ? analysis : { turn, analysis, report: buildReport(analysis, { turn }), social: buildSocialDrafts(analysis, { turn }), publication_state: 'not_published', engagement: null });
      } finally { active--; }
    } catch (error) {
      if (error instanceof RangeError || error instanceof TypeError) return send(res, 400, { error: error.message });
      // Do not echo auth headers, environment variables, stack traces, or tokens.
      return send(res, error.statusCode ?? 502, { error: error.source_status ? error.message : 'Intelligence unavailable; check upstream source access', ...(error.source_status ? { source_status: error.source_status } : {}) });
    }
  };
}
export const isLoopbackHost = host => ['127.0.0.1', 'localhost', '::1', '[::1]'].includes(host);
export function createApiServer(options = {}) {
  const host = options.host ?? '127.0.0.1';
  const token = options.token ?? process.env.FUSION_API_TOKEN;
  // Never accidentally expose an unauthenticated intelligence proxy. Non-loopback
  // plain HTTP must sit behind a TLS terminator or private network; explicit
  // allowInsecureRemote acknowledges that transport deployment responsibility.
  if (!isLoopbackHost(host) && (!token || !options.allowInsecureRemote)) throw new Error('Non-loopback requires FUSION_API_TOKEN and explicit allowInsecureRemote behind TLS/private networking');
  const server = createServer({ maxHeaderSize: 8192 }, createApiHandler({ ...options, token }));
  server.requestTimeout = 70000; server.headersTimeout = 10000; server.keepAliveTimeout = 5000;
  server.maxHeadersCount = 32;
  server.defaultHost = host;
  return server;
}
