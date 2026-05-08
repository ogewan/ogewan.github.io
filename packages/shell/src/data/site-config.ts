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

export type TimelineCategory = 'work' | 'side' | 'education' | 'writing';

// A timeline entry is either a bare UUID (full delegation to a manifest entry —
// title/body sourced from the manifest, category defaulted to 'work', current
// computed from config.current_focus) or an inline structural object whose
// localised title/body strings live in `packages/content/locales/{en,es}/
// timeline.json` keyed by `id`.
export type TimelineEntry =
  | string // UUID, references a manifest entry
  | {
      readonly id: string; // stable key used to look up locale strings
      readonly category: TimelineCategory;
      readonly start: string; // YYYY-MM-DD
      readonly end?: string; // YYYY-MM-DD, omitted = present
      readonly role?: string;
      readonly org?: string;
      readonly tags?: readonly string[];
      readonly current?: boolean;
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
