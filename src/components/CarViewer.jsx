import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import {
  Bounds,
  Center,
  ContactShadows,
  Environment,
  Html,
  MeshReflectorMaterial,
  OrbitControls,
  useBounds,
  useGLTF,
  useProgress,
} from '@react-three/drei';

const MODEL_PATH = '/models/alfa-romeo-1973-cad.glb?v=6';

export const PAINT_FINISHES = [
  {
    id: 'ar727-reale',
    name: 'Grigio Chiaro Metallizzato AR 727 (Originale)',
    yearCode: 'AR 727 • TARGA 463880 PD',
    swatch: 'linear-gradient(135deg, #dce4ec 0%, #aebac6 55%, #6e7885 100%)',
    swatchColor: '#BCC7D2',
    color: '#bcc7d2',
    metalness: 0.62,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
  },
  {
    id: 'argento',
    name: 'Argento Alfa Metallizzato (Chiaro)',
    yearCode: 'AR 760 • 1973',
    swatchColor: '#D0D7DF',
    color: '#cfd7df',
    metalness: 0.72,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.35,
  },
  {
    id: 'rosso',
    name: 'Rosso Alfa 1973',
    yearCode: 'AR 501 • 1973',
    swatchColor: '#9E1B24',
    color: '#9b151e',
    metalness: 0.22,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.2,
  },
  {
    id: 'blu',
    name: 'Blu Olandese',
    yearCode: 'AR 343 • 1973',
    swatchColor: '#1B2E4B',
    color: '#172944',
    metalness: 0.45,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
  },
  {
    id: 'verde',
    name: 'Verde Pino',
    yearCode: 'AR 216 • 1973',
    swatchColor: '#1E3F2E',
    color: '#193728',
    metalness: 0.4,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
  },
  {
    id: 'clay',
    name: 'Studio Clay • Centro Stile',
    yearCode: 'ITALDESIGN • PROTOTIPO',
    swatchColor: '#D8D2C7',
    color: '#d4cec3',
    metalness: 0.08,
    roughness: 0.48,
    clearcoat: 0.3,
    clearcoatRoughness: 0.25,
    envMapIntensity: 0.85,
  },
];

export const CAMERA_PRESETS = [
  {
    id: 'front',
    label: 'Fronte',
    position: [0, 0.95, 4.2],
    target: [0, 0.25, 0],
  },
  {
    id: 'hero',
    label: '3/4 Showroom',
    position: [3.2, 1.15, 3.5],
    target: [0, 0.25, 0],
  },
  {
    id: 'side',
    label: 'Profilo',
    position: [4.6, 0.82, 0],
    target: [0, 0.25, 0],
  },
  {
    id: 'rear',
    label: '3/4 Posteriore',
    position: [-3.2, 1.2, -3.5],
    target: [0, 0.25, 0],
  },
  {
    id: 'top',
    label: "Dall'Alto",
    position: [0, 5.2, 0.4],
    target: [0, 0.2, 0],
  },
];

/**
 * Builds dedicated high-grade Three.js PBR materials for each named sub-mesh
 * in our multi-material parametric CAD .glb model:
 * - CarPaint: Dynamic automotive lacquer + clearcoat (changes with UI paint selector)
 * - Chrome: Mirror-polished stainless steel & chrome bumpers/Scudetto/trim
 * - Glass: Transparent green-tinted automotive glass showing the 3D interior cabin
 * - RubberBlack: Matte Pirelli tires, rubber overriders (rostri), slatted grille, C-pillar louvers
 * - AlloyRim: 16-slot Campagnolo silver alloy wheel rims
 * - HeadlightLens: Crystal Carello fluted glass headlights
 * - AmberLens / RedTaillight: Translucent indicator & taillight lenses
 * - InteriorDark / InteriorWood: Cabin seats, twin-binnacle dashboard & wooden steering wheel
 */
function createShowroomMaterials(selectedPaint) {
  return {
    CarPaint: new THREE.MeshPhysicalMaterial({
      name: 'CarPaint',
      color: new THREE.Color(selectedPaint.color),
      metalness: selectedPaint.metalness,
      roughness: selectedPaint.roughness,
      clearcoat: selectedPaint.clearcoat,
      clearcoatRoughness: selectedPaint.clearcoatRoughness,
      envMapIntensity: selectedPaint.envMapIntensity,
      reflectivity: 0.9,
      side: THREE.DoubleSide,
    }),
    Chrome: new THREE.MeshPhysicalMaterial({
      name: 'Chrome',
      color: new THREE.Color('#f4f7fb'),
      metalness: 0.96,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.55,
      side: THREE.DoubleSide,
    }),
    Glass: new THREE.MeshPhysicalMaterial({
      name: 'Glass',
      color: new THREE.Color('#192e2b'),
      transparent: true,
      opacity: 0.62,
      metalness: 0.15,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.45,
      side: THREE.DoubleSide,
    }),
    RubberBlack: new THREE.MeshStandardMaterial({
      name: 'RubberBlack',
      color: new THREE.Color('#141619'),
      metalness: 0.04,
      roughness: 0.84,
      side: THREE.DoubleSide,
    }),
    AlloyRim: new THREE.MeshPhysicalMaterial({
      name: 'AlloyRim',
      color: new THREE.Color('#d8e0e8'),
      metalness: 0.82,
      roughness: 0.19,
      clearcoat: 0.65,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.35,
      side: THREE.DoubleSide,
    }),
    HeadlightLens: new THREE.MeshPhysicalMaterial({
      name: 'HeadlightLens',
      color: new THREE.Color('#f6faff'),
      emissive: new THREE.Color('#282e38'),
      emissiveIntensity: 0.35,
      metalness: 0.25,
      roughness: 0.04,
      clearcoat: 1.0,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
    }),
    AmberLens: new THREE.MeshPhysicalMaterial({
      name: 'AmberLens',
      color: new THREE.Color('#e6740a'),
      emissive: new THREE.Color('#381800'),
      emissiveIntensity: 0.25,
      metalness: 0.1,
      roughness: 0.1,
      clearcoat: 1.0,
      side: THREE.DoubleSide,
    }),
    RedTaillight: new THREE.MeshPhysicalMaterial({
      name: 'RedTaillight',
      color: new THREE.Color('#a61218'),
      emissive: new THREE.Color('#2c0305'),
      emissiveIntensity: 0.25,
      metalness: 0.1,
      roughness: 0.1,
      clearcoat: 1.0,
      side: THREE.DoubleSide,
    }),
    InteriorDark: new THREE.MeshStandardMaterial({
      name: 'InteriorDark',
      color: new THREE.Color('#16181c'),
      metalness: 0.06,
      roughness: 0.72,
      side: THREE.DoubleSide,
    }),
    InteriorWood: new THREE.MeshPhysicalMaterial({
      name: 'InteriorWood',
      color: new THREE.Color('#703816'),
      metalness: 0.08,
      roughness: 0.22,
      clearcoat: 0.85,
      side: THREE.DoubleSide,
    }),
  };
}

/**
 * Authentic Padova Vintage Black License Plates ("463880 PD")
 * Mounted dead-center under the front chrome bumper (as in alfa-raduno.jpeg)
 * and centered on the rear Kamm tail panel between the taillights.
 */
function VintageLicensePlates() {
  const plateTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Matte black vintage Italian license plate background
    ctx.fillStyle = '#0c0d0f';
    ctx.fillRect(0, 0, 512, 128);

    // Subtle raised white/silver rim
    ctx.strokeStyle = '#d8dee6';
    ctx.lineWidth = 4;
    ctx.strokeRect(6, 6, 500, 116);

    // Authentic 1976 Italian typography: "463880" + Republic Star + "PD"
    ctx.fillStyle = '#f4f6f8';
    ctx.font = 'bold 72px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('463880', 194, 68);
    ctx.fillText('PD', 418, 68);

    // Small Italian Republic emblem star circle between digits and province
    ctx.strokeStyle = '#cfd6df';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(338, 66, 13, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('★', 338, 67);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <>
      {/* Front bumper plate — DEAD CENTER (z = 0.0) under the front Scudetto & bumper */}
      <group position={[-0.962, -0.098, 0.0]} rotation={[0, -Math.PI / 2, 0]}>
        {/* Matte black plate holder bracket (portatarga) */}
        <mesh position={[0, 0, -0.002]} castShadow>
          <boxGeometry args={[0.164, 0.042, 0.005]} />
          <meshStandardMaterial color="#121316" roughness={0.75} metalness={0.15} />
        </mesh>
        {/* Enameled black license plate */}
        <mesh position={[0, 0, 0.001]} castShadow>
          <boxGeometry args={[0.156, 0.037, 0.004]} />
          <meshStandardMaterial
            map={plateTexture}
            roughness={0.34}
            metalness={0.14}
          />
        </mesh>
      </group>

      {/* Rear Kamm tail centered plate between taillights */}
      <mesh
        position={[0.938, 0.035, 0.0]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
      >
        <boxGeometry args={[0.155, 0.042, 0.006]} />
        <meshStandardMaterial
          map={plateTexture}
          roughness={0.34}
          metalness={0.14}
        />
      </mesh>
    </>
  );
}

/**
 * High-Definition Enameled "ALFA ROMEO - MILANO" Circular Crest (Stemma Storico)
 * Renders a 1024x1024 procedural cloisonné enamel texture with:
 * - Outer metallic gold & chrome bezel rings
 * - Deep navy/sapphire blue enamel border with curved gold "ALFA - ROMEO" (top)
 *   and "MILANO" (bottom) + two Savoy figure-8 knots (nodi sabaudi)
 * - Left half: Red Cross of Milan (Croce Rossa su campo bianco)
 * - Right half: Crowned Visconti Serpent (Biscione verde coronato d'oro con fanciullo rosso)
 */
function AlfaRomeoEmblems() {
  const emblemTexture = useMemo(() => {
    const size = 1024;
    const cx = size / 2;
    const cy = size / 2;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // 1. Outer Gold / Chrome Metallic Rim
    const outerGrad = ctx.createLinearGradient(0, 0, size, size);
    outerGrad.addColorStop(0, '#f7e7b4');
    outerGrad.addColorStop(0.5, '#c89d42');
    outerGrad.addColorStop(1, '#fff2c6');
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 496, 0, Math.PI * 2);
    ctx.fill();

    // 2. Deep Sapphire / Navy Blue Cloisonné Enamel Outer Ring
    const blueGrad = ctx.createRadialGradient(cx - 80, cy - 80, 120, cx, cy, 480);
    blueGrad.addColorStop(0, '#163868');
    blueGrad.addColorStop(0.65, '#0b2144');
    blueGrad.addColorStop(1, '#06152d');
    ctx.fillStyle = blueGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 474, 0, Math.PI * 2);
    ctx.fill();

    // 3. Inner Gold Divider Ring separating the blue border from the central heraldic shield
    const innerR = 324;
    ctx.strokeStyle = '#dfbd69';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Inner Heraldic Circle: White Enamel Base
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 7, 0, Math.PI * 2);
    ctx.clip();

    const whiteGrad = ctx.createRadialGradient(cx - 50, cy - 60, 40, cx, cy, innerR);
    whiteGrad.addColorStop(0, '#ffffff');
    whiteGrad.addColorStop(0.85, '#f2efe9');
    whiteGrad.addColorStop(1, '#dcd6ca');
    ctx.fillStyle = whiteGrad;
    ctx.fillRect(0, 0, size, size);

    // Subtle sky-tinted right half for the Visconti field
    ctx.fillStyle = '#edf3f7';
    ctx.fillRect(cx, 0, size / 2, size);

    // LEFT HEMISPHERE: Red Cross of Milan (Croce Rossa su campo bianco)
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cx - 5, size);
    ctx.clip();

    ctx.fillStyle = '#c8102e';
    // Vertical bar of the Red Cross centered in the left hemisphere (or spanning symmetrically)
    const crossCenterX = cx - 142;
    ctx.fillRect(crossCenterX - 44, cy - 320, 88, 640);
    // Horizontal bar of the Red Cross
    ctx.fillRect(cx - 330, cy - 44, 330, 88);

    // Subtle gold cloisonné outline on the Red Cross
    ctx.strokeStyle = '#d4af53';
    ctx.lineWidth = 5;
    ctx.strokeRect(crossCenterX - 44, cy - 320, 88, 640);
    ctx.strokeRect(cx - 330, cy - 44, 330, 88);
    ctx.restore();

    // RIGHT HEMISPHERE: Crowned Visconti Biscione Serpent + Red Figure
    ctx.save();
    ctx.beginPath();
    ctx.rect(cx + 5, 0, size / 2, size);
    ctx.clip();

    const bx = cx + 132;

    // Red human figure emerging from the serpent's jaws (top-left of Biscione)
    ctx.strokeStyle = '#c8102e';
    ctx.fillStyle = '#c8102e';
    ctx.lineWidth = 16;
    ctx.lineCap = 'round';
    // Head
    ctx.beginPath();
    ctx.arc(bx - 64, cy - 196, 15, 0, Math.PI * 2);
    ctx.fill();
    // Torso & outstretched arms
    ctx.beginPath();
    ctx.moveTo(bx - 22, cy - 170);
    ctx.lineTo(bx - 56, cy - 182);
    ctx.moveTo(bx - 74, cy - 218);
    ctx.lineTo(bx - 48, cy - 176);
    ctx.lineTo(bx - 82, cy - 160);
    ctx.stroke();

    // Golden Ducal Crown atop the serpent's head
    ctx.fillStyle = '#e0b854';
    ctx.strokeStyle = '#9c7420';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(bx - 6, cy - 216);
    ctx.lineTo(bx - 14, cy - 248);
    ctx.lineTo(bx + 6, cy - 232);
    ctx.lineTo(bx + 22, cy - 254);
    ctx.lineTo(bx + 36, cy - 232);
    ctx.lineTo(bx + 54, cy - 246);
    ctx.lineTo(bx + 44, cy - 216);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    // Green Visconti Serpent (Biscione) — sinuous 3-coil S-curve body + open jaws
    ctx.strokeStyle = '#0d6b52';
    ctx.lineWidth = 38;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    // Head & jaws
    ctx.moveTo(bx - 20, cy - 198);
    ctx.quadraticCurveTo(bx + 36, cy - 208, bx + 38, cy - 162);
    // Coil 1 (upper)
    ctx.bezierCurveTo(bx + 40, cy - 118, bx - 48, cy - 110, bx - 44, cy - 62);
    // Coil 2 (middle)
    ctx.bezierCurveTo(bx - 40, cy - 12, bx + 58, cy - 8, bx + 52, cy + 46);
    // Coil 3 (lower)
    ctx.bezierCurveTo(bx + 46, cy + 98, bx - 44, cy + 96, bx - 34, cy + 148);
    ctx.stroke();

    // Tapering serpent tail loop at bottom
    ctx.lineWidth = 24;
    ctx.beginPath();
    ctx.moveTo(bx - 34, cy + 148);
    ctx.bezierCurveTo(bx - 24, cy + 194, bx + 42, cy + 186, bx + 18, cy + 236);
    ctx.stroke();

    // Gold cloisonné highlight along the serpent spine
    ctx.strokeStyle = '#dfbd69';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(bx + 18, cy - 188);
    ctx.bezierCurveTo(bx + 38, cy - 122, bx - 42, cy - 110, bx - 38, cy - 62);
    ctx.bezierCurveTo(bx - 34, cy - 12, bx + 54, cy - 8, bx + 48, cy + 46);
    ctx.bezierCurveTo(bx + 42, cy + 98, bx - 40, cy + 96, bx - 30, cy + 148);
    ctx.stroke();
    ctx.restore();

    // Central Vertical Gold Cloisonné Divider Line
    ctx.fillStyle = '#dfbd69';
    ctx.fillRect(cx - 6, cy - innerR, 12, innerR * 2);

    ctx.restore();

    // 5. Curved Gold Typography on Navy Border: "ALFA - ROMEO" (top) & "MILANO" (bottom)
    const textRadius = 398;
    ctx.fillStyle = '#f3d88c';
    ctx.font = 'bold 64px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Helper for top arc text ("ALFA - ROMEO")
    const topText = 'ALFA - ROMEO';
    const topStartAngle = -Math.PI / 2 - 0.98;
    const topEndAngle = -Math.PI / 2 + 0.98;
    for (let i = 0; i < topText.length; i++) {
      const charAngle =
        topStartAngle +
        (i / (topText.length - 1)) * (topEndAngle - topStartAngle);
      ctx.save();
      ctx.translate(
        cx + Math.cos(charAngle) * textRadius,
        cy + Math.sin(charAngle) * textRadius
      );
      ctx.rotate(charAngle + Math.PI / 2);
      ctx.fillText(topText[i], 0, 0);
      ctx.restore();
    }

    // Helper for bottom arc text ("MILANO")
    const botText = 'MILANO';
    const botStartAngle = Math.PI / 2 + 0.56;
    const botEndAngle = Math.PI / 2 - 0.56;
    for (let i = 0; i < botText.length; i++) {
      const charAngle =
        botStartAngle +
        (i / (botText.length - 1)) * (botEndAngle - botStartAngle);
      ctx.save();
      ctx.translate(
        cx + Math.cos(charAngle) * textRadius,
        cy + Math.sin(charAngle) * textRadius
      );
      ctx.rotate(charAngle - Math.PI / 2);
      ctx.fillText(botText[i], 0, 0);
      ctx.restore();
    }

    // 6. Two Gold Savoy Figure-8 Knots (Nodi Sabaudi) at Left (9 o'clock) and Right (3 o'clock)
    ctx.strokeStyle = '#e8c872';
    ctx.lineWidth = 10;
    [-1, 1].forEach((side) => {
      const kx = cx + side * textRadius;
      const ky = cy + 12;
      ctx.beginPath();
      ctx.arc(kx - 16, ky, 15, 0, Math.PI * 2);
      ctx.arc(kx + 16, ky, 15, 0, Math.PI * 2);
      ctx.stroke();
    });

    // 7. Subtle Clearcoat Gloss Highlight across upper-left dome
    const glossGrad = ctx.createRadialGradient(
      cx - 140,
      cy - 160,
      20,
      cx - 100,
      cy - 120,
      360
    );
    glossGrad.addColorStop(0, 'rgba(255, 255, 255, 0.26)');
    glossGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.06)');
    glossGrad.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = glossGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 480, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <>
      {/* Front Scudetto Top-Center Alfa Romeo - Milano Enameled Emblem */}
      <mesh
        position={[-0.9685, 0.020, 0.0]}
        rotation={[0, -Math.PI / 2, 0]}
      >
        <circleGeometry args={[0.0138, 64]} />
        <meshPhysicalMaterial
          map={emblemTexture}
          metalness={0.22}
          roughness={0.14}
          clearcoat={1.0}
          clearcoatRoughness={0.04}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Rear Kamm Tail Trunk Center Alfa Romeo - Milano Enameled Emblem */}
      <mesh
        position={[0.941, 0.068, 0.0]}
        rotation={[0, Math.PI / 2, 0]}
      >
        <circleGeometry args={[0.014, 64]} />
        <meshPhysicalMaterial
          map={emblemTexture}
          metalness={0.22}
          roughness={0.14}
          clearcoat={1.0}
          clearcoatRoughness={0.04}
          envMapIntensity={1.4}
        />
      </mesh>
    </>
  );
}

/**
 * Refined HTML loader displayed inside the 3D Canvas while the GLB model streams in.
 */
function ShowroomLoader({ lightingMode }) {
  const { progress } = useProgress();
  const isLight = lightingMode === 'studio';

  return (
    <Html center>
      <div
        className={`w-72 sm:w-80 rounded-2xl p-6 text-center transition-all duration-300 ${
          isLight
            ? 'glass-panel-light text-zinc-900'
            : 'glass-panel-dark text-zinc-100'
        }`}
      >
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-alfa-gold/40 bg-alfa-gold/10 text-[10px] font-mono uppercase tracking-[0.2em] text-alfa-gold mb-3">
          <span>Arese • Targa 463880 PD</span>
        </div>

        <p className="font-serif text-xl italic tracking-wide mb-1">
          Alfa Romeo Alfetta GTV
        </p>
        <p
          className={`text-[11px] font-mono tracking-[0.16em] uppercase mb-4 ${
            isLight ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          ALFA ROMEO • CARICAMENTO MODELLO 3D CAD
        </p>

        <div
          className={`w-full h-1.5 rounded-full overflow-hidden mb-2.5 ${
            isLight ? 'bg-zinc-300/80' : 'bg-zinc-800/90'
          }`}
        >
          <div
            className="h-full bg-gradient-to-r from-[#9E1B24] via-[#C8102E] to-[#C5A059] transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(8, progress))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>
            MULTI-MESH CAD &amp; SHADER
          </span>
          <span className="text-alfa-gold font-medium">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </Html>
  );
}

/**
 * Loads the multi-material CAD GLB model of the Alfa Romeo Alfetta GTV
 * and binds dedicated PBR materials to each sub-mesh (CarPaint, Chrome, Glass,
 * RubberBlack, AlloyRim, HeadlightLens, AmberLens, RedTaillight, Interior).
 */
function AlfaRomeoModel({ activePaintId }) {
  const { scene } = useGLTF(MODEL_PATH);

  const selectedPaint = useMemo(
    () =>
      PAINT_FINISHES.find((paint) => paint.id === activePaintId) ||
      PAINT_FINISHES[0],
    [activePaintId]
  );

  const preparedScene = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.geometry = child.geometry.clone();

        if (!child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals();
        }

        child.castShadow = true;
        child.receiveShadow = true;

        if (!child.userData.originalMaterialName) {
          child.userData.originalMaterialName =
            (child.material && child.material.name) || 'CarPaint';
        }
      }
    });

    return cloned;
  }, [scene]);

  const materialsMap = useMemo(
    () => createShowroomMaterials(selectedPaint),
    [selectedPaint]
  );

  useEffect(() => {
    preparedScene.traverse((child) => {
      if (child.isMesh) {
        const matName = child.userData.originalMaterialName || 'CarPaint';
        const targetMat = materialsMap[matName] || materialsMap.CarPaint;
        child.material = targetMat;
        child.material.needsUpdate = true;
      }
    });

    return () => {
      Object.values(materialsMap).forEach((mat) => mat.dispose());
    };
  }, [preparedScene, materialsMap]);

  return (
    <Center top>
      {/* Rotate +90° around Y so the -X front shark-nose faces +Z toward the front camera */}
      <group rotation={[0, Math.PI / 2, 0]}>
        <primitive object={preparedScene} />
        <VintageLicensePlates />
        <AlfaRomeoEmblems />
      </group>
    </Center>
  );
}

/**
 * Coordinates smooth camera transitions with <Bounds> and OrbitControls.
 */
function CameraRig({ cameraRequest, controlsRef }) {
  const bounds = useBounds();
  const { camera } = useThree();

  useEffect(() => {
    if (!cameraRequest || !bounds) return;

    const { position, target } = cameraRequest;
    bounds.refresh().moveTo(position).lookAt({
      target: target || [0, 0.25, 0],
    });

    if (controlsRef.current && target) {
      controlsRef.current.target.set(target[0], target[1], target[2]);
      controlsRef.current.update();
    }
  }, [cameraRequest, bounds, camera, controlsRef]);

  return null;
}

/**
 * Synchronizes scene background and balanced studio/night lighting.
 */
function ShowroomAtmosphere({ lightingMode }) {
  const isLight = lightingMode === 'studio';
  const bgColor = isLight ? '#e8e6e1' : '#111113';

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 9, 24]} />

      {/* Soft Hemisphere Fill */}
      <hemisphereLight
        args={[
          isLight ? '#ffffff' : '#dce6f5',
          isLight ? '#c8c4bc' : '#2a2d34',
          isLight ? 0.9 : 0.65,
        ]}
      />

      {/* Primary Key Directional Light with Soft Shadows */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={isLight ? 1.4 : 1.55}
        color={isLight ? '#fffdf8' : '#f4f7ff'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00015}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />

      {/* Warm Italian Showroom Rim Spotlight */}
      <spotLight
        position={[-6, 6, -5]}
        angle={0.5}
        penumbra={1}
        intensity={isLight ? 1.0 : 1.75}
        color={isLight ? '#ffffff' : '#ebd4b7'}
      />

      {/* Subtle Front Fill Light for Carello Headlights & Scudetto Alfa Romeo */}
      <directionalLight
        position={[0, 2.2, 6]}
        intensity={isLight ? 0.7 : 0.6}
        color={isLight ? '#ffffff' : '#d6e0f0'}
      />

      {/* HDRI Reflections */}
      <Environment preset={isLight ? 'studio' : 'city'} />
    </>
  );
}

export default function CarViewer({
  autoRotate,
  lightingMode,
  activePaintId,
  cameraRequest,
}) {
  const controlsRef = useRef(null);
  const isLight = lightingMode === 'studio';

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [3.2, 1.15, 3.5], fov: 40, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isLight ? 0.96 : 1.05,
        }}
      >
        <ShowroomAtmosphere lightingMode={lightingMode} />

        <Suspense fallback={<ShowroomLoader lightingMode={lightingMode} />}>
          <Bounds fit clip observe margin={1.2}>
            <AlfaRomeoModel activePaintId={activePaintId} />
            <CameraRig
              cameraRequest={cameraRequest}
              controlsRef={controlsRef}
            />
          </Bounds>

          {/* Ground Contact Shadows */}
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.7}
            scale={10}
            blur={2}
            far={4}
          />

          {/* Luxury Showroom Reflective Floor Disc */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.015, 0]}
            receiveShadow
          >
            <circleGeometry args={[12, 64]} />
            <MeshReflectorMaterial
              blur={[300, 80]}
              resolution={1024}
              mixBlur={0.9}
              mixStrength={isLight ? 0.2 : 0.5}
              roughness={isLight ? 0.68 : 0.4}
              depthScale={1}
              minDepthThreshold={0.4}
              maxDepthThreshold={1.4}
              color={isLight ? '#dcd9d0' : '#131418'}
              metalness={isLight ? 0.12 : 0.4}
            />
          </mesh>
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enablePan={false}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={2}
          maxDistance={10}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_PATH);
