# @portfolio/shell

React 19 + React Router v7 (declarative mode) + Tailwind v4 main application. Hosts the persistent R3F celestial canvas, renders locale-prefixed routes, lazy-loads the Angular timeline, and wires together i18n / geospatial / Turnstile / Calendly.

## Scripts

```bash
pnpm --filter @portfolio/shell dev        # dev server at :5173
pnpm --filter @portfolio/shell build      # production build to dist/
pnpm --filter @portfolio/shell preview    # preview the built bundle
pnpm --filter @portfolio/shell typecheck  # tsc --noEmit
```

## Base path

Vite `base` defaults to `/` (user-site deploy at `<username>.github.io`). Override with `VITE_BASE_URL` at build time if deploying to a project site like `<username>.github.io/portfolio/`.

## Status

Phase 0 — locale-prefixed placeholder routes. Real layouts land in Phase 4, celestial backdrop in Phase 3, design tokens in Phase 2.
