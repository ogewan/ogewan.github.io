import { useEffect, useRef } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router';

// Edge-trigger scroll-route navigation per the design chat:
//   "wheel scroll (debounced) and ↑/↓ / PageUp/PageDown move between routes"
// Behavior chosen: edge-trigger (only when the page is scrolled to the top or
// bottom). Mid-page wheel scrolls the page normally — content like the project
// grid and detail-reading column stays readable. Mockup intent preserved without
// breaking long content.

const MAIN_ROUTES = ['', 'about', 'projects', 'contact', 'colophon'] as const;
const COOLDOWN_MS = 600;
const EDGE_TOLERANCE_PX = 2;

type MainRoute = (typeof MAIN_ROUTES)[number];

function pathToMainSlug(pathname: string, locale: string): MainRoute | null {
  const localePrefix = `/${locale}`;
  if (!pathname.startsWith(localePrefix)) return null;
  const rest = pathname.slice(localePrefix.length).replace(/^\/+/, '').replace(/\/+$/, '');
  if (rest === '') return '';
  const slug = rest.split('/')[0] ?? '';
  // Sub-routes (projects/:slug, projects/:slug/redirect, _dev/*) must not jack scroll.
  if (rest.includes('/')) return null;
  if (slug === '_dev') return null;
  return (MAIN_ROUTES as readonly string[]).includes(slug) ? (slug as MainRoute) : null;
}

function isAtTop(): boolean {
  return window.scrollY <= EDGE_TOLERANCE_PX;
}

function isAtBottom(): boolean {
  return (
    window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - EDGE_TOLERANCE_PX
  );
}

function isFormElement(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

export function ScrollRouteNavigator() {
  const location = useLocation();
  const navigate = useNavigate();
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const lastNavAt = useRef(0);

  useEffect(() => {
    const tryNavigate = (direction: 'next' | 'prev'): boolean => {
      const slug = pathToMainSlug(location.pathname, locale);
      if (slug === null) return false;
      const idx = MAIN_ROUTES.indexOf(slug);
      if (idx < 0) return false;
      const nextIdx =
        direction === 'next'
          ? (idx + 1) % MAIN_ROUTES.length
          : (idx - 1 + MAIN_ROUTES.length) % MAIN_ROUTES.length;
      const nextSlug = MAIN_ROUTES[nextIdx];
      const target = nextSlug === '' ? `/${locale}/` : `/${locale}/${nextSlug}`;
      if (target === location.pathname) return false;
      lastNavAt.current = Date.now();
      navigate(target, { viewTransition: true });
      return true;
    };

    const cooldownActive = () => Date.now() - lastNavAt.current < COOLDOWN_MS;

    const onWheel = (e: WheelEvent) => {
      if (cooldownActive()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isFormElement(e.target)) return;
      if (e.deltaY > 0 && isAtBottom()) {
        tryNavigate('next');
      } else if (e.deltaY < 0 && isAtTop()) {
        tryNavigate('prev');
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (cooldownActive()) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (isFormElement(e.target)) return;
      if ((e.key === 'ArrowDown' || e.key === 'PageDown') && isAtBottom()) {
        if (tryNavigate('next')) e.preventDefault();
      } else if ((e.key === 'ArrowUp' || e.key === 'PageUp') && isAtTop()) {
        if (tryNavigate('prev')) e.preventDefault();
      }
    };

    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [location.pathname, locale, navigate]);

  return null;
}
