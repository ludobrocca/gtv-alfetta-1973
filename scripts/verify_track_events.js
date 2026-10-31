#!/usr/bin/env node

/**
 * High-Dopamine Track Events & 3D Road Deformation Verification Script
 * Validates AC-001 through AC-009 for Alfa Romeo Alfetta GTV (1976)
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// -------------------------------------------------------------
// Headless Web API Mocks for Pure Node.js Execution
// -------------------------------------------------------------
const mockStorage = new Map();
globalThis.localStorage = {
  getItem: (key) => (mockStorage.has(key) ? mockStorage.get(key) : null),
  setItem: (key, val) => mockStorage.set(key, String(val)),
  removeItem: (key) => mockStorage.delete(key),
  clear: () => mockStorage.clear(),
};

globalThis.window = {
  AudioContext: class MockAudioContext {
    constructor() {
      this.state = 'running';
      this.currentTime = 0;
      this.destination = {};
    }
    createGain() {
      return {
        gain: {
          value: 1,
          setTargetAtTime: () => {},
          linearRampToValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
          setValueAtTime: () => {},
        },
        connect: () => {},
      };
    }
    createOscillator() {
      return {
        type: 'sine',
        frequency: {
          value: 440,
          setValueAtTime: () => {},
          exponentialRampToValueAtTime: () => {},
          linearRampToValueAtTime: () => {},
        },
        start: () => {},
        stop: () => {},
        connect: () => {},
      };
    }
    createBufferSource() {
      return {
        buffer: null,
        playbackRate: { setValueAtTime: () => {} },
        start: () => {},
        stop: () => {},
        connect: () => {},
      };
    }
    createBiquadFilter() {
      return {
        type: 'lowpass',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
        Q: { setValueAtTime: () => {} },
        connect: () => {},
      };
    }
    createBuffer(channels, length, sampleRate) {
      return {
        numberOfChannels: channels,
        length,
        sampleRate,
        getChannelData: () => new Float32Array(length),
      };
    }
    resume() {
      return Promise.resolve();
    }
  },
};

let mockedTime = 1000;
globalThis.performance = {
  now: () => {
    mockedTime += 16;
    return mockedTime;
  },
};

// -------------------------------------------------------------
// Import driveStore and Track Event Constants
// -------------------------------------------------------------
const {
  driveStore,
  TRACK_EVENT_TYPES,
  TRACK_EVENT_INTERVAL_METERS,
  TRACK_EVENT_FUNNEL_DURATION,
  TRACK_EVENT_ACTIVE_DURATION,
  TRACK_EVENT_EXIT_DURATION,
  TRACK_EVENT_COMPLETION_BONUS,
} = await import('../src/components/drive/driveStore.js');

driveStore.setMode('drive');

function readFile(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  assert.ok(fs.existsSync(fullPath), `Required file not found: ${relativePath}`);
  return fs.readFileSync(fullPath, 'utf8');
}

// -------------------------------------------------------------
// Test Runner Infrastructure
// -------------------------------------------------------------
let totalTests = 0;
let passedTests = 0;
const failedTests = [];

function runTest(id, name, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m [${id}] ${name}`);
  } catch (err) {
    failedTests.push({ id, name, error: err });
    console.error(`  \x1b[31m✖\x1b[0m [${id}] ${name}`);
    console.error(`    \x1b[31m${err.message}\x1b[0m`);
    if (err.stack) {
      const lines = err.stack.split('\n').slice(1, 4).join('\n');
      console.log(`    \x1b[90m${lines}\x1b[0m`);
    }
  }
}

console.log('\n============================================================');
console.log('⚡ HIGH-DOPAMINE TRACK EVENTS & 3D ROAD DEFORMATION SUITE');
console.log('   Validating Acceptance Criteria AC-001 through AC-009');
console.log('============================================================\n');

// -------------------------------------------------------------
// AC-001: Costanti, Stato e Reset in driveStore.js
// -------------------------------------------------------------
runTest('AC-001', 'Costanti, Stato e Reset in driveStore.js', () => {
  assert.ok(Array.isArray(TRACK_EVENT_TYPES), 'TRACK_EVENT_TYPES must be an array');
  assert.deepStrictEqual(
    TRACK_EVENT_TYPES,
    ['fzero_tunnel', 'parabolic_drift', 'viaduct_ramps'],
    'TRACK_EVENT_TYPES must match [fzero_tunnel, parabolic_drift, viaduct_ramps]'
  );
  assert.strictEqual(TRACK_EVENT_INTERVAL_METERS, 1200, 'TRACK_EVENT_INTERVAL_METERS must equal 1200');
  assert.strictEqual(TRACK_EVENT_FUNNEL_DURATION, 3.0, 'TRACK_EVENT_FUNNEL_DURATION must equal 3.0');
  assert.strictEqual(TRACK_EVENT_ACTIVE_DURATION, 7.5, 'TRACK_EVENT_ACTIVE_DURATION must equal 7.5');
  assert.strictEqual(TRACK_EVENT_EXIT_DURATION, 1.5, 'TRACK_EVENT_EXIT_DURATION must equal 1.5');
  assert.strictEqual(TRACK_EVENT_COMPLETION_BONUS, 1500, 'TRACK_EVENT_COMPLETION_BONUS must equal 1500');

  driveStore.resetGame('playing');
  assert.strictEqual(driveStore.trackEvent, null, 'trackEvent must be null after resetGame("playing")');
  assert.strictEqual(driveStore.nextTrackEventDistance, 1200, 'nextTrackEventDistance must be 1200 after reset');
  assert.strictEqual(driveStore.trackEventIndex, 0, 'trackEventIndex must be 0 after reset');
  assert.strictEqual(driveStore.trackEventsCompleted, 0, 'trackEventsCompleted must be 0 after reset');
});

// -------------------------------------------------------------
// AC-002: Innesco a 1.200m & Fase funnel (Cartelli + Imbuto Barriere)
// -------------------------------------------------------------
runTest('AC-002', 'Innesco a 1.200m & Fase funnel (Cartelli + Imbuto Barriere)', () => {
  // Test automatic trigger when distanceMeters >= 1200
  driveStore.resetGame('playing');
  driveStore.distanceMeters = 1200;
  driveStore.update(1 / 60);
  assert.ok(driveStore.trackEvent !== null, 'trackEvent must be triggered when distanceMeters >= 1200');
  assert.strictEqual(driveStore.trackEvent.phase, 'funnel', 'trackEvent must enter funnel phase');

  // Test startTrackEvent(type, entryLane) properties and funnel barriers
  [-1, 0, 1].forEach((eLane) => {
    driveStore.resetGame('playing');
    const ev = driveStore.startTrackEvent('fzero_tunnel', eLane);
    assert.strictEqual(ev.phase, 'funnel', 'Phase must be funnel');
    assert.strictEqual(ev.timer, 3.0, 'Timer must start at 3.0s');
    assert.strictEqual(ev.blend, 0, 'Blend must start at 0');
    assert.strictEqual(ev.entryLane, eLane, `entryLane must be ${eLane}`);

    const barriers = driveStore.obstacles.filter((o) => o.type === 'barrier');
    assert.strictEqual(barriers.length, 2, 'Must spawn exactly 2 funnel barriers');
    const barrierLanes = barriers.map((b) => b.lane).sort();
    const expectedLanes = [-1, 0, 1].filter((l) => l !== eLane).sort();
    assert.deepStrictEqual(
      barrierLanes,
      expectedLanes,
      `Funnel barriers must block the 2 lanes !== entryLane (${eLane})`
    );
  });

  // Test automatic rotation: fzero_tunnel -> parabolic_drift -> viaduct_ramps -> fzero_tunnel
  driveStore.resetGame('playing');
  const ev1 = driveStore.startTrackEvent();
  assert.strictEqual(ev1.type, 'fzero_tunnel', '1st event in rotation must be fzero_tunnel');
  const ev2 = driveStore.startTrackEvent();
  assert.strictEqual(ev2.type, 'parabolic_drift', '2nd event in rotation must be parabolic_drift');
  const ev3 = driveStore.startTrackEvent();
  assert.strictEqual(ev3.type, 'viaduct_ramps', '3rd event in rotation must be viaduct_ramps');
  const ev4 = driveStore.startTrackEvent();
  assert.strictEqual(ev4.type, 'fzero_tunnel', '4th event in rotation must cycle back to fzero_tunnel');
});

// -------------------------------------------------------------
// AC-003: Transizione funnel → active & Invulnerabilità Dopamina
// -------------------------------------------------------------
runTest('AC-003', 'Transizione funnel → active & Invulnerabilità Dopamina', () => {
  driveStore.resetGame('playing');
  driveStore.startTrackEvent('fzero_tunnel', 0);

  // Inject lethal obstacles into the store to test clearing
  driveStore.obstacles.push(
    { id: 'test_fiat', type: 'fiat500', lane: 0, z: 25, active: true },
    { id: 'test_barrier', type: 'barrier', lane: -1, z: 28, active: true },
    { id: 'test_oil', type: 'oil', lane: 1, z: 30, active: true }
  );

  assert.strictEqual(driveStore.trackEvent.phase, 'funnel');

  // Advance simulation past funnel duration (> 3.0s: 185 frames = ~3.08s)
  for (let i = 0; i < 185; i++) {
    driveStore.update(1 / 60);
  }

  assert.strictEqual(driveStore.trackEvent.phase, 'active', 'phase must transition to active');
  assert.ok(
    driveStore.trackEvent.timer <= 7.5 && driveStore.trackEvent.timer > 0,
    `timer must be <= 7.5s (got ${driveStore.trackEvent.timer})`
  );

  // Verify all lethal obstacles cleared
  const lethalCount = driveStore.obstacles.filter((o) =>
    ['fiat500', 'barrier', 'oil'].includes(o.type)
  ).length;
  assert.strictEqual(lethalCount, 0, 'All lethal obstacles (fiat500, barrier, oil) must be cleared in active');

  // Verify blend increasing toward 1.0
  assert.ok(driveStore.trackEvent.blend > 0, 'blend must start increasing from 0');
  const blendSnapshot = driveStore.trackEvent.blend;

  for (let i = 0; i < 40; i++) {
    driveStore.update(1 / 60);
  }
  assert.ok(
    driveStore.trackEvent.blend > blendSnapshot,
    `blend must continue increasing (was ${blendSnapshot}, now ${driveStore.trackEvent.blend})`
  );

  while (driveStore.trackEvent.blend < 1.0 && driveStore.trackEvent.phase === 'active') {
    driveStore.update(1 / 60);
  }
  assert.strictEqual(driveStore.trackEvent.blend, 1, 'blend must reach 1.0');

  // Verify no lethal obstacles spawn during active phase
  const lethalDuringActive = driveStore.obstacles.filter((o) =>
    ['fiat500', 'barrier', 'oil'].includes(o.type)
  ).length;
  assert.strictEqual(lethalDuringActive, 0, 'No lethal obstacles must spawn during active phase');
});

// -------------------------------------------------------------
// AC-004: Live physics & geometry for each of the 3 events
// -------------------------------------------------------------
runTest('AC-004', 'Live physics & geometry (fzero_tunnel, parabolic_drift, viaduct_ramps)', () => {
  // 1. fzero_tunnel
  {
    driveStore.resetGame('playing');
    driveStore.startTrackEvent('fzero_tunnel', 0);
    // Transition past funnel
    for (let i = 0; i < 185; i++) driveStore.update(1 / 60);
    assert.strictEqual(driveStore.trackEvent.phase, 'active');

    driveStore.targetLane = 1;
    // Simulate 2.5s (150 frames)
    for (let i = 0; i < 150; i++) driveStore.update(1 / 60);

    assert.ok(
      driveStore.speedKmh > 210,
      `fzero_tunnel speedKmh must be > 210 (got ${driveStore.speedKmh})`
    );
    assert.notStrictEqual(
      driveStore.carRoll,
      0,
      `fzero_tunnel carRoll must be non-zero when targetLane = 1 (got ${driveStore.carRoll})`
    );

    const fzeroParams = driveStore.getRoadEventParams(20);
    assert.ok(
      fzeroParams.widthScale < 1,
      `fzero_tunnel widthScale must be < 1 (got ${fzeroParams.widthScale})`
    );
    assert.ok(
      fzeroParams.wallCurvature > 0,
      `fzero_tunnel wallCurvature must be > 0 (got ${fzeroParams.wallCurvature})`
    );
  }

  // 2. parabolic_drift
  {
    driveStore.resetGame('playing');
    driveStore.startTrackEvent('parabolic_drift', 1);
    // Transition past funnel
    for (let i = 0; i < 185; i++) driveStore.update(1 / 60);
    assert.strictEqual(driveStore.trackEvent.phase, 'active');

    driveStore.targetLane = driveStore.trackEvent.idealLane;
    const scoreBefore = driveStore.score;
    const furyBefore = driveStore.furyMultiplier;

    // Simulate 1.5s (90 frames)
    for (let i = 0; i < 90; i++) driveStore.update(1 / 60);

    const curveX = driveStore.getRoadCurveX(40);
    assert.notStrictEqual(curveX, 0, `parabolic_drift getRoadCurveX(40) must be non-zero (got ${curveX})`);
    assert.notStrictEqual(driveStore.carYaw, 0, `parabolic_drift carYaw must be non-zero (got ${driveStore.carYaw})`);
    assert.ok(
      driveStore.score > scoreBefore,
      `parabolic_drift must award drift score bonus (score ${driveStore.score} > ${scoreBefore})`
    );
    assert.ok(
      driveStore.furyMultiplier >= furyBefore,
      'parabolic_drift must award/maintain fury bonus'
    );
  }

  // 3. viaduct_ramps
  {
    driveStore.resetGame('playing');
    driveStore.startTrackEvent('viaduct_ramps', 0);
    // Transition past funnel
    for (let i = 0; i < 185; i++) driveStore.update(1 / 60);
    assert.strictEqual(driveStore.trackEvent.phase, 'active');

    // Simulate 1.0s (60 frames)
    for (let i = 0; i < 60; i++) driveStore.update(1 / 60);

    const viaductParams = driveStore.getRoadEventParams(20);
    assert.ok(
      viaductParams.vergeDropY < -5,
      `viaduct_ramps vergeDropY must be < -5 (got ${viaductParams.vergeDropY})`
    );

    const ramps = driveStore.obstacles.filter((o) => o.type === 'ramp');
    assert.ok(ramps.length > 0, `viaduct_ramps must spawn stunt ramps (found ${ramps.length})`);

    const aerialCoins = driveStore.coins.filter((c) => c.yOffset && c.yOffset > 0);
    assert.ok(aerialCoins.length > 0, `viaduct_ramps must spawn aerial coins with yOffset > 0 (found ${aerialCoins.length})`);
  }
});

// -------------------------------------------------------------
// AC-005: Transizione active → exiting & Bonus Completamento
// -------------------------------------------------------------
runTest('AC-005', 'Transizione active → exiting & Bonus Completamento', () => {
  driveStore.resetGame('playing');
  driveStore.startTrackEvent('fzero_tunnel', 0);

  // Transition past funnel (3.0s)
  for (let i = 0; i < 185; i++) driveStore.update(1 / 60);
  assert.strictEqual(driveStore.trackEvent.phase, 'active');

  // Step through active phase while recording state immediately prior to exit transition
  let scoreBeforeExit = driveStore.score;
  let ultBeforeExit = driveStore.ultimateCharge;
  let furyBeforeExit = driveStore.furyMultiplier;
  const completedBefore = driveStore.trackEventsCompleted;

  while (driveStore.trackEvent && driveStore.trackEvent.phase === 'active') {
    scoreBeforeExit = driveStore.score;
    ultBeforeExit = driveStore.ultimateCharge;
    furyBeforeExit = driveStore.furyMultiplier;
    driveStore.update(1 / 60);
  }

  assert.ok(driveStore.trackEvent !== null, 'trackEvent must exist in exiting phase');
  assert.strictEqual(driveStore.trackEvent.phase, 'exiting', 'phase must be exiting');

  const expectedBonus = TRACK_EVENT_COMPLETION_BONUS * furyBeforeExit;
  const scoreDiff = driveStore.score - scoreBeforeExit;
  assert.ok(
    scoreDiff >= expectedBonus && scoreDiff <= expectedBonus + 10,
    `Score must gain completion bonus +${expectedBonus} (got diff ${scoreDiff})`
  );
  assert.strictEqual(
    driveStore.ultimateCharge,
    Math.min(100, ultBeforeExit + 15),
    'Ultimate charge must increase by +15%'
  );
  assert.strictEqual(
    driveStore.trackEventsCompleted,
    completedBefore + 1,
    'trackEventsCompleted must increment by 1'
  );
  assert.ok(
    Math.abs(driveStore.nextTrackEventDistance - (driveStore.distanceMeters + TRACK_EVENT_INTERVAL_METERS)) < 5.0,
    'nextTrackEventDistance must be scheduled to distanceMeters + 1200'
  );

  // Simulate through exiting duration (1.5s = 90 frames, do 100 frames)
  for (let i = 0; i < 100; i++) {
    driveStore.update(1 / 60);
  }
  assert.strictEqual(driveStore.trackEvent, null, 'trackEvent must be null after exiting phase completes');
});

// -------------------------------------------------------------
// AC-006: Source-contract check on src/components/drive/DriveWorld.jsx
// -------------------------------------------------------------
runTest('AC-006', 'Source-contract check on src/components/drive/DriveWorld.jsx', () => {
  const source = readFile('src/components/drive/DriveWorld.jsx');
  assert.ok(source.includes('ROAD_X_SEGMENTS = 16'), 'DriveWorld.jsx must define ROAD_X_SEGMENTS = 16');
  assert.ok(source.includes('getRoadCurveX'), 'DriveWorld.jsx must call getRoadCurveX');
  assert.ok(source.includes('getRoadEventParams'), 'DriveWorld.jsx must call getRoadEventParams');
  assert.ok(source.includes('EventEntryPortal'), 'DriveWorld.jsx must include EventEntryPortal');
});

// -------------------------------------------------------------
// AC-007: Source-contract check on src/components/drive/DriveCameraDirector.jsx
// -------------------------------------------------------------
runTest('AC-007', 'Source-contract check on src/components/drive/DriveCameraDirector.jsx', () => {
  const source = readFile('src/components/drive/DriveCameraDirector.jsx');
  assert.ok(source.includes('fzero_tunnel'), 'DriveCameraDirector.jsx must handle fzero_tunnel');
  assert.ok(source.includes('parabolic_drift'), 'DriveCameraDirector.jsx must handle parabolic_drift');
  assert.ok(source.includes('viaduct_ramps'), 'DriveCameraDirector.jsx must handle viaduct_ramps');
  assert.ok(source.includes('68'), 'DriveCameraDirector.jsx must configure FOV 68 for fzero_tunnel');
  assert.ok(source.includes('56'), 'DriveCameraDirector.jsx must configure FOV 56 for parabolic_drift');
  assert.ok(source.includes('60'), 'DriveCameraDirector.jsx must configure FOV 60 for viaduct_ramps');
});

// -------------------------------------------------------------
// AC-008: Source-contract check on Speedometer.jsx & DriveAudio.js
// -------------------------------------------------------------
runTest('AC-008', 'Source-contract check on Speedometer.jsx & DriveAudio.js', () => {
  const speedoSource = readFile('src/components/drive/Speedometer.jsx');
  assert.ok(speedoSource.includes('trackEvent'), 'Speedometer.jsx must reference trackEvent');
  assert.ok(speedoSource.includes('BIVIO EVENTO'), 'Speedometer.jsx must display BIVIO EVENTO warning');
  assert.ok(speedoSource.includes('TUNNEL MAGNETICO'), 'Speedometer.jsx must display TUNNEL MAGNETICO title');
  assert.ok(speedoSource.includes('CURVA PARABOLICA'), 'Speedometer.jsx must display CURVA PARABOLICA title');
  assert.ok(speedoSource.includes('VIADOTTO AEREO'), 'Speedometer.jsx must display VIADOTTO AEREO title');

  const audioSource = readFile('src/components/drive/DriveAudio.js');
  assert.ok(audioSource.includes('playEventWarningBeep'), 'DriveAudio.js must implement playEventWarningBeep()');
  assert.ok(audioSource.includes('playFZeroBoostHum'), 'DriveAudio.js must implement playFZeroBoostHum()');
});

// -------------------------------------------------------------
// AC-009: Zero Regressioni & Build di Produzione
// -------------------------------------------------------------
runTest('AC-009', 'Zero Regressioni & Build di Produzione (6 suite esistenti e npm run build passano)', () => {
  const suites = [
    'verify_intro_camera.js',
    'verify_pilot_ultimates.js',
    'verify_gearbox_console.js',
    'verify_burnout_gameplay.js',
    'verify_diegetic_vfx.js',
    'verify_mobile_experience.js',
  ];

  for (const s of suites) {
    try {
      execSync(`node scripts/${s}`, {
        stdio: 'pipe',
        cwd: rootDir,
        maxBuffer: 10 * 1024 * 1024,
      });
    } catch (err) {
      assert.fail(`Sub-suite ${s} failed: ${err.message}`);
    }
  }

  try {
    execSync('npm run build', {
      stdio: 'pipe',
      cwd: rootDir,
      maxBuffer: 10 * 1024 * 1024,
    });
  } catch (err) {
    assert.fail(`Production build failed: ${err.message}`);
  }
});

// -------------------------------------------------------------
// Summary & Exit Code
// -------------------------------------------------------------
console.log('\n------------------------------------------------------------');
console.log(`TOTAL TESTS:  ${totalTests}`);
console.log(`PASSED:       \x1b[32m${passedTests}\x1b[0m`);
if (failedTests.length > 0) {
  console.log(`FAILED:       \x1b[31m${failedTests.length}\x1b[0m`);
  console.log('------------------------------------------------------------\n');
  process.exit(1);
} else {
  console.log('FAILED:       0');
  console.log('------------------------------------------------------------\n');
  console.log('🎉 All Acceptance Criteria AC-001 through AC-009 satisfied successfully!\n');
}
