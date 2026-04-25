import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';
import { PortfolioYmlSchema } from './schema.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '..', 'fixtures');

function loadFixture(name: string): unknown {
  return parseYaml(readFileSync(resolve(FIXTURES, name), 'utf8'));
}

describe('PortfolioYmlSchema — fixtures', () => {
  it('accepts a minimal valid file', () => {
    const result = PortfolioYmlSchema.safeParse(loadFixture('minimal.portfolio.yml'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.title).toBe('Minimal Project');
      expect(result.data.featured).toBe(false); // default
      expect(result.data.categories).toEqual([]); // default
    }
  });

  it('accepts a fully populated file', () => {
    const result = PortfolioYmlSchema.safeParse(loadFixture('full.portfolio.yml'));
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.featured).toBe(true);
      expect(result.data.order).toBe(1);
      expect(result.data.screenshots).toHaveLength(3);
    }
  });

  it('rejects a file missing the required title field', () => {
    const result = PortfolioYmlSchema.safeParse(loadFixture('invalid-missing-title.portfolio.yml'));
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path.join('.'));
      expect(paths).toContain('title');
    }
  });
});

describe('PortfolioYmlSchema — edge cases', () => {
  const base = {
    schema_version: 1,
    title: 'T',
    summary: 'Ten chars minimum summary.',
    tech: ['typescript'],
    status: 'active',
    started_at: '2024-01-01',
  } as const;

  it('rejects schema_version other than 1', () => {
    const result = PortfolioYmlSchema.safeParse({ ...base, schema_version: 2 });
    expect(result.success).toBe(false);
  });

  it('rejects unknown status values', () => {
    const result = PortfolioYmlSchema.safeParse({ ...base, status: 'sunset' });
    expect(result.success).toBe(false);
  });

  it('rejects non-ISO dates', () => {
    const result = PortfolioYmlSchema.safeParse({ ...base, started_at: '06/01/2024' });
    expect(result.success).toBe(false);
  });

  it('rejects malformed URLs in pages_url', () => {
    const result = PortfolioYmlSchema.safeParse({ ...base, pages_url: 'not-a-url' });
    expect(result.success).toBe(false);
  });

  it('rejects empty tech array', () => {
    const result = PortfolioYmlSchema.safeParse({ ...base, tech: [] });
    expect(result.success).toBe(false);
  });

  it('rejects summary shorter than 10 chars', () => {
    const result = PortfolioYmlSchema.safeParse({ ...base, summary: 'short' });
    expect(result.success).toBe(false);
  });

  it('rejects unknown top-level keys (strict mode)', () => {
    const result = PortfolioYmlSchema.safeParse({ ...base, techs: ['oops'] });
    expect(result.success).toBe(false);
    if (!result.success) {
      const codes = result.error.issues.map((i) => i.code);
      expect(codes).toContain('unrecognized_keys');
    }
  });

  it('accepts ended_at only when it is a valid ISO date', () => {
    expect(PortfolioYmlSchema.safeParse({ ...base, ended_at: '2025-01-01' }).success).toBe(true);
    expect(PortfolioYmlSchema.safeParse({ ...base, ended_at: 'sometime' }).success).toBe(false);
  });
});
