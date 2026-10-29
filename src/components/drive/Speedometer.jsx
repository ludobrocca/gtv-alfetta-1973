// Authentic 1970s Veglia Borletti Speedometer & 3-Lane Arcade Minigame HUD
// Features score, personal best in localStorage, active Tex/Elvis power-up meters,
// touch buttons + swipe controls, and Game Over dialog (Subway Surfers pure style).

import React, { useEffect, useState, useRef } from 'react';
import { Volume2, VolumeX, ArrowLeft, Trophy, ChevronLeft, ChevronRight, RotateCcw, Users } from 'lucide-react';
import { driveStore } from './driveStore';
import { getDriverById } from './driversData';
import { DriverSelectModal } from './DriverSelectModal';
import { AlfaGearboxConsole } from './AlfaGearboxConsole';

export function Speedometer({ onExitDrive }) {
  const [speed, setSpeed] = useState(0);
  const [gear, setGear] = useState(1);
  const [distance, setDistance] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(driveStore.bestScore);
  const [coins, setCoins] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(driveStore.soundEnabled);
  const [gameState, setGameState] = useState(driveStore.gameState || 'selecting');
  const [selectedDriver, setSelectedDriver] = useState(driveStore.selectedDriver || 'elvis');
  const [activeTex, setActiveTex] = useState(0);
  const [activeElvis, setActiveElvis] = useState(0);
  const [activeBond, setActiveBond] = useState(0);
  const [activeSpiderman, setActiveSpiderman] = useState(0);
  const [activeDiabolik, setActiveDiabolik] = useState(0);
  const [activeCallaghan, setActiveCallaghan] = useState(0);
  const [currentZone, setCurrentZone] = useState(() => driveStore.getCurrentZone());
  const [activeLane, setActiveLane] = useState(0);
  const [furyMultiplier, setFuryMultiplier] = useState(driveStore.furyMultiplier || 1);
  const [furyTimer, setFuryTimer] = useState(driveStore.furyTimer || 0);
  const [armorState, setArmorState] = useState(driveStore.armorState || 'intact');
  const [repairProgress, setRepairProgress] = useState(driveStore.repairProgress || 0);
  const [ultimateCharge, setUltimateCharge] = useState(Math.round(driveStore.ultimateCharge || 0));
  const [isDrafting, setIsDrafting] = useState(driveStore.isDrafting || false);
  const [shiftWindowActive, setShiftWindowActive] = useState(driveStore.shiftWindowActive || false);
  const [takedownsCount, setTakedownsCount] = useState(driveStore.takedownsCount || 0);
  const [perfectShiftsCount, setPerfectShiftsCount] = useState(driveStore.perfectShiftsCount || 0);
  const [rampJumpsCount, setRampJumpsCount] = useState(driveStore.rampJumpsCount || 0);
  const [slingshotsCount, setSlingshotsCount] = useState(driveStore.slingshotsCount || 0);
  const [leaderboard, setLeaderboard] = useState(driveStore.leaderboard || []);
  const [activeMg, setActiveMg] = useState(driveStore.activePowerups?.mg || 0);
  const [rpm, setRpm] = useState(Math.round(driveStore.rpm || 950));
  const [overdriveActive, setOverdriveActive] = useState((driveStore.overdriveTimer || 0) > 0);
  const [shiftFeedback, setShiftFeedback] = useState(
    driveStore.shiftFeedback ? { ...driveStore.shiftFeedback } : null
  );

  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);

  useEffect(() => {
    let animId;
    let lastUpdate = 0;

    const tick = (now) => {
      animId = requestAnimationFrame(tick);
      if (now - lastUpdate > 33) { // 30Hz HUD refresh
        lastUpdate = now;
        setSpeed(Math.round(driveStore.speedKmh));
        setGear(driveStore.gear);
        setDistance(Math.round(driveStore.distanceMeters));
        setScore(driveStore.score);
        setBestScore(driveStore.bestScore);
        setCoins(driveStore.coinsCollected);
        setSoundEnabled(driveStore.soundEnabled);
        setGameState(driveStore.gameState);
        setSelectedDriver(driveStore.selectedDriver);
        setActiveTex(driveStore.activePowerups.tex);
        setActiveElvis(driveStore.activePowerups.elvis);
        setActiveBond(driveStore.activePowerups.bond);
        setActiveSpiderman(driveStore.activePowerups.spiderman);
        setActiveDiabolik(driveStore.activePowerups.diabolik);
        setActiveCallaghan(driveStore.activePowerups.callaghan);
        setActiveMg(driveStore.activePowerups.mg || 0);
        setCurrentZone(driveStore.getCurrentZone());
        setActiveLane(driveStore.targetLane);
        setFuryMultiplier(driveStore.furyMultiplier);
        setFuryTimer(driveStore.furyTimer);
        setArmorState(driveStore.armorState);
        setRepairProgress(driveStore.repairProgress);
        setUltimateCharge(Math.round(driveStore.ultimateCharge));
        setIsDrafting(driveStore.isDrafting);
        setShiftWindowActive(driveStore.shiftWindowActive);
        setTakedownsCount(driveStore.takedownsCount);
        setPerfectShiftsCount(driveStore.perfectShiftsCount);
        setRampJumpsCount(driveStore.rampJumpsCount);
        setSlingshotsCount(driveStore.slingshotsCount);
        setLeaderboard(driveStore.leaderboard || []);
        setRpm(Math.round(driveStore.rpm || 950));
        setOverdriveActive((driveStore.overdriveTimer || 0) > 0);
        setShiftFeedback(
          driveStore.shiftFeedback ? { ...driveStore.shiftFeedback } : null
        );
      }
    };
    animId = requestAnimationFrame(tick);

    // Keyboard controls for 3 lanes, shift doppietta, and ultimate
    const handleKeyDown = (e) => {
      if (driveStore.gameState === 'selecting') return;
      if (driveStore.gameState === 'gameover') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          driveStore.resetGame('playing');
        }
        return;
      }

      if (driveStore.gameState === 'playing') {
        if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' || e.key === ' ') {
          e.preventDefault();
          driveStore.triggerPerfectShift();
        } else if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' || e.key === 'e' || e.key === 'E' || e.key === 'Shift') {
          e.preventDefault();
          driveStore.activateUltimate();
        } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          e.preventDefault();
          driveStore.changeLane(-1);
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          e.preventDefault();
          driveStore.changeLane(1);
        }
      }
    };

    // Mobile Touch Swipe Gesture Handling (Subway Surfers snappy one-thumb swipe)
    const handleTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      if (driveStore.gameState !== 'playing') return;
      const dx = e.changedTouches[0].clientX - touchStartXRef.current;
      const dy = e.changedTouches[0].clientY - touchStartYRef.current;

      // Snappy horizontal swipe (dx < 0 = Left, dx > 0 = Right)
      if (Math.abs(dx) > 22 && Math.abs(dx) > Math.abs(dy) * 0.85) {
        if (dx < 0) {
          driveStore.changeLane(-1);
        } else {
          driveStore.changeLane(1);
        }
      } else if (Math.abs(dy) > 26 && Math.abs(dy) > Math.abs(dx)) {
        // Vertical swipe: Swipe Up (dy < -26) = Perfect Shift, Swipe Down (dy > 26) = Ultimate
        if (dy < -26) {
          driveStore.triggerPerfectShift();
        } else if (dy > 26) {
          driveStore.activateUltimate();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, []);

  const needleDeg = -135 + (Math.min(220, speed) / 220) * 270;

  // Diegetic Power-up state computation for Veglia Borletti Timer Ring (AC-002)
  const powerupList = [
    { id: 'elvis', time: activeElvis, max: 7.0, color: '#e879f9', icon: '🎸' },
    { id: 'tex', time: activeTex, max: 7.0, color: '#fbbf24', icon: '🤠' },
    { id: 'bond', time: activeBond, max: 7.0, color: '#fcd34d', icon: '🍸' },
    { id: 'spiderman', time: activeSpiderman, max: 7.0, color: '#f43f5e', icon: '🕸️' },
    { id: 'diabolik', time: activeDiabolik, max: 7.0, color: '#38bdf8', icon: '💎' },
    { id: 'callaghan', time: activeCallaghan, max: 7.0, color: '#f97316', icon: '🔫' },
    { id: 'mg', time: activeMg, max: 7.0, color: '#2dd4bf', icon: '👑' },
  ];
  const activePowerup = powerupList.find((p) => p.time > 0);
  const progress = activePowerup ? Math.min(1, Math.max(0, activePowerup.time / activePowerup.max)) : 0;
  const isExpiringSoon = activePowerup ? activePowerup.time <= 1.5 : false;

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-3 sm:p-5 z-20 select-none">
      {/* Top Header Bar: Showroom Return, Live Scores, and Audio Toggle */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        {/* Return Button */}
        <button
          onClick={onExitDrive}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border border-white/20 bg-black/60 backdrop-blur-md text-white text-xs font-mono uppercase tracking-wider hover:border-alfa-gold hover:text-alfa-gold transition-all shadow-xl active:scale-95"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">Showroom</span>
        </button>

        {/* Score & Personal Best Arcade Display */}
        <div className="flex items-center gap-2 sm:gap-4 px-3 sm:px-5 py-1.5 rounded-2xl border border-amber-500/30 bg-black/75 backdrop-blur-md shadow-2xl">
          {/* Current Score */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-mono uppercase text-zinc-400 tracking-wider">Punti</span>
            <span className="text-base sm:text-xl font-bold font-mono text-amber-400">
              {score.toLocaleString('it-IT')}
            </span>
          </div>

          <div className="w-[1px] h-6 bg-white/15" />

          {/* Alfa Coins */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-mono uppercase text-zinc-400 tracking-wider">Monete</span>
            <span className="text-sm sm:text-base font-bold font-mono text-amber-300 flex items-center gap-1">
              <span>🪙</span>
              {coins}
            </span>
          </div>

          <div className="w-[1px] h-6 bg-white/15" />

          {/* Personal Best */}
          <div className="flex flex-col items-center">
            <span className="text-[9px] font-mono uppercase text-zinc-400 tracking-wider flex items-center gap-0.5">
              <Trophy className="w-2.5 h-2.5 text-alfa-gold" /> Record
            </span>
            <span className="text-sm sm:text-base font-bold font-mono text-zinc-200">
              {bestScore.toLocaleString('it-IT')}
            </span>
          </div>
        </div>

        {/* Driver Switch & Sound Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => driveStore.openDriverSelect()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/20 bg-black/60 backdrop-blur-md text-xs font-mono text-white hover:border-amber-400 hover:text-amber-300 transition-all shadow-xl active:scale-95"
            title="Cambia guidatore"
          >
            <Users className="w-4 h-4 text-amber-400" />
            <span className="hidden sm:inline font-bold">
              {getDriverById(selectedDriver).name}
            </span>
          </button>

          <button
            onClick={() => driveStore.toggleSound()}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border backdrop-blur-md text-xs font-mono tracking-wider transition-all shadow-xl active:scale-95 ${
              soundEnabled
                ? 'border-alfa-gold bg-alfa-gold/20 text-alfa-gold'
                : 'border-white/20 bg-black/60 text-zinc-400 hover:text-white'
            }`}
            title="Audio bialbero e musica"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-alfa-gold animate-pulse" />
            ) : (
              <VolumeX className="w-4 h-4 text-zinc-400" />
            )}
            <span className="hidden md:inline">{soundEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>
      </div>

      {/* Scenic Zone Badge, Dynamic Arcade Callouts & Active Power-Up Timers */}
      <div className="flex flex-col items-center gap-1.5 w-full max-w-sm mx-auto pointer-events-none mt-2">
        {gameState === 'playing' && currentZone && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-white/15 bg-black/60 backdrop-blur-md text-[10px] font-mono text-zinc-300 uppercase tracking-widest shadow-md">
            <span>{currentZone.icon}</span>
            <span>{currentZone.name}</span>
          </div>
        )}

        {/* Fury Multiplier & Armor Status Bar */}
        {gameState === 'playing' && (
          <div className="flex items-center justify-center gap-2 w-full max-w-md px-1">
            {/* Fury Multiplier Badge */}
            <div
              className={`flex-1 flex flex-col justify-center px-2.5 py-1 rounded-xl border backdrop-blur-md transition-all ${
                furyMultiplier > 1
                  ? 'border-amber-400/80 bg-gradient-to-r from-amber-950/80 via-red-950/80 to-amber-950/80 shadow-[0_0_15px_rgba(245,158,11,0.35)] animate-pulse'
                  : 'border-white/15 bg-black/60'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono font-bold">
                <span className={furyMultiplier > 1 ? 'text-amber-300' : 'text-zinc-300'}>
                  🔥 FURIA x{furyMultiplier}
                </span>
                <span className="text-[9px] text-zinc-400 font-mono">
                  {furyMultiplier > 1 ? `${furyTimer.toFixed(1)}s` : 'BASE'}
                </span>
              </div>
              <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden mt-1 border border-white/10">
                <div
                  className={`h-full transition-all duration-100 ${
                    furyMultiplier > 1 ? 'bg-gradient-to-r from-amber-400 to-red-500' : 'bg-zinc-600'
                  }`}
                  style={{
                    width: furyMultiplier > 1 ? `${Math.min(100, (furyTimer / 7.5) * 100)}%` : '0%',
                  }}
                />
              </div>
            </div>

            {/* Paraurti d'Acciaio Badge */}
            <div
              className={`flex-1 flex flex-col justify-center px-2.5 py-1 rounded-xl border backdrop-blur-md transition-all ${
                armorState === 'intact'
                  ? 'border-emerald-500/50 bg-emerald-950/60 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                  : 'border-rose-500/80 bg-rose-950/80 text-rose-300 animate-pulse shadow-[0_0_12px_rgba(244,63,94,0.35)]'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] sm:text-[11px] font-mono font-bold">
                <span>
                  {armorState === 'intact' ? '🛡️ PARAURTI INTATTO' : `⚠️ DANNEGGIATO (${repairProgress}/3 🔧)`}
                </span>
              </div>
              <div className="w-full h-1 bg-black/60 rounded-full overflow-hidden mt-1 border border-white/10">
                <div
                  className={`h-full transition-all duration-200 ${
                    armorState === 'intact' ? 'bg-emerald-400' : 'bg-rose-500'
                  }`}
                  style={{
                    width: armorState === 'intact' ? '100%' : `${(repairProgress / 3) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spacer to push controls to bottom */}
      <div className="flex-1" />

      {/* Bottom Center: Veglia Borletti Speedometer & Mobile Touch Steering Controls */}
      <div className="flex flex-col items-center w-full max-w-4xl mx-auto pointer-events-auto gap-2">
        {/* Interactive Redline Shift Prompt & Ultimate Button (Thumb Zone) */}
        {gameState === 'playing' && (
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 w-full max-w-xl px-2">
            {/* 1. Transaxle Gearbox Console & Autodelta Tachometer */}
            <div className="w-full sm:flex-[1.4]">
              <AlfaGearboxConsole
                gear={gear}
                rpm={rpm}
                shiftWindowActive={shiftWindowActive}
                overdriveActive={overdriveActive}
                shiftFeedback={shiftFeedback}
                onShift={() => driveStore.triggerPerfectShift()}
              />
            </div>

            {/* 2. Barra/Bottone "ULTIMATE PILOTA" */}
            {ultimateCharge >= 100 ? (
              <button
                onClick={() => driveStore.activateUltimate()}
                className="w-full flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-500 via-fuchsia-600 to-amber-500 text-white font-mono text-xs font-black uppercase tracking-wider shadow-[0_0_20px_rgba(245,158,11,0.8)] animate-pulse active:scale-95 cursor-pointer"
                title="Tocca o Swipe Giù per Ultimate"
              >
                🔥 ULTIMATE PRONTA! • TOCCA O SWIPE GIÙ
              </button>
            ) : (
              <div className="w-full flex-1 flex flex-col justify-center px-3 py-1 rounded-xl border border-white/15 bg-black/60 backdrop-blur-md">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-zinc-300 w-full">
                  <span className="flex items-center gap-1 truncate text-zinc-300">
                    <span className="text-amber-400">{getDriverById(selectedDriver).badge || '★'}</span>
                    <span>{getDriverById(selectedDriver).name}</span>
                  </span>
                  <span className="text-amber-400">{ultimateCharge}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/60 rounded-full overflow-hidden mt-1 border border-white/10">
                  <div
                    className="h-full bg-gradient-to-r from-amber-500 to-fuchsia-500 transition-all duration-200"
                    style={{ width: `${Math.min(100, Math.max(0, ultimateCharge))}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Speedometer & Steering Controls Row */}
        <div className="flex items-center justify-between w-full">
          {/* Left Thumb Button (Mobile Steering) */}
          <button
            onClick={() => driveStore.changeLane(-1)}
            className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/30 bg-black/70 backdrop-blur-md text-white shadow-2xl active:scale-90 active:bg-alfa-gold/30 active:border-alfa-gold transition-all"
            title="Corsia Sinistra"
          >
            <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 text-alfa-gold" />
          </button>

          {/* Center: Veglia Borletti Mechanical Speedometer */}
          <div
            onClick={() => driveStore.triggerPerfectShift()}
            className={`relative w-36 h-36 sm:w-44 sm:h-44 rounded-full p-2 bg-gradient-to-b from-zinc-700 via-zinc-900 to-black shadow-2xl border-4 transition-all cursor-pointer ${
              shiftWindowActive
                ? 'border-red-500 shadow-[0_0_25px_rgba(239,68,68,0.7)] animate-pulse'
                : 'border-zinc-600/80 hover:border-zinc-400'
            } flex items-center justify-center`}
            title={shiftWindowActive ? 'CAMBIA ADESSO! Tocca per Doppietta' : 'Tachimetro Veglia Borletti'}
          >
            {/* Diegetic Power-Up SVG Timer Ring (AC-002) */}
            {activePowerup && (
              <>
                <svg
                  className={`absolute -inset-1.5 w-[calc(100%+12px)] h-[calc(100%+12px)] pointer-events-none z-10 ${
                    isExpiringSoon ? 'animate-pulse' : ''
                  }`}
                  viewBox="0 0 200 200"
                  style={{
                    filter: `drop-shadow(0 0 ${isExpiringSoon ? '10px' : '5px'} ${activePowerup.color})`,
                    animation: isExpiringSoon ? 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined,
                  }}
                >
                  {/* Background Track Circle */}
                  <circle
                    cx="100"
                    cy="100"
                    r="95"
                    fill="none"
                    stroke={activePowerup.color}
                    strokeWidth="3"
                    opacity="0.25"
                  />
                  {/* Draining Countdown Timer Ring */}
                  <circle
                    cx="100"
                    cy="100"
                    r="95"
                    fill="none"
                    stroke={activePowerup.color}
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 95}
                    strokeDashoffset={(1 - progress) * 2 * Math.PI * 95}
                    transform="rotate(-90 100 100)"
                  />
                </svg>

                {/* Circular Badge at the top of the dial bezel */}
                <div
                  className={`absolute -top-3.5 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2.5 py-0.5 rounded-full border bg-black/90 backdrop-blur-md shadow-lg font-mono text-[10px] sm:text-[11px] font-bold text-white whitespace-nowrap transition-all ${
                    isExpiringSoon ? 'animate-pulse scale-105' : ''
                  }`}
                  style={{
                    borderColor: activePowerup.color,
                    boxShadow: `0 0 10px ${activePowerup.color}88`,
                    animation: isExpiringSoon ? 'pulse 0.5s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined,
                  }}
                >
                  <span>{activePowerup.icon}</span>
                  <span style={{ color: activePowerup.color }}>
                    {activePowerup.time.toFixed(1)}s
                  </span>
                </div>
              </>
            )}

            <div className="absolute inset-1 rounded-full border border-white/25 pointer-events-none" />
            <div className="relative w-full h-full rounded-full bg-[#111417] flex items-center justify-center overflow-hidden shadow-inner">
              {/* Speed Dial Radial Hash Ticks */}
              <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 200 200">
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
                        stroke={isMajor ? '#e5e7eb' : '#71717a'}
                        strokeWidth={isMajor ? '2.5' : '1.2'}
                      />
                      {isMajor && (
                        <text
                          x={tx}
                          y={ty}
                          textAnchor="middle"
                          fill="#d4d4d8"
                          fontSize="11"
                          fontFamily="monospace"
                          fontWeight="600"
                        >
                          {km}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>

              {/* Veglia Borletti Brand Badge */}
              <div className="absolute top-6 sm:top-7 flex flex-col items-center">
                <span className="text-[7px] sm:text-[8px] font-mono tracking-widest text-zinc-400 font-semibold uppercase">
                  VEGLIA BORLETTI
                </span>
                <span className="text-[5px] sm:text-[6px] tracking-wider text-zinc-500">MILANO • 1976</span>
              </div>

              {/* Live Speed Digital Display */}
              <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center">
                <span className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-white drop-shadow">
                  {speed}
                </span>
                <span className="text-[9px] font-mono text-zinc-400 block -mt-1">km/h</span>
                <span
                  className={`text-[9px] font-mono font-bold tracking-wider px-1.5 py-0.5 rounded mt-0.5 ${
                    shiftWindowActive
                      ? 'bg-red-600 text-white animate-bounce'
                      : 'text-amber-400/90 bg-black/40'
                  }`}
                >
                  {overdriveActive ? `${gear}ª OD` : `${gear}ª MARCIA`}
                </span>
              </div>

              {/* 3-Lane Position Indicator Dots */}
              <div className="absolute bottom-2.5 flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-black/60 border border-white/10">
                <span className={`w-2 h-2 rounded-full transition-all ${activeLane === -1 ? 'bg-amber-400 scale-125' : 'bg-zinc-600'}`} />
                <span className={`w-2 h-2 rounded-full transition-all ${activeLane === 0 ? 'bg-amber-400 scale-125' : 'bg-zinc-600'}`} />
                <span className={`w-2 h-2 rounded-full transition-all ${activeLane === 1 ? 'bg-amber-400 scale-125' : 'bg-zinc-600'}`} />
              </div>

              {/* Orange-Red Classic Needle */}
              <div
                className="absolute w-1 bg-gradient-to-t from-red-600 via-orange-500 to-amber-300 rounded-full shadow-lg origin-bottom transition-transform duration-75 ease-out pointer-events-none"
                style={{
                  height: '66px',
                  bottom: '50%',
                  transform: `rotate(${needleDeg}deg)`,
                }}
              />

              {/* Center Chrome Hub */}
              <div className="absolute w-4 h-4 rounded-full bg-gradient-to-br from-zinc-300 via-zinc-600 to-black border border-white/60 shadow-md" />
            </div>
          </div>

          {/* Right Thumb Button (Mobile Steering) */}
          <button
            onClick={() => driveStore.changeLane(1)}
            className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/30 bg-black/70 backdrop-blur-md text-white shadow-2xl active:scale-90 active:bg-alfa-gold/30 active:border-alfa-gold transition-all"
            title="Corsia Destra"
          >
            <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 text-alfa-gold" />
          </button>
        </div>
      </div>

      {/* Game Over Modal Screen */}
      {gameState === 'gameover' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-4 pointer-events-auto animate-fadeIn overflow-y-auto">
          <div className="relative w-full max-w-lg p-5 sm:p-7 rounded-3xl border-2 border-red-500/40 bg-gradient-to-b from-zinc-900 via-black to-zinc-950 shadow-2xl shadow-red-950/50 text-center flex flex-col items-center my-auto max-h-[92vh] overflow-y-auto">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/50 bg-red-950/50 text-red-400 text-xs font-mono uppercase tracking-widest mb-3">
              <span>⚠️ IMPATTO IN PISTA</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif text-white mb-1">
              Partita Terminata
            </h2>
            <p className="text-xs text-zinc-400 mb-4 font-mono">
              Alfa Romeo Alfetta GTV (1976)
            </p>

            {/* Grado Pilota Autodelta Badge (AC-008, AC-009) */}
            {(() => {
              const driverRank = driveStore.getDriverRank(score);
              return (
                <div className="w-full p-2.5 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-amber-950/60 via-red-950/60 to-amber-950/60 flex items-center justify-center gap-2 mb-4 shadow-lg">
                  <span className="text-lg">{driverRank.icon}</span>
                  <span className="text-xs sm:text-sm font-mono font-bold uppercase tracking-wider text-amber-300">
                    GRADO: {driverRank.title}
                  </span>
                </div>
              );
            })()}

            {/* Score Grid */}
            <div className="grid grid-cols-2 gap-2.5 w-full mb-3">
              <div className="flex flex-col p-2.5 rounded-2xl border border-white/10 bg-white/5">
                <span className="text-[10px] font-mono uppercase text-zinc-400">Punti Totali</span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-amber-400">
                  {score.toLocaleString('it-IT')}
                </span>
              </div>
              <div className="flex flex-col p-2.5 rounded-2xl border border-white/10 bg-white/5">
                <span className="text-[10px] font-mono uppercase text-zinc-400">Distanza</span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-white">
                  {distance} m
                </span>
              </div>
            </div>

            {/* Personal Best Achievement */}
            <div className="w-full p-2.5 rounded-2xl border border-alfa-gold/30 bg-alfa-gold/10 flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-4 h-4 text-alfa-gold" />
                <span className="text-xs font-mono uppercase text-zinc-300">Record Personale:</span>
              </div>
              <span className="text-sm sm:text-base font-mono font-bold text-alfa-gold">
                {bestScore.toLocaleString('it-IT')} pts
              </span>
            </div>

            {/* 4 Burnout Trophies Grid (AC-009) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full mb-3">
              <div className="flex flex-col items-center p-2 rounded-xl border border-white/10 bg-white/5">
                <span className="text-[9px] font-mono uppercase text-zinc-400 truncate">💥 Sportellate</span>
                <span className="text-base sm:text-lg font-mono font-bold text-amber-400">{takedownsCount}</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl border border-white/10 bg-white/5">
                <span className="text-[9px] font-mono uppercase text-zinc-400 truncate">⚡ Cambiate Perfette</span>
                <span className="text-base sm:text-lg font-mono font-bold text-amber-400">{perfectShiftsCount}</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl border border-white/10 bg-white/5">
                <span className="text-[9px] font-mono uppercase text-zinc-400 truncate">🦅 Salti su Rampa</span>
                <span className="text-base sm:text-lg font-mono font-bold text-amber-400">{rampJumpsCount}</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-xl border border-white/10 bg-white/5">
                <span className="text-[9px] font-mono uppercase text-zinc-400 truncate">💨 Sorpassi in Scia</span>
                <span className="text-base sm:text-lg font-mono font-bold text-amber-400">{slingshotsCount}</span>
              </div>
            </div>

            {/* Albo d'Oro Top 5 Locale (AC-008) */}
            {leaderboard && leaderboard.length > 0 && (
              <div className="w-full mb-3 p-2.5 rounded-2xl border border-amber-500/30 bg-black/50 flex flex-col gap-1.5 text-left">
                <div className="flex items-center justify-between px-1 mb-0.5">
                  <span className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider flex items-center gap-1">
                    <Trophy className="w-3 h-3 text-amber-400" /> Albo d'Oro Autodelta (Top 5)
                  </span>
                  <span className="text-[9px] font-mono text-zinc-500">Locale</span>
                </div>
                <div className="flex flex-col gap-1">
                  {leaderboard.slice(0, 5).map((entry, idx) => {
                    const driver = getDriverById(entry.driverId);
                    const isCurrentScore = entry.score === score && entry.distance === distance;
                    return (
                      <div
                        key={idx}
                        className={`flex items-center justify-between px-2 py-1 rounded-lg text-[10px] sm:text-xs font-mono ${
                          isCurrentScore
                            ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold'
                            : 'bg-white/5 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          <span
                            className={`w-4 text-center font-bold ${
                              idx === 0
                                ? 'text-amber-400'
                                : idx === 1
                                ? 'text-zinc-300'
                                : idx === 2
                                ? 'text-amber-600'
                                : 'text-zinc-500'
                            }`}
                          >
                            #{idx + 1}
                          </span>
                          <span>{entry.rankIcon || '🏎️'}</span>
                          <span className="truncate">{driver?.name || entry.driverId || 'Pilota'}</span>
                        </div>
                        <div className="flex items-center gap-2 font-mono flex-shrink-0">
                          <span className="text-zinc-400 text-[9px] hidden sm:inline">{entry.distance}m</span>
                          <span className="text-amber-400 font-bold">
                            {(entry.score || 0).toLocaleString('it-IT')} pt
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Tribute to Dad */}
            <div className="italic text-xs text-zinc-300 mb-4 bg-white/5 px-4 py-2 rounded-xl border border-white/10 w-full">
              "Grande manche, Papà! Una vera Alfa Romeo non si ferma mai."
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2 w-full">
              <button
                onClick={() => driveStore.resetGame('playing')}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-2xl border border-amber-400 bg-amber-500 hover:bg-amber-400 text-black font-mono text-sm font-bold uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Riprova</span>
              </button>

              <button
                onClick={() => driveStore.openDriverSelect()}
                className="px-4 py-3 rounded-2xl border border-amber-400/40 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 font-mono text-xs font-bold uppercase tracking-wider transition-all active:scale-95"
              >
                Cambia Pilota
              </button>

              <button
                onClick={onExitDrive}
                className="px-4 py-3 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                Showroom
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Arcade Character Selection Screen */}
      {gameState === 'selecting' && (
        <div className="pointer-events-auto">
          <DriverSelectModal onCloseToShowroom={onExitDrive} />
        </div>
      )}
    </div>
  );
}
