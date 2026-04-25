import { useEffect, useRef } from 'react';

// Inject a `<link rel="prefetch">` for an external URL when the element comes
// into view. Used by project cards whose `pages_url` points to an external site —
// brief: prefetch on viewport entry via IntersectionObserver. Internal-route
// prefetch is handled by react-router's `prefetch="intent"` on TransitionLink.

const injected = new Set<string>();

function injectPrefetch(href: string): void {
  if (injected.has(href)) return;
  injected.add(href);
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.href = href;
  link.crossOrigin = 'anonymous';
  document.head.appendChild(link);
}

export function useExternalPrefetch<T extends HTMLElement>(href: string | null | undefined) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !href) return;
    if (typeof IntersectionObserver === 'undefined') {
      injectPrefetch(href);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            injectPrefetch(href);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: '256px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [href]);

  return ref;
}
