// Fixed Subway-Surfers / OutRun 3rd-Person Arcade Chase Camera Director
// Strictly locked camera (cannot be rotated by touch/mouse in drive mode),
// tracks rolling hills (salite/discese), Hill Crest Jumps, and Nitro/Near-Miss FOV surges.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { driveStore } from './driveStore';

export function DriveCameraDirector({ controlsRef }) {
  const { camera } = useThree();
  const currentPosRef = useRef(new THREE.Vector3(0, 1.38, -3.55));
  const currentTargetRef = useRef(new THREE.Vector3(0, 0.42, 4.5));
  const targetFovRef = useRef(46);

  useEffect(() => {
    currentPosRef.current.set(0, 1.38, -3.55);
    currentTargetRef.current.set(0, 0.42, 4.5);
    camera.fov = 46;
    camera.updateProjectionMatrix();
  }, [camera]);

  useFrame((_, delta) => {
    if (driveStore.mode !== 'drive') return;

    const dt = Math.min(delta, 0.1);
    const carX = driveStore.carX;
    const carY = driveStore.carY;
    const airY = driveStore.airY;
    const isGameOver = driveStore.gameState === 'gameover';
    const isNitro =
      driveStore.activePowerups.elvis > 0 ||
      driveStore.activePowerups.bond > 0 ||
      driveStore.boostTimer > 0;
    const speed = driveStore.speedKmh;

    // Road elevation under camera (-3.5) and ahead of car (+5.5) for authentic hill framing
    const camRoadY = driveStore.getRoadElevation(-3.5);
    const lookRoadY = driveStore.getRoadElevation(5.5);

    // Subway Surfers style locked chase camera: follows 68% of carX so lane shifts feel snappy & clear
    let targetX = carX * 0.68;
    let targetY = Math.max(carY, camRoadY * 0.65 + carY * 0.35) + 1.38 + airY * 0.55;
    let targetZ = -3.55 - (airY > 0.05 ? 0.35 : 0);

    let lookX = carX * 0.88;
    let lookY = lookRoadY * 0.75 + carY * 0.25 + 0.38 + airY * 0.35;
    let lookZ = 5.5;

    if (isGameOver) {
      targetX = carX - 1.1;
      targetY = carY + 1.75;
      targetZ = -4.2;
      lookY = carY + 0.35;
      lookZ = 0.6;
    }

    // Subtle high-speed road vibration
    const shakeIntensity = (speed / 200) * 0.008;
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;

    const targetPos = new THREE.Vector3(targetX + shakeX, targetY + shakeY, targetZ);
    const targetLookAt = new THREE.Vector3(lookX, lookY, lookZ);

    // Dynamic FOV expansion on Nitro, Hill Crest Jump, or high speed
    const targetFov = isNitro
      ? 58
      : airY > 0.05
      ? 54
      : speed > 100
      ? 50
      : 46;
    targetFovRef.current = THREE.MathUtils.lerp(targetFovRef.current, targetFov, 0.09);
    if (Math.abs(camera.fov - targetFovRef.current) > 0.1) {
      camera.fov = targetFovRef.current;
      camera.updateProjectionMatrix();
    }

    const lerpRate = isGameOver ? 3.5 : 10.5;
    currentPosRef.current.lerp(targetPos, Math.min(1, dt * lerpRate));
    currentTargetRef.current.lerp(targetLookAt, Math.min(1, dt * lerpRate));

    camera.position.copy(currentPosRef.current);
    camera.lookAt(currentTargetRef.current);

    if (controlsRef.current) {
      controlsRef.current.target.copy(currentTargetRef.current);
    }
  });

  return null;
}
