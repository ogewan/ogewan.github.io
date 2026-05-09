import configRaw from '../../../../config.json';

// Single source of truth for site-wide identity, contact, and about-page
// section data. Lives at repo root (`config.json`) so any tooling that needs
// to template the placeholder strings (humans.txt, vite siteUrl) can read the
// same file without crossing a package boundary.
//
// Owner + site fields are required; the about.* sections are optional — when
// a field is absent the corresponding About-page section does not render and
// the remaining sections renumber. `current_focus` (UUID) and the timeline
// reference manifest entries by their `uuid` field. Timeline node copy and
// chrome strings live inline in the locale-as-leaf shape ({ en, es }).

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

export type Localized<T> = Readonly<Record<'en' | 'es', T>>;

// A timeline entry is either a bare UUID (full delegation to a manifest entry —
// title/body sourced from the manifest, category defaulted to 'work', current
// computed from config.current_focus) or an inline structural object that
// carries its own locale-as-leaf title/body.
export type TimelineEntry =
  | string // UUID, references a manifest entry
  | {
      readonly id: string;
      readonly category: TimelineCategory;
      readonly start: string; // YYYY-MM-DD
      readonly end?: string; // YYYY-MM-DD, omitted = present
      readonly role?: Localized<string>;
      readonly org?: Localized<string>;
      readonly tags?: readonly string[];
      readonly current?: boolean;
      readonly title?: Localized<string>;
      readonly body?: Localized<string>;
    };

export interface TimelineChromeConfig {
  readonly heading: Localized<string>;
  readonly subtitle: Localized<string>;
  readonly filterAll: Localized<string>;
  readonly filterWork: Localized<string>;
  readonly filterSide: Localized<string>;
  readonly filterEducation: Localized<string>;
  readonly filterWriting: Localized<string>;
  readonly active: Localized<string>;
  readonly expand: Localized<string>;
  readonly collapse: Localized<string>;
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
  readonly timelineChrome?: TimelineChromeConfig;
}

export const siteConfig: SiteConfig = configRaw as SiteConfig;
