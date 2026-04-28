import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { focusRingClassName } from '@portfolio/ui';
import { Dropdown } from './Dropdown';

// Single-button dropdown for the locale switcher. Replaces the inline
// EN · ES toggle. Tells i18next first (so the detector caches to
// localStorage), then rewrites the URL so the route layout's LocaleSync
// no-ops on its own changeLanguage check. Falls back to the home of the
// alternate locale if the current path doesn't start with the active locale
// prefix (defensive, mirrors the old behavior).
//
// IMPORTANT: locale is derived from useLocation().pathname, NOT useParams.
// This component renders inside SiteHeader → SiteLayout, which sits beside
// <Routes>, not inside any matched route — so useParams returns {} and the
// `:locale` param is invisible from here. Reading the pathname directly
// works everywhere in the Router subtree.

const LOCALES = ['en', 'es'] as const;
type Locale = (typeof LOCALES)[number];

function localeFromPathname(pathname: string): Locale {
  const m = pathname.match(/^\/([a-z]{2})(?:\/|$)/);
  return m?.[1] === 'es' ? 'es' : 'en';
}

export function LocaleSwitcher() {
  const location = useLocation();
  const locale = localeFromPathname(location.pathname);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation(['nav']);

  const switchTo = (next: Locale) => {
    if (next === locale) return;
    const current = location.pathname;
    const target = current.startsWith(`/${locale}`)
      ? current.replace(`/${locale}`, `/${next}`)
      : `/${next}/`;
    void i18n.changeLanguage(next);
    navigate(target);
  };

  const options = LOCALES.map((l) => ({
    value: l,
    label: l.toUpperCase(),
    title: t(l === 'en' ? 'languageEn' : 'languageEs'),
  }));

  const triggerClassName =
    'inline-flex items-center justify-center px-3 py-1.5 rounded-sm font-mono text-micro tracking-[0.14em] uppercase ' +
    'text-cyan border border-glass-hairline-inner hover:border-[color:oklch(0.84_0.12_210/0.4)] ' +
    '[transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] transition-colors ' +
    focusRingClassName;

  const otherLocale: Locale = locale === 'en' ? 'es' : 'en';
  const ariaLabel = t('ariaSwitchTo', {
    language: t(otherLocale === 'en' ? 'languageEn' : 'languageEs'),
  });

  return (
    <Dropdown
      value={locale}
      options={options}
      onChange={switchTo}
      triggerLabel={locale.toUpperCase()}
      ariaLabel={ariaLabel}
      triggerClassName={triggerClassName}
    />
  );
}
