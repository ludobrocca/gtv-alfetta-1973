import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { driveStore } from './driveStore';

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
  shirtColor = '#f8fafc',
  handColor = '#f1c29b',
  pantsColor = '#1e293b',
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
        <meshStandardMaterial color={jacketColor} flatShading roughness={0.68} />
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
            <meshStandardMaterial color={jacketColor} flatShading roughness={0.7} />
          </mesh>
          {/* Hand */}
          <mesh position={[0, -0.50, isDriving ? 0.22 : 0.07]}>
            <dodecahedronGeometry args={[0.068, 0]} />
            <meshStandardMaterial color={handColor} flatShading roughness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Full-Body Lower Half (Belt, Hips, Legs & Boots) in Showcase Preview */}
      {!isDriving && (
        <group>
          {/* Belt & Buckle */}
          <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.225, 0.23, 0.07, 8]} />
            <meshStandardMaterial color={beltColor} flatShading roughness={0.5} />
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
                <meshStandardMaterial color={pantsColor} flatShading roughness={0.72} />
              </mesh>
              {/* Boot / Shoe */}
              <mesh position={[0, -0.75, 0.04]} castShadow>
                <boxGeometry args={[0.11, 0.09, 0.21]} />
                <meshStandardMaterial color={shoeColor} flatShading roughness={0.45} />
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
 * 3. JAMES BOND (007) — Black Tuxedo, Crisp White Dress Shirt, Black Bow Tie
 */
function BondModel({ pose }) {
  return (
    <group>
      <TorsoAndArms
        jacketColor="#0f172a"
        shirtColor="#ffffff"
        handColor="#f1c29b"
        pose={pose}
      >
        {/* Satin Tuxedo Lapels */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.09, 0.51, 0.22]} rotation={[0, 0, s * -0.28]}>
            <boxGeometry args={[0.05, 0.26, 0.03]} />
            <meshStandardMaterial color="#1e293b" roughness={0.35} flatShading />
          </mesh>
        ))}
        {/* Classic Black Bow Tie */}
        <group position={[0, 0.64, 0.23]}>
          <mesh position={[-0.035, 0, 0]} rotation={[0, 0, -Math.PI / 2]}>
            <coneGeometry args={[0.028, 0.06, 4]} />
            <meshStandardMaterial color="#090d16" flatShading />
          </mesh>
          <mesh position={[0.035, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <coneGeometry args={[0.028, 0.06, 4]} />
            <meshStandardMaterial color="#090d16" flatShading />
          </mesh>
          <mesh>
            <boxGeometry args={[0.022, 0.022, 0.022]} />
            <meshStandardMaterial color="#090d16" flatShading />
          </mesh>
        </group>
        {/* White Pocket Square */}
        <mesh position={[-0.14, 0.52, 0.22]}>
          <boxGeometry args={[0.05, 0.03, 0.02]} />
          <meshStandardMaterial color="#ffffff" flatShading />
        </mesh>
      </TorsoAndArms>

      <BaseHead skinColor="#f1c29b" eyeColor="#2563eb" smile />

      {/* Combed Side-Parted Dark Brown Hair */}
      <mesh position={[0, 1.15, 0.0]}>
        <dodecahedronGeometry args={[0.255, 1]} />
        <meshStandardMaterial color="#271c19" flatShading roughness={0.65} />
      </mesh>
      <mesh position={[0.06, 1.23, 0.12]} rotation={[0.1, 0, -0.15]}>
        <boxGeometry args={[0.28, 0.10, 0.24]} />
        <meshStandardMaterial color="#271c19" flatShading roughness={0.65} />
      </mesh>
    </group>
  );
}

/**
 * 4. L'UOMO RAGNO (SPIDER-MAN) — Red & Blue Suit, Wedge White Eyes, Black Web Lines
 */
function SpidermanModel({ pose }) {
  return (
    <group>
      <TorsoAndArms
        jacketColor="#dc2626"
        shirtColor="#1d4ed8"
        handColor="#dc2626"
        pantsColor="#1d4ed8"
        beltColor="#dc2626"
        buckleColor="#dc2626"
        shoeColor="#dc2626"
        pose={pose}
      >
        {/* Blue Spider-Suit Side Panels */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.18, 0.36, 0.06]}>
            <boxGeometry args={[0.12, 0.42, 0.30]} />
            <meshStandardMaterial color="#1d4ed8" flatShading roughness={0.6} />
          </mesh>
        ))}
        {/* Black Spider Emblem on Chest */}
        <mesh position={[0, 0.52, 0.24]}>
          <octahedronGeometry args={[0.055, 0]} />
          <meshStandardMaterial color="#090d16" flatShading />
        </mesh>
      </TorsoAndArms>

      {/* Red Masked Head & Neck */}
      <mesh position={[0, 0.76, 0]}>
        <cylinderGeometry args={[0.11, 0.13, 0.18, 7]} />
        <meshStandardMaterial color="#dc2626" flatShading roughness={0.6} />
      </mesh>
      <mesh position={[0, 1.03, 0.02]}>
        <dodecahedronGeometry args={[0.255, 1]} />
        <meshStandardMaterial color="#dc2626" flatShading roughness={0.55} />
      </mesh>
      {/* Subtle Webbing Ridge Lines */}
      <mesh position={[0, 1.03, 0.02]} scale={1.015}>
        <dodecahedronGeometry args={[0.255, 1]} />
        <meshStandardMaterial color="#111827" wireframe transparent opacity={0.45} />
      </mesh>

      {/* Iconic Angular White Eye Lenses with Thick Black Borders */}
      {[-1, 1].map((s) => (
        <group
          key={s}
          position={[s * 0.095, 1.05, 0.225]}
          rotation={[0, s * 0.22, s * 0.28]}
        >
          <mesh>
            <boxGeometry args={[0.125, 0.082, 0.022]} />
            <meshStandardMaterial color="#090d16" flatShading />
          </mesh>
          <mesh position={[0, 0, 0.008]}>
            <boxGeometry args={[0.095, 0.054, 0.018]} />
            <meshStandardMaterial color="#f8fafc" emissive="#ffffff" emissiveIntensity={0.18} flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * 5. DIABOLIK — Sleek All-Black Mask & Catsuit with Sharp Eye Cutout & Arched Eyebrows
 */
function DiabolikModel({ pose }) {
  return (
    <group>
      <TorsoAndArms
        jacketColor="#0a0d14"
        shirtColor="#111827"
        handColor="#0a0d14"
        pantsColor="#0a0d14"
        beltColor="#18181b"
        buckleColor="#fbbf24"
        shoeColor="#090d16"
        pose={pose}
      >
        {/* High Black Turtleneck Collar */}
        <mesh position={[0, 0.72, 0]}>
          <cylinderGeometry args={[0.135, 0.15, 0.16, 8]} />
          <meshStandardMaterial color="#090d16" flatShading roughness={0.6} />
        </mesh>
      </TorsoAndArms>

      {/* Black Masked Head */}
      <mesh position={[0, 1.03, 0.02]}>
        <dodecahedronGeometry args={[0.255, 1]} />
        <meshStandardMaterial color="#0a0d14" flatShading roughness={0.5} />
      </mesh>

      {/* Exposed Skin Bridge Across Eyes + Ice-Blue Eyes & Sharp Black Eyebrows */}
      <mesh position={[0, 1.06, 0.215]} rotation={[0.05, 0, 0]}>
        <boxGeometry args={[0.26, 0.095, 0.06]} />
        <meshStandardMaterial color="#f1c29b" flatShading roughness={0.7} />
      </mesh>
      {/* Mask V-Peak Between Eyebrows */}
      <mesh position={[0, 1.10, 0.245]} rotation={[0, 0, Math.PI]}>
        <coneGeometry args={[0.045, 0.065, 3]} />
        <meshStandardMaterial color="#0a0d14" flatShading />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s} position={[s * 0.082, 1.055, 0.24]}>
          {/* Piercing Eyes */}
          <mesh>
            <boxGeometry args={[0.058, 0.032, 0.015]} />
            <meshStandardMaterial color="#ffffff" flatShading />
          </mesh>
          <mesh position={[0, 0, 0.008]}>
            <boxGeometry args={[0.026, 0.026, 0.012]} />
            <meshStandardMaterial color="#38bdf8" flatShading />
          </mesh>
          {/* Fierce Angled Eyebrow */}
          <mesh position={[0, 0.028, 0.006]} rotation={[0, 0, s * 0.28]}>
            <boxGeometry args={[0.075, 0.016, 0.014]} />
            <meshStandardMaterial color="#090d16" flatShading />
          </mesh>
        </group>
      ))}
    </group>
  );
}

/**
 * 6. ISPETTORE CALLAGHAN (CLINT EASTWOOD / DIRTY HARRY) — Brown Herringbone Blazer, Burgundy Tie, Swept Hair & Squint
 */
function CallaghanModel({ pose }) {
  return (
    <group>
      <TorsoAndArms
        jacketColor="#5c4033"
        shirtColor="#e5e7eb"
        handColor="#e6b08a"
        pantsColor="#374151"
        beltColor="#291811"
        buckleColor="#d97706"
        shoeColor="#291811"
        pose={pose}
      >
        {/* Sweater Vest Trim & Burgundy Tie */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.09, 0.50, 0.22]} rotation={[0, 0, s * -0.24]}>
            <boxGeometry args={[0.055, 0.28, 0.03]} />
            <meshStandardMaterial color="#4a3328" flatShading />
          </mesh>
        ))}
        <mesh position={[0, 0.49, 0.235]}>
          <boxGeometry args={[0.042, 0.24, 0.025]} />
          <meshStandardMaterial color="#7f1d1d" flatShading />
        </mesh>
      </TorsoAndArms>

      <BaseHead skinColor="#e6b08a" eyeColor="#334155" squint />

      {/* Swept-Back Sandy/Ash-Brown Tall Hair */}
      <mesh position={[0, 1.18, -0.01]}>
        <dodecahedronGeometry args={[0.26, 1]} />
        <meshStandardMaterial color="#6b5b4d" flatShading roughness={0.8} />
      </mesh>
      <mesh position={[0, 1.24, 0.08]} rotation={[-0.22, 0, 0]}>
        <boxGeometry args={[0.32, 0.14, 0.26]} />
        <meshStandardMaterial color="#786657" flatShading roughness={0.8} />
      </mesh>
      {/* Furrowed Brow */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.085, 1.085, 0.24]} rotation={[0, 0, s * 0.14]}>
          <boxGeometry args={[0.075, 0.018, 0.02]} />
          <meshStandardMaterial color="#57483c" flatShading />
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
        jacketColor="#8c6d58"
        shirtColor="#a3826c"
        handColor="#f5cba7"
        pantsColor="#27272a"
        beltColor="#451a03"
        buckleColor="#fbbf24"
        shoeColor="#991b1b"
        pose={pose}
      >
        {/* Delicate Gold Necklace with Little Charms */}
        <mesh position={[0, 0.65, 0.14]} rotation={[0.45, 0, 0]}>
          <torusGeometry args={[0.115, 0.008, 6, 16, Math.PI]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.85} roughness={0.2} />
        </mesh>
        {[-0.05, 0, 0.05].map((xOff, i) => (
          <mesh key={i} position={[xOff, 0.59 - (i === 1 ? 0.015 : 0), 0.23]}>
            <octahedronGeometry args={[0.016, 0]} />
            <meshStandardMaterial color="#fef08a" metalness={0.9} roughness={0.15} />
          </mesh>
        ))}
        {/* Dark Shoulder Bag Strap on Left Shoulder (as in photo) */}
        <mesh position={[-0.14, 0.52, 0.21]} rotation={[0, 0, -0.18]}>
          <boxGeometry args={[0.028, 0.30, 0.03]} />
          <meshStandardMaterial color="#1f2937" flatShading />
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

      {/* Small Hoop Earrings */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.22, 0.94, 0.05]} rotation={[0, Math.PI / 2, 0]}>
          <torusGeometry args={[0.024, 0.006, 6, 10]} />
          <meshStandardMaterial color="#fbbf24" metalness={0.8} roughness={0.2} />
        </mesh>
      ))}

      {/* Warm Golden-Blonde Wavy Shoulder-Length Hair (Biondiccia) */}
      {/* Top & Back Crown */}
      <mesh position={[0, 1.15, -0.03]}>
        <dodecahedronGeometry args={[0.275, 1]} />
        <meshStandardMaterial color="#dfc184" flatShading roughness={0.68} />
      </mesh>
      {/* Side-Parted Soft Swept Bangs */}
      <mesh position={[-0.08, 1.20, 0.12]} rotation={[0.15, 0.1, 0.28]}>
        <boxGeometry args={[0.24, 0.10, 0.22]} />
        <meshStandardMaterial color="#e6ca90" flatShading roughness={0.65} />
      </mesh>
      <mesh position={[0.09, 1.19, 0.11]} rotation={[0.15, -0.1, -0.25]}>
        <boxGeometry args={[0.22, 0.10, 0.22]} />
        <meshStandardMaterial color="#e6ca90" flatShading roughness={0.65} />
      </mesh>
      {/* Wavy Shoulder-Length Side Locks */}
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.24, 0.98, 0.03]} rotation={[0, 0, s * -0.12]}>
            <dodecahedronGeometry args={[0.135, 1]} />
            <meshStandardMaterial color="#dfc184" flatShading roughness={0.68} />
          </mesh>
          <mesh position={[s * 0.25, 0.82, 0.05]} rotation={[0.08, 0, s * -0.18]}>
            <dodecahedronGeometry args={[0.115, 1]} />
            <meshStandardMaterial color="#d6b575" flatShading roughness={0.68} />
          </mesh>
        </group>
      ))}

      {/* Signature Dark Teal / Petrol-Green Rounded Cat-Eye Glasses */}
      <group position={[0, 1.055, 0.255]}>
        {/* Bridge */}
        <mesh position={[0, 0.01, 0]}>
          <boxGeometry args={[0.06, 0.016, 0.018]} />
          <meshStandardMaterial color="#1f4e4b" flatShading roughness={0.4} />
        </mesh>
        {[-1, 1].map((s) => (
          <group key={s} position={[s * 0.092, 0, 0]} rotation={[0, s * -0.06, s * 0.08]}>
            {/* Cat-eye Frame Rim */}
            <mesh>
              <torusGeometry args={[0.062, 0.010, 6, 12]} />
              <meshStandardMaterial color="#1f4e4b" flatShading roughness={0.35} />
            </mesh>
            {/* Outer Cat-Eye Corner Wing */}
            <mesh position={[s * 0.055, 0.038, 0]} rotation={[0, 0, s * -0.4]}>
              <boxGeometry args={[0.032, 0.016, 0.016]} />
              <meshStandardMaterial color="#1f4e4b" flatShading />
            </mesh>
            {/* Subtle Blue-Reflex Eyeglass Lens */}
            <mesh position={[0, 0, 0.002]}>
              <circleGeometry args={[0.056, 12]} />
              <meshStandardMaterial
                color="#60a5fa"
                transparent
                opacity={0.24}
                metalness={0.6}
                roughness={0.1}
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
