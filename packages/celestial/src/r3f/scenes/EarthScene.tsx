import { SCENE_ANCHORS } from '../scene-anchors.js';

// Phase 9.0 stub. A simple cyan-tinted sphere at the Earth anchor; the camera
// fly-through is verifiable without the real Blue/Black Marble shader work
// (that lands in Phase 9.1). Geometry density and shader complexity are all
// "placeholder cheap" so the foundation phase boots without surprises.

export function EarthScene() {
  const [x, y, z] = SCENE_ANCHORS.earth.origin;
  return (
    <group position={[x, y, z]}>
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial color="#3a78a3" roughness={0.9} metalness={0.05} />
      </mesh>
    </group>
  );
}
