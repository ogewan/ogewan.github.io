import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { focusRingClassName } from '@portfolio/ui';

// Small in-house popover/dropdown primitive used by QualitySwitcher and
// LocaleSwitcher in the header. Click-to-toggle, closes on outside-click,
// Escape, or option select. Arrow keys cycle through options; Enter/Space
// activates. Returns focus to the trigger on close.
//
// Two consumers only — not worth pulling Radix into the dep tree.

interface DropdownOption<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
}

interface DropdownProps<T extends string> {
  value: T;
  options: ReadonlyArray<DropdownOption<T>>;
  onChange: (value: T) => void;
  // Trigger button content (typically the current option's short label).
  triggerLabel: ReactNode;
  ariaLabel: string;
  triggerClassName?: string;
  menuClassName?: string;
}

export function Dropdown<T extends string>({
  value,
  options,
  onChange,
  triggerLabel,
  ariaLabel,
  triggerClassName = '',
  menuClassName = '',
}: DropdownProps<T>) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const menuId = useId();

  // Outside click + Escape close. Bound only while open.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t)) return;
      if (menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  // On open, focus the active option (or the first if none match).
  useEffect(() => {
    if (!open) return;
    const idx = options.findIndex((o) => o.value === value);
    const target = idx >= 0 ? idx : 0;
    requestAnimationFrame(() => {
      itemRefs.current[target]?.focus();
    });
  }, [open, options, value]);

  const select = (v: T) => {
    onChange(v);
    setOpen(false);
    triggerRef.current?.focus();
  };

  const handleTriggerKey = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      setOpen(true);
    }
  };

  const handleMenuKey = (e: React.KeyboardEvent<HTMLButtonElement>, i: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const next = (i + dir + options.length) % options.length;
      itemRefs.current[next]?.focus();
    } else if (e.key === 'Home') {
      e.preventDefault();
      itemRefs.current[0]?.focus();
    } else if (e.key === 'End') {
      e.preventDefault();
      itemRefs.current[options.length - 1]?.focus();
    } else if (e.key === 'Tab') {
      // Tabbing out closes; the browser's focus motion is preserved.
      setOpen(false);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label={ariaLabel}
        onClick={() => setOpen((v) => !v)}
        onKeyDown={handleTriggerKey}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>
      {open ? (
        <ul
          id={menuId}
          ref={menuRef}
          role="menu"
          aria-label={ariaLabel}
          className={
            'absolute right-0 top-full mt-1 min-w-full bg-glass-elev backdrop-blur-md ' +
            'border border-glass-hairline-inner rounded-sm py-1 z-50 flex flex-col ' +
            menuClassName
          }
        >
          {options.map((o, i) => {
            const active = o.value === value;
            return (
              <li key={o.value} role="none">
                <button
                  ref={(el) => {
                    itemRefs.current[i] = el;
                  }}
                  role="menuitem"
                  type="button"
                  aria-current={active ? 'true' : undefined}
                  title={o.title}
                  onClick={() => select(o.value)}
                  onKeyDown={(e) => handleMenuKey(e, i)}
                  className={
                    'w-full text-left px-3 py-1.5 font-mono text-micro tracking-[0.14em] uppercase whitespace-nowrap ' +
                    'transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)] ' +
                    (active ? 'text-cyan ' : 'text-fg-muted hover:text-fg-primary ') +
                    focusRingClassName
                  }
                >
                  {o.label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
