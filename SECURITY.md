# Security policy

Version 1.x is the initial supported release line. Report a software vulnerability using the repository's private vulnerability-reporting interface if GitHub exposes it at [Security advisories](https://github.com/midnghtsapphire/global-fusion-digest/security/advisories). If private reporting is not enabled, open a [GitHub Issue](https://github.com/midnghtsapphire/global-fusion-digest/issues) requesting a private contact route without publishing exploit details, credentials, or sensitive evidence. No support email or response-time commitment is asserted.

This project retrieves official public publications. It does not scan assets, authenticate to social platforms, or accept customer incident uploads. Treat source text and Action inputs as untrusted data. Verify product/version scope and vendor guidance before applying mitigations; industrial-control changes require the operator's safety and change-management process.

The REST server defaults to loopback `127.0.0.1:8787`. Configure `FUSION_API_TOKEN` for protected access and keep it outside source control and archive output. Do not expose an unauthenticated loopback development service through a public tunnel. If deploying beyond loopback, provide an authenticated TLS reverse proxy, rate limits, access logs with secret redaction, and review the actual endpoint behavior first.

Archive paths and manifests are integrity aids, not signatures proving an advisory's truth or freshness. Preserve retrieval errors and timestamps. Do not claim local compromise, publication success, or measured engagement without corresponding evidence. Social publication is outside the Action and source engine and requires explicit account-specific authorization.

Action dependencies are pinned to official repository commit SHAs verified read-only on 2026-11-12. Review dependency updates and lockfile changes before releases. CI has `contents: read`; the digest Action has no remote-write or social-post step.
