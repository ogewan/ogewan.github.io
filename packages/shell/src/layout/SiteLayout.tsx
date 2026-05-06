import { useEffect, type ReactNode } from 'react';
import { useActiveScene } from '@portfolio/celestial';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { LocationRail } from '../components/LocationRail';
import { useFocusOnRouteChange } from './useFocusOnRouteChange';
import { useDocumentMeta } from './useDocumentMeta';
import { useFavicon } from './useFavicon';

// Module-level guard so app:react-ready fires exactly once per page load,
// regardless of route changes that re-mount SiteLayout. A useRef would reset
// across remounts; this survives the entire SPA session.
let reactReadyDispatched = false;

// Scenes where the right-side location rail is visible. Brief: Earth and
// About scenes only. Project / Contact / Colophon scenes hide the rail
// because the camera-focus concept (rotating Earth toward a city) only
// applies on Earth-scene anchors. Now that the layout is one-page,
// visibility tracks the actively-scrolled-to scene rather than the route.

interface SiteLayoutProps {
  children: ReactNode;
}

export function SiteLayout({ children }: SiteLayoutProps) {
  useFocusOnRouteChange();
  useDocumentMeta();
  useFavicon();
  const activeScene = useActiveScene();
  const showRail = activeScene === 'earth' || activeScene === 'about';

  // Loading-overlay readiness signal. Fires exactly once per page load, after
  // the first route's SiteLayout has mounted and painted. Two RAFs deep so we
  // wait past React's commit phase AND the browser's paint, ensuring the
  // user-visible page is actually drawn before the overlay can dismiss.
  // This is what prevents the "overlay leaves but the page is blank" race —
  // the prior signals (window.load / fonts.ready / app:scene-ready) all fire
  // before React has finished mounting the route's children.
  useEffect(() => {
    if (reactReadyDispatched) return;
    reactReadyDispatched = true;
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        window.dispatchEvent(new Event('app:react-ready'));
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2) cancelAnimationFrame(raf2);
    };
  }, []);

  return (
    <>
      <SiteHeader />
      {/* Polite live region for screen-reader route-change announcements.
          Visually hidden via the same sr-only pattern as VisuallyHidden. */}
      <div
        id="route-announcer"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="absolute w-px h-px p-0 m-[-1px] overflow-hidden whitespace-nowrap [clip-path:inset(50%)] border-0"
      />
      {showRail ? <LocationRail /> : null}
      <main className="pt-32">{children}</main>
      <SiteFooter />
    </>
  );
}
