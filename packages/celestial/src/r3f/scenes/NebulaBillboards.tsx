import { useMemo, useRef } from 'react';
import { Billboard } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { NEBULA_VARIANTS } from './nebula-variants.js';
import type { NebulaVariant } from './nebula-variants.js';

// Effect A — layered billboards. Stack of camera-facing photo planes
// distributed along the volume's local Z axis. Each layer renders the
// active variant's nebula photograph with additive blending; the layer
// stack at slightly different Z values produces a parallax sweep as the
// camera moves through the volume during the pull-back. drei's
// <Billboard> rotates each layer to face the camera every frame, so
// edges never become visible from oblique angles.
//
// A custom shaderMaterial handles brightness / saturation / glow tint
// multipliers (stock meshBasicMaterial only carries `color`/brightness).
// The radial mask in the fragment ensures even when the camera is
// near-tangent to a layer the quad's outer edge feathers to zero
// instead of snapping off.

const VOLUME_RADIUS = 12;

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D photo;
  uniform float brightness;
  uniform float saturation;
  uniform float glow;
  uniform float layerAlpha;
  uniform float featherStart;
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(photo, vUv);
    vec3 color = tex.rgb;

    // Saturation: mix toward grayscale luminance.
    float luma = dot(color, vec3(0.2126, 0.7152, 0.0722));
    color = mix(vec3(luma), color, saturation);

    // Brightness scalar.
    color *= brightness;

    // Glow: boost highlights (luma-weighted).
    color += color * glow * smoothstep(0.4, 1.0, luma);

    // Radial alpha feather from center to edge. featherStart is the
    // normalized radius (0..0.707 for a square uv) where fade begins.
    float r = distance(vUv, vec2(0.5));
    float radialMask = 1.0 - smoothstep(featherStart, 0.5, r);

    float a = tex.a * radialMask * layerAlpha;
    gl_FragColor = vec4(color * a, a);
  }
`;

interface NebulaBillboardsProps {
  readonly photo: THREE.Texture;
  readonly variant: NebulaVariant;
  readonly layerCount: number;
  readonly jitter: number;
  readonly scale: number;
  readonly brightness: number;
  readonly saturation: number;
  readonly glow: number;
  readonly drift: boolean;
}

export function NebulaBillboards({
  photo,
  variant,
  layerCount,
  jitter,
  scale,
  brightness,
  saturation,
  glow,
  drift,
}: NebulaBillboardsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const params = NEBULA_VARIANTS[variant];

  const planeSize = VOLUME_RADIUS * 2 * scale;
  const layers = Math.max(1, Math.round(layerCount));

  const layerSpecs = useMemo(() => {
    const result: { z: number; alpha: number }[] = [];
    for (let i = 0; i < layers; i++) {
      // Position layers symmetrically around z=0 in the volume's local
      // frame. Single-layer case: sit at center.
      const t = layers === 1 ? 0 : i / (layers - 1) - 0.5;
      result.push({
        z: t * 2 * jitter,
        alpha: 1 / layers,
      });
    }
    return result;
  }, [layers, jitter]);

  useFrame((_, delta) => {
    if (drift && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.05;
    }
  });

  const totalBrightness = brightness * params.billboardBaseBrightness;
  const totalSaturation = saturation * params.billboardBaseSaturation;
  const totalGlow = glow * params.billboardBaseGlow;

  return (
    <group ref={groupRef}>
      {layerSpecs.map((spec, i) => (
        <Billboard key={i} position={[0, 0, spec.z]}>
          <mesh>
            <planeGeometry args={[planeSize, planeSize]} />
            <shaderMaterial
              vertexShader={VERTEX_SHADER}
              fragmentShader={FRAGMENT_SHADER}
              transparent
              depthWrite={false}
              blending={THREE.AdditiveBlending}
              uniforms={{
                photo: { value: photo },
                brightness: { value: totalBrightness },
                saturation: { value: totalSaturation },
                glow: { value: totalGlow },
                layerAlpha: { value: spec.alpha },
                featherStart: { value: 0.32 },
              }}
            />
          </mesh>
        </Billboard>
      ))}
    </group>
  );
}
