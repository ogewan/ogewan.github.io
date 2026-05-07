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
// - screenshots are repo-relative paths; resolution to raw.githubusercontent.com
//   happens during enrichment, not here.
// - .strict() rejects unknown keys so misspellings (`techs`, `catagory`) fail loudly.

export const PORTFOLIO_YML_SCHEMA_VERSION = 2;

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
    hero: z.string().min(1).optional(),
    screenshots: z.array(z.string().min(1)).optional(),
    docs_link: z.string().url().optional(),
  })
  .strict();

export type PortfolioYml = z.infer<typeof PortfolioYmlSchema>;
