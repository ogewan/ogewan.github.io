import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import type { SceneName } from '../../scenes.js';
import { SCENE_ANCHORS } from '../scene-anchors.js';
import { useBlackHoleConfig } from '../../BlackHoleConfigContext.js';
import { useMobileSettings } from '../MobileSettings.js';
import { AccretionDisk } from './AccretionDisk.js';
import { CAMERA_TWEEN_DURATION_SEC } from '../CameraDriver.js';
import type { GravitationalLensingEffectImpl } from './GravitationalLensingEffect.js';
import type { LegacyGravitationalLensingEffectImpl } from './GravitationalLensingEffect.legacy.js';

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
// EffectComposer is conditionally mounted by Canvas3D (only when this scene
// is active or transitioning). Because the ref is populated 1–2 R3F frames
// after mount, tween startup is deferred to useFrame via tweenPendingRef so
// it fires on the first frame the effect ref is non-null — the 16 ms delay
// is invisible within the 2-second camera tween.
//
// Transition — contact → colophon:
//   uVignette ramps 0→1 over 800ms (masking nebula billboard edges as the
//   camera zooms out), then falls back 1→0 over 400ms as the BH fills frame.
//   The distortion ramps in over CAMERA_TWEEN_DURATION_SEC via GSAP.

interface ColophonSceneProps {
  readonly scene: SceneName;
  readonly previousScene: SceneName | null;
  readonly lensingEffectRef: React.RefObject<
    GravitationalLensingEffectImpl | LegacyGravitationalLensingEffectImpl | null
  >;
}

type TweenPending = { kind: 'enter'; prev: SceneName } | { kind: 'exit' } | null;

// Reusable scratch objects — avoids per-frame allocation.
const _bhWorld = new THREE.Vector3();
const _edgeWorld = new THREE.Vector3();
const _viewProj = new THREE.Matrix4();
const _invViewProj = new THREE.Matrix4();
const _diskNormal = new THREE.Vector3();
const _diskRefDir = new THREE.Vector3(1, 0, 0);

export function ColophonScene({ scene, previousScene, lensingEffectRef }: ColophonSceneProps) {
  const config = useBlackHoleConfig();
  const { degraded } = useMobileSettings();
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const colophonSceneVisible = scene === 'colophon' || previousScene === 'colophon';

  const distortionTweenRef = useRef<gsap.core.Tween | null>(null);
  const vignetteTweenRef = useRef<gsap.core.Tween | gsap.core.Timeline | null>(null);
  const prevSceneRef = useRef<SceneName>(scene);
  // vignette starts at 1 to match the Effect constructor's uVignette=1.0 —
  // both agree on "full black" for the first mount frame.
  const uniformsProxy = useRef({ distortion: 0, vignette: 1 });

  // Deferred tween start: useEffect records intent; useFrame executes once
  // lensingEffectRef.current is non-null (EffectComposer mounts 1–2 frames
  // after Canvas3D's conditional renders it).
  const tweenPendingRef = useRef<TweenPending>(null);

  useEffect(() => {
    const prev = prevSceneRef.current;
    prevSceneRef.current = scene;

    distortionTweenRef.current?.kill();
    vignetteTweenRef.current?.kill();

    if (scene === 'colophon') {
      tweenPendingRef.current = { kind: 'enter', prev };
    } else {
      tweenPendingRef.current = { kind: 'exit' };
    }
  }, [scene]);

  // Per-frame: drain pending tween once effect ref is available, then update
  // lensing uniforms from BH world position every frame.
  useFrame(() => {
    const effect = lensingEffectRef.current;

    // --- Drain pending tween ---
    if (tweenPendingRef.current && effect) {
      const pending = tweenPendingRef.current;
      tweenPendingRef.current = null;

      if (pending.kind === 'enter') {
        distortionTweenRef.current = gsap.to(uniformsProxy.current, {
          distortion: config.distortionStrength,
          duration: CAMERA_TWEEN_DURATION_SEC,
          ease: 'power2.in',
          onUpdate: () => {
            const u = effect.uniforms.get('uDistortion');
            if (u) u.value = uniformsProxy.current.distortion;
          },
        });

        // Ensure uniform matches proxy before tween starts — defensive sync
        // in case Effect re-used from a prior colophon visit (uVignette may
        // have been left at 0 by the exit cleanup).
        uniformsProxy.current.vignette = 1;
        const uVigNow = effect.uniforms.get('uVignette');
        if (uVigNow) uVigNow.value = 1;

        // Reveal from black → 0 over 1.2 s. The 0→1 fade-in is replaced by
        // the guaranteed uVignette=1.0 on first mount frame (Effect constructor
        // + proxy init), so we only need the reveal half of the tween.
        vignetteTweenRef.current = gsap.to(uniformsProxy.current, {
          vignette: 0,
          duration: 1.2,
          ease: 'power2.out',
          onUpdate: () => {
            const u = effect.uniforms.get('uVignette');
            if (u) u.value = uniformsProxy.current.vignette;
          },
        });
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
    }

    // Apply the runtime cameraElevation knob once the route tween has
    // settled (previousScene === null is the post-tween signal — Canvas3D
    // clears it after CAMERA_TWEEN_DURATION_SEC). Skipping during the tween
    // avoids fighting CameraDriver's gsap interpolation.
    if (scene === 'colophon' && previousScene === null) {
      camera.position.y = config.cameraElevation;
      camera.lookAt(0, 0, SCENE_ANCHORS.colophon.origin[2]);
    }

    // --- Per-frame uniform sync ---
    if (!effect) return;

    const origin = SCENE_ANCHORS.colophon.origin;
    _bhWorld.set(origin[0], origin[1], origin[2]);
    _bhWorld.project(camera);
    const bhScreenX = _bhWorld.x * 0.5 + 0.5;
    const bhScreenY = _bhWorld.y * 0.5 + 0.5;

    const uCenter = effect.uniforms.get('uBhScreenCenter');
    if (uCenter) uCenter.value.set(bhScreenX, bhScreenY);

    // Project a point at the shadow edge to compute screen-space radius.
    const shadowRadius = config.schwarzschildRadius * 2.6;
    _edgeWorld.set(origin[0] + shadowRadius, origin[1], origin[2]);
    _edgeWorld.project(camera);
    const edgeScreenX = _edgeWorld.x * 0.5 + 0.5;
    const uRadius = effect.uniforms.get('uBhScreenRadius');
    if (uRadius) uRadius.value = Math.abs(edgeScreenX - bhScreenX);

    const uAspect = effect.uniforms.get('uAspect');
    if (uAspect) uAspect.value = size.width / size.height;

    const uPhotonRing = effect.uniforms.get('uPhotonRing');
    if (uPhotonRing) uPhotonRing.value = config.photonRing ? 1.0 : 0.0;

    // World-space uniforms for the geodesic raytrace path. The legacy effect
    // ignores these — uniform.get returns undefined on the uniforms it doesn't
    // declare and we no-op gracefully.
    const uBhWorld = effect.uniforms.get('uBhWorld');
    if (uBhWorld) uBhWorld.value.set(origin[0], origin[1], origin[2]);

    const uCamPos = effect.uniforms.get('uCamPos');
    if (uCamPos) uCamPos.value.copy(camera.position);

    const uInvVP = effect.uniforms.get('uInvViewProj');
    if (uInvVP) {
      _viewProj.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      _invViewProj.copy(_viewProj).invert();
      uInvVP.value.copy(_invViewProj);
    }

    // Disk normal in BH-local frame. AccretionDisk applies group rotation
    // [π/2 + tiltRad, 0, 0] to a default-normal-+Z RingGeometry. Apply the
    // same rotation to (0, 0, 1):
    //   normal_y = -sin(π/2 + tilt) = -cos(tilt)
    //   normal_z =  cos(π/2 + tilt) = -sin(tilt)
    const tiltRad = (config.diskTilt * Math.PI) / 180;
    _diskNormal.set(0, -Math.cos(tiltRad), -Math.sin(tiltRad));
    const uDN = effect.uniforms.get('uDiskNormal');
    if (uDN) uDN.value.copy(_diskNormal);
    const uDR = effect.uniforms.get('uDiskRefDir');
    if (uDR) uDR.value.copy(_diskRefDir);

    const uRs = effect.uniforms.get('uRs');
    if (uRs) uRs.value = config.schwarzschildRadius;

    const uDIn = effect.uniforms.get('uDiskInner');
    if (uDIn) uDIn.value = config.schwarzschildRadius * config.diskInnerFactor;
    const uDOut = effect.uniforms.get('uDiskOuter');
    if (uDOut) uDOut.value = config.schwarzschildRadius * config.diskOuterFactor;

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

      {/* Accretion disk mesh — only rendered for the legacy / degraded path,
          where the screen-space lensing shader needs disk pixels in the
          framebuffer to deflect. The non-degraded geodesic path samples
          DiskRenderTarget instead, so the un-lensed mesh would just leak
          through outside the lensing bounding box and look visibly straight
          there. */}
      {degraded && (
        <AccretionDisk
          schwarzschildRadius={config.schwarzschildRadius}
          diskInnerFactor={config.diskInnerFactor}
          diskOuterFactor={config.diskOuterFactor}
          diskTilt={config.diskTilt}
          diskBrightness={config.diskBrightness}
          diskSaturation={config.diskSaturation}
          diskTurbulence={config.diskTurbulence}
          diskDrift={config.diskDrift}
          diskRotationSpeed={config.diskRotationSpeed}
          dopplerStrength={config.dopplerStrength}
          diskClock={config.diskClock}
        />
      )}
    </group>
  );
}
