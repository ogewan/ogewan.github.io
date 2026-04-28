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

  return (
    <header className="fixed top-4 left-0 right-0 z-50 pointer-events-none">
      <Container className="flex justify-center pointer-events-none">
        <GlassPanel
          variant="chrome"
          as="nav"
          aria-label={t('ariaPrimary')}
          className="pointer-events-auto flex items-center gap-3 px-3 py-2 max-w-[min(720px,100%-32px)] w-full"
        >
          {/* Resume PDF — left slot, replaces the brand mark per the chat */}
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noreferrer noopener"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-micro tracking-[0.14em] uppercase text-fg-secondary border border-glass-hairline-inner hover:text-cyan hover:border-[color:oklch(0.84_0.12_210/0.4)] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] transition-colors ${focusRingClassName}`}
          >
            <span>{t('resume')}</span>
            <span aria-hidden="true">↗</span>
          </a>

          {/* Primary nav links — desktop horizontal, mobile collapses below */}
          <ul
            className={
              'flex-1 items-center justify-center gap-1 ' +
              (menuOpen
                ? 'absolute top-full left-0 right-0 mt-2 flex-col bg-glass-elev backdrop-blur-md p-3 rounded-md border border-glass-hairline-inner flex'
                : 'hidden md:flex')
            }
          >
            {NAV_ITEMS.map((item) => {
              const active = isActive(location.pathname, locale, item.slug);
              return (
                <li key={item.slug || 'home'}>
                  <SectionLink
                    to={item.key}
                    aria-current={active ? 'page' : undefined}
                    className={
                      // min-h-11 forces the 44px tap target on mobile (where
                      // items stack vertically and need to be thumb-sized);
                      // desktop reverts to natural padding for the slim chrome.
                      'inline-flex items-center gap-2 px-3 py-1.5 min-h-11 md:min-h-0 rounded-sm font-mono text-micro tracking-[0.14em] uppercase no-underline ' +
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

          {/* Backdrop quality (Full · Still · Lite) and locale (EN · ES) —
              both single-button dropdowns. Always visible (mobile included). */}
          <QualitySwitcher />
          <LocaleSwitcher />

          {/* Mobile hamburger — only shown below md breakpoint. 44×44 minimum
              tap target per the brief. */}
          <button
            type="button"
            className={`md:hidden inline-flex items-center justify-center w-11 h-11 rounded-sm border border-glass-hairline-inner ${focusRingClassName}`}
            aria-expanded={menuOpen}
            aria-label={t('ariaToggleMenu')}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span aria-hidden="true" className="text-fg-secondary">
              {menuOpen ? '×' : '☰'}
            </span>
          </button>
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
