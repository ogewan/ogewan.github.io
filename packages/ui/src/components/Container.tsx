import { forwardRef, type HTMLAttributes, type ElementType, type Ref } from 'react';
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
const WIDTH_CLASS: Record<ContainerWidth, string> = {
  reading: 'max-w-[880px] mx-auto px-6 md:px-10',
  wide: 'max-w-[1280px] mx-auto px-6 md:px-10',
  full: 'w-full',
};

export const Container = forwardRef<HTMLElement, ContainerProps>(function Container(
  { width = 'wide', as, className, ...rest },
  ref,
) {
  const Tag = (as ?? 'div') as ElementType;
  return (
    <Tag ref={ref as Ref<HTMLElement>} className={cn(WIDTH_CLASS[width], className)} {...rest} />
  );
});
