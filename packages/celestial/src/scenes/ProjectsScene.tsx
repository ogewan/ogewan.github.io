// Projects scene placeholder — system-wide view: a ringed gas giant top-right,
// a distant moon, system-scale starfield (the Stars layer below already covers
// that). The planet is amber-leaning to break visual monotony from the cyan
// Earth/About scenes — same as the mockup tile and chat brief.
export function ProjectsScene() {
  return (
    <>
      {/* Gas giant — amber, top-right */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: '40vmin',
          height: '40vmin',
          right: '-6vmin',
          top: '8vmin',
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 35% 30%, oklch(0.62 0.08 80), oklch(0.25 0.05 60) 75%)',
          boxShadow:
            'inset -20px -20px 40px oklch(0 0 0 / 0.55), 0 0 80px oklch(0.55 0.10 70 / 0.25)',
          transform: 'rotate(-12deg)',
        }}
      />
      {/* Ring — tilted ellipse around the gas giant */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: '70vmin',
          height: '6vmin',
          right: '-21vmin',
          top: 'calc(8vmin + 18vmin)',
          borderRadius: '50%',
          border: '1px solid oklch(0.7 0.05 80 / 0.5)',
          boxShadow:
            'inset 0 0 0 1px oklch(0.5 0.05 80 / 0.2), 0 0 30px oklch(0.55 0.08 70 / 0.18)',
          transform: 'rotate(-18deg)',
        }}
      />
      {/* Distant moon — small, mid-left */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: '3vmin',
          height: '3vmin',
          left: '15vmin',
          top: '60vmin',
          borderRadius: '50%',
          background: 'oklch(0.72 0.02 280)',
          boxShadow: '0 0 10px oklch(0.80 0.02 280 / 0.45)',
        }}
      />
    </>
  );
}
