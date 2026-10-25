import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { driveStore } from './driveStore';

/**
 * Generates authentic Marvel Spider-Man black-on-red web pattern textures
 * (radial mask web + scalloped suit web grid) via HTML5 Canvas.
 */
function useSpidermanTextures() {
  return useMemo(() => {
    // 1. Suit Scalloped Web Grid Texture (for chest, shoulders, gloves, belt, boots)
    const suitCanvas = document.createElement('canvas');
    suitCanvas.width = 512;
    suitCanvas.height = 512;
    const sctx = suitCanvas.getContext('2d');

    sctx.fillStyle = '#d91c24';
    sctx.fillRect(0, 0, 512, 512);

    sctx.strokeStyle = '#0a0c10';
    sctx.lineWidth = 5;

    const cols = 10;
    const rows = 10;
    const colW = 512 / cols;
    const rowH = 512 / rows;

    // Vertical web ribs
    for (let c = 0; c <= cols; c++) {
      const x = c * colW;
      sctx.beginPath();
      sctx.moveTo(x, 0);
      sctx.lineTo(x, 512);
      sctx.stroke();
    }

    // Scalloped concave horizontal web arcs between ribs
    for (let r = 0; r <= rows; r++) {
      const y = r * rowH;
      for (let c = 0; c < cols; c++) {
        const x0 = c * colW;
        const x1 = (c + 1) * colW;
        const xm = (x0 + x1) * 0.5;
        sctx.beginPath();
        sctx.moveTo(x0, y);
        sctx.quadraticCurveTo(xm, y + rowH * 0.28, x1, y);
        sctx.stroke();
      }
    }

    const suitWebTex = new THREE.CanvasTexture(suitCanvas);
    suitWebTex.wrapS = THREE.RepeatWrapping;
    suitWebTex.wrapT = THREE.RepeatWrapping;
    suitWebTex.repeat.set(2, 2);

    // 2. Radial Mask Web Texture (converging at the nose bridge)
    const maskCanvas = document.createElement('canvas');
    maskCanvas.width = 512;
    maskCanvas.height = 512;
    const mctx = maskCanvas.getContext('2d');

    mctx.fillStyle = '#d91c24';
    mctx.fillRect(0, 0, 512, 512);

    mctx.strokeStyle = '#0a0c10';
    mctx.lineWidth = 4.5;

    const cx = 256;
    const cy = 256;
    const spokes = 18;
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      mctx.beginPath();
      mctx.moveTo(cx, cy);
      mctx.lineTo(cx + Math.cos(a) * 360, cy + Math.sin(a) * 360);
      mctx.stroke();
    }

    for (let rad = 36; rad <= 340; rad += 38) {
      for (let i = 0; i < spokes; i++) {
        const a0 = (i / spokes) * Math.PI * 2;
        const a1 = ((i + 1) / spokes) * Math.PI * 2;
        const am = (a0 + a1) * 0.5;
        const x0 = cx + Math.cos(a0) * rad;
        const y0 = cy + Math.sin(a0) * rad;
        const x1 = cx + Math.cos(a1) * rad;
        const y1 = cy + Math.sin(a1) * rad;
        const xm = cx + Math.cos(am) * (rad * 0.9);
        const ym = cy + Math.sin(am) * (rad * 0.9);
        mctx.beginPath();
        mctx.moveTo(x0, y0);
        mctx.quadraticCurveTo(xm, ym, x1, y1);
        mctx.stroke();
      }
    }

    const maskWebTex = new THREE.CanvasTexture(maskCanvas);
    return { suitWebTex, maskWebTex };
  }, []);
}

/**
 * Low-Poly 3D Base Head + Ears + Neck + Eyes/Mouth
 */
function BaseHead({
  skinColor = '#f1c29b',
  eyeColor = '#1e293b',
  lipColor = '#b86b5a',
  showEars = true,
  showEyes = true,
  squint = false,
  smile = false,
}) {
  return (
    <group>
      {/* Neck */}
      <mesh position={[0, 0.76, 0]}>
        <cylinderGeometry args={[0.11, 0.13, 0.18, 7]} />
        <meshStandardMaterial color={skinColor} flatShading roughness={0.75} />
      </mesh>

      {/* Low-Poly Faceted Head */}
      <mesh position={[0, 1.02, 0.02]}>
        <dodecahedronGeometry args={[0.25, 1]} />
        <meshStandardMaterial color={skinColor} flatShading roughness={0.7} />
      </mesh>

      {/* Nose */}
      <mesh position={[0, 1.01, 0.26]} rotation={[0.2, 0, 0]}>
        <coneGeometry args={[0.042, 0.11, 4]} />
        <meshStandardMaterial color={skinColor} flatShading roughness={0.7} />
      </mesh>

      {/* Ears */}
      {showEars &&
        [-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.24, 1.01, 0.01]}>
            <boxGeometry args={[0.05, 0.09, 0.06]} />
            <meshStandardMaterial color={skinColor} flatShading roughness={0.75} />
          </mesh>
        ))}

      {/* Eyes */}
      {showEyes &&
        [-1, 1].map((s) => (
          <group key={s} position={[s * 0.085, 1.05, 0.225]}>
            <mesh scale={[1, squint ? 0.45 : 1, 1]}>
              <boxGeometry args={[0.048, 0.036, 0.02]} />
              <meshStandardMaterial color="#ffffff" flatShading />
            </mesh>
            <mesh position={[0, 0, 0.012]} scale={[1, squint ? 0.5 : 1, 1]}>
              <boxGeometry args={[0.026, 0.026, 0.012]} />
              <meshStandardMaterial color={eyeColor} flatShading />
            </mesh>
          </group>
        ))}

      {/* Mouth / Lips */}
      <mesh
        position={[0, 0.91, 0.23]}
        rotation={[0, 0, smile ? 0.05 : 0]}
      >
        <boxGeometry args={[0.095, 0.028, 0.03]} />
        <meshStandardMaterial color={lipColor} flatShading roughness={0.5} />
      </mesh>
    </group>
  );
}

/**
 * Low-Poly Torso & Arms (supports both 'preview' and 'driving' poses)
 */
function TorsoAndArms({
  jacketColor = '#1e293b',
  jacketMap = null,
  shirtColor = '#f8fafc',
  handColor = '#f1c29b',
  pantsColor = '#1e293b',
  calfColor = null,
  calfMap = null,
  beltColor = '#111827',
  buckleColor = '#fbbf24',
  shoeColor = '#0f172a',
  flareLegs = false,
  pose = 'preview',
  children,
}) {
  const isDriving = pose === 'driving';
  return (
    <group>
      {/* Upper Torso */}
      <mesh position={[0, 0.38, 0]} castShadow>
        <cylinderGeometry args={[0.28, 0.22, 0.62, 8]} />
        <meshStandardMaterial
          color={jacketMap ? '#ffffff' : jacketColor}
          map={jacketMap}
          flatShading={!jacketMap}
          roughness={0.68}
        />
      </mesh>

      {/* Chest V-neck / Shirt front */}
      <mesh position={[0, 0.52, 0.19]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.18, 0.26, 0.08]} />
        <meshStandardMaterial color={shirtColor} flatShading roughness={0.6} />
      </mesh>

      {/* Shoulders & Arms */}
      {[-1, 1].map((s) => (
        <group
          key={s}
          position={[s * 0.31, 0.58, 0.02]}
          rotation={
            isDriving
              ? [-1.05, s * -0.22, s * 0.12]
              : [0.12, 0, s * -0.16]
          }
        >
          {/* Upper & Forearm */}
          <mesh position={[0, -0.24, isDriving ? 0.12 : 0.03]} rotation={[isDriving ? -0.35 : -0.12, 0, 0]} castShadow>
            <cylinderGeometry args={[0.078, 0.064, 0.52, 6]} />
            <meshStandardMaterial
              color={jacketMap ? '#ffffff' : jacketColor}
              map={jacketMap}
              flatShading={!jacketMap}
              roughness={0.7}
            />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.50, isDriving ? 0.22 : 0.07]}>
            <dodecahedronGeometry args={[0.068, 0]} />
            <meshStandardMaterial
              color={jacketMap ? '#ffffff' : handColor}
              map={jacketMap}
              flatShading={!jacketMap}
              roughness={0.6}
            />
          </mesh>
        </group>
      ))}

      {/* Full-Body Lower Half (Belt, Hips, Legs & Boots) in Showcase Preview */}
      {!isDriving && (
        <group>
          {/* Belt & Buckle */}
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.225, 0.23, 0.07, 8]} />
            <meshStandardMaterial
              color={jacketMap ? '#ffffff' : beltColor}
              map={jacketMap}
              flatShading={!jacketMap}
              roughness={0.5}
            />
          </mesh>
          <mesh position={[0, 0.06, 0.225]}>
            <boxGeometry args={[0.09, 0.065, 0.03]} />
            <meshStandardMaterial color={buckleColor} metalness={0.8} roughness={0.25} flatShading />
          </mesh>

          {/* Pelvis / Hips */}
          <mesh position={[0, -0.05, 0]}>
            <cylinderGeometry args={[0.225, 0.21, 0.16, 8]} />
            <meshStandardMaterial color={pantsColor} flatShading roughness={0.72} />
          </mesh>

          {/* Left & Right Legs + Boots */}
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.115, -0.12, 0]} rotation={[0, s * -0.05, s * -0.025]}>
              {/* Thigh */}
              <mesh position={[0, -0.19, 0]} castShadow>
                <cylinderGeometry args={[0.098, 0.082, 0.38, 7]} />
                <meshStandardMaterial color={pantsColor} flatShading roughness={0.72} />
              </mesh>
              {/* Calf / Lower Trouser */}
              <mesh position={[0, -0.54, 0]} castShadow>
                <cylinderGeometry args={[0.080, flareLegs ? 0.115 : 0.068, 0.36, 7]} />
                <meshStandardMaterial
                  color={calfMap ? '#ffffff' : calfColor || pantsColor}
                  map={calfMap}
                  flatShading={!calfMap}
                  roughness={0.72}
                />
              </mesh>
              {/* Boot / Shoe */}
              <mesh position={[0, -0.75, 0.04]} castShadow>
                <boxGeometry args={[0.11, 0.09, 0.21]} />
                <meshStandardMaterial
                  color={calfMap ? '#ffffff' : shoeColor}
                  map={calfMap}
                  flatShading={!calfMap}
                  roughness={0.45}
                />
              </mesh>
            </group>
          ))}
        </group>
      )}

      {children}
    </group>
  );
}

/**
 * Procedural CanvasTextures for Elvis Presley ("Aloha from Hawaii" 1973):
 * 1. Face Texture with signature crooked smirk, raised brow, and cleft chin
 * 2. American Eagle Chest Texture (#F8F9FA suit, #D90429 red, #003566 blue, #FFD700 gold studs)
 */
function useElvisAlohaTextures() {
  return useMemo(() => {
    // 1. Face Smirk Texture
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    const fctx = faceCanvas.getContext('2d');
    fctx.fillStyle = '#F1C27D';
    fctx.fillRect(0, 0, 512, 512);

    // Eyebrows
    fctx.strokeStyle = '#111111';
    fctx.lineWidth = 9;
    fctx.lineCap = 'round';
    fctx.beginPath();
    fctx.moveTo(180, 210);
    fctx.quadraticCurveTo(208, 198, 232, 208);
    fctx.stroke();
    fctx.beginPath();
    fctx.moveTo(278, 206);
    fctx.quadraticCurveTo(308, 186, 338, 201);
    fctx.stroke();

    // Eyes
    for (const ex of [208, 304]) {
      fctx.fillStyle = '#FFFFFF';
      fctx.beginPath();
      fctx.ellipse(ex, 234, 21, 13, 0, 0, Math.PI * 2);
      fctx.fill();
      fctx.fillStyle = '#1e293b';
      fctx.beginPath();
      fctx.arc(ex, 234, 10, 0, Math.PI * 2);
      fctx.fill();
      fctx.fillStyle = '#FFFFFF';
      fctx.beginPath();
      fctx.arc(ex - 3, 231, 3, 0, Math.PI * 2);
      fctx.fill();
    }

    // Crooked Elvis Smirk
    fctx.fillStyle = '#7f1d1d';
    fctx.beginPath();
    fctx.moveTo(218, 323);
    fctx.quadraticCurveTo(259, 329, 304, 308);
    fctx.quadraticCurveTo(284, 339, 218, 323);
    fctx.closePath();
    fctx.fill();

    fctx.fillStyle = '#F8F9FA';
    fctx.beginPath();
    fctx.moveTo(234, 324);
    fctx.quadraticCurveTo(266, 326, 297, 311);
    fctx.quadraticCurveTo(279, 329, 234, 324);
    fctx.closePath();
    fctx.fill();

    fctx.strokeStyle = '#9e2a2b';
    fctx.lineWidth = 6;
    fctx.beginPath();
    fctx.moveTo(215, 323);
    fctx.quadraticCurveTo(258, 328, 306, 307);
    fctx.stroke();

    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;

    // 2. American Eagle Chest Texture
    const eagleCanvas = document.createElement('canvas');
    eagleCanvas.width = 512;
    eagleCanvas.height = 512;
    const ectx = eagleCanvas.getContext('2d');
    ectx.fillStyle = '#F8F9FA';
    ectx.fillRect(0, 0, 512, 512);

    const cx = 256;
    for (const side of [-1, 1]) {
      ectx.fillStyle = '#D90429';
      ectx.beginPath();
      ectx.moveTo(cx + side * 28, 210);
      ectx.lineTo(cx + side * 170, 105);
      ectx.lineTo(cx + side * 182, 132);
      ectx.lineTo(cx + side * 38, 238);
      ectx.closePath();
      ectx.fill();

      ectx.fillStyle = '#003566';
      ectx.beginPath();
      ectx.moveTo(cx + side * 32, 248);
      ectx.lineTo(cx + side * 175, 152);
      ectx.lineTo(cx + side * 185, 180);
      ectx.lineTo(cx + side * 42, 275);
      ectx.closePath();
      ectx.fill();

      ectx.fillStyle = '#D90429';
      ectx.beginPath();
      ectx.moveTo(cx + side * 38, 285);
      ectx.lineTo(cx + side * 168, 200);
      ectx.lineTo(cx + side * 175, 228);
      ectx.lineTo(cx + side * 48, 312);
      ectx.closePath();
      ectx.fill();

      // Gold rhinestones along chevron wings
      ectx.fillStyle = '#FFD700';
      for (let i = 0; i <= 12; i++) {
        const t = i / 12;
        const x = cx + side * (28 + 142 * t);
        const y = 208 - 103 * t;
        ectx.beginPath();
        ectx.arc(x, y, 3.5, 0, Math.PI * 2);
        ectx.fill();
      }
    }

    const eagleTex = new THREE.CanvasTexture(eagleCanvas);
    eagleTex.colorSpace = THREE.SRGBColorSpace;

    return { faceTex, eagleTex };
  }, []);
}

/**
 * 1. ELVIS PRESLEY ("Aloha from Hawaii" 1973 Designer Toy Edition)
 * Palette: #F8F9FA suit, #FFD700 gold, #D90429 red, #003566 cape lining, #111111 hair, #F1C27D skin
 */
function ElvisModel({ pose }) {
  const isDriving = pose === 'driving';
  const { faceTex, eagleTex } = useElvisAlohaTextures();

  return (
    <group name="elvisGroup" position={[0, -0.72, 0]}>
      {/* 1. HEAD GROUP (y = 1.65) */}
      <group name="headGroup" position={[0, 1.65, 0]} rotation={[0.04, isDriving ? 0 : 0.14, 0]}>
        {/* Neck */}
        <mesh position={[0, -0.17, -0.01]}>
          <cylinderGeometry args={[0.085, 0.10, 0.16, 18]} />
          <meshStandardMaterial color="#F1C27D" roughness={0.5} />
        </mesh>

        {/* Sculpted Face with Procedural Smirk CanvasTexture */}
        <mesh scale={[0.92, 1.12, 0.96]} rotation={[0, -Math.PI / 2, 0]} castShadow>
          <sphereGeometry args={[0.195, 28, 24]} />
          <meshStandardMaterial map={faceTex} roughness={0.48} />
        </mesh>

        {/* 3D Nose */}
        <mesh position={[0, 0.005, 0.195]} rotation={[0.28, 0, 0]}>
          <coneGeometry args={[0.025, 0.072, 10]} />
          <meshStandardMaterial color="#F1C27D" roughness={0.5} />
        </mesh>

        {/* Pompadour Hair (#111111, roughness 0.4) + Mutton Chops */}
        <mesh position={[0, 0.045, -0.035]} scale={[0.98, 1.08, 1.05]} castShadow>
          <sphereGeometry args={[0.212, 24, 20]} />
          <meshStandardMaterial color="#111111" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.195, 0.105]} rotation={[0, 0, Math.PI / 2]} scale={[1.15, 1.0, 0.88]} castShadow>
          <cylinderGeometry args={[0.125, 0.145, 0.34, 20]} />
          <meshStandardMaterial color="#111111" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.21, 0.045]} rotation={[-0.25, 0, 0]} scale={[1.12, 0.82, 1.28]}>
          <sphereGeometry args={[0.165, 20, 16]} />
          <meshStandardMaterial color="#111111" roughness={0.4} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.172, -0.045, 0.068]} rotation={[0.12, s * 0.22, s * -0.08]}>
            <boxGeometry args={[0.046, 0.145, 0.072]} />
            <meshStandardMaterial color="#111111" roughness={0.4} />
          </mesh>
        ))}

        {/* TCB Aviator Sunglasses (#FFD700 + Dark Lenses #1a1a2e opacity 0.8) */}
        <group position={[0, 0.028, 0.188]}>
          <mesh position={[0, 0.042, 0.01]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.007, 0.007, 0.24, 10]} />
            <meshStandardMaterial color="#FFD700" metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0.018, 0.012]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.006, 0.006, 0.08, 10]} />
            <meshStandardMaterial color="#FFD700" metalness={0.85} roughness={0.2} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.078, 0.002, 0.006]} rotation={[0, s * -0.12, 0]}>
              <mesh scale={[1.12, 0.95, 1]}>
                <torusGeometry args={[0.056, 0.0075, 10, 24]} />
                <meshStandardMaterial color="#FFD700" metalness={0.85} roughness={0.2} />
              </mesh>
              <mesh position={[0, 0, 0.002]} scale={[1.12, 0.95, 1]}>
                <circleGeometry args={[0.054, 24]} />
                <meshStandardMaterial color="#1a1a2e" transparent opacity={0.8} roughness={0.1} />
              </mesh>
            </group>
          ))}
        </group>
      </group>

      {/* 2. TORSO, HIGH COLLAR, ALOHA BELT & CAPE (y = 1.0) */}
      <group name="torsoGroup" position={[0, 1.0, 0]}>
        <mesh position={[0, 0.14, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[1.08, 1, 0.78]} castShadow>
          <cylinderGeometry args={[0.245, 0.185, 0.56, 28]} />
          <meshStandardMaterial map={eagleTex} roughness={0.3} />
        </mesh>

        {/* Deep V-Neck Chest Skin + Gold Chain */}
        <mesh position={[0, 0.27, 0.142]} rotation={[0, Math.PI, Math.PI]} scale={[1, 1, 0.25]}>
          <coneGeometry args={[0.115, 0.32, 3]} />
          <meshStandardMaterial color="#F1C27D" roughness={0.5} />
        </mesh>
        <mesh position={[0, 0.26, 0.165]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.028, 0.028, 0.012, 16]} />
          <meshStandardMaterial color="#FFD700" metalness={0.85} roughness={0.2} />
        </mesh>

        {/* High 1970s Flared Collar (openEnded: true) */}
        <mesh position={[0, 0.48, -0.015]} rotation={[-0.12, 0, 0]}>
          <cylinderGeometry args={[0.215, 0.145, 0.21, 28, 1, true, Math.PI * 0.22, Math.PI * 1.56]} />
          <meshStandardMaterial color="#F8F9FA" roughness={0.3} side={THREE.DoubleSide} />
        </mesh>

        {/* Iconic Studded Aloha Belt */}
        <group position={[0, -0.12, 0]}>
          <mesh scale={[1.08, 1, 0.8]}>
            <cylinderGeometry args={[0.195, 0.202, 0.115, 24]} />
            <meshStandardMaterial color="#F8F9FA" roughness={0.3} />
          </mesh>
          <mesh position={[0, 0, 0.158]}>
            <boxGeometry args={[0.16, 0.125, 0.035]} />
            <meshStandardMaterial color="#FFD700" metalness={0.85} roughness={0.2} />
          </mesh>
        </group>

        {/* Stage Cape (#F8F9FA Outer + #003566 Blue Lining) */}
        <group position={[0, 0.40, -0.06]}>
          <mesh position={[0, -0.36, -0.06]} rotation={[0.18, 0, 0]}>
            <cylinderGeometry args={[0.24, 0.56, 0.78, 24, 1, true, Math.PI * 0.58, Math.PI * 0.84]} />
            <meshStandardMaterial color="#F8F9FA" roughness={0.3} side={THREE.FrontSide} />
          </mesh>
          <mesh position={[0, -0.36, -0.058]} rotation={[0.18, 0, 0]}>
            <cylinderGeometry args={[0.236, 0.552, 0.775, 24, 1, true, Math.PI * 0.58, Math.PI * 0.84]} />
            <meshStandardMaterial color="#003566" roughness={0.4} side={THREE.BackSide} />
          </mesh>
        </group>

        {/* 3. ARMS (Right Arm with Vintage Mic, Left Arm in Rock Pose) */}
        <group
          name="rightArmGroup"
          position={[-0.29, 0.36, 0]}
          rotation={isDriving ? [-0.65, -0.2, 0.35] : [0, 0, 0]}
        >
          <mesh position={[-0.08, -0.18, 0.08]} rotation={[-0.65, 0.15, -0.35]}>
            <cylinderGeometry args={[0.065, 0.078, 0.42, 14]} />
            <meshStandardMaterial color="#F8F9FA" roughness={0.3} />
          </mesh>
          <mesh position={[-0.14, -0.36, 0.22]}>
            <sphereGeometry args={[0.052, 12, 12]} />
            <meshStandardMaterial color="#F1C27D" roughness={0.5} />
          </mesh>
          {!isDriving && (
            <group position={[-0.14, -0.36, 0.26]} rotation={[Math.PI * 0.35, 0, -0.2]}>
              <mesh>
                <cylinderGeometry args={[0.015, 0.011, 0.18, 12]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
              </mesh>
              <mesh position={[0, 0.10, 0]} scale={[1, 1.25, 1]}>
                <sphereGeometry args={[0.032, 16, 14]} />
                <meshStandardMaterial color="#FFD700" metalness={0.85} roughness={0.2} />
              </mesh>
            </group>
          )}
        </group>

        <group
          name="leftArmGroup"
          position={[0.29, 0.36, 0]}
          rotation={isDriving ? [-0.65, 0.2, -0.35] : [0, 0, 0]}
        >
          <mesh position={[0.08, -0.08, 0.18]} rotation={[-1.25, -0.22, 0.18]}>
            <cylinderGeometry args={[0.065, 0.078, 0.42, 14]} />
            <meshStandardMaterial color="#F8F9FA" roughness={0.3} />
          </mesh>
          <mesh position={[0.14, -0.14, 0.36]}>
            <sphereGeometry args={[0.052, 12, 12]} />
            <meshStandardMaterial color="#F1C27D" roughness={0.5} />
          </mesh>
        </group>
      </group>

      {/* 4. BELL-BOTTOM LEGS WITH RED KICKPLEATS (#D90429) */}
      {!isDriving && (
        <group position={[0, 0.78, 0]}>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.115, -0.04, 0]} rotation={[0, s * -0.1, s * 0.18]}>
              <mesh position={[0, -0.18, 0]}>
                <cylinderGeometry args={[0.092, 0.076, 0.36, 16]} />
                <meshStandardMaterial color="#F8F9FA" roughness={0.3} />
              </mesh>
              <mesh position={[0, -0.52, 0]}>
                <cylinderGeometry args={[0.076, 0.145, 0.38, 20]} />
                <meshStandardMaterial color="#F8F9FA" roughness={0.3} />
              </mesh>
              <mesh position={[s * 0.10, -0.58, 0]} rotation={[0, 0, s * -0.18]}>
                <coneGeometry args={[0.055, 0.22, 4]} />
                <meshStandardMaterial color="#D90429" roughness={0.35} />
              </mesh>
              <mesh position={[0, -0.72, 0.035]}>
                <boxGeometry args={[0.11, 0.075, 0.22]} />
                <meshStandardMaterial color="#F8F9FA" roughness={0.3} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * Procedural CanvasTextures for Tex Willer ("Aquila della Notte" Designer Toy Edition):
 * 1. Sun-tanned Western face with determined brow, steel-blue eyes & confident grin
 * 2. Classic yellow Ranger shirt with western yoke, pocket flaps & button placket
 */
function useTexTextures() {
  return useMemo(() => {
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    const fctx = faceCanvas.getContext('2d');
    fctx.fillStyle = '#E0A96D';
    fctx.fillRect(0, 0, 512, 512);

    // Thick determined eyebrows
    fctx.strokeStyle = '#3b2314';
    fctx.lineWidth = 11;
    fctx.lineCap = 'round';
    fctx.beginPath();
    fctx.moveTo(175, 204);
    fctx.quadraticCurveTo(205, 196, 236, 208);
    fctx.stroke();
    fctx.beginPath();
    fctx.moveTo(276, 208);
    fctx.quadraticCurveTo(307, 196, 337, 204);
    fctx.stroke();

    // Steel-blue Ranger eyes + catchlights
    for (const ex of [208, 304]) {
      fctx.fillStyle = '#FFFFFF';
      fctx.beginPath();
      fctx.ellipse(ex, 234, 20, 12, 0, 0, Math.PI * 2);
      fctx.fill();
      fctx.fillStyle = '#1d4ed8';
      fctx.beginPath();
      fctx.arc(ex, 234, 9.5, 0, 0, Math.PI * 2);
      fctx.fill();
      fctx.fillStyle = '#0f172a';
      fctx.beginPath();
      fctx.arc(ex, 234, 4.5, 0, Math.PI * 2);
      fctx.fill();
      fctx.fillStyle = '#FFFFFF';
      fctx.beginPath();
      fctx.arc(ex - 3, 231, 3, 0, Math.PI * 2);
      fctx.fill();
    }

    // Confident Western half-smile with white teeth flash
    fctx.fillStyle = '#6b2118';
    fctx.beginPath();
    fctx.moveTo(212, 320);
    fctx.quadraticCurveTo(256, 332, 302, 314);
    fctx.quadraticCurveTo(278, 342, 212, 320);
    fctx.closePath();
    fctx.fill();
    fctx.fillStyle = '#F8F9FA';
    fctx.beginPath();
    fctx.moveTo(224, 321);
    fctx.quadraticCurveTo(258, 327, 292, 316);
    fctx.quadraticCurveTo(274, 331, 224, 321);
    fctx.closePath();
    fctx.fill();

    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;

    // 2. Yellow Ranger Shirt Texture
    const shirtCanvas = document.createElement('canvas');
    shirtCanvas.width = 512;
    shirtCanvas.height = 512;
    const sctx = shirtCanvas.getContext('2d');
    sctx.fillStyle = '#F4B400';
    sctx.fillRect(0, 0, 512, 512);

    // Center placket & western breast pockets
    sctx.strokeStyle = '#B45309';
    sctx.lineWidth = 5;
    sctx.strokeRect(242, 80, 28, 420);
    for (const py of [160, 230, 300, 370]) {
      sctx.fillStyle = '#FEF3C7';
      sctx.beginPath();
      sctx.arc(256, py, 6, 0, Math.PI * 2);
      sctx.fill();
      sctx.stroke();
    }
    for (const px of [145, 315]) {
      sctx.strokeRect(px, 175, 68, 76);
      sctx.beginPath();
      sctx.moveTo(px, 175);
      sctx.lineTo(px + 34, 202);
      sctx.lineTo(px + 68, 175);
      sctx.stroke();
    }

    const shirtTex = new THREE.CanvasTexture(shirtCanvas);
    shirtTex.colorSpace = THREE.SRGBColorSpace;
    return { faceTex, shirtTex };
  }, []);
}

/**
 * 2. TEX WILLER ("Aquila della Notte" Designer Toy Edition)
 */
function TexModel({ pose }) {
  const isDriving = pose === 'driving';
  const { faceTex, shirtTex } = useTexTextures();

  return (
    <group name="texGroup" position={[0, -0.72, 0]}>
      {/* 1. HEAD GROUP & STETSON HAT (y = 1.65) */}
      <group name="headGroup" position={[0, 1.65, 0]} rotation={[0.02, isDriving ? 0 : -0.1, 0]}>
        <mesh position={[0, -0.17, -0.01]}>
          <cylinderGeometry args={[0.088, 0.105, 0.16, 18]} />
          <meshStandardMaterial color="#E0A96D" roughness={0.5} />
        </mesh>
        <mesh scale={[0.93, 1.10, 0.96]} rotation={[0, -Math.PI / 2, 0]} castShadow>
          <sphereGeometry args={[0.195, 28, 24]} />
          <meshStandardMaterial map={faceTex} roughness={0.48} />
        </mesh>
        <mesh position={[0, 0.005, 0.195]} rotation={[0.26, 0, 0]}>
          <coneGeometry args={[0.026, 0.072, 10]} />
          <meshStandardMaterial color="#E0A96D" roughness={0.5} />
        </mesh>
        {/* Brown Hair at Nape & Temples */}
        <mesh position={[0, 0.03, -0.04]} scale={[0.98, 1.02, 1.02]}>
          <sphereGeometry args={[0.205, 20, 16]} />
          <meshStandardMaterial color="#3b2314" roughness={0.55} />
        </mesh>

        {/* Sculpted Tan Stetson Cowboy Hat with Curved Side Brim */}
        <group position={[0, 0.145, 0.01]} rotation={[-0.08, 0, 0]}>
          <mesh scale={[1.18, 0.20, 1.28]} castShadow>
            <cylinderGeometry args={[0.38, 0.40, 0.12, 28]} />
            <meshStandardMaterial color="#D6B88A" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.018, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.12, 1.22, 0.45]}>
            <torusGeometry args={[0.35, 0.028, 10, 28]} />
            <meshStandardMaterial color="#D6B88A" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.115, 0]} scale={[0.92, 1, 1.12]} castShadow>
            <cylinderGeometry args={[0.175, 0.215, 0.22, 24]} />
            <meshStandardMaterial color="#D6B88A" roughness={0.55} />
          </mesh>
          <mesh position={[0, 0.025, 0]} scale={[0.93, 1, 1.13]}>
            <cylinderGeometry args={[0.212, 0.218, 0.036, 24]} />
            <meshStandardMaterial color="#451a03" roughness={0.45} />
          </mesh>
        </group>
      </group>

      {/* 2. TORSO, BLACK BANDANA, RANGER STAR & GUNBELT (y = 1.0) */}
      <group name="torsoGroup" position={[0, 1.0, 0]}>
        <mesh position={[0, 0.14, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[1.08, 1, 0.78]} castShadow>
          <cylinderGeometry args={[0.245, 0.185, 0.56, 28]} />
          <meshStandardMaterial map={shirtTex} roughness={0.4} />
        </mesh>

        {/* Sculpted Black Neck Bandana & Front Triangle Fold */}
        <mesh position={[0, 0.40, 0.02]} rotation={[0.12, 0, 0]}>
          <torusGeometry args={[0.145, 0.038, 12, 24]} />
          <meshStandardMaterial color="#111827" roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.29, 0.175]} rotation={[0.22, 0, Math.PI]}>
          <coneGeometry args={[0.095, 0.18, 4]} />
          <meshStandardMaterial color="#111827" roughness={0.65} />
        </mesh>

        {/* Silver Texas Ranger Star Badge on Left Chest */}
        <mesh position={[0.105, 0.26, 0.178]} rotation={[0.1, 0, 0]}>
          <cylinderGeometry args={[0.032, 0.032, 0.012, 6]} />
          <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
        </mesh>

        {/* Western Leather Gunbelt with Brass Cartridges & Holster */}
        <group position={[0, -0.12, 0]}>
          <mesh scale={[1.08, 1, 0.8]}>
            <cylinderGeometry args={[0.195, 0.202, 0.10, 24]} />
            <meshStandardMaterial color="#451a03" roughness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.158]}>
            <boxGeometry args={[0.10, 0.085, 0.03]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.85} roughness={0.2} />
          </mesh>
          {/* Right Hip Leather Holster */}
          <mesh position={[-0.22, -0.11, 0.02]} rotation={[0, 0, 0.12]}>
            <cylinderGeometry args={[0.042, 0.028, 0.22, 12]} />
            <meshStandardMaterial color="#3b1806" roughness={0.55} />
          </mesh>
        </group>

        {/* 3. ARMS & COLT PEACEMAKER REVOLVER */}
        <group
          position={[-0.29, 0.36, 0]}
          rotation={isDriving ? [-0.65, -0.2, 0.35] : [0, 0, 0]}
        >
          <mesh position={[-0.08, -0.18, 0.08]} rotation={[-0.55, 0.15, -0.3]}>
            <cylinderGeometry args={[0.065, 0.078, 0.42, 14]} />
            <meshStandardMaterial color="#F4B400" roughness={0.4} />
          </mesh>
          <mesh position={[-0.14, -0.35, 0.20]}>
            <sphereGeometry args={[0.052, 12, 12]} />
            <meshStandardMaterial color="#E0A96D" roughness={0.5} />
          </mesh>
          {!isDriving && (
            <group position={[-0.14, -0.35, 0.26]} rotation={[0.25, 0, 0]}>
              <mesh position={[0, 0.035, 0.08]}>
                <cylinderGeometry args={[0.014, 0.014, 0.18, 12]} rotation={[Math.PI / 2, 0, 0]} />
                <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.18} />
              </mesh>
              <mesh position={[0, 0.03, 0.09]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.015, 0.015, 0.16, 12]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
              </mesh>
              <mesh position={[0, -0.01, -0.01]} rotation={[0.35, 0, 0]}>
                <boxGeometry args={[0.024, 0.075, 0.036]} />
                <meshStandardMaterial color="#fef3c7" roughness={0.3} />
              </mesh>
            </group>
          )}
        </group>

        <group
          position={[0.29, 0.36, 0]}
          rotation={isDriving ? [-0.65, 0.2, -0.35] : [0, 0, 0]}
        >
          <mesh position={[0.08, -0.18, 0.06]} rotation={[-0.35, -0.15, 0.25]}>
            <cylinderGeometry args={[0.065, 0.078, 0.42, 14]} />
            <meshStandardMaterial color="#F4B400" roughness={0.4} />
          </mesh>
          <mesh position={[0.13, -0.36, 0.14]}>
            <sphereGeometry args={[0.052, 12, 12]} />
            <meshStandardMaterial color="#E0A96D" roughness={0.5} />
          </mesh>
        </group>
      </group>

      {/* 4. BLUE JEANS & WESTERN COWBOY BOOTS */}
      {!isDriving && (
        <group position={[0, 0.78, 0]}>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.115, -0.04, 0]} rotation={[0, s * -0.08, s * 0.12]}>
              <mesh position={[0, -0.18, 0]}>
                <cylinderGeometry args={[0.092, 0.078, 0.36, 16]} />
                <meshStandardMaterial color="#1e3a8a" roughness={0.65} />
              </mesh>
              <mesh position={[0, -0.52, 0]}>
                <cylinderGeometry args={[0.082, 0.074, 0.38, 16]} />
                <meshStandardMaterial color="#5c2d0c" roughness={0.45} />
              </mesh>
              <mesh position={[0, -0.72, 0.035]}>
                <boxGeometry args={[0.105, 0.078, 0.22]} />
                <meshStandardMaterial color="#451a03" roughness={0.4} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * 3. JAMES BOND (007 • Papà Version) — Recognizable Black Tuxedo, White Pleated Plastron,
 * Prominent Black Bow Tie, White Pocket Square, Walther PPK & Signature "Piazzetta" Hairline
 */
function BondModel({ pose }) {
  return (
    <group>
      <TorsoAndArms
        jacketColor="#0b0f17"
        shirtColor="#ffffff"
        handColor="#f1c29b"
        pantsColor="#0b0f17"
        beltColor="#090d16"
        buckleColor="#1e293b"
        shoeColor="#05070b"
        pose={pose}
      >
        {/* Wide Crisp White Tuxedo Dress Shirt Plastron (Front V-Opening) */}
        <mesh position={[0, 0.49, 0.215]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.20, 0.34, 0.06]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} flatShading />
        </mesh>

        {/* White Wing Collar (Colletto Diplomatico Bianco) */}
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.055, 0.675, 0.21]}
            rotation={[0.2, s * -0.35, s * -0.35]}
          >
            <boxGeometry args={[0.085, 0.055, 0.03]} />
            <meshStandardMaterial color="#ffffff" flatShading />
          </mesh>
        ))}

        {/* 3 Black Onyx Tuxedo Shirt Studs (Bottoncini Neri da Smoking) */}
        {[0.56, 0.48, 0.40].map((yStud, idx) => (
          <mesh key={idx} position={[0, yStud, 0.248]}>
            <boxGeometry args={[0.018, 0.018, 0.015]} />
            <meshStandardMaterial color="#090d16" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}

        {/* Glossy Black Satin Peak Lapels (Revers a Lancia in Raso Nero) */}
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.115, 0.48, 0.225]}
            rotation={[0.06, s * 0.15, s * -0.30]}
          >
            <boxGeometry args={[0.075, 0.36, 0.035]} />
            <meshStandardMaterial
              color="#1e293b"
              metalness={0.35}
              roughness={0.22}
              flatShading
            />
          </mesh>
        ))}

        {/* Prominent Classic Black Butterfly Bow Tie (Papillon Nero Iconico) */}
        <group position={[0, 0.645, 0.252]}>
          <mesh position={[-0.048, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.042, 0.085, 4]} />
            <meshStandardMaterial color="#05070b" roughness={0.3} flatShading />
          </mesh>
          <mesh position={[0.048, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.042, 0.085, 4]} />
            <meshStandardMaterial color="#05070b" roughness={0.3} flatShading />
          </mesh>
          <mesh>
            <boxGeometry args={[0.030, 0.032, 0.028]} />
            <meshStandardMaterial color="#111827" roughness={0.25} flatShading />
          </mesh>
        </group>

        {/* Crisp White Folded Pocket Square & Red Carnation Pin */}
        <mesh position={[-0.155, 0.51, 0.225]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.065, 0.038, 0.025]} />
          <meshStandardMaterial color="#ffffff" flatShading />
        </mesh>
        <mesh position={[-0.125, 0.56, 0.245]}>
          <dodecahedronGeometry args={[0.018, 0]} />
          <meshStandardMaterial color="#dc2626" flatShading />
        </mesh>

        {/* Black Satin Cummerbund (Fascia da Smoking in Raso) */}
        <mesh position={[0, 0.14, 0.01]}>
          <cylinderGeometry args={[0.232, 0.228, 0.11, 8]} />
          <meshStandardMaterial color="#111827" metalness={0.25} roughness={0.3} flatShading />
        </mesh>

        {/* Walther PPK Spy Pistol in Right Hand during Showcase */}
        {pose === 'preview' && (
          <group position={[-0.36, 0.12, 0.19]} rotation={[0.35, 0, 0]}>
            <mesh position={[0, 0.04, 0.06]}>
              <boxGeometry args={[0.026, 0.036, 0.14]} />
              <meshStandardMaterial color="#1e293b" metalness={0.85} roughness={0.2} />
            </mesh>
            <mesh position={[0, 0, 0.01]} rotation={[0.25, 0, 0]}>
              <boxGeometry args={[0.024, 0.07, 0.036]} />
              <meshStandardMaterial color="#0f172a" roughness={0.5} />
            </mesh>
          </group>
        )}
      </TorsoAndArms>

      <BaseHead skinColor="#f1c29b" eyeColor="#2563eb" smile />

      {/* Signature "Piazzetta" Hairline (Bald/Receding Crown on Top, Neat Salt-and-Pepper Hair on Sides & Back) */}
      {/* Left & Right Temple/Side Hair Fringe */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.215, 1.07, -0.01]}
          rotation={[0.05, 0, s * -0.18]}
        >
          <boxGeometry args={[0.075, 0.16, 0.28]} />
          <meshStandardMaterial color="#52525b" flatShading roughness={0.7} />
        </mesh>
      ))}
      {/* Back of the Head Horseshoe Hair Ring (leaving the top crown skin-toned = "la piazzetta") */}
      <mesh position={[0, 1.04, -0.14]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[0.38, 0.17, 0.14]} />
        <meshStandardMaterial color="#52525b" flatShading roughness={0.7} />
      </mesh>
      {/* Distinguished Salt-and-Pepper Eyebrows */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.085, 1.09, 0.235]}
          rotation={[0, 0, s * -0.08]}
        >
          <boxGeometry args={[0.068, 0.016, 0.018]} />
          <meshStandardMaterial color="#475569" flatShading />
        </mesh>
      ))}
    </group>
  );
}

/**
 * 4. L'UOMO RAGNO ("Amazing Spider-Man" Designer Toy Edition)
 * Smooth high-segment sculpted anatomy, authentic scalloped & radial black web textures,
 * 8-legged chest spider emblem, chrome wrist web-shooters & "Thwip!" web strand pose
 */
function SpidermanModel({ pose }) {
  const isDriving = pose === 'driving';
  const { suitWebTex, maskWebTex } = useSpidermanTextures();

  return (
    <group name="spidermanGroup" position={[0, -0.72, 0]}>
      {/* 1. HEAD GROUP WITH RADIAL WEBBED MASK & SCULPTED CURVED EYE LENSES (y = 1.65) */}
      <group name="headGroup" position={[0, 1.65, 0]} rotation={[0.05, isDriving ? 0 : 0.12, 0]}>
        <mesh position={[0, -0.17, -0.01]}>
          <cylinderGeometry args={[0.085, 0.10, 0.16, 20]} />
          <meshStandardMaterial map={suitWebTex} roughness={0.42} />
        </mesh>
        <mesh scale={[0.92, 1.12, 0.96]} rotation={[0, Math.PI * 0.5, 0]} castShadow>
          <sphereGeometry args={[0.198, 28, 24]} />
          <meshStandardMaterial map={maskWebTex} roughness={0.38} />
        </mesh>

        {/* Iconic Marvel Curved Teardrop White Eye Lenses with Thick Glossy Black Frames */}
        {[-1, 1].map((s) => (
          <group
            key={s}
            position={[s * 0.078, 0.025, 0.178]}
            rotation={[-0.08, s * 0.28, s * 0.32]}
          >
            {/* Outer Glossy Black Eye Frame */}
            <mesh scale={[1.25, 0.85, 0.35]}>
              <sphereGeometry args={[0.068, 20, 16]} />
              <meshStandardMaterial color="#090d16" roughness={0.18} metalness={0.25} />
            </mesh>
            {/* Inner Reflective White Lens */}
            <mesh position={[0, 0, 0.010]} scale={[1.02, 0.66, 0.32]}>
              <sphereGeometry args={[0.064, 20, 16]} />
              <meshStandardMaterial
                color="#FFFFFF"
                emissive="#f8fafc"
                emissiveIntensity={0.25}
                roughness={0.12}
              />
            </mesh>
          </group>
        ))}
      </group>

      {/* 2. MUSCULAR TORSO, ROYAL-BLUE SIDE PANELS & 8-LEGGED BLACK SPIDER (y = 1.0) */}
      <group name="torsoGroup" position={[0, 1.0, 0]}>
        <mesh position={[0, 0.14, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[1.08, 1, 0.78]} castShadow>
          <cylinderGeometry args={[0.245, 0.185, 0.56, 28]} />
          <meshStandardMaterial map={suitWebTex} roughness={0.38} />
        </mesh>

        {/* Royal-Blue Lateral Lat/Rib Panels (#003566) */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.182, 0.11, -0.01]} scale={[0.65, 1, 0.9]}>
            <cylinderGeometry args={[0.11, 0.095, 0.44, 18]} />
            <meshStandardMaterial color="#003566" roughness={0.42} />
          </mesh>
        ))}

        {/* Sculpted 8-Legged Black Spider Emblem on Chest */}
        <group position={[0, 0.22, 0.192]} rotation={[0.06, 0, 0]}>
          <mesh position={[0, -0.018, 0]} scale={[0.85, 1.2, 0.45]}>
            <sphereGeometry args={[0.028, 14, 12]} />
            <meshStandardMaterial color="#090d16" roughness={0.25} />
          </mesh>
          <mesh position={[0, 0.022, 0]} scale={[0.85, 1.0, 0.45]}>
            <sphereGeometry args={[0.018, 12, 10]} />
            <meshStandardMaterial color="#090d16" roughness={0.25} />
          </mesh>
          {[-1, 1].map((s) =>
            [-0.5, -0.16, 0.22, 0.58].map((ang, idx) => (
              <mesh
                key={`${s}_${idx}`}
                position={[s * 0.044, (idx - 1.5) * 0.022, 0]}
                rotation={[0, 0, s * ang]}
              >
                <cylinderGeometry args={[0.0045, 0.003, 0.075, 8]} rotation={[0, 0, Math.PI / 2]} />
                <meshStandardMaterial color="#090d16" roughness={0.25} />
              </mesh>
            ))
          )}
        </group>

        {/* Red Webbed V-Belt */}
        <mesh position={[0, -0.12, 0]} scale={[1.08, 1, 0.8]}>
          <cylinderGeometry args={[0.192, 0.198, 0.095, 24]} />
          <meshStandardMaterial map={suitWebTex} roughness={0.38} />
        </mesh>

        {/* 3. ARMS, SILVER WRIST WEB-SHOOTERS & "THWIP!" WEB STRAND POSE */}
        <group
          position={[-0.29, 0.36, 0]}
          rotation={isDriving ? [-0.65, -0.2, 0.35] : [0, 0, 0]}
        >
          <mesh position={[-0.08, -0.10, 0.16]} rotation={[-1.15, 0.15, -0.22]}>
            <cylinderGeometry args={[0.065, 0.078, 0.42, 16]} />
            <meshStandardMaterial map={suitWebTex} roughness={0.38} />
          </mesh>
          {/* Silver Wrist Web-Shooter */}
          <mesh position={[-0.13, -0.20, 0.32]} rotation={[-1.15, 0.15, -0.22]}>
            <cylinderGeometry args={[0.056, 0.056, 0.04, 16]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.9} roughness={0.15} />
          </mesh>
          <mesh position={[-0.14, -0.23, 0.36]}>
            <sphereGeometry args={[0.052, 14, 14]} />
            <meshStandardMaterial map={suitWebTex} roughness={0.38} />
          </mesh>
          {/* 3D Silver Web Line Shooting Forward in Showcase */}
          {!isDriving && (
            <mesh position={[-0.14, -0.22, 0.62]} rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.006, 0.012, 0.48, 8]} />
              <meshStandardMaterial color="#f8fafc" emissive="#e2e8f0" emissiveIntensity={0.35} />
            </mesh>
          )}
        </group>

        <group
          position={[0.29, 0.36, 0]}
          rotation={isDriving ? [-0.65, 0.2, -0.35] : [0, 0, 0]}
        >
          <mesh position={[0.08, -0.18, 0.06]} rotation={[-0.35, -0.15, 0.28]}>
            <cylinderGeometry args={[0.065, 0.078, 0.42, 16]} />
            <meshStandardMaterial map={suitWebTex} roughness={0.38} />
          </mesh>
          <mesh position={[0.14, -0.35, 0.14]}>
            <sphereGeometry args={[0.052, 14, 14]} />
            <meshStandardMaterial map={suitWebTex} roughness={0.38} />
          </mesh>
        </group>
      </group>

      {/* 4. ROYAL-BLUE LEGS & RED WEBBED CALF BOOTS */}
      {!isDriving && (
        <group position={[0, 0.78, 0]}>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.115, -0.04, 0]} rotation={[0, s * -0.08, s * 0.14]}>
              <mesh position={[0, -0.18, 0]}>
                <cylinderGeometry args={[0.092, 0.078, 0.36, 18]} />
                <meshStandardMaterial color="#003566" roughness={0.42} />
              </mesh>
              <mesh position={[0, -0.52, 0]}>
                <cylinderGeometry args={[0.078, 0.070, 0.38, 18]} />
                <meshStandardMaterial map={suitWebTex} roughness={0.38} />
              </mesh>
              <mesh position={[0, -0.72, 0.035]}>
                <boxGeometry args={[0.105, 0.075, 0.22]} />
                <meshStandardMaterial map={suitWebTex} roughness={0.38} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * Procedural CanvasTexture for Diabolik ("Il Re del Terrore" Designer Toy Edition):
 * Sleek midnight-black mask with signature V-peak eye cutout, skin bridge,
 * fierce arched gull-wing eyebrows, and piercing ice-blue eyes.
 */
function useDiabolikTextures() {
  return useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0a0d14';
    ctx.fillRect(0, 0, 512, 512);

    // Signature horizontal eye mask opening with center V-peak
    ctx.fillStyle = '#F1C29B';
    ctx.beginPath();
    ctx.moveTo(138, 224);
    ctx.quadraticCurveTo(195, 178, 256, 212);
    ctx.quadraticCurveTo(317, 178, 374, 224);
    ctx.quadraticCurveTo(368, 258, 310, 260);
    ctx.quadraticCurveTo(256, 248, 202, 260);
    ctx.quadraticCurveTo(144, 258, 138, 224);
    ctx.closePath();
    ctx.fill();

    // Fierce arched gull-wing black eyebrows
    ctx.strokeStyle = '#07090e';
    ctx.lineWidth = 11;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(156, 218);
    ctx.quadraticCurveTo(198, 194, 242, 222);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(356, 218);
    ctx.quadraticCurveTo(314, 194, 270, 222);
    ctx.stroke();

    // Piercing ice-blue eyes
    for (const ex of [200, 312]) {
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(ex, 236, 22, 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.arc(ex, 236, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#090d16';
      ctx.beginPath();
      ctx.arc(ex, 236, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(ex - 3, 233, 2.8, 0, Math.PI * 2);
      ctx.fill();
    }

    const maskFaceTex = new THREE.CanvasTexture(canvas);
    maskFaceTex.colorSpace = THREE.SRGBColorSpace;
    return { maskFaceTex };
  }, []);
}

/**
 * 5. DIABOLIK ("Il Re del Terrore" Designer Toy Edition)
 */
function DiabolikModel({ pose }) {
  const isDriving = pose === 'driving';
  const { maskFaceTex } = useDiabolikTextures();

  return (
    <group name="diabolikGroup" position={[0, -0.72, 0]}>
      {/* 1. SCULPTED BLACK MASKED HEAD (y = 1.65) */}
      <group name="headGroup" position={[0, 1.65, 0]} rotation={[0.04, isDriving ? 0 : -0.14, 0]}>
        <mesh position={[0, -0.17, -0.01]}>
          <cylinderGeometry args={[0.088, 0.105, 0.17, 20]} />
          <meshStandardMaterial color="#0a0d14" roughness={0.35} />
        </mesh>
        <mesh scale={[0.92, 1.12, 0.96]} rotation={[0, -Math.PI / 2, 0]} castShadow>
          <sphereGeometry args={[0.196, 28, 24]} />
          <meshStandardMaterial map={maskFaceTex} roughness={0.35} />
        </mesh>
        {/* Sculpted Nose Bridge under Mask */}
        <mesh position={[0, 0.002, 0.192]} rotation={[0.25, 0, 0]}>
          <coneGeometry args={[0.024, 0.068, 10]} />
          <meshStandardMaterial color="#0a0d14" roughness={0.35} />
        </mesh>
      </group>

      {/* 2. STEALTH CATSUIT TORSO, HIGH COLLAR & UTILITY BELT (y = 1.0) */}
      <group name="torsoGroup" position={[0, 1.0, 0]}>
        <mesh position={[0, 0.14, 0]} rotation={[0, -Math.PI / 2, 0]} scale={[1.08, 1, 0.78]} castShadow>
          <cylinderGeometry args={[0.242, 0.182, 0.56, 28]} />
          <meshStandardMaterial color="#0a0d14" roughness={0.34} metalness={0.12} />
        </mesh>

        {/* High Turtleneck Collar */}
        <mesh position={[0, 0.44, -0.01]}>
          <cylinderGeometry args={[0.125, 0.142, 0.14, 24]} />
          <meshStandardMaterial color="#090d16" roughness={0.35} />
        </mesh>

        {/* Gold-Buckled Utility Belt with Capsules & Holster */}
        <group position={[0, -0.12, 0]}>
          <mesh scale={[1.08, 1, 0.8]}>
            <cylinderGeometry args={[0.192, 0.198, 0.095, 24]} />
            <meshStandardMaterial color="#18181b" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.156]}>
            <boxGeometry args={[0.095, 0.072, 0.03]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.88} roughness={0.18} />
          </mesh>
        </group>

        {/* 3. ARMS, THROWING DAGGER & SPARKLING STOLEN DIAMOND */}
        <group
          position={[-0.29, 0.36, 0]}
          rotation={isDriving ? [-0.65, -0.2, 0.35] : [0, 0, 0]}
        >
          <mesh position={[-0.08, -0.16, 0.10]} rotation={[-0.75, 0.15, -0.28]}>
            <cylinderGeometry args={[0.064, 0.076, 0.42, 16]} />
            <meshStandardMaterial color="#0a0d14" roughness={0.35} />
          </mesh>
          <mesh position={[-0.14, -0.32, 0.24]}>
            <sphereGeometry args={[0.050, 14, 14]} />
            <meshStandardMaterial color="#0a0d14" roughness={0.35} />
          </mesh>
          {!isDriving && (
            <group position={[-0.14, -0.32, 0.32]} rotation={[Math.PI * 0.45, 0, 0]}>
              <mesh position={[0, 0.08, 0]}>
                <coneGeometry args={[0.018, 0.16, 4]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.95} roughness={0.1} />
              </mesh>
              <mesh position={[0, -0.02, 0]}>
                <cylinderGeometry args={[0.01, 0.01, 0.06, 8]} />
                <meshStandardMaterial color="#111827" roughness={0.4} />
              </mesh>
            </group>
          )}
        </group>

        <group
          position={[0.29, 0.36, 0]}
          rotation={isDriving ? [-0.65, 0.2, -0.35] : [0, 0, 0]}
        >
          <mesh position={[0.08, -0.10, 0.16]} rotation={[-1.1, -0.18, 0.22]}>
            <cylinderGeometry args={[0.064, 0.076, 0.42, 16]} />
            <meshStandardMaterial color="#0a0d14" roughness={0.35} />
          </mesh>
          <mesh position={[0.14, -0.18, 0.34]}>
            <sphereGeometry args={[0.050, 14, 14]} />
            <meshStandardMaterial color="#0a0d14" roughness={0.35} />
          </mesh>
          {!isDriving && (
            <mesh position={[0.14, -0.12, 0.40]} rotation={[0.25, 0.4, 0]}>
              <octahedronGeometry args={[0.068, 0]} />
              <meshStandardMaterial
                color="#38bdf8"
                emissive="#0284c7"
                emissiveIntensity={0.45}
                metalness={0.35}
                roughness={0.08}
                flatShading
              />
            </mesh>
          )}
        </group>
      </group>

      {/* 4. STEALTH CATSUIT LEGS & BOOTS */}
      {!isDriving && (
        <group position={[0, 0.78, 0]}>
          {[-1, 1].map((s) => (
            <group key={s} position={[s * 0.115, -0.04, 0]} rotation={[0, s * -0.08, s * 0.12]}>
              <mesh position={[0, -0.18, 0]}>
                <cylinderGeometry args={[0.090, 0.076, 0.36, 18]} />
                <meshStandardMaterial color="#0a0d14" roughness={0.35} />
              </mesh>
              <mesh position={[0, -0.52, 0]}>
                <cylinderGeometry args={[0.076, 0.068, 0.38, 18]} />
                <meshStandardMaterial color="#0a0d14" roughness={0.35} />
              </mesh>
              <mesh position={[0, -0.72, 0.035]}>
                <boxGeometry args={[0.105, 0.075, 0.22]} />
                <meshStandardMaterial color="#090d16" roughness={0.3} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * 6. ISPETTORE CALLAGHAN (CLINT EASTWOOD / DIRTY HARRY) — Designer Toy 3D Edition
 * Iconic 1970s/80s Swept-Back Feathered Hair with High Receding Temples, Stern Clint Eastwood Squint,
 * Herringbone Tweed Blazer, Knit Sweater Vest, Burgundy Tie & Long-Barreled S&W .44 Magnum Revolver
 */
function useCallaghanTextures() {
  return useMemo(() => {
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = 512;
    faceCanvas.height = 512;
    const fCtx = faceCanvas.getContext('2d');

    fCtx.fillStyle = '#e5ad87';
    fCtx.fillRect(0, 0, 512, 512);

    // Sun-weathered cheekbone shading & forehead furrows
    fCtx.fillStyle = 'rgba(168, 92, 58, 0.24)';
    fCtx.beginPath();
    fCtx.arc(175, 290, 36, 0, Math.PI * 2);
    fCtx.arc(337, 290, 36, 0, Math.PI * 2);
    fCtx.fill();

    // Forehead creases & glabella vertical frown lines ("Dirty Harry" scowl)
    fCtx.strokeStyle = 'rgba(135, 75, 45, 0.45)';
    fCtx.lineWidth = 3.5;
    fCtx.lineCap = 'round';
    fCtx.beginPath();
    fCtx.moveTo(246, 195);
    fCtx.lineTo(248, 228);
    fCtx.moveTo(266, 195);
    fCtx.lineTo(264, 228);
    fCtx.stroke();

    // Low furrowed sandy-ash eyebrows
    fCtx.strokeStyle = '#5c4b3b';
    fCtx.lineWidth = 13;
    fCtx.beginPath();
    fCtx.moveTo(168, 224);
    fCtx.quadraticCurveTo(205, 214, 240, 228);
    fCtx.stroke();
    fCtx.beginPath();
    fCtx.moveTo(344, 224);
    fCtx.quadraticCurveTo(307, 214, 272, 228);
    fCtx.stroke();

    // Signature Clint Eastwood narrow squinted eyes ("The Squint")
    const drawSquintEye = (cx, cy) => {
      fCtx.fillStyle = '#f8fafc';
      fCtx.beginPath();
      fCtx.ellipse(cx, cy, 22, 8, 0, 0, Math.PI * 2);
      fCtx.fill();

      fCtx.fillStyle = '#3b6e8c';
      fCtx.beginPath();
      fCtx.arc(cx, cy, 7.5, 0, Math.PI * 2);
      fCtx.fill();

      fCtx.fillStyle = '#0f172a';
      fCtx.beginPath();
      fCtx.arc(cx, cy, 4, 0, Math.PI * 2);
      fCtx.fill();

      fCtx.fillStyle = '#ffffff';
      fCtx.beginPath();
      fCtx.arc(cx - 2.5, cy - 2, 2.2, 0, Math.PI * 2);
      fCtx.fill();

      // Heavy upper & lower squint lids + crow's feet lines
      fCtx.strokeStyle = '#291d14';
      fCtx.lineWidth = 5;
      fCtx.beginPath();
      fCtx.moveTo(cx - 25, cy - 3);
      fCtx.lineTo(cx + 25, cy - 1);
      fCtx.stroke();

      fCtx.strokeStyle = 'rgba(120, 65, 38, 0.55)';
      fCtx.lineWidth = 3;
      fCtx.beginPath();
      fCtx.moveTo(cx - 22, cy + 7);
      fCtx.lineTo(cx + 22, cy + 6);
      fCtx.stroke();
    };
    drawSquintEye(206, 246);
    drawSquintEye(306, 246);

    // Stern, gritted-teeth asymmetrical Dirty Harry scowl ("Go ahead, make my day")
    fCtx.strokeStyle = '#7c3f28';
    fCtx.lineWidth = 6.5;
    fCtx.beginPath();
    fCtx.moveTo(216, 336);
    fCtx.quadraticCurveTo(256, 326, 298, 339);
    fCtx.stroke();

    const faceTex = new THREE.CanvasTexture(faceCanvas);
    faceTex.colorSpace = THREE.SRGBColorSpace;

    // Brown Herringbone Tweed Jacket + Knit Vest + Shirt & Burgundy Tie Texture
    const tweedCanvas = document.createElement('canvas');
    tweedCanvas.width = 512;
    tweedCanvas.height = 512;
    const tCtx = tweedCanvas.getContext('2d');

    tCtx.fillStyle = '#6b4c35';
    tCtx.fillRect(0, 0, 512, 512);

    // Subtle herringbone tweed weave
    tCtx.strokeStyle = 'rgba(45, 28, 16, 0.32)';
    tCtx.lineWidth = 2;
    for (let y = 0; y < 512; y += 12) {
      for (let x = 0; x < 512; x += 16) {
        tCtx.beginPath();
        tCtx.moveTo(x, y);
        tCtx.lineTo(x + 8, y + 6);
        tCtx.lineTo(x + 16, y);
        tCtx.stroke();
      }
    }

    // Center Dark Brown Knit Sweater Vest V-zone
    tCtx.fillStyle = '#3b2116';
    tCtx.beginPath();
    tCtx.moveTo(195, 0);
    tCtx.lineTo(317, 0);
    tCtx.lineTo(295, 420);
    tCtx.lineTo(217, 420);
    tCtx.closePath();
    tCtx.fill();

    // White Oxford shirt V-neck & Burgundy/Gold striped tie
    tCtx.fillStyle = '#f1f5f9';
    tCtx.beginPath();
    tCtx.moveTo(215, 0);
    tCtx.lineTo(297, 0);
    tCtx.lineTo(256, 220);
    tCtx.closePath();
    tCtx.fill();

    tCtx.fillStyle = '#7f1d1d';
    tCtx.beginPath();
    tCtx.moveTo(244, 24);
    tCtx.lineTo(268, 24);
    tCtx.lineTo(274, 330);
    tCtx.lineTo(256, 360);
    tCtx.lineTo(238, 330);
    tCtx.closePath();
    tCtx.fill();

    const tweedTex = new THREE.CanvasTexture(tweedCanvas);
    tweedTex.colorSpace = THREE.SRGBColorSpace;

    return { faceTex, tweedTex };
  }, []);
}

function CallaghanModel({ pose }) {
  const isDriving = pose === 'driving';
  const { faceTex, tweedTex } = useCallaghanTextures();

  return (
    <group position={[0, -0.72, 0]}>
      {/* ================= 1. HEAD & ICONIC 70s/80s CLINT EASTWOOD HAIR ================= */}
      <group position={[0, 1.65, 0]}>
        <mesh rotation={[0, -Math.PI / 2, 0]} castShadow>
          <sphereGeometry args={[0.255, 28, 24]} />
          <meshStandardMaterial map={faceTex} roughness={0.45} />
        </mesh>

        {/* Sharp chiseled Clint Eastwood nose */}
        <mesh position={[0, -0.015, 0.258]} rotation={[-0.1, 0, 0]} castShadow>
          <capsuleGeometry args={[0.021, 0.042, 8, 8]} />
          <meshStandardMaterial color="#dc9e76" roughness={0.48} />
        </mesh>

        {/* Ears */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.245, -0.01, -0.01]} scale={[0.45, 0.85, 0.55]} castShadow>
            <sphereGeometry args={[0.068, 12, 12]} />
            <meshStandardMaterial color="#dc9e76" roughness={0.5} />
          </mesh>
        ))}

        {/* Neck */}
        <mesh position={[0, -0.22, -0.02]}>
          <cylinderGeometry args={[0.088, 0.105, 0.16, 16]} />
          <meshStandardMaterial color="#dc9e76" roughness={0.5} />
        </mesh>

        {/* Iconic 1970s/80s Harry Callaghan Swept-Back Feathered Hair with High Receding Temples */}
        <group>
          {/* Central Tall Windswept Quiff (leaves left/right forehead temples exposed) */}
          <mesh position={[0, 0.20, 0.10]} rotation={[-0.3, 0, 0]} scale={[0.85, 0.65, 1.15]} castShadow>
            <sphereGeometry args={[0.16, 18, 16]} />
            <meshStandardMaterial color="#84725e" roughness={0.72} />
          </mesh>
          <mesh position={[0, 0.225, 0.01]} rotation={[-0.16, 0, 0]} scale={[1.05, 0.62, 1.15]} castShadow>
            <sphereGeometry args={[0.175, 18, 16]} />
            <meshStandardMaterial color="#786655" roughness={0.75} />
          </mesh>
          {/* Back Crown Volume */}
          <mesh position={[0, 0.06, -0.06]} scale={[1.05, 0.98, 1.05]} castShadow>
            <sphereGeometry args={[0.252, 20, 18]} />
            <meshStandardMaterial color="#6e5d4f" roughness={0.78} />
          </mesh>
          {/* Feathered 80s Swept-Back Side Wings Over Upper Ears + Sideburns */}
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.22, 0.03, -0.02]} rotation={[-0.15, s * -0.15, s * -0.16]} scale={[0.45, 0.78, 1.1]} castShadow>
                <sphereGeometry args={[0.13, 14, 14]} />
                <meshStandardMaterial color="#786655" roughness={0.76} />
              </mesh>
              <mesh position={[s * 0.228, -0.04, 0.07]} scale={[0.35, 0.85, 0.45]}>
                <sphereGeometry args={[0.075, 10, 10]} />
                <meshStandardMaterial color="#6e5d4f" roughness={0.78} />
              </mesh>
            </group>
          ))}
          {/* Long Feathered 80s Nape at Back of Neck */}
          <mesh position={[0, -0.13, -0.16]} rotation={[0.16, 0, 0]} scale={[1.2, 0.75, 0.55]} castShadow>
            <sphereGeometry args={[0.145, 16, 14]} />
            <meshStandardMaterial color="#655547" roughness={0.8} />
          </mesh>
        </group>
      </group>

      {/* ================= 2. TORSO, TWEED BLAZER & .44 MAGNUM ================= */}
      <group position={[0, 1.0, 0]}>
        <mesh position={[0, 0.16, 0]} scale={[1.16, 1, 0.82]} rotation={[0, -Math.PI / 2, 0]} castShadow>
          <cylinderGeometry args={[0.22, 0.175, 0.55, 24]} />
          <meshStandardMaterial map={tweedTex} roughness={0.68} />
        </mesh>

        {/* Tweed Blazer Notched Lapels */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.095, 0.27, 0.178]} rotation={[0.05, s * 0.12, s * -0.26]} castShadow>
            <boxGeometry args={[0.068, 0.28, 0.025]} />
            <meshStandardMaterial color="#593e2b" roughness={0.72} />
          </mesh>
        ))}

        {/* Leather Belt + Gold SFPD Inspector Shield Badge */}
        <mesh position={[0, -0.11, 0]} scale={[1.15, 1, 0.85]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.178, 0.032, 12, 24]} />
          <meshStandardMaterial color="#291811" roughness={0.5} />
        </mesh>
        <mesh position={[0.095, -0.11, 0.172]} castShadow>
          <octahedronGeometry args={[0.028, 1]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.88} roughness={0.2} />
        </mesh>

        {/* Left Arm */}
        <group position={[-0.29, 0.36, 0]} rotation={isDriving ? [-0.65, 0.2, 0.35] : [0.08, 0, 0.16]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <capsuleGeometry args={[0.065, 0.3, 12, 16]} />
            <meshStandardMaterial color="#6b4c35" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.37, 0]} castShadow>
            <sphereGeometry args={[0.062, 14, 14]} />
            <meshStandardMaterial color="#e5ad87" roughness={0.5} />
          </mesh>
        </group>

        {/* Right Arm + Iconic Smith & Wesson Model 29 .44 Magnum Revolver */}
        <group position={[0.29, 0.36, 0]} rotation={isDriving ? [-0.65, -0.2, -0.35] : [-0.58, -0.12, -0.18]}>
          <mesh position={[0, -0.18, 0]} castShadow>
            <capsuleGeometry args={[0.065, 0.3, 12, 16]} />
            <meshStandardMaterial color="#6b4c35" roughness={0.7} />
          </mesh>
          <mesh position={[0, -0.37, 0]} castShadow>
            <sphereGeometry args={[0.062, 14, 14]} />
            <meshStandardMaterial color="#e5ad87" roughness={0.5} />
          </mesh>
          {!isDriving && (
            <group position={[0, -0.39, 0.06]} rotation={[1.38, 0, 0]}>
              {/* Long 6.5-inch Heavy Blued-Steel Barrel + Top Rib */}
              <mesh position={[0, 0.04, 0.12]} castShadow>
                <boxGeometry args={[0.024, 0.036, 0.24]} />
                <meshStandardMaterial color="#1e293b" metalness={0.92} roughness={0.18} />
              </mesh>
              {/* Fluted 6-Shot Cylinder */}
              <mesh position={[0, 0.032, 0.02]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.026, 0.026, 0.056, 12]} />
                <meshStandardMaterial color="#0f172a" metalness={0.88} roughness={0.2} />
              </mesh>
              {/* Checkered Walnut Target Grip */}
              <mesh position={[0, -0.018, -0.015]} rotation={[0.28, 0, 0]}>
                <boxGeometry args={[0.026, 0.082, 0.04]} />
                <meshStandardMaterial color="#5c2d0c" roughness={0.55} />
              </mesh>
            </group>
          )}
        </group>
      </group>

      {/* ================= 3. CHARCOAL DRESS SLACKS & LEATHER SHOES ================= */}
      {!isDriving && (
        <group position={[0, 0.78, 0]}>
          <mesh position={[0, 0.02, 0]} scale={[1.1, 0.8, 0.85]}>
            <sphereGeometry args={[0.185, 16, 16]} />
            <meshStandardMaterial color="#334155" roughness={0.65} />
          </mesh>
          {[-1, 1].map((s) => (
            <group key={s}>
              <mesh position={[s * 0.11, -0.35, 0]} castShadow>
                <cylinderGeometry args={[0.082, 0.095, 0.72, 16]} />
                <meshStandardMaterial color="#334155" roughness={0.65} />
              </mesh>
              <mesh position={[s * 0.11, -0.72, 0.04]} scale={[0.85, 0.55, 1.35]} castShadow>
                <sphereGeometry args={[0.088, 14, 14]} />
                <meshStandardMaterial color="#291811" roughness={0.35} />
              </mesh>
            </group>
          ))}
        </group>
      )}
    </group>
  );
}

/**
 * 7. MARIA GRAZIA ("MG" — LA MOGLIE) — Warm Golden-Blonde Wavy Bob, Teal Cat-Eye Glasses, Coral-Red Lipstick, Gold Charm Necklace & Bronze/Taupe Blouse
 */
function MGModel({ pose }) {
  return (
    <group>
      <TorsoAndArms
        jacketColor="#9a7963"
        shirtColor="#f5cba7"
        handColor="#f5cba7"
        pantsColor="#27272a"
        beltColor="#451a03"
        buckleColor="#fbbf24"
        shoeColor="#991b1b"
        pose={pose}
      >
        {/* Satin Bronze-Taupe Draped Blouse Collar Folds */}
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.10, 0.50, 0.215]}
            rotation={[0.08, 0, s * -0.26]}
          >
            <boxGeometry args={[0.065, 0.28, 0.035]} />
            <meshStandardMaterial color="#8c6b56" roughness={0.42} flatShading />
          </mesh>
        ))}

        {/* Delicate Double Gold Necklace with 5 Little Charms on the Neckline (as in photo) */}
        <mesh position={[0, 0.65, 0.14]} rotation={[0.45, 0, 0]}>
          <torusGeometry args={[0.115, 0.007, 6, 18, Math.PI]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.88} roughness={0.18} />
        </mesh>
        {[-0.065, -0.032, 0, 0.032, 0.065].map((xOff, i) => (
          <mesh
            key={i}
            position={[xOff, 0.595 - (2 - Math.abs(i - 2)) * 0.01, 0.232]}
          >
            <octahedronGeometry args={[0.014, 0]} />
            <meshStandardMaterial color="#fef08a" metalness={0.92} roughness={0.12} />
          </mesh>
        ))}

        {/* Dark Shoulder Bag Strap on Left Shoulder (as in photo) */}
        <mesh position={[-0.145, 0.48, 0.215]} rotation={[0, 0, -0.16]}>
          <boxGeometry args={[0.028, 0.36, 0.032]} />
          <meshStandardMaterial color="#18181b" flatShading />
        </mesh>
      </TorsoAndArms>

      {/* Fair Warm Skin & Coral-Red Lipstick Smile */}
      <BaseHead
        skinColor="#f5cba7"
        eyeColor="#3b5968"
        lipColor="#e14132"
        showEars={false}
        smile
      />

      {/* Soft Warm Blonde Eyebrows */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.085, 1.095, 0.235]}
          rotation={[0, 0, s * -0.08]}
        >
          <boxGeometry args={[0.068, 0.013, 0.015]} />
          <meshStandardMaterial color="#b5945b" flatShading />
        </mesh>
      ))}

      {/* Small Gold/Silver Hoop Earrings */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.22, 0.94, 0.05]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.024, 0.006, 6, 10]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
        </mesh>
      ))}

      {/* Warm Golden-Blonde Wavy Shoulder-Length Bob (Biondiccia Mossa) */}
      {/* Top & Back Crown */}
      <mesh position={[0, 1.15, -0.03]}>
        <dodecahedronGeometry args={[0.278, 1]} />
        <meshStandardMaterial color="#dfc184" flatShading roughness={0.65} />
      </mesh>
      <mesh position={[0, 0.96, -0.14]}>
        <boxGeometry args={[0.42, 0.28, 0.16]} />
        <meshStandardMaterial color="#d8b878" flatShading roughness={0.68} />
      </mesh>
      {/* Side-Parted Soft Swept Bangs */}
      <mesh position={[-0.085, 1.205, 0.12]} rotation={[0.15, 0.1, 0.28]}>
        <boxGeometry args={[0.24, 0.10, 0.22]} />
        <meshStandardMaterial color="#e6ca90" flatShading roughness={0.62} />
      </mesh>
      <mesh position={[0.095, 1.195, 0.11]} rotation={[0.15, -0.1, -0.25]}>
        <boxGeometry args={[0.22, 0.10, 0.22]} />
        <meshStandardMaterial color="#e6ca90" flatShading roughness={0.62} />
      </mesh>
      {/* Wavy Shoulder-Length Side Locks */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.245, 1.00, 0.03]} rotation={[0, 0, s * -0.12]}>
            <dodecahedronGeometry args={[0.138, 1]} />
            <meshStandardMaterial color="#dfc184" flatShading roughness={0.65} />
          </mesh>
          <mesh position={[s * 0.255, 0.84, 0.05]} rotation={[0.08, 0, s * -0.18]}>
            <dodecahedronGeometry args={[0.120, 1]} />
            <meshStandardMaterial color="#d6b575" flatShading roughness={0.65} />
          </mesh>
          <mesh position={[s * 0.235, 0.72, 0.06]} rotation={[0.12, 0, s * -0.10]}>
            <dodecahedronGeometry args={[0.095, 1]} />
            <meshStandardMaterial color="#cda968" flatShading roughness={0.68} />
          </mesh>
        </group>
      ))}

      {/* Signature Dark Teal / Petrol-Green Rounded Cat-Eye Glasses with Side Temples */}
      <group position={[0, 1.055, 0.255]}>
        {/* Bridge */}
        <mesh position={[0, 0.012, 0]}>
          <boxGeometry args={[0.062, 0.016, 0.018]} />
          <meshStandardMaterial color="#1f4e4b" flatShading roughness={0.35} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.092, 0, 0]} rotation={[0, s * -0.06, s * 0.08]}>
            {/* Cat-eye Frame Rim */}
            <mesh>
              <torusGeometry args={[0.064, 0.011, 6, 14]} />
              <meshStandardMaterial color="#1f4e4b" flatShading roughness={0.32} />
            </mesh>
            {/* Outer Cat-Eye Corner Wing + Silver Rivet Dot */}
            <mesh position={[s * 0.058, 0.038, 0]} rotation={[0, 0, s * -0.4]}>
              <boxGeometry args={[0.034, 0.018, 0.018]} />
              <meshStandardMaterial color="#1f4e4b" flatShading />
            </mesh>
            <mesh position={[s * 0.062, 0.038, 0.01]}>
              <boxGeometry args={[0.008, 0.008, 0.006]} />
              <meshStandardMaterial color="#e2e8f0" metalness={0.8} roughness={0.2} />
            </mesh>
            {/* Eyeglass Side Temple Arm going back toward Ear */}
            <mesh position={[s * 0.068, 0.015, -0.09]} rotation={[0, 0, 0]}>
              <boxGeometry args={[0.010, 0.012, 0.18]} />
              <meshStandardMaterial color="#1f4e4b" flatShading />
            </mesh>
            {/* Subtle Blue-Reflex Eyeglass Lens */}
            <mesh position={[0, 0, 0.002]}>
              <circleGeometry args={[0.058, 14]} />
              <meshStandardMaterial
                color="#60a5fa"
                transparent
                opacity={0.22}
                metalness={0.65}
                roughness={0.08}
              />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
}

/**
 * Main Exported 3D Low-Poly Driver Component
 * @param {string} driverId - 'elvis' | 'tex' | 'bond' | 'spiderman' | 'diabolik' | 'callaghan' | 'mg'
 * @param {'preview' | 'driving'} pose - 'preview' (character select screen) or 'driving' (seated in GTV)
 */
export function DriverCharacter3D({ driverId = 'elvis', pose = 'preview' }) {
  const rootRef = useRef();

  useFrame((state, delta) => {
    if (!rootRef.current) return;
    if (pose === 'preview') {
      // Smooth heroic idle sway & breathing on the full-screen 3D Showcase Podium
      const t = state.clock.elapsedTime;
      rootRef.current.rotation.y = Math.sin(t * 0.75) * 0.38;
      rootRef.current.position.y = 0.90 + Math.sin(t * 2.1) * 0.014;
    } else if (pose === 'driving') {
      // Reactive head/body lean during lane changes and oil slick skids
      const roll = driveStore.carRoll || 0;
      const skid = driveStore.skidTimer || 0;
      const skidShake = skid > 0 ? Math.sin(state.clock.elapsedTime * 28.0) * 0.16 : 0;
      rootRef.current.rotation.z = THREE.MathUtils.lerp(
        rootRef.current.rotation.z,
        roll * 1.4 + skidShake,
        Math.min(1, delta * 10)
      );
    }
  });

  const renderCharacter = () => {
    switch (driverId) {
      case 'tex':
        return <TexModel pose={pose} />;
      case 'bond':
        return <BondModel pose={pose} />;
      case 'spiderman':
        return <SpidermanModel pose={pose} />;
      case 'diabolik':
        return <DiabolikModel pose={pose} />;
      case 'callaghan':
        return <CallaghanModel pose={pose} />;
      case 'mg':
        return <MGModel pose={pose} />;
      case 'elvis':
      default:
        return <ElvisModel pose={pose} />;
    }
  };

  if (pose === 'driving') {
    // Seated in the front-left driver's bucket seat of the Alfetta GTV (CAD coords: x=0.135, y=0.048, z=+0.148)
    // Rotated -90° around Y so character local +Z faces -X (toward the steering wheel and windshield)
    return (
      <group position={[0.135, 0.048, 0.148]} rotation={[0, -Math.PI / 2, 0]} scale={0.145}>
        <group ref={rootRef}>{renderCharacter()}</group>
      </group>
    );
  }

  return (
    <group ref={rootRef} position={[0, 0.90, 0]} scale={1.0}>
      {renderCharacter()}
    </group>
  );
}
export default DriverCharacter3D;
