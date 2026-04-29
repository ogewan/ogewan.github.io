import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// Earth placeholder mode — dev-only toggle exposed via
// window.portfolio.earth.placeholder(). When ON, EarthScene forces the
// canvas-drawn placeholder day/night maps (green continents on blue ocean,
// see placeholder-earth-texture.ts) regardless of whether real Blue Marble
// webps have loaded. When OFF, the EarthScene uses whatever textures it has
// — real webps if non-stub, placeholder otherwise. Dots are also rendered
// in placeholder mode (with the lambert-aware city-dot shader).
//
// Persisted to localStorage so a "toggle and reload" workflow holds. Mirrors
// EarthTestModeContext.

const STORAGE_KEY = 'portfolio:earth-placeholder';

export interface EarthPlaceholderModeValue {
  readonly placeholderMode: boolean;
  readonly setPlaceholderMode: (on: boolean) => void;
}

function readStored(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

const EarthPlaceholderModeContext = createContext<EarthPlaceholderModeValue | null>(null);

export function EarthPlaceholderModeProvider({ children }: { children: ReactNode }) {
  const [placeholderMode, setModeState] = useState<boolean>(readStored);

  const setPlaceholderMode = useCallback((on: boolean) => {
    setModeState(on);
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

  // Cross-tab sync — match the EarthTestMode + CelestialQuality pattern.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      setModeState(e.newValue === '1');
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo<EarthPlaceholderModeValue>(
    () => ({ placeholderMode, setPlaceholderMode }),
    [placeholderMode, setPlaceholderMode],
  );

  return (
    <EarthPlaceholderModeContext.Provider value={value}>
      {children}
    </EarthPlaceholderModeContext.Provider>
  );
}

export function useEarthPlaceholderMode(): EarthPlaceholderModeValue {
  const ctx = useContext(EarthPlaceholderModeContext);
  if (!ctx) {
    throw new Error('useEarthPlaceholderMode must be used inside <EarthPlaceholderModeProvider>');
  }
  return ctx;
}
