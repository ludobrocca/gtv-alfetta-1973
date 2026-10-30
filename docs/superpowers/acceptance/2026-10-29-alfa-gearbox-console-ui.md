# Acceptance Criteria — Console Cambio Transaxle a 5 Marce + Contagiri Autodelta

Spec: `docs/superpowers/specs/2026-10-29-alfa-gearbox-console-ui-design.md`
Verifica automatica: `node scripts/verify_gearbox_console.js`

- **AC-001 — Costanti & Reset**: `driveStore.js` esporta `GEAR_BANDS` (5 bande come da spec), `GEAR_ACCEL`, `RPM_SHIFT_GOOD=4200`, `RPM_SHIFT_PERFECT=5200`, `RPM_LIMITER=6500`, `RPM_MAX=7000`, `OVERDRIVE_DURATION=3.5`. `resetGame('playing')` porta `gear=1`, `rpm=1500`, `speedKmh=20`, `overdriveTimer=0`, `limiterTimer=0`, `shiftFeedback=null`.
- **AC-002 — Progressione reale in marcia**: simulando `update(1/60)` per 6s in 1ª senza cambiare, la marcia resta `1` (fino all'assistenza dopo 3s di limitatore, vedi AC-005 — il test può bloccare `limiterTimer`), la velocità non supera `76+3`, e l'RPM sale sopra `5200` aprendo `shiftWindowActive`.
- **AC-003 — Doppietta perfetta**: con `shiftWindowActive=true` in 2ª, `triggerPerfectShift()` → `true`, `gear=3`, velocità +10 (cap 215), `perfectShiftsCount+1`, `shiftFlashTimer=0.55`, `shiftFeedback.quality='perfect'`, `shiftCooldown>0`, `shiftWindowActive=false`.
- **AC-004 — Cambiata buona & rifiuto**: con `shiftWindowActive=false`, `rpm=4600`, `gear=2`, cooldown 0 → `true`, `gear=3`, velocità +5, `shiftFeedback.quality='good'`, `perfectShiftsCount` invariato. Con `rpm=3000` → `false` e marcia invariata. Subito dopo `resetGame('playing')` con window chiusa → `false`.
- **AC-005 — Limitatore & assistenza**: in 1ª con velocità al tetto e `rpm>=6500` per più di 3s di `update`, la marcia sale a 2 con `shiftFeedback.quality='auto'`, senza incremento di `perfectShiftsCount`.
- **AC-006 — Overdrive Autodelta in 5ª**: in `gear=5` con `shiftWindowActive=true`, `triggerPerfectShift()` → `true`, `gear` resta 5, `overdriveTimer=3.5`, `shiftFeedback.quality='overdrive'`; durante l'overdrive `shiftWindowActive` resta `false`.
- **AC-007 — Scalata da impatto**: con paraurti intatto in 4ª, `handleFrontalImpact()` → `gear=2`, `overdriveTimer=0`.
- **AC-008 — Componente UI**: esiste `src/components/drive/AlfaGearboxConsole.jsx` con griglia ad H SVG (etichette 1–5 + R), pomello mogano con `transition` cubic-bezier, contagiri segmentato con "ZONA DOPPIETTA", tamburo marcia con "OD", badge `shiftFeedback`, `onShift`, `aria-label`. `src/index.css` contiene `gear-knob-shake` e `gear-limiter-flash`.
- **AC-009 — Integrazione HUD**: `Speedometer.jsx` importa e rende `<AlfaGearboxConsole`, passa `onShift` → `triggerPerfectShift`, legge `overdriveTimer` e `shiftFeedback`; il vecchio bottone testuale "⚡ CAMBIA! ({gear}ª →" non esiste più. Nessun `eventBanner` reintrodotto.
- **AC-010 — Regressioni**: `verify_diegetic_vfx.js`, `verify_burnout_gameplay.js`, `verify_mobile_experience.js` e `npm run build` passano.
