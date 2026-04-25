import { useParams } from 'react-router';
import { Button, Container, GlassPanel, Heading, Text } from '@portfolio/ui';
import { TransitionLink } from '../components/TransitionLink';

// Hero. Earth-scene backdrop is rendered behind by CelestialBackdrop. The
// chat's A→C+D entry sequence (anamorphic flare → glass spec + bokeh) is
// deferred to the real-scenes phase since the flare is part of the R3F
// composition; the layout grammar is final.
export function Home() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const isEs = locale === 'es';

  return (
    <Container className="min-h-[calc(100vh-12rem)] flex flex-col justify-between gap-16 pb-16">
      {/* Top — eyebrow + display headline */}
      <div className="pt-16">
        <Text variant="label" className="mb-6 inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
          {isEs ? '01 / Tierra' : '01 / Earth'}
        </Text>
        <Heading level={1} variant="display" tabIndex={-1} className="max-w-[18ch]">
          {isEs ? (
            <>
              Construido en la <em className="not-italic text-fg-secondary">orilla</em> del software
              y el espacio.
            </>
          ) : (
            <>
              Built at the <em className="not-italic text-fg-secondary">shoreline</em> of software &
              space.
            </>
          )}
        </Heading>
        <Text variant="lead" className="mt-8 max-w-[640px]">
          {isEs
            ? 'Consolas, sistemas en tierra, herramientas para la gente que no puede dejar de mirar el trabajo. Aquí abajo: trabajos seleccionados, una forma de trabajar, y un canal para abrir.'
            : 'Consoles, ground systems, instruments for people who can’t look away from the work. Below: selected work, a way of working, and a channel to open.'}
        </Text>

        {/* CTA pair */}
        <div className="mt-10 flex flex-wrap gap-3">
          <TransitionLink to={`/${locale}/projects`} unstyled>
            <Button variant="primary">
              {isEs ? 'Ver trabajos' : 'View work'} <span aria-hidden="true">→</span>
            </Button>
          </TransitionLink>
          <TransitionLink to={`/${locale}/contact`} unstyled>
            <Button>
              {isEs ? 'Agendar una llamada' : 'Book a call'} <span aria-hidden="true">→</span>
            </Button>
          </TransitionLink>
        </div>
      </div>

      {/* Glass readout — the C residue from the design chat. Shown only on
          wide viewports so the headline owns the reading order on mobile. */}
      <GlassPanel
        variant="elev"
        className="hidden xl:block absolute right-24 top-1/2 -translate-y-1/2 max-w-xs p-5 pointer-events-auto"
        aria-label="Currently"
      >
        <Text variant="label" className="mb-2 block">
          {isEs ? 'Actualmente' : 'Currently'}
        </Text>
        <Text variant="small" className="text-fg-primary">
          {isEs
            ? 'Atlas Console · disponible para un problema con forma de consola en Q3 2026.'
            : 'Atlas Console · available for a console-shaped problem in Q3 2026.'}
        </Text>
      </GlassPanel>

      {/* Bottom strip — "currently / selected / scroll" mono labels, mockup grammar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-10">
        <div>
          <Text variant="label" className="mb-1 block">
            {isEs ? 'Actualmente' : 'Currently'}
          </Text>
          <Text variant="small" className="text-fg-primary">
            Atlas Console
          </Text>
          <Text variant="small">{isEs ? '· Director de técnica' : '· Lead engineer'}</Text>
        </div>
        <div>
          <Text variant="label" className="mb-1 block">
            {isEs ? 'Seleccionado · 2026' : 'Selected · 2026'}
          </Text>
          <Text variant="small" className="text-fg-primary">
            {isEs ? '6 trabajos en órbita' : '6 things in orbit'}
          </Text>
          <Text variant="small">
            <TransitionLink to={`/${locale}/projects`} className="text-cyan no-underline">
              {isEs ? 'ver todos →' : 'see all →'}
            </TransitionLink>
          </Text>
        </div>
        <div>
          <Text variant="label" className="mb-1 block">
            {isEs ? 'Siguiente' : 'Next'}
          </Text>
          <Text variant="small" className="text-fg-primary">
            <TransitionLink to={`/${locale}/about`} className="no-underline">
              {isEs ? 'Acerca · 02' : 'About · 02'}
            </TransitionLink>
          </Text>
        </div>
      </div>
    </Container>
  );
}
