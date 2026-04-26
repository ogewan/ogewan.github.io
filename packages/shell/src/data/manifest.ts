import type { ManifestEntry } from '@portfolio/manifest-builder';
import fixture from './manifest.fixture.json';

// Phase 7: prefer the real manifest.json that the GH Actions workflow commits
// to the repo root. Fall back to the hand-written fixture during local dev
// when the workflow hasn't run (or the file has been removed deliberately).
//
// `import.meta.glob` is resolved at build time by Vite. If the matching file
// exists, it's emitted as a static import and the values object has one entry;
// if not, the object is empty and we fall through to the fixture. This keeps
// the fallback dynamic-import-free (no async boundary in the shell).
const realManifests = import.meta.glob('../../../../manifest.json', {
  eager: true,
  import: 'default',
}) as Record<string, readonly ManifestEntry[]>;
const realManifest = Object.values(realManifests)[0];

export const manifest: readonly ManifestEntry[] =
  realManifest ?? (fixture as readonly ManifestEntry[]);

export function findEntryBySlug(slug: string): ManifestEntry | undefined {
  return manifest.find((entry) => entry.slug === slug);
}

// Pre-derived collections used by the projects page chrome.
export const featuredEntries = manifest.filter((e) => e.featured);
export const allCategories = Array.from(new Set(manifest.flatMap((e) => e.categories))).sort();
