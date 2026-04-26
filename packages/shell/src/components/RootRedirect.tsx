import { Navigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { isSupportedLocale } from '../i18n';

// `/` redirect. The i18next-browser-languagedetector populates i18n.language
// at init time using the configured precedence: localStorage → navigator → fallback.
// We just read the result rather than duplicating the chain.
export function RootRedirect() {
  const { i18n } = useTranslation();
  // Detector strips region tags (en-US → en) when supportedLngs is set, so this
  // is already a clean two-letter code for our two supported locales — but be
  // defensive in case detector is mid-init or returns something unexpected.
  const lang = isSupportedLocale(i18n.language) ? i18n.language : 'en';
  return <Navigate to={`/${lang}/`} replace />;
}
