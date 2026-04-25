# @portfolio/celestial

Persistent celestial scene package. Five scene states keyed to the shell's
route pathname:

| Pathname                                           | Scene      | Visual                                                                  |
| -------------------------------------------------- | ---------- | ----------------------------------------------------------------------- |
| `/` · `/:locale/`                                  | `earth`    | Earth offset bottom-right with atmospheric glow                         |
| `/:locale/about`                                   | `about`    | Earth retreating to bottom-left + small moon top-right                  |
| `/:locale/projects` (and detail/redirect children) | `projects` | Ringed gas giant top-right, distant moon                                |
| `/:locale/contact`                                 | `contact`  | Random nebula variant (Carina · Lagoon · Pillars · Veil) + signal rings |
| `/:locale/colophon`                                | `colophon` | Black hole — accretion disk + photon ring + event horizon               |

Crossfade between scenes is 1200ms (`--dur-route`) with the smooth easing
token; reduced-motion collapses to 1ms automatically because both come from
the design tokens.

## Phase 3 status — placeholders only

The scenes are rendered in pure CSS — gradient orbs, tilted ellipses, layered
radial gradients. No R3F, no Three.js, no shaders. The state machine
(pathname → scene), the focus context (`setFocus` / `setAuto` for the location
rail), and the `aria-hidden` full-viewport mounting are real and final.

The visual layer is intentionally swappable: a later phase replaces each
`*Scene.tsx` component with a real R3F implementation (NASA Blue/Black Marble
Earth with atmospheric rim and terminator, simulated nebulae of the named
real-world objects, raymarched gravitationally-lensed black hole with an
intermittent accretion disk) without touching the public API.

## Public API

```ts
import { CelestialBackdrop, CelestialFocusProvider, useCelestialFocus } from '@portfolio/celestial';

// In the shell, mounted once above the routes:
<CelestialFocusProvider>
  <CelestialBackdrop />
  <Routes>…</Routes>
</CelestialFocusProvider>;

// In the location rail (Phase 4):
const { setFocus, setAuto, mode, target } = useCelestialFocus();
setFocus({ lat: 29.76, lng: -95.37, label: 'Houston' });
```

`<CelestialBackdrop sceneOverride="..." />` is supported for the dev route
that cycles scenes manually.
