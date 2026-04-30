import { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import type { SceneName } from '../../scenes.js';
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
import { moonVertexShader, moonFragmentShader } from '../shaders/moon.glsl.js';
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
// Moon visualization. Cosmetic, not ephemeris: orbit radius is compressed
// vs reality (~60 earth-radii in physics) but generous enough to read as
// "background satellite" rather than a tight crescent. Equatorial orbit
// plane keeps the umbra cone math simple — the real moon's 5° inclination
// is a subtle effect we trade away for clearer eclipse alignment.
//
// Orbital position is locked to earth.rotation.y at runtime: the moon
// orbits at the same angular rate the earth spins, with a fixed offset
// derived from the current UTC's synodic-month phase (so the start state
// roughly matches the moon's real-world position at session open).
const MOON_ORBIT_RADIUS = 7.8;
const MOON_RADIUS = 0.27;
// Earth's umbra cone — the moon is fully shadowed when its lateral distance
// from the sun-axis-through-earth is less than the earth radius (1.0).
// Penumbra fades out by 1.4 to soften the eclipse boundary.
const UMBRA_INNER = 0.95;
const UMBRA_OUTER = 1.4;
// Known new-moon epoch (Jan 6 2000, 18:14 UTC) and synodic month length.
// Used once at mount to compute a real-time-anchored offset for the moon's
// orbital angle. After mount the moon tracks earth.rotation.y, preserving
// this offset.
const LUNAR_NEW_MOON_EPOCH_MS = Date.UTC(2000, 0, 6, 18, 14, 0);
const SYNODIC_MONTH_MS = 29.530588853 * 86_400_000;

function moonOrbitOffsetFromUtc(date: Date): number {
  const elapsed = date.getTime() - LUNAR_NEW_MOON_EPOCH_MS;
  const wrapped = ((elapsed % SYNODIC_MONTH_MS) + SYNODIC_MONTH_MS) % SYNODIC_MONTH_MS;
  return (wrapped / SYNODIC_MONTH_MS) * Math.PI * 2;
}

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

interface EarthSceneProps {
  // Active backdrop scene. Used to gate the root group's visibility so the
  // Earth+Moon system stops rendering once the camera has flown out to the
  // projects anchor (and beyond). Mount stays — geometry, textures, and
  // useFrame all keep running — but Three.js skips the entire subtree
  // when `visible` is false.
  readonly scene: SceneName;
  // Outgoing scene during a route tween. Lets earthSystemVisible stay
  // true while the camera flies away from /earth or /about so the
  // Earth+Moon system recedes smoothly through the warp.
  readonly previousScene: SceneName | null;
  // Shared sun-direction uniform owned by Canvas3D. EarthScene's useFrame
  // mutates this every frame (sunLocal · earth.quaternion → world space)
  // so every consumer (earth shader, city dots, moon, gas giant) reads
  // the same up-to-date world-space sun vector via the same reference.
  readonly sunDirection: { value: THREE.Vector3 };
}

export function EarthScene({ scene, previousScene, sunDirection }: EarthSceneProps) {
  const [x, y, z] = SCENE_ANCHORS.earth.origin;
  const settings = useMobileSettings();
  const focus = useCelestialFocus();
  const { testMode } = useEarthTestMode();
  const { placeholderMode } = useEarthPlaceholderMode();

  const earthRef = useRef<THREE.Group>(null);
  const cloudsRef = useRef<THREE.Mesh>(null);
  const moonOrbitRef = useRef<THREE.Group>(null);
  const moonRef = useRef<THREE.Mesh>(null);
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

  // The shared sun-direction uniform is owned by Canvas3D (the same
  // `{ value: Vector3 }` reference threads through earth + city dots +
  // moon + gas giant). EarthScene's useFrame mutates `sunDirection.value`
  // each frame — gotcha #28 stands: don't break the reference identity.
  const sunDirectionUniform = sunDirection;

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

  // Moon uniforms. Shares the sunDirection uniform reference with the earth
  // shader so the per-frame mutation in useFrame propagates here too.
  // shadowFactor is updated each frame by the umbra-cone test below.
  const moonUniforms = useMemo(
    () => ({
      sunDirection: sunDirectionUniform,
      baseColor: { value: new THREE.Color('#cccdd0') },
      ambient: { value: 0.05 },
      shadowFactor: { value: 0 },
    }),
    [sunDirectionUniform],
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
  // Working vectors for the moon-shadow umbra cone. Allocated outside
  // useFrame to avoid per-frame GC churn.
  const earthOriginVec = useMemo(() => new THREE.Vector3(...SCENE_ANCHORS.earth.origin), []);
  const moonWorldVec = useMemo(() => new THREE.Vector3(), []);
  const earthToMoonVec = useMemo(() => new THREE.Vector3(), []);
  const antiSunVec = useMemo(() => new THREE.Vector3(), []);
  const lateralVec = useMemo(() => new THREE.Vector3(), []);
  // UTC-anchored offset for the moon's orbital angle. Computed once at mount;
  // afterward the moon mirrors earth.rotation.y plus this offset, so the
  // orbit advances at exactly the earth's spin rate (auto-rotation or focus
  // tween) while preserving an initial position that roughly matches the
  // real moon's synodic phase at session open.
  const moonOrbitOffset = useMemo(() => moonOrbitOffsetFromUtc(new Date()), []);

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

    // Lock moon orbit to earth.rotation.y + UTC-derived offset, then compute
    // earth-shadow darkening from the resulting moon world position.
    if (moonOrbitRef.current && moonRef.current && earthRef.current) {
      moonOrbitRef.current.rotation.y = earthRef.current.rotation.y + moonOrbitOffset;

      // Earth umbra cone: project earth→moon onto -sunDirection, measure the
      // perpendicular distance from the sun-axis-through-earth. If that
      // lateral distance is less than the earth radius (1.0) and the moon is
      // on the anti-sun side (along > 0), it's in shadow.
      moonRef.current.getWorldPosition(moonWorldVec);
      earthToMoonVec.copy(moonWorldVec).sub(earthOriginVec);
      antiSunVec.copy(sunWorldRef.current).negate();
      const along = earthToMoonVec.dot(antiSunVec);

      let shadowFactor = 0;
      if (along > 0) {
        // lateral = earthToMoon - along * antiSun
        lateralVec.copy(antiSunVec).multiplyScalar(along);
        lateralVec.copy(earthToMoonVec).sub(lateralVec);
        const lateralLen = lateralVec.length();
        // Soft cone: 1 inside UMBRA_INNER, 0 outside UMBRA_OUTER, smooth
        // penumbra in between. (THREE.MathUtils.smoothstep requires
        // min<=max, so we ramp 0→1 across the penumbra and invert.)
        shadowFactor = 1 - THREE.MathUtils.smoothstep(lateralLen, UMBRA_INNER, UMBRA_OUTER);
      }
      moonUniforms.shadowFactor.value = shadowFactor;
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

  // Hide the entire Earth+Moon system once the camera has flown out to a
  // farther scene. Keeping the subtree mounted means useFrame continues
  // (rotation animation progresses in the background, sunDirection
  // uniform stays in sync with UTC); Three.js just skips the draw calls.
  const earthSystemVisible =
    scene === 'earth' ||
    scene === 'about' ||
    previousScene === 'earth' ||
    previousScene === 'about';

  return (
    <group position={[x, y, z]} visible={earthSystemVisible}>
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
      {/* Moon — sibling of earthRef so it orbits around the earth-group's
          center rather than rotating with the planet. moonOrbitRef rotates
          around Y in the equatorial plane; the mesh inside is positioned at
          orbit radius along +X within that group, so the rotation carries it
          around earth. The shader handles lambert against the shared
          sunDirection uniform; useFrame computes the umbra-cone shadow each
          frame. */}
      <group ref={moonOrbitRef}>
        <mesh ref={moonRef} position={[MOON_ORBIT_RADIUS, 0, 0]}>
          <sphereGeometry args={[MOON_RADIUS, 32, 32]} />
          <shaderMaterial
            vertexShader={moonVertexShader}
            fragmentShader={moonFragmentShader}
            uniforms={moonUniforms}
          />
        </mesh>
      </group>
    </group>
  );
}
