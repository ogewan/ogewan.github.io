import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { SCENE_DEFAULTS } from './scene-defaults.js';
import { NEBULA_VARIANTS_ORDER, type NebulaVariant } from './r3f/scenes/nebula-variants.js';

// Contact-scene config — combined context for variant + visibility +
// per-effect knobs (billboards, particles) + camera pull-back. Mirrors
// the rings-effects localStorage `'1'`/`'0'` write-explicit-remove-default
// pattern, with the active `variant` pinned to the URL `?neb=01..04`
// query param via `history.replaceState`.

const STORAGE_KEY = {
  visible: 'portfolio:contact-visible',
  // Effect A — billboards
  billboardsVisible: 'portfolio:contact-billboards-visible',
  billboardLayerCount: 'portfolio:contact-billboard-layer-count',
  billboardJitter: 'portfolio:contact-billboard-jitter',
  billboardScale: 'portfolio:contact-billboard-scale',
  billboardBrightness: 'portfolio:contact-billboard-brightness',
  billboardSaturation: 'portfolio:contact-billboard-saturation',
  billboardGlow: 'portfolio:contact-billboard-glow',
  billboardDrift: 'portfolio:contact-billboard-drift',
  // Effect B — particles
  particlesVisible: 'portfolio:contact-particles-visible',
  particleCount: 'portfolio:contact-particle-count',
  particleSize: 'portfolio:contact-particle-size',
  particleJitter: 'portfolio:contact-particle-jitter',
  particleBrightness: 'portfolio:contact-particle-brightness',
  particleSaturation: 'portfolio:contact-particle-saturation',
  particleGlow: 'portfolio:contact-particle-glow',
  particleDrift: 'portfolio:contact-particle-drift',
  // Camera
  pullback: 'portfolio:contact-pullback',
  pullbackDuration: 'portfolio:contact-pullback-duration',
} as const;

const URL_QUERY_KEY = 'neb';

export interface NebulaeConfigValue {
  readonly variant: NebulaVariant;
  readonly visible: boolean;
  readonly billboardsVisible: boolean;
  readonly billboardLayerCount: number;
  readonly billboardJitter: number;
  readonly billboardScale: number;
  readonly billboardBrightness: number;
  readonly billboardSaturation: number;
  readonly billboardGlow: number;
  readonly billboardDrift: boolean;
  readonly particlesVisible: boolean;
  readonly particleCount: number;
  readonly particleSize: number;
  readonly particleJitter: number;
  readonly particleBrightness: number;
  readonly particleSaturation: number;
  readonly particleGlow: number;
  readonly particleDrift: boolean;
  readonly pullback: boolean;
  readonly pullbackDuration: number;
  readonly setVariant: (v: NebulaVariant) => void;
  readonly setVisible: (on: boolean) => void;
  readonly setBillboardsVisible: (on: boolean) => void;
  readonly setBillboardLayerCount: (n: number) => void;
  readonly setBillboardJitter: (n: number) => void;
  readonly setBillboardScale: (n: number) => void;
  readonly setBillboardBrightness: (n: number) => void;
  readonly setBillboardSaturation: (n: number) => void;
  readonly setBillboardGlow: (n: number) => void;
  readonly setBillboardDrift: (on: boolean) => void;
  readonly setParticlesVisible: (on: boolean) => void;
  readonly setParticleCount: (n: number) => void;
  readonly setParticleSize: (n: number) => void;
  readonly setParticleJitter: (n: number) => void;
  readonly setParticleBrightness: (n: number) => void;
  readonly setParticleSaturation: (n: number) => void;
  readonly setParticleGlow: (n: number) => void;
  readonly setParticleDrift: (on: boolean) => void;
  readonly setPullback: (on: boolean) => void;
  readonly setPullbackDuration: (n: number) => void;
}

function isVariant(v: unknown): v is NebulaVariant {
  return typeof v === 'string' && (NEBULA_VARIANTS_ORDER as readonly string[]).includes(v);
}

function readVariantFromUrl(): NebulaVariant {
  const fallback = SCENE_DEFAULTS.contact.variant;
  if (typeof window === 'undefined') return fallback;
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = params.get(URL_QUERY_KEY);
    if (raw && isVariant(raw)) return raw;
  } catch {
    // ignore
  }
  return fallback;
}

function writeVariantToUrl(v: NebulaVariant): void {
  if (typeof window === 'undefined') return;
  try {
    const params = new URLSearchParams(window.location.search);
    if (v === SCENE_DEFAULTS.contact.variant) {
      params.delete(URL_QUERY_KEY);
    } else {
      params.set(URL_QUERY_KEY, v);
    }
    const queryString = params.toString();
    const newUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', newUrl);
  } catch {
    // ignore
  }
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
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value ? '1' : '0');
    }
  } catch {
    // best-effort
  }
}

function readNumStored(key: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const n = Number(raw);
    if (!Number.isFinite(n)) return fallback;
    return n;
  } catch {
    return fallback;
  }
}

function writeNumStored(key: string, value: number, fallback: number): void {
  if (typeof window === 'undefined') return;
  try {
    if (value === fallback) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, String(value));
    }
  } catch {
    // best-effort
  }
}

const NebulaeConfigContext = createContext<NebulaeConfigValue | null>(null);

export function NebulaeConfigProvider({ children }: { children: ReactNode }) {
  const D = SCENE_DEFAULTS.contact;

  const [variant, setVariantState] = useState<NebulaVariant>(readVariantFromUrl);
  const [visible, setVisibleState] = useState(() => readBoolStored(STORAGE_KEY.visible, D.visible));

  const [billboardsVisible, setBillboardsVisibleState] = useState(() =>
    readBoolStored(STORAGE_KEY.billboardsVisible, D.billboardsVisible),
  );
  const [billboardLayerCount, setBillboardLayerCountState] = useState(() =>
    readNumStored(STORAGE_KEY.billboardLayerCount, D.billboardLayerCount),
  );
  const [billboardJitter, setBillboardJitterState] = useState(() =>
    readNumStored(STORAGE_KEY.billboardJitter, D.billboardJitter),
  );
  const [billboardScale, setBillboardScaleState] = useState(() =>
    readNumStored(STORAGE_KEY.billboardScale, D.billboardScale),
  );
  const [billboardBrightness, setBillboardBrightnessState] = useState(() =>
    readNumStored(STORAGE_KEY.billboardBrightness, D.billboardBrightness),
  );
  const [billboardSaturation, setBillboardSaturationState] = useState(() =>
    readNumStored(STORAGE_KEY.billboardSaturation, D.billboardSaturation),
  );
  const [billboardGlow, setBillboardGlowState] = useState(() =>
    readNumStored(STORAGE_KEY.billboardGlow, D.billboardGlow),
  );
  const [billboardDrift, setBillboardDriftState] = useState(() =>
    readBoolStored(STORAGE_KEY.billboardDrift, D.billboardDrift),
  );

  const [particlesVisible, setParticlesVisibleState] = useState(() =>
    readBoolStored(STORAGE_KEY.particlesVisible, D.particlesVisible),
  );
  const [particleCount, setParticleCountState] = useState(() =>
    readNumStored(STORAGE_KEY.particleCount, D.particleCount),
  );
  const [particleSize, setParticleSizeState] = useState(() =>
    readNumStored(STORAGE_KEY.particleSize, D.particleSize),
  );
  const [particleJitter, setParticleJitterState] = useState(() =>
    readNumStored(STORAGE_KEY.particleJitter, D.particleJitter),
  );
  const [particleBrightness, setParticleBrightnessState] = useState(() =>
    readNumStored(STORAGE_KEY.particleBrightness, D.particleBrightness),
  );
  const [particleSaturation, setParticleSaturationState] = useState(() =>
    readNumStored(STORAGE_KEY.particleSaturation, D.particleSaturation),
  );
  const [particleGlow, setParticleGlowState] = useState(() =>
    readNumStored(STORAGE_KEY.particleGlow, D.particleGlow),
  );
  const [particleDrift, setParticleDriftState] = useState(() =>
    readBoolStored(STORAGE_KEY.particleDrift, D.particleDrift),
  );

  const [pullback, setPullbackState] = useState(() =>
    readBoolStored(STORAGE_KEY.pullback, D.pullback),
  );
  const [pullbackDuration, setPullbackDurationState] = useState(() =>
    readNumStored(STORAGE_KEY.pullbackDuration, D.pullbackDuration),
  );

  const setVariant = useCallback((v: NebulaVariant) => {
    setVariantState(v);
    writeVariantToUrl(v);
  }, []);

  const setVisible = useCallback(
    (on: boolean) => {
      setVisibleState(on);
      writeBoolStored(STORAGE_KEY.visible, on, D.visible);
    },
    [D.visible],
  );
  const setBillboardsVisible = useCallback(
    (on: boolean) => {
      setBillboardsVisibleState(on);
      writeBoolStored(STORAGE_KEY.billboardsVisible, on, D.billboardsVisible);
    },
    [D.billboardsVisible],
  );
  const setBillboardLayerCount = useCallback(
    (n: number) => {
      setBillboardLayerCountState(n);
      writeNumStored(STORAGE_KEY.billboardLayerCount, n, D.billboardLayerCount);
    },
    [D.billboardLayerCount],
  );
  const setBillboardJitter = useCallback(
    (n: number) => {
      setBillboardJitterState(n);
      writeNumStored(STORAGE_KEY.billboardJitter, n, D.billboardJitter);
    },
    [D.billboardJitter],
  );
  const setBillboardScale = useCallback(
    (n: number) => {
      setBillboardScaleState(n);
      writeNumStored(STORAGE_KEY.billboardScale, n, D.billboardScale);
    },
    [D.billboardScale],
  );
  const setBillboardBrightness = useCallback(
    (n: number) => {
      setBillboardBrightnessState(n);
      writeNumStored(STORAGE_KEY.billboardBrightness, n, D.billboardBrightness);
    },
    [D.billboardBrightness],
  );
  const setBillboardSaturation = useCallback(
    (n: number) => {
      setBillboardSaturationState(n);
      writeNumStored(STORAGE_KEY.billboardSaturation, n, D.billboardSaturation);
    },
    [D.billboardSaturation],
  );
  const setBillboardGlow = useCallback(
    (n: number) => {
      setBillboardGlowState(n);
      writeNumStored(STORAGE_KEY.billboardGlow, n, D.billboardGlow);
    },
    [D.billboardGlow],
  );
  const setBillboardDrift = useCallback(
    (on: boolean) => {
      setBillboardDriftState(on);
      writeBoolStored(STORAGE_KEY.billboardDrift, on, D.billboardDrift);
    },
    [D.billboardDrift],
  );

  const setParticlesVisible = useCallback(
    (on: boolean) => {
      setParticlesVisibleState(on);
      writeBoolStored(STORAGE_KEY.particlesVisible, on, D.particlesVisible);
    },
    [D.particlesVisible],
  );
  const setParticleCount = useCallback(
    (n: number) => {
      setParticleCountState(n);
      writeNumStored(STORAGE_KEY.particleCount, n, D.particleCount);
    },
    [D.particleCount],
  );
  const setParticleSize = useCallback(
    (n: number) => {
      setParticleSizeState(n);
      writeNumStored(STORAGE_KEY.particleSize, n, D.particleSize);
    },
    [D.particleSize],
  );
  const setParticleJitter = useCallback(
    (n: number) => {
      setParticleJitterState(n);
      writeNumStored(STORAGE_KEY.particleJitter, n, D.particleJitter);
    },
    [D.particleJitter],
  );
  const setParticleBrightness = useCallback(
    (n: number) => {
      setParticleBrightnessState(n);
      writeNumStored(STORAGE_KEY.particleBrightness, n, D.particleBrightness);
    },
    [D.particleBrightness],
  );
  const setParticleSaturation = useCallback(
    (n: number) => {
      setParticleSaturationState(n);
      writeNumStored(STORAGE_KEY.particleSaturation, n, D.particleSaturation);
    },
    [D.particleSaturation],
  );
  const setParticleGlow = useCallback(
    (n: number) => {
      setParticleGlowState(n);
      writeNumStored(STORAGE_KEY.particleGlow, n, D.particleGlow);
    },
    [D.particleGlow],
  );
  const setParticleDrift = useCallback(
    (on: boolean) => {
      setParticleDriftState(on);
      writeBoolStored(STORAGE_KEY.particleDrift, on, D.particleDrift);
    },
    [D.particleDrift],
  );

  const setPullback = useCallback(
    (on: boolean) => {
      setPullbackState(on);
      writeBoolStored(STORAGE_KEY.pullback, on, D.pullback);
    },
    [D.pullback],
  );
  const setPullbackDuration = useCallback(
    (n: number) => {
      setPullbackDurationState(n);
      writeNumStored(STORAGE_KEY.pullbackDuration, n, D.pullbackDuration);
    },
    [D.pullbackDuration],
  );

  // popstate: pick up URL param changes from browser back/forward.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => setVariantState(readVariantFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Cross-tab sync.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      switch (e.key) {
        case STORAGE_KEY.visible:
          setVisibleState(readBoolStored(STORAGE_KEY.visible, D.visible));
          break;
        case STORAGE_KEY.billboardsVisible:
          setBillboardsVisibleState(
            readBoolStored(STORAGE_KEY.billboardsVisible, D.billboardsVisible),
          );
          break;
        case STORAGE_KEY.billboardLayerCount:
          setBillboardLayerCountState(
            readNumStored(STORAGE_KEY.billboardLayerCount, D.billboardLayerCount),
          );
          break;
        case STORAGE_KEY.billboardJitter:
          setBillboardJitterState(readNumStored(STORAGE_KEY.billboardJitter, D.billboardJitter));
          break;
        case STORAGE_KEY.billboardScale:
          setBillboardScaleState(readNumStored(STORAGE_KEY.billboardScale, D.billboardScale));
          break;
        case STORAGE_KEY.billboardBrightness:
          setBillboardBrightnessState(
            readNumStored(STORAGE_KEY.billboardBrightness, D.billboardBrightness),
          );
          break;
        case STORAGE_KEY.billboardSaturation:
          setBillboardSaturationState(
            readNumStored(STORAGE_KEY.billboardSaturation, D.billboardSaturation),
          );
          break;
        case STORAGE_KEY.billboardGlow:
          setBillboardGlowState(readNumStored(STORAGE_KEY.billboardGlow, D.billboardGlow));
          break;
        case STORAGE_KEY.billboardDrift:
          setBillboardDriftState(readBoolStored(STORAGE_KEY.billboardDrift, D.billboardDrift));
          break;
        case STORAGE_KEY.particlesVisible:
          setParticlesVisibleState(
            readBoolStored(STORAGE_KEY.particlesVisible, D.particlesVisible),
          );
          break;
        case STORAGE_KEY.particleCount:
          setParticleCountState(readNumStored(STORAGE_KEY.particleCount, D.particleCount));
          break;
        case STORAGE_KEY.particleSize:
          setParticleSizeState(readNumStored(STORAGE_KEY.particleSize, D.particleSize));
          break;
        case STORAGE_KEY.particleJitter:
          setParticleJitterState(readNumStored(STORAGE_KEY.particleJitter, D.particleJitter));
          break;
        case STORAGE_KEY.particleBrightness:
          setParticleBrightnessState(
            readNumStored(STORAGE_KEY.particleBrightness, D.particleBrightness),
          );
          break;
        case STORAGE_KEY.particleSaturation:
          setParticleSaturationState(
            readNumStored(STORAGE_KEY.particleSaturation, D.particleSaturation),
          );
          break;
        case STORAGE_KEY.particleGlow:
          setParticleGlowState(readNumStored(STORAGE_KEY.particleGlow, D.particleGlow));
          break;
        case STORAGE_KEY.particleDrift:
          setParticleDriftState(readBoolStored(STORAGE_KEY.particleDrift, D.particleDrift));
          break;
        case STORAGE_KEY.pullback:
          setPullbackState(readBoolStored(STORAGE_KEY.pullback, D.pullback));
          break;
        case STORAGE_KEY.pullbackDuration:
          setPullbackDurationState(readNumStored(STORAGE_KEY.pullbackDuration, D.pullbackDuration));
          break;
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [D]);

  const value = useMemo<NebulaeConfigValue>(
    () => ({
      variant,
      visible,
      billboardsVisible,
      billboardLayerCount,
      billboardJitter,
      billboardScale,
      billboardBrightness,
      billboardSaturation,
      billboardGlow,
      billboardDrift,
      particlesVisible,
      particleCount,
      particleSize,
      particleJitter,
      particleBrightness,
      particleSaturation,
      particleGlow,
      particleDrift,
      pullback,
      pullbackDuration,
      setVariant,
      setVisible,
      setBillboardsVisible,
      setBillboardLayerCount,
      setBillboardJitter,
      setBillboardScale,
      setBillboardBrightness,
      setBillboardSaturation,
      setBillboardGlow,
      setBillboardDrift,
      setParticlesVisible,
      setParticleCount,
      setParticleSize,
      setParticleJitter,
      setParticleBrightness,
      setParticleSaturation,
      setParticleGlow,
      setParticleDrift,
      setPullback,
      setPullbackDuration,
    }),
    [
      variant,
      visible,
      billboardsVisible,
      billboardLayerCount,
      billboardJitter,
      billboardScale,
      billboardBrightness,
      billboardSaturation,
      billboardGlow,
      billboardDrift,
      particlesVisible,
      particleCount,
      particleSize,
      particleJitter,
      particleBrightness,
      particleSaturation,
      particleGlow,
      particleDrift,
      pullback,
      pullbackDuration,
      setVariant,
      setVisible,
      setBillboardsVisible,
      setBillboardLayerCount,
      setBillboardJitter,
      setBillboardScale,
      setBillboardBrightness,
      setBillboardSaturation,
      setBillboardGlow,
      setBillboardDrift,
      setParticlesVisible,
      setParticleCount,
      setParticleSize,
      setParticleJitter,
      setParticleBrightness,
      setParticleSaturation,
      setParticleGlow,
      setParticleDrift,
      setPullback,
      setPullbackDuration,
    ],
  );

  return <NebulaeConfigContext.Provider value={value}>{children}</NebulaeConfigContext.Provider>;
}

export function useNebulaeConfig(): NebulaeConfigValue {
  const ctx = useContext(NebulaeConfigContext);
  if (!ctx) {
    throw new Error('useNebulaeConfig must be used inside <NebulaeConfigProvider>');
  }
  return ctx;
}
