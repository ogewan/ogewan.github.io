import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import type { SceneName } from '../../scenes.js';
import { SCENE_ANCHORS } from '../scene-anchors.js';
import {
  ringParticleVertexShader,
  ringParticleFragmentShader,
} from '../shaders/ring-particles.glsl.js';
import { ringBandVertexShader, ringBandFragmentShader } from '../shaders/ring-band.glsl.js';
import { gasGiantVertexShader, gasGiantFragmentShader } from '../shaders/gas-giant.glsl.js';
import { useMobileSettings } from '../MobileSettings.js';
import { useRingsVisibility } from '../../RingsVisibilityContext.js';
import { useRingsClockMarkers } from '../../RingsClockMarkersContext.js';
import { useRingsEffects } from '../../RingsEffectsContext.js';
import {
  getProjectsRingsRotationRate,
  getProjectsSceneRotationRate,
  getProjectsBodyRotationRate,
} from '../../projects-rings-rotation-rate.js';
import { getGasGiantRotationRate } from '../../gas-giant-rotation-rate.js';
import {
  buildRingParticleBuffers,
  RING_BANDS,
  SPARKLE_SHADER_THRESHOLD,
} from './projects-rings.js';
import { buildClockMarkerTexture } from '../clock-marker-texture.js';

// Procedural gas-giant body — Jupiter-like banded surface with seven
// latitude bands at differential rotation rates (zonal flow), fed by a
// 2-octave domain-warped FBM noise pass for turbulence, plus a Great
// Red Spot vortex anchored at the south tropical zone (band 2). The
// body's rigid rotation is handled by bodyGroupRef.rotation.y at
// getProjectsBodyRotationRate(); the band-differential scrolling
// happens INSIDE the shader via the `time` uniform advanced at
// getGasGiantRotationRate().

const BODY_RADIUS = 6.3;

// Jupiter macro structure — 11 primary zone/belt control points.
// The GRS lives in macro 4 (south tropical zone, the cream band at
// ~22°S). Each fine sub-band below picks its base color + rate from
// this macro, then varies brightness/rate within the macro band.
//
// Palette tuned for low contrast between adjacent macro bands so the
// surface reads as cream-to-tan variations rather than hard stripes.
// Belts are dim-warm (sandy rust), zones are bright cream — only ~0.2
// luminance difference, which the eye reads as "subtle bands" not
// "barber pole."
const GAS_GIANT_MACRO_BANDS: ReadonlyArray<{
  color: readonly [number, number, number];
  rate: number;
}> = [
  { color: [0.8, 0.68, 0.5], rate: 0.85 }, //  0 S polar — pale tan
  { color: [0.7, 0.54, 0.37], rate: 1.2 }, //  1 SPB — warm tan-rust
  { color: [0.88, 0.78, 0.6], rate: 0.92 }, // 2 STZ — light cream
  { color: [0.74, 0.59, 0.41], rate: 1.15 }, // 3 STB — sandy rust
  { color: [0.9, 0.81, 0.61], rate: 0.95 }, //  4 STrZ — cream zone (GRS host)
  { color: [0.93, 0.86, 0.66], rate: 1.4 }, //  5 EZ — brightest cream
  { color: [0.9, 0.81, 0.61], rate: 0.95 }, //  6 NTrZ — cream
  { color: [0.74, 0.59, 0.41], rate: 1.15 }, // 7 NTB — sandy rust
  { color: [0.88, 0.78, 0.6], rate: 0.92 }, // 8 NTZ — light cream
  { color: [0.7, 0.54, 0.37], rate: 1.2 }, //  9 NPB — warm tan-rust
  { color: [0.78, 0.66, 0.48], rate: 0.85 }, // 10 N polar — pale tan
];

// 6× finer striation than the macro layout. Each fine band picks its
// macro by integer division of its index, then varies brightness
// (sub-band oscillation) and rate (slight differential) so the
// surface reads as fine zonal flow on top of Jupiter's canonical
// zone/belt structure. Total = 66 fine bands (11 × 6, ≈83 × 4/5).
const GAS_GIANT_TOTAL_BANDS = 66;

const { GAS_GIANT_BAND_COLORS, GAS_GIANT_BAND_RATES } = (() => {
  const colors: Array<[number, number, number]> = [];
  const rates: number[] = [];
  const subPerMacro = GAS_GIANT_TOTAL_BANDS / GAS_GIANT_MACRO_BANDS.length;
  for (let i = 0; i < GAS_GIANT_TOTAL_BANDS; i++) {
    const macroIdx = Math.min(GAS_GIANT_MACRO_BANDS.length - 1, Math.floor(i / subPerMacro));
    const macro = GAS_GIANT_MACRO_BANDS[macroIdx];
    if (!macro) continue;
    const subT = i / subPerMacro - macroIdx; // 0..1 within macro
    // Sub-band brightness oscillation: ~3 cycles per macro → ~6 fine
    // bright/dim alternations across each Jupiter zone or belt.
    const osc = 0.88 + 0.18 * Math.sin(subT * Math.PI * 6);
    colors.push([macro.color[0] * osc, macro.color[1] * osc, macro.color[2] * osc]);
    // Per-fine-band rate variation — small differential so adjacent
    // sub-bands shear past each other (fine turbulence at the seams).
    const rateVar = 1 + 0.08 * Math.sin(i * 0.83);
    rates.push(macro.rate * rateVar);
  }
  return {
    GAS_GIANT_BAND_COLORS: colors,
    GAS_GIANT_BAND_RATES: rates,
  };
})();

// Great Red Spot vortex parameters. 22°S (-0.38 rad) lands in macro
// band 4 (south tropical zone, fine band ~31). Anchored to macro 4's
// rate so the GRS drifts with the surrounding cream zone.
const GRS_LAT = -0.38;
const GRS_LON0 = -1.5;
const GRS_HOST_RATE = GAS_GIANT_MACRO_BANDS[4]?.rate ?? 0.95;

const DESKTOP_PARTICLE_COUNT = 120_000;
const MOBILE_PARTICLE_COUNT = 25_000;

// Clock-marker overlay configuration. Markers sit on the middle of the
// B-ring (radius 11) and orbit at that radius's Keplerian rate so each
// numeral travels at the same angular velocity the densest band of
// particles is travelling — directly readable as "the rings are
// rotating" rather than "frozen haze".
const CLOCK_MARKER_RADIUS = 11;
const CLOCK_MARKER_ORBIT_FACTOR = 1 / Math.sqrt(CLOCK_MARKER_RADIUS);

// Spokes (effect C) rotate at the same orbital rate as the mid-B ring,
// so they're locked to the local Keplerian frame.
const SPOKE_ORBIT_FACTOR = CLOCK_MARKER_ORBIT_FACTOR;
const CLOCK_MARKER_SPRITE_SCALE = 1.4;
// Numeral, ring-local angle (radians, CCW from +X axis). 0 reads as
// "3 o'clock" because the camera looks down -Z and our +X axis points
// to the camera's right; π/2 wraps around toward the camera (12 if we
// treat camera-side as the top), then -X (9), then back of ring (6).
const CLOCK_MARKER_LABELS: ReadonlyArray<{ label: string; angle: number }> = [
  { label: '3', angle: 0 },
  { label: '12', angle: Math.PI / 2 },
  { label: '9', angle: Math.PI },
  { label: '6', angle: -Math.PI / 2 },
];

interface ProjectsSceneProps {
  // Shared world-space sun-direction uniform from Canvas3D. Threaded
  // into the ring shader so each particle's lambert against the sun
  // tracks the per-frame mutation EarthScene performs.
  readonly sunDirection: { value: THREE.Vector3 };
  // Active scene name. Drives the root-group `visible` gate so the
  // 120k-particle ring system + gas giant stop drawing when the camera
  // isn't framing them — frustum culling for `<points>` isn't always
  // reliable, and an explicit gate is cheaper than relying on it.
  // useFrame still runs (state advances at the right phase) so a
  // return to /projects shows the rings where they "should be."
  readonly scene: SceneName;
  // Outgoing scene name during a route tween. Lets the gate stay
  // visible while the camera flies away from /projects so the rings
  // recede smoothly rather than popping out at the start of the warp.
  readonly previousScene: SceneName | null;
}

export function ProjectsScene({ sunDirection, scene, previousScene }: ProjectsSceneProps) {
  const [x, y, z] = SCENE_ANCHORS.projects.origin;

  // Visibility gate for the gas giant, coordinated with the contact scene:
  //
  // projects → contact (2.0s power2.inOut):
  //   Camera starts slow near gas giant, fast in middle, slow near billboard.
  //   Gas giant hides at 1600ms — when the billboard is entering the camera's
  //   framing (~200 units away at that point in the ease curve).
  //
  // contact → projects (2.0s power2.inOut):
  //   Camera starts slow near billboard, fast in middle, slow near gas giant.
  //   Billboard exits the camera frustum when camera.z < 4000, which with
  //   power2.inOut happens at ~115ms. Gas giant shows at 150ms (same beat as
  //   ContactScene's billboard hide) so the two scenes swap cleanly.
  const [gasGiantReady, setGasGiantReady] = useState(true);
  const prevSceneRef = useRef(scene);
  useEffect(() => {
    const prev = prevSceneRef.current;
    prevSceneRef.current = scene;
    if (scene === 'contact' && prev === 'projects') {
      // Hide gas giant when billboard enters framing
      const t = window.setTimeout(() => setGasGiantReady(false), 1600);
      return () => window.clearTimeout(t);
    }
    if (scene === 'projects' && prev === 'contact') {
      // Keep gas giant hidden until billboard has passed behind the camera
      setGasGiantReady(false);
      const t = window.setTimeout(() => setGasGiantReady(true), 150);
      return () => window.clearTimeout(t);
    }
    setGasGiantReady(true);
  }, [scene]);

  const projectsSceneVisible =
    (scene === 'projects' || previousScene === 'projects') && gasGiantReady;
  const settings = useMobileSettings();
  const { visible: ringsVisible } = useRingsVisibility();
  const { clockVisible } = useRingsClockMarkers();
  const { sparkles, clumps, spokes, bandFlow, scenePreserveTilt } = useRingsEffects();
  // Two spin groups in the hierarchy:
  //   - worldYSpinRef: parent of the static-tilt group. Rotating it
  //     spins the whole scene around the world Y axis (everything
  //     including the tilt sweeps around — "tumble" mode).
  //   - tiltSpinRef:   child of the static-tilt group. Rotating it
  //     spins around the tilt's local Y, which is the ring plane's
  //     normal — rings spin in their own plane, tilt-to-camera stays
  //     constant ("preserve" mode).
  // useFrame mutates whichever ref matches scenePreserveTilt, leaving
  // the other ref's rotation untouched (so toggling continues smoothly
  // from the most recent state of the active mode).
  const worldYSpinRef = useRef<THREE.Group>(null);
  const tiltSpinRef = useRef<THREE.Group>(null);
  const bodyGroupRef = useRef<THREE.Group>(null);
  const clockGroupRef = useRef<THREE.Group>(null);

  // Build the four canvas-textured sprites once. Disposed on unmount so
  // GPU memory doesn't leak across HMR cycles in dev.
  const clockMarkers = useMemo(
    () =>
      CLOCK_MARKER_LABELS.map(({ label, angle }) => ({
        label,
        angle,
        texture: buildClockMarkerTexture(label),
      })),
    [],
  );
  useEffect(
    () => () => {
      for (const m of clockMarkers) m.texture.dispose();
    },
    [clockMarkers],
  );

  // Mobile / save-data / slow-connection users get the lower particle
  // count so the vertex-shader cost stays bounded. Desktop gets the
  // user-confirmed 120k.
  const particleCount = settings.degraded ? MOBILE_PARTICLE_COUNT : DESKTOP_PARTICLE_COUNT;

  // Buffer regenerates when sparkles or clumps toggle — both effects
  // bake per-particle attributes at gen time, so a uniform won't
  // suffice. ~10ms of CPU on the toggle frame; imperceptible.
  const ringBuffers = useMemo(
    () => buildRingParticleBuffers(particleCount, { sparkles, clumps }),
    [particleCount, sparkles, clumps],
  );

  // Ring shader uniforms. `time` is K-scaled — we advance it by
  // `delta * getProjectsRingsRotationRate()` every frame, so the
  // shader's `aOrbitFactor * time` becomes (1/sqrt(r)) * K * t —
  // the angular displacement of a Keplerian orbit. Live tuning of K
  // via portfolio.rings.rotationSpeed() takes effect immediately.
  // Shared uniforms across particle + band shaders. `time` advances
  // every frame at delta * K so both systems stay in lockstep with the
  // user-controllable rate. `bandFlowIntensity` is updated per-frame
  // from the effect toggle; the band shader fades the noise modulation
  // out to zero when off.
  const sharedTimeUniform = useMemo(() => ({ value: 0 }), []);
  const bandFlowIntensityUniform = useMemo(() => ({ value: 1 }), []);

  // Per-band ShaderMaterial uniforms paired with the band config so
  // we don't have to index back into RING_BANDS by position later
  // (avoids noUncheckedIndexedAccess undefined narrowing). Each band
  // gets its own color + opacity + scrollRate (1/√meanRadius — the
  // band's Keplerian rate), but shares the time and flowIntensity
  // slots so the whole ring family animates coherently.
  const bandsWithUniforms = useMemo(
    () =>
      RING_BANDS.map((band) => {
        const meanRadius = (band.rIn + band.rOut) / 2;
        return {
          band,
          uniforms: {
            time: sharedTimeUniform,
            flowIntensity: bandFlowIntensityUniform,
            bandColor: { value: new THREE.Color(band.color) },
            bandOpacity: { value: band.opacity },
            scrollRate: { value: 1 / Math.sqrt(meanRadius) },
          },
        };
      }),
    [sharedTimeUniform, bandFlowIntensityUniform],
  );

  // Gas-giant body shader uniforms. The shader reads `time` for the
  // band-differential longitude scroll, separate from the body group's
  // rigid rotation (which runs at getProjectsBodyRotationRate()).
  const gasGiantTimeUniform = useMemo(() => ({ value: 0 }), []);
  const gasGiantUniforms = useMemo(
    () => ({
      time: gasGiantTimeUniform,
      sunDirection,
      bandColors: {
        value: GAS_GIANT_BAND_COLORS.map(([r, g, b]) => new THREE.Color(r, g, b)),
      },
      bandRates: { value: [...GAS_GIANT_BAND_RATES] },
      rimColor: { value: new THREE.Color('#5dc1d6') },
      rimIntensity: { value: 0.85 },
      vortexParams: { value: new THREE.Vector3(GRS_LAT, GRS_LON0, GRS_HOST_RATE) },
      vortexColor: { value: new THREE.Color('#8a3320') },
      vortexIntensity: { value: 0.9 },
      ambient: { value: 0.05 },
    }),
    [gasGiantTimeUniform, sunDirection],
  );

  const gasGiantTimeRef = useRef(0);

  const ringUniforms = useMemo(
    () => ({
      time: sharedTimeUniform,
      sunDirection,
      // Tuned for the projects camera distance of ~22 units. Larger
      // values bloom the points; smaller values shrink them. The
      // shader applies size attenuation so distant particles are
      // proportionally smaller.
      sizeAttenuation: { value: 240 },
      // Spoke effect (C). spokeIntensity is set per-frame from the
      // effect toggle; spokePhase advances at the mid-B Keplerian rate.
      spokeIntensity: { value: 0 },
      spokePhase: { value: 0 },
      // Sparkle / dust threshold — must match the buffer-side
      // SPARKLE_SIZE_MIN cutoff so the shader picks the right alpha
      // profile (sharp pinprick) for sparkle particles.
      sparkleThreshold: { value: SPARKLE_SHADER_THRESHOLD },
    }),
    [sunDirection, sharedTimeUniform],
  );

  const ringsTimeRef = useRef(0);
  const spokePhaseRef = useRef(0);

  useFrame((_, delta) => {
    const k = getProjectsRingsRotationRate();
    ringsTimeRef.current += delta * k;
    sharedTimeUniform.value = ringsTimeRef.current;
    // Whole-scene + body uniform rotations. These are independent of K
    // (they're rad/s, not Keplerian factors). scenePreserveTilt picks
    // whether the rotation runs around world Y (tumble mode) or
    // around the tilt's local Y (preserve mode). The body's rotation
    // is independent of either; setting body=-scene cancels out so
    // the body looks static while the rings spin around it.
    const sceneRate = getProjectsSceneRotationRate();
    const activeRef = scenePreserveTilt ? tiltSpinRef : worldYSpinRef;
    if (activeRef.current) {
      activeRef.current.rotation.y += delta * sceneRate;
    }
    if (bodyGroupRef.current) {
      bodyGroupRef.current.rotation.y += delta * getProjectsBodyRotationRate();
    }
    // Advance the gas-giant shader's time uniform at its own rate.
    // The shader uses this to scroll each band's longitude offset
    // by `time * bandRate[i]` — the band-differential rotation. This
    // is INDEPENDENT of the rigid body rotation above; the body can
    // be static while the bands still move (or vice versa).
    gasGiantTimeRef.current += delta * getGasGiantRotationRate();
    gasGiantTimeUniform.value = gasGiantTimeRef.current;
    // Clock markers orbit at the B-ring's Keplerian angular velocity so
    // they track the densest particle band. Same K as the rings — live
    // tuning via portfolio.rings.rotationSpeed() applies here too.
    if (clockGroupRef.current) {
      clockGroupRef.current.rotation.y += delta * k * CLOCK_MARKER_ORBIT_FACTOR;
    }
    // Spoke pattern rotates at the same mid-B rate as the clocks.
    spokePhaseRef.current += delta * k * SPOKE_ORBIT_FACTOR;
    ringUniforms.spokePhase.value = spokePhaseRef.current;
    ringUniforms.spokeIntensity.value = spokes ? 1 : 0;
    // Band-flow effect (D): on = full noise modulation, off = static.
    bandFlowIntensityUniform.value = bandFlow ? 1 : 0;
  });

  return (
    // Three nested groups handle the rotation hierarchy:
    //   1. position-only outer
    //   2. worldYSpinRef — rotates this when scenePreserveTilt is OFF
    //      (rotation precedes the static tilt → whole scene tumbles
    //      around world Y).
    //   3. static-tilt middle (rotation prop, never mutated)
    //   4. tiltSpinRef — rotates this when scenePreserveTilt is ON
    //      (rotation follows the static tilt → rings spin around
    //      their own plane's normal, tilt-to-camera stays constant).
    <group position={[x, y, z]} visible={projectsSceneVisible}>
      <group ref={worldYSpinRef}>
        <group rotation={[0.3, 0, -0.18]}>
          <group ref={tiltSpinRef}>
            {/* Gas-giant body — procedural Jupiter-like banded surface
                with differential band rotation and a Great Red Spot
                vortex. Counter-rotation works here regardless of
                preserveTilt: setting bodyRotationRate = -sceneRate
                keeps the body's silhouette visually static (though
                its bands still scroll internally via the shader). */}
            <group ref={bodyGroupRef}>
              <mesh>
                <sphereGeometry args={[BODY_RADIUS, 128, 96]} />
                <shaderMaterial
                  vertexShader={gasGiantVertexShader}
                  fragmentShader={gasGiantFragmentShader}
                  uniforms={gasGiantUniforms}
                />
              </mesh>
            </group>

            {/* Particle rings + their continuous low-opacity tint bands.
          Both gated by the same visibility flag. Bands render first
          (underneath) — they thicken each ring zone with a soft
          colored wash that the particles overlay; alone, 120k sub-
          pixel particles felt too sparse. */}
            <group visible={ringsVisible}>
              {bandsWithUniforms.map(({ band, uniforms }) => (
                <mesh key={`band-${band.rIn}-${band.rOut}`} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[band.rIn, band.rOut, 128]} />
                  <shaderMaterial
                    vertexShader={ringBandVertexShader}
                    fragmentShader={ringBandFragmentShader}
                    uniforms={uniforms}
                    transparent
                    depthWrite={false}
                    side={2 /* THREE.DoubleSide — visible at any tilt */}
                  />
                </mesh>
              ))}
              <points>
                <bufferGeometry>
                  <bufferAttribute
                    attach="attributes-position"
                    args={[ringBuffers.positions, 3]}
                    count={particleCount}
                    array={ringBuffers.positions}
                    itemSize={3}
                  />
                  <bufferAttribute
                    attach="attributes-aOrbitFactor"
                    args={[ringBuffers.orbitFactors, 1]}
                    count={particleCount}
                    array={ringBuffers.orbitFactors}
                    itemSize={1}
                  />
                  <bufferAttribute
                    attach="attributes-aColor"
                    args={[ringBuffers.colors, 3]}
                    count={particleCount}
                    array={ringBuffers.colors}
                    itemSize={3}
                  />
                  <bufferAttribute
                    attach="attributes-aSize"
                    args={[ringBuffers.sizes, 1]}
                    count={particleCount}
                    array={ringBuffers.sizes}
                    itemSize={1}
                  />
                </bufferGeometry>
                <shaderMaterial
                  vertexShader={ringParticleVertexShader}
                  fragmentShader={ringParticleFragmentShader}
                  uniforms={ringUniforms}
                  transparent
                  depthWrite={false}
                />
              </points>
            </group>

            {/* Clock-marker diagnostic overlay. Off by default; toggle
                via portfolio.rings.clock.show() / hide() / toggle().
                The four numerals (12/3/6/9) sit at cardinal positions
                on a rigid square at radius 11 (mid-B ring) and orbit
                at the local Keplerian rate. */}
            {clockVisible ? (
              <group ref={clockGroupRef}>
                {clockMarkers.map(({ label, angle, texture }) => (
                  <sprite
                    key={label}
                    position={[
                      CLOCK_MARKER_RADIUS * Math.cos(angle),
                      0,
                      CLOCK_MARKER_RADIUS * Math.sin(angle),
                    ]}
                    scale={[CLOCK_MARKER_SPRITE_SCALE, CLOCK_MARKER_SPRITE_SCALE, 1]}
                  >
                    <spriteMaterial
                      map={texture}
                      transparent
                      depthWrite={false}
                      depthTest={false}
                    />
                  </sprite>
                ))}
              </group>
            ) : null}
          </group>
        </group>
      </group>
    </group>
  );
}
