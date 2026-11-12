import * as THREE from 'three';

/** Reusable two-bone reach in the shoulder parent's coordinates, including root scale/yaw. */
export function createHandContactSolver() {
  const target = new THREE.Vector3(), direction = new THREE.Vector3(), bend = new THREE.Vector3();
  const elbow = new THREE.Vector3(), lowerDirection = new THREE.Vector3(), down = new THREE.Vector3(0, -1, 0);
  const upperRotation = new THREE.Quaternion(), lowerRotation = new THREE.Quaternion(), inverse = new THREE.Quaternion();
  return (arm: THREE.Group | null, forearm: THREE.Group | null, worldPoint: THREE.Vector3, lowerLength: number, weight: number): number => {
    if (!arm?.parent || !forearm || weight <= 0) return Infinity;
    arm.updateWorldMatrix(true, true);
    arm.parent.worldToLocal(target.copy(worldPoint)).sub(arm.position);
    const upperLength = forearm.position.length();
    const distance = THREE.MathUtils.clamp(target.length(), Math.abs(upperLength - lowerLength) + 0.001, upperLength + lowerLength - 0.001);
    direction.copy(target).normalize();
    bend.set(0, 0, -1).addScaledVector(direction, direction.z);
    if (bend.lengthSq() < 0.001) bend.set(1, 0, 0);
    bend.normalize();
    const along = (upperLength ** 2 - lowerLength ** 2 + distance ** 2) / (2 * distance);
    elbow.copy(direction).multiplyScalar(along).addScaledVector(bend, Math.sqrt(Math.max(0, upperLength ** 2 - along ** 2)));
    upperRotation.setFromUnitVectors(down, lowerDirection.copy(elbow).normalize());
    inverse.copy(upperRotation).invert();
    lowerDirection.copy(direction).multiplyScalar(distance).sub(elbow).normalize().applyQuaternion(inverse);
    lowerRotation.setFromUnitVectors(down, lowerDirection);
    arm.quaternion.slerp(upperRotation, THREE.MathUtils.clamp(weight, 0, 1));
    forearm.quaternion.slerp(lowerRotation, THREE.MathUtils.clamp(weight, 0, 1));
    forearm.updateWorldMatrix(true, false);
    forearm.localToWorld(target.set(0, -lowerLength, 0));
    return target.distanceTo(worldPoint);
  };
}
