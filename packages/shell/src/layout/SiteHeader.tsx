import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate, useParams } from 'react-router';
import { Container, GlassPanel, Text, focusRingClassName } from '@portfolio/ui';

// Five-route nav matching the design chat: 01 Home · 02 About · 03 Work ·
// 04 Contact · 05 Colophon. URL slugs use 'projects' (so the manifest contract
// stays clean) but the visible label is 'Work' per the user's mockup direction.
const NAV_ITEMS: Array<{ slug: string; en: string; es: string; order: string }> = [
  { slug: '', en: 'Home', es: 'Inicio', order: '01' },
  { slug: 'about', en: 'About', es: 'Acerca', order: '02' },
  { slug: 'projects', en: 'Work', es: 'Proyectos', order: '03' },
  { slug: 'contact', en: 'Contact', es: 'Contacto', order: '04' },
  { slug: 'colophon', en: 'Colophon', es: 'Colofón', order: '05' },
];

function isActive(pathname: string, locale: string, slug: string): boolean {
  const target = slug ? `/${locale}/${slug}` : `/${locale}/`;
  if (slug === '') return pathname === target;
  return pathname.startsWith(target);
}

export function SiteHeader() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const otherLocale = locale === 'es' ? 'en' : 'es';
  const location = useLocation();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  // Close mobile menu when the route changes.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  // Locale switcher: rewrite the current path with the alternate locale prefix.
  // Falls back to the home of the alternate locale if the current path doesn't
  // start with the active locale prefix (defensive).
  const switchLocale = () => {
    const current = location.pathname;
    const next = current.startsWith(`/${locale}`)
      ? current.replace(`/${locale}`, `/${otherLocale}`)
      : `/${otherLocale}/`;
    navigate(next);
  };

  return (
    <header className="fixed top-4 left-0 right-0 z-50 pointer-events-none">
      <Container className="flex justify-center pointer-events-none">
        <GlassPanel
          variant="chrome"
          as="nav"
          aria-label="Primary"
          className="pointer-events-auto flex items-center gap-3 px-3 py-2 max-w-[min(720px,100%-32px)] w-full"
        >
          {/* Resume PDF — left slot, replaces the brand mark per the chat */}
          <a
            href="/resume.pdf"
            target="_blank"
            rel="noreferrer noopener"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm font-mono text-micro tracking-[0.14em] uppercase text-fg-secondary border border-glass-hairline-inner hover:text-cyan hover:border-[color:oklch(0.84_0.12_210/0.4)] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] transition-colors ${focusRingClassName}`}
          >
            <span>Résumé</span>
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
            {NAV_ITEMS.map((item) => (
              <li key={item.slug || 'home'}>
                <NavLink
                  to={item.slug ? `/${locale}/${item.slug}` : `/${locale}/`}
                  end={item.slug === ''}
                  className={({ isActive: routerActive }) => {
                    const active = routerActive || isActive(location.pathname, locale, item.slug);
                    return (
                      'inline-flex items-center gap-2 px-3 py-1.5 rounded-sm font-mono text-micro tracking-[0.14em] uppercase ' +
                      'transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] ' +
                      (active
                        ? 'text-cyan border border-[color:oklch(0.84_0.12_210/0.3)] bg-[color:oklch(0.84_0.12_210/0.06)] '
                        : 'text-fg-muted border border-transparent hover:text-fg-primary ') +
                      focusRingClassName
                    );
                  }}
                >
                  <span aria-hidden="true">{item.order}</span>
                  <span>{locale === 'es' ? item.es : item.en}</span>
                </NavLink>
              </li>
            ))}
          </ul>

          {/* Locale switcher: EN · ES toggle */}
          <button
            type="button"
            onClick={switchLocale}
            className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-sm font-mono text-micro tracking-[0.14em] uppercase border border-glass-hairline-inner hover:border-[color:oklch(0.84_0.12_210/0.4)] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] transition-colors ${focusRingClassName}`}
            aria-label={`Switch to ${otherLocale === 'en' ? 'English' : 'Spanish'}`}
          >
            <span className={locale === 'en' ? 'text-cyan' : 'text-fg-muted'}>EN</span>
            <span className="text-fg-muted">·</span>
            <span className={locale === 'es' ? 'text-cyan' : 'text-fg-muted'}>ES</span>
          </button>

          {/* Mobile hamburger — only shown below md breakpoint */}
          <button
            type="button"
            className={`md:hidden inline-flex items-center justify-center w-10 h-10 rounded-sm border border-glass-hairline-inner ${focusRingClassName}`}
            aria-expanded={menuOpen}
            aria-label="Toggle menu"
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
        <Link
          to={`/${locale}/`}
          className={`pointer-events-auto ${focusRingClassName} no-underline`}
        >
          <span className="text-fg-muted">SYS</span>{' '}
          <span className="text-fg-primary">portfolio-0.4</span>
        </Link>
      </Text>
    </header>
  );
}
