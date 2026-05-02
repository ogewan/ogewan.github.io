import * as THREE from 'three';

// Shared star-buffer generator. Used by both SharedStarField (the global
// camera-following skybox) and StarfieldCubemap (the BH-centered offscreen
// scene captured into a cubemap for the lensing shader). Both call sites use
// the same seed so the cubemap stars match the global stars positionally —
// when the lensing shader samples the cubemap by deflected world-direction,
// the deflected stars line up with the un-lensed stars in the rest of the
// frame.
//
// LCG-based deterministic generation. Same seed in → same buffers out, no
// matter how many times the module loads.

export const STARFIELD_RADIUS = 400;
export const STAR_SEED = 0xc01dfa11;

export const STAR_COLORS_HEX = [
  '#ebe9f5', // 0.95 0.02 280
  '#bbe6f1', // 0.88 0.04 210
  '#dde5f1', // 0.92 0.03 290
  '#a8d8e8', // 0.85 0.04 200
  '#f0eef7', // 0.96 0.02 280
  '#aab1cc', // 0.80 0.05 290
] as const;

export interface StarBuffers {
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  readonly sizes: Float32Array;
  readonly count: number;
}

export function buildStarBuffers(count: number, radius: number, seed: number): StarBuffers {
  let s = seed >>> 0;
  const rand = () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const palette = STAR_COLORS_HEX.map((h) => new THREE.Color(h));
  for (let i = 0; i < count; i++) {
    const u = rand();
    const v = rand();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    const r = radius * (0.7 + 0.3 * rand());
    positions[i * 3 + 0] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = r * Math.cos(phi);
    const color = palette[Math.floor(rand() * palette.length)] ?? palette[0]!;
    colors[i * 3 + 0] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
    sizes[i] = 0.8 + rand() * 1.6;
  }
  return { positions, colors, sizes, count };
}
