import { useEffect } from 'react';
import { Outlet, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { NotFound } from '../pages/NotFound';
import { isSupportedLocale } from '../i18n';

// Layout route for `/:locale`. Validates the locale prefix and keeps
// i18next's active language in lockstep with the URL. Renders <NotFound />
// for unknown locale prefixes (e.g. /zh/about) instead of letting children
// mount with a missing translation context.
//
// The old ScrollRouteNavigator (Phase 6) is gone — section-to-section
// navigation now happens via in-page scroll on MainPage rather than via
// route changes.
export function LocaleSync() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale;
  const { i18n } = useTranslation();

  useEffect(() => {
    if (!locale || !isSupportedLocale(locale)) return;
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
  }, [locale, i18n]);

  if (!locale || !isSupportedLocale(locale)) {
    return <NotFound />;
  }
  return <Outlet />;
}
