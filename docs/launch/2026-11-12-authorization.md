# Global Fusion product launch — 2026-11-12

Owner: midnghtsapphire. Implementation coordinator: Manus AI.

The owner requested that the completed official-source Global Fusion Digest process become a reusable skill, API, CLI, MCP server, GitHub Action, and app, with a GitHub Marketplace listing and live publishing. This launch creates a dedicated public repository for the distributable Action and engine. It does not merge or replace the existing TURN 002 archive draft PR.

## Implementation ownership

The engine specialist owns deterministic collection, severity triage, report generation, transactional local archives, CLI, REST, MCP, and tests. The packaging specialist owns the reusable skill, Action, workflows, documentation, and Marketplace listing copy. The app specialist owns the managed web console and hosted read-only API. The coordinator owns deployment receipts, repository delivery, integration checks, and account-bound publication steps.

## Release invariants

Use current official CISA KEV, CISA ICS, and FBI IC3 data rather than fixed historical alerts. Record source retrieval timestamps, errors, provenance, and integrity hashes. Clearly distinguish operational severity from official CVSS scores. Social text remains draft until an authenticated and authorized publishing operation succeeds. Do not invent engagement metrics or publishing receipts. Keep credentials out of repositories and downloadable artifacts.

## Account-bound publication

GitHub CLI was authenticated as midnghtsapphire with repository administration access. The cloud browser was redirected to GitHub sign-in when account settings were requested. GitHub Marketplace publication requires the account's browser session, two-factor authentication, and Developer Agreement acceptance. A repository, tag, or release is not evidence of Marketplace listing publication.

## Official publishing references

- https://docs.github.com/actions/creating-actions/publishing-actions-in-github-marketplace
- https://docs.github.com/en/apps/github-marketplace/creating-apps-for-github-marketplace/requirements-for-listing-an-app

The initial offering is a free distributable engine and Action. A paid GitHub Marketplace App is a separate eligibility path requiring a verified organization and qualifying installations; no paid listing, billing account, or revenue is assumed.
