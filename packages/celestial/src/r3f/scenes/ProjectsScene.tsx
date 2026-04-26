import { SCENE_ANCHORS } from '../scene-anchors.js';

// Phase 9.0 stub. Amber-tinted sphere with a flat disc placeholder for the
// future ring system. Phase 9.3 swaps the body color shader for procedural
// gas-giant bands and the disc for a real RingGeometry with shadow casting.

export function ProjectsScene() {
  const [x, y, z] = SCENE_ANCHORS.projects.origin;
  return (
    <group position={[x, y, z]} rotation={[0.3, 0, -0.18]}>
      <mesh>
        <sphereGeometry args={[1.2, 32, 32]} />
        <meshStandardMaterial color="#b07a3e" roughness={0.85} metalness={0.05} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.7, 2.8, 64]} />
        <meshBasicMaterial color="#a08055" transparent opacity={0.45} side={2} />
      </mesh>
      <mesh position={[-3, -0.4, 1]}>
        <sphereGeometry args={[0.08, 12, 12]} />
        <meshStandardMaterial color="#bbb6c0" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}
