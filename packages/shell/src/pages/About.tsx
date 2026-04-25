import { useParams } from 'react-router';
import { Container, GlassPanel, Heading, Text } from '@portfolio/ui';
import { TransitionLink } from '../components/TransitionLink';

// About page real layout. Phase 5 will replace the timeline placeholder with
// the Angular Elements custom timeline. Other sections render with
// representative placeholder copy in EN/ES.
//
// Sections, mirroring the mockup grammar:
//   01 Posture · 02 Trajectory (timeline placeholder) · 03 What I work on /
//   how I work · 04 Currently · 05 Speaking & writing · 06 Shelf · CTA
export function About() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const isEs = locale === 'es';

  return (
    <Container width="reading" className="pb-20">
      {/* Crumb */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <TransitionLink
          to={`/${locale}/`}
          className="font-mono text-micro tracking-[0.14em] uppercase no-underline border-b-0"
        >
          <span aria-hidden="true">←</span> {isEs ? 'Volver al inicio' : 'Back to home'}
        </TransitionLink>
        <Text variant="micro">02 · /about · v0.4</Text>
      </div>

      {/* Head */}
      <Text variant="label" className="mb-3 inline-flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
        {isEs ? '02 / Acerca' : '02 / About'}
      </Text>
      <Heading level={1} variant="display" tabIndex={-1} className="max-w-[18ch]">
        {isEs ? (
          <>
            Hago instrumentos para gente que no puede dejar de mirar el{' '}
            <em className="not-italic text-fg-secondary">trabajo.</em>
          </>
        ) : (
          <>
            I make instruments for people who can&apos;t look away from the{' '}
            <em className="not-italic text-fg-secondary">work.</em>
          </>
        )}
      </Heading>

      <GlassPanel className="mt-10 p-6">
        <dl className="grid grid-cols-[140px_1fr] gap-y-3 gap-x-6 font-mono text-small">
          <dt className="text-fg-muted">{isEs ? 'Nombre' : 'Name'}</dt>
          <dd className="text-fg-primary">&lt;your-name&gt;</dd>
          <dt className="text-fg-muted">{isEs ? 'Pronombres' : 'Pronouns'}</dt>
          <dd className="text-fg-primary">they / them</dd>
          <dt className="text-fg-muted">{isEs ? 'Idiomas' : 'Languages'}</dt>
          <dd className="text-fg-primary">English · Español</dd>
          <dt className="text-fg-muted">Stack</dt>
          <dd className="text-fg-primary">React · R3F · TypeScript · Rust · GLSL</dd>
          <dt className="text-fg-muted">Email</dt>
          <dd className="text-fg-primary">hello@example.com</dd>
        </dl>
      </GlassPanel>

      {/* Section spacing */}
      <Section order="01" title={isEs ? 'Postura' : 'Posture'}>
        <Text>
          {isEs
            ? 'Trabajo donde el código se encuentra con el espacio físico — consolas, sistemas en tierra, herramientas para la sala. La interfaz debería desaparecer en el trabajo.'
            : 'I work where code meets the physical room — consoles, ground systems, instruments for the team in the room. The interface should disappear into the work.'}
        </Text>
        <PullQuote>
          {isEs
            ? 'La interfaz debería desaparecer en el trabajo.'
            : 'The interface should disappear into the work.'}
        </PullQuote>
      </Section>

      <Section
        order="02"
        title={isEs ? 'Trayectoria · 2014 → presente' : 'Trajectory · 2014 → present'}
      >
        <Text variant="lead" className="mb-6">
          {isEs
            ? 'Línea de tiempo interactiva — cargada bajo demanda como Angular Element en la fase 5.'
            : 'Interactive timeline — loaded on-demand as an Angular Element in Phase 5.'}
        </Text>
        <GlassPanel variant="inset" className="p-6 min-h-[280px] flex items-center justify-center">
          <Text variant="micro" className="text-fg-muted">
            {isEs ? '〘 Angular timeline · pendiente 〙' : '〘 Angular timeline · pending 〙'}
          </Text>
        </GlassPanel>
      </Section>

      <Section
        order="03"
        title={isEs ? 'En qué trabajo / cómo trabajo' : 'What I work on / how I work'}
      >
        <Heading level={4} className="mt-2 mb-2">
          {isEs ? 'En qué trabajo.' : 'What I work on.'}
        </Heading>
        <Text>
          {isEs
            ? 'Consolas para sistemas en tierra. Visualización en tiempo real. Sistemas de diseño que sobreviven a 5 años de iteración. Auditorías de rendimiento. Trabajo de R3F y GLSL cuando la imagen tiene que cargar significado.'
            : 'Consoles for ground systems. Real-time visualization. Design systems that survive five years of iteration. Performance audits. R3F and GLSL work when the image has to carry meaning.'}
        </Text>
        <Heading level={4} className="mt-6 mb-2">
          {isEs ? 'Cómo trabajo.' : 'How I work.'}
        </Heading>
        <Text>
          {isEs
            ? 'Embedded en el equipo, no a distancia. Specs antes de pixels. Lee la sala antes de escribir el código. El color es reservado, los movimientos son tranquilos. Fechas reales en commits reales.'
            : 'Embedded with the team, not at arm’s length. Specs before pixels. Read the room before writing the code. Color reserved, animation quiet. Real dates on real commits.'}
        </Text>
      </Section>

      <Section order="04" title={isEs ? 'Actualmente · Nov 2025' : 'Currently · Nov 2025'}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CurrentlyCard
            label={isEs ? 'Leyendo' : 'Reading'}
            value="The Mushroom at the End of the World — Anna Tsing"
          />
          <CurrentlyCard
            label={isEs ? 'Construyendo' : 'Building'}
            value="Atlas Console v3.2 — telemetry rewrite"
          />
          <CurrentlyCard
            label={isEs ? 'Escuchando' : 'Listening'}
            value="Obsidian Soundfields — field recordings"
          />
        </div>
      </Section>

      <Section order="05" title={isEs ? 'Charlas y escritura' : 'Speaking & writing'}>
        <ul className="space-y-3">
          <TalkRow
            year="2025"
            kind="talk"
            title="Reading the room: console UX for high-trust settings"
            link="https://example.com/talk-1"
          />
          <TalkRow
            year="2024"
            kind="essay"
            title="Why your design system needs a calendar, not a roadmap"
            link="https://example.com/essay-1"
          />
          <TalkRow
            year="2023"
            kind="slides"
            title="OKLCH for engineers"
            link="https://example.com/slides-1"
          />
        </ul>
      </Section>

      <Section order="06" title={isEs ? 'Lo que tengo en el estante' : 'What I keep on the shelf'}>
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <ShelfRow num="01" title="Ways of Seeing" author="John Berger · 1972" />
          <ShelfRow num="02" title="The Design of Everyday Things" author="Don Norman · 1988" />
          <ShelfRow
            num="03"
            title="The Visual Display of Quantitative Information"
            author="Edward Tufte · 1983"
          />
          <ShelfRow num="04" title="Image and Brain" author="Stephen Kosslyn · 1994" />
        </ul>
      </Section>

      <GlassPanel
        variant="elev"
        className="mt-16 p-8 flex flex-wrap items-center justify-between gap-6"
      >
        <div>
          <Text variant="label" className="mb-2 block">
            CTA
          </Text>
          <Heading level={3}>
            {isEs
              ? 'Disponible para un problema con forma de consola en Q3 2026.'
              : 'Available for a console-shaped problem in Q3 2026.'}
          </Heading>
        </div>
        <div className="flex gap-3">
          <TransitionLink
            to={`/${locale}/contact`}
            unstyled
            className="inline-flex items-center gap-2 px-5 py-3 rounded-sm border border-[color:oklch(0.84_0.12_210/0.4)] bg-glass-panel text-cyan font-mono text-small uppercase tracking-[0.14em]"
          >
            {isEs ? 'Enviar un brief' : 'Send a brief'} <span aria-hidden="true">→</span>
          </TransitionLink>
        </div>
      </GlassPanel>
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
      className="mt-6 pl-6 border-l-2 border-[color:oklch(0.84_0.12_210/0.4)] py-3 font-display text-h3 text-fg-secondary italic"
      style={{
        background: 'linear-gradient(to right, oklch(0.84 0.12 210 / 0.06), transparent 60%)',
      }}
    >
      {children}
    </blockquote>
  );
}

function CurrentlyCard({ label, value }: { label: string; value: string }) {
  return (
    <GlassPanel className="p-5 min-h-[120px] flex flex-col gap-2">
      <Text variant="label">{label}</Text>
      <Text variant="small" className="text-fg-primary">
        {value}
      </Text>
    </GlassPanel>
  );
}

function TalkRow({
  year,
  kind,
  title,
  link,
}: {
  year: string;
  kind: string;
  title: string;
  link: string;
}) {
  return (
    <li className="flex flex-wrap items-baseline gap-3 py-3 border-t border-dashed border-glass-hairline-inner first:border-t-0">
      <span className="font-mono text-small text-fg-muted w-20">{year}</span>
      <span className="font-mono text-micro text-fg-muted uppercase tracking-[0.14em] w-16">
        {kind}
      </span>
      <span className="flex-1 text-fg-primary">{title}</span>
      <a
        href={link}
        target="_blank"
        rel="noreferrer noopener"
        className="text-cyan no-underline border-b border-[color:oklch(0.84_0.12_210/0.3)] hover:border-b-cyan font-mono text-small"
      >
        Watch <span aria-hidden="true">↗</span>
      </a>
    </li>
  );
}

function ShelfRow({ num, title, author }: { num: string; title: string; author: string }) {
  return (
    <li className="flex items-baseline gap-3 py-3 border-t border-dashed border-glass-hairline-inner first:border-t-0">
      <span className="font-mono text-micro text-fg-muted w-8">{num}</span>
      <div className="flex-1">
        <Text className="text-fg-primary">{title}</Text>
        <Text variant="small">{author}</Text>
      </div>
    </li>
  );
}
