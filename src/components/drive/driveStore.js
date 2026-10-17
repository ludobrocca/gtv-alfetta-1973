// Real-time driving state store for the 1973 Alfa Romeo Alfetta GTV
// Provides high-performance per-frame physics access for useFrame loops
// and subscriber callbacks for UI HUD components without React lag.

class DriveStore {
  constructor() {
    this.mode = 'showroom'; // 'showroom' | 'drive'
    this.speedKmh = 0;       // Current speed in km/h
    this.targetSpeedKmh = 95;// Default cruising speed when entering drive mode
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
      if (this.speedKmh < 10) {
        this.targetSpeedKmh = 95;
      }
      this.headlightsOn = true;
    } else {
      this.targetSpeedKmh = 0;
    }
    this.notify();
  }

  setThrottle(val) {
    this.throttle = Math.max(0, Math.min(1, val));
  }

  setBrake(val) {
    this.brake = Math.max(0, Math.min(1, val));
  }

  setTargetSpeed(kmh) {
    this.targetSpeedKmh = Math.max(0, Math.min(195, kmh));
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
      // Manual input handling vs cruise target
      let target = this.targetSpeedKmh;
      if (this.throttle > 0) {
        target = Math.min(195, target + this.throttle * 40 * dt);
        this.targetSpeedKmh = target;
      }
      if (this.brake > 0) {
        target = Math.max(0, target - this.brake * 60 * dt);
        this.targetSpeedKmh = target;
      }

      // Smooth acceleration & braking response curves
      const accelRate = 22.0; // km/h per sec
      const brakeRate = this.brake > 0 ? 55.0 : 18.0;

      if (this.speedKmh < target) {
        this.speedKmh = Math.min(target, this.speedKmh + accelRate * dt);
      } else if (this.speedKmh > target) {
        this.speedKmh = Math.max(target, this.speedKmh - brakeRate * dt);
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

      // Determine gear from speed
      let calculatedGear = 1;
      for (let g = 1; g <= 5; g++) {
        if (this.speedKmh <= this.gearMaxSpeeds[g] || g === 5) {
          calculatedGear = g;
          break;
        }
      }
      this.gear = calculatedGear;

      // Calculate engine RPM for Bialbero engine sound
      const minGearSpeed = this.gear === 1 ? 0 : this.gearMaxSpeeds[this.gear - 1] * 0.75;
      const maxGearSpeed = this.gearMaxSpeeds[this.gear];
      const speedRatio = Math.max(0, Math.min(1, (this.speedKmh - minGearSpeed) / Math.max(1, maxGearSpeed - minGearSpeed)));

      if (this.speedKmh < 1) {
        this.rpm = 950 + Math.random() * 40; // Idle tremble
      } else {
        this.rpm = 1800 + speedRatio * 4400 + (this.throttle > 0 ? 300 : 0);
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
