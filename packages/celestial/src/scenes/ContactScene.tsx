// Contact scene placeholder — nebula. The brief calls for 4 random nebula
// variants (Carina · Lagoon · Pillars · Veil) picked on load, with `?neb=01..04`
// as a pin override. Phase 9 swaps these for high-fidelity simulations of the
// real-world nebulae; placeholders here are coarse gradient + concentric
// signal rings keeping the "open channel" framing from the mockup contact page.

import { useMemo } from 'react';

export type NebulaVariant = '01' | '02' | '03' | '04';

const VARIANTS: Record<NebulaVariant, { name: string; cloud: string; star: string; ring: string }> =
  {
    '01': {
      name: 'Carina',
      cloud:
        'radial-gradient(ellipse 80vmin 50vmin at 30% 70%, oklch(0.42 0.14 30 / 0.35), transparent 70%), radial-gradient(ellipse 70vmin 60vmin at 70% 40%, oklch(0.30 0.10 290 / 0.30), transparent 65%)',
      star: 'oklch(0.85 0.12 75)',
      ring: 'oklch(0.84 0.12 210)',
    },
    '02': {
      name: 'Lagoon',
      cloud:
        'radial-gradient(ellipse 90vmin 60vmin at 25% 50%, oklch(0.35 0.13 0 / 0.40), transparent 70%), radial-gradient(ellipse 60vmin 50vmin at 75% 60%, oklch(0.28 0.06 250 / 0.32), transparent 65%)',
      star: 'oklch(0.85 0.12 75)',
      ring: 'oklch(0.84 0.12 210)',
    },
    '03': {
      name: 'Pillars',
      cloud:
        'radial-gradient(ellipse 70vmin 80vmin at 40% 50%, oklch(0.32 0.08 60 / 0.38), transparent 65%), radial-gradient(ellipse 50vmin 70vmin at 70% 30%, oklch(0.28 0.06 280 / 0.30), transparent 60%)',
      star: 'oklch(0.85 0.12 75)',
      ring: 'oklch(0.84 0.12 210)',
    },
    '04': {
      name: 'Veil',
      cloud:
        'radial-gradient(ellipse 100vmin 70vmin at 50% 50%, oklch(0.36 0.09 220 / 0.32), transparent 70%), radial-gradient(ellipse 60vmin 50vmin at 30% 30%, oklch(0.32 0.10 290 / 0.30), transparent 65%)',
      star: 'oklch(0.85 0.12 75)',
      ring: 'oklch(0.84 0.12 210)',
    },
  };

function pickVariant(): NebulaVariant {
  if (typeof window === 'undefined') return '01';
  const params = new URLSearchParams(window.location.search);
  const pinned = params.get('neb');
  if (pinned && pinned in VARIANTS) return pinned as NebulaVariant;
  const keys = Object.keys(VARIANTS) as NebulaVariant[];
  const index = Math.floor(Math.random() * keys.length);
  return keys[index] ?? '01';
}

export function ContactScene() {
  const variant = useMemo(pickVariant, []);
  const { cloud, star, ring } = VARIANTS[variant];

  return (
    <>
      {/* Nebula cloud */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none"
        style={{ background: cloud, filter: 'blur(20px)' }}
      />
      {/* Distant amber star — focal point */}
      <div
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          width: '4vmin',
          height: '4vmin',
          right: '15vmin',
          top: '15vmin',
          borderRadius: '50%',
          background: star,
          boxShadow: `0 0 30px ${star}, 0 0 80px oklch(0.83 0.13 75 / 0.45)`,
        }}
      />
      {/* Three concentric signal rings — slow pulse, RM-static via --dur-route */}
      {[10, 20, 30].map((radius) => (
        <div
          key={radius}
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            width: `${radius}vmin`,
            height: `${radius}vmin`,
            right: `calc(15vmin + 2vmin - ${radius / 2}vmin)`,
            top: `calc(15vmin + 2vmin - ${radius / 2}vmin)`,
            borderRadius: '50%',
            border: `1px solid ${ring}`,
            opacity: 0.5 - radius / 90,
          }}
        />
      ))}
    </>
  );
}
