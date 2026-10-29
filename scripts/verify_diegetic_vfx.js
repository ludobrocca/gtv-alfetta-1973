#!/usr/bin/env node

/**
 * Diegetic 3D Powerup VFX & Banner-Free HUD Automated Verification Script
 * Validates AC-001 through AC-006 for Alfa Romeo Alfetta GTV (1976)
 *
 * Requirements:
 * - Uses Node.js built-in fs, path, and assert modules.
 * - Imports driveStore from ../src/components/drive/driveStore.js with headless mocks.
 * - Deterministically executes and asserts live VFX timers on driveStore.
 * - Verifies AST/source contract requirements in Speedometer.jsx, CarPowerupVFX.jsx,
 *   CarViewer.jsx, and DriveWorld.jsx.
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
    mockedTime += 16.6;
    return mockedTime;
  },
};

// Import driveStore
const { driveStore } = await import('../src/components/drive/driveStore.js');
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
console.log('✨ ALFA ROMEO ALFETTA GTV — DIEGETIC 3D VFX & BANNER-FREE HUD');
console.log('   Validating Acceptance Criteria AC-001 through AC-006');
console.log('============================================================\n');

// Load source files under test
const speedometerJsx = readFile('src/components/drive/Speedometer.jsx');
const carPowerupVfxJsx = readFile('src/components/drive/CarPowerupVFX.jsx');
const carViewerJsx = readFile('src/components/CarViewer.jsx');
const driveWorldJsx = readFile('src/components/drive/DriveWorld.jsx');
const driveStoreJs = readFile('src/components/drive/driveStore.js');

// -------------------------------------------------------------
// AC-001: Rimozione Banner HUD e Box Rettangolari Testuali
// -------------------------------------------------------------
runTest('AC-001', 'Rimozione Banner HUD e Box Testuali (liberazione orizzonte stradale)', () => {
  // Prohibited intrusive banner elements in Speedometer.jsx
  const prohibitedStrings = [
    'eventBanner.title',
    'eventBanner.subtitle',
    'TEX WILLER • INVULNERABILE!',
    'ELVIS • ROCK',
    'SCIA AERODINAMICA ATTIVA',
  ];

  for (const s of prohibitedStrings) {
    assert.ok(
      !speedometerJsx.includes(s),
      `Speedometer.jsx must NOT contain intrusive banner text: "${s}"`
    );
  }

  // Verify that the old central banner block is gone
  assert.ok(
    !speedometerJsx.includes('eventBanner.color'),
    'Speedometer.jsx must not render eventBanner styling blocks'
  );
  assert.ok(
    !speedometerJsx.includes('activeElvis > 0'),
    'Speedometer.jsx must not render rectangular power-up card for Elvis'
  );
  assert.ok(
    !speedometerJsx.includes('activeTex > 0'),
    'Speedometer.jsx must not render rectangular power-up card for Tex'
  );
});

// -------------------------------------------------------------
// AC-002: Anello Timer SVG Veglia Borletti Diegetico
// -------------------------------------------------------------
runTest('AC-002', 'Anello Timer SVG Veglia Borletti (strokeDash, activePowerup, warning blink <= 1.5s)', () => {
  // Must compute active powerup from all 7 drivers
  assert.ok(speedometerJsx.includes('powerupList'), 'Speedometer.jsx must define powerupList');
  assert.ok(speedometerJsx.includes('activePowerup'), 'Speedometer.jsx must compute activePowerup');

  // Must render diegetic SVG timer ring around Veglia Borletti bezel
  assert.ok(speedometerJsx.includes('strokeDasharray'), 'Speedometer.jsx must use SVG strokeDasharray');
  assert.ok(speedometerJsx.includes('strokeDashoffset'), 'Speedometer.jsx must use SVG strokeDashoffset');

  // Warning blink condition at <= 1.5s
  assert.ok(
    speedometerJsx.includes('1.5') && speedometerJsx.includes('isExpiringSoon'),
    'Speedometer.jsx must detect when active power-up is expiring (<= 1.5s)'
  );
  assert.ok(
    speedometerJsx.includes('animate-pulse'),
    'Speedometer.jsx must trigger animate-pulse warning blink when expiring soon'
  );

  // Top bezel badge with driver icon and numeric countdown
  assert.ok(
    speedometerJsx.includes('activePowerup.icon'),
    'Speedometer.jsx must display driver power-up icon on bezel badge'
  );
  assert.ok(
    speedometerJsx.includes('.toFixed(1)') && speedometerJsx.includes('{activePowerup.time.toFixed(1)}s'),
    'Speedometer.jsx must render remaining seconds formatted to 1 decimal place'
  );
});

// -------------------------------------------------------------
// AC-003: Componente 3D CarPowerupVFX.jsx & Integrazione CarViewer.jsx
// -------------------------------------------------------------
runTest('AC-003', 'Componente 3D CarPowerupVFX.jsx & Montaggio in CarViewer.jsx', () => {
  // File existence check
  assert.ok(
    fs.existsSync(path.join(rootDir, 'src/components/drive/CarPowerupVFX.jsx')),
    'CarPowerupVFX.jsx must exist at src/components/drive/CarPowerupVFX.jsx'
  );

  // CarViewer mounting check
  assert.ok(
    carViewerJsx.includes("import { CarPowerupVFX } from './drive/CarPowerupVFX"),
    'CarViewer.jsx must import CarPowerupVFX'
  );
  assert.ok(
    carViewerJsx.includes("<CarPowerupVFX />") || carViewerJsx.includes("<CarPowerupVFX/>"),
    'CarViewer.jsx must render <CarPowerupVFX />'
  );

  // Driver 3D Groups in CarPowerupVFX.jsx:
  // 1. Elvis (Musical notes + afterburners)
  assert.ok(carPowerupVfxJsx.includes('MusicalNote'), 'CarPowerupVFX.jsx must implement MusicalNote 3D geometry');
  assert.ok(carPowerupVfxJsx.includes('elvisGroupRef'), 'CarPowerupVFX.jsx must have elvisGroupRef');
  assert.ok(carPowerupVfxJsx.includes('elvisNotesRef'), 'CarPowerupVFX.jsx must animate 3D musical notes scia');
  assert.ok(carPowerupVfxJsx.includes('elvisFlamesRef'), 'CarPowerupVFX.jsx must render Elvis afterburners');

  // 2. Tex (Battering ram wedge + rotating 5-point ranger star)
  assert.ok(carPowerupVfxJsx.includes('texGroupRef'), 'CarPowerupVFX.jsx must have texGroupRef');
  assert.ok(carPowerupVfxJsx.includes('starShape'), 'CarPowerupVFX.jsx must construct starShape geometry');
  assert.ok(carPowerupVfxJsx.includes('texStarRef'), 'CarPowerupVFX.jsx must rotate texStarRef');

  // 3. Bond (Radar rings + ice-blue afterburners)
  assert.ok(carPowerupVfxJsx.includes('bondGroupRef'), 'CarPowerupVFX.jsx must have bondGroupRef');
  assert.ok(carPowerupVfxJsx.includes('bondRingsRef'), 'CarPowerupVFX.jsx must expand concentric radar rings');

  // 4. MG (Golden crown with gems floating above the roof)
  assert.ok(carPowerupVfxJsx.includes('mgGroupRef'), 'CarPowerupVFX.jsx must have mgGroupRef');
  assert.ok(carPowerupVfxJsx.includes('mgCrownRef'), 'CarPowerupVFX.jsx must float and rotate mgCrownRef above car roof');
});

// -------------------------------------------------------------
// AC-004: Ragnatele 3D Spider-Man e Mirino/.44 Magnum Callaghan
// -------------------------------------------------------------
runTest('AC-004', 'Ragnatele 3D SpiderWebTether in DriveWorld & Laser/.44 Magnum in CarPowerupVFX', () => {
  // Spider-Man dynamic 3D web tethers in DriveWorld.jsx
  assert.ok(
    driveWorldJsx.includes('function SpiderWebTether') || driveWorldJsx.includes('SpiderWebTether ='),
    'DriveWorld.jsx must define SpiderWebTether component'
  );
  assert.ok(
    driveWorldJsx.includes('<SpiderWebTether'),
    'DriveWorld.jsx must render <SpiderWebTether /> connecting car to coins'
  );
  assert.ok(
    driveWorldJsx.includes('isWebMagnet'),
    'DriveWorld.jsx must condition web tethers on isWebMagnet'
  );

  // Callaghan laser sight and .44 Magnum muzzle flash / ballistic tracer in CarPowerupVFX.jsx
  assert.ok(carPowerupVfxJsx.includes('callaghanGroupRef'), 'CarPowerupVFX.jsx must have callaghanGroupRef');
  assert.ok(carPowerupVfxJsx.includes('callaghanMuzzleRef'), 'CarPowerupVFX.jsx must render callaghanMuzzleRef');
  assert.ok(carPowerupVfxJsx.includes('callaghanTracerRef'), 'CarPowerupVFX.jsx must render callaghanTracerRef');
  assert.ok(carPowerupVfxJsx.includes('magnumShotTimer'), 'CarPowerupVFX.jsx must trigger shots from magnumShotTimer');
  assert.ok(carPowerupVfxJsx.includes('magnumTargetZ'), 'CarPowerupVFX.jsx must scale tracer to magnumTargetZ');
});

// -------------------------------------------------------------
// AC-005: Ghost Cloak Diabolik in CarViewer.jsx (Modulazione Opacità Scocca)
// -------------------------------------------------------------
runTest('AC-005', 'Ghost Cloak Diabolik in CarViewer.jsx (opacity 0.42 / transparent / emissive)', () => {
  // Verify detection of Diabolik ghost state
  assert.ok(
    carViewerJsx.includes('isDiabolikGhost'),
    'CarViewer.jsx must define isDiabolikGhost condition'
  );
  assert.ok(
    carViewerJsx.includes('activePowerups.diabolik'),
    'CarViewer.jsx must check activePowerups.diabolik'
  );

  // Verify material modulation
  assert.ok(
    carViewerJsx.includes('transparent = isDiabolikGhost'),
    'CarViewer.jsx must set transparent on car paint material'
  );
  assert.ok(
    carViewerJsx.includes('0.42'),
    'CarViewer.jsx must modulate car paint opacity to 0.42 during Diabolik Ghost'
  );
  assert.ok(
    carViewerJsx.includes('#0284c7'),
    'CarViewer.jsx must set cyan emissive glow during Diabolik Ghost'
  );
});

// -------------------------------------------------------------
// AC-006: Timer VFX Live su driveStore & Rendering Stati Meccanici
// -------------------------------------------------------------
runTest('AC-006', 'Timer VFX Live su driveStore & Rendering Stati Meccanici in CarPowerupVFX', () => {
  // Part A: Live execution on driveStore
  driveStore.resetGame('playing');

  // 1. triggerPerfectShift()
  driveStore.shiftWindowActive = true;
  const shiftSuccess = driveStore.triggerPerfectShift();
  assert.strictEqual(shiftSuccess, true, 'triggerPerfectShift must succeed');
  assert.ok(driveStore.shiftFlashTimer > 0, 'triggerPerfectShift must set shiftFlashTimer > 0');
  assert.strictEqual(driveStore.shiftFlashTimer, 0.55, 'shiftFlashTimer must equal 0.55s');

  // 2. takedownObstacle()
  driveStore.obstacles = [{ id: 'obs_test_1', lane: 0, z: 4.0, active: true }];
  driveStore.takedownObstacle('obs_test_1', 1);
  assert.ok(driveStore.takedownSparkTimer > 0, 'takedownObstacle must set takedownSparkTimer > 0');
  assert.strictEqual(driveStore.takedownSparkTimer, 0.50, 'takedownSparkTimer must equal 0.50s');
  assert.strictEqual(driveStore.takedownSparkSide, 1, 'takedownSparkSide must match direction');

  // 3. takedownObstacle() 3rd takedown when damaged sets repairFlashTimer
  driveStore.armorState = 'damaged';
  driveStore.repairProgress = 2;
  driveStore.obstacles = [{ id: 'obs_test_repair', lane: 0, z: 3.0, active: true }];
  driveStore.takedownObstacle('obs_test_repair', -1);
  assert.strictEqual(driveStore.armorState, 'intact', '3rd takedown must repair armor to intact');
  assert.strictEqual(driveStore.repairProgress, 0, 'repairProgress must reset to 0');
  assert.strictEqual(driveStore.repairFlashTimer, 0.85, '3rd takedown repair must set repairFlashTimer to 0.85s');
  assert.strictEqual(driveStore.takedownSparkSide, -1, 'takedownSparkSide must match direction -1');

  // 4. hitRamp() when damaged sets repairFlashTimer
  driveStore.armorState = 'damaged';
  driveStore.repairProgress = 1;
  driveStore.repairFlashTimer = 0;
  driveStore.obstacles = [{ id: 'ramp_test_1', type: 'ramp', lane: 0, z: 2.0, active: true }];
  driveStore.hitRamp('ramp_test_1');
  assert.strictEqual(driveStore.armorState, 'intact', 'hitRamp must restore armor to intact');
  assert.strictEqual(driveStore.repairFlashTimer, 0.85, 'hitRamp when damaged must set repairFlashTimer to 0.85s');

  // 5. smashObstacle(..., 'magnum') sets magnumShotTimer
  driveStore.obstacles = [{ id: 'obs_magnum_1', lane: 0, z: 9.5, active: true }];
  driveStore.smashObstacle('obs_magnum_1', 'magnum');
  assert.ok(driveStore.magnumShotTimer > 0, 'smashObstacle(magnum) must set magnumShotTimer > 0');
  assert.strictEqual(driveStore.magnumTargetZ, 9.5, 'magnumTargetZ must store target obstacle z');

  // 6. update(0.2) decrements timers
  driveStore.shiftFlashTimer = 0.55;
  driveStore.takedownSparkTimer = 0.50;
  driveStore.repairFlashTimer = 0.85;
  driveStore.magnumShotTimer = 0.38;

  const prevShift = driveStore.shiftFlashTimer;
  const prevTakedown = driveStore.takedownSparkTimer;
  const prevRepair = driveStore.repairFlashTimer;
  const prevMagnum = driveStore.magnumShotTimer;

  // In driveStore.update(delta), dt is clamped by Math.min(delta, 0.1)
  driveStore.update(0.2);

  assert.ok(driveStore.shiftFlashTimer < prevShift, 'update(0.2) must decrement shiftFlashTimer');
  assert.ok(driveStore.takedownSparkTimer < prevTakedown, 'update(0.2) must decrement takedownSparkTimer');
  assert.ok(driveStore.repairFlashTimer < prevRepair, 'update(0.2) must decrement repairFlashTimer');
  assert.ok(driveStore.magnumShotTimer < prevMagnum, 'update(0.2) must decrement magnumShotTimer');
  assert.strictEqual(Number(driveStore.shiftFlashTimer.toFixed(2)), 0.45, 'shiftFlashTimer decrements by clamped dt 0.1');

  // Clamping to 0 after subsequent updates
  for (let i = 0; i < 15; i++) {
    driveStore.update(0.1);
  }
  assert.strictEqual(driveStore.shiftFlashTimer, 0, 'shiftFlashTimer must clamp to 0');
  assert.strictEqual(driveStore.takedownSparkTimer, 0, 'takedownSparkTimer must clamp to 0');
  assert.strictEqual(driveStore.repairFlashTimer, 0, 'repairFlashTimer must clamp to 0');
  assert.strictEqual(driveStore.magnumShotTimer, 0, 'magnumShotTimer must clamp to 0');

  // Part B: Mechanical states rendering in CarPowerupVFX.jsx
  // 1. Hood smoke & sparks when armorState === 'damaged'
  assert.ok(carPowerupVfxJsx.includes("armorState === 'damaged'"), 'CarPowerupVFX.jsx must check armorState damaged');
  assert.ok(carPowerupVfxJsx.includes('damagedSmokeRef'), 'CarPowerupVFX.jsx must animate hood smoke puffs');
  assert.ok(carPowerupVfxJsx.includes('damagedGroupRef'), 'CarPowerupVFX.jsx must define damagedGroupRef');

  // 2. Repair wave when repairFlashTimer > 0
  assert.ok(carPowerupVfxJsx.includes('repairRingRef'), 'CarPowerupVFX.jsx must render repair scanning ring');
  assert.ok(carPowerupVfxJsx.includes('repairFlashTimer'), 'CarPowerupVFX.jsx must monitor repairFlashTimer');

  // 3. Wind ribbons when isDrafting === true
  assert.ok(carPowerupVfxJsx.includes('isDrafting'), 'CarPowerupVFX.jsx must check isDrafting');
  assert.ok(carPowerupVfxJsx.includes('draftingRibbonsRef'), 'CarPowerupVFX.jsx must render aerodynamic wind ribbons');
  assert.ok(carPowerupVfxJsx.includes('draftingGroupRef'), 'CarPowerupVFX.jsx must define draftingGroupRef');

  // 4. Exhaust doppietta backfire flash when shiftFlashTimer > 0
  assert.ok(carPowerupVfxJsx.includes('shiftFlashRef'), 'CarPowerupVFX.jsx must render shiftFlashRef');
  assert.ok(carPowerupVfxJsx.includes('shiftFlashTimer'), 'CarPowerupVFX.jsx must animate shiftFlashTimer');

  // 5. Side sparks on collision when takedownSparkTimer > 0
  assert.ok(carPowerupVfxJsx.includes('takedownSparksRef'), 'CarPowerupVFX.jsx must render takedownSparksRef');
  assert.ok(carPowerupVfxJsx.includes('takedownSparkListRef'), 'CarPowerupVFX.jsx must animate spark particles');
  assert.ok(carPowerupVfxJsx.includes('takedownSparkSide'), 'CarPowerupVFX.jsx must offset sparks on takedownSparkSide');
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
  console.log('🎉 All Acceptance Criteria AC-001 through AC-006 satisfied successfully!\n');
  process.exit(0);
}
