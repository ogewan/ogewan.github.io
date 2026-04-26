import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Plugin } from 'vite';

// Build-time sitemap.xml emitter. Walks the manifest (real if present,
// fixture otherwise) and the static-route table to produce a sitemap with
// hreflang alternates for the EN/ES locale pair.
//
// Why a custom plugin and not a runtime API: GH Pages serves static files;
// nothing computes per-request. Generating at build time keeps the file
// a real sibling of robots.txt so crawlers can resolve `Sitemap:` directly.

const STATIC_ROUTES = ['', 'about', 'projects', 'contact', 'colophon'] as const;
const LOCALES = ['en', 'es'] as const;

interface ManifestEntryLite {
  slug: string;
  pages_url?: string | null;
  pushed_at?: string;
}

function readManifest(repoRoot: string): ManifestEntryLite[] {
  const realPath = resolve(repoRoot, 'manifest.json');
  if (existsSync(realPath)) {
    try {
      return JSON.parse(readFileSync(realPath, 'utf8')) as ManifestEntryLite[];
    } catch {
      // fall through to fixture
    }
  }
  const fixturePath = resolve(repoRoot, 'packages/shell/src/data/manifest.fixture.json');
  if (existsSync(fixturePath)) {
    try {
      return JSON.parse(readFileSync(fixturePath, 'utf8')) as ManifestEntryLite[];
    } catch {
      return [];
    }
  }
  return [];
}

function buildSitemap(siteUrl: string, baseUrl: string, manifest: ManifestEntryLite[]): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  type SitemapUrl = { loc: string; alternates: { lang: string; loc: string }[]; lastmod?: string };
  const urls: SitemapUrl[] = [];

  // Static routes × locales.
  for (const slug of STATIC_ROUTES) {
    const path = slug === '' ? '/' : `/${slug}`;
    const alternates = LOCALES.map((lang) => ({
      lang,
      loc: `${siteUrl}${base}/${lang}${path === '/' ? '/' : path}`,
    }));
    for (const lang of LOCALES) {
      urls.push({
        loc: `${siteUrl}${base}/${lang}${path === '/' ? '/' : path}`,
        alternates,
      });
    }
  }

  // Per-project detail pages × locales. Skip projects with pages_url since
  // the canonical destination is the external site, not the redirect shim.
  for (const entry of manifest) {
    if (entry.pages_url) continue;
    const alternates = LOCALES.map((lang) => ({
      lang,
      loc: `${siteUrl}${base}/${lang}/projects/${entry.slug}`,
    }));
    const lastmod = entry.pushed_at?.split('T')[0];
    for (const lang of LOCALES) {
      const u: SitemapUrl = {
        loc: `${siteUrl}${base}/${lang}/projects/${entry.slug}`,
        alternates,
      };
      if (lastmod) u.lastmod = lastmod;
      urls.push(u);
    }
  }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls.map((u) => {
      const altLines = u.alternates.map(
        (a) => `    <xhtml:link rel="alternate" hreflang="${a.lang}" href="${a.loc}" />`,
      );
      return [
        '  <url>',
        `    <loc>${u.loc}</loc>`,
        ...altLines,
        ...(u.lastmod ? [`    <lastmod>${u.lastmod}</lastmod>`] : []),
        '  </url>',
      ].join('\n');
    }),
    '</urlset>',
  ].join('\n');

  return xml + '\n';
}

interface SitemapPluginOptions {
  siteUrl: string;
  baseUrl?: string;
  repoRoot: string;
}

export function sitemapPlugin(options: SitemapPluginOptions): Plugin {
  const { siteUrl, baseUrl = '/', repoRoot } = options;
  return {
    name: 'portfolio:sitemap',
    apply: 'build',
    generateBundle() {
      const manifest = readManifest(repoRoot);
      const xml = buildSitemap(siteUrl, baseUrl, manifest);
      this.emitFile({
        type: 'asset',
        fileName: 'sitemap.xml',
        source: xml,
      });
    },
  };
}
