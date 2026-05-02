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

// Colophon-scene config — black hole visual parameters and lensing
// strength. Mirrors the NebulaeConfigContext localStorage pattern:
// explicit-write-on-change, remove-when-equals-default.

const STORAGE_KEY = {
  visible: 'portfolio:blackhole-visible',
  schwarzschildRadius: 'portfolio:blackhole-schwarzschild-radius',
  diskTilt: 'portfolio:blackhole-disk-tilt',
  diskInnerFactor: 'portfolio:blackhole-disk-inner-factor',
  diskOuterFactor: 'portfolio:blackhole-disk-outer-factor',
  diskBrightness: 'portfolio:blackhole-disk-brightness',
  diskSaturation: 'portfolio:blackhole-disk-saturation',
  diskTurbulence: 'portfolio:blackhole-disk-turbulence',
  diskDrift: 'portfolio:blackhole-disk-drift',
  diskRotationSpeed: 'portfolio:blackhole-disk-rotation-speed',
  dopplerStrength: 'portfolio:blackhole-doppler-strength',
  distortionStrength: 'portfolio:blackhole-distortion-strength',
  photonRing: 'portfolio:blackhole-photon-ring',
  diskClock: 'portfolio:blackhole-disk-clock',
  cameraElevation: 'portfolio:blackhole-camera-elevation',
} as const;

export interface BlackHoleConfigValue {
  readonly visible: boolean;
  readonly schwarzschildRadius: number;
  readonly diskTilt: number;
  readonly diskInnerFactor: number;
  readonly diskOuterFactor: number;
  readonly diskBrightness: number;
  readonly diskSaturation: number;
  readonly diskTurbulence: number;
  readonly diskDrift: boolean;
  readonly diskRotationSpeed: number;
  readonly dopplerStrength: number;
  readonly distortionStrength: number;
  readonly photonRing: boolean;
  readonly diskClock: boolean;
  readonly cameraElevation: number;
  readonly setVisible: (on: boolean) => void;
  readonly setSchwarschildRadius: (n: number) => void;
  readonly setDiskTilt: (n: number) => void;
  readonly setDiskInnerFactor: (n: number) => void;
  readonly setDiskOuterFactor: (n: number) => void;
  readonly setDiskBrightness: (n: number) => void;
  readonly setDiskSaturation: (n: number) => void;
  readonly setDiskTurbulence: (n: number) => void;
  readonly setDiskDrift: (on: boolean) => void;
  readonly setDiskRotationSpeed: (n: number) => void;
  readonly setDopplerStrength: (n: number) => void;
  readonly setDistortionStrength: (n: number) => void;
  readonly setPhotonRing: (on: boolean) => void;
  readonly setDiskClock: (on: boolean) => void;
  readonly setCameraElevation: (n: number) => void;
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

const BlackHoleConfigContext = createContext<BlackHoleConfigValue | null>(null);

export function BlackHoleConfigProvider({ children }: { children: ReactNode }) {
  const D = SCENE_DEFAULTS.blackhole;

  const [visible, setVisibleState] = useState(() => readBoolStored(STORAGE_KEY.visible, D.visible));
  const [schwarzschildRadius, setSchwarschildRadiusState] = useState(() =>
    readNumStored(STORAGE_KEY.schwarzschildRadius, D.schwarzschildRadius),
  );
  const [diskTilt, setDiskTiltState] = useState(() =>
    readNumStored(STORAGE_KEY.diskTilt, D.diskTilt),
  );
  const [diskInnerFactor, setDiskInnerFactorState] = useState(() =>
    readNumStored(STORAGE_KEY.diskInnerFactor, D.diskInnerFactor),
  );
  const [diskOuterFactor, setDiskOuterFactorState] = useState(() =>
    readNumStored(STORAGE_KEY.diskOuterFactor, D.diskOuterFactor),
  );
  const [diskBrightness, setDiskBrightnessState] = useState(() =>
    readNumStored(STORAGE_KEY.diskBrightness, D.diskBrightness),
  );
  const [diskSaturation, setDiskSaturationState] = useState(() =>
    readNumStored(STORAGE_KEY.diskSaturation, D.diskSaturation),
  );
  const [diskTurbulence, setDiskTurbulenceState] = useState(() =>
    readNumStored(STORAGE_KEY.diskTurbulence, D.diskTurbulence),
  );
  const [diskDrift, setDiskDriftState] = useState(() =>
    readBoolStored(STORAGE_KEY.diskDrift, D.diskDrift),
  );
  const [diskRotationSpeed, setDiskRotationSpeedState] = useState(() =>
    readNumStored(STORAGE_KEY.diskRotationSpeed, D.diskRotationSpeed),
  );
  const [dopplerStrength, setDopplerStrengthState] = useState(() =>
    readNumStored(STORAGE_KEY.dopplerStrength, D.dopplerStrength),
  );
  const [distortionStrength, setDistortionStrengthState] = useState(() =>
    readNumStored(STORAGE_KEY.distortionStrength, D.distortionStrength),
  );
  const [photonRing, setPhotonRingState] = useState(() =>
    readBoolStored(STORAGE_KEY.photonRing, D.photonRing),
  );
  const [diskClock, setDiskClockState] = useState(() =>
    readBoolStored(STORAGE_KEY.diskClock, D.diskClock),
  );
  const [cameraElevation, setCameraElevationState] = useState(() =>
    readNumStored(STORAGE_KEY.cameraElevation, D.cameraElevation),
  );

  const setVisible = useCallback(
    (on: boolean) => {
      setVisibleState(on);
      writeBoolStored(STORAGE_KEY.visible, on, D.visible);
    },
    [D.visible],
  );
  const setSchwarschildRadius = useCallback(
    (n: number) => {
      setSchwarschildRadiusState(n);
      writeNumStored(STORAGE_KEY.schwarzschildRadius, n, D.schwarzschildRadius);
    },
    [D.schwarzschildRadius],
  );
  const setDiskTilt = useCallback(
    (n: number) => {
      setDiskTiltState(n);
      writeNumStored(STORAGE_KEY.diskTilt, n, D.diskTilt);
    },
    [D.diskTilt],
  );
  const setDiskInnerFactor = useCallback(
    (n: number) => {
      setDiskInnerFactorState(n);
      writeNumStored(STORAGE_KEY.diskInnerFactor, n, D.diskInnerFactor);
    },
    [D.diskInnerFactor],
  );
  const setDiskOuterFactor = useCallback(
    (n: number) => {
      setDiskOuterFactorState(n);
      writeNumStored(STORAGE_KEY.diskOuterFactor, n, D.diskOuterFactor);
    },
    [D.diskOuterFactor],
  );
  const setDiskBrightness = useCallback(
    (n: number) => {
      setDiskBrightnessState(n);
      writeNumStored(STORAGE_KEY.diskBrightness, n, D.diskBrightness);
    },
    [D.diskBrightness],
  );
  const setDiskSaturation = useCallback(
    (n: number) => {
      setDiskSaturationState(n);
      writeNumStored(STORAGE_KEY.diskSaturation, n, D.diskSaturation);
    },
    [D.diskSaturation],
  );
  const setDiskTurbulence = useCallback(
    (n: number) => {
      setDiskTurbulenceState(n);
      writeNumStored(STORAGE_KEY.diskTurbulence, n, D.diskTurbulence);
    },
    [D.diskTurbulence],
  );
  const setDiskDrift = useCallback(
    (on: boolean) => {
      setDiskDriftState(on);
      writeBoolStored(STORAGE_KEY.diskDrift, on, D.diskDrift);
    },
    [D.diskDrift],
  );
  const setDiskRotationSpeed = useCallback(
    (n: number) => {
      setDiskRotationSpeedState(n);
      writeNumStored(STORAGE_KEY.diskRotationSpeed, n, D.diskRotationSpeed);
    },
    [D.diskRotationSpeed],
  );
  const setDopplerStrength = useCallback(
    (n: number) => {
      setDopplerStrengthState(n);
      writeNumStored(STORAGE_KEY.dopplerStrength, n, D.dopplerStrength);
    },
    [D.dopplerStrength],
  );
  const setDistortionStrength = useCallback(
    (n: number) => {
      setDistortionStrengthState(n);
      writeNumStored(STORAGE_KEY.distortionStrength, n, D.distortionStrength);
    },
    [D.distortionStrength],
  );
  const setPhotonRing = useCallback(
    (on: boolean) => {
      setPhotonRingState(on);
      writeBoolStored(STORAGE_KEY.photonRing, on, D.photonRing);
    },
    [D.photonRing],
  );
  const setDiskClock = useCallback(
    (on: boolean) => {
      setDiskClockState(on);
      writeBoolStored(STORAGE_KEY.diskClock, on, D.diskClock);
    },
    [D.diskClock],
  );
  const setCameraElevation = useCallback(
    (n: number) => {
      setCameraElevationState(n);
      writeNumStored(STORAGE_KEY.cameraElevation, n, D.cameraElevation);
    },
    [D.cameraElevation],
  );

  // Cross-tab sync.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handler = (e: StorageEvent) => {
      switch (e.key) {
        case STORAGE_KEY.visible:
          setVisibleState(readBoolStored(STORAGE_KEY.visible, D.visible));
          break;
        case STORAGE_KEY.schwarzschildRadius:
          setSchwarschildRadiusState(
            readNumStored(STORAGE_KEY.schwarzschildRadius, D.schwarzschildRadius),
          );
          break;
        case STORAGE_KEY.diskTilt:
          setDiskTiltState(readNumStored(STORAGE_KEY.diskTilt, D.diskTilt));
          break;
        case STORAGE_KEY.diskInnerFactor:
          setDiskInnerFactorState(readNumStored(STORAGE_KEY.diskInnerFactor, D.diskInnerFactor));
          break;
        case STORAGE_KEY.diskOuterFactor:
          setDiskOuterFactorState(readNumStored(STORAGE_KEY.diskOuterFactor, D.diskOuterFactor));
          break;
        case STORAGE_KEY.diskBrightness:
          setDiskBrightnessState(readNumStored(STORAGE_KEY.diskBrightness, D.diskBrightness));
          break;
        case STORAGE_KEY.diskSaturation:
          setDiskSaturationState(readNumStored(STORAGE_KEY.diskSaturation, D.diskSaturation));
          break;
        case STORAGE_KEY.diskTurbulence:
          setDiskTurbulenceState(readNumStored(STORAGE_KEY.diskTurbulence, D.diskTurbulence));
          break;
        case STORAGE_KEY.diskDrift:
          setDiskDriftState(readBoolStored(STORAGE_KEY.diskDrift, D.diskDrift));
          break;
        case STORAGE_KEY.diskRotationSpeed:
          setDiskRotationSpeedState(
            readNumStored(STORAGE_KEY.diskRotationSpeed, D.diskRotationSpeed),
          );
          break;
        case STORAGE_KEY.dopplerStrength:
          setDopplerStrengthState(readNumStored(STORAGE_KEY.dopplerStrength, D.dopplerStrength));
          break;
        case STORAGE_KEY.distortionStrength:
          setDistortionStrengthState(
            readNumStored(STORAGE_KEY.distortionStrength, D.distortionStrength),
          );
          break;
        case STORAGE_KEY.photonRing:
          setPhotonRingState(readBoolStored(STORAGE_KEY.photonRing, D.photonRing));
          break;
        case STORAGE_KEY.diskClock:
          setDiskClockState(readBoolStored(STORAGE_KEY.diskClock, D.diskClock));
          break;
        case STORAGE_KEY.cameraElevation:
          setCameraElevationState(readNumStored(STORAGE_KEY.cameraElevation, D.cameraElevation));
          break;
      }
    };
    window.addEventListener('storage', handler);
    return () => window.removeEventListener('storage', handler);
  }, [D]);

  const value = useMemo<BlackHoleConfigValue>(
    () => ({
      visible,
      schwarzschildRadius,
      diskTilt,
      diskInnerFactor,
      diskOuterFactor,
      diskBrightness,
      diskSaturation,
      diskTurbulence,
      diskDrift,
      diskRotationSpeed,
      dopplerStrength,
      distortionStrength,
      photonRing,
      diskClock,
      cameraElevation,
      setVisible,
      setSchwarschildRadius,
      setDiskTilt,
      setDiskInnerFactor,
      setDiskOuterFactor,
      setDiskBrightness,
      setDiskSaturation,
      setDiskTurbulence,
      setDiskDrift,
      setDiskRotationSpeed,
      setDopplerStrength,
      setDistortionStrength,
      setPhotonRing,
      setDiskClock,
      setCameraElevation,
    }),
    [
      visible,
      schwarzschildRadius,
      diskTilt,
      diskInnerFactor,
      diskOuterFactor,
      diskBrightness,
      diskSaturation,
      diskTurbulence,
      diskDrift,
      diskRotationSpeed,
      dopplerStrength,
      distortionStrength,
      photonRing,
      diskClock,
      cameraElevation,
      setVisible,
      setSchwarschildRadius,
      setDiskTilt,
      setDiskInnerFactor,
      setDiskOuterFactor,
      setDiskBrightness,
      setDiskSaturation,
      setDiskTurbulence,
      setDiskDrift,
      setDiskRotationSpeed,
      setDopplerStrength,
      setDistortionStrength,
      setPhotonRing,
      setDiskClock,
      setCameraElevation,
    ],
  );

  return (
    <BlackHoleConfigContext.Provider value={value}>{children}</BlackHoleConfigContext.Provider>
  );
}

export function useBlackHoleConfig(): BlackHoleConfigValue {
  const ctx = useContext(BlackHoleConfigContext);
  if (!ctx) {
    throw new Error('useBlackHoleConfig must be used inside <BlackHoleConfigProvider>');
  }
  return ctx;
}
