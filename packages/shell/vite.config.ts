import { resolve } from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sitemapPlugin } from './vite-plugin-sitemap';

export default defineConfig(() => {
  const baseUrl = process.env.VITE_BASE_URL ?? '/';
  // VITE_SITE_URL is the canonical origin used inside sitemap.xml. Default is
  // the GH Pages convention; the deploy workflow can override it.
  const siteUrl = process.env.VITE_SITE_URL ?? 'https://username.github.io';
  return {
    plugins: [
      react(),
      tailwindcss(),
      sitemapPlugin({
        siteUrl,
        baseUrl,
        repoRoot: resolve(__dirname, '../..'),
      }),
    ],
    base: baseUrl,
    server: {
      port: 5173,
    },
  };
});
