# Shared engine contract

The ESM engine requires Node.js >=22. Import from `src/index.mjs` (or the installed package root):

```js
import { collectIntelligence, buildReport, buildSocialDrafts, classifyKEV, runDigest } from './index.mjs';
const analysis = await collectIntelligence({ limit: 12, advisoryLimit: 3 });
const report = buildReport(analysis, { turn: 0 });
const social = buildSocialDrafts(analysis, { turn: 0 });
```

`collectIntelligence` returns the shape in `../schemas/analysis.schema.json`. It additionally exposes `analysis_scope`, `priority_method`, `cisa_cyber_advisories`, and `retrieval_limits`. Mandatory KEV failures throw `CollectionError` with `.source_status`; optional failures return `collection_status: 'degraded'`. Disabled sources have status `skipped`. Advisory items expose `title`, ISO `date`, `source`, verbatim source-excerpt `summary`, operational `severity`, and validated `cves`; additional fields include `excerpt`, `priority_rationale`, `severity_basis`, `source_kind`, and `observed_cvss` objects `{ version, base_score, base_severity, source }`. Severity counts cover the selected KEVs only.

Defaults: 12 KEVs, 3 HTML advisories per enabled index, 35-second per-request timeout, 60-second total collection deadline, 8 MiB response cap, at most 3 fetches concurrently. Bounds: limit 1–100; advisoryLimit 0–10; timeoutMs 100–60000; budgetMs 100–180000; maxBytes 1024–16777216. `includeCyber` defaults true. Discovery uses current official index links and details; no CVE, release-date, alert, or catalog-count overrides exist. PDF-only items are not summarized; the scope explicitly specifies HTML details.

`buildReport` returns a UTF-8 Markdown string. `buildSocialDrafts` returns exactly six keys, each a string: `LinkedIn`, `Facebook`, `Instagram`, `TikTok`, `Lemon8`, `Reddit`. Turn is display-only in renderers, range 0–999999999. No renderer mutates a filesystem, fetches a source, or publishes anything. `classifyKEV` accepts official KEV records or normalized `cve/name/description` records and returns `{ operational_priority, priority_rationale }`.

`runDigest({outputDir, limit, advisoryLimit, seedLastTurn: 0})` collects before allocating a turn, commits a non-overwriting archive under `digests/YYYY/YYYY-MM-DD-TURN-NNN`, and then updates `state.json`. It returns `{ turn, digest_path, report_path, analysis_path, social_path, manifest_path }`. `seedLastTurn` is a lower bound, not a reset. Raw bytes are attached privately to collected analysis via WeakMap for snapshot archival; serialized/imported analysis cannot recover raw snapshots. Supplying `analysis` or an injected `collect` is supported for deterministic embedding, and manifests explicitly identify missing raw snapshots.

REST imports are `createApiHandler`, `createApiServer`, `createIntelligenceCache`, `OPENAPI` from `api.mjs` or the installed `./api` export. `createApiHandler({token?, cache?, collect?, maxConcurrent?:8, rateLimit?:120, rateWindowMs?:60000})` returns an async Node HTTP request handler. A custom cache provides `async get({limit, advisoryLimit})`. The built-in cache coalesces concurrent work, caches for 60 seconds, and is capped at 32 option combinations. Embedders may use the core directly for their own hosted `/api/v1` wrappers. Never expose `runDigest` as a public unauthenticated mutation endpoint.

REST paths: `GET /health`, `/v1/intelligence?limit=12&advisoryLimit=3`, `/v1/digest?turn=0&limit=12&advisoryLimit=3`, `/openapi.json`. The `advisory-limit` query alias is also supported; duplicate aliases are rejected. Intelligence returns analysis directly; digest returns `{turn, analysis, report, social, publication_state:'not_published', engagement:null}`. Liveness does not assert upstream source health. Configured bearer authentication protects all paths. Non-loopback `createApiServer` requires token plus `allowInsecureRemote: true`, for TLS-terminated/private-network deployments only. Default CLI bind is 127.0.0.1:8787.

Pinned production dependencies: `@modelcontextprotocol/sdk` 1.32.2, `ajv` 8.20.0, `ajv-formats` 3.0.1, `cheerio` 1.2.0, `zod` 4.6.7. Copy `src`, `schemas`, and the dependency declarations if embedding the full engine; pure collection/rendering does not require importing SDK modules. The package requires no LLM, Python, npm credentials, API keys, or paid upstream service.
