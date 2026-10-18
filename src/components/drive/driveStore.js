// Real-time driving state store for the 1973 Alfa Romeo Alfetta GTV
// Provides high-performance per-frame physics access for useFrame loops
// and pure 3-lane Subway Surfers endless runner mechanics (fair, visual, no blind turn deaths).

import { driveAudio } from './DriveAudio';

const LANE_WIDTH = 1.35; // Lateral distance between lanes (-1.35, 0, +1.35)
const BASE_SPEED = 65;   // Normal cruise speed in km/h
const ELVIS_SPEED = 175; // Elvis Rock'n'Roll nitro speed

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
    this.gameState = 'playing'; // 'playing' | 'gameover'
    this.targetLane = 0;        // -1: Left, 0: Center, 1: Right
    this.carX = 0;              // Continuous lateral position
    this.carRoll = 0;           // Body roll / suspension banking (radians)
    this.carYaw = 0;            // Drift angle (radians)
    this.skidTimer = 0;         // Oil slick traction loss timer

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
      tex: 0,   // Invulnerability golden shield
      elvis: 0, // Rock'n'Roll super speed nitro
    };

    // Dynamic Objects on Track
    // Items are tracked by distance relative to car (spawn at z = +55 ahead, despawn behind at z = -8)
    this.obstacles = [];   // Array<{ id, type: 'fiat500'|'barrier'|'oil', lane, z, active, width }>
    this.coins = [];       // Array<{ id, lane, z, active }>
    this.powerups = [];    // Array<{ id, type: 'tex'|'elvis', lane, z, active }>
    this.nextSpawnZ = 20;  // Z distance ahead to spawn next pack

    // Gear ratios
    this.gearMaxSpeeds = [0, 48, 85, 125, 165, 200];
    this.listeners = new Set();
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
      this.resetGame();
      this.headlightsOn = true;
    } else {
      this.cruiseSpeed = null;
    }
    this.notify();
  }

  resetGame() {
    this.gameState = 'playing';
    this.targetLane = 0;
    this.carX = 0;
    this.carRoll = 0;
    this.carYaw = 0;
    this.skidTimer = 0;
    this.speedKmh = BASE_SPEED;
    this.score = 0;
    this.coinsCollected = 0;
    this.distanceMeters = 0;
    this.roadOffset = 0;
    this.activePowerups.tex = 0;
    this.activePowerups.elvis = 0;
    this.obstacles = [];
    this.coins = [];
    this.powerups = [];
    this.nextSpawnZ = 22;
    this.notify();
  }

  // Lane Change: -1 for left, +1 for right
  changeLane(direction) {
    if (this.gameState !== 'playing') return;
    const newLane = Math.max(-1, Math.min(1, this.targetLane + direction));
    if (newLane !== this.targetLane) {
      this.targetLane = newLane;
      // Trigger dynamic body roll into lane shift
      this.carRoll = -direction * 0.12;
      this.notify();
    }
  }

  // Crash into vehicle or barrier (Game Over occurs ONLY here!)
  triggerCrash() {
    if (this.gameState === 'gameover') return;
    this.gameState = 'gameover';
    this.speedKmh = 0;
    this.activePowerups.tex = 0;
    this.activePowerups.elvis = 0;

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
      const multiplier = this.activePowerups.elvis > 0 ? 2 : 1;
      this.score += 50 * multiplier;
      driveAudio.playCoinPickup();
      this.notify();
    }
  }

  // Collect Tex Willer or Elvis Presley power-up
  collectPowerup(id) {
    const item = this.powerups.find((p) => p.id === id);
    if (!item || !item.active) return;
    item.active = false;

    if (item.type === 'tex') {
      this.activePowerups.tex = 6.0; // 6 seconds invulnerability
      driveAudio.playTexShield();
    } else if (item.type === 'elvis') {
      this.activePowerups.elvis = 6.0; // 6 seconds Rock'n'Roll super speed
      driveAudio.playElvisRockabilly(6.0);
    }
    this.notify();
  }

  // Smash an obstacle while Tex invulnerability is active
  smashObstacle(id) {
    const obs = this.obstacles.find((o) => o.id === id);
    if (obs && obs.active) {
      obs.active = false;
      this.score += 100;
      driveAudio.playSmash();
      this.notify();
    }
  }

  // Hit oil slick
  hitOilSlick(id) {
    const obs = this.obstacles.find((o) => o.id === id);
    if (obs && obs.active) {
      obs.active = false;
      this.skidTimer = 0.9;
      // Slide laterally into adjacent lane
      if (this.targetLane === 0) {
        this.targetLane = Math.random() > 0.5 ? 1 : -1;
      } else {
        this.targetLane = 0;
      }
      driveAudio.playSkid();
      this.notify();
    }
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
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

    if (this.gameState === 'gameover') {
      // Rapid slowdown to full stop
      this.speedKmh = Math.max(0, this.speedKmh - 120 * dt);
      return;
    }

    // 1. Target Speed & Acceleration
    let targetSpeed = BASE_SPEED;
    if (this.activePowerups.elvis > 0) {
      targetSpeed = ELVIS_SPEED; // Nitro boost
    } else {
      // Gradual speed ramping as distance increases (up to 120 km/h)
      const ramp = Math.min(55, this.distanceMeters * 0.035);
      targetSpeed = BASE_SPEED + ramp;
    }

    // Smooth speed interpolation
    const accelRate = this.activePowerups.elvis > 0 ? 80.0 : 25.0;
    if (this.speedKmh < targetSpeed) {
      this.speedKmh = Math.min(targetSpeed, this.speedKmh + accelRate * dt);
    } else if (this.speedKmh > targetSpeed) {
      this.speedKmh = Math.max(targetSpeed, this.speedKmh - 30.0 * dt);
    }

    // 2. Lateral Movement & Physics
    const targetX = this.targetLane * LANE_WIDTH;
    const steerSpeed = this.skidTimer > 0 ? 4.5 : 8.5;
    this.carX += (targetX - this.carX) * Math.min(1, steerSpeed * dt);

    // Lateral roll damping
    this.carRoll *= Math.pow(0.08, dt);

    // Skid handling
    if (this.skidTimer > 0) {
      this.skidTimer -= dt;
      this.carYaw = Math.sin(performance.now() * 0.02) * 0.18;
    } else {
      this.carYaw *= Math.pow(0.05, dt);
    }

    // 3. Power-up Timers
    if (this.activePowerups.tex > 0) {
      this.activePowerups.tex = Math.max(0, this.activePowerups.tex - dt);
    }
    if (this.activePowerups.elvis > 0) {
      this.activePowerups.elvis = Math.max(0, this.activePowerups.elvis - dt);
    }

    // 4. Distance & Odometer Calculation
    // 1 unit in model = ~2.22m
    const speedMps = (this.speedKmh * 1000) / 3600;
    const unitsPerSec = speedMps / 2.22;
    const distUnits = unitsPerSec * dt;

    this.roadOffset += distUnits;
    this.distanceMeters += speedMps * dt;

    // Score accumulation
    const scoreMultiplier = this.activePowerups.elvis > 0 ? 2 : 1;
    this.score += Math.round(speedMps * dt * scoreMultiplier);

    // Wheel rotation
    const R_TIRE = 0.168;
    this.wheelRotation += distUnits / R_TIRE;

    // 5. Spawn Generation along Z
    this.updateSpawns(distUnits);

    // 6. Engine RPM calculation for sound
    const speedRatio = Math.max(0, Math.min(1, this.speedKmh / 195.0));
    this.rpm = Math.max(950, Math.min(6200, 1800 + speedRatio * 4200));

    // Determine gear
    for (let g = 1; g <= 5; g++) {
      if (this.speedKmh <= this.gearMaxSpeeds[g] || g === 5) {
        this.gear = g;
        break;
      }
    }
  }

  // Spawns obstacles, coins, and power-ups ahead of the car
  updateSpawns(distUnits) {
    // Scroll existing entities towards car (-Z relative motion)
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      // Fiat 500 moves forward in its lane at 40 km/h (~45% of car base speed)
      if (obs.type === 'fiat500') {
        const fiatRelDist = distUnits * 0.45;
        obs.z -= (distUnits - fiatRelDist);
      } else {
        obs.z -= distUnits;
      }
      // Remove when far behind
      if (obs.z < -10) {
        this.obstacles.splice(i, 1);
      }
    }

    for (let i = this.coins.length - 1; i >= 0; i--) {
      this.coins[i].z -= distUnits;
      if (this.coins[i].z < -10) {
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
      this.nextSpawnZ = 18 + Math.random() * 12; // Next pack in 18-30 units
      this.spawnEntityPack();
    }
  }

  spawnEntityPack() {
    const lanes = [-1, 0, 1];
    const spawnZ = 58; // Spawn safely in the distance

    // Random roll for pack content
    const roll = Math.random();

    if (roll < 0.45) {
      // 1. Obstacle + Coins in alternate lanes
      const obsLane = lanes[Math.floor(Math.random() * lanes.length)];
      const freeLanes = lanes.filter((l) => l !== obsLane);
      const coinLane = freeLanes[Math.floor(Math.random() * freeLanes.length)];

      const obsType = Math.random() > 0.5 ? 'fiat500' : 'barrier';
      this.obstacles.push({
        id: `obs_${Date.now()}_${Math.random()}`,
        type: obsType,
        lane: obsLane,
        z: spawnZ,
        active: true,
      });

      // Spawn trail of 3 coins
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
    } else if (roll < 0.88) {
      // 3. Themed Power-up (Tex Stetson or Elvis Vinyl)
      const pLane = lanes[Math.floor(Math.random() * lanes.length)];
      const pType = Math.random() > 0.5 ? 'tex' : 'elvis';
      this.powerups.push({
        id: `pow_${Date.now()}`,
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
  }
}

export const driveStore = new DriveStore();
