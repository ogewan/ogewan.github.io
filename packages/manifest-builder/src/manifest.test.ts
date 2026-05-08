import { describe, expect, it } from 'vitest';
import type { PortfolioYml } from './schema.js';
import {
  enrichEntry,
  resolveScreenshotUrl,
  sortManifest,
  type ManifestEntry,
  type RepoContext,
} from './manifest.js';

const repo: RepoContext = {
  owner: 'octocat',
  name: 'hello-world',
  url: 'https://github.com/octocat/hello-world',
  default_branch: 'main',
  description: 'demo repo',
  primary_language: 'TypeScript',
  stars: 42,
  pushed_at: '2025-01-10T12:00:00Z',
};

const yml: PortfolioYml = {
  schema_version: 3,
  uuid: '22222222-2222-4222-8222-222222222222',
  title: 'Hello',
  summary: 'A friendly greeting project.',
  tech: ['typescript'],
  categories: [],
  status: 'active',
  featured: false,
  started_at: '2024-01-01',
  screenshots: ['assets/shot.png', '/leading-slash.png', 'https://cdn.example/hosted.png'],
};

describe('resolveScreenshotUrl', () => {
  it('resolves repo-relative paths to raw.githubusercontent.com', () => {
    expect(resolveScreenshotUrl('assets/shot.png', 'octocat', 'hello-world', 'main')).toBe(
      'https://raw.githubusercontent.com/octocat/hello-world/main/assets/shot.png',
    );
  });

  it('strips leading slashes from repo-relative paths', () => {
    expect(resolveScreenshotUrl('/leading.png', 'octocat', 'hello-world', 'main')).toBe(
      'https://raw.githubusercontent.com/octocat/hello-world/main/leading.png',
    );
  });

  it('passes absolute http(s) URLs through untouched', () => {
    const abs = 'https://cdn.example.com/external.png';
    expect(resolveScreenshotUrl(abs, 'octocat', 'hello-world', 'main')).toBe(abs);
  });
});

describe('enrichEntry', () => {
  it('merges YAML and repo context and resolves screenshots', () => {
    const entry = enrichEntry(yml, repo);
    expect(entry.slug).toBe('hello-world');
    expect(entry.repo_url).toBe('https://github.com/octocat/hello-world');
    expect(entry.stars).toBe(42);
    expect(entry.screenshots).toEqual([
      'https://raw.githubusercontent.com/octocat/hello-world/main/assets/shot.png',
      'https://raw.githubusercontent.com/octocat/hello-world/main/leading-slash.png',
      'https://cdn.example/hosted.png',
    ]);
  });

  it('handles missing screenshots as empty array', () => {
    const { screenshots: _screenshots, ...rest } = yml;
    void _screenshots;
    const entry = enrichEntry(rest as PortfolioYml, repo);
    expect(entry.screenshots).toEqual([]);
  });
});

function mkEntry(overrides: Partial<ManifestEntry>): ManifestEntry {
  return {
    ...enrichEntry(yml, repo),
    ...overrides,
  };
}

describe('sortManifest', () => {
  it('sorts featured entries before non-featured', () => {
    const sorted = sortManifest([
      mkEntry({ slug: 'a', featured: false, pushed_at: '2025-01-10T00:00:00Z' }),
      mkEntry({ slug: 'b', featured: true, pushed_at: '2020-01-01T00:00:00Z' }),
    ]);
    expect(sorted.map((e) => e.slug)).toEqual(['b', 'a']);
  });

  it('within featured, sorts by order ascending', () => {
    const sorted = sortManifest([
      mkEntry({ slug: 'second', featured: true, order: 2 }),
      mkEntry({ slug: 'first', featured: true, order: 1 }),
      mkEntry({ slug: 'third', featured: true, order: 3 }),
    ]);
    expect(sorted.map((e) => e.slug)).toEqual(['first', 'second', 'third']);
  });

  it('entries with order come before entries without order', () => {
    const sorted = sortManifest([
      mkEntry({ slug: 'no-order', featured: false }),
      mkEntry({ slug: 'has-order', featured: false, order: 5 }),
    ]);
    expect(sorted.map((e) => e.slug)).toEqual(['has-order', 'no-order']);
  });

  it('falls back to pushed_at descending when order is unset for both', () => {
    const sorted = sortManifest([
      mkEntry({ slug: 'older', pushed_at: '2024-01-01T00:00:00Z' }),
      mkEntry({ slug: 'newer', pushed_at: '2025-06-01T00:00:00Z' }),
    ]);
    expect(sorted.map((e) => e.slug)).toEqual(['newer', 'older']);
  });

  it('is stable when featured, order, and pushed_at all tie', () => {
    const a = mkEntry({ slug: 'a', pushed_at: '2025-01-01T00:00:00Z' });
    const b = mkEntry({ slug: 'b', pushed_at: '2025-01-01T00:00:00Z' });
    const sorted = sortManifest([a, b]);
    expect(sorted[0]?.slug).toBe('a');
    expect(sorted[1]?.slug).toBe('b');
  });
});
