import { type AnchorHTMLAttributes, type MouseEvent, type ReactNode, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router';

// Anchor that keeps the URL in lockstep via React Router's navigate({ replace: true })
// and lets MainPage's pathname-driven scroll effect handle the actual scroll.
// Renders a real <a href> so middle-click / cmd-click open in a new tab as expected.
//
// Used in two places:
//   - SiteHeader's primary nav (replaces the old NavLink → route push)
//   - inside sections, anywhere a TransitionLink used to point to another
//     top-level route (`/`, `/about`, `/projects`, `/contact`, `/colophon`).
//
// Project detail (/:locale/projects/:slug) is NOT a section — those still
// use TransitionLink for real route navigation.

export type SectionKey = 'home' | 'about' | 'projects' | 'contact' | 'colophon';

const SLUG_FOR: Record<SectionKey, string> = {
  home: '',
  about: 'about',
  projects: 'projects',
  contact: 'contact',
  colophon: 'colophon',
};

interface SectionLinkProps extends Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  'href' | 'onClick'
> {
  to: SectionKey;
  children: ReactNode;
}

// Locale comes from useLocation().pathname — useParams returns {} when this
// component renders inside SiteHeader (which sits beside <Routes>, not
// inside any matched route). Reading the pathname directly works in both
// the in-section call sites and the header.
function localeFromPathname(pathname: string): string {
  const m = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  return m?.[1] ?? 'en';
}

export function SectionLink({ to, children, className, ...rest }: SectionLinkProps) {
  const location = useLocation();
  const locale = localeFromPathname(location.pathname);
  const navigate = useNavigate();
  const slug = SLUG_FOR[to];
  const href = slug ? `/${locale}/${slug}` : `/${locale}/`;

  const onClick = useCallback(
    (e: MouseEvent<HTMLAnchorElement>) => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      e.preventDefault();
      navigate(href, { replace: true, preventScrollReset: true });
    },
    [href, navigate],
  );

  return (
    <a href={href} onClick={onClick} className={className} {...rest}>
      {children}
    </a>
  );
}
