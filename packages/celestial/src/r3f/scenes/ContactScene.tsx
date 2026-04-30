import { Suspense } from 'react';
import { useLoader } from '@react-three/fiber';
import { TextureLoader } from 'three';
import * as THREE from 'three';

import { SCENE_ANCHORS } from '../scene-anchors.js';
import type { SceneName } from '../../scenes.js';
import { useMobileSettings } from '../MobileSettings.js';
import { useNebulaeConfig } from '../../NebulaeConfigContext.js';
import { NEBULA_VARIANTS } from './nebula-variants.js';
import type { NebulaVariant } from './nebula-variants.js';
import { NebulaBillboards } from './NebulaBillboards.js';
import { NebulaParticles } from './NebulaParticles.js';

// Contact scene — composition of two independently togglable effects on
// the active variant's nebula photograph:
//   1. NebulaBillboards — camera-facing photo planes stacked along Z.
//   2. NebulaParticles  — 3D particle cloud sampled from photo luminance.
// Both share the variant's photo texture (loaded once via useLoader).
//
// Mounted only when the contact scene is active (gated by `scene` prop).
// The local Suspense boundary is mandatory: useLoader suspends, and
// without a local catch the suspension bubbles up to the Canvas root,
// forcing a remount that loses the WebGL context (gotcha #45).

interface ContactSceneProps {
  readonly scene: SceneName;
}

export function ContactScene({ scene }: ContactSceneProps) {
  const config = useNebulaeConfig();
  const settings = useMobileSettings();
  const sceneActive = scene === 'contact';

  if (!config.visible) {
    return null;
  }

  const params = NEBULA_VARIANTS[config.variant];
  const photoUrl = settings.degraded ? params.photoUrl1k : params.photoUrl2k;

  const billboardLayerCount = settings.degraded
    ? Math.min(config.billboardLayerCount, 2)
    : config.billboardLayerCount;
  const particleCount = settings.degraded
    ? Math.min(config.particleCount, 8000)
    : config.particleCount;

  return (
    <group position={[...SCENE_ANCHORS.contact.origin]}>
      {sceneActive ? (
        <Suspense fallback={null}>
          <NebulaContent
            photoUrl={photoUrl}
            variant={config.variant}
            billboardsVisible={config.billboardsVisible}
            billboardLayerCount={billboardLayerCount}
            billboardJitter={config.billboardJitter}
            billboardScale={config.billboardScale}
            billboardBrightness={config.billboardBrightness}
            billboardSaturation={config.billboardSaturation}
            billboardGlow={config.billboardGlow}
            billboardDrift={config.billboardDrift}
            particlesVisible={config.particlesVisible}
            particleCount={particleCount}
            particleSize={config.particleSize}
            particleJitter={config.particleJitter}
            particleBrightness={config.particleBrightness}
            particleSaturation={config.particleSaturation}
            particleGlow={config.particleGlow}
            particleDrift={config.particleDrift}
          />
        </Suspense>
      ) : null}
    </group>
  );
}

interface NebulaContentProps {
  readonly photoUrl: string;
  readonly variant: NebulaVariant;
  readonly billboardsVisible: boolean;
  readonly billboardLayerCount: number;
  readonly billboardJitter: number;
  readonly billboardScale: number;
  readonly billboardBrightness: number;
  readonly billboardSaturation: number;
  readonly billboardGlow: number;
  readonly billboardDrift: boolean;
  readonly particlesVisible: boolean;
  readonly particleCount: number;
  readonly particleSize: number;
  readonly particleJitter: number;
  readonly particleBrightness: number;
  readonly particleSaturation: number;
  readonly particleGlow: number;
  readonly particleDrift: boolean;
}

function NebulaContent({
  photoUrl,
  variant,
  billboardsVisible,
  billboardLayerCount,
  billboardJitter,
  billboardScale,
  billboardBrightness,
  billboardSaturation,
  billboardGlow,
  billboardDrift,
  particlesVisible,
  particleCount,
  particleSize,
  particleJitter,
  particleBrightness,
  particleSaturation,
  particleGlow,
  particleDrift,
}: NebulaContentProps) {
  const photo = useLoader(TextureLoader, photoUrl);
  // sRGB color-space decoding for additive emission to accumulate in
  // linear-light space.
  photo.colorSpace = THREE.SRGBColorSpace;
  photo.minFilter = THREE.LinearMipMapLinearFilter;
  photo.magFilter = THREE.LinearFilter;
  photo.generateMipmaps = true;

  return (
    <>
      {billboardsVisible ? (
        <NebulaBillboards
          photo={photo}
          variant={variant}
          layerCount={billboardLayerCount}
          jitter={billboardJitter}
          scale={billboardScale}
          brightness={billboardBrightness}
          saturation={billboardSaturation}
          glow={billboardGlow}
          drift={billboardDrift}
        />
      ) : null}
      {particlesVisible ? (
        <NebulaParticles
          photo={photo}
          variant={variant}
          count={particleCount}
          size={particleSize}
          jitter={particleJitter}
          brightness={particleBrightness}
          saturation={particleSaturation}
          glow={particleGlow}
          drift={particleDrift}
        />
      ) : null}
    </>
  );
}
