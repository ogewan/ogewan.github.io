import { useEffect } from 'react';
import { useLocation } from 'react-router';

// Per-route programmatic favicon. Each scene gets a 64x64 canvas icon that
// reflects its visual identity. Icons are lazily drawn and cached on first use,
// then reused on subsequent navigations.

type FaviconScene = 'earth' | 'about' | 'projects' | 'contact' | 'colophon';

function sceneFromPath(pathname: string): FaviconScene {
  // Strip locale prefix (/en/, /es/, etc.) and read the first segment.
  const slug = pathname.replace(/^\/[a-z]{2}\/?/, '').split('/')[0] ?? '';
  if (slug === 'about') return 'about';
  if (slug === 'projects') return 'projects';
  if (slug === 'contact') return 'contact';
  if (slug === 'colophon') return 'colophon';
  return 'earth';
}

function drawEarth(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  const ocean = ctx.createRadialGradient(cx - r * 0.28, cy - r * 0.35, 0, cx, cy, r);
  ocean.addColorStop(0, '#2a8ab8');
  ocean.addColorStop(0.6, '#1a4f6b');
  ocean.addColorStop(1, '#0c1f30');
  ctx.fillStyle = ocean;
  ctx.fillRect(cx - r - 2, cy - r - 2, r * 2 + 4, r * 2 + 4);

  ctx.fillStyle = '#3a7a30';
  ctx.save();
  ctx.translate(cx + r * 0.15, cy - r * 0.24);
  ctx.rotate(-0.2);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.36, r * 0.24, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(cx - r * 0.26, cy + r * 0.17);
  ctx.rotate(0.3);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.24, r * 0.32, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();

  // Atmosphere rim
  const atmo = ctx.createRadialGradient(cx, cy, r * 0.85, cx, cy, r * 1.12);
  atmo.addColorStop(0, 'rgba(80,180,255,0)');
  atmo.addColorStop(1, 'rgba(80,180,255,0.4)');
  ctx.fillStyle = atmo;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 1.12, 0, Math.PI * 2);
  ctx.fill();
}

function drawScene(ctx: CanvasRenderingContext2D, scene: FaviconScene, s: number): void {
  const cx = s / 2;
  const cy = s / 2;

  switch (scene) {
    case 'earth': {
      ctx.fillStyle = '#050d1a';
      ctx.fillRect(0, 0, s, s);
      drawEarth(ctx, cx, cy, s * 0.44);
      break;
    }

    case 'about': {
      ctx.fillStyle = '#050d1a';
      ctx.fillRect(0, 0, s, s);

      // Earth lower-left
      drawEarth(ctx, s * 0.34, s * 0.6, s * 0.3);

      // Moon upper-right
      const mCx = s * 0.73;
      const mCy = s * 0.3;
      const mR = s * 0.17;

      ctx.save();
      ctx.beginPath();
      ctx.arc(mCx, mCy, mR, 0, Math.PI * 2);
      ctx.clip();
      const moonGrad = ctx.createRadialGradient(mCx - mR * 0.3, mCy - mR * 0.3, 0, mCx, mCy, mR);
      moonGrad.addColorStop(0, '#d0d0d0');
      moonGrad.addColorStop(0.7, '#909090');
      moonGrad.addColorStop(1, '#505050');
      ctx.fillStyle = moonGrad;
      ctx.fillRect(0, 0, s, s);
      ctx.restore();

      // Crescent shadow
      ctx.fillStyle = '#050d1a';
      ctx.beginPath();
      ctx.arc(mCx + mR * 0.45, mCy - mR * 0.1, mR * 0.82, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'projects': {
      ctx.fillStyle = '#07040e';
      ctx.fillRect(0, 0, s, s);

      const rCy = cy + s * 0.06;
      const rA = s * 0.42;
      const rB = s * 0.12;
      const pR = s * 0.23;

      // Ring back arc (top half, behind planet)
      ctx.strokeStyle = 'rgba(200,150,40,0.38)';
      ctx.lineWidth = s * 0.055;
      ctx.beginPath();
      ctx.ellipse(cx, rCy, rA, rB, 0, Math.PI, Math.PI * 2);
      ctx.stroke();

      // Planet
      ctx.save();
      ctx.beginPath();
      ctx.arc(cx, cy, pR, 0, Math.PI * 2);
      ctx.clip();
      const planet = ctx.createRadialGradient(cx - pR * 0.35, cy - pR * 0.4, 0, cx, cy, pR);
      planet.addColorStop(0, '#e8a84a');
      planet.addColorStop(0.55, '#c06020');
      planet.addColorStop(1, '#501808');
      ctx.fillStyle = planet;
      ctx.fillRect(0, 0, s, s);
      ctx.restore();

      // Ring front arc (bottom half, over planet)
      ctx.strokeStyle = 'rgba(220,170,60,0.88)';
      ctx.lineWidth = s * 0.055;
      ctx.beginPath();
      ctx.ellipse(cx, rCy, rA, rB, 0, 0, Math.PI);
      ctx.stroke();
      break;
    }

    case 'contact': {
      ctx.fillStyle = '#060418';
      ctx.fillRect(0, 0, s, s);

      // Violet core
      const neb1 = ctx.createRadialGradient(
        cx - s * 0.12,
        cy - s * 0.06,
        0,
        cx - s * 0.12,
        cy - s * 0.06,
        s * 0.46,
      );
      neb1.addColorStop(0, 'rgba(160,50,240,0.92)');
      neb1.addColorStop(0.38, 'rgba(80,20,160,0.52)');
      neb1.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = neb1;
      ctx.fillRect(0, 0, s, s);

      // Teal bloom
      const neb2 = ctx.createRadialGradient(
        cx + s * 0.16,
        cy + s * 0.09,
        0,
        cx + s * 0.16,
        cy + s * 0.09,
        s * 0.36,
      );
      neb2.addColorStop(0, 'rgba(20,220,210,0.82)');
      neb2.addColorStop(0.4, 'rgba(10,100,160,0.38)');
      neb2.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = neb2;
      ctx.fillRect(0, 0, s, s);

      // Rose accent
      const neb3 = ctx.createRadialGradient(
        cx - s * 0.22,
        cy + s * 0.18,
        0,
        cx - s * 0.22,
        cy + s * 0.18,
        s * 0.28,
      );
      neb3.addColorStop(0, 'rgba(230,60,150,0.62)');
      neb3.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = neb3;
      ctx.fillRect(0, 0, s, s);

      // Bright star
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.beginPath();
      ctx.arc(cx - s * 0.06, cy - s * 0.09, 1.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    }

    case 'colophon': {
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, s, s);

      const disk = ctx.createRadialGradient(cx, cy, s * 0.18, cx, cy, s * 0.5);
      disk.addColorStop(0, 'rgba(255,200,80,0)');
      disk.addColorStop(0.22, 'rgba(255,180,60,0.88)');
      disk.addColorStop(0.42, 'rgba(255,100,20,0.6)');
      disk.addColorStop(0.68, 'rgba(160,30,5,0.25)');
      disk.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = disk;
      ctx.fillRect(0, 0, s, s);

      // Event horizon
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2);
      ctx.fill();

      // Photon ring
      ctx.strokeStyle = 'rgba(255,230,140,0.95)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.225, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
  }
}

function drawFavicon(scene: FaviconScene): string {
  const s = 64;
  const canvas = document.createElement('canvas');
  canvas.width = s;
  canvas.height = s;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  drawScene(ctx, scene, s);
  return canvas.toDataURL('image/png');
}

const _cache: Partial<Record<FaviconScene, string>> = {};

function applyFavicon(scene: FaviconScene): void {
  let url = _cache[scene];
  if (!url) {
    url = drawFavicon(scene);
    _cache[scene] = url;
  }

  let link = document.head.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }
  link.type = 'image/png';
  link.href = url;
}

export function useFavicon(): void {
  const location = useLocation();

  useEffect(() => {
    applyFavicon(sceneFromPath(location.pathname));
  }, [location.pathname]);
}
