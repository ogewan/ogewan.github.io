import { useEffect } from 'react';
import { useLocation, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { findEntryBySlug } from '../data/manifest';

// Per-route, per-locale document <head> updates: title, meta description,
// html lang, and the per-page hreflang alternates. Crawlers that index static
// HTML get the index.html defaults; crawlers that execute JS pick up the
// per-page values on each route change. Same hook also covers AT users via
// SiteLayout's #route-announcer.

type PageKey =
  | 'home'
  | 'about'
  | 'projects'
  | 'projectDetail'
  | 'projectRedirect'
  | 'contact'
  | 'colophon'
  | 'notFound';

function pageKeyFromPathname(pathname: string, locale: string): PageKey {
  const localePrefix = `/${locale}`;
  if (!pathname.startsWith(localePrefix)) return 'notFound';
  const rest = pathname.slice(localePrefix.length).replace(/^\/+/, '').replace(/\/+$/, '');
  if (rest === '') return 'home';
  const [first, second, third] = rest.split('/');
  if (first === 'about') return 'about';
  if (first === 'contact') return 'contact';
  if (first === 'colophon') return 'colophon';
  if (first === 'projects') {
    if (!second) return 'projects';
    if (third === 'redirect') return 'projectRedirect';
    return 'projectDetail';
  }
  return 'notFound';
}

function setOrCreateMeta(
  selector: string,
  attr: 'name' | 'property',
  name: string,
  content: string,
) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.content = content;
}

function setHreflangAlternates(pathnameSansLocale: string) {
  // Update or insert exactly two hreflang links + the x-default. The static
  // index.html ships these for /; we rewrite the href on every route change
  // so the canonical/alternates point at the actual page.
  const origin = window.location.origin;
  const updates: Array<{ lang: string; href: string }> = [
    { lang: 'en', href: `${origin}/en${pathnameSansLocale}` },
    { lang: 'es', href: `${origin}/es${pathnameSansLocale}` },
    { lang: 'x-default', href: `${origin}/en${pathnameSansLocale}` },
  ];
  for (const { lang, href } of updates) {
    let link = document.head.querySelector<HTMLLinkElement>(
      `link[rel="alternate"][hreflang="${lang}"]`,
    );
    if (!link) {
      link = document.createElement('link');
      link.rel = 'alternate';
      link.hreflang = lang;
      document.head.appendChild(link);
    }
    link.href = href;
  }
}

export function useDocumentMeta() {
  const location = useLocation();
  const params = useParams<{ locale?: string; slug?: string }>();
  const locale = params.locale ?? 'en';
  const { t } = useTranslation(['meta']);

  useEffect(() => {
    const pageKey = pageKeyFromPathname(location.pathname, locale);

    // Resolve dynamic title/description for project detail / redirect pages.
    let title = t(`pages.${pageKey}.title`);
    let description = t(`pages.${pageKey}.description`);
    if ((pageKey === 'projectDetail' || pageKey === 'projectRedirect') && params.slug) {
      const entry = findEntryBySlug(params.slug);
      if (entry) {
        title = t(`pages.${pageKey}.title`, { project: entry.title });
        description = t(`pages.${pageKey}.description`, {
          project: entry.title,
          summary: entry.summary,
        });
      }
    }

    document.title = title;
    setOrCreateMeta('meta[name="description"]', 'name', 'description', description);
    setOrCreateMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setOrCreateMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setOrCreateMeta(
      'meta[property="og:locale"]',
      'property',
      'og:locale',
      locale === 'es' ? 'es_ES' : 'en_US',
    );
    setOrCreateMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setOrCreateMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

    // Keep <html lang> in sync so screen readers pronounce correctly.
    document.documentElement.lang = locale;

    // Per-page hreflang alternates (drop locale prefix to compute the path).
    const pathnameSansLocale = location.pathname.replace(/^\/[a-z]{2}/, '') || '/';
    setHreflangAlternates(pathnameSansLocale);
  }, [location.pathname, locale, params.slug, t]);
}
