const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require });
  return exports;
}
const { sampleStoryRoute, prayerBeatWeight } = load('src/lib/storyTraversal.ts');
const { sweepWalkMovement, stepAutoWalkTowardTarget } = load('src/hooks/useWalkController.ts');
const bounds = { minX: -20, maxX: 20, minZ: -20, maxZ: 20 };
test('hand contact reaches a target under scaled and rotated character roots', () => {
  const THREE = require('three');
  const { createHandContactSolver } = load('src/lib/handContact.ts');
  const root = new THREE.Group(), arm = new THREE.Group(), forearm = new THREE.Group();
  root.position.set(1, 2, -3); root.rotation.y = 1.4; root.scale.setScalar(1.1);
  root.add(arm); arm.position.set(0.15, 1, 0); arm.add(forearm); forearm.position.y = -0.19;
  root.updateWorldMatrix(true, true);
  const target = root.localToWorld(new THREE.Vector3(0.2, 0.8, -0.2));
  const error = createHandContactSolver()(arm, forearm, target, 0.178, 1);
  assert(error < 0.00001);
  const unreachable = new THREE.Vector3(50, 50, 50);
  assert(Number.isFinite(createHandContactSolver()(arm, forearm, unreachable, 0.178, 1)));
});
test('camera boom stops before a wall while clear views keep their framing', () => {
  const { constrainCameraBoom } = load('src/lib/cameraClearance.ts');
  const eye = { x: 0, y: 3, z: 5 }, target = { x: 0, y: 1, z: 0 };
  constrainCameraBoom(eye, target, [{ kind: 'box', minX: -1, maxX: 1, minZ: 2, maxZ: 2.1 }]);
  assert(eye.z < 1.83 && eye.z > 1.6);
  const clearEye = { x: 3, y: 2, z: 5 };
  constrainCameraBoom(clearEye, target, []);
  assert.equal(clearEye.z, 5);
});
test('prayer leaves time to gather, bows, holds and returns upright', () => {
  assert.equal(prayerBeatWeight(0), 0);
  assert.equal(prayerBeatWeight(1.8), 0);
  assert.equal(prayerBeatWeight(3.5), 1);
  assert(prayerBeatWeight(5.6) > 0 && prayerBeatWeight(5.6) < 1);
  assert.equal(prayerBeatWeight(6.8), 0);
});
test('traversal maintains distance across bends and elevation, and settles at its end', () => {
  const route = [[0, 0, 0], [3, 0, 0], [3, 4, 0], [3, 4, -5]];
  const p = sampleStoryRoute(route, 5);
  assert.equal(p.x, 3); assert.equal(p.y, 2); assert.equal(p.arrived, false);
  const end = sampleStoryRoute(route, 100);
  assert.equal(end.z, -5); assert.equal(end.arrived, true);
  assert.equal(sampleStoryRoute([...route].reverse(), 12).x, 0);
});
test('swept walking cannot tunnel through thin walls or circular props', () => {
  for (const obstacle of [{ kind: 'box', minX: -1, maxX: 1, minZ: -0.03, maxZ: 0.03 }, { kind: 'circle', x: 0, z: 0, radius: 0.08 }]) {
    const state = { posX: 0, posZ: 4 };
    sweepWalkMovement(state, 0, -8, 0.28, bounds, [obstacle]);
    assert(state.posZ >= 0.3);
  }
});
test('blocked autopilot has zero stride, and movement slides along walls', () => {
  const wall = { kind: 'box', minX: -5, maxX: 5, minZ: -0.05, maxZ: 0.05 };
  const state = { posX: 0, posZ: 1, velX: 0, velZ: 0, facingYaw: 0, stridePhase: 0 };
  for (let i = 0; i < 40; i++) stepAutoWalkTowardTarget(state, 0, -3, 0.05, bounds, [wall]);
  const result = stepAutoWalkTowardTarget(state, 0, -3, 0.05, bounds, [wall]);
  assert(result.strideRatio < 0.001);
  sweepWalkMovement(state, 2, -2, 0.28, bounds, [wall]);
  assert(state.posX > 1.9); assert(state.posZ >= 0.32);
});
