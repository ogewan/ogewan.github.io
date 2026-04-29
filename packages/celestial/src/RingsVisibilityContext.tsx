import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// Projects-scene ring visibility — dev-only toggle exposed via
// window.portfolio.rings.show()/hide()/toggle(). When OFF, ProjectsScene
// renders the gas-giant body alone (no particle ring system). Useful for
// debugging the body shader / vortex without the rings cluttering the
// frame. Persisted to localStorage so a "toggle and reload" workflow holds.
// Mirrors EarthTestModeContext / EarthPlaceholderModeContext.

const STORAGE_KEY = 'portfolio:rings-visible';

export interface RingsVisibilityValue {
  readonly visible: boolean;
  readonly setVisible: (on: boolean) => void;
}

import { SCENE_DEFAULTS } from './scene-defaults.js';

function readStored(): boolean {
  const fallback = SCENE_DEFAULTS.projects.ringsVisible;
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

const RingsVisibilityContext = createContext<RingsVisibilityValue | null>(null);

export function RingsVisibilityProvider({ children }: { children: ReactNode }) {
  const [visible, setVisibleState] = useState<boolean>(readStored);

  const setVisible = useCallback((on: boolean) => {
    setVisibleState(on);
    try {
      if (on) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, '0');
      }
    } catch {
      // best-effort persistence
    }
  }, []);

  // Cross-tab sync — match the rest of the dev-toggle contexts.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setVisibleState(e.newValue !== '0');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo<RingsVisibilityValue>(
    () => ({ visible, setVisible }),
    [visible, setVisible],
  );

  return (
    <RingsVisibilityContext.Provider value={value}>{children}</RingsVisibilityContext.Provider>
  );
}

export function useRingsVisibility(): RingsVisibilityValue {
  const ctx = useContext(RingsVisibilityContext);
  if (!ctx) {
    throw new Error('useRingsVisibility must be used inside <RingsVisibilityProvider>');
  }
  return ctx;
}
