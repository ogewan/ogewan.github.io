import { SCENE_ANCHORS } from '../scene-anchors.js';

// Phase 9.0 stub. A smaller Earth + tiny moon at the About anchor. Phase 9.2
// reuses Earth's shader and adds the tidally locked moon orbit.

export function AboutScene() {
  const [x, y, z] = SCENE_ANCHORS.about.origin;
  return (
    <group position={[x, y, z]}>
      <mesh>
        <sphereGeometry args={[0.6, 32, 32]} />
        <meshStandardMaterial color="#2d5d80" roughness={0.9} metalness={0.05} />
      </mesh>
      <mesh position={[1.4, 0.6, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#cccdd0" roughness={1} metalness={0} />
      </mesh>
    </group>
  );
}
