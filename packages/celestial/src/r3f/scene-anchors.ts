import type { SceneName } from '../scenes.js';

// Scene anchor positions on the persistent canvas's tour line. The camera
// flies between these anchors when the route changes; each scene's geometry
// lives at its anchor in world space and stays mounted, so the transition
// from one scene to the next is real continuous motion rather than an
// opacity swap.
//
// Three.js cameras look down -Z by default. The first three scenes
// (earth → about → projects) sit on the +Z side of the origin and are a
// progressive zoom-out: Earth at z=4, About pulls back to z=12, Projects
// pulls back to z=268 — a 256-unit zoom-out journey (twice the original
// forward warp's 128 units, in the opposite direction). The dramatic
// distance is what sells the "stepping back to see the whole solar
// system" narrative. Earth and About share the same lookAt target —
// About is the Earth scene at wider framing. The Earth+Moon system is
// hidden by EarthScene's group `visible` flag once the active scene is
// `projects` or beyond, so the gas giant at z=246 is the only body in
// frame at the projects anchor.
//
// Contact and Colophon stay on the -Z side of the origin (the original
// tour topology). The transition projects → contact crosses the origin
// (a long warp); contact → colophon is a forward warp deeper into space.
//
// X and Y offsets give each scene a slight off-axis framing so the camera
// look-at lerp paints geometry into different parts of the viewport — the
// gas giant in the upper-right, the nebula centered, the black hole centered
// with the starfield bending around it.

export interface SceneAnchor {
  // World-space position the camera arrives at (and looks toward the scene's
  // center from). Slightly offset from the scene's center so the geometry
  // sits in the framing the brief calls for.
  readonly cameraPosition: readonly [number, number, number];
  // World-space point the camera looks at when this scene is active.
  readonly lookAt: readonly [number, number, number];
  // World-space center of the scene's geometry. Scene components position
  // themselves at this origin in their local <group>.
  readonly origin: readonly [number, number, number];
}

export const SCENE_ANCHORS: Record<SceneName, SceneAnchor> = {
  earth: {
    cameraPosition: [0, 0, 4],
    lookAt: [1.2, -0.8, 0],
    origin: [1.2, -0.8, 0],
  },
  // About reuses the Home Earth+Moon — camera pulls back along +Z to widen
  // the framing so the moon's full orbit (radius 4) is visible. Same lookAt
  // and origin as Earth; no separate scene geometry mounts at this anchor.
  about: {
    cameraPosition: [0, 0, 12],
    lookAt: [1.2, -0.8, 0],
    origin: [1.2, -0.8, 0],
  },
  // Projects: 256-unit +Z zoom-out from About (z=12 → z=268), twice the
  // original forward warp's 128-unit journey. Camera-to-body local gap
  // is 22 units — sized so a r=6.3 gas-giant body subtends ~33% of the
  // viewport horizontally and r=16.3 rings (when the particle ring
  // system lands in step 4) extend close to the full viewport width,
  // matching the framing in the committed static-mode reference image
  // at packages/celestial/src/screenshots/projects.png.
  projects: {
    cameraPosition: [0, 0, 268],
    lookAt: [3, 1.2, 246],
    origin: [3, 1.2, 246],
  },
  contact: {
    cameraPosition: [0, 0, -216],
    lookAt: [0, 0, -220],
    origin: [0, 0, -220],
  },
  colophon: {
    cameraPosition: [0, 0, -336],
    lookAt: [0, 0, -340],
    origin: [0, 0, -340],
  },
};
