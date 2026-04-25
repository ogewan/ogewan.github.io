// Scene state machine for the persistent celestial backdrop.
//
// The brief defines five route-keyed states; we map any URL pathname to one
// of them. Project detail pages (`/:locale/projects/:slug`) and the redirect
// shim (`/:locale/projects/:slug/redirect`) inherit the projects scene so the
// camera doesn't whiplash when entering case studies.
//
// This is route-derived only. Phase 9 will layer focus state (lat/lng) on top
// for the Earth scene's location-rail integration; that lives in a separate
// React context (./CelestialContext) so the rail can drive the camera without
// pathname coupling.

export type SceneName = 'earth' | 'about' | 'projects' | 'contact' | 'colophon';

export const SCENE_ORDER: readonly SceneName[] = [
  'earth',
  'about',
  'projects',
  'contact',
  'colophon',
];

const PATH_TO_SCENE: Array<{ test: RegExp; scene: SceneName }> = [
  { test: /^\/[a-z-]+\/about(\/|$)/, scene: 'about' },
  { test: /^\/[a-z-]+\/projects(\/|$)/, scene: 'projects' },
  { test: /^\/[a-z-]+\/contact(\/|$)/, scene: 'contact' },
  { test: /^\/[a-z-]+\/colophon(\/|$)/, scene: 'colophon' },
];

export function sceneFromPathname(pathname: string): SceneName {
  // /_dev/* routes don't drive the backdrop; they pin to projects so the dev
  // tooling sits in front of a stable scene.
  if (pathname.includes('/_dev/')) return 'projects';

  for (const { test, scene } of PATH_TO_SCENE) {
    if (test.test(pathname)) return scene;
  }
  // Default: home (`/`, `/:locale/`, `/:locale`) → earth.
  return 'earth';
}

// Focus API used by the location rail in Phase 4 and the R3F camera in
// Phase 9. Phase 3 placeholders store the state but don't apply it visually.
export interface FocusTarget {
  readonly lat: number;
  readonly lng: number;
  // Optional label, used by the rail to show the current city; we don't
  // hard-code city names here so the rail stays the canonical source.
  readonly label?: string;
}

export type FocusMode = 'focused' | 'auto';
