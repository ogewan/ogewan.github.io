import { useEffect } from 'react';
import { manifest } from '../data/manifest';

// Hero-idle preloader. Mounted only on Home — fires once per session during
// the lens-flare "settled" window to warm the heavy lazy chunks the user is
// about to wheel-scroll into:
//   - The Angular timeline bundle (about 60 KB gz) used on /about.
//   - The MapLibre + Turnstile lazy chunks used on /contact.
//   - The first screenshot of every project (Phase 8 addition; only fires
//     once the real manifest is in place — fixture's images are local
//     placeholder gradients, not URLs).
//
// Bail-outs (skip preload):
//   - sessionStorage flag already set (already done this session)
//   - navigator.connection.saveData OR effectiveType ∈ {2g, slow-2g}
//   - prefers-reduced-motion (user implicitly opts into a leaner experience)

const SESSION_FLAG = 'portfolio:preloaded';
const NG_BUNDLE_URL = '/ng-elements/ng-elements.js';

interface NetworkInformationLike {
  saveData?: boolean;
  effectiveType?: string;
}

interface NavigatorWithConnection extends Navigator {
  connection?: NetworkInformationLike;
}

function shouldSkip(): boolean {
  if (typeof window === 'undefined') return true;
  if (sessionStorage.getItem(SESSION_FLAG) === '1') return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
  const conn = (navigator as NavigatorWithConnection).connection;
  if (conn?.saveData) return true;
  if (conn?.effectiveType === '2g' || conn?.effectiveType === 'slow-2g') return true;
  return false;
}

function preloadAngularBundle() {
  if (document.querySelector(`link[href="${NG_BUNDLE_URL}"][rel="modulepreload"]`)) return;
  const link = document.createElement('link');
  link.rel = 'modulepreload';
  link.href = NG_BUNDLE_URL;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

function warmContactChunks() {
  // ContactMap is lazy-imported by Contact.tsx (~285 KB gz with MapLibre); kick
  // off the chunk fetch so it's already cached when the user navigates to
  // /contact. SchedulePanel is statically imported by Contact.tsx (it ships in
  // the main bundle), so we don't preload its module here. Instead, preload
  // Cloudflare's Turnstile API script — that's the actual long-pole network
  // call SchedulePanel makes on mount.
  void import('./contact/ContactMap');
  if (!document.querySelector('link[rel="preload"][href*="challenges.cloudflare.com/turnstile"]')) {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'script';
    link.href = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    link.crossOrigin = 'anonymous';
    document.head.appendChild(link);
  }
}

function prefetchProjectMedia() {
  // Only prefetch real http(s) URLs — fixture entries have placeholder
  // gradient strings, not URLs. Cap at the first 3 projects' first media item
  // each so we don't burn bandwidth on a long manifest. Project cards already
  // use IntersectionObserver to lazy-prefetch beyond that. Skip videos —
  // `link.as = 'image'` would be a hint mismatch and the browser would
  // re-fetch on render anyway.
  const seen = new Set<string>();
  for (const entry of manifest.slice(0, 3)) {
    const first = entry.media?.[0];
    if (!first || !/^https?:\/\//.test(first)) continue;
    if (/\.(mp4|webm|mov)(\?|$)/i.test(first)) continue;
    if (seen.has(first)) continue;
    seen.add(first);
    const link = document.createElement('link');
    link.rel = 'prefetch';
    link.as = 'image';
    link.href = first;
    document.head.appendChild(link);
  }
}

function runPreload() {
  preloadAngularBundle();
  warmContactChunks();
  prefetchProjectMedia();
  try {
    sessionStorage.setItem(SESSION_FLAG, '1');
  } catch {
    // QuotaExceeded or storage disabled; the worst case is preload fires again
    // on the next home mount this session, which is harmless.
  }
}

export function RoutePreloader() {
  useEffect(() => {
    if (shouldSkip()) return;
    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    const w = window as IdleWindow;
    if (typeof w.requestIdleCallback === 'function') {
      const handle = w.requestIdleCallback(runPreload, { timeout: 3000 });
      return () => {
        w.cancelIdleCallback?.(handle);
      };
    }
    // Safari + older browsers don't have rIC; fall back to a 1.5s timeout
    // to land roughly during the hero's "settled" phase.
    const t = window.setTimeout(runPreload, 1500);
    return () => {
      window.clearTimeout(t);
    };
  }, []);
  return null;
}
