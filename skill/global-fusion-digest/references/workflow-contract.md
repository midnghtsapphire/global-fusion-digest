# Engine and archive contract

Import `src/index.mjs` from the installed package/checkout. The shared engine exposes:

```javascript
collectIntelligence({ limit = 12, advisoryLimit = 3 })
buildReport(analysis, { turn })
buildSocialDrafts(analysis, { turn })
runDigest({ outputDir, limit, advisoryLimit, seedLastTurn = 0 })
```

`analyze` fetches and analyzes without assigning a completed archive turn. `run` collects current intelligence, creates the archive, and returns a JSON receipt containing `turn`, `digest_path`, `report_path`, `analysis_path`, `social_path`, and `manifest_path`. Treat the receipt paths as data, check existence, and verify the manifest rather than predicting filenames. All six draft platforms must be represented.

Use local state only after the archive's required files exist and the manifest is complete. Preserve the last completed turn after any failed run. Do not edit state to hide an error or increment the number manually. Avoid concurrent runs against one archive directory. In GitHub Actions, download/restore previous artifacts before running if continuity is required; uploading an artifact alone does not restore it on a subsequent fresh runner.

Archive source retrieval timestamps and source URLs separately from advisory publication dates. Count KEVs, ICS advisories, and IC3 notices by their own denominators; do not add them into a single supposed count of unique attacks. Multiple CVEs or notices may describe one product or campaign. Empty/failed sections must disclose unavailable coverage, not imply that no threat exists.

Store supplementary publication receipts beside the archive without rewriting its original generated files. A post status must be one of: drafted, blocked/unavailable, submitted with a real receipt, or failed with a real error. Receipt collection and engagement optimization are human/authorized-agent steps outside the source-only engine.
