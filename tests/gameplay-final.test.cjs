const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const THREE = require('three');
function load(file) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, require: name => name.startsWith('@/') ? load('src/' + name.slice(2) + '.ts') : require(name) });
  return exports;
}
const motion = load('src/lib/drivingMotion.ts');
test('prayer formation settles without oscillation and turns every companion toward the deity', () => {
  const { createCompanionStates, stepGroupCompanions } = load('src/hooks/useCompanionFollower.ts');
  const agents = createCompanionStates([{ id: 'srishti', x: 0.05, z: 0.04, facingYaw: Math.PI }]);
  const configs = [{ id: 'srishti', followAngleOffset: 0, followDistance: 1, idlePose: 'default', gesturePhase: 0 }];
  for (let i = 0; i < 60; i++) stepGroupCompanions({ agents, configs, playerX: 2, playerZ: 2, playerFacingYaw: 0, playerSpeed: 0,
    bounds: { minX: -5, maxX: 5, minZ: -5, maxZ: 5 }, obstacles: [], delta: 0.05, mode: 'prayer',
    explicitTargets: { srishti: { x: 0, z: 0, facingYaw: 0 } } });
  assert.equal(agents[0].velX, 0); assert.equal(agents[0].velZ, 0);
  assert(Math.abs(agents[0].facingYaw) < 0.01);
});
test('speed gradually reaches the 75 km/h ceiling, brakes, coasts, and slows for hairpins and stops', () => {
  let speed = 0;
  for (let i = 0; i < 300; i++) {
    const next = motion.stepRideSpeed(speed, 1, 0, motion.MAX_RIDE_SPEED, 0.05);
    assert(next - speed <= 0.161); speed = next;
  }
  assert.equal(motion.indicatedKmh(speed), 75);
  assert.equal(motion.indicatedKmh(1000), 75);
  assert(motion.stepRideSpeed(speed, 0, 1, motion.MAX_RIDE_SPEED, 0.05) < speed);
  assert(motion.stepRideSpeed(speed, 0, 0, motion.MAX_RIDE_SPEED, 0.05) < speed);
  assert(motion.safeRideSpeed(0.1, 100) < motion.safeRideSpeed(0, 100));
  assert.equal(motion.safeRideSpeed(0, 0), 0);
  assert(motion.safeRideSpeed(0, 100, true) <= 8);
});
test('prayer overrides moving companions, joins hands, holds a visible bow and recovers', () => {
  const { animateCharacterRig } = load('src/components/canvas/characters/animateCharacterRig.ts');
  const { prayerBeatWeight } = load('src/lib/storyTraversal.ts');
  const refs = Object.fromEntries(['group', 'torso', 'head', 'leftArm', 'rightArm', 'rightForearm', 'leftLeg', 'rightLeg', 'leftKnee', 'rightKnee'].map(k => [k, new THREE.Group()]));
  refs.group.add(refs.torso); refs.torso.add(refs.head, refs.leftArm, refs.rightArm);
  refs.leftArm.position.set(-0.205, 0.44, 0); refs.rightArm.position.set(0.205, 0.44, 0);
  refs.rightArm.add(refs.rightForearm); refs.rightForearm.position.y = -0.19;
  const frame = time => animateCharacterRig({ refs, posX: 0, posZ: 0, facingYaw: 0, strideRatio: 0.7, stridePhase: time * 6,
    elapsed: time, delta: 1 / 60, idlePose: 'pray_bow', torsoBaseY: 0.82, prayerWeight: prayerBeatWeight(time) });
  for (let i = 0; i < 240; i++) frame(i / 60);
  assert(refs.torso.rotation.x < -0.65);
  refs.group.updateWorldMatrix(true, true);
  const leftPalm = refs.leftArm.localToWorld(new THREE.Vector3(0, -0.39, 0));
  const rightPalm = refs.rightForearm.localToWorld(new THREE.Vector3(0, -0.195, 0));
  assert(leftPalm.distanceTo(rightPalm) < 0.08);
  for (let i = 240; i < 450; i++) frame(i / 60);
  assert(Math.abs(refs.torso.rotation.x) < 0.02);
});
