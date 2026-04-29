// Gas-giant base auto-rotation rate (rad/sec). Module-level mutable so the
// ProjectsScene `useFrame` callback reads it every frame without React
// re-renders and the dev console (window.portfolio.gasGiant.rotationSpeed)
// can write it. Mirrors earth-rotation-rate.ts.
//
// Per-band differential offsets stack on top of this base rate inside the
// gas-giant fragment shader (see shaders/gas-giant.glsl.ts) — adjusting
// this number scales the entire zonal-flow pattern uniformly.
//
// Default is slightly slower than earth's 0.025 — Jupiter's rotation reads
// faster in real time but at session timescale we want it to feel calmer
// and less frenetic than the earth scene's (already accelerated) spin.

import { SCENE_DEFAULTS } from './scene-defaults.js';

export const DEFAULT_GAS_GIANT_ROTATION_RATE = SCENE_DEFAULTS.projects.gasGiantRotationRate;

const STORAGE_KEY = 'portfolio:gas-giant-rotation-rate';

let current: number | null = null;

function readStored(): number {
  if (typeof window === 'undefined') return DEFAULT_GAS_GIANT_ROTATION_RATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_GAS_GIANT_ROTATION_RATE;
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n)) return n;
  } catch {
    // localStorage disabled (private mode etc.) — fall through.
  }
  return DEFAULT_GAS_GIANT_ROTATION_RATE;
}

export function getGasGiantRotationRate(): number {
  if (current === null) current = readStored();
  return current;
}

export function setGasGiantRotationRate(rate: number): void {
  current = rate;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(rate));
  } catch {
    // best-effort persistence; runtime value still updates
  }
}
