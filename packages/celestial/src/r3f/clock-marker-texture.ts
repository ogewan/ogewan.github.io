import * as THREE from 'three';

// Builds a CanvasTexture with a single piece of text drawn centered on a
// transparent background. Used by the projects-scene "clock markers"
// dev overlay (12/3/6/9 numerals positioned around the ring) so the
// user can visually verify ring rotation — the numerals advance around
// the ring perimeter at the orbital rate of their parent group.

const TEXTURE_SIZE = 256;

export function buildClockMarkerTexture(label: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to acquire 2D context for clock marker texture');

  ctx.clearRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  // Soft glow underlay so the numerals read against bright ring particles
  // and dark space alike.
  ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
  ctx.shadowBlur = 18;
  ctx.fillStyle = '#f7f3e2';
  ctx.font = 'bold 168px "JetBrains Mono", "Space Grotesk", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, TEXTURE_SIZE / 2, TEXTURE_SIZE / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}
