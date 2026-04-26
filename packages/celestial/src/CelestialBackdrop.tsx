import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { sceneFromPathname, type SceneName } from './scenes.js';
import { ReducedMotionBackdrop } from './r3f/ReducedMotionBackdrop.js';

// Lazy-loaded R3F slice. Reduced-motion users (and the SSR / first-paint
// window) never pay the ~270 KB gz cost of three + R3F + drei + gsap
// because Canvas3D is only fetched when the canvas branch renders.
const Canvas3D = lazy(() => import('./r3f/Canvas3D.js'));

// Persistent celestial backdrop — Phase 9 R3F implementation. A single
// <Canvas> (lazy-loaded inside Canvas3D) contains every scene as a co-located
// group along the tour line; CameraDriver flies the camera between scene
// anchors on route change.
//
// Reduced-motion users get the static fallback (CSS placeholder layers in 9.0,
// committed WebP captures in 9.6). The canvas is never mounted in that path,
// so no shaders compile, no R3F runtime initializes, and the chunk isn't
// even fetched.
//
// Public API stays identical: <CelestialBackdrop sceneOverride? /> returns
// the same fixed-inset, aria-hidden, pointer-events-none scrim it always has.
// The dev cycler (/_dev/celestial) drives sceneOverride exactly as before.

export interface CelestialBackdropProps {
  sceneOverride?: SceneName;
}

function usePrefersReducedMotion(): boolean {
  const [prefers, setPrefers] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setPrefers(mq.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return prefers;
}

export function CelestialBackdrop({ sceneOverride }: CelestialBackdropProps = {}) {
  const location = useLocation();
  const scene = sceneOverride ?? sceneFromPathname(location.pathname);
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {reducedMotion ? (
        <ReducedMotionBackdrop scene={scene} />
      ) : (
        // Suspense fallback is the reduced-motion scaffold, so first paint
        // shows the CSS placeholder until the R3F chunk loads. After Canvas3D
        // arrives it takes over; no flash because the body's design-token
        // gradient is consistent across both branches.
        <Suspense fallback={<ReducedMotionBackdrop scene={scene} />}>
          <Canvas3D scene={scene} />
        </Suspense>
      )}
    </div>
  );
}
