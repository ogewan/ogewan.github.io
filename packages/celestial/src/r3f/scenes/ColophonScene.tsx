import type { SceneName } from '../../scenes.js';
import { SCENE_ANCHORS } from '../scene-anchors.js';

// Phase 9.0 stub. A black disc with an offset amber halo stands in for the
// future raymarched black hole + lensing pass. Phase 9.5 replaces this with a
// fragment shader that distorts the starfield via geodesic approximation.
//
// Visibility gate: hidden when the active scene isn't 'colophon'. Same
// pattern EarthScene + ProjectsScene use — useFrame (none here yet) would
// keep firing if it existed, only GPU draws are skipped.

interface ColophonSceneProps {
  readonly scene: SceneName;
  readonly previousScene: SceneName | null;
}

export function ColophonScene({ scene, previousScene }: ColophonSceneProps) {
  const [x, y, z] = SCENE_ANCHORS.colophon.origin;
  const colophonSceneVisible = scene === 'colophon' || previousScene === 'colophon';
  return (
    <group position={[x, y, z]} rotation={[0, 0, -0.3]} visible={colophonSceneVisible}>
      {/* Event horizon — pure black */}
      <mesh>
        <sphereGeometry args={[1, 24, 24]} />
        <meshBasicMaterial color="#000000" />
      </mesh>
      {/* Photon ring — thin glowing torus */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[1.15, 0.02, 8, 64]} />
        <meshBasicMaterial color="#d6a565" />
      </mesh>
      {/* Halo placeholder for the future lensing pass */}
      <mesh>
        <sphereGeometry args={[1.6, 24, 24]} />
        <meshBasicMaterial color="#3a2a1a" transparent opacity={0.18} />
      </mesh>
    </group>
  );
}
