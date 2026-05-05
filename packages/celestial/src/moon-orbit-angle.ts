// Dev-console override for the moon's orbital position (radians around Y).
// When null (default) the moon tracks earth.rotation.y + UTC-derived offset.
// When set, the orbit angle is locked to the supplied value — useful for
// Playwright probes and screenshot verification.

let _override: number | null = null;
let _currentAngle = 0;

export function getMoonAngleOverride(): number | null {
  return _override;
}

export function setMoonAngleOverride(angle: number | null): void {
  _override = angle;
}

// Called from EarthScene useFrame on every frame to keep _currentAngle fresh.
export function updateMoonAngle(angle: number): void {
  _currentAngle = angle;
}

// Returns the moon's actual orbit.y angle as of the last rendered frame.
export function getMoonCurrentAngle(): number {
  return _currentAngle;
}
