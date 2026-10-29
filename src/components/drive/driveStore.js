// Real-time driving state store for the 1973 Alfa Romeo Alfetta GTV
// Provides high-performance per-frame physics access for useFrame loops
// and pure 3-lane Subway Surfers endless runner mechanics (fair, visual, no blind turn deaths).

import { driveAudio } from './DriveAudio.js';

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

export const DRIVER_RANKS = [
  { threshold: 70000, title: 'Leggenda del Quadrifoglio', icon: '🍀', tier: 5 },
  { threshold: 35000, title: 'Collaudatore Autodelta', icon: '🔥', tier: 4 },
  { threshold: 15000, title: 'Pilota Corsie Veloci', icon: '🏁', tier: 3 },
  { threshold: 5000, title: 'Amante del Bialbero', icon: '⚙️', tier: 2 },
  { threshold: 0, title: 'Turista di Abano', icon: '🚗', tier: 1 },
];

export function getDriverRank(score = 0) {
  if (score >= 70000) return { title: 'Leggenda del Quadrifoglio', icon: '🍀', tier: 5 };
  if (score >= 35000) return { title: 'Collaudatore Autodelta', icon: '🔥', tier: 4 };
  if (score >= 15000) return { title: 'Pilota Corsie Veloci', icon: '🏁', tier: 3 };
  if (score >= 5000) return { title: 'Amante del Bialbero', icon: '⚙️', tier: 2 };
  return { title: 'Turista di Abano', icon: '🚗', tier: 1 };
}

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

    // --- Burnout x Bialbero Combat & Arcade Dynamics ---
    this.armorState = 'intact'; // 'intact' | 'damaged'
    this.repairProgress = 0;    // 0..3 takedowns to repair
    this.furyMultiplier = 1;    // 1..10 dynamic score multiplier
    this.furyTimer = 0;         // countdown before multiplier decays
    this.ultimateCharge = 0;    // 0..100 chargeable pilot ultimate bar
    this.isDrafting = false;    // true when slipstreaming behind a Fiat 500
    this.draftTimer = 0;        // time spent in slipstream
    this.shiftWindowActive = false; // true when RPM is in redline shift window
    this.shiftCooldown = 0;     // cooldown between redline shift prompts
    this.laneChangeTimer = 0;   // active window after lane change for lateral takedown detection
    this.lastLaneDirection = 0; // -1 or +1
    this.takedownsCount = 0;
    this.perfectShiftsCount = 0;
    this.rampJumpsCount = 0;
    this.slingshotsCount = 0;

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

    // Top-5 Hall of Fame Leaderboard
    this.leaderboard = [];
    try {
      const savedLb = localStorage.getItem('alfetta_top5_leaderboard');
      this.leaderboard = savedLb ? JSON.parse(savedLb) || [] : [];
    } catch (_) {
      this.leaderboard = [];
    }

    // Active Power-ups (duration in seconds)
    this.activePowerups = {
      tex: 0,       // Invulnerability golden shield & smash
      elvis: 0,     // Rock'n'Roll super speed nitro 2X
      bond: 0,      // 007 Q-Branch Shield + Speed + Coin Magnet
      spiderman: 0, // Web Magnet (pulls coins from all 3 lanes)
      diabolik: 0,  // Stealth Ghost Cloak (phase through obstacles + 3x coins)
      callaghan: 0, // .44 Magnum Auto-Blast (destroys obstacles ahead)
      mg: 0,        // Maria Grazia: Regina dell'Olio 3X
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

  getDriverRank(score) {
    return getDriverRank(score !== undefined ? score : this.score);
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

    // Reset Burnout x Bialbero mechanics
    this.armorState = 'intact';
    this.repairProgress = 0;
    this.furyMultiplier = 1;
    this.furyTimer = 0;
    this.ultimateCharge = 0;
    this.isDrafting = false;
    this.draftTimer = 0;
    this.shiftWindowActive = false;
    this.shiftCooldown = 0;
    this.laneChangeTimer = 0;
    this.lastLaneDirection = 0;
    this.takedownsCount = 0;
    this.perfectShiftsCount = 0;
    this.rampJumpsCount = 0;
    this.slingshotsCount = 0;

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

  addFury(amount = 1) {
    this.furyMultiplier = Math.min(10, Math.max(1, this.furyMultiplier + amount));
    this.furyTimer = 7.5;
  }

  addUltimateCharge(percent) {
    this.ultimateCharge = Math.min(100, Math.max(0, this.ultimateCharge + percent));
  }

  takedownObstacle(id, direction = 1) {
    const obs = this.obstacles.find((o) => o.id === id);
    if (obs && (obs.active || !obs.knockedOut)) {
      obs.active = false;
      obs.knockedOut = true;
      const dir = direction !== 0 ? Math.sign(direction) : 1;
      obs.vx = -dir * 11.5;
      obs.vz = 9.0;
      obs.vRot = dir * 10.0;
      if (obs.knockX === undefined) obs.knockX = laneToX(obs.lane);
      if (obs.rotY === undefined) obs.rotY = 0;

      this.takedownsCount++;
      const pts = 300 * this.furyMultiplier;
      this.score += pts;
      this.addUltimateCharge(35);
      this.addFury(1);
      this.boostTimer = Math.max(this.boostTimer, 1.1);

      if (this.armorState === 'damaged') {
        this.repairProgress++;
        if (this.repairProgress >= 3) {
          this.armorState = 'intact';
          this.repairProgress = 0;
          this.triggerEventBanner(
            '🔧 MECCANICA ALFA RIPRISTINATA!',
            `SPORTELLATA +${pts} PT • PARAURTI INTATTO`,
            'emerald'
          );
          driveAudio.playArmorRepair();
        } else {
          this.triggerEventBanner(
            `💥 SPORTELLATA TAKEDOWN! (${this.repairProgress}/3 🔧)`,
            `+${pts} PT • +35% ULTIMATE`,
            'amber'
          );
          driveAudio.playTakedownSlam();
        }
      } else {
        this.triggerEventBanner(
          `💥 SPORTELLATA TAKEDOWN x${this.furyMultiplier}!`,
          `+${pts} PT • +35% ULTIMATE`,
          'amber'
        );
        driveAudio.playTakedownSlam();
      }

      this.notify();
      return true;
    }
    return false;
  }

  handleFrontalImpact(id) {
    if (id !== undefined) {
      const obs = this.obstacles.find((o) => o.id === id);
      if (obs) obs.active = false;
    }
    if (this.armorState === 'intact') {
      this.armorState = 'damaged';
      this.repairProgress = 0;
      this.furyMultiplier = 1;
      this.furyTimer = 0;
      this.speedKmh = Math.max(48, this.speedKmh * 0.72);
      this.triggerEventBanner(
        '⚠️ PARAURTI DANNEGGIATO!',
        'FAI 3 SPORTELLATE O PRENDI 1 RAMPA PER RIPARARE',
        'rose'
      );
      driveAudio.playArmorDamage();
      this.notify();
      return 'damaged';
    } else {
      this.triggerCrash();
      return 'gameover';
    }
  }

  triggerPerfectShift() {
    if (this.gameState !== 'playing' || !this.shiftWindowActive) return false;
    this.shiftWindowActive = false;
    this.shiftCooldown = 4.2;
    this.gear = Math.min(5, (this.gear || 1) + 1);
    this.perfectShiftsCount++;
    const pts = 350 * this.furyMultiplier;
    this.score += pts;
    this.addUltimateCharge(25);
    this.addFury(1);
    this.boostTimer = Math.max(this.boostTimer, 1.8);
    this.speedKmh = Math.min(215, this.speedKmh + 25);
    this.rpmBlip = 650;
    this.triggerEventBanner(
      `⚡ DOPPIETTA PERFETTA ${this.gear}ª MARCIA!`,
      `+${pts} PT • TURBO BIALBERO +25 KM/H`,
      'amber'
    );
    driveAudio.playPerfectShiftBackfire();
    this.notify();
    return true;
  }

  hitRamp(id) {
    if (id !== undefined) {
      const obs = this.obstacles.find((o) => o.id === id);
      if (obs) obs.active = false;
    }
    this.verticalVel = 4.4;
    this.airY = Math.max(0.08, this.airY);
    this.boostTimer = Math.max(this.boostTimer, 1.6);
    this.rampJumpsCount++;
    const pts = 500 * this.furyMultiplier;
    this.score += pts;
    this.addUltimateCharge(30);
    this.addFury(1);
    const wasDamaged = this.armorState === 'damaged';
    this.armorState = 'intact';
    this.repairProgress = 0;
    this.triggerEventBanner(
      wasDamaged ? '🦅 DECOLLO RAMPA + AUTO RIPARATA!' : '🦅 DECOLLO SU RAMPA!',
      `+${pts} PT • VOLO SOPRA LO SBARRAMENTO`,
      'emerald'
    );
    driveAudio.playRampLaunch();
    this.notify();
    return true;
  }

  activateUltimate() {
    if (this.gameState !== 'playing' || this.ultimateCharge < 100) return false;
    this.ultimateCharge = 0;
    this.addFury(1);
    const drv = this.selectedDriver || 'elvis';

    if (drv === 'mg') {
      this.activePowerups.mg = 7.0;
      this.activePowerups.tex = 7.0;
      this.activePowerups.spiderman = 7.0;
      this.triggerEventBanner(
        '👑 MG ULTIMATE • REGINA DELL’OLIO 3X!',
        'Scudo Ranger + Magnete Monete + Sovraprezzo Olio',
        'teal'
      );
      driveAudio.playTexShield();
    } else if (drv === 'tex') {
      this.activePowerups.tex = 7.0;
      this.triggerEventBanner('🤠 TEX WILLER • SCUDO RANGER!', 'Travolgi ogni ostacolo +150 PT', 'amber');
      driveAudio.playTexShield();
    } else if (drv === 'elvis') {
      this.activePowerups.elvis = 7.0;
      this.triggerEventBanner("🎸 ELVIS • ROCK'N'ROLL NITRO 2X!", '175 km/h & Punti Doppi', 'fuchsia');
      driveAudio.playElvisRockabilly(7.0);
    } else if (drv === 'bond') {
      this.activePowerups.bond = 7.0;
      this.triggerEventBanner('🍸 007 Q-BRANCH • LICENZA DI SORPASSO!', 'Scudo + Calamita Monete + Turbo', 'amber');
      driveAudio.playBondSpyChord();
    } else if (drv === 'spiderman') {
      this.activePowerups.spiderman = 7.0;
      this.triggerEventBanner('🕸️ UOMO RAGNO • RAGNATELA MAGNETICA!', 'Cattura tutte le monete in pista', 'rose');
      driveAudio.playSpidermanThwip();
    } else if (drv === 'diabolik') {
      this.activePowerups.diabolik = 7.0;
      this.triggerEventBanner('💎 DIABOLIK • FUGA INVISIBILE 3X!', 'Attraversa gli ostacoli + Monete 3X', 'cyan');
      driveAudio.playDiabolikStealth();
    } else if (drv === 'callaghan') {
      this.activePowerups.callaghan = 7.0;
      this.triggerEventBanner('🔫 CALLAGHAN • .44 MAGNUM IN AZIONE!', 'Polverizza i blocchi davanti (+200 PT)', 'amber');
      driveAudio.playMagnumShot();
    } else {
      this.activePowerups.tex = 7.0;
      this.triggerEventBanner('⚡ SUPER PILOTA ULTIMATE!', 'Potenza massima sbloccata', 'amber');
      driveAudio.playTexShield();
    }

    this.notify();
    return true;
  }

  // Lane Change: -1 for Left, +1 for Right (non-inverted!)
  changeLane(direction) {
    if (this.gameState !== 'playing') return;
    const newLane = Math.max(-1, Math.min(1, this.targetLane + direction));
    if (newLane !== this.targetLane) {
      this.laneChangeTimer = 0.38;
      this.lastLaneDirection = direction;

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

      // Check for Slipstream Slingshot (Sorpasso Fionda in Scia)
      if (this.draftTimer >= 0.35) {
        this.slingshotsCount++;
        this.draftTimer = 0;
        this.isDrafting = false;
        if (closeObstacle) closeObstacle.nearMissed = true;
        this.addFury(1);
        this.addUltimateCharge(20);
        this.boostTimer = Math.max(this.boostTimer, 1.4);
        const pts = 250 * this.furyMultiplier;
        this.score += pts;
        this.triggerEventBanner(
          `💨 SORPASSO FIONDA IN SCIA x${this.furyMultiplier}!`,
          `+${pts} PT • +20% ULTIMATE`,
          'cyan'
        );
        driveAudio.playNearMissWhoosh();
      } else if (closeObstacle) {
        // Last-second dodge near miss ("Sfioro da Brivido")
        closeObstacle.nearMissed = true;
        this.slingshotsCount++;
        this.addFury(1);
        this.addUltimateCharge(20);
        this.nearMissCombo = Math.min(5, this.nearMissCombo + 1);
        this.nearMissTimer = 4.0;
        this.boostTimer = Math.max(this.boostTimer, 1.4);
        const pts = 250 * this.nearMissCombo * this.furyMultiplier;
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

  updateLeaderboard(entry) {
    if (!entry) {
      const rank = this.getDriverRank(this.score);
      entry = {
        score: this.score,
        distance: Math.round(this.distanceMeters),
        driverId: this.selectedDriver,
        rankTitle: rank.title,
        rankIcon: rank.icon,
        date: new Date().toISOString(),
      };
    }
    this.leaderboard.push(entry);
    this.leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0));
    this.leaderboard = this.leaderboard.slice(0, 5);
    try {
      localStorage.setItem('alfetta_top5_leaderboard', JSON.stringify(this.leaderboard));
    } catch (_) {}
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

    // Top-5 leaderboard update (AC-008)
    const rank = this.getDriverRank(this.score);
    this.updateLeaderboard({
      score: this.score,
      distance: Math.round(this.distanceMeters),
      driverId: this.selectedDriver,
      rankTitle: rank.title,
      rankIcon: rank.icon,
      date: new Date().toISOString(),
    });

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
      const pts = 50 * multiplier * this.furyMultiplier;
      this.score += pts;
      this.addUltimateCharge(3);
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
    } else if (pType === 'mg') {
      this.activePowerups.mg = 7.0;
      this.activePowerups.tex = 7.0;
      this.activePowerups.spiderman = 7.0;
      this.triggerEventBanner('👑 MG POWER • REGINA DELL’OLIO 3X!', 'Scudo Ranger + Magnete Monete', 'teal');
      driveAudio.playTexShield();
    }
    this.notify();
  }

  // Smash an obstacle while Invulnerability / .44 Magnum / 007 is active
  smashObstacle(id, reason = 'smash') {
    const obs = this.obstacles.find((o) => o.id === id);
    if (obs && obs.active) {
      obs.active = false;
      const pts = (reason === 'magnum' ? 200 : 150) * this.furyMultiplier;
      this.score += pts;
      this.addUltimateCharge(15);
      this.addFury(1);
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
        const pts = 150 * this.furyMultiplier;
        this.score += pts;
        this.addUltimateCharge(15);
        this.triggerEventBanner('🛢️ CONTROSTERZO MG!', `+${pts} PT • REGINA DEL DRIFT SULL’OLIO`, 'teal');
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

    // Lane change window decay
    if (this.laneChangeTimer > 0) {
      this.laneChangeTimer = Math.max(0, this.laneChangeTimer - dt);
    }

    // Fury multiplier decay (AC-007)
    if (this.furyTimer > 0) {
      this.furyTimer = Math.max(0, this.furyTimer - dt);
      if (this.furyTimer === 0 && this.furyMultiplier > 1) {
        this.furyMultiplier = Math.max(1, this.furyMultiplier - 1);
        if (this.furyMultiplier > 1) {
          this.furyTimer = 3.5;
        }
      }
    }

    // Slipstream Drafting check (AC-003)
    const draftCar = this.obstacles.find(
      (o) => o.active && o.type === 'fiat500' && o.lane === this.targetLane && o.z > 2.0 && o.z < 18.0
    );
    if (draftCar) {
      this.isDrafting = true;
      this.draftTimer += dt;
    } else {
      this.isDrafting = false;
      this.draftTimer = Math.max(0, this.draftTimer - dt * 1.5);
    }

    // 1. Target Speed & Acceleration
    const isNitro = this.activePowerups.elvis > 0 || this.activePowerups.bond > 0;
    let targetSpeed = BASE_SPEED;
    if (isNitro) {
      targetSpeed = ELVIS_SPEED;
    } else {
      const ramp = Math.min(58, this.distanceMeters * 0.038);
      targetSpeed = BASE_SPEED + ramp + (this.boostTimer > 0 ? 22 : 0) + (this.isDrafting ? 12 : 0);
    }

    const accelRate = isNitro || this.boostTimer > 0 || this.isDrafting ? 85.0 : 28.0;
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
      this.score += 300 * this.furyMultiplier;
      this.triggerEventBanner('🦅 SALTO DEL CRINALE!', `+${300 * this.furyMultiplier} PT • VOLO ALFETTA GTV`, 'amber');
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

    // Score accumulation (incorporating furyMultiplier)
    const scoreMultiplier = (isNitro ? 2 : 1) * this.furyMultiplier;
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

    // Redline Shift Window check (AC-004)
    if (this.shiftCooldown > 0) {
      this.shiftCooldown = Math.max(0, this.shiftCooldown - dt);
    }
    this.shiftWindowActive =
      this.shiftCooldown <= 0 && (this.rpm >= 5200 || this.isDrafting || this.speedKmh >= 76);

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
    const isMagnet = this.activePowerups.spiderman > 0 || this.activePowerups.bond > 0 || this.activePowerups.mg > 0;
    const isMagnum = this.activePowerups.callaghan > 0;

    // Scroll existing entities towards car (-Z relative motion)
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];

      // If knocked out by takedown, position/physics is updated in DriveWorld.jsx
      if (obs.knockedOut) {
        if (obs.z < -10 || obs.z > 80 || (obs.knockX !== undefined && Math.abs(obs.knockX) > 14)) {
          this.obstacles.splice(i, 1);
        }
        continue;
      }

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
        this.addFury(1);
        this.addUltimateCharge(15);
        const pts = 150 * this.nearMissCombo * this.furyMultiplier;
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

      // Spider-Man Web Magnet / 007 Q-Magnet / MG Magnet pulls nearby coins across lanes directly to the car!
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

    if (roll < 0.24) {
      // 1. Stunt Ramp Pack (AC-005):
      // Ramp in one lane, barriers across other lanes at spawnZ + 6.5, and 4 aerial coins
      const rampLane = lanes[Math.floor(Math.random() * lanes.length)];
      this.obstacles.push({
        id: `ramp_${Date.now()}_${Math.random()}`,
        type: 'ramp',
        lane: rampLane,
        z: spawnZ,
        active: true,
      });

      // Barriers / Fiat 500 across lanes at spawnZ + 6.5 so jumping the ramp clears them!
      const blockedLanes = lanes.filter((l) => l !== rampLane);
      blockedLanes.forEach((l) => {
        const obsType = Math.random() > 0.4 ? 'barrier' : 'fiat500';
        this.obstacles.push({
          id: `obs_block_${Date.now()}_${l}_${Math.random()}`,
          type: obsType,
          lane: l,
          z: spawnZ + 6.5,
          active: true,
        });
      });
      // Also barrier at rampLane at spawnZ + 6.5 (cleared by jumping!)
      this.obstacles.push({
        id: `obs_block_ramp_${Date.now()}_${rampLane}_${Math.random()}`,
        type: 'barrier',
        lane: rampLane,
        z: spawnZ + 6.5,
        active: true,
      });

      // 4 aerial coins along the jump parabola
      for (let k = 0; k < 4; k++) {
        this.coins.push({
          id: `coin_air_${Date.now()}_${k}_${Math.random()}`,
          lane: rampLane,
          z: spawnZ + 2.0 + k * 2.5,
          yOffset: 1.15 + Math.sin((k / 3) * Math.PI) * 0.65,
          active: true,
        });
      }
    } else if (roll < 0.54) {
      // 2. Obstacle + Coins in alternate lanes
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
    } else if (roll < 0.74) {
      // 3. Oil Slick + Fiat in another lane
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
    } else if (roll < 0.90) {
      // 4. Driver-Themed Power-up (70% chance for current driver's signature gadget!)
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
      // 5. Pure Coin Highway (2 lanes of gold coins)
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
