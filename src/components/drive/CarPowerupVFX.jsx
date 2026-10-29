import React, { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { driveStore } from './driveStore';

function MusicalNote({ color = '#fbbf24' }) {
  return (
    <group scale={0.72}>
      <mesh rotation={[0, 0, -0.3]}>
        <sphereGeometry args={[0.045, 8, 8]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0.038, 0.075, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.15, 6]} />
        <meshBasicMaterial color={color} />
      </mesh>
      <mesh position={[0.065, 0.135, -0.01]} rotation={[0, 0, -0.6]}>
        <boxGeometry args={[0.045, 0.015, 0.01]} />
        <meshBasicMaterial color={color} />
      </mesh>
    </group>
  );
}

export function CarPowerupVFX() {
  const elvisGroupRef = useRef();
  const elvisNotesRef = useRef([]);
  const elvisFlamesRef = useRef([]);
  const texGroupRef = useRef();
  const texStarRef = useRef();
  const bondGroupRef = useRef();
  const bondRingsRef = useRef([]);
  const spidermanGroupRef = useRef();
  const spidermanWebRef = useRef();
  const diabolikGroupRef = useRef();
  const diabolikSmokeRef = useRef([]);
  const callaghanGroupRef = useRef();
  const callaghanTracerRef = useRef();
  const callaghanMuzzleRef = useRef();
  const mgGroupRef = useRef();
  const mgCrownRef = useRef();
  const damagedGroupRef = useRef();
  const damagedSmokeRef = useRef([]);
  const repairRingRef = useRef();
  const draftingGroupRef = useRef();
  const draftingRibbonsRef = useRef([]);
  const shiftFlashRef = useRef();
  const takedownSparksRef = useRef();
  const takedownSparkListRef = useRef([]);

  const starShape = useMemo(() => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const r = i % 2 === 0 ? 0.15 : 0.065;
      const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
    }
    s.closePath();
    return s;
  }, []);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    const active = driveStore.activePowerups || {};
    const shouldShow = (time) => time > 0 && (time > 1.5 || Math.sin(t * 28) > 0);

    // 1. Elvis
    const isElvis = shouldShow(active.elvis || 0);
    if (elvisGroupRef.current) {
      elvisGroupRef.current.visible = isElvis;
      if (isElvis) {
        const flicker = 1.0 + Math.sin(t * 42) * 0.28;
        elvisFlamesRef.current.forEach((f) => f && f.scale.set(1, flicker, 1));
        elvisNotesRef.current.forEach((n, i) => {
          if (!n) return;
          const cycle = (t * 2.2 + i * 0.43) % 2.6;
          n.position.set(Math.sin(t * 3.2 + i * 1.5) * 0.28 + (i % 2 === 0 ? -0.16 : 0.16), 0.32 + Math.sin(t * 4 + i) * 0.16 + cycle * 0.12, -1.0 - cycle);
          n.rotation.set(0, t * 2.5 + i, Math.sin(t * 4 + i) * 0.35);
        });
      }
    }

    // 2. Tex
    const isTex = shouldShow(active.tex || 0);
    if (texGroupRef.current) {
      texGroupRef.current.visible = isTex;
      if (isTex && texStarRef.current) texStarRef.current.rotation.z += delta * 3.8;
    }

    // 3. Bond
    const isBond = shouldShow(active.bond || 0);
    if (bondGroupRef.current) {
      bondGroupRef.current.visible = isBond;
      if (isBond) {
        bondRingsRef.current.forEach((ring, i) => {
          if (!ring) return;
          const prog = (t * 0.85 + i * 0.33) % 1.0;
          const r = 0.3 + prog * 1.8;
          ring.scale.set(r, r, 1);
          ring.material.opacity = (1 - prog) * 0.75;
        });
      }
    }

    // 4. Spider-Man
    const isSpider = shouldShow(active.spiderman || 0);
    if (spidermanGroupRef.current) {
      spidermanGroupRef.current.visible = isSpider;
      if (isSpider && spidermanWebRef.current) spidermanWebRef.current.rotation.z += delta * 1.6;
    }

    // 5. Diabolik
    const isDiabolik = shouldShow(active.diabolik || 0);
    if (diabolikGroupRef.current) {
      diabolikGroupRef.current.visible = isDiabolik;
      if (isDiabolik) {
        diabolikSmokeRef.current.forEach((puff, i) => {
          if (!puff) return;
          const prog = (t * 1.8 + i * 0.28) % 1.0;
          puff.position.set(Math.sin(t * 2.5 + i * 1.4) * 0.22, 0.18 + prog * 0.22, -1.1 - prog * 1.5);
          const s = 0.08 + prog * 0.26;
          puff.scale.set(s, s, s);
          puff.material.opacity = (1 - prog) * 0.45;
        });
      }
    }

    // 6. Callaghan
    const isCallaghan = shouldShow(active.callaghan || 0);
    if (callaghanGroupRef.current) {
      callaghanGroupRef.current.visible = isCallaghan;
      if (isCallaghan) {
        const hasShot = driveStore.magnumShotTimer > 0;
        if (callaghanMuzzleRef.current) {
          callaghanMuzzleRef.current.visible = hasShot;
          if (hasShot) callaghanMuzzleRef.current.scale.setScalar((driveStore.magnumShotTimer / 0.35) * 1.5);
        }
        if (callaghanTracerRef.current) {
          callaghanTracerRef.current.visible = hasShot;
          if (hasShot) {
            const targetZ = Math.max(1.0, driveStore.magnumTargetZ || 12.0);
            const len = targetZ - 0.55;
            callaghanTracerRef.current.position.set(0.40, 0.48, 0.55 + len / 2);
            callaghanTracerRef.current.scale.set(1, len, 1);
          }
        }
      }
    }

    // 7. MG
    const isMg = shouldShow(active.mg || 0) || (driveStore.selectedDriver === 'mg' && driveStore.skidTimer > 0);
    if (mgGroupRef.current) {
      mgGroupRef.current.visible = isMg;
      if (isMg && mgCrownRef.current) {
        mgCrownRef.current.rotation.y += delta * 2.2;
        mgCrownRef.current.position.y = 0.92 + Math.sin(t * 3.5) * 0.04;
      }
    }

    // AC-006: Mechanical states
    const isDamaged = driveStore.armorState === 'damaged';
    if (damagedGroupRef.current) {
      damagedGroupRef.current.visible = isDamaged;
      if (isDamaged) {
        damagedSmokeRef.current.forEach((puff, i) => {
          if (!puff) return;
          const prog = (t * 2.2 + i * 0.25) % 1.0;
          puff.position.set(Math.sin(t * 2 + i) * 0.14, 0.42 + prog * 0.48, 0.72 - prog * 0.92);
          const s = 0.04 + prog * 0.18;
          puff.scale.set(s, s, s);
          puff.material.opacity = (1 - prog) * 0.65;
        });
      }
    }

    if (repairRingRef.current) {
      const isRepair = driveStore.repairFlashTimer > 0;
      repairRingRef.current.visible = isRepair;
      if (isRepair) {
        const prog = Math.min(1, Math.max(0, 1 - driveStore.repairFlashTimer / 0.85));
        repairRingRef.current.position.set(0, 0.42, 1.1 - prog * 2.2);
        repairRingRef.current.scale.setScalar(1.0 + Math.sin(prog * Math.PI) * 0.15);
      }
    }

    const isDrafting = driveStore.isDrafting === true;
    if (draftingGroupRef.current) {
      draftingGroupRef.current.visible = isDrafting;
      if (isDrafting) {
        draftingRibbonsRef.current.forEach((ribbon, i) => {
          if (ribbon) ribbon.position.z = 0.8 - ((t * 4.5 + i * 0.25) % 1.0) * 1.8;
        });
      }
    }

    if (shiftFlashRef.current) {
      const isShift = driveStore.shiftFlashTimer > 0;
      shiftFlashRef.current.visible = isShift;
      if (isShift) shiftFlashRef.current.scale.setScalar((driveStore.shiftFlashTimer / 0.55) * 1.4);
    }

    if (takedownSparksRef.current) {
      const isSparks = driveStore.takedownSparkTimer > 0;
      takedownSparksRef.current.visible = isSparks;
      if (isSparks) {
        const sparkProg = 1 - driveStore.takedownSparkTimer / 0.5;
        const flankX = -driveStore.takedownSparkSide * 0.48;
        takedownSparkListRef.current.forEach((spark, i) => {
          if (!spark) return;
          const a = (i / 10) * Math.PI * 2, dist = sparkProg * (0.24 + (i % 3) * 0.1);
          spark.position.set(flankX - Math.sin(a) * dist * driveStore.takedownSparkSide, 0.32 + Math.cos(a) * dist * 0.6, 0.1 - sparkProg * 0.3);
          spark.scale.setScalar(Math.max(0.01, 1 - sparkProg));
        });
      }
    }
  });

  return (
    <group>
      {/* 1. ELVIS */}
      <group ref={elvisGroupRef} visible={false}>
        {[-0.2, 0.2].map((x, idx) => (
          <group key={idx} position={[x, 0.14, -1.02]}>
            <mesh ref={(el) => (elvisFlamesRef.current[idx] = el)} rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.065, 0.42, 12]} />
              <meshBasicMaterial color="#e879f9" transparent opacity={0.85} />
            </mesh>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <coneGeometry args={[0.035, 0.28, 12]} />
              <meshBasicMaterial color="#fbbf24" transparent opacity={0.95} />
            </mesh>
          </group>
        ))}
        {[...Array(6)].map((_, i) => (
          <group key={i} ref={(el) => (elvisNotesRef.current[i] = el)} position={[0, 0.3, -1.2]}>
            <MusicalNote color={i % 2 === 0 ? '#fbbf24' : '#e879f9'} />
          </group>
        ))}
        {[-0.34, 0.34].map((x, idx) => (
          <mesh key={idx} position={[x, 0.02, -1.45]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[0.08, 1.2]} />
            <meshBasicMaterial color={idx === 0 ? '#e879f9' : '#fbbf24'} transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>

      {/* 2. TEX */}
      <group ref={texGroupRef} visible={false}>
        <group position={[0, 0.28, 1.05]}>
          <mesh position={[-0.24, 0, 0.05]} rotation={[0, 0.55, 0]}>
            <boxGeometry args={[0.07, 0.1, 0.52]} />
            <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.6} metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0.24, 0, 0.05]} rotation={[0, -0.55, 0]}>
            <boxGeometry args={[0.07, 0.1, 0.52]} />
            <meshStandardMaterial color="#f59e0b" emissive="#d97706" emissiveIntensity={0.6} metalness={0.85} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.22]} rotation={[0, Math.PI / 4, 0]}>
            <boxGeometry args={[0.11, 0.12, 0.11]} />
            <meshStandardMaterial color="#fbbf24" emissive="#f59e0b" emissiveIntensity={0.8} metalness={0.9} roughness={0.15} />
          </mesh>
        </group>
        <mesh ref={texStarRef} position={[0, 0.34, 1.15]}>
          <shapeGeometry args={[starShape]} />
          <meshStandardMaterial color="#fde047" emissive="#eab308" emissiveIntensity={0.85} side={THREE.DoubleSide} />
        </mesh>
      </group>

      {/* 3. BOND */}
      <group ref={bondGroupRef} visible={false}>
        {[-0.2, 0.2].map((x, idx) => (
          <mesh key={idx} position={[x, 0.14, -1.02]} rotation={[-Math.PI / 2, 0, 0]}>
            <coneGeometry args={[0.055, 0.36, 12]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.85} />
          </mesh>
        ))}
        {[0, 1, 2].map((idx) => (
          <mesh key={idx} ref={(el) => (bondRingsRef.current[idx] = el)} position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.08, 0.12, 32]} />
            <meshBasicMaterial color="#fbbf24" transparent opacity={0.6} side={THREE.DoubleSide} />
          </mesh>
        ))}
        <mesh position={[0, 0.42, 0]}>
          <cylinderGeometry args={[0.72, 0.72, 0.7, 8, 1, true]} />
          <meshBasicMaterial color="#f8fafc" wireframe transparent opacity={0.35} />
        </mesh>
      </group>

      {/* 4. SPIDERMAN */}
      <group ref={spidermanGroupRef} visible={false}>
        <group ref={spidermanWebRef} position={[0, 0.025, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <mesh>
            <ringGeometry args={[0.65, 0.7, 32]} />
            <meshBasicMaterial color="#ef4444" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          <mesh>
            <ringGeometry args={[1.15, 1.2, 32]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((s) => (
            <mesh key={s} rotation={[0, 0, (s * Math.PI) / 4]}>
              <planeGeometry args={[0.02, 2.4]} />
              <meshBasicMaterial color={s % 2 === 0 ? '#ef4444' : '#3b82f6'} transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
          ))}
        </group>
        {[-0.35, 0.35].map((x, idx) => (
          <mesh key={idx} position={[x, 0.34, 0.85]}>
            <sphereGeometry args={[0.038, 10, 10]} />
            <meshBasicMaterial color="#dc2626" />
          </mesh>
        ))}
      </group>

      {/* 5. DIABOLIK */}
      <group ref={diabolikGroupRef} visible={false}>
        {[...Array(6)].map((_, i) => (
          <mesh key={i} ref={(el) => (diabolikSmokeRef.current[i] = el)} position={[0, 0.2, -1.2]}>
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color="#0e7490" transparent opacity={0.4} />
          </mesh>
        ))}
        {[-0.16, 0.16].map((x, idx) => (
          <mesh key={idx} position={[x, 0.58, 0.25]} rotation={[0.42, idx === 0 ? 0.12 : -0.12, idx === 0 ? -0.22 : 0.22]}>
            <boxGeometry args={[0.09, 0.028, 0.015]} />
            <meshBasicMaterial color="#38bdf8" />
          </mesh>
        ))}
      </group>

      {/* 6. CALLAGHAN */}
      <group ref={callaghanGroupRef} visible={false}>
        <mesh position={[0.38, 0.48, 8.15]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.007, 0.007, 15.7, 6]} />
          <meshBasicMaterial color="#ef4444" transparent opacity={0.8} />
        </mesh>
        <mesh position={[0.38, 0.48, 0.3]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color="#f59e0b" />
        </mesh>
        <group ref={callaghanMuzzleRef} position={[0.4, 0.48, 0.55]} visible={false}>
          <mesh><sphereGeometry args={[0.08, 8, 8]} /><meshBasicMaterial color="#f97316" /></mesh>
          <mesh rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[0.22, 0.04, 0.04]} /><meshBasicMaterial color="#fbbf24" /></mesh>
          <mesh rotation={[0, 0, -Math.PI / 4]}><boxGeometry args={[0.04, 0.22, 0.04]} /><meshBasicMaterial color="#fbbf24" /></mesh>
        </group>
        <mesh ref={callaghanTracerRef} position={[0.4, 0.48, 5]} rotation={[Math.PI / 2, 0, 0]} visible={false}>
          <cylinderGeometry args={[0.022, 0.022, 1, 6]} />
          <meshBasicMaterial color="#fbbf24" />
        </mesh>
      </group>

      {/* 7. MG */}
      <group ref={mgGroupRef} visible={false}>
        <group ref={mgCrownRef} position={[0, 0.92, -0.05]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.22, 0.22, 0.04, 24, 1, true]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} emissive="#d97706" emissiveIntensity={0.5} side={THREE.DoubleSide} />
          </mesh>
          {[0, 1, 2, 3, 4].map((i) => {
            const a = (i / 5) * Math.PI * 2;
            const x = Math.sin(a) * 0.22, z = Math.cos(a) * 0.22;
            return (
              <group key={i} position={[x, 0, z]}>
                <mesh position={[0, 0.06, 0]}>
                  <coneGeometry args={[0.035, 0.12, 8]} />
                  <meshStandardMaterial color="#fbbf24" metalness={0.9} roughness={0.2} />
                </mesh>
                <mesh position={[0, 0.13, 0]}>
                  <sphereGeometry args={[0.024, 8, 8]} />
                  <meshBasicMaterial color="#2dd4bf" />
                </mesh>
              </group>
            );
          })}
        </group>
        {[[-0.42, 0.08, 0.7], [0.42, 0.08, 0.7], [-0.42, 0.08, -0.7], [0.42, 0.08, -0.7]].map(([x, y, z], idx) => (
          <mesh key={idx} position={[x, y, z]}>
            <sphereGeometry args={[0.03, 6, 6]} />
            <meshBasicMaterial color={idx % 2 === 0 ? '#10b981' : '#fbbf24'} />
          </mesh>
        ))}
      </group>

      {/* MECHANICAL DRIVING STATES */}
      <group ref={damagedGroupRef} visible={false}>
        {[...Array(8)].map((_, i) => (
          <mesh key={i} ref={(el) => (damagedSmokeRef.current[i] = el)} position={[0, 0.42, 0.72]}>
            <sphereGeometry args={[1, 7, 7]} />
            <meshBasicMaterial color="#374151" transparent opacity={0.65} />
          </mesh>
        ))}
        {[-0.08, 0.08].map((x, idx) => (
          <mesh key={idx} position={[x, 0.42, 0.72]}>
            <sphereGeometry args={[0.025, 6, 6]} />
            <meshBasicMaterial color="#f97316" />
          </mesh>
        ))}
      </group>

      <mesh ref={repairRingRef} position={[0, 0.42, 0]} visible={false}>
        <torusGeometry args={[0.72, 0.035, 12, 32]} />
        <meshBasicMaterial color="#10b981" transparent opacity={0.8} />
      </mesh>

      <group ref={draftingGroupRef} visible={false}>
        {[[-0.48, 0.38], [0.48, 0.38], [-0.24, 0.76], [0.24, 0.76]].map(([x, y], idx) => (
          <mesh key={idx} ref={(el) => (draftingRibbonsRef.current[idx] = el)} position={[x, y, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.012, 0.012, 0.7, 6]} />
            <meshBasicMaterial color={idx < 2 ? '#38bdf8' : '#f8fafc'} transparent opacity={0.7} />
          </mesh>
        ))}
      </group>

      <group ref={shiftFlashRef} position={[-0.2, 0.14, -1.05]} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.09, 0.38, 12]} />
          <meshBasicMaterial color="#f97316" transparent opacity={0.9} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.045, 0.22, 12]} />
          <meshBasicMaterial color="#38bdf8" transparent opacity={0.95} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.08, 0.14, 16]} />
          <meshBasicMaterial color="#fbbf24" transparent opacity={0.75} side={THREE.DoubleSide} />
        </mesh>
      </group>

      <group ref={takedownSparksRef} visible={false}>
        {[...Array(10)].map((_, i) => (
          <mesh key={i} ref={(el) => (takedownSparkListRef.current[i] = el)} position={[0, 0.32, 0.1]}>
            <boxGeometry args={[0.02, 0.02, 0.08]} />
            <meshBasicMaterial color={i % 2 === 0 ? '#fbbf24' : '#f59e0b'} />
          </mesh>
        ))}
      </group>
    </group>
  );
}
