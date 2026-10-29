#!/usr/bin/env node

/**
 * Alfa Romeo Alfetta GTV (1976) — Transaxle Gearbox Console & Autodelta Tachometer
 * Automated Verification Script validating Acceptance Criteria AC-001 through AC-010.
 *
 * Spec: docs/superpowers/specs/2026-10-29-alfa-gearbox-console-ui-design.md
 * Acceptance: docs/superpowers/acceptance/2026-10-29-alfa-gearbox-console-ui.md
 *
 * Requirements:
 * - Uses Node.js built-in fs, path, assert, and child_process modules.
 * - Imports driveStore and gearbox constants from ../src/components/drive/driveStore.js.
 * - Headless mocks for window, localStorage, and performance.
 * - Deterministic execution of gear progression, perfect shift, limiter assist, overdrive, and impact downshift.
 * - AST/source contract assertions on AlfaGearboxConsole.jsx, Speedometer.jsx, and index.css.
 * - Full regression test run across other verification suites and production build.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { execSync } from 'child_process';
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
// Import driveStore and Gearbox Constants
// -------------------------------------------------------------
const {
  driveStore,
  GEAR_BANDS,
  GEAR_ACCEL,
  RPM_IDLE,
  RPM_SHIFT_GOOD,
  RPM_SHIFT_PERFECT,
  RPM_LIMITER,
  RPM_MAX,
  OVERDRIVE_BONUS_KMH,
  OVERDRIVE_DURATION,
} = await import('../src/components/drive/driveStore.js');

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
console.log('🏎️ ALFA ROMEO ALFETTA GTV (1976) — TRANSAXLE GEARBOX CONSOLE');
console.log('   Validating Acceptance Criteria AC-001 through AC-010');
console.log('============================================================\n');

// -------------------------------------------------------------
// AC-001 — Costanti & Reset
// -------------------------------------------------------------
runTest('AC-001', 'Costanti & Reset (GEAR_BANDS 5 bande, GEAR_ACCEL, soglie RPM, OVERDRIVE_DURATION, resetGame playing)', () => {
  // Validate exported GEAR_BANDS
  assert.ok(Array.isArray(GEAR_BANDS), 'GEAR_BANDS must be an exported array');
  assert.strictEqual(GEAR_BANDS.length, 6, 'GEAR_BANDS must contain 6 elements (index 0 null + 5 forward gears)');
  assert.strictEqual(GEAR_BANDS[0], null, 'GEAR_BANDS[0] must be null');
  assert.deepStrictEqual(GEAR_BANDS[1], { min: 0, max: 76 }, '1ª marcia must span 0..76 km/h');
  assert.deepStrictEqual(GEAR_BANDS[2], { min: 65, max: 102 }, '2ª marcia must span 65..102 km/h');
  assert.deepStrictEqual(GEAR_BANDS[3], { min: 88, max: 128 }, '3ª marcia must span 88..128 km/h');
  assert.deepStrictEqual(GEAR_BANDS[4], { min: 112, max: 154 }, '4ª marcia must span 112..154 km/h');
  assert.deepStrictEqual(GEAR_BANDS[5], { min: 138, max: 195 }, '5ª marcia must span 138..195 km/h');

  // Validate exported acceleration and RPM constants
  assert.deepStrictEqual(GEAR_ACCEL, [0, 26, 20, 15, 11, 8], 'GEAR_ACCEL must match spec acceleration rates');
  assert.strictEqual(RPM_IDLE, 1500, 'RPM_IDLE must be 1500');
  assert.strictEqual(RPM_SHIFT_GOOD, 4200, 'RPM_SHIFT_GOOD must be 4200');
  assert.strictEqual(RPM_SHIFT_PERFECT, 5200, 'RPM_SHIFT_PERFECT must be 5200');
  assert.strictEqual(RPM_LIMITER, 6500, 'RPM_LIMITER must be 6500');
  assert.strictEqual(RPM_MAX, 7000, 'RPM_MAX must be 7000');
  assert.strictEqual(OVERDRIVE_BONUS_KMH, 20, 'OVERDRIVE_BONUS_KMH must be 20');
  assert.strictEqual(OVERDRIVE_DURATION, 3.5, 'OVERDRIVE_DURATION must be 3.5');

  // Validate resetGame('playing') initial state
  driveStore.resetGame('playing');
  assert.strictEqual(driveStore.gear, 1, 'resetGame("playing") must start in gear 1');
  assert.strictEqual(driveStore.rpm, 1500, 'resetGame("playing") must start at RPM_IDLE 1500');
  assert.strictEqual(driveStore.speedKmh, 40, 'resetGame("playing") must start at speedKmh 40');
  assert.strictEqual(driveStore.overdriveTimer, 0, 'resetGame("playing") must reset overdriveTimer to 0');
  assert.strictEqual(driveStore.limiterTimer, 0, 'resetGame("playing") must reset limiterTimer to 0');
  assert.strictEqual(driveStore.shiftFeedback, null, 'resetGame("playing") must reset shiftFeedback to null');
});

// -------------------------------------------------------------
// AC-002 — Progressione reale in marcia
// -------------------------------------------------------------
runTest('AC-002', 'Progressione reale in marcia (6s in 1ª: marcia resta 1, velocità <= 76+3, RPM > 5200, shiftWindowActive aperta)', () => {
  driveStore.resetGame('playing');
  driveStore.obstacles = [];
  driveStore.nextSpawnZ = 999999; // isolate from track spawns
  driveStore.gear = 1;

  // Simulate update(1/60) for 6 seconds (360 frames), keeping limiterTimer at 0 to isolate in-gear behavior
  for (let step = 0; step < 360; step++) {
    driveStore.obstacles = [];
    driveStore.limiterTimer = 0;
    driveStore.update(1 / 60);
  }

  assert.strictEqual(driveStore.gear, 1, 'Gear must remain 1 throughout 6s simulation without shifting');
  assert.ok(
    driveStore.speedKmh <= 76 + 3,
    `speedKmh must not exceed 1st gear ceiling + 3 (expected <= 79, got ${driveStore.speedKmh})`
  );
  assert.ok(
    driveStore.speedKmh >= 70,
    `speedKmh must have accelerated close to 1st gear ceiling 76 (got ${driveStore.speedKmh})`
  );
  assert.ok(
    driveStore.rpm > 5200,
    `RPM must rise above 5200 (RPM_SHIFT_PERFECT) under load (got ${driveStore.rpm})`
  );
  assert.strictEqual(
    driveStore.shiftWindowActive,
    true,
    'shiftWindowActive must open when RPM >= 5200 with no cooldown'
  );
});

// -------------------------------------------------------------
// AC-003 — Doppietta perfetta
// -------------------------------------------------------------
runTest('AC-003', 'Doppietta perfetta (shiftWindowActive in 2ª: gear 3, speed +25 cap 215, perfectShiftsCount+1, flash, feedback, cooldown)', () => {
  driveStore.resetGame('playing');
  driveStore.gear = 2;
  driveStore.speedKmh = 80;
  driveStore.shiftWindowActive = true;
  driveStore.shiftCooldown = 0;

  const initialShifts = driveStore.perfectShiftsCount;
  const initialSpeed = driveStore.speedKmh;

  const result = driveStore.triggerPerfectShift();
  assert.strictEqual(result, true, 'triggerPerfectShift must return true on perfect shift');
  assert.strictEqual(driveStore.gear, 3, 'Gear must advance from 2 to 3');
  assert.strictEqual(driveStore.speedKmh, initialSpeed + 25, 'speedKmh must increase by +25');
  assert.strictEqual(driveStore.perfectShiftsCount, initialShifts + 1, 'perfectShiftsCount must increment by 1');
  assert.strictEqual(driveStore.shiftFlashTimer, 0.55, 'shiftFlashTimer must be set to 0.55s');
  assert.ok(driveStore.shiftFeedback !== null, 'shiftFeedback must be present');
  assert.strictEqual(driveStore.shiftFeedback.quality, 'perfect', 'shiftFeedback quality must be "perfect"');
  assert.ok(driveStore.shiftCooldown > 0, 'shiftCooldown must be initiated');
  assert.strictEqual(driveStore.shiftWindowActive, false, 'shiftWindowActive must close immediately after shift');

  // Verify speed cap at 215 km/h
  driveStore.gear = 2;
  driveStore.speedKmh = 205;
  driveStore.shiftWindowActive = true;
  driveStore.shiftCooldown = 0;
  driveStore.triggerPerfectShift();
  assert.strictEqual(driveStore.speedKmh, 215, 'speedKmh must cap strictly at 215 km/h');
});

// -------------------------------------------------------------
// AC-004 — Cambiata buona & rifiuto
// -------------------------------------------------------------
runTest('AC-004', 'Cambiata buona & rifiuto (rpm=4600 in 2ª: buona gear 3 senza perfectCount; rpm=3000: rifiuto; resetGame: rifiuto)', () => {
  driveStore.resetGame('playing');
  driveStore.gear = 2;
  driveStore.rpm = 4600;
  driveStore.shiftWindowActive = false;
  driveStore.shiftCooldown = 0;

  const initialShifts = driveStore.perfectShiftsCount;
  const initialSpeed = driveStore.speedKmh;

  // Good shift execution
  const resGood = driveStore.triggerPerfectShift();
  assert.strictEqual(resGood, true, 'triggerPerfectShift must return true for good shift at 4600 RPM');
  assert.strictEqual(driveStore.gear, 3, 'Gear must advance from 2 to 3 on good shift');
  assert.strictEqual(driveStore.speedKmh, initialSpeed + 10, 'speedKmh must increase by +10 on good shift');
  assert.ok(driveStore.shiftFeedback !== null, 'shiftFeedback must be present');
  assert.strictEqual(driveStore.shiftFeedback.quality, 'good', 'shiftFeedback quality must be "good"');
  assert.strictEqual(driveStore.perfectShiftsCount, initialShifts, 'perfectShiftsCount must remain unchanged on good shift');

  // Low RPM rejection
  driveStore.gear = 3;
  driveStore.rpm = 3000;
  driveStore.shiftWindowActive = false;
  driveStore.shiftCooldown = 0;
  const resLow = driveStore.triggerPerfectShift();
  assert.strictEqual(resLow, false, 'triggerPerfectShift must return false when RPM < 4200 (RPM_SHIFT_GOOD)');
  assert.strictEqual(driveStore.gear, 3, 'Gear must remain unchanged on rejected shift');

  // Fresh reset rejection (shiftWindowActive = false, rpm = 1500)
  driveStore.resetGame('playing');
  assert.strictEqual(driveStore.shiftWindowActive, false, 'shiftWindowActive must be false upon reset');
  const resReset = driveStore.triggerPerfectShift();
  assert.strictEqual(resReset, false, 'triggerPerfectShift must return false right after reset');
  assert.strictEqual(driveStore.gear, 1, 'Gear must remain 1 after rejected shift');
});

// -------------------------------------------------------------
// AC-005 — Limitatore & assistenza
// -------------------------------------------------------------
runTest('AC-005', 'Limitatore & assistenza (in 1ª con velocità al tetto e rpm>=6500 per >3s: upshift a 2, feedback "auto", no perfect count)', () => {
  driveStore.resetGame('playing');
  driveStore.obstacles = [];
  driveStore.nextSpawnZ = 999999;
  driveStore.gear = 1;
  driveStore.speedKmh = 76;
  driveStore.rpm = 6500;
  driveStore.limiterTimer = 0;

  const initialShifts = driveStore.perfectShiftsCount;

  // Simulate update(1/60) for 3.2 seconds (192 frames) maintaining ceiling speed
  for (let step = 0; step < 192; step++) {
    driveStore.obstacles = [];
    driveStore.speedKmh = 76;
    driveStore.update(1 / 60);
  }

  assert.strictEqual(driveStore.gear, 2, 'Assisted upshift must advance gear to 2 after >3.0s on limiter');
  assert.ok(driveStore.shiftFeedback !== null, 'shiftFeedback must be present after assisted upshift');
  assert.strictEqual(driveStore.shiftFeedback.quality, 'auto', 'shiftFeedback quality must be "auto"');
  assert.strictEqual(
    driveStore.perfectShiftsCount,
    initialShifts,
    'perfectShiftsCount must NOT increment on assisted upshift'
  );
});

// -------------------------------------------------------------
// AC-006 — Overdrive Autodelta in 5ª
// -------------------------------------------------------------
runTest('AC-006', 'Overdrive Autodelta in 5ª (shiftWindowActive in 5ª: gear 5, overdriveTimer=3.5s, feedback "overdrive", window bloccata)', () => {
  driveStore.resetGame('playing');
  driveStore.gear = 5;
  driveStore.speedKmh = 160;
  driveStore.shiftWindowActive = true;
  driveStore.shiftCooldown = 0;

  const result = driveStore.triggerPerfectShift();
  assert.strictEqual(result, true, 'triggerPerfectShift must succeed in 5th gear');
  assert.strictEqual(driveStore.gear, 5, 'Gear must remain 5 in overdrive');
  assert.strictEqual(driveStore.overdriveTimer, 3.5, 'overdriveTimer must be set to OVERDRIVE_DURATION (3.5s)');
  assert.ok(driveStore.shiftFeedback !== null, 'shiftFeedback must be present');
  assert.strictEqual(driveStore.shiftFeedback.quality, 'overdrive', 'shiftFeedback quality must be "overdrive"');

  // Verify that during active overdrive, shiftWindowActive stays false even with high RPM
  driveStore.gear = 5;
  driveStore.speedKmh = 160;
  driveStore.rpm = 6800;
  driveStore.shiftCooldown = 0;
  driveStore.obstacles = [];
  driveStore.update(1 / 60);

  assert.strictEqual(driveStore.gear, 5, 'Gear must remain 5');
  assert.strictEqual(driveStore.shiftWindowActive, false, 'shiftWindowActive must remain false during active overdrive');
  assert.ok(driveStore.overdriveTimer > 0, 'overdriveTimer must remain active');
});

// -------------------------------------------------------------
// AC-007 — Scalata da impatto
// -------------------------------------------------------------
runTest('AC-007', 'Scalata da impatto (paraurti intact in 4ª: handleFrontalImpact -> damaged, gear 2, overdriveTimer 0)', () => {
  driveStore.resetGame('playing');
  driveStore.armorState = 'intact';
  driveStore.gear = 4;
  driveStore.overdriveTimer = 2.5;

  const res = driveStore.handleFrontalImpact('test_impact_obstacle');
  assert.strictEqual(res, 'damaged', 'handleFrontalImpact must return "damaged" when armor was intact');
  assert.strictEqual(driveStore.armorState, 'damaged', 'armorState must transition to "damaged"');
  assert.strictEqual(driveStore.gear, 2, 'Gear must downshift by 2 (from 4 to 2)');
  assert.strictEqual(driveStore.overdriveTimer, 0, 'overdriveTimer must be cleared to 0 on impact');
});

// -------------------------------------------------------------
// AC-008 — Componente UI
// -------------------------------------------------------------
runTest('AC-008', 'Componente UI (AlfaGearboxConsole.jsx con griglia ad H SVG 1-5+R, pomello mogano cubic-bezier, tachimetro ZONA DOPPIETTA, tamburo OD, feedback, onShift, aria-label, e index.css keyframes)', () => {
  const consoleJsx = readFile('src/components/drive/AlfaGearboxConsole.jsx');
  const indexCss = readFile('src/index.css');

  // AlfaGearboxConsole.jsx contracts
  assert.ok(consoleJsx.includes('<svg'), 'AlfaGearboxConsole.jsx must render SVG element for H-gate');
  for (const label of ['1ª', '2ª', '3ª', '4ª', '5ª', 'R']) {
    assert.ok(consoleJsx.includes(label), `AlfaGearboxConsole.jsx must include gear label "${label}"`);
  }
  assert.ok(consoleJsx.includes('cubic-bezier'), 'AlfaGearboxConsole.jsx must use cubic-bezier transition for shift knob');
  assert.ok(consoleJsx.includes('transition'), 'AlfaGearboxConsole.jsx must have transition style on knob group');
  assert.ok(consoleJsx.includes('ZONA DOPPIETTA'), 'AlfaGearboxConsole.jsx must label "ZONA DOPPIETTA" on segmented tachometer');
  assert.ok(consoleJsx.includes('OD'), 'AlfaGearboxConsole.jsx must display "OD" indicator');
  assert.ok(consoleJsx.includes('shiftFeedback'), 'AlfaGearboxConsole.jsx must render shiftFeedback badge');
  assert.ok(consoleJsx.includes('onShift'), 'AlfaGearboxConsole.jsx must accept and trigger onShift handler');
  assert.ok(consoleJsx.includes('aria-label'), 'AlfaGearboxConsole.jsx must provide aria-label for accessibility');

  // src/index.css contracts
  assert.ok(indexCss.includes('gear-knob-shake'), 'src/index.css must define gear-knob-shake keyframe and utility');
  assert.ok(indexCss.includes('gear-limiter-flash'), 'src/index.css must define gear-limiter-flash keyframe and utility');
});

// -------------------------------------------------------------
// AC-009 — Integrazione HUD
// -------------------------------------------------------------
runTest('AC-009', 'Integrazione HUD (Speedometer.jsx importa e monta <AlfaGearboxConsole, passa onShift->triggerPerfectShift, legge overdriveTimer/shiftFeedback, no vecchio bottone, no eventBanner)', () => {
  const speedometerJsx = readFile('src/components/drive/Speedometer.jsx');

  assert.ok(
    speedometerJsx.includes('AlfaGearboxConsole'),
    'Speedometer.jsx must import AlfaGearboxConsole'
  );
  assert.ok(
    speedometerJsx.includes('<AlfaGearboxConsole'),
    'Speedometer.jsx must render <AlfaGearboxConsole component'
  );
  assert.ok(
    speedometerJsx.includes('triggerPerfectShift'),
    'Speedometer.jsx must wire onShift to driveStore.triggerPerfectShift'
  );
  assert.ok(
    speedometerJsx.includes('overdriveTimer'),
    'Speedometer.jsx must read overdriveTimer state from driveStore'
  );
  assert.ok(
    speedometerJsx.includes('shiftFeedback'),
    'Speedometer.jsx must read shiftFeedback state from driveStore'
  );
  assert.ok(
    !speedometerJsx.includes('⚡ CAMBIA! ({gear}ª →'),
    'Speedometer.jsx must NOT include the old textual CAMBIA button'
  );
  assert.ok(
    !speedometerJsx.includes('eventBanner'),
    'Speedometer.jsx must NOT reintroduce eventBanner'
  );
});

// -------------------------------------------------------------
// AC-010 — Regressioni
// -------------------------------------------------------------
runTest('AC-010', 'Regressioni (verify_diegetic_vfx.js, verify_burnout_gameplay.js, verify_mobile_experience.js e npm run build passano)', () => {
  const env = { ...process.env };

  const diegeticOut = execSync('node scripts/verify_diegetic_vfx.js', { cwd: rootDir, stdio: 'pipe', env }).toString();
  assert.ok(
    diegeticOut.includes('All Acceptance Criteria AC-001 through AC-006 satisfied successfully'),
    'verify_diegetic_vfx.js must pass AC-001..AC-006'
  );

  const burnoutOut = execSync('node scripts/verify_burnout_gameplay.js', { cwd: rootDir, stdio: 'pipe', env }).toString();
  assert.ok(
    burnoutOut.includes('All Acceptance Criteria AC-001 through AC-009 satisfied successfully'),
    'verify_burnout_gameplay.js must pass AC-001..AC-009'
  );

  const mobileOut = execSync('node scripts/verify_mobile_experience.js', { cwd: rootDir, stdio: 'pipe', env }).toString();
  assert.ok(
    mobileOut.includes('All Acceptance Criteria AC-001 through AC-013 satisfied successfully'),
    'verify_mobile_experience.js must pass AC-001..AC-013'
  );

  const buildOut = execSync('npm run build', { cwd: rootDir, stdio: 'pipe', env }).toString();
  assert.ok(
    buildOut.includes('built in') || buildOut.includes('dist/index.html'),
    'npm run build must succeed and produce production assets'
  );
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
  console.log('🎉 All Acceptance Criteria AC-001 through AC-010 satisfied successfully!\n');
  process.exit(0);
}
