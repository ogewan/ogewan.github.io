import { useEffect, useMemo, useRef, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

import {
  getBackgroundSnapshot,
  subscribeBackgroundConfig,
} from '../../../BackgroundConfigContext.js';
import { SKYBOX_NEBULA_FRAG, SKYBOX_NEBULA_VERT } from '../../skybox-nebula-shader.js';
import { buildStarBuffers, STAR_SEED, STARFIELD_RADIUS } from '../../star-buffers.js';

// Renders a starfield + procedural nebula into a CubeRenderTarget centered at
// the black hole, so the geodesic raytracer can sample background light by
// deflected world-space direction (textureCube). The screen-space inputBuffer
// is unsuitable: rays deflected by > 90° "see" off-screen content that
// doesn't exist there.
//
// Two layers in the offscreen scene, both centered at the BH origin:
//   1. Inverted nebula sphere (same shader as the global SharedStarField
//      nebula). Brightness/saturation come from BackgroundConfigContext's
//      cubemap set — independent of the global / colophon sets.
//   2. Star points using the shared LCG seed so positions match the global
//      stars exactly. When the lensing shader samples the cubemap by
//      deflected direction, the deflected stars line up with the un-lensed
//      stars in the rest of the frame.
//
// Re-renders on cubemap-config change. The cubemap is normally captured once
// at mount and reused, but dev-console knobs that mutate the cubemap config
// trigger a tear-down + rebuild + re-render so the user sees the change live.
// Cost is ~1 ms (six face renders); rare enough not to matter.

const CUBE_FACE_SIZE = 256;
const CUBEMAP_STAR_COUNT = 2000;
const BASE_STAR_OPACITY = 0.9;

interface StarfieldCubemapProps {
  /** World position to center the cubemap on (typically the BH origin). */
  readonly center: readonly [number, number, number];
  /** Called once after the cubemap is rendered. The CubeTexture stays valid
   *  until this component unmounts — capture it in a ref, don't store across
   *  remounts. */
  readonly onReady: (texture: THREE.CubeTexture) => void;
}

export function StarfieldCubemap({ center, onReady }: StarfieldCubemapProps) {
  const renderer = useThree((s) => s.gl);

  const [bgState, setBgState] = useState(getBackgroundSnapshot);
  useEffect(() => {
    setBgState(getBackgroundSnapshot());
    return subscribeBackgroundConfig(() => setBgState(getBackgroundSnapshot()));
  }, []);
  const cubemapSet = bgState.cubemap;

  const onReadyRef = useRef(onReady);
  // Keep latest callback without retriggering the capture-once effect.
  onReadyRef.current = onReady;

  // Render target + offscreen scene + cube camera — created once per mount,
  // disposed on unmount so navigating away from /colophon releases the GPU
  // memory.
  const { cubeTarget, scene, cubeCamera } = useMemo(() => {
    const target = new THREE.WebGLCubeRenderTarget(CUBE_FACE_SIZE, {
      generateMipmaps: false,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
    const camera = new THREE.CubeCamera(0.1, 9000, target);
    const offscreenScene = new THREE.Scene();
    offscreenScene.background = new THREE.Color(0x000000);
    return { cubeTarget: target, scene: offscreenScene, cubeCamera: camera };
  }, []);

  // Re-render the cubemap whenever the cubemap config or center changes.
  // The geometry / material are torn down + rebuilt rather than mutated in
  // place — simpler and the cost is dev-console rare.
  useEffect(() => {
    // 1) Procedural nebula sphere (rendered first, behind stars).
    const nebulaGeom = new THREE.SphereGeometry(STARFIELD_RADIUS * 2, 32, 16);
    const nebulaUniforms = {
      uBrightness: { value: cubemapSet.nebulaBrightness },
      uSaturation: { value: cubemapSet.nebulaSaturation },
    };
    const nebulaMat = new THREE.ShaderMaterial({
      vertexShader: SKYBOX_NEBULA_VERT,
      fragmentShader: SKYBOX_NEBULA_FRAG,
      uniforms: nebulaUniforms,
      side: THREE.BackSide,
      depthWrite: false,
      depthTest: false,
    });
    const nebulaMesh = new THREE.Mesh(nebulaGeom, nebulaMat);
    nebulaMesh.position.set(center[0], center[1], center[2]);
    nebulaMesh.renderOrder = -1;
    scene.add(nebulaMesh);

    // 2) Stars — same buffers as the global SharedStarField (matching seed).
    const buffers = buildStarBuffers(CUBEMAP_STAR_COUNT, STARFIELD_RADIUS, STAR_SEED);
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(buffers.positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(buffers.colors, 3));
    geom.setAttribute('size', new THREE.BufferAttribute(buffers.sizes, 1));
    const mat = new THREE.PointsMaterial({
      vertexColors: true,
      size: 1.2,
      sizeAttenuation: true,
      transparent: true,
      opacity: Math.min(1.0, cubemapSet.starBrightness * BASE_STAR_OPACITY),
      depthWrite: false,
    });
    const points = new THREE.Points(geom, mat);
    points.position.set(center[0], center[1], center[2]);
    scene.add(points);

    cubeCamera.position.set(center[0], center[1], center[2]);
    cubeCamera.update(renderer, scene);

    onReadyRef.current(cubeTarget.texture);

    return () => {
      scene.remove(nebulaMesh);
      scene.remove(points);
      nebulaGeom.dispose();
      nebulaMat.dispose();
      geom.dispose();
      mat.dispose();
    };
  }, [
    renderer,
    scene,
    cubeCamera,
    cubeTarget,
    center,
    cubemapSet.nebulaBrightness,
    cubemapSet.nebulaSaturation,
    cubemapSet.starBrightness,
  ]);

  useEffect(() => {
    return () => {
      cubeTarget.dispose();
    };
  }, [cubeTarget]);

  return null;
}
