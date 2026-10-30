import React from 'react';
import { getDriverById } from './driversData';

// Fallback driver icons for 1970s dashboard badge
const DRIVER_ICONS = {
  elvis: '🎸',
  tex: '🤠',
  bond: '🍸',
  spiderman: '🕸️',
  diabolik: '💎',
  callaghan: '🔫',
  mg: '👑',
};

// Hardcoded duration constant per spec (defensive against commit order)
// ULTIMATE_DURATION = 7
const ULTIMATE_DURATION = 7;

/**
 * UltimateButton
 * 1970s red mushroom dashboard emergency/competition button.
 * Features:
 * - Chrome bezel with authentic machined zinc gradient
 * - Glossy red dome (radial-gradient #ff4d4d -> #7f0000) with specular top highlight
 * - Clockwise SVG charge ring (gold -> red)
 * - Pilot badge icon and charge %
 * - Ready state: strong pulsing red glow keyframe `ult-ready-glow` + engraved "ULTI" + hint
 * - Active state: pressed dome (scale 0.94, inset shadow) + draining ring in driver color
 *
 * Props: { charge, active, activeTime, driver, onActivate }
 */
export function UltimateButton({
  charge = 0,
  active = false,
  activeTime = 0,
  driver = 'elvis',
  onActivate,
}) {
  const driverData = getDriverById(driver);
  const driverColor = driverData?.accentColor || '#ef4444';
  const driverIcon = DRIVER_ICONS[driver] || '★';

  const isReady = !active && charge >= 100;
  const isCharging = !active && charge < 100;

  // SVG Ring Geometry: 68x68 viewBox, center (34, 34), radius 31
  const R = 31;
  const C = 2 * Math.PI * R; // ~194.78

  // Compute ring stroke offset
  let ringOffset = C;
  let ringStroke = 'url(#ultChargeGrad)';

  if (active) {
    const drainProg = Math.min(1, Math.max(0, (activeTime || 0) / ULTIMATE_DURATION));
    ringOffset = C * (1 - drainProg);
    ringStroke = driverColor;
  } else if (isReady) {
    ringOffset = 0; // 100% full
    ringStroke = '#ef4444';
  } else {
    const chargeProg = Math.min(100, Math.max(0, charge || 0)) / 100;
    ringOffset = C * (1 - chargeProg);
    ringStroke = 'url(#ultChargeGrad)';
  }

  const handleClick = (e) => {
    e.stopPropagation();
    if (onActivate) {
      onActivate();
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={
        active
          ? `Ultimate attiva (${activeTime.toFixed(1)}s)`
          : isReady
          ? 'Attiva Ultimate Pilota'
          : `Carica Ultimate ${Math.round(charge)}%`
      }
      title={
        active
          ? `Ultimate Attiva (${activeTime.toFixed(1)}s)`
          : isReady
          ? '🔥 ULTIMATE PRONTA! Tocca o Swipe Giù'
          : `Carica Ultimate: ${Math.round(charge)}%`
      }
      className="relative w-[68px] h-[68px] rounded-full p-0 border-0 bg-transparent flex items-center justify-center pointer-events-auto cursor-pointer active:scale-90 transition-transform duration-100 touch-manipulation select-none shrink-0"
    >
      {/* SVG Charge / Draining Ring */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox="0 0 68 68"
      >
        <defs>
          <linearGradient id="ultChargeGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
        </defs>

        {/* Ring background track */}
        <circle
          cx="34"
          cy="34"
          r={R}
          fill="none"
          stroke="#27272a"
          strokeWidth="3.2"
          opacity="0.55"
        />

        {/* Dynamic Foreground Ring (Rotated -90deg so it fills clockwise from 12 o'clock) */}
        <circle
          cx="34"
          cy="34"
          r={R}
          fill="none"
          stroke={ringStroke}
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray={C}
          strokeDashoffset={ringOffset}
          style={{
            transform: 'rotate(-90deg)',
            transformOrigin: '34px 34px',
            transition: active ? 'stroke-dashoffset 0.1s linear' : 'stroke-dashoffset 0.2s ease-out',
          }}
        />
      </svg>

      {/* 1970s Chrome Machined Bezel */}
      <div
        className={`relative w-[56px] h-[56px] rounded-full p-[2.5px] bg-gradient-to-b from-zinc-200 via-zinc-400 to-zinc-700 shadow-[0_4px_10px_rgba(0,0,0,0.85),inset_0_1px_1px_rgba(255,255,255,0.7),inset_0_-1px_1px_rgba(0,0,0,0.7)] flex items-center justify-center transition-all ${
          isReady ? 'ult-ready-glow' : ''
        }`}
      >
        {/* Glossy Red Mushroom Dome */}
        <div
          className={`relative w-full h-full rounded-full flex flex-col items-center justify-center overflow-hidden transition-all duration-150 ${
            active
              ? 'scale-[0.94] shadow-[inset_0_4px_10px_rgba(0,0,0,0.95),inset_0_0_8px_rgba(0,0,0,0.85)]'
              : isReady
              ? 'shadow-[0_0_15px_rgba(239,68,68,0.8),inset_0_2px_4px_rgba(255,255,255,0.7)]'
              : 'shadow-[inset_0_2px_4px_rgba(255,255,255,0.35),0_2px_6px_rgba(0,0,0,0.7)]'
          }`}
          style={{
            background: isReady
              ? 'radial-gradient(circle at 35% 25%, #ff4d4d 0%, #dc2626 45%, #7f0000 100%)'
              : active
              ? 'radial-gradient(circle at 35% 25%, #991b1b 0%, #7f1d1d 50%, #450a0a 100%)'
              : 'radial-gradient(circle at 35% 25%, #881337 0%, #7f1d1d 50%, #450a0a 100%)',
          }}
        >
          {/* Specular curved highlight on top of dome */}
          <div
            className={`absolute top-1 left-1/2 -translate-x-1/2 w-6 h-2 rounded-full pointer-events-none ${
              isReady
                ? 'bg-gradient-to-b from-white/85 to-transparent'
                : active
                ? 'bg-gradient-to-b from-white/20 to-transparent'
                : 'bg-gradient-to-b from-white/35 to-transparent'
            }`}
          />

          {/* Dome Face Content based on state */}
          {active ? (
            <>
              <span
                className="font-mono text-[12px] font-black leading-none drop-shadow"
                style={{ color: driverColor }}
              >
                {activeTime.toFixed(1)}s
              </span>
              <span className="text-[7px] font-mono font-bold text-white/70 uppercase tracking-tighter mt-0.5 leading-none">
                ATTIVA
              </span>
            </>
          ) : isReady ? (
            <>
              <span className="font-mono text-[12px] font-black tracking-wider text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] leading-none select-none">
                ULTI
              </span>
              <span className="text-[7.5px] font-mono font-black text-amber-200 tracking-tight leading-none mt-0.5 animate-pulse select-none">
                TOCCA / ↓
              </span>
            </>
          ) : (
            <>
              <span className="text-[14px] leading-none select-none drop-shadow-sm">
                {driverIcon}
              </span>
              <span className="text-[8.5px] font-mono font-bold text-amber-300/90 leading-none mt-0.5 select-none">
                {Math.round(charge)}%
              </span>
            </>
          )}
        </div>
      </div>
    </button>
  );
}
