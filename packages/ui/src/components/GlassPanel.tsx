import { createElement, forwardRef, type HTMLAttributes, type ElementType } from 'react';
import { cn } from './cn.js';

export type GlassVariant = 'chrome' | 'panel' | 'inset' | 'elev';

export interface GlassPanelProps extends HTMLAttributes<HTMLElement> {
  variant?: GlassVariant;
  as?: ElementType;
}

// Glass primitive — backdrop-blur + hairlines + radius wired to the design tokens.
// Four variants, each sourced from tokens.html § 03:
//   chrome  — persistent UI (nav, rail); 16px blur / 150% saturate
//   panel   — default cards and content (default); 14px blur / 140% saturate
//   inset   — recessed fields / inputs; 10px blur / no specular
//   elev    — modals and popovers; 20px blur / 160% saturate / stronger top specular
//
// Usage:
//   <GlassPanel variant="chrome">…</GlassPanel>
//   <GlassPanel as="section" className="p-6">…</GlassPanel>
// Suppress canvas text-shadow for all descendants — text inside glass has its
// own backdrop so the multi-layer shadow would over-darken it.
const SUPPRESS = '[&_*]:![text-shadow:none]';

const VARIANT_CLASS: Record<GlassVariant, string> = {
  chrome: `bg-glass-chrome [backdrop-filter:blur(16px)_saturate(150%)] [-webkit-backdrop-filter:blur(16px)_saturate(150%)] border border-glass-hairline-inner [box-shadow:var(--glass-hairline-box)] rounded-md ${SUPPRESS}`,
  panel: `bg-glass-panel [backdrop-filter:blur(14px)_saturate(140%)] [-webkit-backdrop-filter:blur(14px)_saturate(140%)] border border-glass-hairline-inner [box-shadow:var(--glass-hairline-box)] rounded-md ${SUPPRESS}`,
  inset: `bg-glass-inset [backdrop-filter:blur(10px)] [-webkit-backdrop-filter:blur(10px)] border border-glass-hairline-inner rounded-sm ${SUPPRESS}`,
  elev: `bg-glass-elev [backdrop-filter:blur(20px)_saturate(160%)] [-webkit-backdrop-filter:blur(20px)_saturate(160%)] border border-glass-hairline-inner [box-shadow:var(--glass-hairline-box-elev)] rounded-md ${SUPPRESS}`,
};

// Polymorphic via `as`. Renders through createElement instead of JSX so the
// JSX intrinsic intersection narrowed by R3F's ThreeElements augmentation
// doesn't infer `ref`/`className` to `never`. See Container.tsx for the same
// reason.
export const GlassPanel = forwardRef<HTMLElement, GlassPanelProps>(function GlassPanel(
  { variant = 'panel', as, className, ...rest },
  ref,
) {
  const Tag: ElementType = as ?? 'div';
  return createElement(Tag, { ref, className: cn(VARIANT_CLASS[variant], className), ...rest });
});
