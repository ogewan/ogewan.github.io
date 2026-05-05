import type { ReactNode } from 'react';
import { useActiveScene } from '@portfolio/celestial';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { LocationRail } from '../components/LocationRail';
import { useFocusOnRouteChange } from './useFocusOnRouteChange';
import { useDocumentMeta } from './useDocumentMeta';
import { useFavicon } from './useFavicon';

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
