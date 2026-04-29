import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// Projects-scene ring effect toggles. Five independent visual options
// the dev console can flip on/off:
//
//   - sparkles         — small fraction of particles boosted to large
//                         size so the eye can track individual chunks
//                         orbiting at their Keplerian rates.
//   - clumps           — non-uniform azimuthal distribution; some
//                         sectors of each ring zone are denser than
//                         others. Density patterns travel with rotation.
//   - spokes           — periodic dark radial bars (Saturn's B-ring
//                         spoke phenomenon analogue). Pattern rotates
//                         at the local orbital rate of the mid-B ring.
//   - bandFlow         — animated FBM-noise pattern on each continuous
//                         ring band, scrolled at the band's Keplerian
//                         rate so the colored haze visibly flows.
//   - scenePreserveTilt — controls the axis the scene rotation runs
//                         around. ON: rotate around the tilt's local Y
//                         (rings spin in their plane, tilt-to-camera
//                         stays constant). OFF: rotate around world Y
//                         (whole scene tumbles, ring tilt sweeps).
//
// Defaults: sparkles + clumps + bandFlow + scenePreserveTilt ON,
// spokes OFF. All persisted to localStorage. Defaults sourced from
// scene-defaults.ts.

import { SCENE_DEFAULTS } from './scene-defaults.js';

const STORAGE_KEY_SPARKLES = 'portfolio:rings-sparkles';
const STORAGE_KEY_CLUMPS = 'portfolio:rings-clumps';
const STORAGE_KEY_SPOKES = 'portfolio:rings-spokes';
const STORAGE_KEY_BAND_FLOW = 'portfolio:rings-band-flow';
const STORAGE_KEY_PRESERVE_TILT = 'portfolio:rings-preserve-tilt';

export interface RingsEffectsValue {
  readonly sparkles: boolean;
  readonly clumps: boolean;
  readonly spokes: boolean;
  readonly bandFlow: boolean;
  readonly scenePreserveTilt: boolean;
  readonly setSparkles: (on: boolean) => void;
  readonly setClumps: (on: boolean) => void;
  readonly setSpokes: (on: boolean) => void;
  readonly setBandFlow: (on: boolean) => void;
  readonly setScenePreserveTilt: (on: boolean) => void;
}

function readBoolStored(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === '1') return true;
    if (raw === '0') return false;
    return fallback;
  } catch {
    return fallback;
  }
}

function writeBoolStored(key: string, value: boolean, fallback: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === fallback) {
      // Equal to the default — clear any persisted entry so future
      // default changes apply automatically.
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value ? '1' : '0');
    }
  } catch {
    // best-effort
  }
}

const RingsEffectsContext = createContext<RingsEffectsValue | null>(null);

export function RingsEffectsProvider({ children }: { children: ReactNode }) {
  const [sparkles, setSparklesState] = useState<boolean>(() =>
    readBoolStored(STORAGE_KEY_SPARKLES, SCENE_DEFAULTS.projects.sparkles),
  );
  const [clumps, setClumpsState] = useState<boolean>(() =>
    readBoolStored(STORAGE_KEY_CLUMPS, SCENE_DEFAULTS.projects.clumps),
  );
  const [spokes, setSpokesState] = useState<boolean>(() =>
    readBoolStored(STORAGE_KEY_SPOKES, SCENE_DEFAULTS.projects.spokes),
  );
  const [bandFlow, setBandFlowState] = useState<boolean>(() =>
    readBoolStored(STORAGE_KEY_BAND_FLOW, SCENE_DEFAULTS.projects.flow),
  );
  const [scenePreserveTilt, setScenePreserveTiltState] = useState<boolean>(() =>
    readBoolStored(STORAGE_KEY_PRESERVE_TILT, SCENE_DEFAULTS.projects.scenePreserveTilt),
  );

  const setSparkles = useCallback((on: boolean) => {
    setSparklesState(on);
    writeBoolStored(STORAGE_KEY_SPARKLES, on, SCENE_DEFAULTS.projects.sparkles);
  }, []);
  const setClumps = useCallback((on: boolean) => {
    setClumpsState(on);
    writeBoolStored(STORAGE_KEY_CLUMPS, on, SCENE_DEFAULTS.projects.clumps);
  }, []);
  const setSpokes = useCallback((on: boolean) => {
    setSpokesState(on);
    writeBoolStored(STORAGE_KEY_SPOKES, on, SCENE_DEFAULTS.projects.spokes);
  }, []);
  const setBandFlow = useCallback((on: boolean) => {
    setBandFlowState(on);
    writeBoolStored(STORAGE_KEY_BAND_FLOW, on, SCENE_DEFAULTS.projects.flow);
  }, []);
  const setScenePreserveTilt = useCallback((on: boolean) => {
    setScenePreserveTiltState(on);
    writeBoolStored(STORAGE_KEY_PRESERVE_TILT, on, SCENE_DEFAULTS.projects.scenePreserveTilt);
  }, []);

  // Cross-tab sync. Each event applies the same read logic so the
  // tabs land on the same final state regardless of whether the
  // change was a set or a clear-to-default.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY_SPARKLES) {
        setSparklesState(readBoolStored(STORAGE_KEY_SPARKLES, SCENE_DEFAULTS.projects.sparkles));
      } else if (e.key === STORAGE_KEY_CLUMPS) {
        setClumpsState(readBoolStored(STORAGE_KEY_CLUMPS, SCENE_DEFAULTS.projects.clumps));
      } else if (e.key === STORAGE_KEY_SPOKES) {
        setSpokesState(readBoolStored(STORAGE_KEY_SPOKES, SCENE_DEFAULTS.projects.spokes));
      } else if (e.key === STORAGE_KEY_BAND_FLOW) {
        setBandFlowState(readBoolStored(STORAGE_KEY_BAND_FLOW, SCENE_DEFAULTS.projects.flow));
      } else if (e.key === STORAGE_KEY_PRESERVE_TILT) {
        setScenePreserveTiltState(
          readBoolStored(STORAGE_KEY_PRESERVE_TILT, SCENE_DEFAULTS.projects.scenePreserveTilt),
        );
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo<RingsEffectsValue>(
    () => ({
      sparkles,
      clumps,
      spokes,
      bandFlow,
      scenePreserveTilt,
      setSparkles,
      setClumps,
      setSpokes,
      setBandFlow,
      setScenePreserveTilt,
    }),
    [
      sparkles,
      clumps,
      spokes,
      bandFlow,
      scenePreserveTilt,
      setSparkles,
      setClumps,
      setSpokes,
      setBandFlow,
      setScenePreserveTilt,
    ],
  );

  return <RingsEffectsContext.Provider value={value}>{children}</RingsEffectsContext.Provider>;
}

export function useRingsEffects(): RingsEffectsValue {
  const ctx = useContext(RingsEffectsContext);
  if (!ctx) {
    throw new Error('useRingsEffects must be used inside <RingsEffectsProvider>');
  }
  return ctx;
}
