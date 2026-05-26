import { readdir, readFile, stat } from 'node:fs/promises';
import { resolve, join } from 'node:path';

// Locally-authored portfolio entries live at
// `<rootDir>/.portfolio/<slug>/.portfolio.yml`, with hero/media assets sitting
// alongside the yml. Used for OSS projects the user contributed to but does
// not own (and thus can't commit a `.portfolio.yml` upstream).
export interface FetchedExternal {
  slug: string;
  dir: string;
  portfolioYmlText: string;
}

export async function loadExternalProjects(rootDir: string): Promise<FetchedExternal[]> {
  const externalDir = resolve(rootDir, '.portfolio');

  let entries: string[];
  try {
    entries = await readdir(externalDir);
  } catch {
    // Missing .portfolio/ is the common case for projects without externals.
    return [];
  }

  const results: FetchedExternal[] = [];
  for (const entry of entries) {
    const dir = join(externalDir, entry);

    let dirStat;
    try {
      dirStat = await stat(dir);
    } catch {
      continue;
    }
    if (!dirStat.isDirectory()) continue;

    const ymlPath = join(dir, '.portfolio.yml');
    let portfolioYmlText: string;
    try {
      portfolioYmlText = await readFile(ymlPath, 'utf8');
    } catch {
      // Skip subdirectories without a yml (matches opt-in semantics of the
      // GitHub crawl).
      continue;
    }

    results.push({ slug: entry, dir, portfolioYmlText });
  }

  return results;
}
