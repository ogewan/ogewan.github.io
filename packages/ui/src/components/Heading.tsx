import { createElement, forwardRef, type HTMLAttributes } from 'react';
import { cn } from './cn.js';

export type HeadingLevel = 1 | 2 | 3 | 4;
export type HeadingVariant = 'display' | 'h1' | 'h2' | 'h3' | 'h4';

export interface HeadingProps extends HTMLAttributes<HTMLHeadingElement> {
  level: HeadingLevel;
  variant?: HeadingVariant;
}

// Heading primitive — semantic level (h1–h4) and visual variant decoupled so a
// page can use <Heading level={1} variant="display" /> for the masthead without
// forcing every h1 to be 128px.
//
// Variants match tokens.html § 04:
//   display — Space Grotesk 300, clamp(56,9vw,128), LH 0.92, TR -0.04
//   h1      — Space Grotesk 400, clamp(40,5.2vw,72),  LH 1,    TR -0.03
//   h2      — Space Grotesk 400, clamp(30,3.4vw,48),  LH 1.05, TR -0.02
//   h3      — Space Grotesk 500, 28,                 LH 1.15, TR -0.015
//   h4      — Inter Tight 600,   22,                 LH 1.3,  TR -0.005
const VARIANT_CLASS: Record<HeadingVariant, string> = {
  display: 'font-display font-light text-display leading-[0.92] tracking-[-0.04em] text-balance',
  h1: 'font-display font-normal text-h1 leading-none tracking-[-0.03em] text-balance',
  h2: 'font-display font-normal text-h2 leading-[1.05] tracking-[-0.02em] text-balance',
  h3: 'font-display font-medium text-h3 leading-[1.15] tracking-[-0.015em]',
  h4: 'font-sans font-semibold text-h4 leading-[1.3] tracking-[-0.005em]',
};

const TAG_BY_LEVEL: Record<HeadingLevel, 'h1' | 'h2' | 'h3' | 'h4'> = {
  1: 'h1',
  2: 'h2',
  3: 'h3',
  4: 'h4',
};

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { level, variant, className, ...rest },
  ref,
) {
  const resolvedVariant: HeadingVariant = variant ?? (`h${level}` as HeadingVariant);
  return createElement(TAG_BY_LEVEL[level], {
    ref,
    className: cn(VARIANT_CLASS[resolvedVariant], 'text-fg-primary', className),
    ...rest,
  });
});
