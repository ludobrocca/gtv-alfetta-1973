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

const MODEL_PATH = '/models/alfa-romeo-1973-cad.glb?v=4';

export const PAINT_FINISHES = [
  {
    id: 'ar727-reale',
    name: 'Grigio Chiaro Metallizzato AR 727 (Originale)',
    yearCode: 'AR 727 • TARGA 463880 PD',
    swatch: 'linear-gradient(135deg, #dce4ec 0%, #aebac6 55%, #6e7885 100%)',
    swatchColor: '#BCC7D2',
    color: '#bcc7d2',
    metalness: 0.62,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
  },
  {
    id: 'argento',
    name: 'Argento Alfa Metallizzato (Chiaro)',
    yearCode: 'AR 760 • 1973',
    swatchColor: '#D0D7DF',
    color: '#cfd7df',
    metalness: 0.72,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.35,
  },
  {
    id: 'rosso',
    name: 'Rosso Alfa 1973',
    yearCode: 'AR 501 • 1973',
    swatchColor: '#9E1B24',
    color: '#9b151e',
    metalness: 0.22,
    roughness: 0.18,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.2,
  },
  {
    id: 'blu',
    name: 'Blu Olandese',
    yearCode: 'AR 343 • 1973',
    swatchColor: '#1B2E4B',
    color: '#172944',
    metalness: 0.45,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
  },
  {
    id: 'verde',
    name: 'Verde Pino',
    yearCode: 'AR 216 • 1973',
    swatchColor: '#1E3F2E',
    color: '#193728',
    metalness: 0.4,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.25,
  },
  {
    id: 'clay',
    name: 'Studio Clay • Centro Stile',
    yearCode: 'ITALDESIGN • PROTOTIPO',
    swatchColor: '#D8D2C7',
    color: '#d4cec3',
    metalness: 0.08,
    roughness: 0.48,
    clearcoat: 0.3,
    clearcoatRoughness: 0.25,
    envMapIntensity: 0.85,
  },
];

export const CAMERA_PRESETS = [
  {
    id: 'front',
    label: 'Fronte',
    position: [0, 0.95, 4.2],
    target: [0, 0.25, 0],
  },
  {
    id: 'hero',
    label: '3/4 Showroom',
    position: [3.2, 1.15, 3.5],
    target: [0, 0.25, 0],
  },
  {
    id: 'side',
    label: 'Profilo',
    position: [4.6, 0.82, 0],
    target: [0, 0.25, 0],
  },
  {
    id: 'rear',
    label: '3/4 Posteriore',
    position: [-3.2, 1.2, -3.5],
    target: [0, 0.25, 0],
  },
  {
    id: 'top',
    label: "Dall'Alto",
    position: [0, 5.2, 0.4],
    target: [0, 0.2, 0],
  },
];

/**
 * Builds dedicated high-grade Three.js PBR materials for each named sub-mesh
 * in our multi-material parametric CAD .glb model:
 * - CarPaint: Dynamic automotive lacquer + clearcoat (changes with UI paint selector)
 * - Chrome: Mirror-polished stainless steel & chrome bumpers/Scudetto/trim
 * - Glass: Transparent green-tinted automotive glass showing the 3D interior cabin
 * - RubberBlack: Matte Pirelli tires, rubber overriders (rostri), slatted grille, C-pillar louvers
 * - AlloyRim: 16-slot Campagnolo silver alloy wheel rims
 * - HeadlightLens: Crystal Carello fluted glass headlights
 * - AmberLens / RedTaillight: Translucent indicator & taillight lenses
 * - InteriorDark / InteriorWood: Cabin seats, twin-binnacle dashboard & wooden steering wheel
 */
function createShowroomMaterials(selectedPaint) {
  return {
    CarPaint: new THREE.MeshPhysicalMaterial({
      name: 'CarPaint',
      color: new THREE.Color(selectedPaint.color),
      metalness: selectedPaint.metalness,
      roughness: selectedPaint.roughness,
      clearcoat: selectedPaint.clearcoat,
      clearcoatRoughness: selectedPaint.clearcoatRoughness,
      envMapIntensity: selectedPaint.envMapIntensity,
      reflectivity: 0.9,
      side: THREE.DoubleSide,
    }),
    Chrome: new THREE.MeshPhysicalMaterial({
      name: 'Chrome',
      color: new THREE.Color('#f4f7fb'),
      metalness: 0.96,
      roughness: 0.06,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.55,
      side: THREE.DoubleSide,
    }),
    Glass: new THREE.MeshPhysicalMaterial({
      name: 'Glass',
      color: new THREE.Color('#192e2b'),
      transparent: true,
      opacity: 0.62,
      metalness: 0.15,
      roughness: 0.04,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      envMapIntensity: 1.45,
      side: THREE.DoubleSide,
    }),
    RubberBlack: new THREE.MeshStandardMaterial({
      name: 'RubberBlack',
      color: new THREE.Color('#141619'),
      metalness: 0.04,
      roughness: 0.84,
      side: THREE.DoubleSide,
    }),
    AlloyRim: new THREE.MeshPhysicalMaterial({
      name: 'AlloyRim',
      color: new THREE.Color('#d8e0e8'),
      metalness: 0.82,
      roughness: 0.19,
      clearcoat: 0.65,
      clearcoatRoughness: 0.12,
      envMapIntensity: 1.35,
      side: THREE.DoubleSide,
    }),
    HeadlightLens: new THREE.MeshPhysicalMaterial({
      name: 'HeadlightLens',
      color: new THREE.Color('#f6faff'),
      emissive: new THREE.Color('#282e38'),
      emissiveIntensity: 0.35,
      metalness: 0.25,
      roughness: 0.04,
      clearcoat: 1.0,
      envMapIntensity: 1.5,
      side: THREE.DoubleSide,
    }),
    AmberLens: new THREE.MeshPhysicalMaterial({
      name: 'AmberLens',
      color: new THREE.Color('#e6740a'),
      emissive: new THREE.Color('#381800'),
      emissiveIntensity: 0.25,
      metalness: 0.1,
      roughness: 0.1,
      clearcoat: 1.0,
      side: THREE.DoubleSide,
    }),
    RedTaillight: new THREE.MeshPhysicalMaterial({
      name: 'RedTaillight',
      color: new THREE.Color('#a61218'),
      emissive: new THREE.Color('#2c0305'),
      emissiveIntensity: 0.25,
      metalness: 0.1,
      roughness: 0.1,
      clearcoat: 1.0,
      side: THREE.DoubleSide,
    }),
    InteriorDark: new THREE.MeshStandardMaterial({
      name: 'InteriorDark',
      color: new THREE.Color('#16181c'),
      metalness: 0.06,
      roughness: 0.72,
      side: THREE.DoubleSide,
    }),
    InteriorWood: new THREE.MeshPhysicalMaterial({
      name: 'InteriorWood',
      color: new THREE.Color('#703816'),
      metalness: 0.08,
      roughness: 0.22,
      clearcoat: 0.85,
      side: THREE.DoubleSide,
    }),
  };
}

/**
 * Authentic Padova Vintage Black License Plates ("463880 PD")
 * mounted under the front-right bumper and centered on the rear Kamm tail panel.
 */
function VintageLicensePlates() {
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
    <>
      {/* Front bumper plate (offset on driver's side as in real photo) */}
      <mesh
        position={[-0.952, -0.102, 0.088]}
        rotation={[0, -Math.PI / 2, 0]}
        castShadow
      >
        <boxGeometry args={[0.145, 0.036, 0.006]} />
        <meshStandardMaterial
          map={plateTexture}
          roughness={0.38}
          metalness={0.12}
        />
      </mesh>

      {/* Rear Kamm tail centered plate between taillights */}
      <mesh
        position={[0.938, 0.035, 0.0]}
        rotation={[0, Math.PI / 2, 0]}
        castShadow
      >
        <boxGeometry args={[0.155, 0.042, 0.006]} />
        <meshStandardMaterial
          map={plateTexture}
          roughness={0.38}
          metalness={0.12}
        />
      </mesh>
    </>
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
          ALFA ROMEO • CARICAMENTO MODELLO 3D CAD
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
            MULTI-MESH CAD &amp; SHADER
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
 * Loads the multi-material CAD GLB model of the Alfa Romeo Alfetta GTV
 * and binds dedicated PBR materials to each sub-mesh (CarPaint, Chrome, Glass,
 * RubberBlack, AlloyRim, HeadlightLens, AmberLens, RedTaillight, Interior).
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

        child.castShadow = true;
        child.receiveShadow = true;

        if (!child.userData.originalMaterialName) {
          child.userData.originalMaterialName =
            (child.material && child.material.name) || 'CarPaint';
        }
      }
    });

    return cloned;
  }, [scene]);

  const materialsMap = useMemo(
    () => createShowroomMaterials(selectedPaint),
    [selectedPaint]
  );

  useEffect(() => {
    preparedScene.traverse((child) => {
      if (child.isMesh) {
        const matName = child.userData.originalMaterialName || 'CarPaint';
        const targetMat = materialsMap[matName] || materialsMap.CarPaint;
        child.material = targetMat;
        child.material.needsUpdate = true;
      }
    });

    return () => {
      Object.values(materialsMap).forEach((mat) => mat.dispose());
    };
  }, [preparedScene, materialsMap]);

  return (
    <Center top>
      {/* Rotate +90° around Y so the -X front shark-nose faces +Z toward the front camera */}
      <group rotation={[0, Math.PI / 2, 0]}>
        <primitive object={preparedScene} />
        <VintageLicensePlates />
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
      target: target || [0, 0.25, 0],
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

      {/* Soft Hemisphere Fill */}
      <hemisphereLight
        args={[
          isLight ? '#ffffff' : '#dce6f5',
          isLight ? '#c8c4bc' : '#2a2d34',
          isLight ? 0.9 : 0.65,
        ]}
      />

      {/* Primary Key Directional Light with Soft Shadows */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={isLight ? 1.4 : 1.55}
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
        intensity={isLight ? 1.0 : 1.75}
        color={isLight ? '#ffffff' : '#ebd4b7'}
      />

      {/* Subtle Front Fill Light for Carello Headlights & Scudetto Alfa Romeo */}
      <directionalLight
        position={[0, 2.2, 6]}
        intensity={isLight ? 0.7 : 0.6}
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
        camera={{ position: [3.2, 1.15, 3.5], fov: 40, near: 0.1, far: 100 }}
        gl={{
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: isLight ? 0.96 : 1.05,
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
