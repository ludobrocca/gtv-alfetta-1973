#!/usr/bin/env node

/**
 * Pilot Ultimates & Takedown Cam Automated Verification Script
 * Validates AC-001 through AC-006 for Section A (Store) of 2026-10-30-pilot-ultimates-focus-design.md
 *
 * Requirements:
 * - Uses Node.js built-in fs, path, and assert modules.
 * - Imports driveStore and Section A constants from ../src/components/drive/driveStore.js.
 * - Mocks global window, localStorage, and performance for headless execution.
 * - Deterministically executes and asserts live game mechanics on driveStore.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

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
// Import driveStore and Section A Constants
// -------------------------------------------------------------
const {
  driveStore,
  ULT_GAIN,
  ULTIMATE_DURATION,
  TAKEDOWN_STREAK_TARGET,
  TAKEDOWN_CAM_DURATION,
  TAKEDOWN_CAM_TIMESCALE,
  TAKEDOWN_SURGE_POINTS,
} = await import('../src/components/drive/driveStore.js');

driveStore.setMode('drive');

// -------------------------------------------------------------
// Test Runner Infrastructure
// -------------------------------------------------------------
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function runTest(id, description, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m [${id}] ${description}`);
  } catch (err) {
    failedTests++;
    failures.push({ id, description, error: err });
    console.log(`  \x1b[31m✖\x1b[0m [${id}] ${description}`);
    console.log(`    \x1b[31mError: ${err.message}\x1b[0m`);
    if (err.stack) {
      const lines = err.stack.split('\n').slice(1, 4).join('\n');
      console.log(`    \x1b[90m${lines}\x1b[0m`);
    }
  }
}

console.log('\n============================================================');
console.log('⚡ PILOT ULTIMATES & TAKEDOWN CAM VERIFICATION SUITE');
console.log('   Validating Section A (Store) Acceptance Criteria AC-001 - AC-006');
console.log('============================================================\n');

// -------------------------------------------------------------
// AC-001: no powerups spawned over ~2000 spawn packs
// -------------------------------------------------------------
runTest('AC-001', 'No track powerups spawned over ~2000 spawn packs (powerups array stays empty, collectPowerup exists)', () => {
  driveStore.resetGame('playing');
  assert.ok(Array.isArray(driveStore.powerups), 'powerups must be an array');
  assert.strictEqual(driveStore.powerups.length, 0, 'powerups must be initially empty');
  assert.strictEqual(typeof driveStore.collectPowerup, 'function', 'collectPowerup method must be retained for compatibility');

  const totalPacks = 2000;
  for (let i = 0; i < totalPacks; i++) {
    driveStore.spawnEntityPack();
    assert.strictEqual(driveStore.powerups.length, 0, `powerups array must remain empty at spawn pack ${i}`);
    driveStore.obstacles = [];
    driveStore.coins = [];
  }
});

// -------------------------------------------------------------
// AC-002: ULT_GAIN values applied (takedown +12, perfect shift +8, coin +1)
// -------------------------------------------------------------
runTest('AC-002', 'ULT_GAIN values applied (takedown +12, perfect shift +8, coin +1, constants exported)', () => {
  assert.ok(ULT_GAIN, 'ULT_GAIN must be exported');
  assert.strictEqual(ULT_GAIN.takedown, 12, 'ULT_GAIN.takedown must be 12');
  assert.strictEqual(ULT_GAIN.perfectShift, 8, 'ULT_GAIN.perfectShift must be 8');
  assert.strictEqual(ULT_GAIN.goodShift, 3, 'ULT_GAIN.goodShift must be 3');
  assert.strictEqual(ULT_GAIN.ramp, 10, 'ULT_GAIN.ramp must be 10');
  assert.strictEqual(ULT_GAIN.slingshot, 6, 'ULT_GAIN.slingshot must be 6');
  assert.strictEqual(ULT_GAIN.nearMiss, 6, 'ULT_GAIN.nearMiss must be 6');
  assert.strictEqual(ULT_GAIN.closePass, 5, 'ULT_GAIN.closePass must be 5');
  assert.strictEqual(ULT_GAIN.coin, 1, 'ULT_GAIN.coin must be 1');
  assert.strictEqual(ULT_GAIN.smash, 4, 'ULT_GAIN.smash must be 4');
  assert.strictEqual(ULT_GAIN.mgOil, 5, 'ULT_GAIN.mgOil must be 5');

  driveStore.resetGame('playing');
  driveStore.ultimateCharge = 0;

  // 1. Takedown gain (+12)
  const obs = { id: 'obs_takedown_test', type: 'fiat500', lane: 0, z: 10, active: true };
  driveStore.obstacles = [obs];
  driveStore.takedownObstacle(obs.id, 1);
  assert.strictEqual(driveStore.ultimateCharge, ULT_GAIN.takedown, `takedown must grant exactly ULT_GAIN.takedown (${ULT_GAIN.takedown})`);

  // 2. Perfect shift gain (+8)
  const chargeBeforeShift = driveStore.ultimateCharge;
  driveStore.shiftWindowActive = true;
  driveStore.triggerPerfectShift();
  assert.strictEqual(driveStore.ultimateCharge, chargeBeforeShift + ULT_GAIN.perfectShift, `perfect shift must grant exactly ULT_GAIN.perfectShift (${ULT_GAIN.perfectShift})`);

  // 3. Coin gain (+1)
  const chargeBeforeCoin = driveStore.ultimateCharge;
  const coin = { id: 'coin_gain_test', lane: 0, z: 5, active: true };
  driveStore.coins = [coin];
  driveStore.collectCoin(coin.id);
  assert.strictEqual(driveStore.ultimateCharge, chargeBeforeCoin + ULT_GAIN.coin, `coin pickup must grant exactly ULT_GAIN.coin (${ULT_GAIN.coin})`);
});

// -------------------------------------------------------------
// AC-003: no charge while ultimate active and ultimateTimer counts down to 0 after ~7s of update
// -------------------------------------------------------------
runTest('AC-003', 'No charge while ultimate active and ultimateTimer counts down to 0 after ~7s of update', () => {
  driveStore.resetGame('playing');
  driveStore.obstacles = [];
  driveStore.nextSpawnZ = 999999;
  driveStore.ultimateCharge = 100;

  assert.strictEqual(driveStore.isUltimateActive(), false, 'isUltimateActive must be false initially');
  assert.strictEqual(driveStore.ultimateTimer, 0, 'ultimateTimer must be 0 initially');
  assert.strictEqual(ULTIMATE_DURATION, 7.0, 'ULTIMATE_DURATION must be 7.0');

  const activated = driveStore.activateUltimate();
  assert.strictEqual(activated, true, 'activateUltimate must return true when charge is 100');
  assert.strictEqual(driveStore.ultimateCharge, 0, 'ultimateCharge must reset to 0 on activation');
  assert.strictEqual(driveStore.isUltimateActive(), true, 'isUltimateActive must be true after activation');
  assert.strictEqual(driveStore.ultimateTimer, ULTIMATE_DURATION, 'ultimateTimer must be set to ULTIMATE_DURATION (7.0s)');

  // Attempt to add charge via method and game actions - must be no-ops
  driveStore.addUltimateCharge(50);
  assert.strictEqual(driveStore.ultimateCharge, 0, 'addUltimateCharge must be no-op while ultimate is active');

  const coin = { id: 'coin_while_active', lane: 0, z: 5, active: true };
  driveStore.coins = [coin];
  driveStore.collectCoin(coin.id);
  assert.strictEqual(driveStore.ultimateCharge, 0, 'collectCoin must not increase charge while ultimate is active');

  // Update for 3.5s (35 steps of 0.1s real dt, timeScale = 1)
  for (let i = 0; i < 35; i++) {
    driveStore.update(0.1);
  }
  assert.ok(driveStore.isUltimateActive(), 'ultimate must still be active after 3.5s');
  assert.ok(Math.abs(driveStore.ultimateTimer - 3.5) < 0.01, `ultimateTimer should be ~3.5s (got ${driveStore.ultimateTimer})`);

  // Update for remaining 3.5s (35 steps of 0.1s -> total 7.0s)
  for (let i = 0; i < 35; i++) {
    driveStore.update(0.1);
  }
  assert.strictEqual(driveStore.ultimateTimer, 0, 'ultimateTimer must be 0 after 7.0s of update');
  assert.strictEqual(driveStore.isUltimateActive(), false, 'isUltimateActive must return false when timer hits 0');

  // Once expired, charge can accumulate again
  driveStore.addUltimateCharge(15);
  assert.strictEqual(driveStore.ultimateCharge, 15, 'addUltimateCharge must work again after ultimate expires');
});

// -------------------------------------------------------------
// AC-004: 5 consecutive takedowns trigger takedown cam, 4 takedowns + frontal impact + 1 takedown does NOT
// -------------------------------------------------------------
runTest('AC-004', '5 consecutive takedowns trigger takedown cam (timer, target, surge points = 2500*fury applied, takedownCamsCount 1), 4 takedowns + frontal impact + 1 takedown does NOT', () => {
  assert.strictEqual(TAKEDOWN_STREAK_TARGET, 5, 'TAKEDOWN_STREAK_TARGET must be 5');
  assert.strictEqual(TAKEDOWN_CAM_DURATION, 1.6, 'TAKEDOWN_CAM_DURATION must be 1.6');
  assert.strictEqual(TAKEDOWN_CAM_TIMESCALE, 0.3, 'TAKEDOWN_CAM_TIMESCALE must be 0.3');
  assert.strictEqual(TAKEDOWN_SURGE_POINTS, 2500, 'TAKEDOWN_SURGE_POINTS must be 2500');

  // Case A: 5 consecutive takedowns
  driveStore.resetGame('playing');
  assert.strictEqual(driveStore.takedownStreak, 0);
  assert.strictEqual(driveStore.takedownCamsCount, 0);
  assert.strictEqual(driveStore.takedownCamTimer, 0);
  assert.strictEqual(driveStore.takedownCamTarget, null);
  assert.strictEqual(driveStore.takedownSurge, null);

  for (let i = 1; i <= 4; i++) {
    const obs = { id: `obs_streak_${i}`, type: 'fiat500', lane: 0, z: 10, active: true };
    driveStore.obstacles = [obs];
    driveStore.takedownObstacle(obs.id, 1);
    assert.strictEqual(driveStore.takedownStreak, i, `takedownStreak must be ${i} after takedown ${i}`);
    assert.strictEqual(driveStore.takedownCamTimer, 0, `takedownCamTimer must still be 0 after takedown ${i}`);
    assert.strictEqual(driveStore.takedownCamsCount, 0, `takedownCamsCount must still be 0 after takedown ${i}`);
  }

  // 5th consecutive takedown
  const furyBeforeSurge = driveStore.furyMultiplier; // 1 + 4 = 5
  const obs5 = { id: 'obs_streak_5', type: 'fiat500', lane: 1, z: 10, active: true };
  driveStore.obstacles = [obs5];
  driveStore.takedownObstacle(obs5.id, -1);

  assert.strictEqual(driveStore.takedownStreak, 5, 'takedownStreak must reach 5');
  assert.strictEqual(driveStore.takedownCamTimer, TAKEDOWN_CAM_DURATION, 'takedownCamTimer must be set to 1.6');
  assert.deepStrictEqual(driveStore.takedownCamTarget, { id: 'obs_streak_5', side: -1 }, 'takedownCamTarget must record obstacle id and side');
  assert.strictEqual(driveStore.takedownCamsCount, 1, 'takedownCamsCount must increment to 1');
  assert.ok(driveStore.takedownSurge !== null, 'takedownSurge must be defined');
  const expectedSurgePoints = TAKEDOWN_SURGE_POINTS * (furyBeforeSurge + 1);
  assert.strictEqual(driveStore.takedownSurge.points, expectedSurgePoints, `takedownSurge points must equal ${expectedSurgePoints}`);
  assert.strictEqual(driveStore.takedownSurge.timer, 2.2, 'takedownSurge timer must be 2.2s');
  assert.strictEqual(driveStore.timeScale, TAKEDOWN_CAM_TIMESCALE, 'timeScale must be 0.3 during takedown cam');

  // Case B: 4 takedowns + frontal impact + 1 takedown does NOT trigger cam
  driveStore.resetGame('playing');
  for (let i = 1; i <= 4; i++) {
    const obs = { id: `obs_reset_streak_${i}`, type: 'fiat500', lane: 0, z: 10, active: true };
    driveStore.obstacles = [obs];
    driveStore.takedownObstacle(obs.id, 1);
  }
  assert.strictEqual(driveStore.takedownStreak, 4, 'takedownStreak should be 4');

  // Frontal impact (damaged)
  driveStore.handleFrontalImpact();
  assert.strictEqual(driveStore.armorState, 'damaged');
  assert.strictEqual(driveStore.takedownStreak, 0, 'Frontal impact must reset takedownStreak to 0');

  // 1 more takedown -> streak becomes 1 (NOT 5), no cam triggered
  const obsAfterImpact = { id: 'obs_after_impact', type: 'fiat500', lane: 0, z: 10, active: true };
  driveStore.obstacles = [obsAfterImpact];
  driveStore.takedownObstacle(obsAfterImpact.id, 1);

  assert.strictEqual(driveStore.takedownStreak, 1, 'takedownStreak must be 1 after impact + 1 takedown');
  assert.strictEqual(driveStore.takedownCamTimer, 0, 'takedownCamTimer must NOT be triggered');
  assert.strictEqual(driveStore.takedownCamTarget, null, 'takedownCamTarget must be null');
  assert.strictEqual(driveStore.takedownCamsCount, 0, 'takedownCamsCount must still be 0');
  assert.strictEqual(driveStore.takedownSurge, null, 'takedownSurge must be null');
});

// -------------------------------------------------------------
// AC-005: during cam timeScale=0.3 and distance advances ~0.3x vs normal for same real dt, cam ends after 1.6s real time and timeScale returns to 1
// -------------------------------------------------------------
runTest('AC-005', 'During cam timeScale=0.3 and distance advances ~0.3x vs normal for same real dt, cam ends after 1.6s real time and timeScale returns to 1', () => {
  // 1. Normal run (1.6s real time = 16 steps of 0.1s at constant 100 km/h)
  driveStore.resetGame('playing');
  driveStore.speedKmh = 100;
  driveStore.obstacles = [];
  driveStore.nextSpawnZ = 999999;
  for (let i = 0; i < 16; i++) {
    driveStore.speedKmh = 100;
    driveStore.update(0.1);
  }
  const normalDistance = driveStore.distanceMeters;
  assert.ok(normalDistance > 0, 'normalDistance must be positive');

  // 2. Cam run (trigger cam, run 16 steps of 0.1s real dt at 100 km/h)
  driveStore.resetGame('playing');
  driveStore.speedKmh = 100;
  driveStore.obstacles = [];
  driveStore.nextSpawnZ = 999999;

  // Trigger cam
  driveStore.takedownStreak = 4;
  const obs = { id: 'obs_cam_test', type: 'fiat500', lane: 0, z: 10, active: true };
  driveStore.obstacles = [obs];
  driveStore.takedownObstacle(obs.id, 1);

  assert.strictEqual(driveStore.takedownCamTimer, TAKEDOWN_CAM_DURATION, 'Cam timer must start at 1.6s');
  assert.strictEqual(driveStore.timeScale, TAKEDOWN_CAM_TIMESCALE, 'timeScale must be 0.3 at start of cam');

  // Update for 1.6s real time (16 steps of 0.1s)
  for (let i = 0; i < 16; i++) {
    driveStore.speedKmh = 100;
    driveStore.obstacles = [];
    driveStore.update(0.1);
  }

  const camDistance = driveStore.distanceMeters;
  const ratio = camDistance / normalDistance;

  // Distance ratio must be very close to 0.3
  assert.ok(
    Math.abs(ratio - 0.3) < 0.02,
    `Distance during cam must advance ~0.3x vs normal (got ratio ${ratio.toFixed(4)})`
  );

  // After 1.6s real time: cam must end, timer reaches 0, timeScale returns to 1
  assert.strictEqual(driveStore.takedownCamTimer, 0, 'takedownCamTimer must be 0 after 1.6s real time');
  assert.strictEqual(driveStore.timeScale, 1, 'timeScale must return to 1 after cam ends');
  assert.strictEqual(driveStore.takedownCamTarget, null, 'takedownCamTarget must be null after cam ends');
});

// -------------------------------------------------------------
// AC-006: resetGame clears all new state
// -------------------------------------------------------------
runTest('AC-006', 'resetGame clears all new state (ultimateTimer, takedownStreak, takedownCamTimer, takedownCamTarget, timeScale, takedownSurge, takedownCamsCount)', () => {
  driveStore.resetGame('playing');

  // Set all new state fields to dirty / non-zero values
  driveStore.takedownStreak = 4;
  driveStore.takedownCamTimer = 1.2;
  driveStore.takedownCamTarget = { id: 'target_test', side: -1 };
  driveStore.timeScale = 0.3;
  driveStore.takedownSurge = { points: 5000, timer: 1.8 };
  driveStore.takedownCamsCount = 3;
  driveStore.ultimateTimer = 5.5;
  driveStore.ultimateCharge = 75;

  assert.strictEqual(driveStore.isUltimateActive(), true);

  // Invoke resetGame
  driveStore.resetGame('playing');

  assert.strictEqual(driveStore.takedownStreak, 0, 'takedownStreak must reset to 0');
  assert.strictEqual(driveStore.takedownCamTimer, 0, 'takedownCamTimer must reset to 0');
  assert.strictEqual(driveStore.takedownCamTarget, null, 'takedownCamTarget must reset to null');
  assert.strictEqual(driveStore.timeScale, 1, 'timeScale must reset to 1');
  assert.strictEqual(driveStore.takedownSurge, null, 'takedownSurge must reset to null');
  assert.strictEqual(driveStore.takedownCamsCount, 0, 'takedownCamsCount must reset to 0');
  assert.strictEqual(driveStore.ultimateTimer, 0, 'ultimateTimer must reset to 0');
  assert.strictEqual(driveStore.ultimateCharge, 0, 'ultimateCharge must reset to 0');
  assert.strictEqual(driveStore.isUltimateActive(), false, 'isUltimateActive must be false');
  assert.strictEqual(driveStore.powerups.length, 0, 'powerups array must be empty');
});

// -------------------------------------------------------------
// Summary & Exit Code
// -------------------------------------------------------------
console.log('\n------------------------------------------------------------');
console.log(`TOTAL TESTS:  ${totalTests}`);
console.log(`PASSED:       \x1b[32m${passedTests}\x1b[0m`);
console.log(`FAILED:       \x1b[31m${failedTests}\x1b[0m`);
console.log('------------------------------------------------------------\n');

if (failedTests > 0) {
  console.error(`\x1b[31m❌ Verification failed with ${failedTests} failure(s).\x1b[0m`);
  process.exit(1);
} else {
  console.log('\x1b[32m🎉 All Acceptance Criteria AC-001 through AC-006 satisfied successfully!\x1b[0m\n');
  process.exit(0);
}
