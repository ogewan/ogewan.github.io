import { useTranslation } from 'react-i18next';
import { CELESTIAL_QUALITIES, useCelestialQuality } from '@portfolio/celestial';
import { focusRingClassName } from '@portfolio/ui';
import { Dropdown } from './Dropdown';

// Single-button dropdown for the celestial backdrop's quality mode. Replaces
// the previous segmented control. Lives in the SiteHeader between the nav
// and the locale switcher.
//
//   Full   — full R3F canvas (quality mode)
//   Still  — committed scene snapshots (static mode)
//   Lite   — CSS gradient placeholder (simple mode)
//
// Default is `quality`. Selection persists to localStorage via the
// CelestialQualityContext provider; cross-tab sync is handled there too.

export function QualitySwitcher() {
  const { quality, setQuality } = useCelestialQuality();
  const { t } = useTranslation(['nav']);

  const options = CELESTIAL_QUALITIES.map((q) => ({
    value: q,
    label: t(`quality.options.${q}`),
    title: t(`quality.tooltips.${q}`),
  }));

  const triggerClassName =
    'inline-flex items-center justify-center px-3 py-1.5 rounded-sm font-mono text-micro tracking-[0.14em] uppercase ' +
    'text-cyan border border-glass-hairline-inner hover:border-[color:oklch(0.84_0.12_210/0.4)] ' +
    '[transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] transition-colors ' +
    focusRingClassName;

  return (
    <Dropdown
      value={quality}
      options={options}
      onChange={setQuality}
      triggerLabel={t(`quality.options.${quality}`)}
      ariaLabel={t('quality.ariaLabel')}
      triggerClassName={triggerClassName}
    />
  );
}
