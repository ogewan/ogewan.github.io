import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import common from '@portfolio/content/locales/common.json';
import nav from '@portfolio/content/locales/nav.json';
import meta from '@portfolio/content/locales/meta.json';
import home from '@portfolio/content/locales/home.json';
import about from '@portfolio/content/locales/about.json';
import projects from '@portfolio/content/locales/projects.json';
import projectDetail from '@portfolio/content/locales/projectDetail.json';
import projectRedirect from '@portfolio/content/locales/projectRedirect.json';
import contact from '@portfolio/content/locales/contact.json';
import colophon from '@portfolio/content/locales/colophon.json';
import notFound from '@portfolio/content/locales/notFound.json';

export const SUPPORTED_LOCALES = ['en', 'es'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

export function isSupportedLocale(value: string | undefined): value is SupportedLocale {
  return value === 'en' || value === 'es';
}

// Source namespace files use locale-as-leaf shape: every translatable string
// is { en, es } at the leaves, with arbitrary nesting above. i18next wants the
// inverse — a per-locale resource bundle. `pivotNamespace` walks one tree and
// produces { en: …, es: … } where each side has the same structure with the
// leaf object collapsed to its locale's string. Runs once at init.

type Leaf = { readonly en: string; readonly es: string };

type Pivoted<T> = T extends Leaf
  ? string
  : T extends object
    ? { readonly [K in keyof T]: Pivoted<T[K]> }
    : T;

function isLeaf(value: unknown): value is Leaf {
  if (value === null || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.en === 'string' && typeof v.es === 'string';
}

function pivotNamespace<T>(tree: T): { readonly en: Pivoted<T>; readonly es: Pivoted<T> } {
  const en: Record<string, unknown> = {};
  const es: Record<string, unknown> = {};
  for (const key of Object.keys(tree as object)) {
    const child = (tree as Record<string, unknown>)[key];
    if (isLeaf(child)) {
      en[key] = child.en;
      es[key] = child.es;
    } else {
      const sub = pivotNamespace(child);
      en[key] = sub.en;
      es[key] = sub.es;
    }
  }
  return { en: en as Pivoted<T>, es: es as Pivoted<T> };
}

const commonP = pivotNamespace(common);
const navP = pivotNamespace(nav);
const metaP = pivotNamespace(meta);
const homeP = pivotNamespace(home);
const aboutP = pivotNamespace(about);
const projectsP = pivotNamespace(projects);
const projectDetailP = pivotNamespace(projectDetail);
const projectRedirectP = pivotNamespace(projectRedirect);
const contactP = pivotNamespace(contact);
const colophonP = pivotNamespace(colophon);
const notFoundP = pivotNamespace(notFound);

const resources = {
  en: {
    common: commonP.en,
    nav: navP.en,
    meta: metaP.en,
    home: homeP.en,
    about: aboutP.en,
    projects: projectsP.en,
    projectDetail: projectDetailP.en,
    projectRedirect: projectRedirectP.en,
    contact: contactP.en,
    colophon: colophonP.en,
    notFound: notFoundP.en,
  },
  es: {
    common: commonP.es,
    nav: navP.es,
    meta: metaP.es,
    home: homeP.es,
    about: aboutP.es,
    projects: projectsP.es,
    projectDetail: projectDetailP.es,
    projectRedirect: projectRedirectP.es,
    contact: contactP.es,
    colophon: colophonP.es,
    notFound: notFoundP.es,
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
      'meta',
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
