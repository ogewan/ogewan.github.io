import {
  Button,
  Container,
  GlassPanel,
  Heading,
  Link,
  SCENE_GRADIENTS,
  Text,
  VisuallyHidden,
  focusRingClassName,
} from '@portfolio/ui';

// Developer-only showcase of every token + primitive rendered on a single page.
// Route: /:locale/_dev/tokens (guarded against production in App.tsx).

const SCENES: Array<{ name: keyof typeof SCENE_GRADIENTS; label: string; route: string }> = [
  { name: 'earth', label: 'Earth', route: '/' },
  { name: 'about', label: 'Earth retreating', route: '/about' },
  { name: 'projects', label: 'Ringed gas giant', route: '/projects' },
  { name: 'contact', label: 'Nebula', route: '/contact' },
  { name: 'colophon', label: 'Black hole', route: '/colophon' },
];

const FG_SWATCHES = [
  { name: 'fg-primary', label: 'Primary' },
  { name: 'fg-secondary', label: 'Secondary' },
  { name: 'fg-muted', label: 'Muted' },
  { name: 'fg-disabled', label: 'Disabled' },
];

const ACCENT_SWATCHES = [
  { name: 'cyan', label: 'Cyan · Interactive' },
  { name: 'amber', label: 'Amber · You' },
  { name: 'cyan-dim', label: 'Cyan (dim)' },
  { name: 'amber-dim', label: 'Amber (dim)' },
];

const STATUS_SWATCHES = [
  { name: 'status-ok', label: 'OK' },
  { name: 'status-warn', label: 'Warn' },
  { name: 'status-err', label: 'Err' },
];

const SPACING_STEPS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const RADII = [
  { name: 'rounded-sm', label: '10px · pills, inputs' },
  { name: 'rounded-md', label: '16px · cards, panels' },
  { name: 'rounded-lg', label: '24px · hero glass' },
  { name: 'rounded-full', label: '9999 · dot, tag' },
];

export function TokensShowcase() {
  return (
    <div
      style={{ background: SCENE_GRADIENTS.projects }}
      className="min-h-screen [transition:background_var(--dur-route)_var(--ease-smooth)]"
    >
      <Container as="main" className="py-24">
        <header className="mb-16">
          <Text variant="label" className="mb-4 inline-flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
            /_dev · Design tokens
          </Text>
          <Heading level={1} variant="display">
            Obsidian <em className="not-italic text-fg-secondary">tokens,</em>
            <br />
            v0.1
          </Heading>
          <Text variant="lead" className="mt-6 max-w-[640px]">
            Scene gradients, glass tiers, the three-typeface stack, the 4px spacing ladder, the soft
            Aero radii, and every primitive — rendered against the projects backdrop. Tab through
            the interactive elements to stress-test the focus ring.
          </Text>
        </header>

        {/* ---------- 01 Backdrops ---------- */}
        <Section order="01" title="Scene gradients" meta="ROUTE → GRADIENT · 1200MS">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
            {SCENES.map((scene) => (
              <div
                key={scene.name}
                style={{ background: SCENE_GRADIENTS[scene.name] }}
                className="aspect-[16/10] rounded-md border border-glass-hairline-inner p-4 flex flex-col justify-between [box-shadow:inset_0_1px_0_var(--color-glass-hairline-top),0_20px_40px_-20px_oklch(0_0_0/0.5)]"
              >
                <div>
                  <Text variant="label">Scene</Text>
                  <Text as="p" className="font-display text-[22px] mt-1">
                    {scene.label}
                  </Text>
                </div>
                <Text variant="micro" className="text-fg-muted">
                  {scene.route} · --bg-{scene.name}
                </Text>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------- 02 Colors ---------- */}
        <Section order="02" title="Foreground + accents + status" meta="OKLCH · WCAG 2.2 AA">
          <Text variant="label" className="mb-3 block">
            Foreground
          </Text>
          <SwatchGrid swatches={FG_SWATCHES} className="mb-8" />
          <Text variant="label" className="mb-3 block">
            Accents — split (cyan / amber)
          </Text>
          <SwatchGrid swatches={ACCENT_SWATCHES} className="mb-8" />
          <Text variant="label" className="mb-3 block">
            Status
          </Text>
          <SwatchGrid swatches={STATUS_SWATCHES} />
        </Section>

        {/* ---------- 03 Glass ---------- */}
        <Section order="03" title="Glass tiers" meta="BLUR 10–20PX">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-6">
            {(['chrome', 'panel', 'inset', 'elev'] as const).map((variant) => (
              <GlassPanel
                key={variant}
                variant={variant}
                className="p-6 min-h-[180px] flex flex-col justify-between"
              >
                <Text variant="label">{variant}</Text>
                <Text variant="small">
                  backdrop-filter + 1px inner hairline + 1px specular top edge
                </Text>
              </GlassPanel>
            ))}
          </div>
        </Section>

        {/* ---------- 04 Type ---------- */}
        <Section order="04" title="Type" meta="SPACE GROTESK · INTER TIGHT · JETBRAINS MONO">
          <GlassPanel className="p-8">
            <TypeRow spec="t-display · Space Grotesk 300">
              <Heading level={1} variant="display">
                Built at the shoreline.
              </Heading>
            </TypeRow>
            <TypeRow spec="t-h1 · Space Grotesk 400">
              <Heading level={1}>Selected work, 2021–2026.</Heading>
            </TypeRow>
            <TypeRow spec="t-h2 · Space Grotesk 400">
              <Heading level={2}>Scenes shift as routes change.</Heading>
            </TypeRow>
            <TypeRow spec="t-h3 · Space Grotesk 500">
              <Heading level={3}>A polyglot React + R3F + Angular portfolio</Heading>
            </TypeRow>
            <TypeRow spec="t-h4 · Inter Tight 600">
              <Heading level={4}>Persistent celestial shell</Heading>
            </TypeRow>
            <TypeRow spec="t-lead · Inter Tight 400">
              <Text variant="lead">
                Content regions stay Chiang/Coursey — the atmosphere lives in the chrome.
              </Text>
            </TypeRow>
            <TypeRow spec="t-body · Inter Tight 400">
              <Text>
                The scene progresses with the route: Earth at the hero, retreating with the moon on
                about, a ringed gas giant for work, a nebula on contact, a black hole on colophon.
              </Text>
            </TypeRow>
            <TypeRow spec="t-small · Inter Tight 400">
              <Text variant="small">Metadata and captions.</Text>
            </TypeRow>
            <TypeRow spec="t-label · JetBrains Mono 500">
              <Text variant="label">ROUTE 01 · EARTH ORBIT · UTC 2026-04-24</Text>
            </TypeRow>
            <TypeRow spec="t-micro · JetBrains Mono 500">
              <Text variant="micro">COMMIT 3A9C2F · BUILD 441 · R3F · ANGULAR</Text>
            </TypeRow>
          </GlassPanel>
        </Section>

        {/* ---------- 05 Spacing ---------- */}
        <Section order="05" title="Spacing" meta="4PX BASE · 12 STEPS">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(120px,1fr))] gap-3">
            {SPACING_STEPS.map((step) => (
              <GlassPanel
                key={step}
                variant="inset"
                className="p-3 min-h-[120px] flex flex-col gap-2"
              >
                <Text variant="micro" className="text-fg-primary">
                  --sp-{step}
                </Text>
                <div
                  className="bg-[color:oklch(0.7_0.05_220/0.35)] border border-[color:oklch(0.8_0.06_220/0.3)] rounded-[2px]"
                  style={{ height: `${[4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 160][step - 1]}px` }}
                />
                <Text variant="micro">
                  {[4, 8, 12, 16, 24, 32, 48, 64, 96, 128, 192][step - 1]}px
                </Text>
              </GlassPanel>
            ))}
          </div>
        </Section>

        {/* ---------- 06 Radii ---------- */}
        <Section order="06" title="Radii" meta="10 / 16 / 24 / FULL">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-4">
            {RADII.map((r) => (
              <div
                key={r.name}
                className={`${r.name} bg-glass-panel border border-glass-hairline-inner [box-shadow:inset_0_1px_0_var(--color-glass-hairline-top)] aspect-[1.4/1] p-4 flex items-end justify-between`}
              >
                <Text variant="micro" className="text-fg-primary">
                  {r.name}
                </Text>
                <Text variant="micro">{r.label}</Text>
              </div>
            ))}
          </div>
        </Section>

        {/* ---------- 07 Interactive states ---------- */}
        <Section
          order="07"
          title="Interactive — focus rings on glass"
          meta="44×44 MIN · CYAN BLOOM"
        >
          <Text variant="lead" className="mb-6 max-w-[640px]">
            Tab through the buttons and link. The ring is a composite shadow (dark pad + cyan stroke
            + bloom) — never the browser default.
          </Text>
          <div className="flex flex-wrap gap-4 items-center">
            <Button variant="primary">View work →</Button>
            <Button>Ver trabajo →</Button>
            <Button>Book a call · Agendar</Button>
            <Button variant="ghost">Ghost</Button>
            <Link href="#" onClick={(e) => e.preventDefault()}>
              Inline link example
            </Link>
            <Link href="#" onClick={(e) => e.preventDefault()}>
              Enlace en español — leer más
            </Link>
            <button
              type="button"
              className={`w-3 h-3 rounded-full bg-amber ${focusRingClassName}`}
              aria-label="YOU marker pulse sample"
            />
          </div>
        </Section>

        {/* ---------- 08 a11y utilities ---------- */}
        <Section order="08" title="a11y utilities" meta="SR-ONLY · VISUALLYHIDDEN">
          <Text className="mb-4">
            The next sentence contains a{' '}
            <VisuallyHidden>screen-reader-only annotation</VisuallyHidden>
            hidden span — not visible, but announced.
          </Text>
          <Text variant="small">
            Inspect the DOM to see the `.absolute.clip-path-inset-50` wrapper. Useful for icon
            buttons, form-field hints, and live regions that don&apos;t need visual representation.
          </Text>
        </Section>

        <footer className="mt-20 flex flex-wrap items-baseline justify-between gap-4">
          <Text variant="micro">TOKENS · V0.1 · 2026-04-24</Text>
          <Text className="font-display text-[20px]">
            /_dev route · hidden in production builds
          </Text>
        </footer>
      </Container>
    </div>
  );
}

function Section({
  order,
  title,
  meta,
  children,
}: {
  order: string;
  title: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <section className="py-16 border-t border-glass-hairline-inner first-of-type:border-t-0">
      <div className="mb-10 flex flex-wrap items-baseline justify-between gap-6">
        <div>
          <Text variant="label" className="mb-3 inline-flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
            {order} · {title}
          </Text>
          <Heading level={2}>{title}.</Heading>
        </div>
        <Text variant="label">{meta}</Text>
      </div>
      {children}
    </section>
  );
}

function TypeRow({ spec, children }: { spec: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-6 items-baseline py-6 border-t border-dashed border-glass-hairline-inner first:border-t-0">
      <Text variant="small" className="font-mono text-fg-muted">
        {spec}
      </Text>
      <div>{children}</div>
    </div>
  );
}

function SwatchGrid({
  swatches,
  className,
}: {
  swatches: Array<{ name: string; label: string }>;
  className?: string;
}) {
  return (
    <div
      className={`grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 ${className ?? ''}`}
    >
      {swatches.map((swatch) => (
        <div
          key={swatch.name}
          style={{ background: `var(--color-${swatch.name})` }}
          className="border border-glass-hairline-inner rounded-md p-4 min-h-[120px] flex flex-col justify-between [box-shadow:inset_0_1px_0_var(--color-glass-hairline-top)]"
        >
          <Text
            variant="micro"
            className="text-[color:oklch(0.08_0.02_280)] mix-blend-plus-lighter"
          >
            {swatch.name}
          </Text>
          <Text className="font-display text-[20px] text-[color:oklch(0.08_0.02_280)] mix-blend-plus-lighter">
            {swatch.label}
          </Text>
        </div>
      ))}
    </div>
  );
}
