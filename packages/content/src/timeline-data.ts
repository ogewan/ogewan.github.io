import type { TimelineNode } from './timeline-types.js';

// Career / project / learning milestones. Edit this list to evolve the
// timeline; the structure stays stable. Sort order applied at render time.
export const TIMELINE_NODES: readonly TimelineNode[] = [
  {
    id: 'atlas-now',
    category: 'work',
    when: '2024 — present',
    startedAt: '2024-09-01',
    i18nKey: 'atlas-console',
    tags: ['react', 'rust', 'websockets'],
    current: true,
  },
  {
    id: 'tide',
    category: 'side',
    when: '2024 — present',
    startedAt: '2024-04-01',
    i18nKey: 'tide',
    tags: ['typescript', 'indexeddb'],
  },
  {
    id: 'aperture',
    category: 'side',
    when: '2025',
    startedAt: '2025-08-10',
    i18nKey: 'aperture',
    tags: ['r3f', 'glsl'],
  },
  {
    id: 'oklch-essay',
    category: 'writing',
    when: '2024',
    startedAt: '2024-11-01',
    i18nKey: 'oklch-essay',
    tags: ['essay', 'color'],
  },
  {
    id: 'brightline',
    category: 'work',
    when: '2021 — 2024',
    startedAt: '2021-03-01',
    i18nKey: 'brightline',
    tags: ['react', 'webgl', 'aerospace'],
  },
  {
    id: 'soundfields',
    category: 'side',
    when: '2020 — 2022',
    startedAt: '2020-06-01',
    i18nKey: 'soundfields',
    tags: ['detour', 'indie'],
  },
  {
    id: 'pentagram',
    category: 'work',
    when: '2018 — 2020',
    startedAt: '2018-09-01',
    i18nKey: 'pentagram',
    tags: ['design-systems', 'identity'],
  },
  {
    id: 'tec-research',
    category: 'education',
    when: '2014 — 2018',
    startedAt: '2014-08-01',
    i18nKey: 'tec-research',
    tags: ['cs', 'hci', 'graphics'],
  },
];
