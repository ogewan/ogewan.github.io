import type { PortfolioYml } from './schema.js';

// A single manifest entry: the validated .portfolio.yml fields plus GitHub-sourced
// enrichment. The shell consumes this shape directly, so anything it needs at render
// time must live here.
export interface ManifestEntry {
  slug: string;
  repo_name: string;
  repo_url: string;
  default_branch: string;
  description: string | null;
  primary_language: string | null;
  stars: number;
  pushed_at: string;
  schema_version: PortfolioYml['schema_version'];
  uuid: PortfolioYml['uuid'];
  title: PortfolioYml['title'];
  summary: PortfolioYml['summary'];
  tech: PortfolioYml['tech'];
  categories: PortfolioYml['categories'];
  status: PortfolioYml['status'];
  featured: PortfolioYml['featured'];
  order: PortfolioYml['order'];
  role?: string;
  started_at: PortfolioYml['started_at'];
  ended_at: PortfolioYml['ended_at'];
  pages_url: PortfolioYml['pages_url'];
  demo_video: PortfolioYml['demo_video'];
  hero?: string;
  screenshots: string[];
  docs_link: PortfolioYml['docs_link'];
}

export interface ManifestWarning {
  repo_name: string;
  reason: string;
  details?: unknown;
}

export interface RepoContext {
  owner: string;
  name: string;
  url: string;
  default_branch: string;
  description: string | null;
  primary_language: string | null;
  stars: number;
  pushed_at: string;
}

// Turns a repo-relative screenshot path into a raw.githubusercontent.com URL on the
// repo's default branch. Absolute URLs (http/https) pass through untouched so
// authors can reference externally hosted images if they want to.
export function resolveScreenshotUrl(
  path: string,
  owner: string,
  repo: string,
  branch: string,
): string {
  if (/^https?:\/\//i.test(path)) return path;
  const cleanPath = path.replace(/^\/+/, '');
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${cleanPath}`;
}

export function enrichEntry(yml: PortfolioYml, repo: RepoContext): ManifestEntry {
  const hero = yml.hero
    ? resolveScreenshotUrl(yml.hero, repo.owner, repo.name, repo.default_branch)
    : undefined;
  const screenshots = (yml.screenshots ?? []).map((path) =>
    resolveScreenshotUrl(path, repo.owner, repo.name, repo.default_branch),
  );

  return {
    slug: repo.name,
    repo_name: repo.name,
    repo_url: repo.url,
    default_branch: repo.default_branch,
    description: repo.description,
    primary_language: repo.primary_language,
    stars: repo.stars,
    pushed_at: repo.pushed_at,
    schema_version: yml.schema_version,
    uuid: yml.uuid,
    title: yml.title,
    summary: yml.summary,
    tech: yml.tech,
    categories: yml.categories,
    status: yml.status,
    featured: yml.featured,
    order: yml.order,
    ...(yml.role !== undefined ? { role: yml.role } : {}),
    started_at: yml.started_at,
    ended_at: yml.ended_at,
    pages_url: yml.pages_url,
    demo_video: yml.demo_video,
    ...(hero !== undefined ? { hero } : {}),
    screenshots,
    docs_link: yml.docs_link,
  };
}

// Sort order per the brief: featured first, then manual `order` ascending,
// then by pushed_at descending (most recently pushed wins ties).
// Entries without `order` sort after entries with `order`.
export function sortManifest(entries: ManifestEntry[]): ManifestEntry[] {
  return [...entries].sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;

    const aHasOrder = a.order !== undefined;
    const bHasOrder = b.order !== undefined;
    if (aHasOrder && bHasOrder && a.order !== b.order) {
      return (a.order ?? 0) - (b.order ?? 0);
    }
    if (aHasOrder !== bHasOrder) return aHasOrder ? -1 : 1;

    return b.pushed_at.localeCompare(a.pushed_at);
  });
}
