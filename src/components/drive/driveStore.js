// Real-time driving state store for the 1973 Alfa Romeo Alfetta GTV
// Provides high-performance per-frame physics access for useFrame loops
// and pure 3-lane Subway Surfers endless runner mechanics (fair, visual, no blind turn deaths).

import { driveAudio } from './DriveAudio';

export const LANE_WIDTH = 1.35; // Lateral distance between lanes
const BASE_SPEED = 68;          // Normal cruise speed in km/h
const ELVIS_SPEED = 175;        // Elvis / 007 Rock'n'Roll nitro speed

// In Three.js with camera at -Z looking toward +Z, +X is Screen-LEFT and -X is Screen-RIGHT.
// Mapping lane (-1 = Left, 0 = Center, +1 = Right) to -lane * LANE_WIDTH makes Left = Left and Right = Right!
export function laneToX(lane) {
  return -lane * LANE_WIDTH;
}

export const SCENIC_ZONES = [
  { id: 'colli', name: 'Colli Euganei • Abano Terme', icon: '⛰️' },
  { id: 'galleria', name: 'Galleria Alpina • Eco Bialbero', icon: '🚇' },
  { id: 'riviera', name: 'Lungolago • Riviera del Tramonto', icon: '🌅' },
];

class DriveStore {
  constructor() {
    this.mode = 'showroom'; // 'showroom' | 'drive'
    this.speedKmh = 0;       // Current speed in km/h
    this.cruiseSpeed = null; // null = manual, number = cruise
    this.throttle = 0;
    this.brake = 0;
    this.rpm = 950;
    this.gear = 1;
    this.wheelRotation = 0;
    this.distanceMeters = 0;
    this.roadOffset = 0;
    this.soundEnabled = false;
    this.headlightsOn = false;
    this.cameraMode = 'chase';
    this.userInteracting = false;
    this.lastUserInteraction = 0;

    // --- Minigame 3-Lane Endless Runner State ---
    this.selectedDriver = 'elvis'; // 'elvis' | 'tex' | 'bond' | 'spiderman' | 'diabolik' | 'callaghan' | 'mg'
    this.gameState = 'selecting';  // 'selecting' | 'playing' | 'gameover'
    this.targetLane = 0;        // -1: Left, 0: Center, 1: Right
    this.carX = 0;              // Continuous lateral position (+X = Left, -X = Right)
    this.carY = 0;              // Road elevation at car Z=0
    this.airY = 0;              // Hill crest jump height above road
    this.verticalVel = 0;       // Jump vertical velocity
    this.carPitch = 0;          // Uphill / downhill pitch angle (radians)
    this.prevSlope = 0;         // Previous frame slope for crest jump detection
    this.carRoll = 0;           // Body roll / suspension banking (radians)
    this.carYaw = 0;            // Steering / drift angle (radians)
    this.skidTimer = 0;         // Oil slick traction loss timer
    this.boostTimer = 0;        // Near-miss / jump micro-turbo timer

    // Near-Miss Combo & Arcade Event Callout Banner
    this.nearMissCombo = 0;
    this.nearMissTimer = 0;
    this.eventBanner = null;    // { id, title, subtitle, color, timer }
    this.currentZoneIndex = 0;

    // Scoring & Personal Best
    this.score = 0;
    this.coinsCollected = 0;
    this.bestScore = 0;
    try {
      const saved = localStorage.getItem('alfetta_personal_best');
      this.bestScore = saved ? parseInt(saved, 10) || 0 : 0;
    } catch (_) {
      this.bestScore = 0;
    }

    // Active Power-ups (duration in seconds)
    this.activePowerups = {
      tex: 0,       // Invulnerability golden shield & smash
      elvis: 0,     // Rock'n'Roll super speed nitro 2X
      bond: 0,      // 007 Q-Branch Shield + Speed + Coin Magnet
      spiderman: 0, // Web Magnet (pulls coins from all 3 lanes)
      diabolik: 0,  // Stealth Ghost Cloak (phase through obstacles + 3x coins)
      callaghan: 0, // .44 Magnum Auto-Blast (destroys obstacles ahead)
    };

    // Dynamic Objects on Track
    this.obstacles = [];   // Array<{ id, type: 'fiat500'|'barrier'|'oil', lane, z, active, nearMissed }>
    this.coins = [];       // Array<{ id, lane, xOverride, z, active }>
    this.powerups = [];    // Array<{ id, type, lane, z, active }>
    this.nextSpawnZ = 20;

    // Gear ratios
    this.gearMaxSpeeds = [0, 48, 85, 125, 165, 200];
    this.listeners = new Set();
  }

  // Smooth procedural elevation function for rolling Italian hills (salite, dossi e discese)
  getRoadElevation(localZ = 0) {
    const wZ = this.roadOffset + localZ;
    // Gentle warmup for first 12 units so start is level, then smooth rolling hills
    const warmup = Math.min(1, Math.max(0, (this.roadOffset + Math.max(0, localZ)) / 25));
    const primaryHill = Math.sin(wZ * 0.042) * 1.35;
    const secondaryRoll = Math.cos(wZ * 0.095) * 0.55;
    const crestDetail = Math.sin(wZ * 0.16) * 0.18;
    return warmup * (primaryHill + secondaryRoll + crestDetail);
  }

  // Derivative dY/dZ for accurate car & obstacle pitch on uphill/downhill slopes
  getRoadSlope(localZ = 0) {
    const eps = 0.5;
    const yAhead = this.getRoadElevation(localZ + eps);
    const yBehind = this.getRoadElevation(localZ - eps);
    return (yAhead - yBehind) / (2 * eps);
  }

  getCurrentZone() {
    return SCENIC_ZONES[this.currentZoneIndex] || SCENIC_ZONES[0];
  }

  triggerEventBanner(title, subtitle, color = 'amber') {
    this.eventBanner = {
      id: Date.now() + Math.random(),
      title,
      subtitle,
      color,
      timer: 1.85,
    };
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this);
    }
  }

  setMode(mode) {
    if (this.mode === mode) return;
    this.mode = mode;
    if (mode === 'drive') {
      this.resetGame('selecting');
      this.headlightsOn = true;
    } else {
      this.cruiseSpeed = null;
    }
    this.notify();
  }

  selectDriver(driverId) {
    this.selectedDriver = driverId;
    this.notify();
  }

  openDriverSelect() {
    this.gameState = 'selecting';
    this.speedKmh = 0;
    this.notify();
  }

  startRaceWithDriver(driverId) {
    if (driverId) {
      this.selectedDriver = driverId;
    }
    if (!this.userExplicitlyMuted) {
      this.soundEnabled = true;
      driveAudio.setMuted(false);
    }
    this.resetGame('playing');
  }

  resetGame(initialState = 'playing') {
    this.gameState = initialState;
    this.targetLane = 0;
    this.carX = 0;
    this.carY = 0;
    this.airY = 0;
    this.verticalVel = 0;
    this.carPitch = 0;
    this.prevSlope = 0;
    this.carRoll = 0;
    this.carYaw = 0;
    this.skidTimer = 0;
    this.boostTimer = 0;
    this.nearMissCombo = 0;
    this.nearMissTimer = 0;
    this.eventBanner = null;
    this.currentZoneIndex = 0;
    this.speedKmh = initialState === 'playing' ? BASE_SPEED : 0;
    this.score = 0;
    this.coinsCollected = 0;
    this.distanceMeters = 0;
    this.roadOffset = 0;
    Object.keys(this.activePowerups).forEach((k) => {
      this.activePowerups[k] = 0;
    });
    this.obstacles = [];
    this.coins = [];
    this.powerups = [];
    this.nextSpawnZ = 18;

    // Easter Egg MG: Pre-populate continuous oil slicks across all 3 lanes right from the start!
    if (initialState === 'playing' && this.selectedDriver === 'mg') {
      for (let z = 14; z <= 50; z += 7.5) {
        [-1, 0, 1].forEach((lane, idx) => {
          this.obstacles.push({
            id: `mg_init_oil_${z}_${lane}`,
            type: 'oil',
            lane,
            z: z + (idx % 2) * 1.8,
            active: true,
          });
        });
      }
    }

    this.notify();
  }

  // Lane Change: -1 for Left, +1 for Right (non-inverted!)
  changeLane(direction) {
    if (this.gameState !== 'playing') return;
    const newLane = Math.max(-1, Math.min(1, this.targetLane + direction));
    if (newLane !== this.targetLane) {
      // Check for "Sfioro da Brivido" (last-second lane switch right in front of an obstacle in the old lane!)
      const oldLane = this.targetLane;
      const closeObstacle = this.obstacles.find(
        (o) =>
          o.active &&
          o.type !== 'oil' &&
          !o.nearMissed &&
          o.lane === oldLane &&
          o.z > 0.8 &&
          o.z < 9.5
      );
      if (closeObstacle) {
        closeObstacle.nearMissed = true;
        this.nearMissCombo = Math.min(5, this.nearMissCombo + 1);
        this.nearMissTimer = 4.0;
        this.boostTimer = 1.1;
        const pts = 250 * this.nearMissCombo;
        this.score += pts;
        this.triggerEventBanner(
          `⚡ SFIORO DA BRIVIDO ${this.nearMissCombo > 1 ? `x${this.nearMissCombo}` : ''}!`,
          `+${pts} PT • SCIA TURBO GTV`,
          'cyan'
        );
        driveAudio.playNearMissWhoosh();
      }

      this.targetLane = newLane;
      this.rpmBlip = 280;
      // Trigger realistic body roll & steering yaw into the chosen direction
      this.carRoll = direction * 0.12;
      this.carYaw = -direction * 0.11;
      this.notify();
    }
  }

  // Crash into vehicle or barrier (Game Over occurs ONLY here!)
  triggerCrash() {
    if (this.gameState === 'gameover') return;
    this.gameState = 'gameover';
    this.speedKmh = 0;
    Object.keys(this.activePowerups).forEach((k) => {
      this.activePowerups[k] = 0;
    });

    // Check personal best
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      try {
        localStorage.setItem('alfetta_personal_best', String(this.bestScore));
      } catch (_) {}
    }

    driveAudio.playCrash();
    this.notify();
  }

  // Collect gold coin / quadrifoglio
  collectCoin(id) {
    const coin = this.coins.find((c) => c.id === id);
    if (coin && coin.active) {
      coin.active = false;
      this.coinsCollected++;
      const multiplier =
        this.activePowerups.diabolik > 0
          ? 3
          : this.activePowerups.elvis > 0 || this.activePowerups.bond > 0
          ? 2
          : 1;
      this.score += 50 * multiplier;
      driveAudio.playCoinPickup();
      this.notify();
    }
  }

  // Collect Driver-Themed Power-up
  collectPowerup(id) {
    const item = this.powerups.find((p) => p.id === id);
    if (!item || !item.active) return;
    item.active = false;

    const pType = item.type;
    if (pType === 'tex') {
      this.activePowerups.tex = 6.5;
      this.triggerEventBanner('🤠 TEX WILLER • SCUDO RANGER!', 'Travolgi ogni ostacolo +150 PT', 'amber');
      driveAudio.playTexShield();
    } else if (pType === 'elvis') {
      this.activePowerups.elvis = 6.5;
      this.triggerEventBanner("🎸 ELVIS • ROCK'N'ROLL NITRO 2X!", '175 km/h & Punti Doppi', 'fuchsia');
      driveAudio.playElvisRockabilly(6.0);
    } else if (pType === 'bond') {
      this.activePowerups.bond = 6.5;
      this.triggerEventBanner('🍸 007 Q-BRANCH • LICENZA DI SORPASSO!', 'Scudo + Calamita Monete + Turbo', 'amber');
      driveAudio.playBondSpyChord();
    } else if (pType === 'spiderman') {
      this.activePowerups.spiderman = 7.0;
      this.triggerEventBanner('🕸️ UOMO RAGNO • RAGNATELA MAGNETICA!', 'Cattura tutte le monete in pista', 'rose');
      driveAudio.playSpidermanThwip();
    } else if (pType === 'diabolik') {
      this.activePowerups.diabolik = 6.5;
      this.triggerEventBanner('💎 DIABOLIK • FUGA INVISIBILE 3X!', 'Attraversa gli ostacoli + Monete 3X', 'cyan');
      driveAudio.playDiabolikStealth();
    } else if (pType === 'callaghan') {
      this.activePowerups.callaghan = 6.5;
      this.triggerEventBanner('🔫 CALLAGHAN • .44 MAGNUM IN AZIONE!', 'Polverizza i blocchi davanti (+200 PT)', 'amber');
      driveAudio.playMagnumShot();
    }
    this.notify();
  }

  // Smash an obstacle while Invulnerability / .44 Magnum / 007 is active
  smashObstacle(id, reason = 'smash') {
    const obs = this.obstacles.find((o) => o.id === id);
    if (obs && obs.active) {
      obs.active = false;
      const pts = reason === 'magnum' ? 200 : 150;
      this.score += pts;
      if (reason === 'magnum') {
        this.triggerEventBanner('💥 COLPO .44 MAGNUM!', `+${pts} PT • BERSAGLIO ELIMINATO`, 'amber');
        driveAudio.playMagnumShot();
      } else {
        driveAudio.playSmash();
      }
      this.notify();
    }
  }

  // Hit oil slick
  hitOilSlick(id) {
    const obs = this.obstacles.find((o) => o.id === id);
    if (obs && obs.active) {
      obs.active = false;
      this.skidTimer = 0.85;
      // Slide laterally into adjacent lane
      if (this.targetLane === 0) {
        this.targetLane = Math.random() > 0.5 ? 1 : -1;
      } else {
        this.targetLane = 0;
      }
      // Easter Egg MG: Turning oil slicks into bonus points ("Regina del Drift!")
      if (this.selectedDriver === 'mg') {
        this.score += 150;
        this.triggerEventBanner('🛢️ CONTROSTERZO MG!', '+150 PT • REGINA DEL DRIFT SULL’OLIO', 'teal');
      }
      driveAudio.playSkid();
      this.notify();
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.userExplicitlyMuted = !this.soundEnabled;
    driveAudio.setMuted(!this.soundEnabled);
    this.notify();
    return this.soundEnabled;
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    this.notify();
  }

  setThrottle(val) {
    this.throttle = Math.max(0, Math.min(1, val));
  }

  setBrake(val) {
    this.brake = Math.max(0, Math.min(1, val));
  }

  markUserInteraction() {
    this.userInteracting = true;
    this.lastUserInteraction = performance.now();
  }

  // 60fps RequestAnimationFrame Loop
  update(delta) {
    const dt = Math.min(delta, 0.1);

    if (this.mode !== 'drive') {
      if (this.speedKmh > 0) {
        this.speedKmh = Math.max(0, this.speedKmh - 45.0 * dt);
      }
      this.rpm = 0;
      return;
    }

    if (this.gameState === 'selecting') {
      this.speedKmh = 0;
      this.rpm = 950;
      return;
    }

    if (this.gameState === 'gameover') {
      this.speedKmh = Math.max(0, this.speedKmh - 120 * dt);
      return;
    }

    // 1. Target Speed & Acceleration
    const isNitro = this.activePowerups.elvis > 0 || this.activePowerups.bond > 0;
    let targetSpeed = BASE_SPEED;
    if (isNitro) {
      targetSpeed = ELVIS_SPEED;
    } else {
      const ramp = Math.min(58, this.distanceMeters * 0.038);
      targetSpeed = BASE_SPEED + ramp + (this.boostTimer > 0 ? 22 : 0);
    }

    const accelRate = isNitro || this.boostTimer > 0 ? 85.0 : 28.0;
    if (this.speedKmh < targetSpeed) {
      this.speedKmh = Math.min(targetSpeed, this.speedKmh + accelRate * dt);
    } else if (this.speedKmh > targetSpeed) {
      this.speedKmh = Math.max(targetSpeed, this.speedKmh - 32.0 * dt);
    }

    if (this.boostTimer > 0) {
      this.boostTimer = Math.max(0, this.boostTimer - dt);
    }

    // 2. Non-Inverted Lateral Movement (+X = Left, -X = Right)
    const targetX = laneToX(this.targetLane);
    const steerSpeed = this.skidTimer > 0 ? 4.8 : 9.5;
    this.carX += (targetX - this.carX) * Math.min(1, steerSpeed * dt);

    // Lateral roll & yaw damping
    this.carRoll *= Math.pow(0.06, dt);
    if (this.skidTimer > 0) {
      this.skidTimer -= dt;
      this.carYaw = Math.sin(performance.now() * 0.022) * 0.18;
    } else {
      this.carYaw *= Math.pow(0.04, dt);
    }

    // 3. Timers (Power-ups, Near-Miss Combo, Banner)
    Object.keys(this.activePowerups).forEach((k) => {
      if (this.activePowerups[k] > 0) {
        this.activePowerups[k] = Math.max(0, this.activePowerups[k] - dt);
      }
    });
    if (this.nearMissTimer > 0) {
      this.nearMissTimer = Math.max(0, this.nearMissTimer - dt);
      if (this.nearMissTimer === 0) this.nearMissCombo = 0;
    }
    if (this.eventBanner && this.eventBanner.timer > 0) {
      this.eventBanner.timer = Math.max(0, this.eventBanner.timer - dt);
      if (this.eventBanner.timer === 0) this.eventBanner = null;
    }

    // 4. Distance, Odometer & Scenic Zone Progression
    const speedMps = (this.speedKmh * 1000) / 3600;
    const unitsPerSec = speedMps / 2.22;
    const distUnits = unitsPerSec * dt;

    this.roadOffset += distUnits;
    this.distanceMeters += speedMps * dt;

    // Scenic Zone transition every 420 meters
    const newZoneIndex = Math.floor(this.distanceMeters / 420) % SCENIC_ZONES.length;
    if (newZoneIndex !== this.currentZoneIndex) {
      this.currentZoneIndex = newZoneIndex;
      const zObj = SCENIC_ZONES[newZoneIndex];
      this.triggerEventBanner(`${zObj.icon} ${zObj.name.toUpperCase()}`, 'NUOVO TRATTO PANORAMICO', 'emerald');
    }

    // 5. Rolling Hills Elevation & "Salto del Crinale" (Hill Crest Jump)
    this.carY = this.getRoadElevation(0);
    const currentSlope = this.getRoadSlope(0);

    // Detect cresting a steep hill at speed: slope drops rapidly from positive uphill to downhill
    const slopeDrop = this.prevSlope - currentSlope;
    if (this.airY <= 0.001 && slopeDrop > 0.014 && this.speedKmh > 78 && this.roadOffset > 35) {
      this.verticalVel = Math.min(3.4, 1.9 + (this.speedKmh / 160) * 1.2);
      this.airY = 0.02;
      this.boostTimer = Math.max(this.boostTimer, 1.2);
      this.score += 300;
      this.triggerEventBanner('🦅 SALTO DEL CRINALE!', '+300 PT • VOLO ALFETTA GTV', 'amber');
      driveAudio.playJumpTakeoff();
    }
    this.prevSlope = currentSlope;

    if (this.airY > 0 || this.verticalVel > 0) {
      this.airY += this.verticalVel * dt;
      this.verticalVel -= 7.8 * dt; // Arcade gravity
      if (this.airY <= 0) {
        this.airY = 0;
        this.verticalVel = 0;
      }
    }

    // Pitch follows road slope + slight nose-up in air
    const targetPitch = -Math.atan(currentSlope) + (this.airY > 0 ? this.verticalVel * 0.045 : 0);
    this.carPitch += (targetPitch - this.carPitch) * Math.min(1, 10.0 * dt);

    // Score accumulation
    const scoreMultiplier = isNitro ? 2 : 1;
    this.score += Math.round(speedMps * dt * scoreMultiplier);

    // Wheel rotation
    const R_TIRE = 0.168;
    this.wheelRotation += distUnits / R_TIRE;

    // 6. Spawn Generation along Z
    this.updateSpawns(distUnits, dt);

    // 7. Authentic 5-Speed Transaxle Gearbox RPM, Shift Clutch Dip & Engine Load
    const prevGear = this.gear || 1;
    let newGear = 5;
    // Gear thresholds: [0, 52, 78, 102, 128, 200] so the car shifts through gears during normal cruise & ramps!
    const shiftPoints = [0, 52, 76, 98, 124, 210];
    for (let g = 1; g <= 5; g++) {
      if (this.speedKmh <= shiftPoints[g] || g === 5) {
        newGear = g;
        break;
      }
    }
    if (newGear !== prevGear) {
      this.gear = newGear;
      this.shiftTimer = 0.24; // 240ms clutch disengagement & overrun burble
      if (newGear > prevGear) {
        driveAudio.playGearShiftPop();
      }
    }

    if (this.shiftTimer > 0) {
      this.shiftTimer = Math.max(0, this.shiftTimer - dt);
    }
    if (this.rpmBlip > 0) {
      this.rpmBlip = Math.max(0, this.rpmBlip - 950 * dt);
    }

    // Map speed within current gear band to realistic Bialbero RPM (3100 -> 6100 RPM)
    const gMin = shiftPoints[this.gear - 1] * 0.72;
    const gMax = shiftPoints[this.gear];
    const inGearRatio = Math.max(0, Math.min(1, (this.speedKmh - gMin) / Math.max(10, gMax - gMin)));
    const targetRpm =
      (this.shiftTimer > 0 ? 3150 : 2850 + inGearRatio * 3150) +
      (this.airY > 0.04 ? 420 : 0) +
      (this.rpmBlip || 0);
    this.rpm = (this.rpm || 950) + (targetRpm - (this.rpm || 950)) * Math.min(1, 14.0 * dt);

    // Engine load (0.25 cruise -> 1.0 uphill climb / nitro / acceleration)
    const uphillLoad = Math.max(0, currentSlope * 6.5);
    const accelLoad = this.speedKmh < targetSpeed - 1.5 ? 0.35 : 0.0;
    this.engineLoad = Math.min(
      1.0,
      0.32 + uphillLoad + accelLoad + (isNitro || this.boostTimer > 0 ? 0.45 : 0)
    );
  }

  // Spawns obstacles, coins, and power-ups ahead of the car
  updateSpawns(distUnits, dt = 0.016) {
    const isMagnet = this.activePowerups.spiderman > 0 || this.activePowerups.bond > 0;
    const isMagnum = this.activePowerups.callaghan > 0;

    // Scroll existing entities towards car (-Z relative motion)
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      const prevZ = obs.z;

      if (obs.type === 'fiat500') {
        const fiatRelDist = distUnits * 0.45;
        obs.z -= distUnits - fiatRelDist;
      } else {
        obs.z -= distUnits;
      }

      // Callaghan .44 Magnum auto-blast on obstacles ahead in the car's lane or adjacent
      if (isMagnum && obs.active && obs.type !== 'oil' && obs.z > 2.5 && obs.z < 18.0 && obs.lane === this.targetLane) {
        this.smashObstacle(obs.id, 'magnum');
      }

      // High-speed close pass ("Sfioro di Scia") when overtaking a Fiat 500 in an adjacent lane
      if (
        obs.active &&
        obs.type === 'fiat500' &&
        !obs.nearMissed &&
        prevZ >= 0 &&
        obs.z < 0 &&
        Math.abs(obs.lane - this.targetLane) === 1 &&
        this.speedKmh > 80
      ) {
        obs.nearMissed = true;
        this.nearMissCombo = Math.min(5, this.nearMissCombo + 1);
        this.nearMissTimer = 3.5;
        const pts = 150 * this.nearMissCombo;
        this.score += pts;
        this.triggerEventBanner(
          `💨 SORPASSO A FILO ${this.nearMissCombo > 1 ? `x${this.nearMissCombo}` : ''}!`,
          `+${pts} PT • SCIA AERODINAMICA`,
          'cyan'
        );
        driveAudio.playNearMissWhoosh();
      }

      if (obs.z < -10) {
        this.obstacles.splice(i, 1);
      }
    }

    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.z -= distUnits;

      // Spider-Man Web Magnet / 007 Q-Magnet pulls nearby coins across lanes directly to the car!
      if (isMagnet && coin.active && coin.z > -1.0 && coin.z < 16.0) {
        const curX = coin.xOverride !== undefined ? coin.xOverride : laneToX(coin.lane);
        coin.xOverride = curX + (this.carX - curX) * Math.min(1, 11.0 * dt);
      }

      if (coin.z < -10) {
        this.coins.splice(i, 1);
      }
    }

    for (let i = this.powerups.length - 1; i >= 0; i--) {
      this.powerups[i].z -= distUnits;
      if (this.powerups[i].z < -10) {
        this.powerups.splice(i, 1);
      }
    }

    // Decrement spawn countdown
    this.nextSpawnZ -= distUnits;
    if (this.nextSpawnZ <= 0) {
      this.nextSpawnZ = 17 + Math.random() * 11;
      this.spawnEntityPack();
    }
  }

  spawnEntityPack() {
    const lanes = [-1, 0, 1];
    const spawnZ = 58;
    const roll = Math.random();

    if (roll < 0.45) {
      // 1. Obstacle + Coins in alternate lanes
      const obsLane = lanes[Math.floor(Math.random() * lanes.length)];
      const freeLanes = lanes.filter((l) => l !== obsLane);
      const coinLane = freeLanes[Math.floor(Math.random() * freeLanes.length)];

      const obsType = Math.random() > 0.45 ? 'fiat500' : 'barrier';
      this.obstacles.push({
        id: `obs_${Date.now()}_${Math.random()}`,
        type: obsType,
        lane: obsLane,
        z: spawnZ,
        active: true,
      });

      for (let k = 0; k < 3; k++) {
        this.coins.push({
          id: `coin_${Date.now()}_${k}_${Math.random()}`,
          lane: coinLane,
          z: spawnZ + k * 3.5,
          active: true,
        });
      }
    } else if (roll < 0.70) {
      // 2. Oil Slick + Fiat in another lane
      const oilLane = lanes[Math.floor(Math.random() * lanes.length)];
      this.obstacles.push({
        id: `oil_${Date.now()}`,
        type: 'oil',
        lane: oilLane,
        z: spawnZ,
        active: true,
      });

      const freeLanes = lanes.filter((l) => l !== oilLane);
      const fiatLane = freeLanes[Math.floor(Math.random() * freeLanes.length)];
      this.obstacles.push({
        id: `fiat_${Date.now()}`,
        type: 'fiat500',
        lane: fiatLane,
        z: spawnZ + 8,
        active: true,
      });
    } else if (roll < 0.89) {
      // 3. Driver-Themed Power-up (70% chance for current driver's signature gadget!)
      const pLane = lanes[Math.floor(Math.random() * lanes.length)];
      const allPowerups = ['elvis', 'tex', 'bond', 'spiderman', 'diabolik', 'callaghan'];
      const driverPref = allPowerups.includes(this.selectedDriver)
        ? this.selectedDriver
        : allPowerups[Math.floor(Math.random() * allPowerups.length)];
      const pType =
        Math.random() < 0.72
          ? driverPref
          : allPowerups[Math.floor(Math.random() * allPowerups.length)];

      this.powerups.push({
        id: `pow_${Date.now()}_${Math.random()}`,
        type: pType,
        lane: pLane,
        z: spawnZ,
        active: true,
      });
    } else {
      // 4. Pure Coin Highway (2 lanes of gold coins)
      const chosenLanes = [lanes[0], lanes[2]];
      chosenLanes.forEach((l) => {
        for (let k = 0; k < 4; k++) {
          this.coins.push({
            id: `coin_${Date.now()}_${l}_${k}`,
            lane: l,
            z: spawnZ + k * 3.0,
            active: true,
          });
        }
      });
    }

    // Easter Egg MG ("Maria Grazia"): Every lane continuously has oil slicks!
    if (this.selectedDriver === 'mg') {
      const zOffsets = [-5, 1, 7, 13];
      for (const dz of zOffsets) {
        const zOil = spawnZ + dz;
        for (const lane of lanes) {
          const hasCloseObstacle = this.obstacles.some(
            (o) => o.lane === lane && Math.abs(o.z - zOil) < 3.8
          );
          if (!hasCloseObstacle) {
            this.obstacles.push({
              id: `mg_oil_${Date.now()}_${lane}_${dz}_${Math.random()}`,
              type: 'oil',
              lane,
              z: zOil,
              active: true,
            });
          }
        }
      }
    }
  }
}

export const driveStore = new DriveStore();
