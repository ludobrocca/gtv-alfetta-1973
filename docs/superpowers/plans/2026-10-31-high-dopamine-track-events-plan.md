# Implementation Plan — Eventi Speciali Adrenalina & Deformazione Stradale 3D

**Spec:** [2026-10-31-high-dopamine-track-events-design.md](file:///Users/ludovicobrocca/Repository/gtv-alfetta/docs/superpowers/specs/2026-10-31-high-dopamine-track-events-design.md)
**Acceptance Criteria:** [2026-10-31-high-dopamine-track-events.md](file:///Users/ludovicobrocca/Repository/gtv-alfetta/docs/superpowers/acceptance/2026-10-31-high-dopamine-track-events.md)

---

## Task 1 — Macchina a Stati `trackEvent`, Fisica & Sintesi Audio (`driveStore.js`, `DriveAudio.js`)
**Files:**
- `src/components/drive/DriveAudio.js`
- `src/components/drive/driveStore.js`

**Steps:**
1. In `src/components/drive/DriveAudio.js`:
   - Aggiungere `playEventWarningBeep()` (doppio bip sintetico rally 880Hz → 1175Hz) e `playFZeroBoostHum()` (accordo elettronico ascendente 220Hz/330Hz/660Hz per l'ingresso nel tunnel/evento).
2. In `src/components/drive/driveStore.js`:
   - Esportare `TRACK_EVENT_TYPES`, `TRACK_EVENT_INTERVAL_METERS = 1200`, `TRACK_EVENT_FUNNEL_DURATION = 3.0`, `TRACK_EVENT_ACTIVE_DURATION = 7.5`, `TRACK_EVENT_EXIT_DURATION = 1.5`, `TRACK_EVENT_COMPLETION_BONUS = 1500`.
   - Aggiungere in `constructor()` e `resetGame()`: `this.trackEvent = null`, `this.nextTrackEventDistance = TRACK_EVENT_INTERVAL_METERS`, `this.trackEventIndex = 0`, `this.trackEventsCompleted = 0`.
   - Implementare `startTrackEvent(forcedType, forcedLane)` e `updateTrackEvent(dt)` per gestire le fasi `funnel` (3.0s, barriere d'imbuto sulle 2 corsie chiuse), `active` (7.5s, invulnerabilità da ostacoli letali, velocità forzate 235/185/195 km/h, spirali monete / punti drift / rampe aeree) ed `exiting` (1.5s, bonus `+1500 * furyMultiplier` PT, `+15%` Ultimate, `trackEventsCompleted++`).
   - Implementare `getRoadCurveX(localZ = 0)` e `getRoadEventParams(localZ = 0)` come definito nella Sezione 2.4 della Spec.
3. Eseguire tutte le suite esistenti per verificare zero regressioni e fare commit.

---

## Task 2 — Deformazione Stradale 3D, Portale Bivio & Telecamera (`DriveWorld.jsx`, `DriveCameraDirector.jsx`)
**Files:**
- `src/components/drive/DriveWorld.jsx`
- `src/components/drive/DriveCameraDirector.jsx`

**Steps:**
1. In `src/components/drive/DriveWorld.jsx`:
   - Portare `ROAD_X_SEGMENTS = 16` su `roadMeshRef` (`<planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH, 16, ROAD_Z_SEGMENTS]} />`) memorizzando la coordinata `baseX` di ogni vertice.
   - Aggiornare `updateSurfaceElevation` per applicare `curveX = driveStore.getRoadCurveX(worldZ)` e `{ widthScale, bankAngle, wallCurvature, vergeDropY } = driveStore.getRoadEventParams(worldZ)` alla strada e ai prati laterali.
   - Sommare `driveStore.getRoadCurveX(zPos)` alla posizione `X` di recinzioni, pali, alberi, archi del tunnel, monete e ostacoli.
   - Creare il componente 3D `<EventEntryPortal />` visibile durante `trackEvent.phase === 'funnel'` con frecce luminose sulla corsia `entryLane` e segnali di corsia chiusa sulle altre due.
   - Attivare gli archi neon ciano/magenta durante `fzero_tunnel` e la striscia dorata sulla `idealLane` durante `parabolic_drift`.
2. In `src/components/drive/DriveCameraDirector.jsx`:
   - Integrare i 3 profili telecamera quando `driveStore.trackEvent` ha `blend > 0`:
     - `fzero_tunnel`: rasoterra (`Y - 0.68 * blend`), `FOV = 68°`, roll parabolico `-targetLane * 0.35 * blend`.
     - `parabolic_drift`: camera laterale OutRun (`X + curveDir * 1.55 * blend`), `FOV = 56°`, roll `curveDir * 0.14 * blend`.
     - `viaduct_ramps`: camera elicottero (`Y + 0.85 * blend + airY * 0.45`, `Z = -4.25`), `FOV = 60°`.
3. Verificare `npm run build` e fare commit.

---

## Task 3 — Indicatore HUD Non-Intrusivo & Suite di Verifica (`Speedometer.jsx`, `scripts/verify_track_events.js`)
**Files:**
- `src/components/drive/Speedometer.jsx`
- `scripts/verify_track_events.js`

**Steps:**
1. In `src/components/drive/Speedometer.jsx`:
   - Leggere `driveStore.trackEvent` nel loop a 30Hz (`trackEvent` state).
   - Mostrare nella parte superiore dell'HUD (sotto la pillola della zona panoramica, senza mai coprire il centro strada):
     - In fase `funnel`: badge direzionale lampeggiante con la corsia da imboccare (`SINISTRA ⬅`, `CENTRALE ⬆`, `DESTRA ➔`).
     - In fase `active`: badge neon dell'evento attivo con barra progresso residua.
2. Creare `scripts/verify_track_events.js` validando tutti i criteri `AC-001` – `AC-009`.
3. Eseguire `node scripts/verify_track_events.js` e `npm run build`, e fare commit.
