import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import { useCelestialFocus } from '../../CelestialContext.js';
import { CANONICAL_CITIES } from '../../cities.js';
import { getEarthRotationRate } from '../../earth-rotation-rate.js';
import { useEarthTestMode } from '../../EarthTestModeContext.js';
import { useMobileSettings } from '../MobileSettings.js';
import { SCENE_ANCHORS } from '../scene-anchors.js';
import {
  earthVertexShader,
  earthFragmentShader,
  earthTestVertexShader,
  earthTestFragmentShader,
} from '../shaders/earth.glsl.js';
import { getSunDirection, positionFromLatLng, rotationForFocus } from '../sun-direction.js';
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

  const earthRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const focusTweenRef = useRef<gsap.core.Tween | null>(null);

  // Procedural fallbacks: Earth-blue day, deep-navy night, fully transparent
  // cloud (so the cloud sphere reads as invisible until a real cloud texture
  // arrives). These render immediately on mount.
  const fallbackDay = useMemo(() => makeSolidTexture([58, 120, 163, 255]), []);
  const fallbackNight = useMemo(() => makeSolidTexture([12, 24, 48, 255]), []);
  const fallbackClouds = useMemo(() => makeSolidTexture([255, 255, 255, 0]), []);

  const [dayMap, setDayMap] = useState<THREE.Texture>(fallbackDay);
  const [nightMap, setNightMap] = useState<THREE.Texture>(fallbackNight);
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
    load(earthDayUrl, (tex) => {
      configureSurfaceTexture(tex);
      setDayMap(tex);
    });
    load(earthNightUrl, (tex) => {
      configureSurfaceTexture(tex);
      setNightMap(tex);
    });
    load(earthCloudsUrl, (tex) => {
      tex.wrapS = THREE.RepeatWrapping;
      tex.needsUpdate = true;
      setCloudsMap(tex);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Sun direction is computed once on mount. Updating per-frame would let the
  // terminator track real time, but the sun moves only ~15°/hour (0.067°/sec)
  // so a multi-hour visit is required to see motion — and we'd rather the
  // terminator be a stable orientation cue per session.
  const sunDir = useMemo(() => getSunDirection(new Date()), []);

  const uniforms = useMemo(
    () => ({
      dayMap: { value: dayMap },
      nightMap: { value: nightMap },
      sunDirection: { value: sunDir },
      rimColor: { value: new THREE.Color('#5dc1d6') },
      rimIntensity: { value: 1.0 },
      // Night side gets a small color boost so placeholder textures don't
      // disappear into pure black. Real Black Marble imagery is bright enough
      // not to need this, but the constant doesn't hurt the final image.
      nightBoost: { value: 1.4 },
    }),
    [dayMap, nightMap, sunDir],
  );

  // Auto-rotation. Rate read per-frame from getEarthRotationRate() so the
  // dev console can change it live (incl. negative for reverse, 0 to halt).
  // Skipped while a focus tween is in flight to avoid drift.
  useFrame((_, delta) => {
    if (focus.mode === 'auto' && earthRef.current && !focusTweenRef.current?.isActive()) {
      earthRef.current.rotation.y += getEarthRotationRate() * delta;
    }
    if (cloudsRef.current && !settings.degraded) {
      cloudsRef.current.rotation.y += CLOUD_DRIFT_RATE * delta;
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

  // Precompute city marker positions once. Children of the rotating earth
  // group, so they rotate with the planet (and a focus tween on the earth
  // group brings the targeted dot under the camera automatically).
  const cityPositions = useMemo(
    () =>
      CANONICAL_CITIES.map((c) => ({
        key: c.key,
        position: positionFromLatLng(c.lat, c.lng, CITY_DOT_ORBIT),
      })),
    [],
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
        {testMode
          ? cityPositions.map(({ key, position }) => (
              <mesh key={key} position={position}>
                <sphereGeometry args={[CITY_DOT_RADIUS, 16, 16]} />
                <meshBasicMaterial color="#ff2030" />
              </mesh>
            ))
          : null}
      </group>
    </group>
  );
}
