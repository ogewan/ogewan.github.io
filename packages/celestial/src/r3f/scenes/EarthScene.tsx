import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { useCelestialFocus } from '../../CelestialContext.js';
import { CANONICAL_CITIES } from '../../cities.js';
import { getEarthRotationRate } from '../../earth-rotation-rate.js';
import { useEarthPlaceholderMode } from '../../EarthPlaceholderModeContext.js';
import { useEarthTestMode } from '../../EarthTestModeContext.js';
import { useMobileSettings } from '../MobileSettings.js';
import { SCENE_ANCHORS } from '../scene-anchors.js';
import {
  earthVertexShader,
  earthFragmentShader,
  earthTestVertexShader,
  earthTestFragmentShader,
  cityDotVertexShader,
  cityDotFragmentShader,
} from '../shaders/earth.glsl.js';
import { getSunDirection, positionFromLatLng, rotationForFocus } from '../sun-direction.js';
import {
  isLikelyStubTexture,
  makePlaceholderEarthTextures,
} from '../../placeholder-earth-texture.js';
import earthDayUrl from '../../textures/earth-day-4k.webp';
import earthNightUrl from '../../textures/earth-night-4k.webp';
import earthCloudsUrl from '../../textures/earth-clouds-2k.webp';

// Earth scene — Phase 9.1.
//
// One sphere with a custom day/night shader fed by NASA Blue Marble + Black
// Marble textures. The terminator is a real-time lambert against a sun
// direction computed from UTC; continents rotate as the Earth spins, but the
// terminator stays world-space-fixed against the sun.
//
// Atmospheric rim is a Fresnel pass in the same fragment shader; appears only
// on the day side so the night silhouette stays clean.
//
// Optional cloud layer lives at radius 1.005 with its own slower drift. Gated
// on `!degraded` (mobile, save-data, or slow-connection users skip it).
//
// Two rotation modes via `useCelestialFocus()`:
//   - 'auto'    — useFrame increments rotation Y at ~6× real time (visible at
//                 session timescale; real Earth is 0.0042°/sec).
//   - 'focused' — gsap tweens X/Y rotation so the target lat/lng faces the
//                 camera over ~2s. Auto-rotation pauses until setAuto().
//
// Texture loading: we skip drei's `useTexture` because it suspends forever if
// any texture fails to decode (which can happen with placeholder webp stubs
// on browsers that are picky about lossless WebP minimums). Instead we load
// imperatively via THREE.TextureLoader, and start with procedural DataTexture
// fallbacks so the scene renders the moment it mounts. Real textures swap in
// when they finish loading; if loading fails the procedural fallback stays.

// Auto-rotation rate (rad/sec) is now sourced per-frame from
// getEarthRotationRate() so window.portfolio.earth.rotationSpeed() can tweak
// it live without re-rendering this component. Default is
// DEFAULT_EARTH_ROTATION_RATE (0.025) ≈ 1.43°/sec at session timescale.
const CLOUD_DRIFT_RATE = 0.015;
const FOCUS_TWEEN_DURATION_SEC = 2;
// Marker dot radius and orbit radius (slightly above the unit-radius earth so
// dots don't z-fight with the surface).
const CITY_DOT_RADIUS = 0.018;
const CITY_DOT_ORBIT = 1.012;

// Build a 1×1 RGBA DataTexture used as the procedural fallback while real
// textures load (or if they fail). The shader samples the same color at every
// UV; the day/night terminator and atmospheric rim still render correctly.
function makeSolidTexture(rgba: [number, number, number, number]): THREE.DataTexture {
  const data = new Uint8Array(rgba);
  const tex = new THREE.DataTexture(data, 1, 1, THREE.RGBAFormat);
  tex.needsUpdate = true;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function configureSurfaceTexture(tex: THREE.Texture) {
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
}

export function EarthScene() {
  const [x, y, z] = SCENE_ANCHORS.earth.origin;
  const settings = useMobileSettings();
  const focus = useCelestialFocus();
  const { testMode } = useEarthTestMode();
  const { placeholderMode } = useEarthPlaceholderMode();

  const earthRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const focusTweenRef = useRef<gsap.core.Tween | null>(null);

  // Placeholder fallbacks: canvas-drawn equirectangular world map (green
  // continents on blue ocean for day, darker palette for night). Shown until
  // real Blue Marble webps drop in to packages/celestial/src/textures/. The
  // current committed webps are 34-byte placeholder stubs that decode to
  // 1×1 black; the load callback below uses isLikelyStubTexture to skip
  // overriding the placeholder when that's the case.
  const placeholder = useMemo(() => makePlaceholderEarthTextures(), []);
  const fallbackClouds = useMemo(() => makeSolidTexture([255, 255, 255, 0]), []);

  const [dayMap, setDayMap] = useState<THREE.Texture>(placeholder.day);
  const [nightMap, setNightMap] = useState<THREE.Texture>(placeholder.night);
  const [cloudsMap, setCloudsMap] = useState<THREE.Texture>(fallbackClouds);

  // Imperative texture load with per-texture error tolerance. If a file fails
  // to decode (placeholder stubs in the wrong format, missing files, etc.)
  // the corresponding fallback stays in place silently. console.warn surfaces
  // the first failure for debugging without breaking the scene.
  useEffect(() => {
    const loader = new THREE.TextureLoader();
    let cancelled = false;
    const load = (url: string, onLoad: (t: THREE.Texture) => void) => {
      loader.load(
        url,
        (tex) => {
          if (cancelled) return;
          onLoad(tex);
        },
        undefined,
        (err) => {
          if (cancelled) return;
          console.warn(`[celestial] texture load failed: ${url}`, err);
        },
      );
    };
    // Stub-detection: the committed earth-day-4k.webp / earth-night-4k.webp are
    // 34-byte placeholder files that decode "successfully" to 1×1 black. Reject
    // anything <64×64 so the canvas-drawn placeholder stays visible until real
    // Blue Marble imagery is dropped in. Real NASA Blue Marble at 4096×2048
    // sails past this threshold.
    load(earthDayUrl, (tex) => {
      if (isLikelyStubTexture(tex)) return;
      configureSurfaceTexture(tex);
      setDayMap(tex);
    });
    load(earthNightUrl, (tex) => {
      if (isLikelyStubTexture(tex)) return;
      configureSurfaceTexture(tex);
      setNightMap(tex);
    });
    load(earthCloudsUrl, (tex) => {
      if (isLikelyStubTexture(tex)) return;
      tex.wrapS = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      setCloudsMap(tex);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sun direction is computed once at mount in Earth-LOCAL frame (where +X is
  // lng=0). UTC drifts only ~15°/hr so freezing it per-session is fine; what
  // changes per-frame is the local→world transform below. We need that
  // transform because `vNormal` in the shader is in WORLD space (mat3(modelMatrix) * normal),
  // so the lambert dot product is only meaningful when sunDirection is also
  // in world space. Without the transform, any rotation of the earth group
  // (auto-rotate or rotationForFocus) breaks the math and the camera-facing
  // hemisphere reads as the wrong day/night side regardless of UTC.
  const sunLocal = useMemo(() => getSunDirection(new Date()), []);
  const sunWorldRef = useRef(new THREE.Vector3());

  // Stable shared sun-direction uniform. The same `{ value: Vector3 }` object
  // is referenced by both the earth shader and every city-dot shader so the
  // per-frame mutation in useFrame propagates to all materials at once.
  const sunDirectionUniform = useMemo(
    () => ({ value: new THREE.Vector3().copy(sunLocal) }),
    [sunLocal],
  );

  // When placeholderMode is on, force the canvas-drawn placeholder maps even
  // if real webps have loaded. Otherwise use whatever's in dayMap/nightMap
  // state (which starts at the placeholder and is replaced only when a
  // non-stub webp finishes loading — see the load callbacks below).
  const effectiveDayMap = placeholderMode ? placeholder.day : dayMap;
  const effectiveNightMap = placeholderMode ? placeholder.night : nightMap;

  const uniforms = useMemo(
    () => ({
      dayMap: { value: effectiveDayMap },
      nightMap: { value: effectiveNightMap },
      sunDirection: sunDirectionUniform,
      rimColor: { value: new THREE.Color('#5dc1d6') },
      rimIntensity: { value: 1.0 },
      // Night side gets a small color boost so placeholder textures don't
      // disappear into pure black. Real Black Marble imagery is bright enough
      // not to need this, but the constant doesn't hurt the final image.
      nightBoost: { value: 1.4 },
    }),
    [effectiveDayMap, effectiveNightMap, sunDirectionUniform],
  );

  // Auto-rotation. Rate read per-frame from getEarthRotationRate() so the
  // dev console can change it live (incl. negative for reverse, 0 to halt).
  // Skipped while a focus tween is in flight to avoid drift.
  //
  // After rotation we transform sunLocal by Earth's current quaternion and
  // write the resulting world-space vector to the shader uniform. Because the
  // shader's `vNormal` is also in world space, lambert at a city becomes
  //   (R · cityLocal) · (R · sunLocal) = cityLocal · sunLocal
  // — the time-correct illumination, invariant under rotation. So focusing
  // London at 20:00 UTC reads as night and Houston as day, regardless of
  // which rotation the earth group happens to be in.
  useFrame((_, delta) => {
    if (focus.mode === 'auto' && earthRef.current && !focusTweenRef.current?.isActive()) {
      earthRef.current.rotation.y += getEarthRotationRate() * delta;
    }
    if (cloudsRef.current && !settings.degraded) {
      cloudsRef.current.rotation.y += CLOUD_DRIFT_RATE * delta;
    }
    if (earthRef.current) {
      sunWorldRef.current.copy(sunLocal).applyQuaternion(earthRef.current.quaternion);
      uniforms.sunDirection.value.copy(sunWorldRef.current);
    }
  });

  // Focus mode → gsap tween toward target lat/lng. When focus changes from
  // one city to the next, the tween picks up from current rotation. When
  // mode flips back to 'auto', auto-rotation resumes from wherever the tween
  // ended.
  useEffect(() => {
    const earth = earthRef.current;
    if (!earth) return;
    if (focus.mode !== 'focused' || !focus.target) return;

    const { x: targetRotX, y: targetRotY } = rotationForFocus(focus.target.lat, focus.target.lng);

    focusTweenRef.current?.kill();
    focusTweenRef.current = gsap.to(earth.rotation, {
      x: targetRotX,
      y: targetRotY,
      duration: FOCUS_TWEEN_DURATION_SEC,
      ease: 'power2.inOut',
    });

    return () => {
      focusTweenRef.current?.kill();
      focusTweenRef.current = null;
    };
  }, [focus.mode, focus.target]);

  // Geometry density: lower on mobile to keep frame budget under control.
  const segments = settings.isMobile ? 32 : 64;
  // Clouds hidden in test mode regardless of device — the test material is
  // unlit and cloud overlay would obscure the city markers.
  const showClouds = !settings.degraded && !testMode;

  // Precompute city marker positions + per-dot shader uniforms once. The dots
  // are children of the rotating earth group, so they rotate with the planet
  // (and a focus tween on the earth group brings the targeted dot under the
  // camera automatically). Per-dot uniforms include the city's earth-LOCAL
  // surface normal (unit vector at the same lat/lng) — used by the city-dot
  // shader to compute lambert against the shared sunDirection. dayColor +
  // nightColor are constants but live in uniforms so each dot's material
  // shares the same shader compilation.
  const cityPositions = useMemo(
    () =>
      CANONICAL_CITIES.map((c) => ({
        key: c.key,
        position: positionFromLatLng(c.lat, c.lng, CITY_DOT_ORBIT),
        uniforms: {
          cityNormalLocal: { value: positionFromLatLng(c.lat, c.lng, 1) },
          sunDirection: sunDirectionUniform,
          dayColor: { value: new THREE.Color('#8c1818') },
          nightColor: { value: new THREE.Color('#ffd966') },
        },
      })),
    [sunDirectionUniform],
  );

  return (
    <group position={[x, y, z]}>
      <group ref={earthRef}>
        <mesh>
          <sphereGeometry args={[1, segments, segments]} />
          {testMode ? (
            // Fresh key so the underlying THREE.ShaderMaterial is rebuilt
            // (and its GL program recompiled) when toggling between shaders;
            // otherwise the old compiled program persists.
            <shaderMaterial
              key="earth-test"
              vertexShader={earthTestVertexShader}
              fragmentShader={earthTestFragmentShader}
            />
          ) : (
            <shaderMaterial
              key="earth-day-night"
              vertexShader={earthVertexShader}
              fragmentShader={earthFragmentShader}
              uniforms={uniforms}
            />
          )}
        </mesh>
        {showClouds ? (
          <mesh ref={cloudsRef}>
            <sphereGeometry args={[1.005, segments, segments]} />
            <meshStandardMaterial map={cloudsMap} transparent opacity={0.45} depthWrite={false} />
          </mesh>
        ) : null}
        {testMode || placeholderMode
          ? cityPositions.map(({ key, position, uniforms: dotUniforms }) => (
              <mesh key={key} position={position}>
                <sphereGeometry args={[CITY_DOT_RADIUS, 16, 16]} />
                <shaderMaterial
                  vertexShader={cityDotVertexShader}
                  fragmentShader={cityDotFragmentShader}
                  uniforms={dotUniforms}
                />
              </mesh>
            ))
          : null}
      </group>
    </group>
  );
}
