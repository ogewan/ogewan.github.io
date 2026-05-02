import { useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { getBackgroundSnapshot } from '../BackgroundConfigContext.js';
import { getColophonSceneActive } from './lensing-active-store.js';
import { useMobileSettings } from './MobileSettings.js';
import { SKYBOX_NEBULA_FRAG, SKYBOX_NEBULA_VERT } from './skybox-nebula-shader.js';
import { buildStarBuffers, STAR_SEED, STARFIELD_RADIUS } from './star-buffers.js';

// Persistent starfield + procedural nebula skybox rendered behind every scene
// on the tour line. One Points geometry for the stars (single draw call), one
// inverted SphereGeometry for the nebula. Both follow the camera every frame
// so they behave as a true skybox — stars and nebula stay at constant
// apparent distance regardless of where the camera is along the tour line.
//
// The stars and nebula both come from BackgroundConfigContext, which has two
// independent sets that this component switches between based on whether the
// colophon scene is active (colophonSceneActive flag, set immediately on scene
// change — no tween delay):
//   global   — used in earth / projects / contact
//   colophon — used whenever the colophon scene is the active destination
//              (compensates for the EffectComposer's no-tone-mapping brightening)
// Both sets share the same three knobs: nebulaBrightness, nebulaSaturation,
// starBrightness. The dev console exposes them via portfolio.bg.global.config
// and portfolio.bg.colophon.config.
//
// Star generation is deterministic via the shared LCG in star-buffers.ts —
// using the same seed as StarfieldCubemap means the cubemap's lensed star
// positions line up with the un-lensed stars in the rest of the frame.

const NEBULA_RADIUS = 600; // sits behind the stars but well inside the camera far plane
const DESKTOP_COUNT = 2000;
const MOBILE_COUNT = 800;
const BASE_STAR_OPACITY = 0.9; // matches the previous hardcoded opacity

export function SharedStarField() {
  const settings = useMobileSettings();
  const count = settings.isMobile ? MOBILE_COUNT : DESKTOP_COUNT;
  const data = useMemo(() => buildStarBuffers(count, STARFIELD_RADIUS, STAR_SEED), [count]);
  const pointsRef = useRef<THREE.Points>(null);
  const pointsMatRef = useRef<THREE.PointsMaterial>(null);
  const nebulaRef = useRef<THREE.Mesh>(null);
  const nebulaMatRef = useRef<THREE.ShaderMaterial>(null);
  const camera = useThree((s) => s.camera);

  // Initial uniforms object — read once at mount for the JSX prop.
  // Updates are applied via nebulaMatRef.current.uniforms directly in useFrame;
  // mutating this object is not reliable because R3F may not preserve the
  // reference between the JSX prop and the material's internal uniforms.
  const nebulaUniforms = useMemo(
    () => ({
      uBrightness: { value: getBackgroundSnapshot().global.nebulaBrightness },
      uSaturation: { value: getBackgroundSnapshot().global.nebulaSaturation },
    }),
    [],
  );

  // Poll config stores directly each frame. The useState + useEffect
  // subscription pattern doesn't reliably deliver re-renders inside R3F's
  // Canvas root when stores are updated from outside React's event loop
  // (console calls, setTimeout callbacks). Reading module-scoped variables
  // in useFrame is free, and Three.js picks up uniform/opacity mutations on
  // the very next draw call.
  useFrame(() => {
    if (pointsRef.current) pointsRef.current.position.copy(camera.position);
    if (nebulaRef.current) nebulaRef.current.position.copy(camera.position);

    const snapshot = getBackgroundSnapshot();
    const activeSet = getColophonSceneActive() ? snapshot.colophon : snapshot.global;
    if (nebulaMatRef.current) {
      const u = nebulaMatRef.current.uniforms;
      if (u['uBrightness']) u['uBrightness'].value = activeSet.nebulaBrightness;
      if (u['uSaturation']) u['uSaturation'].value = activeSet.nebulaSaturation;
    }
    if (pointsMatRef.current) {
      pointsMatRef.current.opacity = Math.min(1.0, activeSet.starBrightness * BASE_STAR_OPACITY);
    }
  });

  return (
    <>
      {/* Procedural nebula skybox — sits behind every scene as the global
          background. Same shader the colophon's StarfieldCubemap uses, so
          the lensed background stays visually continuous with the un-lensed
          sky outside the BH region (no "bubble" of nebula contrasting with
          a pitch-black skybox). renderOrder=-2 so it draws first; depthTest
          off so it's always behind everything in the depth buffer. */}
      <mesh ref={nebulaRef} frustumCulled={false} renderOrder={-2}>
        <sphereGeometry args={[NEBULA_RADIUS, 32, 16]} />
        <shaderMaterial
          ref={nebulaMatRef}
          vertexShader={SKYBOX_NEBULA_VERT}
          fragmentShader={SKYBOX_NEBULA_FRAG}
          uniforms={nebulaUniforms}
          side={THREE.BackSide}
          depthWrite={false}
          depthTest={false}
        />
      </mesh>

      <points ref={pointsRef} frustumCulled={false} renderOrder={-1}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[data.positions, 3]}
            count={count}
            array={data.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[data.colors, 3]}
            count={count}
            array={data.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[data.sizes, 1]}
            count={count}
            array={data.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <pointsMaterial
          ref={pointsMatRef}
          vertexColors
          size={1.2}
          sizeAttenuation
          transparent
          opacity={BASE_STAR_OPACITY}
          depthWrite={false}
        />
      </points>
    </>
  );
}
