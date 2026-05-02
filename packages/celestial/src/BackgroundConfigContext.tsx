import { useCallback, useSyncExternalStore, type ReactNode } from 'react';

import { SCENE_DEFAULTS } from './scene-defaults.js';

// Background-sky configuration — three independent sets, each with the same
// three fields:
//
//   global    — applied to SharedStarField everywhere except colophon
//   colophon  — applied to SharedStarField when the lensing EffectComposer is
//               mounted (compensates for the no-tone-mapping brightening)
//   cubemap   — applied to the BH-centered StarfieldCubemap that the geodesic
//               shader samples for deflected background light
//
// Implementation note. The previous version used React context with useState,
// but updates from the dev console didn't propagate live to consumers
// rendered inside R3F's Canvas — only on reload (after re-reading localStorage
// at mount). The fix is an external store + useSyncExternalStore: that is the
// React-blessed pattern for state shared across rendering boundaries, and it
// avoids whatever propagation quirk the context approach hit.
//
// The Provider is kept as a vestigial wrapper so App.tsx doesn't need to know
// the implementation changed.

const STORAGE_KEY = 'portfolio:background-config';

export type BackgroundSetName = 'global' | 'colophon' | 'cubemap';

export interface BackgroundSetConfig {
  readonly nebulaBrightness: number;
  readonly nebulaSaturation: number;
  readonly starBrightness: number;
}

interface BackgroundState {
  readonly global: BackgroundSetConfig;
  readonly colophon: BackgroundSetConfig;
  readonly cubemap: BackgroundSetConfig;
}

export interface BackgroundConfigValue extends BackgroundState {
  readonly setSet: (set: BackgroundSetName, partial: Partial<BackgroundSetConfig>) => void;
  readonly reset: () => void;
}

interface StoredShape {
  global?: Partial<BackgroundSetConfig>;
  colophon?: Partial<BackgroundSetConfig>;
  cubemap?: Partial<BackgroundSetConfig>;
}

function readStored(): StoredShape {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed !== null ? (parsed as StoredShape) : {};
  } catch {
    return {};
  }
}

function writeStored(stored: StoredShape): void {
  if (typeof window === 'undefined') return;
  try {
    if (Object.keys(stored).length === 0) {
      window.localStorage.removeItem(STORAGE_KEY);
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // best-effort
  }
}

function mergeSet(
  defaults: BackgroundSetConfig,
  stored: Partial<BackgroundSetConfig> | undefined,
): BackgroundSetConfig {
  if (!stored) return defaults;
  const sanitize = (v: unknown, fallback: number): number =>
    typeof v === 'number' && Number.isFinite(v) ? v : fallback;
  return {
    nebulaBrightness: sanitize(stored.nebulaBrightness, defaults.nebulaBrightness),
    nebulaSaturation: sanitize(stored.nebulaSaturation, defaults.nebulaSaturation),
    starBrightness: sanitize(stored.starBrightness, defaults.starBrightness),
  };
}

function diffFromDefaults(
  defaults: BackgroundSetConfig,
  set: BackgroundSetConfig,
): Partial<BackgroundSetConfig> | undefined {
  const out: { -readonly [K in keyof BackgroundSetConfig]?: BackgroundSetConfig[K] } = {};
  if (set.nebulaBrightness !== defaults.nebulaBrightness) {
    out.nebulaBrightness = set.nebulaBrightness;
  }
  if (set.nebulaSaturation !== defaults.nebulaSaturation) {
    out.nebulaSaturation = set.nebulaSaturation;
  }
  if (set.starBrightness !== defaults.starBrightness) {
    out.starBrightness = set.starBrightness;
  }
  return Object.keys(out).length === 0 ? undefined : out;
}

// --- Module-scoped store ---

const D = SCENE_DEFAULTS.background;

function makeInitialState(): BackgroundState {
  const stored = readStored();
  return {
    global: mergeSet(D.global, stored.global),
    colophon: mergeSet(D.colophon, stored.colophon),
    cubemap: mergeSet(D.cubemap, stored.cubemap),
  };
}

let currentState: BackgroundState = makeInitialState();
const listeners = new Set<() => void>();

function notify(): void {
  for (const cb of listeners) cb();
}

function persist(state: BackgroundState): void {
  const stored: StoredShape = {};
  const g = diffFromDefaults(D.global, state.global);
  const c = diffFromDefaults(D.colophon, state.colophon);
  const m = diffFromDefaults(D.cubemap, state.cubemap);
  if (g) stored.global = g;
  if (c) stored.colophon = c;
  if (m) stored.cubemap = m;
  writeStored(stored);
}

function setBackgroundSet(which: BackgroundSetName, partial: Partial<BackgroundSetConfig>): void {
  const next: BackgroundState = {
    ...currentState,
    [which]: { ...currentState[which], ...partial },
  };
  currentState = next;
  persist(next);
  notify();
}

function resetBackgroundConfig(): void {
  currentState = {
    global: D.global,
    colophon: D.colophon,
    cubemap: D.cubemap,
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // best-effort
    }
  }
  notify();
}

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function getSnapshot(): BackgroundState {
  return currentState;
}

// Exported for R3F components that live inside a separate React root (Canvas).
// useSyncExternalStore doesn't reliably schedule re-renders across root
// boundaries; those components should use useState + useEffect instead.
export { subscribe as subscribeBackgroundConfig, getSnapshot as getBackgroundSnapshot };

// Cross-tab sync: when another tab writes to localStorage, mirror the change
// into our state and notify subscribers.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key !== STORAGE_KEY) return;
    currentState = makeInitialState();
    notify();
  });
}

// --- Public hooks / provider ---

export function BackgroundConfigProvider({ children }: { children: ReactNode }) {
  // Vestigial — kept so App.tsx's tree doesn't change shape. The store is
  // module-scoped and shared across all consumers.
  return <>{children}</>;
}

export function useBackgroundConfig(): BackgroundConfigValue {
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  const setSet = useCallback((which: BackgroundSetName, partial: Partial<BackgroundSetConfig>) => {
    setBackgroundSet(which, partial);
  }, []);
  const reset = useCallback(() => resetBackgroundConfig(), []);
  return {
    global: state.global,
    colophon: state.colophon,
    cubemap: state.cubemap,
    setSet,
    reset,
  };
}
