import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { buildClockMarkerTexture } from '../clock-marker-texture.js';

// Accretion disk for the black hole (Phase 9.5). A flat RingGeometry
// rendered with a custom ShaderMaterial:
//   - Radial temperature gradient: inner edge blue-white, outer edge orange-red.
//   - FBm (4-octave) turbulence advected by uTime for animated density variation.
//   - Keplerian rotation via uRotation: disk material orbits with inner
//     parts faster than outer (phase ∝ 1/√r), producing visible shear.
//   - Doppler asymmetry: clockwise spin (left side approaching) makes the left
//     side brighter by up to dopplerStrength × base brightness.
//   - diskTilt degrees from face-on (20° default) so the disk face is visible
//     and the lensed far half curves into view below the shadow.
//   - Clock overlay (diskClock): 12 sprite labels at clock positions in the
//     disk plane. Due to gravitational lensing, all 12 positions are visible
//     simultaneously even though 6 are geometrically behind the shadow sphere.

const DISK_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vPosition;
void main() {
  vUv = uv;
  vPosition = position;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const DISK_FRAG = /* glsl */ `
uniform float uTime;
uniform float uRotation;
uniform float uInnerR;
uniform float uOuterR;
uniform float uBrightness;
uniform float uSaturation;
uniform float uTurbulence;
uniform float uDopplerStrength;

varying vec2 vUv;
varying vec3 vPosition;

// --- FBm helpers ---
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

// --- Temperature gradient ---
// Inner: blue-white (10 000 K); outer: orange-red (3 000 K).
vec3 diskColor(float t) {
  // t = 0 at inner edge, 1 at outer edge.
  vec3 inner = vec3(0.71, 0.85, 1.0);  // blue-white
  vec3 mid   = vec3(1.0,  0.70, 0.35); // orange
  vec3 outer = vec3(0.85, 0.22, 0.06); // deep red
  if (t < 0.5) return mix(inner, mid, t * 2.0);
  return mix(mid, outer, (t - 0.5) * 2.0);
}

void main() {
  // Polar coords in local disk plane.
  float r     = length(vPosition.xz);

  // Keplerian rotation: phase ∝ 1/sqrt(r), so inner orbits rotate faster.
  float keplerPhase = uRotation / sqrt(max(r / uInnerR, 0.001));
  float theta = atan(vPosition.z, vPosition.x) - keplerPhase; // -PI .. PI

  // Normalized radial position [0, 1].
  float tR = clamp((r - uInnerR) / max(uOuterR - uInnerR, 0.001), 0.0, 1.0);

  // Sharp inner / outer edge falloff.
  float edgeFade  = smoothstep(0.0, 0.04, tR) * smoothstep(1.0, 0.92, tR);

  // FBm turbulence — advected slowly by time for drift animation.
  vec2 noiseUv = vec2(r * 3.0 + uTime * 0.04, theta * 0.5 + uTime * 0.02);
  float turb   = fbm(noiseUv);
  // Density: bright bands of hot material.
  float density = mix(1.0, turb, uTurbulence);
  density = pow(density, 1.5);

  // Temperature color.
  vec3 col = diskColor(tR);

  // Saturation adjustment (mix toward luminance).
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, uSaturation);

  // Doppler: clockwise spin viewed from camera (left side approaches).
  // cos(theta) peaks at theta=0 (right/receding) and troughs at PI (left/approaching).
  // We want left brighter, so negate: doppler = 1 + strength * -cos(theta).
  float doppler = 1.0 + uDopplerStrength * (-cos(theta));

  // Radial brightness falloff (inner edge hottest).
  float radialFade = 1.0 - tR * 0.6;

  float alpha = edgeFade * density * radialFade;
  col *= uBrightness * doppler;

  gl_FragColor = vec4(col, alpha);
}
`;

const CLOCK_HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] as const;

interface AccretionDiskProps {
  readonly schwarzschildRadius: number;
  readonly diskInnerFactor: number;
  readonly diskOuterFactor: number;
  readonly diskTilt: number;
  readonly diskBrightness: number;
  readonly diskSaturation: number;
  readonly diskTurbulence: number;
  readonly diskDrift: boolean;
  readonly diskRotationSpeed: number;
  readonly dopplerStrength: number;
  readonly diskClock: boolean;
}

export function AccretionDisk({
  schwarzschildRadius,
  diskInnerFactor,
  diskOuterFactor,
  diskTilt,
  diskBrightness,
  diskSaturation,
  diskTurbulence,
  diskDrift,
  diskRotationSpeed,
  dopplerStrength,
  diskClock,
}: AccretionDiskProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);

  const innerR = schwarzschildRadius * diskInnerFactor;
  const outerR = schwarzschildRadius * diskOuterFactor;

  const uniforms = useRef({
    uTime: { value: 0 },
    uRotation: { value: 0 },
    uInnerR: { value: innerR },
    uOuterR: { value: outerR },
    uBrightness: { value: diskBrightness },
    uSaturation: { value: diskSaturation },
    uTurbulence: { value: diskTurbulence },
    uDopplerStrength: { value: dopplerStrength },
  });

  // Clock marker textures — memoized, one canvas texture per hour label.
  const clockTextures = useMemo(
    () => CLOCK_HOURS.map((h) => buildClockMarkerTexture(String(h))),
    [],
  );

  // Keep uniforms in sync with props each frame (avoids recreating the material).
  useFrame((_, delta) => {
    const u = uniforms.current;
    if (diskDrift) u.uTime.value += delta;
    u.uRotation.value += delta * diskRotationSpeed;
    u.uInnerR.value = schwarzschildRadius * diskInnerFactor;
    u.uOuterR.value = schwarzschildRadius * diskOuterFactor;
    u.uBrightness.value = diskBrightness;
    u.uSaturation.value = diskSaturation;
    u.uTurbulence.value = diskTurbulence;
    u.uDopplerStrength.value = dopplerStrength;
    if (matRef.current) matRef.current.needsUpdate = false;
  });

  // diskTilt: 0 = face-on, 90 = edge-on. Applied as X-rotation after
  // the base 90° lay-flat rotation. Both rotations on the same group.
  const tiltRad = (diskTilt * Math.PI) / 180;
  const clockRadius = (innerR + outerR) * 0.5;
  const clockScale = schwarzschildRadius * 0.55;

  return (
    <group rotation={[Math.PI / 2 + tiltRad, 0, 0]}>
      <mesh>
        <ringGeometry args={[innerR, outerR, 192, 64]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={DISK_VERT}
          fragmentShader={DISK_FRAG}
          uniforms={uniforms.current}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* 12-hour clock labels in the disk plane — dev diagnostic.
          Sprites always face the camera. Positions are in the group's
          local XY plane (before the group rotation): 12 at (0,r,0) maps
          to the far side of the disk in world space; 6 at (0,-r,0) maps
          to the near side. Lensing bends the far-side labels into view. */}
      {diskClock &&
        CLOCK_HOURS.map((h, i) => {
          const theta = (i / 12) * Math.PI * 2;
          const x = Math.sin(theta) * clockRadius;
          const y = Math.cos(theta) * clockRadius;
          return (
            <sprite key={h} position={[x, y, 0]} scale={[clockScale, clockScale, clockScale]}>
              <spriteMaterial
                map={clockTextures[i] ?? null}
                transparent
                alphaTest={0.01}
                depthWrite={false}
              />
            </sprite>
          );
        })}
    </group>
  );
}
