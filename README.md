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
pnpm dev
```

The shell dev server starts at `http://localhost:5173` and redirects `/` to `/en/`.

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

Phase 0 — scaffolding and runnable empty shell. Subsequent phases add the manifest builder, design tokens, celestial scene, real pages, Angular timeline, i18n, geospatial, Actions deploy, and launch polish.

## License

MIT. See [LICENSE](./LICENSE).
