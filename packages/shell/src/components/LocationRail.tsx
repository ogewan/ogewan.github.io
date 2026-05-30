import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { CANONICAL_CITIES, useCelestialFocus, type FocusTarget } from '@portfolio/celestial';
import { focusRingClassName } from '@portfolio/ui';
import { useVisitorLocation } from './useVisitorLocation';

// Right-side vertical location rail. Visible on Home + About only.
// Order from the brief: visitor (auto-resolved, "YOU") + 9 canonical cities +
// "AUTO" terminator. If the visitor's nearest city matches one of the canonical
// cities, that canonical entry is omitted to avoid duplicate dots.
//
// Click any node → setFocus to its lat/lng. Click AUTO → setAuto().
//
// Selection state lives in three mirrored surfaces:
//   1. The `?earthPos=` URL query param — shareable, the rail restamps it
//      after every navigation so React Router's path-only Links don't drop it.
//   2. `localStorage['portfolio:earth-pos']` — persists across sessions.
//   3. The rail's internal `selectedKey` state.
//
// URL value `local` corresponds to rail key `'visitor'`; all other values are
// 1:1. The pre-React inline script in index.html hydrates URL + localStorage
// before this component mounts, so the initial render already sees the right
// selection and the URL never visibly flips.
//
// Visual: small dots with hover-revealed labels (mono, cyan on hover/focus).
// Only the SELECTED node carries a sonar-style `pulseRing` keyframe ring.
// Pulse color is amber when the visitor entry is selected (preserves the
// "you-are-here" identity), cyan for any other selected node (cities, AUTO).
// All unselected dots — including the visitor — render grey.
//
// Keyboard: tab moves between nodes; Enter/Space activates; Up/Down arrow
// rotates focus within the rail.

const STORAGE_KEY = 'portfolio:earth-pos';
const URL_QUERY_KEY = 'earthPos';

// Source of truth for URL value validity. Mirror of the VALID_POS table in
// index.html — if you add a canonical city, update both.
const VALID_POS_VALUES: ReadonlySet<string> = new Set<string>([
  'local',
  'auto',
  ...CANONICAL_CITIES.map((c) => c.key),
]);

// URL says 'local'; rail says 'visitor'. Everything else is 1:1.
const railKeyFromUrlValue = (v: string): string => (v === 'local' ? 'visitor' : v);
const urlValueFromRailKey = (k: string): string => (k === 'visitor' ? 'local' : k);

function readInitialSelectedKey(): string {
  if (typeof window === 'undefined') return 'auto';
  try {
    const fromUrl = new URLSearchParams(window.location.search).get(URL_QUERY_KEY);
    if (fromUrl && VALID_POS_VALUES.has(fromUrl)) return railKeyFromUrlValue(fromUrl);
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored && VALID_POS_VALUES.has(stored)) return railKeyFromUrlValue(stored);
  } catch {
    // localStorage disabled, URL parse failure — fall through.
  }
  return 'auto';
}

// Single helper for the "stamp ?earthPos= into the current URL" pattern.
// Used by both the [selectedKey] effect and the [location.pathname] restamp
// effect, since React Router navigation drops query strings from new paths.
function stampUrl(railKey: string): void {
  if (typeof window === 'undefined') return;
  try {
    const urlVal = urlValueFromRailKey(railKey);
    const params = new URLSearchParams(window.location.search);
    if (params.get(URL_QUERY_KEY) === urlVal) return;
    params.set(URL_QUERY_KEY, urlVal);
    const qs = params.toString();
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`;
    window.history.replaceState(null, '', next);
  } catch {
    // best-effort
  }
}

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
  const location = useLocation();

  // Restore previous selection from URL > localStorage > 'auto'. Track
  // separately whether the user has manually chosen anything (i.e. anything
  // in storage) so we can auto-promote to 'visitor' on first geo-resolve
  // when nothing has been set.
  const [selectedKey, setSelectedKey] = useState<string>(readInitialSelectedKey);
  const userChoseRef = useRef<boolean>(
    typeof window !== 'undefined' &&
      (() => {
        try {
          return window.localStorage.getItem(STORAGE_KEY) !== null;
        } catch {
          return false;
        }
      })(),
  );

  // Persist + stamp URL on selection change. Storage convention mirrors the
  // inline script: 'local' is the default-once-geo-resolves, so we clear the
  // key when the value is 'local'; everything else (including explicit
  // 'auto') gets stored so a denied-geo visitor who picks AUTO doesn't get
  // promoted to 'local' on a subsequent visit that does grant geo.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const urlVal = urlValueFromRailKey(selectedKey);
    try {
      if (urlVal === 'local') window.localStorage.removeItem(STORAGE_KEY);
      else window.localStorage.setItem(STORAGE_KEY, urlVal);
    } catch {
      // best-effort persistence
    }
    stampUrl(selectedKey);
  }, [selectedKey]);

  // React Router navigation strips the query string from new paths. Re-stamp
  // earthPos after every location change so the URL stays in sync.
  useEffect(() => {
    stampUrl(selectedKey);
  }, [location.pathname, selectedKey]);

  // One-shot auto-promotion: once visitor resolves, if the user hasn't
  // manually selected anything and nothing was pre-set from URL/storage,
  // promote selection to the visitor's "You" pin (rail key 'visitor', URL
  // value 'local'). This implements the "?earthPos default = local when geo
  // allows" behaviour. Only promotes when current selection is still 'auto'
  // — otherwise an explicit ?earthPos=tokyo etc. would get overwritten on
  // first geo-resolve.
  const autoPromotedRef = useRef(false);
  useEffect(() => {
    if (autoPromotedRef.current || userChoseRef.current) return;
    if (visitor.state !== 'resolved') return;
    if (selectedKey !== 'auto') return;
    autoPromotedRef.current = true;
    setSelectedKey('visitor');
    focus.setFocus({
      lat: visitor.location.lat,
      lng: visitor.location.lng,
      label: visitor.location.city,
    });
  }, [visitor, focus, selectedKey]);

  // Silent fall to AUTO when geolocation is denied but selectedKey points
  // at the (now-absent) visitor node. Covers two cases:
  //   1. ?earthPos=local shared link opened by a visitor who denies geo.
  //   2. Stored 'visitor' from a prior session in which geo had resolved,
  //      now revoked in this session.
  useEffect(() => {
    if (visitor.state === 'failed' && selectedKey === 'visitor') {
      setSelectedKey('auto');
    }
  }, [visitor.state, selectedKey]);

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
