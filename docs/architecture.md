# Architecture

The Node.js source engine is the shared implementation used by the CLI, REST API, MCP server, and GitHub Action. The agent skill adds review, interpretation, authorized publication handoff, and lineage rules; it does not duplicate the collector with a second intelligence pipeline.

`collectIntelligence({limit: 12, advisoryLimit: 3})` retrieves current official KEV JSON and recent ICS/IC3 publications, retains provenance, and returns structured analysis. `buildReport(analysis, {turn})` and `buildSocialDrafts(analysis, {turn})` render the same analysis into cited report content and six platform drafts. `runDigest({outputDir, limit, advisoryLimit, seedLastTurn: 0})` coordinates collection and archive completion and returns the receipt paths. Consult source code and [API documentation](api.md) for the exact serialized schema and transport names.

The data flow is: official public sources → validated retrieval/parser → evidence and operational assessment → report/social renderers → complete local archive/manifest → JSON receipt. CLI `analyze` stops before completed-turn assignment. CLI `run` archives. `serve` provides loopback REST access and `mcp` provides standard-input/output access to engine capabilities. Neither transport creates account sessions or posts content.

The root composite `action.yml` installs locked dependencies in `github.action_path` with `npm ci --ignore-scripts` and invokes the local CLI through an injection-resistant Node wrapper. Inputs enter via environment variables, integer limits are validated, subprocesses run without a shell, and output paths are confined to the caller workspace. Receipt artifacts are checked before outputs or a job summary are written. Official GitHub dependencies are pinned to read-only-verified commit SHAs.

CI runs package tests/build checks, npm packing, Action input-validation tests, and a real composite Action smoke run. The reusable workflow requires an explicit call and uploads the completed archive; no schedule, social publisher, GitHub write token, hosted customer database, or billing service is configured.

An archive is local unless the user deliberately retains it elsewhere. A GitHub artifact is not automatic persistent local state on the next runner. Preserve previous completed turns, restore state deliberately, avoid concurrent writers, and advance the turn only after a complete manifest/required-file set. A publication receipt or human review supplement must remain separate from the immutable generated source artifacts.
