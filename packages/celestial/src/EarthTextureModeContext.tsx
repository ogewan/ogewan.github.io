import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { EARTH_TEXTURE_MODES, type EarthTextureMode, SCENE_DEFAULTS } from './scene-defaults.js';

// Earth texture mode — controls whether EarthScene uses the canvas-drawn
// procedural maps (default) or attempts to load real NASA Blue Marble /
// Black Marble / moon webps from packages/celestial/src/textures/.
//
// 'procedural' (default): canvas-drawn green/blue earth + grey shader moon.
// 'nasa': loads real webp textures; stubs (isLikelyStubTexture) fall back
//   to procedural silently, so the scene always renders correctly.
//
// Exposed via window.portfolio.earth.textureMode() in the dev console.
// Persisted to localStorage; cross-tab synced via StorageEvent.

const STORAGE_KEY = 'portfolio:earth-texture-mode';

function isEarthTextureMode(v: unknown): v is EarthTextureMode {
  return typeof v === 'string' && (EARTH_TEXTURE_MODES as readonly string[]).includes(v);
}

function readStored(): EarthTextureMode {
  const fallback = SCENE_DEFAULTS.earth.textureMode;
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && isEarthTextureMode(raw)) return raw;
    return fallback;
  } catch {
    return fallback;
  }
}

export interface EarthTextureModeValue {
  readonly textureMode: EarthTextureMode;
  readonly setTextureMode: (mode: EarthTextureMode) => void;
}

const EarthTextureModeContext = createContext<EarthTextureModeValue | null>(null);

export function EarthTextureModeProvider({ children }: { children: ReactNode }) {
  const [textureMode, setModeState] = useState<EarthTextureMode>(readStored);

  const setTextureMode = useCallback((mode: EarthTextureMode) => {
    setModeState(mode);
    try {
      if (mode === SCENE_DEFAULTS.earth.textureMode) {
        window.localStorage.removeItem(STORAGE_KEY);
      } else {
        window.localStorage.setItem(STORAGE_KEY, mode);
      }
    } catch {
      // best-effort persistence
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      if (e.key !== STORAGE_KEY) return;
      const v = e.newValue;
      if (v && isEarthTextureMode(v)) {
        setModeState(v);
      } else if (v === null) {
        setModeState(SCENE_DEFAULTS.earth.textureMode);
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo<EarthTextureModeValue>(
    () => ({ textureMode, setTextureMode }),
    [textureMode, setTextureMode],
  );

  return (
    <EarthTextureModeContext.Provider value={value}>{children}</EarthTextureModeContext.Provider>
  );
}

export function useEarthTextureMode(): EarthTextureModeValue {
  const ctx = useContext(EarthTextureModeContext);
  if (!ctx) {
    throw new Error('useEarthTextureMode must be used inside <EarthTextureModeProvider>');
  }
  return ctx;
}
