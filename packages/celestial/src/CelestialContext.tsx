import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import type { FocusMode, FocusTarget } from './scenes.js';

// Focus context — used by the location rail (Phase 4) to "aim" the Earth scene
// at a city, and by the R3F camera in Phase 9 to apply that aim. Phase 3
// placeholders just hold the state; the visual layer ignores it.
//
// Kept separate from the scene name (which is pathname-derived) so consumers
// can subscribe to focus changes without re-rendering on route changes.

export interface CelestialFocusValue {
  readonly mode: FocusMode;
  readonly target: FocusTarget | null;
  readonly setFocus: (target: FocusTarget) => void;
  readonly setAuto: () => void;
}

const CelestialFocusContext = createContext<CelestialFocusValue | null>(null);

export function CelestialFocusProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<FocusMode>('auto');
  const [target, setTarget] = useState<FocusTarget | null>(null);

  const setFocus = useCallback((t: FocusTarget) => {
    setTarget(t);
    setMode('focused');
  }, []);

  const setAuto = useCallback(() => {
    setMode('auto');
    // We deliberately keep `target` so the rail's last selection persists in
    // sessionStorage logic at the call site; consumers can ignore target when
    // mode === 'auto'.
  }, []);

  const value = useMemo<CelestialFocusValue>(
    () => ({ mode, target, setFocus, setAuto }),
    [mode, target, setFocus, setAuto],
  );

  return <CelestialFocusContext.Provider value={value}>{children}</CelestialFocusContext.Provider>;
}

export function useCelestialFocus(): CelestialFocusValue {
  const ctx = useContext(CelestialFocusContext);
  if (!ctx) {
    throw new Error('useCelestialFocus must be used inside <CelestialFocusProvider>');
  }
  return ctx;
}
