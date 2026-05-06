import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['projectDetail', 'common']);

  if (!entry) return <NotFound />;

  // Pager — previous/next in the manifest sort order.
  const idx = manifest.findIndex((e) => e.slug === slug);
  const prev = idx > 0 ? manifest[idx - 1] : null;
  const next = idx >= 0 && idx < manifest.length - 1 ? manifest[idx + 1] : null;

  return (
    <Container width="reading" className="pb-24">
      {/* Crumb */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <TransitionLink
          to={`/${locale}/projects`}
          className="font-mono text-micro tracking-[0.14em] uppercase no-underline border-b-0"
        >
          <span aria-hidden="true">←</span> {t('crumbBack')}
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
            {t('common:external.live')} <span aria-hidden="true">↗</span>
          </a>
        ) : null}
        <a
          href={entry.repo_url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-glass-hairline-inner bg-glass-panel text-fg-primary hover:text-cyan font-mono text-small uppercase tracking-[0.14em]"
        >
          {t('common:external.github')} <span aria-hidden="true">↗</span>
        </a>
        {entry.docs_link ? (
          <a
            href={entry.docs_link}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-sm border border-glass-hairline-inner bg-glass-panel text-fg-primary hover:text-cyan font-mono text-small uppercase tracking-[0.14em]"
          >
            {t('common:external.writeup')} <span aria-hidden="true">↗</span>
          </a>
        ) : null}
      </div>

      {/* Tech pills */}
      <ul className="mt-6 flex flex-wrap gap-2">
        {entry.tech.map((tech, i) => (
          <li
            key={tech}
            className={
              'font-mono text-micro tracking-[0.1em] uppercase px-2 py-1 rounded-sm border border-glass-hairline-inner [text-shadow:0_1px_4px_rgba(0,0,0,1),0_2px_16px_rgba(0,0,0,0.95),0_0_40px_rgba(0,0,0,0.8)] ' +
              (i === 0 ? 'text-cyan border-[color:oklch(0.84_0.12_210/0.3)]' : 'text-fg-primary')
            }
          >
            {tech}
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
          {t('leadShotPlaceholder')}
        </Text>
      </div>
      <Text variant="small" className="mt-3">
        {t('leadShotCaption')}
      </Text>

      {/* Sections */}
      <Section order={t('sections.background.order')} title={t('sections.background.title')}>
        <Text>{t('sections.background.body1')}</Text>
        <Text className="mt-4">{t('sections.background.body2')}</Text>
      </Section>

      <PullQuote>{t('sections.pullQuote')}</PullQuote>

      <Section order={t('sections.numbers.order')} title={t('sections.numbers.title')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatTile big="3" small={t('sections.numbers.stats.vehicles')} />
          <StatTile big="28" small={t('sections.numbers.stats.consoles')} />
          <StatTile big="14ms" small={t('sections.numbers.stats.latency')} />
        </div>
      </Section>

      <Section order={t('sections.approach.order')} title={t('sections.approach.title')}>
        <Text>{t('sections.approach.body')}</Text>
        <ol className="mt-6 grid grid-cols-[80px_1fr] gap-x-4 gap-y-4">
          <ProcessStep num="01" text={t('sections.approach.step1')} />
          <ProcessStep num="02" text={t('sections.approach.step2')} />
          <ProcessStep num="03" text={t('sections.approach.step3')} />
          <ProcessStep num="04" text={t('sections.approach.step4')} />
        </ol>
      </Section>

      <Section order={t('sections.walkthrough.order')} title={t('sections.walkthrough.title')}>
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
              {t('sections.walkthrough.demoLabel')}
            </Text>
          </a>
        ) : (
          <Text variant="small">{t('sections.walkthrough.pending')}</Text>
        )}
      </Section>

      <Section order={t('sections.spec.order')} title={t('sections.spec.title')}>
        <GlassPanel variant="inset" className="overflow-hidden">
          <table className="w-full font-mono text-small">
            <tbody>
              <SpecRow label={t('sections.spec.labels.stack')} value={entry.tech.join(' · ')} />
              <SpecRow label={t('sections.spec.labels.status')} value={entry.status} />
              <SpecRow
                label={t('sections.spec.labels.repo')}
                value={entry.repo_url.replace('https://github.com/', '')}
              />
              <SpecRow label={t('sections.spec.labels.stars')} value={String(entry.stars)} />
              <SpecRow
                label={t('sections.spec.labels.lastPush')}
                value={entry.pushed_at.split('T')[0] ?? '—'}
              />
              <SpecRow label={t('sections.spec.labels.started')} value={entry.started_at} />
              {entry.ended_at ? (
                <SpecRow label={t('sections.spec.labels.ended')} value={entry.ended_at} />
              ) : null}
              <SpecRow
                label={t('sections.spec.labels.categories')}
                value={entry.categories.join(' · ') || '—'}
              />
            </tbody>
          </table>
        </GlassPanel>
      </Section>

      <Section order={t('sections.external.order')} title={t('sections.external.title')}>
        <ul className="border-t border-dashed border-glass-hairline-inner">
          <OutboundRow href={entry.repo_url} title={t('sections.external.source')} />
          {entry.pages_url ? (
            <OutboundRow href={entry.pages_url} title={t('sections.external.live')} />
          ) : null}
          {entry.docs_link ? (
            <OutboundRow href={entry.docs_link} title={t('sections.external.docs')} />
          ) : null}
        </ul>
      </Section>

      {/* Pager */}
      {(prev || next) && (
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-4">
          {prev ? (
            <PagerCard locale={locale} entry={prev} side="prev" label={t('pager.prev')} />
          ) : (
            <div aria-hidden="true" />
          )}
          {next ? (
            <PagerCard locale={locale} entry={next} side="next" label={t('pager.next')} />
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
  label,
}: {
  locale: string;
  entry: { slug: string; title: string };
  side: 'prev' | 'next';
  label: string;
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
        {label}
      </Text>
      <Heading level={3}>{entry.title}</Heading>
    </TransitionLink>
  );
}
