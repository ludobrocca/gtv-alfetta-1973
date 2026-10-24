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
 * 1. ELVIS PRESLEY — Pompadour, Gold Aviators, White Vegas Jumpsuit with High Collar
 */
function ElvisModel({ pose }) {
  return (
    <group>
      <TorsoAndArms
        jacketColor="#f8fafc"
        shirtColor="#e11d48"
        handColor="#f1c29b"
        pantsColor="#f8fafc"
        beltColor="#fbbf24"
        buckleColor="#f59e0b"
        shoeColor="#f8fafc"
        flareLegs
        pose={pose}
      >
        {/* High Vegas Popped Collar */}
        <mesh position={[0, 0.72, -0.04]} rotation={[0.15, 0, 0]}>
          <cylinderGeometry args={[0.19, 0.16, 0.16, 7, 1, true, Math.PI * 0.25, Math.PI * 1.5]} />
          <meshStandardMaterial color="#ffffff" side={THREE.DoubleSide} flatShading />
        </mesh>
        {/* Gold Studded Lapels & Belt */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.10, 0.50, 0.23]} rotation={[0, 0, s * -0.25]}>
            <boxGeometry args={[0.045, 0.28, 0.03]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.7} roughness={0.3} flatShading />
          </mesh>
        ))}
      </TorsoAndArms>

      <BaseHead skinColor="#f1c29b" smile />

      {/* Jet-Black Pompadour Hair & Sideburns */}
      <mesh position={[0, 1.24, 0.10]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.36, 0.22, 0.38]} />
        <meshStandardMaterial color="#0f172a" flatShading roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.08, -0.08]}>
        <dodecahedronGeometry args={[0.26, 1]} />
        <meshStandardMaterial color="#0f172a" flatShading roughness={0.8} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.22, 0.99, 0.09]}>
          <boxGeometry args={[0.055, 0.18, 0.09]} />
          <meshStandardMaterial color="#0f172a" flatShading />
        </mesh>
      ))}

      {/* Gold Aviator Sunglasses */}
      <mesh position={[0, 1.06, 0.25]}>
        <boxGeometry args={[0.32, 0.02, 0.02]} />
        <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.09, 1.045, 0.25]}>
          <boxGeometry args={[0.11, 0.075, 0.025]} />
          <meshStandardMaterial color="#451a03" metalness={0.5} roughness={0.2} flatShading />
        </mesh>
      ))}
    </group>
  );
}

/**
 * 2. TEX WILLER — Yellow Ranger Shirt, Black Bandana, Tan Stetson Cowboy Hat
 */
function TexModel({ pose }) {
  return (
    <group>
      <TorsoAndArms
        jacketColor="#eab308"
        shirtColor="#ca8a04"
        handColor="#e6b08a"
        pantsColor="#1e3a8a"
        beltColor="#451a03"
        buckleColor="#cbd5e1"
        shoeColor="#5c2d0c"
        pose={pose}
      >
        {/* Black Neck Bandana & Knot */}
        <mesh position={[0, 0.67, 0.04]} rotation={[0.12, 0, 0]}>
          <cylinderGeometry args={[0.17, 0.21, 0.11, 7]} />
          <meshStandardMaterial color="#111827" flatShading roughness={0.85} />
        </mesh>
        <mesh position={[0, 0.56, 0.22]} rotation={[0.2, 0, Math.PI]}>
          <coneGeometry args={[0.11, 0.18, 4]} />
          <meshStandardMaterial color="#111827" flatShading roughness={0.85} />
        </mesh>
      </TorsoAndArms>

      <BaseHead skinColor="#e6b08a" eyeColor="#1e3a8a" />

      {/* Brown Hair under Hat */}
      <mesh position={[0, 1.08, -0.05]}>
        <dodecahedronGeometry args={[0.25, 1]} />
        <meshStandardMaterial color="#451a03" flatShading />
      </mesh>

      {/* Iconic Stetson Cowboy Hat */}
      <group position={[0, 1.21, 0.01]} rotation={[-0.08, 0, 0]}>
        {/* Curved Wide Brim */}
        <mesh scale={[1.15, 0.22, 1.25]}>
          <cylinderGeometry args={[0.42, 0.44, 0.14, 10]} />
          <meshStandardMaterial color="#d6b88a" flatShading roughness={0.75} />
        </mesh>
        {/* Crown */}
        <mesh position={[0, 0.12, 0]}>
          <cylinderGeometry args={[0.20, 0.25, 0.22, 8]} />
          <meshStandardMaterial color="#d6b88a" flatShading roughness={0.75} />
        </mesh>
        {/* Leather Hatband */}
        <mesh position={[0, 0.03, 0]}>
          <cylinderGeometry args={[0.245, 0.252, 0.04, 8]} />
          <meshStandardMaterial color="#451a03" flatShading />
        </mesh>
      </group>
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
 * 4. L'UOMO RAGNO (SPIDER-MAN) — Authentic Web-Patterned Red & Royal-Blue Suit,
 * 8-Legged Black Chest Spider Emblem, Radial Webbed Mask & Classic Curved White Eyes
 */
function SpidermanModel({ pose }) {
  const { suitWebTex, maskWebTex } = useSpidermanTextures();

  return (
    <group>
      <TorsoAndArms
        jacketColor="#d91c24"
        jacketMap={suitWebTex}
        shirtColor="#d91c24"
        handColor="#d91c24"
        pantsColor="#154296"
        calfColor="#d91c24"
        calfMap={suitWebTex}
        beltColor="#d91c24"
        buckleColor="#d91c24"
        shoeColor="#d91c24"
        pose={pose}
      >
        {/* Classic Royal-Blue Lateral Rib / Lat Panels on Left & Right Torso */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.185, 0.34, 0.01]}>
            <cylinderGeometry args={[0.095, 0.085, 0.44, 6]} />
            <meshStandardMaterial color="#154296" flatShading roughness={0.55} />
          </mesh>
        ))}

        {/* Authentic 8-Legged Black Spider Emblem on Center of Chest */}
        <group position={[0, 0.50, 0.238]} rotation={[0.08, 0, 0]}>
          {/* Spider Abdomen & Head */}
          <mesh position={[0, -0.018, 0]}>
            <dodecahedronGeometry args={[0.032, 0]} />
            <meshStandardMaterial color="#090d16" flatShading />
          </mesh>
          <mesh position={[0, 0.024, 0]}>
            <dodecahedronGeometry args={[0.020, 0]} />
            <meshStandardMaterial color="#090d16" flatShading />
          </mesh>
          {/* 8 Angled Spider Legs (4 per side) */}
          {[-1, 1].map((s) =>
            [-0.45, -0.15, 0.20, 0.55].map((ang, idx) => (
              <mesh
                key={`${s}_${idx}`}
                position={[s * 0.045, (idx - 1.5) * 0.022, 0]}
                rotation={[0, 0, s * ang]}
              >
                <boxGeometry args={[0.075, 0.009, 0.012]} />
                <meshStandardMaterial color="#090d16" flatShading />
              </mesh>
            ))
          )}
        </group>
      </TorsoAndArms>

      {/* Red Webbed Neck & Mask with Radial Black Webbing */}
      <mesh position={[0, 0.76, 0]}>
        <cylinderGeometry args={[0.11, 0.13, 0.18, 8]} />
        <meshStandardMaterial map={suitWebTex} roughness={0.55} />
      </mesh>
      <mesh position={[0, 1.03, 0.02]} rotation={[0, Math.PI * 0.5, 0]}>
        <dodecahedronGeometry args={[0.258, 2]} />
        <meshStandardMaterial map={maskWebTex} roughness={0.5} />
      </mesh>

      {/* Iconic Marvel Angular White Eye Lenses with Thick Jet-Black Borders */}
      {[-1, 1].map((s) => (
        <group
          key={s}
          position={[s * 0.095, 1.055, 0.232]}
          rotation={[0, s * 0.24, s * 0.28]}
        >
          <mesh>
            <boxGeometry args={[0.132, 0.088, 0.024]} />
            <meshStandardMaterial color="#090d16" flatShading />
          </mesh>
          <mesh position={[0, 0, 0.009]}>
            <boxGeometry args={[0.100, 0.058, 0.018]} />
            <meshStandardMaterial
              color="#ffffff"
              emissive="#ffffff"
              emissiveIntensity={0.22}
              flatShading
            />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * 5. DIABOLIK — Sleek Form-Fitting Black Mask & Catsuit, Utility Belt with Throwing Daggers,
 * Fierce V-Cut Eye Opening with Arched Eyebrows & Stolen Blue Diamond
 */
function DiabolikModel({ pose }) {
  return (
    <group>
      <TorsoAndArms
        jacketColor="#0a0d14"
        shirtColor="#090d16"
        handColor="#0a0d14"
        pantsColor="#0a0d14"
        beltColor="#18181b"
        buckleColor="#fbbf24"
        shoeColor="#090d16"
        pose={pose}
      >
        {/* High Sculpted Black Turtleneck Collar */}
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.135, 0.15, 0.17, 8]} />
          <meshStandardMaterial color="#090d16" flatShading roughness={0.5} />
        </mesh>

        {/* Pectoral / Shoulder Stealth Suit Seam Lines */}
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.11, 0.50, 0.215]}
            rotation={[0, 0, s * -0.22]}
          >
            <boxGeometry args={[0.025, 0.26, 0.02]} />
            <meshStandardMaterial color="#1e293b" flatShading roughness={0.35} />
          </mesh>
        ))}

        {/* Silver Throwing Daggers Holstered on Utility Belt + Stolen Diamond in Showcase */}
        {pose === 'preview' && (
          <>
            {[-1, 1].map((s) => (
              <mesh
                key={s}
                position={[s * 0.18, 0.06, 0.16]}
                rotation={[0, 0, s * 0.25]}
              >
                <coneGeometry args={[0.016, 0.11, 4]} />
                <meshStandardMaterial color="#e2e8f0" metalness={0.9} roughness={0.15} />
              </mesh>
            ))}
            {/* Sparkling Stolen Blue Diamond in Left Hand */}
            <mesh position={[0.36, 0.14, 0.16]} rotation={[0.3, 0.4, 0]}>
              <octahedronGeometry args={[0.075, 0]} />
              <meshStandardMaterial
                color="#38bdf8"
                emissive="#0284c7"
                emissiveIntensity={0.45}
                metalness={0.3}
                roughness={0.08}
                flatShading
              />
            </mesh>
          </>
        )}
      </TorsoAndArms>

      {/* Sleek Black Masked Head */}
      <mesh position={[0, 1.03, 0.02]}>
        <dodecahedronGeometry args={[0.255, 1]} />
        <meshStandardMaterial color="#0a0d14" flatShading roughness={0.45} />
      </mesh>

      {/* Iconic Horizontal Skin Cutout Across Eyes + Mask V-Peak & Fierce Arched Eyebrows */}
      <mesh position={[0, 1.06, 0.215]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[0.265, 0.095, 0.062]} />
        <meshStandardMaterial color="#f1c29b" flatShading roughness={0.7} />
      </mesh>
      <mesh position={[0, 1.105, 0.246]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.052, 0.072, 3]} />
        <meshStandardMaterial color="#0a0d14" flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.082, 1.055, 0.242]}>
          <mesh>
            <boxGeometry args={[0.060, 0.032, 0.015]} />
            <meshStandardMaterial color="#ffffff" flatShading />
          </mesh>
          <mesh position={[0, 0, 0.008]}>
            <boxGeometry args={[0.026, 0.026, 0.012]} />
            <meshStandardMaterial color="#38bdf8" flatShading />
          </mesh>
          <mesh position={[0, 0.030, 0.007]} rotation={[0, 0, s * 0.30]}>
            <boxGeometry args={[0.082, 0.018, 0.015]} />
            <meshStandardMaterial color="#090d16" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * 6. ISPETTORE CALLAGHAN (CLINT EASTWOOD / DIRTY HARRY) — Iconic 70s/80s Swept-Back Feathered Hair
 * with High Receding Temples, Stern Squint, Tweed Blazer, Knit Vest, Burgundy Tie & .44 Magnum
 */
function CallaghanModel({ pose }) {
  return (
    <group>
      <TorsoAndArms
        jacketColor="#6b4c35"
        shirtColor="#e2e8f0"
        handColor="#e6b08a"
        pantsColor="#334155"
        beltColor="#291811"
        buckleColor="#d97706"
        shoeColor="#291811"
        pose={pose}
      >
        {/* Knit Sweater Vest (Gilet sotto la giacca in tweed) */}
        <mesh position={[0, 0.44, 0.205]} rotation={[0.08, 0, 0]}>
          <boxGeometry args={[0.17, 0.28, 0.05]} />
          <meshStandardMaterial color="#3f2318" flatShading roughness={0.8} />
        </mesh>

        {/* Herringbone Tweed Notched Lapels (Revers della giacca sportiva) */}
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.105, 0.49, 0.225]}
            rotation={[0.06, s * 0.12, s * -0.26]}
          >
            <boxGeometry args={[0.068, 0.34, 0.035]} />
            <meshStandardMaterial color="#593e2b" flatShading roughness={0.75} />
          </mesh>
        ))}

        {/* Shirt Collar & Classic Burgundy/Brown Striped Tie */}
        {[-1, 1].map((s) => (
          <mesh
            key={s}
            position={[s * 0.048, 0.665, 0.21]}
            rotation={[0.2, 0, s * -0.4]}
          >
            <boxGeometry args={[0.07, 0.048, 0.025]} />
            <meshStandardMaterial color="#f1f5f9" flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.50, 0.238]}>
          <boxGeometry args={[0.044, 0.28, 0.025]} />
          <meshStandardMaterial color="#7f1d1d" flatShading />
        </mesh>

        {/* SFPD Inspector Gold Shield Badge on Belt + Long-Barreled .44 Magnum in Right Hand */}
        {pose === 'preview' && (
          <>
            <mesh position={[0.12, 0.065, 0.225]}>
              <octahedronGeometry args={[0.028, 0]} />
              <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
            </mesh>
            {/* Iconic Smith & Wesson Model 29 .44 Magnum Revolver */}
            <group position={[-0.36, 0.14, 0.22]} rotation={[0.25, 0, 0]}>
              {/* Long 6.5-inch Heavy Barrel */}
              <mesh position={[0, 0.045, 0.11]}>
                <boxGeometry args={[0.026, 0.038, 0.24]} />
                <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.18} />
              </mesh>
              {/* Revolver Cylinder */}
              <mesh position={[0, 0.035, 0.02]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.026, 0.026, 0.055, 8]} />
                <meshStandardMaterial color="#0f172a" metalness={0.85} roughness={0.2} />
              </mesh>
              {/* Walnut Wood Grip */}
              <mesh position={[0, -0.015, -0.01]} rotation={[0.3, 0, 0]}>
                <boxGeometry args={[0.026, 0.08, 0.04]} />
                <meshStandardMaterial color="#5c2d0c" roughness={0.6} />
              </mesh>
            </group>
          </>
        )}
      </TorsoAndArms>

      <BaseHead skinColor="#e6b08a" eyeColor="#334155" squint />

      {/* Iconic 1970s/80s Clint Eastwood / Harry Callaghan Hairstyle:
          High Receding Temples + Tall Swept-Back Layered Quiff on Center Crown + Feathered Sides & Nape */}
      {/* Central Tall Windswept Quiff (leaving left/right forehead temples high & exposed) */}
      <mesh position={[0, 1.255, 0.11]} rotation={[-0.32, 0, 0]}>
        <boxGeometry args={[0.19, 0.13, 0.26]} />
        <meshStandardMaterial color="#84725e" flatShading roughness={0.78} />
      </mesh>
      <mesh position={[0, 1.285, 0.02]} rotation={[-0.18, 0, 0]}>
        <boxGeometry args={[0.23, 0.11, 0.26]} />
        <meshStandardMaterial color="#786655" flatShading roughness={0.78} />
      </mesh>
      {/* Back Crown Volume */}
      <mesh position={[0, 1.13, -0.07]}>
        <dodecahedronGeometry args={[0.25, 1]} />
        <meshStandardMaterial color="#6e5d4f" flatShading roughness={0.8} />
      </mesh>
      {/* Feathered 80s Swept-Back Side Wings Over Upper Ears + Sideburns */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh
            position={[s * 0.225, 1.09, -0.02]}
            rotation={[-0.15, s * -0.15, s * -0.18]}
          >
            <boxGeometry args={[0.08, 0.16, 0.26]} />
            <meshStandardMaterial color="#786655" flatShading roughness={0.78} />
          </mesh>
          {/* Classic 70s/80s Sideburns */}
          <mesh position={[s * 0.225, 0.99, 0.08]}>
            <boxGeometry args={[0.048, 0.12, 0.065]} />
            <meshStandardMaterial color="#6e5d4f" flatShading />
          </mesh>
        </group>
      ))}
      {/* Long Feathered 80s Nape at Back of Neck */}
      <mesh position={[0, 0.92, -0.15]} rotation={[0.15, 0, 0]}>
        <boxGeometry args={[0.28, 0.16, 0.10]} />
        <meshStandardMaterial color="#655547" flatShading roughness={0.8} />
      </mesh>

      {/* Deeply Furrowed Clint Eastwood Brow & Cheekbone Lines */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * 0.085, 1.088, 0.242]}
          rotation={[0, 0, s * 0.16]}
        >
          <boxGeometry args={[0.082, 0.020, 0.022]} />
          <meshStandardMaterial color="#4e4035" flatShading />
        </mesh>
      ))}
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
