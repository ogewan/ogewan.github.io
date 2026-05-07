import type { ManifestEntry } from '@portfolio/manifest-builder';
import fixture from './manifest.fixture.json';
import { siteConfig } from './site-config';

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

const rawManifest: readonly ManifestEntry[] = realManifest ?? (fixture as readonly ManifestEntry[]);

// Sort comparator used across the SPA:
//   1. current_focus (config.current_focus → matched by uuid) first
//   2. featured: true, by pushed_at descending
//   3. everything else, by pushed_at descending
function compareEntries(a: ManifestEntry, b: ManifestEntry): number {
  const focusUuid = siteConfig.current_focus;
  if (focusUuid) {
    if (a.uuid === focusUuid) return -1;
    if (b.uuid === focusUuid) return 1;
  }
  if (a.featured !== b.featured) return a.featured ? -1 : 1;
  return b.pushed_at.localeCompare(a.pushed_at);
}

export const manifest: readonly ManifestEntry[] = [...rawManifest].sort(compareEntries);

export function findEntryBySlug(slug: string): ManifestEntry | undefined {
  return manifest.find((entry) => entry.slug === slug);
}

export function findEntryByUuid(uuid: string): ManifestEntry | undefined {
  return manifest.find((entry) => entry.uuid === uuid);
}

// The entry pinned via config.current_focus, when it resolves. Falls back to
// the most recently pushed featured entry. Returns undefined when neither
// exists — Hero / About-Currently consumers should hide their slots in that
// case rather than rendering empty placeholders.
export const currentFocusEntry: ManifestEntry | undefined = (() => {
  if (siteConfig.current_focus) {
    const pinned = findEntryByUuid(siteConfig.current_focus);
    if (pinned) return pinned;
  }
  return manifest.find((e) => e.featured);
})();

// Pre-derived collections used by the projects page chrome.
export const featuredEntries = manifest.filter((e) => e.featured);
export const allCategories = Array.from(new Set(manifest.flatMap((e) => e.categories))).sort();
