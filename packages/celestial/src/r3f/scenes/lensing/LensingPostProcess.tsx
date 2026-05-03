import { useEffect, useState, type RefObject } from 'react';
import { Bloom, EffectComposer } from '@react-three/postprocessing';
import * as THREE from 'three';

import { useBlackHoleConfig } from '../../../BlackHoleConfigContext.js';
import { useMobileSettings } from '../../MobileSettings.js';
import {
  GravitationalLensing,
  type GravitationalLensingEffectImpl,
} from '../GravitationalLensingEffect.js';
import {
  LegacyGravitationalLensing,
  type LegacyGravitationalLensingEffectImpl,
} from '../GravitationalLensingEffect.legacy.js';
import { DiskRenderTarget } from './DiskRenderTarget.js';
import { loadDeflectionLut } from './loadDeflectionLut.js';
import { StarfieldCubemap } from './StarfieldCubemap.js';

// Bundles the EffectComposer + lensing effect + supporting LUT / cubemap
// loaders. Mounted by Canvas3D when the colophon scene is active. Lives in a
// child component so it can use `useMobileSettings()` (which is provided by
// MobileSettingsProvider in Canvas3D's outer tree).
//
// Degraded fallback. On mobile / save-data / slow connections we render the
// legacy screen-space approximation instead of the new (in unit B: raytraced)
// path. The legacy effect ignores the LUT and cubemap entirely — they aren't
// loaded or rendered when degraded === true.
//
// EffectComposer settings. multisampling=0 (Canvas already has antialias=true)
// and frameBufferType=UnsignedByteType to avoid the HalfFloat brightening
// regression on additive-blended geometry — see ARCHITECTURE.md gotcha #47.

interface LensingPostProcessProps {
  /** World position of the BH — used as the center of the starfield cubemap. */
  readonly bhOrigin: readonly [number, number, number];
  /** Forwarded to whichever lensing effect is mounted; ColophonScene drives
   *  uniforms through this ref. */
  readonly lensingEffectRef: RefObject<
    GravitationalLensingEffectImpl | LegacyGravitationalLensingEffectImpl | null
  >;
}

export function LensingPostProcess({ bhOrigin, lensingEffectRef }: LensingPostProcessProps) {
  const { degraded } = useMobileSettings();
  const config = useBlackHoleConfig();

  const [lut, setLut] = useState<THREE.DataTexture | null>(null);
  const [cubemap, setCubemap] = useState<THREE.CubeTexture | null>(null);
  const [diskRt, setDiskRt] = useState<THREE.Texture | null>(null);

  // Async load of the deflection LUT. Fires when the new (non-degraded) effect
  // path is mounted. The shader runs in passthrough mode while null.
  useEffect(() => {
    if (degraded) return undefined;
    let alive = true;
    loadDeflectionLut()
      .then((loaded) => {
        if (alive) setLut(loaded.texture);
      })
      .catch((err: unknown) => {
        // Best-effort — if the LUT fails to load the shader stays in
        // passthrough mode (no lensing). Log so the failure is visible.
        console.warn('[GravitationalLensing] deflection LUT load failed:', err);
      });
    return () => {
      alive = false;
    };
  }, [degraded]);

  return (
    <>
      {!degraded && (
        <>
          <StarfieldCubemap center={bhOrigin} onReady={setCubemap} />
          <DiskRenderTarget
            schwarzschildRadius={config.schwarzschildRadius}
            diskInnerFactor={config.diskInnerFactor}
            diskOuterFactor={config.diskOuterFactor}
            diskBrightness={config.diskBrightness}
            diskSaturation={config.diskSaturation}
            diskTurbulence={config.diskTurbulence}
            diskDrift={config.diskDrift}
            diskRotationSpeed={config.diskRotationSpeed}
            dopplerStrength={config.dopplerStrength}
            onReady={setDiskRt}
          />
        </>
      )}
      <EffectComposer multisampling={0} frameBufferType={THREE.UnsignedByteType}>
        {degraded ? (
          <LegacyGravitationalLensing
            ref={lensingEffectRef as RefObject<LegacyGravitationalLensingEffectImpl | null>}
          />
        ) : (
          <GravitationalLensing
            ref={lensingEffectRef as RefObject<GravitationalLensingEffectImpl | null>}
            deflectionLut={lut}
            starfieldCubemap={cubemap}
            diskRenderTarget={diskRt}
          />
        )}
        {/* Bloom after the lensing effect — the photon ring and inner disk edges
            only exist in the lensing output, not the raw scene framebuffer.
            luminanceThreshold=0.85 catches the near-1.0 bright edges in the
            LDR (UnsignedByteType) buffer without blooming dim space. */}
        <Bloom
          intensity={config.bloomIntensity}
          luminanceThreshold={0.85}
          luminanceSmoothing={0.025}
          mipmapBlur
          radius={0.4}
          levels={6}
        />
      </EffectComposer>
    </>
  );
}
