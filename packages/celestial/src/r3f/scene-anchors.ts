import type { SceneName } from '../scenes.js';

// Scene anchor positions on the persistent canvas's tour line. The camera
// flies between these anchors when the route changes; each scene's geometry
// lives at its anchor in world space and stays mounted, so the transition
// from one scene to the next is real continuous motion rather than an
// opacity swap.
//
// Three.js cameras look down -Z by default. The first FOUR scenes
// (earth → about → projects → contact) sit on the +Z side of the origin
// as a progressive zoom-out chain:
//   - Earth at z=4
//   - About pulls back to z=12 (same lookAt as earth — about is just
//     wider framing of the Earth+Moon system)
//   - Projects pulls back to z=268 (256-unit jump from about)
//   - Contact pulls back to z=2048 (1780-unit jump from projects, by far
//     the longest warp — sells the "you've left the solar system"
//     transition that the contact-scene brief calls a warp moment)
// Earth+Moon system is hidden by EarthScene's group `visible` flag once
// the active scene is `projects` or beyond, so the gas giant at z=246 is
// the only body in frame at the projects anchor; the photo-driven
// volumetric raymarched nebula at z=2055 is the only thing in frame at
// the contact anchor.
//
// Colophon stays on the -Z side of the origin. The transition
// contact → colophon is now a 2384-unit cross-origin tween (camera
// passes through the origin region; nothing visible there). 9.5
// (Colophon — black hole) gets to decide whether to reposition.
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
  // Contact: 1780-unit +Z zoom-out from Projects (z=268 → z=2048). The
  // photo-driven volumetric raymarched nebula sits at z=2055 inside a
  // bounding sphere of radius ~12; the camera arrives at z=2048 (just
  // outside the bounding sphere on the camera-facing side), then
  // ContactScene's dive sub-animation pushes the camera ~14 units
  // forward over ~4.5s after the route tween settles. Far plane was
  // bumped from 2000 → 3000 in Canvas3D to keep the volume in front of
  // the far clip with margin.
  contact: {
    cameraPosition: [0, 0, 2048],
    lookAt: [0, 0, 2052],
    origin: [0, 0, 2055],
  },
  colophon: {
    cameraPosition: [0, 0, -336],
    lookAt: [0, 0, -340],
    origin: [0, 0, -340],
  },
};
