import { z } from 'zod';

// Zod schema for .portfolio.yml files committed to showcased public repos.
//
// Assumptions (revise as the design doc in Notion firms these up):
// - schema_version is a literal number so we can version-gate migrations later.
// - status enum covers the common lifecycle states; unknown values fail validation
//   so typos surface in CI rather than rendering weirdly in the site.
// - summary is tweet-length-capped (280 chars) to keep project cards visually even.
// - categories and tech are free-form string arrays (no enum) so new ones can be
//   added without touching this schema; the shell can surface frequency to detect typos.
// - Dates are ISO calendar dates (YYYY-MM-DD), not timestamps — day-level precision.
// - URL fields use z.string().url() — relative paths are rejected.
// - `hero` and `media` entries may be repo-relative paths OR absolute http(s)
//   URLs, and may point at images or videos. Type sniffing by file extension
//   and resolution to raw.githubusercontent.com happen during enrichment /
//   render, not here.
// - .strict() rejects unknown keys so misspellings (`techs`, `catagory`) fail loudly.

export const PORTFOLIO_YML_SCHEMA_VERSION = 3;

export const PortfolioStatusSchema = z.enum([
  'active',
  'shipped',
  'archived',
  'experimental',
  'wip',
]);

export type PortfolioStatus = z.infer<typeof PortfolioStatusSchema>;

const IsoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'must be an ISO calendar date (YYYY-MM-DD)');

// Per-field i18n shape used inside `case_study`. EN is the source-of-truth and
// is required wherever the parent field is present; ES is optional and drops
// to the EN string at render time when missing. Per-field locale dicts (Q2/A)
// keep the YAML compact: structural data isn't repeated per locale.
const LocalizedStringSchema = z
  .object({ en: z.string().min(1), es: z.string().min(1).optional() })
  .strict();

const LocalizedStringArraySchema = z
  .object({
    en: z.array(z.string().min(1)).min(1),
    es: z.array(z.string().min(1)).min(1).optional(),
  })
  .strict();

// Optional, fixed-slot generic project page (Q1/A). The shell renders
// background → pull_quote → numbers → approach → walkthrough_caption in that
// order, skipping any slot that's absent. Use this when a project doesn't
// warrant a full standalone github.io site; for projects that do, set
// `pages_url` instead and the case_study is bypassed.
const CaseStudySchema = z
  .object({
    background: LocalizedStringArraySchema.optional(),
    pull_quote: LocalizedStringSchema.optional(),
    numbers: z
      .array(z.object({ value: z.string().min(1), label: LocalizedStringSchema }).strict())
      .optional(),
    approach: z
      .object({
        body: LocalizedStringSchema.optional(),
        steps: z.array(LocalizedStringSchema).optional(),
      })
      .strict()
      .optional(),
    walkthrough_caption: LocalizedStringSchema.optional(),
  })
  .strict();

export type CaseStudy = z.infer<typeof CaseStudySchema>;
export type LocalizedString = z.infer<typeof LocalizedStringSchema>;
export type LocalizedStringArray = z.infer<typeof LocalizedStringArraySchema>;

// `upstream` names a GitHub repo to enrich an external entry against. Accepts
// either the structured `{ owner, repo }` form or a `"owner/repo"` shorthand
// that the transform normalizes to the structured shape. Only meaningful for
// entries under `.portfolio/<slug>/.portfolio.yml`; entries discovered on
// GitHub already have their own RepoContext and ignore this field.
const UpstreamSchema = z.union([
  z.object({ owner: z.string().min(1), repo: z.string().min(1) }).strict(),
  z
    .string()
    .regex(/^[^/\s]+\/[^/\s]+$/, 'expected "owner/repo"')
    .transform((value) => {
      // Regex above guarantees exactly one slash and non-empty halves.
      const [owner, repo] = value.split('/') as [string, string];
      return { owner, repo };
    }),
]);

export type Upstream = z.infer<typeof UpstreamSchema>;

// External / OSS-contribution entries need a place to describe what the
// author actually did on a project they don't own. `summary` is required when
// `contributions` is present; bullets and PR/commit links are optional. EN is
// source-of-truth, ES is optional and falls back at render time — matches the
// existing `case_study` localization pattern.
const ContributionsSchema = z
  .object({
    summary: LocalizedStringSchema,
    items: z.array(LocalizedStringSchema).optional(),
    links: z
      .array(
        z
          .object({
            label: z.string().min(1),
            url: z.string().url(),
          })
          .strict(),
      )
      .optional(),
  })
  .strict();

export type Contributions = z.infer<typeof ContributionsSchema>;

export const PortfolioYmlSchema = z
  .object({
    schema_version: z.literal(PORTFOLIO_YML_SCHEMA_VERSION),
    // Stable cross-reference identifier. Required so config.json can point at
    // a specific manifest entry (current_focus, timeline UUID resolution)
    // without relying on slug or repo name, which can change.
    uuid: z.string().uuid(),
    title: z.string().min(1).max(120),
    summary: z.string().min(10).max(280),
    tech: z.array(z.string().min(1)).min(1),
    categories: z.array(z.string().min(1)).default([]),
    status: PortfolioStatusSchema,
    featured: z.boolean().default(false),
    order: z.number().int().optional(),
    // Owner's role on this project (e.g. "Lead engineer"). Per-project metadata
    // — the SPA reads this only when displaying that project.
    role: z.string().min(1).optional(),
    started_at: IsoDateSchema,
    ended_at: IsoDateSchema.optional(),
    pages_url: z.string().url().optional(),
    demo_video: z.string().url().optional(),
    // Card hero. Accepts an image (png/jpg/gif/webp) or a video (mp4/webm).
    // Type is inferred at render time from the file extension; absolute
    // http(s) URLs pass through, repo-relative paths resolve to
    // raw.githubusercontent.com on the default branch.
    hero: z.string().min(1).optional(),
    // Project gallery. Mix of images and videos, in display order. Same
    // extension-sniffing + URL resolution as `hero`.
    media: z.array(z.string().min(1)).optional(),
    docs_link: z.string().url().optional(),
    case_study: CaseStudySchema.optional(),
    // External-entry only: names the upstream GitHub repo to enrich against.
    // The manifest builder fetches live metadata (stars, pushed_at, language)
    // when present; YAML-supplied fields win on a field-by-field basis.
    upstream: UpstreamSchema.optional(),
    // The author's contribution to a project they don't own. Required at
    // author-time for external entries (enforced by the builder, not the
    // schema, since the schema is shared with self-mode entries).
    contributions: ContributionsSchema.optional(),
  })
  .strict();

export type PortfolioYml = z.infer<typeof PortfolioYmlSchema>;
