# Celestial textures

This directory holds 4k/2k webp captures of NASA's public-domain Earth imagery
(and similar references for the other scenes added in 9.2–9.5). Each scene
imports its textures via Vite asset imports, so Vite hashes and chunk-splits
them automatically — they only ship in the chunk for the scene that uses them.

## Replacing the placeholders

The committed `*.webp` files are 1×1 lossless stubs (~34 bytes each) so the
build works out of the box. The R3F shader samples them at every UV and renders
the sphere as a solid color until you drop in real imagery. **Filenames are the
contract; keep them stable when you replace the contents.**

### Earth (Phase 9.1)

| File                   | Source                                                                                         | Suggested size |
| ---------------------- | ---------------------------------------------------------------------------------------------- | -------------- |
| `earth-day-4k.webp`    | NASA Visible Earth — [Blue Marble](https://visibleearth.nasa.gov/images/57752) day-side image  | 4096 × 2048    |
| `earth-night-4k.webp`  | NASA Visible Earth — [Black Marble 2016](https://visibleearth.nasa.gov/images/144898) at night | 4096 × 2048    |
| `earth-clouds-2k.webp` | NASA Visible Earth — [Blue Marble clouds](https://visibleearth.nasa.gov/images/57747)          | 2048 × 1024    |

Convert from JPEG/TIFF to WebP at quality 80 with `cwebp -q 80 input.jpg -o earth-day-4k.webp`
(or your tool of choice). All three should be equirectangular (lat/lng grid)
projections — that's what the sphere geometry's UV unwrap expects.

### Other scenes (Phase 9.2+)

Future textures (moon, gas giant rings, nebula references) drop in as those
phases land.

## Why webp

Smaller than JPEG at equivalent quality (~30% reduction), supports both lossy
and lossless modes, transparency for the cloud layer alpha. Browser support is
universal in 2025+.

## Why self-host

Avoids a runtime CDN dependency. The trade-off is ~5 MB committed to the repo
once real Earth textures replace the stubs; that's an acceptable cost for the
deterministic-build, no-third-party-failure-modes guarantee.
