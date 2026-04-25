import type { ManifestEntry } from '@portfolio/manifest-builder';
import fixture from './manifest.fixture.json';

// In Phase 4 the shell consumes a hand-written fixture so the project grid has
// real content to render before the GitHub Actions pipeline lands. Phase 7
// will swap this import to read the real manifest.json that the workflow
// commits to the repo root, with the fixture kept as a fallback for local
// dev when the manifest hasn't been generated yet.
//
// The cast is safe because the fixture was authored against ManifestEntry
// directly; if the schema drifts, the typecheck catches it at build time.
export const manifest: readonly ManifestEntry[] = fixture as ManifestEntry[];

export function findEntryBySlug(slug: string): ManifestEntry | undefined {
  return manifest.find((entry) => entry.slug === slug);
}

// Pre-derived collections used by the projects page chrome.
export const featuredEntries = manifest.filter((e) => e.featured);
export const allCategories = Array.from(new Set(manifest.flatMap((e) => e.categories))).sort();
