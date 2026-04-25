import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { cn } from './cn.js';

export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  external?: boolean;
}

// Link primitive — cyan text, thin underline, bloom on hover, composite focus ring.
// Sets rel="noreferrer noopener" automatically for external links and appends a
// ↗ glyph so the affordance is legible without relying on color alone.
//
// For in-shell routing, wrap react-router's Link with this class set rather than
// using an <a>. The styling is the same; only the component differs.
const BASE =
  'text-cyan no-underline pb-0.5 border-b border-[color:oklch(0.84_0.12_210/0.3)] ' +
  'transition-[border-color,text-shadow] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] ' +
  'hover:border-b-cyan hover:[text-shadow:0_0_12px_var(--color-cyan-bloom)] ' +
  'focus-visible:outline-none focus-visible:[box-shadow:var(--focus-ring)] focus-visible:rounded-[2px]';

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { external, children, className, rel, target, ...rest },
  ref,
) {
  const isExternal = external ?? false;
  return (
    <a
      ref={ref}
      className={cn(BASE, className)}
      rel={isExternal ? (rel ?? 'noreferrer noopener') : rel}
      target={isExternal ? (target ?? '_blank') : target}
      {...rest}
    >
      {children}
      {isExternal ? <span aria-hidden="true"> ↗</span> : null}
    </a>
  );
});
