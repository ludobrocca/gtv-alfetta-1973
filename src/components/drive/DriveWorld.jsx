// 3-Lane Endless Alpine Highway & Arcade Runner Entities
// Clean road geometry with zero clipping hills, 3 lanes (-1, 0, 1),
// procedural Fiat 500s, barriers, oil slicks, Tex Willer hats, Elvis vinyls, and gold coins.

import React, { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { driveStore, laneToX } from './driveStore';

const ROAD_WIDTH = 5.2;
const ROAD_LENGTH = 130;
const ROAD_X_SEGMENTS = 16;
const ROAD_Z_SEGMENTS = 72;
const FENCE_SPACING = 3.5;
const POLE_SPACING = 16.0;
const TREE_SPACING = 14.0;
const ARCH_SPACING = 9.0;

export function DriveWorld({ lightingMode }) {
  const roadMatRef = useRef();
  const roadMeshRef = useRef();
  const vergeLeftRef = useRef();
  const vergeRightRef = useRef();
  const fencesLeftRef = useRef();
  const fencesRightRef = useRef();
  const polesRef = useRef();
  const treesRef = useRef();
  const tunnelArchesRef = useRef();
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

  // 7. Instanced Alpine Tunnel Arches (visible in Galleria zone)
  const archCount = 12;
  const archDummy = useMemo(() => new THREE.Object3D(), []);

  // Helper to deform a horizontal PlaneGeometry (rotated -PI/2 on X) to follow getRoadElevation(z) and 3D event deformation
  const updateSurfaceElevation = (meshRef, isRoad = false) => {
    if (!meshRef.current || !meshRef.current.geometry) return;
    const pos = meshRef.current.geometry.attributes.position;
    if (!meshRef.current.userData.baseX) {
      const arr = new Float32Array(pos.count);
      for (let i = 0; i < pos.count; i++) {
        arr[i] = pos.getX(i);
      }
      meshRef.current.userData.baseX = arr;
    }
    const baseX = meshRef.current.userData.baseX;

    for (let i = 0; i < pos.count; i++) {
      const origX = baseX[i];
      const localY = pos.getY(i);
      const worldZ = -localY;
      const elev = driveStore.getRoadElevation(worldZ);
      const curveX = driveStore.getRoadCurveX ? driveStore.getRoadCurveX(worldZ) : 0;
      const evParams = driveStore.getRoadEventParams
        ? driveStore.getRoadEventParams(worldZ)
        : { widthScale: 1, bankAngle: 0, wallCurvature: 0, vergeDropY: 0 };

      if (isRoad) {
        const scaledX = origX * evParams.widthScale;
        const normX = origX / (ROAD_WIDTH * 0.5);
        const wallLift = evParams.wallCurvature * normX * normX;
        const bankLift = scaledX * Math.sin(evParams.bankAngle);
        pos.setX(i, scaledX + curveX);
        pos.setZ(i, elev + wallLift + bankLift);
      } else {
        pos.setX(i, origX + curveX);
        pos.setZ(i, elev + evParams.vergeDropY);
      }
    }
    pos.needsUpdate = true;
    meshRef.current.geometry.computeVertexNormals();
  };

  // Frame Loop: Update world, deform rolling hills, scroll scenery & run collision detection
  useFrame((_, delta) => {
    driveStore.update(delta);

    const offset = driveStore.roadOffset;
    const speed = driveStore.speedKmh;
    const isGalleria = driveStore.getCurrentZone().id === 'galleria';

    // Scroll road texture
    if (roadTexture) {
      roadTexture.offset.y = -offset * 0.0833;
    }

    // Deform road and left/right alpine meadows to match rolling hills (salite/discese)
    updateSurfaceElevation(roadMeshRef, true);
    updateSurfaceElevation(vergeLeftRef, false);
    updateSurfaceElevation(vergeRightRef, false);

    // Scroll roadside wooden fences along hills
    if (fencesLeftRef.current && fencesRightRef.current) {
      const totalSpan = fenceCount * FENCE_SPACING;
      for (let i = 0; i < fenceCount; i++) {
        const localZ = ((i * FENCE_SPACING - offset) % totalSpan);
        const zPos = localZ < -35 ? localZ + totalSpan : localZ;
        const elev = driveStore.getRoadElevation(zPos);
        const pitch = -Math.atan(driveStore.getRoadSlope(zPos));
        const curveX = driveStore.getRoadCurveX ? driveStore.getRoadCurveX(zPos) : 0;

        // Left fence
        fenceDummy.position.set(-ROAD_WIDTH * 0.5 - 0.55 + curveX, elev + 0.42, zPos);
        fenceDummy.rotation.set(pitch, 0, 0);
        fenceDummy.updateMatrix();
        fencesLeftRef.current.setMatrixAt(i, fenceDummy.matrix);

        // Right fence
        fenceDummy.position.set(ROAD_WIDTH * 0.5 + 0.55 + curveX, elev + 0.42, zPos);
        fenceDummy.rotation.set(pitch, 0, 0);
        fenceDummy.updateMatrix();
        fencesRightRef.current.setMatrixAt(i, fenceDummy.matrix);
      }
      fencesLeftRef.current.instanceMatrix.needsUpdate = true;
      fencesRightRef.current.instanceMatrix.needsUpdate = true;
    }

    // Scroll telegraph poles along hills
    if (polesRef.current) {
      const totalSpan = poleCount * POLE_SPACING;
      for (let i = 0; i < poleCount; i++) {
        const localZ = ((i * POLE_SPACING - offset) % totalSpan);
        const zPos = localZ < -35 ? localZ + totalSpan : localZ;
        const elev = driveStore.getRoadElevation(zPos);
        const curveX = driveStore.getRoadCurveX ? driveStore.getRoadCurveX(zPos) : 0;
        poleDummy.position.set(ROAD_WIDTH * 0.5 + 2.8 + curveX, elev + 2.2, zPos);
        poleDummy.updateMatrix();
        polesRef.current.setMatrixAt(i, poleDummy.matrix);
      }
      polesRef.current.instanceMatrix.needsUpdate = true;
    }

    // Scroll autumn trees along hills
    if (treesRef.current) {
      const totalSpan = treeCount * TREE_SPACING;
      for (let i = 0; i < treeCount; i++) {
        const item = treeData[i];
        const localZ = ((i * TREE_SPACING - offset) % totalSpan);
        const zPos = localZ < -40 ? localZ + totalSpan : localZ;
        const elev = driveStore.getRoadElevation(zPos);
        const curveX = driveStore.getRoadCurveX ? driveStore.getRoadCurveX(zPos) : 0;
        treeDummy.position.set(item.x + curveX, elev + 1.8 * item.scale, zPos);
        treeDummy.scale.set(item.scale, item.scale, item.scale);
        treeDummy.updateMatrix();
        treesRef.current.setMatrixAt(i, treeDummy.matrix);
      }
      treesRef.current.instanceMatrix.needsUpdate = true;
    }

    // Scroll illuminated Alpine Tunnel Arches (Galleria zone & F-Zero Magnetic Tunnel)
    const isFZeroTunnel = Boolean(
      driveStore.trackEvent &&
      driveStore.trackEvent.type === 'fzero_tunnel' &&
      driveStore.trackEvent.blend > 0.05
    );
    const showArches = isGalleria || isFZeroTunnel;

    if (tunnelArchesRef.current) {
      tunnelArchesRef.current.visible = showArches;
      if (showArches) {
        if (tunnelArchesRef.current.material) {
          if (isFZeroTunnel) {
            tunnelArchesRef.current.material.emissive.set('#06b6d4');
            tunnelArchesRef.current.material.emissiveIntensity = 0.85;
          } else {
            tunnelArchesRef.current.material.emissive.set('#f59e0b');
            tunnelArchesRef.current.material.emissiveIntensity = 0.35;
          }
        }
        const totalSpan = archCount * ARCH_SPACING;
        for (let i = 0; i < archCount; i++) {
          const localZ = ((i * ARCH_SPACING - offset) % totalSpan);
          const zPos = localZ < -25 ? localZ + totalSpan : localZ;
          const elev = driveStore.getRoadElevation(zPos);
          const pitch = -Math.atan(driveStore.getRoadSlope(zPos));
          const curveX = driveStore.getRoadCurveX ? driveStore.getRoadCurveX(zPos) : 0;
          archDummy.position.set(curveX, elev + 0.1, zPos);
          archDummy.rotation.set(pitch, 0, 0);
          archDummy.updateMatrix();
          tunnelArchesRef.current.setMatrixAt(i, archDummy.matrix);
        }
        tunnelArchesRef.current.instanceMatrix.needsUpdate = true;
      }
    }

    // Streaks opacity
    if (streaksRef.current) {
      const streakOpacity = Math.max(0, Math.min(0.55, (speed - 45) / 100));
      streaksRef.current.material.opacity = streakOpacity;
    }

    // Headlight tracking
    if (headLightLeftRef.current && headLightRightRef.current) {
      const isDrive = driveStore.mode === 'drive';
      const targetIntensity = isDrive ? (isNight || isGalleria ? 4.8 : 1.9) : 0;
      headLightLeftRef.current.intensity = THREE.MathUtils.lerp(
        headLightLeftRef.current.intensity,
        targetIntensity,
        0.1
      );
      headLightRightRef.current.intensity = headLightLeftRef.current.intensity;
    }

    // Animate knocked-out obstacles (burnout lateral takedown spin & fly-off physics)
    const effectiveDelta = delta * (driveStore.timeScale ?? 1);
    for (let i = 0; i < driveStore.obstacles.length; i++) {
      const obs = driveStore.obstacles[i];
      if (obs.knockedOut) {
        obs.knockX = (obs.knockX !== undefined ? obs.knockX : laneToX(obs.lane)) + (obs.vx || 0) * effectiveDelta;
        obs.z += (obs.vz || 0) * effectiveDelta;
        obs.rotY = (obs.rotY || 0) + (obs.vRot || 0) * effectiveDelta;
        obs.rotZ = (obs.rotZ || 0) + (obs.vRot || 0) * 0.35 * effectiveDelta;
      }
    }

    // --- Arcade Collision Detection (Non-Inverted X Coordinates!) ---
    if (driveStore.gameState === 'playing') {
      const carX = driveStore.carX;
      const airY = driveStore.airY;
      const isSmashActive =
        driveStore.activePowerups.tex > 0 ||
        driveStore.activePowerups.bond > 0 ||
        driveStore.activePowerups.callaghan > 0 ||
        driveStore.activePowerups.mg > 0;
      const isGhostActive = driveStore.activePowerups.diabolik > 0;
      const isMagnet =
        driveStore.activePowerups.spiderman > 0 ||
        driveStore.activePowerups.bond > 0 ||
        driveStore.activePowerups.mg > 0;

      // 1. Obstacle Collisions
      for (let i = 0; i < driveStore.obstacles.length; i++) {
        const obs = driveStore.obstacles[i];
        if (!obs.active) continue;

        const obsX = laneToX(obs.lane);
        const dx = Math.abs(carX - obsX);
        const dz = Math.abs(obs.z);

        // Stunt Ramp takeoff
        if (obs.type === 'ramp') {
          if (dz < 1.55 && dx < 0.75) {
            driveStore.hitRamp(obs.id);
          }
          continue;
        }

        // Flying high clears oil slicks, barriers, and Fiat 500s below
        if (airY > 0.42) {
          if (obs.type === 'oil' || obs.type === 'barrier' || obs.type === 'fiat500') {
            continue;
          }
        }
        if (airY > 0.35 && obs.type === 'oil') {
          continue;
        }

        if (dz < 1.45 && dx < 0.75) {
          if (obs.type === 'oil') {
            driveStore.hitOilSlick(obs.id);
            continue;
          }

          if (isGhostActive) {
            obs.active = false;
            driveStore.score += 120;
            driveStore.triggerEventBanner('💎 FUGA DIABOLIK!', '+120 PT • OSTACOLO ATTRAVERSATO', 'cyan');
            continue;
          }

          if (isSmashActive) {
            driveStore.smashObstacle(obs.id);
            continue;
          }

          // Fiat 500: Burnout Lateral Sportellata Takedown vs Frontal Impact
          if (obs.type === 'fiat500') {
            const isSportellata =
              driveStore.laneChangeTimer > 0 ||
              Math.abs(carX - laneToX(driveStore.targetLane)) > 0.14 ||
              (dx > 0.30 && dz < 1.45);

            if (isSportellata) {
              const takedownDir = driveStore.lastLaneDirection || (carX > obsX ? 1 : -1);
              driveStore.takedownObstacle(obs.id, takedownDir);
              continue;
            } else {
              driveStore.handleFrontalImpact(obs.id);
              continue;
            }
          }

          if (obs.type === 'barrier') {
            driveStore.handleFrontalImpact(obs.id);
            continue;
          }
        }
      }

      // 2. Coin Pickups (including aerial coins above ramps)
      for (let i = 0; i < driveStore.coins.length; i++) {
        const coin = driveStore.coins[i];
        if (!coin.active) continue;

        const coinX = coin.xOverride !== undefined ? coin.xOverride : laneToX(coin.lane);
        const dx = Math.abs(carX - coinX);
        const dz = Math.abs(coin.z);

        if (dz < 1.45 && dx < 0.78) {
          if (coin.yOffset !== undefined) {
            if (Math.abs(airY - coin.yOffset) < 1.15 || isMagnet) {
              driveStore.collectCoin(coin.id);
            }
          } else {
            driveStore.collectCoin(coin.id);
          }
        }
      }
    }

    // Refresh React render tree for dynamic elements at 30Hz
    setFrameTick((t) => (t + 1) % 60);
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. 3-Lane Asphalt Highway with Dynamic Rolling Hills (Salite & Discese) */}
      <mesh
        ref={roadMeshRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.002, 0]}
        receiveShadow
      >
        <planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH, ROAD_X_SEGMENTS, ROAD_Z_SEGMENTS]} />
        <meshStandardMaterial
          ref={roadMatRef}
          map={roadTexture}
          roughness={0.78}
          metalness={0.12}
        />
      </mesh>

      {/* 2. Rolling Alpine Meadow Verges (Left & Right) */}
      <mesh
        ref={vergeLeftRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[-ROAD_WIDTH * 0.5 - 28, -0.006, 0]}
        receiveShadow
      >
        <planeGeometry args={[56, ROAD_LENGTH, 1, ROAD_Z_SEGMENTS]} />
        <meshStandardMaterial
          map={grassTexture}
          roughness={0.92}
          metalness={0.02}
        />
      </mesh>
      <mesh
        ref={vergeRightRef}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[ROAD_WIDTH * 0.5 + 28, -0.006, 0]}
        receiveShadow
      >
        <planeGeometry args={[56, ROAD_LENGTH, 1, ROAD_Z_SEGMENTS]} />
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

      {/* 5b. Instanced Illuminated Alpine Tunnel Arches (Galleria Zone) */}
      <instancedMesh
        ref={tunnelArchesRef}
        args={[null, null, archCount]}
        visible={false}
      >
        <torusGeometry args={[3.4, 0.22, 10, 28, Math.PI]} />
        <meshStandardMaterial
          color="#334155"
          roughness={0.5}
          metalness={0.4}
          emissive="#f59e0b"
          emissiveIntensity={0.35}
        />
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

      {/* 10. High-Dopamine Track Event 3D Portal & Ideal Drift Line */}
      <EventEntryPortal />
      <IdealLaneRibbon />
    </group>
  );
}

// 🚧 High-Dopamine Track Event 3D Entry Portal with Lane Signboards & Gantry
export function EventEntryPortal() {
  const trackEvent = driveStore.trackEvent;
  const isVisible = Boolean(trackEvent && trackEvent.phase === 'funnel');

  if (!isVisible) return null;

  const timer = trackEvent.timer !== undefined ? trackEvent.timer : 3.0;
  const entryLane = trackEvent.entryLane !== undefined ? trackEvent.entryLane : 0;
  const z = Math.max(4, timer * 15);
  const elev = driveStore.getRoadElevation(z);
  const curveX = driveStore.getRoadCurveX ? driveStore.getRoadCurveX(z) : 0;
  const pitch = -Math.atan(driveStore.getRoadSlope(z));

  return (
    <group position={[curveX, elev, z]} rotation={[pitch, 0, 0]}>
      {/* Heavy Steel Gantry Pillars (Left & Right) */}
      <mesh position={[-ROAD_WIDTH * 0.5 - 0.28, 1.45, 0]} castShadow>
        <boxGeometry args={[0.22, 2.9, 0.22]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[ROAD_WIDTH * 0.5 + 0.28, 1.45, 0]} castShadow>
        <boxGeometry args={[0.22, 2.9, 0.22]} />
        <meshStandardMaterial color="#334155" metalness={0.7} roughness={0.3} />
      </mesh>

      {/* Overhead Gantry Crossbar spanning all 3 lanes */}
      <mesh position={[0, 2.7, 0]} castShadow>
        <boxGeometry args={[ROAD_WIDTH + 0.95, 0.32, 0.28]} />
        <meshStandardMaterial color="#1e293b" metalness={0.8} roughness={0.25} />
      </mesh>

      {/* 3 Overhead Lane Signboards for lanes [-1, 0, 1] */}
      {[-1, 0, 1].map((lane) => {
        const laneX = laneToX(lane);
        const isEntry = lane === entryLane;

        return (
          <group key={`portal_sign_${lane}`} position={[laneX, 2.22, 0]}>
            {/* Dark Backing Panel */}
            <mesh position={[0, 0, 0]}>
              <boxGeometry args={[1.2, 0.65, 0.08]} />
              <meshStandardMaterial color="#0f172a" roughness={0.35} metalness={0.6} />
            </mesh>

            {/* Glowing Outer Border Frame */}
            <mesh position={[0, 0, 0.044]}>
              <boxGeometry args={[1.24, 0.69, 0.01]} />
              <meshStandardMaterial
                color={isEntry ? '#10b981' : '#ef4444'}
                emissive={isEntry ? '#10b981' : '#ef4444'}
                emissiveIntensity={2.0}
                roughness={0.2}
              />
            </mesh>

            {isEntry ? (
              /* Glowing Green/Gold Chevron Arrow Indicator (Open Event Entry) */
              <group position={[0, 0, 0.055]}>
                <mesh position={[-0.14, 0.04, 0]} rotation={[0, 0, -Math.PI / 4]}>
                  <boxGeometry args={[0.3, 0.08, 0.02]} />
                  <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#10b981"
                    emissiveIntensity={3.2}
                  />
                </mesh>
                <mesh position={[0.14, 0.04, 0]} rotation={[0, 0, Math.PI / 4]}>
                  <boxGeometry args={[0.3, 0.08, 0.02]} />
                  <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#10b981"
                    emissiveIntensity={3.2}
                  />
                </mesh>
                <mesh position={[0, -0.08, 0]}>
                  <boxGeometry args={[0.08, 0.18, 0.02]} />
                  <meshStandardMaterial
                    color="#fbbf24"
                    emissive="#10b981"
                    emissiveIntensity={3.2}
                  />
                </mesh>
              </group>
            ) : (
              /* Glowing Red Warning Cross (Closed Lane) */
              <group position={[0, 0, 0.055]}>
                <mesh rotation={[0, 0, Math.PI / 4]}>
                  <boxGeometry args={[0.42, 0.08, 0.02]} />
                  <meshStandardMaterial
                    color="#ef4444"
                    emissive="#ef4444"
                    emissiveIntensity={2.8}
                  />
                </mesh>
                <mesh rotation={[0, 0, -Math.PI / 4]}>
                  <boxGeometry args={[0.42, 0.08, 0.02]} />
                  <meshStandardMaterial
                    color="#ef4444"
                    emissive="#ef4444"
                    emissiveIntensity={2.8}
                  />
                </mesh>
              </group>
            )}
          </group>
        );
      })}
    </group>
  );
}

// ⚡ Glowing Golden Ideal-Lane Ribbon on road surface during Parabolic Drift
export function IdealLaneRibbon() {
  const SEGMENTS = 36;
  const RIBBON_LEN = 65;
  const HALF_W = 0.26;

  const geo = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const posArr = new Float32Array((SEGMENTS + 1) * 2 * 3);
    const indices = [];

    for (let i = 0; i < SEGMENTS; i++) {
      const v0 = i * 2;
      const v1 = i * 2 + 1;
      const v2 = (i + 1) * 2;
      const v3 = (i + 1) * 2 + 1;
      indices.push(v0, v2, v1);
      indices.push(v1, v2, v3);
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geometry.setIndex(indices);
    return geometry;
  }, []);

  const trackEvent = driveStore.trackEvent;
  const isVisible = Boolean(
    trackEvent &&
    trackEvent.type === 'parabolic_drift' &&
    trackEvent.phase === 'active'
  );

  useFrame(() => {
    if (!isVisible) return;
    const pos = geo.attributes.position;
    const idealLane = trackEvent && trackEvent.idealLane !== undefined ? trackEvent.idealLane : 0;
    const baseIdealX = laneToX(idealLane);

    for (let i = 0; i <= SEGMENTS; i++) {
      const z = (i / SEGMENTS) * RIBBON_LEN;
      const elev = driveStore.getRoadElevation(z);
      const curveX = driveStore.getRoadCurveX ? driveStore.getRoadCurveX(z) : 0;
      const centerX = baseIdealX + curveX;
      const y = elev + 0.025;

      pos.setXYZ(i * 2, centerX - HALF_W, y, z);
      pos.setXYZ(i * 2 + 1, centerX + HALF_W, y, z);
    }
    pos.needsUpdate = true;
  });

  if (!isVisible) return null;

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        color="#fbbf24"
        emissive="#f59e0b"
        emissiveIntensity={2.2}
        roughness={0.2}
        metalness={0.4}
        transparent
        opacity={0.85}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

// Subcomponent rendering all dynamic active entities on track (aligned to rolling hills & non-inverted lanes)
function TrackEntities() {
  const obstacles = driveStore.obstacles;
  const coins = driveStore.coins;
  const isWebMagnet =
    driveStore.activePowerups.spiderman > 0 ||
    driveStore.activePowerups.bond > 0 ||
    driveStore.activePowerups.mg > 0;

  return (
    <group>
      {/* Obstacles & Stunt Ramps */}
      {obstacles.map((obs) => {
        if (!obs.active && !obs.knockedOut) return null;
        const curveX = driveStore.getRoadCurveX ? driveStore.getRoadCurveX(obs.z) : 0;
        const xPos = (obs.knockedOut && obs.knockX !== undefined ? obs.knockX : laneToX(obs.lane)) + curveX;
        const y = driveStore.getRoadElevation(obs.z);
        const pitch = -Math.atan(driveStore.getRoadSlope(obs.z));

        if (obs.type === 'fiat500') {
          return (
            <Fiat500Obstacle
              key={obs.id}
              x={xPos}
              y={y}
              z={obs.z}
              pitch={pitch}
              rotY={obs.rotY || 0}
              rotZ={obs.rotZ || 0}
              knockedOut={obs.knockedOut}
            />
          );
        } else if (obs.type === 'ramp' && obs.active) {
          return <StuntRamp key={obs.id} x={xPos} y={y} z={obs.z} pitch={pitch} />;
        } else if (obs.type === 'barrier' && obs.active) {
          return <BarrierObstacle key={obs.id} x={xPos} y={y} z={obs.z} pitch={pitch} />;
        } else if (obs.type === 'oil' && obs.active) {
          return <OilSlickObstacle key={obs.id} x={xPos} y={y} z={obs.z} pitch={pitch} />;
        }
        return null;
      })}

      {/* Gold Quadrifoglio Coins (Ground & Aerial Jump Arcs) */}
      {coins.map((coin) => {
        if (!coin.active) return null;
        const curveX = driveStore.getRoadCurveX ? driveStore.getRoadCurveX(coin.z) : 0;
        const x = (coin.xOverride !== undefined ? coin.xOverride : laneToX(coin.lane)) + curveX;
        const y = driveStore.getRoadElevation(coin.z);
        return <GoldCoin key={coin.id} x={x} y={y} z={coin.z} yOffset={coin.yOffset || 0} />;
      })}

      {/* Spider-Man Web Magnet Tethers pulling coins to the Alfetta */}
      {isWebMagnet &&
        coins.map((coin) => {
          if (!coin.active || coin.z <= -0.5 || coin.z >= 16.0) return null;
          const curveX = driveStore.getRoadCurveX ? driveStore.getRoadCurveX(coin.z) : 0;
          const x = (coin.xOverride !== undefined ? coin.xOverride : laneToX(coin.lane)) + curveX;
          const y = driveStore.getRoadElevation(coin.z);
          return (
            <SpiderWebTether
              key={`web_${coin.id}`}
              start={[driveStore.carX, driveStore.carY + driveStore.airY + 0.34, 0.45]}
              end={[x, y + 0.36 + (coin.yOffset || 0), coin.z]}
              color={driveStore.activePowerups.spiderman > 0 ? '#f8fafc' : '#fde047'}
            />
          );
        })}
    </group>
  );
}

// Vintage Fiat 500 Retro Model (follows hill elevation & slope pitch, supports takedown knockout spins)
function Fiat500Obstacle({ x, y = 0, z, pitch = 0, rotY = 0, rotZ = 0, knockedOut = false }) {
  const meshRef = useRef();
  useFrame((state) => {
    if (meshRef.current) {
      const bob = knockedOut ? 0 : Math.sin(state.clock.elapsedTime * 14) * 0.008;
      meshRef.current.position.set(x, y + 0.28 + bob, z);
      meshRef.current.rotation.set(pitch, rotY, rotZ);
    }
  });

  return (
    <group ref={meshRef} position={[x, y + 0.28, z]} rotation={[pitch, rotY, rotZ]}>
      {/* Fiat Lower Chassis (Pastel Cream / Sky Blue vintage paint) */}
      <mesh castShadow receiveShadow position={[0, 0, 0]}>
        <boxGeometry args={[0.78, 0.36, 1.4]} />
        <meshStandardMaterial color={knockedOut ? '#d97706' : '#4d8299'} roughness={0.3} metalness={0.6} />
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

// 🚧 Procedural 3D Stunt Ramp with Angled Deck, Guardrails & Glowing Neon Chevrons
function StuntRamp({ x, y = 0, z, pitch = 0 }) {
  const rampAngle = -0.22; // ~12.6° incline toward +Z takeoff

  return (
    <group position={[x, y, z]} rotation={[pitch, 0, 0]}>
      {/* Heavy Steel Undercarriage Frame */}
      <mesh position={[0, 0.14, 0.12]} castShadow receiveShadow>
        <boxGeometry args={[1.28, 0.28, 1.8]} />
        <meshStandardMaterial color="#1e242b" metalness={0.75} roughness={0.35} />
      </mesh>

      {/* Angled Ramp Deck (High-vis hazard gold/amber) */}
      <group position={[0, 0.28, 0]} rotation={[rampAngle, 0, 0]}>
        <mesh castShadow receiveShadow position={[0, 0, 0]}>
          <boxGeometry args={[1.32, 0.08, 2.2]} />
          <meshStandardMaterial color="#f59e0b" metalness={0.4} roughness={0.4} />
        </mesh>

        {/* Black Hazard Traction Strips across deck */}
        {[-0.65, -0.25, 0.15, 0.55].map((sZ, idx) => (
          <mesh key={idx} position={[0, 0.045, sZ]}>
            <boxGeometry args={[1.24, 0.01, 0.14]} />
            <meshStandardMaterial color="#18181b" roughness={0.9} />
          </mesh>
        ))}

        {/* Glowing Neon Directional Chevrons pointing forward (+Z) */}
        {[-0.45, 0.0, 0.45].map((cZ, idx) => (
          <group key={`chev_${idx}`} position={[0, 0.048, cZ]}>
            {/* Left wing */}
            <mesh position={[-0.08, 0, 0]} rotation={[0, 0.55, 0]}>
              <boxGeometry args={[0.08, 0.01, 0.28]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#f59e0b"
                emissiveIntensity={2.2}
                roughness={0.2}
              />
            </mesh>
            {/* Right wing */}
            <mesh position={[0.08, 0, 0]} rotation={[0, -0.55, 0]}>
              <boxGeometry args={[0.08, 0.01, 0.28]} />
              <meshStandardMaterial
                color="#fef08a"
                emissive="#f59e0b"
                emissiveIntensity={2.2}
                roughness={0.2}
              />
            </mesh>
          </group>
        ))}

        {/* Glowing Takeoff Lip Edge */}
        <mesh position={[0, 0.045, 1.05]}>
          <boxGeometry args={[1.32, 0.06, 0.08]} />
          <meshStandardMaterial
            color="#38bdf8"
            emissive="#38bdf8"
            emissiveIntensity={2.5}
            roughness={0.1}
          />
        </mesh>

        {/* Left Side Guardrail */}
        <mesh position={[-0.64, 0.14, 0]} castShadow>
          <boxGeometry args={[0.06, 0.26, 2.2]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} />
        </mesh>
        {/* Left Warning Beacon */}
        <mesh position={[-0.64, 0.30, 1.05]}>
          <cylinderGeometry args={[0.05, 0.05, 0.08, 10]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={3.0}
          />
        </mesh>

        {/* Right Side Guardrail */}
        <mesh position={[0.64, 0.14, 0]} castShadow>
          <boxGeometry args={[0.06, 0.26, 2.2]} />
          <meshStandardMaterial color="#dc2626" roughness={0.5} />
        </mesh>
        {/* Right Warning Beacon */}
        <mesh position={[0.64, 0.30, 1.05]}>
          <cylinderGeometry args={[0.05, 0.05, 0.08, 10]} />
          <meshStandardMaterial
            color="#fbbf24"
            emissive="#f59e0b"
            emissiveIntensity={3.0}
          />
        </mesh>
      </group>
    </group>
  );
}

// Vintage Red & White Striped Road Construction Barrier
function BarrierObstacle({ x, y = 0, z, pitch = 0 }) {
  return (
    <group position={[x, y + 0.28, z]} rotation={[pitch, 0, 0]}>
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

// Oil Slick Decal on Road Surface (follows hill slope)
function OilSlickObstacle({ x, y = 0, z, pitch = 0 }) {
  return (
    <mesh position={[x, y + 0.012, z]} rotation={[-Math.PI / 2 + pitch, 0, 0]}>
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

// 🕸️ Spider-Man Web Magnet Dynamic 3D Tether connecting car front to magnetized coin
export function SpiderWebTether({ start, end, color = '#ffffff' }) {
  const { midpoint, quaternion, len } = useMemo(() => {
    const p1 = new THREE.Vector3(start[0], start[1], start[2]);
    const p2 = new THREE.Vector3(end[0], end[1], end[2]);
    const dir = new THREE.Vector3().subVectors(p2, p1);
    const len = dir.length();
    const midpoint = [
      (start[0] + end[0]) / 2,
      (start[1] + end[1]) / 2,
      (start[2] + end[2]) / 2,
    ];
    const quat = new THREE.Quaternion();
    if (len > 0.0001) {
      quat.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    }
    return { midpoint, quaternion: quat, len };
  }, [start[0], start[1], start[2], end[0], end[1], end[2]]);

  if (len < 0.05) return null;

  return (
    <group>
      {/* Taut glowing cylinder strand */}
      <mesh position={midpoint} quaternion={quaternion} scale={[1, len, 1]}>
        <cylinderGeometry args={[0.018, 0.028, 1, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.65}
          roughness={0.2}
          transparent
          opacity={0.88}
        />
      </mesh>
      {/* Small web attachment ring around the coin */}
      <mesh position={end} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.22, 0.28, 16]} />
        <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.75} />
      </mesh>
    </group>
  );
}

// Gold Quadrifoglio Alfa Coin
function GoldCoin({ x, y = 0, z, yOffset = 0 }) {
  const coinRef = useRef();

  useFrame((state) => {
    if (coinRef.current) {
      coinRef.current.rotation.y = state.clock.elapsedTime * 4.0;
      coinRef.current.position.y = y + 0.36 + yOffset + Math.sin(state.clock.elapsedTime * 6.0 + z) * 0.06;
    }
  });

  return (
    <group ref={coinRef} position={[x, y + 0.36 + yOffset, z]}>
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
