import { type ReactNode } from 'react';
import { useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import type { LocalizedString, LocalizedStringArray } from '@portfolio/manifest-builder';
import { Container, GlassPanel, Heading, Text } from '@portfolio/ui';
import { TransitionLink } from '../components/TransitionLink';
import { manifest, findEntryBySlug } from '../data/manifest';
import { NotFound } from './NotFound';

// Project detail layout — generic case study for projects that don't have
// their own standalone github.io site. When `pages_url` is set on the entry
// the case_study is bypassed: the page becomes a thin spec + external view
// (deep links still resolve, but the project's own site is the destination).
//
// Sections, mirroring the mockup project-detail.html grammar:
//   01 Background · pull quote · 02 By the numbers · 03 Approach ·
//   04 Walkthrough · 05 Spec · 06 External · pager
// Order numbers are computed at render time over the present set, so absent
// case_study slots collapse the numbering. Spec + External always render.
//
// All case-study content (background paragraphs, pull-quote text, numbers,
// approach prose + steps, walkthrough caption) lives in `.portfolio.yml`'s
// `case_study` block, with per-field locale dicts ({ en, es? }).

function pickString(field: LocalizedString | undefined, locale: string): string | undefined {
  if (!field) return undefined;
  return locale === 'es' && field.es !== undefined ? field.es : field.en;
}

function pickStringArray(
  field: LocalizedStringArray | undefined,
  locale: string,
): readonly string[] | undefined {
  if (!field) return undefined;
  return locale === 'es' && field.es !== undefined ? field.es : field.en;
}

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

  // pages_url projects bypass the case study entirely — those projects have
  // their own site, this page is just a thin spec/external shim for SEO and
  // deep-link recovery.
  const isExternal = Boolean(entry.pages_url);
  const cs = isExternal ? undefined : entry.case_study;

  const background = cs ? pickStringArray(cs.background, locale) : undefined;
  const pullQuote = cs ? pickString(cs.pull_quote, locale) : undefined;
  const numbers = cs?.numbers;
  const approachBody = cs?.approach ? pickString(cs.approach.body, locale) : undefined;
  const approachSteps = cs?.approach?.steps;
  const walkthroughCaption = cs ? pickString(cs.walkthrough_caption, locale) : undefined;

  type SectionDescriptor = { title: string; render: () => ReactNode };
  const sections: SectionDescriptor[] = [];

  if (background && background.length > 0) {
    sections.push({
      title: t('sections.background.title'),
      render: () => (
        <>
          {background.map((para, i) => (
            <Text key={i} className={i > 0 ? 'mt-4' : undefined}>
              {para}
            </Text>
          ))}
        </>
      ),
    });
  }

  if (numbers && numbers.length > 0) {
    sections.push({
      title: t('sections.numbers.title'),
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {numbers.map((n) => (
            <StatTile
              key={n.value}
              big={n.value}
              small={pickString(n.label, locale) ?? n.label.en}
            />
          ))}
        </div>
      ),
    });
  }

  if (approachBody || (approachSteps && approachSteps.length > 0)) {
    sections.push({
      title: t('sections.approach.title'),
      render: () => (
        <>
          {approachBody ? <Text>{approachBody}</Text> : null}
          {approachSteps && approachSteps.length > 0 ? (
            <ol className="mt-6 grid grid-cols-[80px_1fr] gap-x-4 gap-y-4">
              {approachSteps.map((step, i) => (
                <ProcessStep
                  key={i}
                  num={String(i + 1).padStart(2, '0')}
                  text={pickString(step, locale) ?? step.en}
                />
              ))}
            </ol>
          ) : null}
        </>
      ),
    });
  }

  // Private repos hide all outbound affordances: action buttons, the External
  // section, the demo-video tile, and the clickable repo cell in the spec
  // table (replaced with the literal string "Private"). Public repos render
  // unchanged.
  const hideExternal = entry.private;

  if (entry.demo_video && !hideExternal) {
    const demoUrl = entry.demo_video;
    const caption = walkthroughCaption ?? t('sections.walkthrough.demoLabel');
    sections.push({
      title: t('sections.walkthrough.title'),
      render: () => (
        <a
          href={demoUrl}
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
            {caption}
          </Text>
        </a>
      ),
    });
  }

  // Spec — always present.
  sections.push({
    title: t('sections.spec.title'),
    render: () => (
      <GlassPanel variant="inset" className="overflow-hidden">
        <table className="w-full font-mono text-small">
          <tbody>
            <SpecRow label={t('sections.spec.labels.stack')} value={entry.tech.join(' · ')} />
            <SpecRow label={t('sections.spec.labels.status')} value={entry.status} />
            <SpecRow
              label={t('sections.spec.labels.repo')}
              value={entry.private ? 'Private' : entry.repo_url.replace('https://github.com/', '')}
            />
            {entry.stars > 0 ? (
              <SpecRow label={t('sections.spec.labels.stars')} value={String(entry.stars)} />
            ) : null}
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
    ),
  });

  // External — present for public repos; private repos suppress all outbound
  // links so the section is omitted entirely.
  if (!hideExternal) {
    sections.push({
      title: t('sections.external.title'),
      render: () => (
        <ul className="border-t border-dashed border-glass-hairline-inner">
          <OutboundRow href={entry.repo_url} title={t('sections.external.source')} />
          {entry.pages_url ? (
            <OutboundRow href={entry.pages_url} title={t('sections.external.live')} />
          ) : null}
          {entry.docs_link ? (
            <OutboundRow href={entry.docs_link} title={t('sections.external.docs')} />
          ) : null}
        </ul>
      ),
    });
  }

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

      {/* Actions row — suppressed entirely for private repos so no outbound
          affordances leak. */}
      {!hideExternal ? (
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
      ) : null}

      {/* Tech pills */}
      <ul className="mt-6 flex flex-wrap gap-2">
        {entry.tech.map((tech, i) => (
          <li
            key={tech}
            className={
              'font-mono text-micro tracking-[0.1em] uppercase px-2 py-1 rounded-sm border border-glass-hairline-inner ' +
              (i === 0 ? 'text-cyan border-[color:oklch(0.84_0.12_210/0.3)]' : 'text-fg-primary')
            }
          >
            {tech}
          </li>
        ))}
      </ul>

      {/* Optional pull quote — sits between Background and Numbers without
          a section number; decorative only. */}
      {pullQuote ? <PullQuote>{pullQuote}</PullQuote> : null}

      {/* Sections */}
      {sections.map((s, i) => (
        <Section key={s.title} order={String(i + 1).padStart(2, '0')} title={s.title}>
          {s.render()}
        </Section>
      ))}

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
