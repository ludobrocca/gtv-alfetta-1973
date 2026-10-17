// Real-time driving state store for the 1973 Alfa Romeo Alfetta GTV
// Provides high-performance per-frame physics access for useFrame loops
// and subscriber callbacks for UI HUD components without React lag.

class DriveStore {
  constructor() {
    this.mode = 'showroom'; // 'showroom' | 'drive'
    this.speedKmh = 0;       // Current speed in km/h
    this.cruiseSpeed = null; // null = manual pedal driving, number = active cruise speed
    this.throttle = 0;       // 0 to 1
    this.brake = 0;          // 0 to 1
    this.rpm = 950;          // Bialbero 1779cc RPM: 950 idle to 6200 redline
    this.gear = 1;           // 1 to 5
    this.wheelRotation = 0;  // Radians
    this.distanceMeters = 0; // Odometer in meters
    this.roadOffset = 0;     // World road offset for texture and instancing
    this.soundEnabled = false;
    this.headlightsOn = false;
    this.cameraMode = 'cinematic'; // 'cinematic' | 'chase' | 'side' | 'front' | 'user'
    this.userInteracting = false;
    this.lastUserInteraction = 0;

    // Gear ratios for Alfetta GTV 5-speed transaxle:
    // Final drive 4.10, gear ratios: 1st 3.30, 2nd 1.99, 3rd 1.35, 4th 1.04, 5th 0.83
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
      // Start in smooth rolling motion, 100% manual pedal driving ready
      if (this.speedKmh < 10) {
        this.speedKmh = 50;
      }
      this.cruiseSpeed = null;
      this.headlightsOn = true;
    } else {
      this.cruiseSpeed = null;
    }
    this.notify();
  }

  setThrottle(val) {
    const clamped = Math.max(0, Math.min(1, val));
    this.throttle = clamped;
    // Pressing manual throttle immediately takes manual control from cruise
    if (clamped > 0 && this.cruiseSpeed !== null) {
      this.cruiseSpeed = null;
      this.notify();
    }
  }

  setBrake(val) {
    const clamped = Math.max(0, Math.min(1, val));
    this.brake = clamped;
    // Tapping brake immediately disengages cruise control, exactly like in real cars
    if (clamped > 0 && this.cruiseSpeed !== null) {
      this.cruiseSpeed = null;
      this.notify();
    }
  }

  setCruise(kmh) {
    if (kmh === null || kmh === this.cruiseSpeed) {
      this.cruiseSpeed = null;
    } else {
      this.cruiseSpeed = Math.max(20, Math.min(195, kmh));
    }
    this.notify();
  }

  setTargetSpeed(kmh) {
    this.setCruise(kmh);
  }

  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    this.notify();
    return this.soundEnabled;
  }

  setCameraMode(mode) {
    this.cameraMode = mode;
    this.notify();
  }

  markUserInteraction() {
    this.userInteracting = true;
    this.lastUserInteraction = performance.now();
  }

  // Called in 60fps / 120fps requestAnimationFrame loop in Three.js
  update(delta) {
    const dt = Math.min(delta, 0.1);

    if (this.mode === 'drive') {
      if (this.cruiseSpeed !== null) {
        // Active Cruise Control: smoothly lock onto set cruise speed
        const diff = this.cruiseSpeed - this.speedKmh;
        if (diff > 0) {
          this.speedKmh = Math.min(this.cruiseSpeed, this.speedKmh + 14.0 * dt);
        } else if (diff < 0) {
          this.speedKmh = Math.max(this.cruiseSpeed, this.speedKmh - 12.0 * dt);
        }
      } else {
        // 100% Realistic Manual Driving Physics (1973 Alfetta GTV Bialbero 1.8 122 CV, 1080 kg):
        if (this.throttle > 0) {
          // Engine acceleration:
          // Brisk in low-to-mid gears (0-100 km/h ~9.5s), tapering naturally with aerodynamic drag up to 195 km/h
          const speedRatio = Math.max(0, Math.min(1, this.speedKmh / 195.0));
          const powerCurve = Math.max(0.12, 1.0 - Math.pow(speedRatio, 1.6));
          const accelRate = 24.0 * powerCurve * this.throttle; // km/h per sec
          this.speedKmh = Math.min(195.0, this.speedKmh + accelRate * dt);
        } else {
          // Accelerator released (pedale alzato / freno motore):
          // Realistic multi-stage deceleration:
          // - High speed (120-195 km/h): strong aerodynamic resistance + engine drag (~15-26 km/h/s)
          // - Medium speed (50-120 km/h): mechanical engine braking in gear (~9-14 km/h/s)
          // - Low speed (0-50 km/h): gentle rolling deceleration down to complete stop (~6-9 km/h/s)
          if (this.speedKmh > 0) {
            const vRel = this.speedKmh / 100.0;
            const aeroDrag = vRel * vRel * 5.2; // Aerodynamic drag grows with v^2
            const engineBrake = 7.5;            // Mechanical engine braking in gear
            const rollingFriction = 2.0;        // Tire and wheel bearing resistance
            const totalNaturalDecel = aeroDrag + engineBrake + rollingFriction;
            this.speedKmh = Math.max(0.0, this.speedKmh - totalNaturalDecel * dt);
          }
        }

        // Foot brake pedal (dischi freno servoassistiti): firm, rapid stopping power
        if (this.brake > 0) {
          const brakeDecel = this.brake * 58.0 * dt; // ~58 km/h per sec
          this.speedKmh = Math.max(0.0, this.speedKmh - brakeDecel);
        }
      }

      // 1 unit in our 3D model is approx 2.22 meters (model length ~1.89m, real GTV 4.19m)
      const speedMps = (this.speedKmh * 1000) / 3600;
      const unitsPerSec = speedMps / 2.22;
      const distUnits = unitsPerSec * dt;

      this.roadOffset += distUnits;
      this.distanceMeters += speedMps * dt;

      // Wheel rotation (radius = 0.168 model units)
      // dTheta = distUnits / R_TIRE
      const R_TIRE = 0.168;
      this.wheelRotation += distUnits / R_TIRE;

      // Determine 5-speed transaxle gear
      let calculatedGear = 1;
      for (let g = 1; g <= 5; g++) {
        if (this.speedKmh <= this.gearMaxSpeeds[g] || g === 5) {
          calculatedGear = g;
          break;
        }
      }
      this.gear = calculatedGear;

      // Calculate engine RPM for Bialbero Twin-Cam audio
      const minGearSpeed = this.gear === 1 ? 0 : this.gearMaxSpeeds[this.gear - 1] * 0.70;
      const maxGearSpeed = this.gearMaxSpeeds[this.gear];
      const speedRatio = Math.max(0, Math.min(1, (this.speedKmh - minGearSpeed) / Math.max(1, maxGearSpeed - minGearSpeed)));

      if (this.speedKmh < 0.5) {
        // Stationary idle: rev up if pressing throttle, otherwise smooth idle tremble
        this.rpm = this.throttle > 0 ? 950 + this.throttle * 2800 : 950 + Math.random() * 30;
      } else {
        const throttleRpmBoost = this.throttle > 0 ? 300 : (this.brake > 0 ? -250 : -120);
        this.rpm = Math.max(950, Math.min(6200, 1600 + speedRatio * 4400 + throttleRpmBoost));
      }

      // Return to cinematic camera after 6 seconds of no user touch/orbit
      if (this.userInteracting && performance.now() - this.lastUserInteraction > 6000) {
        this.userInteracting = false;
      }
    } else {
      // In showroom mode, smoothly decelerate to 0
      if (this.speedKmh > 0) {
        this.speedKmh = Math.max(0, this.speedKmh - 45.0 * dt);
        const speedMps = (this.speedKmh * 1000) / 3600;
        this.wheelRotation += (speedMps / 2.22 / 0.168) * dt;
      }
      this.rpm = 0;
    }
  }
}

export const driveStore = new DriveStore();
