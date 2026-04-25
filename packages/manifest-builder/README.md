# @portfolio/manifest-builder

Node CLI invoked by GitHub Actions. Lists the user's public non-archived repos via the GitHub GraphQL API, fetches `.portfolio.yml` from each default branch, validates against a Zod schema, enriches with stars / last-push / primary-language / description, resolves screenshot paths to `raw.githubusercontent.com` URLs, and emits `manifest.json` (sorted: featured → order → last-push-date) plus `manifest-warnings.json` to the repo root.

Reads `GITHUB_TOKEN` from env.

**Status**: Phase 0 placeholder with a CLI stub. Full implementation in Phase 1.
