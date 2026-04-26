import type { SceneName } from '../scenes.js';

// Scene anchor positions on the persistent canvas's Z-axis tour line. The
// camera flies between these anchors when the route changes; each scene's
// geometry lives at its anchor in world space and stays mounted, so the
// transition from one scene to the next is real continuous motion rather
// than an opacity swap.
//
// The tour line runs along negative Z so the camera looks "into" the scene
// (Three.js camera defaults to looking down -Z). Anchor spacing is unitless
// and intentionally non-uniform: nearer scenes (Earth → About) are close so
// the moon entrance reads as a pull-back; farther scenes (Projects → Contact)
// are spaced out so the route change feels like a warp through stars.
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
  about: {
    cameraPosition: [0, 1.2, -46],
    lookAt: [-1.0, -0.6, -50],
    origin: [-1.0, -0.6, -50],
  },
  projects: {
    cameraPosition: [-1.5, 0.8, -116],
    lookAt: [1.0, 0.6, -120],
    origin: [1.0, 0.6, -120],
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
