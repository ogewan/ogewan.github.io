import { useEffect, useState } from 'react';
import { useLocation } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Container, GlassPanel, Text, focusRingClassName } from '@portfolio/ui';
import { QualitySwitcher } from '../components/QualitySwitcher';
import { LocaleSwitcher } from '../components/LocaleSwitcher';
import { SectionLink, type SectionKey } from '../components/SectionLink';

// Five-section nav matching the design chat: 01 Home · 02 About · 03 Work ·
// 04 Contact · 05 Colophon. URL slugs use 'projects' (so the manifest
// contract stays clean) but the visible label comes from i18n (`Work`/
// `Proyectos`). All labels resolve from `nav.json`. Items are SectionLinks
// — clicking smooth-scrolls to the section AND replaces the URL via React
// Router so the active state derived from pathname stays accurate.
const NAV_ITEMS: Array<{
  slug: string;
  key: SectionKey;
  order: string;
}> = [
  { slug: '', key: 'home', order: '01' },
  { slug: 'about', key: 'about', order: '02' },
  { slug: 'projects', key: 'projects', order: '03' },
  { slug: 'contact', key: 'contact', order: '04' },
  { slug: 'colophon', key: 'colophon', order: '05' },
];

function isActive(pathname: string, locale: string, slug: string): boolean {
  const target = slug ? `/${locale}/${slug}` : `/${locale}/`;
  if (slug === '') return pathname === target;
  return pathname.startsWith(target);
}

// SiteHeader renders outside any matched route, so useParams returns {}
// here. Derive locale from pathname directly so URL-driven state stays in
// sync (otherwise locale falls back to 'en' permanently and the active-link
// styling under /es paths breaks).
function localeFromPathname(pathname: string): string {
  const m = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  return m?.[1] ?? 'en';
}

export function SiteHeader() {
  const location = useLocation();
  const locale = localeFromPathname(location.pathname);
  const { t } = useTranslation(['nav']);
  const [menuOpen, setMenuOpen] = useState(false);

  // Close mobile menu when the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Canvas text-shadow override for items inside the hamburger drawer. The
  // drawer sits inside GlassPanel which suppresses text-shadow on all
  // descendants ([&_*]:![text-shadow:none]); the ! prefix beats that so
  // drawer items remain legible against the celestial backdrop on mobile.
  const drawerShadow =
    '![text-shadow:0_1px_4px_rgba(0,0,0,1),0_2px_16px_rgba(0,0,0,0.95),0_0_40px_rgba(0,0,0,0.8)]';

  // Resume link styling shared between the bar (≥265px) and drawer (<265px)
  // renders. Display utility intentionally excluded — each call site controls
  // its own visibility via `hidden xxxs:inline-flex` (bar) or `xxxs:hidden
  // inline-flex` (drawer). Including `inline-flex` here would override the
  // `hidden` below the breakpoint and the bar copy would never disappear.
  const resumeClass = `items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-micro tracking-[0.14em] uppercase text-fg-secondary border border-glass-hairline-inner hover:text-cyan hover:border-[color:oklch(0.84_0.12_210/0.4)] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] transition-colors ${focusRingClassName}`;

  return (
    <header className="fixed top-4 left-0 right-0 z-50 pointer-events-none">
      <Container className="flex justify-center pointer-events-none">
        <GlassPanel
          variant="chrome"
          as="nav"
          aria-label={t('ariaPrimary')}
          className="pointer-events-auto flex items-center justify-center xxxs:justify-between gap-3 px-3 py-2 max-w-[min(920px,calc(100%-32px))] w-full"
        >
          {/* Resume PDF — left slot, hidden below 265px (xxxs) where it
              relocates to the hamburger drawer. */}
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noreferrer noopener"
            className={`hidden xxxs:inline-flex shrink-0 ${resumeClass}`}
          >
            <span>{t('resume')}</span>
            <span aria-hidden="true">↗</span>
          </a>

          {/* Primary nav links — inline above 875px (nav: breakpoint). Below
              that the items move into the hamburger drawer rendered below. */}
          <ul className="hidden nav:flex flex-1 items-center justify-center gap-1">
            {NAV_ITEMS.map((item) => {
              const active = isActive(location.pathname, locale, item.slug);
              return (
                <li key={item.slug || 'home'}>
                  <SectionLink
                    to={item.key}
                    aria-current={active ? 'page' : undefined}
                    className={
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-sm font-mono text-micro tracking-[0.14em] uppercase no-underline ' +
                      'transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] ' +
                      (active
                        ? 'text-cyan border border-[color:oklch(0.84_0.12_210/0.3)] bg-[color:oklch(0.84_0.12_210/0.06)] '
                        : 'text-fg-muted border border-transparent hover:text-fg-primary ') +
                      focusRingClassName
                    }
                  >
                    <span aria-hidden="true">{item.order}</span>
                    <span>{t(`items.${item.key}`)}</span>
                  </SectionLink>
                </li>
              );
            })}
          </ul>

          {/* Backdrop quality — visible in the bar at 375px+; below 375px it
              moves into the hamburger drawer (rendered separately below). */}
          <div className="hidden xs:inline-flex shrink-0">
            <QualitySwitcher />
          </div>
          {/* Locale switcher — visible at 325px+; below that it moves into
              the hamburger drawer. */}
          <div className="hidden xxs:inline-flex shrink-0">
            <LocaleSwitcher />
          </div>

          {/* Mobile hamburger — shown below 875px (nav:). 44×44 minimum
              tap target per the brief. */}
          <button
            type="button"
            className={`nav:hidden inline-flex items-center justify-center w-11 h-11 rounded-sm border border-glass-hairline-inner ${focusRingClassName}`}
            aria-expanded={menuOpen}
            aria-label={t('ariaToggleMenu')}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span aria-hidden="true" className="text-fg-secondary">
              {menuOpen ? '×' : '☰'}
            </span>
          </button>

          {/* Hamburger drawer — only mounts when open and below the nav: breakpoint.
              Positioned absolute below the GlassPanel so it doesn't push layout. */}
          {menuOpen && (
            <div className="nav:hidden absolute top-full left-0 right-0 mt-2 bg-glass-elev backdrop-blur-md p-3 rounded-md border border-glass-hairline-inner flex flex-col gap-3">
              {/* QualitySwitcher — only renders inside the drawer below 375px,
                  where the bar copy is hidden. Shares state via context. */}
              <div className="xs:hidden">
                <QualitySwitcher />
              </div>
              {/* LocaleSwitcher — only renders inside the drawer below 325px. */}
              <div className="xxs:hidden">
                <LocaleSwitcher />
              </div>
              {/* Resume PDF — only renders inside the drawer below 265px. */}
              <a
                href="/resume.pdf"
                target="_blank"
                rel="noreferrer noopener"
                className={`xxxs:hidden inline-flex ${resumeClass} ${drawerShadow}`}
              >
                <span>{t('resume')}</span>
                <span aria-hidden="true">↗</span>
              </a>
              <ul className="flex flex-col gap-1">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(location.pathname, locale, item.slug);
                  return (
                    <li key={item.slug || 'home'}>
                      <SectionLink
                        to={item.key}
                        aria-current={active ? 'page' : undefined}
                        className={
                          'inline-flex items-center gap-2 px-3 py-1.5 min-h-11 rounded-sm font-mono text-micro tracking-[0.14em] uppercase no-underline w-full ' +
                          'transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] ' +
                          drawerShadow +
                          ' ' +
                          (active
                            ? 'text-cyan border border-[color:oklch(0.84_0.12_210/0.3)] bg-[color:oklch(0.84_0.12_210/0.06)] '
                            : 'text-fg-secondary border border-transparent hover:text-fg-primary ') +
                          focusRingClassName
                        }
                      >
                        <span aria-hidden="true">{item.order}</span>
                        <span>{t(`items.${item.key}`)}</span>
                      </SectionLink>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </GlassPanel>
      </Container>

      {/* Bottom-left signature block — design language detail from the mockup */}
      <Text
        as="div"
        variant="micro"
        className="fixed bottom-6 left-6 hidden lg:block pointer-events-none select-none"
      >
        <SectionLink to="home" className={`pointer-events-auto ${focusRingClassName} no-underline`}>
          <span className="text-fg-muted">SYS</span>{' '}
          <span className="text-fg-primary">portfolio-0.7</span>
        </SectionLink>
      </Text>
    </header>
  );
}
