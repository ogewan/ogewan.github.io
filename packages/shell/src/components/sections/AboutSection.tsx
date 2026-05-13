import { type ReactNode } from 'react';
import { useParams } from 'react-router';
import { Trans, useTranslation } from 'react-i18next';
import { Container, GlassPanel, Heading, Text } from '@portfolio/ui';
import { TimelineWrapper } from '../TimelineWrapper';
import { SectionLink } from '../SectionLink';
import { siteConfig } from '../../data/site-config';
import { currentFocusEntry } from '../../data/manifest';

// About section. Identity (profile dl) is sourced from `config.json` via
// `siteConfig`; the persona sections (Posture/Trajectory/Work) are sourced
// from `about.json` i18n copy; the data-backed sections (Currently/Speaking/
// Shelf) are sourced from `config.about.*`.
//
// All six sections honor "skip if empty": persona sections check that title +
// body strings resolve to non-empty in the active locale, data sections check
// that the corresponding config field is present and non-empty. Order numbers
// (01..N) are computed at render time over the set of *present* sections, so
// removing one renumbers the rest.
export function AboutSection() {
  const params = useParams<{ locale?: string }>();
  const locale = params.locale ?? 'en';
  const { t } = useTranslation(['about']);
  const { owner, about } = siteConfig;

  const get = (key: string): string => t(key, { defaultValue: '' });

  const posture = {
    title: get('sections.posture.title'),
    body: get('sections.posture.body'),
    quote: get('sections.posture.quote'),
  };
  const trajectory = {
    title: get('sections.trajectory.title'),
    body: get('sections.trajectory.body'),
  };
  const work = {
    title: get('sections.work.title'),
    subhead1: get('sections.work.subhead1'),
    body1: get('sections.work.body1'),
    subhead2: get('sections.work.subhead2'),
    body2: get('sections.work.body2'),
  };
  const currentlyTitle = get('sections.currently.title');
  // Append a locale-formatted "Mon YYYY" stamp so the heading never goes stale.
  const currentlyDated = currentlyTitle
    ? `${currentlyTitle} · ${new Intl.DateTimeFormat(locale, { month: 'short', year: 'numeric' }).format(new Date())}`
    : '';
  const speakingTitle = get('sections.speaking.title');
  const shelfTitle = get('sections.shelf.title');

  type SectionDescriptor = { title: string; render: () => ReactNode };
  const sections: SectionDescriptor[] = [];

  if (posture.title && posture.body) {
    sections.push({
      title: posture.title,
      render: () => (
        <>
          <Text>{posture.body}</Text>
          {posture.quote ? <PullQuote>{posture.quote}</PullQuote> : null}
        </>
      ),
    });
  }

  if (trajectory.title && trajectory.body) {
    sections.push({
      title: trajectory.title,
      render: () => (
        <>
          <Text variant="lead" className="mb-6">
            {trajectory.body}
          </Text>
          <GlassPanel variant="inset" className="p-6">
            <TimelineWrapper locale={locale} />
          </GlassPanel>
        </>
      ),
    });
  }

  if (work.title && (work.body1 || work.body2)) {
    sections.push({
      title: work.title,
      render: () => (
        <>
          {work.subhead1 ? (
            <Heading level={4} className="mt-2 mb-2">
              {work.subhead1}
            </Heading>
          ) : null}
          {work.body1 ? <Text>{work.body1}</Text> : null}
          {work.subhead2 ? (
            <Heading level={4} className="mt-6 mb-2">
              {work.subhead2}
            </Heading>
          ) : null}
          {work.body2 ? <Text>{work.body2}</Text> : null}
        </>
      ),
    });
  }

  if (currentlyTitle && about?.currently) {
    const c = about.currently;
    const buildingValue = c.building ?? currentFocusEntry?.title;
    sections.push({
      title: currentlyDated,
      render: () => (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <CurrentlyCard label={get('sections.currently.reading')} value={c.reading} />
          {buildingValue ? (
            <CurrentlyCard label={get('sections.currently.building')} value={buildingValue} />
          ) : null}
          <CurrentlyCard label={get('sections.currently.listening')} value={c.listening} />
        </div>
      ),
    });
  }

  if (speakingTitle && about?.speaking && about.speaking.length > 0) {
    const items = about.speaking;
    sections.push({
      title: speakingTitle,
      render: () => (
        <ul className="space-y-3">
          {items.map((item) => (
            <TalkRow
              key={`${item.year}-${item.title}`}
              year={item.year}
              kind={item.kind}
              title={item.title}
              link={item.href}
            />
          ))}
        </ul>
      ),
    });
  }

  if (shelfTitle && about?.shelf && about.shelf.length > 0) {
    const items = about.shelf;
    sections.push({
      title: shelfTitle,
      render: () => (
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          {items.map((item) => (
            <ShelfRow key={item.num} num={item.num} title={item.title} author={item.author} />
          ))}
        </ul>
      ),
    });
  }

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
          <dd className="text-fg-primary">{owner.name}</dd>
          <dt className="text-fg-muted">{t('profile.pronouns')}</dt>
          <dd className="text-fg-primary">{owner.pronouns}</dd>
          <dt className="text-fg-muted">{t('profile.languages')}</dt>
          <dd className="text-fg-primary">{owner.languages.join(' · ')}</dd>
          <dt className="text-fg-muted">{t('profile.stack')}</dt>
          <dd className="text-fg-primary">{owner.stack.join(' · ')}</dd>
          <dt className="text-fg-muted">{t('profile.email')}</dt>
          <dd className="text-fg-primary">{owner.email}</dd>
        </dl>
      </GlassPanel>

      {sections.map((s, i) => (
        <Section key={s.title} order={String(i + 1).padStart(2, '0')} title={s.title}>
          {s.render()}
        </Section>
      ))}

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
      className="mt-6 pl-6 border-l-2 border-[color:oklch(0.84_0.12_210/0.4)] py-3 font-display text-h3 text-fg-secondary italic [text-shadow:0_1px_4px_rgba(0,0,0,1),0_2px_16px_rgba(0,0,0,0.95),0_0_40px_rgba(0,0,0,0.8)]"
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
    <li className="flex flex-wrap items-baseline gap-3 py-3 border-t border-dashed border-glass-hairline-inner first:border-t-0 [&_span,&_a]:[text-shadow:0_1px_4px_rgba(0,0,0,1),0_2px_16px_rgba(0,0,0,0.95),0_0_40px_rgba(0,0,0,0.8)]">
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
      <span className="font-mono text-micro text-fg-muted w-8 [text-shadow:0_1px_4px_rgba(0,0,0,1),0_2px_16px_rgba(0,0,0,0.95),0_0_40px_rgba(0,0,0,0.8)]">
        {num}
      </span>
      <div className="flex-1">
        <Text className="text-fg-primary">{title}</Text>
        <Text variant="small">{author}</Text>
      </div>
    </li>
  );
}
