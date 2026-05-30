# Cloud texture pool

Up to 9 equirectangular cloud maps, named `cloud-01.webp` … `cloud-09.webp`. At session start, [`pickCloudLayers`](../../cloud-layers.ts) picks a random subset (2 or 3 in normal quality; 1 in degraded) and renders each as its own transparent sphere co-radial at 1.005, drifting at 70–130% of the base cloud drift rate.

Activate at runtime via the dev console: `portfolio.earth.clouds.textureMode('nasa')`. Inspect the active pick: `portfolio.earth.clouds.layers()`.

## Sources

All assets are NASA public-domain imagery. `cloud-01` is the long-standing Blue Marble combined-cloud composite; `cloud-02` … `cloud-09` are eight monthly MODIS Cloud-Fraction snapshots from NASA Earth Observations (NEO) across the 2024 calendar to give visually distinct seasonal patterns.

| File            | Source                                                                                                                          | Suggested size |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `cloud-01.webp` | NASA Visible Earth — [Blue Marble combined cloud coverage](https://visibleearth.nasa.gov/images/57747)                          | 2048 × 1024    |
| `cloud-02.webp` | NASA NEO — [MODIS Terra Cloud Fraction, Jan 2024](https://neo.gsfc.nasa.gov/view.php?datasetId=MODAL2_M_CLD_FR&date=2024-01-01) | 3600 × 1800    |
| `cloud-03.webp` | NASA NEO — [MODIS Terra Cloud Fraction, Mar 2024](https://neo.gsfc.nasa.gov/view.php?datasetId=MODAL2_M_CLD_FR&date=2024-03-01) | 3600 × 1800    |
| `cloud-04.webp` | NASA NEO — [MODIS Terra Cloud Fraction, Apr 2024](https://neo.gsfc.nasa.gov/view.php?datasetId=MODAL2_M_CLD_FR&date=2024-04-01) | 3600 × 1800    |
| `cloud-05.webp` | NASA NEO — [MODIS Terra Cloud Fraction, Jun 2024](https://neo.gsfc.nasa.gov/view.php?datasetId=MODAL2_M_CLD_FR&date=2024-06-01) | 3600 × 1800    |
| `cloud-06.webp` | NASA NEO — [MODIS Terra Cloud Fraction, Aug 2024](https://neo.gsfc.nasa.gov/view.php?datasetId=MODAL2_M_CLD_FR&date=2024-08-01) | 3600 × 1800    |
| `cloud-07.webp` | NASA NEO — [MODIS Terra Cloud Fraction, Sep 2024](https://neo.gsfc.nasa.gov/view.php?datasetId=MODAL2_M_CLD_FR&date=2024-09-01) | 3600 × 1800    |
| `cloud-08.webp` | NASA NEO — [MODIS Terra Cloud Fraction, Nov 2024](https://neo.gsfc.nasa.gov/view.php?datasetId=MODAL2_M_CLD_FR&date=2024-11-01) | 3600 × 1800    |
| `cloud-09.webp` | NASA NEO — [MODIS Terra Cloud Fraction, Dec 2024](https://neo.gsfc.nasa.gov/view.php?datasetId=MODAL2_M_CLD_FR&date=2024-12-01) | 3600 × 1800    |

Each asset's per-file attribution lives next to it as `cloud-NN-credit.json` (same shape as `../earth-clouds-credit.json` and `../moon-credit.json`).

Convert from JPEG/PNG to WebP at quality 80: `cwebp -q 80 cloud-01.jpg -o cloud-01.webp`. All sources are equirectangular (lat/lng grid) projections — what the sphere geometry's UV unwrap expects. The shader reads alpha-channel cloud density when present and falls back to RGB-luminance otherwise; see [../../r3f/shaders/cloud.glsl.ts](../../r3f/shaders/cloud.glsl.ts).
