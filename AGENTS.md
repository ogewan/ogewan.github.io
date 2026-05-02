# AGENTS.md

> last edited: 2026-05-02

Conventions and rules for AI coding agents working in this repository (GitHub Copilot, OpenAI Codex, Cursor, etc.). The global rules block below mirrors `~/.claude/CLAUDE.md` and is maintained by the `/sync-rules` skill — do not edit by hand.

## Project

- **Name:** portfolio
- **Purpose:** Polyglot SPA that serves as its own architecture demo — React 19 shell, Angular 19 custom element (timeline), R3F/Three.js celestial backdrop, pnpm monorepo, GitHub Actions Pages deploy.
- **Status:** Phase 9.5 complete — Phase 9.6 (polish + launch) next.

## Reading order

1. `ARCHITECTURE.md` — design, structure, rationale. Read it in full before touching source.
2. `CURRENT.md` — active work, in-progress items, recent decisions.
3. Source code — only after the above.

---

## Global rules (mirrored from ~/.claude/CLAUDE.md)

> last synced: 2026-05-02

# User-level Claude Code instructions

> last edited: 2026-04-25

Loaded into every session, across every project. Keep this short and durable.

## Shell

The user's default terminal is **Git Bash / bash**, NOT PowerShell or cmd.

- Use Unix shell syntax in Bash tool calls: `/dev/null`, forward slashes in paths, `&&` / `||` / `;` chaining.
- For multi-line strings in commit messages, here-docs with `cat <<'EOF'` work as expected.
- `echo` behaves as POSIX `echo`. `source`, `grep`, `sed`, `find`, `curl` are available.
- When the user says "run this", assume they'll run it in bash. Don't hand them PowerShell syntax without flagging the shell.

## Working approach — correctness over speed

**The user wants to understand and control every part of the process. They are not interested in blindly generating results.** Every time I overextend, the chance I break something or miss what they actually wanted goes up. Speed has no value if I produce work they didn't ask for or that goes the wrong direction.

This applies to every project, every session.

**Concrete rules:**

1. **Approval is scoped to the narrowest reasonable interpretation of what was asked.** "Fix it then", "do so", "ok" → do the _one thing_, not the whole pre-discussed plan. If a plan had >3 steps, after approval ask "the whole plan, or one step at a time?" before executing.

2. **Stop after each meaningful unit of change and confirm.** Two or three related file edits that complete one logical thing → check in. Don't queue up 10+ tool calls under one approval.

3. **Never invent labels, phase numbers, or commit message scope.** The user owns numbering and naming. If a piece of work doesn't fit an existing label, ASK how to label it. Do not write `feat: phase N — ...` unless they invoked that phase number.

4. **Present decisions, don't make them.** When there's a choice (architectural trade-off, scope question, naming), surface the choice with options. Don't pick and proceed.

5. **TodoWrite items are check-in points, not a script to execute.** Don't treat a long todo list as authorization to run the whole list. Mark one in_progress, finish it, stop, confirm.

6. **Read project-level workflow rules on every session involving that project** (CLAUDE.md, NEXT_PHASES_PROMPT.md, ARCHITECTURE.md). If those rules contradict default behavior, they win.

**Why this matters:** the user is building things they need to deeply understand and own. Code that arrives without their input on the decisions is worse than no code, even if it compiles. Their feedback ("at least the 5th time you have done this") shows this is a persistent failure mode for me — the durable fix is to treat every approval as small, every plan as a series of confirm-points, and every label as user-owned.

---

## Project hard rules

1. One sub-phase at a time. Build → verify → update `ARCHITECTURE.md` → commit → stop.
2. User owns phase numbering and commit-message scopes. Ask before inventing labels.
3. Plan mode first for non-trivial work. Get approval before editing source.
4. `pnpm test:visual` is the gate for visual changes. Read screenshots before claiming success.
5. Conventional commits, lowercase subject. Husky enforces.
6. Plain `git commit` — do not pass `-c user.email=…`.
7. `git -C /c/wamp64/www/__active/portfolio …` — Bash cwd resets each call.
8. Confirm before risky/destructive actions.

## Project conventions

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`. Phase: `feat(scope): phase N — description`.
- TypeScript strict, no `any` without inline justification.
- Named exports preferred.
- `.env*` gitignored except `.env.example`.
- `ARCHITECTURE.md` and `CONTINUE.md` are gitignored — never commit them.
- `packages/celestial/src/screenshots/*.png` ARE committed (drive static quality mode).
- `packages/celestial/src/textures/*.webp` are 34-byte stubs — placeholder canvas overrides via `isLikelyStubTexture`.

## Useful commands

```bash
pnpm typecheck
pnpm lint
pnpm --filter @portfolio/manifest-builder test
pnpm --filter @portfolio/ng-elements build
pnpm --filter @portfolio/shell build
unset ELECTRON_RUN_AS_NODE && pnpm dev
pnpm test:visual --quality=quality --screenshot=q9-N-quality.png
pnpm capture:scenes
```
