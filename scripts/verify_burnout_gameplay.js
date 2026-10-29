#!/usr/bin/env node

/**
 * Burnout Arcade Gameplay Automated Verification Script
 * Validates AC-001 through AC-009 for Alfa Romeo Alfetta GTV (1976)
 *
 * Requirements:
 * - Uses Node.js built-in fs, path, and assert modules.
 * - Imports driveStore, getDriverRank, DRIVER_RANKS from ../src/components/drive/driveStore.js.
 * - Mocks global window, localStorage, and performance for headless execution.
 * - Deterministically executes and asserts live game mechanics on driveStore.
 * - Verifies AST/source contract requirements in DriveWorld.jsx, Speedometer.jsx, and DriveAudio.js.
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
// Import driveStore and Gameplay Helpers
// -------------------------------------------------------------
const { driveStore, getDriverRank, DRIVER_RANKS } = await import(
  '../src/components/drive/driveStore.js'
);
driveStore.setMode('drive');

// Source reader helper
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
console.log('🏎️ ALFA ROMEO ALFETTA GTV (1976) — BURNOUT ARCADE GAMEPLAY');
console.log('   Validating Acceptance Criteria AC-001 through AC-009');
console.log('============================================================\n');

// Load source files under test
const driveWorldJsx = readFile('src/components/drive/DriveWorld.jsx');
const speedometerJsx = readFile('src/components/drive/Speedometer.jsx');
const driveAudioJs = readFile('src/components/drive/DriveAudio.js');
const driveStoreJs = readFile('src/components/drive/driveStore.js');
const carPowerupVfxJsx = readFile('src/components/drive/CarPowerupVFX.jsx');

// -------------------------------------------------------------
// AC-001: Sportellata Takedown & Fisica Laterale
// -------------------------------------------------------------
runTest('AC-001', 'Sportellata Takedown & Fisica Laterale (knockout velocity, charge, score & DriveWorld/DriveAudio integration)', () => {
  driveStore.resetGame('playing');
  const obs = { id: 'obs_test_500', type: 'fiat500', lane: 0, z: 10, active: true };
  driveStore.obstacles = [obs];

  const initialScore = driveStore.score;
  const initialTakedowns = driveStore.takedownsCount;
  const initialUltimate = driveStore.ultimateCharge;

  const result = driveStore.takedownObstacle(obs.id, 1);
  assert.strictEqual(result, true, 'takedownObstacle should return true when hitting an active obstacle');
  assert.strictEqual(obs.knockedOut, true, 'Obstacle must have knockedOut === true');
  assert.strictEqual(obs.active, false, 'Obstacle must be deactivated');
  assert.ok(obs.vx !== 0, `Obstacle lateral velocity vx must be non-zero (got ${obs.vx})`);
  assert.strictEqual(obs.vx, -11.5, 'Obstacle vx must match expected knock impulse');
  assert.strictEqual(obs.vz, 9.0, 'Obstacle vz must match expected forward impulse');
  assert.strictEqual(obs.vRot, 10.0, 'Obstacle vRot must impart spin');
  assert.strictEqual(driveStore.takedownsCount, initialTakedowns + 1, 'takedownsCount must increment by 1');
  assert.strictEqual(driveStore.ultimateCharge, initialUltimate + 35, 'ultimateCharge must increase by 35%');
  assert.ok(driveStore.score >= initialScore + 300, `Score must increase by at least 300 (got ${driveStore.score - initialScore})`);
  assert.ok(driveStore.boostTimer > 0, 'Sportellata takedown must award micro-turbo boostTimer');

  // AST / Source integration checks
  assert.ok(driveWorldJsx.includes('driveStore.takedownObstacle'), 'DriveWorld.jsx must invoke driveStore.takedownObstacle');
  assert.ok(driveWorldJsx.includes('knockedOut'), 'DriveWorld.jsx must handle obs.knockedOut physics in useFrame');
  assert.ok(driveWorldJsx.includes('knockX'), 'DriveWorld.jsx must calculate knockX displacement');
  assert.ok(driveAudioJs.includes('playTakedownSlam'), 'DriveAudio.js must implement playTakedownSlam');
});

// -------------------------------------------------------------
// AC-002: Sistema "Paraurti d'Acciaio" a 2 Stadi con Auto-Riparazione
// -------------------------------------------------------------
runTest('AC-002', 'Sistema "Paraurti d\'Acciaio" a 2 Stadi con Auto-Riparazione (intact -> damaged -> repair -> crash)', () => {
  driveStore.resetGame('playing');
  assert.strictEqual(driveStore.armorState, 'intact', 'Game must begin with armorState intact');
  assert.strictEqual(driveStore.repairProgress, 0, 'repairProgress must begin at 0');

  // First frontal impact: survives and transitions to damaged
  const firstImpactRes = driveStore.handleFrontalImpact('test_frontal_1');
  assert.strictEqual(firstImpactRes, 'damaged');
  assert.strictEqual(driveStore.gameState, 'playing', 'First frontal impact must NOT trigger gameover');
  assert.strictEqual(driveStore.armorState, 'damaged', 'armorState must switch to damaged');
  assert.strictEqual(driveStore.furyMultiplier, 1, 'Frontal impact must reset furyMultiplier to 1');
  assert.strictEqual(driveStore.furyTimer, 0, 'Frontal impact must reset furyTimer to 0');
  assert.strictEqual(driveStore.repairProgress, 0, 'repairProgress must be 0 after initial damage');

  // Perform 3 takedowns to repair armor
  driveStore.obstacles = [
    { id: 'fiat_rep_1', type: 'fiat500', lane: -1, z: 12, active: true },
    { id: 'fiat_rep_2', type: 'fiat500', lane: 0, z: 22, active: true },
    { id: 'fiat_rep_3', type: 'fiat500', lane: 1, z: 32, active: true },
  ];

  driveStore.takedownObstacle('fiat_rep_1', -1);
  assert.strictEqual(driveStore.armorState, 'damaged', 'Armor must remain damaged after 1 takedown');
  assert.strictEqual(driveStore.repairProgress, 1, 'repairProgress must be 1/3');

  driveStore.takedownObstacle('fiat_rep_2', 1);
  assert.strictEqual(driveStore.armorState, 'damaged', 'Armor must remain damaged after 2 takedowns');
  assert.strictEqual(driveStore.repairProgress, 2, 'repairProgress must be 2/3');

  driveStore.takedownObstacle('fiat_rep_3', 1);
  assert.strictEqual(driveStore.armorState, 'intact', 'Armor must be fully repaired to intact after 3 takedowns');
  assert.strictEqual(driveStore.repairProgress, 0, 'repairProgress must reset to 0');

  // Damage again, then second impact triggers Game Over
  driveStore.handleFrontalImpact('test_frontal_2');
  assert.strictEqual(driveStore.armorState, 'damaged', 'Armor is damaged again');

  const crashRes = driveStore.handleFrontalImpact('test_fatal_impact');
  assert.strictEqual(crashRes, 'gameover');
  assert.strictEqual(driveStore.gameState, 'gameover', 'Second frontal impact while damaged must trigger gameover');

  // Source integration checks
  assert.ok(driveWorldJsx.includes('driveStore.handleFrontalImpact'), 'DriveWorld.jsx must invoke handleFrontalImpact');
  assert.ok(driveAudioJs.includes('playArmorRepair'), 'DriveAudio.js must implement playArmorRepair');
  assert.ok(driveAudioJs.includes('playArmorDamage'), 'DriveAudio.js must implement playArmorDamage');
});

// -------------------------------------------------------------
// AC-003: Scia Aerodinamica & Sorpasso Fionda
// -------------------------------------------------------------
runTest('AC-003', 'Scia Aerodinamica & Sorpasso Fionda (drafting detection, timer accumulation, slingshot boost)', () => {
  driveStore.resetGame('playing');
  driveStore.targetLane = 0;
  driveStore.carX = 0;

  // Place active Fiat 500 obstacle ahead in current lane
  driveStore.obstacles = [
    { id: 'fiat_draft', type: 'fiat500', lane: 0, z: 8, active: true },
  ];

  // Update loop for 0.4 seconds (using 0.1s steps to respect internal 60fps dt clamping)
  for (let step = 0; step < 4; step++) {
    driveStore.update(0.1);
  }
  assert.strictEqual(driveStore.isDrafting, true, 'Car must be drafting when behind Fiat 500 in same lane');
  assert.ok(driveStore.draftTimer >= 0.35, `draftTimer must accumulate >= 0.35s (got ${driveStore.draftTimer})`);

  // Execute slingshot lane change
  const initialUltimate = driveStore.ultimateCharge;
  const initialSlingshots = driveStore.slingshotsCount;
  driveStore.changeLane(1);

  assert.strictEqual(driveStore.targetLane, 1, 'Car must have moved to lane 1');
  assert.strictEqual(driveStore.slingshotsCount, initialSlingshots + 1, 'slingshotsCount must increment');
  assert.ok(driveStore.boostTimer > 0, 'Slingshot must grant boostTimer');
  assert.ok(driveStore.ultimateCharge >= initialUltimate + 20, 'Slingshot must award at least +20% ultimate charge');
  assert.strictEqual(driveStore.isDrafting, false, 'isDrafting must clear after slingshot lane change');
  assert.strictEqual(driveStore.draftTimer, 0, 'draftTimer must reset after slingshot');

  // Source integration checks
  assert.ok(speedometerJsx.includes('isDrafting'), 'Speedometer.jsx must consume isDrafting');
  assert.ok(
    carPowerupVfxJsx.includes('isDrafting'),
    'CarPowerupVFX.jsx must render diegetic wind ribbons when isDrafting is active'
  );
});

// -------------------------------------------------------------
// AC-004: Cambiata Perfetta in Zona Rossa
// -------------------------------------------------------------
runTest('AC-004', 'Cambiata Perfetta in Zona Rossa (shift window gating, boost, backfire SFX contract)', () => {
  driveStore.resetGame('playing');

  // Inactive window: trigger must fail
  driveStore.shiftWindowActive = false;
  assert.strictEqual(driveStore.triggerPerfectShift(), false, 'triggerPerfectShift must return false if window inactive');

  // Active redline window: trigger succeeds
  driveStore.shiftWindowActive = true;
  const initialShifts = driveStore.perfectShiftsCount;
  const initialUltimate = driveStore.ultimateCharge;

  const success = driveStore.triggerPerfectShift();
  assert.strictEqual(success, true, 'triggerPerfectShift must return true when window is active');
  assert.strictEqual(driveStore.perfectShiftsCount, initialShifts + 1, 'perfectShiftsCount must increment');
  assert.ok(driveStore.ultimateCharge >= initialUltimate + 25, 'Perfect shift must grant at least +25% ultimate charge');
  assert.ok(driveStore.boostTimer > 0, 'Perfect shift must activate boostTimer');
  assert.strictEqual(driveStore.shiftWindowActive, false, 'shiftWindowActive must close after shift');
  assert.ok(driveStore.shiftCooldown > 0, 'shiftCooldown must be initiated');

  // Source integration checks
  assert.ok(speedometerJsx.includes('triggerPerfectShift'), 'Speedometer.jsx must call triggerPerfectShift');
  assert.ok(driveAudioJs.includes('playPerfectShiftBackfire'), 'DriveAudio.js must implement playPerfectShiftBackfire');
});

// -------------------------------------------------------------
// AC-005: Rampe di Lancio Stradali & Monete Aeree
// -------------------------------------------------------------
runTest('AC-005', 'Rampe di Lancio Stradali & Monete Aeree (vertical velocity, armor repair, ramp spawns & aerial coins)', () => {
  driveStore.resetGame('playing');
  driveStore.armorState = 'damaged';

  const ramp = { id: 'ramp_jump_test', type: 'ramp', lane: 0, z: 12, active: true };
  driveStore.obstacles = [ramp];

  const initialJumps = driveStore.rampJumpsCount;
  const hitSuccess = driveStore.hitRamp(ramp.id);
  assert.strictEqual(hitSuccess, true, 'hitRamp must succeed');
  assert.ok(driveStore.verticalVel >= 4.0, `verticalVel must be >= 4.0 for launch takeoff (got ${driveStore.verticalVel})`);
  assert.strictEqual(driveStore.rampJumpsCount, initialJumps + 1, 'rampJumpsCount must increment');
  assert.strictEqual(driveStore.armorState, 'intact', 'Launching off a ramp must instantly repair armor to intact');
  assert.strictEqual(driveStore.repairProgress, 0, 'repairProgress must reset to 0');
  assert.ok(driveStore.ultimateCharge >= 30, 'Ramp launch must grant >= 30% ultimate charge');

  // Deterministic Spawner Pack test for Ramps and Aerial Coins
  const origRandom = Math.random;
  try {
    // Math.random stub returning < 0.22 triggers ramp branch
    Math.random = () => 0.1;
    driveStore.resetGame('playing');
    driveStore.obstacles = [];
    driveStore.coins = [];
    driveStore.spawnEntityPack(80);

    const rampObstacle = driveStore.obstacles.find((o) => o.type === 'ramp');
    assert.ok(rampObstacle, 'spawnEntityPack must generate obstacle with type: "ramp"');

    const barrierObstacle = driveStore.obstacles.find((o) => o.type === 'barrier' && o.z > rampObstacle.z);
    assert.ok(barrierObstacle, 'spawnEntityPack must place barrier obstacle ahead of ramp to jump over');

    const aerialCoins = driveStore.coins.filter((c) => typeof c.yOffset === 'number' && c.yOffset > 1.0);
    assert.ok(aerialCoins.length >= 4, `spawnEntityPack must generate at least 4 aerial coins along jump arc (found ${aerialCoins.length})`);
  } finally {
    Math.random = origRandom;
  }

  // Source integration checks
  assert.ok(driveWorldJsx.includes('StuntRamp'), 'DriveWorld.jsx must define and render StuntRamp component');
  assert.ok(driveWorldJsx.includes('hitRamp'), 'DriveWorld.jsx must invoke hitRamp on ramp collision');
  assert.ok(driveWorldJsx.includes('yOffset'), 'DriveWorld.jsx must position coins using yOffset');
  assert.ok(driveAudioJs.includes('playRampLaunch'), 'DriveAudio.js must implement playRampLaunch');
});

// -------------------------------------------------------------
// AC-006: Barra Ultimate Pilota 0–100% attivabile a comando
// -------------------------------------------------------------
runTest('AC-006', 'Barra Ultimate Pilota 0–100% attivabile a comando (gating at 100%, driver execution for Elvis & MG)', () => {
  driveStore.resetGame('playing');

  // Must not activate when < 100%
  driveStore.ultimateCharge = 99;
  assert.strictEqual(driveStore.activateUltimate(), false, 'activateUltimate must return false if charge < 100');

  // Test Elvis Ultimate
  driveStore.ultimateCharge = 100;
  driveStore.selectedDriver = 'elvis';
  const elvisActive = driveStore.activateUltimate();
  assert.strictEqual(elvisActive, true, 'activateUltimate must activate successfully at 100%');
  assert.strictEqual(driveStore.ultimateCharge, 0, 'ultimateCharge must reset to 0 upon activation');
  assert.ok(driveStore.activePowerups.elvis >= 6.5, 'Elvis Rock\'n\'Roll nitro must be active for >= 6.5s');

  // Test Maria Grazia ("MG") Ultimate
  driveStore.ultimateCharge = 100;
  driveStore.selectedDriver = 'mg';
  const mgActive = driveStore.activateUltimate();
  assert.strictEqual(mgActive, true, 'activateUltimate must activate for MG');
  assert.strictEqual(driveStore.ultimateCharge, 0, 'ultimateCharge must reset to 0');
  assert.ok(driveStore.activePowerups.mg >= 6.5, 'MG powerup must be active');
  assert.ok(driveStore.activePowerups.tex >= 6.5, 'MG must also receive Ranger shield');
  assert.ok(driveStore.activePowerups.spiderman >= 6.5, 'MG must also receive Coin Magnet');

  // Source integration checks
  assert.ok(speedometerJsx.includes('activateUltimate'), 'Speedometer.jsx must call activateUltimate');
  assert.ok(speedometerJsx.includes('ultimateCharge'), 'Speedometer.jsx must monitor ultimateCharge');
});

// -------------------------------------------------------------
// AC-007: Moltiplicatore Furia Bialbero x1–x10
// -------------------------------------------------------------
runTest('AC-007', 'Moltiplicatore Furia Bialbero x1–x10 (capping at x10, timer renewal, graceful decay toward x1)', () => {
  driveStore.resetGame('playing');
  driveStore.obstacles = [];
  driveStore.nextSpawnZ = 999999; // isolate from random track spawns during decay simulation
  assert.strictEqual(driveStore.furyMultiplier, 1, 'Initial furyMultiplier must be 1');

  // Add fury 15 times: must cap at 10
  for (let i = 0; i < 15; i++) {
    driveStore.addFury(1);
  }
  assert.strictEqual(driveStore.furyMultiplier, 10, 'furyMultiplier must cap strictly at 10');
  assert.ok(driveStore.furyTimer > 0, `furyTimer must be positive (got ${driveStore.furyTimer})`);

  // Simulate timer expiration via update frames: multiplier decays by 1 and resets timer to 3.5s
  // 76 frames of 0.1s simulates 7.6s of elapsed game time
  for (let step = 0; step < 76; step++) {
    driveStore.update(0.1);
  }
  assert.strictEqual(driveStore.furyMultiplier, 9, 'furyMultiplier must decay to 9 on expiration');
  assert.ok(driveStore.furyTimer > 0, 'furyTimer must be set to decay interval');

  // Simulate successive decays down to 1 (9 steps of 3.6s -> 9 * 36 frames)
  for (let step = 0; step < 9 * 36; step++) {
    driveStore.update(0.1);
  }
  assert.strictEqual(driveStore.furyMultiplier, 1, 'furyMultiplier must reach base 1 and never drop below 1');

  // Frontal impact immediately strips fury back to 1
  driveStore.addFury(5);
  assert.ok(driveStore.furyMultiplier > 1, 'Fury is boosted');
  driveStore.handleFrontalImpact();
  assert.strictEqual(driveStore.furyMultiplier, 1, 'Frontal impact must immediately reset furyMultiplier to 1');
  assert.strictEqual(driveStore.furyTimer, 0, 'Frontal impact must clear furyTimer');

  // Source integration checks
  assert.ok(speedometerJsx.includes('furyMultiplier'), 'Speedometer.jsx must display furyMultiplier');
});

// -------------------------------------------------------------
// AC-008: Gradi Autodelta & Albo d'Oro Locale Top 5
// -------------------------------------------------------------
runTest('AC-008', 'Gradi Autodelta & Albo d\'Oro Locale Top 5 (5 score tiers & Top 5 persistent descending leaderboard)', () => {
  // Test DRIVER_RANKS export
  assert.ok(Array.isArray(DRIVER_RANKS), 'DRIVER_RANKS must be an exported array');
  assert.strictEqual(DRIVER_RANKS.length, 5, 'DRIVER_RANKS must contain 5 tier definitions');

  // Test all 5 score brackets
  const t1 = getDriverRank(1000);
  assert.strictEqual(t1.tier, 1);
  assert.strictEqual(t1.title, 'Turista di Abano');

  const t2 = getDriverRank(8000);
  assert.strictEqual(t2.tier, 2);
  assert.strictEqual(t2.title, 'Amante del Bialbero');

  const t3 = getDriverRank(20000);
  assert.strictEqual(t3.tier, 3);
  assert.strictEqual(t3.title, 'Pilota Corsie Veloci');

  const t4 = getDriverRank(50000);
  assert.strictEqual(t4.tier, 4);
  assert.strictEqual(t4.title, 'Collaudatore Autodelta');

  const t5 = getDriverRank(85000);
  assert.strictEqual(t5.tier, 5);
  assert.strictEqual(t5.title, 'Leggenda del Quadrifoglio');

  // Test Top 5 Leaderboard sorting and persistence on crash
  globalThis.localStorage.clear();
  driveStore.leaderboard = [];

  const runScores = [14000, 52000, 24000, 91000, 36000, 7500];
  for (const sc of runScores) {
    driveStore.resetGame('playing');
    driveStore.score = sc;
    driveStore.triggerCrash();
  }

  assert.strictEqual(driveStore.leaderboard.length, 5, 'Leaderboard must contain at most 5 entries');
  const scoresOnly = driveStore.leaderboard.map((e) => e.score);
  const expectedScores = [91000, 52000, 36000, 24000, 14000];
  assert.deepStrictEqual(scoresOnly, expectedScores, 'Leaderboard must be sorted descending with top 5 scores');

  // Verify persistence in localStorage under alfetta_top5_leaderboard
  const savedRaw = globalThis.localStorage.getItem('alfetta_top5_leaderboard');
  assert.ok(savedRaw, 'Leaderboard must be saved to localStorage under "alfetta_top5_leaderboard"');
  const savedParsed = JSON.parse(savedRaw);
  assert.strictEqual(savedParsed.length, 5, 'Saved localStorage leaderboard must have 5 entries');
  assert.strictEqual(savedParsed[0].score, 91000, 'Top score in localStorage must match 1st place');

  // Source integration checks
  assert.ok(speedometerJsx.includes('leaderboard'), 'Speedometer.jsx must display leaderboard');
  assert.ok(speedometerJsx.includes('getDriverRank'), 'Speedometer.jsx must invoke getDriverRank');
});

// -------------------------------------------------------------
// AC-009: HUD Interattivo, 3D StuntRamp & Sintesi Audio
// -------------------------------------------------------------
runTest('AC-009', 'HUD Interattivo, 3D StuntRamp & Sintesi Audio (source symbol & architecture validation)', () => {
  // DriveWorld.jsx contract
  const driveWorldSymbols = ['StuntRamp', 'hitRamp', 'takedownObstacle', 'handleFrontalImpact'];
  for (const sym of driveWorldSymbols) {
    assert.ok(driveWorldJsx.includes(sym), `DriveWorld.jsx must include symbol: "${sym}"`);
  }

  // Speedometer.jsx contract
  const speedometerSymbols = [
    'triggerPerfectShift',
    'activateUltimate',
    'furyMultiplier',
    'armorState',
    'takedownsCount',
    'leaderboard',
  ];
  for (const sym of speedometerSymbols) {
    assert.ok(speedometerJsx.includes(sym), `Speedometer.jsx must include symbol: "${sym}"`);
  }

  // DriveAudio.js contract
  const driveAudioSymbols = [
    'playTakedownSlam',
    'playPerfectShiftBackfire',
    'playRampLaunch',
    'playArmorRepair',
    'playArmorDamage',
  ];
  for (const sym of driveAudioSymbols) {
    assert.ok(driveAudioJs.includes(sym), `DriveAudio.js must include symbol: "${sym}"`);
  }
});

// -------------------------------------------------------------
// Test Summary & Exit Code
// -------------------------------------------------------------
console.log('\n------------------------------------------------------------');
console.log(`TOTAL TESTS:  ${totalTests}`);
console.log(`PASSED:       \x1b[32m${passedTests}\x1b[0m`);
console.log(`FAILED:       ${failedTests > 0 ? `\x1b[31m${failedTests}\x1b[0m` : '0'}`);
console.log('------------------------------------------------------------\n');

if (failedTests > 0) {
  console.error(`❌ Verification failed with ${failedTests} failure(s).`);
  process.exit(1);
} else {
  console.log('🎉 All Acceptance Criteria AC-001 through AC-009 satisfied successfully!\n');
  process.exit(0);
}
