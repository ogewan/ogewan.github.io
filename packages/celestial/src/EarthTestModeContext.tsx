import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// Earth test mode — dev-only toggle exposed via window.portfolio.earth.test().
// When ON, EarthScene renders a procedural UV checker grid in place of the
// day/night/clouds material and overlays bright red sphere meshes at each
// canonical city's lat/lng so the rail → setFocus → rotationForFocus pipeline
// can be visually verified.
//
// Persisted to localStorage so a "toggle and reload" workflow holds. Mirrors
// the CelestialQualityContext storage pattern.

const STORAGE_KEY = 'portfolio:earth-test';

export interface EarthTestModeValue {
  readonly testMode: boolean;
  readonly setTestMode: (on: boolean) => void;
}

import { SCENE_DEFAULTS } from './scene-defaults.js';

function readStored(): boolean {
  const fallback = SCENE_DEFAULTS.earth.testMode;
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === '1') return true;
    if (raw === '0') return false;
    return fallback;
  } catch {
    return fallback;
  }
}

const EarthTestModeContext = createContext<EarthTestModeValue | null>(null);

export function EarthTestModeProvider({ children }: { children: ReactNode }) {
  const [testMode, setTestModeState] = useState<boolean>(readStored);

  const setTestMode = useCallback((on: boolean) => {
    setTestModeState(on);
    try {
      if (on) {
        window.localStorage.setItem(STORAGE_KEY, '1');
      } else {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      // best-effort persistence
    }
  }, []);

  // Cross-tab sync — match CelestialQualityContext behavior.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setTestModeState(e.newValue === '1');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo<EarthTestModeValue>(
    () => ({ testMode, setTestMode }),
    [testMode, setTestMode],
  );

  return <EarthTestModeContext.Provider value={value}>{children}</EarthTestModeContext.Provider>;
}

export function useEarthTestMode(): EarthTestModeValue {
  const ctx = useContext(EarthTestModeContext);
  if (!ctx) {
    throw new Error('useEarthTestMode must be used inside <EarthTestModeProvider>');
  }
  return ctx;
}
