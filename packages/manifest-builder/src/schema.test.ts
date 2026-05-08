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
    schema_version: 3,
    uuid: '11111111-1111-4111-8111-111111111111',
    title: 'T',
    summary: 'Ten chars minimum summary.',
    tech: ['typescript'],
    status: 'active',
    started_at: '2024-01-01',
  } as const;

  it('rejects schema_version other than 3', () => {
    const result = PortfolioYmlSchema.safeParse({ ...base, schema_version: 2 });
    expect(result.success).toBe(false);
  });

  it('rejects a missing uuid', () => {
    const { uuid: _u, ...rest } = base;
    void _u;
    const result = PortfolioYmlSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid string in the uuid field', () => {
    const result = PortfolioYmlSchema.safeParse({ ...base, uuid: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });

  it('accepts an optional role string', () => {
    const result = PortfolioYmlSchema.safeParse({ ...base, role: 'Lead engineer' });
    expect(result.success).toBe(true);
  });

  it('accepts a populated case_study block with all slots', () => {
    const result = PortfolioYmlSchema.safeParse({
      ...base,
      case_study: {
        background: { en: ['Para 1.', 'Para 2.'], es: ['Párrafo 1.', 'Párrafo 2.'] },
        pull_quote: { en: 'Design for the room.', es: 'Diseña para la sala.' },
        numbers: [
          { value: '14ms', label: { en: 'Latency', es: 'Latencia' } },
          { value: '28', label: { en: 'Consoles' } },
        ],
        approach: {
          body: { en: 'Three commitments.' },
          steps: [{ en: 'Lock the grid.' }, { en: 'Reserve color.' }],
        },
        walkthrough_caption: { en: 'Demo · 2:14' },
      },
    });
    expect(result.success).toBe(true);
  });

  it('accepts a case_study with EN-only locale strings', () => {
    const result = PortfolioYmlSchema.safeParse({
      ...base,
      case_study: { pull_quote: { en: 'Just English.' } },
    });
    expect(result.success).toBe(true);
  });

  it('rejects a case_study localized string missing the required EN field', () => {
    const result = PortfolioYmlSchema.safeParse({
      ...base,
      case_study: { pull_quote: { es: 'Solo español.' } },
    });
    expect(result.success).toBe(false);
  });

  it('rejects unknown keys inside case_study (strict mode)', () => {
    const result = PortfolioYmlSchema.safeParse({
      ...base,
      case_study: { conclusion: { en: 'Wrap-up.' } },
    });
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
