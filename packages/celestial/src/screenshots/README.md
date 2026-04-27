# Scene screenshots

Source images for the **`static`** quality mode. The CelestialBackdrop's
`StaticBackdrop` component cross-fades between these per-scene PNGs as the
route changes — no R3F runtime, just a single `<img>` swap.

## Filenames are the contract

```
earth.png     ← /:locale/
about.png     ← /:locale/about
projects.png  ← /:locale/projects (and project detail/redirect)
contact.png   ← /:locale/contact
colophon.png  ← /:locale/colophon
```

Replacing the file content swaps the static-mode image automatically; no
code edits needed.

## Capturing

```
pnpm dev          # in one terminal
pnpm capture:scenes
```

`scripts/capture-scenes.mjs` boots a headless Chromium, forces
`portfolio:quality = 'quality'` so the R3F canvas renders, navigates to each
of the five scene routes, hides the page chrome (header / rail / content),
waits for the camera fly-through to settle, and saves a 1920×1080 PNG.

Re-run after each of phases 9.2–9.5 lands real scene geometry. The
filenames stay the same; the StaticBackdrop picks up the new content.

## Why PNG, not WebP

Playwright's screenshot API supports `png | jpeg` only. Adding a WebP
encoder (sharp / @squoosh/lib) would be 30+ MB of dependencies for five
mostly-black 1920×1080 captures. PNGs at this content compress to ~80 KB
each (~400 KB total committed) — same ballpark as WebP would have been.

## Placeholders

Phase 9.0/9.1 commits 67-byte 1×1 transparent PNG stubs so the Vite asset
graph resolves before the first real capture lands. Static mode will look
identical to Simple mode until you run `pnpm capture:scenes`. The toggle UI
still ships with all three options.
