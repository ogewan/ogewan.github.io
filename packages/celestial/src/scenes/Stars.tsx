// Shared starfield layer rendered behind every scene. Six radial-gradient dots
// at fixed coordinates — same composition as the mockup .backdrop::before. Sits
// at the back of the scene stack so each scene's decorations layer on top.
export function Stars() {
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: [
          'radial-gradient(1px 1px at 10% 20%, oklch(0.95 0.02 280 / 0.8), transparent)',
          'radial-gradient(1px 1px at 80% 30%, oklch(0.88 0.04 210 / 0.6), transparent)',
          'radial-gradient(1.5px 1.5px at 45% 70%, oklch(0.92 0.03 290 / 0.7), transparent)',
          'radial-gradient(1px 1px at 25% 85%, oklch(0.85 0.04 200 / 0.5), transparent)',
          'radial-gradient(2px 2px at 70% 55%, oklch(0.96 0.02 280 / 0.9), transparent)',
          'radial-gradient(1px 1px at 90% 80%, oklch(0.80 0.05 290 / 0.5), transparent)',
        ].join(', '),
      }}
    />
  );
}
