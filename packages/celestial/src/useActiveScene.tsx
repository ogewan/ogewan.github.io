import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { SceneName } from './scenes.js';

// Active-scene context.
//
// MainPage (in @portfolio/shell) owns the source of truth: it watches its
// stacked <section data-scene> elements with an IntersectionObserver and
// publishes the most-visible one via the setter from this context.
//
// CelestialBackdrop reads via useActiveScene(). It sits above the routes in
// the React tree (so it stays mounted across route changes), so the provider
// has to live even higher — wrap App's whole tree in ActiveSceneProvider so
// both producer (MainPage) and consumer (CelestialBackdrop) see it.
//
// On routes that don't render any data-scene markers (project detail,
// redirect, _dev), MainPage isn't mounted; the published scene retains its
// last value, and CelestialBackdrop's pathname fallback overrides for those
// pathname-driven routes.

interface ActiveSceneValue {
  readonly scene: SceneName;
  readonly setScene: (next: SceneName) => void;
}

const ActiveSceneContext = createContext<ActiveSceneValue | null>(null);

export function ActiveSceneProvider({ children }: { children: ReactNode }) {
  const [scene, setSceneState] = useState<SceneName>('earth');
  const setScene = useCallback((next: SceneName) => {
    setSceneState((prev) => (prev === next ? prev : next));
  }, []);
  const value = useMemo<ActiveSceneValue>(() => ({ scene, setScene }), [scene, setScene]);
  return <ActiveSceneContext.Provider value={value}>{children}</ActiveSceneContext.Provider>;
}

export function useActiveScene(): SceneName {
  const ctx = useContext(ActiveSceneContext);
  return ctx?.scene ?? 'earth';
}

export function useSetActiveScene(): (next: SceneName) => void {
  const ctx = useContext(ActiveSceneContext);
  // No-op when no provider is present (defensive — App always wraps in one).
  return ctx?.setScene ?? noop;
}

function noop() {}

// IntersectionObserver-based section tracker. MainPage calls this once after
// mount; it observes any `[data-scene]` element under document and publishes
// the most-visible one via setActiveScene. The shrinking rootMargin (-40%
// top, -40% bottom) means a section is "active" only when at least its
// middle 20% is on screen — gives a clean handoff at section seams when each
// is min-h-screen.
export function useObserveActiveScene(): void {
  const setScene = useSetActiveScene();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (typeof IntersectionObserver === 'undefined') return;

    const sections = Array.from(document.querySelectorAll<HTMLElement>('[data-scene]'));
    if (sections.length === 0) return;

    const ratios = new Map<HTMLElement, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          ratios.set(e.target as HTMLElement, e.isIntersecting ? e.intersectionRatio : 0);
        }
        let bestEl: HTMLElement | null = null;
        let bestRatio = 0;
        for (const [el, r] of ratios) {
          if (r > bestRatio) {
            bestRatio = r;
            bestEl = el;
          }
        }
        if (!bestEl) return;
        const next = bestEl.getAttribute('data-scene') as SceneName | null;
        if (next) setScene(next);
      },
      {
        rootMargin: '-40% 0% -40% 0%',
        threshold: [0, 0.25, 0.5, 0.75, 1],
      },
    );

    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [setScene]);
}
