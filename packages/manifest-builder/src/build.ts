import { parse as parseYaml } from 'yaml';
import { PortfolioYmlSchema } from './schema.js';
import { enrichEntry, sortManifest, type ManifestEntry, type ManifestWarning } from './manifest.js';
import type { FetchedRepo } from './github.js';

export interface BuildResult {
  manifest: ManifestEntry[];
  warnings: ManifestWarning[];
}

// Validates each fetched .portfolio.yml, converts to an enriched manifest entry,
// or records a warning. Repos without a .portfolio.yml are silently skipped —
// portfolio participation is opt-in.
export function buildManifest(repos: FetchedRepo[]): BuildResult {
  const entries: ManifestEntry[] = [];
  const warnings: ManifestWarning[] = [];

  for (const { context, portfolioYmlText } of repos) {
    if (portfolioYmlText === null) continue;

    let parsed: unknown;
    try {
      parsed = parseYaml(portfolioYmlText);
    } catch (err) {
      warnings.push({
        repo_name: context.name,
        reason: 'yaml parse failed',
        details: err instanceof Error ? err.message : String(err),
      });
      continue;
    }

    const result = PortfolioYmlSchema.safeParse(parsed);
    if (!result.success) {
      warnings.push({
        repo_name: context.name,
        reason: 'schema validation failed',
        details: result.error.issues,
      });
      continue;
    }

    entries.push(enrichEntry(result.data, context));
  }

  return {
    manifest: sortManifest(entries),
    warnings,
  };
}

export { PortfolioYmlSchema } from './schema.js';
export type { ManifestEntry, ManifestWarning } from './manifest.js';
