import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

// Three quality modes for the celestial backdrop. The user picks one via a
// header toggle (default 'quality'); choice is persisted to localStorage so
// it survives reloads and locale switches.
//
//   'quality' — full R3F canvas: shaders, textures, camera fly-through,
//               focus rotation, cloud layer (gated by network/device).
//               Heaviest first-load (~270 KB gz Canvas3D + textures), best
//               cached after that.
//
//   'static'  — committed PNG snapshots of each scene rendered through <img>.
//               No R3F runtime, no canvas, no per-frame work. Mid-weight
//               (~80 KB per scene PNG); shows the scene as the camera framed
//               it but without motion or focus interactivity.
//
//   'simple'  — CSS gradient placeholders. Zero extra fetch (already in main
//               bundle), zero runtime cost. Looks intentionally low-fi.
//
// **OS prefers-reduced-motion is intentionally NOT consulted here.** The
// celestial visuals are central to the portfolio's identity; we don't want
// random visitors with system-level animation reduction to never see what
// the site is actually about. Users who want a still or simple view pick it
// from the toggle. The pulse animation on the LocationRail visitor marker
// likewise runs in all three modes.

export const CELESTIAL_QUALITIES = ['quality', 'static', 'simple'] as const;
export type CelestialQuality = (typeof CELESTIAL_QUALITIES)[number];

export interface CelestialQualityValue {
  readonly quality: CelestialQuality;
  readonly setQuality: (q: CelestialQuality) => void;
}

const STORAGE_KEY = 'portfolio:quality';
const DEFAULT_QUALITY: CelestialQuality = 'quality';

function readStoredQuality(): CelestialQuality {
  if (typeof window === 'undefined') return DEFAULT_QUALITY;
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    if (v && (CELESTIAL_QUALITIES as readonly string[]).includes(v)) {
      return v as CelestialQuality;
    }
  } catch {
    // localStorage disabled (private mode etc.); fall through to default.
  }
  return DEFAULT_QUALITY;
}

const CelestialQualityContext = createContext<CelestialQualityValue | null>(null);

export function CelestialQualityProvider({ children }: { children: ReactNode }) {
  const [quality, setQualityState] = useState<CelestialQuality>(readStoredQuality);

  const setQuality = useCallback((q: CelestialQuality) => {
    setQualityState(q);
    try {
      window.localStorage.setItem(STORAGE_KEY, q);
    } catch {
      // best-effort persistence; UI works without it
    }
  }, []);

  // Cross-tab sync: another tab changed the quality → mirror it locally.
  // Useful when a user toggles in one tab and expects all tabs to follow.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const v = e.newValue;
      if (v && (CELESTIAL_QUALITIES as readonly string[]).includes(v)) {
        setQualityState(v as CelestialQuality);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo<CelestialQualityValue>(
    () => ({ quality, setQuality }),
    [quality, setQuality],
  );

  return (
    <CelestialQualityContext.Provider value={value}>{children}</CelestialQualityContext.Provider>
  );
}

export function useCelestialQuality(): CelestialQualityValue {
  const ctx = useContext(CelestialQualityContext);
  if (!ctx) {
    throw new Error('useCelestialQuality must be used inside <CelestialQualityProvider>');
  }
  return ctx;
}
