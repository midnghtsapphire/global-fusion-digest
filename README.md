# Global Fusion Digest

Global Fusion Digest turns current official CISA Known Exploited Vulnerabilities (KEV), recent CISA industrial-control advisories, and FBI IC3 alerts into a cited threat-intelligence report, structured analysis, six social drafts, and a completed local archive. It helps prioritize defensive work; it does not scan your network or establish that your organization is compromised.

The public repository is [midnghtsapphire/global-fusion-digest](https://github.com/midnghtsapphire/global-fusion-digest). The package identity is `@midnghtsapphire/global-fusion-digest` version `1.0.0`. Registry publication and a GitHub Marketplace listing are **not** established by the files in this repository. Marketplace publication remains pending owner login, Developer Agreement acceptance, 2FA, and a successful release/listing receipt. See [the publication checklist](docs/marketplace.md) and owner-managed [launch receipts](docs/launch/).

## Local quickstart

Require Node.js 22+ and npm. From this checkout:

```bash
npm ci --ignore-scripts
npm test
node src/cli.mjs run --output ./archive --limit 12 --advisory-limit 3
```

The command prints a JSON receipt with `turn`, `digest_path`, `report_path`, `analysis_path`, `social_path`, and `manifest_path`. Reuse the same archive directory to continue completed turns. Use `--seed-last-turn N` only to initialize a fresh archive from a verified last completed historical turn; drafts and attempted posts do not justify incrementing a turn. A failed run must not advance completed state.

To collect analysis without creating a completed turn:

```bash
node src/cli.mjs analyze --limit 12 --advisory-limit 3
```

### Install a Release tarball

Download an actual npm `.tgz` asset from [GitHub Releases](https://github.com/midnghtsapphire/global-fusion-digest/releases) once one is published, verify its release/checksum, then install the file:

```bash
npm install --global --ignore-scripts ./midnghtsapphire-global-fusion-digest-1.0.0.tgz
global-fusion run --output ./archive --limit 12 --advisory-limit 3
```

Do not substitute a registry installation command until an npm publication receipt exists. To produce a local installable package from the checkout, run `npm pack`; CI also produces a tarball artifact. A CI artifact is not automatically a public Release asset.

## GitHub Action

After the owner publishes the `v1` tag, use:

```yaml
name: Threat intelligence
on:
  workflow_dispatch:
permissions:
  contents: read
jobs:
  digest:
    runs-on: ubuntu-latest
    steps:
      - uses: midnghtsapphire/global-fusion-digest@v1
        id: digest
        with:
          output-directory: global-fusion-output
          latest-limit: '12'
          advisory-limit: '3'
          seed-last-turn: '0'
      - uses: actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02 # v4
        with:
          name: global-fusion-archive
          path: global-fusion-output/
          if-no-files-found: error
```

For immutable production dependencies, replace `@v1` with the verified release commit SHA. The composite Action installs its own locked dependencies with `npm ci` and invokes the same CLI. Inputs are validated as data and never interpolated into shell commands. The output directory must be beneath the caller's workspace and outside protected Action files. Outputs `turn`, `report`, `analysis`, `social`, and `manifest` are available through `steps.digest.outputs`; paths are local to the runner and must be retained as artifacts before it expires.

Fresh runners do not preserve local archive state. Restore a previous complete archive before a direct Action run for continuity, or explicitly supply a verified historical seed. The [reusable workflow](.github/workflows/digest.yml) supports `workflow_call` and uploads the full archive; it creates a fresh archive unless a seed is supplied. No scheduled cadence is enabled and nothing is posted to social networks. See [operations](docs/operations.md) for cadence and persistence decisions.

## REST and MCP

Start the loopback REST API:

```bash
FUSION_API_TOKEN='replace-with-your-local-secret' node src/cli.mjs serve
```

The default address is `http://127.0.0.1:8787`. Read [API documentation](docs/api.md) for the implemented routes, request parameters, authentication rules, and examples. Keep tokens in your local environment or secret manager, not committed files, prompts, or archived source output.

Run the MCP stdio server:

```bash
node src/cli.mjs mcp
```

Configure an MCP client to execute `node` with the absolute path to `src/cli.mjs` and argument `mcp`. The [API guide](docs/api.md) lists the actual tool names and JSON arguments. Neither interface creates social-platform sessions or authorizes posting.

## Reusable skill

The agent procedure ships under [`skill/global-fusion-digest/SKILL.md`](skill/global-fusion-digest/SKILL.md). It includes a runnable installation/check wrapper, source-triage procedure, six-platform drafting rules, and archive/publication safeguards. The owner’s TURN #002 is retained as historical workflow lineage, not a hardcoded set of current alerts. See [provenance](docs/provenance.md).

## Evidence and safety

Use the operational legend **🔴 Critical · 🟧 High · 🔵 Anomaly · 🟡 Medium · ⚪ Low**. These priorities are an assessment overlay, not vendor CVSS. Anomaly means an unusual pattern needing investigation; a vulnerability notice still requires vulnerability triage. KEV membership is CISA's exploitation statement, not proof of compromise in your environment. ICS CVSS alone does not establish active exploitation. Verify affected versions and safe maintenance procedures before changing production/OT assets.

Source dates, retrieval times, and coverage failures must remain visible. Local output contains public-source intelligence and assessment, not observed customer telemetry. Social copy is drafted for LinkedIn, Facebook, Instagram, TikTok, Lemon8, and Reddit. Publishing requires specific user authorization and an authenticated account; only real publication receipts and real platform metrics may be reported.

Read [architecture](docs/architecture.md), [source policy](docs/source-policy.md), [privacy](docs/privacy.md), [terms](docs/terms.md), and [security](SECURITY.md). Support is available through [GitHub Issues](https://github.com/midnghtsapphire/global-fusion-digest/issues); do not post credentials or sensitive incident evidence in public issues.

## License

MIT. Copyright © 2026 Audrey Walter-Evans. See [LICENSE](LICENSE).
