import { Trans, useTranslation } from 'react-i18next';
import { Button, Container, GlassPanel, Heading, Text } from '@portfolio/ui';
import { SectionLink } from '../SectionLink';
import { siteConfig } from '../../data/site-config';
import { currentFocusEntry, manifest } from '../../data/manifest';

// Hero section. Earth-scene backdrop is rendered behind by CelestialBackdrop.
// Was the old Home page; now the first section on the one-page MainPage.
//
// Three derived blocks:
//   - Top-right glass readout: shows `siteConfig.owner.availability`. Hidden
//     when availability is empty.
//   - Bottom-strip "currently" column: title + role from `currentFocusEntry`
//     (config.current_focus → manifest, else first featured by pushed_at).
//     Hidden when no current focus is resolvable (per locked decision).
//   - Bottom-strip "selected" column: "Selected · {year}" + "{count} things in
//     orbit". Year defaults to the current year, override via
//     config.selected.year_override; count is the manifest length. Hidden
//     when the manifest is empty (dev-only, no entries to surface).
export function HeroSection() {
  const { t } = useTranslation(['home']);
  const { owner, selected } = siteConfig;
  const focus = currentFocusEntry;

  const availability = owner.availability;
  const showAvailabilityReadout = availability.length > 0;
  const showCurrentlyColumn = focus !== undefined;
  const showSelectedColumn = manifest.length > 0;

  const year = selected?.year_override ?? new Date().getFullYear();

  return (
    <Container className="min-h-[calc(100vh-12rem)] flex flex-col justify-between gap-16 pb-16">
      {/* Top — eyebrow + display headline */}
      <div className="pt-16">
        <Text variant="label" className="mb-6 inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
          {t('eyebrow')}
        </Text>
        <Heading level={1} variant="display" tabIndex={-1} className="max-w-[18ch]">
          <Trans
            i18nKey="headline"
            t={t}
            components={{ em: <em className="not-italic text-fg-secondary" /> }}
          />
        </Heading>
        <Text variant="lead" className="mt-8 max-w-[640px]">
          {t('lead')}
        </Text>

        {/* CTA pair */}
        <div className="mt-10 flex flex-wrap gap-3">
          <SectionLink to="projects" className="no-underline">
            <Button variant="primary">
              {t('ctaWork')} <span aria-hidden="true">→</span>
            </Button>
          </SectionLink>
          <SectionLink to="contact" className="no-underline">
            <Button>
              {t('ctaContact')} <span aria-hidden="true">→</span>
            </Button>
          </SectionLink>
        </div>
      </div>

      {/* Glass readout — the C residue from the design chat. Shown only on
          wide viewports so the headline owns the reading order on mobile. */}
      {showAvailabilityReadout ? (
        <GlassPanel
          variant="elev"
          className="hidden xl:block absolute right-24 top-1/2 -translate-y-1/2 max-w-xs p-5 pointer-events-auto"
          aria-label={t('currentlyAria')}
        >
          <Text variant="label" className="mb-2 block">
            {t('currently.label')}
          </Text>
          <Text variant="small" className="text-fg-primary">
            {availability}
          </Text>
        </GlassPanel>
      ) : null}

      {/* Bottom strip — "currently / selected / scroll" mono labels */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10">
        {showCurrentlyColumn ? (
          <div>
            <Text variant="label" className="mb-1 block">
              {t('currently.label')}
            </Text>
            <Text variant="small" className="text-fg-primary">
              {focus.title}
            </Text>
            {focus.role ? <Text variant="small">{`· ${focus.role}`}</Text> : null}
          </div>
        ) : null}
        {showSelectedColumn ? (
          <div>
            <Text variant="label" className="mb-1 block">
              {t('selected.label', { year })}
            </Text>
            <Text variant="small" className="text-fg-primary">
              {t('selected.value', { count: manifest.length })}
            </Text>
            <Text variant="small">
              <SectionLink to="projects" className="text-cyan no-underline">
                {t('selected.link')}
              </SectionLink>
            </Text>
          </div>
        ) : null}
        <div>
          <Text variant="label" className="mb-1 block">
            {t('next.label')}
          </Text>
          <Text variant="small" className="text-fg-primary">
            <SectionLink to="about" className="no-underline">
              {t('next.value')}
            </SectionLink>
          </Text>
        </div>
      </div>
    </Container>
  );
}
