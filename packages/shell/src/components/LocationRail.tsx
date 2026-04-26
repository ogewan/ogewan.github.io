import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useCelestialFocus, type FocusTarget } from '@portfolio/celestial';
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
// The visitor dot uses the amber accent + a sonar-style `pulseRing` keyframe
// from theme.css; reduced motion freezes the ring at scale(1.6)/opacity(0.4).
//
// Keyboard: tab moves between nodes; Enter/Space activates; Up/Down arrow
// rotates focus within the rail.

const CANONICAL_CITIES: ReadonlyArray<{ key: string; label: string; lat: number; lng: number }> = [
  { key: 'houston', label: 'Houston', lat: 29.76, lng: -95.37 },
  { key: 'sf', label: 'San Francisco', lat: 37.77, lng: -122.42 },
  { key: 'nyc', label: 'New York', lat: 40.71, lng: -74.01 },
  { key: 'london', label: 'London', lat: 51.51, lng: -0.13 },
  { key: 'paris', label: 'Paris', lat: 48.86, lng: 2.35 },
  { key: 'frankfurt', label: 'Frankfurt', lat: 50.11, lng: 8.68 },
  { key: 'beijing', label: 'Beijing', lat: 39.9, lng: 116.4 },
  { key: 'tokyo', label: 'Tokyo', lat: 35.69, lng: 139.69 },
  { key: 'sydney', label: 'Sydney', lat: -33.87, lng: 151.21 },
];

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

  // Restore previous session selection if present.
  const [selectedKey, setSelectedKey] = useState<string>(() => {
    if (typeof sessionStorage === 'undefined') return 'auto';
    return sessionStorage.getItem(SESSION_KEY) ?? 'auto';
  });

  useEffect(() => {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(SESSION_KEY, selectedKey);
  }, [selectedKey]);

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
          const dotColor = isVisitor
            ? 'bg-amber'
            : isSelected && !isAuto
              ? 'bg-cyan'
              : 'bg-fg-muted';

          // Auto uses a different visual: short horizontal dash, not a dot.
          const dotShape = isAuto ? 'w-3 h-px bg-fg-muted' : `w-2 h-2 rounded-full ${dotColor}`;

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
                <span aria-hidden="true" className={dotShape} />
                {isVisitor ? (
                  <span
                    aria-hidden="true"
                    className="absolute left-1/2 top-1/2 w-[10px] h-[10px] rounded-full border border-amber -translate-x-1/2 -translate-y-1/2 motion-safe:animate-[pulseRing_2.4s_var(--ease-smooth)_infinite] motion-reduce:scale-[1.6] motion-reduce:opacity-40"
                  />
                ) : null}
              </button>
              {/* Hover/focus label */}
              <span
                className={`pointer-events-none absolute right-12 top-1/2 -translate-y-1/2 px-2 py-1 rounded-sm bg-glass-elev backdrop-blur-md border border-glass-hairline-inner font-mono text-micro tracking-[0.14em] uppercase whitespace-nowrap ${isVisitor ? 'text-amber' : 'text-fg-secondary'} opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [transition-property:opacity] [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease-smooth)]`}
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
