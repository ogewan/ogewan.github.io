import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router';

// On every cross-family pathname change, move focus to the active section's
// <h1> (must have tabindex={-1}) and announce the new page title via the
// polite live region kept in #route-announcer (mounted once by SiteLayout).
//
// "Family" buckets: 'main' (the one-page MainPage and its five section
// pseudo-routes), 'projectDetail' (/projects/:slug), 'projectRedirect'
// (/projects/:slug/redirect), 'dev', 'notFound'. Within the 'main' family
// the URL changes constantly as the user scrolls past section seams (driven
// by MainPage's scroll-to-section sync); refocusing on each of those would
// yank the viewport. So we only fire when the FAMILY changes (e.g. card
// click into project detail, or back button into MainPage).
//
// Two critical details that took a bug to surface:
//
// 1. focus() uses preventScroll: TRUE. The default (false) tells the browser
//    to scroll the focused element into view. On a cold-loaded deep link
//    like /en/contact, the cold-load scroll effect in MainPage scrolls to
//    #contact first; without preventScroll, this hook would then yank the
//    viewport back to whichever h1 it picked, ping-ponging the active scene
//    through whichever sections lay in between.
//
// 2. Picks the SECTION-scoped h1, not the first h1 in <main>. With multiple
//    section h1s on the one-page, querySelector('main h1') always returned
//    the hero's, so deep-links to other sections announced (and scrolled to)
//    the wrong heading. Resolve the URL slug and look inside that section
//    first.
//
// This is the screen-reader friendly counterpart to client-side routing —
// without it, AT users get no signal that the page has changed.

type Family = 'main' | 'projectDetail' | 'projectRedirect' | 'dev' | 'notFound';

const MAIN_SLUGS = new Set(['', 'about', 'projects', 'contact', 'colophon']);
const SECTION_ID_FOR_SLUG: Record<string, string> = {
  '': 'home',
  about: 'about',
  projects: 'projects',
  contact: 'contact',
  colophon: 'colophon',
};

function familyOf(pathname: string): Family {
  // Strip `/<locale>` prefix (any 2-letter ASCII locale).
  const stripped = pathname.replace(/^\/[a-z]{2}/, '');
  const rest = stripped.replace(/^\/+/, '').replace(/\/+$/, '');
  if (rest === '') return 'main';
  const [first, second, third] = rest.split('/');
  if (first === '_dev') return 'dev';
  if (first === 'projects') {
    if (!second) return 'main';
    if (third === 'redirect') return 'projectRedirect';
    return 'projectDetail';
  }
  if (first && MAIN_SLUGS.has(first)) return 'main';
  return 'notFound';
}

function sectionSlugOf(pathname: string): string {
  const stripped = pathname.replace(/^\/[a-z]{2}/, '');
  const rest = stripped.replace(/^\/+/, '').replace(/\/+$/, '');
  if (rest === '') return '';
  const slug = rest.split('/')[0] ?? '';
  return MAIN_SLUGS.has(slug) ? slug : '';
}

function findHeadingFor(pathname: string): HTMLHeadingElement | null {
  const slug = sectionSlugOf(pathname);
  const sectionId = SECTION_ID_FOR_SLUG[slug] ?? null;
  if (sectionId) {
    const sectionEl = document.getElementById(sectionId);
    const sectionH1 = sectionEl?.querySelector<HTMLHeadingElement>('h1');
    if (sectionH1) return sectionH1;
  }
  return document.querySelector<HTMLHeadingElement>('main h1');
}

export function useFocusOnRouteChange() {
  const { pathname } = useLocation();
  const prevFamily = useRef<Family | null>(null);

  useEffect(() => {
    const next = familyOf(pathname);
    const previous = prevFamily.current;
    prevFamily.current = next;
    // Skip when staying within the one-page (scroll-driven URL replace).
    if (previous === next && next === 'main') return;

    queueMicrotask(() => {
      const heading = findHeadingFor(pathname);
      if (heading) {
        heading.focus({ preventScroll: true });
      }
      const announcer = document.getElementById('route-announcer');
      if (announcer) {
        const title = document.title || pathname;
        announcer.textContent = title;
      }
    });
  }, [pathname]);
}
