# @portfolio/celestial

R3F-based persistent celestial scene package. Five scene states (`earth_focus`, `earth_retreat`, `system_wide`, `nebula`, `event_horizon`) driven by the shell's route pathname. Earth uses NASA Blue Marble / Black Marble textures with a shader-generated atmospheric rim and an optional cloud layer.

Exports an imperative API — `setFocus({ lat, lng })`, `setAuto()`, and an observable of the current mode/target — consumed by the shell's right-side location rail. The canvas is `aria-hidden="true"`, fixed full-viewport, and sits behind shell content.

**Status**: Phase 0 placeholder. Full implementation in Phase 3.
