// Centralized default values for every scene's tunable configuration.
// This is the single source of truth — every rate module and every
// React context that holds a per-scene default reads from here.
//
// To change a default permanently, edit the value below; rate modules
// and contexts will pick it up automatically. Per-user overrides
// (set via the dev console or persisted in localStorage from a prior
// session) still win at runtime — these values are the fresh-load
// fallback only.
//
// IMPORTANT: storing a value in localStorage that matches the default
// is functionally identical to having no entry. The dev console's
// portfolio.rings.config(...) call removes the entry when the new
// value equals the default (after this refactor); existing stored
// values from before the refactor still read correctly.

export const SCENE_DEFAULTS = {
  earth: {
    // rad/sec auto-rotation. Default ~1.43°/sec at session timescale.
    rotationRate: 0.025,
    // UV-checker shader + bright city-marker dots — diagnostic only.
    testMode: false,
    // Force the canvas-drawn green/blue placeholder maps even when
    // real Blue Marble webps are available.
    placeholderMode: false,
  },
  contact: {
    // Active nebula variant. Source-of-truth lives in the URL `?neb`
    // query param when present; this is the fresh-load fallback only.
    // Valid: '01' (Carina) | '02' (Lagoon) | '03' (Pillars) | '04' (Veil).
    variant: '01' as '01' | '02' | '03' | '04',
    // Whether the nebula renders at all. Hide when iterating shader
    // tweaks that need a clean comparison frame.
    visible: true,
    // Whether the camera-dive sub-animation runs after the route tween
    // settles. Disable to lock camera at the route-tween anchor for
    // taking still screenshots.
    dive: true,
    // Per-frame opacity multiplier applied to accumulated raymarch
    // alpha. 1.0 = full density per the per-variant params; lower
    // fades the nebula toward transparent.
    density: 1.0,
    // Whether the volume drifts gently (sinusoidal rotation) once the
    // camera settles inside it. Adds subtle motion without being
    // distracting.
    drift: true,
    // Raymarching steps per fragment. The bounding sphere uses BackSide
    // rendering with the camera INSIDE the volume, so back-face fragments
    // cover the entire viewport — per-fragment cost stacks across the
    // whole canvas. Default 16 = comfortable middle ground on a modern
    // desktop GPU after the Suspense fix (gotcha #45) eliminated the
    // earlier context-loss issue. Dial via dev console:
    //   portfolio.nebulae.config({ stepCount: 8 })    → low / fallback
    //   portfolio.nebulae.config({ stepCount: 32 })   → high quality
    //   portfolio.nebulae.config({ stepCount: 64 })   → ceiling
    // Shader hard-caps at MAX_STEPS=64 (compile-time loop bound).
    // Mobile / degraded path clamps to 8 in ContactScene.
    stepCount: 16,
  },
  projects: {
    // Whether the particle ring system + colored bands render at all.
    ringsVisible: true,
    // K constant in the Keplerian formula ω_particle = K / sqrt(r).
    // Inner ring orbits faster than outer regardless of value; this
    // scales the whole pattern uniformly.
    ringsRotationSpeed: 0.02,
    // Whole-scene angular velocity (rad/s) around its local Y axis.
    // Independent of K. The default is intentionally non-zero so
    // first-time visitors see the rings drift even if they never
    // touch the dev console.
    sceneRotationSpeed: 0.0025,
    // Gas-giant body angular velocity (rad/s). Default 0. Set to
    // -sceneRotationSpeed to keep the body visually static while
    // the rings spin around it.
    bodyRotationSpeed: 0,
    // When true, scene rotation happens AFTER the static tilt is
    // applied — rings spin around their own plane's normal, so the
    // tilt-to-camera stays constant. When false, rotation happens
    // BEFORE the tilt — the whole scene tumbles around world Y, and
    // the ring tilt sweeps around the camera. True is the natural
    // "Saturn drifts in its own plane" look.
    scenePreserveTilt: true,
    // Effect toggles. See RingsEffectsContext.tsx for what each does.
    sparkles: true,
    clumps: true,
    spokes: false,
    flow: true,
    // Dev-only diagnostic overlay (12/3/6/9 numerals on the ring).
    clock: false,
    // Gas-giant body base rotation rate (rad/sec). Per-band
    // differential offsets stack on top inside the fragment shader.
    gasGiantRotationRate: 0.018,
  },
} as const;

export type SceneDefaults = typeof SCENE_DEFAULTS;
