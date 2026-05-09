import { resolve } from 'node:path';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { sitemapPlugin } from './vite-plugin-sitemap';
import siteConfig from '../../config.json';

const REPO_ROOT = resolve(__dirname, '../..');
const TIMELINE_GENERATOR = resolve(REPO_ROOT, 'packages/content/scripts/generate-timeline.mjs');

// Runs the timeline generator on every build start so the committed
// `packages/content/src/generated/*` files reflect the current `config.json`
// + locale files. In dev, watches the source files and re-runs on change so
// edits show up without restarting Vite (the generated TS files are inside
// the module graph and trigger normal HMR/invalidation).
function timelineGeneratorPlugin(): Plugin {
  const run = (): void => {
    try {
      execFileSync(process.execPath, [TIMELINE_GENERATOR], { stdio: 'inherit' });
    } catch (err) {
      console.error('[timeline-generator] failed:', err);
    }
  };
  const isWatchTarget = (path: string): boolean => path === resolve(REPO_ROOT, 'config.json');
  return {
    name: 'portfolio:timeline-generator',
    buildStart() {
      run();
    },
    configureServer(server) {
      server.watcher.add(resolve(REPO_ROOT, 'config.json'));
      server.watcher.on('change', (path) => {
        if (isWatchTarget(path)) run();
      });
    },
  };
}

// humans.txt carries `<your-name>` / `<username>` tokens at rest in `public/`
// so the source file matches the placeholder voice. This plugin replaces them
// with the resolved values from `config.json` on both dev requests and the
// build output (the file Vite copies into `dist/` from `public/`).
function humansTxtTemplatePlugin(): Plugin {
  const publicSrc = resolve(__dirname, 'public/humans.txt');
  const replace = (raw: string): string =>
    raw
      .replace(/<your-name>/g, siteConfig.owner.name)
      .replace(/<username>/g, siteConfig.owner.github);

  return {
    name: 'portfolio:humans-txt-template',
    configureServer(server) {
      server.middlewares.use('/humans.txt', (_req, res, next) => {
        if (!existsSync(publicSrc)) return next();
        const raw = readFileSync(publicSrc, 'utf8');
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.end(replace(raw));
      });
    },
    closeBundle() {
      // Vite has already copied `public/humans.txt` verbatim into outDir by
      // the time this hook fires. Rewrite the copy in place.
      const outFile = resolve(__dirname, 'dist/humans.txt');
      if (!existsSync(outFile)) return;
      writeFileSync(outFile, replace(readFileSync(outFile, 'utf8')), 'utf8');
    },
  };
}

export default defineConfig(() => {
  const baseUrl = process.env.VITE_BASE_URL ?? '/';
  // Site origin used inside sitemap.xml + canonical/og URLs. Default comes
  // from `config.json`; the deploy workflow can override via VITE_SITE_URL.
  const siteUrl = process.env.VITE_SITE_URL ?? siteConfig.site.url;
  return {
    plugins: [
      react(),
      tailwindcss(),
      timelineGeneratorPlugin(),
      humansTxtTemplatePlugin(),
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
