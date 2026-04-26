import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import type { SceneName } from '../scenes.js';
import { SCENE_ANCHORS } from './scene-anchors.js';

// Camera fly-through driver. Reads the active scene name and tweens the
// Three.js camera between scene anchors via a single gsap timeline.
//
// Duration is read from the design token --dur-route at the start of every
// transition so reduced-motion users get a 1ms snap (the token collapses
// under prefers-reduced-motion).
//
// On first paint, the camera jumps to the active scene's anchor without
// animation — there's no "fly in from infinity" intro.

interface CameraDriverProps {
  scene: SceneName;
}

function readRouteDurationMs(): number {
  if (typeof window === 'undefined') return 1200;
  const raw = getComputedStyle(document.documentElement).getPropertyValue('--dur-route').trim();
  // Tokens are written with explicit `ms` suffix (e.g. "1200ms" or "1ms").
  const match = raw.match(/^(\d+(?:\.\d+)?)ms$/);
  if (!match) return 1200;
  return parseFloat(match[1] ?? '1200');
}

export function CameraDriver({ scene }: CameraDriverProps) {
  const camera = useThree((s) => s.camera);
  // The look-at target is animated separately from camera.position, so we
  // hold a Vector3 that the timeline interpolates and then call camera.lookAt
  // each tick. R3F doesn't expose a `target` property on the perspective
  // camera by default; this is the standard imperative dance.
  const lookAtRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const firstRender = useRef(true);

  useEffect(() => {
    const anchor = SCENE_ANCHORS[scene];
    const targetPos = new THREE.Vector3(...anchor.cameraPosition);
    const targetLookAt = new THREE.Vector3(...anchor.lookAt);

    if (firstRender.current) {
      firstRender.current = false;
      camera.position.copy(targetPos);
      lookAtRef.current.copy(targetLookAt);
      camera.lookAt(lookAtRef.current);
      return;
    }

    // Kill any in-flight tween before starting the next one.
    tweenRef.current?.kill();

    const duration = readRouteDurationMs() / 1000;
    const proxy = {
      px: camera.position.x,
      py: camera.position.y,
      pz: camera.position.z,
      lx: lookAtRef.current.x,
      ly: lookAtRef.current.y,
      lz: lookAtRef.current.z,
    };
    tweenRef.current = gsap.to(proxy, {
      px: targetPos.x,
      py: targetPos.y,
      pz: targetPos.z,
      lx: targetLookAt.x,
      ly: targetLookAt.y,
      lz: targetLookAt.z,
      duration,
      ease: 'power2.inOut',
      onUpdate: () => {
        camera.position.set(proxy.px, proxy.py, proxy.pz);
        lookAtRef.current.set(proxy.lx, proxy.ly, proxy.lz);
        camera.lookAt(lookAtRef.current);
      },
    });

    return () => {
      tweenRef.current?.kill();
      tweenRef.current = null;
    };
  }, [scene, camera]);

  return null;
}
