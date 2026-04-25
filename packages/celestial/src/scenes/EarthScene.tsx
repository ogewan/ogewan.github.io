// Earth scene placeholder — large blue sphere offset bottom-right of the
// viewport. Phase 9 replaces this with NASA Blue/Black Marble textures, an
// atmospheric rim shader, optional clouds, and a real-time terminator.
//
// The sphere is rendered as a CSS gradient + inset shadow (terminator hint
// from inset shadow) + outer glow (atmospheric bloom hint). Sized in vmin
// so it scales cleanly across viewports without media-query wrangling.
export function EarthScene() {
  return (
    <>
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: '90vmin',
          height: '90vmin',
          right: '-15vmin',
          bottom: '-25vmin',
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 30% 30%, oklch(0.60 0.10 220), oklch(0.20 0.05 260) 70%, oklch(0.10 0.04 270) 100%)',
          boxShadow:
            'inset -40px -40px 80px oklch(0 0 0 / 0.65), 0 0 120px oklch(0.55 0.12 220 / 0.30)',
        }}
      />
      {/* Atmospheric rim — thin highlight on the day side */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: '90vmin',
          height: '90vmin',
          right: '-15vmin',
          bottom: '-25vmin',
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 30% 30%, transparent 60%, oklch(0.75 0.15 220 / 0.18) 71%, transparent 73%)',
        }}
      />
    </>
  );
}
