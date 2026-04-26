import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import maplibregl, { type LngLatLike, type Map as MaplibreMap } from 'maplibre-gl';
import { GlassPanel, Text, focusRingClassName } from '@portfolio/ui';
import { useVisitorLocation } from '../useVisitorLocation';
import 'maplibre-gl/dist/maplibre-gl.css';

// Lazy-loaded MapLibre map for /contact. Two markers:
// - Ground station: Mountain View (fixed)
// - Visitor: pulled from useVisitorLocation when resolved
//
// Uses MapTiler's dataviz-dark style to match the dark glass aesthetic. Default
// attribution + zoom controls are hidden; we render glass-styled +/− buttons
// in React on top of the canvas. Reduced motion swaps easeTo for jumpTo.
//
// When VITE_MAPTILER_KEY is not set the component renders a hint card instead
// of attempting to fetch the style (which would 401 and log noise). This lets
// the rest of the page work without the env var configured.

const GROUND_STATION: LngLatLike = [-122.084, 37.3861];

export default function ContactMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MaplibreMap | null>(null);
  const visitor = useVisitorLocation();
  const { t } = useTranslation(['contact']);
  const apiKey = import.meta.env.VITE_MAPTILER_KEY as string | undefined;

  useEffect(() => {
    if (!apiKey) return;
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: `https://api.maptiler.com/maps/dataviz-dark/style.json?key=${apiKey}`,
      center: GROUND_STATION,
      zoom: 4,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
      touchPitch: false,
    });
    mapRef.current = map;

    // Custom amber marker for the ground station — small disc with bloom.
    const stationEl = document.createElement('button');
    stationEl.type = 'button';
    stationEl.setAttribute('aria-label', t('sections.map.stationMarker'));
    stationEl.tabIndex = 0;
    stationEl.style.cssText =
      'width:10px;height:10px;border-radius:50%;background:var(--color-amber);' +
      'box-shadow:0 0 12px var(--color-amber-bloom);border:none;cursor:pointer;padding:0;';
    new maplibregl.Marker({ element: stationEl }).setLngLat(GROUND_STATION).addTo(map);

    return () => {
      mapRef.current = null;
      map.remove();
    };
  }, [apiKey, t]);

  // Add or update the visitor marker as the visitor location resolves.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || visitor.state !== 'resolved') return;
    const visitorEl = document.createElement('button');
    visitorEl.type = 'button';
    visitorEl.setAttribute('aria-label', t('sections.map.youMarker'));
    visitorEl.tabIndex = 0;
    visitorEl.style.cssText =
      'width:10px;height:10px;border-radius:50%;background:var(--color-cyan);' +
      'box-shadow:0 0 12px var(--color-cyan-bloom);border:none;cursor:pointer;padding:0;';
    const marker = new maplibregl.Marker({ element: visitorEl })
      .setLngLat([visitor.location.lng, visitor.location.lat])
      .addTo(map);

    // Fit camera to include both markers. easeTo for the smooth transition;
    // jumpTo when reduced-motion is preferred.
    const bounds = new maplibregl.LngLatBounds();
    bounds.extend(GROUND_STATION);
    bounds.extend([visitor.location.lng, visitor.location.lat]);
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const target = { padding: 60, maxZoom: 6 };
    if (reduced) {
      const camera = map.cameraForBounds(bounds, target);
      if (camera) map.jumpTo(camera);
    } else {
      map.fitBounds(bounds, { ...target, duration: 1200 });
    }

    return () => {
      marker.remove();
    };
  }, [visitor, t]);

  if (!apiKey) {
    return (
      <GlassPanel variant="inset" className="p-6 min-h-[280px] flex items-center justify-center">
        <Text variant="small" className="text-fg-muted text-center max-w-md">
          {t('sections.map.missingKey')}
        </Text>
      </GlassPanel>
    );
  }

  const zoom = (delta: 1 | -1) => {
    const map = mapRef.current;
    if (!map) return;
    if (delta > 0) map.zoomIn();
    else map.zoomOut();
  };

  return (
    <div className="relative rounded-md border border-glass-hairline-inner overflow-hidden bg-glass-inset">
      <div
        ref={containerRef}
        role="img"
        aria-label={t('sections.map.ariaMap')}
        className="w-full h-[420px]"
      />
      <div className="absolute top-3 right-3 flex flex-col gap-2 pointer-events-auto">
        <button
          type="button"
          aria-label={t('sections.map.zoomIn')}
          onClick={() => zoom(1)}
          className={`w-9 h-9 rounded-sm bg-glass-elev backdrop-blur-md border border-glass-hairline-inner text-fg-primary hover:text-cyan font-mono text-small ${focusRingClassName}`}
        >
          +
        </button>
        <button
          type="button"
          aria-label={t('sections.map.zoomOut')}
          onClick={() => zoom(-1)}
          className={`w-9 h-9 rounded-sm bg-glass-elev backdrop-blur-md border border-glass-hairline-inner text-fg-primary hover:text-cyan font-mono text-small ${focusRingClassName}`}
        >
          −
        </button>
      </div>
    </div>
  );
}
