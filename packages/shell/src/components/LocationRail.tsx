import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CANONICAL_CITIES,
  findClosestCanonical,
  useCelestialFocus,
  type FocusTarget,
} from '@portfolio/celestial';
import { focusRingClassName } from '@portfolio/ui';
import { useVisitorLocation } from './useVisitorLocation';

// Right-side vertical location rail. Visible on Home + About only.
// Order from the brief: visitor (auto-resolved, "YOU") + 9 canonical cities +
// "AUTO" terminator. If the visitor's nearest city matches one of the canonical
// cities, that canonical entry is omitted to avoid duplicate dots.
//
// Click any node → setFocus to its lat/lng. Click AUTO → setAuto(). Selection
// persists in sessionStorage across routes within the same session.
//
// Visual: small dots with hover-revealed labels (mono, cyan on hover/focus).
// Only the SELECTED node carries a sonar-style `pulseRing` keyframe ring.
// Pulse color is amber when the visitor entry is selected (preserves the
// "you-are-here" identity), cyan for any other selected node (cities, AUTO).
// All unselected dots — including the visitor — render grey.
//
// Keyboard: tab moves between nodes; Enter/Space activates; Up/Down arrow
// rotates focus within the rail.

const SESSION_KEY = 'portfolio:rail-selection';

// Lat/lng-equality with a small tolerance so the visitor's resolved city
// (e.g. "Greater Houston") collapses cleanly onto the canonical entry.
function nearlyEqual(a: number, b: number, eps = 0.5): boolean {
  return Math.abs(a - b) < eps;
}

function findCanonicalMatch(lat: number, lng: number): string | null {
  for (const city of CANONICAL_CITIES) {
    if (nearlyEqual(city.lat, lat) && nearlyEqual(city.lng, lng)) return city.key;
  }
  return null;
}

interface RailNode {
  key: string;
  label: string;
  type: 'visitor' | 'city' | 'auto';
  target: FocusTarget | null;
}

export function LocationRail() {
  const visitor = useVisitorLocation();
  const focus = useCelestialFocus();
  const { t } = useTranslation(['common']);

  // Restore previous session selection if present. Track separately whether
  // the user has manually chosen anything yet — if not, we'll auto-promote
  // the visitor's nearest canonical to selected once geolocation resolves.
  const [selectedKey, setSelectedKey] = useState<string>(() => {
    if (typeof sessionStorage === 'undefined') return 'auto';
    return sessionStorage.getItem(SESSION_KEY) ?? 'auto';
  });
  const userChoseRef = useRef<boolean>(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem(SESSION_KEY) !== null,
  );

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(SESSION_KEY, selectedKey);
  }, [selectedKey]);

  // One-shot auto-promotion: once visitor location resolves, if the user
  // hasn't manually selected anything, set selection (and Earth focus) to
  // the closest canonical city. Honors both the precise lat/lng of a tz
  // match and the precise lat/lng of a non-confident geolocation result.
  const autoPromotedRef = useRef(false);
  useEffect(() => {
    if (autoPromotedRef.current || userChoseRef.current) return;
    if (visitor.state !== 'resolved') return;
    const closest = findClosestCanonical(visitor.location.lat, visitor.location.lng);
    autoPromotedRef.current = true;
    setSelectedKey(closest.key);
    focus.setFocus({ lat: closest.lat, lng: closest.lng, label: closest.label });
  }, [visitor, focus]);

  // Build the rail node list each render — cheap, and visitor state can flip
  // while the user is on the page.
  const nodes: RailNode[] = [];
  let visitorMatchKey: string | null = null;

  if (visitor.state === 'resolved') {
    visitorMatchKey = findCanonicalMatch(visitor.location.lat, visitor.location.lng);
    nodes.push({
      key: 'visitor',
      label: visitor.location.city,
      type: 'visitor',
      target: {
        lat: visitor.location.lat,
        lng: visitor.location.lng,
        label: visitor.location.city,
      },
    });
  }

  for (const city of CANONICAL_CITIES) {
    if (city.key === visitorMatchKey) continue;
    nodes.push({
      key: city.key,
      label: city.label,
      type: 'city',
      target: { lat: city.lat, lng: city.lng, label: city.label },
    });
  }

  nodes.push({ key: 'auto', label: t('rail.auto'), type: 'auto', target: null });

  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleSelect = (node: RailNode) => {
    userChoseRef.current = true;
    setSelectedKey(node.key);
    if (node.type === 'auto') {
      focus.setAuto();
    } else if (node.target) {
      focus.setFocus(node.target);
    }
  };

  const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      const dir = e.key === 'ArrowDown' ? 1 : -1;
      const next = (index + dir + nodes.length) % nodes.length;
      buttonRefs.current[next]?.focus();
    }
  };

  return (
    <aside
      aria-label={t('rail.ariaList')}
      className="hidden md:flex fixed right-6 top-1/2 -translate-y-1/2 z-40 flex-col items-center gap-3"
    >
      <ul className="flex flex-col items-center gap-3">
        {nodes.map((node, i) => {
          const isSelected = selectedKey === node.key;
          const isAuto = node.type === 'auto';
          const isVisitor = node.type === 'visitor';
          const dotColor = isSelected ? (isVisitor ? 'bg-amber' : 'bg-cyan') : 'bg-fg-muted';
          const pulseColor = isVisitor ? 'border-amber' : 'border-cyan';
          const labelColor = isVisitor && isSelected ? 'text-amber' : 'text-fg-secondary';

          return (
            <li key={node.key} className="relative group">
              <button
                ref={(el) => {
                  buttonRefs.current[i] = el;
                }}
                type="button"
                aria-pressed={isSelected}
                aria-label={
                  isAuto ? t('rail.ariaAuto') : t('rail.ariaFocus', { label: node.label })
                }
                onClick={() => handleSelect(node)}
                onKeyDown={(e) => handleKey(e, i)}
                className={`flex items-center justify-center w-11 h-11 rounded-full ${focusRingClassName} cursor-pointer`}
              >
                <span aria-hidden="true" className={`w-2 h-2 rounded-full ${dotColor}`} />
                {isSelected ? (
                  // Pulse runs in all quality modes. We deliberately do NOT
                  // gate on `motion-safe:` so OS prefers-reduced-motion can't
                  // silently disable the rail's primary visual cue. Users who
                  // want still visuals pick `simple` from the celestial
                  // quality toggle, which is a deliberate site-level choice.
                  <span
                    aria-hidden="true"
                    className={`absolute left-1/2 top-1/2 w-[10px] h-[10px] rounded-full border ${pulseColor} -translate-x-1/2 -translate-y-1/2 animate-[pulseRing_2.4s_var(--ease-smooth)_infinite]`}
                  />
                ) : null}
              </button>
              {/* Hover/focus label */}
              <span
                className={`pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 px-2 py-1 rounded-sm bg-glass-elev backdrop-blur-md border border-glass-hairline-inner font-mono text-micro tracking-[0.14em] uppercase whitespace-nowrap ${labelColor} opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [transition-property:opacity] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)]`}
              >
                {isVisitor ? t('rail.youLabel', { city: node.label }) : node.label}
              </span>
            </li>
          );
        })}
      </ul>
      {visitor.state === 'failed' ? (
        <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-fg-muted writing-mode-vertical-rl mt-2">
          {t('rail.noGeo')}
        </span>
      ) : null}
    </aside>
  );
}
