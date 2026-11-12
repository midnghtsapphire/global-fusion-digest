# Privacy policy

Effective date: 2026-11-12.

Global Fusion Digest is source-only software that runs in the user's environment or GitHub Actions runner. It retrieves public CISA KEV, CISA ICS, and FBI IC3 publications and writes source-derived analysis, reports, drafts, and archive metadata to the selected local directory. It does not create user accounts, scan the user's network, upload account credentials/API tokens to the publisher, or collect social-platform engagement. No analytics or advertising service is configured by this package.

Outbound requests to public source providers disclose ordinary request metadata, such as the requesting network's IP address, to those providers. Installation contacts npm when resolving dependencies. GitHub Actions infrastructure stores its workflow logs and any artifacts the caller explicitly uploads under GitHub's retention/access controls. These third parties operate under their own policies. Publishing to social platforms is not implemented by the source engine or Action.

`FUSION_API_TOKEN`, if configured, is a local service credential. Do not put it into report content, committed files, or public issues. The software does not send it to the package publisher. Archive output is public-source material and assessment, not customer incident evidence or observed customer telemetry. If users add sensitive material manually or expose an API publicly, they are responsible for access control and retention in that environment.

Local retention is controlled by the user. CI artifact retention is chosen by the workflow; the included examples use finite retention periods. Support issues are hosted by GitHub and may be public; submit no secrets or private incident evidence. Questions about this policy may be raised via [GitHub Issues](https://github.com/midnghtsapphire/global-fusion-digest/issues). This document does not claim a hosted service, registered App, telemetry platform, or account database exists.
