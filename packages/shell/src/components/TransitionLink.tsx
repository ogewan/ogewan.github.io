import { Link, type LinkProps } from 'react-router';
import { forwardRef, type ReactNode } from 'react';
import { focusRingClassName } from '@portfolio/ui';

// react-router Link wrapper with two extras:
//   1. `viewTransition` opt-in by default — the same-document View Transitions
//      API runs the route swap inside startViewTransition() so we get a free
//      crossfade on supporting browsers.
//   2. `prefetch="intent"` — react-router prefetches the destination's loaders
//      and assets on hover/focus/touchstart, dropping latency on real clicks.
//
// `unstyled` opts out of the cyan link styling so wrappers like <Button>
// composed inside a TransitionLink don't get double-decorated.

export interface TransitionLinkProps extends LinkProps {
  unstyled?: boolean;
  children?: ReactNode;
}

const STYLED =
  'text-cyan no-underline pb-0.5 border-b border-[color:oklch(0.84_0.12_210/0.3)] ' +
  'transition-[border-color,text-shadow] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] ' +
  'hover:border-b-cyan hover:[text-shadow:0_0_12px_var(--color-cyan-bloom)] ' +
  'focus-visible:rounded-[2px]';

export const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(
  function TransitionLink({ unstyled, className, viewTransition, prefetch, ...rest }, ref) {
    const cls = unstyled ? className : `${STYLED} ${focusRingClassName} ${className ?? ''}`.trim();
    return (
      <Link
        ref={ref}
        viewTransition={viewTransition ?? true}
        prefetch={prefetch ?? 'intent'}
        className={cls}
        {...rest}
      />
    );
  },
);
