import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
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
import { driveStore } from './drive/driveStore';
import { DriveWorld } from './drive/DriveWorld';
import { DriveCameraDirector } from './drive/DriveCameraDirector';
import { DriverCharacter3D } from './drive/DriverCharacter3D';

const MODEL_PATH = '/models/alfa-romeo-1973-cad.glb?v=21';
const ENGINE_MODEL_PATH = '/models/alfetta-bialbero-engine.glb?v=3';

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
    id: 'wheel',
    label: 'Cerchi',
    position: [2.15, 0.38, 1.15],
    target: [0, 0.22, 0.65],
  },
  {
    id: 'cockpit',
    label: 'Abitacolo',
    position: [0.08, 0.42, -0.20],
    target: [0.075, 0.30, 0.16],
  },
  {
    id: 'engine',
    label: 'Motore',
    position: [0.68, 0.66, 0.44],
    target: [-0.02, 0.24, 0.58],
  },
  {
    id: 'back',
    label: 'Retro',
    position: [0, 0.5, -2.1],
    target: [0, 0.34, -0.9],
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
 * - InteriorDark / InteriorWood / InteriorCarpet / InteriorSeatCream / InteriorDoorTan: Cabin interior
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
    // Tail panel + lamp bezels: same hue as the body but a much less metallic, softer finish
    // (the photo shows solid light-silver paint there; only the bumper is real chrome)
    CarPaintRear: new THREE.MeshPhysicalMaterial({
      name: 'CarPaintRear',
      color: new THREE.Color(selectedPaint.color).lerp(new THREE.Color('#ffffff'), 0.12),
      metalness: Math.min(selectedPaint.metalness, 0.14),
      roughness: 0.5,
      clearcoat: 0.25,
      clearcoatRoughness: 0.35,
      envMapIntensity: 0.55,
      side: THREE.DoubleSide,
    }),
    Chrome: new THREE.MeshPhysicalMaterial({
      name: 'Chrome',
      color: new THREE.Color('#f4f7fb'),
      metalness: 0.94,
      roughness: 0.09,
      clearcoat: 0.9,
      clearcoatRoughness: 0.09,
      envMapIntensity: 1.4,
      side: THREE.DoubleSide,
    }),
    Glass: new THREE.MeshPhysicalMaterial({
      name: 'Glass',
      color: new THREE.Color('#192e2b'),
      transparent: true,
      opacity: 0.62,
      metalness: 0.15,
      roughness: 0.08,
      clearcoat: 0.9,
      clearcoatRoughness: 0.08,
      envMapIntensity: 1.35,
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
    InteriorCarpet: new THREE.MeshStandardMaterial({
      name: 'InteriorCarpet',
      color: new THREE.Color('#562230'),
      metalness: 0.02,
      roughness: 0.88,
      side: THREE.DoubleSide,
    }),
    InteriorSeatCream: new THREE.MeshPhysicalMaterial({
      name: 'InteriorSeatCream',
      color: new THREE.Color('#827668'),
      metalness: 0.02,
      roughness: 0.78,
      sheen: 0.65,
      sheenRoughness: 0.6,
      sheenColor: new THREE.Color('#a6998a'),
      side: THREE.DoubleSide,
    }),
    InteriorDoorTan: new THREE.MeshPhysicalMaterial({
      name: 'InteriorDoorTan',
      color: new THREE.Color('#626742'),
      metalness: 0.03,
      roughness: 0.72,
      sheen: 0.55,
      sheenRoughness: 0.65,
      sheenColor: new THREE.Color('#7d8358'),
      side: THREE.DoubleSide,
    }),
    InteriorSeatPiping: new THREE.MeshStandardMaterial({
      name: 'InteriorSeatPiping',
      color: new THREE.Color('#b8ab6b'),
      metalness: 0.04,
      roughness: 0.52,
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

  // Rear plate as photographed: orange "PD" block on the left, lighter black field with a tiny
  // "PD" + emblem and large embossed white "463880" on the right (4:1, 1024x256).
  const rearPlateTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#09090a';
    ctx.fillRect(0, 0, 1024, 256);
    ctx.fillStyle = '#151517';
    ctx.fillRect(329, 14, 681, 228);

    ctx.fillStyle = '#e07a2b';
    ctx.font = '900 190px "Arial Black", Impact, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PD', 170, 136, 260);

    ctx.fillStyle = '#f2f2f0';
    ctx.font = '700 40px Arial, sans-serif';
    ctx.fillText('PD', 376, 150, 70);
    ctx.strokeStyle = '#b9b9b9';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(376, 200, 20, 0, Math.PI * 2);
    ctx.stroke();

    // Embossed look: dark offset shadow then white face
    ctx.font = '700 205px "Arial Narrow", "Helvetica Neue", Arial, sans-serif';
    ctx.fillStyle = '#3a3a3c';
    ctx.fillText('463880', 702, 130, 574);
    ctx.fillStyle = '#f6f6f4';
    ctx.fillText('463880', 698, 126, 574);

    // [PLACEHOLDER] manufacturer micro-text under the digits is illegible in the photo
    ctx.fillStyle = '#8a2a2a';
    ctx.font = '600 15px Arial, sans-serif';
    ctx.fillText('—  ———————  ✱  ———————  —', 760, 238);

    ctx.strokeStyle = '#2a2a2c';
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, 1020, 252);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // Chrome ALFA ROMEO lettering: wide capitals stretched to the photo's widths
  // ("ALFA" = 41% | gap 5% | "ROMEO" = 54% of the 440 px wide word-mark)
  const lettersTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2048;
    canvas.height = 137;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, 2048, 137);
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = '900 128px "Arial Black", Impact, sans-serif';
    const draw = (txt, x0, w) => {
      const natural = ctx.measureText(txt).width;
      ctx.save();
      ctx.translate(x0 + 6, 70);
      ctx.scale((w - 12) / natural, 1);
      ctx.lineJoin = 'round';
      ctx.lineWidth = 9;
      ctx.strokeStyle = '#1d1d1f';
      ctx.strokeText(txt, 0, 0);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(txt, 0, -2);
      ctx.restore();
    };
    draw('ALFA', 0, 840);
    draw('ROMEO', 955, 1093);
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

      {/* Rear plate: real photo size (0.232 x 0.058 u, 4:1) seated in the tail-panel pocket */}
      <mesh
        position={[0.9395, 0.0511, 0.0]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
      >
        <boxGeometry args={[0.232, 0.058, 0.006]} />
        <meshStandardMaterial
          map={rearPlateTexture}
          roughness={0.34}
          metalness={0.14}
        />
      </mesh>

      {/* Chrome "ALFA ROMEO" lettering just under the decklid lip (alpha-cut canvas) */}
      <mesh position={[0.9425, 0.1115, 0.0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.187, 0.0125]} />
        <meshPhysicalMaterial
          map={lettersTexture}
          emissive="#ffffff"
          emissiveMap={lettersTexture}
          emissiveIntensity={0.35}
          alphaTest={0.4}
          transparent
          metalness={0.55}
          roughness={0.25}
          envMapIntensity={1.4}
          side={THREE.DoubleSide}
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
function AlfaRomeoEmblems({ wheelCapRefs }) {
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

  /**
   * 1024x1024 Metallic Bas-Relief Alfa Romeo - Milano Texture & Bump Map
   * for the 4 Campagnolo/FPS Wheel Center Caps (Coprimozzi Metallizzati):
   * - Brushed silver/platinum/champagne-gold lathe-turned metallic surface
   * - Dark gunmetal anodized recesses with raised silver/platinum-gold relief for:
   *   - Outer & inner concentric rings
   *   - "ALFA - ROMEO" (top arc) & "MILANO" (bottom arc) + Savoy figure-8 knots
   *   - Cross of Milan (Croce) on left hemisphere
   *   - Crowned Visconti Serpent (Biscione) on right hemisphere
   */
  const { metallicEmblemTexture, metallicBumpTexture } = useMemo(() => {
    const size = 1024;
    const cx = size / 2;
    const cy = size / 2;

    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const bumpCanvas = document.createElement('canvas');
    bumpCanvas.width = size;
    bumpCanvas.height = size;
    const bctx = bumpCanvas.getContext('2d');

    // Base height for bump map (recessed background = dark grey #282828, raised relief = bright white #f5f5f5)
    bctx.fillStyle = '#262626';
    bctx.fillRect(0, 0, size, size);

    // 1. Brushed Metallic Silver/Champagne Outer Rim
    const rimGrad = ctx.createLinearGradient(0, 0, size, size);
    rimGrad.addColorStop(0, '#f4f6f9');
    rimGrad.addColorStop(0.35, '#d4d9df');
    rimGrad.addColorStop(0.5, '#9ea6b0');
    rimGrad.addColorStop(0.7, '#eef2f6');
    rimGrad.addColorStop(1, '#b8bec7');
    ctx.fillStyle = rimGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 498, 0, Math.PI * 2);
    ctx.fill();

    bctx.fillStyle = '#e8e8e8';
    bctx.beginPath();
    bctx.arc(cx, cy, 498, 0, Math.PI * 2);
    bctx.fill();

    // 2. Burnished Gunmetal / Pewter Recessed Outer Border Ring
    const borderGrad = ctx.createRadialGradient(cx - 70, cy - 70, 90, cx, cy, 475);
    borderGrad.addColorStop(0, '#5a626e');
    borderGrad.addColorStop(0.55, '#39404a');
    borderGrad.addColorStop(1, '#262b32');
    ctx.fillStyle = borderGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 470, 0, Math.PI * 2);
    ctx.fill();

    bctx.fillStyle = '#303030';
    bctx.beginPath();
    bctx.arc(cx, cy, 470, 0, Math.PI * 2);
    bctx.fill();

    // 3. Inner Raised Metallic Divider Ring
    const innerR = 324;
    ctx.strokeStyle = '#e6ebf0';
    ctx.lineWidth = 16;
    ctx.beginPath();
    ctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    ctx.stroke();

    bctx.strokeStyle = '#f2f2f2';
    bctx.lineWidth = 18;
    bctx.beginPath();
    bctx.arc(cx, cy, innerR, 0, Math.PI * 2);
    bctx.stroke();

    // 4. Inner Medallion Brushed Silver-Platinum Recessed Field
    ctx.save();
    bctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 8, 0, Math.PI * 2);
    ctx.clip();
    bctx.beginPath();
    bctx.arc(cx, cy, innerR - 8, 0, Math.PI * 2);
    bctx.clip();

    const innerMetalGrad = ctx.createLinearGradient(0, 0, size, size);
    innerMetalGrad.addColorStop(0, '#78808a');
    innerMetalGrad.addColorStop(0.3, '#525963');
    innerMetalGrad.addColorStop(0.5, '#8c95a0');
    innerMetalGrad.addColorStop(0.75, '#464d56');
    innerMetalGrad.addColorStop(1, '#6c747e');
    ctx.fillStyle = innerMetalGrad;
    ctx.fillRect(0, 0, size, size);

    // Subtle concentric lathe-turned metallic micro-grooves
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 2;
    for (let r = 24; r < innerR; r += 10) {
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    // Raised Silver-Champagne Metallic Gradient for Heraldic Relief Elements
    const reliefGrad = ctx.createLinearGradient(cx - 250, cy - 250, cx + 250, cy + 250);
    reliefGrad.addColorStop(0, '#ffffff');
    reliefGrad.addColorStop(0.3, '#dfe5ec');
    reliefGrad.addColorStop(0.55, '#b6bec8');
    reliefGrad.addColorStop(0.8, '#f5f7fa');
    reliefGrad.addColorStop(1, '#cbd2dc');

    // LEFT HEMISPHERE: Raised Metallic Cross of Milan (Croce in Rilievo Metallico)
    ctx.save();
    bctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, cx - 6, size);
    ctx.clip();
    bctx.beginPath();
    bctx.rect(0, 0, cx - 6, size);
    bctx.clip();

    const crossCenterX = cx - 142;
    // Dark shadow bevel under the raised metallic cross
    ctx.fillStyle = '#22262c';
    ctx.fillRect(crossCenterX - 42, cy - 318, 92, 640);
    ctx.fillRect(cx - 328, cy - 42, 330, 92);

    // Bright raised metallic cross
    ctx.fillStyle = reliefGrad;
    ctx.fillRect(crossCenterX - 44, cy - 320, 88, 640);
    ctx.fillRect(cx - 330, cy - 44, 330, 88);

    // Specular edge highlight on the metallic cross
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 5;
    ctx.strokeRect(crossCenterX - 44, cy - 320, 88, 640);
    ctx.strokeRect(cx - 330, cy - 44, 330, 88);

    bctx.fillStyle = '#f5f5f5';
    bctx.fillRect(crossCenterX - 44, cy - 320, 88, 640);
    bctx.fillRect(cx - 330, cy - 44, 330, 88);

    ctx.restore();
    bctx.restore();

    // RIGHT HEMISPHERE: Raised Metallic Crowned Visconti Biscione Serpent
    ctx.save();
    bctx.save();
    ctx.beginPath();
    ctx.rect(cx + 6, 0, size / 2, size);
    ctx.clip();
    bctx.beginPath();
    bctx.rect(cx + 6, 0, size / 2, size);
    bctx.clip();

    const bx = cx + 132;

    const drawBiscione = (targetCtx, strokeCol, fillCol, widthScale = 1.0, offset = 0) => {
      targetCtx.save();
      targetCtx.translate(offset, offset);

      // Human figure emerging from serpent's jaws
      targetCtx.strokeStyle = strokeCol;
      targetCtx.fillStyle = fillCol;
      targetCtx.lineWidth = 16 * widthScale;
      targetCtx.lineCap = 'round';
      targetCtx.beginPath();
      targetCtx.arc(bx - 64, cy - 196, 15 * widthScale, 0, Math.PI * 2);
      targetCtx.fill();
      targetCtx.beginPath();
      targetCtx.moveTo(bx - 22, cy - 170);
      targetCtx.lineTo(bx - 56, cy - 182);
      targetCtx.moveTo(bx - 74, cy - 218);
      targetCtx.lineTo(bx - 48, cy - 176);
      targetCtx.lineTo(bx - 82, cy - 160);
      targetCtx.stroke();

      // Crown atop serpent's head
      targetCtx.beginPath();
      targetCtx.moveTo(bx - 6, cy - 216);
      targetCtx.lineTo(bx - 14, cy - 248);
      targetCtx.lineTo(bx + 6, cy - 232);
      targetCtx.lineTo(bx + 22, cy - 254);
      targetCtx.lineTo(bx + 36, cy - 232);
      targetCtx.lineTo(bx + 54, cy - 246);
      targetCtx.lineTo(bx + 44, cy - 216);
      targetCtx.closePath();
      targetCtx.fill();

      // Sinuous 3-coil serpent body
      targetCtx.lineWidth = 38 * widthScale;
      targetCtx.lineJoin = 'round';
      targetCtx.beginPath();
      targetCtx.moveTo(bx - 20, cy - 198);
      targetCtx.quadraticCurveTo(bx + 36, cy - 208, bx + 38, cy - 162);
      targetCtx.bezierCurveTo(bx + 40, cy - 118, bx - 48, cy - 110, bx - 44, cy - 62);
      targetCtx.bezierCurveTo(bx - 40, cy - 12, bx + 58, cy - 8, bx + 52, cy + 46);
      targetCtx.bezierCurveTo(bx + 46, cy + 98, bx - 44, cy + 96, bx - 34, cy + 148);
      targetCtx.stroke();

      // Lower tail loop
      targetCtx.lineWidth = 24 * widthScale;
      targetCtx.beginPath();
      targetCtx.moveTo(bx - 34, cy + 148);
      targetCtx.bezierCurveTo(bx - 24, cy + 194, bx + 42, cy + 186, bx + 18, cy + 236);
      targetCtx.stroke();

      targetCtx.restore();
    };

    // Dark bevel shadow under the metallic Biscione
    drawBiscione(ctx, '#20242a', '#20242a', 1.12, 4);
    // Raised metallic silver/platinum Biscione
    drawBiscione(ctx, reliefGrad, reliefGrad, 1.0, 0);
    // Bright specular spine ridge
    drawBiscione(ctx, '#ffffff', '#ffffff', 0.35, -2);
    // Bump map height for Biscione
    drawBiscione(bctx, '#f5f5f5', '#f5f5f5', 1.05, 0);

    ctx.restore();
    bctx.restore();

    // Central Vertical Raised Metallic Divider Line
    ctx.fillStyle = '#eef2f6';
    ctx.fillRect(cx - 7, cy - innerR, 14, innerR * 2);
    bctx.fillStyle = '#f5f5f5';
    bctx.fillRect(cx - 7, cy - innerR, 14, innerR * 2);

    ctx.restore();
    bctx.restore();

    // 5. Raised Metallic Typography on Gunmetal Border: "ALFA - ROMEO" & "MILANO"
    const textRadius = 398;
    ctx.fillStyle = '#eef2f7';
    ctx.font = 'bold 64px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    bctx.fillStyle = '#f5f5f5';
    bctx.font = 'bold 64px "Cormorant Garamond", Georgia, serif';
    bctx.textAlign = 'center';
    bctx.textBaseline = 'middle';

    const topText = 'ALFA - ROMEO';
    const topStartAngle = -Math.PI / 2 - 0.98;
    const topEndAngle = -Math.PI / 2 + 0.98;
    for (let i = 0; i < topText.length; i++) {
      const charAngle =
        topStartAngle +
        (i / (topText.length - 1)) * (topEndAngle - topStartAngle);
      [ctx, bctx].forEach((c) => {
        c.save();
        c.translate(
          cx + Math.cos(charAngle) * textRadius,
          cy + Math.sin(charAngle) * textRadius
        );
        c.rotate(charAngle + Math.PI / 2);
        c.fillText(topText[i], 0, 0);
        c.restore();
      });
    }

    const botText = 'MILANO';
    const botStartAngle = Math.PI / 2 + 0.56;
    const botEndAngle = Math.PI / 2 - 0.56;
    for (let i = 0; i < botText.length; i++) {
      const charAngle =
        botStartAngle +
        (i / (botText.length - 1)) * (botEndAngle - botStartAngle);
      [ctx, bctx].forEach((c) => {
        c.save();
        c.translate(
          cx + Math.cos(charAngle) * textRadius,
          cy + Math.sin(charAngle) * textRadius
        );
        c.rotate(charAngle - Math.PI / 2);
        c.fillText(botText[i], 0, 0);
        c.restore();
      });
    }

    // 6. Raised Metallic Savoy Knots (Nodi Sabaudi) at 9 o'clock and 3 o'clock
    [ctx, bctx].forEach((c) => {
      c.strokeStyle = '#eef2f7';
      c.lineWidth = 11;
      [-1, 1].forEach((side) => {
        const kx = cx + side * textRadius;
        const ky = cy + 12;
        c.beginPath();
        c.arc(kx - 16, ky, 15, 0, Math.PI * 2);
        c.arc(kx + 16, ky, 15, 0, Math.PI * 2);
        c.stroke();
      });
    });

    // 7. Anisotropic Metallic Sheen across the Medallion
    const sheenGrad = ctx.createLinearGradient(0, 0, size, size);
    sheenGrad.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
    sheenGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.0)');
    sheenGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.18)');
    sheenGrad.addColorStop(1, 'rgba(0, 0, 0, 0.15)');
    ctx.fillStyle = sheenGrad;
    ctx.beginPath();
    ctx.arc(cx, cy, 490, 0, Math.PI * 2);
    ctx.fill();

    const colorTex = new THREE.CanvasTexture(canvas);
    colorTex.colorSpace = THREE.SRGBColorSpace;
    colorTex.anisotropy = 8;
    colorTex.needsUpdate = true;

    const bumpTex = new THREE.CanvasTexture(bumpCanvas);
    bumpTex.anisotropy = 8;
    bumpTex.needsUpdate = true;

    return {
      metallicEmblemTexture: colorTex,
      metallicBumpTexture: bumpTex,
    };
  }, []);

  /**
   * 3. 4 Historical Vintage Club & ASI Window Decals (Vetrofanie Storiche)
   *    Visible along the lower edge of the rear pointed quarter window in alfa-profilo.jpeg & alfa-parco.jpeg:
   *    1) Red Triangular "Club Alfetta / RIAR" decal
   *    2) Blue & Red Heraldic "ASI / Club Storico" shield decal
   *    3) White Circular Vintage Club decal with green/gold emblem ring
   *    4) Horizontal Green Rally/Pass rounded plaque decal
   */
  const { windowStickersTexture, windowStickersGeo } = useMemo(() => {
    const w = 1024;
    const h = 256;
    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, w, h);

    // 1. Red Triangular Sticker (x: 40..240)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(140, 26);
    ctx.lineTo(236, 224);
    ctx.lineTo(44, 224);
    ctx.closePath();
    ctx.fillStyle = '#c81d25';
    ctx.fill();
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#f4f4f0';
    ctx.stroke();

    ctx.fillStyle = '#f4f4f0';
    ctx.fillRect(68, 178, 144, 26);
    ctx.fillStyle = '#18181b';
    ctx.font = '700 15px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('CLUB ALFETTA', 140, 196);
    ctx.fillStyle = '#e5c158';
    ctx.beginPath();
    ctx.arc(140, 132, 22, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 2. Blue & Red Heraldic ASI Shield Sticker (x: 280..450)
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(295, 36);
    ctx.lineTo(435, 36);
    ctx.lineTo(435, 138);
    ctx.quadraticCurveTo(435, 210, 365, 228);
    ctx.quadraticCurveTo(295, 210, 295, 138);
    ctx.closePath();
    ctx.fillStyle = '#163a70';
    ctx.fill();
    ctx.save();
    ctx.clip();
    ctx.fillStyle = '#b91c24';
    ctx.fillRect(365, 76, 80, 160);
    ctx.fillStyle = '#f5f5f2';
    ctx.fillRect(290, 36, 150, 38);
    ctx.fillStyle = '#163a70';
    ctx.font = '800 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A S I', 365, 63);
    ctx.restore();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#e5c158';
    ctx.stroke();
    ctx.restore();

    // 3. White Circular Club Emblem Sticker (center x: 565, y: 134, r: 88)
    ctx.save();
    ctx.beginPath();
    ctx.arc(565, 134, 86, 0, Math.PI * 2);
    ctx.fillStyle = '#f6f6f2';
    ctx.fill();
    ctx.lineWidth = 7;
    ctx.strokeStyle = '#1f6f43';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(565, 134, 64, 0, Math.PI * 2);
    ctx.lineWidth = 5;
    ctx.strokeStyle = '#c5a059';
    ctx.stroke();

    ctx.fillStyle = '#1f6f43';
    ctx.beginPath();
    ctx.arc(565, 128, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e5c158';
    ctx.beginPath();
    ctx.arc(565, 128, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 4. Horizontal Green Rally / Club Plaque Sticker (x: 690..975, y: 125..205)
    ctx.save();
    ctx.beginPath();
    ctx.roundRect(690, 122, 280, 78, 22);
    ctx.fillStyle = '#2e7d32';
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#f4f5f0';
    ctx.stroke();
    ctx.fillStyle = '#f4f5f0';
    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('REGISTRO STORICO', 830, 168);
    ctx.restore();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;

    // Conformal 20x8 3D curved surface grid matching the exact Pezzo 3 rear quarter glass curvature (+0.0028 outside glass)
    const geo = new THREE.BufferGeometry();
    const nu = 20;
    const nv = 8;
    const posArr = [];
    const uvArr = [];
    const idxArr = [];

    for (let j = 0; j < nv; j++) {
      const v = j / (nv - 1);
      for (let i = 0; i < nu; i++) {
        const u = i / (nu - 1);
        const x = 0.235 + u * (0.440 - 0.235);
        const yBot = 0.1362 + u * (0.1426 - 0.1362);
        const yTop = 0.1742 + u * (0.1806 - 0.1742);
        const y = yBot + v * (yTop - yBot);

        // Exact greenhouse_xyz_from_xy(x, y, +1.0, offset_z=0.0028) formula from CAD generator
        const ys = 0.12973 + u * (0.13506 - 0.12973);
        const wEdge = Math.max(0.0, (x - 0.245) / (0.855 - 0.245));
        const yEdge =
          x <= 0.245
            ? 0.2695
            : 0.2695 - (0.2695 - 0.140) * (0.22 * wEdge + 0.78 * Math.pow(wEdge, 1.85));
        const ty = Math.max(0.0, Math.min(1.0, (y - ys) / Math.max(0.012, yEdge - ys)));
        const zSill = 0.3391;
        const zRoof = 0.286 - 0.042 * Math.pow(x - 0.06, 2);
        const z = zSill + (zRoof - zSill) * Math.pow(ty, 0.90) + 0.0028;

        posArr.push(x, y, z);
        uvArr.push(u, v);
      }
    }

    for (let j = 0; j < nv - 1; j++) {
      for (let i = 0; i < nu - 1; i++) {
        const a = j * nu + i;
        const b = a + 1;
        const c = a + nu;
        const d = c + 1;
        idxArr.push(a, b, d, a, d, c);
      }
    }

    geo.setAttribute('position', new THREE.Float32BufferAttribute(posArr, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
    geo.setIndex(idxArr);
    geo.computeVertexNormals();

    return { windowStickersTexture: tex, windowStickersGeo: geo };
  }, []);

  const wheelCapPositions = [
    { x: -0.575, y: -0.145, z: 0.3702, rotY: 0 },
    { x: 0.570, y: -0.145, z: 0.3702, rotY: 0 },
    { x: -0.575, y: -0.145, z: -0.3702, rotY: Math.PI },
    { x: 0.570, y: -0.145, z: -0.3702, rotY: Math.PI },
  ];

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

      {/* Rear Alfa Romeo - Milano badge: high on the hatch sill (x=0.862), flat on the sloping deck */}
      <mesh
        position={[0.86238, 0.14369, 0.0]}
        rotation={[0, Math.PI / 2, Math.PI / 2 - 0.2115, 'ZYX']}
      >
        <circleGeometry args={[0.0126, 64]} />
        <meshPhysicalMaterial
          map={emblemTexture}
          metalness={0.22}
          roughness={0.14}
          clearcoat={1.0}
          clearcoatRoughness={0.04}
          envMapIntensity={1.4}
        />
      </mesh>

      {/* Historical Vintage Club & ASI Decals on Left Rear Pointed Quarter Window (+Z) */}
      <mesh geometry={windowStickersGeo} renderOrder={2}>
        <meshPhysicalMaterial
          map={windowStickersTexture}
          transparent
          alphaTest={0.08}
          roughness={0.18}
          metalness={0.05}
          clearcoat={0.9}
          polygonOffset
          polygonOffsetFactor={-4}
          polygonOffsetUnits={-4}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Four Metallic Bas-Relief Alfa Romeo - Milano Wheel Center Cap Medallions */}
      {wheelCapPositions.map((cap, idx) => (
        <mesh
          key={idx}
          ref={(el) => {
            if (wheelCapRefs && wheelCapRefs.current) {
              wheelCapRefs.current[idx] = el;
            }
          }}
          position={[cap.x, cap.y, cap.z]}
          rotation={[0, cap.rotY, 0]}
        >
          <circleGeometry args={[0.0184, 64]} />
          <meshPhysicalMaterial
            map={metallicEmblemTexture}
            bumpMap={metallicBumpTexture}
            bumpScale={0.003}
            metalness={0.92}
            roughness={0.17}
            clearcoat={0.85}
            clearcoatRoughness={0.06}
            envMapIntensity={1.65}
          />
        </mesh>
      ))}
      {/* Steering Wheel Central Brushed-Silver Alfa Romeo Milano Horn Medallion */}
      <group
        position={[-0.0918, 0.1241, 0.145]}
        rotation={[0, 0, 0.24]}
      >
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <circleGeometry args={[0.0082, 48]} />
          <meshPhysicalMaterial
            map={metallicEmblemTexture}
            bumpMap={metallicBumpTexture}
            bumpScale={0.002}
            metalness={0.92}
            roughness={0.18}
            clearcoat={0.85}
            envMapIntensity={1.5}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>
    </>
  );
}

/**
 * 100% Photo-Accurate 1st-Series Alfetta GTV Cockpit Instruments & Console Graphics
 * Modeled from WhatsApp Image 2026-10-18 at 19.39.07.jpeg:
 * 1. Left Pod: Standalone Veglia Borletti Contagiri (Tachometer) with deep blue dial face,
 *    10..70 x100 RPM scale, redline 60..70, white needle at rest, brushed silver inner frame.
 * 2. Center-Left Pod: Wide Veglia instrument cluster with 8 perimeter screws, left square-bezel
 *    blue-faced Speedometer (20..240 km/h, odometer 84665, trip 0465), and right 2x2 grid of
 *    3 blue-faced auxiliary gauges (PRESS. OLIO, BENZINA, TEMP. ACQUA) + 4 square warning lights.
 * 3. Center Console Fascia: Top blue INT / orange DEF slider graphic, central orange & light-blue
 *    rotary knob scales, white "CLOSE FOR MAX DEF" stencil under each swivel vent, and 1970s
 *    car radio frequency dial scale with colored indicator dots.
 * 4. Wooden Shift Knob Medallion: Black circular 5-speed + R shift pattern insert.
 */
function CockpitInstrumentsAndDetails() {
  // 1. Left Binnacle: Veglia Borletti Blue Tachometer (512x280)
  const tachTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 280;
    const ctx = canvas.getContext('2d');

    // Dark recessed housing & brushed silver rectangular inner frame
    ctx.fillStyle = '#0d0f13';
    ctx.fillRect(0, 0, 512, 280);
    ctx.strokeStyle = '#c8d0da';
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 264);

    // Deep Veglia Borletti Blue Dial Face
    const cx = 256;
    const cy = 148;
    const r = 118;
    const grad = ctx.createRadialGradient(cx - 20, cy - 25, 15, cx, cy, r);
    grad.addColorStop(0, '#1c4d82');
    grad.addColorStop(0.7, '#11345c');
    grad.addColorStop(1, '#0a213d');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();

    // Silver ring around the blue dial
    ctx.strokeStyle = '#aeb8c4';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Redline sector (from 60 to 70, angles in canvas where +0 is right, +90° is down)
    const startAng = Math.PI * 0.72; // 0 RPM (bottom-left)
    const endAng = Math.PI * 2.28;   // 70 RPM (bottom-right)
    const ang60 = startAng + (endAng - startAng) * (60 / 70);
    ctx.strokeStyle = '#d93829';
    ctx.lineWidth = 11;
    ctx.beginPath();
    ctx.arc(cx, cy, r - 14, ang60, endAng);
    ctx.stroke();

    // White radial ticks & numerals 10, 20, 30, 40, 50, 60, 70
    ctx.fillStyle = '#f4f7fb';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 24px "Arial Narrow", Arial, sans-serif';

    for (let i = 0; i <= 70; i += 2) {
      const t = i / 70;
      const a = startAng + t * (endAng - startAng);
      const isMajor = i % 10 === 0;
      const isMid = i % 5 === 0 && !isMajor;
      const rOut = r - 7;
      const rIn = isMajor ? r - 23 : isMid ? r - 18 : r - 13;
      ctx.strokeStyle = i >= 60 ? '#ff5238' : '#f4f7fb';
      ctx.lineWidth = isMajor ? 3.5 : 1.8;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * rIn, cy + Math.sin(a) * rIn);
      ctx.lineTo(cx + Math.cos(a) * rOut, cy + Math.sin(a) * rOut);
      ctx.stroke();

      if (isMajor && i >= 10) {
        const rTxt = r - 40;
        ctx.fillStyle = '#f4f7fb';
        ctx.fillText(String(i), cx + Math.cos(a) * rTxt, cy + Math.sin(a) * rTxt);
      }
    }

    // Veglia Borletti & GIRI x 100 markings
    ctx.fillStyle = '#dce4ee';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.fillText('GIRI × 100', cx, cy - 28);
    ctx.font = 'bold 14px serif';
    ctx.fillText('VEGLIA', cx, cy + 44);
    ctx.font = '10px sans-serif';
    ctx.fillText('BORLETTI', cx, cy + 58);

    // White tachometer needle resting at 7 o'clock (~400 RPM)
    const needleAng = startAng + 0.06;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(needleAng);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-18, -3.5);
    ctx.lineTo(r - 14, -1.2);
    ctx.lineTo(r - 14, 1.2);
    ctx.lineTo(-18, 3.5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    // Central silver needle boss cap
    ctx.fillStyle = '#cbd3dd';
    ctx.beginPath();
    ctx.arc(cx, cy, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#22262c';
    ctx.beginPath();
    ctx.arc(cx, cy, 6, 0, Math.PI * 2);
    ctx.fill();

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // 2. Center-Left Binnacle: Speedometer + 3 Aux Gauges + Warning Lights + 8 Screws (1024x280)
  const centerClusterTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 280;
    const ctx = canvas.getContext('2d');

    // Metallic dark gunmetal fascia plate
    const bgGrad = ctx.createLinearGradient(0, 0, 1024, 280);
    bgGrad.addColorStop(0, '#272b32');
    bgGrad.addColorStop(0.5, '#1d2026');
    bgGrad.addColorStop(1, '#15181d');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1024, 280);

    ctx.strokeStyle = '#68717d';
    ctx.lineWidth = 4;
    ctx.strokeRect(4, 4, 1016, 272);

    // 8 Visible Perimeter Mounting Screws (as clearly seen in the photo)
    const screws = [
      [22, 22], [460, 22], [740, 22], [1002, 22],
      [22, 258], [460, 258], [740, 258], [1002, 258],
    ];
    screws.forEach(([sx, sy]) => {
      ctx.fillStyle = '#8b94a0';
      ctx.beginPath();
      ctx.arc(sx, sy, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#1b1d22';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(sx - 5, sy - 2);
      ctx.lineTo(sx + 5, sy + 2);
      ctx.stroke();
    });

    // LEFT HALF: Large Square-Bezel Blue-Faced Speedometer (Contachilometri 20..240 km/h)
    const spX = 235;
    const spY = 142;
    const spR = 114;

    // Rounded-square dark bezel around speedometer
    ctx.fillStyle = '#0d1015';
    ctx.fillRect(92, 18, 286, 244);
    ctx.strokeStyle = '#9aa3b0';
    ctx.lineWidth = 3.5;
    ctx.strokeRect(92, 18, 286, 244);

    // Deep Veglia blue dial
    const spGrad = ctx.createRadialGradient(spX - 18, spY - 20, 12, spX, spY, spR);
    spGrad.addColorStop(0, '#1d4f86');
    spGrad.addColorStop(0.7, '#11345c');
    spGrad.addColorStop(1, '#0a213d');
    ctx.fillStyle = spGrad;
    ctx.beginPath();
    ctx.arc(spX, spY, spR, 0, Math.PI * 2);
    ctx.fill();

    // Odometer (84665) & Trip meter (0465) drum windows inside speedometer
    const drawOdo = (ox, oy, digits, lastRed = false) => {
      const w = digits.length * 15;
      ctx.fillStyle = '#080a0d';
      ctx.fillRect(ox - w / 2 - 3, oy - 10, w + 6, 20);
      ctx.strokeStyle = '#6c7684';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(ox - w / 2 - 3, oy - 10, w + 6, 20);
      ctx.font = 'bold 14px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (let k = 0; k < digits.length; k++) {
        const dx = ox - w / 2 + k * 15 + 7.5;
        if (lastRed && k === digits.length - 1) {
          ctx.fillStyle = '#d83428';
          ctx.fillRect(dx - 7, oy - 9, 14, 18);
        }
        ctx.fillStyle = '#f5f7fa';
        ctx.fillText(digits[k], dx, oy + 1);
      }
    };
    drawOdo(spX, spY - 36, '84665', false);
    drawOdo(spX, spY + 34, '0465', true);

    // Speedometer ticks & numerals 20..240 km/h
    const spStart = Math.PI * 0.74;
    const spEnd = Math.PI * 2.26;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 18px "Arial Narrow", Arial, sans-serif';
    for (let v = 20; v <= 240; v += 5) {
      const t = (v - 20) / 220;
      const a = spStart + t * (spEnd - spStart);
      const isMaj = v % 20 === 0;
      const rOut = spR - 5;
      const rIn = isMaj ? spR - 19 : spR - 11;
      ctx.strokeStyle = '#f4f7fb';
      ctx.lineWidth = isMaj ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(spX + Math.cos(a) * rIn, spY + Math.sin(a) * rIn);
      ctx.lineTo(spX + Math.cos(a) * rOut, spY + Math.sin(a) * rOut);
      ctx.stroke();

      if (isMaj) {
        const rTxt = spR - 34;
        ctx.fillStyle = '#f4f7fb';
        ctx.fillText(String(v), spX + Math.cos(a) * rTxt, spY + Math.sin(a) * rTxt);
      }
    }

    ctx.fillStyle = '#dce4ee';
    ctx.font = 'italic bold 13px sans-serif';
    ctx.fillText('km/h', spX, spY + 56);
    ctx.font = 'bold 12px serif';
    ctx.fillText('VEGLIA', spX, spY + 72);

    // Speedometer white needle resting at 20 km/h
    ctx.save();
    ctx.translate(spX, spY);
    ctx.rotate(spStart + 0.03);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-16, -3);
    ctx.lineTo(spR - 14, -1);
    ctx.lineTo(spR - 14, 1);
    ctx.lineTo(-16, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.fillStyle = '#cbd3dd';
    ctx.beginPath();
    ctx.arc(spX, spY, 11, 0, Math.PI * 2);
    ctx.fill();

    // RIGHT HALF: 2x2 Grid of 3 Blue Auxiliary Gauges + 4 Warning Indicator Lamps
    const drawAuxGauge = (gx, gy, title, labels, needleT, redLeft = false, redRight = false) => {
      const gr = 54;
      ctx.fillStyle = '#0d1015';
      ctx.fillRect(gx - 64, gy - 58, 128, 116);
      ctx.strokeStyle = '#8b94a0';
      ctx.lineWidth = 2.5;
      ctx.strokeRect(gx - 64, gy - 58, 128, 116);

      const gGrad = ctx.createRadialGradient(gx - 8, gy - 8, 5, gx, gy, gr);
      gGrad.addColorStop(0, '#1c4d82');
      gGrad.addColorStop(1, '#0c2746');
      ctx.fillStyle = gGrad;
      ctx.beginPath();
      ctx.arc(gx, gy, gr, 0, Math.PI * 2);
      ctx.fill();

      const a0 = Math.PI * 0.80;
      const a1 = Math.PI * 2.20;
      if (redLeft) {
        ctx.strokeStyle = '#e03b2b';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(gx, gy, gr - 8, a0, a0 + 0.35);
        ctx.stroke();
      }
      if (redRight) {
        ctx.strokeStyle = '#e03b2b';
        ctx.lineWidth = 6;
        ctx.beginPath();
        ctx.arc(gx, gy, gr - 8, a1 - 0.35, a1);
        ctx.stroke();
      }

      ctx.fillStyle = '#f4f7fb';
      ctx.font = 'bold 12px "Arial Narrow", Arial, sans-serif';
      labels.forEach((lbl, idx) => {
        const u = idx / (labels.length - 1);
        const a = a0 + u * (a1 - a0);
        ctx.strokeStyle = '#f4f7fb';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.moveTo(gx + Math.cos(a) * (gr - 12), gy + Math.sin(a) * (gr - 12));
        ctx.lineTo(gx + Math.cos(a) * (gr - 4), gy + Math.sin(a) * (gr - 4));
        ctx.stroke();
        ctx.fillText(lbl, gx + Math.cos(a) * (gr - 23), gy + Math.sin(a) * (gr - 23));
      });

      ctx.font = 'bold 9.5px Arial, sans-serif';
      ctx.fillStyle = '#dce4ee';
      ctx.fillText(title, gx, gy + 24);

      const na = a0 + needleT * (a1 - a0);
      ctx.save();
      ctx.translate(gx, gy);
      ctx.rotate(na);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(-10, -1.8, gr - 6, 3.6);
      ctx.restore();

      ctx.fillStyle = '#cbd3dd';
      ctx.beginPath();
      ctx.arc(gx, gy, 6.5, 0, Math.PI * 2);
      ctx.fill();
    };

    // Top-Left of Right Half: PRESS. OLIO (0 - 40 - 80)
    drawAuxGauge(585, 78, 'PRESS. OLIO', ['0', '40', '80'], 0.06, false, false);
    // Bottom-Left of Right Half: BENZINA (0 - 1/2 - 1)
    drawAuxGauge(585, 202, 'BENZINA', ['0', '1/2', '1'], 0.25, true, false);
    // Bottom-Right of Right Half: TEMP. ACQUA (40 - 80 - 120)
    drawAuxGauge(825, 202, 'TEMP. ACQUA', ['40', '80', '120'], 0.08, false, true);

    // Top-Right of Right Half: 2x2 Square Warning Indicator Jewels
    const warnColors = [
      ['#1e8a3c', '#c82822'],
      ['#d67c14', '#1a56b0'],
    ];
    for (let r = 0; r < 2; r++) {
      for (let c = 0; c < 2; c++) {
        const wx = 785 + c * 56;
        const wy = 46 + r * 44;
        ctx.fillStyle = '#0c0e12';
        ctx.fillRect(wx, wy, 42, 32);
        ctx.strokeStyle = '#9aa3b0';
        ctx.lineWidth = 2;
        ctx.strokeRect(wx, wy, 42, 32);
        ctx.fillStyle = warnColors[r][c];
        ctx.fillRect(wx + 4, wy + 4, 34, 24);
      }
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // 3. Center Console Graphics: HVAC Blue/Orange Slider, Knob Arcs, "CLOSE FOR MAX DEF" & Radio Dial (512x640)
  const consoleTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 640;
    const ctx = canvas.getContext('2d');

    // Matte black console fascia
    ctx.fillStyle = '#14161a';
    ctx.fillRect(0, 0, 512, 640);
    ctx.strokeStyle = '#383d46';
    ctx.lineWidth = 6;
    ctx.strokeRect(4, 4, 504, 632);

    // Top Row (y = 55): Ventilation slider with Blue INT bar (left) and Orange DEF bar (right)
    ctx.fillStyle = '#0b0c0e';
    ctx.fillRect(58, 32, 396, 46);
    ctx.strokeStyle = '#8b94a0';
    ctx.lineWidth = 3;
    ctx.strokeRect(58, 32, 396, 46);

    // Left Blue Bar ("INT")
    ctx.fillStyle = '#2578c4';
    ctx.beginPath();
    ctx.moveTo(85, 52);
    ctx.lineTo(235, 44);
    ctx.lineTo(235, 62);
    ctx.closePath();
    ctx.fill();

    // Right Orange Bar ("DEF")
    ctx.fillStyle = '#e0661f';
    ctx.beginPath();
    ctx.moveTo(275, 44);
    ctx.lineTo(425, 52);
    ctx.lineTo(275, 62);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#f0f4f8';
    ctx.font = 'bold 13px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('INT', 68, 25);
    ctx.textAlign = 'right';
    ctx.fillText('DEF', 444, 25);

    // Middle Row (y = 140..360): Central Orange & Light-Blue Rotary Knob Scales + "CLOSE FOR MAX DEF"
    // Top central rotary scale (Orange arc around x=256, y=185)
    ctx.strokeStyle = '#e0661f';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(256, 185, 34, -Math.PI * 0.85, Math.PI * 0.15);
    ctx.stroke();

    // Bottom central rotary scale (Light-Blue arc around x=256, y=300)
    ctx.strokeStyle = '#2e8de0';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(256, 300, 34, -Math.PI * 0.85, Math.PI * 0.15);
    ctx.stroke();

    // Crisp white "CLOSE FOR MAX DEF" stencil under left and right circular vents
    ctx.fillStyle = '#e6ecf2';
    ctx.font = 'bold 12px "Arial Narrow", Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('← CLOSE FOR MAX DEF', 112, 358);
    ctx.fillText('CLOSE FOR MAX DEF →', 400, 358);

    // Lower Row (y = 420..595): Vintage 1970s Car Radio Faceplate
    ctx.fillStyle = '#242830';
    ctx.fillRect(44, 420, 424, 165);
    ctx.strokeStyle = '#aeb6c2';
    ctx.lineWidth = 4;
    ctx.strokeRect(44, 420, 424, 165);

    // Radio frequency tuning scale window
    ctx.fillStyle = '#090b0e';
    ctx.fillRect(118, 442, 276, 56);
    ctx.strokeStyle = '#6c7480';
    ctx.lineWidth = 2;
    ctx.strokeRect(118, 442, 276, 56);

    // Frequency scale markings (88 .. 108 MHz) & glowing green/amber dial line
    ctx.strokeStyle = '#7cd695';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(130, 470);
    ctx.lineTo(382, 470);
    ctx.stroke();

    ctx.fillStyle = '#d8e2ec';
    ctx.font = 'bold 12px monospace';
    ['88', '92', '96', '100', '104', '108'].forEach((freq, idx) => {
      const fx = 138 + idx * 47;
      ctx.fillText(freq, fx, 460);
      ctx.fillRect(fx - 1, 470, 2, 10);
    });

    // Red radio tuning pointer needle
    ctx.fillStyle = '#ff3b28';
    ctx.fillRect(242, 445, 4, 50);

    // Colored indicator lights (red, amber, green, blue) on radio faceplate
    const dots = [
      [140, 515, '#e03528'],
      [165, 515, '#e89b25'],
      [190, 515, '#28b852'],
      [360, 515, '#2b82d9'],
    ];
    dots.forEach(([dx, dy, col]) => {
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(dx, dy, 5, 0, Math.PI * 2);
      ctx.fill();
    });

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, []);

  // 4. Wooden Shift Knob 5-Speed + R Pattern Medallion (256x256)
  const shiftPatternTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#111317';
    ctx.beginPath();
    ctx.arc(128, 128, 122, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#cfd6e0';
    ctx.lineWidth = 6;
    ctx.stroke();

    // 5-speed H-pattern lines
    ctx.strokeStyle = '#f4f7fb';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    // Neutral crossbar
    ctx.moveTo(68, 128);
    ctx.lineTo(188, 128);
    // 1-2 gate
    ctx.moveTo(68, 78);
    ctx.lineTo(68, 178);
    // 3-4 gate
    ctx.moveTo(128, 78);
    ctx.lineTo(128, 178);
    // 5-R gate
    ctx.moveTo(188, 78);
    ctx.lineTo(188, 178);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('1', 68, 52);
    ctx.fillText('2', 68, 204);
    ctx.fillText('3', 128, 52);
    ctx.fillText('4', 128, 204);
    ctx.fillText('5', 188, 52);
    ctx.fillStyle = '#e03b2b';
    ctx.fillText('R', 188, 204);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 8;
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <>
      {/* 1. Left Pod: Veglia Borletti Blue Tachometer (behind steering wheel at z = +0.145) */}
      <mesh position={[-0.1395, 0.139, 0.145]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.084, 0.041]} />
        <meshStandardMaterial
          map={tachTexture}
          roughness={0.22}
          metalness={0.12}
          emissive="#102b4c"
          emissiveMap={tachTexture}
          emissiveIntensity={0.28}
        />
      </mesh>

      {/* 2. Center-Left Pod: Speedometer + 3 Aux Gauges + Warning Lights + 8 Screws */}
      <mesh position={[-0.1395, 0.140, -0.015]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[0.172, 0.043]} />
        <meshStandardMaterial
          map={centerClusterTexture}
          roughness={0.24}
          metalness={0.15}
          emissive="#102b4c"
          emissiveMap={centerClusterTexture}
          emissiveIntensity={0.28}
        />
      </mesh>

      {/* 3. Sloped Center Console Fascia Graphic (HVAC Slider, Orange/Blue Scales, CLOSE FOR MAX DEF, Radio) */}
      <group position={[-0.126, 0.062, 0.0]} rotation={[0, 0, -0.28]}>
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <planeGeometry args={[0.148, 0.100]} />
          <meshStandardMaterial
            map={consoleTexture}
            roughness={0.45}
            metalness={0.12}
          />
        </mesh>
      </group>

      {/* 4. Top of Wooden Gear Shift Knob: 5-Speed + R Pattern Medallion */}
      <mesh
        position={[-0.0095, 0.1078, 0.0026]}
        rotation={[-Math.PI / 2 + 0.24, 0, Math.PI / 2]}
      >
        <circleGeometry args={[0.0074, 32]} />
        <meshStandardMaterial
          map={shiftPatternTexture}
          roughness={0.2}
          metalness={0.15}
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
 * High-definition procedural plaques & inscriptions for the Bialbero AR01608 Engine Bay:
 * - Cursive "Alfa Romeo" cast-aluminum relief plaque on the front bridge of the cam cover
 * - Embossed "OLIO" cap inscription on the star-shaped oil filler cap
 * - Yellow "AR / ATTENZIONE" warning decal on top of the black radiator tank
 * - Dedicated warm-white engine bay inspection light when the hood is open
 */
function BialberoEngineDetails({ hoodOpen }) {
  const camScriptTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#4a4e54';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#cfd5dc';
    ctx.lineWidth = 6;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#eef2f6';
    ctx.font = 'italic bold 68px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Alfa Romeo', 256, 66);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, []);

  const olioCapTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#d4dae0';
    ctx.beginPath();
    ctx.arc(128, 128, 122, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#6c737a';
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = '#2b2f36';
    ctx.font = 'bold 54px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('OLIO', 128, 128);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <group visible={hoodOpen}>
      {/* Cursive "Alfa Romeo" cast relief plaque on the front bridge of the twin-cam cover */}
      <mesh
        position={[-0.688, 0.0652, 0.004]}
        rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
      >
        <planeGeometry args={[0.086, 0.021]} />
        <meshStandardMaterial
          map={camScriptTexture}
          metalness={0.82}
          roughness={0.26}
        />
      </mesh>

      {/* Embossed "OLIO" medallion on top of the star-shaped oil filler cap */}
      <mesh
        position={[-0.692, 0.0846, -0.046]}
        rotation={[-Math.PI / 2, 0, -Math.PI / 2]}
      >
        <circleGeometry args={[0.017, 24]} />
        <meshStandardMaterial
          map={olioCapTexture}
          metalness={0.85}
          roughness={0.24}
        />
      </mesh>

      {/* Dedicated Engine Bay Inspection Fill Lights (active when hood is open) */}
      {hoodOpen && (
        <>
          <pointLight
            position={[-0.60, 0.42, 0.08]}
            intensity={1.35}
            distance={1.4}
            decay={1.4}
            color="#fffaf0"
          />
          <pointLight
            position={[-0.62, 0.28, -0.22]}
            intensity={0.85}
            distance={1.1}
            decay={1.5}
            color="#eef5ff"
          />
        </>
      )}
    </group>
  );
}

/**
 * Loads the multi-material CAD GLB model of the Alfa Romeo Alfetta GTV
 * and binds dedicated PBR materials to each sub-mesh (CarPaint, Chrome, Glass,
 * RubberBlack, AlloyRim, HeadlightLens, AmberLens, RedTaillight, Interior),
 * plus the 3D Bialbero AR01608 engine bay and articulated controvento hood.
 */
function AlfaRomeoModel({
  activePaintId,
  sceneMode,
  hoodOpen = false,
  selectedDriver = 'elvis',
}) {
  const { scene } = useGLTF(MODEL_PATH);
  const { scene: engineScene } = useGLTF(ENGINE_MODEL_PATH);
  const wheelNodesRef = useRef([]);
  const wheelCapRefs = useRef([]);
  const hoodNodeRef = useRef(null);
  const hoodStayRef = useRef(null);
  const fanNodeRef = useRef(null);
  const pulleyNodesRef = useRef([]);
  const engineRootRef = useRef(null);
  const hoodOpenProgressRef = useRef(0);
  const bodyGroupRef = useRef();
  const carDriveGroupRef = useRef();
  const texShieldRef = useRef();

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

  const preparedEngineScene = useMemo(() => {
    const cloned = engineScene.clone(true);
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
            (child.material && child.material.name) || '';
        }
      }
    });
    return cloned;
  }, [engineScene]);

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

    // Synchronize Engine Bay structural body panels (inner fenders & crossmember) with CarPaint
    preparedEngineScene.traverse((child) => {
      if (child.isMesh && child.userData.originalMaterialName === 'BayBodyPaint') {
        child.material = materialsMap.CarPaint;
        child.material.needsUpdate = true;
      }
    });

    // Query and cache spinnable wheel nodes and articulated Hood node
    const wheels = [];
    hoodNodeRef.current = null;
    preparedScene.traverse((child) => {
      if (child.name && child.name.startsWith('Wheel_')) {
        wheels.push(child);
      } else if (child.name === 'Hood') {
        hoodNodeRef.current = child;
      }
    });
    wheelNodesRef.current = wheels;

    // Query and cache animated Bialbero engine nodes (yellow fan, 3 pulleys, hood stay, root)
    const pulleys = [];
    fanNodeRef.current = null;
    hoodStayRef.current = null;
    engineRootRef.current = null;
    preparedEngineScene.traverse((child) => {
      if (child.name === 'Engine_Fan_Yellow') {
        fanNodeRef.current = child;
      } else if (child.name && child.name.startsWith('Engine_Pulley_')) {
        pulleys.push(child);
      } else if (child.name === 'Hood_Stay_Left') {
        hoodStayRef.current = child;
      } else if (child.name === 'EngineBay_Root') {
        engineRootRef.current = child;
      }
    });
    pulleyNodesRef.current = pulleys;

    return () => {
      Object.values(materialsMap).forEach((mat) => mat.dispose());
    };
  }, [preparedScene, preparedEngineScene, materialsMap]);

  useFrame((state, delta) => {
    // 1. Smoothly animate Controvento Hood opening/closing (hinged at front x = -0.942)
    const targetHood = hoodOpen && sceneMode !== 'drive' ? 1.0 : 0.0;
    hoodOpenProgressRef.current = THREE.MathUtils.damp(
      hoodOpenProgressRef.current,
      targetHood,
      4.5,
      delta
    );
    const hoodProg = hoodOpenProgressRef.current;

    if (hoodNodeRef.current) {
      // +Z rotation lifts the rear of the hood (+X relative to front hinge x = -0.840) upward (+Y)
      hoodNodeRef.current.rotation.z = hoodProg * 1.12;
    }

    if (preparedEngineScene) {
      preparedEngineScene.visible = hoodProg > 0.005;
    }

    if (hoodStayRef.current) {
      hoodStayRef.current.visible = hoodProg > 0.02;
      hoodStayRef.current.scale.set(1, Math.max(0.01, hoodProg), 1);
    }

    // 2. Live Bialbero AR01608 Engine Idle Animation ("Vivo al minimo" ~950 RPM)
    if (fanNodeRef.current) {
      fanNodeRef.current.rotation.x += delta * 18.0;
    }
    pulleyNodesRef.current.forEach((pulley) => {
      pulley.rotation.x += delta * 22.0;
    });
    if (engineRootRef.current && hoodProg > 0.02) {
      const t = state.clock.elapsedTime;
      engineRootRef.current.position.y = Math.sin(t * 58.0) * 0.00028;
      engineRootRef.current.position.z = Math.cos(t * 43.0) * 0.00022;
    }

    if (sceneMode === 'drive') {
      driveStore.update(delta);
      const rot = driveStore.wheelRotation;

      // Rotate all 4 Campagnolo alloy wheels forward around their hub Z axis
      wheelNodesRef.current.forEach((wheel) => {
        wheel.rotation.z = rot;
      });

      // Synchronize 4 metallic Biscione wheel center cap medallions
      wheelCapRefs.current.forEach((cap, idx) => {
        if (cap) {
          const isRight = idx >= 2;
          cap.rotation.z = isRight ? -rot : rot;
        }
      });

      // Lateral position and banking into lanes
      if (carDriveGroupRef.current) {
        carDriveGroupRef.current.position.x = driveStore.carX;
        carDriveGroupRef.current.rotation.z = driveStore.carRoll;
        carDriveGroupRef.current.rotation.y = driveStore.carYaw;
      }

      // Tex Willer Golden Shield Aura animation
      if (texShieldRef.current) {
        const isTex = driveStore.activePowerups.tex > 0;
        texShieldRef.current.visible = isTex;
        if (isTex) {
          texShieldRef.current.rotation.y += delta * 2.8;
          texShieldRef.current.rotation.x += delta * 1.4;
        }
      }

      // Subtle suspension road bobbing and acceleration/braking pitch
      if (bodyGroupRef.current) {
        const speed = driveStore.speedKmh;
        const speedFactor = Math.min(1, speed / 25);
        const bob =
          (Math.sin(driveStore.roadOffset * 6.5) * 0.0022 +
            Math.sin(driveStore.roadOffset * 13.0) * 0.0011) *
          speedFactor;
        const targetPitch =
          driveStore.throttle * -0.01 + driveStore.brake * 0.018;

        bodyGroupRef.current.position.y = bob;
        bodyGroupRef.current.rotation.z = THREE.MathUtils.lerp(
          bodyGroupRef.current.rotation.z,
          targetPitch,
          0.1
        );
      }
    } else {
      // In showroom mode, reset body suspension and lateral position
      if (carDriveGroupRef.current) {
        carDriveGroupRef.current.position.x = 0;
        carDriveGroupRef.current.rotation.z = 0;
        carDriveGroupRef.current.rotation.y = 0;
      }
      if (texShieldRef.current) {
        texShieldRef.current.visible = false;
      }
      if (bodyGroupRef.current) {
        bodyGroupRef.current.position.y = 0;
        bodyGroupRef.current.rotation.z = 0;
      }
    }
  });

  return (
    <group ref={carDriveGroupRef}>
      <Center top>
        {/* Rotate +90° around Y so the -X front shark-nose faces +Z toward the front camera */}
        <group rotation={[0, Math.PI / 2, 0]}>
          <group ref={bodyGroupRef}>
            <primitive object={preparedScene} />
            <primitive object={preparedEngineScene} />
            <BialberoEngineDetails hoodOpen={hoodOpen} />
            <VintageLicensePlates />
            <AlfaRomeoEmblems wheelCapRefs={wheelCapRefs} />
            <CockpitInstrumentsAndDetails />
            {sceneMode === 'drive' && (
              <DriverCharacter3D driverId={selectedDriver} pose="driving" />
            )}
          </group>
        </group>
      </Center>

      {/* Tex Willer Golden Shield Aura (Visible during invulnerability) */}
      <mesh ref={texShieldRef} position={[0, 0.42, 0]} visible={false}>
        <sphereGeometry args={[1.52, 20, 16]} />
        <meshStandardMaterial
          color="#ffd700"
          transparent
          opacity={0.35}
          wireframe
          emissive="#ffb700"
          emissiveIntensity={0.65}
        />
      </mesh>
    </group>
  );
}

/**
 * Coordinates smooth camera transitions with <Bounds> and OrbitControls.
 * When transitioning to the interior 'cockpit' or close-up 'engine' preset,
 * positions the camera directly on target without exterior bounding-sphere clipping.
 */
function CameraRig({ cameraRequest, controlsRef }) {
  const bounds = useBounds();
  const { camera } = useThree();
  const appliedRef = useRef(null);

  const presetKey =
    cameraRequest && (cameraRequest.presetId || cameraRequest.id);
  const isCloseUp = presetKey === 'cockpit' || presetKey === 'engine';

  useEffect(() => {
    if (!cameraRequest || !bounds) return;

    const { position, target, id, presetId } = cameraRequest;
    const key = presetId || id;

    if (key === 'cockpit' || key === 'engine') {
      camera.fov = key === 'cockpit' ? 58 : 42;
      camera.near = 0.012;
      camera.updateProjectionMatrix();
      camera.position.set(position[0], position[1], position[2]);
      if (controlsRef.current && target) {
        controlsRef.current.target.set(target[0], target[1], target[2]);
        controlsRef.current.update();
      }
      camera.lookAt(target[0], target[1], target[2]);
      appliedRef.current = cameraRequest.timestamp || key;
      return;
    }

    camera.fov = 40;
    camera.near = 0.02;
    camera.updateProjectionMatrix();
    bounds.refresh().moveTo(position).lookAt({
      target: target || [0, 0.25, 0],
    });

    if (controlsRef.current && target) {
      controlsRef.current.target.set(target[0], target[1], target[2]);
      controlsRef.current.update();
    }
    appliedRef.current = cameraRequest.timestamp || key;
  }, [cameraRequest, bounds, camera, controlsRef]);

  useFrame(() => {
    if (isCloseUp && cameraRequest) {
      const { position, target } = cameraRequest;
      const maxDrift = presetKey === 'cockpit' ? 0.6 : 1.8;
      // Ensure <Bounds> initial fit never pushes the camera away from close-up target
      if (
        camera.position.distanceTo(new THREE.Vector3(...position)) > maxDrift &&
        appliedRef.current !== (cameraRequest.timestamp || presetKey)
      ) {
        camera.fov = presetKey === 'cockpit' ? 58 : 42;
        camera.near = 0.012;
        camera.updateProjectionMatrix();
        camera.position.set(position[0], position[1], position[2]);
        if (controlsRef.current && target) {
          controlsRef.current.target.set(target[0], target[1], target[2]);
          controlsRef.current.update();
        }
        camera.lookAt(target[0], target[1], target[2]);
      }
    }
  });

  return null;
}

/**
 * Synchronizes scene background and balanced studio/night lighting.
 */
function ShowroomAtmosphere({ lightingMode, sceneMode }) {
  const isLight = lightingMode === 'studio';
  const isDrive = sceneMode === 'drive';

  const bgColor = isDrive
    ? isLight
      ? '#9bb3c8'
      : '#080c14'
    : isLight
    ? '#e8e6e1'
    : '#111113';
  const fogNear = isDrive ? 18 : 9;
  const fogFar = isDrive ? 95 : 24;

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, fogNear, fogFar]} />

      {/* Soft Hemisphere Fill */}
      <hemisphereLight
        args={[
          isDrive
            ? isLight
              ? '#d8e6f5'
              : '#4a5b78'
            : isLight
            ? '#ffffff'
            : '#dce6f5',
          isDrive
            ? isLight
              ? '#556b38'
              : '#182414'
            : isLight
            ? '#c8c4bc'
            : '#2a2d34',
          isLight ? 0.95 : 0.65,
        ]}
      />

      {/* Primary Key Directional Light with Soft Shadows */}
      <directionalLight
        position={isDrive ? [15, 25, 20] : [5, 8, 5]}
        intensity={isLight ? 1.4 : 1.55}
        color={isLight ? '#fffdf8' : '#f4f7ff'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={0.00005}
        shadow-camera-near={0.5}
        shadow-camera-far={isDrive ? 60 : 20}
        shadow-camera-left={isDrive ? -15 : -4}
        shadow-camera-right={isDrive ? 15 : 4}
        shadow-camera-top={isDrive ? 15 : 4}
        shadow-camera-bottom={isDrive ? -15 : -4}
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

      {/* Soft Interior Cabin Fill Lights so the cockpit gauges, mahogany wheel & shift knob are well-lit */}
      <pointLight
        position={[0.06, 0.42, 0.05]}
        intensity={isLight ? 0.85 : 0.65}
        distance={1.2}
        decay={1.5}
        color="#fff8ee"
      />
      <pointLight
        position={[0.14, 0.34, 0.14]}
        intensity={isLight ? 0.55 : 0.45}
        distance={0.9}
        decay={1.5}
        color="#eef4ff"
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
  sceneMode = 'showroom',
  hoodOpen = false,
  selectedDriver = 'elvis',
}) {
  const controlsRef = useRef(null);
  const isLight = lightingMode === 'studio';
  const presetKey =
    cameraRequest && (cameraRequest.presetId || cameraRequest.id);
  const isCockpit = presetKey === 'cockpit';
  const isEngine = presetKey === 'engine';
  const isCloseUp = isCockpit || isEngine;

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{
          position: isCockpit
            ? [0.08, 0.42, -0.20]
            : isEngine
            ? [0.68, 0.66, 0.44]
            : [3.2, 1.15, 3.5],
          fov: isCockpit ? 58 : isEngine ? 42 : 40,
          near: 0.012,
          far: 100,
        }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isLight ? 0.96 : 1.05,
        }}
      >
        <ShowroomAtmosphere
          lightingMode={lightingMode}
          sceneMode={sceneMode}
        />

        <Suspense fallback={<ShowroomLoader lightingMode={lightingMode} />}>
          {sceneMode === 'drive' ? (
            <>
              <AlfaRomeoModel
                activePaintId={activePaintId}
                sceneMode={sceneMode}
                hoodOpen={false}
                selectedDriver={selectedDriver}
              />
              <DriveWorld lightingMode={lightingMode} />
              <DriveCameraDirector controlsRef={controlsRef} />
            </>
          ) : (
            <>
              <Bounds
                fit={!isCloseUp}
                clip={!isCloseUp}
                observe={!isCloseUp}
                margin={1.2}
              >
                <AlfaRomeoModel
                  activePaintId={activePaintId}
                  sceneMode={sceneMode}
                  hoodOpen={hoodOpen}
                />
                <CameraRig
                  cameraRequest={cameraRequest}
                  controlsRef={controlsRef}
                />
              </Bounds>

              {/* Luxury Showroom Reflective Floor Disc */}
              <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.005, 0]}
              >
                <circleGeometry args={[12, 64]} />
                <MeshReflectorMaterial
                  resolution={1024}
                  mixStrength={isLight ? 0.3 : 0.65}
                  roughness={isLight ? 0.65 : 0.35}
                  color={isLight ? '#dcd9d0' : '#131418'}
                  metalness={isLight ? 0.12 : 0.4}
                />
              </mesh>
            </>
          )}
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enablePan={false}
          minPolarAngle={0}
          maxPolarAngle={sceneMode === 'drive' ? Math.PI / 2.02 : Math.PI / 2.05}
          minDistance={
            sceneMode === 'drive'
              ? 1.0
              : isCockpit
              ? 0.02
              : isEngine
              ? 0.22
              : 0.65
          }
          maxDistance={sceneMode === 'drive' ? 18 : 10}
          autoRotate={
            sceneMode === 'drive' || isCloseUp ? false : autoRotate
          }
          autoRotateSpeed={0.8}
          enableDamping
          dampingFactor={0.05}
          onStart={() => {
            if (sceneMode === 'drive') {
              driveStore.markUserInteraction();
            }
          }}
          onChange={() => {
            if (sceneMode === 'drive') {
              driveStore.markUserInteraction();
            }
          }}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_PATH);
useGLTF.preload(ENGINE_MODEL_PATH);
