import { createElement, forwardRef, type HTMLAttributes, type ElementType } from 'react';
import { cn } from './cn.js';

export interface VisuallyHiddenProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
}

// VisuallyHidden — removes content from the visual flow while keeping it in the
// accessibility tree. The "sr-only" pattern: absolute-positioned 1×1 clip-path.
// Use for screen-reader-only text (nav landmarks, button labels on icon buttons,
// form field descriptions) and live-region announcements that don't need to show.
//
// Polymorphic via `as`. Renders through createElement (see Container.tsx).
const SR_ONLY =
  'absolute w-px h-px p-0 m-[-1px] overflow-hidden whitespace-nowrap [clip-path:inset(50%)] border-0';

export const VisuallyHidden = forwardRef<HTMLElement, VisuallyHiddenProps>(function VisuallyHidden(
  { as, className, ...rest },
  ref,
) {
  const Tag: ElementType = as ?? 'span';
  return createElement(Tag, { ref, className: cn(SR_ONLY, className), ...rest });
});
