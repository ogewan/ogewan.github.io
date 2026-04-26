import { useMemo } from 'react';
import { SCENE_ANCHORS } from '../scene-anchors.js';

// Phase 9.0 stub. A diffuse glowing sphere stands in for the future volumetric
// nebula. The variant decision logic from the placeholder ContactScene is
// preserved here (?neb=01..04 pin override, otherwise random per page load) so
// 9.4's real shader can read this same selection.

export type NebulaVariant = '01' | '02' | '03' | '04';

const VARIANT_TINTS: Record<NebulaVariant, string> = {
  '01': '#a85f4a', // Carina — warm
  '02': '#9a4f8a', // Lagoon — magenta
  '03': '#b08458', // Pillars — sandstone
  '04': '#5da3b8', // Veil — cyan
};

function pickVariant(): NebulaVariant {
  if (typeof window === 'undefined') return '01';
  const params = new URLSearchParams(window.location.search);
  const pinned = params.get('neb');
  if (pinned && pinned in VARIANT_TINTS) return pinned as NebulaVariant;
  const keys = Object.keys(VARIANT_TINTS) as NebulaVariant[];
  const idx = Math.floor(Math.random() * keys.length);
  return keys[idx] ?? '01';
}

export function ContactScene() {
  const variant = useMemo(pickVariant, []);
  const [x, y, z] = SCENE_ANCHORS.contact.origin;
  return (
    <group position={[x, y, z]}>
      <mesh>
        <sphereGeometry args={[2.2, 24, 24]} />
        <meshBasicMaterial color={VARIANT_TINTS[variant]} transparent opacity={0.35} />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshBasicMaterial color="#ffd87a" />
      </mesh>
    </group>
  );
}
