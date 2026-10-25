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
}

export const driveAudio = new DriveAudioManager();
