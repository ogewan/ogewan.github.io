import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildManifest, buildExternalEntries, mergeEntries } from './build.js';
import type { FetchedRepo } from './github.js';
import type { FetchedExternal } from './external.js';
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

  it('marks all GitHub-sourced entries with source: github', () => {
    const repos: FetchedRepo[] = [
      {
        context: baseContext('minimal-project', '2025-01-01T00:00:00Z'),
        portfolioYmlText: readFixture('minimal.portfolio.yml'),
      },
    ];
    const { manifest } = buildManifest(repos);
    expect(manifest[0]?.source).toBe('github');
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

const MINIMAL_EXTERNAL_YML = `schema_version: 3
uuid: aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee
title: External
summary: A project I contributed to.
tech:
  - rust
status: active
started_at: '2024-05-01'
upstream: someone/cool-lib
contributions:
  summary:
    en: Added incremental compilation.
hero: hero.png
`;

describe('buildExternalEntries', () => {
  it('builds an entry from a fetched external + upstream context', () => {
    const inputs = [
      {
        external: {
          slug: 'cool-lib',
          dir: '/tmp/.portfolio/cool-lib',
          portfolioYmlText: MINIMAL_EXTERNAL_YML,
        } satisfies FetchedExternal,
        upstreamContext: baseContext('cool-lib', '2025-04-10T00:00:00Z'),
      },
    ];

    const { manifest, warnings } = buildExternalEntries(inputs);
    expect(manifest).toHaveLength(1);
    expect(warnings).toHaveLength(0);
    expect(manifest[0]?.source).toBe('external');
    expect(manifest[0]?.slug).toBe('cool-lib');
    expect(manifest[0]?.hero).toBe('/external/cool-lib/hero.png');
  });

  it('emits a warning when an external entry has no contributions block', () => {
    const ymlNoContrib = MINIMAL_EXTERNAL_YML.replace(
      /contributions:[\s\S]*?Added incremental compilation\.\n/,
      '',
    );
    const inputs = [
      {
        external: {
          slug: 'cool-lib',
          dir: '/tmp/x',
          portfolioYmlText: ymlNoContrib,
        } satisfies FetchedExternal,
        upstreamContext: baseContext('cool-lib', '2025-04-10T00:00:00Z'),
      },
    ];
    const { manifest, warnings } = buildExternalEntries(inputs);
    expect(manifest).toHaveLength(1);
    expect(warnings.some((w) => w.reason.includes('contributions'))).toBe(true);
  });

  it('emits a warning when there is no upstream and no live metadata', () => {
    const ymlNoUpstream = MINIMAL_EXTERNAL_YML.replace(/upstream: someone\/cool-lib\n/, '');
    const inputs = [
      {
        external: {
          slug: 'orphan',
          dir: '/tmp/x',
          portfolioYmlText: ymlNoUpstream,
        } satisfies FetchedExternal,
        upstreamContext: null,
      },
    ];
    const { manifest, warnings } = buildExternalEntries(inputs);
    expect(manifest).toHaveLength(1);
    expect(warnings.some((w) => w.reason.includes('no upstream and no live metadata'))).toBe(true);
  });

  it('renames external slug on collision with a github slug and warns', () => {
    const githubInputs: FetchedRepo[] = [
      {
        context: baseContext('cool-lib', '2025-01-01T00:00:00Z'),
        portfolioYmlText: readFixture('minimal.portfolio.yml'),
      },
    ];
    const externalInputs = [
      {
        external: {
          slug: 'cool-lib',
          dir: '/tmp/x',
          portfolioYmlText: MINIMAL_EXTERNAL_YML,
        } satisfies FetchedExternal,
        upstreamContext: baseContext('cool-lib', '2025-04-10T00:00:00Z'),
      },
    ];

    const { manifest: githubEntries } = buildManifest(githubInputs);
    const { manifest: externalEntries } = buildExternalEntries(externalInputs);
    const { manifest, warnings } = mergeEntries(githubEntries, externalEntries);

    expect(manifest.map((e) => e.slug).sort()).toEqual(['cool-lib', 'cool-lib-external']);
    expect(warnings.some((w) => w.reason.includes('slug collides'))).toBe(true);
  });

  it('warns on duplicate uuid across github + external pools', () => {
    const sharedUuid = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee'; // matches MINIMAL_EXTERNAL_YML

    const ymlWithSameUuid = `schema_version: 3
uuid: ${sharedUuid}
title: Collider
summary: Picks the same uuid as the external entry on purpose.
tech:
  - typescript
status: active
started_at: '2024-01-01'
`;
    const githubInputs: FetchedRepo[] = [
      {
        context: baseContext('collider', '2025-01-01T00:00:00Z'),
        portfolioYmlText: ymlWithSameUuid,
      },
    ];
    const externalInputs = [
      {
        external: {
          slug: 'cool-lib',
          dir: '/tmp/x',
          portfolioYmlText: MINIMAL_EXTERNAL_YML,
        } satisfies FetchedExternal,
        upstreamContext: baseContext('cool-lib', '2025-04-10T00:00:00Z'),
      },
    ];

    const { manifest: githubEntries } = buildManifest(githubInputs);
    const { manifest: externalEntries } = buildExternalEntries(externalInputs);
    const { warnings } = mergeEntries(githubEntries, externalEntries);

    expect(warnings.some((w) => w.reason.startsWith('duplicate uuid'))).toBe(true);
  });

  it('records a schema-validation warning and skips invalid yml', () => {
    const broken = 'schema_version: 3\ntitle: only-title\n';
    const inputs = [
      {
        external: {
          slug: 'broken',
          dir: '/tmp/x',
          portfolioYmlText: broken,
        } satisfies FetchedExternal,
        upstreamContext: null,
      },
    ];
    const { manifest, warnings } = buildExternalEntries(inputs);
    expect(manifest).toHaveLength(0);
    expect(warnings[0]?.reason).toBe('schema validation failed');
  });
});
