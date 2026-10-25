import React, { useEffect, useState } from 'react';
import {
  Check,
  ChevronRight,
  FileText,
  Image as ImageIcon,
  Moon,
  Pencil,
  Sparkles,
  Sun,
  Volume2,
  VolumeX,
  Wrench,
  X,
} from 'lucide-react';
import { driveStore } from '../drive/driveStore';

const DEDICATION_STORAGE_KEY = 'alfa_romeo_1973_dedication';
const DEFAULT_DEDICATION = 'Per Papà — Passione senza tempo';

/**
 * MobileNavDrawer - Slide-over navigation menu for mobile devices
 * Slide panel from right edge with glass styling, quick access to real photos,
 * official specs, 3D engine inspection, twin-cam sound, theme switcher,
 * editable dedication for dad, and historical heritage notes.
 */
export function MobileNavDrawer({
  isOpen,
  onClose,
  isLight = false,
  lightingMode = 'night',
  onToggleLighting,
  onOpenGallery,
  onOpenSpecs,
  onToggleEngineBay,
  hoodOpen = false,
  activePresetId = 'hero',
  photosCount = 9,
  dedication = DEFAULT_DEDICATION,
  onSaveDedication,
}) {
  const [soundEnabled, setSoundEnabled] = useState(() => driveStore.soundEnabled);
  const [isEditingDedication, setIsEditingDedication] = useState(false);
  const [draftDedication, setDraftDedication] = useState(dedication);

  // Sync draft when prop changes
  useEffect(() => {
    setDraftDedication(dedication);
  }, [dedication]);

  // Keep sound state in sync with driveStore
  useEffect(() => {
    return driveStore.subscribe((store) => {
      setSoundEnabled(store.soundEnabled);
    });
  }, []);

  // Handle escape key and lock body scroll when open
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isEngineActive = hoodOpen && activePresetId === 'engine';

  const handleToggleSound = () => {
    const next = driveStore.toggleSound();
    setSoundEnabled(next);
  };

  const handleSaveDedicationSubmit = (e) => {
    if (e) e.preventDefault();
    const cleaned = draftDedication.trim() || DEFAULT_DEDICATION;
    setDraftDedication(cleaned);
    try {
      localStorage.setItem(DEDICATION_STORAGE_KEY, cleaned);
    } catch {
      // Ignore localStorage errors
    }
    if (onSaveDedication) {
      onSaveDedication(cleaned);
    }
    setIsEditingDedication(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-md transition-opacity duration-300"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="mobile-drawer-title"
    >
      {/* Drawer Container */}
      <div
        className={`w-[85vw] max-w-sm h-full flex flex-col p-5 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))] pr-[max(1.25rem,env(safe-area-inset-right))] shadow-2xl overflow-y-auto border-l transition-all duration-300 ${
          isLight
            ? 'bg-stone-100/95 text-zinc-900 border-zinc-300/40 backdrop-blur-xl'
            : 'bg-[#111113]/95 text-zinc-100 border-white/10 backdrop-blur-xl'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header: Alfa Romeo badge, plate chip, and Close 'X' button */}
        <div className="flex items-center justify-between gap-3 pb-4 border-b border-current/10 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Alfa Romeo Logo Medallion */}
            <div
              className="w-10 h-10 rounded-full border-2 border-alfa-gold bg-[#8A0000] flex items-center justify-center shadow-md relative overflow-hidden shrink-0"
              title="Alfa Romeo Arese"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/30 pointer-events-none" />
              <span className="font-serif font-black text-xs text-[#FAF5E8] tracking-widest select-none">
                AR
              </span>
            </div>

            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-mono text-[9px] uppercase tracking-[0.2em] text-alfa-gold font-bold">
                  Arese • Milano
                </span>
                <span
                  className="inline-flex items-center px-1.5 py-0.2 rounded bg-[#0c0d0f] border border-zinc-500/60 font-mono text-[8px] font-bold tracking-[0.16em] text-zinc-100 shadow-inner"
                  title="Targa Nera Storica Originale di Padova"
                >
                  463880 PD
                </span>
              </div>
              <h2
                id="mobile-drawer-title"
                className="font-serif text-sm font-bold tracking-tight text-current truncate leading-tight mt-0.5"
              >
                Alfetta GTV 2000{' '}
                <span className="italic font-normal text-alfa-gold">(1976)</span>
              </h2>
            </div>
          </div>

          {/* Close 'X' Button (44x44px target) */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Chiudi menu"
            className={`w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-all duration-200 active:scale-95 shrink-0 ${
              isLight
                ? 'hover:bg-zinc-200/80 text-zinc-700 active:bg-zinc-300'
                : 'hover:bg-white/10 text-zinc-300 active:bg-white/20'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Menu Items List */}
        <div className="flex flex-col gap-2.5 my-4">
          {/* a. Galleria Foto Reali (9) */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenGallery) onOpenGallery();
            }}
            className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl flex items-center justify-between text-left transition-all duration-200 active:scale-[0.98] ${
              isLight
                ? 'bg-white/80 hover:bg-white text-zinc-800 border border-zinc-200/80 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-alfa-gold/15 flex items-center justify-center shrink-0">
                <ImageIcon className="w-5 h-5 text-alfa-gold" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold">
                  Galleria Foto Reali ({photosCount})
                </div>
                <div className="text-[11px] opacity-60">
                  Esemplare conservato 463880 PD
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
          </button>

          {/* b. Scheda Tecnica Ufficiale */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onOpenSpecs) onOpenSpecs();
            }}
            className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl flex items-center justify-between text-left transition-all duration-200 active:scale-[0.98] ${
              isLight
                ? 'bg-white/80 hover:bg-white text-zinc-800 border border-zinc-200/80 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-alfa-gold/15 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-alfa-gold" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold">
                  Scheda Tecnica Ufficiale
                </div>
                <div className="text-[11px] opacity-60">
                  Motore AR01608, De Dion & Transaxle
                </div>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
          </button>

          {/* c. Ispezione Motore 3D */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onToggleEngineBay) onToggleEngineBay();
            }}
            className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl flex items-center justify-between text-left transition-all duration-200 active:scale-[0.98] ${
              isEngineActive
                ? 'bg-alfa-gold/20 border border-alfa-gold/40 text-alfa-gold'
                : isLight
                ? 'bg-white/80 hover:bg-white text-zinc-800 border border-zinc-200/80 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-alfa-gold/15 flex items-center justify-center shrink-0">
                <Wrench className="w-5 h-5 text-alfa-gold" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold">
                  {isEngineActive ? 'Chiudi Vano Motore' : 'Ispezione Motore 3D'}
                </div>
                <div className="text-[11px] opacity-60">
                  Cofano controvento & Bialbero
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${
                isEngineActive
                  ? 'bg-alfa-gold text-zinc-950 font-bold'
                  : isLight
                  ? 'bg-zinc-200 text-zinc-600'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {isEngineActive ? 'Aperto' : 'Apri'}
            </span>
          </button>

          {/* d. Sound Bialbero Twin-Cam */}
          <button
            type="button"
            onClick={handleToggleSound}
            className={`w-full min-h-[48px] px-3.5 py-3 rounded-xl flex items-center justify-between text-left transition-all duration-200 active:scale-[0.98] ${
              soundEnabled
                ? isLight
                  ? 'bg-emerald-50 border border-emerald-300/80 text-emerald-950'
                  : 'bg-emerald-950/30 border border-emerald-500/40 text-emerald-300'
                : isLight
                ? 'bg-white/80 hover:bg-white text-zinc-800 border border-zinc-200/80 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 text-zinc-200 border border-white/5'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  soundEnabled ? 'bg-emerald-500/20' : 'bg-zinc-500/15'
                }`}
              >
                {soundEnabled ? (
                  <Volume2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <VolumeX className="w-5 h-5 text-zinc-400" />
                )}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold">
                  Sound Bialbero Twin-Cam
                </div>
                <div className="text-[11px] opacity-60">
                  Sintesi audio 1779cc doppio corpo
                </div>
              </div>
            </div>
            <span
              className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full ${
                soundEnabled
                  ? 'bg-emerald-500 text-white shadow-sm'
                  : isLight
                  ? 'bg-zinc-200 text-zinc-600'
                  : 'bg-zinc-800 text-zinc-400'
              }`}
            >
              {soundEnabled ? 'ON' : 'OFF'}
            </span>
          </button>

          {/* e. Tema Showroom (Moon / Sun) */}
          <div
            className={`w-full min-h-[48px] p-2.5 rounded-xl flex items-center justify-between transition-all ${
              isLight
                ? 'bg-white/80 border border-zinc-200/80 shadow-sm'
                : 'bg-white/5 border border-white/5'
            }`}
          >
            <div className="flex items-center gap-3 pl-1">
              <div className="w-9 h-9 rounded-lg bg-alfa-gold/15 flex items-center justify-center shrink-0">
                {lightingMode === 'studio' ? (
                  <Sun className="w-5 h-5 text-amber-500" />
                ) : (
                  <Moon className="w-5 h-5 text-alfa-gold" />
                )}
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold">Tema Showroom</div>
                <div className="text-[11px] opacity-60">
                  {lightingMode === 'studio' ? 'Studio Chiaro' : 'Garage Notturno'}
                </div>
              </div>
            </div>
            <div className="flex items-center p-1 rounded-lg bg-black/20 shrink-0">
              <button
                type="button"
                onClick={() => onToggleLighting && onToggleLighting('night')}
                className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  lightingMode === 'night'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Notte
              </button>
              <button
                type="button"
                onClick={() => onToggleLighting && onToggleLighting('studio')}
                className={`min-h-[36px] px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                  lightingMode === 'studio'
                    ? 'bg-white text-zinc-900 shadow-sm font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Studio
              </button>
            </div>
          </div>

          {/* f. Dedica per Papà (Sparkles & Pencil inline form) */}
          <div
            className={`w-full rounded-xl p-3.5 transition-all ${
              isLight
                ? 'bg-white/80 border border-zinc-200/80 shadow-sm'
                : 'bg-white/5 border border-white/5'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-alfa-gold shrink-0" />
                <span className="text-xs font-semibold uppercase tracking-wider text-alfa-gold">
                  Dedica per Papà
                </span>
              </div>
              {!isEditingDedication && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftDedication(dedication);
                    setIsEditingDedication(true);
                  }}
                  aria-label="Modifica dedica per Papà"
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center -mr-2 -my-2 text-zinc-400 hover:text-current transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              )}
            </div>

            {isEditingDedication ? (
              <form onSubmit={handleSaveDedicationSubmit} className="flex flex-col gap-2">
                <input
                  type="text"
                  value={draftDedication}
                  onChange={(e) => setDraftDedication(e.target.value)}
                  maxLength={60}
                  autoFocus
                  aria-label="Testo della dedica"
                  placeholder="Scrivi una dedica..."
                  className={`w-full text-xs sm:text-sm font-serif italic px-3 py-2 rounded-lg border outline-none min-h-[44px] ${
                    isLight
                      ? 'bg-white border-zinc-300 text-zinc-900 focus:border-[#9E1B24]'
                      : 'bg-zinc-900 border-zinc-700 text-zinc-100 focus:border-alfa-gold'
                  }`}
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftDedication(dedication);
                      setIsEditingDedication(false);
                    }}
                    className="min-h-[44px] px-3 py-1.5 text-xs rounded-lg opacity-70 hover:opacity-100 transition"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="min-h-[44px] px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#9E1B24] text-white hover:bg-[#C8102E] flex items-center gap-1.5 shadow transition"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Salva</span>
                  </button>
                </div>
              </form>
            ) : (
              <p
                className={`font-serif italic text-xs sm:text-sm leading-relaxed ${
                  isLight ? 'text-zinc-700' : 'text-zinc-300'
                }`}
              >
                “{dedication}”
              </p>
            )}
          </div>
        </div>

        {/* g. Historical note footer: Giorgetto Giugiaro & Circolo Patavino */}
        <div className="mt-auto pt-5 border-t border-current/10 text-[11px] leading-relaxed opacity-75 shrink-0">
          <p className="font-serif italic">
            Design capolavoro firmato da{' '}
            <strong className="font-semibold not-italic">Giorgetto Giugiaro (Italdesign)</strong>.
          </p>
          <p className="mt-1 font-mono text-[10px] text-alfa-gold">
            Circolo Patavino Auto Storiche • ASI
          </p>
          <p className="mt-0.5 text-[10px] opacity-60">
            Milano / Arese • 1976
          </p>
        </div>
      </div>
    </div>
  );
}

export default MobileNavDrawer;
