// Web Audio API Sound Effects & Retro 50s Rockabilly Jingle Engine
// 100% royalty-free, ultra-lightweight, zero external MP3 assets needed.

class DriveAudioManager {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.elvisInterval = null;
    this.isMuted = false;
  }

  init() {
    if (this.ctx) return;
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    this.ctx = new AudioCtx();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.5;
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
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.5, this.ctx.currentTime, 0.05);
    }
  }

  // Coin / Quadrifoglio Pickup: Bright sparkling Italian chime
  playCoinPickup() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(1046.5, t); // C6
    osc.frequency.exponentialRampToValueAtTime(1567.98, t + 0.08); // G6
    osc.frequency.exponentialRampToValueAtTime(2093.0, t + 0.16); // C7

    gain.gain.setValueAtTime(0.25, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  // Tex Willer: Western Golden Shield Aura & Impact blast
  playTexShield() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    // Resonant brassy trumpet blast / heroic Western chord
    const freqs = [330, 440, 554, 660]; // A major triad
    freqs.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, t);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.02, t + 0.4);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200 + idx * 400, t);

      gain.gain.setValueAtTime(0.12, t + idx * 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.7);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t + idx * 0.04);
      osc.stop(t + 0.75);
    });
  }

  // Tex Willer smashing through an obstacle
  playSmash() {
    if (this.isMuted) return;
    this.ensureContext();
    if (!this.ctx) return;

    const t = this.ctx.currentTime;
    const bufferSize = this.ctx.sampleRate * 0.3;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.06));
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(800, t);
    filter.frequency.linearRampToValueAtTime(120, t + 0.3);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);

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
