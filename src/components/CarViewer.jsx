import React, { Suspense, useEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { Canvas, useThree } from '@react-three/fiber';
import {
  Bounds,
  Center,
  ContactShadows,
  Environment,
  Html,
  MeshReflectorMaterial,
  OrbitControls,
  useBounds,
  useGLTF,
  useProgress,
} from '@react-three/drei';

const MODEL_PATH = '/models/alfa-romeo-1973.glb';

export const PAINT_FINISHES = [
  {
    id: 'argento',
    name: 'Grigio Chiaro Metallizzato AR 727 (Originale)',
    yearCode: 'AR 727 • TARGA 463880 PD',
    swatchColor: '#BCC6D0',
    color: '#b8c3ce',
    useRealDetails: false,
    metalness: 0.48,
    roughness: 0.31,
    clearcoat: 0.85,
    clearcoatRoughness: 0.14,
    envMapIntensity: 0.9,
  },
  {
    id: 'ar727-reale',
    name: 'Grigio AR 727 (Bicolore Soft Vetri/Ruote)',
    yearCode: 'AR 727 • DETTAGLI SFUMATI',
    swatch: 'linear-gradient(135deg, #d4dde6 0%, #9aa6b4 55%, #2b3038 100%)',
    swatchColor: '#C4CED8',
    color: '#ffffff',
    useRealDetails: true,
    metalness: 0.45,
    roughness: 0.33,
    clearcoat: 0.82,
    clearcoatRoughness: 0.15,
    envMapIntensity: 0.88,
  },
  {
    id: 'rosso',
    name: 'Rosso Alfa 1973',
    yearCode: 'AR 501 • 1973',
    swatchColor: '#9E1B24',
    color: '#96141d',
    useRealDetails: false,
    metalness: 0.28,
    roughness: 0.24,
    clearcoat: 0.92,
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.9,
  },
  {
    id: 'blu',
    name: 'Blu Olandese',
    yearCode: 'AR 343 • 1973',
    swatchColor: '#1B2E4B',
    color: '#182b47',
    useRealDetails: false,
    metalness: 0.45,
    roughness: 0.28,
    clearcoat: 0.88,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.9,
  },
  {
    id: 'verde',
    name: 'Verde Pino',
    yearCode: 'AR 216 • 1973',
    swatchColor: '#1E3F2E',
    color: '#1b3a2a',
    useRealDetails: false,
    metalness: 0.42,
    roughness: 0.28,
    clearcoat: 0.88,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.9,
  },
  {
    id: 'clay',
    name: 'Studio Clay • Centro Stile',
    yearCode: 'ITALDESIGN • PROTOTIPO',
    swatchColor: '#D8D2C7',
    color: '#d4cec3',
    useRealDetails: false,
    metalness: 0.08,
    roughness: 0.52,
    clearcoat: 0.25,
    clearcoatRoughness: 0.3,
    envMapIntensity: 0.75,
    preserveOriginalIfTextured: true,
  },
];

export const CAMERA_PRESETS = [
  {
    id: 'front',
    label: 'Fronte',
    position: [0, 1.1, 4.2],
    target: [0, 0.32, 0],
  },
  {
    id: 'hero',
    label: '3/4 Showroom',
    position: [3.2, 1.3, 3.6],
    target: [0, 0.32, 0],
  },
  {
    id: 'side',
    label: 'Profilo',
    position: [4.5, 0.95, 0],
    target: [0, 0.32, 0],
  },
  {
    id: 'rear',
    label: '3/4 Posteriore',
    position: [-3.2, 1.35, -3.5],
    target: [0, 0.32, 0],
  },
  {
    id: 'top',
    label: "Dall'Alto",
    position: [0, 5.2, 0.4],
    target: [0, 0.2, 0],
  },
];

/**
 * Generates smooth, multi-pass diffused vertex colors with smoothstep feathering
 * so there are zero jagged triangle boundaries while subtly darkening tires,
 * underbody, and tinted cabin glass.
 */
function applySmoothFeatheredVertexColors(geometry) {
  const posAttr = geometry.attributes.position;
  const normAttr = geometry.attributes.normal;
  const indexAttr = geometry.index;
  if (!posAttr) return;

  const count = posAttr.count;
  const colors = new Float32Array(count * 3);

  const cBody = new THREE.Color('#bcc7d2'); // Grigio Chiaro Metallizzato AR 727
  const cBodyTop = new THREE.Color('#cad4de'); // Subtle zenith highlight
  const cTire = new THREE.Color('#23262b'); // Soft charcoal rubber
  const cRim = new THREE.Color('#d6dde5'); // Alloy rim
  const cGlass = new THREE.Color('#3b4654'); // Soft smoked cabin glass
  const cGrille = new THREE.Color('#2d323a'); // Soft dark radiator grille

  const tmpColor = new THREE.Color();
  const smoothstep = THREE.MathUtils.smoothstep;

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i);
    const y = posAttr.getY(i);
    const z = posAttr.getZ(i);
    const absZ = Math.abs(z);

    const ny = normAttr ? normAttr.getY(i) : 1;
    const nz = normAttr ? normAttr.getZ(i) : 0;
    const absNz = Math.abs(nz);

    tmpColor.copy(cBody).lerp(cBodyTop, Math.max(0, ny * 0.35));

    // Smoothly feathered wheels & tires
    const distFrontWheel = Math.hypot(x - -0.558, y - -0.14);
    const distRearWheel = Math.hypot(x - 0.535, y - -0.138);
    const wheelDist = Math.min(distFrontWheel, distRearWheel);

    if (wheelDist < 0.19 && absZ > 0.24) {
      const outerFade = 1.0 - smoothstep(wheelDist, 0.145, 0.185);
      const rimBlend = 1.0 - smoothstep(wheelDist, 0.085, 0.115);
      const zFade = smoothstep(absZ, 0.24, 0.31);
      const wheelColor = cTire.clone().lerp(cRim, rimBlend);
      tmpColor.lerp(wheelColor, outerFade * zFade);
    }

    // Smoothly feathered underbody shadow
    if (y < -0.18) {
      const underFade = 1.0 - smoothstep(y, -0.24, -0.18);
      tmpColor.lerp(cTire, underFade * 0.85);
    }

    // Smoothly feathered cabin glass
    if (y > 0.08 && y < 0.27 && x > -0.32 && x < 0.68) {
      const yFade = smoothstep(y, 0.085, 0.12) * (1.0 - smoothstep(y, 0.235, 0.268));
      const xFade = smoothstep(x, -0.31, -0.22) * (1.0 - smoothstep(x, 0.58, 0.67));
      const glassNormalWeight = smoothstep(1.0 - ny, 0.18, 0.55);
      const sideGlass = smoothstep(absNz, 0.5, 0.82);
      const blend = Math.max(glassNormalWeight * 0.65, sideGlass) * yFade * xFade;
      tmpColor.lerp(cGlass, blend * 0.78);
    }

    // Smoothly feathered front radiator recess
    if (x < -0.87 && y > -0.045 && y < 0.035 && absZ > 0.055 && absZ < 0.32) {
      const frontFade = 1.0 - smoothstep(x, -0.93, -0.87);
      const yFade =
        smoothstep(y, -0.045, -0.02) * (1.0 - smoothstep(y, 0.015, 0.035));
      tmpColor.lerp(cGrille, frontFade * yFade * 0.7);
    }

    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  // Topological vertex color diffusion (4 passes) to eliminate any triangle stair-stepping
  if (indexAttr) {
    const idx = indexAttr.array;
    const neighborSum = new Float32Array(count * 3);
    const neighborCount = new Uint16Array(count);

    for (let pass = 0; pass < 4; pass++) {
      neighborSum.fill(0);
      neighborCount.fill(0);

      for (let t = 0; t < idx.length; t += 3) {
        const a = idx[t];
        const b = idx[t + 1];
        const c = idx[t + 2];

        const pairs = [
          [a, b],
          [b, c],
          [c, a],
        ];
        for (let p = 0; p < 3; p++) {
          const u = pairs[p][0];
          const v = pairs[p][1];
          neighborSum[u * 3] += colors[v * 3];
          neighborSum[u * 3 + 1] += colors[v * 3 + 1];
          neighborSum[u * 3 + 2] += colors[v * 3 + 2];
          neighborCount[u]++;

          neighborSum[v * 3] += colors[u * 3];
          neighborSum[v * 3 + 1] += colors[u * 3 + 1];
          neighborSum[v * 3 + 2] += colors[u * 3 + 2];
          neighborCount[v]++;
        }
      }

      for (let i = 0; i < count; i++) {
        const k = neighborCount[i];
        if (k > 0) {
          colors[i * 3] = 0.45 * colors[i * 3] + 0.55 * (neighborSum[i * 3] / k);
          colors[i * 3 + 1] =
            0.45 * colors[i * 3 + 1] + 0.55 * (neighborSum[i * 3 + 1] / k);
          colors[i * 3 + 2] =
            0.45 * colors[i * 3 + 2] + 0.55 * (neighborSum[i * 3 + 2] / k);
        }
      }
    }
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Authentic 1973 Padova Vintage Black License Plate ("463880 PD")
 * tucked flush beneath the front-right bumper.
 */
function VintageLicensePlate() {
  const plateTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#0f1012';
    ctx.fillRect(0, 0, 512, 128);

    ctx.strokeStyle = '#d8dee6';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, 500, 116);

    ctx.fillStyle = '#f4f6f8';
    ctx.font = 'bold 74px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('463880 PD', 256, 68);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  }, []);

  return (
    <mesh
      position={[-0.908, -0.155, 0.088]}
      rotation={[0, -Math.PI / 2, 0]}
      castShadow
    >
      <boxGeometry args={[0.155, 0.038, 0.006]} />
      <meshStandardMaterial
        map={plateTexture}
        roughness={0.4}
        metalness={0.12}
      />
    </mesh>
  );
}

/**
 * Refined HTML loader displayed inside the 3D Canvas while the GLB model streams in.
 */
function ShowroomLoader({ lightingMode }) {
  const { progress } = useProgress();
  const isLight = lightingMode === 'studio';

  return (
    <Html center>
      <div
        className={`w-72 sm:w-80 rounded-2xl p-6 text-center transition-all duration-300 ${
          isLight
            ? 'glass-panel-light text-zinc-900'
            : 'glass-panel-dark text-zinc-100'
        }`}
      >
        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-alfa-gold/40 bg-alfa-gold/10 text-[10px] font-mono uppercase tracking-[0.2em] text-alfa-gold mb-3">
          <span>Arese • Targa 463880 PD</span>
        </div>

        <p className="font-serif text-xl italic tracking-wide mb-1">
          Alfa Romeo Alfetta GTV
        </p>
        <p
          className={`text-[11px] font-mono tracking-[0.16em] uppercase mb-4 ${
            isLight ? 'text-zinc-500' : 'text-zinc-400'
          }`}
        >
          ALFA ROMEO 1973 • CARICAMENTO MODELLO 3D
        </p>

        <div
          className={`w-full h-1.5 rounded-full overflow-hidden mb-2.5 ${
            isLight ? 'bg-zinc-300/80' : 'bg-zinc-800/90'
          }`}
        >
          <div
            className="h-full bg-gradient-to-r from-[#9E1B24] via-[#C8102E] to-[#C5A059] transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(8, progress))}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono">
          <span className={isLight ? 'text-zinc-500' : 'text-zinc-400'}>
            GRIGIO AR 727 &amp; SHADER
          </span>
          <span className="text-alfa-gold font-medium">
            {Math.round(progress)}%
          </span>
        </div>
      </div>
    </Html>
  );
}

/**
 * Loads the Taubin-smoothed 1973 Alfa Romeo GLB model and applies satin metallic clearcoat.
 */
function AlfaRomeoModel({ activePaintId }) {
  const { scene } = useGLTF(MODEL_PATH);

  const selectedPaint = useMemo(
    () =>
      PAINT_FINISHES.find((paint) => paint.id === activePaintId) ||
      PAINT_FINISHES[0],
    [activePaintId]
  );

  const preparedScene = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.geometry = child.geometry.clone();

        if (!child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals();
        }

        applySmoothFeatheredVertexColors(child.geometry);

        child.castShadow = true;
        child.receiveShadow = true;

        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material;
        }
      }
    });

    return cloned;
  }, [scene]);

  const carPaintMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(selectedPaint.color),
      vertexColors: Boolean(selectedPaint.useRealDetails),
      metalness: selectedPaint.metalness,
      roughness: selectedPaint.roughness,
      clearcoat: selectedPaint.clearcoat,
      clearcoatRoughness: selectedPaint.clearcoatRoughness,
      envMapIntensity: selectedPaint.envMapIntensity,
      reflectivity: 0.78,
    });
  }, [selectedPaint]);

  useEffect(() => {
    preparedScene.traverse((child) => {
      if (child.isMesh) {
        const origMat = child.userData.originalMaterial;
        const hasOriginalTexture = Boolean(
          origMat && (origMat.map || origMat.metalnessMap || origMat.normalMap)
        );

        if (selectedPaint.preserveOriginalIfTextured && hasOriginalTexture) {
          child.material = origMat;
        } else {
          child.material = carPaintMaterial;
        }
        child.material.needsUpdate = true;
      }
    });

    return () => {
      carPaintMaterial.dispose();
    };
  }, [preparedScene, carPaintMaterial, selectedPaint]);

  return (
    <Center top>
      {/* Rotate +90° around Y so the raw -X hood faces +Z toward the front camera */}
      <group rotation={[0, Math.PI / 2, 0]}>
        <primitive object={preparedScene} />
        <VintageLicensePlate />
      </group>
    </Center>
  );
}

/**
 * Coordinates smooth camera transitions with <Bounds> and OrbitControls.
 */
function CameraRig({ cameraRequest, controlsRef }) {
  const bounds = useBounds();
  const { camera } = useThree();

  useEffect(() => {
    if (!cameraRequest || !bounds) return;

    const { position, target } = cameraRequest;
    bounds.refresh().moveTo(position).lookAt({
      target: target || [0, 0.32, 0],
    });

    if (controlsRef.current && target) {
      controlsRef.current.target.set(target[0], target[1], target[2]);
      controlsRef.current.update();
    }
  }, [cameraRequest, bounds, camera, controlsRef]);

  return null;
}

/**
 * Synchronizes scene background and balanced studio/night lighting.
 */
function ShowroomAtmosphere({ lightingMode }) {
  const isLight = lightingMode === 'studio';
  const bgColor = isLight ? '#e8e6e1' : '#111113';

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 9, 24]} />

      {/* Soft Hemisphere Fill so silver paint never has harsh black horizon bands */}
      <hemisphereLight
        args={[
          isLight ? '#ffffff' : '#dce6f5',
          isLight ? '#c8c4bc' : '#2a2d34',
          isLight ? 0.95 : 0.65,
        ]}
      />

      {/* Primary Key Directional Light with Soft Shadows */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={isLight ? 1.35 : 1.45}
        color={isLight ? '#fffdf8' : '#f4f7ff'}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-bias={-0.00015}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-4}
        shadow-camera-right={4}
        shadow-camera-top={4}
        shadow-camera-bottom={-4}
      />

      {/* Warm Italian Showroom Rim Spotlight */}
      <spotLight
        position={[-6, 6, -5]}
        angle={0.5}
        penumbra={1}
        intensity={isLight ? 0.95 : 1.65}
        color={isLight ? '#ffffff' : '#ebd4b7'}
      />

      {/* Subtle Front Fill Light for Carello Headlights & Scudetto Alfa Romeo */}
      <directionalLight
        position={[0, 2.2, 6]}
        intensity={isLight ? 0.65 : 0.55}
        color={isLight ? '#ffffff' : '#d6e0f0'}
      />

      {/* HDRI Reflections */}
      <Environment preset={isLight ? 'studio' : 'city'} />
    </>
  );
}

export default function CarViewer({
  autoRotate,
  lightingMode,
  activePaintId,
  cameraRequest,
}) {
  const controlsRef = useRef(null);
  const isLight = lightingMode === 'studio';

  return (
    <div className="relative w-full h-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        camera={{ position: [3.2, 1.3, 3.6], fov: 40, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isLight ? 0.92 : 1.02,
        }}
      >
        <ShowroomAtmosphere lightingMode={lightingMode} />

        <Suspense fallback={<ShowroomLoader lightingMode={lightingMode} />}>
          <Bounds fit clip observe margin={1.2}>
            <AlfaRomeoModel activePaintId={activePaintId} />
            <CameraRig
              cameraRequest={cameraRequest}
              controlsRef={controlsRef}
            />
          </Bounds>

          {/* Ground Contact Shadows */}
          <ContactShadows
            position={[0, -0.01, 0]}
            opacity={0.7}
            scale={10}
            blur={2}
            far={4}
          />

          {/* Luxury Showroom Reflective Floor Disc */}
          <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.015, 0]}
            receiveShadow
          >
            <circleGeometry args={[12, 64]} />
            <MeshReflectorMaterial
              blur={[300, 80]}
              resolution={1024}
              mixBlur={0.9}
              mixStrength={isLight ? 0.2 : 0.5}
              roughness={isLight ? 0.68 : 0.4}
              depthScale={1}
              minDepthThreshold={0.4}
              maxDepthThreshold={1.4}
              color={isLight ? '#dcd9d0' : '#131418'}
              metalness={isLight ? 0.12 : 0.4}
            />
          </mesh>
        </Suspense>

        <OrbitControls
          ref={controlsRef}
          makeDefault
          enablePan={false}
          minPolarAngle={0}
          maxPolarAngle={Math.PI / 2.05}
          minDistance={2}
          maxDistance={10}
          autoRotate={autoRotate}
          autoRotateSpeed={0.8}
          enableDamping
          dampingFactor={0.05}
        />
      </Canvas>
    </div>
  );
}

useGLTF.preload(MODEL_PATH);
