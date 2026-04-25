import { forwardRef, type HTMLAttributes, type ElementType, type Ref } from 'react';
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
const VARIANT_CLASS: Record<TextVariant, string> = {
  lead: 'font-sans font-normal text-lead leading-[1.5] text-fg-secondary text-pretty',
  body: 'font-sans font-normal text-body leading-[1.6] text-fg-primary',
  small: 'font-sans font-normal text-small leading-[1.55] text-fg-secondary',
  label: 'font-mono font-medium text-label tracking-[0.14em] uppercase text-fg-muted',
  micro: 'font-mono font-medium text-micro tracking-[0.1em] uppercase text-fg-muted',
};

export const Text = forwardRef<HTMLElement, TextProps>(function Text(
  { variant = 'body', as, className, ...rest },
  ref,
) {
  const Tag = (as ?? 'p') as ElementType;
  return (
    <Tag
      ref={ref as Ref<HTMLElement>}
      className={cn(VARIANT_CLASS[variant], className)}
      {...rest}
    />
  );
});
