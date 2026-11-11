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

test('local temple audio gates on Shivling darshan trigger, waits for unlock, and falls back on error', async () => {
  const h = audioHarness();
  h.state({ mode: 'neelkanth', templeDarshanTriggered: false });
  h.audio.setTempleTrackUrl('blob:temple-track');
  assert.equal(h.calls(), 0);
  // Entering temple courtyard without reaching Shivling darshan keeps track silent
  assert.equal(h.audio.templeVolumeTarget, 0);
  assert.equal(h.audio.isTempleTrackOverriding(), false);

  h.setPlay(() => Promise.reject({ name: 'NotSupportedError' }));
  h.state({ mode: 'neelkanth', templeDarshanTriggered: true });
  h.audio.unlock();
  await settle();
  assert.equal(h.audio.templeTrackFailed, true);
  assert.equal(h.audio.musicGain.gain.value, 0.7);
  assert.equal(h.audio.isTempleTrackOverriding(), false);
  h.state({ mode: 'neelkanth', musicVolume: 0, templeDarshanTriggered: true });
  assert.equal(h.audio.musicGain.gain.value, 0);
  assert.equal(h.audio.templeVolumeTarget, 0);
});

test('to_baalkuwari executes two sharp right-hand turns on smooth road before offroad dirt bumps start', () => {
  const {
    createMountainRoadCurve,
    BAAL_KUWARI_OFFROAD_START_DIST,
    BAAL_KUWARI_STOP_DISTANCE,
    sampleRoadFrame,
    sampleOffroadTrackBump,
  } = loadSource('src/lib/mountainSpline.ts');
  const THREE = require('three');
  const curve = createMountainRoadCurve('to_baalkuwari');
  const totalLen = curve.getLength();

  const pt = new THREE.Vector3();
  const tan = new THREE.Vector3();
  const right = new THREE.Vector3();
  const up = new THREE.Vector3();

  // Sample heading change across [0..BAAL_KUWARI_OFFROAD_START_DIST]
  const headings = [];
  for (let d = 2; d <= BAAL_KUWARI_OFFROAD_START_DIST; d += 8) {
    sampleRoadFrame(curve, d, totalLen, pt, tan, right, up);
    headings.push(tan.x);
  }
  const hasRightShift1 = headings.slice(0, 5).some((x) => x > 0.35);
  const hasDipThenRightShift2 = headings.slice(4, 9).some((x) => x < 0.25) && headings.slice(8).some((x) => x > 0.45);
  assert.equal(hasRightShift1, true);
  assert.equal(hasDipThenRightShift2, true);

  // Opening smooth paved bends must produce zero off-road suspension heave
  const smoothStart = sampleOffroadTrackBump(40, 0, BAAL_KUWARI_STOP_DISTANCE);
  assert.equal(smoothStart.heaveY, 0);

  // Off-road bumps engage only beyond BAAL_KUWARI_OFFROAD_START_DIST
  const rockyClimb = sampleOffroadTrackBump(
    BAAL_KUWARI_OFFROAD_START_DIST + 25,
    0,
    BAAL_KUWARI_STOP_DISTANCE
  );
  assert.notEqual(rockyClimb.heaveY, 0);
});

test('POLAROID_MEMORY_SPECS resolves trailing-space BUN MASKA TEA and food in neelkanth photos', () => {
  const filename = path.resolve(__dirname, '..', 'src/lib/privateMemoryLoader.ts');
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const ctx = {
    exports: {},
    URL: { createObjectURL: (f) => `blob:${f.name}`, revokeObjectURL() {} },
    require: (name) =>
      name === 'react'
        ? { useState: (init) => [typeof init === 'function' ? init() : init, () => {}], useEffect: () => {} }
        : require(name),
  };
  vm.runInNewContext(code, ctx, { filename });
  const loader = ctx.exports;
  assert.equal(loader.POLAROID_MEMORY_SPECS.scene03_tea_stop.matchedFilename, 'BUN MASKA TEA .jpg');
  assert.equal(loader.POLAROID_MEMORY_SPECS.scene07_neelkanth_food.matchedFilename, 'food in neelkanth.jpg');
  loader.registerLocalPhotoFolder([
    { name: 'BUN MASKA TEA .jpg' },
    { name: 'food in neelkanth.jpg' },
  ]);
  assert.equal(
    loader.getResolvedPolaroidMemory('scene03_tea_stop').resolvedUrl,
    'blob:BUN MASKA TEA .jpg'
  );
  assert.equal(
    loader.getResolvedPolaroidMemory('scene07_neelkanth_food').resolvedUrl,
    'blob:food in neelkanth.jpg'
  );
});

test('Watch Our Story mode never mutates saved localStorage checkpoints', () => {
  const storageMap = new Map();
  let setCount = 0;
  const mockStorage = {
    getItem: (k) => (storageMap.has(k) ? storageMap.get(k) : null),
    setItem: (k, v) => {
      setCount += 1;
      storageMap.set(k, String(v));
    },
    removeItem: (k) => storageMap.delete(k),
  };
  const { useProgressStore } = loadSource('src/store/progressStore.ts', {
    navigator: { maxTouchPoints: 0 },
    window: {
      localStorage: mockStorage,
      matchMedia: () => ({ matches: false }),
      innerWidth: 1280,
      devicePixelRatio: 1,
    },
  });
  const store = useProgressStore.getState();
  store.setPlayMode('play', true);
  store.beginFadeOut(3, 1, true);
  store.enterLoadingPhase(3, 1);
  store.enterMountingPhase(1);
  assert.equal(store.commitSceneReady(1, 3), true);
  const writesBeforeWatch = setCount;
  const savedBeforeWatch = storageMap.get('road_made_us_family_checkpoint');
  assert.ok(writesBeforeWatch >= 1);
  assert.ok(savedBeforeWatch && savedBeforeWatch.includes('"committedSceneId":3'));

  store.setPlayMode('watch', true);
  store.beginFadeOut(7, 2, true);
  store.enterLoadingPhase(7, 2);
  store.enterMountingPhase(2);
  assert.equal(store.commitSceneReady(2, 7), true);
  store.capturePolaroidAndSave('scene07_neelkanth_food');
  useProgressStore.getState().saveCheckpoint();
  assert.equal(setCount, writesBeforeWatch);
  assert.equal(storageMap.get('road_made_us_family_checkpoint'), savedBeforeWatch);
  assert.equal(useProgressStore.getState().lastCheckpoint.committedSceneId, 3);
});

test('final story accuracy: removed disliked title, silent stairs, Srishti/Kanishka badges, and Day 1 5PM Maggi phase', () => {
  const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');
  for (const rel of [
    'src/app/layout.tsx',
    'src/components/ui/LoadingScreen.tsx',
    'src/components/ui/MinimalHudChrome.tsx',
    'src/components/ui/EndingScreenHUD.tsx',
    'src/components/ui/FallbackStorybookView.tsx',
    'src/lib/sceneConfig.ts',
  ]) {
    assert.equal(read(rel).includes('The Road That Made Us Family'), false, rel);
  }

  const headOverlay = read('src/components/canvas/characters/CharacterHeadOverlay.tsx');
  assert.equal(headOverlay.includes("name: 'Srishti'"), true);
  assert.equal(headOverlay.includes('distanceFactor='), false);
  assert.equal(headOverlay.includes('haath do!'), false);

  const stairsSrc = read('src/components/canvas/scenes/Scene09_BaalKuwariStairs.tsx');
  assert.equal(stairsSrc.includes("'Gotcha.'"), false);

  const hotelEnv = read('src/components/canvas/environment/HotelReturnEnvironment.tsx');
  assert.equal(hotelEnv.includes('Kanishka'), true);
  assert.equal(hotelEnv.includes('33.6'), true);

  const prologueHud = read('src/components/ui/PrologueStoryHUD.tsx');
  assert.equal(prologueHud.includes("'evening_maggi_stop'"), true);
  assert.equal(prologueHud.includes("'return_and_kanishka'"), true);
});

test('final gameplay & media repair: Day 1 video spec, decluttered HUDs, Baal Kuwari back stairs, Bhai Dooj jhula', () => {
  const read = (rel) => fs.readFileSync(path.resolve(__dirname, '..', rel), 'utf8');

  const loaderSrc = read('src/lib/privateMemoryLoader.ts');
  assert.equal(loaderSrc.includes("matchedFilename: 'DAY 1 1.mp4'"), true);
  assert.equal(loaderSrc.includes("mediaKind: 'video'"), true);

  const hudChrome = read('src/components/ui/MinimalHudChrome.tsx');
  assert.equal(hudChrome.includes('Rishikesh · For Ishaan'), false);

  const endingHud = read('src/components/ui/EndingScreenHUD.tsx');
  assert.equal(endingHud.includes('Every Road Led Here'), false);
  assert.equal(endingHud.includes('Memories'), true);
  assert.equal(endingHud.includes('Experience Again'), true);

  const bhaiHud = read('src/components/ui/BhaiDoojHUD.tsx');
  assert.equal(bhaiHud.includes('CREATOR_BHAI_DOOJ_LETTER'), false);
  assert.equal(bhaiHud.includes('creatorDraftNotice'), false);
  assert.equal(bhaiHud.includes('HAPPY BHAI DOOJ'), true);

  const bhaiScene = read('src/components/canvas/scenes/Scene13_BhaiDoojFinale.tsx');
  assert.equal(bhaiScene.includes("'playful_laugh'"), true);
  assert.equal(bhaiScene.includes("'jhula_swing'"), true);

  const bkEnv = read('src/components/canvas/environment/BaalKuwariTempleEnvironment.tsx');
  assert.equal(bkEnv.includes('sampleBaalKuwariFloorY'), true);
});
