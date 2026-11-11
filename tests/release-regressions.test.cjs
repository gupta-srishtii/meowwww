const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Exercise the shipped TypeScript without generating build artifacts or adding a runner.
function loadSource(file, globals = {}) {
  const filename = path.resolve(__dirname, '..', file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const context = {
    exports: {}, performance, ...globals,
    require: (name) => name.startsWith('@/')
      ? loadSource(`src/${name.slice(2)}.ts`, globals) : require(name),
  };
  vm.runInNewContext(code, context, { filename });
  return context.exports;
}

function audioHarness() {
  const intervals = new Map();
  let nextId = 0;
  let play = (audio) => { audio.paused = false; return Promise.resolve(); };
  let calls = 0;
  class AudioMock {
    paused = true;
    src = '';
    volume = 0;
    addEventListener() {}
    removeAttribute() { this.src = ''; }
    load() {}
    pause() { this.paused = true; }
    play() { calls++; return play(this); }
  }
  const { ambientAudio: audio } = loadSource('src/lib/ambientAudio.ts', {
    window: {
      setInterval: (callback) => { intervals.set(++nextId, callback); return nextId; },
      clearInterval: (id) => intervals.delete(id),
    },
    Audio: AudioMock,
  });
  const parameter = () => ({ value: 0, setTargetAtTime(value) { this.value = value; } });
  audio.ctx = { state: 'running', currentTime: 0 };
  audio.initialized = true;
  for (const name of ['masterGain', 'musicGain', 'sfxGain', 'windGain', 'simmerGain']) {
    audio[name] = { gain: parameter() };
  }
  audio.windFilter = { frequency: parameter() };
  const state = (extra = {}) => audio.syncState({
    muted: false, paused: false, mode: 'bhai_dooj', musicVolume: 0.7, sfxVolume: 0.85, ...extra,
  });
  state();
  audio.syncFinaleMusicPhase('applying_tilak');
  return { audio, state, intervals, setPlay: (fn) => { play = fn; }, calls: () => calls };
}

const settle = () => new Promise(setImmediate);

test('existing v2 checkpoints remain valid; unlock rank is optional and bounded', () => {
  const { validateCheckpointData } = loadSource('src/lib/checkpoint.ts');
  const old = { version: 2, committedSceneId: 9, collectedPolaroids: ['scene09_stairs_landing'],
    stairStepCount: 200, audioMuted: false, guidedMode: false, timestamp: 1 };
  assert.equal(validateCheckpointData(old).stairStepCount, 200);
  assert.equal(validateCheckpointData({ ...old, furthestChapterRank: 17 }).furthestChapterRank, 17);
  for (const rank of [-1, 18, 1.5, null, '17']) {
    assert.equal(validateCheckpointData({ ...old, furthestChapterRank: rank }), null);
  }
});

test('local audio waits for unlock; no-track finale retains procedural music', () => {
  const h = audioHarness();
  assert.equal(h.audio.musicGain.gain.value, 0.7);
  assert.equal(h.audio.isCustomTrackOverriding(), false);
  h.audio.setFinaleTrackUrl('blob:synthetic');
  assert.equal(h.calls(), 0);
});

test('a rejected play promise restores procedural fallback', async () => {
  const h = audioHarness();
  h.setPlay(() => Promise.reject({ name: 'NotSupportedError' }));
  h.audio.setFinaleTrackUrl('blob:synthetic');
  h.audio.unlock();
  await settle();
  assert.equal(h.audio.customTrackFailed, true);
  assert.equal(h.audio.musicGain.gain.value, 0.7);
  assert.equal(h.audio.isCustomTrackOverriding(), false);
  assert.notEqual(h.audio.motifTimerId, null);
});

test('autoplay rejection falls back, then recovers on another user gesture', async () => {
  const h = audioHarness();
  h.setPlay(() => Promise.reject({ name: 'NotAllowedError' }));
  h.audio.setFinaleTrackUrl('blob:synthetic');
  h.audio.unlock();
  await settle();
  assert.equal(h.audio.customTrackBlocked, true);
  assert.equal(h.audio.musicGain.gain.value, 0.7);
  h.setPlay((audio) => { audio.paused = false; return Promise.resolve(); });
  h.audio.unlock();
  await settle();
  assert.equal(h.audio.isCustomTrackOverriding(), true);
  assert.equal(h.audio.musicGain.gain.value, 0);
});

test('late rejection from a replaced track cannot mute the replacement', async () => {
  const h = audioHarness();
  let rejectOld;
  h.setPlay(() => new Promise((_, reject) => { rejectOld = reject; }));
  h.audio.setFinaleTrackUrl('blob:old-synthetic');
  h.audio.unlock();
  h.setPlay((audio) => { audio.paused = false; return Promise.resolve(); });
  h.audio.setFinaleTrackUrl('blob:new-synthetic');
  await settle();
  rejectOld({ name: 'NotSupportedError' });
  await settle();
  assert.equal(h.audio.customTrackFailed, false);
  assert.equal(h.audio.isCustomTrackOverriding(), true);
});

test('zero Music & Ambience silences every ambience mode and preserves SFX volume', () => {
  const h = audioHarness();
  for (const mode of ['kitaabi', 'travel', 'road', 'viewpoint', 'dhaba', 'neelkanth',
    'baalkuwari_stairs', 'baalkuwari_temple', 'hotel_evening', 'bhai_dooj']) {
    h.state({ mode, musicVolume: 0 });
    assert.equal(h.audio.musicGain.gain.value, 0, mode);
    assert.equal(h.audio.windGain.gain.value, 0, mode);
    assert.equal(h.audio.simmerGain.gain.value, 0, mode);
    assert.equal(h.audio.sfxGain.gain.value, 0.85, mode);
  }
});

test('custom track pauses at silence and resumes without failing', async () => {
  const h = audioHarness();
  h.audio.setFinaleTrackUrl('blob:synthetic');
  h.audio.unlock();
  await settle();
  h.state({ paused: true });
  // Step only the custom-volume interval, not the procedural motif scheduler.
  h.intervals.get(h.audio.customRampTimerId)();
  assert.equal(h.audio.customAudioEl.volume, 0);
  assert.equal(h.audio.customAudioEl.paused, true);
  h.state();
  await settle();
  assert.equal(h.audio.customAudioEl.paused, false);
  assert.equal(h.audio.customTrackFailed, false);
});
