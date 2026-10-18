import React, { useEffect, useState } from 'react';
import {
  Camera,
  Check,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  FileText,
  Gauge,
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
import { driveStore } from './components/drive/driveStore';
import { Speedometer } from './components/drive/Speedometer';
import { useEngineSound } from './components/drive/useEngineSound';

const DEDICATION_STORAGE_KEY = 'alfa_romeo_1973_dedication';
const DEFAULT_DEDICATION = 'Per Papà — Passione senza tempo';

const REAL_PHOTOS = [
  {
    src: '/images/alfa-profilo.jpeg',
    title: 'Profilo Laterale • Linea Giugiaro',
    location: 'Colli Veneti • Vista Ortogonale',
    caption:
      'Profilo fastback puro senza spoiler, presa d’aria sul montante C con scritta GTV, tappo serbatoio nero, cerchi a 16 fori e adesivi storici ASI / Club Alfetta.',
  },
  {
    src: '/images/alfa-raduno.jpeg',
    title: 'Raduno Storico • Scheda Ufficiale N. 27',
    location: 'Circolo Patavino Auto Storiche',
    caption:
      'Scheda espositiva N. 27: Alfa Romeo Alfetta GTV (Cat. B2 • 2000 cc), calandra nera con doppi baffi cromati, 4 proiettori Carello e targa 463880 PD.',
  },
  {
    src: '/images/alfa-originale.jpeg',
    title: 'Grand Hotel Trieste & Victoria (3/4)',
    location: 'Abano Terme (PD)',
    caption:
      'Riflessi cielo sul cofano in Grigio Chiaro Metallizzato AR 727, paraurti a lama cromati con rostri in gomma nera e indicatori ambra.',
  },
  {
    src: '/images/alfa-hotel.jpeg',
    title: 'Piazzale Storico • Vista Anteriore Sinistra',
    location: 'Abano Terme (PD)',
    caption:
      'Dettaglio dello specchietto cromato, tergicristalli, guarnizioni inox dei cristalli verdi e volante con corona in legno.',
  },
  {
    src: '/images/alfa-parco.jpeg',
    title: 'Viale Alberato • 3/4 Anteriore',
    location: 'Abano Terme (PD)',
    caption:
      'Proporzioni da coupé Gran Turismo firmate da Giorgetto Giugiaro (Italdesign) con ripartizione dei pesi 50:50 Transaxle.',
  },
];

const HISTORICAL_SPECS = [
  {
    label: 'Esemplare & Targa Storica',
    value: 'Targa Nera Originale 463880 PD • Scheda N. 27',
    detail:
      'Grigio Chiaro Metallizzato (AR 727) • Circolo Patavino Auto Storiche / ASI',
  },
  {
    label: 'Frontale & Gruppi Ottici',
    value: 'Quattro Proiettori Circolari Carello',
    detail:
      'Calandra nera con doppi baffi cromati GTV, Scudetto Alfa Romeo e paraurti con rostri in gomma',
  },
  {
    label: 'Motore Bialbero Alfa Romeo',
    value: '4 cilindri in linea • Doppio albero a camme in testa',
    detail:
      'Basamento e testata in lega leggera • 2 carburatori doppio corpo Dell’Orto / Weber',
  },
  {
    label: 'Architettura Transaxle',
    value: 'Cambio a 5 marce e frizione al retrotreno',
    detail: 'Ripartizione dei pesi ottimale 50:50 sui due assi',
  },
  {
    label: 'Sospensioni & Freni',
    value: 'Ponte De Dion con parallelogramma di Watt',
    detail:
      '4 freni a disco (posteriori entrobordo all’uscita del differenziale)',
  },
  {
    label: 'Stile & Dettagli Carrozzeria',
    value: 'Giorgetto Giugiaro • Italdesign',
    detail:
      'Coupé Fastback coda tronca • Montante C con fregio GTV • Cerchi a 16 fori con coprimozzo cromato',
  },
];

export default function App() {
  const [sceneMode, setSceneMode] = useState(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('mode') === 'drive' || window.location.hash === '#drive') {
        driveStore.setMode('drive');
        return 'drive';
      }
    } catch {}
    return 'showroom';
  });
  const [autoRotate, setAutoRotate] = useState(() => {
    try {
      return new URL(window.location.href).searchParams.get('rotate') !== '0';
    } catch {}
    return true;
  });
  const [lightingMode, setLightingMode] = useState(() => {
    try {
      const url = new URL(window.location.href);
      if (url.searchParams.get('theme') === 'studio') return 'studio';
    } catch {}
    return 'night';
  });
  const [activePaintId, setActivePaintId] = useState('ar727-reale');
  const [activePresetId, setActivePresetId] = useState(() => {
    try {
      const url = new URL(window.location.href);
      return url.searchParams.get('preset') || 'hero';
    } catch {}
    return 'hero';
  });
  const [cameraRequest, setCameraRequest] = useState(() => {
    try {
      const url = new URL(window.location.href);
      const p = url.searchParams.get('preset');
      if (p) {
        const found = CAMERA_PRESETS.find((c) => c.id === p);
        if (found) return found;
      }
    } catch {}
    return null;
  });

  const [showSpecs, setShowSpecs] = useState(false);
  const [showRealPhoto, setShowRealPhoto] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [hudHidden, setHudHidden] = useState(false);

  // Synthesize twin-cam Bialbero engine sound when enabled
  useEngineSound();

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

  const handleEnterDrive = () => {
    driveStore.setMode('drive');
    setSceneMode('drive');
    setAutoRotate(false);
    setShowSpecs(false);
    setShowRealPhoto(false);
  };

  const handleExitDrive = () => {
    driveStore.setMode('showroom');
    setSceneMode('showroom');
  };

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
  const currentPhoto = REAL_PHOTOS[photoIndex] || REAL_PHOTOS[0];

  return (
    <main
      className={`relative w-screen h-screen overflow-hidden select-none transition-colors duration-500 ${
        isLight ? 'bg-[#e8e6e1] text-zinc-900' : 'bg-[#111113] text-zinc-100'
      }`}
    >
      {/* 3D Interactive Showroom / Drive Canvas */}
      <div className="absolute inset-0 z-0">
        <CarViewer
          autoRotate={autoRotate}
          lightingMode={lightingMode}
          activePaintId={activePaintId}
          cameraRequest={cameraRequest}
          sceneMode={sceneMode}
        />
      </div>

      {/* Speedometer HUD & Driving Controls in Drive Mode */}
      {sceneMode === 'drive' && (
        <Speedometer onExitDrive={handleExitDrive} />
      )}

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
      {sceneMode === 'showroom' && (
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
            {/* Primary Action: Launch Drive Mode */}
            <button
              type="button"
              onClick={handleEnterDrive}
              className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-200 bg-gradient-to-r from-[#9E1B24] via-[#b51f29] to-[#C8102E] text-white shadow-[0_0_16px_rgba(200,16,46,0.45)] hover:shadow-[0_0_24px_rgba(200,16,46,0.7)] hover:scale-[1.02] active:scale-95"
              title="Avvia la modalità In Corsa (animazione su strada alpina)"
            >
              <Gauge className="w-4 h-4 text-alfa-gold animate-pulse" />
              <span>In Corsa</span>
            </button>

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
              <span>Foto Reali (5)</span>
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
              <span>Scheda Tecnica</span>
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
      )}

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

      {/* GALLERIA FOTO REALI ESEMPLARE (463880 PD) DRAWER / CAROUSEL */}
      {showRealPhoto && !hudHidden && (
        <aside
          className={`pointer-events-auto fixed top-24 right-4 sm:right-6 lg:right-8 z-30 w-[calc(100vw-2rem)] sm:w-[440px] rounded-2xl p-4 sm:p-5 transition-all duration-300 ${glassClass}`}
        >
          <div className="flex items-start justify-between gap-4 pb-3 mb-3 border-b border-current/10">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-alfa-gold block">
                GALLERIA REALE ({photoIndex + 1}/{REAL_PHOTOS.length}) • TARGA 463880 PD
              </span>
              <h2 className="font-serif text-xl font-semibold">
                {currentPhoto.title}
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowRealPhoto(false)}
              className="p-1.5 rounded-lg opacity-70 hover:opacity-100 transition"
              aria-label="Chiudi galleria foto"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="relative rounded-xl overflow-hidden border border-white/15 shadow-lg mb-3 bg-black/40 group">
            <img
              src={currentPhoto.src}
              alt={currentPhoto.title}
              className="w-full h-60 sm:h-64 object-cover object-center transition-all duration-300"
            />

            {/* Prev / Next Navigation Buttons */}
            <button
              type="button"
              onClick={() =>
                setPhotoIndex(
                  (prev) => (prev - 1 + REAL_PHOTOS.length) % REAL_PHOTOS.length
                )
              }
              aria-label="Foto precedente"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/65 text-white hover:bg-black/85 transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() =>
                setPhotoIndex((prev) => (prev + 1) % REAL_PHOTOS.length)
              }
              aria-label="Foto successiva"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/65 text-white hover:bg-black/85 transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-black/75 backdrop-blur-md text-zinc-100 text-[11px] font-mono">
              <span className="inline-flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-alfa-gold shrink-0" />
                {currentPhoto.location}
              </span>
              <span className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-600 font-bold shrink-0">
                463880 PD
              </span>
            </div>
          </div>

          {/* Thumbnail selector strip */}
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {REAL_PHOTOS.map((photo, idx) => (
              <button
                key={photo.src}
                type="button"
                onClick={() => setPhotoIndex(idx)}
                className={`relative h-11 rounded-lg overflow-hidden border transition-all ${
                  idx === photoIndex
                    ? 'border-alfa-gold ring-1 ring-alfa-gold scale-[1.03]'
                    : 'border-white/10 opacity-65 hover:opacity-100'
                }`}
              >
                <img
                  src={photo.src}
                  alt={photo.title}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>

          <p
            className={`text-xs leading-relaxed ${
              isLight ? 'text-zinc-700' : 'text-zinc-300'
            }`}
          >
            {currentPhoto.caption}
          </p>
        </aside>
      )}

      {/* SCHEDA TECNICA DRAWER / MODAL */}
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
                Specifiche Esemplare (463880 PD)
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
      {sceneMode === 'showroom' && (
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
                  className={`hidden sm:inline-block text-xs font-serif italic truncate max-w-[230px] ${
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

            {/* Primary Controls Row: Auto-Rotate, Reset View, In Corsa, Lighting Selector */}
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

                {/* In Corsa (Running Scene Animation Mode) */}
                <button
                  type="button"
                  onClick={handleEnterDrive}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all bg-gradient-to-r from-[#9E1B24] via-[#b51f29] to-[#C8102E] text-white shadow-[0_0_20px_rgba(200,16,46,0.45)] hover:shadow-[0_0_28px_rgba(200,16,46,0.7)] hover:scale-[1.03] active:scale-95"
                  title="Avvia la modalità In Corsa (animazione su strada alpina)"
                >
                  <Gauge className="w-4 h-4 text-alfa-gold animate-pulse" />
                  <span>In Corsa</span>
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
      )}
    </main>
  );
}
