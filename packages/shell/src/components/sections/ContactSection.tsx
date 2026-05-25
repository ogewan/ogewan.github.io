import { lazy, Suspense } from 'react';
import { useParams } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { Container, GlassPanel, Heading, Text } from '@portfolio/ui';
import { SchedulePanel } from '../contact/SchedulePanel';
import { useVisitorLocation } from '../useVisitorLocation';
import { siteConfig } from '../../data/site-config';
import { optional } from '../../i18n';

const ContactMap = lazy(() => import('../contact/ContactMap'));

// Contact section. Calendly inline embed lives behind a Cloudflare Turnstile
// challenge (SchedulePanel). MapLibre map below the fold shows the visitor +
// Mountain View ground station — lazy-imported so its ~70 KB gz doesn't ride
// on every other section's bundle.
export function ContactSection() {
  const params = useParams<{ locale?: string }>();
  // locale is currently unused inside the section body but kept for parity
  // with the original page module's signature.
  void params.locale;
  const { t } = useTranslation(['contact']);
  const opt = optional(t);
  const visitor = useVisitorLocation();
  const lead = opt('lead');
  const note = opt('note');

  // Schedule + Map are entirely hidden (heading + glass body) when the env keys
  // that power them are not configured at build time. Schedule needs both
  // Calendly + Turnstile; Map needs MapTiler. The previously-shown "missing
  // key" placeholder cards are dropped — users without keys see no section
  // at all, and the Calendly channel row in the Direct list is suppressed too
  // so its `#schedule` anchor doesn't land on nothing.
  const scheduleEnabled =
    Boolean(import.meta.env.VITE_TURNSTILE_SITE_KEY) && Boolean(import.meta.env.VITE_CALENDLY_URL);
  const mapEnabled = Boolean(import.meta.env.VITE_MAPTILER_KEY);

  // Renumber section orders over the visible set so hiding Schedule/Map
  // doesn't leave gaps in the displayed 01..N ladder. Direct is always 01;
  // Where I am follows whichever of Schedule is visible; Map (if visible)
  // is last. The order strings in contact.json are now informational only.
  const ord = (n: number): string => String(n).padStart(2, '0');
  const directOrder = ord(1);
  const scheduleOrder = scheduleEnabled ? ord(2) : null;
  const groundOrder = ord(scheduleEnabled ? 3 : 2);
  const mapOrder = mapEnabled ? ord(scheduleEnabled ? 4 : 3) : null;

  return (
    <Container width="reading" className="pb-24">
      <Text variant="label" className="mb-3 inline-flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
        {t('eyebrow')}
      </Text>
      <Heading level={1} variant="h1" tabIndex={-1}>
        <Trans
          i18nKey="headline"
          t={t}
          components={{ em: <em className="not-italic text-fg-secondary" /> }}
        />
      </Heading>
      {lead ? (
        <Text variant="lead" className="mt-6 max-w-[640px]">
          {lead}
        </Text>
      ) : null}

      <Section order={directOrder} title={t('sections.direct.title')}>
        <ul className="border-y border-glass-hairline-inner">
          <ChannelRow
            label={t('sections.direct.channels.email.label')}
            title={siteConfig.owner.email}
            subtitle={t('sections.direct.channels.email.subtitle')}
            href={`mailto:${siteConfig.owner.email}`}
            glyph="↗"
          />
          {scheduleEnabled ? (
            <ChannelRow
              label={t('sections.direct.channels.calendly.label')}
              title={t('sections.direct.channels.calendly.title')}
              subtitle={t('sections.direct.channels.calendly.subtitle')}
              href="#schedule"
              glyph="↓"
            />
          ) : null}
        </ul>
      </Section>

      {scheduleOrder ? (
        <Section order={scheduleOrder} title={t('sections.schedule.title')}>
          <SchedulePanel />
        </Section>
      ) : null}

      <Section order={groundOrder} title={t('sections.ground.title')}>
        <GlassPanel variant="inset" className="p-5">
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 font-mono text-small">
            <dt className="text-fg-muted">{t('sections.ground.labels.city')}</dt>
            <dd className="text-fg-primary">
              {t('sections.ground.values.cityPrimary')}{' '}
              <span className="text-fg-muted">· {t('sections.ground.values.cityNote')}</span>
            </dd>
            <dt className="text-fg-muted">{t('sections.ground.labels.tz')}</dt>
            <dd className="text-fg-primary">{t('sections.ground.values.tz')}</dd>
            <dt className="text-fg-muted">{t('sections.ground.labels.hours')}</dt>
            <dd className="text-fg-primary">{t('sections.ground.values.hours')}</dd>
            <dt className="text-fg-muted">{t('sections.ground.labels.lang')}</dt>
            <dd className="text-fg-primary">{t('sections.ground.values.lang')}</dd>
          </dl>
        </GlassPanel>
        {visitor.state === 'resolved' && visitor.location.confidentCity
          ? (() => {
              const line = opt('sections.ground.visitorLine', { city: visitor.location.city });
              return line ? (
                <Text variant="small" className="mt-4 text-fg-muted">
                  {line}
                </Text>
              ) : null;
            })()
          : null}
      </Section>

      {mapOrder ? (
        <Section order={mapOrder} title={t('sections.map.title')}>
          <Suspense
            fallback={
              <GlassPanel
                variant="inset"
                className="p-6 min-h-[280px] flex items-center justify-center"
              >
                <Text variant="small" className="text-fg-muted">
                  {t('sections.map.loading')}
                </Text>
              </GlassPanel>
            }
          >
            <ContactMap />
          </Suspense>
        </Section>
      ) : null}

      {note ? (
        <Text variant="small" className="mt-12 text-fg-muted">
          {note}
        </Text>
      ) : null}
    </Container>
  );
}

function Section({
  order,
  title,
  children,
}: {
  order: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16">
      <Text variant="label" className="mb-3 inline-flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
        {order} · {title}
      </Text>
      <Heading level={2} className="mb-6">
        {title}.
      </Heading>
      {children}
    </section>
  );
}

function ChannelRow({
  label,
  title,
  subtitle,
  href,
  glyph,
}: {
  label: string;
  title: string;
  subtitle: string;
  href: string;
  glyph: string;
}) {
  const external = href.startsWith('mailto:') || href.startsWith('http');
  return (
    <li className="grid grid-cols-[120px_1fr_auto] gap-4 items-baseline py-5 border-b border-dashed border-glass-hairline-inner last:border-b-0">
      <Text variant="label">{label}</Text>
      <div>
        <a
          href={href}
          {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
          className="text-fg-primary hover:text-cyan no-underline"
        >
          {title}
        </a>
        <Text variant="small">{subtitle}</Text>
      </div>
      <span aria-hidden="true" className="font-mono text-fg-muted">
        {glyph}
      </span>
    </li>
  );
}
