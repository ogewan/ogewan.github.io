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

In production, set these as repository secrets (Phase 7's GH Actions workflow injects them into the build).

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

Phase 6 — i18n + geospatial + contact integrations. Subsequent phases: GitHub Actions deploy (Phase 7), launch hardening (Phase 8), real R3F celestial scenes (Phase 9).

## License

MIT. See [LICENSE](./LICENSE).
