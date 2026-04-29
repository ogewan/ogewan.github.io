import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// Projects-scene clock-marker overlay — dev-only diagnostic exposed via
// window.portfolio.rings.clock.show()/hide()/toggle(). When ON, four
// sprite labels (12, 3, 6, 9) sit at cardinal positions on the ring at
// a representative middle radius and orbit at that radius's Keplerian
// rate. The eye can track each numeral around the perimeter to
// directly verify ring rotation — useful because 120k uniformly-
// distributed dust particles look identical at any rotation phase.
// Persisted to localStorage so a "toggle and reload" workflow holds.

const STORAGE_KEY = 'portfolio:rings-clock';

export interface RingsClockMarkersValue {
  readonly clockVisible: boolean;
  readonly setClockVisible: (on: boolean) => void;
}

import { SCENE_DEFAULTS } from './scene-defaults.js';

function readStored(): boolean {
  const fallback = SCENE_DEFAULTS.projects.clock;
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

const RingsClockMarkersContext = createContext<RingsClockMarkersValue | null>(null);

export function RingsClockMarkersProvider({ children }: { children: ReactNode }) {
  const [clockVisible, setClockVisibleState] = useState<boolean>(readStored);

  const setClockVisible = useCallback((on: boolean) => {
    setClockVisibleState(on);
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

  // Cross-tab sync.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setClockVisibleState(e.newValue === '1');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo<RingsClockMarkersValue>(
    () => ({ clockVisible, setClockVisible }),
    [clockVisible, setClockVisible],
  );

  return (
    <RingsClockMarkersContext.Provider value={value}>{children}</RingsClockMarkersContext.Provider>
  );
}

export function useRingsClockMarkers(): RingsClockMarkersValue {
  const ctx = useContext(RingsClockMarkersContext);
  if (!ctx) {
    throw new Error('useRingsClockMarkers must be used inside <RingsClockMarkersProvider>');
  }
  return ctx;
}
