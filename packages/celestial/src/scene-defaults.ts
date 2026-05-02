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
    // Master scene visibility. Hide for clean comparison frames.
    visible: true,

    // Effect A — layered billboards. Camera-facing photo planes stacked
    // along the volume's local Z axis. Default ON.
    billboardsVisible: true,
    billboardLayerCount: 1,
    billboardJitter: 4,
    billboardScale: 3.0,
    billboardBrightness: 0.35,
    billboardSaturation: 1.0,
    billboardGlow: 1.0,
    billboardDrift: true,

    // Effect B — photo-sampled particle cloud. Particles distributed in
    // 3D space with positions sampled from photo luminance. Default ON.
    particlesVisible: true,
    particleCount: 30000,
    particleSize: 0.08,
    particleJitter: 1.0,
    particleBrightness: 1.0,
    particleSaturation: 1.0,
    particleGlow: 1.0,
    particleDrift: true,
  },
  blackhole: {
    // Master scene visibility. Hide for clean comparison frames.
    visible: true,
    // Schwarzschild radius in world units. The rendered shadow sphere
    // has radius 2.6 × Rs (the photon capture cross-section). At the
    // colophon camera distance of 20 units, Rs=1.5 gives a shadow
    // diameter of ~39% of the vertical viewport — between Earth and
    // the gas giant in apparent size.
    schwarzschildRadius: 1.5,
    // Accretion disk tilt from face-on in degrees. 20° shows the disk
    // face AND lets the lensing warp the far half into view below the
    // shadow (the Gargantua / M87 signature).
    diskTilt: 20,
    // Inner disk edge = diskInnerFactor × Rs (ISCO for Schwarzschild BH).
    diskInnerFactor: 2.2,
    // Outer disk edge = diskOuterFactor × Rs.
    diskOuterFactor: 6.0,
    // Brightness multiplier on the disk emission.
    diskBrightness: 1.0,
    // Saturation of the temperature-gradient colors.
    diskSaturation: 1.0,
    // FBm noise amplitude — controls turbulence density variation.
    diskTurbulence: 0.6,
    // Animate the turbulence over time (uTime advance per frame).
    diskDrift: true,
    // Keplerian rotation speed (rad/sec at the inner edge).
    // Inner orbits rotate at diskRotationSpeed; outer at diskRotationSpeed/sqrt(r/Rs).
    diskRotationSpeed: 0.12,
    // Doppler asymmetry: 0 = symmetric disk, 1 = max brightness ratio
    // between approaching (left) and receding (right) sides.
    dopplerStrength: 0.5,
    // Lensing multiplier. 0 disables distortion (passthrough blit).
    distortionStrength: 1.0,
    // Render the photon-ring glow at the shadow edge.
    photonRing: true,
    // Dev diagnostic: 12-hour clock face labels in the disk plane.
    // All 12 positions are visible simultaneously due to gravitational lensing.
    diskClock: false,
    // Camera Y offset (world units) at the colophon anchor. Combined with the
    // camera-to-BH distance of 20 units this gives an apparent elevation above
    // the disk plane: 2.5 ⇒ tan⁻¹(2.5/20) ≈ 7.1° (Gargantua-like edge-on framing).
    // 0 puts the camera in the disk plane; values above ~6 start to expose the
    // disk face from above.
    cameraElevation: 2.5,
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
  // Three independent "background sets" — global skybox, colophon-only override
  // (applied while the lensing EffectComposer is mounted), and the cubemap
  // captured for the geodesic shader to sample. Each set has the same three
  // knobs so the dev console can tune them symmetrically.
  background: {
    global: {
      // Multiplier on the procedural nebula sphere's emitted RGB.
      // 0 = invisible; 1 = palette baseline; > 1 = brighter.
      nebulaBrightness: 0.5,
      // 0 = grayscale, 1 = palette baseline, > 1 = oversaturated. The default
      // is intentionally pushed past 1 — the dim base palette reads as nearly
      // grey at saturation 1, and 3 lifts the violet/teal hints into a more
      // recognisable nebula tint without making the sky distractingly colourful.
      nebulaSaturation: 3,
      // Multiplier on the points material's opacity (clamped 0..1).
      // 1.0 = current default (opacity 0.9); 0 = invisible.
      starBrightness: 1.0,
    },
    // Override values when the colophon's EffectComposer is mounted — the
    // no-tone-mapping pass brightens the framebuffer, so the global nebula
    // tends to read too strong and needs scaling down.
    colophon: {
      nebulaBrightness: 0.05,
      nebulaSaturation: 3,
      starBrightness: 1,
    },
    // BH-centered cubemap that the geodesic lensing shader samples by
    // deflected world-direction. Tuned independently from colophon —
    // the cubemap is a re-baked background for the lensing shader, so
    // it needs lower brightness to avoid overwhelming the disk emission.
    cubemap: {
      nebulaBrightness: 0.045,
      nebulaSaturation: 3,
      starBrightness: 0.01,
    },
  },
} as const;

export type SceneDefaults = typeof SCENE_DEFAULTS;

// Named presets for the colophon black hole — apply via:
//   portfolio.blackhole.config(portfolio.blackhole.presets.m87)
//   portfolio.blackhole.config(portfolio.blackhole.presets.gargantua)
export const BLACKHOLE_PRESETS = {
  // M87* — the first photographed black hole (Event Horizon Telescope, 2019).
  // Nearly face-on orientation shows the full photon ring; orange-red palette.
  // Image credit: Event Horizon Telescope Collaboration, CC BY 4.0.
  m87: {
    diskTilt: 20,
    diskInnerFactor: 2.2,
    diskOuterFactor: 6.0,
    diskBrightness: 1.0,
    diskSaturation: 1.0,
    diskTurbulence: 0.6,
    diskRotationSpeed: 0.08,
    dopplerStrength: 0.5,
    distortionStrength: 1.0,
    photonRing: true,
    cameraElevation: 0.5,
  },
  // Gargantua — DNEG/Kip Thorne simulation from Interstellar (2014).
  // Nearly edge-on: disk sweeps horizontal, near-side below shadow, lensed
  // arc above. Cream-white → peach → dusty-rose palette.
  // Reference: Warner Bros. / Paramount, for educational comparison only.
  //
  // diskTilt = 0: the disk lies flat in the world XZ plane; the apparent
  // edge-on angle comes from the camera elevation.
  // distortionStrength = 1.0: full lensing — the geodesic path no longer warps
  // the disk into a blob (that was a screen-space-shader limitation), so the
  // signature secondary image arcs over the shadow.
  gargantua: {
    diskTilt: 0,
    diskInnerFactor: 2.6,
    diskOuterFactor: 6.5,
    diskBrightness: 1.8,
    diskSaturation: 0.85,
    diskTurbulence: 0.5,
    diskRotationSpeed: 0.12,
    dopplerStrength: 0.4,
    distortionStrength: 1.0,
    photonRing: true,
    cameraElevation: 2.5,
  },
} as const;
