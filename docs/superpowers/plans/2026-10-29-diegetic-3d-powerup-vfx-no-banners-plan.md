# Rimozione Banner HUD & Sistema VFX 3D Diegetico ("Show, Don't Tell") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. It will decide whether each batch should run in parallel or serial subagent mode and will pass only task-local context to each subagent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rimuovere completamente tutti i banner testuali e i box rettangolari dei power-up dall'HUD di guida in `Speedometer.jsx` per liberare l'orizzonte stradale, sostituendoli con un Anello Timer SVG integrato nella ghiera del tachimetro Veglia Borletti e un sistema completo di effetti visivi 3D diegetici (`<CarPowerupVFX />`, Ghost Cloak su `CarViewer.jsx` e ragnatele dinamiche in `DriveWorld.jsx`) per tutti i 7 piloti e i 4 stati meccanici di guida.

**Architecture:** Aggiunta di timer VFX reattivi a 60fps in `driveStore.js` (`shiftFlashTimer`, `takedownSparkTimer`, `takedownSparkSide`, `repairFlashTimer`, `magnumShotTimer`). Creazione del componente modulare `src/components/drive/CarPowerupVFX.jsx` montato dentro `carDriveGroupRef` in `src/components/CarViewer.jsx` (più modulazione dell'opacità carrozzeria per Diabolik), fili 3D di ragnatela verso le monete in `src/components/drive/DriveWorld.jsx`, e pulizia radicale di `src/components/drive/Speedometer.jsx` con aggiunta di `PowerupTimerRing`.

**Tech Stack:** React 18, Three.js, @react-three/fiber, Lucide React, SVG, Tailwind CSS, Vite.

---

### Task 1: Timer VFX in `driveStore.js` & Rimozione Banner HUD + Anello Timer SVG in `Speedometer.jsx`

**Files:**
- Modify: `src/components/drive/driveStore.js`
- Modify: `src/components/drive/Speedometer.jsx`
- Satisfies: `AC-001`, `AC-002`, `AC-006`

- [ ] **Step 1: Aggiungere i timer VFX in `src/components/drive/driveStore.js`**

In `src/components/drive/driveStore.js`:
- Aggiungere nel costruttore e in `resetGame()`:
  - `this.shiftFlashTimer = 0;`
  - `this.takedownSparkTimer = 0;`
  - `this.takedownSparkSide = 1;`
  - `this.repairFlashTimer = 0;`
  - `this.magnumShotTimer = 0;`
  - `this.magnumTargetZ = 10;`
- Attivare i timer nei rispettivi metodi:
  - In `triggerPerfectShift()`: `this.shiftFlashTimer = 0.55;`
  - In `takedownObstacle(id, direction)`: `this.takedownSparkTimer = 0.50; this.takedownSparkSide = direction || 1;` e quando `this.repairProgress >= 3` impostare `this.repairFlashTimer = 0.85;`
  - In `hitRamp(id)`: se `wasDamaged`, impostare `this.repairFlashTimer = 0.85;`
  - In `smashObstacle(id, reason)`: se `reason === 'magnum'`, impostare `this.magnumShotTimer = 0.35; this.magnumTargetZ = obs.z || 10;`
- In `update(delta)`: decrementare `shiftFlashTimer`, `takedownSparkTimer`, `repairFlashTimer`, `magnumShotTimer` di `dt` fino a `0`.

- [ ] **Step 2: Rimuovere tutti i banner e i box power-up da `src/components/drive/Speedometer.jsx` e aggiungere l'Anello Timer SVG**

In `src/components/drive/Speedometer.jsx`:
- **Rimuovere dal JSX** l'intero blocco centrale che renderizzava `eventBanner`, il box `isDrafting`, il box `selectedDriver === 'mg'`, e tutti i 7 box rettangolari `activeTex`, `activeElvis`, `activeBond`, `activeSpiderman`, `activeDiabolik`, `activeCallaghan`, `activeMg` (**AC-001**).
- Nel tachimetro circolare Veglia Borletti (**AC-002**):
  - Determinare il power-up attivo prioritario (tra `elvis`, `tex`, `bond`, `spiderman`, `diabolik`, `callaghan`, `mg`) con il suo tempo residuo `activePowerupTime`, durata massima (`7.0s`), colore dedicato e icona.
  - Renderizzare un anello SVG circolare esterno (`PowerupTimerRing`) attorno al quadrante del Veglia Borletti con `strokeDasharray` e `strokeDashoffset` proporzionali a `activePowerupTime / 7.0`, che lampeggia (`animate-ping` / blink rapido) quando `activePowerupTime > 0 && activePowerupTime <= 1.5`.

- [ ] **Step 3: Verificare la build**

Run: `npm run build`  
Expected: Build completata con 0 errori.

- [ ] **Step 4: Commit**

```bash
git add src/components/drive/driveStore.js src/components/drive/Speedometer.jsx
git commit -m "feat(hud): remove road-blocking HUD banners and add diegetic Veglia Borletti power-up timer ring"
```

---

### Task 2: Componente `<CarPowerupVFX />` & Ghost Cloak Diabolik in `CarViewer.jsx`

**Files:**
- Create: `src/components/drive/CarPowerupVFX.jsx`
- Modify: `src/components/CarViewer.jsx`
- Satisfies: `AC-003`, `AC-004`, `AC-005`, `AC-006`

- [ ] **Step 1: Creare `src/components/drive/CarPowerupVFX.jsx` con tutti i 7 Power-Up e i 4 Stati Meccanici**

Creare `src/components/drive/CarPowerupVFX.jsx` che nel loop `useFrame` legge `driveStore` e anima (con effetto lampeggio rapido negli ultimi `1.5s` di durata):
1. **🎸 Elvis (`elvis > 0`):**
   - Doppi coni di fiamma postbruciatore fucsia/oro dagli scarichi posteriori (`z = -1.05`).
   - **Scia di 6 Note Musicali 3D (`♪ / ♫`)** in oro e fucsia che nascono dietro la coda, salgono ondeggiando e scorrono indietro.
   - Doppio nastro neon fucsia/oro sull'asfalto dietro le gomme posteriori.
2. **🤠 Tex Willer (`tex > 0`):**
   - **Rostro / Cuneo Energetico Dorato a V** davanti al paraurti anteriore (`z = +1.05`) con una **Stella da Ranger 3D a 5 punte** rotante.
3. **🍸 James Bond 007 (`bond > 0`):**
   - Postbruciatori **blu ghiaccio** dagli scarichi posteriori + **anelli radar dorati concentrici** che si espandono a terra + barriera ottagonale argento/oro.
4. **🕸️ Spider-Man (`spiderman > 0`):**
   - Anello geometrico a ragnatela rosso/blu rotante sotto l'auto e nodi lanciaragnatele luminosi sul frontale.
5. **💎 Diabolik (`diabolik > 0`):**
   - Scia fumogena stealth nero/ciano dietro la coda + bagliore sugli occhi/parabrezza.
6. **🔫 Callaghan (`callaghan > 0`):**
   - **Mirino Laser Rosso/Ambra** proiettato in avanti lungo la corsia dal lato guida + **Muzzle Flash 3D arancione e Tracciante Balistico** quando `driveStore.magnumShotTimer > 0` fino a `driveStore.magnumTargetZ`.
7. **👑 MG (`mg > 0` o `selectedDriver === 'mg'` durante `skidTimer > 0`):**
   - **Corona Reale d'Oro 3D a punte con gemme turchesi** che fluttua e ruota sopra il tetto dell'Alfetta (`y = 0.88`) + scintille smeraldo/oro sulle ruote.
8. **Stati Meccanici di Guida (`AC-006`):**
   - **Fumo & Scintille dal Cofano (`armorState === 'damaged'`):** Sbuffi ciclici di fumo grigio scuro 3D e fiammelle arancioni che escono dal cofano anteriore e scorrono indietro.
   - **Onda di Riparazione (`repairFlashTimer > 0`):** Anello energetico verde smeraldo/oro che scansiona l'auto da davanti a dietro.
   - **Filetti del Vento in Scia (`isDrafting === true`):** 4 nastri aerodinamici bianchi/ciano lungo le fiancate e sopra il tetto.
   - **Fiammata Doppietta (`shiftFlashTimer > 0`):** Dardo di fuoco arancione/azzurro dallo scarico posteriore + anello d'urto.
   - **Scintille da Sportellata (`takedownSparkTimer > 0`):** Esplosione di scintille 3D giallo/oro sul lato `takedownSparkSide`.

- [ ] **Step 2: Montare `<CarPowerupVFX />` e implementare il Ghost Cloak di Diabolik in `src/components/CarViewer.jsx`**

In `src/components/CarViewer.jsx`:
- Importare `CarPowerupVFX` da `./drive/CarPowerupVFX.jsx` e montarlo dentro `<group ref={carDriveGroupRef}>` quando `sceneMode === 'drive'`.
- Nel `useFrame` di `AlfaRomeoModel` (quando `sceneMode === 'drive'`):
  - Controllare `const isDiabolikGhost = driveStore.activePowerups.diabolik > 0;`
  - Se `isDiabolikGhost` è attivo (con blink negli ultimi `1.5s`), impostare sul materiale della carrozzeria (`paintMaterialRef` / mesh scocca) `transparent = true`, `opacity = 0.42` e leggero `emissive` ciano (`#0284c7`); quando non è attivo, ripristinare `opacity = 1.0`, `transparent = false` (**AC-005**).

- [ ] **Step 3: Verificare la build**

Run: `npm run build`  
Expected: Build completata con 0 errori.

- [ ] **Step 4: Commit**

```bash
git add src/components/drive/CarPowerupVFX.jsx src/components/CarViewer.jsx
git commit -m "feat(vfx): add CarPowerupVFX 3D animations for all 7 drivers, Diabolik ghost cloak and mechanical states"
```

---

### Task 3: Fili di Ragnatela 3D di Spider-Man verso le Monete in `DriveWorld.jsx`

**Files:**
- Modify: `src/components/drive/DriveWorld.jsx`
- Satisfies: `AC-004`

- [ ] **Step 1: Aggiungere il rendering dei fili di ragnatela 3D (`SpiderWebTethers`) in `src/components/drive/DriveWorld.jsx`**

In `src/components/drive/DriveWorld.jsx`:
- Quando `driveStore.activePowerups.spiderman > 0` (o `driveStore.activePowerups.bond > 0`), per ogni moneta attiva nel raggio del magnete (`coin.active && coin.z > -0.5 && coin.z < 16.0`), renderizzare un filo teso 3D (`<SpiderWebTether />`) che collega il muso dell'Alfetta (`[driveStore.carX, driveStore.carY + driveStore.airY + 0.35, 0.4]`) alla posizione attuale della moneta (`[coinX, coinY + 0.36 + (coin.yOffset || 0), coin.z]`), mostrando le ragnatele bianche/rosse che arpionano e trascinano fisicamente le monete verso l'auto!

- [ ] **Step 2: Verificare la build**

Run: `npm run build`  
Expected: Build completata con 0 errori.

- [ ] **Step 3: Commit**

```bash
git add src/components/drive/DriveWorld.jsx
git commit -m "feat(vfx): render dynamic 3D spider-web tethers pulling coins to the car in DriveWorld"
```

---

### Task 4: Suite di Verifica Automatizzata `scripts/verify_diegetic_vfx.js` & Aggiornamento Test

**Files:**
- Create: `scripts/verify_diegetic_vfx.js`
- Modify: `scripts/verify_burnout_gameplay.js`
- Satisfies: `AC-001` through `AC-006`

- [ ] **Step 1: Scrivere `scripts/verify_diegetic_vfx.js` e aggiornare eventuali asserzioni in `scripts/verify_burnout_gameplay.js`**

Creare `scripts/verify_diegetic_vfx.js` per testare deterministicamente `AC-001` – `AC-006`:
1. `AC-001`: Verifica che `Speedometer.jsx` non contenga più il rendering JSX di `eventBanner.title` / `eventBanner.subtitle` né la lista dei 7 rettangoli testuali dei power-up.
2. `AC-002`: Verifica che `Speedometer.jsx` contenga l'anello timer SVG (`strokeDasharray`, `strokeDashoffset`) sul tachimetro e la logica di warning blink `<= 1.5`.
3. `AC-003`: Verifica che `CarPowerupVFX.jsx` sia montato in `CarViewer.jsx` e implementi le geometrie e animazioni per `elvis` (note musicali + postbruciatori), `tex` (rostro + stella), `bond` (radar + postbruciatori) e `mg` (corona 3D).
4. `AC-004`: Verifica che `DriveWorld.jsx` renderizzi `SpiderWebTether` verso le monete attirate e `CarPowerupVFX.jsx` renderizzi il laser e tracciante `.44 Magnum` (`magnumShotTimer`).
5. `AC-005`: Verifica che `CarViewer.jsx` moduli l'opacità della carrozzeria (`0.42` / `transparent`) quando `activePowerups.diabolik > 0`.
6. `AC-006`: Verifica su `driveStore` che `triggerPerfectShift()`, `takedownObstacle()`, `hitRamp()` e `smashObstacle(..., 'magnum')` attivino rispettivamente `shiftFlashTimer > 0`, `takedownSparkTimer > 0`, `repairFlashTimer > 0` e `magnumShotTimer > 0`, e che `CarPowerupVFX.jsx` renderizzi fumo cofano (`armorState === 'damaged'`), onda riparazione, filetti vento (`isDrafting`), fiammata scarico e scintille.

- [ ] **Step 2: Eseguire tutte le suite di verifica e la build Vite**

Run: `node scripts/verify_diegetic_vfx.js && node scripts/verify_burnout_gameplay.js && node scripts/verify_mobile_experience.js && npm run build`  
Expected: Tutti i test passano al 100% con exit code 0.

- [ ] **Step 3: Commit**

```bash
git add scripts/verify_diegetic_vfx.js scripts/verify_burnout_gameplay.js
git commit -m "test(vfx): add automated verification suite for diegetic 3d powerup vfx and banner-free hud"
```
