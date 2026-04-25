import { useState } from 'react';
import {
  CelestialBackdrop,
  SCENE_ORDER,
  useCelestialFocus,
  type SceneName,
} from '@portfolio/celestial';
import { Button, Container, GlassPanel, Heading, Text } from '@portfolio/ui';

// Developer-only celestial state cycler. Bypasses pathname-derived scene
// selection by passing `sceneOverride` directly to <CelestialBackdrop />.
// Route: /:locale/_dev/celestial.

export function CelestialDebug() {
  const [scene, setScene] = useState<SceneName>('earth');
  const focus = useCelestialFocus();

  return (
    <>
      {/* Override the auto-mounted backdrop from App.tsx with our manual one.
          Both render at fixed z-0; the override paints over the App backdrop
          because it mounts deeper in the tree. */}
      <CelestialBackdrop sceneOverride={scene} />

      <Container as="main" className="py-24 min-h-screen">
        <Text variant="label" className="mb-4 inline-flex items-center gap-2">
          <span aria-hidden="true" className="inline-block h-px w-[6px] bg-cyan" />
          /_dev · Celestial state cycler
        </Text>

        <Heading level={1} variant="display">
          Scene <em className="not-italic text-fg-secondary">{scene}.</em>
        </Heading>

        <Text variant="lead" className="mt-6 max-w-[640px]">
          Manual overrides for the persistent backdrop. Route-derived scene selection is bypassed
          here; everywhere else in the app the scene follows pathname automatically.
        </Text>

        <GlassPanel className="mt-10 p-8">
          <Text variant="label" className="mb-4 block">
            Active scene
          </Text>
          <div className="flex flex-wrap gap-3">
            {SCENE_ORDER.map((name) => (
              <Button
                key={name}
                variant={scene === name ? 'primary' : 'secondary'}
                onClick={() => setScene(name)}
                aria-pressed={scene === name}
              >
                {name}
              </Button>
            ))}
          </div>

          <Text variant="label" className="mt-8 mb-4 block">
            Focus API (no-op in placeholders)
          </Text>
          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={() => focus.setFocus({ lat: 29.76, lng: -95.37, label: 'Houston' })}>
              setFocus(Houston)
            </Button>
            <Button onClick={() => focus.setFocus({ lat: 35.69, lng: 139.69, label: 'Tokyo' })}>
              setFocus(Tokyo)
            </Button>
            <Button onClick={focus.setAuto}>setAuto()</Button>
            <Text variant="micro" className="ml-2">
              mode={focus.mode} ·{' '}
              {focus.target
                ? `target=${focus.target.label ?? `${focus.target.lat}, ${focus.target.lng}`}`
                : 'target=null'}
            </Text>
          </div>
        </GlassPanel>

        <footer className="mt-20">
          <Text variant="micro">CELESTIAL · PHASE 3 PLACEHOLDERS · NO R3F YET</Text>
        </footer>
      </Container>
    </>
  );
}
