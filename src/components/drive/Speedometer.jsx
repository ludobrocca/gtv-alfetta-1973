// Authentic 1970s Veglia Borletti Speedometer & 3-Lane Arcade Minigame HUD
// Features score, personal best in localStorage, active Tex/Elvis power-up meters,
// 90° Temple Run turn alert banners, touch buttons + swipe controls, and Game Over dialog.

import React, { useEffect, useState, useRef } from 'react';
import { Volume2, VolumeX, ArrowLeft, Trophy, Zap, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react';
import { driveStore } from './driveStore';

export function Speedometer({ onExitDrive }) {
  const [speed, setSpeed] = useState(0);
  const [gear, setGear] = useState(1);
  const [distance, setDistance] = useState(0);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(driveStore.bestScore);
  const [coins, setCoins] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(driveStore.soundEnabled);
  const [gameState, setGameState] = useState('playing');
  const [activeTex, setActiveTex] = useState(0);
  const [activeElvis, setActiveElvis] = useState(0);
  const [turnEvent, setTurnEvent] = useState({ active: false, direction: 'R' });
  const [activeLane, setActiveLane] = useState(0);

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
        setActiveTex(driveStore.activePowerups.tex);
        setActiveElvis(driveStore.activePowerups.elvis);
        setTurnEvent({
          active: driveStore.turnEvent.active && !driveStore.turnEvent.windowPassed,
          direction: driveStore.turnEvent.direction,
        });
        setActiveLane(driveStore.targetLane);
      }
    };
    animId = requestAnimationFrame(tick);

    // Keyboard controls for 3 lanes and 90° turns
    const handleKeyDown = (e) => {
      if (driveStore.gameState === 'gameover') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          driveStore.resetGame();
        }
        return;
      }

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        if (driveStore.turnEvent.active && !driveStore.turnEvent.windowPassed) {
          driveStore.handleTurn('L');
        } else {
          driveStore.changeLane(-1);
        }
      } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        if (driveStore.turnEvent.active && !driveStore.turnEvent.windowPassed) {
          driveStore.handleTurn('R');
        } else {
          driveStore.changeLane(1);
        }
      }
    };

    // Mobile Touch Swipe Gesture Handling
    const handleTouchStart = (e) => {
      if (!e.touches || e.touches.length === 0) return;
      touchStartXRef.current = e.touches[0].clientX;
      touchStartYRef.current = e.touches[0].clientY;
    };

    const handleTouchEnd = (e) => {
      if (!e.changedTouches || e.changedTouches.length === 0) return;
      const dx = e.changedTouches[0].clientX - touchStartXRef.current;
      const dy = e.changedTouches[0].clientY - touchStartYRef.current;

      // Ensure horizontal swipe
      if (Math.abs(dx) > 35 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) {
          // Swipe Left
          if (driveStore.turnEvent.active && !driveStore.turnEvent.windowPassed) {
            driveStore.handleTurn('L');
          } else {
            driveStore.changeLane(-1);
          }
        } else {
          // Swipe Right
          if (driveStore.turnEvent.active && !driveStore.turnEvent.windowPassed) {
            driveStore.handleTurn('R');
          } else {
            driveStore.changeLane(1);
          }
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

        {/* Sound Toggle */}
        <div className="flex items-center gap-2">
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

      {/* Active Power-Up Timers Banners (Tex Willer & Elvis Presley) */}
      <div className="flex flex-col items-center gap-2 w-full max-w-sm mx-auto pointer-events-none mt-2">
        {activeTex > 0 && (
          <div className="w-full flex items-center justify-between px-4 py-2 rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-950/80 via-black/80 to-amber-950/80 backdrop-blur-md shadow-amber-500/30 shadow-lg animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-xl">🤠</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold font-mono text-amber-300 uppercase tracking-wide">
                  TEX WILLER • INVULNERABILE!
                </span>
                <span className="text-[10px] text-amber-200/80">Distruggi gli ostacoli</span>
              </div>
            </div>
            <span className="text-sm font-mono font-bold text-amber-400">
              {activeTex.toFixed(1)}s
            </span>
          </div>
        )}

        {activeElvis > 0 && (
          <div className="w-full flex items-center justify-between px-4 py-2 rounded-xl border-2 border-fuchsia-400 bg-gradient-to-r from-fuchsia-950/80 via-black/80 to-fuchsia-950/80 backdrop-blur-md shadow-fuchsia-500/30 shadow-lg animate-pulse">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎸</span>
              <div className="flex flex-col">
                <span className="text-xs font-bold font-mono text-fuchsia-300 uppercase tracking-wide">
                  ELVIS • ROCK'N'ROLL NITRO 2X!
                </span>
                <span className="text-[10px] text-fuchsia-200/80">Super velocità & punti doppi</span>
              </div>
            </div>
            <span className="text-sm font-mono font-bold text-fuchsia-300">
              {activeElvis.toFixed(1)}s
            </span>
          </div>
        )}
      </div>

      {/* 90° Turn Junction Alert (Temple Run style) */}
      {turnEvent.active && (
        <div className="flex flex-col items-center justify-center pointer-events-none animate-bounce my-auto">
          <div className="px-6 py-3 rounded-2xl border-4 border-yellow-400 bg-black/90 backdrop-blur-lg shadow-2xl flex items-center gap-3">
            {turnEvent.direction === 'L' ? (
              <ChevronLeft className="w-8 h-8 text-yellow-400 animate-ping" />
            ) : null}
            <div className="flex flex-col items-center">
              <span className="text-sm font-mono font-black text-yellow-400 uppercase tracking-widest">
                CURVA SECCA A {turnEvent.direction === 'L' ? 'SINISTRA' : 'DESTRA'}!
              </span>
              <span className="text-xs font-mono text-white/90">
                PREMI {turnEvent.direction === 'L' ? '◀ (A)' : '▶ (D)'} O FAI SWIPE!
              </span>
            </div>
            {turnEvent.direction === 'R' ? (
              <ChevronRight className="w-8 h-8 text-yellow-400 animate-ping" />
            ) : null}
          </div>
        </div>
      )}

      {/* Bottom Center: Veglia Borletti Speedometer & Mobile Touch Steering Controls */}
      <div className="flex items-center justify-between w-full max-w-4xl mx-auto pointer-events-auto">
        {/* Left Thumb Button (Mobile Steering) */}
        <button
          onClick={() => {
            if (driveStore.turnEvent.active && !driveStore.turnEvent.windowPassed) {
              driveStore.handleTurn('L');
            } else {
              driveStore.changeLane(-1);
            }
          }}
          className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/30 bg-black/70 backdrop-blur-md text-white shadow-2xl active:scale-90 active:bg-alfa-gold/30 active:border-alfa-gold transition-all"
          title="Corsia Sinistra"
        >
          <ChevronLeft className="w-8 h-8 sm:w-10 sm:h-10 text-alfa-gold" />
        </button>

        {/* Center: Veglia Borletti Mechanical Speedometer */}
        <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-full p-2 bg-gradient-to-b from-zinc-700 via-zinc-900 to-black shadow-2xl border-4 border-zinc-600/80 flex items-center justify-center">
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
            <div className="absolute top-7 flex flex-col items-center">
              <span className="text-[8px] font-mono tracking-widest text-zinc-400 font-semibold uppercase">
                VEGLIA BORLETTI
              </span>
              <span className="text-[6px] tracking-wider text-zinc-500">MILANO • 1973</span>
            </div>

            {/* Live Speed Digital Display */}
            <div className="absolute top-1/2 -translate-y-1/2 flex flex-col items-center">
              <span className="text-xl sm:text-2xl font-mono font-bold tracking-tight text-white drop-shadow">
                {speed}
              </span>
              <span className="text-[9px] font-mono text-zinc-400 block -mt-1">km/h</span>
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
          onClick={() => {
            if (driveStore.turnEvent.active && !driveStore.turnEvent.windowPassed) {
              driveStore.handleTurn('R');
            } else {
              driveStore.changeLane(1);
            }
          }}
          className="flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl border-2 border-white/30 bg-black/70 backdrop-blur-md text-white shadow-2xl active:scale-90 active:bg-alfa-gold/30 active:border-alfa-gold transition-all"
          title="Corsia Destra"
        >
          <ChevronRight className="w-8 h-8 sm:w-10 sm:h-10 text-alfa-gold" />
        </button>
      </div>

      {/* Game Over Modal Screen */}
      {gameState === 'gameover' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto animate-fadeIn">
          <div className="relative w-full max-w-md p-6 sm:p-8 rounded-3xl border-2 border-red-500/40 bg-gradient-to-b from-zinc-900 via-black to-zinc-950 shadow-2xl shadow-red-950/50 text-center flex flex-col items-center">
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-red-500/50 bg-red-950/50 text-red-400 text-xs font-mono uppercase tracking-widest mb-3">
              <span>⚠️ FUORI PISTA</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif text-white mb-1">
              Partita Terminata
            </h2>
            <p className="text-xs text-zinc-400 mb-6 font-mono">
              Alfa Romeo Alfetta GTV 1973
            </p>

            {/* Score Grid */}
            <div className="grid grid-cols-2 gap-3 w-full mb-6">
              <div className="flex flex-col p-3 rounded-2xl border border-white/10 bg-white/5">
                <span className="text-[10px] font-mono uppercase text-zinc-400">Punti Totali</span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-amber-400">
                  {score.toLocaleString('it-IT')}
                </span>
              </div>
              <div className="flex flex-col p-3 rounded-2xl border border-white/10 bg-white/5">
                <span className="text-[10px] font-mono uppercase text-zinc-400">Distanza</span>
                <span className="text-xl sm:text-2xl font-mono font-bold text-white">
                  {distance} m
                </span>
              </div>
            </div>

            {/* Personal Best Achievement */}
            <div className="w-full p-3.5 rounded-2xl border border-alfa-gold/30 bg-alfa-gold/10 flex items-center justify-between mb-6">
              <div className="flex items-center gap-2.5">
                <Trophy className="w-5 h-5 text-alfa-gold" />
                <span className="text-xs font-mono uppercase text-zinc-300">Record Personale:</span>
              </div>
              <span className="text-base font-mono font-bold text-alfa-gold">
                {bestScore.toLocaleString('it-IT')} pts
              </span>
            </div>

            {/* Tribute to Dad */}
            <div className="italic text-xs text-zinc-300 mb-6 bg-white/5 px-4 py-2.5 rounded-xl border border-white/10 w-full">
              "Grande manche, Papà! Una vera Alfa Romeo non si ferma mai."
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full">
              <button
                onClick={() => driveStore.resetGame()}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl border border-amber-400 bg-amber-500 hover:bg-amber-400 text-black font-mono text-sm font-bold uppercase tracking-wider shadow-lg shadow-amber-500/20 active:scale-95 transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Riprova (Spazio)</span>
              </button>

              <button
                onClick={onExitDrive}
                className="px-5 py-3.5 rounded-2xl border border-white/20 bg-white/10 hover:bg-white/20 text-white font-mono text-xs uppercase tracking-wider transition-all active:scale-95"
              >
                Showroom
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
