import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import gsap from 'gsap';
import type { SceneName } from '../scenes.js';
import { SCENE_ANCHORS } from './scene-anchors.js';

// Camera fly-through driver. Reads the active scene name and tweens the
// Three.js camera between scene anchors via a single gsap timeline.
//
// Duration is fixed at 1200ms (smooth zoom/fly) regardless of
// prefers-reduced-motion. The scene transition is the hero of the backdrop
// — collapsing it to a 1ms snap on OS reduced-motion was jarring (matches
// the same philosophy CelestialBackdrop applies to quality mode: a visitor
// shouldn't get a visually-crippled experience from an OS preference they
// may not have set deliberately).
//
// On first paint, the camera jumps to the active scene's anchor without
// animation — there's no "fly in from infinity" intro.

// Default route-tween cadence. Per-anchor overrides on `tweenDuration` /
// `tweenEase` (in scene-anchors.ts) win when set; otherwise the tween
// duration scales with the Euclidean distance between source/destination
// camera positions, so a long jump (projects ↔ contact, ~3757 units)
// auto-stretches to a longer tween than a short hop (about → projects,
// ~256 units). The floor is DEFAULT_TWEEN_DURATION_SEC; the cap is
// distance / DEFAULT_TWEEN_SPEED_UNITS_PER_SEC. CAMERA_TWEEN_DURATION_SEC
// is exported for Canvas3D's visibility-grace window — sized to the
// longest tween any destination might run.
export const CAMERA_TWEEN_DURATION_SEC = 2.0;
const DEFAULT_TWEEN_DURATION_SEC = 1.2;
const DEFAULT_TWEEN_EASE = 'power2.inOut';
const DEFAULT_TWEEN_SPEED_UNITS_PER_SEC = 2000;

interface CameraDriverProps {
  scene: SceneName;
}

export function CameraDriver({ scene }: CameraDriverProps) {
  const camera = useThree((s) => s.camera);
  const lookAtRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const tweenRef = useRef<gsap.core.Tween | null>(null);
  const firstRender = useRef(true);
  const prevSceneRef = useRef<SceneName | null>(null);

  useEffect(() => {
    const anchor = SCENE_ANCHORS[scene];
    const targetPos = new THREE.Vector3(...anchor.cameraPosition);
    const targetLookAt = new THREE.Vector3(...anchor.lookAt);

    if (firstRender.current) {
      firstRender.current = false;
      prevSceneRef.current = scene;
      camera.position.copy(targetPos);
      lookAtRef.current.copy(targetLookAt);
      camera.lookAt(lookAtRef.current);
      return;
    }

    // Kill any in-flight tween before starting the next one.
    tweenRef.current?.kill();

    const proxy = {
      px: camera.position.x,
      py: camera.position.y,
      pz: camera.position.z,
      lx: lookAtRef.current.x,
      ly: lookAtRef.current.y,
      lz: lookAtRef.current.z,
    };
    const distance = camera.position.distanceTo(targetPos);
    const computedDuration = Math.max(
      DEFAULT_TWEEN_DURATION_SEC,
      distance / DEFAULT_TWEEN_SPEED_UNITS_PER_SEC,
    );
    // For symmetric tweens: if the destination has no override, fall back to
    // the source anchor's values so the reverse journey matches the forward one
    // (e.g. contact → projects mirrors projects → contact at 2.0s power3.out).
    const srcAnchor = prevSceneRef.current ? SCENE_ANCHORS[prevSceneRef.current] : null;
    const duration = anchor.tweenDuration ?? srcAnchor?.tweenDuration ?? computedDuration;
    // tweenEaseReverse on the source anchor is the asymmetric reverse-direction
    // ease (e.g. power3.in when leaving contact, vs power3.out when arriving).
    const ease =
      anchor.tweenEase ?? srcAnchor?.tweenEaseReverse ?? srcAnchor?.tweenEase ?? DEFAULT_TWEEN_EASE;
    prevSceneRef.current = scene;

    tweenRef.current = gsap.to(proxy, {
      px: targetPos.x,
      py: targetPos.y,
      pz: targetPos.z,
      lx: targetLookAt.x,
      ly: targetLookAt.y,
      lz: targetLookAt.z,
      duration,
      ease,
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
