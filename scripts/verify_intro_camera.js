#!/usr/bin/env node

/**
 * PS2 Need for Speed Style Intro Motion Camera Automated Verification Script
 * Validates AC-001 through AC-006 for Alfa Romeo Alfetta GTV (1976)
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
// Import driveStore and Constants
// -------------------------------------------------------------
const {
  driveStore,
  INTRO_CAM_DURATION,
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
      const lines = err.stack.split('\n').slice(1, 3).join('\n');
      console.log(`    \x1b[90m${lines}\x1b[0m`);
    }
  }
}

console.log('\n============================================================');
console.log('🎬 ALFA ROMEO ALFETTA GTV — PS2 NFS INTRO MOTION CAMERA');
console.log('   Validating Acceptance Criteria AC-001 through AC-006');
console.log('============================================================\n');

// -------------------------------------------------------------
// AC-001: Costanti & Metodi Store
// -------------------------------------------------------------
runTest('AC-001', 'Costanti & Metodi Store (INTRO_CAM_DURATION, triggerIntroCam, skipIntroCam, resetGame)', () => {
  assert.strictEqual(typeof INTRO_CAM_DURATION, 'number', 'INTRO_CAM_DURATION must be an exported number');
  assert.strictEqual(INTRO_CAM_DURATION, 2.6, 'INTRO_CAM_DURATION must equal 2.6 seconds');

  driveStore.resetGame('playing');
  assert.strictEqual(driveStore.introCamTimer, 0, 'resetGame("playing") must reset introCamTimer to 0');

  driveStore.triggerIntroCam();
  assert.strictEqual(driveStore.introCamTimer, 2.6, 'triggerIntroCam must set introCamTimer to 2.6');

  driveStore.skipIntroCam();
  assert.strictEqual(driveStore.introCamTimer, 0, 'skipIntroCam must immediately clear introCamTimer to 0');
});

// -------------------------------------------------------------
// AC-002: Attivazione Manche
// -------------------------------------------------------------
runTest('AC-002', 'Attivazione Manche (startRaceWithDriver avvia manche e attiva introCamTimer = 2.6)', () => {
  driveStore.resetGame('selecting');
  assert.strictEqual(driveStore.introCamTimer, 0);

  driveStore.startRaceWithDriver('tex');
  assert.strictEqual(driveStore.gameState, 'playing', 'gameState must be playing');
  assert.strictEqual(driveStore.selectedDriver, 'tex', 'selectedDriver must be tex');
  assert.strictEqual(driveStore.introCamTimer, 2.6, 'startRaceWithDriver must start introCamTimer at 2.6s');
});

// -------------------------------------------------------------
// AC-003: Decremento & Conclusione
// -------------------------------------------------------------
runTest('AC-003', 'Decremento & Conclusione (update realDt decrementa il timer fino a 0; skipIntroCam azzera)', () => {
  driveStore.startRaceWithDriver('elvis');
  assert.strictEqual(driveStore.introCamTimer, 2.6);

  // Advance 1.0 second (60 frames at dt=1/60)
  for (let i = 0; i < 60; i++) {
    driveStore.update(1 / 60);
  }
  assert.ok(
    driveStore.introCamTimer < 1.7 && driveStore.introCamTimer > 1.5,
    `introCamTimer must decrement by ~1.0s (expected ~1.6, got ${driveStore.introCamTimer})`
  );

  // Advance remaining 1.8 seconds (110 frames)
  for (let i = 0; i < 110; i++) {
    driveStore.update(1 / 60);
  }
  assert.strictEqual(driveStore.introCamTimer, 0, 'introCamTimer must reach exactly 0 after full duration');

  // Verify skip during active timer
  driveStore.triggerIntroCam();
  assert.strictEqual(driveStore.introCamTimer, 2.6);
  driveStore.skipIntroCam();
  assert.strictEqual(driveStore.introCamTimer, 0, 'skipIntroCam must immediately bring introCamTimer to 0');
});

// -------------------------------------------------------------
// AC-004: Regia Telecamera 3D (DriveCameraDirector.jsx)
// -------------------------------------------------------------
runTest('AC-004', 'Regia Telecamera 3D (DriveCameraDirector.jsx implementa traiettoria ad arco, FOV e Dutch angle)', () => {
  const cameraJsx = readFile('src/components/drive/DriveCameraDirector.jsx');

  assert.ok(
    cameraJsx.includes('INTRO_CAM_DURATION'),
    'DriveCameraDirector.jsx must reference INTRO_CAM_DURATION'
  );
  assert.ok(
    cameraJsx.includes('introCamTimer'),
    'DriveCameraDirector.jsx must check driveStore.introCamTimer'
  );
  assert.ok(
    cameraJsx.includes('isIntroActiveRef'),
    'DriveCameraDirector.jsx must track intro active state for initial snap'
  );
  assert.ok(
    cameraJsx.includes('camera.up.set'),
    'DriveCameraDirector.jsx must apply dynamic Dutch angle roll via camera.up.set'
  );
  assert.ok(
    cameraJsx.includes('introZ') || cameraJsx.includes('introX'),
    'DriveCameraDirector.jsx must calculate parametric intro camera position'
  );
});

// -------------------------------------------------------------
// AC-005: HUD & Riprova (Speedometer.jsx)
// -------------------------------------------------------------
runTest('AC-005', 'HUD & Riprova (Speedometer.jsx implementa letterbox cinemascope, skip tap/spazio e triggerIntroCam su Riprova)', () => {
  const speedometerJsx = readFile('src/components/drive/Speedometer.jsx');

  assert.ok(
    speedometerJsx.includes('introCamActive'),
    'Speedometer.jsx must track introCamActive state'
  );
  assert.ok(
    speedometerJsx.includes('skipIntroCam'),
    'Speedometer.jsx must allow skipping intro with skipIntroCam'
  );
  assert.ok(
    speedometerJsx.includes('triggerIntroCam'),
    'Speedometer.jsx must trigger intro camera on retry / gameover restart'
  );
  assert.ok(
    speedometerJsx.includes('AUTODELTA CORSE'),
    'Speedometer.jsx must render cinematic letterbox text'
  );
});

// -------------------------------------------------------------
// AC-006: Regressioni & Build
// -------------------------------------------------------------
runTest('AC-006', 'Regressioni & Build (tutte le 5 suite esistenti e npm run build passano)', () => {
  const suites = [
    'verify_pilot_ultimates.js',
    'verify_gearbox_console.js',
    'verify_burnout_gameplay.js',
    'verify_diegetic_vfx.js',
    'verify_mobile_experience.js',
  ];

  for (const s of suites) {
    try {
      execSync(`node scripts/${s}`, { stdio: 'pipe', cwd: rootDir });
    } catch (err) {
      assert.fail(`Sub-suite ${s} failed: ${err.message}`);
    }
  }

  try {
    execSync('npm run build', { stdio: 'pipe', cwd: rootDir });
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
  console.log('🎉 All Acceptance Criteria AC-001 through AC-006 satisfied successfully!\n');
}
