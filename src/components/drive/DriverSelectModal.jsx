import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { ChevronLeft, ChevronRight, Flame, Play, Sparkles, UserCheck } from 'lucide-react';
import { DRIVERS, getDriverById } from './driversData';
import { DriverCharacter3D } from './DriverCharacter3D';
import { driveStore } from './driveStore';

export function DriverSelectModal({ onCloseToShowroom }) {
  const [selectedId, setSelectedId] = useState(driveStore.selectedDriver || 'elvis');
  const activeDriver = getDriverById(selectedId);

  const handleSelect = (id) => {
    setSelectedId(id);
    driveStore.selectDriver(id);
  };

  const handleStartRace = () => {
    driveStore.startRaceWithDriver(selectedId);
  };

  // Keyboard navigation (Left/Right arrows + Enter to start)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (driveStore.mode !== 'drive' || driveStore.gameState !== 'selecting') return;
      const idx = DRIVERS.findIndex((d) => d.id === selectedId);
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        const next = DRIVERS[(idx + 1) % DRIVERS.length];
        handleSelect(next.id);
      } else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        e.preventDefault();
        const prev = DRIVERS[(idx - 1 + DRIVERS.length) % DRIVERS.length];
        handleSelect(prev.id);
      } else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleStartRace();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [selectedId]);

  const cycleDriver = (dir) => {
    const idx = DRIVERS.findIndex((d) => d.id === selectedId);
    const next = DRIVERS[(idx + dir + DRIVERS.length) % DRIVERS.length];
    handleSelect(next.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-3 sm:p-6">
      <div className="relative w-full max-w-4xl rounded-3xl border border-white/15 bg-zinc-950/95 text-white shadow-2xl overflow-hidden">
        {/* Top Arcade Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-red-950/70 via-zinc-900 to-zinc-950 px-5 py-3.5">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/20 border border-red-500/40 text-red-400">
              <UserCheck className="w-4 h-4" />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-red-400">
                Alfa Romeo Alfetta GTV (1973) • Arcade Mode
              </p>
              <h2 className="text-lg sm:text-xl font-black tracking-wider uppercase text-white">
                Scegli il Guidatore
              </h2>
            </div>
          </div>

          {onCloseToShowroom && (
            <button
              onClick={onCloseToShowroom}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white transition"
            >
              Torna allo Showroom
            </button>
          )}
        </div>

        {/* Main Content: 3D Low-Poly Spotlight + Character Info */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 p-4 sm:p-6 items-center">
          {/* Left: 3D Low-Poly Character Pedestal */}
          <div className="md:col-span-5 relative h-60 sm:h-72 rounded-2xl border border-white/10 bg-gradient-to-b from-zinc-800/70 via-zinc-900 to-black overflow-hidden">
            {/* Ambient radial glow matching character accent */}
            <div
              className="absolute inset-0 opacity-30 pointer-events-none"
              style={{
                background: `radial-gradient(circle at 50% 45%, ${activeDriver.accentColor}, transparent 70%)`,
              }}
            />

            <Canvas camera={{ position: [0, 0.25, 2.05], fov: 36 }} dpr={[1, 2]}>
              <ambientLight intensity={0.85} />
              <directionalLight position={[2.5, 4, 3]} intensity={1.5} color="#fff9ed" />
              <directionalLight position={[-2.5, 2, -2]} intensity={0.7} color="#93c5fd" />
              <DriverCharacter3D driverId={selectedId} pose="preview" />
            </Canvas>

            {/* Prev / Next Arrows */}
            <button
              onClick={() => cycleDriver(-1)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white hover:bg-white/20 transition"
              title="Pilota precedente"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={() => cycleDriver(1)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/60 text-white hover:bg-white/20 transition"
              title="Pilota successivo"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            <div className="absolute bottom-2.5 inset-x-0 text-center pointer-events-none">
              <span className="inline-block rounded-full bg-black/70 border border-white/15 px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-zinc-300">
                Modello 3D Low-Poly • Seduto al Volante
              </span>
            </div>
          </div>

          {/* Right: Selected Character Bio & Roster Grid */}
          <div className="md:col-span-7 flex flex-col justify-between gap-4">
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span
                    className="inline-block rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-widest mb-1"
                    style={{
                      backgroundColor: `${activeDriver.accentColor}25`,
                      color: activeDriver.accentColor,
                      border: `1px solid ${activeDriver.accentColor}60`,
                    }}
                  >
                    {activeDriver.badge}
                  </span>
                  <h3 className="text-2xl font-black tracking-tight text-white">
                    {activeDriver.name}
                  </h3>
                  <p className="text-xs font-medium text-zinc-400">
                    {activeDriver.subtitle}
                  </p>
                </div>
              </div>

              <p className="mt-2.5 text-xs sm:text-sm italic text-zinc-200 border-l-2 pl-3 py-0.5"
                 style={{ borderColor: activeDriver.accentColor }}>
                {activeDriver.tagline}
              </p>

              {activeDriver.easterEgg === 'oil_chaos' && (
                <div className="mt-3 flex items-center gap-2.5 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs text-amber-200">
                  <Flame className="w-4 h-4 text-amber-400 shrink-0 animate-pulse" />
                  <span>
                    <strong>EASTER EGG ATTIVO:</strong> Con <strong>MG</strong> al volante, ogni corsia della pista è continuamente invasa da chiazze d’olio!
                  </span>
                </div>
              )}
            </div>

            {/* 7-Character Arcade Selection Grid */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-400 mb-2">
                Seleziona Personaggio (7 Piloti Disponibili)
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DRIVERS.map((drv) => {
                  const isSelected = drv.id === selectedId;
                  const isMG = drv.id === 'mg';
                  return (
                    <button
                      key={drv.id}
                      onClick={() => handleSelect(drv.id)}
                      className={`group relative flex flex-col items-start rounded-xl border p-2.5 text-left transition-all ${
                        isSelected
                          ? 'bg-white/15 border-white shadow-lg scale-[1.02]'
                          : 'bg-zinc-900/80 border-white/10 hover:border-white/30 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex w-full items-center justify-between gap-1 mb-1">
                        <span
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: drv.accentColor }}
                        />
                        {isMG && (
                          <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-xs font-extrabold text-white truncate w-full">
                        {drv.name}
                      </span>
                      <span className="text-[10px] text-zinc-400 truncate w-full">
                        {drv.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Launch Race CTA */}
            <button
              onClick={handleStartRace}
              className="w-full flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-6 py-3.5 text-sm sm:text-base font-black uppercase tracking-wider text-white shadow-lg shadow-red-600/30 hover:brightness-110 active:scale-[0.99] transition"
            >
              <Play className="w-5 h-5 fill-current" />
              Scendi in Pista con {activeDriver.name}!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DriverSelectModal;
