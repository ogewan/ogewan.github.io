import configRaw from '../../../../config.json';

// Single source of truth for site-wide identity, contact, and about-page
// section data. Lives at repo root (`config.json`) so any tooling that needs
// to template the placeholder strings (humans.txt, vite siteUrl) can read the
// same file without crossing a package boundary.
//
// Owner + site fields are required; the about.* sections are optional — when
// a field is absent the corresponding About-page section does not render and
// the remaining sections renumber.

export interface SpeakingEntry {
  readonly year: string;
  readonly kind: string;
  readonly title: string;
  readonly href: string;
}

export interface ShelfEntry {
  readonly num: string;
  readonly title: string;
  readonly author: string;
}

export interface CurrentlyBlock {
  readonly reading: string;
  readonly building: string;
  readonly listening: string;
}

export interface SiteConfig {
  readonly schema_version: 1;
  readonly owner: {
    readonly name: string;
    readonly email: string;
    readonly pronouns: string;
    readonly languages: readonly string[];
    readonly stack: readonly string[];
    readonly github: string;
  };
  readonly site: {
    readonly url: string;
    readonly source_repo: string;
  };
  readonly about?: {
    readonly speaking?: readonly SpeakingEntry[];
    readonly shelf?: readonly ShelfEntry[];
    readonly currently?: CurrentlyBlock;
  };
}

export const siteConfig: SiteConfig = configRaw as SiteConfig;
