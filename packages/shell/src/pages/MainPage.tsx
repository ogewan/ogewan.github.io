import { useEffect, useRef, type ReactNode } from 'react';
import { useLocation, useNavigate, useParams, type NavigateOptions, type To } from 'react-router';
import { useActiveScene, useObserveActiveScene, type SceneName } from '@portfolio/celestial';
import { HeroSection } from '../components/sections/HeroSection';
import { AboutSection } from '../components/sections/AboutSection';
import { ProjectsSection } from '../components/sections/ProjectsSection';
import { ContactSection } from '../components/sections/ContactSection';
import { ColophonSection } from '../components/sections/ColophonSection';
import { RoutePreloader } from '../components/RoutePreloader';

// One-page layout. All five sections stacked on a single document scroll;
// scrolling between them swaps the persistent celestial backdrop scene
// (CelestialBackdrop reads the active scene from context, populated here by
// useObserveActiveScene) and rewrites the URL via React Router's
// navigate({ replace: true }) so deep links and back/forward stay coherent.
// No more route-driven page swaps between sections.
//
// All five section components are imported EAGERLY (no React.lazy / Suspense).
// Originally the four non-hero sections were code-split, but with min-h-screen
// SectionShell wrappers the lazy chunks would mount AFTER the cold-load scroll
// lands, growing each section and shifting later sections downward. That
// shift moves the URL-derived scroll target (e.g. #contact) past the actual
// scroll position, so the IO observer publishes the wrong scene and the URL
// sync overwrites the deep link. Total combined cost of the four sections is
// ~10 KB gz — small enough that bundling them eagerly is the right call.
// Section-internal heavy payloads (Angular timeline on about, MapLibre on
// contact) keep their own lazy boundaries.

interface SectionShellProps {
  id: string;
  scene: SceneName;
  children: ReactNode;
}

function SectionShell({ id, scene, children }: SectionShellProps) {
  return (
    <section id={id} data-scene={scene} className="min-h-screen scroll-mt-24 relative">
      {children}
    </section>
  );
}

const SECTIONS: ReadonlyArray<{ slug: string; id: string; scene: SceneName }> = [
  { slug: '', id: 'home', scene: 'earth' },
  { slug: 'about', id: 'about', scene: 'about' },
  { slug: 'projects', id: 'projects', scene: 'projects' },
  { slug: 'contact', id: 'contact', scene: 'contact' },
  { slug: 'colophon', id: 'colophon', scene: 'colophon' },
];

function slugFromPathname(pathname: string, locale: string): string {
  const localePrefix = `/${locale}`;
  if (!pathname.startsWith(localePrefix)) return '';
  const rest = pathname.slice(localePrefix.length).replace(/^\/+/, '').replace(/\/+$/, '');
  if (rest === '') return '';
  return rest.split('/')[0] ?? '';
}

export function MainPage() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const location = useLocation();
  const navigateRaw = useNavigate();
  const activeScene = useActiveScene();

  // useNavigate() on a BrowserRouter (non-data-route) creates a new function
  // reference on every location change because it captures locationPathname in
  // its useCallback deps. Storing it in a ref keeps the scene→URL effect below
  // from re-running on nav clicks (which would fire it with a stale activeScene
  // and bounce the URL back to the old scene's path).
  const navigateRef = useRef(navigateRaw);
  navigateRef.current = navigateRaw;
  const navigate = useRef((to: To, opts?: NavigateOptions) =>
    navigateRef.current(to, opts),
  ).current;

  // Set up the IntersectionObserver that publishes the most-visible section
  // to ActiveSceneContext. CelestialBackdrop reads from that context.
  useObserveActiveScene();

  // Cold-load (or back/forward from project detail) → scroll to the section
  // matching the current pathname. The lastScrolledTo ref guards against
  // the navigate({ replace }) below re-firing this effect.
  const lastScrolledTo = useRef<string | null>(null);
  useEffect(() => {
    const slug = slugFromPathname(location.pathname, locale);
    const targetId = SECTIONS.find((s) => s.slug === slug)?.id ?? 'home';
    if (lastScrolledTo.current === targetId) return;
    lastScrolledTo.current = targetId;
    requestAnimationFrame(() => {
      const el = document.getElementById(targetId);
      if (!el) return;
      // Instant scroll on cold-load — smooth would feel laggy as a deep-link
      // landing experience. SectionLink does its own smooth scroll for
      // user-initiated nav.
      el.scrollIntoView({ behavior: 'auto', block: 'start' });
    });
  }, [location.pathname, locale]);

  // Active scene → URL. When the user scrolls past a section seam,
  // useObserveActiveScene publishes the new scene; this effect mirrors it
  // into the URL with replace (no history depth bloat).
  //
  // Skip the FIRST call (initial mount) so the default initial scene
  // ('earth' from ActiveSceneProvider) doesn't override a cold-load deep
  // link. Without this, loading /en/contact would briefly navigate to /en/
  // because activeScene starts at 'earth' before the IO observer publishes
  // its first reading. The cold-load scroll effect (above) is what gets us
  // into position; the IO will then publish the correct scene and this
  // sync will track from there.
  //
  // pathname is deliberately NOT in the dep list — we only react to scene
  // changes, never to our own URL writes. `navigate` is stable (wrapped in
  // useCallback above) so it's safe to omit from deps without a lint disable.
  const firstSyncSkipped = useRef(false);
  useEffect(() => {
    if (!firstSyncSkipped.current) {
      firstSyncSkipped.current = true;
      return;
    }
    const target = SECTIONS.find((s) => s.scene === activeScene)?.slug ?? '';
    const path = target ? `/${locale}/${target}` : `/${locale}/`;
    if (path === window.location.pathname) return;
    // Mark so the cold-load effect above doesn't re-scroll on the
    // navigate-induced pathname change.
    lastScrolledTo.current = SECTIONS.find((s) => s.scene === activeScene)?.id ?? 'home';
    navigate(path, { replace: true, preventScrollReset: true });
  }, [activeScene, locale, navigate]);

  return (
    <>
      <RoutePreloader />
      <SectionShell id="home" scene="earth">
        <HeroSection />
      </SectionShell>
      <SectionShell id="about" scene="about">
        <AboutSection />
      </SectionShell>
      <SectionShell id="projects" scene="projects">
        <ProjectsSection />
      </SectionShell>
      <SectionShell id="contact" scene="contact">
        <ContactSection />
      </SectionShell>
      <SectionShell id="colophon" scene="colophon">
        <ColophonSection />
      </SectionShell>
    </>
  );
}
