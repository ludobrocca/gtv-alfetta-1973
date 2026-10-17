// Authentic 1970s Veglia Borletti Speedometer HUD & Drive Controls
// Styled after classic Alfa Romeo Alfetta GTV dual round instrument binnacle

import React, { useEffect, useState } from 'react';
import { Volume2, VolumeX, ArrowLeft, Gauge, Zap } from 'lucide-react';
import { driveStore } from './driveStore';

export function Speedometer({ onExitDrive }) {
  const [speed, setSpeed] = useState(0);
  const [gear, setGear] = useState(1);
  const [rpm, setRpm] = useState(950);
  const [distance, setDistance] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [throttleActive, setThrottleActive] = useState(false);
  const [brakeActive, setBrakeActive] = useState(false);
  const [cruiseSpeed, setCruiseSpeed] = useState(driveStore.cruiseSpeed);

  useEffect(() => {
    let animId;
    let lastUpdate = 0;

    const tick = (now) => {
      animId = requestAnimationFrame(tick);
      // Update HUD at 25Hz to maintain high UI responsiveness
      if (now - lastUpdate > 40) {
        lastUpdate = now;
        setSpeed(Math.round(driveStore.speedKmh));
        setGear(driveStore.gear);
        setRpm(Math.round(driveStore.rpm));
        setDistance(driveStore.distanceMeters);
        setSoundEnabled(driveStore.soundEnabled);
        setCruiseSpeed(driveStore.cruiseSpeed);
      }
    };
    animId = requestAnimationFrame(tick);

    // Keyboard controls: ArrowUp/W for accelerate, ArrowDown/S for brake, Space for handbrake
    const handleKeyDown = (e) => {
      if (e.repeat) return;
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        driveStore.setThrottle(1);
        setThrottleActive(true);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === ' ') {
        driveStore.setBrake(1);
        setBrakeActive(true);
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        driveStore.setThrottle(0);
        setThrottleActive(false);
      } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === ' ') {
        driveStore.setBrake(0);
        setBrakeActive(false);
      }
    };

    // Safety: if the user releases the mouse button anywhere on screen or switches windows, release throttle and brake
    const handleGlobalRelease = () => {
      driveStore.setThrottle(0);
      driveStore.setBrake(0);
      setThrottleActive(false);
      setBrakeActive(false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mouseup', handleGlobalRelease);
    window.addEventListener('blur', handleGlobalRelease);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mouseup', handleGlobalRelease);
      window.removeEventListener('blur', handleGlobalRelease);
    };
  }, []);

  // Needle angle: 0 km/h = -135deg, 220 km/h = +135deg (total 270 deg sweep)
  const needleDeg = -135 + (Math.min(220, speed) / 220) * 270;

  // Format mechanical odometer km
  const totalKm = (46388 + distance / 1000).toFixed(1);

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 sm:p-6 z-20">
      {/* Top Bar: Return to Showroom & Audio Toggle */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        <button
          onClick={onExitDrive}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/20 bg-black/60 backdrop-blur-md text-white text-xs font-mono uppercase tracking-wider hover:border-alfa-gold hover:text-alfa-gold transition-all shadow-xl active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Torna allo Showroom</span>
        </button>

        <div className="flex items-center gap-3">
          {/* Sound Toggle */}
          <button
            onClick={() => driveStore.toggleSound()}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border backdrop-blur-md text-xs font-mono tracking-wider transition-all shadow-xl active:scale-95 ${
              soundEnabled
                ? 'border-alfa-gold bg-alfa-gold/20 text-alfa-gold'
                : 'border-white/20 bg-black/60 text-zinc-400 hover:text-white'
            }`}
            title="Bialbero 1779cc Sound Synthesizer"
          >
            {soundEnabled ? (
              <>
                <Volume2 className="w-4 h-4 text-alfa-gold animate-pulse" />
                <span className="hidden sm:inline">Bialbero Audio: ON</span>
              </>
            ) : (
              <>
                <VolumeX className="w-4 h-4 text-zinc-400" />
                <span className="hidden sm:inline">Audio: OFF</span>
              </>
            )}
          </button>

          {/* Mode Pill */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 backdrop-blur-md text-emerald-400 text-xs font-mono uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>In Corsa • 1779cc</span>
          </div>
        </div>
      </div>

      {/* Bottom Center: Veglia Borletti Speedometer Dial + Acceleration Controls */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pointer-events-auto mx-auto mb-2">
        {/* Speedometer Instrument Dial */}
        <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-full p-2 bg-gradient-to-b from-zinc-700 via-zinc-900 to-black shadow-2xl border-4 border-zinc-600/80 flex items-center justify-center">
          {/* Outer Chrome Bezel */}
          <div className="absolute inset-1 rounded-full border border-white/25 pointer-events-none" />

          {/* Dial Face */}
          <div className="relative w-full h-full rounded-full bg-[#111417] flex items-center justify-center overflow-hidden shadow-inner">
            {/* Speed Dial Radial Hash Ticks & Numbers */}
            <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 200 200">
              {/* Radial tick marks from -135deg to +135deg */}
              {Array.from({ length: 23 }).map((_, i) => {
                const km = i * 10;
                const deg = -135 + (km / 220) * 270;
                const rad = (deg - 90) * (Math.PI / 180);
                const isMajor = km % 20 === 0;
                const r1 = 88;
                const r2 = isMajor ? 74 : 80;
                const x1 = 100 + r1 * Math.cos(rad);
                const y1 = 100 + r1 * Math.sin(rad);
                const x2 = 100 + r2 * Math.cos(rad);
                const y2 = 100 + r2 * Math.sin(rad);

                const tx = 100 + 62 * Math.cos(rad);
                const ty = 100 + 62 * Math.sin(rad) + 4;

                return (
                  <g key={i}>
                    <line
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke={isMajor ? '#f5f7fa' : '#9ba3af'}
                      strokeWidth={isMajor ? 2.2 : 1.2}
                    />
                    {isMajor && (
                      <text
                        x={tx}
                        y={ty}
                        fill="#e5e7eb"
                        fontSize="9"
                        fontWeight="600"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {km}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>

            {/* Brand Marking */}
            <div className="absolute top-11 text-center pointer-events-none">
              <p className="text-[8px] font-mono tracking-[0.2em] uppercase text-zinc-400">VEGLIA</p>
              <p className="text-[6px] font-mono tracking-[0.16em] uppercase text-zinc-500">BORLETTI</p>
            </div>

            {/* Mechanical Rolling Odometer */}
            <div className="absolute top-20 px-2 py-0.5 rounded bg-black/90 border border-zinc-700/80 font-mono text-[9px] text-zinc-300 tracking-wider shadow-inner">
              {totalKm} km
            </div>

            {/* Digital Speed & Gear readout */}
            <div className="absolute bottom-9 text-center pointer-events-none">
              <span className="text-2xl sm:text-3xl font-mono font-bold text-white tracking-tight">
                {speed}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 block -mt-1">km/h</span>
            </div>

            {/* Transaxle Gear Badge */}
            <div className="absolute bottom-3 px-2 py-0.5 rounded-full border border-alfa-gold/40 bg-alfa-gold/15 text-alfa-gold text-[9px] font-mono font-semibold tracking-wider">
              MARCIA {gear}ª
            </div>

            {/* Orange-Red Classic Needle */}
            <div
              className="absolute w-1 bg-gradient-to-t from-red-600 via-orange-500 to-amber-300 rounded-full shadow-lg origin-bottom transition-transform duration-75 ease-out pointer-events-none"
              style={{
                height: '74px',
                bottom: '50%',
                transform: `rotate(${needleDeg}deg)`,
              }}
            />

            {/* Center Chrome Hub */}
            <div className="absolute w-5 h-5 rounded-full bg-gradient-to-br from-zinc-300 via-zinc-600 to-black border border-white/60 shadow-md" />
          </div>
        </div>

        {/* Driving Controls: Accel / Brake Pedals & Quick Cruising Buttons */}
        <div className="flex flex-col gap-2">
          {/* Controls guidance hint */}
          <div className="text-center text-[10px] font-mono text-zinc-400 tracking-wider select-none">
            <span className="text-alfa-gold">W</span> ACCELERA &nbsp;•&nbsp; RILASCIA PER FRENO MOTORE &nbsp;•&nbsp; <span className="text-red-400">S</span> FRENO
          </div>

          <div className="flex items-center gap-2">
            {/* Brake Button */}
            <button
              onMouseDown={() => {
                driveStore.setBrake(1);
                setBrakeActive(true);
              }}
              onMouseUp={() => {
                driveStore.setBrake(0);
                setBrakeActive(false);
              }}
              onMouseLeave={() => {
                driveStore.setBrake(0);
                setBrakeActive(false);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                driveStore.setBrake(1);
                setBrakeActive(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                driveStore.setBrake(0);
                setBrakeActive(false);
              }}
              onTouchCancel={() => {
                driveStore.setBrake(0);
                setBrakeActive(false);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border font-mono text-xs uppercase tracking-wider shadow-xl select-none transition-all ${
                brakeActive
                  ? 'border-red-500 bg-red-600 text-white scale-95 shadow-red-900/50 shadow-lg'
                  : 'border-red-500/40 bg-red-950/40 text-red-300 hover:bg-red-900/50'
              }`}
            >
              <span>FRENA (S)</span>
            </button>

            {/* Accelerate Button */}
            <button
              onMouseDown={() => {
                driveStore.setThrottle(1);
                setThrottleActive(true);
              }}
              onMouseUp={() => {
                driveStore.setThrottle(0);
                setThrottleActive(false);
              }}
              onMouseLeave={() => {
                driveStore.setThrottle(0);
                setThrottleActive(false);
              }}
              onTouchStart={(e) => {
                e.preventDefault();
                driveStore.setThrottle(1);
                setThrottleActive(true);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                driveStore.setThrottle(0);
                setThrottleActive(false);
              }}
              onTouchCancel={() => {
                driveStore.setThrottle(0);
                setThrottleActive(false);
              }}
              className={`flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl border font-mono text-xs uppercase tracking-wider shadow-xl select-none transition-all ${
                throttleActive
                  ? 'border-emerald-400 bg-emerald-500 text-black font-bold scale-95 shadow-emerald-900/50 shadow-lg'
                  : 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/50'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              <span>ACCELERA (W)</span>
            </button>
          </div>

          {/* Quick Cruise Speed Presets & Status Indicator */}
          <div className="flex items-center justify-between gap-1.5 px-3 py-2 rounded-xl border border-white/10 bg-black/60 backdrop-blur-md text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-500">Modalità:</span>
              {cruiseSpeed !== null ? (
                <span className="px-1.5 py-0.5 rounded bg-alfa-gold/25 text-alfa-gold text-[10px] font-bold border border-alfa-gold/40">
                  CRUISE {cruiseSpeed}
                </span>
              ) : (
                <span className="px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] border border-white/10">
                  MANUALE (W/S)
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              <span className="text-zinc-500 mr-0.5">Cruise:</span>
              {[60, 95, 130, 175].map((targetKmh) => {
                const isCurrentCruise = cruiseSpeed === targetKmh;
                return (
                  <button
                    key={targetKmh}
                    onClick={() => driveStore.setCruise(isCurrentCruise ? null : targetKmh)}
                    className={`px-2 py-1 rounded text-[10px] font-medium transition-all ${
                      isCurrentCruise
                        ? 'bg-alfa-gold text-black font-bold shadow-md ring-1 ring-white/50'
                        : 'bg-white/10 text-zinc-300 hover:bg-white/20'
                    }`}
                    title={isCurrentCruise ? 'Disattiva Cruise Control' : `Attiva Cruise a ${targetKmh} km/h`}
                  >
                    {targetKmh}
                  </button>
                );
              })}
              <span className="text-zinc-500 ml-0.5">km/h</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
