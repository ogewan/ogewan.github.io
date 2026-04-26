// Timeline data shape — shared between the React shell (which loads the JSON
// and passes it to the Angular custom element as a property) and the Angular
// component (which renders it). Lives in @portfolio/content so milestones can
// be edited without touching either framework's component code.

export type TimelineCategory = 'work' | 'side' | 'education' | 'writing';

export interface TimelineNode {
  readonly id: string;
  readonly category: TimelineCategory;
  // Use string year ranges so the component doesn't have to format dates.
  // "2024 — present", "2018 — 2020", "2016".
  readonly when: string;
  // Sortable timestamp — ISO date string of the START of this milestone.
  // Used for chronological ordering; not displayed.
  readonly startedAt: string;
  // i18n key per locale — the dictionary in ./timeline-strings.ts holds the
  // actual title/role/org/body strings.
  readonly i18nKey: string;
  // Tags shown as small mono pills below the title.
  readonly tags: readonly string[];
  // True if this milestone is "current" — gets a cyan-pulsing node + Active tag.
  readonly current?: boolean;
}

export interface TimelineStrings {
  readonly title: string;
  readonly role?: string;
  readonly org?: string;
  readonly body: string;
}

export interface TimelineLocaleDict {
  // i18nKey → strings in this locale.
  readonly nodes: Readonly<Record<string, TimelineStrings>>;
  // UI chrome strings.
  readonly chrome: {
    readonly heading: string;
    readonly subtitle: string;
    readonly filterAll: string;
    readonly filterWork: string;
    readonly filterSide: string;
    readonly filterEducation: string;
    readonly filterWriting: string;
    readonly active: string;
    readonly expand: string;
    readonly collapse: string;
  };
}
