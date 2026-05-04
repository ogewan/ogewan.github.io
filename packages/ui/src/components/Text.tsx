import { createElement, forwardRef, type HTMLAttributes, type ElementType } from 'react';
import { cn } from './cn.js';

export type TextVariant = 'lead' | 'body' | 'small' | 'label' | 'micro';

export interface TextProps extends HTMLAttributes<HTMLElement> {
  variant?: TextVariant;
  as?: ElementType;
}

// Text primitive — maps to the non-display portion of the type scale:
//   lead  — Inter Tight 400, 20/1.5, secondary color   → intro paragraphs
//   body  — Inter Tight 400, 16/1.6, primary color     → running prose (default)
//   small — Inter Tight 400, 14/1.55, secondary color  → captions, metadata
//   label — JetBrains Mono 500, 12, tracked 0.14em, uppercase, muted → "mono eyebrow"
//   micro — JetBrains Mono 500, 11, tracked 0.1em, uppercase, muted  → stamps, commit hashes
//
// The `as` prop controls the element (default <p>). Use `as="span"` for inline
// fragments, `as="dd"` for definition lists, etc.

// Canvas text-shadow: ensures legibility against the animated R3F backdrop.
// GlassPanel resets this for all its descendants via [&_*]:![text-shadow:none].
const TS =
  '[text-shadow:0_1px_4px_rgba(0,0,0,1),0_2px_16px_rgba(0,0,0,0.95),0_0_40px_rgba(0,0,0,0.8)]';

const VARIANT_CLASS: Record<TextVariant, string> = {
  lead: `font-sans font-normal text-lead leading-[1.5] text-fg-secondary text-pretty ${TS}`,
  body: `font-sans font-normal text-body leading-[1.6] text-fg-primary ${TS}`,
  small: `font-sans font-normal text-small leading-[1.55] text-fg-secondary ${TS}`,
  label: `font-mono font-medium text-label tracking-[0.14em] uppercase text-fg-muted ${TS}`,
  micro: `font-mono font-medium text-micro tracking-[0.1em] uppercase text-fg-muted ${TS}`,
};

// Polymorphic via `as`. Renders through createElement (see Container.tsx).
export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  { variant = 'body', as, className, ...rest },
  ref,
) {
  const Tag: ElementType = as ?? 'p';
  return createElement(Tag, { ref, className: cn(VARIANT_CLASS[variant], className), ...rest });
});
