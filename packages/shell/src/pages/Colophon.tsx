import { useEffect } from 'react';
import { useParams } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { Container, GlassPanel, Heading, Text } from '@portfolio/ui';
import { TransitionLink } from '../components/TransitionLink';

// Colophon — six sections per the user's mockup (type section dropped):
// 01 Stack · 02 Build notes · 03 Perf & access · 04 Changelog · 05 Credits ·
// 06 License & source. The black-hole backdrop is wired by CelestialBackdrop.
// Phase 6 migrated visible strings to react-i18next; the body content stays
// inline JSX (no MDX) per the phase scope decision.
//
// The DevTools console easter egg below ports the mockup's stylised greeting.

export function Colophon() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const { t } = useTranslation(['colophon', 'common']);

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
          <span aria-hidden="true">←</span> {t('crumbBack')}
        </TransitionLink>
        <Text variant="micro">05 · /colophon · v0.4</Text>
      </div>

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
      <Text variant="lead" className="mt-6 max-w-[640px]">
        {t('lead')}
      </Text>

      <Section
        order={t('sections.stack.order')}
        title={t('sections.stack.title')}
        subtitle={t('sections.stack.subtitle')}
      >
        <GlassPanel className="p-6">
          <dl className="grid grid-cols-[140px_1fr] gap-y-4 font-mono text-small">
            <Spec label={t('sections.stack.labels.framework')}>
              <Pill>React 19</Pill>
              <Pill>React Router v7</Pill>
              <Pill>Vite 6</Pill>
            </Spec>
            <Spec label={t('sections.stack.labels.threeD')}>
              <Pill>R3F · Three.js</Pill>
              <span className="text-fg-muted">{t('sections.stack.notes.threeD')}</span>
            </Spec>
            <Spec label={t('sections.stack.labels.polyglot')}>
              <Pill>Angular Elements</Pill>
              <span className="text-fg-muted">{t('sections.stack.notes.polyglot')}</span>
            </Spec>
            <Spec label={t('sections.stack.labels.style')}>
              <Pill>Tailwind v4</Pill>
              <Pill>OKLCH tokens</Pill>
            </Spec>
            <Spec label={t('sections.stack.labels.i18n')}>
              <Pill>react-i18next</Pill>
              <span className="text-fg-muted">{t('sections.stack.notes.i18n')}</span>
            </Spec>
            <Spec label={t('sections.stack.labels.hosting')}>
              <Pill>GitHub Pages</Pill>
              <Pill>GH Actions</Pill>
            </Spec>
            <Spec label={t('sections.stack.labels.privacy')}>
              <span className="text-fg-secondary">{t('sections.stack.notes.privacy')}</span>
            </Spec>
          </dl>
        </GlassPanel>
      </Section>

      <Section
        order={t('sections.build.order')}
        title={t('sections.build.title')}
        subtitle={t('sections.build.subtitle')}
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
│   └── content/              — i18n strings + locales/{en,es} (phase 6)
├── manifest.json             — generated by manifest-builder
└── .github/workflows/        — build-and-deploy + dispatch-receiver (phase 7)`}
          </pre>
        </GlassPanel>
      </Section>

      <Section
        order={t('sections.perf.order')}
        title={t('sections.perf.title')}
        subtitle={t('sections.perf.subtitle')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassPanel className="p-5">
            <Text variant="label" className="mb-3 block">
              {t('sections.perf.cwvHeading')}
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
              {t('sections.perf.wcagHeading')}
            </Text>
            <ul className="font-mono text-small">
              <PerfRow k="Keyboard" v={t('sections.perf.wcag.keyboard')} />
              <PerfRow k="Focus" v={t('sections.perf.wcag.focus')} />
              <PerfRow k="Reduced motion" v={t('sections.perf.wcag.motion')} />
              <PerfRow k="Contrast" v={t('sections.perf.wcag.contrast')} />
              <PerfRow k="Screen reader" v={t('sections.perf.wcag.screenReader')} />
            </ul>
          </GlassPanel>
        </div>
      </Section>

      <Section
        order={t('sections.changelog.order')}
        title={t('sections.changelog.title')}
        subtitle={t('sections.changelog.subtitle')}
      >
        <GlassPanel className="p-6">
          <table className="w-full font-mono text-small">
            <thead>
              <tr className="text-fg-muted">
                <th className="text-left pb-3 px-2 w-20">{t('sections.changelog.headers.ver')}</th>
                <th className="text-left pb-3 px-2 w-32">{t('sections.changelog.headers.date')}</th>
                <th className="text-left pb-3 px-2">{t('sections.changelog.headers.note')}</th>
              </tr>
            </thead>
            <tbody>
              <ChangeRow
                ver="0.5"
                date="2026-04-25"
                note={t('sections.changelog.entries.v04i18n')}
              />
              <ChangeRow ver="0.4" date="2026-04-25" note={t('sections.changelog.entries.v04')} />
              <ChangeRow ver="0.3" date="2026-04-25" note={t('sections.changelog.entries.v03')} />
              <ChangeRow ver="0.2" date="2026-04-24" note={t('sections.changelog.entries.v02')} />
              <ChangeRow ver="0.1" date="2026-04-24" note={t('sections.changelog.entries.v01')} />
              <ChangeRow ver="0.0" date="2026-04-24" note={t('sections.changelog.entries.v00')} />
            </tbody>
          </table>
        </GlassPanel>
      </Section>

      <Section
        order={t('sections.credits.order')}
        title={t('sections.credits.title')}
        subtitle={t('sections.credits.subtitle')}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <CreditGroup
            label={t('sections.credits.groups.influences')}
            items={[
              'Ted Chiang · prose discipline',
              'Pentagram · type confidence',
              'Coursey · field-report tone',
            ]}
          />
          <CreditGroup
            label={t('sections.credits.groups.openSource')}
            items={[
              'React · Three.js · Tailwind',
              'Vite · pnpm · Vitest',
              'Octokit · Zod · MapLibre',
            ]}
          />
          <CreditGroup
            label={t('sections.credits.groups.imagery')}
            items={[
              'NASA · Blue/Black Marble',
              'ESA/Hubble · nebulae references',
              'EHT collaboration · M87*',
            ]}
          />
          <CreditGroup
            label={t('sections.credits.groups.typefaces')}
            items={[
              'Space Grotesk · Florian Karsten',
              'Inter Tight · Rasmus Andersson',
              'JetBrains Mono · JetBrains',
            ]}
          />
        </div>
      </Section>

      <Section
        order={t('sections.license.order')}
        title={t('sections.license.title')}
        subtitle={t('sections.license.subtitle')}
      >
        <GlassPanel className="p-6 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6 items-center">
          <div>
            <Text className="text-fg-primary">{t('sections.license.body')}</Text>
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
              {t('common:external.viewSource')} <span aria-hidden="true">↗</span>
            </a>
            <a
              href="https://opensource.org/licenses/MIT"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-sm border border-glass-hairline-inner bg-glass-elev text-fg-primary hover:text-cyan font-mono text-small uppercase tracking-[0.14em]"
            >
              {t('common:external.readMit')} <span aria-hidden="true">↗</span>
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
