import React, { useRef, useState } from 'react';
import {
  Camera,
  Check,
  Gauge,
  Palette,
  Pause,
  Play,
  RotateCcw,
  Sliders,
  Wrench,
} from 'lucide-react';
import {
  CAMERA_PRESETS,
  PAINT_FINISHES,
} from '../CarViewer.jsx';

const PRESET_DISPLAY_NAMES = {
  hero: 'Hero 3/4',
  front: 'Frontale',
  side: 'Profilo',
  rear: 'Posteriore',
  cockpit: 'Abitacolo',
  engine: 'Motore 3D',
  wheel: 'Cerchi',
  back: 'Retro',
  top: 'Dall’Alto',
};

/**
 * ShowroomBottomSheet - Mobile one-handed bottom drawer & dock for 3D showroom
 * Visible on screens < md (`block md:hidden`).
 * Has two states:
 * 1. Collapsed: Compact ~76-80px dock with drag handle, active color swatch & camera pill, and prominent "In Corsa" button.
 * 2. Expanded: ~45-50vh sheet with 3 tabs:
 *    - Colori: Grid of paints (>= 38px circular chips) with "Esemplare Reale" badge.
 *    - Inquadrature: Grid of camera presets with engine inspection shortcut.
 *    - Controlli: Touch-friendly cards for 360° rotation, controvento hood, and reset view.
 *    - Bottom full-width "In Corsa" CTA.
 */
export function ShowroomBottomSheet({
  sceneMode = 'showroom',
  activePaintId,
  onSelectPaint,
  activePresetId,
  onSelectCameraPreset,
  autoRotate = false,
  onToggleAutoRotate,
  hoodOpen = false,
  onToggleHood,
  onResetView,
  onEnterDrive,
  isLight = false,
  glassClass = '',
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState('colori'); // 'colori' | 'inquadrature' | 'controlli'
  const touchStartYRef = useRef(null);

  if (sceneMode !== 'showroom') return null;

  const currentPaint =
    PAINT_FINISHES.find((p) => p.id === activePaintId) || PAINT_FINISHES[0];
  const currentPreset =
    CAMERA_PRESETS.find((p) => p.id === activePresetId) || CAMERA_PRESETS[0];

  const handleTouchStart = (e) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e) => {
    if (touchStartYRef.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartYRef.current;
    touchStartYRef.current = null;

    // Swipe down (> 50px) while expanded collapses the sheet
    if (isExpanded && deltaY > 50) {
      setIsExpanded(false);
    }
    // Swipe up (< -50px) while collapsed expands the sheet
    else if (!isExpanded && deltaY < -50) {
      setIsExpanded(true);
    }
  };

  const handlePresetClick = (preset) => {
    if (onSelectCameraPreset) {
      onSelectCameraPreset(preset);
    }
    // Ensure hood is open when engine preset is selected
    if (preset.id === 'engine' && !hoodOpen && onToggleHood) {
      onToggleHood();
    }
  };

  const handleEnterDriveClick = () => {
    setIsExpanded(false);
    if (onEnterDrive) {
      onEnterDrive();
    }
  };

  return (
    <>
      {/* Scrim / Backdrop when sheet is expanded */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 block md:hidden transition-opacity duration-300"
          onClick={() => setIsExpanded(false)}
          aria-label="Chiudi pannello controlli"
        />
      )}

      {/* Bottom Sheet Drawer & Dock */}
      <section
        aria-label="Pannello Controlli Showroom Mobile"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        className={`block md:hidden fixed bottom-0 left-0 right-0 z-40 transition-all duration-300 ease-out pb-[max(0.75rem,env(safe-area-inset-bottom))] px-3 pt-2.5 rounded-t-3xl shadow-2xl ${
          isLight
            ? 'bg-white/95 text-zinc-900 border-t border-zinc-200 backdrop-blur-xl'
            : 'bg-black/90 text-white border-t border-white/15 backdrop-blur-xl'
        } ${glassClass}`}
      >
        {/* Subtle Drag Handle Pill */}
        <div
          onClick={() => setIsExpanded((prev) => !prev)}
          className="w-12 h-1.5 rounded-full bg-white/30 mb-2.5 mx-auto cursor-pointer active:scale-95 transition-transform"
          aria-label={isExpanded ? 'Riduci controlli showroom' : 'Espandi controlli showroom'}
          role="button"
          tabIndex={0}
        />

        {/* ========================================================= */}
        {/* COLLAPSED STATE (Compact dock ~76-80px + safe area)        */}
        {/* ========================================================= */}
        {!isExpanded ? (
          <div className="flex items-center justify-between gap-3 min-h-[50px]">
            {/* Left: Touch trigger showing current color swatch circle + color name + camera pill */}
            <button
              type="button"
              onClick={() => setIsExpanded(true)}
              aria-label="Espandi opzioni colore, viste e controlli showroom"
              className="flex items-center gap-2.5 flex-1 min-w-0 text-left py-1 active:scale-95 transition-transform min-h-[44px]"
            >
              {/* Color Swatch Circle with Ring */}
              <div
                className="w-8 h-8 rounded-full shrink-0 ring-2 ring-alfa-gold ring-offset-2 ring-offset-black/50 shadow-md flex items-center justify-center"
                style={{ background: currentPaint.swatch || currentPaint.swatchColor }}
              />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold truncate block">
                    {currentPaint.name.split(' (')[0]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono tracking-tight bg-white/10 text-zinc-300 truncate">
                    {PRESET_DISPLAY_NAMES[currentPreset?.id] || currentPreset?.label || 'Vista'}
                  </span>
                  <span className="text-[10px] text-alfa-gold/90 font-medium">
                    • Opzioni
                  </span>
                </div>
              </div>
            </button>

            {/* Right: Prominent "In Corsa" CTA button */}
            <button
              type="button"
              onClick={handleEnterDriveClick}
              className="bg-gradient-to-r from-[#9E1B24] via-[#b51f29] to-[#C8102E] text-white font-bold py-2.5 px-4 rounded-xl shadow-lg flex items-center gap-2 active:scale-95 shrink-0 min-h-[44px]"
              title="Avvia la modalità In Corsa"
            >
              <Gauge className="w-4 h-4 text-alfa-gold animate-pulse" />
              <span className="text-xs font-bold uppercase tracking-wider">In Corsa</span>
            </button>
          </div>
        ) : (
          /* ========================================================= */
          /* EXPANDED STATE (Drawer sheet ~45-50vh)                    */
          /* ========================================================= */
          <div className="flex flex-col">
            {/* Tab Navigation Bar (Colori, Inquadrature, Controlli) */}
            <div
              role="tablist"
              className={`grid grid-cols-3 gap-1 p-1 rounded-2xl mb-3 ${
                isLight ? 'bg-zinc-900/10' : 'bg-white/10'
              }`}
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'colori'}
                onClick={() => setActiveTab('colori')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                  activeTab === 'colori'
                    ? 'bg-alfa-gold text-zinc-950 font-bold shadow-md'
                    : isLight
                    ? 'text-zinc-600 hover:text-zinc-900'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <Palette className="w-3.5 h-3.5 shrink-0" />
                <span>Colori</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'inquadrature'}
                onClick={() => setActiveTab('inquadrature')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                  activeTab === 'inquadrature'
                    ? 'bg-alfa-gold text-zinc-950 font-bold shadow-md'
                    : isLight
                    ? 'text-zinc-600 hover:text-zinc-900'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5 shrink-0" />
                <span>Inquadrature</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'controlli'}
                onClick={() => setActiveTab('controlli')}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-semibold transition-all min-h-[44px] ${
                  activeTab === 'controlli'
                    ? 'bg-alfa-gold text-zinc-950 font-bold shadow-md'
                    : isLight
                    ? 'text-zinc-600 hover:text-zinc-900'
                    : 'text-zinc-300 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5 shrink-0" />
                <span>Controlli</span>
              </button>
            </div>

            {/* TAB CONTENT AREA */}
            <div className="max-h-[34vh] overflow-y-auto no-scrollbar pr-0.5">
              {/* TAB 1: Colori */}
              {activeTab === 'colori' && (
                <div className="grid grid-cols-2 gap-2">
                  {PAINT_FINISHES.map((paint) => {
                    const isSelected = paint.id === activePaintId;
                    return (
                      <button
                        key={paint.id}
                        type="button"
                        onClick={() => onSelectPaint?.(paint.id)}
                        className={`flex items-center gap-2.5 p-2 rounded-xl text-left transition-all border min-h-[50px] ${
                          isSelected
                            ? 'bg-alfa-gold/15 border-alfa-gold text-current shadow-sm'
                            : isLight
                            ? 'bg-zinc-900/5 hover:bg-zinc-900/10 border-zinc-900/10 text-zinc-800'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-200'
                        }`}
                      >
                        {/* Circular Chip >= 38px (w-10 h-10 = 40px) */}
                        <div
                          className={`w-10 h-10 min-w-[40px] rounded-full shrink-0 shadow-md flex items-center justify-center transition-transform ${
                            isSelected
                              ? 'ring-2 ring-alfa-gold ring-offset-2 ring-offset-black/50 scale-105'
                              : ''
                          }`}
                          style={{
                            background: paint.swatch || paint.swatchColor,
                          }}
                        >
                          {isSelected && (
                            <Check className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]" />
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold leading-tight truncate">
                            {paint.name.split(' (')[0]}
                          </p>
                          {paint.id === 'ar727-reale' ? (
                            <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase bg-[#9E1B24] text-white">
                              Esemplare Reale
                            </span>
                          ) : (
                            <span className="text-[10px] font-mono opacity-60 truncate block mt-0.5">
                              {paint.yearCode?.split(' • ')[0] || ''}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TAB 2: Inquadrature (Hero, Front, Side, Rear, Interior/Cockpit, Engine) */}
              {activeTab === 'inquadrature' && (
                <div className="grid grid-cols-3 gap-2">
                  {CAMERA_PRESETS.map((preset) => {
                    const isActive = activePresetId === preset.id;
                    const isEngine = preset.id === 'engine';
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handlePresetClick(preset)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl text-center transition-all min-h-[52px] border ${
                          isActive
                            ? 'bg-[#9E1B24] border-[#C8102E] text-white shadow-md'
                            : isLight
                            ? 'bg-zinc-900/5 hover:bg-zinc-900/10 border-zinc-900/10 text-zinc-800'
                            : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-200'
                        }`}
                      >
                        <div className="flex items-center justify-center mb-1">
                          {isEngine ? (
                            <Wrench className="w-3.5 h-3.5 text-alfa-gold" />
                          ) : preset.id === 'cockpit' ? (
                            <Gauge className="w-3.5 h-3.5 text-alfa-gold" />
                          ) : (
                            <Camera className="w-3.5 h-3.5 text-alfa-gold" />
                          )}
                        </div>
                        <span className="text-[11px] font-semibold leading-tight line-clamp-1">
                          {PRESET_DISPLAY_NAMES[preset.id] || preset.label}
                        </span>
                        {isEngine && (
                          <span className="text-[9px] text-alfa-gold font-mono mt-0.5">
                            Cofano 3D
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* TAB 3: Controlli (Rotazione 360°, Cofano Motore, Reset Vista) */}
              {activeTab === 'controlli' && (
                <div className="space-y-2">
                  {/* Rotazione 360° */}
                  <button
                    type="button"
                    onClick={onToggleAutoRotate}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border min-h-[50px] transition-all active:scale-[0.98] ${
                      autoRotate
                        ? 'bg-[#9E1B24]/20 border-[#9E1B24] text-white shadow-sm'
                        : isLight
                        ? 'bg-zinc-900/5 hover:bg-zinc-900/10 border-zinc-900/10 text-zinc-800'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          autoRotate
                            ? 'bg-[#9E1B24] text-white'
                            : 'bg-white/10 text-alfa-gold'
                        }`}
                      >
                        {autoRotate ? (
                          <Pause className="w-4 h-4 fill-current" />
                        ) : (
                          <Play className="w-4 h-4 fill-current" />
                        )}
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold">Rotazione 360°</p>
                        <p className="text-[11px] opacity-70">
                          {autoRotate
                            ? 'In rotazione • Tocca per fermare'
                            : 'In pausa • Tocca per avviare'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase ${
                        autoRotate ? 'bg-[#9E1B24] text-white' : 'bg-white/10 opacity-70'
                      }`}
                    >
                      {autoRotate ? 'Attiva' : 'Pausa'}
                    </span>
                  </button>

                  {/* Cofano Motore */}
                  <button
                    type="button"
                    onClick={onToggleHood}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border min-h-[50px] transition-all active:scale-[0.98] ${
                      hoodOpen
                        ? 'bg-alfa-gold/20 border-alfa-gold text-white shadow-sm'
                        : isLight
                        ? 'bg-zinc-900/5 hover:bg-zinc-900/10 border-zinc-900/10 text-zinc-800'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                          hoodOpen
                            ? 'bg-alfa-gold text-zinc-950'
                            : 'bg-white/10 text-alfa-gold'
                        }`}
                      >
                        <Wrench className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold">Cofano Motore</p>
                        <p className="text-[11px] opacity-70">
                          {hoodOpen
                            ? 'Aperto controvento • Bialbero visibile'
                            : 'Chiuso • Tocca per aprire'}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase ${
                        hoodOpen
                          ? 'bg-alfa-gold text-zinc-950 font-bold'
                          : 'bg-white/10 opacity-70'
                      }`}
                    >
                      {hoodOpen ? 'Aperto' : 'Chiuso'}
                    </span>
                  </button>

                  {/* Reset Vista */}
                  <button
                    type="button"
                    onClick={onResetView}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border min-h-[50px] transition-all active:scale-[0.98] ${
                      isLight
                        ? 'bg-zinc-900/5 hover:bg-zinc-900/10 border-zinc-900/10 text-zinc-800'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-zinc-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/10 text-alfa-gold">
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-semibold">Reset Vista</p>
                        <p className="text-[11px] opacity-70">
                          Ripristina inquadratura frontale iniziale
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold tracking-wider uppercase bg-white/10 opacity-70">
                      Reset
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Bottom Row: Full-Width "In Corsa" Button */}
            <button
              type="button"
              onClick={handleEnterDriveClick}
              className="w-full mt-3 bg-gradient-to-r from-[#9E1B24] via-[#b51f29] to-[#C8102E] text-white font-bold py-3 px-4 rounded-xl shadow-lg flex items-center justify-center gap-2 active:scale-95 min-h-[44px]"
            >
              <Gauge className="w-5 h-5 text-alfa-gold animate-pulse" />
              <span className="text-xs sm:text-sm font-bold uppercase tracking-wider">
                In Corsa • Avvia Pista
              </span>
            </button>
          </div>
        )}
      </section>
    </>
  );
}

export default ShowroomBottomSheet;