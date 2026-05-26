import { describe, expect, it } from 'vitest';
import type { PortfolioYml } from './schema.js';
import {
  enrichEntry,
  enrichExternalEntry,
  resolveExternalAssetUrl,
  resolveScreenshotUrl,
  sortManifest,
  type ManifestEntry,
  type RepoContext,
} from './manifest.js';

const repo: RepoContext = {
  owner: 'octocat',
  name: 'hello-world',
  private: false,
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
  media: ['assets/shot.png', '/leading-slash.png', 'https://cdn.example/hosted.png'],
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
  it('merges YAML and repo context and resolves media', () => {
    const entry = enrichEntry(yml, repo);
    expect(entry.slug).toBe('hello-world');
    expect(entry.repo_url).toBe('https://github.com/octocat/hello-world');
    expect(entry.stars).toBe(42);
    expect(entry.media).toEqual([
      'https://raw.githubusercontent.com/octocat/hello-world/main/assets/shot.png',
      'https://raw.githubusercontent.com/octocat/hello-world/main/leading-slash.png',
      'https://cdn.example/hosted.png',
    ]);
  });

  it('handles missing media as empty array', () => {
    const { media: _media, ...rest } = yml;
    void _media;
    const entry = enrichEntry(rest as PortfolioYml, repo);
    expect(entry.media).toEqual([]);
  });

  it('marks github-sourced entries with source: github', () => {
    expect(enrichEntry(yml, repo).source).toBe('github');
  });
});

describe('resolveExternalAssetUrl', () => {
  it('rewrites repo-relative paths under /external/<slug>/', () => {
    expect(resolveExternalAssetUrl('hero.png', 'my-oss', '/external')).toBe(
      '/external/my-oss/hero.png',
    );
  });

  it('strips leading "./" and slashes', () => {
    expect(resolveExternalAssetUrl('./hero.png', 'my-oss', '/external')).toBe(
      '/external/my-oss/hero.png',
    );
    expect(resolveExternalAssetUrl('/hero.png', 'my-oss', '/external')).toBe(
      '/external/my-oss/hero.png',
    );
  });

  it('passes absolute URLs through untouched', () => {
    const abs = 'https://cdn.example.com/hero.png';
    expect(resolveExternalAssetUrl(abs, 'my-oss', '/external')).toBe(abs);
  });

  it('respects a trailing slash on assetBaseUrl', () => {
    expect(resolveExternalAssetUrl('hero.png', 'my-oss', '/external/')).toBe(
      '/external/my-oss/hero.png',
    );
  });
});

describe('enrichExternalEntry', () => {
  const externalYml: PortfolioYml = {
    schema_version: 3,
    uuid: '33333333-3333-4333-8333-333333333333',
    title: 'External Project',
    summary: 'An OSS project I contributed to.',
    tech: ['rust'],
    categories: [],
    status: 'active',
    featured: false,
    started_at: '2024-03-01',
    upstream: { owner: 'someone', repo: 'cool-lib' },
    contributions: {
      summary: { en: 'Added incremental compilation.' },
    },
    hero: 'hero.png',
    media: ['shot-1.png', 'https://cdn.example/external.png'],
  };

  const upstreamContext: RepoContext = {
    owner: 'someone',
    name: 'cool-lib',
    private: false,
    url: 'https://github.com/someone/cool-lib',
    default_branch: 'trunk',
    description: 'A cool library.',
    primary_language: 'Rust',
    stars: 1234,
    pushed_at: '2025-04-10T00:00:00Z',
  };

  it('rewrites hero/media to /external/<slug>/... and tags source=external', () => {
    const entry = enrichExternalEntry(externalYml, 'cool-lib', '/external', upstreamContext);
    expect(entry.source).toBe('external');
    expect(entry.slug).toBe('cool-lib');
    expect(entry.hero).toBe('/external/cool-lib/hero.png');
    expect(entry.media).toEqual([
      '/external/cool-lib/shot-1.png',
      'https://cdn.example/external.png',
    ]);
  });

  it('uses upstream context for stars/description/pushed_at when provided', () => {
    const entry = enrichExternalEntry(externalYml, 'cool-lib', '/external', upstreamContext);
    expect(entry.stars).toBe(1234);
    expect(entry.description).toBe('A cool library.');
    expect(entry.primary_language).toBe('Rust');
    expect(entry.pushed_at).toBe('2025-04-10T00:00:00Z');
    expect(entry.repo_url).toBe('https://github.com/someone/cool-lib');
    expect(entry.default_branch).toBe('trunk');
  });

  it('synthesizes a fallback context when no upstream metadata is available', () => {
    const entry = enrichExternalEntry(externalYml, 'cool-lib', '/external', null);
    expect(entry.stars).toBe(0);
    expect(entry.description).toBeNull();
    expect(entry.primary_language).toBeNull();
    expect(entry.default_branch).toBe('main');
    // Falls back to started_at so sort doesn't sink it.
    expect(entry.pushed_at).toBe('2024-03-01T00:00:00Z');
    // Without upstream context we still derive a repo_url from yml.upstream.
    expect(entry.repo_url).toBe('https://github.com/someone/cool-lib');
  });

  it('uses ended_at as pushed_at fallback when present', () => {
    const entry = enrichExternalEntry(
      { ...externalYml, ended_at: '2025-02-15' },
      'cool-lib',
      '/external',
      null,
    );
    expect(entry.pushed_at).toBe('2025-02-15T00:00:00Z');
  });

  it('carries through contributions block', () => {
    const entry = enrichExternalEntry(externalYml, 'cool-lib', '/external', upstreamContext);
    expect(entry.contributions?.summary.en).toBe('Added incremental compilation.');
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
