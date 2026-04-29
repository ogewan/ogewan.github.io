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

import { getEarthRotationRate, setEarthRotationRate } from '@portfolio/celestial';

const HIDE_UI_CLASS = 'dev-hide-ui';
const HIDE_BG_CLASS = 'dev-hide-bg';

type Setter<T> = (v: T) => void;

interface DevAPIRegistry {
  setQuality?: Setter<string>;
  navigate?: Setter<string>;
  setEarthTestMode?: Setter<boolean>;
  setEarthPlaceholderMode?: Setter<boolean>;
}

const registry: DevAPIRegistry = {};

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

    // Celestial backdrop (z-0 layer) — body-class toggle, no React state.
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
          '',
          'Quality:',
          "  portfolio.quality(q)  // 'full' | 'still' | 'lite' (aliases for 'quality' | 'static' | 'simple')",
          '',
          'Earth test mode:',
          '  portfolio.earth.test(on?)             // on=true by default; UV checker + red city dots',
          '  portfolio.earth.placeholder(on?)      // on=true; force green/blue placeholder map + lambert-aware city dots',
          '  portfolio.earth.rotationSpeed()       // get current rate, in rad/sec (default 0.025)',
          '  portfolio.earth.rotationSpeed(rate)   // set; negative reverses, 0 halts. Persists in localStorage.',
        ].join('\n'),
        'font-weight: bold',
      );
    },
  };

  (window as unknown as { portfolio: typeof api }).portfolio = api;
}
