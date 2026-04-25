import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from './cn.js';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

// Button primitive:
//   primary   — cyan-outlined, cyan label; for top-level CTAs
//   secondary — glass panel, neutral label; default affordance
//   ghost     — transparent, label-only; for dense toolbars
//
// 44×44 minimum tap target per tokens.html § 10. Focus ring renders the composite
// shadow from --focus-ring (inner dark pad + cyan stroke + bloom). Reduced-motion
// automatically zeros the transition because --dur-fast collapses to 1ms in that
// media context.
const BASE =
  'inline-flex items-center justify-center gap-2 font-sans text-small font-medium ' +
  'min-h-11 px-[18px] py-2.5 rounded-sm outline-none cursor-pointer ' +
  'transition-all [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] ' +
  'border focus-visible:[box-shadow:var(--focus-ring)] ' +
  'disabled:opacity-50 disabled:cursor-not-allowed';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary:
    'bg-glass-panel text-cyan border-[color:oklch(0.84_0.12_210/0.4)] [box-shadow:inset_0_1px_0_var(--color-glass-hairline-top)] hover:border-[color:oklch(0.84_0.12_210/0.6)]',
  secondary:
    'bg-glass-panel text-fg-primary border-glass-hairline-inner [box-shadow:inset_0_1px_0_var(--color-glass-hairline-top)] hover:text-cyan hover:border-[color:oklch(0.84_0.12_210/0.6)]',
  ghost: 'bg-transparent text-fg-secondary border-transparent hover:text-cyan',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'secondary', className, type, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type ?? 'button'}
      className={cn(BASE, VARIANT_CLASS[variant], className)}
      {...rest}
    />
  );
});
