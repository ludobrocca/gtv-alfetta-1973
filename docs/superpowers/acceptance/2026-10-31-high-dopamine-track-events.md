# Acceptance Criteria — Eventi Speciali Adrenalina & Deformazione Stradale 3D

**Spec:** [2026-10-31-high-dopamine-track-events-design.md](file:///Users/ludovicobrocca/Repository/gtv-alfetta/docs/superpowers/specs/2026-10-31-high-dopamine-track-events-design.md)
**Script di verifica:** `node scripts/verify_track_events.js`

---

### AC-001 — Costanti, Stato e Reset in `driveStore.js`
- `driveStore.js` esporta:
  - `TRACK_EVENT_TYPES = ['fzero_tunnel', 'parabolic_drift', 'viaduct_ramps']`
  - `TRACK_EVENT_INTERVAL_METERS = 1200`
  - `TRACK_EVENT_FUNNEL_DURATION = 3.0`
  - `TRACK_EVENT_ACTIVE_DURATION = 7.5`
  - `TRACK_EVENT_EXIT_DURATION = 1.5`
  - `TRACK_EVENT_COMPLETION_BONUS = 1500`
- `resetGame('playing')` imposta `trackEvent = null`, `nextTrackEventDistance = 1200`, `trackEventIndex = 0`, `trackEventsCompleted = 0`.

### AC-002 — Innesco a 1.200m & Fase `funnel` (Cartelli + Imbuto Barriere)
- Quando `distanceMeters >= nextTrackEventDistance` (o invocando `startTrackEvent(type, entryLane)`):
  - `trackEvent` entra in `phase === 'funnel'` con `timer === 3.0`, `blend === 0`, e `entryLane` valido (`-1`, `0` o `1`).
  - Vengono generate le barriere d'imbuto sulle 2 corsie diverse da `entryLane` (lasciando libera `entryLane`).
  - La rotazione automatica cicla nell'ordine `fzero_tunnel` → `parabolic_drift` → `viaduct_ramps`.

### AC-003 — Transizione `funnel` → `active` & Invulnerabilità Dopamina
- Simulando `update()` per oltre `3.0s` in fase `funnel`:
  - `trackEvent.phase` passa a `'active'` con `timer === 7.5`.
  - Tutti gli ostacoli letali (`fiat500`, `barrier`, `oil`) vengono rimossi e non ne vengono generati di nuovi durante `'active'`.
  - `trackEvent.blend` cresce progressivamente verso `1.0`.

### AC-004 — Fisica e Geometria dei 3 Eventi (`fzero_tunnel`, `parabolic_drift`, `viaduct_ramps`)
- **Tunnel Magnetico F-Zero (`fzero_tunnel`)**:
  - In fase `'active'`, la velocità sale oltre `210 km/h` (target `235 km/h`), `carRoll` riflette l'inclinazione sulle pareti paraboliche (`-targetLane * 0.52`), e `getRoadEventParams()` restituisce `widthScale < 1` e `wallCurvature > 0`.
- **Curva Parabolica Autodelta (`parabolic_drift`)**:
  - `getRoadCurveX(40)` restituisce uno spostamento laterale non nullo concorde con `curveDir`; `carYaw` mantiene l'angolo di controsterzo; restando su `idealLane` vengono erogati punti Drift e carica Furia ogni `0.5s`.
- **Viadotto Aereo di Rampe (`viaduct_ramps`)**:
  - `getRoadEventParams()` restituisce `vergeDropY < -5` (prati ribassati sotto il ponte) e vengono generate rampe (`type: 'ramp'`) con monete aeree (`yOffset > 0`).

### AC-005 — Transizione `active` → `exiting` & Bonus Completamento
- Allo scadere dei `7.5s` di `active`:
  - `trackEvent.phase` passa a `'exiting'` (`1.5s`), assegna `1500 * furyMultiplier` punti, `+15%` Ultimate, incrementa `trackEventsCompleted` di `1`, e aggiorna `nextTrackEventDistance = distanceMeters + 1200`.
  - Allo scadere di `exiting`, `trackEvent` torna `null`.

### AC-006 — Deformazione 3D e `<EventEntryPortal />` in `DriveWorld.jsx`
- `DriveWorld.jsx` utilizza `ROAD_X_SEGMENTS = 16` su `roadMeshRef`, applica `getRoadCurveX` e `getRoadEventParams` ai vertici della strada e dei prati, e monta il portale 3D d'ingresso (`EventEntryPortal`) durante la fase `'funnel'`.

### AC-007 — Regia Telecamera in `DriveCameraDirector.jsx`
- `DriveCameraDirector.jsx` legge `driveStore.trackEvent` e applica i 3 profili cinematografici:
  - `fzero_tunnel`: camera rasoterra e `FOV` fino a `68°` + roll sulle pareti.
  - `parabolic_drift`: offset laterale esterno curva e `FOV` `56°`.
  - `viaduct_ramps`: camera elicottero rialzata e `FOV` `60°`.

### AC-008 — HUD Non-Intrusivo e Audio (`Speedometer.jsx`, `DriveAudio.js`)
- `Speedometer.jsx` mostra la spia direzionale del bivio in fase `'funnel'` e la pillola neon dell'evento in fase `'active'` nella parte alta dell'HUD (senza mai reintrodurre banner centrali).
- `DriveAudio.js` espone `playEventWarningBeep()` e `playFZeroBoostHum()`.

### AC-009 — Zero Regressioni & Build di Produzione
- Tutte le 6 suite esistenti (`verify_intro_camera.js`, `verify_pilot_ultimates.js`, `verify_gearbox_console.js`, `verify_burnout_gameplay.js`, `verify_diegetic_vfx.js`, `verify_mobile_experience.js`) e `npm run build` passano con 0 errori.
