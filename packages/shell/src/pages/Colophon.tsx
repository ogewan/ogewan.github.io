import { useEffect } from 'react';
import { useParams } from 'react-router';
import { Container, GlassPanel, Heading, Text } from '@portfolio/ui';
import { TransitionLink } from '../components/TransitionLink';

// Colophon — six sections per the user's mockup (type section dropped):
// 01 Stack · 02 Build notes · 03 Perf & access · 04 Changelog · 05 Credits ·
// 06 License & source. The black-hole backdrop is wired by CelestialBackdrop.
// Phase 6 will move the body content into MDX files in @portfolio/content;
// for Phase 4 the prose lives inline so the layout grammar is real.
//
// The DevTools console easter egg below ports the mockup's stylised greeting.

export function Colophon() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const isEs = locale === 'es';

  // Console easter egg — fires once per page load.
  useEffect(() => {
    if (typeof console === 'undefined') return;
    const big =
      'font-family: "Space Grotesk", sans-serif; font-size: 36px; font-weight: 300; ' +
      'color: oklch(0.84 0.12 210); text-shadow: 0 0 12px oklch(0.84 0.12 210 / 0.35); padding: 16px 0;';
    const meta =
      'font-family: "JetBrains Mono", monospace; font-size: 11px; color: oklch(0.6 0.01 280); letter-spacing: 0.1em;';
    const tail =
      'font-family: serif; font-style: italic; color: oklch(0.78 0.008 280); font-size: 13px;';
    console.log('%cOpen channel.', big);
    console.log('%c/colophon · v0.4 · 2026-04-25', meta);
    console.log('%cif you’re reading this, you’re my kind of person. ✦', tail);
  }, []);

  return (
    <Container width="reading" className="pb-24">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <TransitionLink
          to={`/${locale}/`}
          className="font-mono text-micro tracking-[0.14em] uppercase no-underline border-b-0"
        >
          <span aria-hidden="true">←</span> {isEs ? 'Volver al inicio' : 'Back to home'}
        </TransitionLink>
        <Text variant="micro">05 · /colophon · v0.4</Text>
      </div>

      <Text variant="label" className="mb-3 inline-flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
        {isEs ? '05 / Colofón · cómo se hizo este sitio' : '05 / Colophon · how this site was made'}
      </Text>
      <Heading level={1} variant="h1" tabIndex={-1}>
        {isEs ? (
          <>
            Acerca de este <em className="not-italic text-fg-secondary">sitio.</em>
          </>
        ) : (
          <>
            About this <em className="not-italic text-fg-secondary">site.</em>
          </>
        )}
      </Heading>
      <Text variant="lead" className="mt-6 max-w-[640px]">
        {isEs
          ? 'Un colofón pequeño para un sitio pequeño. Stack, decisiones, performance, changelog, créditos, licencia.'
          : 'A small colophon for a small site. Stack, decisions, performance, changelog, credits, license.'}
      </Text>

      <Section
        order="01"
        title={isEs ? 'Stack' : 'Stack'}
        subtitle={isEs ? 'Lo que está corriendo, aproximadamente.' : "What's running, roughly."}
      >
        <GlassPanel className="p-6">
          <dl className="grid grid-cols-[140px_1fr] gap-y-4 font-mono text-small">
            <Spec label="Framework">
              <Pill>React 19</Pill>
              <Pill>React Router v7</Pill>
              <Pill>Vite 6</Pill>
            </Spec>
            <Spec label="3D">
              <Pill>R3F · Three.js</Pill>
              <span className="text-fg-muted">phase 9 · placeholders today</span>
            </Spec>
            <Spec label="Polyglot">
              <Pill>Angular Elements</Pill>
              <span className="text-fg-muted">timeline · phase 5</span>
            </Spec>
            <Spec label="Style">
              <Pill>Tailwind v4</Pill>
              <Pill>OKLCH tokens</Pill>
            </Spec>
            <Spec label="i18n">
              <Pill>react-i18next</Pill>
              <span className="text-fg-muted">phase 6</span>
            </Spec>
            <Spec label="Hosting">
              <Pill>GitHub Pages</Pill>
              <Pill>GH Actions</Pill>
            </Spec>
            <Spec label="Privacy">
              <span className="text-fg-secondary">no analytics · no cookies</span>
            </Spec>
          </dl>
        </GlassPanel>
      </Section>

      <Section
        order="02"
        title={isEs ? 'Notas de build' : 'Build notes'}
        subtitle={isEs ? 'Cómo encajan las páginas.' : 'How the pages fit together.'}
      >
        <GlassPanel variant="inset" className="p-6 overflow-x-auto">
          <pre className="font-mono text-micro leading-[1.7] text-fg-secondary">
            {`portfolio/
├── packages/
│   ├── shell/                — React 19 SPA, Vite, locale-prefixed routes
│   ├── ui/                   — design tokens (theme.css + tokens.ts) + 8 primitives
│   ├── celestial/            — persistent backdrop, 5 scene states (CSS placeholders)
│   ├── ng-elements/          — Angular Elements timeline (phase 5)
│   ├── manifest-builder/     — Zod schema + GraphQL CLI (phase 1, run by GH Actions phase 7)
│   └── content/              — i18n strings + MDX (phase 6)
├── manifest.json             — generated by manifest-builder
└── .github/workflows/        — build-and-deploy + dispatch-receiver (phase 7)`}
          </pre>
        </GlassPanel>
      </Section>

      <Section
        order="03"
        title={isEs ? 'Perf y accesibilidad' : 'Perf & access'}
        subtitle={isEs ? 'Recibos sobre afirmaciones.' : 'Receipts over claims.'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassPanel className="p-5">
            <Text variant="label" className="mb-3 block">
              {isEs ? 'Core Web Vitals · objetivo' : 'Core Web Vitals · target'}
            </Text>
            <ul className="font-mono text-small">
              <PerfRow k="LCP" v="≤ 1.5s" />
              <PerfRow k="INP" v="≤ 200ms" />
              <PerfRow k="CLS" v="≤ 0.05" />
              <PerfRow k="JS" v="≤ 150 kB gz" />
              <PerfRow k="LIGHTHOUSE" v="≥ 95" />
            </ul>
          </GlassPanel>
          <GlassPanel className="p-5">
            <Text variant="label" className="mb-3 block">
              {isEs ? 'WCAG 2.2 AA' : 'WCAG 2.2 AA'}
            </Text>
            <ul className="font-mono text-small">
              <PerfRow k="Keyboard" v="✓ all interactive" />
              <PerfRow k="Focus" v="✓ visible on glass" />
              <PerfRow k="Reduced motion" v="✓ full branch" />
              <PerfRow k="Contrast" v="AA min, mostly AAA" />
              <PerfRow k="Screen reader" v="✓ live route announce" />
            </ul>
          </GlassPanel>
        </div>
      </Section>

      <Section
        order="04"
        title="Changelog"
        subtitle={isEs ? 'Versiones, terso.' : 'Versions, terse.'}
      >
        <GlassPanel className="p-6">
          <table className="w-full font-mono text-small">
            <thead>
              <tr className="text-fg-muted">
                <th className="text-left pb-3 px-2 w-20">VER</th>
                <th className="text-left pb-3 px-2 w-32">DATE</th>
                <th className="text-left pb-3 px-2">NOTE</th>
              </tr>
            </thead>
            <tbody>
              <ChangeRow
                ver="0.4"
                date="2026-04-25"
                note="Real shell pages, location rail, projects from manifest, View Transitions"
              />
              <ChangeRow
                ver="0.3"
                date="2026-04-25"
                note="Persistent celestial backdrop (placeholders), focus API"
              />
              <ChangeRow
                ver="0.2"
                date="2026-04-24"
                note="Design tokens, primitives, /_dev/tokens showcase"
              />
              <ChangeRow
                ver="0.1"
                date="2026-04-24"
                note="Manifest builder + Zod schema + vitest suite"
              />
              <ChangeRow ver="0.0" date="2026-04-24" note="Initial monorepo scaffold" />
            </tbody>
          </table>
        </GlassPanel>
      </Section>

      <Section
        order="05"
        title={isEs ? 'Créditos e influencias' : 'Credits & influences'}
        subtitle={isEs ? 'Personas y referencias.' : 'People & references.'}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CreditGroup
            label={isEs ? 'Influencias' : 'Influences'}
            items={[
              'Ted Chiang · prose discipline',
              'Pentagram · type confidence',
              'Coursey · field-report tone',
            ]}
          />
          <CreditGroup
            label={isEs ? 'Open source' : 'Open source'}
            items={[
              'React · Three.js · Tailwind',
              'Vite · pnpm · Vitest',
              'Octokit · Zod · MapLibre',
            ]}
          />
          <CreditGroup
            label={isEs ? 'Imaginería' : 'Imagery'}
            items={[
              'NASA · Blue/Black Marble',
              'ESA/Hubble · nebulae references',
              'EHT collaboration · M87*',
            ]}
          />
          <CreditGroup
            label={isEs ? 'Tipografías' : 'Typefaces'}
            items={[
              'Space Grotesk · Florian Karsten',
              'Inter Tight · Rasmus Andersson',
              'JetBrains Mono · JetBrains',
            ]}
          />
        </div>
      </Section>

      <Section
        order="06"
        title={isEs ? 'Licencia y fuente' : 'License & source'}
        subtitle={isEs ? 'Usa el código, no los casos.' : 'Use the code, not the case studies.'}
      >
        <GlassPanel className="p-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <Text className="text-fg-primary">
              {isEs
                ? 'MIT. El código es libre — los casos de estudio son míos. Si los usas, dame crédito y haz el tuyo.'
                : 'MIT. Code is free — case studies are mine. If you use them, credit me and make your own.'}
            </Text>
            <Text variant="micro" className="mt-2 block">
              SPDX-License-Identifier: MIT
            </Text>
          </div>
          <div className="flex flex-col gap-2">
            <a
              href="https://github.com/username/portfolio"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-glass-hairline-inner bg-glass-elev text-fg-primary hover:text-cyan font-mono text-small uppercase tracking-[0.14em]"
            >
              View source <span aria-hidden="true">↗</span>
            </a>
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-glass-hairline-inner bg-glass-elev text-fg-primary hover:text-cyan font-mono text-small uppercase tracking-[0.14em]"
            >
              Read MIT <span aria-hidden="true">↗</span>
            </a>
          </div>
        </GlassPanel>
      </Section>
    </Container>
  );
}

function Section({
  order,
  title,
  subtitle,
  children,
}: {
  order: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-16">
      <Text variant="label" className="mb-3 inline-flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
        {order} · {title} ·{' '}
        <span className="text-fg-secondary normal-case tracking-normal italic font-display">
          {subtitle}
        </span>
      </Text>
      <Heading level={2} className="mb-6">
        {title}.
      </Heading>
      {children}
    </section>
  );
}

function Spec({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-fg-muted">{label}</dt>
      <dd className="text-fg-primary flex flex-wrap items-center gap-2">{children}</dd>
    </>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="font-mono text-micro tracking-[0.1em] uppercase px-2 py-0.5 rounded-sm border border-glass-hairline-inner text-fg-primary">
      {children}
    </span>
  );
}

function PerfRow({ k, v }: { k: string; v: string }) {
  return (
    <li className="flex items-baseline justify-between py-2 border-t border-dashed border-glass-hairline-inner first:border-t-0">
      <span className="text-fg-muted">{k}</span>
      <span className="text-cyan">{v}</span>
    </li>
  );
}

function ChangeRow({ ver, date, note }: { ver: string; date: string; note: string }) {
  return (
    <tr className="border-t border-dashed border-glass-hairline-inner">
      <td className="py-3 px-2 text-cyan">v{ver}</td>
      <td className="py-3 px-2 text-fg-muted">{date}</td>
      <td className="py-3 px-2 text-fg-primary">{note}</td>
    </tr>
  );
}

function CreditGroup({ label, items }: { label: string; items: string[] }) {
  return (
    <GlassPanel variant="inset" className="p-5">
      <Text variant="label" className="mb-3 block">
        {label}
      </Text>
      <ul className="space-y-2 font-mono text-small">
        {items.map((item) => (
          <li key={item} className="text-fg-primary">
            {item}
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
