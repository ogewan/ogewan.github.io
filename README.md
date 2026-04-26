# portfolio

A polyglot single-page application portfolio deployed to `<username>.github.io`.

React 19 + React Three Fiber shell, Angular Elements for one showcase component, MapLibre GL for geospatial, `react-i18next` for English/Spanish, Cloudflare Turnstile gating Calendly, Tailwind v4 for styling. Content is driven by `.portfolio.yml` files in public repos, scanned by a Node CLI on each GitHub Actions run.

> This is a portfolio piece about itself. The architecture is the subject matter.

## Prerequisites

- Node.js 24+ (LTS). See `.nvmrc`.
- pnpm 10+
- git

## Running locally

```bash
pnpm install
cp packages/shell/.env.example packages/shell/.env.local   # optional, fill in keys
pnpm dev
```

The shell dev server starts at `http://localhost:5173` and redirects `/` to `/<lang>/` (the user's localStorage choice, then `navigator.language`, then `en`).

## Environment variables

All vars are read at build time by Vite. Missing values degrade gracefully — the affected feature renders a hint card instead of breaking.

| Variable                  | Used by                          | Notes                                                                |
| ------------------------- | -------------------------------- | -------------------------------------------------------------------- |
| `VITE_BASE_URL`           | Vite                             | Optional. Default `/`. Override for non-root deployment.             |
| `VITE_MAPTILER_KEY`       | `/contact` MapLibre map          | MapTiler free-tier key. Map renders blank hint without it.           |
| `VITE_TURNSTILE_SITE_KEY` | `/contact` Calendly gate         | Cloudflare Turnstile site key. Schedule panel shows hint without it. |
| `VITE_CALENDLY_URL`       | `/contact` Calendly inline embed | Full Calendly URL (`https://calendly.com/<your-handle>/<event>`).    |

In production, set these as repository secrets (the GH Actions workflow injects them into the build).

## Deployment

The site auto-deploys from `main` via [.github/workflows/build-and-deploy.yml](.github/workflows/build-and-deploy.yml). One workflow handles four entry points: `push` to `main`, weekly `schedule` (Sunday 02:00 UTC), `workflow_dispatch` (manual run), and `repository_dispatch` (external POST from a showcased repo whose `.portfolio.yml` changed). Every run regenerates the manifest, commits it back if it changed (with `[skip ci]`), then builds and deploys to GitHub Pages.

### One-time setup

1. **Enable Pages**: Settings → Pages → Source → "GitHub Actions".
2. **Set repository secrets**: Settings → Secrets and variables → Actions → Secrets:
   - `MAPTILER_KEY` — for the `/contact` map
   - `TURNSTILE_SITE_KEY` — for the Calendly gate
   - `CALENDLY_URL` — full inline-embed URL
3. **Set repository variables** (Settings → Secrets and variables → Actions → Variables):
   - `GITHUB_USERNAME` — login the manifest builder scans for `.portfolio.yml`. Defaults to the repo owner if unset.
   - `VITE_BASE_URL` — defaults to `/` (root user/org pages). Set to `/<repo>/` for project pages.
4. The workflow's auto-provided `GITHUB_TOKEN` covers the manifest GraphQL query and the commit-back; no PAT needed.

### Trigger from a showcased repo

When a `.portfolio.yml` in a separate repo changes, that repo can POST a `repository_dispatch` event to this one to refresh the manifest immediately. Drop this workflow file into the showcased repo at `.github/workflows/dispatch-portfolio.yml`:

```yaml
name: Notify portfolio of .portfolio.yml change

on:
  push:
    branches: [main]
    paths: ['.portfolio.yml']

jobs:
  dispatch:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger portfolio rebuild
        env:
          # PAT with `repo` scope on the portfolio repo. Store as a secret
          # named PORTFOLIO_DISPATCH_TOKEN in this repo's settings.
          GH_TOKEN: ${{ secrets.PORTFOLIO_DISPATCH_TOKEN }}
        run: |
          gh api \
            -X POST \
            -H "Accept: application/vnd.github+json" \
            /repos/<owner>/<portfolio-repo>/dispatches \
            -f event_type=manifest-update
```

Replace `<owner>/<portfolio-repo>` with this repo's path. The PAT needs `repo` scope on this repo (a fine-grained token scoped to "Actions: Read and write" works too).

### Manifest contract

`.portfolio.yml` schema is enforced by [packages/manifest-builder/src/schema.ts](packages/manifest-builder/src/schema.ts). The canonical template lives at [.github/PORTFOLIO_YML_TEMPLATE.yml](.github/PORTFOLIO_YML_TEMPLATE.yml) — drop a copy at the root of any public repo you want surfaced on the portfolio. Unknown keys fail validation, so misspellings (`techs`, `catagory`) surface in CI.

## Project structure

```
portfolio/
├── packages/
│   ├── shell/              # React 19 + R3F + React Router, the main app
│   ├── ui/                 # Design system (tokens + framework-agnostic primitives)
│   ├── celestial/          # R3F persistent scene package
│   ├── ng-elements/        # Angular Elements bundle, lazy-loaded
│   ├── manifest-builder/   # Node CLI invoked by GH Actions
│   └── content/            # i18n strings (en, es), MDX, static copy
├── pnpm-workspace.yaml
└── package.json
```

## Status

Phase 7 — GitHub Actions + Pages deploy. Subsequent phases: launch hardening (Phase 8), real R3F celestial scenes (Phase 9).

## License

MIT. See [LICENSE](./LICENSE).
