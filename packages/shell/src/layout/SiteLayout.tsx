import { useLocation, type Location } from 'react-router';
import type { ReactNode } from 'react';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';
import { LocationRail } from '../components/LocationRail';
import { useFocusOnRouteChange } from './useFocusOnRouteChange';
import { useDocumentMeta } from './useDocumentMeta';

// Pages where the right-side location rail is visible. Brief: Home and About
// only. Detail/redirect pages don't show the rail because the camera focus
// concept (rotating Earth to a city) only applies on Earth-scene routes.
function shouldShowRail(location: Location): boolean {
  const path = location.pathname.replace(/^\/[a-z-]+/, '') || '/';
  return path === '/' || path === '/about';
}

interface SiteLayoutProps {
  children: ReactNode;
}

export function SiteLayout({ children }: SiteLayoutProps) {
  const location = useLocation();
  useFocusOnRouteChange();
  useDocumentMeta();
  const showRail = shouldShowRail(location);

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
