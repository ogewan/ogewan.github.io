import { forwardRef, type HTMLAttributes, type ElementType, type Ref } from 'react';
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
const VARIANT_CLASS: Record<GlassVariant, string> = {
  chrome:
    'bg-glass-chrome [backdrop-filter:blur(16px)_saturate(150%)] [-webkit-backdrop-filter:blur(16px)_saturate(150%)] border border-glass-hairline-inner [box-shadow:var(--glass-hairline-box)] rounded-md',
  panel:
    'bg-glass-panel [backdrop-filter:blur(14px)_saturate(140%)] [-webkit-backdrop-filter:blur(14px)_saturate(140%)] border border-glass-hairline-inner [box-shadow:var(--glass-hairline-box)] rounded-md',
  inset:
    'bg-glass-inset [backdrop-filter:blur(10px)] [-webkit-backdrop-filter:blur(10px)] border border-glass-hairline-inner rounded-sm',
  elev: 'bg-glass-elev [backdrop-filter:blur(20px)_saturate(160%)] [-webkit-backdrop-filter:blur(20px)_saturate(160%)] border border-glass-hairline-inner [box-shadow:var(--glass-hairline-box-elev)] rounded-md',
};

export const GlassPanel = forwardRef<HTMLElement, GlassPanelProps>(function GlassPanel(
  { variant = 'panel', as, className, ...rest },
  ref,
) {
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag
      ref={ref as Ref<HTMLElement>}
      className={cn(VARIANT_CLASS[variant], className)}
      {...rest}
    />
  );
});
