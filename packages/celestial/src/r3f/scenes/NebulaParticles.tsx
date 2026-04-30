import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

import { NEBULA_VARIANTS } from './nebula-variants.js';
import type { NebulaVariant } from './nebula-variants.js';
import { decodeImageDataSync, sampleParticles } from './photo-luminance-sample.js';

// Effect B — photo-sampled particle cloud. Particles are sampled at
// runtime from the variant's photograph treated as a 2D probability
// density (bright pixels attract more particles than dark). Each
// particle's color is the linear-light RGB of its source pixel; its
// (x, y) is the photo's projection into volume-local space, and its
// z is randomized across the volume's depth so the cloud fills 3D
// space rather than a flat slice.

const VOLUME_RADIUS = 12;

const VERTEX_SHADER = /* glsl */ `
  attribute float size;
  uniform float brightness;
  uniform float saturation;
  uniform float glow;
  uniform float volumeRadius;
  uniform float pointScale;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = size * (pointScale / -mvPosition.z);

    vec3 c = color;
    float luma = dot(c, vec3(0.2126, 0.7152, 0.0722));
    c = mix(vec3(luma), c, saturation);
    c *= brightness;
    c += c * glow * smoothstep(0.4, 1.0, luma);

    // Radial alpha falloff in volume-local space. Particles at the
    // far edge of the volume fade smoothly so the cloud has soft
    // boundaries rather than a hard particle wall.
    float r = length(position) / volumeRadius;
    vAlpha = 1.0 - smoothstep(0.85, 1.4, r);

    vColor = c;
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    // Round splat from gl_PointCoord (built-in: square 0..1 across point).
    vec2 d = gl_PointCoord - vec2(0.5);
    float distSq = dot(d, d);
    if (distSq > 0.25) discard;
    float splatAlpha = 1.0 - smoothstep(0.0, 0.25, distSq);

    gl_FragColor = vec4(vColor * vAlpha * splatAlpha, vAlpha * splatAlpha);
  }
`;

interface NebulaParticlesProps {
  readonly photo: THREE.Texture;
  readonly variant: NebulaVariant;
  readonly count: number;
  readonly size: number;
  readonly jitter: number;
  readonly brightness: number;
  readonly saturation: number;
  readonly glow: number;
  readonly drift: boolean;
}

export function NebulaParticles({
  photo,
  variant,
  count,
  size,
  jitter,
  brightness,
  saturation,
  glow,
  drift,
}: NebulaParticlesProps) {
  const groupRef = useRef<THREE.Group>(null);
  const params = NEBULA_VARIANTS[variant];

  const buffers = useMemo(() => {
    const image = photo.image as HTMLImageElement | undefined;
    if (!image) return null;
    const cacheKey = params.photoUrl1k; // share cache regardless of which res the texture is
    const imageData = decodeImageDataSync(image, cacheKey);
    if (!imageData) return null;
    return sampleParticles(imageData, {
      count: Math.max(1, Math.round(count)),
      volumeRadius: VOLUME_RADIUS,
      jitterZ: jitter,
      baseSize: size,
      seed: 1,
    });
  }, [photo, params.photoUrl1k, count, size, jitter]);

  useFrame((_, delta) => {
    if (drift && groupRef.current) {
      groupRef.current.rotation.y += delta * 0.03;
    }
  });

  if (!buffers) return null;

  const totalBrightness = brightness * params.particleBaseBrightness;
  const totalSaturation = saturation * params.particleBaseSaturation;
  const totalGlow = glow * params.particleBaseGlow;

  return (
    <group ref={groupRef}>
      <points frustumCulled={false}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            args={[buffers.positions, 3]}
            count={buffers.positions.length / 3}
            array={buffers.positions}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-color"
            args={[buffers.colors, 3]}
            count={buffers.colors.length / 3}
            array={buffers.colors}
            itemSize={3}
          />
          <bufferAttribute
            attach="attributes-size"
            args={[buffers.sizes, 1]}
            count={buffers.sizes.length}
            array={buffers.sizes}
            itemSize={1}
          />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          vertexColors
          uniforms={{
            brightness: { value: totalBrightness },
            saturation: { value: totalSaturation },
            glow: { value: totalGlow },
            volumeRadius: { value: VOLUME_RADIUS },
            // Scales gl_PointSize roughly to half the canvas height in
            // pixels (matches PointsMaterial's sizeAttenuation behavior).
            pointScale: { value: 300 },
          }}
        />
      </points>
    </group>
  );
}
