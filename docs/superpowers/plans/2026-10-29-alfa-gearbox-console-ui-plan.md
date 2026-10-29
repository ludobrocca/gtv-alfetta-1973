# Implementation Plan — Console Cambio Transaxle a 5 Marce

Spec: `docs/superpowers/specs/2026-10-29-alfa-gearbox-console-ui-design.md`
AC: `docs/superpowers/acceptance/2026-10-29-alfa-gearbox-console-ui.md`

## Task 1 — Fisica cambio in `driveStore.js`
Implementare sezione 1 della spec: costanti esportate, nuovo stato + reset, riscrittura sezione 7 di `update()` (target speed per marcia, accel per marcia, auto-correzione, RPM per banda, limitatore + assistenza 3s, finestra doppietta, overdrive), nuova `triggerPerfectShift()` (perfect/good/overdrive), scalata in `handleFrontalImpact()`. Non toccare power-up/spawn. Verificare che `verify_burnout_gameplay.js` e `verify_diegetic_vfx.js` passino. Commit.

## Task 2 — Componente `AlfaGearboxConsole.jsx` + CSS
Creare il componente come da sezione 2 della spec (puramente presentazionale, props-driven) e keyframes in `src/index.css`. Commit.

## Task 3 — Integrazione `Speedometer.jsx`
Sezione 3 della spec. `npm run build` deve passare. Commit.

## Task 4 — Test `scripts/verify_gearbox_console.js`
Stesso harness di `verify_burnout_gameplay.js` (mock localStorage/window/AudioContext/performance, import di `driveStore`), un `runTest` per AC-001…AC-010 (AC-010 = esecuzione degli altri script + build tramite `child_process.execSync`). Commit.
