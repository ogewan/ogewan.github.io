import { useParams } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { Container, GlassPanel, Heading, Text } from '@portfolio/ui';
import { TimelineWrapper } from '../TimelineWrapper';
import { SectionLink } from '../SectionLink';

// About section. Was the old About page; now stacks on the one-page MainPage
// after the Hero.
//
// Sections, mirroring the mockup grammar:
//   01 Posture · 02 Trajectory (timeline) · 03 What I work on / how I work ·
//   04 Currently · 05 Speaking & writing · 06 Shelf · CTA
export function AboutSection() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const { t } = useTranslation(['about']);

  return (
    <Container width="reading" className="pb-20">
      {/* Head */}
      <Text variant="label" className="mb-3 inline-flex items-center gap-2">
        <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
        {t('eyebrow')}
      </Text>
      <Heading level={1} variant="display" tabIndex={-1} className="max-w-[18ch]">
        <Trans
          i18nKey="headline"
          t={t}
          components={{ em: <em className="not-italic text-fg-secondary" /> }}
        />
      </Heading>

      <GlassPanel className="mt-10 p-6">
        <dl className="grid grid-cols-[140px_1fr] gap-y-3 gap-x-6 font-mono text-small">
          <dt className="text-fg-muted">{t('profile.name')}</dt>
          <dd className="text-fg-primary">&lt;your-name&gt;</dd>
          <dt className="text-fg-muted">{t('profile.pronouns')}</dt>
          <dd className="text-fg-primary">they / them</dd>
          <dt className="text-fg-muted">{t('profile.languages')}</dt>
          <dd className="text-fg-primary">English · Español</dd>
          <dt className="text-fg-muted">{t('profile.stack')}</dt>
          <dd className="text-fg-primary">React · R3F · TypeScript · Rust · GLSL</dd>
          <dt className="text-fg-muted">{t('profile.email')}</dt>
          <dd className="text-fg-primary">hello@example.com</dd>
        </dl>
      </GlassPanel>

      {/* Section spacing */}
      <Section order={t('sections.posture.order')} title={t('sections.posture.title')}>
        <Text>{t('sections.posture.body')}</Text>
        <PullQuote>{t('sections.posture.quote')}</PullQuote>
      </Section>

      <Section order={t('sections.trajectory.order')} title={t('sections.trajectory.title')}>
        <Text variant="lead" className="mb-6">
          {t('sections.trajectory.body')}
        </Text>
        <GlassPanel variant="inset" className="p-6">
          <TimelineWrapper locale={locale} />
        </GlassPanel>
      </Section>

      <Section order={t('sections.work.order')} title={t('sections.work.title')}>
        <Heading level={4} className="mt-2 mb-2">
          {t('sections.work.subhead1')}
        </Heading>
        <Text>{t('sections.work.body1')}</Text>
        <Heading level={4} className="mt-6 mb-2">
          {t('sections.work.subhead2')}
        </Heading>
        <Text>{t('sections.work.body2')}</Text>
      </Section>

      <Section order={t('sections.currently.order')} title={t('sections.currently.title')}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CurrentlyCard
            label={t('sections.currently.reading')}
            value="The Mushroom at the End of the World — Anna Tsing"
          />
          <CurrentlyCard
            label={t('sections.currently.building')}
            value="Atlas Console v3.2 — telemetry rewrite"
          />
          <CurrentlyCard
            label={t('sections.currently.listening')}
            value="Obsidian Soundfields — field recordings"
          />
        </div>
      </Section>

      <Section order={t('sections.speaking.order')} title={t('sections.speaking.title')}>
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

      <Section order={t('sections.shelf.order')} title={t('sections.shelf.title')}>
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
            {t('cta.label')}
          </Text>
          <Heading level={3}>{t('cta.headline')}</Heading>
        </div>
        <div className="flex gap-3">
          <SectionLink
            to="contact"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-sm border border-[color:oklch(0.84_0.12_210/0.4)] bg-glass-panel text-cyan font-mono text-small uppercase tracking-[0.14em] no-underline"
          >
            {t('cta.button')} <span aria-hidden="true">→</span>
          </SectionLink>
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
