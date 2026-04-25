// About scene placeholder — Earth retreating to the bottom-left, with a small
// moon top-right per the chat update. Roughly half the apparent size of the
// hero Earth so the page feels like the camera has pulled back.
export function AboutScene() {
  return (
    <>
      {/* Earth — smaller, bottom-left */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: '50vmin',
          height: '50vmin',
          left: '-10vmin',
          bottom: '-12vmin',
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 30% 30%, oklch(0.50 0.07 220), oklch(0.15 0.04 260) 70%)',
          boxShadow:
            'inset -25px -25px 50px oklch(0 0 0 / 0.6), 0 0 80px oklch(0.50 0.10 220 / 0.25)',
        }}
      />
      {/* Moon — small, top-right */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: '6vmin',
          height: '6vmin',
          right: '12vmin',
          top: '20vmin',
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 35% 35%, oklch(0.78 0.01 280), oklch(0.45 0.01 280) 75%)',
          boxShadow:
            'inset -3px -3px 6px oklch(0 0 0 / 0.55), 0 0 20px oklch(0.80 0.01 280 / 0.40)',
        }}
      />
    </>
  );
}
