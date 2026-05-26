import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadExternalProjects } from './external.js';

describe('loadExternalProjects', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(join(tmpdir(), 'external-test-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('returns [] when .portfolio/ does not exist', async () => {
    const result = await loadExternalProjects(root);
    expect(result).toEqual([]);
  });

  it('returns [] when .portfolio/ is empty', async () => {
    await mkdir(join(root, '.portfolio'));
    const result = await loadExternalProjects(root);
    expect(result).toEqual([]);
  });

  it('discovers a subdirectory containing .portfolio.yml', async () => {
    const dir = join(root, '.portfolio', 'cool-lib');
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, '.portfolio.yml'), 'schema_version: 3\n', 'utf8');

    const result = await loadExternalProjects(root);
    expect(result).toHaveLength(1);
    expect(result[0]?.slug).toBe('cool-lib');
    expect(result[0]?.portfolioYmlText).toBe('schema_version: 3\n');
  });

  it('skips subdirectories without a .portfolio.yml', async () => {
    await mkdir(join(root, '.portfolio', 'no-yml'), { recursive: true });
    const haveYml = join(root, '.portfolio', 'has-yml');
    await mkdir(haveYml, { recursive: true });
    await writeFile(join(haveYml, '.portfolio.yml'), '---\n', 'utf8');

    const result = await loadExternalProjects(root);
    expect(result.map((r) => r.slug)).toEqual(['has-yml']);
  });

  it('skips loose files at .portfolio/ root', async () => {
    await mkdir(join(root, '.portfolio'));
    await writeFile(join(root, '.portfolio', 'README.md'), '# notes', 'utf8');
    const result = await loadExternalProjects(root);
    expect(result).toEqual([]);
  });
});
