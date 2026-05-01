import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import type { SceneName } from '../../scenes.js';
import { SCENE_ANCHORS } from '../scene-anchors.js';
import { useBlackHoleConfig } from '../../BlackHoleConfigContext.js';
import { AccretionDisk } from './AccretionDisk.js';
import { CAMERA_TWEEN_DURATION_SEC } from '../CameraDriver.js';
import type { GravitationalLensingEffectImpl } from './GravitationalLensingEffect.js';

// Colophon scene — Gargantua × M87 black hole (Phase 9.5).
//
// Renders:
//   1. A pure-black shadow sphere (radius = 2.6 × Rs) that occludes geometry
//      behind the event horizon.
//   2. AccretionDisk — flat ring with FBm turbulence, temperature gradient,
//      and Doppler asymmetry (left / approaching side brighter).
//
// The gravitational lensing distortion is applied by GravitationalLensingEffect
// in Canvas3D's <EffectComposer>. This component drives that effect's uniforms
// per frame via the lensingEffectRef passed from Canvas3D.
//
// Transition — contact → colophon:
//   uVignette ramps 0→1 over 800ms (masking nebula billboard edges as the
//   camera zooms out), then falls back 1→0 over 400ms as the BH fills frame.
//   The distortion ramps in over CAMERA_TWEEN_DURATION_SEC via GSAP.

interface ColophonSceneProps {
  readonly scene: SceneName;
  readonly previousScene: SceneName | null;
  readonly lensingEffectRef: React.RefObject<GravitationalLensingEffectImpl | null>;
}

// Reusable scratch objects — avoids per-frame allocation.
const _bhWorld = new THREE.Vector3();
const _edgeWorld = new THREE.Vector3();

export function ColophonScene({ scene, previousScene, lensingEffectRef }: ColophonSceneProps) {
  const config = useBlackHoleConfig();
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const colophonSceneVisible = scene === 'colophon' || previousScene === 'colophon';

  const distortionTweenRef = useRef<gsap.core.Tween | null>(null);
  const vignetteTweenRef = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null);
  const prevSceneRef = useRef<SceneName>(scene);
  const uniformsProxy = useRef({ distortion: 0, vignette: 0 });

  // Drive uDistortion and uVignette via GSAP whenever scene changes.
  useEffect(() => {
    const prev = prevSceneRef.current;
    prevSceneRef.current = scene;

    const effect = lensingEffectRef.current;
    if (!effect) return;

    distortionTweenRef.current?.kill();
    vignetteTweenRef.current?.kill();

    if (scene === 'colophon') {
      // Arriving at colophon: fade distortion in over the tween duration.
      distortionTweenRef.current = gsap.to(uniformsProxy.current, {
        distortion: config.distortionStrength,
        duration: CAMERA_TWEEN_DURATION_SEC,
        ease: 'power2.in',
        onUpdate: () => {
          const u = effect.uniforms.get('uDistortion');
          if (u) u.value = uniformsProxy.current.distortion;
        },
      });

      // contact → colophon: vignette up then down to mask billboard edges.
      if (prev === 'contact') {
        vignetteTweenRef.current = gsap
          .timeline()
          .to(uniformsProxy.current, {
            vignette: 1,
            duration: 0.8,
            ease: 'power2.in',
            onUpdate: () => {
              const u = effect.uniforms.get('uVignette');
              if (u) u.value = uniformsProxy.current.vignette;
            },
          })
          .to(uniformsProxy.current, {
            vignette: 0,
            duration: 0.4,
            ease: 'power2.out',
            onUpdate: () => {
              const u = effect.uniforms.get('uVignette');
              if (u) u.value = uniformsProxy.current.vignette;
            },
          });
      }
    } else {
      // Leaving colophon: fade distortion out quickly.
      distortionTweenRef.current = gsap.to(uniformsProxy.current, {
        distortion: 0,
        duration: 0.4,
        ease: 'power2.out',
        onUpdate: () => {
          const u = effect.uniforms.get('uDistortion');
          if (u) u.value = uniformsProxy.current.distortion;
        },
      });

      const uVig = effect.uniforms.get('uVignette');
      if (uVig) uVig.value = 0;
      uniformsProxy.current.vignette = 0;
    }

    return () => {
      distortionTweenRef.current?.kill();
      vignetteTweenRef.current?.kill();
    };
  }, [scene, lensingEffectRef]);

  // Per-frame: project BH world position to screen, update lensing uniforms.
  useFrame(() => {
    const effect = lensingEffectRef.current;
    if (!effect) return;

    const origin = SCENE_ANCHORS.colophon.origin;
    _bhWorld.set(origin[0], origin[1], origin[2]);
    _bhWorld.project(camera);
    const bhScreenX = _bhWorld.x * 0.5 + 0.5;
    const bhScreenY = _bhWorld.y * 0.5 + 0.5;

    const uCenter = effect.uniforms.get('uBhCenter');
    if (uCenter) uCenter.value.set(bhScreenX, bhScreenY);

    // Project a point at the shadow edge to compute screen-space radius.
    const shadowRadius = config.schwarzschildRadius * 2.6;
    _edgeWorld.set(origin[0] + shadowRadius, origin[1], origin[2]);
    _edgeWorld.project(camera);
    const edgeScreenX = _edgeWorld.x * 0.5 + 0.5;
    const uRadius = effect.uniforms.get('uBhRadius');
    if (uRadius) uRadius.value = Math.abs(edgeScreenX - bhScreenX);

    const uAspect = effect.uniforms.get('uAspect');
    if (uAspect) uAspect.value = size.width / size.height;

    const uPhotonRing = effect.uniforms.get('uPhotonRing');
    if (uPhotonRing) uPhotonRing.value = config.photonRing ? 1.0 : 0.0;

    // Keep distortionStrength in sync even when tweening is not active
    // (e.g. user changes via dev console while on colophon).
    if (scene === 'colophon' && uniformsProxy.current.distortion > 0) {
      const scale = uniformsProxy.current.distortion / Math.max(config.distortionStrength, 0.001);
      if (Math.abs(scale - 1) > 0.01) {
        const uDist = effect.uniforms.get('uDistortion');
        if (uDist) uDist.value = uniformsProxy.current.distortion;
      }
    }
  });

  if (!config.visible) return null;

  const shadowRadius = config.schwarzschildRadius * 2.6;
  const [x, y, z] = SCENE_ANCHORS.colophon.origin;

  return (
    <group position={[x, y, z]} visible={colophonSceneVisible}>
      {/* Event horizon shadow — pure black sphere occludes everything behind it */}
      <mesh>
        <sphereGeometry args={[shadowRadius, 48, 32]} />
        <meshBasicMaterial color="#000000" side={THREE.FrontSide} />
      </mesh>

      {/* Accretion disk */}
      <AccretionDisk
        schwarzschildRadius={config.schwarzschildRadius}
        diskInnerFactor={config.diskInnerFactor}
        diskOuterFactor={config.diskOuterFactor}
        diskTilt={config.diskTilt}
        diskBrightness={config.diskBrightness}
        diskSaturation={config.diskSaturation}
        diskTurbulence={config.diskTurbulence}
        diskDrift={config.diskDrift}
        dopplerStrength={config.dopplerStrength}
      />
    </group>
  );
}
