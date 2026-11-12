# API and MCP contract

The interfaces below describe the implemented `src/api.mjs`, `src/mcp.mjs`, and `src/cli.mjs` contract for package version 1.0.0. The REST and MCP transports collect/render without persistent turn allocation or filesystem archive writes. Only CLI `run` or `runDigest` creates a completed archive.

## REST

```bash
export FUSION_API_TOKEN='choose-a-local-secret'
node src/cli.mjs serve --host 127.0.0.1 --port 8787
```

The server binds to loopback by default. When `FUSION_API_TOKEN` is set, **every GET route**, including health and OpenAPI, requires `Authorization: Bearer <token>`. Loopback may run without a token; it is not a public-service security configuration. Non-loopback binding requires a token **and** `--allow-insecure-remote`, acknowledging the need for a TLS terminator or private network. The package does not deploy a proxy/TLS service.

```bash
curl --fail-with-body -H "Authorization: Bearer $FUSION_API_TOKEN" \
  http://127.0.0.1:8787/health
curl --fail-with-body -H "Authorization: Bearer $FUSION_API_TOKEN" \
  'http://127.0.0.1:8787/v1/intelligence?limit=12&advisoryLimit=3'
curl --fail-with-body -H "Authorization: Bearer $FUSION_API_TOKEN" \
  'http://127.0.0.1:8787/v1/digest?limit=12&advisoryLimit=3&turn=0'
curl --fail-with-body -H "Authorization: Bearer $FUSION_API_TOKEN" \
  http://127.0.0.1:8787/openapi.json
```

`GET /health` reports service liveness (`status`, `service`, `version`, `read_only`), not upstream source health. `GET /v1/intelligence` returns structured analysis. `GET /v1/digest` returns `turn`, `analysis`, Markdown `report`, the six-platform `social` object, `publication_state: "not_published"`, and `engagement: null`. Its `turn` parameter is display-only and does not read or advance an archive counter. `GET /openapi.json` exposes the route contract with authentication adjusted to the running configuration.

Query parameters are integer `limit` (1–100, default 12), `advisoryLimit` (0–10, default 3), and, for `/v1/digest` only, `turn` (0–999999999, default 0). `advisory-limit` is an accepted alias, but cannot appear with `advisoryLimit`. Unknown or duplicate query parameters are rejected. A zero advisory limit is available in the engine for restricted analysis, but is not appropriate for a full Global Fusion skill run that must cover ICS and IC3.

Methods other than GET return 405; invalid requests return 400, missing/invalid configured bearer credentials return 401, request-capacity/rate limits return 429, and upstream intelligence failures may return 502 with `source_status` when available. Unknown paths return 404. The implementation defaults to eight concurrent collection/render requests and a global 120-request/60-second limit. Collection results use a bounded 60-second in-memory cache; repeated calls may share the same retrieval window, which must remain visible in analysis. These defaults are not a service availability guarantee.

## MCP over stdio

Configure a compatible MCP client with an absolute checkout/installed CLI path:

```json
{
  "mcpServers": {
    "global-fusion-digest": {
      "command": "node",
      "args": ["/absolute/path/to/global-fusion-digest/src/cli.mjs", "mcp"]
    }
  }
}
```

The SDK server identity is `global-fusion-digest`, version `1.0.0`. Stdout is reserved for protocol frames; diagnostics belong on stderr. No HTTP bearer token is required by the local stdio transport; the client controls execution permissions.

`fusion_collect_intelligence` accepts `{ "limit": 12, "advisoryLimit": 3 }` with the same limits/defaults as REST. It returns the analysis as JSON in a text content block. `fusion_render_digest` accepts the same fields plus `{ "turn": 0 }` and returns the read-only digest payload described above. Tools have read-only, non-destructive annotations; they still make outbound public-source requests. Errors set `isError: true` with a JSON error/source-status text block. Neither tool writes an archive, publishes content, or gathers engagement.

A standard client tool call is:

```json
{
  "name": "fusion_render_digest",
  "arguments": { "limit": 12, "advisoryLimit": 3, "turn": 0 }
}
```

## Node.js and CLI

```javascript
import { collectIntelligence, buildReport, buildSocialDrafts, runDigest }
  from '@midnghtsapphire/global-fusion-digest';

const analysis = await collectIntelligence({ limit: 12, advisoryLimit: 3 });
const report = buildReport(analysis, { turn: 0 });
const drafts = buildSocialDrafts(analysis, { turn: 0 });
const receipt = await runDigest({
  outputDir: './archive', limit: 12, advisoryLimit: 3, seedLastTurn: 0
});
```

This package import works after a checkout-derived tarball install; it is not evidence that a scoped registry publication exists. In a checkout, use `./src/index.mjs` instead. Renderers are pure; `runDigest` owns durable local archive commits and turn state.

CLI commands are `run --output DIR --limit N --advisory-limit N --seed-last-turn N`, `analyze --limit N --advisory-limit N`, `serve`, `mcp`, `--help`, and `--version`. `run`/`analyze` also accept `--timeout-ms`. `run` emits one JSON receipt with `turn`, `digest_path`, `report_path`, `analysis_path`, `social_path`, and `manifest_path`; failures exit nonzero and emit JSON diagnostics to stderr. The `digest_path` is a directory. `social_path` points to structured `social.json`; a human-readable `social.md` is archived alongside it. The manifest records exact file byte counts/hashes and source snapshots. The archive directory includes `state.json` and committed turn folders under `digests/<year>/`; preserve the whole root for continuity.

Mandatory KEV failure prevents a digest. Optional ICS/IC3 failures remain explicit in analysis, so successful service/command status does not guarantee complete supplementary-source coverage. Follow [source policy](source-policy.md) and the [operations runbook](operations.md) before describing a digest as fully validated.
