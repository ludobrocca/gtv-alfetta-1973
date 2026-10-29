# Overhaul Gameplay Arcade "Burnout x Bialbero" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. It will decide whether each batch should run in parallel or serial subagent mode and will pass only task-local context to each subagent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trasformare la modalità "In Corsa" dell'Alfa Romeo Alfetta GTV (1976) in un arcade di guida ad altissima assuefazione con Sportellate Takedown alla *Burnout*, Sistema di Sopravvivenza "Paraurti d'Acciaio" a 2 stadi con auto-riparazione, Scia Aerodinamica con Sorpasso Fionda, Cambiata Perfetta in Zona Rossa, Rampe di Lancio con Monete Aeree, Barra Ultimate Caricabile (0–100%), Moltiplicatore Furia (x1–x10), Gradi Autodelta e Albo d'Oro Locale Top 5.

**Architecture:** Espansione deterministica dello store reattivo `src/components/drive/driveStore.js` con fisica vettoriale per sportellate laterali, gestione finestre di cambiata in zona rossa, spawner multi-livello per rampe e sbarramenti, e persistenza Top 5 in `localStorage`. Aggiornamento sincronizzato del rendering 3D in `src/components/drive/DriveWorld.jsx`, dei sintetizzatori sonori Web Audio in `src/components/drive/DriveAudio.js` e del cruscotto interattivo in `src/components/drive/Speedometer.jsx`.

**Tech Stack:** React 18, Three.js, @react-three/fiber, Lucide React, Web Audio API, Tailwind CSS, Vite.

---

### Task 1: Espansione Audio Arcade in `DriveAudio.js` (Sportellata, Cambiata Perfetta, Rampa & Riparazione)

**Files:**
- Modify: `src/components/drive/DriveAudio.js`
- Satisfies: `AC-001`, `AC-002`, `AC-004`, `AC-005`

- [ ] **Step 1: Aggiungere i sintetizzatori sonori in `src/components/drive/DriveAudio.js`**

Aggiungere in `DriveAudioManager` (`src/components/drive/DriveAudio.js`) i metodi:
- `playTakedownSlam()`: Impatto metallico punchy + scintilla ad alta frequenza per le Sportellate Takedown.
- `playPerfectShiftBackfire()`: Doppio scoppio di scarico Bialbero + fischio d'aspirazione Weber quando si esegue una Cambiata Perfetta in Zona Rossa.
- `playRampLaunch()`: Crescendo aerodinamico + accordo maggiore per il decollo sulle rampe stradali.
- `playArmorRepair()`: Trillo meccanico positivo quando il Paraurti d'Acciaio viene riparato.
- `playArmorDamage()`: Urto sordo metallico con allarme breve quando il paraurti subisce il primo colpo e passa a `'damaged'`.

- [ ] **Step 2: Verificare la build**

Run: `npm run build`  
Expected: Build completata con 0 errori.

- [ ] **Step 3: Commit**

```bash
git add src/components/drive/DriveAudio.js
git commit -m "feat(audio): add synthesized SFX for burnout takedowns, redline shifts, ramps and armor repair"
```

---

### Task 2: Motore Gameplay "Burnout x Bialbero" in `driveStore.js`

**Files:**
- Modify: `src/components/drive/driveStore.js`
- Satisfies: `AC-001`, `AC-002`, `AC-003`, `AC-004`, `AC-005`, `AC-006`, `AC-007`, `AC-008`

- [ ] **Step 1: Aggiungere costanti Gradi Pilota e nuove proprietà nello stato di `DriveStore`**

In `src/components/drive/driveStore.js`:
- Esportare `DRIVER_RANKS` e il metodo `getDriverRank(score)`:
  - `< 5000`: `{ title: 'Turista di Abano', icon: '🚗', tier: 1 }`
  - `5000 - 14999`: `{ title: 'Amante del Bialbero', icon: '⚙️', tier: 2 }`
  - `15000 - 34999`: `{ title: 'Pilota Corsie Veloci', icon: '🏁', tier: 3 }`
  - `35000 - 69999`: `{ title: 'Collaudatore Autodelta', icon: '🔥', tier: 4 }`
  - `>= 70000`: `{ title: 'Leggenda del Quadrifoglio', icon: '🍀', tier: 5 }`
- Aggiungere nel costruttore e in `resetGame()`:
  - `this.armorState = 'intact'` (`'intact' | 'damaged'`)
  - `this.repairProgress = 0` (da 0 a 3 per riparare il paraurti)
  - `this.furyMultiplier = 1` (da 1 a 10)
  - `this.furyTimer = 0`
  - `this.ultimateCharge = 0` (da 0 a 100)
  - `this.isDrafting = false`
  - `this.draftTimer = 0`
  - `this.shiftWindowActive = false`
  - `this.shiftCooldown = 0`
  - `this.laneChangeTimer = 0`
  - `this.lastLaneDirection = 0`
  - `this.takedownsCount = 0`
  - `this.perfectShiftsCount = 0`
  - `this.rampJumpsCount = 0`
  - `this.slingshotsCount = 0`
  - `this.activePowerups.mg = 0` (aggiunto per l'Ultimate dedicata a MG)
  - `this.leaderboard = []` (caricato da `localStorage.getItem('alfetta_top5_leaderboard')`)

- [ ] **Step 2: Implementare i metodi di Gameplay Attivo in `DriveStore`**

Implementare i metodi:
1. `addFury(amount = 1)` e `addUltimateCharge(percent)`:
   - `this.furyMultiplier = Math.min(10, this.furyMultiplier + amount);`
   - `this.furyTimer = 7.5;`
   - `this.ultimateCharge = Math.min(100, this.ultimateCharge + percent);`
2. `takedownObstacle(id, direction = 1)` (**AC-001**, **AC-002**):
   - Trova l'ostacolo `obs`, imposta `obs.active = false`, `obs.knockedOut = true`, `obs.vx = (direction || 1) * 11.5`, `obs.vz = 9.0`, `obs.vRot = (direction || 1) * 10.0`.
   - Incrementa `this.takedownsCount++`, `this.addUltimateCharge(35)`, `this.addFury(1)`.
   - Aggiunge `300 * this.furyMultiplier` a `this.score`, imposta `this.boostTimer = Math.max(this.boostTimer, 1.0)`.
   - Se `this.armorState === 'damaged'`, incrementa `this.repairProgress++`; se `this.repairProgress >= 3`, riporta `this.armorState = 'intact'`, `this.repairProgress = 0`, chiama `driveAudio.playArmorRepair()` e mostra banner `"🔧 MECCANICA ALFA RIPRISTINATA!"`. Altrimenti mostra banner `"💥 SPORTELLATA TAKEDOWN!"` e chiama `driveAudio.playTakedownSlam()`.
3. `handleFrontalImpact(id)` (**AC-002**):
   - Se `this.armorState === 'intact'`:
     - Disattiva l'ostacolo colpito (`obs.active = false`), imposta `this.armorState = 'damaged'`, `this.repairProgress = 0`, `this.furyMultiplier = 1`, `this.furyTimer = 0`, riduce `this.speedKmh = Math.max(48, this.speedKmh * 0.75)`.
     - Mostra banner `"⚠️ PARAURTI DANNEGGIATO! • 3 SPORTELLATE O 1 RAMPA PER RIPARARE"`, chiama `driveAudio.playArmorDamage()`.
   - Se `this.armorState === 'damaged'`:
     - Chiama `this.triggerCrash()`.
4. `triggerPerfectShift()` (**AC-004**):
   - Se `this.gameState !== 'playing' || !this.shiftWindowActive` ritorna `false`.
   - Imposta `this.shiftWindowActive = false`, `this.shiftCooldown = 4.2`, `this.gear = Math.min(5, this.gear + 1)`, `this.perfectShiftsCount++`.
   - `this.addFury(1)`, `this.addUltimateCharge(25)`, `this.boostTimer = Math.max(this.boostTimer, 1.8)`, `this.speedKmh = Math.min(215, this.speedKmh + 25)`.
   - Aggiunge `350 * this.furyMultiplier` a `this.score`.
   - Mostra banner `"⚡ CAMBIATA PERFETTA IN ZONA ROSSA!"` e chiama `driveAudio.playPerfectShiftBackfire()`.
   - Ritorna `true`.
5. `hitRamp(id)` (**AC-005**):
   - Trova la rampa `obs` (`obs.type === 'ramp'`) e imposta `obs.active = false`.
   - Imposta `this.verticalVel = 4.4`, `this.airY = 0.08`, `this.boostTimer = Math.max(this.boostTimer, 1.6)`, `this.rampJumpsCount++`.
   - `this.addFury(1)`, `this.addUltimateCharge(30)`.
   - Aggiunge `500 * this.furyMultiplier` a `this.score`.
   - Se `this.armorState === 'damaged'`, ripara immediatamente (`this.armorState = 'intact'`, `this.repairProgress = 0`).
   - Mostra banner `"🦅 DECOLLO SU RAMPA! • VOLO SOPRA LO SBARRAMENTO"`, chiama `driveAudio.playRampLaunch()`.
6. `activateUltimate()` (**AC-006**):
   - Se `this.gameState !== 'playing' || this.ultimateCharge < 100` ritorna `false`.
   - Imposta `this.ultimateCharge = 0`, `this.addFury(1)`.
   - Attiva per `7.0s` il potere in `this.activePowerups[this.selectedDriver] = 7.0` (incluso `mg` con scudo + magnete + 3x punti olio) con il relativo banner e stinger audio.
   - Ritorna `true`.
7. **Scia Aerodinamica & Sorpasso Fionda (`changeLane` & `update`)** (**AC-003**):
   - In `update(dt)`: controlla se esiste una Fiat 500 attiva nella stessa corsia (`o.lane === this.targetLane && o.z > 2.2 && o.z < 18.0`); se sì, `this.isDrafting = true`, `this.draftTimer += dt`, altrimenti `this.isDrafting = false`, `this.draftTimer = Math.max(0, this.draftTimer - dt * 2)`.
   - In `changeLane(direction)`: salva `this.laneChangeTimer = 0.38` e `this.lastLaneDirection = direction`. Se `this.draftTimer >= 0.35` (o c'è l'ostacolo ravvicinato), incrementa `this.slingshotsCount++`, `this.draftTimer = 0`, `this.isDrafting = false`, `this.addFury(1)`, `this.addUltimateCharge(20)`, `this.boostTimer = Math.max(this.boostTimer, 1.4)`, aggiunge `250 * this.furyMultiplier` a `this.score` e mostra banner `"💨 SORPASSO FIONDA IN SCIA!"`.
8. **Spawner Rampe & Monete Aeree (`spawnEntityPack`)** (**AC-005**):
   - Aggiungere in `spawnEntityPack()` un pattern (probabilità ~22%) che genera una rampa (`type: 'ramp'`) in una corsia a `spawnZ`, barriere/ostacoli nelle corsie a `spawnZ + 6.5` (scavalcabili saltando con la rampa) e 4 monete aeree (`yOffset: 1.15 + Math.sin((k / 3) * Math.PI) * 0.65`) lungo la traiettoria di volo.
9. **Albo d'Oro Top 5 (`triggerCrash` & `updateLeaderboard`)** (**AC-008**):
   - In `triggerCrash()`, aggiungere la corsa corrente a `this.leaderboard`, ordinare per `score` decrescente, mantenere le prime 5 voci e salvare in `localStorage.setItem('alfetta_top5_leaderboard', JSON.stringify(this.leaderboard))`.

- [ ] **Step 3: Verificare la build**

Run: `npm run build`  
Expected: Build completata senza errori.

- [ ] **Step 4: Commit**

```bash
git add src/components/drive/driveStore.js
git commit -m "feat(gameplay): implement burnout takedowns, 2-stage armor, drafting, redline shifts, ramps, ultimate bar and top-5 leaderboard"
```

---

### Task 3: Rendering 3D Rampe, Auto Spinte Fuori Strada e Collisioni in `DriveWorld.jsx`

**Files:**
- Modify: `src/components/drive/DriveWorld.jsx`
- Satisfies: `AC-001`, `AC-002`, `AC-005`, `AC-009`

- [ ] **Step 1: Aggiornare il loop `useFrame` e le collisioni in `src/components/drive/DriveWorld.jsx`**

In `DriveWorld.jsx`:
- Animare gli ostacoli con `obs.knockedOut === true`: aggiornare `obs.knockX = (obs.knockX || laneToX(obs.lane)) + obs.vx * delta`, `obs.z += obs.vz * delta`, `obs.rotY = (obs.rotY || 0) + obs.vRot * delta`.
- Nella logica di collisione ostacoli:
  - Se `obs.type === 'ramp'` e `dz < 1.5 && dx < 0.72`: chiamare `driveStore.hitRamp(obs.id)`.
  - Se `airY > 0.45`: l'Alfetta in volo scavalca sia barriere/olio sia le Fiat 500 sottostanti!
  - Se `obs.type === 'fiat500'` e il giocatore è in fase di cambio corsia / sportellata laterale (`driveStore.laneChangeTimer > 0` oppure `Math.abs(carX - laneToX(driveStore.targetLane)) > 0.16` oppure `dx > 0.32` con `-1.45 <= obs.z <= 2.35`): chiamare `driveStore.takedownObstacle(obs.id, driveStore.lastLaneDirection || (carX > obsX ? -1 : 1))`.
  - Altrimenti, per impatto frontale senza scudo/ghost/smash attivo: chiamare `driveStore.handleFrontalImpact(obs.id)`.
- Nella raccolta monete: tenere conto di `coin.yOffset || 0` confrontandolo con `driveStore.airY` (o raccogliere generosamente se nella stessa corsia durante il salto).

- [ ] **Step 2: Aggiungere il componente 3D `StuntRamp` e l'altezza `yOffset` per le monete aeree**

In `DriveWorld.jsx`:
- Creare il componente 3D `StuntRamp` (rampa inclinata gialla/nera con strisce direzionali luminose e sponde metalliche).
- Renderizzare `<StuntRamp />` quando `obs.type === 'ramp'`.
- Renderizzare le `Fiat500Obstacle` anche mentre `obs.knockedOut === true` usando `obs.knockX` e `obs.rotY` per mostrare il volo fuori strada!
- Posizionare le monete a `elev + 0.35 + (coin.yOffset || 0)` per mostrare l'arco di Quadrifogli/Monete in quota sopra le rampe.

- [ ] **Step 3: Verificare la build**

Run: `npm run build`  
Expected: Build completata con 0 errori.

- [ ] **Step 4: Commit**

```bash
git add src/components/drive/DriveWorld.jsx
git commit -m "feat(3d): render stunt ramps, aerial coin arcs, and spinning burnout takedown physics in DriveWorld"
```

---

### Task 4: Cruscotto Interattivo (Furia, Spia SHIFT, Bottone Ultimate, Paraurti e Pagella Burnout) in `Speedometer.jsx`

**Files:**
- Modify: `src/components/drive/Speedometer.jsx`
- Satisfies: `AC-004`, `AC-006`, `AC-007`, `AC-008`, `AC-009`

- [ ] **Step 1: Sincronizzare i nuovi stati e i controlli Touch/Tastiera in `Speedometer.jsx`**

In `src/components/drive/Speedometer.jsx`:
- Leggere nel loop a 30Hz: `furyMultiplier`, `furyTimer`, `armorState`, `repairProgress`, `ultimateCharge`, `isDrafting`, `shiftWindowActive`, `takedownsCount`, `perfectShiftsCount`, `rampJumpsCount`, `slingshotsCount`, `leaderboard`.
- Aggiungere i controlli tastiera in `handleKeyDown`:
  - `ArrowUp`, `w`, `W`, ` ` (Spazio): se `driveStore.shiftWindowActive` chiama `driveStore.triggerPerfectShift()`.
  - `ArrowDown`, `s`, `S`, `e`, `E`, `Shift`: se `driveStore.ultimateCharge >= 100` chiama `driveStore.activateUltimate()`.
- Aggiungere i gesti mobile in `handleTouchEnd`:
  - **Swipe Su (`dy < -28`):** chiama `driveStore.triggerPerfectShift()`.
  - **Swipe Giù (`dy > 28`):** chiama `driveStore.activateUltimate()`.

- [ ] **Step 2: Renderizzare gli indicatori Furia, Paraurti, Spia SHIFT e Barra Ultimate nell'HUD**

In `src/components/drive/Speedometer.jsx`:
- Nella barra superiore/centrale:
  - Badge **Moltiplicatore Furia (`🔥 FURIA x{furyMultiplier}`)** con barra di mantenimento.
  - Badge **Paraurti d'Acciaio (`🛡️ INTATTO` oppure `⚠️ DANNEGGIATO • RIPARAZIONE {repairProgress}/3`)**.
  - Indicatore **`💨 IN SCIA • PRONTO ALLA FIONDA!`** quando `isDrafting` è attivo.
- Sopra/dentro il tachimetro Veglia Borletti:
  - Pulsante/Spia interattiva **`⚡ CAMBIA! / DOPPIETTA`** quando `shiftWindowActive === true` (toccando il tachimetro o il bottone esegue `driveStore.triggerPerfectShift()`).
  - Barra/Pulsante **`ULTIMATE ({Math.floor(ultimateCharge)}%)`** che pulsa ed è cliccabile quando `ultimateCharge >= 100` per lanciare `driveStore.activateUltimate()`.

- [ ] **Step 3: Aggiornare la modale Game Over con Grado Pilota, Trofei di Manche e Albo d'Oro Top 5**

Nella schermata `gameState === 'gameover'` di `Speedometer.jsx`:
- Mostrare il **Grado Ufficiale Autodelta** ottenuto (`getDriverRank(score)`).
- Mostrare la griglia dei **4 Trofei di Manche**: *Sportellate Takedown*, *Cambiate Perfette*, *Salti su Rampa*, *Sorpassi in Scia*.
- Mostrare la sezione **Albo d'Oro Top 5 Locale** (`leaderboard`) con posizione, nome pilota, grado e punteggio.

- [ ] **Step 4: Verificare la build**

Run: `npm run build`  
Expected: Build completata con 0 errori.

- [ ] **Step 5: Commit**

```bash
git add src/components/drive/Speedometer.jsx
git commit -m "feat(hud): add interactive redline shift prompt, ultimate gauge, fury multiplier, armor indicator and burnout summary"
```

---

### Task 5: Suite di Verifica Automatizzata `scripts/verify_burnout_gameplay.js`

**Files:**
- Create: `scripts/verify_burnout_gameplay.js`
- Satisfies: `AC-001` through `AC-009`

- [ ] **Step 1: Scrivere il test deterministico `scripts/verify_burnout_gameplay.js`**

Creare lo script Node.js che verifica tutti i criteri `AC-001` – `AC-009` testando direttamente la logica di `driveStore` e l'integrazione nei componenti (`DriveWorld.jsx`, `Speedometer.jsx`, `DriveAudio.js`).

- [ ] **Step 2: Eseguire entrambi gli script di verifica e la build di produzione**

Run: `node scripts/verify_burnout_gameplay.js && node scripts/verify_mobile_experience.js && npm run build`  
Expected: Tutti i test `AC-001`..`AC-009` (gameplay) e `AC-001`..`AC-013` (mobile) passano con exit code 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify_burnout_gameplay.js
git commit -m "test(gameplay): add automated verification suite for burnout arcade gameplay overhaul"
```
