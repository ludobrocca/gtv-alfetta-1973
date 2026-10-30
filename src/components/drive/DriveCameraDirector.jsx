// Fixed Subway-Surfers / OutRun 3rd-Person Arcade Chase Camera Director
// Strictly locked camera (cannot be rotated by touch/mouse in drive mode),
// tracks rolling hills (salite/discese), Hill Crest Jumps, and Nitro/Near-Miss FOV surges.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { driveStore, INTRO_CAM_DURATION } from './driveStore';

export function DriveCameraDirector({ controlsRef }) {
  const { camera } = useThree();
  const currentPosRef = useRef(new THREE.Vector3(0, 1.38, -3.55));
  const currentTargetRef = useRef(new THREE.Vector3(0, 0.42, 4.5));
  const targetFovRef = useRef(46);
  const isIntroActiveRef = useRef(false);

  useEffect(() => {
    currentPosRef.current.set(0, 1.38, -3.55);
    currentTargetRef.current.set(0, 0.42, 4.5);
    camera.fov = 46;
    camera.up.set(0, 1, 0);
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

    // Standard Subway Surfers style locked chase camera: follows 68% of carX so lane shifts feel snappy & clear
    let targetX = carX * 0.68;
    let targetY = Math.max(carY, camRoadY * 0.65 + carY * 0.35) + 1.38 + airY * 0.55;
    let targetZ = -3.55 - (airY > 0.05 ? 0.35 : 0);

    let lookX = carX * 0.88;
    let lookY = lookRoadY * 0.75 + carY * 0.25 + 0.38 + airY * 0.35;
    let lookZ = 5.5;

    let targetFov = isNitro
      ? 58
      : airY > 0.05
      ? 54
      : speed > 100
      ? 50
      : 46;

    let roll = 0;

    // 1. PS2 Need for Speed Style Dynamic Intro Motion Camera
    const introTimer = driveStore.introCamTimer || 0;
    const introDuration = INTRO_CAM_DURATION || 2.6;
    const isIntro = !isGameOver && introTimer > 0;

    if (isIntro) {
      const p = Math.max(0, Math.min(1, 1 - introTimer / introDuration));
      // Smooth hermite ease curve
      const s = p * p * (3 - 2 * p);

      if (!isIntroActiveRef.current) {
        isIntroActiveRef.current = true;
        // Snap immediately to front low 3/4 angle on first frame of intro
        currentPosRef.current.set(carX + 1.15, carY + 0.32, 3.65);
        currentTargetRef.current.set(carX + 0.05, carY + 0.55, 0.8);
        targetFovRef.current = 62;
        camera.fov = 62;
        camera.updateProjectionMatrix();
      }

      // Continuous parametric arc: Front (+Z) -> Flank (+X) -> Rear Fastback (-Z)
      const introZ = 3.65 * Math.cos(p * Math.PI * 0.5) - 3.55 * Math.sin(p * Math.PI * 0.5);
      const introX = THREE.MathUtils.lerp(carX + 1.15, carX * 0.68, p) + Math.sin(p * Math.PI) * 1.35;
      const introY = THREE.MathUtils.lerp(carY + 0.32, targetY, s) + Math.sin(p * Math.PI) * 0.25;

      // LookAt transition: tracks front/cockpit, then smoothly pivots ahead into the road
      const pivot = p < 0.5 ? 0 : (p - 0.5) * 2;
      const pivotSmooth = pivot * pivot * (3 - 2 * pivot);

      const carFocusX = carX + 0.05;
      const carFocusY = carY + 0.55;
      const carFocusZ = 0.8 - p * 0.6;

      lookX = THREE.MathUtils.lerp(carFocusX, lookX, pivotSmooth);
      lookY = THREE.MathUtils.lerp(carFocusY, lookY, pivotSmooth);
      lookZ = THREE.MathUtils.lerp(carFocusZ, lookZ, pivotSmooth);

      targetX = introX;
      targetY = introY;
      targetZ = introZ;

      // Dynamic FOV easing from 62° grandangolo down to 46°
      targetFov = THREE.MathUtils.lerp(62, 46, s);

      // Subtle PS2 arcade Dutch angle (roll) that levels out upon docking
      roll = (1 - p) * Math.cos(p * Math.PI * 1.2) * -0.075;
    } else if (isIntroActiveRef.current) {
      isIntroActiveRef.current = false;
      camera.up.set(0, 1, 0);
    }

    // 2. GameOver dramatic side crash cam
    if (isGameOver) {
      targetX = carX - 1.1;
      targetY = carY + 1.75;
      targetZ = -4.2;
      lookY = carY + 0.35;
      lookZ = 0.6;
      targetFov = 46;
      roll = 0;
    }

    // 3. Takedown Cam: dramatic slow-mo zoom on knocked-out rival
    let isTakedownCam = false;
    const takedownTimer = driveStore.takedownCamTimer || 0;
    const takedownTarget = driveStore.takedownCamTarget;
    if (!isGameOver && !isIntro && takedownTimer > 0 && takedownTarget && takedownTarget.id && driveStore.obstacles) {
      const targetObs = driveStore.obstacles.find((o) => o.id === takedownTarget.id);
      if (targetObs) {
        isTakedownCam = true;
        const side = takedownTarget.side || 1;
        const obsX = targetObs.knockX !== undefined ? targetObs.knockX : (targetObs.lane || 0) * 1.8;
        const obsZ = targetObs.z ?? 0;

        targetX = obsX + side * 2.2;
        targetY = carY + 1.1;
        targetZ = obsZ - 1.6;

        lookX = obsX;
        lookY = carY + 0.35;
        lookZ = obsZ;
        targetFov = 38;
      }
    }

    // Road vibration (disabled during cinematics)
    const shakeIntensity = isTakedownCam || isIntro ? 0 : (speed / 200) * 0.008;
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;

    const targetPos = new THREE.Vector3(targetX + shakeX, targetY + shakeY, targetZ);
    const targetLookAt = new THREE.Vector3(lookX, lookY, lookZ);

    targetFovRef.current = THREE.MathUtils.lerp(
      targetFovRef.current,
      targetFov,
      isTakedownCam ? 0.22 : isIntro ? 0.16 : 0.09
    );
    if (Math.abs(camera.fov - targetFovRef.current) > 0.1) {
      camera.fov = targetFovRef.current;
      camera.updateProjectionMatrix();
    }

    // Dynamic camera bank / roll (Dutch angle)
    if (Math.abs(roll) > 0.001) {
      camera.up.set(Math.sin(roll), Math.cos(roll), 0);
    } else if (camera.up.x !== 0 || camera.up.y !== 1) {
      camera.up.set(0, 1, 0);
    }

    const lerpRate = isGameOver ? 3.5 : isTakedownCam ? 18.0 : isIntro ? 14.0 : 10.5;
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
