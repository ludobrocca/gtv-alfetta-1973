import React from 'react';

/**
 * Authentic 1970s Alfa Romeo Alfetta GTV (1976) Transaxle Gearbox Console & Autodelta Tachometer
 *
 * Visual features:
 * - Hand-stitched black leather & brushed aluminium transaxle console styling
 * - Milled chrome H-gate shift plate with 5 forward gears + Reverse (opacity 0.35)
 * - Mahogany wood shift knob with central gold Alfa badge, animated via spring cubic-bezier
 * - Knob vibration (gear-knob-shake) when RPM > 5500, gold/red drop-shadow glow in shift window
 * - 24-segment Autodelta tachometer (1.000 to 7.000 RPM) with dedicated "ZONA DOPPIETTA" band
 * - Limiter flash animation (gear-limiter-flash) when RPM >= 6500
 * - Right gear drum display with large monospace gear digit, "5ª OD" / "OD" indicator,
 *   live RPM reading, and pulsing red round lamp "⚡ CAMBIA!" when shift window is active
 * - Non-intrusive floating shift feedback chip at the top edge of the console (-top-3)
 */

const GEAR_COORDS = {
  1: { x: 20, y: 16 },
  2: { x: 20, y: 44 },
  3: { x: 42, y: 16 },
  4: { x: 42, y: 44 },
  5: { x: 64, y: 16 },
  R: { x: 64, y: 44 },
};

const TOTAL_SEGMENTS = 24;
const RPM_MIN = 1000;
const RPM_MAX = 7000;
const RPM_STEP = (RPM_MAX - RPM_MIN) / TOTAL_SEGMENTS; // 250 RPM / segment

export function AlfaGearboxConsole({
  gear = 1,
  rpm = 950,
  shiftWindowActive = false,
  overdriveActive = false,
  shiftFeedback = null,
  onShift,
}) {
  const safeRpm = typeof rpm === 'number' && !isNaN(rpm) ? Math.round(rpm) : 950;
  const knobPos = GEAR_COORDS[gear] || GEAR_COORDS[1];

  return (
    <button
      type="button"
      onClick={onShift}
      aria-label="Cambia marcia"
      className="relative w-full max-w-md h-[72px] sm:h-[76px] rounded-2xl border border-zinc-600 bg-gradient-to-b from-zinc-800 via-zinc-900 to-black p-2 px-3 flex items-center justify-between gap-2 shadow-2xl pointer-events-auto active:scale-95 transition-transform duration-75 select-none touch-manipulation cursor-pointer overflow-visible text-left"
    >
      {/* Subtle dashed stitching for authentic 1970s Alfa leather console look */}
      <div className="absolute inset-1 rounded-xl border border-dashed border-zinc-500/30 pointer-events-none" />

      {/* Floating shift feedback chip at top edge of console */}
      {shiftFeedback && (
        <div
          className={`absolute -top-3 left-1/2 -translate-x-1/2 pointer-events-none z-30 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] sm:text-[11px] font-mono font-bold tracking-wider uppercase whitespace-nowrap shadow-xl backdrop-blur-md shift-feedback-pop ${
            shiftFeedback.quality === 'perfect'
              ? 'border-amber-400 bg-amber-950/95 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.6)]'
              : shiftFeedback.quality === 'overdrive'
              ? 'border-fuchsia-400 bg-fuchsia-950/95 text-fuchsia-300 shadow-[0_0_14px_rgba(217,70,239,0.6)]'
              : shiftFeedback.quality === 'good'
              ? 'border-emerald-500 bg-zinc-900/95 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.4)]'
              : 'border-zinc-500 bg-zinc-900/95 text-zinc-300 shadow-[0_0_8px_rgba(113,113,122,0.3)]'
          }`}
        >
          <span>{shiftFeedback.label || ''}</span>
        </div>
      )}

      {/* 1. Left: Milled Chrome H-Gate Shift Plate SVG */}
      <div className="relative flex-shrink-0" title="Griglia cambio ad H Alfa Romeo">
        <svg
          width="84"
          height="60"
          viewBox="0 0 84 60"
          className="flex-shrink-0 overflow-visible"
          aria-label="Griglia ad H cambio a 5 marce"
        >
          <defs>
            {/* Chrome metallic slot gradient */}
            <linearGradient id="alfa-chrome-slot" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d4d4d8" />
              <stop offset="45%" stopColor="#71717a" />
              <stop offset="80%" stopColor="#27272a" />
              <stop offset="100%" stopColor="#a1a1aa" />
            </linearGradient>

            {/* Pomello mogano radial gradient: #7c2d12 -> #3b0a02 */}
            <radialGradient id="alfa-mahogany-knob" cx="35%" cy="35%" r="65%">
              <stop offset="0%" stopColor="#7c2d12" />
              <stop offset="100%" stopColor="#3b0a02" />
            </radialGradient>
          </defs>

          {/* Brushed metal recessed bezel base plate */}
          <rect x="6" y="2" width="72" height="56" rx="6" fill="#18181b" stroke="#3f3f46" strokeWidth="1" />
          <rect x="8" y="4" width="68" height="52" rx="4" fill="#09090b" stroke="#27272a" strokeWidth="0.5" />

          {/* Chrome slot channels: 3 vertical gates + 1 center crossbar */}
          <path
            d="M 20 16 L 20 44 M 20 30 L 64 30 M 42 16 L 42 44 M 64 16 L 64 44"
            stroke="url(#alfa-chrome-slot)"
            strokeWidth="5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M 20 16 L 20 44 M 20 30 L 64 30 M 42 16 L 42 44 M 64 16 L 64 44"
            stroke="#09090b"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Gear labels: 1ª, 2ª, 3ª, 4ª, 5ª, R (opacity 0.35) */}
          <text
            x="20"
            y="9"
            textAnchor="middle"
            className={`text-[7.5px] font-mono font-bold ${gear === 1 ? 'fill-amber-400' : 'fill-zinc-400'}`}
          >
            1ª
          </text>
          <text
            x="20"
            y="55"
            textAnchor="middle"
            className={`text-[7.5px] font-mono font-bold ${gear === 2 ? 'fill-amber-400' : 'fill-zinc-400'}`}
          >
            2ª
          </text>
          <text
            x="42"
            y="9"
            textAnchor="middle"
            className={`text-[7.5px] font-mono font-bold ${gear === 3 ? 'fill-amber-400' : 'fill-zinc-400'}`}
          >
            3ª
          </text>
          <text
            x="42"
            y="55"
            textAnchor="middle"
            className={`text-[7.5px] font-mono font-bold ${gear === 4 ? 'fill-amber-400' : 'fill-zinc-400'}`}
          >
            4ª
          </text>
          <text
            x="64"
            y="9"
            textAnchor="middle"
            className={`text-[7.5px] font-mono font-bold ${gear === 5 ? 'fill-amber-400' : 'fill-zinc-400'}`}
          >
            5ª
          </text>
          <text
            x="64"
            y="55"
            textAnchor="middle"
            opacity="0.35"
            className="text-[7.5px] font-mono font-bold fill-zinc-400"
          >
            R
          </text>

          {/* Pomello mogano con transition cubic-bezier */}
          <g
            style={{
              transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
              transition: 'transform 260ms cubic-bezier(.34,1.56,.64,1)',
            }}
          >
            <g
              className={safeRpm > 5500 ? 'gear-knob-shake' : ''}
              style={{
                filter: shiftWindowActive
                  ? 'drop-shadow(0 0 6px #ef4444) drop-shadow(0 0 10px #c5a059)'
                  : 'drop-shadow(0 2px 4px rgba(0,0,0,0.8))',
              }}
            >
              {/* Mahogany knob ball */}
              <circle r="7.5" fill="url(#alfa-mahogany-knob)" stroke="#260e04" strokeWidth="0.8" />
              {/* Inner chrome trim ring */}
              <circle r="3.2" fill="none" stroke="#d4d4d8" strokeWidth="0.5" opacity="0.6" />
              {/* Gold dot / Alfa Romeo badge */}
              <circle r="1.8" fill="#c5a059" stroke="#fef08a" strokeWidth="0.4" />
            </g>
          </g>
        </svg>
      </div>

      {/* 2. Center: 24-Segment Autodelta Tachometer */}
      <div className="flex-1 min-w-0 flex flex-col justify-center px-1">
        {/* 24-segment bar (1.000 -> 7.000 RPM) */}
        <div
          className={`w-full flex items-end gap-[2px] h-5 sm:h-6 px-1 py-1 rounded bg-black/70 border border-zinc-700/60 shadow-inner ${
            safeRpm >= 6500 ? 'gear-limiter-flash' : ''
          }`}
        >
          {Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
            const minRpm = RPM_MIN + i * RPM_STEP;
            const maxRpm = RPM_MIN + (i + 1) * RPM_STEP;
            const isLit = safeRpm >= minRpm + 80;

            let litClass = 'bg-amber-400 shadow-[0_0_4px_rgba(251,191,36,0.6)]';
            if (maxRpm <= 5200) {
              litClass = i < 8
                ? 'bg-amber-300 shadow-[0_0_4px_rgba(252,211,77,0.5)]'
                : 'bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.6)]';
            } else if (minRpm < 6300) {
              litClass = maxRpm <= 5700
                ? 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.7)]'
                : 'bg-[#c8102e] shadow-[0_0_6px_rgba(200,16,46,0.8)]';
            } else {
              litClass = 'bg-red-600 shadow-[0_0_7px_rgba(220,38,38,0.9)]';
            }

            return (
              <div
                key={i}
                className={`flex-1 rounded-[1px] transition-all duration-75 ${
                  isLit ? `${litClass} h-full` : 'bg-zinc-800/80 h-3/5'
                }`}
              />
            );
          })}
        </div>

        {/* Ticks 1..7 (x1000 RPM) */}
        <div className="flex items-center justify-between text-[8px] font-mono text-zinc-400 px-0.5 mt-0.5 leading-none">
          {[1, 2, 3, 4, 5, 6, 7].map((tick) => (
            <span
              key={tick}
              className={`font-semibold ${safeRpm >= tick * 1000 ? 'text-zinc-200' : 'text-zinc-600'}`}
            >
              {tick}
            </span>
          ))}
        </div>

        {/* Sub-band labels: x1000 RPM & ZONA DOPPIETTA */}
        <div className="flex items-center justify-between text-[7px] font-mono mt-0.5 leading-none px-0.5">
          <span className="text-zinc-500 tracking-wider">×1000 RPM</span>
          <span
            className={`font-bold tracking-wider uppercase transition-all ${
              safeRpm >= 5200 && safeRpm <= 6300
                ? 'text-amber-400 drop-shadow-[0_0_6px_rgba(245,158,11,0.9)] animate-pulse'
                : 'text-zinc-500'
            }`}
          >
            ZONA DOPPIETTA
          </span>
        </div>
      </div>

      {/* 3. Right: Gear Drum Display */}
      <div className="w-[72px] sm:w-[82px] flex-shrink-0 flex flex-col items-end justify-center text-right pl-1">
        {/* Pulsing red round lamp when shift window is active */}
        {shiftWindowActive && (
          <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-gradient-to-r from-red-600 via-amber-500 to-red-600 border border-red-400 text-white shadow-[0_0_10px_rgba(239,68,68,0.9)] animate-pulse mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
            <span className="text-[8px] font-mono font-black tracking-wider whitespace-nowrap">
              ⚡ CAMBIA!
            </span>
          </div>
        )}

        {/* Big gear digit with OD indicator */}
        <div className="flex items-baseline gap-1">
          <span className="text-2xl sm:text-3xl font-mono font-bold leading-none text-white tracking-tight">
            {gear}ª
          </span>
          {overdriveActive && (
            <span className="text-[9px] font-mono font-black text-fuchsia-400 bg-fuchsia-950/80 px-1 py-0.5 rounded border border-fuchsia-500/50 animate-pulse">
              OD
            </span>
          )}
        </div>

        {/* Live RPM / Overdrive subtitle */}
        <div className="text-[9px] sm:text-[10px] font-mono text-zinc-400 leading-none mt-1 whitespace-nowrap">
          {overdriveActive ? (
            <span className="text-fuchsia-300 font-bold">5ª OD • {safeRpm.toLocaleString('it-IT')} RPM</span>
          ) : (
            <span>{safeRpm.toLocaleString('it-IT')} RPM</span>
          )}
        </div>
      </div>
    </button>
  );
}
