import { useParams } from 'react-router';
import { Container, GlassPanel, Heading, Text } from '@portfolio/ui';
import { TransitionLink } from '../components/TransitionLink';
import { manifest, findEntryBySlug } from '../data/manifest';
import { NotFound } from './NotFound';

// Project detail layout, mirroring the mockup project-detail.html grammar.
// 880px reading column. Sections: 01 Background · pull quote · 02 By the
// numbers · 03 Approach · 04 Walkthrough video · 05 Spec · 06 External · pager.
//
// Manifest data drives the head + actions + spec table; section bodies stay
// placeholder until per-project MDX content lands later.

export function ProjectDetail() {
  const params = useParams<{ locale?: string; slug?: string }>();
  const locale = params.locale ?? 'en';
  const slug = params.slug ?? '';
  const entry = findEntryBySlug(slug);

  if (!entry) return <NotFound />;

  // Pager — previous/next in the manifest sort order.
  const idx = manifest.findIndex((e) => e.slug === slug);
  const prev = idx > 0 ? manifest[idx - 1] : null;
  const next = idx >= 0 && idx < manifest.length - 1 ? manifest[idx + 1] : null;

  const isEs = locale === 'es';

  return (
    <Container width="reading" className="pb-24">
      {/* Crumb */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <TransitionLink
          to={`/${locale}/projects`}
          className="font-mono text-micro tracking-[0.14em] uppercase no-underline border-b-0"
        >
          <span aria-hidden="true">←</span> {isEs ? 'Volver a trabajos' : 'Back to selected work'}
        </TransitionLink>
        <Text variant="micro">
          F{String(idx + 1).padStart(2, '0')} · /projects/{entry.slug} · {entry.started_at}
          {entry.ended_at ? ` — ${entry.ended_at}` : ''}
        </Text>
      </div>

      {/* Head */}
      <Text variant="label" className="mb-3 inline-flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
        {entry.featured ? 'F01 · Featured' : entry.status.toUpperCase()} ·{' '}
        {entry.primary_language ?? 'Multi'}
      </Text>
      <Heading
        level={1}
        variant="h1"
        tabIndex={-1}
        style={{ viewTransitionName: `card-${entry.slug}` }}
      >
        {entry.title}.{' '}
        <em className="not-italic text-fg-secondary">{entry.summary.split('.')[0]}.</em>
      </Heading>
      <Text variant="lead" className="mt-6 max-w-[640px]">
        {entry.summary}
      </Text>

      {/* Actions row */}
      <div className="mt-8 flex flex-wrap gap-3">
        {entry.pages_url ? (
          <a
            href={entry.pages_url}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-[color:oklch(0.84_0.12_210/0.4)] bg-glass-panel text-cyan font-mono text-small uppercase tracking-[0.14em]"
          >
            Live <span aria-hidden="true">↗</span>
          </a>
        ) : null}
        <a
          href={entry.repo_url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-glass-hairline-inner bg-glass-panel text-fg-primary hover:text-cyan font-mono text-small uppercase tracking-[0.14em]"
        >
          GitHub <span aria-hidden="true">↗</span>
        </a>
        {entry.docs_link ? (
          <a
            href={entry.docs_link}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-glass-hairline-inner bg-glass-panel text-fg-primary hover:text-cyan font-mono text-small uppercase tracking-[0.14em]"
          >
            Writeup <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>

      {/* Tech pills */}
      <ul className="mt-6 flex flex-wrap gap-2">
        {entry.tech.map((t, i) => (
          <li
            key={t}
            className={
              'font-mono text-micro tracking-[0.1em] uppercase px-2 py-1 rounded-sm border border-glass-hairline-inner ' +
              (i === 0 ? 'text-cyan border-[color:oklch(0.84_0.12_210/0.3)]' : 'text-fg-muted')
            }
          >
            {t}
          </li>
        ))}
      </ul>

      {/* Lead shot placeholder */}
      <div
        aria-hidden="true"
        className="mt-12 aspect-[16/10] rounded-md border border-glass-hairline-inner overflow-hidden relative"
        style={{
          background:
            'linear-gradient(135deg, oklch(0.30 0.08 210 / 0.55), oklch(0.18 0.05 280 / 0.45))',
        }}
      >
        <Text variant="label" className="absolute top-4 left-4 text-fg-secondary">
          Shot 01 · primary console placeholder
        </Text>
      </div>
      <Text variant="small" className="mt-3">
        {isEs
          ? 'Foto principal · Atlas Console · sala de control de la estación 02.'
          : 'Lead shot · Atlas Console · station 02 control room.'}
      </Text>

      {/* Sections */}
      <Section order="01" title={isEs ? 'Antecedentes' : 'Background'}>
        <Text>
          {isEs
            ? 'Estaba debugeando una anomalía de refrigerante con los telemetristas cuando me di cuenta: la consola estaba diseñada para la pantalla, no para la sala. Cuatro personas leyendo el mismo gráfico tenían que coordinarse hablando.'
            : 'I was debugging a coolant anomaly with the telemetrists when it hit me: the console was designed for the screen, not for the room. Four people reading the same graph had to coordinate by talking.'}
        </Text>
        <Text className="mt-4">
          {isEs
            ? 'El brief: una grilla de readouts para directores de vuelo, no un dashboard. Latencia P99 ≤ 16ms en 28 consolas en 2 estaciones.'
            : "The brief: a flight director's readout grid, not a dashboard. P99 latency ≤ 16ms across 28 consoles in 2 ground stations."}
        </Text>
      </Section>

      <PullQuote>
        {isEs
          ? 'Diseña para la sala, no para la pantalla.'
          : 'Design for the room, not the window.'}
      </PullQuote>

      <Section order="02" title={isEs ? 'Por los números' : 'By the numbers'}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatTile big="3" small={isEs ? 'Vehículos · Volando' : 'Vehicles · Currently flying'} />
          <StatTile
            big="28"
            small={isEs ? 'Consolas · 2 estaciones' : 'Consoles · 2 ground stations'}
          />
          <StatTile big="14ms" small={isEs ? 'Latencia P99' : 'P99 telemetry-to-paint latency'} />
        </div>
      </Section>

      <Section order="03" title={isEs ? 'Enfoque' : 'Approach'}>
        <Text>
          {isEs
            ? 'Tres compromisos antes de tocar pixels: leer la sala, fijar la grilla, color reservado.'
            : 'Three commitments before touching pixels: read the room, lock the grid, color reserved.'}
        </Text>
        <ol className="mt-6 grid grid-cols-[80px_1fr] gap-x-4 gap-y-4">
          <ProcessStep
            num="01"
            text={
              isEs ? 'Fijar la grilla antes de iluminarla.' : 'Lock the grid before lighting it.'
            }
          />
          <ProcessStep
            num="02"
            text={
              isEs
                ? 'Cada celda es una pregunta, no un dato.'
                : 'Every cell is a question, not a datum.'
            }
          />
          <ProcessStep
            num="03"
            text={
              isEs ? 'El color es reservado para anomalías.' : 'Color is reserved for anomalies.'
            }
          />
          <ProcessStep
            num="04"
            text={
              isEs
                ? 'La animación cuenta historias, no las decora.'
                : 'Animation tells stories, never decorates them.'
            }
          />
        </ol>
      </Section>

      <Section order="04" title={isEs ? 'Recorrido · 2:14' : 'Walkthrough · 2:14'}>
        {entry.demo_video ? (
          <a
            href={entry.demo_video}
            target="_blank"
            rel="noreferrer noopener"
            className="block aspect-[16/10] rounded-md border border-glass-hairline-inner relative overflow-hidden group"
            style={{
              background:
                'linear-gradient(135deg, oklch(0.20 0.05 280 / 0.6), oklch(0.10 0.03 270 / 0.5))',
            }}
          >
            <span
              aria-hidden="true"
              className="absolute inset-0 flex items-center justify-center text-cyan font-display text-h2"
            >
              ▶
            </span>
            <Text variant="micro" className="absolute bottom-4 left-4 text-fg-secondary">
              {isEs ? 'Demo · 2:14 · ↗ YouTube' : 'Demo · 2:14 · ↗ YouTube'}
            </Text>
          </a>
        ) : (
          <Text variant="small">{isEs ? 'Video pendiente.' : 'Walkthrough video pending.'}</Text>
        )}
      </Section>

      <Section order="05" title="Spec">
        <GlassPanel variant="inset" className="overflow-hidden">
          <table className="w-full font-mono text-small">
            <tbody>
              <SpecRow label="Stack" value={entry.tech.join(' · ')} />
              <SpecRow label="Status" value={entry.status} />
              <SpecRow label="Repo" value={entry.repo_url.replace('https://github.com/', '')} />
              <SpecRow label="Stars" value={String(entry.stars)} />
              <SpecRow label="Last push" value={entry.pushed_at.split('T')[0] ?? '—'} />
              <SpecRow label="Started" value={entry.started_at} />
              {entry.ended_at ? <SpecRow label="Ended" value={entry.ended_at} /> : null}
              <SpecRow label="Categories" value={entry.categories.join(' · ') || '—'} />
            </tbody>
          </table>
        </GlassPanel>
      </Section>

      <Section order="06" title={isEs ? 'Externos' : 'External'}>
        <ul className="border-t border-dashed border-glass-hairline-inner">
          <OutboundRow href={entry.repo_url} title={isEs ? 'Código fuente' : 'Source on GitHub'} />
          {entry.pages_url ? (
            <OutboundRow href={entry.pages_url} title={isEs ? 'Sitio en vivo' : 'Live site'} />
          ) : null}
          {entry.docs_link ? (
            <OutboundRow href={entry.docs_link} title={isEs ? 'Documentación' : 'Documentation'} />
          ) : null}
        </ul>
      </Section>

      {/* Pager */}
      {(prev || next) && (
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4">
          {prev ? (
            <PagerCard locale={locale} entry={prev} side="prev" />
          ) : (
            <div aria-hidden="true" />
          )}
          {next ? (
            <PagerCard locale={locale} entry={next} side="next" />
          ) : (
            <div aria-hidden="true" />
          )}
        </div>
      )}
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

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <blockquote
      className="mt-12 pl-6 border-l-2 border-[color:oklch(0.84_0.12_210/0.4)] py-4 font-display text-h3 text-fg-secondary italic"
      style={{
        background: 'linear-gradient(to right, oklch(0.84 0.12 210 / 0.06), transparent 60%)',
      }}
    >
      {children}
    </blockquote>
  );
}

function StatTile({ big, small }: { big: string; small: string }) {
  return (
    <GlassPanel className="p-5">
      <Text className="font-display text-h2 text-fg-primary">{big}</Text>
      <Text variant="small" className="mt-1">
        {small}
      </Text>
    </GlassPanel>
  );
}

function ProcessStep({ num, text }: { num: string; text: string }) {
  return (
    <>
      <Text variant="label" className="text-cyan">
        {num}
      </Text>
      <Text className="border-t border-dashed border-glass-hairline-inner pt-3">{text}</Text>
    </>
  );
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-t border-dashed border-glass-hairline-inner first:border-t-0">
      <td className="py-3 px-4 w-2/5 text-fg-muted align-top">{label}</td>
      <td className="py-3 px-4 text-fg-primary">{value}</td>
    </tr>
  );
}

function OutboundRow({ href, title }: { href: string; title: string }) {
  let host: string;
  try {
    host = new URL(href).hostname.replace(/^www\./, '');
  } catch {
    host = href;
  }
  return (
    <li className="grid grid-cols-[60px_1fr_auto] gap-4 items-baseline py-3 border-b border-dashed border-glass-hairline-inner">
      <span className="font-mono text-micro text-fg-muted">↗</span>
      <a
        href={href}
        target="_blank"
        rel="noreferrer noopener"
        className="text-fg-primary hover:text-cyan no-underline"
      >
        {title}
      </a>
      <span className="font-mono text-micro text-fg-muted">{host}</span>
    </li>
  );
}

function PagerCard({
  locale,
  entry,
  side,
}: {
  locale: string;
  entry: { slug: string; title: string };
  side: 'prev' | 'next';
}) {
  return (
    <TransitionLink
      to={`/${locale}/projects/${entry.slug}`}
      unstyled
      className={
        'block p-5 rounded-md border border-glass-hairline-inner bg-glass-panel hover:border-[color:oklch(0.84_0.12_210/0.4)] [transition-duration:var(--dur-fast)] transition-colors ' +
        (side === 'next' ? 'text-right' : '')
      }
    >
      <Text variant="label" className="mb-2 block">
        {side === 'prev' ? '← Previous' : 'Next →'}
      </Text>
      <Heading level={3}>{entry.title}</Heading>
    </TransitionLink>
  );
}
