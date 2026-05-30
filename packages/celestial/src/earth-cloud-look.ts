// Cloud "look" knobs — brightness, contrast, and coverage threshold —
// polled per-frame by EarthScene and written through each layer material's
// uniforms. Same module-level mutable + localStorage pattern as
// earth-cloud-rate.ts / earth-cloud-opacity.ts so the dev console can write
// values that persist across reloads.
//
// Defaults chosen so a freshly-loaded session looks better than the prior
// flat-sheet behavior without any user intervention.

export const DEFAULT_CLOUD_BRIGHTNESS = 1.6;
export const DEFAULT_CLOUD_CONTRAST = 1.3;
export const DEFAULT_CLOUD_COVERAGE = 0.4;

interface KnobConfig {
  readonly key: string;
  readonly defaultValue: number;
}

const BRIGHTNESS: KnobConfig = {
  key: 'portfolio:earth-cloud-brightness',
  defaultValue: DEFAULT_CLOUD_BRIGHTNESS,
};
const CONTRAST: KnobConfig = {
  key: 'portfolio:earth-cloud-contrast',
  defaultValue: DEFAULT_CLOUD_CONTRAST,
};
const COVERAGE: KnobConfig = {
  key: 'portfolio:earth-cloud-coverage',
  defaultValue: DEFAULT_CLOUD_COVERAGE,
};

let _brightness: number | null = null;
let _contrast: number | null = null;
let _coverage: number | null = null;

function readStored(cfg: KnobConfig): number {
  if (typeof window === 'undefined') return cfg.defaultValue;
  try {
    const raw = window.localStorage.getItem(cfg.key);
    if (raw === null) return cfg.defaultValue;
    const n = Number.parseFloat(raw);
    if (Number.isFinite(n)) return n;
  } catch {
    // localStorage disabled (private mode etc.) — fall through.
  }
  return cfg.defaultValue;
}

function writeStored(cfg: KnobConfig, value: number): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(cfg.key, String(value));
  } catch {
    // best-effort
  }
}

export function getCloudBrightness(): number {
  if (_brightness === null) _brightness = readStored(BRIGHTNESS);
  return _brightness;
}

export function setCloudBrightness(value: number): void {
  _brightness = value;
  writeStored(BRIGHTNESS, value);
}

export function getCloudContrast(): number {
  if (_contrast === null) _contrast = readStored(CONTRAST);
  return _contrast;
}

export function setCloudContrast(value: number): void {
  _contrast = value;
  writeStored(CONTRAST, value);
}

export function getCloudCoverage(): number {
  if (_coverage === null) _coverage = readStored(COVERAGE);
  return _coverage;
}

export function setCloudCoverage(value: number): void {
  _coverage = value;
  writeStored(COVERAGE, value);
}
