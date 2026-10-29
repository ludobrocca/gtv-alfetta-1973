// Professional Web Audio API Arcade & Automotive Sound Effects Engine
// Features Progressive Pitch-Stacking Coin Chimes, Doppler Near-Miss Whooshes,
// Bialbero Gear-Shift Overrun Pops, and 7 Signature Driver Audio Stingers.

// Uplifting Lydian/Major pentatonic frequencies for consecutive coin pickups (Subway Surfers / Mario style)
const COIN_SCALE_HZ = [
  1046.50, // C6
  1174.66, // D6
  1318.51, // E6
  1567.98, // G6
  1760.00, // A6
  1975.53, // B6
  2093.00, // C7
  2349.32, // D7
  2637.02, // E7
  3135.96, // G7
];

class DriveAudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.elvisInterval = null;
    this.isMuted = false;
    this.coinStreak = 0;
    this.lastCoinTime = 0;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.55;
    this.masterGain.connect(this.ctx.destination);
  }

  ensureContext() {
    this.init();
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setMuted(muted) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.55, this.ctx.currentTime, 0.05);
    }
  }

  // Coin / Quadrifoglio Pickup: Progressive Pitch-Stacking Crystal Bell Chime
  playCoinPickup() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const now = performance.now();
    if (now - this.lastCoinTime < 1850) {
      this.coinStreak = Math.min(COIN_SCALE_HZ.length - 1, this.coinStreak + 1);
    } else {
      this.coinStreak = 0;
    }
    this.lastCoinTime = now;

    const t = this.ctx.currentTime;
    const baseFreq = COIN_SCALE_HZ[this.coinStreak];
    const shimmerFreq = baseFreq * 1.5; // Perfect 5th crystal overtone

    // 1. Primary Crystal Sine Bell (grace note -> target note)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(baseFreq * 0.75, t);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, t + 0.055);

    gain1.gain.setValueAtTime(0.001, t);
    gain1.gain.linearRampToValueAtTime(0.28, t + 0.012);
    gain1.gain.exponentialRampToValueAtTime(0.0008, t + 0.42);

    osc1.connect(gain1);
    gain1.connect(this.masterGain);
    osc1.start(t);
    osc1.stop(t + 0.44);

    // 2. Sparkling Harmonic Shimmer (delayed by 45ms for classic 2-note coin "Bling-Ding!")
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(shimmerFreq, t + 0.045);

    gain2.gain.setValueAtTime(0.001, t + 0.045);
    gain2.gain.linearRampToValueAtTime(0.18, t + 0.06);
    gain2.gain.exponentialRampToValueAtTime(0.0008, t + 0.48);

    osc2.connect(gain2);
    gain2.connect(this.masterGain);
    osc2.start(t + 0.045);
    osc2.stop(t + 0.5);
  }

  // Doppler Aerodynamic "Whoosh" when narrowly dodging or overtaking a Fiat 500
  playNearMissWhoosh() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const dur = 0.34;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.92 * b0 + 0.08 * white;
      const env = Math.sin((i / bufferSize) * Math.PI);
      data[i] = b0 * env * 2.5;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass filter sweeps up then drops down (classic Doppler pass-by effect)
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.8;
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(1150, t + 0.13);
    filter.frequency.exponentialRampToValueAtTime(210, t + dur);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.38, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    noise.start(t);
  }

  // Bialbero Exhaust Overrun Burble / Pop on 5-speed Gear Shifts
  playGearShiftPop() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Two quick low-frequency muffled exhaust pops ("burble-pop")
    [0, 0.075].forEach((offset, idx) => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const startF = idx === 0 ? 135 : 112;
      osc.frequency.setValueAtTime(startF, t + offset);
      osc.frequency.exponentialRampToValueAtTime(42, t + offset + 0.09);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(260, t + offset);

      gain.gain.setValueAtTime(0.22, t + offset);
      gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.095);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      osc.start(t + offset);
      osc.stop(t + offset + 0.1);
    });
  }

  // Hill Crest Jump Take-Off ("Salto del Crinale")
  playJumpTakeoff() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(330, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.28);

    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.34);
  }

  // Tex Willer: Western Golden Shield Aura & Ennio Morricone Trumpet Fifths
  playTexShield() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const freqs = [330, 493.88, 659.25, 830.61]; // Heroic Western A-E-A-C#
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t + idx * 0.055);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.01, t + 0.45);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400 + idx * 300, t);

      gain.gain.setValueAtTime(0.15, t + idx * 0.055);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.055);
      osc.stop(t + 0.7);
    });
  }

  // Smashing through an obstacle (Punchy low-end thud + debris crunch)
  playSmash() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.28);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.06));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(950, t);
    filter.frequency.linearRampToValueAtTime(140, t + 0.28);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.42, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  // Elvis Presley Rock'n'Roll Nitro Riff: 50s Rockabilly swing groove
  playElvisRockabilly(durationSeconds = 6.0) {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    if (this.elvisInterval) {
      clearInterval(this.elvisInterval);
      this.elvisInterval = null;
    }

    // 12-bar rockabilly walking bass & twangy guitar progression in A
    // Pattern: A -> C# -> E -> F# (root-3-5-6 rockabilly swing)
    const pattern = [
      { bass: 110.0, guitar: [440, 554, 660] },    // A2 & A chord
      { bass: 138.59, guitar: [440, 554, 660] },   // C#3
      { bass: 164.81, guitar: [440, 587.33, 660] },// E3 & A6
      { bass: 185.0, guitar: [440, 587.33, 660] }, // F#3
      { bass: 196.0, guitar: [440, 587.33, 660] }, // G3 (blues 7th)
      { bass: 185.0, guitar: [440, 554, 660] },   // F#3
      { bass: 164.81, guitar: [440, 554, 660] },  // E3
      { bass: 138.59, guitar: [440, 554, 660] }   // C#3
    ];

    let step = 0;
    const bpm = 168; // Classic rockabilly tempo
    const stepDurationMs = (60 / bpm) * 500; // Eighth note swing
    const startTime = performance.now();

    const playBeat = () => {
      if (performance.now() - startTime > durationSeconds * 1000) {
        clearInterval(this.elvisInterval);
        this.elvisInterval = null;
        return;
      }

      if (!this.ctx || this.isMuted) return;
      const t = this.ctx.currentTime;
      const cur = pattern[step % pattern.length];
      step++;

      // 1. Slapback Double Bass (Triangle + quick click)
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'triangle';
      bassOsc.frequency.setValueAtTime(cur.bass, t);
      bassOsc.frequency.exponentialRampToValueAtTime(cur.bass * 0.96, t + 0.15);

      bassGain.gain.setValueAtTime(0.4, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

      bassOsc.connect(bassGain);
      bassGain.connect(this.masterGain);
      bassOsc.start(t);
      bassOsc.stop(t + 0.25);

      // 2. Twangy Gretsch / Stratocaster Rockabilly guitar chop on upbeats
      if (step % 2 === 0) {
        cur.guitar.forEach((freq) => {
          const gOsc = this.ctx.createOscillator();
          const gFilter = this.ctx.createBiquadFilter();
          const gGain = this.ctx.createGain();

          gOsc.type = 'sawtooth';
          gOsc.frequency.setValueAtTime(freq, t);

          gFilter.type = 'bandpass';
          gFilter.frequency.setValueAtTime(1800, t);
          gFilter.Q.value = 3.0;

          gGain.gain.setValueAtTime(0.18, t);
          gGain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);

          gOsc.connect(gFilter);
          gFilter.connect(gGain);
          gGain.connect(this.masterGain);

          gOsc.start(t);
          gOsc.stop(t + 0.2);
        });
      }
    };

    playBeat();
    this.elvisInterval = setInterval(playBeat, stepDurationMs);
  }

  // Crash into vehicle or wall: Metallic crunch and shudder
  playCrash() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    if (this.elvisInterval) {
      clearInterval(this.elvisInterval);
      this.elvisInterval = null;
    }

    const t = this.ctx.currentTime;
    // Impact noise
    const bufferSize = this.ctx.sampleRate * 0.65;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.14));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1400, t);
    filter.frequency.exponentialRampToValueAtTime(80, t + 0.6);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.7, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(t);
  }

  // Tire Skid / Oil Slick squeal
  playSkid() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    const filter = this.ctx.createBiquadFilter();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(850, t);
    osc.frequency.linearRampToValueAtTime(620, t + 0.45);

    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1200, t);
    filter.Q.value = 5.0;

    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.5);
  }

  // James Bond 007: Iconic Monty Norman Em(maj9) Surf-Spy Guitar Strum
  playBondSpyChord() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Em(maj9): E3 (164.81), G3 (196.0), B3 (246.94), D#4 (311.13), F#4 (369.99)
    const notes = [164.81, 196.0, 246.94, 311.13, 369.99];
    notes.forEach((freq, idx) => {
      const start = t + idx * 0.045;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);

      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1350, start);
      filter.Q.value = 2.2;

      gain.gain.setValueAtTime(0.14, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.85);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(start);
      osc.stop(start + 0.9);
    });
  }

  // Spider-Man: Pneumatic Web-Shooter "Thwip!" + Magnetic Hum
  playSpidermanThwip() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(380, t);
    osc.frequency.exponentialRampToValueAtTime(2400, t + 0.08);
    osc.frequency.exponentialRampToValueAtTime(920, t + 0.19);

    gain.gain.setValueAtTime(0.26, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.24);
  }

  // Diabolik: 70s Italian Mystery Cinema Synth Arpeggio
  playDiabolikStealth() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const notes = [293.66, 349.23, 440.0, 554.37, 587.33]; // Dm(maj7) mystery arpeggio
    notes.forEach((freq, idx) => {
      const start = t + idx * 0.06;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);

      gain.gain.setValueAtTime(0.18, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.45);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(start);
      osc.stop(start + 0.48);
    });
  }

  // Ispettore Callaghan: Smith & Wesson .44 Magnum Thunderous Shot + Brass Shell Clink
  playMagnumShot() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // 1. Deep cannon-like .44 Magnum transient punch
    const osc = this.ctx.createOscillator();
    const punchGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(190, t);
    osc.frequency.exponentialRampToValueAtTime(36, t + 0.22);
    punchGain.gain.setValueAtTime(0.55, t);
    punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);
    osc.connect(punchGain);
    punchGain.connect(this.masterGain);
    osc.start(t);
    osc.stop(t + 0.28);

    // 2. Crisp gunshot crack & tail
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.35);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.075));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1800, t);
    filter.frequency.exponentialRampToValueAtTime(160, t + 0.34);
    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(0.45, t);
    nGain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    noise.connect(filter);
    filter.connect(nGain);
    nGain.connect(this.masterGain);
    noise.start(t);
  }

  // Turn Success / Power-slide screech
  playDriftSuccess() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(440, t);
    osc.frequency.exponentialRampToValueAtTime(880, t + 0.25);

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Burnout-style Lateral Sportellata Takedown: Punchy metallic thud + sparking steel crunch
  playTakedownSlam() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Heavy sub-bass body slam transient
    const subOsc = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(185, t);
    subOsc.frequency.exponentialRampToValueAtTime(36, t + 0.24);

    subGain.gain.setValueAtTime(0.65, t);
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);

    subOsc.connect(subGain);
    subGain.connect(this.masterGain);
    subOsc.start(t);
    subOsc.stop(t + 0.3);

    // 2. Metallic Fender Crumple (Detuned square/saw through resonant bandpass)
    const metalOsc = this.ctx.createOscillator();
    const metalFilter = this.ctx.createBiquadFilter();
    const metalGain = this.ctx.createGain();

    metalOsc.type = 'sawtooth';
    metalOsc.frequency.setValueAtTime(340, t);
    metalOsc.frequency.exponentialRampToValueAtTime(80, t + 0.22);

    metalFilter.type = 'bandpass';
    metalFilter.frequency.setValueAtTime(950, t);
    metalFilter.Q.value = 3.5;

    metalGain.gain.setValueAtTime(0.4, t);
    metalGain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

    metalOsc.connect(metalFilter);
    metalFilter.connect(metalGain);
    metalGain.connect(this.masterGain);
    metalOsc.start(t);
    metalOsc.stop(t + 0.28);

    // 3. High-Frequency Sparks & Steel Grinding Friction Crunch
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }
    const sparkNoise = this.ctx.createBufferSource();
    sparkNoise.buffer = buffer;

    const sparkFilter = this.ctx.createBiquadFilter();
    sparkFilter.type = 'highpass';
    sparkFilter.frequency.setValueAtTime(2600, t);

    const sparkGain = this.ctx.createGain();
    sparkGain.gain.setValueAtTime(0.35, t);
    sparkGain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);

    sparkNoise.connect(sparkFilter);
    sparkFilter.connect(sparkGain);
    sparkGain.connect(this.masterGain);
    sparkNoise.start(t);
  }

  // Perfect Redline Gear Shift: Twin Bialbero exhaust backfire crack + Weber carburetor induction whoosh
  playPerfectShiftBackfire() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Weber Carburetor High-Flow Induction Whoosh
    const whooshBufferLen = Math.floor(this.ctx.sampleRate * 0.26);
    const whooshBuffer = this.ctx.createBuffer(1, whooshBufferLen, this.ctx.sampleRate);
    const wData = whooshBuffer.getChannelData(0);
    for (let i = 0; i < whooshBufferLen; i++) {
      wData[i] = (Math.random() * 2 - 1) * Math.sin((i / whooshBufferLen) * Math.PI);
    }
    const whooshSource = this.ctx.createBufferSource();
    whooshSource.buffer = whooshBuffer;

    const whooshFilter = this.ctx.createBiquadFilter();
    whooshFilter.type = 'bandpass';
    whooshFilter.Q.value = 3.2;
    whooshFilter.frequency.setValueAtTime(1200, t);
    whooshFilter.frequency.exponentialRampToValueAtTime(3200, t + 0.16);

    const whooshGain = this.ctx.createGain();
    whooshGain.gain.setValueAtTime(0.26, t);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, t + 0.26);

    whooshSource.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(this.masterGain);
    whooshSource.start(t);

    // 2. Double Exhaust Backfire Pops (offset by ~65ms: crack-crack in the Ansa exhaust)
    [0.02, 0.085].forEach((offset, idx) => {
      const popTime = t + offset;

      // Punchy pressure wave
      const osc = this.ctx.createOscillator();
      const pFilter = this.ctx.createBiquadFilter();
      const pGain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(idx === 0 ? 260 : 210, popTime);
      osc.frequency.exponentialRampToValueAtTime(45, popTime + 0.08);

      pFilter.type = 'lowpass';
      pFilter.frequency.setValueAtTime(650, popTime);

      pGain.gain.setValueAtTime(0.48, popTime);
      pGain.gain.exponentialRampToValueAtTime(0.001, popTime + 0.085);

      osc.connect(pFilter);
      pFilter.connect(pGain);
      pGain.connect(this.masterGain);
      osc.start(popTime);
      osc.stop(popTime + 0.09);

      // Sharp firecracker crack noise
      const crackLen = Math.floor(this.ctx.sampleRate * 0.06);
      const crackBuf = this.ctx.createBuffer(1, crackLen, this.ctx.sampleRate);
      const cData = crackBuf.getChannelData(0);
      for (let i = 0; i < crackLen; i++) {
        cData[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.015));
      }
      const crackSource = this.ctx.createBufferSource();
      crackSource.buffer = crackBuf;

      const cGain = this.ctx.createGain();
      cGain.gain.setValueAtTime(0.38, popTime);
      cGain.gain.exponentialRampToValueAtTime(0.001, popTime + 0.06);

      crackSource.connect(cGain);
      cGain.connect(this.masterGain);
      crackSource.start(popTime);
    });
  }

  // Stunt Ramp Launch: Rising aerodynamic synth whoosh + bright heroic major chord
  playRampLaunch() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Aerodynamic Launch Whoosh (Bandpass noise sweeping up)
    const whooshDur = 0.45;
    const bufSize = Math.floor(this.ctx.sampleRate * whooshDur);
    const buffer = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufSize; i++) {
      const env = Math.sin((i / bufSize) * Math.PI);
      data[i] = (Math.random() * 2 - 1) * env;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 2.4;
    filter.frequency.setValueAtTime(320, t);
    filter.frequency.exponentialRampToValueAtTime(2200, t + whooshDur);

    const whooshGain = this.ctx.createGain();
    whooshGain.gain.setValueAtTime(0.32, t);
    whooshGain.gain.exponentialRampToValueAtTime(0.001, t + whooshDur);

    noise.connect(filter);
    filter.connect(whooshGain);
    whooshGain.connect(this.masterGain);
    noise.start(t);

    // 2. Heroic Major Chord (D5, F#5, A5, D6)
    const notes = [587.33, 739.99, 880.00, 1174.66];
    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      const noteStart = t + idx * 0.035;
      osc.frequency.setValueAtTime(freq, noteStart);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.01, noteStart + 0.45);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.16, noteStart + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.52);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(noteStart);
      osc.stop(noteStart + 0.55);
    });
  }

  // 2-Stage Steel Armor Repaired: Uplifting mechanical wrench chime (3 ascending crystal/metallic notes)
  playArmorRepair() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // 3 ascending bright metallic notes: F#5 (739.99 Hz), B5 (987.77 Hz), D#6 (1244.51 Hz)
    const notes = [739.99, 987.77, 1244.51];

    notes.forEach((freq, idx) => {
      const noteStart = t + idx * 0.085;

      // Fundamental crystal tone
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, noteStart);

      gain.gain.setValueAtTime(0.001, noteStart);
      gain.gain.linearRampToValueAtTime(0.24, noteStart + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.42);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(noteStart);
      osc.stop(noteStart + 0.45);

      // Metallic high overtone (wrench clink harmonic)
      const clangOsc = this.ctx.createOscillator();
      const clangGain = this.ctx.createGain();
      clangOsc.type = 'triangle';
      clangOsc.frequency.setValueAtTime(freq * 2.76, noteStart);

      clangGain.gain.setValueAtTime(0.001, noteStart);
      clangGain.gain.linearRampToValueAtTime(0.12, noteStart + 0.008);
      clangGain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.22);

      clangOsc.connect(clangGain);
      clangGain.connect(this.masterGain);
      clangOsc.start(noteStart);
      clangOsc.stop(noteStart + 0.25);
    });
  }

  // 2-Stage Steel Armor Damaged: Heavy metallic thud + brief dual warning pulse
  playArmorDamage() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;

    // 1. Heavy metallic crunch/thud
    const bufferSize = Math.floor(this.ctx.sampleRate * 0.32);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.08));
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(1100, t);
    filter.frequency.exponentialRampToValueAtTime(120, t + 0.3);

    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.5, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(this.masterGain);
    noise.start(t);

    // Punch oscillator
    const punchOsc = this.ctx.createOscillator();
    const punchGain = this.ctx.createGain();
    punchOsc.type = 'sawtooth';
    punchOsc.frequency.setValueAtTime(160, t);
    punchOsc.frequency.exponentialRampToValueAtTime(40, t + 0.22);

    punchGain.gain.setValueAtTime(0.35, t);
    punchGain.gain.exponentialRampToValueAtTime(0.001, t + 0.24);

    punchOsc.connect(punchGain);
    punchGain.connect(this.masterGain);
    punchOsc.start(t);
    punchOsc.stop(t + 0.26);

    // 2. Brief low warning alarm pulse (two short beeps: t + 0.12s, t + 0.26s)
    [0.12, 0.26].forEach((offset) => {
      const pulseTime = t + offset;
      const warnOsc = this.ctx.createOscillator();
      const warnGain = this.ctx.createGain();

      warnOsc.type = 'sine';
      warnOsc.frequency.setValueAtTime(293.66, pulseTime); // D4 warning tone

      warnGain.gain.setValueAtTime(0.001, pulseTime);
      warnGain.gain.linearRampToValueAtTime(0.2, pulseTime + 0.015);
      warnGain.gain.exponentialRampToValueAtTime(0.001, pulseTime + 0.11);

      warnOsc.connect(warnGain);
      warnGain.connect(this.masterGain);
      warnOsc.start(pulseTime);
      warnOsc.stop(pulseTime + 0.12);
    });
  }
}

export const driveAudio = new DriveAudioManager();
