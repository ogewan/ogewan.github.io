import { useParams } from 'react-router';
import { Container, GlassPanel, Heading, Text } from '@portfolio/ui';
import { TransitionLink } from '../components/TransitionLink';

// Phase 4 Contact placeholder. The real Calendly embed (gated by Cloudflare
// Turnstile), MapLibre map, and ground-station live clock arrive in Phase 6.
// What's here now: real layout grammar, two-row Direct list, ground-station
// stub. The nebula backdrop is already wired by CelestialBackdrop.
export function Contact() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const isEs = locale === 'es';

  return (
    <Container width="reading" className="pb-24">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <TransitionLink
          to={`/${locale}/`}
          className="font-mono text-micro tracking-[0.14em] uppercase no-underline border-b-0"
        >
          <span aria-hidden="true">←</span> {isEs ? 'Volver al inicio' : 'Back to home'}
        </TransitionLink>
        <Text variant="micro">04 · /contact · NEB-0?</Text>
      </div>

      <Text variant="label" className="mb-3 inline-flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
        {isEs ? '04 / Contacto · canal abierto' : '04 / Contact · open channel'}
      </Text>
      <Heading level={1} variant="h1" tabIndex={-1}>
        {isEs ? (
          <>
            Canal abierto. <em className="not-italic text-fg-secondary">Dos formas de entrar.</em>
          </>
        ) : (
          <>
            Open channel. <em className="not-italic text-fg-secondary">Two ways in.</em>
          </>
        )}
      </Heading>
      <Text variant="lead" className="mt-6 max-w-[640px]">
        {isEs
          ? 'Briefs por email. Llamadas por Calendly. Sin formulario, sin cuestionario — solo escribe.'
          : 'Briefs by email. Calls by Calendly. No form, no questionnaire — just write.'}
      </Text>

      <Section order="01" title={isEs ? 'Directo' : 'Direct'}>
        <ul className="border-y border-glass-hairline-inner">
          <ChannelRow
            label="Email"
            title="hello@example.com"
            subtitle={
              isEs ? 'Mejor para briefs · respuesta en 48h' : 'Best for briefs · 48h reply window'
            }
            href="mailto:hello@example.com"
            glyph="↗"
          />
          <ChannelRow
            label="Calendly"
            title={isEs ? 'Reservar 30 min' : 'Book 30-min intro'}
            subtitle="Tue/Thu · 14:00–17:00 PT · video"
            href="#schedule"
            glyph="↓"
          />
        </ul>
      </Section>

      <Section order="02" title={isEs ? 'Agendar' : 'Schedule'}>
        <GlassPanel id="schedule" className="p-6 min-h-[480px] flex flex-col gap-4">
          <Text variant="label">
            {isEs ? 'Embed de Calendly · pendiente' : 'Calendly embed · pending'}
          </Text>
          <Text variant="small">
            {isEs
              ? 'En Phase 6: widget de Calendly inline detrás de un challenge de Cloudflare Turnstile. Las claves API se cargan desde VITE_TURNSTILE_SITE_KEY y VITE_CALENDLY_URL.'
              : 'In Phase 6: inline Calendly widget gated by a Cloudflare Turnstile challenge. API keys loaded from VITE_TURNSTILE_SITE_KEY and VITE_CALENDLY_URL.'}
          </Text>
          <div
            aria-hidden="true"
            className="flex-1 rounded-sm border border-dashed border-glass-hairline-inner flex items-center justify-center text-fg-muted"
          >
            <Text variant="micro">〘 CAL · TURNSTILE · MAPLIBRE — phase 6 〙</Text>
          </div>
        </GlassPanel>
      </Section>

      <Section order="03" title={isEs ? 'Estación terrestre' : 'Ground station'}>
        <GlassPanel variant="inset" className="p-5">
          <dl className="grid grid-cols-[120px_1fr] gap-y-2 font-mono text-small">
            <dt className="text-fg-muted">CITY</dt>
            <dd className="text-fg-primary">
              Mountain View, CA <span className="text-fg-muted">· south bay · approximate</span>
            </dd>
            <dt className="text-fg-muted">TZ</dt>
            <dd className="text-fg-primary">UTC-8 · America/Los_Angeles</dd>
            <dt className="text-fg-muted">HOURS</dt>
            <dd className="text-fg-primary">09:00–18:00 PT · Mon–Thu</dd>
            <dt className="text-fg-muted">LANG</dt>
            <dd className="text-fg-primary">EN · ES</dd>
          </dl>
        </GlassPanel>
      </Section>

      <Text variant="small" className="mt-12 text-fg-muted">
        {isEs
          ? 'Nota: ubicación aproximada solamente. Para coordenadas exactas, escríbeme.'
          : 'Note: approximate location only. For exact coordinates, write to me.'}
      </Text>
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
