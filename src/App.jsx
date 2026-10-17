import React, { useEffect, useState } from 'react';
import {
  Camera,
  Check,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  MapPin,
  Moon,
  Palette,
  Pause,
  Pencil,
  Play,
  RotateCcw,
  Sparkles,
  Sun,
  X,
} from 'lucide-react';
import CarViewer, {
  CAMERA_PRESETS,
  PAINT_FINISHES,
} from './components/CarViewer.jsx';

const DEDICATION_STORAGE_KEY = 'alfa_romeo_1973_dedication';
const DEFAULT_DEDICATION = 'Per Papà — Passione senza tempo';

const HISTORICAL_SPECS = [
  {
    label: 'Esemplare & Targa Storica',
    value: 'Targa Nera Originale 463880 PD (Padova)',
    detail: 'Grigio Chiaro Metallizzato (Codice Alfa Romeo AR 727)',
  },
  {
    label: 'Frontale & Gruppi Ottici',
    value: 'Quattro Proiettori Circolari Carello',
    detail:
      'Calandra nera con baffi cromati, Scudetto Alfa Romeo e paraurti a lama con rostri in gomma',
  },
  {
    label: 'Motore',
    value: 'Bialbero Alfa Romeo 4 cilindri in linea',
    detail: '1.779 cc • Basamento e testata in lega leggera • 122 CV a 5.500 giri/min',
  },
  {
    label: 'Architettura Transaxle',
    value: 'Cambio a 5 marce e frizione al retrotreno',
    detail: 'Ripartizione dei pesi ottimale 50:50 sui due assi',
  },
  {
    label: 'Sospensioni & Freni',
    value: 'Ponte De Dion con parallelogramma di Watt',
    detail: '4 freni a disco (posteriori entrobordo all’uscita del differenziale)',
  },
  {
    label: 'Stile & Carrozzeria',
    value: 'Giorgetto Giugiaro • Italdesign',
    detail: 'Coupé Fastback con coda tronca • Cerchi argento con coprimozzo cromato',
  },
];

export default function App() {
  const [autoRotate, setAutoRotate] = useState(true);
  const [lightingMode, setLightingMode] = useState('night'); // 'night' | 'studio'
  const [activePaintId, setActivePaintId] = useState('argento');
  const [activePresetId, setActivePresetId] = useState('hero');
  const [cameraRequest, setCameraRequest] = useState(null);

  const [showSpecs, setShowSpecs] = useState(false);
  const [showRealPhoto, setShowRealPhoto] = useState(false);
  const [hudHidden, setHudHidden] = useState(false);

  // Dedication state persisted in localStorage
  const [dedication, setDedication] = useState(() => {
    try {
      return localStorage.getItem(DEDICATION_STORAGE_KEY) || DEFAULT_DEDICATION;
    } catch {
      return DEFAULT_DEDICATION;
    }
  });
  const [isEditingDedication, setIsEditingDedication] = useState(false);
  const [draftDedication, setDraftDedication] = useState(dedication);

  useEffect(() => {
    try {
      localStorage.setItem(DEDICATION_STORAGE_KEY, dedication);
    } catch {
      // Ignore storage errors in private browsing
    }
  }, [dedication]);

  const isLight = lightingMode === 'studio';
  const glassClass = isLight ? 'glass-panel-light' : 'glass-panel-dark';

  const handleSelectCameraPreset = (preset) => {
    setActivePresetId(preset.id);
    setCameraRequest({
      presetId: preset.id,
      position: preset.position,
      target: preset.target,
      timestamp: Date.now(),
    });
  };

  const handleResetView = () => {
    const frontPreset =
      CAMERA_PRESETS.find((p) => p.id === 'front') || CAMERA_PRESETS[0];
    setActivePresetId(frontPreset.id);
    setCameraRequest({
      presetId: frontPreset.id,
      position: frontPreset.position,
      target: frontPreset.target,
      timestamp: Date.now(),
    });
  };

  const handleSaveDedication = (e) => {
    if (e) e.preventDefault();
    const cleaned = draftDedication.trim() || DEFAULT_DEDICATION;
    setDedication(cleaned);
    setDraftDedication(cleaned);
    setIsEditingDedication(false);
  };

  const currentPaint =
    PAINT_FINISHES.find((p) => p.id === activePaintId) || PAINT_FINISHES[0];

  return (
    <main
      className={`relative w-screen h-screen overflow-hidden select-none transition-colors duration-500 ${
        isLight ? 'bg-[#e8e6e1] text-zinc-900' : 'bg-[#111113] text-zinc-100'
      }`}
    >
      {/* 3D Interactive Showroom Canvas */}
      <div className="absolute inset-0 z-0">
        <CarViewer
          autoRotate={autoRotate}
          lightingMode={lightingMode}
          activePaintId={activePaintId}
          cameraRequest={cameraRequest}
        />
      </div>

      {/* Subtle Ambient Vignette (non-blocking) */}
      <div
        className="pointer-events-none absolute inset-0 z-10"
        style={{
          background: isLight
            ? 'radial-gradient(circle at 50% 45%, transparent 58%, rgba(24, 24, 27, 0.12) 100%)'
            : 'radial-gradient(circle at 50% 45%, transparent 52%, rgba(0, 0, 0, 0.65) 100%)',
        }}
      />

      {/* TOP HEADER OVERLAY */}
      <header
        className={`pointer-events-none absolute top-0 left-0 right-0 z-20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 sm:p-6 lg:px-8 transition-all duration-500 ${
          hudHidden
            ? 'opacity-0 -translate-y-4'
            : 'opacity-100 translate-y-0'
        }`}
      >
        {/* Brand Title, Vintage Plate Badge & Customizable Dedication */}
        <div
          className={`pointer-events-auto rounded-2xl px-4 py-3 sm:px-5 sm:py-3.5 transition-all duration-300 ${glassClass}`}
        >
          <div className="flex flex-wrap items-center gap-2.5 mb-1.5">
            <span className="inline-block w-2 h-2 rounded-full bg-[#9E1B24] shadow-[0_0_8px_#C8102E]" />
            <span className="font-mono text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-alfa-gold font-medium">
              CENTRO STILE • MILANO 1973
            </span>
            {/* Authentic Vintage Black License Plate Badge */}
            <span
              className="inline-flex items-center px-2 py-0.5 rounded bg-[#0c0d0f] border border-zinc-500/60 font-mono text-[10px] font-bold tracking-[0.18em] text-zinc-100 shadow-inner"
              title="Targa Nera Storica Originale di Padova"
            >
              463880 PD
            </span>
          </div>

          <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-semibold tracking-tight leading-none">
            Alfa Romeo Alfetta GTV{' '}
            <span className="italic font-normal text-alfa-gold">(1973)</span>
          </h1>

          {/* Customizable Dedication for Dad */}
          <div className="mt-2 pt-2 border-t border-current/10 flex items-center gap-2">
            {isEditingDedication ? (
              <form
                onSubmit={handleSaveDedication}
                className="flex items-center gap-1.5 w-full"
              >
                <input
                  type="text"
                  value={draftDedication}
                  onChange={(e) => setDraftDedication(e.target.value)}
                  maxLength={60}
                  autoFocus
                  aria-label="Dedica personalizzata"
                  className={`text-xs sm:text-sm font-serif italic px-2 py-0.5 rounded border outline-none w-52 sm:w-64 ${
                    isLight
                      ? 'bg-white/90 border-zinc-300 text-zinc-900'
                      : 'bg-zinc-900/90 border-zinc-700 text-zinc-100'
                  }`}
                />
                <button
                  type="submit"
                  title="Salva dedica"
                  className="p-1 rounded-md bg-[#9E1B24] text-white hover:bg-[#C8102E] transition"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
              </form>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-alfa-gold shrink-0" />
                <p
                  className={`font-serif italic text-sm sm:text-base tracking-wide ${
                    isLight ? 'text-zinc-700' : 'text-zinc-200'
                  }`}
                >
                  “{dedication}”
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setDraftDedication(dedication);
                    setIsEditingDedication(true);
                  }}
                  title="Personalizza la dedica"
                  className={`ml-1 p-1 rounded-md transition ${
                    isLight
                      ? 'text-zinc-500 hover:text-zinc-900 hover:bg-zinc-900/5'
                      : 'text-zinc-400 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <Pencil className="w-3 h-3" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* Top-Right Quick Actions */}
        <div className="pointer-events-auto flex items-center gap-2 self-end sm:self-start">
          <button
            type="button"
            onClick={() => {
              setShowRealPhoto((prev) => !prev);
              setShowSpecs(false);
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${glassClass} ${
              showRealPhoto
                ? 'ring-1 ring-alfa-gold text-alfa-gold'
                : isLight
                ? 'hover:bg-white/90 text-zinc-800'
                : 'hover:bg-white/10 text-zinc-200'
            }`}
          >
            <ImageIcon className="w-4 h-4 text-alfa-gold" />
            <span>Foto Originale</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setShowSpecs((prev) => !prev);
              setShowRealPhoto(false);
            }}
            className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-medium transition-all duration-200 ${glassClass} ${
              showSpecs
                ? 'ring-1 ring-alfa-gold text-alfa-gold'
                : isLight
                ? 'hover:bg-white/90 text-zinc-800'
                : 'hover:bg-white/10 text-zinc-200'
            }`}
          >
            <FileText className="w-4 h-4 text-alfa-gold" />
            <span>Scheda Tecnica 1973</span>
          </button>

          <button
            type="button"
            onClick={() => setHudHidden(true)}
            title="Nascondi interfaccia per vista pura"
            className={`p-2.5 rounded-xl transition-all duration-200 ${glassClass} ${
              isLight
                ? 'hover:bg-white/90 text-zinc-700'
                : 'hover:bg-white/10 text-zinc-300'
            }`}
          >
            <EyeOff className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* FLOATING RESTORE HUD BUTTON WHEN HIDDEN */}
      {hudHidden && (
        <button
          type="button"
          onClick={() => setHudHidden(false)}
          className={`pointer-events-auto fixed top-5 right-5 z-30 flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-medium transition-all ${glassClass}`}
        >
          <Eye className="w-4 h-4 text-alfa-gold" />
          <span>Mostra Controlli</span>
        </button>
      )}

      {/* FOTO ORIGINALE ESEMPLARE REALE (463880 PD) DRAWER / LIGHTBOX */}
      {showRealPhoto && !hudHidden && (
        <aside
          className={`pointer-events-auto fixed top-24 right-4 sm:right-6 lg:right-8 z-30 w-[calc(100vw-2rem)] sm:w-[420px] rounded-2xl p-4 sm:p-5 transition-all duration-300 ${glassClass}`}
        >
          <div className="flex items-start justify-between gap-4 pb-3 mb-3 border-b border-current/10">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-alfa-gold block">
                ESEMPLARE REALE • TARGA 463880 PD
              </span>
              <h2 className="font-serif text-xl font-semibold">
                La Vera Alfetta di Papà
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowRealPhoto(false)}
              className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition"
              aria-label="Chiudi foto originale"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-white/15 shadow-lg mb-3 bg-black/30">
            <img
              src="/images/alfa-originale.jpeg"
              alt="Alfa Romeo Alfetta GT/GTV Targa 463880 PD in Grigio Chiaro Metallizzato"
              className="w-full h-56 sm:h-64 object-cover object-center"
            />
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-md text-zinc-100 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3 h-3 text-alfa-gold" />
                Abano Terme • Hotel Trieste &amp; Victoria
              </span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-600 font-bold">
                463880 PD
              </span>
            </div>
          </div>

          <p
            className={`text-xs leading-relaxed ${
              isLight ? 'text-zinc-700' : 'text-zinc-300'
            }`}
          >
            Finitura originale{' '}
            <strong className="text-alfa-gold font-medium">
              Grigio Chiaro Metallizzato (AR 727)
            </strong>
            , calandra a quattro proiettori circolari Carello con baffi cromati
            e Scudetto Alfa Romeo centrale, paraurti a lama con rostri in gomma
            nera e targa storica originale di Padova.
          </p>
        </aside>
      )}

      {/* SCHEDA TECNICA 1973 DRAWER / MODAL */}
      {showSpecs && !hudHidden && (
        <aside
          className={`pointer-events-auto fixed top-24 right-4 sm:right-6 lg:right-8 z-30 w-[calc(100vw-2rem)] sm:w-96 rounded-2xl p-5 transition-all duration-300 ${glassClass}`}
        >
          <div className="flex items-start justify-between gap-4 pb-3 mb-3 border-b border-current/10">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-alfa-gold block">
                OMOLOGAZIONE STORICA • ARESE
              </span>
              <h2 className="font-serif text-xl font-semibold">
                Specifiche Tecniche (1973)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowSpecs(false)}
              className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition"
              aria-label="Chiudi scheda tecnica"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1 no-scrollbar">
            {HISTORICAL_SPECS.map((spec) => (
              <div
                key={spec.label}
                className={`p-2.5 rounded-xl border ${
                  isLight
                    ? 'bg-white/50 border-zinc-900/5'
                    : 'bg-white/[0.03] border-white/[0.06]'
                }`}
              >
                <div className="text-[10px] font-mono uppercase tracking-[0.15em] text-alfa-gold">
                  {spec.label}
                </div>
                <div className="text-xs sm:text-sm font-semibold mt-0.5">
                  {spec.value}
                </div>
                <div
                  className={`text-[11px] mt-0.5 ${
                    isLight ? 'text-zinc-600' : 'text-zinc-400'
                  }`}
                >
                  {spec.detail}
                </div>
              </div>
            ))}
          </div>
        </aside>
      )}

      {/* BOTTOM GLASSMORPHISM CONTROL DOCK */}
      <footer
        className={`pointer-events-none absolute bottom-0 left-0 right-0 z-20 flex flex-col items-center p-3 sm:p-5 transition-all duration-500 ${
          hudHidden
            ? 'opacity-0 translate-y-6'
            : 'opacity-100 translate-y-0'
        }`}
      >
        <div
          className={`pointer-events-auto w-full max-w-4xl rounded-2xl p-3 sm:p-4 transition-all duration-300 ${glassClass}`}
        >
          {/* Top Row inside Dock: Paint Finish Selector & Camera Angle Presets */}
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 pb-3 mb-3 border-b border-current/10">
            {/* Paint Selector */}
            <div className="flex items-center justify-between sm:justify-start gap-3">
              <div className="flex items-center gap-1.5 text-xs font-medium shrink-0">
                <Palette className="w-3.5 h-3.5 text-alfa-gold" />
                <span className="font-mono text-[10px] uppercase tracking-[0.15em] opacity-75">
                  Finitura:
                </span>
              </div>

              <div className="flex items-center gap-2">
                {PAINT_FINISHES.map((paint) => {
                  const isSelected = paint.id === activePaintId;
                  return (
                    <button
                      key={paint.id}
                      type="button"
                      onClick={() => setActivePaintId(paint.id)}
                      title={`${paint.name} (${paint.yearCode})`}
                      aria-label={paint.name}
                      className={`group relative w-6 h-6 rounded-full transition-transform duration-200 ${
                        isSelected
                          ? 'scale-110 ring-2 ring-alfa-gold ring-offset-2 ring-offset-black/40'
                          : 'opacity-80 hover:opacity-100 hover:scale-105'
                      }`}
                      style={{
                        background: paint.swatch || paint.swatchColor,
                      }}
                    >
                      <span className="sr-only">{paint.name}</span>
                    </button>
                  );
                })}
              </div>

              <span
                className={`hidden sm:inline-block text-xs font-serif italic truncate max-w-[220px] ${
                  isLight ? 'text-zinc-700' : 'text-zinc-300'
                }`}
              >
                {currentPaint.name}
              </span>
            </div>

            {/* Camera Angle Quick Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
              <span className="hidden xl:inline-flex items-center gap-1 text-[10px] font-mono uppercase tracking-[0.15em] opacity-70 mr-1 shrink-0">
                <Camera className="w-3 h-3 text-alfa-gold" />
                Vista:
              </span>
              {CAMERA_PRESETS.map((preset) => {
                const isActive = activePresetId === preset.id;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectCameraPreset(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-[#9E1B24] text-white shadow-sm'
                        : isLight
                        ? 'bg-zinc-900/5 text-zinc-700 hover:bg-zinc-900/10'
                        : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary Controls Row: Auto-Rotate, Reset View, Lighting Selector */}
          <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              {/* Play / Pause Auto-Rotation */}
              <button
                type="button"
                onClick={() => setAutoRotate((prev) => !prev)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  autoRotate
                    ? 'bg-[#9E1B24] text-white shadow-[0_0_20px_rgba(158,27,36,0.4)] hover:bg-[#b51f29]'
                    : isLight
                    ? 'bg-zinc-900/10 text-zinc-800 hover:bg-zinc-900/15'
                    : 'bg-white/10 text-zinc-200 hover:bg-white/15'
                }`}
              >
                {autoRotate ? (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-current" />
                    <span>Pausa Rotazione</span>
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Avvia Rotazione</span>
                  </>
                )}
              </button>

              {/* Reset Vista Button */}
              <button
                type="button"
                onClick={handleResetView}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  isLight
                    ? 'bg-zinc-900/10 text-zinc-800 hover:bg-zinc-900/15'
                    : 'bg-white/10 text-zinc-200 hover:bg-white/15'
                }`}
              >
                <RotateCcw className="w-3.5 h-3.5 text-alfa-gold" />
                <span>Reset Vista</span>
              </button>
            </div>

            {/* Interactive Hint */}
            <div
              className={`hidden md:flex items-center gap-2 text-[11px] font-mono tracking-wider uppercase ${
                isLight ? 'text-zinc-500' : 'text-zinc-400'
              }`}
            >
              <span>Trascina per ruotare • Scorri per zoom</span>
            </div>

            {/* Lighting Environment Selector: Garage Notturno vs Studio Chiaro */}
            <div
              className={`flex items-center p-1 rounded-xl border ${
                isLight
                  ? 'bg-zinc-900/5 border-zinc-900/10'
                  : 'bg-black/40 border-white/10'
              }`}
            >
              <button
                type="button"
                onClick={() => setLightingMode('night')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  lightingMode === 'night'
                    ? 'bg-zinc-800 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-800'
                }`}
              >
                <Moon className="w-3.5 h-3.5 text-alfa-gold" />
                <span>Garage Notturno</span>
              </button>

              <button
                type="button"
                onClick={() => setLightingMode('studio')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  lightingMode === 'studio'
                    ? 'bg-white text-zinc-900 shadow-sm'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-alfa-gold" />
                <span>Studio Chiaro</span>
              </button>
            </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
