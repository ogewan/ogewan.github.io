import { useTranslation } from 'react-i18next';
import {
  CELESTIAL_QUALITIES,
  useCelestialQuality,
  type CelestialQuality,
} from '@portfolio/celestial';
import { focusRingClassName } from '@portfolio/ui';

// Three-state segmented control for the celestial backdrop's quality mode.
// Lives in the SiteHeader between the nav and the locale switcher.
//
//   Full   — full R3F canvas (quality mode)
//   Still  — committed scene snapshots (static mode)
//   Lite   — CSS gradient placeholder (simple mode)
//
// Default is `quality`. Selection persists to localStorage via the
// CelestialQualityContext provider; cross-tab sync is handled there too.
//
// Visual: same chrome family as the EN·ES locale switcher — 3 inline pills
// inside a single border, the active one in cyan.

const ORDER: CelestialQuality[] = [...CELESTIAL_QUALITIES];

export function QualitySwitcher() {
  const { quality, setQuality } = useCelestialQuality();
  const { t } = useTranslation(['nav']);

  return (
    <div
      role="group"
      aria-label={t('quality.ariaLabel')}
      className="hidden md:inline-flex items-center gap-0.5 px-1 py-1 rounded-sm border border-glass-hairline-inner"
    >
      {ORDER.map((q) => {
        const active = quality === q;
        return (
          <button
            key={q}
            type="button"
            aria-pressed={active}
            title={t(`quality.tooltips.${q}`)}
            onClick={() => setQuality(q)}
            className={
              `px-2 py-1 rounded-sm font-mono text-micro tracking-[0.14em] uppercase ` +
              `transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] ` +
              (active
                ? 'text-cyan bg-[color:oklch(0.84_0.12_210/0.10)] '
                : 'text-fg-muted hover:text-fg-primary ') +
              focusRingClassName
            }
          >
            {t(`quality.options.${q}`)}
          </button>
        );
      })}
    </div>
  );
}
