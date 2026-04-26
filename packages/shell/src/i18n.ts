import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enCommon from '@portfolio/content/locales/en/common.json';
import enNav from '@portfolio/content/locales/en/nav.json';
import enHome from '@portfolio/content/locales/en/home.json';
import enAbout from '@portfolio/content/locales/en/about.json';
import enProjects from '@portfolio/content/locales/en/projects.json';
import enProjectDetail from '@portfolio/content/locales/en/projectDetail.json';
import enProjectRedirect from '@portfolio/content/locales/en/projectRedirect.json';
import enContact from '@portfolio/content/locales/en/contact.json';
import enColophon from '@portfolio/content/locales/en/colophon.json';
import enNotFound from '@portfolio/content/locales/en/notFound.json';

import esCommon from '@portfolio/content/locales/es/common.json';
import esNav from '@portfolio/content/locales/es/nav.json';
import esHome from '@portfolio/content/locales/es/home.json';
import esAbout from '@portfolio/content/locales/es/about.json';
import esProjects from '@portfolio/content/locales/es/projects.json';
import esProjectDetail from '@portfolio/content/locales/es/projectDetail.json';
import esProjectRedirect from '@portfolio/content/locales/es/projectRedirect.json';
import esContact from '@portfolio/content/locales/es/contact.json';
import esColophon from '@portfolio/content/locales/es/colophon.json';
import esNotFound from '@portfolio/content/locales/es/notFound.json';

export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: string | undefined): value is SupportedLocale {
  return value === 'en' || value === 'es';
}

const resources = {
  en: {
    common: enCommon,
    nav: enNav,
    home: enHome,
    about: enAbout,
    projects: enProjects,
    projectDetail: enProjectDetail,
    projectRedirect: enProjectRedirect,
    contact: enContact,
    colophon: enColophon,
    notFound: enNotFound,
  },
  es: {
    common: esCommon,
    nav: esNav,
    home: esHome,
    about: esAbout,
    projects: esProjects,
    projectDetail: esProjectDetail,
    projectRedirect: esProjectRedirect,
    contact: esContact,
    colophon: esColophon,
    notFound: esNotFound,
  },
} as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: SUPPORTED_LOCALES,
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common',
      'nav',
      'home',
      'about',
      'projects',
      'projectDetail',
      'projectRedirect',
      'contact',
      'colophon',
      'notFound',
    ],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      lookupLocalStorage: 'portfolio:locale',
      caches: ['localStorage'],
    },
    returnNull: false,
  });

export default i18n;

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common';
    resources: (typeof resources)['en'];
  }
}
