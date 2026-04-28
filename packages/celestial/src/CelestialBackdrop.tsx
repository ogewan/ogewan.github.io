import { lazy, Suspense } from 'react';
import { useLocation } from 'react-router';
import { sceneFromPathname, type SceneName } from './scenes.js';
import { useActiveScene } from './useActiveScene.js';
import { useCelestialQuality } from './CelestialQualityContext.js';
import { SimpleBackdrop } from './r3f/SimpleBackdrop.js';
import { StaticBackdrop } from './r3f/StaticBackdrop.js';

// Lazy-loaded R3F slice. Only fetched when the user is in `quality` mode
// AND we mount the canvas branch. Static + Simple modes never download it.
const Canvas3D = lazy(() => import('./r3f/Canvas3D.js'));

// Persistent celestial backdrop — Phase 9.x.
//
// Three quality modes, picked by the user via the header toggle and
// persisted in localStorage (see CelestialQualityContext):
//
//   'quality' — full R3F canvas (lazy-loaded). All scenes co-located on a
//               Z-axis tour line; CameraDriver flies the camera between
//               anchors on route change. Heaviest first-load, best cached.
//
//   'static'  — committed PNG snapshots of each scene rendered through <img>.
//               No canvas, no shaders. Crossfades between scenes via the
//               same opacity transition the placeholder layers use.
//
//   'simple'  — CSS gradient placeholders + radial-gradient star dots.
//               Zero extra fetch, zero runtime cost.
//
// OS prefers-reduced-motion is intentionally NOT consulted. A site shouldn't
// be visually crippled by an OS accessibility preference the visitor may
// not have set deliberately. Users who want still or simple pick it from
// the toggle. The LocationRail visitor pulse likewise runs in all modes.
//
// Public API stays identical: <CelestialBackdrop sceneOverride? />. The
// dev cycler at /_dev/celestial drives sceneOverride exactly as before.

export interface CelestialBackdropProps {
  sceneOverride?: SceneName;
}

// Routes that override the IO-tracked active scene with the pathname-derived
// one. Project detail / redirect pages have no <section data-scene> markers,
// so we fall back to `sceneFromPathname` for them.
function isPathnameDriven(pathname: string): boolean {
  return /\/projects\/[^/]+/.test(pathname) || pathname.includes('/_dev/');
}

export function CelestialBackdrop({ sceneOverride }: CelestialBackdropProps = {}) {
  const location = useLocation();
  const pathnameScene = sceneFromPathname(location.pathname);
  const activeScene = useActiveScene();
  const scene =
    sceneOverride ?? (isPathnameDriven(location.pathname) ? pathnameScene : activeScene);
  const { quality } = useCelestialQuality();

  return (
    <div aria-hidden="true" className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {quality === 'simple' ? (
        <SimpleBackdrop scene={scene} />
      ) : quality === 'static' ? (
        <StaticBackdrop scene={scene} />
      ) : (
        // Suspense fallback is the STATIC backdrop (committed PNG) — not
        // SimpleBackdrop. The Canvas3D chunk is ~270 KB gz and takes a
        // perceptible moment on cold load; if we showed the CSS-only
        // Simple gradient as the fallback, users in `quality` mode would
        // see Lite for ~half a second before R3F took over (visually
        // jarring — the Lite scene is a low-fidelity placeholder, while
        // the Static PNG is a near-match for the eventual R3F output and
        // the handoff to R3F is essentially invisible). The PNG is small
        // (~75 KB for hero), HTTP-cached, and only the active scene's
        // image fetches.
        <Suspense fallback={<StaticBackdrop scene={scene} />}>
          <Canvas3D scene={scene} />
        </Suspense>
      )}
    </div>
  );
}
