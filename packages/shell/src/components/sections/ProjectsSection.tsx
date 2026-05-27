import { useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { Container, Heading, Text, focusRingClassName } from '@portfolio/ui';
import { manifest, allCategories } from '../../data/manifest';
import { ProjectCard } from '../ProjectCard';

type ViewMode = 'grid' | 'list';
type CategoryFilter = 'all' | string;

// Projects section. Toolbar (filter pills + grid/list toggle) above a 12-col
// card grid driven by manifest fixture. Featured entries span the full width
// in grid mode; list mode collapses everything to single-column dense rows.
// Project cards link to /:locale/projects/:slug — the only cross-route nav
// from the one-page MainPage.
export function ProjectsSection() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const { t } = useTranslation(['projects']);

  const [filter, setFilter] = useState<CategoryFilter>('all');
  const [view, setView] = useState<ViewMode>('grid');

  const visible = useMemo(
    () => (filter === 'all' ? manifest : manifest.filter((e) => e.categories.includes(filter))),
    [filter],
  );

  const filterPills: Array<{ key: CategoryFilter; label: string; count: number }> = [
    { key: 'all', label: t('filterAll'), count: manifest.length },
    ...allCategories.map((c) => ({
      key: c,
      label: c,
      count: manifest.filter((e) => e.categories.includes(c)).length,
    })),
  ];

  return (
    <Container className="pb-24">
      <header className="mb-10 flex flex-wrap items-baseline justify-between gap-6">
        <div>
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
        </div>
        <Text variant="small" className="max-w-sm">
          {t('description')}
        </Text>
      </header>

      {/* Toolbar — filter pills (left) + view-mode toggle (right) */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <ul className="flex flex-wrap items-center gap-2">
          {filterPills.map((pill) => {
            const active = filter === pill.key;
            return (
              <li key={pill.key}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => setFilter(pill.key)}
                  className={
                    `px-3 py-1.5 rounded-full font-mono text-micro tracking-[0.14em] uppercase ` +
                    `transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] ` +
                    (active
                      ? 'bg-glass-panel border border-[color:oklch(0.84_0.12_210/0.4)] text-cyan'
                      : 'bg-glass-inset border border-glass-hairline-inner text-fg-muted hover:text-fg-primary') +
                    ` ${focusRingClassName}`
                  }
                >
                  {pill.label}
                  <span className="ml-1.5 text-fg-muted">{pill.count}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="flex items-center gap-2 font-mono text-micro tracking-[0.14em] uppercase text-fg-muted">
          <span>{t('viewLabel')}</span>
          {(['grid', 'list'] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={view === m}
              onClick={() => setView(m)}
              className={
                `px-2.5 py-1.5 rounded-sm border ` +
                (view === m
                  ? 'border-[color:oklch(0.84_0.12_210/0.4)] text-cyan bg-glass-panel'
                  : 'border-glass-hairline-inner text-fg-muted hover:text-fg-primary') +
                ` ${focusRingClassName}`
              }
            >
              {t(m === 'grid' ? 'viewGrid' : 'viewList')}
            </button>
          ))}
        </div>
      </div>

      {/* Grid / list */}
      {view === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
          {visible.map((entry) => (
            <ProjectCard
              key={entry.slug}
              entry={entry}
              locale={locale}
              feature={entry.featured && entry.order === 1}
            />
          ))}
        </div>
      ) : (
        <ul className="divide-y divide-glass-hairline-inner border-t border-b border-glass-hairline-inner">
          {visible.map((entry) => (
            <li key={entry.slug} className="py-5 flex flex-wrap items-baseline gap-4">
              <Text variant="micro" className="w-24 flex-shrink-0">
                {entry.status.toUpperCase()}
              </Text>
              <div className="flex-1 min-w-[280px]">
                <Heading level={3} className="mb-1">
                  {entry.title}
                </Heading>
                <Text variant="small" className="max-w-[80ch]">
                  {entry.summary}
                </Text>
              </div>
              <Text variant="micro" className="w-32 text-right">
                {entry.tech.slice(0, 2).join(' · ')}
              </Text>
              <a
                href={entry.pages_url ?? `/${locale}/projects/${entry.slug}`}
                {...(entry.pages_url ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
                className="font-mono text-small text-cyan no-underline border-b border-[color:oklch(0.84_0.12_210/0.3)] hover:border-b-cyan"
              >
                {entry.pages_url ? (
                  <>
                    {t('list.live')} <span aria-hidden="true">↗</span>
                  </>
                ) : (
                  <>
                    {t('list.read')} <span aria-hidden="true">→</span>
                  </>
                )}
              </a>
            </li>
          ))}
        </ul>
      )}
    </Container>
  );
}
