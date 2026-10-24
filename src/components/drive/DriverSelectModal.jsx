import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, OrbitControls, Sparkles } from '@react-three/drei';
import {
  ChevronLeft,
  ChevronRight,
  Flame,
  Play,
  Rotate3d,
  Sparkles as SparklesIcon,
  UserCheck,
} from 'lucide-react';
import { DRIVERS, getDriverById } from './driversData';
import { DriverCharacter3D } from './DriverCharacter3D';
import { driveStore } from './driveStore';

/**
 * 3D Illuminated Showroom Turntable Podium + Volumetric Spotlight Cone
 */
function ShowcasePodium3D({ accentColor = '#f59e0b' }) {
  const ringRef = useRef();

  useFrame((_, delta) => {
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.45;
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* Main Upper Turntable Disc */}
      <mesh position={[0, -0.04, 0]} receiveShadow>
        <cylinderGeometry args={[0.92, 0.98, 0.08, 36]} />
        <meshStandardMaterial color="#14171f" metalness={0.75} roughness={0.25} />
      </mesh>

      {/* Lower Stepped Base */}
      <mesh position={[0, -0.11, 0]} receiveShadow>
        <cylinderGeometry args={[1.08, 1.16, 0.07, 36]} />
        <meshStandardMaterial color="#090b10" metalness={0.85} roughness={0.3} />
      </mesh>

      {/* Glowing Accent Rim Ring */}
      <mesh position={[0, 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.84, 0.90, 48]} />
        <meshBasicMaterial color={accentColor} />
      </mesh>

      {/* Rotating Segmented Inner Tech Ring */}
      <mesh
        ref={ringRef}
        position={[0, 0.003, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.64, 0.67, 12]} />
        <meshBasicMaterial color={accentColor} transparent opacity={0.65} />
      </mesh>

      {/* Subtle Volumetric Spotlight Aura Cylinder */}
      <mesh position={[0, 1.35, 0]}>
        <cylinderGeometry args={[0.65, 0.90, 2.7, 24, 1, true]} />
        <meshBasicMaterial
          color={accentColor}
          transparent
          opacity={0.055}
          depthWrite={false}
        />
      </mesh>

      {/* Endless Dark Studio Floor Plane */}
      <mesh position={[0, -0.146, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[14, 48]} />
        <meshStandardMaterial color="#07090e" metalness={0.4} roughness={0.65} />
      </mesh>
    </group>
  );
}

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

  const stats = activeDriver.stats || {
    style: 95,
    reflexes: 90,
    charisma: 95,
    grip: 90,
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#06080d] text-white select-none">
      {/* Dynamic Ambient Color Backdrop Glow behind the 3D Stage */}
      <div
        className="pointer-events-none absolute inset-0 transition-all duration-700"
        style={{
          background: `radial-gradient(circle at 55% 42%, ${activeDriver.accentColor}33 0%, rgba(6,8,13,0.92) 62%, #05070b 100%)`,
        }}
      />

      {/* 1. FULL-SCREEN UNFRAMED 3D CHARACTER SHOWCASE STAGE */}
      <div className="absolute inset-0 z-0 cursor-grab active:cursor-grabbing">
        <Canvas
          shadows
          dpr={[1, 2]}
          camera={{ position: [0, 1.25, 3.85], fov: 38 }}
        >
          <fog attach="fog" args={['#06080d', 5.5, 13]} />
          <ambientLight intensity={0.75} />
          <hemisphereLight args={['#ffffff', '#1e293b', 0.65]} />

          {/* Key Studio Spotlight */}
          <spotLight
            position={[2.8, 4.5, 3.5]}
            angle={0.55}
            penumbra={0.8}
            intensity={2.4}
            color="#fffaf0"
            castShadow
          />

          {/* Color-Keyed Back Rim Light */}
          <pointLight
            position={[-2.4, 2.6, -2.2]}
            intensity={2.2}
            color={activeDriver.accentColor}
          />
          <pointLight
            position={[2.4, 1.8, -2.0]}
            intensity={1.4}
            color="#93c5fd"
          />

          {/* Full-Body 3D Low-Poly Character + 3D Turntable Podium */}
          <group position={[0.22, -0.82, 0]}>
            <DriverCharacter3D driverId={selectedId} pose="preview" />
            <ShowcasePodium3D accentColor={activeDriver.accentColor} />
            <ContactShadows
              position={[0, 0.005, 0]}
              opacity={0.65}
              scale={3.2}
              blur={2.2}
              far={2.5}
            />
            <Sparkles
              count={36}
              scale={[2.6, 2.6, 2.6]}
              position={[0, 1.2, 0]}
              size={2.2}
              speed={0.4}
              color={activeDriver.accentColor}
            />
          </group>

          {/* Interactive 360° Orbit around the Character */}
          <OrbitControls
            enablePan={false}
            enableZoom={true}
            minDistance={2.5}
            maxDistance={5.2}
            minPolarAngle={Math.PI / 3.2}
            maxPolarAngle={Math.PI / 1.92}
            target={[0.22, 0.28, 0]}
          />
        </Canvas>
      </div>

      {/* 2. FLOATING GAME HUD OVERLAY (Leaves the 3D Character completely unobstructed) */}
      <div className="pointer-events-none relative z-10 flex h-full w-full flex-col justify-between p-4 sm:p-6 lg:px-10">
        {/* Top Floating Header */}
        <div className="pointer-events-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border bg-black/50 backdrop-blur-md shadow-lg"
              style={{
                borderColor: `${activeDriver.accentColor}66`,
                color: activeDriver.accentColor,
              }}
            >
              <UserCheck className="w-5 h-5" />
            </span>
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.28em] text-zinc-400">
                Alfa Romeo Alfetta GTV (1973) • 3D Character Showcase
              </p>
              <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-white drop-shadow">
                Scegli il Tuo Pilota
              </h1>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-4 py-1.5 text-xs text-zinc-300 backdrop-blur-md">
            <Rotate3d className="w-4 h-4 text-amber-400" />
            <span>Trascina con il mouse per ruotare il modello 3D a 360°</span>
          </div>

          {onCloseToShowroom && (
            <button
              onClick={onCloseToShowroom}
              className="rounded-xl border border-white/15 bg-black/55 px-4 py-2 text-xs font-bold uppercase tracking-wider text-zinc-200 backdrop-blur-md hover:border-white/40 hover:bg-white/10 transition"
            >
              ← Torna allo Showroom
            </button>
          )}
        </div>

        {/* Middle Section: Left Floating Character Bio + Side Cycle Arrows */}
        <div className="my-auto flex items-center justify-between gap-4">
          {/* Left Floating Hero Bio & Stats Card */}
          <div className="pointer-events-auto w-full max-w-xs sm:max-w-sm rounded-3xl border border-white/10 bg-black/45 p-5 backdrop-blur-md shadow-2xl">
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="inline-block rounded-md px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest"
                style={{
                  backgroundColor: `${activeDriver.accentColor}25`,
                  color: activeDriver.accentColor,
                  border: `1px solid ${activeDriver.accentColor}70`,
                }}
              >
                {activeDriver.badge}
              </span>
              <span className="text-[11px] font-mono text-zinc-400">
                PILOTA #{DRIVERS.findIndex((d) => d.id === selectedId) + 1}/7
              </span>
            </div>

            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-none">
              {activeDriver.name}
            </h2>
            <p className="mt-1 text-xs sm:text-sm font-semibold text-zinc-300">
              {activeDriver.subtitle}
            </p>

            <p
              className="mt-3 text-xs sm:text-sm italic text-zinc-200 border-l-2 pl-3 py-0.5"
              style={{ borderColor: activeDriver.accentColor }}
            >
              {activeDriver.tagline}
            </p>

            {/* Arcade Stat Bars */}
            <div className="mt-4 space-y-2">
              {[
                { label: 'Stile Anni ’70', val: stats.style },
                { label: 'Riflessi Bialbero', val: stats.reflexes },
                { label: 'Carisma', val: stats.charisma },
                { label: 'Tenuta sull’Olio', val: stats.grip },
              ].map((st) => (
                <div key={st.label}>
                  <div className="flex justify-between text-[10px] font-mono uppercase tracking-wider text-zinc-300 mb-0.5">
                    <span>{st.label}</span>
                    <span className="font-bold">{st.val}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${st.val}%`,
                        backgroundColor:
                          st.label === 'Tenuta sull’Olio' && st.val < 30
                            ? '#f43f5e'
                            : activeDriver.accentColor,
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {activeDriver.easterEgg === 'oil_chaos' && (
              <div className="mt-4 flex items-center gap-2.5 rounded-2xl border border-amber-400/50 bg-amber-500/15 px-3.5 py-2.5 text-xs text-amber-200">
                <Flame className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                <span>
                  <strong>EASTER EGG ATTIVO:</strong> Con <strong>MG</strong> la pista si riempie continuamente di chiazze d’olio su ogni corsia!
                </span>
              </div>
            )}
          </div>

          {/* Right Floating Quick Prev/Next Controls */}
          <div className="pointer-events-auto hidden sm:flex flex-col items-center gap-3">
            <button
              onClick={() => cycleDriver(-1)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-black/55 text-white backdrop-blur-md hover:border-white/40 hover:bg-white/15 active:scale-95 transition shadow-xl"
              title="Pilota precedente (←)"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              onClick={() => cycleDriver(1)}
              className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/15 bg-black/55 text-white backdrop-blur-md hover:border-white/40 hover:bg-white/15 active:scale-95 transition shadow-xl"
              title="Pilota successivo (→)"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Bottom Dock: 7-Character Carousel Bar + Big Launch CTA */}
        <div className="pointer-events-auto flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 rounded-3xl border border-white/10 bg-black/55 p-3 backdrop-blur-xl shadow-2xl">
          {/* 7-Character Horizontal Roster Strip */}
          <div className="grid grid-cols-4 sm:grid-cols-7 gap-2 flex-1">
            {DRIVERS.map((drv) => {
              const isSelected = drv.id === selectedId;
              const isMG = drv.id === 'mg';
              return (
                <button
                  key={drv.id}
                  onClick={() => handleSelect(drv.id)}
                  className={`relative flex flex-col items-start justify-between rounded-2xl border px-3 py-2 text-left transition-all ${
                    isSelected
                      ? 'bg-white/15 border-white shadow-lg -translate-y-0.5'
                      : 'bg-zinc-900/65 border-white/10 hover:border-white/30 hover:bg-white/5'
                  }`}
                >
                  <div className="flex w-full items-center justify-between gap-1 mb-1">
                    <span
                      className="h-2.5 w-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: drv.accentColor }}
                    />
                    {isMG && (
                      <SparklesIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    )}
                  </div>
                  <span className="text-xs font-black text-white truncate w-full">
                    {drv.name}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-400 truncate w-full">
                    {drv.badge}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Launch Race CTA */}
          <button
            onClick={handleStartRace}
            className="flex items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-red-600 via-red-500 to-amber-500 px-7 py-4 text-sm sm:text-base font-black uppercase tracking-wider text-white shadow-xl shadow-red-600/30 hover:brightness-110 active:scale-[0.98] transition shrink-0"
          >
            <Play className="w-5 h-5 fill-current" />
            <span>Scendi in Pista!</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default DriverSelectModal;
