# Design Spec — Eventi Speciali Adrenalina & Deformazione Stradale 3D (F-Zero Tunnel, OutRun Drift, Viadotto Aereo)

**Data:** 2026-10-31 · **Branch:** `feat/high-dopamine-track-events` · **Stato:** Approvato dall'utente

## 1. Obiettivo
Spezzare il loop dell'autostrada a 3 corsie ogni **~35–45 secondi di guida** (`1.200 metri` sul contachilometri / `~2.500–3.000 Punti` sull'HUD) con **3 Eventi Speciali Adrenalina** a rotazione che trasformano radicalmente la geometria 3D della strada, la fisica dell'Alfetta GTV e l'inquadratura della telecamera:
1. **🚇 Tunnel Magnetico F-Zero (`fzero_tunnel`)**: restringimento stradale in un condotto magnetico parabolico a `235 km/h`, pareti inclinate a 35°, archi neon ciano/magenta, spirali di monete d'oro e telecamera rasoterra con grandangolo `68°`.
2. **⛰️ Curva Parabolica Autodelta (`parabolic_drift`)**: grande curvone panoramico sopraelevato con strada che piega realmente in 3D, controsterzo continuo con fumo gomme, telecamera laterale stile *OutRun* e corsia ideale dorata che eroga punti Drift continui.
3. **🌉 Viadotto Aereo di Rampe (`viaduct_ramps`)**: banchine laterali che sprofondano lasciando la strada sospesa su un viadotto ad alta quota con 3 super-rampe consecutive, archi di monete in cielo e telecamera elicottero panoramica.

---

## 2. Architettura dello Store (`src/components/drive/driveStore.js`)

### 2.1 Costanti Esportate
```js
export const TRACK_EVENT_TYPES = ['fzero_tunnel', 'parabolic_drift', 'viaduct_ramps'];
export const TRACK_EVENT_INTERVAL_METERS = 1200; // ~35-45s di guida (~2500-3000 Punti HUD)
export const TRACK_EVENT_FUNNEL_DURATION = 3.0;  // Preavviso + cartelli 3D + imbuto corsie (s)
export const TRACK_EVENT_ACTIVE_DURATION = 7.5;  // Durata pura dopamina invulnerabile (s)
export const TRACK_EVENT_EXIT_DURATION = 1.5;    // Transizione di uscita e bonus (s)
export const TRACK_EVENT_COMPLETION_BONUS = 1500; // Punti base moltiplicati per furyMultiplier
```

### 2.2 Stato `trackEvent` in `DriveStore`
Nel costruttore e in `resetGame()`:
```js
this.trackEvent = null;
// Struttura quando attivo:
// {
//   type: 'fzero_tunnel' | 'parabolic_drift' | 'viaduct_ramps',
//   phase: 'funnel' | 'active' | 'exiting',
//   timer: number,          // Secondi rimanenti nella fase corrente
//   entryLane: -1 | 0 | 1,  // Corsia segnalata dal cartello per imboccare l'evento
//   curveDir: -1 | 1,       // Direzione di curvatura per parabolic_drift (-1 Sinistra, +1 Destra)
//   idealLane: -1 | 0 | 1,  // Corsia ideale dorata corrente durante parabolic_drift
//   blend: number,          // 0.0 -> 1.0 fattore di deformazione geometrica/camera
//   driftTickTimer: number, // Accumulatore per punti drift continui (ogni 0.5s)
//   spawnTickTimer: number, // Accumulatore per generare spirali monete / rampe nell'evento
// }
this.nextTrackEventDistance = TRACK_EVENT_INTERVAL_METERS;
this.trackEventIndex = 0;
this.trackEventsCompleted = 0;
```

### 2.3 Ciclo di Vita & Metodi (`startTrackEvent`, `updateTrackEvent`)
1. **Innesco (`distanceMeters >= nextTrackEventDistance`)**:
   - Chiama `startTrackEvent(forcedType, forcedLane)`:
     - Seleziona `type = forcedType || TRACK_EVENT_TYPES[this.trackEventIndex % 3]` e incrementa `trackEventIndex`.
     - Sceglie `entryLane = forcedLane !== undefined ? forcedLane : [-1, 0, 1][Math.floor(Math.random() * 3)]`.
     - Imposta `phase = 'funnel'`, `timer = TRACK_EVENT_FUNNEL_DURATION`, `blend = 0`.
     - Rimuove gli ostacoli lontani (`z > 12`) e genera a `z = 34` le **2 barriere d'imbuto** sulle 2 corsie diverse da `entryLane` (così la carreggiata si stringe fisicamente lasciando aperta solo `entryLane`).
     - Chiama `driveAudio.playEventWarningBeep()`.
2. **Transizione `funnel` → `active`**:
   - Quando `timer <= 0` in fase `funnel`:
     - Passa a `phase = 'active'`, `timer = TRACK_EVENT_ACTIVE_DURATION`.
     - Pulisce tutti gli ostacoli letali (`this.obstacles = []`) così dentro l'evento il giocatore è **100% invulnerabile a crash** e vive pura dopamina.
     - Porta `this.targetLane = this.trackEvent.entryLane` se stava già convergendo, aggiunge `+1` Furia e chiama `driveAudio.playFZeroBoostHum()`.
     - Genera il primo pacchetto di entità specifiche dell'evento (spirale di monete per `fzero_tunnel`, striscia monete sulla corda per `parabolic_drift`, 3 super-rampe con archi di monete aeree per `viaduct_ramps`).
3. **Esecuzione `active` (`7.5s`)**:
   - `blend` sale linearmente verso `1.0` (`Math.min(1, blend + dt * 1.6)`).
   - **Velocità Forzata Adrenalina**:
     - `fzero_tunnel`: `targetSpeed = 235` km/h, `accelRate = 95` km/h/s, `shiftFlashTimer = 0.2` continuo (fiammata blu fissa), inclinazione sulle pareti paraboliche `this.carRoll = -this.targetLane * 0.52`.
     - `parabolic_drift`: `targetSpeed = 185` km/h, `this.carYaw = this.trackEvent.curveDir * 0.34` (controsterzo continuo); se `this.targetLane === this.trackEvent.idealLane`, ogni `0.5s` assegna `+250 * this.furyMultiplier` punti, `+1` Furia e `+4%` Ultimate.
     - `viaduct_ramps`: `targetSpeed = 195` km/h; genera super-rampe centrali/laterali che lanciano a `verticalVel = 5.2`.
4. **Transizione `active` → `exiting` → Completamento**:
   - Allo scadere di `active`, passa a `phase = 'exiting'`, `timer = TRACK_EVENT_EXIT_DURATION`.
   - `blend` scende verso `0.0` (`Math.max(0, blend - dt * 0.8)`).
   - Assegna il bonus: `pts = TRACK_EVENT_COMPLETION_BONUS * this.furyMultiplier`, `this.score += pts`, `this.addUltimateCharge(15)`, `this.addFury(1)`, `this.trackEventsCompleted++`.
   - Imposta `this.nextTrackEventDistance = this.distanceMeters + TRACK_EVENT_INTERVAL_METERS`.
   - Allo scadere di `exiting`, `this.trackEvent = null`.

### 2.4 Funzioni Pure di Deformazione Stradale in `driveStore`
- `getRoadCurveX(localZ = 0)`:
  - Se `trackEvent` è attivo in `parabolic_drift` con `blend > 0` e `localZ > 0`: restituisce ` -this.trackEvent.curveDir * this.trackEvent.blend * 0.0028 * localZ * localZ` (curvatura progressiva davanti al muso). Altrimenti `0`.
- `getRoadEventParams(localZ = 0)`:
  - Restituisce `{ widthScale, bankAngle, wallCurvature, vergeDropY }`:
    - `fzero_tunnel`: `widthScale = 1 - 0.18 * blend`, `wallCurvature = 0.45 * blend`, `bankAngle = 0`, `vergeDropY = 0`.
    - `parabolic_drift`: `widthScale = 1.0`, `bankAngle = this.trackEvent.curveDir * 0.22 * blend`, `wallCurvature = 0`, `vergeDropY = 0`.
    - `viaduct_ramps`: `widthScale = 0.88`, `bankAngle = 0`, `wallCurvature = 0`, `vergeDropY = -7.5 * blend` (i prati laterali scendono di 7.5m lasciando la strada sospesa come un ponte!).

---

## 3. Mondo 3D & Cartelli Stradali (`src/components/drive/DriveWorld.jsx`)
1. **Deformazione Vertici (`updateSurfaceElevation`)**:
   - Aumentare le suddivisioni orizzontali di `roadMeshRef` a `ROAD_X_SEGMENTS = 16` (`<planeGeometry args={[ROAD_WIDTH, ROAD_LENGTH, 16, ROAD_Z_SEGMENTS]} />`) salvando la coordinata `baseX` iniziale di ogni vertice.
   - Per `roadMeshRef`: oltre a `elev = driveStore.getRoadElevation(worldZ)`, applica `curveX = driveStore.getRoadCurveX(worldZ)`, `widthScale`, `bankAngle` e `wallCurvature` (sollevando i bordi destro/sinistro della mesh `wallLift = wallCurvature * Math.pow(Math.abs(normX), 2)` in `fzero_tunnel` per formare la parabolica magnetica).
   - Per `vergeLeftRef` e `vergeRightRef`: applica `curveX` e `vergeDropY` (così in `viaduct_ramps` i prati sprofondano sotto il viadotto).
2. **Portale Cartelli 3D d'Ingresso (`<EventEntryPortal />`)**:
   - Visibile durante `trackEvent.phase === 'funnel'`: un cavalletto autostradale 3D con 3 pannelli sopra le corsie:
     - Sulla corsia `entryLane`: **Freccia Verde/Oro Luminosa `▼ INGRESSO EVENTO ▼`**.
     - Sulle altre 2 corsie: **Croci Rosse `✖ CORSIA CHIUSA`** con frecce chevron diagonali che indicano di spostarsi verso `entryLane`.
3. **Archi Neon F-Zero & Piloni Viadotto**:
   - Durante `fzero_tunnel`, `tunnelArchesRef` si attiva con anelli ravvicinati e materiale emissivo ciano/magenta (`#06b6d4` / `#ec4899`).
   - Tutte le entità (`coins`, `obstacles`) sommano `driveStore.getRoadCurveX(z)` alla loro coordinata `X` così seguono perfettamente la curva della strada!

---

## 4. Regia Telecamera (`src/components/drive/DriveCameraDirector.jsx`)
Quando `driveStore.trackEvent` è in fase `active` o `exiting` (con `blend > 0`):
- **`fzero_tunnel`**:
  - Camera rasoterra: `targetY` scende di `-0.68 * blend` (a `~0.70m` da terra), `targetZ` si avvicina a `-2.85`, `targetFov` sale a **`68°`**; `roll = -driveStore.targetLane * 0.35 * blend` (la camera s'inclina insieme all'Alfetta sulle pareti del tunnel!).
- **`parabolic_drift`**:
  - Camera laterale OutRun: `targetX` si sposta all'esterno curva (`+ curveDir * 1.55 * blend`), `lookX` punta l'interno curva (`- curveDir * 1.2 * blend`), `targetFov = 56°`, `roll = curveDir * 0.14 * blend`.
- **`viaduct_ramps`**:
  - Camera Elicottero: `targetY` sale di `+0.85 * blend + airY * 0.45`, `targetZ = -4.25`, `targetFov = 60°`, inquadrando dall'alto il ponte sospeso e i salti concatenati.

---

## 5. HUD Non-Intrusivo (`src/components/drive/Speedometer.jsx`)
- Nessun banner al centro dello schermo!
- Nella barra superiore (sotto il badge della zona panoramica):
  - Durante `phase === 'funnel'`: pillola direzionale lampeggiante **`⚠️ BIVIO EVENTO: VAI SULLA CORSIA [SINISTRA ⬅ / CENTRALE ⬆ / DESTRA ➔]`**.
  - Durante `phase === 'active'`: pillola neon con il nome dell'evento attivo (**`🚇 TUNNEL MAGNETICO F-ZERO • 235 KM/H`**, **`⛰️ CURVA PARABOLICA AUTODELTA • TIENI LA CORDA D'ORO`**, **`🌉 VIADOTTO AEREO • SALTI CONCATENATI`**) e barra di avanzamento.

---

## 6. Audio (`src/components/drive/DriveAudio.js`)
- `playEventWarningBeep()`: doppio bip sintetico da cruscotto rally all'apertura del bivio.
- `playFZeroBoostHum()`: accordo elettronico ascendente stile turbina magnetica all'ingresso nell'evento.
