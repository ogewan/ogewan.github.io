import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// Detection + settings helper for the celestial canvas's mobile path. We
// distinguish three orthogonal axes:
//
//   isMobile       — coarse pointer + viewport < 900. Drives geometry density,
//                    shader complexity, star count.
//   saveData       — Save-Data hint. Skips cloud layer, lower texture LOD.
//   slowConnection — effectiveType ∈ {2g, slow-2g}. Skips cloud + bloom.
//
// Combined into a single "tier" the scenes can branch on without each one
// re-detecting independently.

export interface MobileSettings {
  readonly isMobile: boolean;
  readonly saveData: boolean;
  readonly slowConnection: boolean;
  // Convenience: any of the above. Scenes use this for "skip the expensive
  // path" decisions; finer-grained branches read individual fields.
  readonly degraded: boolean;
}

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationLike;
}

const DEFAULT_SETTINGS: MobileSettings = {
  isMobile: false,
  saveData: false,
  slowConnection: false,
  degraded: false,
};

function detectMobileSettings(): MobileSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  const coarse = window.matchMedia('(pointer: coarse)').matches;
  const narrow = window.innerWidth < 900;
  const isMobile = coarse && narrow;
  const conn = (navigator as NavigatorWithConnection).connection;
  const saveData = conn?.saveData === true;
  const slowConnection = conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g';
  return {
    isMobile,
    saveData,
    slowConnection,
    degraded: isMobile || saveData || slowConnection,
  };
}

const MobileSettingsContext = createContext<MobileSettings>(DEFAULT_SETTINGS);

export function MobileSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<MobileSettings>(() => detectMobileSettings());

  useEffect(() => {
    if (typeof window === 'undefined') return;
    // Re-detect on viewport resize (rotation, window resize). Save-Data and
    // effectiveType don't change at runtime — first read sticks.
    const onResize = () => setSettings(detectMobileSettings());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <MobileSettingsContext.Provider value={settings}>{children}</MobileSettingsContext.Provider>
  );
}

export function useMobileSettings(): MobileSettings {
  return useContext(MobileSettingsContext);
}
