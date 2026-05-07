import configRaw from '../../../../config.json';

// Single source of truth for site-wide identity, contact, and about-page
// section data. Lives at repo root (`config.json`) so any tooling that needs
// to template the placeholder strings (humans.txt, vite siteUrl) can read the
// same file without crossing a package boundary.
//
// Owner + site fields are required; the about.* sections are optional — when
// a field is absent the corresponding About-page section does not render and
// the remaining sections renumber. `current_focus` (UUID) and the timeline
// reference manifest entries by their `uuid` field.

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
  readonly building?: string;
  readonly listening: string;
}

export interface LocalizedString {
  readonly en: string;
  readonly es?: string;
}

export type TimelineEntry =
  | string // UUID — resolves against a manifest entry at build/render time
  | {
      readonly kind: 'employment' | 'event' | 'project';
      readonly title: LocalizedString;
      readonly role?: string;
      readonly org?: string;
      readonly start: string; // YYYY-MM
      readonly end?: string; // omitted = present
      readonly body?: LocalizedString;
      readonly category?: string;
      readonly projects?: readonly string[]; // nested UUID references
    };

export interface SiteConfig {
  readonly schema_version: 1;
  readonly owner: {
    readonly name: string;
    readonly email: string;
    readonly pronouns: string;
    readonly languages: readonly string[];
    readonly stack: readonly string[];
    readonly github: string;
    readonly availability: string;
  };
  readonly site: {
    readonly url: string;
    readonly source_repo: string;
  };
  readonly current_focus?: string; // UUID
  readonly selected?: {
    readonly year_override?: number;
  };
  readonly about?: {
    readonly speaking?: readonly SpeakingEntry[];
    readonly shelf?: readonly ShelfEntry[];
    readonly currently?: CurrentlyBlock;
  };
  readonly timeline?: readonly TimelineEntry[];
}

export const siteConfig: SiteConfig = configRaw as SiteConfig;
