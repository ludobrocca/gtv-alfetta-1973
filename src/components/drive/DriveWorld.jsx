// Alpine plateau driving environment inspired by alfa-profilo.jpeg
// Two-lane mountain asphalt, rolling green hills, wooden fences, autumn trees,
// telegraph poles, realistic road scrolling, and dynamic headlights/taillights.

import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { driveStore } from './driveStore';

const ROAD_WIDTH = 4.2;
const ROAD_LENGTH = 120;
const FENCE_SPACING = 3.2;
const POLE_SPACING = 16.0;
const TREE_SPACING = 12.0;

export function DriveWorld({ lightingMode }) {
  const roadMatRef = useRef();
  const roadMeshRef = useRef();
  const fencesLeftRef = useRef();
  const fencesRightRef = useRef();
  const polesRef = useRef();
  const treesRef = useRef();
  const hillsRef = useRef();
  const streaksRef = useRef();
  const headLightLeftRef = useRef();
  const headLightRightRef = useRef();
  const tailLightRef = useRef();

  const isNight = lightingMode === 'night';

  // 1. Procedural Seamless Asphalt Texture with Lane Markings
  const roadTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 2048;
    const ctx = canvas.getContext('2d');

    // Asphalt dark stone base with fine grain
    ctx.fillStyle = '#23252a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Fine aggregate noise
    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * 24;
      data[i] = Math.max(0, Math.min(255, data[i] + noise));
      data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise));
      data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise));
    }
    ctx.putImageData(imgData, 0, 0);

    // Outer gravel shoulder strips
    ctx.fillStyle = '#3a3832';
    ctx.fillRect(0, 0, 48, canvas.height);
    ctx.fillRect(canvas.width - 48, 0, 48, canvas.height);

    // Solid white edge boundary lines
    ctx.fillStyle = '#eceee8';
    ctx.fillRect(52, 0, 16, canvas.height);
    ctx.fillRect(canvas.width - 68, 0, 16, canvas.height);

    // Center broken dashed line (Italian highway / statale standard)
    const dashLength = 128;
    const gapLength = 128;
    const totalCycle = dashLength + gapLength;
    ctx.fillStyle = '#f2f4ec';
    for (let y = 0; y < canvas.height; y += totalCycle) {
      ctx.fillRect(canvas.width / 2 - 8, y, 16, dashLength);
    }

    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(1, 10);
    tex.anisotropy = 16;
    return tex;
  }, []);

  // 2. Procedural Mountain Meadow Grass Texture
  const grassTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Alpine green with warm autumn olive tones (like alfa-profilo.jpeg)
    ctx.fillStyle = '#4c5c2d';
    ctx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = Math.random() * 3 + 1;
      const tone = Math.random();
      ctx.fillStyle = tone > 0.6 ? '#627a38' : tone > 0.3 ? '#3d4d23' : '#736d39';
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

  // 3. Instanced Wooden Fence Geometry & Data
  const fenceCount = 36;
  const fenceDummy = useMemo(() => new THREE.Object3D(), []);

  // 4. Instanced Telegraph Poles Data
  const poleCount = 8;
  const poleDummy = useMemo(() => new THREE.Object3D(), []);

  // 5. Instanced Autumn Trees
  const treeCount = 20;
  const treeDummy = useMemo(() => new THREE.Object3D(), []);
  const treeData = useMemo(() => {
    const list = [];
    for (let i = 0; i < treeCount; i++) {
      const side = i % 2 === 0 ? 1 : -1;
      const x = side * (ROAD_WIDTH * 0.5 + 4.5 + (i * 1.3) % 7);
      const isConifer = i % 3 === 0;
      const scale = 0.85 + (i % 5) * 0.12;
      const color = isConifer
        ? '#243a22'
        : i % 2 === 0
        ? '#c89228' // Golden autumn larch / birch
        : '#8a531e'; // Russet beech
      list.push({ x, isConifer, scale, color });
    }
    return list;
  }, []);

  // 6. Speed motion streaks on the asphalt
  const streakCount = 40;
  const streakGeo = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(streakCount * 2 * 3);
    for (let i = 0; i < streakCount; i++) {
      const x = (Math.random() - 0.5) * (ROAD_WIDTH - 0.6);
      const z = (Math.random() - 0.5) * 40;
      positions[i * 6 + 0] = x;
      positions[i * 6 + 1] = 0.005;
      positions[i * 6 + 2] = z;

      positions[i * 6 + 3] = x;
      positions[i * 6 + 4] = 0.005;
      positions[i * 6 + 5] = z + 1.2 + Math.random() * 2.0;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    return geo;
  }, []);

  useFrame((_, delta) => {
    driveStore.update(delta);

    const offset = driveStore.roadOffset;
    const speed = driveStore.speedKmh;

    // Scroll road texture
    if (roadTexture) {
      roadTexture.offset.y = -offset * 0.0833;
    }

    // Scroll roadside fences
    if (fencesLeftRef.current && fencesRightRef.current) {
      for (let i = 0; i < fenceCount; i++) {
        const localZ = ((i * FENCE_SPACING - offset) % (fenceCount * FENCE_SPACING));
        const zPos = localZ < -30 ? localZ + fenceCount * FENCE_SPACING : localZ;

        // Left fence
        fenceDummy.position.set(-ROAD_WIDTH * 0.5 - 0.6, 0.45, zPos);
        fenceDummy.rotation.set(0, 0, 0);
        fenceDummy.scale.set(1, 1, 1);
        fenceDummy.updateMatrix();
        fencesLeftRef.current.setMatrixAt(i, fenceDummy.matrix);

        // Right fence
        fenceDummy.position.set(ROAD_WIDTH * 0.5 + 0.6, 0.45, zPos);
        fenceDummy.updateMatrix();
        fencesRightRef.current.setMatrixAt(i, fenceDummy.matrix);
      }
      fencesLeftRef.current.instanceMatrix.needsUpdate = true;
      fencesRightRef.current.instanceMatrix.needsUpdate = true;
    }

    // Scroll telegraph poles (right side of road, like alfa-profilo.jpeg)
    if (polesRef.current) {
      const totalSpan = poleCount * POLE_SPACING;
      for (let i = 0; i < poleCount; i++) {
        const localZ = ((i * POLE_SPACING - offset) % totalSpan);
        const zPos = localZ < -30 ? localZ + totalSpan : localZ;
        poleDummy.position.set(ROAD_WIDTH * 0.5 + 2.8, 2.2, zPos);
        poleDummy.rotation.set(0, 0, 0);
        poleDummy.scale.set(1, 1, 1);
        poleDummy.updateMatrix();
        polesRef.current.setMatrixAt(i, poleDummy.matrix);
      }
      polesRef.current.instanceMatrix.needsUpdate = true;
    }

    // Scroll instanced roadside trees
    if (treesRef.current) {
      const totalSpan = treeCount * TREE_SPACING;
      for (let i = 0; i < treeCount; i++) {
        const item = treeData[i];
        const localZ = ((i * TREE_SPACING - offset) % totalSpan);
        const zPos = localZ < -35 ? localZ + totalSpan : localZ;
        treeDummy.position.set(item.x, 1.8 * item.scale, zPos);
        treeDummy.scale.set(item.scale, item.scale, item.scale);
        treeDummy.updateMatrix();
        treesRef.current.setMatrixAt(i, treeDummy.matrix);
      }
      treesRef.current.instanceMatrix.needsUpdate = true;
    }

    // Parallax distant hills
    if (hillsRef.current) {
      hillsRef.current.position.z = -((offset * 0.12) % 40);
    }

    // Speed motion streaks opacity
    if (streaksRef.current) {
      const streakOpacity = Math.max(0, Math.min(0.45, (speed - 40) / 120));
      streaksRef.current.material.opacity = streakOpacity;
    }

    // Dynamic headlight intensity
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

    // Brake light flare
    if (tailLightRef.current) {
      const isBraking = driveStore.brake > 0;
      tailLightRef.current.intensity = THREE.MathUtils.lerp(
        tailLightRef.current.intensity,
        isBraking ? 2.5 : 0.6,
        0.15
      );
    }
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 1. Main Asphalt Mountain Highway */}
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

      {/* 2. Alpine Meadow Verges (Left & Right) */}
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

      {/* 3. Instanced Wooden Fences (Left & Right) */}
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

      {/* 4. Instanced Telegraph Poles (Right verge, from reference photo) */}
      <instancedMesh
        ref={polesRef}
        args={[null, null, poleCount]}
        castShadow
      >
        <cylinderGeometry args={[0.09, 0.12, 4.4, 12]} />
        <meshStandardMaterial color="#3e3024" roughness={0.85} />
      </instancedMesh>

      {/* 5. Instanced Autumn Trees along the green meadow */}
      <instancedMesh
        ref={treesRef}
        args={[null, null, treeCount]}
        castShadow
      >
        <coneGeometry args={[1.5, 3.8, 7]} />
        <meshStandardMaterial color="#c28e28" roughness={0.8} />
      </instancedMesh>

      {/* 6. Distant Layered Alpine Hills (Parallax) */}
      <group ref={hillsRef}>
        <mesh position={[-25, 6, 60]}>
          <coneGeometry args={[45, 18, 12]} />
          <meshStandardMaterial color="#324424" roughness={0.95} />
        </mesh>
        <mesh position={[35, 8, 75]}>
          <coneGeometry args={[55, 22, 12]} />
          <meshStandardMaterial color="#2d3f20" roughness={0.95} />
        </mesh>
        <mesh position={[-10, 10, 95]}>
          <coneGeometry args={[65, 26, 12]} />
          <meshStandardMaterial color="#223319" roughness={0.98} />
        </mesh>
      </group>

      {/* 7. Speed Motion Streaks (Fade in over 50 km/h) */}
      <lineSegments ref={streaksRef} geometry={streakGeo}>
        <lineBasicMaterial
          color="#ffffff"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
        />
      </lineSegments>

      {/* 8. Twin Carello Front Headlight Spotlights (Mounted at Front Bumper +Z) */}
      {/* Driver side front headlight beam */}
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
      {/* Passenger side front headlight beam */}
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

      {/* 9. Rear Red Taillight Soft Glow (-Z) */}
      <pointLight
        ref={tailLightRef}
        position={[0, 0.32, -1.05]}
        color="#ff1a1a"
        intensity={0}
        distance={4.5}
      />
    </group>
  );
}
