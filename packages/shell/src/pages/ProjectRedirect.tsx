import { useParams } from 'react-router';
import { Container, GlassPanel, Heading, Text } from '@portfolio/ui';
import { TransitionLink } from '../components/TransitionLink';
import { findEntryBySlug } from '../data/manifest';
import { NotFound } from './NotFound';

// Intermediate page for projects that link out to their own pages_url. Brief:
// "intermediate page for external-site projects, prominent 'open live site'
// button triggering cross-document View Transition." This is the affordance
// that distinguishes external-site projects from in-shell ones — the user
// gets a beat to decide whether they want to leave the portfolio context.

export function ProjectRedirect() {
  const params = useParams<{ locale?: string; slug?: string }>();
  const locale = params.locale ?? 'en';
  const slug = params.slug ?? '';
  const entry = findEntryBySlug(slug);

  if (!entry || !entry.pages_url) return <NotFound />;

  const isEs = locale === 'es';
  const host = (() => {
    try {
      return new URL(entry.pages_url).hostname.replace(/^www\./, '');
    } catch {
      return entry.pages_url;
    }
  })();

  return (
    <Container width="reading" className="pb-24">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <TransitionLink
          to={`/${locale}/projects/${slug}`}
          className="font-mono text-micro tracking-[0.14em] uppercase no-underline border-b-0"
        >
          <span aria-hidden="true">←</span> {isEs ? 'Volver al caso' : 'Back to case study'}
        </TransitionLink>
        <Text variant="micro">/projects/{slug}/redirect</Text>
      </div>

      <GlassPanel variant="elev" className="p-10 md:p-14">
        <Text variant="label" className="mb-4 inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
          {isEs ? 'Saliendo del portafolio' : 'Leaving the portfolio'}
        </Text>
        <Heading level={1} variant="h1" tabIndex={-1}>
          {entry.title}{' '}
          <em className="not-italic text-fg-secondary">
            {isEs ? 'vive en' : 'lives at'} {host}.
          </em>
        </Heading>
        <Text variant="lead" className="mt-6 max-w-[640px]">
          {isEs
            ? 'Este proyecto tiene su propio sitio. Abrirlo te lleva fuera del shell del portafolio (transición entre documentos).'
            : 'This project has its own site. Opening it takes you outside the portfolio shell (cross-document transition).'}
        </Text>

        <div className="mt-10 flex flex-wrap items-center gap-4">
          <a
            href={entry.pages_url}
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-sm border border-[color:oklch(0.84_0.12_210/0.4)] bg-glass-panel text-cyan font-mono text-small uppercase tracking-[0.14em]"
          >
            {isEs ? 'Abrir sitio en vivo' : 'Open live site'} <span aria-hidden="true">↗</span>
          </a>
          <Text variant="small" className="text-fg-muted">
            {host}
          </Text>
        </div>

        <div className="mt-10 pt-6 border-t border-dashed border-glass-hairline-inner flex flex-wrap items-baseline justify-between gap-3">
          <Text variant="small">
            {isEs ? 'Prefieres quedarte en el shell?' : 'Prefer to stay inside the shell?'}
          </Text>
          <TransitionLink to={`/${locale}/projects/${slug}`}>
            {isEs ? 'Lee el caso aquí' : 'Read the case study here'}{' '}
            <span aria-hidden="true">→</span>
          </TransitionLink>
        </div>
      </GlassPanel>
    </Container>
  );
}
