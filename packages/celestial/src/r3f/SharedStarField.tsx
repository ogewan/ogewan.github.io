import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useMobileSettings } from './MobileSettings.js';

// Persistent starfield rendered behind every scene on the tour line. Uses a
// single Points geometry with instanced positions so the cost is one draw
// call regardless of count. Stars sit on a sphere of radius STARFIELD_RADIUS
// centered on the origin; the tour line runs through the inside of that
// sphere so stars surround the camera throughout.
//
// Color palette mirrors the Phase 3 CSS placeholder palette: cool whites
// shading toward cyan and violet. Sizes vary slightly so the field has depth.

const STARFIELD_RADIUS = 400;
const DESKTOP_COUNT = 2000;
const MOBILE_COUNT = 800;

// Phase-3 placeholder Stars layer used six dot colors; the same OKLCH values
// converted to linear-RGB approximations for Three's color management.
// Using THREE.Color with the OKLCH equivalent string isn't supported, so we
// pre-bake the palette as sRGB hex.
const STAR_COLORS = [
  new THREE.Color('#ebe9f5'), // 0.95 0.02 280
  new THREE.Color('#bbe6f1'), // 0.88 0.04 210
  new THREE.Color('#dde5f1'), // 0.92 0.03 290
  new THREE.Color('#a8d8e8'), // 0.85 0.04 200
  new THREE.Color('#f0eef7'), // 0.96 0.02 280
  new THREE.Color('#aab1cc'), // 0.80 0.05 290
];

interface StarBufferData {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
}

function buildStars(count: number): StarBufferData {
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  // Deterministic-ish PRNG so the field is stable across renders within a
  // session (no per-frame mutation; this only runs at mount). Math.random is
  // fine — re-rolls between sessions are imperceptible and welcome.
  for (let i = 0; i < count; i++) {
    // Uniform sphere sampling: pick a random point on a sphere of radius R.
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = STARFIELD_RADIUS * (0.7 + 0.3 * Math.random()); // jitter inward
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);

    const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)] ?? STAR_COLORS[0]!;
    colors[i * 3 + 0] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    sizes[i] = 0.8 + Math.random() * 1.6;
  }
  return { positions, colors, sizes };
}

export function SharedStarField() {
  const settings = useMobileSettings();
  const count = settings.isMobile ? MOBILE_COUNT : DESKTOP_COUNT;
  const data = useMemo(() => buildStars(count), [count]);
  const ref = useRef<THREE.Points>(null);

  return (
    <points ref={ref} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[data.positions, 3]}
          count={count}
          array={data.positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[data.colors, 3]}
          count={count}
          array={data.colors}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-size"
          args={[data.sizes, 1]}
          count={count}
          array={data.sizes}
          itemSize={1}
        />
      </bufferGeometry>
      <pointsMaterial
        vertexColors
        size={1.2}
        sizeAttenuation
        transparent
        opacity={0.9}
        depthWrite={false}
      />
    </points>
  );
}
