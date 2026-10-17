// Cinematic Camera Director for Drive Mode
// Smoothly cycles through dynamic automotive cinematography angles (rear chase,
// side tracking, low-angle front hero, high helicopter, wheel close-up)
// with seamless handoff to manual user OrbitControls and speed-dependent vibration.

import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { driveStore } from './driveStore';

const CINEMATIC_SHOTS = [
  {
    name: 'chase',
    pos: [0.6, 0.95, -3.6],
    target: [0.0, 0.38, 0.8],
    fov: 42,
    duration: 8.5,
  },
  {
    name: 'side',
    pos: [4.2, 0.75, 0.3],
    target: [0.0, 0.34, 0.2],
    fov: 38,
    duration: 7.5,
  },
  {
    name: 'low_front',
    pos: [-1.5, 0.42, 3.2],
    target: [0.0, 0.36, 0.0],
    fov: 44,
    duration: 8.0,
  },
  {
    name: 'helicopter',
    pos: [-2.6, 2.4, 2.8],
    target: [0.0, 0.30, 0.0],
    fov: 46,
    duration: 9.0,
  },
  {
    name: 'wheel_gtv',
    pos: [2.2, 0.45, -0.7],
    target: [0.35, 0.22, -0.2],
    fov: 36,
    duration: 7.0,
  },
];

export function DriveCameraDirector({ controlsRef }) {
  const { camera } = useThree();
  const shotIndexRef = useRef(0);
  const shotTimerRef = useRef(0);
  const currentPosRef = useRef(new THREE.Vector3(0.6, 0.95, -3.6));
  const currentTargetRef = useRef(new THREE.Vector3(0, 0.38, 0.8));

  // Reset when entering drive mode
  useEffect(() => {
    shotIndexRef.current = 0;
    shotTimerRef.current = 0;
  }, []);

  useFrame((_, delta) => {
    if (driveStore.mode !== 'drive') return;

    // Check if user is actively manually manipulating OrbitControls
    if (driveStore.userInteracting) {
      return;
    }

    const currentShot = CINEMATIC_SHOTS[shotIndexRef.current];
    shotTimerRef.current += delta;

    if (shotTimerRef.current > currentShot.duration) {
      shotTimerRef.current = 0;
      shotIndexRef.current = (shotIndexRef.current + 1) % CINEMATIC_SHOTS.length;
    }

    const targetShot = CINEMATIC_SHOTS[shotIndexRef.current];
    const targetPos = new THREE.Vector3(...targetShot.pos);
    const targetLookAt = new THREE.Vector3(...targetShot.target);

    // Subtle speed-dependent camera shake
    const speed = driveStore.speedKmh;
    const shakeIntensity = (speed / 200) * 0.008;
    const shakeX = (Math.random() - 0.5) * shakeIntensity;
    const shakeY = (Math.random() - 0.5) * shakeIntensity;
    const shakeZ = (Math.random() - 0.5) * shakeIntensity;

    targetPos.x += shakeX;
    targetPos.y += shakeY;
    targetPos.z += shakeZ;

    // Smoothly interpolate camera position & lookAt target
    const lerpSpeed = Math.min(1, delta * 2.2);
    currentPosRef.current.lerp(targetPos, lerpSpeed);
    currentTargetRef.current.lerp(targetLookAt, lerpSpeed);

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
