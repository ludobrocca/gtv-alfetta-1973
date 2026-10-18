// 3-Lane Endless Alpine Highway & Arcade Runner Entities
// Clean road geometry with zero clipping hills, 3 lanes (-1, 0, 1),
// procedural Fiat 500s, barriers, oil slicks, Tex Willer hats, Elvis vinyls, and gold coins.

import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { driveStore } from './driveStore';

const LANE_WIDTH = 1.35;
const ROAD_WIDTH = 5.2;
const ROAD_LENGTH = 130;
const FENCE_SPACING = 3.5;
const POLE_SPACING = 16.0;
const TREE_SPACING = 14.0;

export function DriveWorld({ lightingMode }) {
  const roadMatRef = useRef();
  const roadMeshRef = useRef();
  const fencesLeftRef = useRef();
  const fencesRightRef = useRef();
  const polesRef = useRef();
  const treesRef = useRef();
  const streaksRef = useRef();
  const headLightLeftRef = useRef();
  const headLightRightRef = useRef();
  const tailLightRef = useRef();

  // Local state trigger for entity re-renders
  const [, setFrameTick] = useState(0);

  const isNight = lightingMode === 'night';

  // 1. Procedural 3-Lane Asphalt Texture with authentic Italian dashed markings
  const roadTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Asphalt dark stone base with fine aggregate noise
    ctx.fillStyle = '#222429';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 22;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Gravel shoulder strips
    ctx.fillStyle = '#3c3a33';
    ctx.fillRect(0, 0, 52, canvas.height);
    ctx.fillRect(canvas.width - 52, 0, 52, canvas.height);

    // Solid white edge lines
    ctx.fillStyle = '#eef0ea';
    ctx.fillRect(56, 0, 16, canvas.height);
    ctx.fillRect(canvas.width - 72, 0, 16, canvas.height);

    // Two dashed lane dividers for 3-Lane Highway:
    // Left divider at ~35.5%, Right divider at ~64.5%
    const dashLength = 130;
    const gapLength = 130;
    const cycle = dashLength + gapLength;
    const divLeftX = Math.round(canvas.width * 0.355) - 6;
    const divRightX = Math.round(canvas.width * 0.645) - 6;

    ctx.fillStyle = '#f4f5f0';
    for (let y = 0; y < canvas.height; y += cycle) {
      ctx.fillRect(divLeftX, y, 12, dashLength);
      ctx.fillRect(divRightX, y, 12, dashLength);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 10);
    tex.anisotropy = 16;
    return tex;
  }, []);

  // 2. Mountain Meadow Grass Texture
  const grassTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#455529';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 3000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 2.5 + 1;
      const tone = Math.random();
      ctx.fillStyle = tone > 0.6 ? '#5b7433' : tone > 0.3 ? '#394921' : '#6b6635';
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(12, 24);
    return tex;
  }, []);

  // 3. Instanced Wooden Fences
  const fenceCount = 38;
  const fenceDummy = useMemo(() => new THREE.Object3D(), []);

  // 4. Instanced Telegraph Poles
  const poleCount = 8;
  const poleDummy = useMemo(() => new THREE.Object3D(), []);

  // 5. Instanced Autumn Trees
  const treeCount = 20;
  const treeDummy = useMemo(() => new THREE.Object3D(), []);
  const treeData = useMemo(() => {
    const list = [];
    for (let i = 0; i < treeCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const x = side * (ROAD_WIDTH * 0.5 + 4.8 + (i * 1.4) % 6);
      const isConifer = i % 3 === 0;
      const scale = 0.85 + (i % 5) * 0.12;
      list.push({ x, isConifer, scale });
    }
    return list;
  }, []);

  // 6. Speed Streaks
  const streakCount = 35;
  const streakGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(streakCount * 2 * 3);
    for (let i = 0; i < streakCount; i++) {
      const x = (Math.random() - 0.5) * (ROAD_WIDTH - 0.8);
      const z = (Math.random() - 0.5) * 45;
      positions[i * 6 + 0] = x;
      positions[i * 6 + 1] = 0.006;
      positions[i * 6 + 2] = z;

      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = 0.006;
      positions[i * 6 + 5] = z + 1.4 + Math.random() * 2.2;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  // Frame Loop: Update world, scroll scenery & run collision detection
  useFrame((_, delta) => {
    driveStore.update(delta);

    const offset = driveStore.roadOffset;
    const speed = driveStore.speedKmh;

    // Scroll road texture
    if (roadTexture) {
      roadTexture.offset.y = -offset * 0.0833;
    }

    // Scroll roadside wooden fences
    if (fencesLeftRef.current && fencesRightRef.current) {
      const totalSpan = fenceCount * FENCE_SPACING;
      for (let i = 0; i < fenceCount; i++) {
        const localZ = ((i * FENCE_SPACING - offset) % totalSpan);
        const zPos = localZ < -35 ? localZ + totalSpan : localZ;

        // Left fence
        fenceDummy.position.set(-ROAD_WIDTH * 0.5 - 0.55, 0.42, zPos);
        fenceDummy.updateMatrix();
        fencesLeftRef.current.setMatrixAt(i, fenceDummy.matrix);

        // Right fence
        fenceDummy.position.set(ROAD_WIDTH * 0.5 + 0.55, 0.42, zPos);
        fenceDummy.updateMatrix();
        fencesRightRef.current.setMatrixAt(i, fenceDummy.matrix);
      }
      fencesLeftRef.current.instanceMatrix.needsUpdate = true;
      fencesRightRef.current.instanceMatrix.needsUpdate = true;
    }

    // Scroll telegraph poles
    if (polesRef.current) {
      const totalSpan = poleCount * POLE_SPACING;
      for (let i = 0; i < poleCount; i++) {
        const localZ = ((i * POLE_SPACING - offset) % totalSpan);
        const zPos = localZ < -35 ? localZ + totalSpan : localZ;
        poleDummy.position.set(ROAD_WIDTH * 0.5 + 2.8, 2.2, zPos);
        poleDummy.updateMatrix();
        polesRef.current.setMatrixAt(i, poleDummy.matrix);
      }
      polesRef.current.instanceMatrix.needsUpdate = true;
    }

    // Scroll autumn trees
    if (treesRef.current) {
      const totalSpan = treeCount * TREE_SPACING;
      for (let i = 0; i < treeCount; i++) {
        const item = treeData[i];
        const localZ = ((i * TREE_SPACING - offset) % totalSpan);
        const zPos = localZ < -40 ? localZ + totalSpan : localZ;
        treeDummy.position.set(item.x, 1.8 * item.scale, zPos);
        treeDummy.scale.set(item.scale, item.scale, item.scale);
        treeDummy.updateMatrix();
        treesRef.current.setMatrixAt(i, treeDummy.matrix);
      }
      treesRef.current.instanceMatrix.needsUpdate = true;
    }

    // Streaks opacity
    if (streaksRef.current) {
      const streakOpacity = Math.max(0, Math.min(0.5, (speed - 45) / 110));
      streaksRef.current.material.opacity = streakOpacity;
    }

    // Headlight tracking
    if (headLightLeftRef.current && headLightRightRef.current) {
      const isDrive = driveStore.mode === 'drive';
      const targetIntensity = isDrive ? (isNight ? 4.5 : 1.8) : 0;
      headLightLeftRef.current.intensity = THREE.MathUtils.lerp(
        headLightLeftRef.current.intensity,
        targetIntensity,
        0.1
      );
      headLightRightRef.current.intensity = headLightLeftRef.current.intensity;
    }

    // --- Arcade Collision Detection ---
    if (driveStore.gameState === 'playing') {
      const carX = driveStore.carX;
      const isTexActive = driveStore.activePowerups.tex > 0;

      // 1. Obstacle Collisions (Car length ~1.8, width ~0.7)
      for (let i = 0; i < driveStore.obstacles.length; i++) {
        const obs = driveStore.obstacles[i];
        if (!obs.active) continue;

        const obsX = obs.lane * LANE_WIDTH;
        const dx = Math.abs(carX - obsX);
        const dz = Math.abs(obs.z); // Car is centered at Z = 0

        // Collision zone
        if (dz < 1.4 && dx < 0.65) {
          if (obs.type === 'oil') {
            driveStore.hitOilSlick(obs.id);
          } else if (isTexActive) {
            driveStore.smashObstacle(obs.id);
          } else {
            driveStore.triggerCrash();
          }
        }
      }

      // 2. Coin Pickups
      for (let i = 0; i < driveStore.coins.length; i++) {
        const coin = driveStore.coins[i];
        if (!coin.active) continue;

        const coinX = coin.lane * LANE_WIDTH;
        const dx = Math.abs(carX - coinX);
        const dz = Math.abs(coin.z);

        if (dz < 1.3 && dx < 0.7) {
          driveStore.collectCoin(coin.id);
        }
      }

      // 3. Power-Up Pickups
      for (let i = 0; i < driveStore.powerups.length; i++) {
        const pow = driveStore.powerups[i];
        if (!pow.active) continue;

        const powX = pow.lane * LANE_WIDTH;
        const dx = Math.abs(carX - powX);
        const dz = Math.abs(pow.z);

        if (dz < 1.4 && dx < 0.75) {
          driveStore.collectPowerup(pow.id);
        }
      }
    }

    // Refresh React render tree for dynamic elements at 30Hz
    setFrameTick((t) => (t + 1) % 60);
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Clean 3-Lane Asphalt Highway (Zero clipping hills) */}
      <mesh
        ref={roadMeshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.002, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH, 1, 32]} />
        <meshStandardMaterial
          ref={roadMatRef}
          map={roadTexture}
          roughness={0.78}
          metalness={0.12}
        />
      </mesh>

      {/* 2. Flat Alpine Meadow Verges (Left & Right) */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-ROAD_WIDTH * 0.5 - 28, -0.005, 0]}
        receiveShadow
      >
        <planeGeometry args={[56, ROAD_LENGTH]} />
        <meshStandardMaterial
          map={grassTexture}
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[ROAD_WIDTH * 0.5 + 28, -0.005, 0]}
        receiveShadow
      >
        <planeGeometry args={[56, ROAD_LENGTH]} />
        <meshStandardMaterial
          map={grassTexture}
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>

      {/* 3. Instanced Wooden Fences */}
      <instancedMesh
        ref={fencesLeftRef}
        args={[null, null, fenceCount]}
        castShadow
      >
        <boxGeometry args={[0.08, 0.75, FENCE_SPACING * 0.96]} />
        <meshStandardMaterial color="#5a4734" roughness={0.9} />
      </instancedMesh>
      <instancedMesh
        ref={fencesRightRef}
        args={[null, null, fenceCount]}
        castShadow
      >
        <boxGeometry args={[0.08, 0.75, FENCE_SPACING * 0.96]} />
        <meshStandardMaterial color="#5a4734" roughness={0.9} />
      </instancedMesh>

      {/* 4. Instanced Telegraph Poles */}
      <instancedMesh
        ref={polesRef}
        args={[null, null, poleCount]}
        castShadow
      >
        <cylinderGeometry args={[0.09, 0.12, 4.4, 12]} />
        <meshStandardMaterial color="#3e3024" roughness={0.85} />
      </instancedMesh>

      {/* 5. Instanced Autumn Trees */}
      <instancedMesh
        ref={treesRef}
        args={[null, null, treeCount]}
        castShadow
      >
        <coneGeometry args={[1.5, 3.8, 7]} />
        <meshStandardMaterial color="#c28e28" roughness={0.8} />
      </instancedMesh>

      {/* 6. Speed Motion Streaks */}
      <lineSegments ref={streaksRef} geometry={streakGeo}>
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* 7. Twin Front Headlights */}
      <spotLight
        ref={headLightLeftRef}
        position={[0.34, 0.28, 1.05]}
        target-position={[0.34, -0.05, 18.0]}
        angle={0.35}
        penumbra={0.65}
        intensity={0}
        color="#fff4dd"
        distance={35}
        castShadow
      />
      <spotLight
        ref={headLightRightRef}
        position={[-0.34, 0.28, 1.05]}
        target-position={[-0.34, -0.05, 18.0]}
        angle={0.35}
        penumbra={0.65}
        intensity={0}
        color="#fff4dd"
        distance={35}
        castShadow
      />

      {/* 8. Rear Red Taillight Glow */}
      <pointLight
        ref={tailLightRef}
        position={[0, 0.32, -1.05]}
        color="#ff1a1a"
        intensity={0}
        distance={4.5}
      />

      {/* 9. Dynamic Track Entities (Obstacles, Coins, Power-ups) */}
      <TrackEntities />
    </group>
  );
}

// Subcomponent rendering all dynamic active entities on track
function TrackEntities() {
  const obstacles = driveStore.obstacles;
  const coins = driveStore.coins;
  const powerups = driveStore.powerups;

  return (
    <group>
      {/* Obstacles */}
      {obstacles.map((obs) => {
        if (!obs.active) return null;
        const x = obs.lane * LANE_WIDTH;
        if (obs.type === 'fiat500') {
          return <Fiat500Obstacle key={obs.id} x={x} z={obs.z} />;
        } else if (obs.type === 'barrier') {
          return <BarrierObstacle key={obs.id} x={x} z={obs.z} />;
        } else if (obs.type === 'oil') {
          return <OilSlickObstacle key={obs.id} x={x} z={obs.z} />;
        }
        return null;
      })}

      {/* Gold Quadrifoglio Coins */}
      {coins.map((coin) => {
        if (!coin.active) return null;
        return <GoldCoin key={coin.id} x={coin.lane * LANE_WIDTH} z={coin.z} />;
      })}

      {/* Themed Power-ups */}
      {powerups.map((p) => {
        if (!p.active) return null;
        const x = p.lane * LANE_WIDTH;
        if (p.type === 'tex') {
          return <TexStetsonHat key={p.id} x={x} z={p.z} />;
        } else if (p.type === 'elvis') {
          return <ElvisGoldenVinyl key={p.id} x={x} z={p.z} />;
        }
        return null;
      })}
    </group>
  );
}

// Vintage Fiat 500 Retro Model
function Fiat500Obstacle({ x, z }) {
  const meshRef = useRef();
  useFrame((state) => {
    if (meshRef.current) {
      // Subtle chassis bounce
      meshRef.current.position.y = 0.28 + Math.sin(state.clock.elapsedTime * 14) * 0.008;
    }
  });

  return (
    <group ref={meshRef} position={[x, 0.28, z]}>
      {/* Fiat Lower Chassis (Pastel Cream / Sky Blue vintage paint) */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.78, 0.36, 1.4]} />
        <meshStandardMaterial color="#4d8299" roughness={0.3} metalness={0.6} />
      </mesh>
      {/* Rounded Cabin Roof */}
      <mesh castShadow position={[0, 0.26, -0.05]}>
        <boxGeometry args={[0.66, 0.26, 0.82]} />
        <meshStandardMaterial color="#36393d" roughness={0.2} metalness={0.8} />
      </mesh>
      {/* Canvas sunroof (crema) */}
      <mesh position={[0, 0.40, -0.05]}>
        <boxGeometry args={[0.54, 0.02, 0.68]} />
        <meshStandardMaterial color="#d4c9a8" roughness={0.9} />
      </mesh>
      {/* Chrome Bumpers */}
      <mesh position={[0, -0.10, 0.72]}>
        <boxGeometry args={[0.74, 0.06, 0.06]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.95} roughness={0.1} />
      </mesh>
      <mesh position={[0, -0.10, -0.72]}>
        <boxGeometry args={[0.74, 0.06, 0.06]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.95} roughness={0.1} />
      </mesh>
      {/* Red Taillights facing user */}
      <mesh position={[-0.28, 0, -0.71]}>
        <cylinderGeometry args={[0.04, 0.04, 0.04, 8]} />
        <meshBasicMaterial color="#ff1111" />
      </mesh>
      <mesh position={[0.28, 0, -0.71]}>
        <cylinderGeometry args={[0.04, 0.04, 0.04, 8]} />
        <meshBasicMaterial color="#ff1111" />
      </mesh>
      {/* 4 Vintage Wheels */}
      <mesh position={[-0.40, -0.12, 0.42]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.08, 12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      <mesh position={[0.40, -0.12, 0.42]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.08, 12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      <mesh position={[-0.40, -0.12, -0.42]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.08, 12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
      <mesh position={[0.40, -0.12, -0.42]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.16, 0.16, 0.08, 12]} />
        <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
      </mesh>
    </group>
  );
}

// Vintage Red & White Striped Road Construction Barrier
function BarrierObstacle({ x, z }) {
  return (
    <group position={[x, 0.28, z]}>
      {/* Two Wooden Stand Legs */}
      <mesh position={[-0.48, -0.04, 0]} castShadow>
        <boxGeometry args={[0.06, 0.52, 0.32]} />
        <meshStandardMaterial color="#6e573e" roughness={0.9} />
      </mesh>
      <mesh position={[0.48, -0.04, 0]} castShadow>
        <boxGeometry args={[0.06, 0.52, 0.32]} />
        <meshStandardMaterial color="#6e573e" roughness={0.9} />
      </mesh>
      {/* Top Crossbar (Red / White striped) */}
      <mesh position={[0, 0.14, 0]} castShadow>
        <boxGeometry args={[1.15, 0.16, 0.05]} />
        <meshStandardMaterial color="#d42626" roughness={0.6} />
      </mesh>
      {/* White reflective stripes on top bar */}
      <mesh position={[-0.28, 0.14, 0.03]}>
        <boxGeometry args={[0.18, 0.16, 0.01]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.28, 0.14, 0.03]}>
        <boxGeometry args={[0.18, 0.16, 0.01]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {/* Bottom Crossbar */}
      <mesh position={[0, -0.06, 0]} castShadow>
        <boxGeometry args={[1.15, 0.14, 0.05]} />
        <meshStandardMaterial color="#d42626" roughness={0.6} />
      </mesh>
      <mesh position={[0, -0.06, 0.03]}>
        <boxGeometry args={[0.18, 0.14, 0.01]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

// Oil Slick Decal on Road Surface
function OilSlickObstacle({ x, z }) {
  return (
    <mesh position={[x, 0.005, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.55, 16]} />
      <meshStandardMaterial
        color="#08080a"
        roughness={0.08}
        metalness={0.92}
        transparent
        opacity={0.88}
      />
    </mesh>
  );
}

// Gold Quadrifoglio Alfa Coin
function GoldCoin({ x, z }) {
  const coinRef = useRef();

  useFrame((state) => {
    if (coinRef.current) {
      coinRef.current.rotation.y = state.clock.elapsedTime * 4.0;
      coinRef.current.position.y = 0.35 + Math.sin(state.clock.elapsedTime * 6.0 + z) * 0.06;
    }
  });

  return (
    <group ref={coinRef} position={[x, 0.35, z]}>
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.22, 0.22, 0.04, 16]} />
        <meshStandardMaterial
          color="#f6c243"
          metalness={0.95}
          roughness={0.15}
          emissive="#b8860b"
          emissiveIntensity={0.25}
        />
      </mesh>
    </group>
  );
}

// 🤠 Tex Willer Stetson Cowboy Hat 3D Mesh
function TexStetsonHat({ x, z }) {
  const hatRef = useRef();

  useFrame((state) => {
    if (hatRef.current) {
      hatRef.current.rotation.y = state.clock.elapsedTime * 2.8;
      hatRef.current.position.y = 0.45 + Math.sin(state.clock.elapsedTime * 5.0) * 0.08;
    }
  });

  return (
    <group ref={hatRef} position={[x, 0.45, z]}>
      {/* Wide Curved Stetson Brim */}
      <mesh castShadow rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.36, 0.38, 0.02, 24]} />
        <meshStandardMaterial color="#ece5d8" roughness={0.7} />
      </mesh>
      {/* Indented Crown */}
      <mesh position={[0, 0.12, 0]} castShadow>
        <cylinderGeometry args={[0.18, 0.22, 0.22, 16]} />
        <meshStandardMaterial color="#ece5d8" roughness={0.7} />
      </mesh>
      {/* Brown Leather Hatband */}
      <mesh position={[0, 0.03, 0]}>
        <cylinderGeometry args={[0.225, 0.225, 0.04, 16]} />
        <meshStandardMaterial color="#54371e" roughness={0.6} />
      </mesh>
      {/* Golden Aura Ring */}
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.42, 0.46, 24]} />
        <meshBasicMaterial color="#ffcc00" side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
}

// 🎸 Elvis Presley Golden Vinyl Record 3D Mesh
function ElvisGoldenVinyl({ x, z }) {
  const vinylRef = useRef();

  useFrame((state) => {
    if (vinylRef.current) {
      vinylRef.current.rotation.y = state.clock.elapsedTime * 3.5;
      vinylRef.current.position.y = 0.45 + Math.sin(state.clock.elapsedTime * 5.5) * 0.08;
    }
  });

  return (
    <group ref={vinylRef} position={[x, 0.45, z]}>
      {/* Golden Grooved Disc */}
      <mesh castShadow rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.34, 0.34, 0.02, 32]} />
        <meshStandardMaterial
          color="#d4af37"
          metalness={0.96}
          roughness={0.12}
          emissive="#b8860b"
          emissiveIntensity={0.3}
        />
      </mesh>
      {/* Center Vintage Red Record Label */}
      <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.12, 24]} />
        <meshStandardMaterial color="#b21818" roughness={0.4} />
      </mesh>
      {/* Center Spindle Hole */}
      <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.03, 16]} />
        <meshBasicMaterial color="#111111" />
      </mesh>
    </group>
  );
}
