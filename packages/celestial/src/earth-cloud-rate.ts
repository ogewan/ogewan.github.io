// Cloud-layer drift rate (rad/sec). Module-level mutable so the EarthScene
// `useFrame` callback can read it every frame without React re-renders, and
// the dev console (window.portfolio.earth.cloudSpeed) can write it.
//
// Persisted to localStorage so a "set it and reload" workflow holds.

import { SCENE_DEFAULTS } from './scene-defaults.js';

export const DEFAULT_CLOUD_DRIFT_RATE = SCENE_DEFAULTS.earth.cloudDriftRate;

const STORAGE_KEY = 'portfolio:earth-cloud-rate';

let current: number | null = null;

function readStored(): number {
  if (typeof window === 'undefined') return DEFAULT_CLOUD_DRIFT_RATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_CLOUD_DRIFT_RATE;
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n)) return n;
  } catch {
    // localStorage disabled (private mode etc.) — fall through.
  }
  return DEFAULT_CLOUD_DRIFT_RATE;
}

export function getCloudDriftRate(): number {
  if (current === null) current = readStored();
  return current;
}

export function setCloudDriftRate(rate: number): void {
  current = rate;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(rate));
  } catch {
    // best-effort persistence; runtime value still updates
  }
}
