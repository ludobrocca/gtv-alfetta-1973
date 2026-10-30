# Acceptance Criteria — PS2 Need for Speed Style Intro Motion Camera

Spec: `docs/superpowers/specs/2026-10-30-nfs-intro-camera-motion-design.md`
Verifica automatica: `node scripts/verify_intro_camera.js`

- **AC-001 — Costanti & Metodi Store**: `driveStore.js` esporta `INTRO_CAM_DURATION = 2.6`. Fornisce `triggerIntroCam()` e `skipIntroCam()`. `resetGame('playing')` porta `introCamTimer = 0`, mentre `triggerIntroCam()` imposta `introCamTimer = 2.6`.
- **AC-002 — Attivazione Manche**: `startRaceWithDriver('elvis')` attiva la partita e avvia l'intro impostando `driveStore.introCamTimer = 2.6`.
- **AC-003 — Decremento & Conclusione**: simulando `update(dt)` per 2.6s reali, `introCamTimer` si azzera gradualmente e l'intro termina tornando a 0. `skipIntroCam()` azzera istantaneamente il timer.
- **AC-004 — Regia Telecamera 3D (DriveCameraDirector.jsx)**: `DriveCameraDirector.jsx` implementa la traiettoria ad arco con punto iniziale a `Z > 3.0` davanti al muso, punto intermedio sulla fiancata e ancoraggio posteriore a `Z = -3.55`. Gestisce grandangolo `FOV` da ~62° a 46° e Dutch angle (`camera.up`).
- **AC-005 — HUD & Riprova (Speedometer.jsx)**: `Speedometer.jsx` include le barre letterbox animate con stato `introCamActive`, consente di saltare con tap/spazio e scatena `triggerIntroCam()` sia su pulsante "Riprova" sia su Space/Enter post-gameover.
- **AC-006 — Regressioni & Build**: tutte le suite di test esistenti (`verify_pilot_ultimates.js`, `verify_gearbox_console.js`, `verify_burnout_gameplay.js`, `verify_diegetic_vfx.js`, `verify_mobile_experience.js`) e `npm run build` passano senza errori.
