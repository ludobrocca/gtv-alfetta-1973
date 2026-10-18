// Dynamic 3rd-Person Chase Camera Director for 3-Lane Runner
// Keeps the Alfetta centered during lane changes, handles Elvis FOV nitro zoom,
// camera shake, and crash dramatic freeze frame.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { driveStore } from './driveStore';

export function DriveCameraDirector({ controlsRef }) {
  const { camera } = useThree();
  const currentPosRef = useRef(new THREE.Vector3(0, 1.25, -3.4));
  const currentTargetRef = useRef(new THREE.Vector3(0, 0.38, 2.0));
  const targetFovRef = useRef(45);

  useEffect(() => {
    currentPosRef.current.set(0, 1.25, -3.4);
    currentTargetRef.current.set(0, 0.38, 2.0);
    camera.fov = 45;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame((_, delta) => {
    if (driveStore.mode !== 'drive') return;

    // Check if user is actively touching OrbitControls
    if (driveStore.userInteracting) {
      return;
    }

    const dt = Math.min(delta, 0.1);
    const carX = driveStore.carX;
    const isGameOver = driveStore.gameState === 'gameover';
    const isElvisActive = driveStore.activePowerups.elvis > 0;
    const speed = driveStore.speedKmh;

    // Base target position behind car
    let targetX = carX * 0.72;
    let targetY = 1.28;
    let targetZ = -3.4;

    let lookX = carX;
    let lookY = 0.38;
    let lookZ = 1.8;

    if (isGameOver) {
      // Pull back dramatically on crash
      targetX = carX - 1.2;
      targetY = 1.65;
      targetZ = -4.2;
      lookZ = 0.5;
    }

    // Speed camera shake
    const shakeIntensity = (speed / 200) * 0.009;
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;

    const targetPos = new THREE.Vector3(targetX + shakeX, targetY + shakeY, targetZ);
    const targetLookAt = new THREE.Vector3(lookX, lookY, lookZ);

    // Elvis Nitro FOV expansion (+12 degrees)
    const targetFov = isElvisActive ? 57 : (speed > 100 ? 49 : 45);
    targetFovRef.current = THREE.MathUtils.lerp(targetFovRef.current, targetFov, 0.08);
    if (Math.abs(camera.fov - targetFovRef.current) > 0.1) {
      camera.fov = targetFovRef.current;
      camera.updateProjectionMatrix();
    }

    // Smooth camera interpolation
    const lerpRate = isGameOver ? 3.0 : 8.0;
    currentPosRef.current.lerp(targetPos, Math.min(1, dt * lerpRate));
    currentTargetRef.current.lerp(targetLookAt, Math.min(1, dt * lerpRate));

    camera.position.copy(currentPosRef.current);

    if (controlsRef.current) {
      controlsRef.current.target.copy(currentTargetRef.current);
      controlsRef.current.update();
    } else {
      camera.lookAt(currentTargetRef.current);
    }
  });

  return null;
}
