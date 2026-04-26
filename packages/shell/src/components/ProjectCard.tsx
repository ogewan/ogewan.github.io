import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { ManifestEntry } from '@portfolio/manifest-builder';
import { GlassPanel, Heading, Text } from '@portfolio/ui';
import { TransitionLink } from './TransitionLink';
import { useExternalPrefetch } from './useExternalPrefetch';

// Per-project hue rotation through the cyan→amber→violet space — six muted
// variants matching the mockup direction. Slug-derived so the same project
// always gets the same tint.
const HUE_PALETTE = [
  ['oklch(0.35 0.10 210 / 0.55)', 'oklch(0.20 0.06 220 / 0.45)'],
  ['oklch(0.35 0.10 75 / 0.55)', 'oklch(0.22 0.06 60 / 0.45)'],
  ['oklch(0.32 0.08 290 / 0.55)', 'oklch(0.20 0.05 280 / 0.45)'],
  ['oklch(0.34 0.09 160 / 0.55)', 'oklch(0.20 0.05 140 / 0.45)'],
  ['oklch(0.34 0.10 0 / 0.55)', 'oklch(0.20 0.05 350 / 0.45)'],
  ['oklch(0.32 0.07 250 / 0.55)', 'oklch(0.20 0.04 245 / 0.45)'],
] as const;

function hashSlug(slug: string): number {
  let h = 0;
  for (const ch of slug) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

interface ProjectCardProps {
  entry: ManifestEntry;
  locale: string;
  feature?: boolean;
}

// One card. The brief calls for the same visual frame regardless of whether
// the project links out (`pages_url`) or in-shell — the only signal is the
// footer affordance: "Live · domain.so ↗" vs "Read the case study →".
export function ProjectCard({ entry, locale, feature = false }: ProjectCardProps) {
  const { t } = useTranslation(['common']);
  const { hueA, hueB } = useMemo(() => {
    const idx = hashSlug(entry.slug) % HUE_PALETTE.length;
    const pair = HUE_PALETTE[idx] ?? HUE_PALETTE[0];
    return { hueA: pair![0], hueB: pair![1] };
  }, [entry.slug]);

  const ref = useExternalPrefetch<HTMLDivElement>(entry.pages_url ?? null);
  const detailHref = `/${locale}/projects/${entry.slug}`;
  const externalHref = entry.pages_url;

  return (
    <GlassPanel
      ref={(el) => {
        ref.current = el as HTMLDivElement | null;
      }}
      className={
        'flex flex-col overflow-hidden ' +
        (feature ? 'md:col-span-12 md:flex-row' : 'md:col-span-6 lg:col-span-4')
      }
      style={{ viewTransitionName: `card-${entry.slug}` }}
    >
      {/* Media — placeholder gradient tinted by data-hue */}
      <div
        aria-hidden="true"
        className={
          'relative ' + (feature ? 'md:w-1/2 md:aspect-auto md:min-h-[280px]' : 'aspect-[16/10]')
        }
        style={{ background: `linear-gradient(135deg, ${hueA}, ${hueB})` }}
      >
        <div
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              'repeating-linear-gradient(135deg, oklch(0.98 0.005 280 / 0.05) 0 1px, transparent 1px 8px)',
          }}
        />
      </div>

      <div className="flex flex-col gap-3 p-5 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <Text variant="label">
            {entry.featured && feature ? 'Featured · F01' : entry.status.toUpperCase()}
          </Text>
          <Text variant="micro">
            {entry.started_at}
            {entry.ended_at ? ` → ${entry.ended_at}` : ''}
          </Text>
        </div>

        <Heading level={3} className="mt-1">
          {entry.title}
        </Heading>

        <Text variant="small" className="line-clamp-3 max-w-[60ch]">
          {entry.summary}
        </Text>

        <ul className="flex flex-wrap gap-2 mt-2">
          {entry.tech.slice(0, feature ? 6 : 4).map((t, i) => (
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

        {/* Footer affordance — the one visual difference between external and
            in-shell projects. Same card, different link grammar. */}
        <div className="mt-auto pt-4 border-t border-dashed border-glass-hairline-inner">
          {externalHref ? (
            <a
              href={externalHref}
              target="_blank"
              rel="noreferrer noopener"
              className="text-cyan font-mono text-small no-underline border-b border-[color:oklch(0.84_0.12_210/0.3)] hover:border-b-cyan inline-flex items-center gap-1"
            >
              Live · {new URL(externalHref).hostname.replace(/^www\./, '')}{' '}
              <span aria-hidden="true">↗</span>
            </a>
          ) : (
            <TransitionLink
              to={detailHref}
              unstyled
              className="text-cyan font-mono text-small inline-flex items-center gap-1 border-b border-[color:oklch(0.84_0.12_210/0.3)] hover:border-b-cyan"
            >
              {t('readCaseStudy')} <span aria-hidden="true">→</span>
            </TransitionLink>
          )}
        </div>
      </div>
    </GlassPanel>
  );
}
