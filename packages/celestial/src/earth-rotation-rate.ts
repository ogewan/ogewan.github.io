// Earth auto-rotation rate (rad/sec). Module-level mutable so the EarthScene
// `useFrame` callback can read it every frame without React re-renders, and
// the dev console (window.portfolio.earth.rotationSpeed) can write it.
//
// Negative values reverse direction. Zero halts auto-rotation. No clamping;
// callers are trusted with whatever value they pass.
//
// Persisted to localStorage so a "set it and reload" workflow holds. Only
// affects auto-rotation; focus tweens are independent.

export const DEFAULT_EARTH_ROTATION_RATE = 0.025;

const STORAGE_KEY = 'portfolio:earth-rotation-rate';

let current: number | null = null;

function readStored(): number {
  if (typeof window === 'undefined') return DEFAULT_EARTH_ROTATION_RATE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_EARTH_ROTATION_RATE;
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n)) return n;
  } catch {
    // localStorage disabled (private mode etc.) — fall through.
  }
  return DEFAULT_EARTH_ROTATION_RATE;
}

export function getEarthRotationRate(): number {
  if (current === null) current = readStored();
  return current;
}

export function setEarthRotationRate(rate: number): void {
  current = rate;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(rate));
  } catch {
    // best-effort persistence; runtime value still updates
  }
}
