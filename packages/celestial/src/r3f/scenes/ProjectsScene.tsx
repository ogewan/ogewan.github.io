import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { SCENE_ANCHORS } from '../scene-anchors.js';
import {
  ringParticleVertexShader,
  ringParticleFragmentShader,
} from '../shaders/ring-particles.glsl.js';
import { ringBandVertexShader, ringBandFragmentShader } from '../shaders/ring-band.glsl.js';
import { useMobileSettings } from '../MobileSettings.js';
import { useRingsVisibility } from '../../RingsVisibilityContext.js';
import { useRingsClockMarkers } from '../../RingsClockMarkersContext.js';
import { useRingsEffects } from '../../RingsEffectsContext.js';
import {
  getProjectsRingsRotationRate,
  getProjectsSceneRotationRate,
  getProjectsBodyRotationRate,
} from '../../projects-rings-rotation-rate.js';
import {
  buildRingParticleBuffers,
  RING_BANDS,
  SPARKLE_SHADER_THRESHOLD,
} from './projects-rings.js';
import { buildClockMarkerTexture } from '../clock-marker-texture.js';

// Phase 9.3 (in progress). Body shader still pending step 5; for now the
// body is the amber stub at the user-confirmed 6.3-radius scale. The
// ring system is the real particle implementation — multi-zone Saturn
// layout, per-particle Keplerian orbital rate (inner orbits faster
// than outer), per-particle lambert against the shared sun direction.

const STUB_BODY_RADIUS = 6.3;

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
}

export function ProjectsScene({ sunDirection }: ProjectsSceneProps) {
  const [x, y, z] = SCENE_ANCHORS.projects.origin;
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
    <group position={[x, y, z]}>
      <group ref={worldYSpinRef}>
        <group rotation={[0.3, 0, -0.18]}>
          <group ref={tiltSpinRef}>
            {/* Gas-giant body. Counter-rotation works here regardless
                of preserveTilt: setting bodyRotationRate = -sceneRate
                keeps the body visually static while rings spin. */}
            <group ref={bodyGroupRef}>
              <mesh>
                <sphereGeometry args={[STUB_BODY_RADIUS, 64, 64]} />
                <meshStandardMaterial color="#b07a3e" roughness={0.85} metalness={0.05} />
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
