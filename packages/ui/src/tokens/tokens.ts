// Design tokens exported as TypeScript constants.
//
// The Tailwind @theme block in ./theme.css is the primary surface for the shell,
// but the celestial R3F package and the Angular Elements bundle need programmatic
// access — they can't read CSS custom properties at build time for shader uniforms,
// Three.js Color() constructors, or Angular template bindings. These constants are
// the single source of truth shared across packages.
//
// Keep in sync with ./theme.css manually. These are a small, stable set of tokens —
// automating the sync isn't worth the tooling cost.

export const COLORS = {
  fg: {
    primary: 'oklch(0.97 0.005 280)',
    secondary: 'oklch(0.78 0.008 280)',
    muted: 'oklch(0.60 0.01 280)',
    disabled: 'oklch(0.42 0.008 280)',
  },
  glass: {
    chrome: 'oklch(0.18 0.02 285 / 0.55)',
    panel: 'oklch(0.16 0.018 285 / 0.42)',
    inset: 'oklch(0.12 0.015 285 / 0.35)',
    elev: 'oklch(0.22 0.025 285 / 0.62)',
    hairlineTop: 'oklch(0.98 0.005 280 / 0.14)',
    hairlineInner: 'oklch(0.98 0.005 280 / 0.06)',
    hairlineBottom: 'oklch(0 0 0 / 0.35)',
  },
  accent: {
    cyan: 'oklch(0.84 0.12 210)',
    cyanDim: 'oklch(0.62 0.09 210)',
    cyanBloom: 'oklch(0.84 0.12 210 / 0.35)',
    amber: 'oklch(0.83 0.13 75)',
    amberDim: 'oklch(0.65 0.10 75)',
    amberBloom: 'oklch(0.83 0.13 75 / 0.40)',
  },
  status: {
    ok: 'oklch(0.80 0.10 160)',
    warn: 'oklch(0.82 0.12 85)',
    err: 'oklch(0.72 0.15 25)',
  },
  backdropBase: 'oklch(0.06 0.02 275)',
} as const;

export const SCENE_GRADIENTS = {
  earth:
    'radial-gradient(ellipse at 70% 30%, oklch(0.22 0.04 280) 0%, oklch(0.11 0.03 275) 45%, oklch(0.06 0.02 270) 100%)',
  about:
    'radial-gradient(ellipse at 40% 60%, oklch(0.20 0.035 285) 0%, oklch(0.10 0.025 278) 50%, oklch(0.05 0.015 270) 100%)',
  projects:
    'radial-gradient(ellipse at 60% 40%, oklch(0.19 0.03 290) 0%, oklch(0.09 0.02 282) 55%, oklch(0.05 0.015 275) 100%)',
  contact:
    'radial-gradient(ellipse at 30% 70%, oklch(0.22 0.05 305) 0%, oklch(0.12 0.035 295) 50%, oklch(0.06 0.02 285) 100%)',
  colophon:
    'radial-gradient(ellipse at 50% 50%, oklch(0.13 0.025 290) 0%, oklch(0.07 0.015 280) 60%, oklch(0.03 0.01 270) 100%)',
} as const;

export type SceneName = keyof typeof SCENE_GRADIENTS;

export const FONT_FAMILIES = {
  display: '"Space Grotesk", ui-sans-serif, system-ui, sans-serif',
  body: '"Inter Tight", ui-sans-serif, system-ui, sans-serif',
  mono: '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace',
} as const;

export const TYPE_SCALE = {
  display: 'clamp(56px, 9vw, 128px)',
  h1: 'clamp(40px, 5.2vw, 72px)',
  h2: 'clamp(30px, 3.4vw, 48px)',
  h3: '28px',
  h4: '22px',
  lead: '20px',
  body: '16px',
  small: '14px',
  label: '12px',
  micro: '11px',
} as const;

export const SPACING = {
  0: '0',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '24px',
  6: '32px',
  7: '48px',
  8: '64px',
  9: '96px',
  10: '128px',
  11: '192px',
} as const;

export const RADII = {
  sm: '10px',
  md: '16px',
  lg: '24px',
  full: '9999px',
} as const;

export const MOTION = {
  easeSmooth: 'cubic-bezier(0.22, 0.61, 0.36, 1)',
  easeGlass: 'cubic-bezier(0.33, 1, 0.68, 1)',
  durFast: '180ms',
  durMed: '420ms',
  durRoute: '1200ms',
  parallaxMax: 8,
} as const;

// Nav route mapping — URL slug to display label (EN).
// Spanish labels live in @portfolio/content locales.
export const NAV_ROUTES = [
  { slug: '', label: 'Home', order: '01' },
  { slug: 'about', label: 'About', order: '02' },
  { slug: 'projects', label: 'Work', order: '03' },
  { slug: 'contact', label: 'Contact', order: '04' },
  { slug: 'colophon', label: 'Colophon', order: '05' },
] as const;
