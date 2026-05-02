<!-- This project also uses ~/.claude/CLAUDE.md — read it first. -->

# CLAUDE.md

> last edited: 2026-05-02

## Project

- **Name:** portfolio
- **Purpose:** Polyglot SPA that serves as its own architecture demo — React 19 shell, Angular 19 custom element (timeline), R3F/Three.js celestial backdrop, pnpm monorepo, GitHub Actions Pages deploy.
- **Status:** Phase 9.5 complete — Phase 9.6 (polish + launch) next.

## How to read this codebase

Read `ARCHITECTURE.md` in full before touching any code — it is the entry point. **Do not** derive structure from glob/grep; the architecture doc is faster and more accurate.

Read `CURRENT.md` for live state: what is in progress, what is blocked, recent decisions.

## Project hard rules

1. **One sub-phase at a time.** Build → verify → update `ARCHITECTURE.md` → commit → stop and summarise. Wait for explicit "go" before starting the next sub-phase.
2. **User owns phase numbering and commit-message scopes.** Never invent labels (`9.3a`, `9.5.1`, etc.). Ask if work doesn't fit an existing label.
3. **Plan mode first for any non-trivial work.** Write a plan, surface decisions, get approval — then edit source. Do not go straight to implementation.
4. **`pnpm test:visual` is the verification gate for visual changes.** Read the screenshot; only then claim the fix worked. See memory `visual-testing-playwright.md` for full cadence.
5. **Conventional commits, lowercase subject.** Husky's commit-msg hook rejects sentence-case.
6. **Plain `git commit`.** Do not pass `-c user.email=…`; global git config is correct.
7. **`git -C /c/wamp64/www/__active/portfolio …` in Bash** — Bash starts in a fresh cwd each call.
8. **Do not poll background task output.** Fire and wait for the task-notification.
9. **Confirm before risky/destructive actions** (force-push, dropping a package, deleting a branch).
10. **Default terminal is Git Bash on Windows.** Unix shell syntax everywhere.

## Useful commands

```bash
pnpm typecheck                                  # all packages
pnpm lint                                       # all packages
pnpm --filter @portfolio/manifest-builder test  # 25 tests
pnpm --filter @portfolio/ng-elements build      # ng custom-element bundle
pnpm --filter @portfolio/shell build            # production build; check chunk sizes
unset ELECTRON_RUN_AS_NODE && pnpm dev          # dev server
pnpm test:visual --quality=quality --screenshot=q9-N-quality.png
pnpm test:visual --quality=static  --screenshot=q9-N-static.png
pnpm test:visual --quality=simple  --screenshot=q9-N-simple.png
pnpm capture:scenes                             # refresh static-mode scene PNGs
```

## Project conventions

- **Conventional commits**: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`. Phase commits: `feat(scope): phase N — description`.
- **TypeScript strict** everywhere. No `any` without inline justification.
- **Named exports** preferred. Default exports only for canonical entry points.
- **Secrets**: `.env*` always gitignored except `.env.example`.
- `ARCHITECTURE.md` and `CONTINUE.md` at repo root are gitignored — never commit them.
- `mockup/` is gitignored — design source of truth. Read `mockup/project/tokens.html` for token values.
- `packages/celestial/src/screenshots/*.png` ARE committed — they drive `static` quality mode.
- `packages/celestial/src/textures/*.webp` are 34-byte 1×1 stubs — canvas placeholder overrides them at runtime via `isLikelyStubTexture`.
