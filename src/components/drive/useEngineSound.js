// Physical-Modeling Alfa Romeo Bialbero 1779cc (AR01608) Sound Synthesizer + Hybrid Sample Engine
// Eliminates harsh digital sawtooth buzz by using a custom Fourier PeriodicWave (1-3-4-2 firing harmonics),
// dual 4-in-2-in-1 manifold phase chorus, Weber 40 DCOE intake formant resonator, soft tube saturation,
// dynamic Galleria Alpina tunnel slapback echo, and automatic support for /audio/alfa-bialbero-loop.mp3.

import { useEffect, useRef } from 'react';
import { driveStore } from './driveStore';

function createSoftTubeSaturationCurve() {
  const samples = 1024;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = Math.tanh(x * 1.55);
  }
  return curve;
}

export function useEngineSound() {
  const ctxRef = useRef(null);
  const masterGainRef = useRef(null);
  const cylOscARef = useRef(null);
  const cylOscBRef = useRef(null);
  const subOscRef = useRef(null);
  const mufflerFilterRef = useRef(null);
  const weberFilterRef = useRef(null);
  const weberGainRef = useRef(null);
  const airNoiseGainRef = useRef(null);
  const tunnelWetGainRef = useRef(null);
  const sampleSourceRef = useRef(null);
  const sampleGainRef = useRef(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    let animId;

    const initAudio = () => {
      if (ctxRef.current) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      ctxRef.current = ctx;

      // 1. Master Volume & Warm Cabin High-Cut (prevents any harsh digital top-end)
      const master = ctx.createGain();
      master.gain.value = 0;

      const cabinHighCut = ctx.createBiquadFilter();
      cabinHighCut.type = 'lowpass';
      cabinHighCut.frequency.value = 1350;
      cabinHighCut.Q.value = 0.7;

      master.connect(cabinHighCut);
      cabinHighCut.connect(ctx.destination);
      masterGainRef.current = master;

      // 2. Galleria Alpina Tunnel Slapback Echo Bus
      const tunnelDelay = ctx.createDelay(0.5);
      tunnelDelay.delayTime.value = 0.078;
      const tunnelFeedback = ctx.createGain();
      tunnelFeedback.gain.value = 0.34;
      const tunnelDamp = ctx.createBiquadFilter();
      tunnelDamp.type = 'lowpass';
      tunnelDamp.frequency.value = 720;
      const tunnelWet = ctx.createGain();
      tunnelWet.gain.value = 0.0;

      tunnelDelay.connect(tunnelDamp);
      tunnelDamp.connect(tunnelFeedback);
      tunnelFeedback.connect(tunnelDelay);
      tunnelDamp.connect(tunnelWet);
      tunnelWet.connect(master);
      tunnelWetGainRef.current = tunnelWet;

      // 3. Soft Analog Tube / Cast-Iron Manifold Saturation
      const shaper = ctx.createWaveShaper();
      shaper.curve = createSoftTubeSaturationCurve();
      shaper.oversample = '2x';
      shaper.connect(master);
      shaper.connect(tunnelDelay);

      // 4. Acoustic Formant Filter Bank:
      // 4a. Deep Exhaust Muffler Body (warm lowpass)
      const mufflerFilter = ctx.createBiquadFilter();
      mufflerFilter.type = 'lowpass';
      mufflerFilter.frequency.value = 240;
      mufflerFilter.Q.value = 1.45;
      mufflerFilter.connect(shaper);
      mufflerFilterRef.current = mufflerFilter;

      // 4b. Weber 40 DCOE / Dell'Orto Twin-Carburetor Throat Formant (opens under engine load)
      const weberFilter = ctx.createBiquadFilter();
      weberFilter.type = 'bandpass';
      weberFilter.frequency.value = 460;
      weberFilter.Q.value = 2.1;
      const weberGain = ctx.createGain();
      weberGain.gain.value = 0.14;
      weberFilter.connect(weberGain);
      weberGain.connect(shaper);
      weberFilterRef.current = weberFilter;
      weberGainRef.current = weberGain;

      // 5. Custom Fourier PeriodicWave for 4-Cylinder 1-3-4-2 Firing Order
      // Smooth low harmonics ONLY (zero harsh upper sawtooth buzz!)
      const real = new Float32Array([0, 0.55, 1.0, 0.42, 0.22, 0.10, 0.04, 0.015]);
      const imag = new Float32Array([0, 0.0, 0.15, -0.08, 0.04, 0.0, 0.0, 0.0]);
      const bialberoWave = ctx.createPeriodicWave(real, imag, { disableNormalization: false });

      // Primary Bank (Cylinders 1 & 4)
      const cylOscA = ctx.createOscillator();
      cylOscA.setPeriodicWave(bialberoWave);
      cylOscA.frequency.value = 55;
      const gainA = ctx.createGain();
      gainA.gain.value = 0.34;
      cylOscA.connect(gainA);
      gainA.connect(mufflerFilter);
      gainA.connect(weberFilter);
      cylOscA.start();
      cylOscARef.current = cylOscA;

      // Secondary Bank (Cylinders 2 & 3 — 4-in-2-in-1 header phase chorus)
      const cylOscB = ctx.createOscillator();
      cylOscB.setPeriodicWave(bialberoWave);
      cylOscB.frequency.value = 55.4;
      const gainB = ctx.createGain();
      gainB.gain.value = 0.28;
      cylOscB.connect(gainB);
      gainB.connect(mufflerFilter);
      gainB.connect(weberFilter);
      cylOscB.start();
      cylOscBRef.current = cylOscB;

      // Deep Crankshaft Sub-Harmonic Warmth (Sine)
      const subOsc = ctx.createOscillator();
      subOsc.type = 'sine';
      subOsc.frequency.value = 27.5;
      const subGain = ctx.createGain();
      subGain.gain.value = 0.26;
      subOsc.connect(subGain);
      subGain.connect(master);
      subOsc.start();
      subOscRef.current = subOsc;

      // 6. Warm Pink-Noise Carburetor Air Induction & Road Wind (No white-noise static!)
      const bufferSize = ctx.sampleRate * 2;
      const pinkBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const out = pinkBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.997 * b0 + white * 0.029;
        b1 = 0.985 * b1 + white * 0.032;
        b2 = 0.950 * b2 + white * 0.048;
        out[i] = (b0 + b1 + b2) * 0.35;
      }
      const pinkNoise = ctx.createBufferSource();
      pinkNoise.buffer = pinkBuffer;
      pinkNoise.loop = true;

      const airFilter = ctx.createBiquadFilter();
      airFilter.type = 'bandpass';
      airFilter.frequency.value = 420;
      airFilter.Q.value = 1.5;

      const airGain = ctx.createGain();
      airGain.gain.value = 0.03;

      pinkNoise.connect(airFilter);
      airFilter.connect(airGain);
      airGain.connect(master);
      pinkNoise.start();
      airNoiseGainRef.current = airGain;

      // 7. Optional Hybrid Real Audio Sample Loader (/audio/alfa-bialbero-loop.mp3)
      // If you drop a real Alfa Bialbero loop into public/audio/alfa-bialbero-loop.mp3, it blends automatically!
      fetch('/audio/alfa-bialbero-loop.mp3')
        .then((res) => {
          const contentType = res.headers.get('content-type') || '';
          if (!res.ok || contentType.includes('text/html')) return null;
          return res.arrayBuffer();
        })
        .then((buf) => (buf ? ctx.decodeAudioData(buf) : null))
        .then((audioBuf) => {
          if (!audioBuf || !ctxRef.current) return;
          const src = ctx.createBufferSource();
          src.buffer = audioBuf;
          src.loop = true;
          const sGain = ctx.createGain();
          sGain.gain.value = 0.55;
          src.connect(sGain);
          sGain.connect(master);
          src.start();
          sampleSourceRef.current = src;
          sampleGainRef.current = sGain;
        })
        .catch(() => {});
    };

    const updateAudio = () => {
      animId = requestAnimationFrame(updateAudio);

      const isDrive = driveStore.mode === 'drive';
      const isPlayingGame = driveStore.gameState === 'playing';
      const isSoundOn = driveStore.soundEnabled;

      if (!isDrive || !isSoundOn || !isPlayingGame) {
        if (masterGainRef.current && isPlayingRef.current && ctxRef.current) {
          masterGainRef.current.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.12);
          isPlayingRef.current = false;
        }
        return;
      }

      if (!ctxRef.current) {
        initAudio();
      }
      if (!ctxRef.current) return;

      if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume();
      }

      const rpm = Math.max(950, driveStore.rpm || 2800);
      const load = driveStore.engineLoad !== undefined ? driveStore.engineLoad : 0.45;
      const isShifting = (driveStore.shiftTimer || 0) > 0;
      const isGalleria = driveStore.getCurrentZone().id === 'galleria';
      const t = ctxRef.current.currentTime;

      // 4-cylinder firing frequency (2 power strokes per crank revolution = RPM / 60,
      // scaled to a warm baritone register so high RPMs sound throaty, never squeaky)
      const firingFreq = (rpm / 60) * 1.15; // ~54 Hz at 2800 RPM -> ~115 Hz at 6000 RPM

      if (cylOscARef.current) {
        cylOscARef.current.frequency.setTargetAtTime(firingFreq, t, 0.045);
      }
      if (cylOscBRef.current) {
        cylOscBRef.current.frequency.setTargetAtTime(firingFreq * 1.008, t, 0.045);
      }
      if (subOscRef.current) {
        subOscRef.current.frequency.setTargetAtTime(firingFreq * 0.5, t, 0.045);
      }

      // Optional real sample pitch-tracking
      if (sampleSourceRef.current) {
        const rate = Math.max(0.55, Math.min(1.65, rpm / 3800));
        sampleSourceRef.current.playbackRate.setTargetAtTime(rate, t, 0.05);
      }

      // Muffler filter opens smoothly with RPM, dips slightly during clutch gear shifts
      if (mufflerFilterRef.current) {
        const shiftDip = isShifting ? 0.65 : 1.0;
        const cutoff = (175 + ((rpm - 1000) / 5200) * 340) * shiftDip;
        mufflerFilterRef.current.frequency.setTargetAtTime(cutoff, t, 0.06);
      }

      // Weber 40 DCOE intake formant sings under load (uphill climbs, acceleration, Nitro)
      if (weberFilterRef.current && weberGainRef.current) {
        const weberFreq = 340 + ((rpm - 1000) / 5200) * 520;
        const weberVol = isShifting ? 0.04 : 0.08 + load * 0.22;
        weberFilterRef.current.frequency.setTargetAtTime(weberFreq, t, 0.06);
        weberGainRef.current.gain.setTargetAtTime(weberVol, t, 0.06);
      }

      // Warm aerodynamic & carburetor air rush
      if (airNoiseGainRef.current) {
        const targetAir = 0.02 + (driveStore.speedKmh / 200) * 0.045 + load * 0.025;
        airNoiseGainRef.current.gain.setTargetAtTime(targetAir, t, 0.08);
      }

      // Galleria Alpina tunnel slapback echo
      if (tunnelWetGainRef.current) {
        tunnelWetGainRef.current.gain.setTargetAtTime(isGalleria ? 0.42 : 0.04, t, 0.2);
      }

      // Balanced, non-fatiguing master engine volume (leaves headroom for coins & stingers!)
      if (masterGainRef.current) {
        const targetMaster = isShifting ? 0.16 : 0.24;
        masterGainRef.current.gain.setTargetAtTime(targetMaster, t, 0.12);
        isPlayingRef.current = true;
      }
    };

    animId = requestAnimationFrame(updateAudio);

    return () => {
      cancelAnimationFrame(animId);
      if (ctxRef.current) {
        ctxRef.current.close().catch(() => {});
        ctxRef.current = null;
      }
    };
  }, []);
}
