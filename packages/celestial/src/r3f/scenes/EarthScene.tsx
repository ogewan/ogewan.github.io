import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import gsap from 'gsap';
import { useCelestialFocus } from '../../CelestialContext.js';
import { useMobileSettings } from '../MobileSettings.js';
import { SCENE_ANCHORS } from '../scene-anchors.js';
import { earthVertexShader, earthFragmentShader } from '../shaders/earth.glsl.js';
import { getSunDirection, rotationForFocus } from '../sun-direction.js';
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
// on `!degraded` (mobile, save-data, or slow-connection users skip it). The
// 2k cloud texture is alpha-premultiplied; the mesh uses standard material
// with `transparent: true` and `depthWrite: false` to layer on top of the
// shader-material Earth without z-fighting.
//
// Two rotation modes via `useCelestialFocus()`:
//   - 'auto'    — useFrame increments rotation Y at ~6× real time (visible at
//                 session timescale; real Earth is 0.0042°/sec).
//   - 'focused' — gsap tweens X/Y rotation so the target lat/lng faces the
//                 camera over ~2s. Auto-rotation pauses until setAuto().
//
// Texture loading via drei's useTexture suspends the scene tree; the parent
// CelestialBackdrop's <Suspense fallback={<ReducedMotionBackdrop>}> covers
// the load window so first paint is never blank.

const AUTO_ROTATION_RATE = 0.025; // rad/sec ≈ 1.43°/sec at session timescale
const CLOUD_DRIFT_RATE = 0.015;
const FOCUS_TWEEN_DURATION_SEC = 2;

export function EarthScene() {
  const [x, y, z] = SCENE_ANCHORS.earth.origin;
  const settings = useMobileSettings();
  const focus = useCelestialFocus();

  const earthRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const focusTweenRef = useRef<gsap.core.Tween | null>(null);

  // Object form returns a record so each texture is non-nullable in the type
  // (matches noUncheckedIndexedAccess). drei suspends until all three load.
  const { dayMap, nightMap, cloudsMap } = useTexture({
    dayMap: earthDayUrl,
    nightMap: earthNightUrl,
    cloudsMap: earthCloudsUrl,
  });

  // Clamp anisotropy on the day/night maps so high-DPI screens don't see UV
  // streaking near the poles. drei's useTexture defaults to ClampToEdge wrap;
  // for an equirectangular map we want repeating along longitude.
  useEffect(() => {
    for (const tex of [dayMap, nightMap]) {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.wrapS = THREE.RepeatWrapping;
      tex.anisotropy = 4;
    }
    cloudsMap.wrapS = THREE.RepeatWrapping;
  }, [dayMap, nightMap, cloudsMap]);

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
      // Night side gets a small color boost so the placeholder textures don't
      // disappear into pure black; real Black Marble imagery is bright enough
      // not to need this, but the constant doesn't hurt the final image.
      nightBoost: { value: 1.4 },
    }),
    [dayMap, nightMap, sunDir],
  );

  // Auto-rotation. Skipped while a focus tween is in flight to avoid drift.
  useFrame((_, delta) => {
    if (focus.mode === 'auto' && earthRef.current && !focusTweenRef.current?.isActive()) {
      earthRef.current.rotation.y += AUTO_ROTATION_RATE * delta;
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
  const showClouds = !settings.degraded;

  return (
    <group position={[x, y, z]}>
      <group ref={earthRef}>
        <mesh>
          <sphereGeometry args={[1, segments, segments]} />
          <shaderMaterial
            vertexShader={earthVertexShader}
            fragmentShader={earthFragmentShader}
            uniforms={uniforms}
          />
        </mesh>
        {showClouds ? (
          <mesh ref={cloudsRef}>
            <sphereGeometry args={[1.005, segments, segments]} />
            <meshStandardMaterial map={cloudsMap} transparent opacity={0.45} depthWrite={false} />
          </mesh>
        ) : null}
      </group>
    </group>
  );
}
