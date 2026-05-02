import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

// Renders the accretion disk into a polar-parameterized offscreen texture
// (u = φ/2π, v = (r − rIn)/(rOut − rIn)). The geodesic-raytrace lensing
// shader samples this texture for both primary and secondary disk-plane
// crossings — sampling by analytic (r, φ) means the same texture serves both
// images without needing a separate render pass per crossing.
//
// This is the stage-1 bridge; stage 2 ports `sampleDisk` directly into the
// lensing fragment shader and removes this RT pass entirely.
//
// Re-renders every frame (turbulence advection + Keplerian phase + Doppler
// asymmetry are all time-driven). RT size is tuned for visual quality at the
// shadow edge: 1024 in φ avoids visible discretization in the disk's azimuthal
// gradient; 256 in r is plenty for the temperature gradient + edge fades.
//
// Render path. We keep a private THREE.Scene with a fullscreen orthographic
// quad and render it once per frame into our owned WebGLRenderTarget. The
// main canvas's render call is unaffected — useFrame's priority=-1 ensures we
// run before R3F's own render dispatch.

const RT_WIDTH = 1024;
const RT_HEIGHT = 256;
const TWO_PI = 6.28318530718;

const VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAG = /* glsl */ `
uniform float uTime;
uniform float uRotation;
uniform float uInnerR;
uniform float uOuterR;
uniform float uBrightness;
uniform float uSaturation;
uniform float uTurbulence;
uniform float uDopplerStrength;

varying vec2 vUv;

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p  = p * 2.1 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

vec3 diskColor(float t) {
  vec3 inner = vec3(0.71, 0.85, 1.0);
  vec3 mid   = vec3(1.0,  0.70, 0.35);
  vec3 outer = vec3(0.85, 0.22, 0.06);
  if (t < 0.5) return mix(inner, mid, t * 2.0);
  return mix(mid, outer, (t - 0.5) * 2.0);
}

void main() {
  // u = φ/2π, v = (r - rIn) / (rOut - rIn). Texture wraps in u (azimuthal
  // periodicity); v is non-wrapping (clamped to disk extent).
  float theta = vUv.x * ${TWO_PI};
  float r = mix(uInnerR, uOuterR, vUv.y);

  // Keplerian shear: inner orbits faster (phase ∝ 1/√r).
  float keplerPhase = uRotation / sqrt(max(r / uInnerR, 0.001));
  float thetaShifted = theta - keplerPhase;
  float tR = vUv.y;

  // Sharp inner / outer edge fade. v ∈ [0,1], identical to AccretionDisk's tR.
  float edgeFade = smoothstep(0.0, 0.04, tR) * smoothstep(1.0, 0.92, tR);

  // FBm turbulence — radial + azimuthal drift. The original AccretionDisk
  // mesh used 0.04 / 0.02 multipliers; the lensed view samples the disk at
  // each pixel's geodesic-determined (φ, r), so noticeable per-frame drift
  // requires a higher rate than the unlensed mesh did.
  vec2 noiseUv = vec2(r * 3.0 + uTime * 0.30, thetaShifted * 0.5 + uTime * 0.15);
  float turb = fbm(noiseUv);
  float density = mix(1.0, turb, uTurbulence);
  density = pow(density, 1.5);

  vec3 col = diskColor(tR);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, uSaturation);

  float doppler = 1.0 + uDopplerStrength * (-cos(thetaShifted));
  float radialFade = 1.0 - tR * 0.6;

  float alpha = edgeFade * density * radialFade;
  col *= uBrightness * doppler;

  gl_FragColor = vec4(col, alpha);
}
`;

interface DiskRenderTargetProps {
  readonly schwarzschildRadius: number;
  readonly diskInnerFactor: number;
  readonly diskOuterFactor: number;
  readonly diskBrightness: number;
  readonly diskSaturation: number;
  readonly diskTurbulence: number;
  readonly diskDrift: boolean;
  readonly diskRotationSpeed: number;
  readonly dopplerStrength: number;
  /** Called once when the RT texture is first available. The same texture
   *  reference stays valid for the lifetime of this component. */
  readonly onReady: (texture: THREE.Texture) => void;
}

export function DiskRenderTarget({
  schwarzschildRadius,
  diskInnerFactor,
  diskOuterFactor,
  diskBrightness,
  diskSaturation,
  diskTurbulence,
  diskDrift,
  diskRotationSpeed,
  dopplerStrength,
  onReady,
}: DiskRenderTargetProps) {
  const renderer = useThree((s) => s.gl);
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  const { rt, scene, camera, uniforms } = useMemo(() => {
    const target = new THREE.WebGLRenderTarget(RT_WIDTH, RT_HEIGHT, {
      generateMipmaps: false,
      magFilter: THREE.LinearFilter,
      minFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
      // Wrap horizontally (φ axis) so the lensing shader can sample at the
      // 0/1 seam without a discontinuity. Vertical clamps (radial direction
      // is not periodic).
      wrapS: THREE.RepeatWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    });
    target.texture.wrapS = THREE.RepeatWrapping;
    target.texture.wrapT = THREE.ClampToEdgeWrapping;

    const u = {
      uTime: { value: 0 },
      uRotation: { value: 0 },
      uInnerR: { value: schwarzschildRadius * diskInnerFactor },
      uOuterR: { value: schwarzschildRadius * diskOuterFactor },
      uBrightness: { value: diskBrightness },
      uSaturation: { value: diskSaturation },
      uTurbulence: { value: diskTurbulence },
      uDopplerStrength: { value: dopplerStrength },
    };
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: u,
      depthTest: false,
      depthWrite: false,
    });
    const geom = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geom, mat);

    const offscreen = new THREE.Scene();
    offscreen.add(mesh);

    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    return { rt: target, scene: offscreen, camera: cam, uniforms: u };
    // Intentionally empty deps — initial uniform values are set from current
    // props at mount; subsequent prop changes are synced inside useFrame.
  }, []);

  useEffect(() => {
    onReadyRef.current(rt.texture);
  }, [rt]);

  useEffect(() => {
    return () => {
      rt.dispose();
    };
  }, [rt]);

  // Render before R3F's main pass each frame; priority=-1 runs first.
  useFrame((_, delta) => {
    if (diskDrift) uniforms.uTime.value += delta;
    uniforms.uRotation.value += delta * diskRotationSpeed;
    uniforms.uInnerR.value = schwarzschildRadius * diskInnerFactor;
    uniforms.uOuterR.value = schwarzschildRadius * diskOuterFactor;
    uniforms.uBrightness.value = diskBrightness;
    uniforms.uSaturation.value = diskSaturation;
    uniforms.uTurbulence.value = diskTurbulence;
    uniforms.uDopplerStrength.value = dopplerStrength;

    const prevTarget = renderer.getRenderTarget();
    renderer.setRenderTarget(rt);
    renderer.render(scene, camera);
    renderer.setRenderTarget(prevTarget);
  }, -1);

  return null;
}
