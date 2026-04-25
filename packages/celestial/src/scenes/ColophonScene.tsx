// Colophon scene placeholder — black hole. The mockup colophon.html composites
// a tilted accretion disk, photon ring, and gravitational-well darkening; we
// approximate that with stacked radial gradients. Phase 9 will replace this
// with a real raymarched / shader-based black hole that does proper spatial
// distortion and gravitational lensing of the starfield, with the accretion
// disk appearing intermittently per the user's brief.
export function ColophonScene() {
  return (
    <>
      {/* Outer warm halo — bleeds amber/violet into the page */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: '120vmin',
          height: '120vmin',
          right: '-30vmin',
          top: '50%',
          transform: 'translateY(-50%) rotate(-18deg)',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, oklch(0.40 0.14 60 / 0.20), transparent 35%, transparent 100%)',
          filter: 'blur(30px)',
        }}
      />
      {/* Accretion disk — edge-tilted ellipse, hot inner orange to cooler outer */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: '70vmin',
          height: '70vmin',
          right: '0',
          top: '50%',
          transform: 'translateY(-50%) rotate(-18deg) rotateX(74deg)',
          borderRadius: '50%',
          background:
            'radial-gradient(circle, transparent 28%, oklch(0.75 0.18 50 / 0.65) 32%, oklch(0.55 0.14 30 / 0.45) 42%, oklch(0.35 0.10 290 / 0.25) 60%, transparent 80%)',
        }}
      />
      {/* Photon ring — thin bright ring at the event horizon */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: '24vmin',
          height: '24vmin',
          right: '23vmin',
          top: '50%',
          transform: 'translateY(-50%) rotate(-18deg)',
          borderRadius: '50%',
          border: '1px solid oklch(0.80 0.10 50 / 0.7)',
          boxShadow:
            '0 0 20px oklch(0.85 0.15 60 / 0.45), inset 0 0 30px oklch(0.65 0.12 40 / 0.35)',
        }}
      />
      {/* Event horizon — pure black absorbing disk */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: '22vmin',
          height: '22vmin',
          right: '24vmin',
          top: '50%',
          transform: 'translateY(-50%) rotate(-18deg)',
          borderRadius: '50%',
          background: 'oklch(0 0 0)',
          boxShadow: '0 0 40px 4px oklch(0 0 0 / 0.8)',
        }}
      />
    </>
  );
}
