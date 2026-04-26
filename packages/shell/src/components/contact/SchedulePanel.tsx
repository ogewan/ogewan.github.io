import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { GlassPanel, Heading, Text } from '@portfolio/ui';

// Schedule panel — gates the Calendly inline embed behind a Cloudflare
// Turnstile challenge. Both env vars (VITE_TURNSTILE_SITE_KEY and
// VITE_CALENDLY_URL) must be set to fully enable the panel; missing either
// degrades to a hint card.
//
// Why no react-calendly: that wrapper is heavier than the raw inline-embed
// script and we only need this one call site. Mirror the Angular timeline
// lazy-load pattern: tiny wrapper, raw script tag, no extra dependency.

const CALENDLY_SCRIPT = 'https://assets.calendly.com/assets/external/widget.js';

let calendlyScriptPromise: Promise<void> | null = null;
function loadCalendlyScript(): Promise<void> {
  if (calendlyScriptPromise) return calendlyScriptPromise;
  calendlyScriptPromise = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${CALENDLY_SCRIPT}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = CALENDLY_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Calendly script failed to load'));
    document.head.appendChild(script);
  });
  return calendlyScriptPromise;
}

export function SchedulePanel() {
  const { t } = useTranslation(['contact']);
  const turnstileKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;
  const calendlyUrl = import.meta.env.VITE_CALENDLY_URL as string | undefined;
  const [verified, setVerified] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);
  const calendlyContainerRef = useRef<HTMLDivElement | null>(null);

  // Mount the Calendly inline embed once we're verified and have a URL.
  useEffect(() => {
    if (!verified || !calendlyUrl || !calendlyContainerRef.current) return;
    let cancelled = false;
    void loadCalendlyScript().then(() => {
      if (cancelled) return;
      // Calendly's script reads existing .calendly-inline-widget elements on load;
      // for runtime mounts we set data-url on the div and force-init via the
      // global Calendly object if available. The script's own MutationObserver
      // also picks up attribute changes, but we trigger explicitly to avoid a
      // visible delay.
      const node = calendlyContainerRef.current;
      if (!node) return;
      node.setAttribute('data-url', calendlyUrl);
      const w = window as unknown as {
        Calendly?: {
          initInlineWidget: (opts: { url: string; parentElement: HTMLElement }) => void;
        };
      };
      if (w.Calendly?.initInlineWidget) {
        w.Calendly.initInlineWidget({ url: calendlyUrl, parentElement: node });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [verified, calendlyUrl]);

  if (!turnstileKey || !calendlyUrl) {
    return (
      <GlassPanel id="schedule" className="p-6 min-h-[280px] flex flex-col gap-3">
        <Text variant="label">{t('sections.schedule.verifyHeading')}</Text>
        <Text variant="small" className="text-fg-muted">
          {!turnstileKey ? t('sections.schedule.turnstileMissing') : null}
        </Text>
        <Text variant="small" className="text-fg-muted">
          {!calendlyUrl ? t('sections.schedule.calendlyMissing') : null}
        </Text>
      </GlassPanel>
    );
  }

  return (
    <GlassPanel id="schedule" className="p-6 min-h-[480px] flex flex-col gap-4">
      {!verified ? (
        <div className="flex flex-col items-center justify-center gap-4 flex-1">
          <Heading level={3} className="text-center">
            {t('sections.schedule.verifyHeading')}
          </Heading>
          <Text variant="small" className="text-fg-muted text-center max-w-md">
            {t('sections.schedule.verifyBody')}
          </Text>
          <Turnstile
            ref={turnstileRef}
            siteKey={turnstileKey}
            options={{ theme: 'dark', size: 'flexible' }}
            onSuccess={() => setVerified(true)}
          />
        </div>
      ) : (
        <>
          <Text variant="label" className="text-cyan">
            {t('sections.schedule.verifiedHeading')}
          </Text>
          <div
            ref={calendlyContainerRef}
            className="calendly-inline-widget flex-1 min-h-[480px]"
            aria-label={t('sections.schedule.ariaCalendar')}
          />
        </>
      )}
    </GlassPanel>
  );
}
