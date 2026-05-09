// Timeline data shape — shared between the React shell (which loads the JSON
// and passes it to the Angular custom element as a property) and the Angular
// component (which renders it). Lives in @portfolio/content so milestones can
// be edited without touching either framework's component code.

export type TimelineCategory = 'work' | 'side' | 'education' | 'writing';

export type SupportedLocale = 'en' | 'es';

// Locale-as-leaf wrapper — every translatable string is { en, es } so each
// piece of copy lives next to its translations rather than in a parallel tree.
export type Localized<T> = Readonly<Record<SupportedLocale, T>>;

export interface TimelineNode {
  readonly id: string;
  readonly category: TimelineCategory;
  // Use string year ranges so the component doesn't have to format dates.
  // "2024 — present", "2018 — 2020", "2016".
  readonly when: string;
  // Sortable timestamp — ISO date string of the START of this milestone.
  // Used for chronological ordering; not displayed.
  readonly startedAt: string;
  // i18n key — looks up the strings in TIMELINE_STRINGS.nodes.
  readonly i18nKey: string;
  // Tags shown as small mono pills below the title.
  readonly tags: readonly string[];
  // True if this milestone is "current" — gets a cyan-pulsing node + Active tag.
  readonly current?: boolean;
}

export interface TimelineStrings {
  readonly title: Localized<string>;
  readonly role?: Localized<string>;
  readonly org?: Localized<string>;
  readonly body: Localized<string>;
}

export interface TimelineChrome {
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

export interface TimelineStringsDict {
  // i18nKey → localised strings.
  readonly nodes: Readonly<Record<string, TimelineStrings>>;
  // UI chrome strings.
  readonly chrome: TimelineChrome;
}
