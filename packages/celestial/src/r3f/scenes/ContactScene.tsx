import { Suspense, useEffect, useMemo, useRef } from 'react';
import { useFrame, useLoader, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { TextureLoader } from 'three';

import { SCENE_ANCHORS } from '../scene-anchors.js';
import type { SceneName } from '../../scenes.js';
import { useMobileSettings } from '../MobileSettings.js';
import { useNebulaeConfig } from '../../NebulaeConfigContext.js';
import { NEBULA_VARIANTS, type NebulaVariant } from './nebula-variants.js';
import { nebulaVertexShader, nebulaFragmentShader } from '../shaders/nebula.glsl.js';

// Photo-driven volumetric raymarched nebula at the contact anchor
// (z=2048+). One bounding sphere mesh, BackSide-rendered, with a
// shader that marches rays from the camera through the volume and
// accumulates emissive color from a real-world nebula photograph
// modulated by 3D-FBM density. Switching variants swaps which
// uniform set + photo texture is active; the bounding mesh is
// unchanged.
//
// Camera dive sub-animation is intentionally NOT implemented in
// this commit — it lands in the next sub-unit. The volume is
// stationary; the route tween's 1200ms drop at the contact anchor
// (just outside the volume's near surface) is the only camera motion
// in this version.

const VOLUME_RADIUS = 12;
const SPHERE_SEGMENTS_W = 32;
const SPHERE_SEGMENTS_H = 24;

interface ContactSceneProps {
  readonly scene: SceneName;
}

export function ContactScene({ scene }: ContactSceneProps) {
  const config = useNebulaeConfig();
  const settings = useMobileSettings();
  const camera = useThree((s) => s.camera);
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);

  // Pick photo URL by mobile-degraded path. The texture loader caches by
  // URL so re-mounts (variant switches) are instant once cached.
  const params = NEBULA_VARIANTS[config.variant];
  const photoUrl = settings.degraded ? params.photoUrl1k : params.photoUrl2k;

  // Mount the volume only when the contact scene is active. Avoids paying
  // for raymarch fragments at every other route — the bounding sphere is
  // ~32x24 = 768 vertices, but the shader is fragment-bound and BackSide
  // covers a lot of pixels at z=2055.
  const sceneActive = scene === 'contact';

  if (!config.visible) {
    return null;
  }

  return (
    <group ref={groupRef} position={[...SCENE_ANCHORS.contact.origin]}>
      {sceneActive ? (
        // Local Suspense boundary for the texture useLoader. Without this
        // the suspension bubbles up to whichever ancestor catches it (or
        // none — which forces a Canvas remount + WebGL context loss). A
        // local boundary contains it: the volume just doesn't render
        // until the texture finishes loading; the rest of the canvas is
        // unaffected.
        <Suspense fallback={null}>
          <NebulaVolume
            photoUrl={photoUrl}
            variant={config.variant}
            density={config.density}
            stepCount={settings.degraded ? Math.min(config.stepCount, 8) : config.stepCount}
            drift={config.drift}
            brightnessMul={config.brightnessMul}
            saturationMul={config.saturationMul}
            glowMul={config.glowMul}
            diffuseMul={config.diffuseMul}
            camera={camera}
            meshRef={meshRef}
          />
        </Suspense>
      ) : null}
    </group>
  );
}

interface NebulaVolumeProps {
  readonly photoUrl: string;
  readonly variant: NebulaVariant;
  readonly density: number;
  readonly stepCount: number;
  readonly drift: boolean;
  readonly brightnessMul: number;
  readonly saturationMul: number;
  readonly glowMul: number;
  readonly diffuseMul: number;
  readonly camera: THREE.Camera;
  readonly meshRef: React.RefObject<THREE.Mesh | null>;
}

function NebulaVolume({
  photoUrl,
  variant,
  density,
  stepCount,
  drift,
  brightnessMul,
  saturationMul,
  glowMul,
  diffuseMul,
  camera,
  meshRef,
}: NebulaVolumeProps) {
  const photo = useLoader(TextureLoader, photoUrl);
  const params = NEBULA_VARIANTS[variant];

  // Color-space + filter setup. Real photo content needs sRGB→linear
  // decoding so the additive emission accumulates in linear-light
  // space.
  useEffect(() => {
    photo.colorSpace = THREE.SRGBColorSpace;
    photo.minFilter = THREE.LinearMipMapLinearFilter;
    photo.magFilter = THREE.LinearFilter;
    photo.generateMipmaps = true;
    photo.needsUpdate = true;
  }, [photo]);

  // Uniforms. cameraLocal is mutated each frame (camera moves /
  // mesh rotates). densityScale mirrors the per-variant base value
  // multiplied by the user's density slider.
  const uniforms = useMemo(
    () => ({
      nebulaPhoto: { value: photo },
      cameraLocal: { value: new THREE.Vector3() },
      time: { value: 0 },
      densityScale: { value: params.densityScale * density },
      noiseFreq: { value: params.noiseFreq },
      warpAmplitude: { value: params.warpAmplitude },
      falloffPower: { value: params.falloffPower },
      variantSeed: { value: new THREE.Vector3(...params.variantSeed) },
      stepCount: { value: stepCount },
      edgeFeather: { value: params.edgeFeather },
      brightness: { value: params.brightness },
      saturation: { value: params.saturation },
      glowAmount: { value: params.glowAmount },
      diffuseStrength: { value: params.diffuseStrength },
      diffuseLodBias: { value: params.diffuseLodBias },
      shimmerSpeed: { value: params.shimmerSpeed },
    }),
    // photo is stable identity from useLoader cache for the same URL;
    // params is the constant variant entry.
    [photo, params, density, stepCount],
  );

  // Per-frame: project camera world position into the volume's local
  // frame so the shader's ray math works in the unit-sphere space.
  // Slow Y rotation gives the "drift" feel inside the cloud.
  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    if (drift) {
      mesh.rotation.y += delta * 0.05;
    }
    // matrixWorldInverse is updated by three.js before render, but we
    // need the inverse of THIS mesh's matrixWorld — which three updates
    // automatically. Compute and apply.
    mesh.updateMatrixWorld();
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    uniforms.cameraLocal.value.copy(camera.position).applyMatrix4(inv);
    uniforms.time.value += delta;
    uniforms.densityScale.value = params.densityScale * density;
    uniforms.stepCount.value = stepCount;
    uniforms.brightness.value = params.brightness * brightnessMul;
    uniforms.saturation.value = params.saturation * saturationMul;
    uniforms.glowAmount.value = params.glowAmount * glowMul;
    uniforms.diffuseStrength.value = params.diffuseStrength * diffuseMul;
  });

  return (
    <mesh ref={meshRef} scale={[VOLUME_RADIUS, VOLUME_RADIUS, VOLUME_RADIUS]}>
      <sphereGeometry args={[1, SPHERE_SEGMENTS_W, SPHERE_SEGMENTS_H]} />
      <shaderMaterial
        vertexShader={nebulaVertexShader}
        fragmentShader={nebulaFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.BackSide}
      />
    </mesh>
  );
}
