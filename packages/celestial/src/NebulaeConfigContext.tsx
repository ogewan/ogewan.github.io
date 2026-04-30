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
// dive enable + density/drift toggles. Mirrors the rings-effects
// localStorage `'1'`/`'0'` write-explicit-remove-default pattern, with
// one twist: the active `variant` lives in the URL `?neb=01..04`
// query param rather than localStorage, so a deep-linked URL can pin
// a specific nebula and the dev console / context state stay in sync
// via `history.replaceState`.
//
// Schema mirrors `portfolio.nebulae.config()` JSON exactly:
//   { variant, visible, dive, density, drift, stepCount }

const STORAGE_KEY_VISIBLE = 'portfolio:contact-visible';
const STORAGE_KEY_DIVE = 'portfolio:contact-dive';
const STORAGE_KEY_DRIFT = 'portfolio:contact-drift';
const STORAGE_KEY_DENSITY = 'portfolio:contact-density';
const STORAGE_KEY_STEP_COUNT = 'portfolio:contact-step-count';
const STORAGE_KEY_BRIGHTNESS_MUL = 'portfolio:contact-brightness-mul';
const STORAGE_KEY_SATURATION_MUL = 'portfolio:contact-saturation-mul';
const STORAGE_KEY_GLOW_MUL = 'portfolio:contact-glow-mul';
const STORAGE_KEY_DIFFUSE_MUL = 'portfolio:contact-diffuse-mul';

const URL_QUERY_KEY = 'neb';

export interface NebulaeConfigValue {
  readonly variant: NebulaVariant;
  readonly visible: boolean;
  readonly dive: boolean;
  readonly density: number;
  readonly drift: boolean;
  readonly stepCount: number;
  readonly brightnessMul: number;
  readonly saturationMul: number;
  readonly glowMul: number;
  readonly diffuseMul: number;
  readonly setVariant: (v: NebulaVariant) => void;
  readonly setVisible: (on: boolean) => void;
  readonly setDive: (on: boolean) => void;
  readonly setDensity: (d: number) => void;
  readonly setDrift: (on: boolean) => void;
  readonly setStepCount: (n: number) => void;
  readonly setBrightnessMul: (n: number) => void;
  readonly setSaturationMul: (n: number) => void;
  readonly setGlowMul: (n: number) => void;
  readonly setDiffuseMul: (n: number) => void;
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
  const [variant, setVariantState] = useState<NebulaVariant>(readVariantFromUrl);
  const [visible, setVisibleState] = useState<boolean>(() =>
    readBoolStored(STORAGE_KEY_VISIBLE, SCENE_DEFAULTS.contact.visible),
  );
  const [dive, setDiveState] = useState<boolean>(() =>
    readBoolStored(STORAGE_KEY_DIVE, SCENE_DEFAULTS.contact.dive),
  );
  const [drift, setDriftState] = useState<boolean>(() =>
    readBoolStored(STORAGE_KEY_DRIFT, SCENE_DEFAULTS.contact.drift),
  );
  const [density, setDensityState] = useState<number>(() =>
    readNumStored(STORAGE_KEY_DENSITY, SCENE_DEFAULTS.contact.density),
  );
  const [stepCount, setStepCountState] = useState<number>(() =>
    readNumStored(STORAGE_KEY_STEP_COUNT, SCENE_DEFAULTS.contact.stepCount),
  );
  const [brightnessMul, setBrightnessMulState] = useState<number>(() =>
    readNumStored(STORAGE_KEY_BRIGHTNESS_MUL, SCENE_DEFAULTS.contact.brightnessMul),
  );
  const [saturationMul, setSaturationMulState] = useState<number>(() =>
    readNumStored(STORAGE_KEY_SATURATION_MUL, SCENE_DEFAULTS.contact.saturationMul),
  );
  const [glowMul, setGlowMulState] = useState<number>(() =>
    readNumStored(STORAGE_KEY_GLOW_MUL, SCENE_DEFAULTS.contact.glowMul),
  );
  const [diffuseMul, setDiffuseMulState] = useState<number>(() =>
    readNumStored(STORAGE_KEY_DIFFUSE_MUL, SCENE_DEFAULTS.contact.diffuseMul),
  );

  const setVariant = useCallback((v: NebulaVariant) => {
    setVariantState(v);
    writeVariantToUrl(v);
  }, []);

  const setVisible = useCallback((on: boolean) => {
    setVisibleState(on);
    writeBoolStored(STORAGE_KEY_VISIBLE, on, SCENE_DEFAULTS.contact.visible);
  }, []);

  const setDive = useCallback((on: boolean) => {
    setDiveState(on);
    writeBoolStored(STORAGE_KEY_DIVE, on, SCENE_DEFAULTS.contact.dive);
  }, []);

  const setDrift = useCallback((on: boolean) => {
    setDriftState(on);
    writeBoolStored(STORAGE_KEY_DRIFT, on, SCENE_DEFAULTS.contact.drift);
  }, []);

  const setDensity = useCallback((d: number) => {
    setDensityState(d);
    writeNumStored(STORAGE_KEY_DENSITY, d, SCENE_DEFAULTS.contact.density);
  }, []);

  const setStepCount = useCallback((n: number) => {
    setStepCountState(n);
    writeNumStored(STORAGE_KEY_STEP_COUNT, n, SCENE_DEFAULTS.contact.stepCount);
  }, []);

  const setBrightnessMul = useCallback((n: number) => {
    setBrightnessMulState(n);
    writeNumStored(STORAGE_KEY_BRIGHTNESS_MUL, n, SCENE_DEFAULTS.contact.brightnessMul);
  }, []);
  const setSaturationMul = useCallback((n: number) => {
    setSaturationMulState(n);
    writeNumStored(STORAGE_KEY_SATURATION_MUL, n, SCENE_DEFAULTS.contact.saturationMul);
  }, []);
  const setGlowMul = useCallback((n: number) => {
    setGlowMulState(n);
    writeNumStored(STORAGE_KEY_GLOW_MUL, n, SCENE_DEFAULTS.contact.glowMul);
  }, []);
  const setDiffuseMul = useCallback((n: number) => {
    setDiffuseMulState(n);
    writeNumStored(STORAGE_KEY_DIFFUSE_MUL, n, SCENE_DEFAULTS.contact.diffuseMul);
  }, []);

  // popstate: pick up URL param changes from browser back/forward.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onPop = () => setVariantState(readVariantFromUrl());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Cross-tab sync — match the rest of the dev-toggle contexts.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      switch (e.key) {
        case STORAGE_KEY_VISIBLE:
          setVisibleState(readBoolStored(STORAGE_KEY_VISIBLE, SCENE_DEFAULTS.contact.visible));
          break;
        case STORAGE_KEY_DIVE:
          setDiveState(readBoolStored(STORAGE_KEY_DIVE, SCENE_DEFAULTS.contact.dive));
          break;
        case STORAGE_KEY_DRIFT:
          setDriftState(readBoolStored(STORAGE_KEY_DRIFT, SCENE_DEFAULTS.contact.drift));
          break;
        case STORAGE_KEY_DENSITY:
          setDensityState(readNumStored(STORAGE_KEY_DENSITY, SCENE_DEFAULTS.contact.density));
          break;
        case STORAGE_KEY_STEP_COUNT:
          setStepCountState(
            readNumStored(STORAGE_KEY_STEP_COUNT, SCENE_DEFAULTS.contact.stepCount),
          );
          break;
        case STORAGE_KEY_BRIGHTNESS_MUL:
          setBrightnessMulState(
            readNumStored(STORAGE_KEY_BRIGHTNESS_MUL, SCENE_DEFAULTS.contact.brightnessMul),
          );
          break;
        case STORAGE_KEY_SATURATION_MUL:
          setSaturationMulState(
            readNumStored(STORAGE_KEY_SATURATION_MUL, SCENE_DEFAULTS.contact.saturationMul),
          );
          break;
        case STORAGE_KEY_GLOW_MUL:
          setGlowMulState(readNumStored(STORAGE_KEY_GLOW_MUL, SCENE_DEFAULTS.contact.glowMul));
          break;
        case STORAGE_KEY_DIFFUSE_MUL:
          setDiffuseMulState(
            readNumStored(STORAGE_KEY_DIFFUSE_MUL, SCENE_DEFAULTS.contact.diffuseMul),
          );
          break;
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, []);

  const value = useMemo<NebulaeConfigValue>(
    () => ({
      variant,
      visible,
      dive,
      density,
      drift,
      stepCount,
      brightnessMul,
      saturationMul,
      glowMul,
      diffuseMul,
      setVariant,
      setVisible,
      setDive,
      setDensity,
      setDrift,
      setStepCount,
      setBrightnessMul,
      setSaturationMul,
      setGlowMul,
      setDiffuseMul,
    }),
    [
      variant,
      visible,
      dive,
      density,
      drift,
      stepCount,
      brightnessMul,
      saturationMul,
      glowMul,
      diffuseMul,
      setVariant,
      setVisible,
      setDive,
      setDensity,
      setDrift,
      setStepCount,
      setBrightnessMul,
      setSaturationMul,
      setGlowMul,
      setDiffuseMul,
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
