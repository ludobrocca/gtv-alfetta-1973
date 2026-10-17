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
    color: '#bcc7d2',
    useRealDetails: true,
    metalness: 0.48,
    roughness: 0.28,
    clearcoat: 0.88,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.92,
  },
  {
    id: 'argento',
    name: 'Grigio Chiaro Metallizzato AR 727 (Monocromo)',
    yearCode: 'AR 727 • METALLO PURO',
    swatchColor: '#BCC6D0',
    color: '#b8c3ce',
    useRealDetails: false,
    metalness: 0.48,
    roughness: 0.3,
    clearcoat: 0.85,
    clearcoatRoughness: 0.14,
    envMapIntensity: 0.9,
  },
  {
    id: 'rosso',
    name: 'Rosso Alfa (Livrea Reale)',
    yearCode: 'AR 501 • DETTAGLI REALI',
    swatchColor: '#9E1B24',
    color: '#98161f',
    useRealDetails: true,
    metalness: 0.28,
    roughness: 0.24,
    clearcoat: 0.92,
    clearcoatRoughness: 0.1,
    envMapIntensity: 0.9,
  },
  {
    id: 'blu',
    name: 'Blu Olandese (Livrea Reale)',
    yearCode: 'AR 343 • DETTAGLI REALI',
    swatchColor: '#1B2E4B',
    color: '#182b47',
    useRealDetails: true,
    metalness: 0.45,
    roughness: 0.27,
    clearcoat: 0.88,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.9,
  },
  {
    id: 'verde',
    name: 'Verde Pino (Livrea Reale)',
    yearCode: 'AR 216 • DETTAGLI REALI',
    swatchColor: '#1E3F2E',
    color: '#1b3a2a',
    useRealDetails: true,
    metalness: 0.42,
    roughness: 0.27,
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
    position: [0, 1.05, 4.2],
    target: [0, 0.3, 0],
  },
  {
    id: 'hero',
    label: '3/4 Showroom',
    position: [3.2, 1.25, 3.6],
    target: [0, 0.3, 0],
  },
  {
    id: 'side',
    label: 'Profilo',
    position: [-4.5, 0.88, 0],
    target: [0, 0.3, 0],
  },
  {
    id: 'rear',
    label: '3/4 Posteriore',
    position: [-3.2, 1.3, -3.5],
    target: [0, 0.3, 0],
  },
  {
    id: 'top',
    label: "Dall'Alto",
    position: [0, 5.2, 0.4],
    target: [0, 0.2, 0],
  },
];

/**
 * Creates a MeshPhysicalMaterial enhanced with a Per-Pixel Object-Space GLSL Shader
 * (via onBeforeCompile) that renders razor-sharp, anti-aliased automotive details
 * with ZERO triangle sawtooth artifacts and per-pixel PBR roughness/metalness:
 * - Matte black Pirelli/Michelin tires (roughness 0.86, metalness 0.04)
 * - 16-slot Campagnolo/Alfa alloy rims + chrome center hubcap
 * - Green-tinted dark cabin glass with stainless chrome perimeter frames
 * - Front Carello quad circular headlights, matte black grille with twin chrome bars,
 *   central Alfa Romeo Scudetto, chrome bumper blade, black rubber overriders & amber indicators
 * - Left-side black round fuel cap, C-pillar GTV louver, flush door handle, amber side marker
 * - Rear two-tone red/amber taillights and chrome bumper with rubber overriders
 */
function createAutomotiveShaderMaterial(selectedPaint) {
  const baseColor = new THREE.Color(selectedPaint.color);

  const material = new THREE.MeshPhysicalMaterial({
    color: baseColor,
    metalness: selectedPaint.metalness,
    roughness: selectedPaint.roughness,
    clearcoat: selectedPaint.clearcoat,
    clearcoatRoughness: selectedPaint.clearcoatRoughness,
    envMapIntensity: selectedPaint.envMapIntensity,
    reflectivity: 0.8,
  });

  if (!selectedPaint.useRealDetails) {
    return material;
  }

  material.customProgramCacheKey = () => `alfetta-perpixel-v2-${selectedPaint.id}`;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPaintColor = { value: baseColor };

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObjPos;
        varying vec3 vObjNorm;`
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vObjPos = position;
        vObjNorm = normalize(normal);`
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying vec3 vObjPos;
        varying vec3 vObjNorm;
        uniform vec3 uPaintColor;`
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        vec3 p = vObjPos;
        vec3 n = normalize(vObjNorm);
        float absZ = abs(p.z);
        float absNz = abs(n.z);

        // Base metallic body paint with subtle zenith sky sheen
        vec3 colBody = uPaintColor * (0.96 + 0.08 * clamp(n.y, 0.0, 1.0));
        vec3 finalCol = colBody;
        float customRough = ${selectedPaint.roughness.toFixed(3)};
        float customMetal = ${selectedPaint.metalness.toFixed(3)};

        // Palette constants
        vec3 colTire = vec3(0.075, 0.080, 0.090);
        vec3 colRubber = vec3(0.065, 0.070, 0.078);
        vec3 colRim = vec3(0.82, 0.85, 0.89);
        vec3 colChrome = vec3(0.92, 0.95, 0.98);
        vec3 colGlass = vec3(0.10, 0.15, 0.155);
        vec3 colAmber = vec3(0.88, 0.44, 0.05);
        vec3 colRed = vec3(0.68, 0.08, 0.10);

        // ---------------------------------------------------------------------
        // 1. WHEELS (16-Slot Alloy Rims, Chrome Hubcap & Matte Rubber Tires)
        // ---------------------------------------------------------------------
        vec2 wfVec = vec2(p.x - (-0.558), p.y - (-0.140));
        vec2 wrVec = vec2(p.x - 0.535, p.y - (-0.138));
        bool isFrontW = length(wfVec) < length(wrVec);
        vec2 wVec = isFrontW ? wfVec : wrVec;
        float wDist = length(wVec);
        float wAngle = atan(wVec.y, wVec.x);

        if (wDist < 0.184 && absZ > 0.24) {
          float archMask = (1.0 - smoothstep(0.172, 0.183, wDist)) * smoothstep(0.24, 0.27, absZ);
          // Tire base
          vec3 wCol = colTire;
          float wRough = 0.86;
          float wMetal = 0.04;

          // Alloy rim region (r < 0.103) on outer wheel face
          float rimMask = (1.0 - smoothstep(0.099, 0.105, wDist)) * smoothstep(0.325, 0.345, absZ);
          if (rimMask > 0.001) {
            // 16 characteristic oval ventilation slots + 5 lug bolts
            float slotRing = smoothstep(0.054, 0.060, wDist) * (1.0 - smoothstep(0.082, 0.088, wDist));
            float slots = smoothstep(0.35, 0.65, cos(wAngle * 16.0));
            float lugRing = smoothstep(0.033, 0.037, wDist) * (1.0 - smoothstep(0.044, 0.048, wDist));
            float lugs = smoothstep(0.55, 0.80, cos(wAngle * 5.0));

            vec3 rimSurface = mix(colRim, colTire, slotRing * slots * 0.82);
            rimSurface = mix(rimSurface, colChrome * 0.75, lugRing * lugs);

            // Central chrome hubcap (r < 0.030)
            float hubMask = 1.0 - smoothstep(0.026, 0.031, wDist);
            rimSurface = mix(rimSurface, colChrome, hubMask);

            wCol = mix(wCol, rimSurface, rimMask);
            wRough = mix(wRough, mix(0.20, 0.08, hubMask), rimMask);
            wMetal = mix(wMetal, mix(0.80, 0.94, hubMask), rimMask);
          }

          finalCol = mix(finalCol, wCol, archMask);
          customRough = mix(customRough, wRough, archMask);
          customMetal = mix(customMetal, wMetal, archMask);
        }

        // Lower chassis & black rocker panel sill (sottoporta nero come in foto 17.07.41)
        float sillMask = (1.0 - smoothstep(-0.188, -0.168, p.y));
        finalCol = mix(finalCol, colRubber, sillMask * 0.92);
        customRough = mix(customRough, 0.85, sillMask * 0.92);
        customMetal = mix(customMetal, 0.04, sillMask * 0.92);

        // ---------------------------------------------------------------------
        // 2. GREENHOUSE WINDOWS (Windshield, Side Windows, Rear Fastback Glass)
        // ---------------------------------------------------------------------
        if (p.y > 0.082 && p.y < 0.278 && p.x > -0.35 && p.x < 0.75) {
          // Front windshield
          float wsX = smoothstep(-0.34, -0.30, p.x) * (1.0 - smoothstep(-0.02, 0.01, p.x));
          float wsY = smoothstep(0.085, 0.100, p.y) * (1.0 - smoothstep(0.255, 0.270, p.y));
          float wsZ = 1.0 - smoothstep(0.275, 0.295, absZ);
          float wsN = smoothstep(0.15, 0.32, -n.x);
          float wsMask = wsX * wsY * wsZ * wsN;

          // Chrome windshield frame (3mm perimeter)
          float wsInner = smoothstep(-0.325, -0.29, p.x) * (1.0 - smoothstep(-0.035, -0.01, p.x))
                        * smoothstep(0.095, 0.108, p.y) * (1.0 - smoothstep(0.245, 0.258, p.y))
                        * (1.0 - smoothstep(0.262, 0.276, absZ));
          float wsFrame = clamp(wsMask - wsInner, 0.0, 1.0);

          // Side windows (front door + rear quarter glass)
          float swY = smoothstep(0.092, 0.104, p.y) * (1.0 - smoothstep(0.242, 0.256, p.y));
          // Slanted front A-pillar and rear C-pillar window bounds
          float xMinSide = -0.26 + (p.y - 0.09) * 1.15;
          float xMaxSide = 0.54 - (p.y - 0.09) * 0.55;
          float swX = smoothstep(xMinSide, xMinSide + 0.02, p.x) * (1.0 - smoothstep(xMaxSide - 0.02, xMaxSide, p.x));
          float swZ = smoothstep(0.26, 0.29, absZ) * smoothstep(0.45, 0.68, absNz);
          float swMask = swX * swY * swZ;

          // B-pillar vertical chrome/black divider at x = 0.155
          float bPillar = 1.0 - smoothstep(0.006, 0.013, abs(p.x - 0.155));
          float swFrameEdge = clamp(
            swMask * (
              (1.0 - smoothstep(0.092, 0.102, p.y)) +
              smoothstep(0.236, 0.250, p.y) +
              bPillar
            ),
            0.0,
            1.0
          );

          // Rear fastback hatch window
          float rwX = smoothstep(0.38, 0.42, p.x) * (1.0 - smoothstep(0.71, 0.74, p.x));
          float rwY = smoothstep(0.175, 0.190, p.y) * (1.0 - smoothstep(0.265, 0.278, p.y));
          float rwZ = 1.0 - smoothstep(0.245, 0.265, absZ);
          float rwN = smoothstep(0.10, 0.28, n.x + n.y * 0.5);
          float rwMask = rwX * rwY * rwZ * rwN;

          float totalGlass = clamp(max(wsMask, max(swMask, rwMask)), 0.0, 1.0);
          float totalFrame = clamp(max(wsFrame, swFrameEdge * 0.85), 0.0, 1.0);

          finalCol = mix(finalCol, colGlass, totalGlass);
          customRough = mix(customRough, 0.05, totalGlass);
          customMetal = mix(customMetal, 0.15, totalGlass);

          finalCol = mix(finalCol, colChrome, totalFrame);
          customRough = mix(customRough, 0.10, totalFrame);
          customMetal = mix(customMetal, 0.92, totalFrame);
        }

        // ---------------------------------------------------------------------
        // 3. SIDE DETAILS FROM REAL PHOTO (GTV C-Pillar Louver, Fuel Cap, Handle, Marker)
        // ---------------------------------------------------------------------
        // C-Pillar black ventilation louver behind rear quarter window
        if (p.x > 0.46 && p.x < 0.64 && p.y > 0.105 && p.y < 0.195 && absZ > 0.27) {
          float cLouverX = smoothstep(0.47, 0.49, p.x) * (1.0 - smoothstep(0.59, 0.62, p.x));
          float cLouverY = smoothstep(0.112, 0.125, p.y) * (1.0 - smoothstep(0.165, 0.180, p.y));
          float louverMask = cLouverX * cLouverY * smoothstep(0.45, 0.65, absNz);
          finalCol = mix(finalCol, colRubber, louverMask * 0.9);
          customRough = mix(customRough, 0.75, louverMask * 0.9);
          customMetal = mix(customMetal, 0.08, louverMask * 0.9);
        }

        // Black round fuel filler cap on left rear quarter (z < 0 in raw coords or symmetrical)
        float fuelDist = length(vec2(p.x - 0.485, p.y - 0.072));
        if (fuelDist < 0.024 && absZ > 0.31) {
          float fuelMask = (1.0 - smoothstep(0.019, 0.023, fuelDist)) * smoothstep(0.5, 0.7, absNz);
          finalCol = mix(finalCol, colRubber, fuelMask);
          customRough = mix(customRough, 0.78, fuelMask);
          customMetal = mix(customMetal, 0.06, fuelMask);
        }

        // Flush black & chrome door handle
        if (abs(p.x - 0.115) < 0.042 && abs(p.y - 0.032) < 0.014 && absZ > 0.34) {
          float dhMask = (1.0 - smoothstep(0.034, 0.040, abs(p.x - 0.115)))
                       * (1.0 - smoothstep(0.009, 0.013, abs(p.y - 0.032)));
          float dhChrome = smoothstep(0.005, 0.009, abs(p.y - 0.032)) * dhMask;
          finalCol = mix(finalCol, colRubber, dhMask);
          finalCol = mix(finalCol, colChrome, dhChrome);
          customRough = mix(customRough, 0.15, dhMask);
          customMetal = mix(customMetal, 0.85, dhChrome);
        }

        // Amber front fender side marker (freccia laterale)
        float markerDist = length(vec2((p.x - (-0.725)) * 0.85, p.y - (-0.010)));
        if (markerDist < 0.018 && absZ > 0.33) {
          float mMask = 1.0 - smoothstep(0.012, 0.016, markerDist);
          finalCol = mix(finalCol, colAmber, mMask);
          customRough = mix(customRough, 0.15, mMask);
          customMetal = mix(customMetal, 0.10, mMask);
        }

        // ---------------------------------------------------------------------
        // 4. FRONT CALANDRA, QUAD CARELLO HEADLIGHTS, SCUDETTO & BUMPER (x < -0.86)
        // ---------------------------------------------------------------------
        if (p.x < -0.855) {
          float frontWeight = smoothstep(-0.86, -0.895, p.x);

          // Front Grille + Twin Chrome Bars + Carello Quad Lamps (-0.042 < y < 0.036)
          if (p.y > -0.046 && p.y < 0.040 && absZ < 0.34) {
            float gMask = smoothstep(-0.042, -0.034, p.y) * (1.0 - smoothstep(0.028, 0.036, p.y))
                        * (1.0 - smoothstep(0.315, 0.335, absZ)) * frontWeight;

            // Matte black grille base
            vec3 gCol = colRubber;
            float gRough = 0.80;
            float gMetal = 0.06;

            // Twin horizontal chrome bars (GTV 2000 signature)
            float bar1 = 1.0 - smoothstep(0.0025, 0.005, abs(p.y - 0.007));
            float bar2 = 1.0 - smoothstep(0.0025, 0.005, abs(p.y - (-0.011)));
            float chromeBars = clamp(bar1 + bar2, 0.0, 1.0) * smoothstep(0.048, 0.058, absZ);
            gCol = mix(gCol, colChrome, chromeBars);
            gRough = mix(gRough, 0.10, chromeBars);
            gMetal = mix(gMetal, 0.92, chromeBars);

            // Central Alfa Romeo Scudetto shield
            float scudWidth = 0.012 + (p.y + 0.040) * 0.52;
            float scudDist = abs(absZ - scudWidth);
            float scudInside = 1.0 - smoothstep(scudWidth - 0.006, scudWidth + 0.002, absZ);
            float scudBorder = (1.0 - smoothstep(0.004, 0.009, scudDist)) * scudInside;
            gCol = mix(gCol, colChrome, scudBorder);
            gRough = mix(gRough, 0.08, scudBorder);
            gMetal = mix(gMetal, 0.95, scudBorder);

            // 4 Circular Carello Headlights (outer |z|=0.254, inner |z|=0.168)
            float dOuter = length(vec2(absZ - 0.254, p.y - (-0.002)));
            float dInner = length(vec2(absZ - 0.168, p.y - (-0.002)));
            float dLamp = min(dOuter, dInner);
            if (dLamp < 0.039) {
              float lampMask = 1.0 - smoothstep(0.034, 0.038, dLamp);
              float bezelMask = smoothstep(0.028, 0.031, dLamp) * lampMask;
              // Fluted Carello glass prism pattern
              float flutes = 0.90 + 0.10 * cos(p.z * 520.0);
              vec3 lensCol = vec3(0.94, 0.97, 1.0) * flutes;
              vec3 lampCol = mix(lensCol, colChrome, bezelMask);
              gCol = mix(gCol, lampCol, lampMask);
              gRough = mix(gRough, 0.05, lampMask);
              gMetal = mix(gMetal, mix(0.35, 0.95, bezelMask), lampMask);
            }

            finalCol = mix(finalCol, gCol, gMask);
            customRough = mix(customRough, gRough, gMask);
            customMetal = mix(customMetal, gMetal, gMask);
          }

          // Front Chrome Bumper Blade & Matte Black Rubber Overriders (-0.145 < y < -0.075)
          if (p.y > -0.148 && p.y < -0.072 && absZ < 0.35) {
            float bMask = smoothstep(-0.142, -0.132, p.y) * (1.0 - smoothstep(-0.082, -0.074, p.y)) * frontWeight;
            float overrider = smoothstep(0.145, 0.155, absZ) * (1.0 - smoothstep(0.195, 0.205, absZ));
            vec3 bCol = mix(colChrome, colRubber, overrider);
            finalCol = mix(finalCol, bCol, bMask);
            customRough = mix(customRough, mix(0.08, 0.85, overrider), bMask);
            customMetal = mix(customMetal, mix(0.95, 0.04, overrider), bMask);
          }

          // Front Amber Turn Signal Indicators (-0.075 < y < -0.044)
          if (p.y > -0.076 && p.y < -0.044 && absZ > 0.18 && absZ < 0.31) {
            float indMask = smoothstep(-0.072, -0.065, p.y) * (1.0 - smoothstep(-0.050, -0.044, p.y))
                          * smoothstep(0.185, 0.198, absZ) * (1.0 - smoothstep(0.292, 0.305, absZ)) * frontWeight;
            finalCol = mix(finalCol, colAmber, indMask);
            customRough = mix(customRough, 0.12, indMask);
            customMetal = mix(customMetal, 0.10, indMask);
          }
        }

        // ---------------------------------------------------------------------
        // 5. REAR KAMM TAIL: TWO-TONE TAILLIGHTS & CHROME BUMPER (x > 0.86)
        // ---------------------------------------------------------------------
        if (p.x > 0.86) {
          float rearWeight = smoothstep(0.86, 0.895, p.x);

          // Rectangular two-tone taillights (-0.015 < y < 0.048, 0.15 < |z| < 0.33)
          if (p.y > -0.018 && p.y < 0.052 && absZ > 0.145 && absZ < 0.335) {
            float tlMask = smoothstep(-0.012, -0.004, p.y) * (1.0 - smoothstep(0.040, 0.048, p.y))
                         * smoothstep(0.155, 0.168, absZ) * (1.0 - smoothstep(0.315, 0.328, absZ)) * rearWeight;
            float isUpperAmber = smoothstep(0.016, 0.022, p.y);
            vec3 tlCol = mix(colRed, colAmber, isUpperAmber * 0.75);
            finalCol = mix(finalCol, tlCol, tlMask);
            customRough = mix(customRough, 0.12, tlMask);
            customMetal = mix(customMetal, 0.12, tlMask);
          }

          // Rear Chrome Bumper & Rubber Overriders (-0.125 < y < -0.055)
          if (p.y > -0.128 && p.y < -0.052 && absZ < 0.35) {
            float rbMask = smoothstep(-0.120, -0.110, p.y) * (1.0 - smoothstep(-0.064, -0.054, p.y)) * rearWeight;
            float rOverrider = smoothstep(0.150, 0.160, absZ) * (1.0 - smoothstep(0.198, 0.208, absZ));
            vec3 rbCol = mix(colChrome, colRubber, rOverrider);
            finalCol = mix(finalCol, rbCol, rbMask);
            customRough = mix(customRough, mix(0.08, 0.85, rOverrider), rbMask);
            customMetal = mix(customMetal, mix(0.95, 0.04, rOverrider), rbMask);
          }
        }

        diffuseColor.rgb = finalCol;
        `
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
        roughnessFactor = customRough;`
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
        metalnessFactor = customMetal;`
      );
  };

  return material;
}

/**
 * Authentic Padova Vintage Black License Plate ("463880 PD")
 * tucked flush beneath the front-right bumper and on the rear tail panel.
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
          ALFA ROMEO • CARICAMENTO MODELLO 3D
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
 * Loads the surgically smoothed Alfa Romeo GLB model and applies the Per-Pixel
 * Automotive GLSL Shader so all details have crisp anti-aliased edges.
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

        if (!child.userData.originalMaterial) {
          child.userData.originalMaterial = child.material;
        }
      }
    });

    return cloned;
  }, [scene]);

  const carPaintMaterial = useMemo(
    () => createAutomotiveShaderMaterial(selectedPaint),
    [selectedPaint]
  );

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
      target: target || [0, 0.3, 0],
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
          isLight ? 0.95 : 0.68,
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
        camera={{ position: [3.2, 1.25, 3.6], fov: 40, near: 0.1, far: 100 }}
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
