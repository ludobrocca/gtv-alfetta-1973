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
    id: 'ar727-reale',
    name: 'Grigio Chiaro Metallizzato AR 727 (Livrea Reale)',
    yearCode: 'AR 727 • TARGA 463880 PD',
    swatch: 'linear-gradient(135deg, #d4dde6 0%, #9aa6b4 55%, #1e2024 100%)',
    swatchColor: '#C4CED8',
    color: '#ffffff',
    useRealDetails: true,
    metalness: 0.78,
    roughness: 0.22,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.6,
  },
  {
    id: 'argento',
    name: 'Grigio Chiaro Metallizzato AR 727 (Puro)',
    yearCode: 'AR 727 • ORIGINALE 1973',
    swatchColor: '#BCC6D0',
    color: '#c2cbd4',
    useRealDetails: false,
    metalness: 0.86,
    roughness: 0.19,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.6,
  },
  {
    id: 'rosso',
    name: 'Rosso Alfa 1973',
    yearCode: 'AR 501 • 1973',
    swatchColor: '#9E1B24',
    color: '#96141d',
    useRealDetails: false,
    metalness: 0.35,
    roughness: 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.05,
    envMapIntensity: 1.45,
  },
  {
    id: 'blu',
    name: 'Blu Olandese',
    yearCode: 'AR 343 • 1973',
    swatchColor: '#1B2E4B',
    color: '#162740',
    useRealDetails: false,
    metalness: 0.65,
    roughness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.5,
  },
  {
    id: 'verde',
    name: 'Verde Pino',
    yearCode: 'AR 216 • 1973',
    swatchColor: '#1E3F2E',
    color: '#193526',
    useRealDetails: false,
    metalness: 0.58,
    roughness: 0.2,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.45,
  },
  {
    id: 'clay',
    name: 'Studio Clay • Centro Stile',
    yearCode: 'ITALDESIGN • PROTOTIPO',
    swatchColor: '#D8D2C7',
    color: '#d7d1c6',
    useRealDetails: false,
    metalness: 0.12,
    roughness: 0.42,
    clearcoat: 0.35,
    clearcoatRoughness: 0.22,
    envMapIntensity: 1.1,
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
 * Computes vertex colors for the Meshy AI geometry to faithfully reproduce
 * the real car's details from the reference photo (Targa 463880 PD):
 * - Body: Grigio Chiaro Metallizzato AR 727 (#c4ced8)
 * - Tires: Classic Michelin/Pirelli dark rubber (#1b1d21)
 * - Rims & Hubcaps: Campagnolo/Alfa alloy silver (#dfe5ec) with chrome center
 * - Front Carello quad headlights & chrome Scudetto grille
 * - Front chrome blade bumper with black rubber overriders & amber turn signals
 * - Tinted glass windows & C-pillar ventilation louvers
 */
function applyRealCarVertexColors(geometry) {
  const posAttr = geometry.attributes.position;
  const normAttr = geometry.attributes.normal;
  if (!posAttr) return;

  const count = posAttr.count;
  const colors = new Float32Array(count * 3);

  const cBody = new THREE.Color('#c3cdd7'); // Grigio Chiaro Metallizzato AR 727
  const cBodyHighlight = new THREE.Color('#d2dce6'); // Sky reflection on hood/roof
  const cTire = new THREE.Color('#18191c'); // Matte black tire rubber
  const cRim = new THREE.Color('#dde3ea'); // Silver steel/alloy wheel rim
  const cHubcap = new THREE.Color('#f2f6fa'); // Chrome center cap
  const cUnderbody = new THREE.Color('#1f2226'); // Chassis & wheel arch wells
  const cGrille = new THREE.Color('#1a1c20'); // Matte black radiator grille
  const cChrome = new THREE.Color('#eef3f8'); // Chrome bumpers, Scudetto & trim
  const cHeadlight = new THREE.Color('#f7fbff'); // Carello glass headlights
  const cAmber = new THREE.Color('#e07a16'); // Amber turn signals & side repeaters
  const cTaillight = new THREE.Color('#9e1b22'); // Rear tail light clusters
  const cGlass = new THREE.Color('#27323d'); // Tinted cabin glass

  const tmpColor = new THREE.Color();

  for (let i = 0; i < count; i++) {
    const x = posAttr.getX(i); // -0.95 (front nose) to +0.95 (rear tail)
    const y = posAttr.getY(i); // -0.314 (bottom tires) to +0.307 (roof)
    const z = posAttr.getZ(i); // -0.416 to +0.414 (left/right width)
    const absZ = Math.abs(z);

    const nx = normAttr ? normAttr.getX(i) : 0;
    const ny = normAttr ? normAttr.getY(i) : 1;
    const nz = normAttr ? normAttr.getZ(i) : 0;
    const absNz = Math.abs(nz);

    // Default: AR 727 Grigio Chiaro Metallizzato with subtle upward sky sheen
    tmpColor.copy(cBody).lerp(cBodyHighlight, Math.max(0, ny * 0.45));

    // 1. Front & Rear Wheels + Tires
    const distFrontWheel = Math.hypot(x - -0.558, y - -0.14);
    const distRearWheel = Math.hypot(x - 0.535, y - -0.138);
    const wheelDist = Math.min(distFrontWheel, distRearWheel);

    if (wheelDist < 0.182 && absZ > 0.25) {
      if (wheelDist < 0.045 && absZ > 0.345) {
        tmpColor.copy(cHubcap); // Chrome hubcap
      } else if (wheelDist < 0.105 && absZ > 0.335) {
        tmpColor.copy(cRim); // Silver wheel rim
      } else {
        tmpColor.copy(cTire); // Tire tread & sidewall
      }
    } else if (wheelDist < 0.205 && y < 0.05 && absZ > 0.24 && absNz < 0.65) {
      // Inner wheel arch shadow
      tmpColor.copy(cUnderbody);
    } else if (y < -0.21) {
      // Lower chassis undertray
      tmpColor.copy(cUnderbody);
    }

    // 2. Cabin Windows (Windshield, Side Windows, Rear Fastback Glass)
    if (y > 0.085 && y < 0.275 && x > -0.34 && x < 0.72) {
      // Windshield (front slope facing -X/+Y)
      const isWindshield =
        x > -0.34 && x < -0.02 && absZ < 0.31 && nx < -0.22 && ny > 0.25;
      // Rear fastback hatch glass (facing +X/+Y)
      const isRearGlass =
        x > 0.36 && x < 0.72 && absZ < 0.29 && nx > 0.2 && ny > 0.3;
      // Side windows (facing +/-Z)
      const isSideWindow =
        x > -0.16 &&
        x < 0.52 &&
        y > 0.095 &&
        y < 0.255 &&
        absZ > 0.27 &&
        absNz > 0.55;

      if (isWindshield || isRearGlass || isSideWindow) {
        tmpColor.copy(cGlass);
      }
    }

    // 3. Front Nose: Carello Quad Headlights, Black Grille, Chrome Scudetto & Bumper
    if (x < -0.87) {
      // Front bumper blade & rubber overriders
      if (y > -0.145 && y < -0.075) {
        if (absZ > 0.14 && absZ < 0.21) {
          tmpColor.copy(cUnderbody); // Black rubber bumper overriders (rostri)
        } else {
          tmpColor.copy(cChrome); // Chrome bumper blade
        }
      }
      // Front amber turn signal indicators under bumper edge
      else if (y >= -0.075 && y < -0.035 && absZ > 0.18 && absZ < 0.31) {
        tmpColor.copy(cAmber);
      }
      // Upper radiator grille, Scudetto & Carello quad headlights
      else if (y >= -0.035 && y < 0.035 && absZ < 0.34) {
        const outerLight = Math.hypot(absZ - 0.255, y - 0.0);
        const innerLight = Math.hypot(absZ - 0.165, y - 0.0);
        if (outerLight < 0.038 || innerLight < 0.035) {
          tmpColor.copy(cHeadlight); // Quad round Carello lamps
        } else if (absZ < 0.055) {
          tmpColor.copy(cChrome); // Central Alfa Romeo Scudetto shield
        } else {
          tmpColor.copy(cGrille); // Matte black horizontal grille
        }
      }
    }

    // 4. Side Fender Amber Repeater (Freccia laterale parafango anteriore)
    if (
      Math.abs(x - -0.72) < 0.025 &&
      Math.abs(y - -0.01) < 0.018 &&
      absZ > 0.35
    ) {
      tmpColor.copy(cAmber);
    }

    // 5. Rear Kamm Tail: Taillights & Rear Chrome Bumper
    if (x > 0.88) {
      if (y > -0.12 && y < -0.05) {
        if (absZ > 0.15 && absZ < 0.21) {
          tmpColor.copy(cUnderbody);
        } else {
          tmpColor.copy(cChrome);
        }
      } else if (y >= -0.02 && y < 0.055 && absZ > 0.16 && absZ < 0.33) {
        tmpColor.copy(cTaillight);
      }
    }

    colors[i * 3] = tmpColor.r;
    colors[i * 3 + 1] = tmpColor.g;
    colors[i * 3 + 2] = tmpColor.b;
  }

  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
}

/**
 * Authentic 1973 Padova Vintage Black License Plate ("463880 PD")
 * mounted under the front-right bumper just like the reference photo.
 */
function VintageLicensePlate() {
  const plateTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');

    // Matte black vintage Italian plate background
    ctx.fillStyle = '#0f1012';
    ctx.fillRect(0, 0, 512, 128);

    // Subtle metallic border
    ctx.strokeStyle = '#d8dee6';
    ctx.lineWidth = 5;
    ctx.strokeRect(6, 6, 500, 116);

    // Crisp white vintage typography "463880 PD"
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

  // In raw model coords: -X is front nose (~ -0.945), Y is height (~ -0.155 under bumper),
  // +Z is driver's left side (which appears on the right when looking at the front of the car).
  return (
    <mesh
      position={[-0.942, -0.152, 0.085]}
      rotation={[0, -Math.PI / 2, 0]}
      castShadow
    >
      <boxGeometry args={[0.165, 0.042, 0.006]} />
      <meshStandardMaterial
        map={plateTexture}
        roughness={0.35}
        metalness={0.15}
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
 * Loads the 1973 Alfa Romeo GLB model, computes smooth vertex normals if absent,
 * computes real-car vertex colors from the reference photo, and applies clearcoat shaders.
 */
function AlfaRomeoModel({ activePaintId }) {
  const { scene } = useGLTF(MODEL_PATH);

  const selectedPaint = useMemo(
    () =>
      PAINT_FINISHES.find((paint) => paint.id === activePaintId) ||
      PAINT_FINISHES[0],
    [activePaintId]
  );

  // Clone scene once, compute smooth vertex normals, and generate real-car vertex colors
  const preparedScene = useMemo(() => {
    const cloned = scene.clone(true);

    cloned.traverse((child) => {
      if (child.isMesh && child.geometry) {
        child.geometry = child.geometry.clone();

        if (!child.geometry.attributes.normal) {
          child.geometry.computeVertexNormals();
        }

        applyRealCarVertexColors(child.geometry);

        child.castShadow = true;
        child.receiveShadow = true;

        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material;
        }
      }
    });

    return cloned;
  }, [scene]);

  // Create physical automotive material for the active paint finish
  const carPaintMaterial = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(selectedPaint.color),
      vertexColors: Boolean(selectedPaint.useRealDetails),
      metalness: selectedPaint.metalness,
      roughness: selectedPaint.roughness,
      clearcoat: selectedPaint.clearcoat,
      clearcoatRoughness: selectedPaint.clearcoatRoughness,
      envMapIntensity: selectedPaint.envMapIntensity,
      reflectivity: 0.92,
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
 * Synchronizes scene background and atmospheric fog with the active lighting theme.
 */
function ShowroomAtmosphere({ lightingMode }) {
  const isLight = lightingMode === 'studio';
  const bgColor = isLight ? '#e8e6e1' : '#111113';

  return (
    <>
      <color attach="background" args={[bgColor]} />
      <fog attach="fog" args={[bgColor, 8.5, 22]} />

      {/* Base Ambient Illumination */}
      <ambientLight
        intensity={isLight ? 0.85 : 0.42}
        color={isLight ? '#fffdf9' : '#d8e2f2'}
      />

      {/* Primary Key Directional Light with High-Res Soft Shadows */}
      <directionalLight
        position={[5, 8, 5]}
        intensity={isLight ? 2.2 : 1.85}
        color={isLight ? '#fffaf0' : '#f5f8ff'}
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
        angle={0.45}
        penumbra={0.9}
        intensity={isLight ? 1.4 : 2.4}
        color={isLight ? '#ffffff' : '#ebd4b7'}
      />

      {/* Subtle Front Fill Light for Carello Quad Headlights & Scudetto Alfa Romeo */}
      <directionalLight
        position={[0, 2.2, 6]}
        intensity={isLight ? 0.95 : 0.75}
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
          toneMappingExposure: isLight ? 1.08 : 1.15,
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
              mixStrength={isLight ? 0.22 : 0.55}
              roughness={isLight ? 0.65 : 0.38}
              depthScale={1}
              minDepthThreshold={0.4}
              maxDepthThreshold={1.4}
              color={isLight ? '#dcd9d0' : '#131418'}
              metalness={isLight ? 0.15 : 0.45}
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
