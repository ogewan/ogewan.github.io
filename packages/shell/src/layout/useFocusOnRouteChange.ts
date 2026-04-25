import { useEffect } from 'react';
import { useLocation } from 'react-router';

// On every pathname change, move focus to the page's main <h1> (must have
// tabindex={-1}) and announce the new page title via the polite live region
// kept in #route-announcer (mounted once by SiteLayout). Skips the very first
// render so the user's initial focus target (browser address bar / first
// interactive element) isn't yanked.
//
// This is the screen-reader friendly counterpart to client-side routing —
// without it, AT users get no signal that the page has changed.
export function useFocusOnRouteChange() {
  const { pathname } = useLocation();

  useEffect(() => {
    // Use a microtask so React commits the new page's DOM first.
    queueMicrotask(() => {
      const heading = document.querySelector<HTMLHeadingElement>('main h1');
      if (heading) {
        heading.focus({ preventScroll: false });
      }
      const announcer = document.getElementById('route-announcer');
      if (announcer) {
        const title = document.title || pathname;
        announcer.textContent = title;
      }
    });
  }, [pathname]);
}
