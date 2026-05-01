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
//   - Contact lands at z=4025 (3757-unit jump from projects). Camera
//     ends 25 units PAST the nebula center at z=4000 (volume back face
//     at z=4012) and looks BACK at the volume center — same camera-
//     facing direction as projects (both -Z), so the route tween is a
//     pure +Z zoom-out without a direction flip mid-warp. The tween is
//     stretched to 2.0s with a power3.out ease so the gas giant
//     visibly shrinks out of view in the first ~30% of the duration
//     and the final approach to the photograph settles slowly.
// Earth+Moon system is hidden by EarthScene's group `visible` flag once
// the active scene is `projects` or beyond, so the gas giant at z=246 is
// the only body in frame at the projects anchor; the photo + particle
// nebula at z=2055 is the only thing in frame at the contact anchor.
//
// Colophon continues the +Z tour line past Contact. The transition
// contact → colophon is a 3775-unit +Z zoom-out (camera at z=4025 →
// z=7800), matching the projects → contact leg length. Camera arrives
// 20 units ahead of the black hole's origin and looks back at it,
// maintaining the same −Z facing direction as all prior anchors.
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
  // Optional per-destination route-tween overrides. CameraDriver reads
  // these from the TARGET anchor (the scene the camera is heading to).
  // Defaults: 1.2s with `power2.inOut`.
  readonly tweenDuration?: number;
  readonly tweenEase?: string;
  // Ease used for the REVERSE tween (when this anchor is the SOURCE and the
  // destination has no override). Allows asymmetric easing — e.g. power3.out
  // forward (fast-leave gas giant, slow-settle into nebula) and power3.in
  // reverse (slow-leave nebula, fast-arrive gas giant).
  readonly tweenEaseReverse?: string;
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
  // Contact: 3757-unit +Z zoom-out from Projects (z=268 → z=4025). The
  // camera arrives 25 units PAST the nebula's volume center at z=4000,
  // looking BACK in -Z at the nebula. This matches projects' camera-
  // facing direction (-Z, looking back at the gas giant) — both anchors
  // look backwards along the tour line, so the route tween is a pure +Z
  // dolly without rotating the camera. The 2.0s tween + power3.out ease
  // gives a fast-then-slow profile: the camera rapidly leaves projects
  // in the first ~30% of the duration so the gas giant visibly shrinks
  // out of view, then crawls the last short stretch into the photo.
  contact: {
    cameraPosition: [0, 0, 4025],
    lookAt: [0, 0, 4000],
    origin: [0, 0, 4000],
    // 2.0s applied symmetrically: both projects→contact and contact→projects
    // run at 2.0s with the default power2.inOut ease (slow-fast-slow), so each
    // direction starts slow near its origin scene and ends slow near its
    // destination scene.
    tweenDuration: 2.0,
  },
  colophon: {
    cameraPosition: [0, 0, 7800],
    lookAt: [0, 0, 7780],
    origin: [0, 0, 7780],
    tweenDuration: 2.0,
  },
};
