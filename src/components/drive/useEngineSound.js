// Authentic Bialbero Alfa Romeo (1779cc Twin-Cam) sound synthesizer using Web Audio API
// Generates dual-throat Dell'Orto carburetor induction roar and exhaust pulses linked to RPM

import { useEffect, useRef } from 'react';
import { driveStore } from './driveStore';

export function useEngineSound() {
  const ctxRef = useRef(null);
  const masterGainRef = useRef(null);
  const osc1Ref = useRef(null);
  const osc2Ref = useRef(null);
  const subOscRef = useRef(null);
  const filterRef = useRef(null);
  const noiseGainRef = useRef(null);
  const isPlayingRef = useRef(false);

  useEffect(() => {
    let animId;

    const initAudio = () => {
      if (ctxRef.current) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      ctxRef.current = ctx;

      // Master volume node
      const master = ctx.createGain();
      master.gain.value = 0;
      master.connect(ctx.destination);
      masterGainRef.current = master;

      // Resonant Lowpass Filter (Carburetor intake resonance)
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 450;
      filter.Q.value = 3.5;
      filter.connect(master);
      filterRef.current = filter;

      // Primary cylinder pulse oscillator (sawtooth for aggressive Italian exhaust bite)
      const osc1 = ctx.createOscillator();
      osc1.type = 'sawtooth';
      osc1.frequency.value = 35;
      const gain1 = ctx.createGain();
      gain1.gain.value = 0.45;
      osc1.connect(gain1);
      gain1.connect(filter);
      osc1.start();
      osc1Ref.current = osc1;

      // Secondary twin-cam induction harmonic oscillator (square / triangle detuned)
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.value = 70;
      const gain2 = ctx.createGain();
      gain2.gain.value = 0.35;
      osc2.connect(gain2);
      gain2.connect(filter);
      osc2.start();
      osc2Ref.current = osc2;

      // Deep sub-harmonic rumble for low end
      const sub = ctx.createOscillator();
      sub.type = 'sine';
      sub.frequency.value = 25;
      const subGain = ctx.createGain();
      subGain.gain.value = 0.3;
      sub.connect(subGain);
      subGain.connect(master);
      sub.start();
      subOscRef.current = sub;

      // Air intake hiss / exhaust flutter using white noise buffer
      const bufferSize = ctx.sampleRate * 2;
      const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }
      const whiteNoise = ctx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      whiteNoise.loop = true;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.value = 800;
      noiseFilter.Q.value = 2.0;

      const noiseGain = ctx.createGain();
      noiseGain.gain.value = 0.04;

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      whiteNoise.start();
      noiseGainRef.current = noiseGain;
    };

    const updateAudio = () => {
      animId = requestAnimationFrame(updateAudio);

      const isDrive = driveStore.mode === 'drive';
      const isSoundOn = driveStore.soundEnabled;

      if (!isDrive || !isSoundOn) {
        if (masterGainRef.current && isPlayingRef.current) {
          masterGainRef.current.gain.setTargetAtTime(0, ctxRef.current.currentTime, 0.15);
          isPlayingRef.current = false;
        }
        return;
      }

      // Initialize audio context on first play
      if (!ctxRef.current) {
        initAudio();
      }

      if (ctxRef.current.state === 'suspended') {
        ctxRef.current.resume();
      }

      // Calculate fundamental 4-cylinder engine frequency (2 strokes per revolution)
      // Fundamental = RPM / 60 * 2 = RPM / 30
      const rpm = Math.max(850, driveStore.rpm);
      const fundamental = rpm / 30; // ~31 Hz at 950 RPM, ~180 Hz at 5400 RPM
      const t = ctxRef.current.currentTime;

      if (osc1Ref.current) {
        osc1Ref.current.frequency.setTargetAtTime(fundamental, t, 0.05);
      }
      if (osc2Ref.current) {
        // Harmonic twin-cam overtone with slight detuning
        osc2Ref.current.frequency.setTargetAtTime(fundamental * 2.02, t, 0.05);
      }
      if (subOscRef.current) {
        subOscRef.current.frequency.setTargetAtTime(fundamental * 0.5, t, 0.05);
      }

      // Filter opens wide when accelerating (carburetor butterfly plates opening)
      if (filterRef.current) {
        const throttleBoost = driveStore.throttle * 800;
        const targetCutoff = 350 + (rpm / 6000) * 1400 + throttleBoost;
        filterRef.current.frequency.setTargetAtTime(targetCutoff, t, 0.08);
      }

      // Hiss and intake air increases with speed and throttle
      if (noiseGainRef.current) {
        const targetNoise = 0.02 + (driveStore.speedKmh / 200) * 0.08 + driveStore.throttle * 0.05;
        noiseGainRef.current.gain.setTargetAtTime(targetNoise, t, 0.08);
      }

      if (masterGainRef.current && !isPlayingRef.current) {
        masterGainRef.current.gain.setTargetAtTime(0.32, t, 0.25);
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
