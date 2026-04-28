import { useEffect, useState } from 'react';
import { flushSync } from 'react-dom';

// Mirror an external value into local React state via the View Transitions
// API. When the external value changes, runs the React update inside
// document.startViewTransition(), so the browser captures before/after
// snapshots and crossfades them per the rules in theme.css's
// ::view-transition-{old,new}(...) blocks.
//
// Used by StaticBackdrop / SimpleBackdrop to make scene swaps smooth in the
// non-R3F quality modes. Quality (R3F) mode keeps its gsap camera fly-through
// — that's continuous motion, not a discrete swap, and doesn't apply.
//
// Feature-detected: when document.startViewTransition is missing (Firefox
// today doesn't support intra-document transitions), falls through to a
// plain setState. The result is a hard-cut swap, which is acceptable.
export function useViewTransitionState<T>(value: T): T {
  const [local, setLocal] = useState<T>(value);

  useEffect(() => {
    if (Object.is(local, value)) return;
    if (typeof document === 'undefined') return;
    type DocumentWithVT = Document & {
      startViewTransition?: (cb: () => void) => unknown;
    };
    const doc = document as DocumentWithVT;
    if (typeof doc.startViewTransition !== 'function') {
      setLocal(value);
      return;
    }
    doc.startViewTransition(() => {
      flushSync(() => setLocal(value));
    });
  }, [value, local]);

  return local;
}
