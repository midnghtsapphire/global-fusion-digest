# GitHub Marketplace publication

**Status: local packaging ready for owner review; not claimed listed.** The public repository is [midnghtsapphire/global-fusion-digest](https://github.com/midnghtsapphire/global-fusion-digest). The GitHub browser was reported signed out during this packaging handoff. Owner login, agreement acceptance, 2FA, name validation, release/tag publication, and an actual Marketplace receipt remain required. Owner-managed deployment/authorization records belong under `docs/launch/`.

## Free Action listing copy

**Name:** Global Fusion Threat Intelligence Digest

**Short description:** Collect current official CISA KEV, ICS, and FBI IC3 intelligence into a cited digest, six social drafts, and a local archive.

**Suggested primary category:** Security. Choose the actual available category in the release interface.

**Description:** Prioritize defensive work from official public-source intelligence without scanning your network or connecting social accounts. Global Fusion Digest uses a shared Node.js engine to collect the newest CISA KEV entries and recent CISA ICS/FBI IC3 publications, retain source provenance, produce operational severity triage, and archive a cited report plus structured analysis. It prepares LinkedIn, Facebook, Instagram, TikTok, Lemon8, and Reddit drafts; it does not auto-post. Completed-turn receipts and manifests support review and archive continuity. Run manually or through a reusable workflow with minimal repository permissions.

**Distribution:** Free open-source MIT Action. Runner/network costs remain subject to the user's providers. No paid Marketplace plan or subscription is implemented.

**Support:** [GitHub Issues](https://github.com/midnghtsapphire/global-fusion-digest/issues).

**Policy links:** [Privacy](https://github.com/midnghtsapphire/global-fusion-digest/blob/main/docs/privacy.md), [Terms](https://github.com/midnghtsapphire/global-fusion-digest/blob/main/docs/terms.md), [Security](https://github.com/midnghtsapphire/global-fusion-digest/blob/main/SECURITY.md). Verify these URLs resolve after the owner's code publication; local documents alone are not live policy pages.

## Owner release checklist

GitHub's official Action instructions require a public repository, one root `action.yml`/`action.yaml`, and a unique action name. The configured name is a candidate; actual uniqueness is decided by GitHub's publication validation, not asserted here. Repositories should contain files necessary for the Action, with a dedicated unit for versioning. [1]

After local/CI validation and owner review, create the intended release/tag, review the root metadata's **Draft a release** interface, and select **Publish this Action to the GitHub Marketplace**. The owning account must accept the GitHub Marketplace Developer Agreement for the checkbox to be available. Select category/version/title and publish with two-factor authentication. Record the release URL, tag commit SHA, Marketplace listing URL, publication time, and screenshot/receipt. A repository push or ordinary release alone does not establish that the Marketplace checkbox was selected successfully. [1]

Publish an immutable `v1.0.0` release and, if chosen by the owner, a `v1` compatibility tag. The README's `uses: midnghtsapphire/global-fusion-digest@v1` example becomes runnable only after that tag exists. Publish the npm tarball as a Release asset if desired; a scoped package name does not mean the npm registry contains it.

## GitHub App and paid plans are separate

This release is an Action/CLI/API/MCP package, not a registered GitHub App. `github-app-manifest.template.json` is a minimal read-only registration design, not a registration receipt or hosted integration. Registration requires an actual callback/webhook service and reviewed deployment; no callback URL, App ID, private key, or billing endpoint is invented. The Action itself does not need an App. [2]

For a paid App listing, GitHub requires an organization-owned App and a verified publisher. A personally owned App must first transfer to an organization. GitHub Apps should have at least 100 installations; OAuth apps should have at least 200 users. Paid apps must handle new purchase, upgrade, downgrade, cancellation, and trial purchase events and support monthly and annual billing. These are App requirements, not hurdles for this free Action. This project does not claim the installation counts, organization verification, purchase handling, billing, or App registration exist. [2]

## References

[1]: https://docs.github.com/actions/creating-actions/publishing-actions-in-github-marketplace "GitHub Docs — Publishing actions in GitHub Marketplace, verified 2026-11-12"
[2]: https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app "GitHub Docs — Requirements for listing an app, verified 2026-11-12"
