import { createElement, forwardRef, type HTMLAttributes, type ElementType } from 'react';
import { cn } from './cn.js';

export type ContainerWidth = 'reading' | 'wide' | 'full';

export interface ContainerProps extends HTMLAttributes<HTMLElement> {
  width?: ContainerWidth;
  as?: ElementType;
}

// Container primitive — centered, max-width-bounded wrapper with consistent gutter.
//
//   reading — 880px (magazine measure for prose pages: project detail, about, colophon)
//   wide    — 1280px (default; hero, projects grid, shell chrome)
//   full    — no max; for full-bleed sections (celestial backdrop container, hero media)
//
// Polymorphic via `as`. Renders through createElement instead of JSX because
// once @react-three/fiber joined the dep graph (Phase 9), the JSX intrinsic
// intersection started inferring `ref`/`className` to `never` on ElementType
// targets. createElement bypasses that narrowing.
const WIDTH_CLASS: Record<ContainerWidth, string> = {
  reading: 'max-w-[880px] mx-auto px-6 md:px-10',
  wide: 'max-w-[1280px] mx-auto px-6 md:px-10',
  full: 'w-full',
};

export const Container = forwardRef<HTMLElement, ContainerProps>(function Container(
  { width = 'wide', as, className, ...rest },
  ref,
) {
  const Tag: ElementType = as ?? 'div';
  return createElement(Tag, { ref, className: cn(WIDTH_CLASS[width], className), ...rest });
});
