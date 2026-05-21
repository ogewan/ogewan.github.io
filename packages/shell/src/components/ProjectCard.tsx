import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ManifestEntry } from '@portfolio/manifest-builder';
import { GlassPanel, Heading, Text } from '@portfolio/ui';
import { TransitionLink } from './TransitionLink';
import { useExternalPrefetch } from './useExternalPrefetch';

// Extension-sniffing for `hero` (and `media[]`). The schema lets the same
// field hold either an image or a video; render code branches by suffix.
const VIDEO_RE = /\.(mp4|webm|mov)(\?|$)/i;
function isVideoSrc(src: string): boolean {
  return VIDEO_RE.test(src);
}
function videoMime(src: string): string {
  const m = src.toLowerCase().match(/\.(mp4|webm|mov)/);
  if (m?.[1] === 'webm') return 'video/webm';
  if (m?.[1] === 'mov') return 'video/quicktime';
  return 'video/mp4';
}

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

  // OS-level reduced-motion preference. Used to suppress hero video autoplay;
  // the still-image / gradient branches are unaffected. Read once at mount
  // and listen for changes so the toggle in DevTools takes effect live.
  const [reducedMotion, setReducedMotion] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const heroIsVideo = entry.hero ? isVideoSrc(entry.hero) : false;

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
      {/* Media — hero image when provided, gradient fallback otherwise */}
      <div
        aria-hidden="true"
        className={
          'relative overflow-hidden ' +
          (feature ? 'md:w-1/2 md:aspect-auto md:min-h-[280px]' : 'aspect-[16/10]')
        }
        style={{ background: `linear-gradient(135deg, ${hueA}, ${hueB})` }}
      >
        {entry.hero && heroIsVideo ? (
          <video
            src={entry.hero}
            autoPlay={!reducedMotion}
            muted
            loop
            playsInline
            preload="metadata"
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLVideoElement).style.display = 'none';
            }}
          >
            <source src={entry.hero} type={videoMime(entry.hero)} />
          </video>
        ) : entry.hero ? (
          <img
            src={entry.hero}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = 'none';
            }}
          />
        ) : (
          <div
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'repeating-linear-gradient(135deg, oklch(0.98 0.005 280 / 0.05) 0 1px, transparent 1px 8px)',
            }}
          />
        )}
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
            in-shell projects. Same card, different link grammar. External
            projects route through /projects/:slug/redirect rather than the
            external URL directly so the cross-document View Transition shim
            in ProjectRedirect can run; the redirect page then jumps to the
            live site. */}
        <div className="mt-auto pt-4 border-t border-dashed border-glass-hairline-inner">
          {externalHref ? (
            <TransitionLink
              to={`${detailHref}/redirect`}
              unstyled
              className="text-cyan font-mono text-small no-underline border-b border-[color:oklch(0.84_0.12_210/0.3)] hover:border-b-cyan inline-flex items-center gap-1"
            >
              Live · {new URL(externalHref).hostname.replace(/^www\./, '')}{' '}
              <span aria-hidden="true">↗</span>
            </TransitionLink>
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
