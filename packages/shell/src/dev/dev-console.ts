// window.portfolio — dev-only console API for fast scene navigation, UI/
// background visibility toggles, quality switching, and earth test-mode
// control. Tree-shaken from production via import.meta.env.PROD.
//
// Architecture: this module installs the API object on `window.portfolio`
// at module load. The methods that need React state (quality, navigation,
// earth test mode) read from a setter registry that DevConsoleBridge.tsx
// populates on mount via `registerDevAPI()`. Methods that only need DOM
// (ui.* / bg.*) manipulate document.documentElement classList directly —
// no React touch needed.
//
// Methods that need a registry that hasn't filled in yet (e.g. called
// before the bridge mounts) log a warning and no-op; they don't throw.

import {
  getEarthRotationRate,
  setEarthRotationRate,
  getProjectsRingsRotationRate,
  setProjectsRingsRotationRate,
  getProjectsSceneRotationRate,
  setProjectsSceneRotationRate,
  getProjectsBodyRotationRate,
  setProjectsBodyRotationRate,
  setGasGiantRotationRate,
  getLensingActive,
  setLensingActive,
  SCENE_DEFAULTS,
  BLACKHOLE_PRESETS,
} from '@portfolio/celestial';

const HIDE_UI_CLASS = 'dev-hide-ui';
const HIDE_BG_CLASS = 'dev-hide-bg';

type Setter<T> = (v: T) => void;

interface RingsConfig {
  visible: boolean;
  rotationSpeed: number;
  sceneRotationSpeed: number;
  bodyRotationSpeed: number;
  sparkles: boolean;
  clumps: boolean;
  spokes: boolean;
  flow: boolean;
  scenePreserveTilt: boolean;
  clock: boolean;
}

interface BackgroundSetConfig {
  nebulaBrightness: number;
  nebulaSaturation: number;
  starBrightness: number;
}

interface BlackHoleConfig {
  visible: boolean;
  schwarzschildRadius: number;
  diskTilt: number;
  diskInnerFactor: number;
  diskOuterFactor: number;
  diskBrightness: number;
  diskSaturation: number;
  diskTurbulence: number;
  diskDrift: boolean;
  diskRotationSpeed: number;
  dopplerStrength: number;
  distortionStrength: number;
  photonRing: boolean;
  diskClock: boolean;
  cameraElevation: number;
  bloomIntensity: number;
}

type NebulaVariantString = '01' | '02' | '03' | '04';

interface NebulaeConfig {
  variant: NebulaVariantString;
  visible: boolean;
  billboardsVisible: boolean;
  billboardLayerCount: number;
  billboardJitter: number;
  billboardScale: number;
  billboardBrightness: number;
  billboardSaturation: number;
  billboardGlow: number;
  billboardDrift: boolean;
  particlesVisible: boolean;
  particleCount: number;
  particleSize: number;
  particleJitter: number;
  particleBrightness: number;
  particleSaturation: number;
  particleGlow: number;
  particleDrift: boolean;
}

interface DevAPIRegistry {
  setQuality?: Setter<string>;
  navigate?: Setter<string>;
  setEarthTestMode?: Setter<boolean>;
  setEarthPlaceholderMode?: Setter<boolean>;
  setRingsVisible?: Setter<boolean>;
  getRingsVisible?: () => boolean;
  setRingsClockVisible?: Setter<boolean>;
  getRingsClockVisible?: () => boolean;
  setRingsSparkles?: Setter<boolean>;
  getRingsSparkles?: () => boolean;
  setRingsClumps?: Setter<boolean>;
  getRingsClumps?: () => boolean;
  setRingsSpokes?: Setter<boolean>;
  getRingsSpokes?: () => boolean;
  setRingsBandFlow?: Setter<boolean>;
  getRingsBandFlow?: () => boolean;
  setRingsScenePreserveTilt?: Setter<boolean>;
  getRingsScenePreserveTilt?: () => boolean;
  setNebulaVariant?: Setter<NebulaVariantString>;
  getNebulaVariant?: () => NebulaVariantString;
  setNebulaVisible?: Setter<boolean>;
  getNebulaVisible?: () => boolean;
  setBillboardsVisible?: Setter<boolean>;
  getBillboardsVisible?: () => boolean;
  setBillboardLayerCount?: Setter<number>;
  getBillboardLayerCount?: () => number;
  setBillboardJitter?: Setter<number>;
  getBillboardJitter?: () => number;
  setBillboardScale?: Setter<number>;
  getBillboardScale?: () => number;
  setBillboardBrightness?: Setter<number>;
  getBillboardBrightness?: () => number;
  setBillboardSaturation?: Setter<number>;
  getBillboardSaturation?: () => number;
  setBillboardGlow?: Setter<number>;
  getBillboardGlow?: () => number;
  setBillboardDrift?: Setter<boolean>;
  getBillboardDrift?: () => boolean;
  setParticlesVisible?: Setter<boolean>;
  getParticlesVisible?: () => boolean;
  setParticleCount?: Setter<number>;
  getParticleCount?: () => number;
  setParticleSize?: Setter<number>;
  getParticleSize?: () => number;
  setParticleJitter?: Setter<number>;
  getParticleJitter?: () => number;
  setParticleBrightness?: Setter<number>;
  getParticleBrightness?: () => number;
  setParticleSaturation?: Setter<number>;
  getParticleSaturation?: () => number;
  setParticleGlow?: Setter<number>;
  getParticleGlow?: () => number;
  setParticleDrift?: Setter<boolean>;
  getParticleDrift?: () => boolean;
  // Black hole (colophon scene)
  setBhVisible?: Setter<boolean>;
  getBhVisible?: () => boolean;
  setBhSchwarschildRadius?: Setter<number>;
  getBhSchwarschildRadius?: () => number;
  setBhDiskTilt?: Setter<number>;
  getBhDiskTilt?: () => number;
  setBhDiskInnerFactor?: Setter<number>;
  getBhDiskInnerFactor?: () => number;
  setBhDiskOuterFactor?: Setter<number>;
  getBhDiskOuterFactor?: () => number;
  setBhDiskBrightness?: Setter<number>;
  getBhDiskBrightness?: () => number;
  setBhDiskSaturation?: Setter<number>;
  getBhDiskSaturation?: () => number;
  setBhDiskTurbulence?: Setter<number>;
  getBhDiskTurbulence?: () => number;
  setBhDiskDrift?: Setter<boolean>;
  getBhDiskDrift?: () => boolean;
  setBhDiskRotationSpeed?: Setter<number>;
  getBhDiskRotationSpeed?: () => number;
  setBhDopplerStrength?: Setter<number>;
  getBhDopplerStrength?: () => number;
  setBhDistortionStrength?: Setter<number>;
  getBhDistortionStrength?: () => number;
  setBhPhotonRing?: Setter<boolean>;
  getBhPhotonRing?: () => boolean;
  setBhDiskClock?: Setter<boolean>;
  getBhDiskClock?: () => boolean;
  setBhCameraElevation?: Setter<number>;
  getBhCameraElevation?: () => number;
  setBhBloomIntensity?: Setter<number>;
  getBhBloomIntensity?: () => number;
  // Background sky — three independent sets (global / colophon / cubemap),
  // each a {nebulaBrightness, nebulaSaturation, starBrightness} triple.
  getBgGlobal?: () => BackgroundSetConfig;
  setBgGlobal?: (partial: Partial<BackgroundSetConfig>) => void;
  getBgColophon?: () => BackgroundSetConfig;
  setBgColophon?: (partial: Partial<BackgroundSetConfig>) => void;
  getBgCubemap?: () => BackgroundSetConfig;
  setBgCubemap?: (partial: Partial<BackgroundSetConfig>) => void;
  resetBackgroundConfig?: () => void;
}

const NEBULA_VARIANT_VALUES: readonly NebulaVariantString[] = ['01', '02', '03', '04'];

function isNebulaVariant(v: unknown): v is NebulaVariantString {
  return typeof v === 'string' && (NEBULA_VARIANT_VALUES as readonly string[]).includes(v);
}

const registry: DevAPIRegistry = {};

// Scene-defaults reset helpers. Each writes every per-scene setter
// back to its SCENE_DEFAULTS value; the localStorage write-explicit-
// remove-default convention also clears the persisted entry.

function resetEarthDefaults(): void {
  setEarthRotationRate(SCENE_DEFAULTS.earth.rotationRate);
  registry.setEarthTestMode?.(SCENE_DEFAULTS.earth.testMode);
  registry.setEarthPlaceholderMode?.(SCENE_DEFAULTS.earth.placeholderMode);
  console.log('[portfolio] earth defaults reset');
}

function resetRingsDefaults(): void {
  setProjectsRingsRotationRate(SCENE_DEFAULTS.projects.ringsRotationSpeed);
  setProjectsSceneRotationRate(SCENE_DEFAULTS.projects.sceneRotationSpeed);
  setProjectsBodyRotationRate(SCENE_DEFAULTS.projects.bodyRotationSpeed);
  setGasGiantRotationRate(SCENE_DEFAULTS.projects.gasGiantRotationRate);
  registry.setRingsVisible?.(SCENE_DEFAULTS.projects.ringsVisible);
  registry.setRingsClockVisible?.(SCENE_DEFAULTS.projects.clock);
  registry.setRingsSparkles?.(SCENE_DEFAULTS.projects.sparkles);
  registry.setRingsClumps?.(SCENE_DEFAULTS.projects.clumps);
  registry.setRingsSpokes?.(SCENE_DEFAULTS.projects.spokes);
  registry.setRingsBandFlow?.(SCENE_DEFAULTS.projects.flow);
  registry.setRingsScenePreserveTilt?.(SCENE_DEFAULTS.projects.scenePreserveTilt);
  console.log('[portfolio] rings defaults reset');
}

function resetNebulaeDefaults(): void {
  const D = SCENE_DEFAULTS.contact;
  registry.setNebulaVariant?.(D.variant);
  registry.setNebulaVisible?.(D.visible);
  registry.setBillboardsVisible?.(D.billboardsVisible);
  registry.setBillboardLayerCount?.(D.billboardLayerCount);
  registry.setBillboardJitter?.(D.billboardJitter);
  registry.setBillboardScale?.(D.billboardScale);
  registry.setBillboardBrightness?.(D.billboardBrightness);
  registry.setBillboardSaturation?.(D.billboardSaturation);
  registry.setBillboardGlow?.(D.billboardGlow);
  registry.setBillboardDrift?.(D.billboardDrift);
  registry.setParticlesVisible?.(D.particlesVisible);
  registry.setParticleCount?.(D.particleCount);
  registry.setParticleSize?.(D.particleSize);
  registry.setParticleJitter?.(D.particleJitter);
  registry.setParticleBrightness?.(D.particleBrightness);
  registry.setParticleSaturation?.(D.particleSaturation);
  registry.setParticleGlow?.(D.particleGlow);
  registry.setParticleDrift?.(D.particleDrift);
  console.log('[portfolio] nebulae defaults reset');
}

function resetBlackHoleDefaults(): void {
  const D = SCENE_DEFAULTS.blackhole;
  registry.setBhVisible?.(D.visible);
  registry.setBhSchwarschildRadius?.(D.schwarzschildRadius);
  registry.setBhDiskTilt?.(D.diskTilt);
  registry.setBhDiskInnerFactor?.(D.diskInnerFactor);
  registry.setBhDiskOuterFactor?.(D.diskOuterFactor);
  registry.setBhDiskBrightness?.(D.diskBrightness);
  registry.setBhDiskSaturation?.(D.diskSaturation);
  registry.setBhDiskTurbulence?.(D.diskTurbulence);
  registry.setBhDiskDrift?.(D.diskDrift);
  registry.setBhDiskRotationSpeed?.(D.diskRotationSpeed);
  registry.setBhDopplerStrength?.(D.dopplerStrength);
  registry.setBhDistortionStrength?.(D.distortionStrength);
  registry.setBhPhotonRing?.(D.photonRing);
  registry.setBhDiskClock?.(D.diskClock);
  registry.setBhCameraElevation?.(D.cameraElevation);
  registry.setBhBloomIntensity?.(D.bloomIntensity);
  console.log('[portfolio] blackhole defaults reset');
}

export function registerDevAPI(partial: DevAPIRegistry): void {
  Object.assign(registry, partial);
}

function ensureWindow(): boolean {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function setBodyClass(cls: string, on: boolean): void {
  document.documentElement.classList.toggle(cls, on);
}

function hasBodyClass(cls: string): boolean {
  return document.documentElement.classList.contains(cls);
}

function notRegistered(method: string): void {
  console.warn(`[portfolio] ${method} called before DevConsoleBridge mounted; ignored.`);
}

// Section ids for `portfolio.go(scene)`. Mirror MainPage's SECTIONS.
const SCENE_IDS = ['home', 'about', 'projects', 'contact', 'colophon'] as const;
type SceneId = (typeof SCENE_IDS)[number];

function isSceneId(s: string): s is SceneId {
  return (SCENE_IDS as readonly string[]).includes(s);
}

// Quality friendly-name aliases.
const QUALITY_ALIASES: Record<string, string> = {
  full: 'quality',
  still: 'static',
  lite: 'simple',
  quality: 'quality',
  static: 'static',
  simple: 'simple',
};

function normalizeQuality(q: string): string | null {
  return QUALITY_ALIASES[q.toLowerCase()] ?? null;
}

const BG_SET_KEYS = ['nebulaBrightness', 'nebulaSaturation', 'starBrightness'] as const;
type BgSetName = 'global' | 'colophon' | 'cubemap';

interface BgSetApi {
  config(partial?: Record<string, unknown>): BackgroundSetConfig | void;
}

// Each of bg.global / bg.colophon / bg.cubemap exposes the same `config()`
// shape. The getter / setter are looked up via the registry name so the
// helper survives the bridge mounting later than module-load.
function makeBgSetApi(name: BgSetName, defaults: () => BackgroundSetConfig): BgSetApi {
  const getterKey = `getBg${name.charAt(0).toUpperCase() + name.slice(1)}` as
    | 'getBgGlobal'
    | 'getBgColophon'
    | 'getBgCubemap';
  const setterKey = `setBg${name.charAt(0).toUpperCase() + name.slice(1)}` as
    | 'setBgGlobal'
    | 'setBgColophon'
    | 'setBgCubemap';
  return {
    config(partial?: Record<string, unknown>): BackgroundSetConfig | void {
      const getter = registry[getterKey];
      const setter = registry[setterKey];
      if (partial === undefined) {
        return getter ? getter() : defaults();
      }
      if (typeof partial !== 'object' || partial === null) {
        console.warn(`[portfolio] bg.${name}.config(json): json must be an object.`);
        return;
      }
      if (!setter) return notRegistered(`bg.${name}.config`);
      const out: Partial<BackgroundSetConfig> = {};
      for (const key of BG_SET_KEYS) {
        if (!(key in partial)) continue;
        const v = partial[key];
        if (typeof v !== 'number' || !Number.isFinite(v) || v < 0) {
          console.warn(
            `[portfolio] bg.${name}.config: ${key} must be a non-negative finite number; skipping.`,
          );
          continue;
        }
        out[key] = v;
      }
      if (Object.keys(out).length > 0) setter(out);
    },
  };
}

export function installDevConsole(): void {
  if (import.meta.env.PROD) return;
  if (!ensureWindow()) return;
  if ((window as unknown as { portfolio?: unknown }).portfolio) return;

  const api = {
    // Navigate to a section (scrolls smoothly) or a path (React Router).
    //   portfolio.go('about')
    //   portfolio.go('/en/projects/some-slug')
    go(target: string): void {
      if (typeof target !== 'string' || !target) {
        console.warn('[portfolio] go(target): target must be a non-empty string');
        return;
      }
      if (target.startsWith('/')) {
        if (!registry.navigate) return notRegistered('go');
        registry.navigate(target);
        return;
      }
      if (!isSceneId(target)) {
        console.warn(
          `[portfolio] go('${target}'): unknown scene. Valid: ${SCENE_IDS.join(', ')} or a path starting with '/'.`,
        );
        return;
      }
      const el = document.getElementById(target);
      if (!el) {
        console.warn(`[portfolio] go('${target}'): no #${target} on page (not on MainPage?).`);
        return;
      }
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    // Quality. Accepts canonical ('quality'|'static'|'simple') or friendly ('full'|'still'|'lite').
    quality(q: string): void {
      const norm = typeof q === 'string' ? normalizeQuality(q) : null;
      if (!norm) {
        console.warn(
          `[portfolio] quality(q): q must be one of full|still|lite (or quality|static|simple).`,
        );
        return;
      }
      if (!registry.setQuality) return notRegistered('quality');
      registry.setQuality(norm);
    },

    // UI chrome (header, rail, footer) — body-class toggle, no React state.
    ui: {
      hide(): void {
        setBodyClass(HIDE_UI_CLASS, true);
      },
      show(): void {
        setBodyClass(HIDE_UI_CLASS, false);
      },
      toggle(): void {
        setBodyClass(HIDE_UI_CLASS, !hasBodyClass(HIDE_UI_CLASS));
      },
    },

    // Celestial backdrop (z-0 layer) — body-class toggle + per-set
    // background-sky configuration.
    bg: {
      hide(): void {
        setBodyClass(HIDE_BG_CLASS, true);
      },
      show(): void {
        setBodyClass(HIDE_BG_CLASS, false);
      },
      toggle(): void {
        setBodyClass(HIDE_BG_CLASS, !hasBodyClass(HIDE_BG_CLASS));
      },

      // Three independent background-sky sets, each with the same three
      // knobs (nebulaBrightness, nebulaSaturation, starBrightness).
      //   global   — used in earth / projects / contact (no lensing pass)
      //   colophon — used while the colophon's EffectComposer is mounted
      //              (compensates for the no-tone-mapping brightening)
      //   cubemap  — applied to the BH-centered StarfieldCubemap that the
      //              geodesic shader samples for deflected background light.
      //              Cubemap re-renders on the fly (~1ms) when this set is
      //              mutated so the change is visible without remounting.
      // Usage:
      //   portfolio.bg.global.config()                          → snapshot
      //   portfolio.bg.global.config({ nebulaBrightness: 0.5 })
      //   portfolio.bg.colophon.config({ starBrightness: 0.3 })
      //   portfolio.bg.cubemap.config({ nebulaSaturation: 0 })
      //   portfolio.bg.reset()                                  → restore all
      global: makeBgSetApi('global', () => SCENE_DEFAULTS.background.global),
      colophon: makeBgSetApi('colophon', () => SCENE_DEFAULTS.background.colophon),
      cubemap: makeBgSetApi('cubemap', () => SCENE_DEFAULTS.background.cubemap),
      reset(): void {
        if (!registry.resetBackgroundConfig) return notRegistered('bg.reset');
        registry.resetBackgroundConfig();
        console.log('[portfolio] background sets reset to defaults');
      },
    },

    // Earth test mode + rotation control.
    earth: {
      // portfolio.earth.test()       → on
      // portfolio.earth.test(true)   → on
      // portfolio.earth.test(false)  → off
      test(on: boolean = true): void {
        if (!registry.setEarthTestMode) return notRegistered('earth.test');
        registry.setEarthTestMode(Boolean(on));
      },

      // portfolio.earth.placeholder()       → on
      // portfolio.earth.placeholder(true)   → on
      // portfolio.earth.placeholder(false)  → off
      // Forces the canvas-drawn placeholder day/night maps regardless of
      // whether real Blue Marble webps have loaded. Also makes the city
      // dots visible (lambert-aware: dim red on day side, bright yellow
      // city-lights glow on night side).
      placeholder(on: boolean = true): void {
        if (!registry.setEarthPlaceholderMode) return notRegistered('earth.placeholder');
        registry.setEarthPlaceholderMode(Boolean(on));
      },

      // Get/set earth auto-rotation rate.
      //   portfolio.earth.rotationSpeed()        → number (rad/sec)
      //   portfolio.earth.rotationSpeed(0.025)   → set default speed
      //   portfolio.earth.rotationSpeed(-0.025)  → reverse at default speed
      //   portfolio.earth.rotationSpeed(0)       → halt
      rotationSpeed(rate?: number): number | void {
        if (rate === undefined) return getEarthRotationRate();
        if (typeof rate !== 'number' || !Number.isFinite(rate)) {
          console.warn(`[portfolio] earth.rotationSpeed(rate): rate must be a finite number.`);
          return;
        }
        setEarthRotationRate(rate);
      },

      reset: resetEarthDefaults,
    },

    // Projects-scene rings — show/hide and rotation control.
    rings: {
      // portfolio.rings.show()    → on
      // portfolio.rings.hide()    → off
      // portfolio.rings.toggle()  → flip
      show(): void {
        if (!registry.setRingsVisible) return notRegistered('rings.show');
        registry.setRingsVisible(true);
      },
      hide(): void {
        if (!registry.setRingsVisible) return notRegistered('rings.hide');
        registry.setRingsVisible(false);
      },
      toggle(): void {
        if (!registry.setRingsVisible || !registry.getRingsVisible) {
          return notRegistered('rings.toggle');
        }
        registry.setRingsVisible(!registry.getRingsVisible());
      },

      // Get/set the projects-scene ring orbit rate (the K constant in the
      // Keplerian formula ω = K / sqrt(r); inner ring orbits faster than
      // outer regardless of value, this just scales the whole pattern).
      //   portfolio.rings.rotationSpeed()       → number
      //   portfolio.rings.rotationSpeed(0.02)   → set default speed
      //   portfolio.rings.rotationSpeed(0.05)   → faster (still gentle)
      //   portfolio.rings.rotationSpeed(-0.02)  → reverse (clockwise from north)
      //   portfolio.rings.rotationSpeed(0)      → halt
      rotationSpeed(rate?: number): number | void {
        if (rate === undefined) return getProjectsRingsRotationRate();
        if (typeof rate !== 'number' || !Number.isFinite(rate)) {
          console.warn(`[portfolio] rings.rotationSpeed(rate): rate must be a finite number.`);
          return;
        }
        setProjectsRingsRotationRate(rate);
      },

      // Whole-scene angular velocity (rad/s) around its local Y axis.
      // Independent of the Keplerian K — this is a uniform spin of
      // the entire projects group. Default 0.
      //   portfolio.rings.sceneRotationSpeed()       → number
      //   portfolio.rings.sceneRotationSpeed(0.2)    → set
      sceneRotationSpeed(rate?: number): number | void {
        if (rate === undefined) return getProjectsSceneRotationRate();
        if (typeof rate !== 'number' || !Number.isFinite(rate)) {
          console.warn(`[portfolio] rings.sceneRotationSpeed(rate): rate must be a finite number.`);
          return;
        }
        setProjectsSceneRotationRate(rate);
      },

      // Gas-giant body angular velocity (rad/s) around its local Y axis.
      // Independent of scene rotation. Set to -sceneRotationSpeed to
      // keep the body visually static while the rings spin around it.
      // Default 0.
      //   portfolio.rings.bodyRotationSpeed()        → number
      //   portfolio.rings.bodyRotationSpeed(-0.2)    → counter-rotate at 0.2 rad/s
      bodyRotationSpeed(rate?: number): number | void {
        if (rate === undefined) return getProjectsBodyRotationRate();
        if (typeof rate !== 'number' || !Number.isFinite(rate)) {
          console.warn(`[portfolio] rings.bodyRotationSpeed(rate): rate must be a finite number.`);
          return;
        }
        setProjectsBodyRotationRate(rate);
      },

      // Unified get/set as JSON.
      //   portfolio.rings.config()        → all current properties
      //   portfolio.rings.config({ ... }) → apply each provided property
      // Unknown keys are ignored; invalid values for a known key are
      // skipped with a warning. Useful for snapshotting / restoring a
      // visual configuration as a single object.
      config(partial?: Record<string, unknown>): RingsConfig | void {
        if (partial === undefined) {
          return {
            visible: registry.getRingsVisible?.() ?? true,
            rotationSpeed: getProjectsRingsRotationRate(),
            sceneRotationSpeed: getProjectsSceneRotationRate(),
            bodyRotationSpeed: getProjectsBodyRotationRate(),
            sparkles: registry.getRingsSparkles?.() ?? true,
            clumps: registry.getRingsClumps?.() ?? true,
            spokes: registry.getRingsSpokes?.() ?? false,
            flow: registry.getRingsBandFlow?.() ?? true,
            scenePreserveTilt: registry.getRingsScenePreserveTilt?.() ?? true,
            clock: registry.getRingsClockVisible?.() ?? false,
          };
        }
        if (typeof partial !== 'object' || partial === null) {
          console.warn('[portfolio] rings.config(json): json must be an object.');
          return;
        }
        const setBool = (key: string, setter?: Setter<boolean>): void => {
          if (!(key in partial)) return;
          if (!setter) return;
          setter(Boolean(partial[key]));
        };
        const setNum = (key: string, setter: (n: number) => void): void => {
          if (!(key in partial)) return;
          const v = partial[key];
          if (typeof v !== 'number' || !Number.isFinite(v)) {
            console.warn(`[portfolio] rings.config: ${key} must be a finite number; skipping.`);
            return;
          }
          setter(v);
        };
        setBool('visible', registry.setRingsVisible);
        setNum('rotationSpeed', setProjectsRingsRotationRate);
        setNum('sceneRotationSpeed', setProjectsSceneRotationRate);
        setNum('bodyRotationSpeed', setProjectsBodyRotationRate);
        setBool('sparkles', registry.setRingsSparkles);
        setBool('clumps', registry.setRingsClumps);
        setBool('spokes', registry.setRingsSpokes);
        setBool('flow', registry.setRingsBandFlow);
        setBool('scenePreserveTilt', registry.setRingsScenePreserveTilt);
        setBool('clock', registry.setRingsClockVisible);
      },

      // Clock-marker overlay (12/3/6/9 numerals at cardinal positions
      // on the ring; orbit at the mid-B-ring's Keplerian rate). Off by
      // default — diagnostic for verifying ring rotation is happening.
      //   portfolio.rings.clock.show() / hide() / toggle()
      clock: {
        show(): void {
          if (!registry.setRingsClockVisible) return notRegistered('rings.clock.show');
          registry.setRingsClockVisible(true);
        },
        hide(): void {
          if (!registry.setRingsClockVisible) return notRegistered('rings.clock.hide');
          registry.setRingsClockVisible(false);
        },
        toggle(): void {
          if (!registry.setRingsClockVisible || !registry.getRingsClockVisible) {
            return notRegistered('rings.clock.toggle');
          }
          registry.setRingsClockVisible(!registry.getRingsClockVisible());
        },
      },

      // Effect A: sparkle particles. ~0.4% of total particles bumped
      // to ~0.5-1.0 size — eye-trackable as individual ice chunks.
      // Default ON. Toggling regenerates the buffer.
      //   portfolio.rings.sparkles.show() / hide() / toggle()
      sparkles: {
        show(): void {
          if (!registry.setRingsSparkles) return notRegistered('rings.sparkles.show');
          registry.setRingsSparkles(true);
        },
        hide(): void {
          if (!registry.setRingsSparkles) return notRegistered('rings.sparkles.hide');
          registry.setRingsSparkles(false);
        },
        toggle(): void {
          if (!registry.setRingsSparkles || !registry.getRingsSparkles) {
            return notRegistered('rings.sparkles.toggle');
          }
          registry.setRingsSparkles(!registry.getRingsSparkles());
        },
      },

      // Effect B: azimuthal density clumps. Particles are distributed
      // non-uniformly around the ring via 1D harmonic noise — denser
      // sectors visibly travel as the ring rotates.
      // Default ON. Toggling regenerates the buffer.
      //   portfolio.rings.clumps.show() / hide() / toggle()
      clumps: {
        show(): void {
          if (!registry.setRingsClumps) return notRegistered('rings.clumps.show');
          registry.setRingsClumps(true);
        },
        hide(): void {
          if (!registry.setRingsClumps) return notRegistered('rings.clumps.hide');
          registry.setRingsClumps(false);
        },
        toggle(): void {
          if (!registry.setRingsClumps || !registry.getRingsClumps) {
            return notRegistered('rings.clumps.toggle');
          }
          registry.setRingsClumps(!registry.getRingsClumps());
        },
      },

      // Effect C: radial spokes. 4 dark sectors rotate at the mid-B
      // Keplerian rate, dimming particles inside them. Saturn's
      // B-ring spoke phenomenon analogue. Default OFF.
      //   portfolio.rings.spokes.show() / hide() / toggle()
      spokes: {
        show(): void {
          if (!registry.setRingsSpokes) return notRegistered('rings.spokes.show');
          registry.setRingsSpokes(true);
        },
        hide(): void {
          if (!registry.setRingsSpokes) return notRegistered('rings.spokes.hide');
          registry.setRingsSpokes(false);
        },
        toggle(): void {
          if (!registry.setRingsSpokes || !registry.getRingsSpokes) {
            return notRegistered('rings.spokes.toggle');
          }
          registry.setRingsSpokes(!registry.getRingsSpokes());
        },
      },

      // Effect D: animated band texture. Each colored ring band gets
      // an FBM noise overlay scrolled at its own Keplerian rate, so
      // the haze appears to flow around the ring. Default ON.
      //   portfolio.rings.flow.show() / hide() / toggle()
      flow: {
        show(): void {
          if (!registry.setRingsBandFlow) return notRegistered('rings.flow.show');
          registry.setRingsBandFlow(true);
        },
        hide(): void {
          if (!registry.setRingsBandFlow) return notRegistered('rings.flow.hide');
          registry.setRingsBandFlow(false);
        },
        toggle(): void {
          if (!registry.setRingsBandFlow || !registry.getRingsBandFlow) {
            return notRegistered('rings.flow.toggle');
          }
          registry.setRingsBandFlow(!registry.getRingsBandFlow());
        },
      },

      reset: resetRingsDefaults,
    },

    // Contact-scene nebulae. Lighter dev surface than rings — only
    // config() get/set + variant() shortcut. Tune density / dive /
    // drift / stepCount via config({...}) partial-set.
    nebulae: {
      // Get the active variant or set a new one. Variant changes are
      // synced to the URL (?neb=01..04 via history.replaceState) so
      // the deep link reflects current state.
      //   portfolio.nebulae.variant()       → '01' | '02' | '03' | '04'
      //   portfolio.nebulae.variant('03')   → set + URL sync
      variant(v?: string): NebulaVariantString | void {
        if (v === undefined) {
          if (!registry.getNebulaVariant) return notRegistered('nebulae.variant');
          return registry.getNebulaVariant();
        }
        if (!isNebulaVariant(v)) {
          console.warn(
            `[portfolio] nebulae.variant(v): v must be one of ${NEBULA_VARIANT_VALUES.join(' | ')}.`,
          );
          return;
        }
        if (!registry.setNebulaVariant) return notRegistered('nebulae.variant');
        registry.setNebulaVariant(v);
      },

      // Unified get/set as JSON. Schema mirrors NebulaeConfigContext:
      //   { variant, visible,
      //     billboardsVisible, billboardLayerCount, billboardJitter,
      //     billboardScale, billboardBrightness, billboardSaturation,
      //     billboardGlow, billboardDrift,
      //     particlesVisible, particleCount, particleSize, particleJitter,
      //     particleBrightness, particleSaturation, particleGlow, particleDrift }
      //   portfolio.nebulae.config()                            → snapshot
      //   portfolio.nebulae.config({ particleCount: 50000 })    → partial set
      //   portfolio.nebulae.config({ billboardsVisible: false })
      // Unknown keys ignored; invalid values for known keys skipped
      // with a warning.
      config(partial?: Record<string, unknown>): NebulaeConfig | void {
        if (partial === undefined) {
          const D = SCENE_DEFAULTS.contact;
          return {
            variant: registry.getNebulaVariant?.() ?? D.variant,
            visible: registry.getNebulaVisible?.() ?? D.visible,
            billboardsVisible: registry.getBillboardsVisible?.() ?? D.billboardsVisible,
            billboardLayerCount: registry.getBillboardLayerCount?.() ?? D.billboardLayerCount,
            billboardJitter: registry.getBillboardJitter?.() ?? D.billboardJitter,
            billboardScale: registry.getBillboardScale?.() ?? D.billboardScale,
            billboardBrightness: registry.getBillboardBrightness?.() ?? D.billboardBrightness,
            billboardSaturation: registry.getBillboardSaturation?.() ?? D.billboardSaturation,
            billboardGlow: registry.getBillboardGlow?.() ?? D.billboardGlow,
            billboardDrift: registry.getBillboardDrift?.() ?? D.billboardDrift,
            particlesVisible: registry.getParticlesVisible?.() ?? D.particlesVisible,
            particleCount: registry.getParticleCount?.() ?? D.particleCount,
            particleSize: registry.getParticleSize?.() ?? D.particleSize,
            particleJitter: registry.getParticleJitter?.() ?? D.particleJitter,
            particleBrightness: registry.getParticleBrightness?.() ?? D.particleBrightness,
            particleSaturation: registry.getParticleSaturation?.() ?? D.particleSaturation,
            particleGlow: registry.getParticleGlow?.() ?? D.particleGlow,
            particleDrift: registry.getParticleDrift?.() ?? D.particleDrift,
          };
        }
        if (typeof partial !== 'object' || partial === null) {
          console.warn('[portfolio] nebulae.config(json): json must be an object.');
          return;
        }
        const setBool = (key: string, setter?: Setter<boolean>): void => {
          if (!(key in partial)) return;
          if (!setter) return;
          setter(Boolean(partial[key]));
        };
        const setNum = (key: string, setter?: Setter<number>, min?: number, max?: number): void => {
          if (!(key in partial)) return;
          if (!setter) return;
          const v = partial[key];
          if (typeof v !== 'number' || !Number.isFinite(v)) {
            console.warn(`[portfolio] nebulae.config: ${key} must be a finite number; skipping.`);
            return;
          }
          if (min !== undefined && v < min) {
            console.warn(`[portfolio] nebulae.config: ${key} must be >= ${min}; skipping.`);
            return;
          }
          if (max !== undefined && v > max) {
            console.warn(`[portfolio] nebulae.config: ${key} must be <= ${max}; skipping.`);
            return;
          }
          setter(v);
        };
        if ('variant' in partial) {
          const v = partial.variant;
          if (!isNebulaVariant(v)) {
            console.warn(
              `[portfolio] nebulae.config: variant must be one of ${NEBULA_VARIANT_VALUES.join(' | ')}; skipping.`,
            );
          } else if (registry.setNebulaVariant) {
            registry.setNebulaVariant(v);
          }
        }
        setBool('visible', registry.setNebulaVisible);
        setBool('billboardsVisible', registry.setBillboardsVisible);
        setNum('billboardLayerCount', registry.setBillboardLayerCount, 1, 5);
        setNum('billboardJitter', registry.setBillboardJitter, 0);
        setNum('billboardScale', registry.setBillboardScale, 0);
        setNum('billboardBrightness', registry.setBillboardBrightness, 0);
        setNum('billboardSaturation', registry.setBillboardSaturation, 0);
        setNum('billboardGlow', registry.setBillboardGlow, 0);
        setBool('billboardDrift', registry.setBillboardDrift);
        setBool('particlesVisible', registry.setParticlesVisible);
        setNum('particleCount', registry.setParticleCount, 0, 200000);
        setNum('particleSize', registry.setParticleSize, 0);
        setNum('particleJitter', registry.setParticleJitter, 0);
        setNum('particleBrightness', registry.setParticleBrightness, 0);
        setNum('particleSaturation', registry.setParticleSaturation, 0);
        setNum('particleGlow', registry.setParticleGlow, 0);
        setBool('particleDrift', registry.setParticleDrift);
      },

      reset: resetNebulaeDefaults,
    },

    // Colophon-scene black hole.
    blackhole: {
      // Unified get/set as JSON. Schema mirrors BlackHoleConfigContext.
      //   portfolio.blackhole.config()                              → snapshot
      //   portfolio.blackhole.config({ diskTilt: 30 })             → partial set
      //   portfolio.blackhole.config({ distortionStrength: 0 })    → disable lensing
      config(partial?: Record<string, unknown>): BlackHoleConfig | void {
        if (partial === undefined) {
          const D = SCENE_DEFAULTS.blackhole;
          return {
            visible: registry.getBhVisible?.() ?? D.visible,
            schwarzschildRadius: registry.getBhSchwarschildRadius?.() ?? D.schwarzschildRadius,
            diskTilt: registry.getBhDiskTilt?.() ?? D.diskTilt,
            diskInnerFactor: registry.getBhDiskInnerFactor?.() ?? D.diskInnerFactor,
            diskOuterFactor: registry.getBhDiskOuterFactor?.() ?? D.diskOuterFactor,
            diskBrightness: registry.getBhDiskBrightness?.() ?? D.diskBrightness,
            diskSaturation: registry.getBhDiskSaturation?.() ?? D.diskSaturation,
            diskTurbulence: registry.getBhDiskTurbulence?.() ?? D.diskTurbulence,
            diskDrift: registry.getBhDiskDrift?.() ?? D.diskDrift,
            diskRotationSpeed: registry.getBhDiskRotationSpeed?.() ?? D.diskRotationSpeed,
            dopplerStrength: registry.getBhDopplerStrength?.() ?? D.dopplerStrength,
            distortionStrength: registry.getBhDistortionStrength?.() ?? D.distortionStrength,
            photonRing: registry.getBhPhotonRing?.() ?? D.photonRing,
            diskClock: registry.getBhDiskClock?.() ?? D.diskClock,
            cameraElevation: registry.getBhCameraElevation?.() ?? D.cameraElevation,
            bloomIntensity: registry.getBhBloomIntensity?.() ?? D.bloomIntensity,
          };
        }
        if (typeof partial !== 'object' || partial === null) {
          console.warn('[portfolio] blackhole.config(json): json must be an object.');
          return;
        }
        const setBool = (key: string, setter?: Setter<boolean>): void => {
          if (!(key in partial) || !setter) return;
          setter(Boolean(partial[key]));
        };
        const setNum = (key: string, setter?: Setter<number>, min?: number, max?: number): void => {
          if (!(key in partial) || !setter) return;
          const v = partial[key];
          if (typeof v !== 'number' || !Number.isFinite(v)) {
            console.warn(`[portfolio] blackhole.config: ${key} must be a finite number; skipping.`);
            return;
          }
          if (min !== undefined && v < min) {
            console.warn(`[portfolio] blackhole.config: ${key} must be >= ${min}; skipping.`);
            return;
          }
          if (max !== undefined && v > max) {
            console.warn(`[portfolio] blackhole.config: ${key} must be <= ${max}; skipping.`);
            return;
          }
          setter(v);
        };
        setBool('visible', registry.setBhVisible);
        setNum('schwarzschildRadius', registry.setBhSchwarschildRadius, 0.1);
        setNum('diskTilt', registry.setBhDiskTilt, 0, 90);
        setNum('diskInnerFactor', registry.setBhDiskInnerFactor, 1);
        setNum('diskOuterFactor', registry.setBhDiskOuterFactor, 1);
        setNum('diskBrightness', registry.setBhDiskBrightness, 0);
        setNum('diskSaturation', registry.setBhDiskSaturation, 0);
        setNum('diskTurbulence', registry.setBhDiskTurbulence, 0, 1);
        setBool('diskDrift', registry.setBhDiskDrift);
        setNum('diskRotationSpeed', registry.setBhDiskRotationSpeed, 0);
        setNum('dopplerStrength', registry.setBhDopplerStrength, 0, 1);
        setNum('distortionStrength', registry.setBhDistortionStrength, 0);
        setBool('photonRing', registry.setBhPhotonRing);
        setBool('diskClock', registry.setBhDiskClock);
        setNum('cameraElevation', registry.setBhCameraElevation);
        setNum('bloomIntensity', registry.setBhBloomIntensity, 0);
      },

      // Named presets. Apply via:
      //   portfolio.blackhole.config(portfolio.blackhole.presets.m87)
      //   portfolio.blackhole.config(portfolio.blackhole.presets.gargantua)
      presets: BLACKHOLE_PRESETS,

      // Clock-marker overlay (12-hour labels in the disk plane).
      // Due to gravitational lensing all 12 positions are simultaneously
      // visible even though half are geometrically behind the shadow sphere.
      //   portfolio.blackhole.clock.show() / hide() / toggle()
      clock: {
        show(): void {
          if (!registry.setBhDiskClock) return notRegistered('blackhole.clock.show');
          registry.setBhDiskClock(true);
        },
        hide(): void {
          if (!registry.setBhDiskClock) return notRegistered('blackhole.clock.hide');
          registry.setBhDiskClock(false);
        },
        toggle(): void {
          if (!registry.setBhDiskClock || !registry.getBhDiskClock) {
            return notRegistered('blackhole.clock.toggle');
          }
          registry.setBhDiskClock(!registry.getBhDiskClock());
        },
      },

      // EffectComposer mount gate. Canvas3D auto-mounts the post-process
      // pass on colophon entry (after the camera tween) and unmounts on
      // exit; this lets you override that for debugging. Manual writes
      // win until the next scene transition, after which the auto-logic
      // takes over again.
      //   portfolio.blackhole.effectComposer.show() / hide() / toggle()
      effectComposer: {
        show(): void {
          setLensingActive(true);
        },
        hide(): void {
          setLensingActive(false);
        },
        toggle(): void {
          setLensingActive(!getLensingActive());
        },
      },

      reset: resetBlackHoleDefaults,
    },

    // Reset all scene defaults at once.
    reset(): void {
      resetEarthDefaults();
      resetRingsDefaults();
      resetNebulaeDefaults();
      resetBlackHoleDefaults();
      console.log('[portfolio] all defaults reset');
    },

    // Print all commands.
    help(): void {
      console.log(
        [
          '%cwindow.portfolio — dev console',
          '',
          'Navigation:',
          "  portfolio.go(scene)             // 'home' | 'about' | 'projects' | 'contact' | 'colophon'",
          "  portfolio.go('/en/projects/x')  // any router path",
          '',
          'Visibility:',
          '  portfolio.ui.hide() / show() / toggle()   // header, rail, footer, signature',
          '  portfolio.bg.hide() / show() / toggle()   // celestial backdrop',
          '  portfolio.bg.global.config()              // → JSON of global skybox set',
          '  portfolio.bg.global.config({ nebulaBrightness: 0.5 })',
          '  portfolio.bg.colophon.config({ starBrightness: 0.3 })',
          '  portfolio.bg.cubemap.config({ nebulaSaturation: 0 })  // re-bakes cubemap',
          '  portfolio.bg.reset()                      // restore all three sets to defaults',
          '',
          'Quality:',
          "  portfolio.quality(q)  // 'full' | 'still' | 'lite' (aliases for 'quality' | 'static' | 'simple')",
          '',
          'Earth test mode:',
          '  portfolio.earth.test(on?)             // on=true by default; UV checker + red city dots',
          '  portfolio.earth.placeholder(on?)      // on=true; force green/blue placeholder map + lambert-aware city dots',
          '  portfolio.earth.rotationSpeed()       // get current rate, in rad/sec (default 0.025)',
          '  portfolio.earth.rotationSpeed(rate)   // set; negative reverses, 0 halts. Persists in localStorage.',
          '',
          'Projects-scene rings:',
          '  portfolio.rings.show() / hide() / toggle()',
          '  portfolio.rings.rotationSpeed()        // get K (default 0.02). ω_particle = K / sqrt(r) per Keplerian.',
          '  portfolio.rings.rotationSpeed(rate)    // set; negative reverses, 0 halts. Persists in localStorage.',
          '  portfolio.rings.sceneRotationSpeed(r?) // angular velocity (rad/s) of the whole projects group.',
          '  portfolio.rings.bodyRotationSpeed(r?)  // angular velocity (rad/s) of the gas giant body alone.',
          '                                            // Set body = -scene to spin rings while the body stays put.',
          '  portfolio.rings.config()               // → JSON of all ring properties',
          '  portfolio.rings.config({ ... })        // partial set from JSON',
          '  portfolio.rings.clock.show() / hide() / toggle()     // 12/3/6/9 numerals; orbit with the ring.',
          '  portfolio.rings.sparkles.show() / hide() / toggle()  // (default on) trackable bright pinpricks',
          '  portfolio.rings.clumps.show() / hide() / toggle()    // (default on) non-uniform azimuthal density',
          '  portfolio.rings.spokes.show() / hide() / toggle()    // (default off) rotating dark radial bars',
          '  portfolio.rings.flow.show() / hide() / toggle()      // (default on) FBM noise flow on the colored bands',
          '',
          'Contact-scene nebulae:',
          "  portfolio.nebulae.variant()              // → '01' | '02' | '03' | '04' (Carina | Lagoon | Pillars | Veil)",
          "  portfolio.nebulae.variant('03')          // set + sync URL ?neb=03",
          '  portfolio.nebulae.config()               // → JSON of all nebula properties',
          '  portfolio.nebulae.config({ ... })        // partial set: billboard*/particle*',
          '',
          'Colophon-scene black hole:',
          '  portfolio.blackhole.config()             // → JSON of all black hole properties',
          '  portfolio.blackhole.config({ distortionStrength: 0 })  // disable lensing',
          '  portfolio.blackhole.config({ diskTilt: 30, dopplerStrength: 0.8 })',
          '  portfolio.blackhole.config({ diskRotationSpeed: 0.2 })  // disk animation speed',
          '  portfolio.blackhole.config({ cameraElevation: 4 })      // camera Y offset (~7° at 2.5)',
          '  portfolio.blackhole.config({ bloomIntensity: 0.6 })    // bloom on photon ring + inner disk (0 = off)',
          '  portfolio.blackhole.presets              // { m87, gargantua } — reference configs',
          '  portfolio.blackhole.config(portfolio.blackhole.presets.gargantua)  // apply preset',
          '  portfolio.blackhole.clock.show() / hide() / toggle()  // 12-hour labels in disk plane',
          '  portfolio.blackhole.effectComposer.show() / hide() / toggle()  // mount/unmount lensing pass',
          '  portfolio.blackhole.reset()              // restore defaults',
        ].join('\n'),
        'font-weight: bold',
      );
    },
  };

  (window as unknown as { portfolio: typeof api }).portfolio = api;
}
