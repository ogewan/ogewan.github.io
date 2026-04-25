# @portfolio/manifest-builder

Node CLI that builds `manifest.json` from `.portfolio.yml` files committed to the user's public non-archived repos on GitHub.

## How it works

1. Lists the user's public, non-archived repos via the GitHub GraphQL API, pulling `.portfolio.yml` text, stars, last-push, primary language, description, and default branch in one paginated query.
2. Validates each `.portfolio.yml` against the Zod schema in [`src/schema.ts`](./src/schema.ts).
3. Enriches valid entries with repo metadata and resolves repo-relative screenshot paths to `raw.githubusercontent.com` URLs on the default branch.
4. Sorts: featured first, then manual `order` ascending (entries with `order` before entries without), then `pushed_at` descending.
5. Writes `manifest.json` and `manifest-warnings.json` to the output directory (repo root by default).

Repos without a `.portfolio.yml` are silently skipped — portfolio participation is opt-in.

## Running locally

```bash
export GITHUB_TOKEN=<a token with public_repo scope>
export GITHUB_USERNAME=<the github user to scan>
pnpm --filter @portfolio/manifest-builder build
node packages/manifest-builder/dist/cli.js
```

Optionally set `OUTPUT_DIR` to redirect the output files somewhere other than the current working directory.

## .portfolio.yml schema

See [`src/schema.ts`](./src/schema.ts) for the authoritative definition and [`fixtures/`](./fixtures/) for examples:

- [`minimal.portfolio.yml`](./fixtures/minimal.portfolio.yml) — smallest valid file
- [`full.portfolio.yml`](./fixtures/full.portfolio.yml) — all fields populated
- [`invalid-missing-title.portfolio.yml`](./fixtures/invalid-missing-title.portfolio.yml) — used for negative tests

Strict mode is on — unknown top-level keys cause validation to fail so typos surface in CI.

## Testing

```bash
pnpm --filter @portfolio/manifest-builder test
```

Covers schema validation edge cases, screenshot URL resolution, enrichment, sort ordering, and the end-to-end build flow.
