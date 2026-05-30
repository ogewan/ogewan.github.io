// Global cloud-layer opacity (0..1). Module-level mutable so the EarthScene
// useFrame callback can poll it every frame without React re-renders, and the
// dev console (window.portfolio.earth.clouds.opacity) can write it.
//
// Applies to every active cloud layer uniformly. Per-layer overrides are
// intentionally out of scope; tune visibility with this single knob.
//
// Persisted to localStorage so a "set it and reload" workflow holds.

export const DEFAULT_CLOUD_OPACITY = 0.45;

const STORAGE_KEY = 'portfolio:earth-cloud-opacity';

let current: number | null = null;

function readStored(): number {
  if (typeof window === 'undefined') return DEFAULT_CLOUD_OPACITY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_CLOUD_OPACITY;
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n)) return n;
  } catch {
    // localStorage disabled (private mode etc.) — fall through.
  }
  return DEFAULT_CLOUD_OPACITY;
}

export function getCloudOpacity(): number {
  if (current === null) current = readStored();
  return current;
}

export function setCloudOpacity(value: number): void {
  current = value;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, String(value));
  } catch {
    // best-effort persistence; runtime value still updates
  }
}
