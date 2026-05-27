# Agent prompt: generate a `.portfolio.yml`

This file is an instruction prompt for a coding agent (Claude Code, Cursor, Copilot Agent, etc.) to generate or update a `.portfolio.yml` so the project gets picked up by this portfolio's manifest builder.

**How to use it.** Open your agent in the target repo and paste:

> Read `GENERATE_PORTFOLIO_YML.md` from the portfolio repo at `<path-to-this-repo>` and follow it for this repo.

…or, if your agent supports loading instructions from a URL:

> Follow the instructions in `https://github.com/<owner>/<repo>/blob/main/GENERATE_PORTFOLIO_YML.md`.

The agent does the rest. It needs read access to this repo's `packages/manifest-builder/src/schema.ts` (the canonical Zod schema for `.portfolio.yml`) and `.github/PORTFOLIO_YML_TEMPLATE.yml` (a field-by-field reference). Optionally needs `gh` on PATH for richer metadata extraction.

---

## What it produces

A YAML file matching the Zod schema at `packages/manifest-builder/src/schema.ts` (currently `schema_version: 3`). Two output shapes:

- **Self mode** — committed to the user's own repo at `<repo-root>/.portfolio.yml`. The portfolio's GraphQL crawl picks it up automatically once the repo is owned by the configured `GITHUB_USERNAME` and pushed to GitHub.
- **External mode** — committed inside this portfolio repo at `.portfolio/<slug>/.portfolio.yml`, with co-located hero/media assets. For OSS projects the user contributed to but can't push a `.portfolio.yml` to. Requires a `contributions:` block and (optionally) an `upstream: owner/repo` so the builder fetches live GitHub metadata.

---

## Procedure

### 1. Pick a mode

- **External mode** if any of:
  - The user said "external" or "OSS contribution" or named an upstream `owner/repo` they don't own.
  - The current working directory IS this portfolio repo.
  - A top-level `PORTFOLIO_YML_TEMPLATE.yml` or `manifest.json` exists alongside `packages/manifest-builder/` (i.e. we're inside the portfolio repo).
- **Self mode** otherwise.

If self mode is selected but the current repo turns out to be the portfolio repo itself, switch to external mode and ask for the upstream `owner/repo` and slug.

In external mode, also determine:

- The upstream `owner/repo` (ask if not provided).
- A folder slug for `.portfolio/<slug>/` — defaults to the upstream repo name; let the user override.
- The path to the portfolio repo on disk (so you know where to write). If you're already inside it, use `git rev-parse --show-toplevel`. Otherwise ask.

### 2. Detect an existing `.portfolio.yml`

If one is already at the target path, ask the user: `[u]pdate / [r]eplace / [a]bort`.

- `update` — preserve the existing `uuid`. Re-extract all candidates; diff against existing values and let the user approve each change.
- `replace` — generate a new UUID v4 and re-extract from scratch.
- `abort` — stop.

If `schema_version` is anything other than `3`, abort and tell the user to migrate manually. Never auto-upgrade.

### 3. Gather signals

**Self mode** (running in the target repo):

- `cat README.md` (handle case variants like `README.MD`).
- `cat package.json`.
- `git log --reverse --pretty=format:%aI | head -1` for first commit date.
- `git ls-files` for the file tree.
- `gh repo view --json name,description,primaryLanguage,homepageUrl,pushedAt,stargazerCount,createdAt` if `gh` is on PATH and authed.

**External mode** (signals come from the upstream repo, not cwd):

- `gh repo view <owner>/<repo> --json name,description,primaryLanguage,homepageUrl,pushedAt,stargazerCount,createdAt`.
- `gh api repos/<owner>/<repo>/readme --jq .content | base64 -d` for the README, OR `gh repo clone <owner>/<repo> <tmpdir>` if you need to walk the file tree.
- `gh pr list --author @me --repo <owner>/<repo> --state merged --json number,title,url --limit 20` to pre-populate the `contributions.links` prompt.

### 4. Extract candidates

Same heuristics for both modes unless noted:

- **title** — `package.json.name` (humanized: kebab/snake → Title Case) → README first H1 → repo name. Pick the most human-readable.
- **summary** — `package.json.description` → README first paragraph, compressed to ≤280 chars. Don't pad.
- **tech** — `package.json` deps + peerDeps. Deduplicate framework families (keep `react`, drop `@types/react`, `react-dom`, `@vitejs/plugin-react`, etc.). Cap 6–8 entries. If no `package.json`, infer from file extensions and headline tooling.
- **categories** — free-form from README signals (`cli`, `desktop-app`, `browser-extension`, `library`…). Default `[]`. Skip if uncertain.
- **started_at** — self mode: first git commit date. External mode: upstream's `createdAt`. User may override.
- **status** — default `active`. Bump to `shipped` on release/production language, `archived` on deprecation language, `experimental`/`wip` on prototype language.
- **featured** — default `false`. Prompt for `order` only when `featured: true`.
- **role** — skip unless README explicitly indicates ("solo project", "I led", "lead engineer").
- **pages_url** — `gh homepageUrl` → `package.json.homepage` → README "live demo" links. Show all candidates; user picks or skips.
- **hero** — scan README for first inline image, then repo for `og-image.*`, `social-card.*`, `.github/og-image.*`, `assets/banner.*`, `public/og-image.*`. Show candidates.
- **docs_link** — README "Documentation" link, but only if it points to an external site.

**External-mode extras:**

- **upstream** — add `"<owner>/<repo>"` automatically. This is what the manifest builder uses to fetch live metadata at build time.
- **contributions** (required) — collect:
  - `summary.en` (required) — 1–2 sentences on the user's involvement. If they can't articulate it, abort; don't ship a stub.
  - `items` (optional) — EN bullets: "shipped X", "fixed Y", "designed Z".
  - `links` (optional) — pre-populated from the `gh pr list --author @me` query; user curates label + URL pairs.

### 5. Decide on `case_study`

- If `pages_url` is set → default skip (the shell bypasses `case_study` when `pages_url` is present).
- If README has fewer than ~200 words of prose → default skip.
- Otherwise offer to draft from README sections:
  - `background.en` — 2–4 paragraphs from intro, as array entries.
  - `pull_quote.en` — notable callout or testimonial.
  - `numbers` — quantitative claims ("100k users", "10× faster", "18ms median").
  - `approach.body.en` and/or `approach.steps` — from "Approach"/"How it works"/"Architecture" sections.
- Skip `es` keys unless explicitly requested.
- Never emit empty `case_study` shells. Populate meaningfully or omit the key.

### 6. Optional screenshot pass

Skip unless the user explicitly asked for screenshots. When invoked:

- **Target URL** — default to `pages_url` if present, otherwise prompt.
- **Target directory:**
  - Self mode: `<target-repo>/.portfolio/` (mkdir -p). YAML stores `hero: .portfolio/hero.png`.
  - External mode: `<portfolio-repo>/.portfolio/<slug>/` (mkdir -p). YAML stores `hero: hero.png` — the manifest builder resolves it relative to the yml's directory and rewrites to `/external/<slug>/hero.png` at build time.
- If the hero file already exists, ask: overwrite, keep, or use a different filename.
- Capture with whatever tool the agent has available (Playwright, `npx playwright screenshot`, `headless-chrome`, etc.). On failure, surface the error and continue without the screenshot — don't block the rest of the flow.
- Additional screenshots go into the `media` array (full-resolution paths, same directory).

### 7. Present a batch summary and wait for confirmation

Show ambiguous fields first, then everything else:

```
AMBIGUOUS — please confirm:
  status: active (no release signals in README)
  pages_url: 2 candidates — gh: <a>, package.json: <b>. Which?
  hero: README:./assets/banner.png OR .github/og-image.png. Which?

EXTRACTED:
  uuid: <new v4 / preserved from existing>
  title: URL Vault
  summary: …
  tech: [electron, react, vite, …]
  started_at: 2025-08-14
  …
```

Ask: "Edit any field, confirm to write, or abort." Wait for the user's response.

### 8. Validate against the schema

Cross-reference the candidate against the Zod schema at `packages/manifest-builder/src/schema.ts`. Pay attention to:

- All required fields present (`schema_version`, `uuid`, `title`, `summary`, `tech`, `status`, `started_at`).
- `tech` non-empty array.
- `summary` between 10 and 280 chars.
- `started_at` / `ended_at` are ISO calendar dates (`YYYY-MM-DD`).
- URL fields parseable as URLs.
- `case_study.*.en` (and `contributions.summary.en`) present when their parent block is.
- No unknown top-level keys (schema is `.strict()`).

If you can run the manifest builder's tests, `pnpm --filter @portfolio/manifest-builder test` validates schema parsing end-to-end.

### 9. Write the file

**Self mode** target: `<target-repo>/.portfolio.yml`. Lead with:

```
# Generated by an agent following GENERATE_PORTFOLIO_YML.md.
# Schema: https://github.com/<owner>/portfolio/blob/main/packages/manifest-builder/src/schema.ts
# Field reference: https://github.com/<owner>/portfolio/blob/main/.github/PORTFOLIO_YML_TEMPLATE.yml
# Re-run the same agent prompt to update; manual edits may be overwritten on re-run.
```

**External mode** target: `<portfolio-repo>/.portfolio/<slug>/.portfolio.yml`. Lead with:

```
# Generated by an agent following GENERATE_PORTFOLIO_YML.md.
# External entry — sourced locally, not from a committed .portfolio.yml in the upstream repo.
# Schema: https://github.com/<owner>/portfolio/blob/main/packages/manifest-builder/src/schema.ts
# Field reference: https://github.com/<owner>/portfolio/blob/main/.github/PORTFOLIO_YML_TEMPLATE.yml
# Re-run the same agent prompt with the upstream owner/repo to update.
```

Then the YAML body. **Stop. Do not stage or commit.**

---

## Hard rules

- Never write `.portfolio.yml` without explicit user confirmation of the batch summary.
- Never regenerate the `uuid` on update — preserve across all re-runs except an explicit `replace`.
- Never fabricate required fields (`uuid`, `title`, `summary`, `tech`, `status`, `started_at`). If extraction fails, ask.
- Never auto-stage or auto-commit. Writing the file is the last step.
- Never write the file if validation fails. No partial writes.
- Self mode writes only under `<target-repo>/.portfolio/` (and the `.portfolio.yml` at the repo root). External mode writes only under `<portfolio-repo>/.portfolio/<slug>/`. Never cross-write.
- Never run any screenshot tooling without an explicit user request.
- Never overwrite existing files in `.portfolio/` without asking.
- Inside the portfolio repo, only external mode is allowed — re-prompt for `owner/repo` rather than running self mode.
- External mode requires `contributions.summary`. If the user can't articulate involvement, abort.
- Never auto-upgrade an existing `.portfolio.yml` whose `schema_version` ≠ 3.
- Never emit `es` (Spanish) keys unless explicitly requested.
- Never emit empty `case_study` or `contributions` shells. Populate meaningfully or omit.

---

## Example outputs

### Minimal self-mode entry

Small Node CLI, README ~80 words, no homepage, no existing `.portfolio.yml`.

```yaml
schema_version: 3
uuid: 6f9d7c2a-4b81-4a9f-9d1e-c3a8f0d72b14
title: URL Shortener CLI
summary: A small command-line URL shortener with a local SQLite-backed history.
tech:
  - node
  - sqlite
  - commander
categories: []
status: active
featured: false
started_at: 2024-11-03
```

### Rich self-mode entry with `case_study`

Electron app, ~1200-word README, OG image present, no live homepage.

```yaml
schema_version: 3
uuid: 9c8d4e1f-1a2b-4d5c-bf3a-2e6d8b9a1f04
title: URL Vault
summary: Electron desktop app that ingests URL files, deduplicates into a local SQLite DB, and surfaces link health and analytics.
tech:
  - electron
  - react
  - vite
  - better-sqlite3
  - tailwindcss
categories:
  - desktop-app
  - productivity
status: active
featured: true
order: 2
role: Solo engineer
started_at: 2025-08-14
hero: .github/og-image.png
case_study:
  background:
    en:
      - URL Vault began as a frustration — keeping years of bookmarked links across browsers, exports, and `.txt` dumps, with no single source of truth.
      - The app ingests `.txt`, `.csv`, and `.json` URL exports, deduplicates them into a local SQLite database, and provides a dashboard for browsing, link health monitoring, and analytics.
  pull_quote:
    en: A local-first vault for the URLs you actually want to keep.
```

### External-mode entry

Contribution to `rust-lang/cargo`. Written to `<portfolio-repo>/.portfolio/cargo/.portfolio.yml`. The manifest builder enriches it with live stars/pushed_at from the upstream repo at build time; the workflow copies `hero.png` into `packages/shell/public/external/cargo/` before the shell build.

```yaml
schema_version: 3
uuid: 7e8b9c0d-1a2b-4c3d-9e4f-5a6b7c8d9e0f
title: Cargo
summary: Rust's package manager and build tool — improved incremental rebuild detection in the dependency resolver.
tech:
  - rust
categories:
  - developer-tools
status: shipped
featured: false
started_at: 2023-09-12
pages_url: https://doc.rust-lang.org/cargo/
upstream: rust-lang/cargo
hero: hero.png
contributions:
  summary:
    en: Cut incremental rebuild times for large workspaces by fixing two stale-cache invalidation bugs in the dependency resolver.
  items:
    - en: Shipped fix for cache key collision when overlapping feature sets were resolved out of order.
    - en: Added regression test fixtures covering 4 prior edge cases the resolver missed.
  links:
    - label: PR #12345 — fix cache key collision
      url: https://github.com/rust-lang/cargo/pull/12345
    - label: PR #12410 — resolver regression tests
      url: https://github.com/rust-lang/cargo/pull/12410
```
