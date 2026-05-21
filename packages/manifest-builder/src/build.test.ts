import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest } from './build.js';
import type { FetchedRepo } from './github.js';
import type { RepoContext } from './manifest.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '..', 'fixtures');
const readFixture = (name: string): string => readFileSync(resolve(FIXTURES, name), 'utf8');

const baseContext = (name: string, pushed_at: string): RepoContext => ({
  owner: 'octocat',
  name,
  private: false,
  url: `https://github.com/octocat/${name}`,
  default_branch: 'main',
  description: null,
  primary_language: null,
  stars: 0,
  pushed_at,
});

describe('buildManifest', () => {
  it('includes valid entries and records warnings for invalid ones', () => {
    const repos: FetchedRepo[] = [
      {
        context: baseContext('minimal-project', '2025-01-01T00:00:00Z'),
        portfolioYmlText: readFixture('minimal.portfolio.yml'),
      },
      {
        context: baseContext('full-project', '2024-06-01T00:00:00Z'),
        portfolioYmlText: readFixture('full.portfolio.yml'),
      },
      {
        context: baseContext('broken', '2024-01-01T00:00:00Z'),
        portfolioYmlText: readFixture('invalid-missing-title.portfolio.yml'),
      },
      {
        context: baseContext('no-portfolio-yml', '2024-01-01T00:00:00Z'),
        portfolioYmlText: null,
      },
    ];

    const { manifest, warnings } = buildManifest(repos);

    expect(manifest).toHaveLength(2);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.repo_name).toBe('broken');
    expect(warnings[0]?.reason).toBe('schema validation failed');
  });

  it('applies the sort order: featured → order → pushed_at desc', () => {
    const repos: FetchedRepo[] = [
      {
        context: baseContext('full-project', '2024-06-01T00:00:00Z'),
        portfolioYmlText: readFixture('full.portfolio.yml'),
      },
      {
        context: baseContext('minimal-project', '2025-01-01T00:00:00Z'),
        portfolioYmlText: readFixture('minimal.portfolio.yml'),
      },
    ];

    const { manifest } = buildManifest(repos);
    // full-project is featured:true, so it should come first even though
    // minimal-project was pushed more recently.
    expect(manifest[0]?.slug).toBe('full-project');
    expect(manifest[1]?.slug).toBe('minimal-project');
  });

  it('records a warning on unparseable YAML', () => {
    const repos: FetchedRepo[] = [
      {
        context: baseContext('bad-yaml', '2024-01-01T00:00:00Z'),
        portfolioYmlText: '::: not: valid: yaml\n  - [unclosed',
      },
    ];
    const { manifest, warnings } = buildManifest(repos);
    expect(manifest).toHaveLength(0);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]?.reason).toMatch(/yaml parse failed|schema validation failed/);
  });

  it('resolves media to raw.githubusercontent.com URLs', () => {
    const repos: FetchedRepo[] = [
      {
        context: baseContext('full-project', '2024-06-01T00:00:00Z'),
        portfolioYmlText: readFixture('full.portfolio.yml'),
      },
    ];
    const { manifest } = buildManifest(repos);
    const entry = manifest[0];
    expect(entry?.media[0]).toBe(
      'https://raw.githubusercontent.com/octocat/full-project/main/assets/shot-01.png',
    );
    // Absolute URLs pass through untouched.
    expect(entry?.media[2]).toBe('https://example.com/external.png');
  });
});
