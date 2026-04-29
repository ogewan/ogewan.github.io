// Projects-scene rotation rates. Three independent rate variables, all
// module-level mutable so ProjectsScene's `useFrame` reads them every
// frame without React re-renders and the dev console writes them.
// Defaults come from scene-defaults.ts — change them there.
//
//   - rings (K)        — Keplerian constant: ω_particle = K / sqrt(r)
//                         baked into each particle's orbit factor.
//   - scene (rad/s)    — angular velocity of the whole projects group
//                         around its local Y axis.
//   - body  (rad/s)    — angular velocity of the gas-giant body group
//                         around its local Y. Set to the negative of
//                         `scene` to keep the body visually static
//                         while the ring system spins.
//
// All three persist to localStorage independently. Negative values
// reverse direction; zero halts. No clamping — callers are trusted.

import { SCENE_DEFAULTS } from './scene-defaults.js';

export const DEFAULT_PROJECTS_RINGS_ROTATION_RATE = SCENE_DEFAULTS.projects.ringsRotationSpeed;
export const DEFAULT_PROJECTS_SCENE_ROTATION_RATE = SCENE_DEFAULTS.projects.sceneRotationSpeed;
export const DEFAULT_PROJECTS_BODY_ROTATION_RATE = SCENE_DEFAULTS.projects.bodyRotationSpeed;

const RINGS_STORAGE_KEY = 'portfolio:rings-rotation-rate';
const SCENE_STORAGE_KEY = 'portfolio:scene-rotation-rate';
const BODY_STORAGE_KEY = 'portfolio:body-rotation-rate';

let currentRings: number | null = null;
let currentScene: number | null = null;
let currentBody: number | null = null;

function readStoredRate(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n)) return n;
  } catch {
    // localStorage disabled (private mode etc.) — fall through.
  }
  return fallback;
}

function writeStoredRate(key: string, rate: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, String(rate));
  } catch {
    // best-effort persistence; runtime value still updates
  }
}

export function getProjectsRingsRotationRate(): number {
  if (currentRings === null)
    currentRings = readStoredRate(RINGS_STORAGE_KEY, DEFAULT_PROJECTS_RINGS_ROTATION_RATE);
  return currentRings;
}

export function setProjectsRingsRotationRate(rate: number): void {
  currentRings = rate;
  writeStoredRate(RINGS_STORAGE_KEY, rate);
}

export function getProjectsSceneRotationRate(): number {
  if (currentScene === null)
    currentScene = readStoredRate(SCENE_STORAGE_KEY, DEFAULT_PROJECTS_SCENE_ROTATION_RATE);
  return currentScene;
}

export function setProjectsSceneRotationRate(rate: number): void {
  currentScene = rate;
  writeStoredRate(SCENE_STORAGE_KEY, rate);
}

export function getProjectsBodyRotationRate(): number {
  if (currentBody === null)
    currentBody = readStoredRate(BODY_STORAGE_KEY, DEFAULT_PROJECTS_BODY_ROTATION_RATE);
  return currentBody;
}

export function setProjectsBodyRotationRate(rate: number): void {
  currentBody = rate;
  writeStoredRate(BODY_STORAGE_KEY, rate);
}
