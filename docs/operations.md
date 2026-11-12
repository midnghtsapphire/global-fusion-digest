# Operations runbook

## Run and retain

Use Node.js 22+ and a verified checkout or Release tarball. Run `npm ci --ignore-scripts`, execute `node src/cli.mjs run --output /absolute/archive --limit 12 --advisory-limit 3`, then parse the JSON receipt and inspect its referenced files. Do not predict output filenames. Review source dates/retrieval times, source failures, sample scope, severity rationale, citations, and all six draft platforms before external distribution.

Reuse the same archive directory for continuity. The `seed-last-turn` value is only a bootstrap from a verified completed historical archive when no local state exists. Never initialize it from a draft, incomplete manifest, failed collection, or attempted post. Preserve all previous turns and serialize writes to one output directory. If a run fails, preserve the last completed state and diagnose the named error; do not manually increment state to force success.

GitHub-hosted runners are temporary. Upload the **entire** archive directory, including state/manifest/digest files, before the runner expires. Restore the previous archive into the same destination before the next direct Action execution when continuity is required. Do not assume a prior artifact was automatically restored. Artifact retention is finite; download or transfer the archive to an owner-approved durable destination before expiry. The reusable workflow starts fresh unless its verified historical seed is supplied; it is not an automatic artifact-restore pipeline.

## Source failures and interpretation

Official source availability may vary. A blocked ICS or IC3 page means missing coverage, not an absence of advisories. Keep error/status details visible and label stale material as historical. Do not silently substitute TURN #002's CVEs, catalog totals, deadlines, or account observations. KEV membership supports CISA's exploitation assertion, not local compromise. CVSS scores in ICS advisories do not alone establish active exploitation. IC3 behavioral/campaign patterns may warrant Anomaly; explicit vulnerability notices require vulnerability triage.

Before remediation, validate affected asset/version, exposure, vendor mitigation, and recovery dependencies. For OT, use approved safety-aware change windows and compensating controls where appropriate. Preserve evidence when the official advisory and local circumstances justify investigation. The software has no local telemetry to assert that it observed a compromise.

## Publication and measurement

LinkedIn, Facebook, Instagram, TikTok, Lemon8, and Reddit output is draft copy. Nothing is posted by the Action or CLI. An authorized human/agent may publish only to a specifically authorized account through an authenticated platform context. Record actual outcome, publication URL/time, or the specific blocker/failure. Never fabricate a session observation, post receipt, views, likes, or improvement baseline. Unavailable measurements remain unavailable, not zero.

Keep publication-status supplements beside the original archive and reference its manifest/turn. Do not overwrite hashed analysis/report/source artifacts to make a later posting result appear part of the original collection. Preserve the historical TURN #002 status as historical, not as the state of today's accounts.

## Cadence is opt-in

No scheduled trigger is enabled. The included workflow is invoked explicitly using `workflow_call`; a caller may add `workflow_dispatch` for manual runs. Choose cadence, timezone, artifact retention, continuity method, and failure notifications before enabling any recurring run. Scheduled GitHub runs do not grant permission for auto-posting. A reusable-workflow example after the `v1` tag is published:

The reusable workflow checks out its own product commit through GitHub.com's documented `job.workflow_sha` context, not the caller's commit. Those workflow-identity job properties are not available on GitHub Enterprise Server; review and explicitly pin the product checkout there before use. See [GitHub's context documentation](https://docs.github.com/en/actions/reference/workflows-and-actions/contexts#example-usage-of-job-context-workflow-identity).

```yaml
name: Manual Global Fusion Digest
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  digest:
    uses: midnghtsapphire/global-fusion-digest/.github/workflows/digest.yml@v1
    with:
      latest-limit: 12
      advisory-limit: 3
      seed-last-turn: 0
```

Do not add a `schedule` entry until the owner chooses a cadence. To run locally later, use the existing authorized application/scheduler; do not leave a detached sandbox process pretending to be durable automation.

## Local service and support

`node src/cli.mjs serve` defaults to `127.0.0.1:8787`; keep it loopback unless an authenticated deployment is deliberately reviewed. Set `FUSION_API_TOKEN` locally when protecting API access. MCP runs over stdio. Neither mode is a hosted-service deployment receipt. Report software issues through [GitHub Issues](https://github.com/midnghtsapphire/global-fusion-digest/issues) and security concerns through [SECURITY.md](../SECURITY.md), without exposing secrets.
