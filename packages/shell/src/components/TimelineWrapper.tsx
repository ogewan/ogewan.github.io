import { useEffect, useRef, useState } from 'react';
import {
  TIMELINE_NODES,
  TIMELINE_STRINGS,
  type TimelineNode,
  type TimelineStringsDict,
} from '@portfolio/content';

// React → Angular custom element bridge.
//
// The polyglot moment: <portfolio-timeline> is a Web Component registered
// by the Angular bundle. React renders it via JSX like any other tag, but
// two constraints shape this wrapper:
//
//   1. **Object inputs cross the bridge as DOM properties, not attributes.**
//      HTML attributes are strings; Angular's element-attribute-to-input
//      mapping handles strings fine (`locale="en"` works), but `data` is
//      a TimelineNode[] array. React's JSX doesn't know that custom-element
//      properties exist — it only sets attributes. So we set `el.data = nodes`
//      imperatively in a useEffect after the element is defined.
//
//   2. **The bundle is loaded on demand only when this component mounts.**
//      Eagerly importing it would put ~150KB+ of Angular runtime on the
//      hero page. The build pipeline copies the bundle into the shell's
//      public/ directory; this wrapper injects a <script type="module">
//      tag the first time it mounts. Subsequent mounts short-circuit on
//      customElements.get('portfolio-timeline').

const BUNDLE_JS = '/ng-elements/ng-elements.js';
const BUNDLE_CSS = '/ng-elements/ng-elements.css';

let loadPromise: Promise<void> | null = null;

function loadElement(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (customElements.get('portfolio-timeline')) return Promise.resolve();
  if (loadPromise) return loadPromise;

  loadPromise = new Promise<void>((resolve, reject) => {
    // Inject the stylesheet first so the timeline renders styled the moment
    // it appears.
    if (!document.querySelector(`link[href="${BUNDLE_CSS}"]`)) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = BUNDLE_CSS;
      document.head.appendChild(link);
    }

    // Side-effect-loaded ES module. Angular's main.ts calls
    // customElements.define('portfolio-timeline', ...) on load.
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${BUNDLE_JS}"]`);
    if (existing) {
      // Another wrapper instance kicked off the load already; wait on
      // whenDefined.
      void customElements.whenDefined('portfolio-timeline').then(() => resolve());
      return;
    }
    const script = document.createElement('script');
    script.type = 'module';
    script.src = BUNDLE_JS;
    script.onerror = () =>
      reject(
        new Error(`Failed to load ${BUNDLE_JS}. Run pnpm --filter @portfolio/ng-elements build.`),
      );
    script.onload = () => {
      void customElements.whenDefined('portfolio-timeline').then(() => resolve());
    };
    document.head.appendChild(script);
  });

  return loadPromise;
}

// Augment JSX so TS lets us write <portfolio-timeline> without `any`.
declare module 'react' {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      'portfolio-timeline': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLElement>,
        HTMLElement
      > & { locale?: string };
    }
  }
}

interface TimelineWrapperProps {
  locale: string;
  nodes?: readonly TimelineNode[];
}

type LoadState = 'loading' | 'ready' | 'error';

export function TimelineWrapper({ locale, nodes }: TimelineWrapperProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<LoadState>('loading');

  useEffect(() => {
    let cancelled = false;
    loadElement().then(
      () => !cancelled && setState('ready'),
      () => !cancelled && setState('error'),
    );
    return () => {
      cancelled = true;
    };
  }, []);

  // Set the `strings` + `data` properties imperatively after the element is
  // defined. Property writes are required for non-string inputs across the
  // bridge. Strings first so the template never renders a node before its copy
  // is present. `TIMELINE_STRINGS` is module-static — it comes from the
  // generated module that the Vite plugin regenerates on config.json change —
  // so the Angular bundle no longer needs rebuilding when timeline copy changes.
  useEffect(() => {
    if (state !== 'ready' || !ref.current) return;
    const el = ref.current as unknown as {
      strings: TimelineStringsDict;
      data: readonly TimelineNode[];
    };
    el.strings = TIMELINE_STRINGS;
    el.data = nodes ?? TIMELINE_NODES;
  }, [state, nodes]);

  if (state === 'error') {
    return (
      <div role="alert" className="font-mono text-micro text-fg-muted py-8 text-center">
        Timeline bundle failed to load. Run{' '}
        <code className="text-cyan">pnpm --filter @portfolio/ng-elements build</code> and refresh.
      </div>
    );
  }

  return (
    <div className="timeline-wrapper">
      {state === 'loading' ? (
        <div aria-live="polite" className="font-mono text-micro text-fg-muted py-8 text-center">
          Loading timeline…
        </div>
      ) : null}
      <portfolio-timeline ref={ref} locale={locale} aria-busy={state !== 'ready'} />
    </div>
  );
}
