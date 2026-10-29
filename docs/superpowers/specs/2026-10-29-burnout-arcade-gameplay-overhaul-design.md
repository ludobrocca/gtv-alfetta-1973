# Specifica di Design: Overhaul Gameplay Arcade "Burnout x Bialbero" (Sportellate, Scia, Cambio in Zona Rossa, Rampe & Ultimate)

**Data**: 2026-10-29  
**Progetto**: Alfa Romeo Alfetta GTV (1976) — 3D Showroom & Arcade Drive  
**Stato**: Approvato dal committente

---

## 1. Obiettivo & Visione di Game Design
Trasformare la modalità **"In Corsa"** da semplice endless runner passivo a un **arcade di guida ad altissima assuefazione** ispirato a *Burnout*, *OutRun 2* e *Subway Surfers*, mantenendo il realismo visivo e fisico dell'Alfa Romeo Alfetta GTV (1976).

Il nuovo loop di gioco premia l'aggressività calcolata, il tempismo meccanico sul cambio a 5 marce Transaxle e la spettacolarità acrobatica attraverso **5 pilastri interconnessi**:
1. **Sportellate Takedown (Fisica Burnout Laterale)** + **Sistema di Sopravvivenza "Paraurti d'Acciaio" a 2 Stadi con Auto-Riparazione**.
2. **Scia Aerodinamica (Slipstream Slingshot)** + **Cambiata Perfetta in Zona Rossa (Redline Shift Mastery)**.
3. **Rampe di Lancio Stradali & Scavalcamento Posti di Blocco con Jackpot Aereo**.
4. **Barra "Ultimate del Pilota" (0–100%) Caricabile e Attivabile a Comando**.
5. **Moltiplicatore "Furia Bialbero" (x1 → x10), Pagella Trofei, Gradi Autodelta e Albo d'Oro Locale Top 5**.

---

## 2. Meccaniche di Gioco Dettagliate

### 2.1 Fisica "Burnout": Sportellate Takedown & Sistema "Paraurti d'Acciaio"
- **Distinzione tra Sportellata Laterale e Tamponamento Frontale:**
  - **Sportellata Takedown (`takedownObstacle`):** Quando il giocatore cambia corsia (`changeLane`) o sta traslando lateralmente (`|carX - laneToX(targetLane)| > 0.15` o entro `0.38s` dall'ultimo cambio corsia) ed entra in contatto con un veicolo del traffico (`type === 'fiat500'`) mentre si trova nella finestra di affiancamento (`-1.45 <= obs.z <= 2.35`), l'urto è classificato come **Sportellata Laterale**.
    - L'auto avversaria **non ferma l'Alfetta**: passa in stato `knockedOut = true` con vettore di espulsione laterale (`vx = knockDir * 11.0`, `vz = 8.0`, `vRotY = knockDir * 9.5`) volando fuori carreggiata in testacoda.
    - **Ricompensa:** `+300 PT * furyMultiplier`, `+35%` Barra Ultimate, `+1` a `takedownsCount`, incremento del Moltiplicatore Furia (`+1` fino a `x10`), micro-boost di velocità e riparazione progressiva del paraurti (`repairProgress + 1`).
  - **Tamponamento Frontale & Sistema "Paraurti d'Acciaio" (`armorState: 'intact' | 'damaged'`):**
    - All'inizio della corsa `armorState = 'intact'` e `repairProgress = 0`.
    - Se l'Alfetta colpisce frontalmente un'auto o una barriera senza scudo/ghost/smash attivo:
      - **Se `armorState === 'intact'`:** Il giocatore **sopravvive**! L'ostacolo viene distrutto nell'impatto, `armorState` diventa `'damaged'`, `repairProgress = 0`, `furyMultiplier` scende a `1`, la velocità subisce un rallentamento temporaneo del 25% e compare l'avviso `"⚠️ PARAURTI DANNEGGIATO • 3 SPORTELLATE O 1 RAMPA PER RIPARARE!"` con effetto fumo dal cofano.
      - **Auto-Riparazione:** Mentre `armorState === 'damaged'`, eseguire **3 Sportellate** (`repairProgress >= 3`) oppure prendere **1 Rampa di Lancio** riporta `armorState = 'intact'` con banner `"🔧 MECCANICA ALFA RIPRISTINATA!"`.
      - **Se `armorState === 'damaged'`:** Un secondo tamponamento frontale innesca il **Game Over** (`triggerCrash()`).

### 2.2 Guida Tecnica: Scia Aerodinamica (Drafting) & "Cambiata Perfetta" in Zona Rossa
- **Scia Aerodinamica & Sorpasso Fionda ("Slipstream Slingshot"):**
  - Quando l'Alfetta si trova nella **stessa corsia** dietro a una Fiat 500 attiva entro `2.4 < obs.z < 18.0`, entra in scia (`isDrafting = true`) e incrementa `draftTimer += dt`.
  - Mentre è in scia, l'accelerazione aumenta del 20% e le linee di velocità diventano più intense.
  - Se il giocatore cambia corsia dopo aver accumulato `draftTimer >= 0.35s` (o scarta a meno di `9.5m` dall'auto), innesca il **Sorpasso Fionda (Slingshot)**:
    - Spinta turbo immediata (`boostTimer = 1.4s`, `+26 km/h`), `+250 PT * furyMultiplier`, `+20%` Carica Ultimate, `+1` a `slingshotsCount` e `+1` al Moltiplicatore Furia.
- **"Cambiata Perfetta" in Zona Rossa (Redline Shift Mastery):**
  - Mentre il motore Bialbero sale di giri nelle marce (1ª → 5ª) o durante le fasi di accelerazione/scia, quando `rpm >= 5450` (o tramite finestra ciclica di tirata marcia ogni volta che il motore spinge ad alti giri e `shiftCooldown <= 0`), si attiva **`shiftWindowActive = true`**.
  - **Feedback HUD:** Sul tachimetro Veglia Borletti compare il pulsante/spia lampeggiante **"⚡ CAMBIA! / DOPPIETTA"**.
  - **Input Giocatore:** Toccando il tachimetro centrale, facendo **Swipe Su** su mobile, o premendo **`Spazio` / `Freccia Su` / `W`** su tastiera mentre `shiftWindowActive === true`:
    - Scatta `triggerPerfectShift()`: scoppio marmitta Bialbero, innesto marcia superiore (o Overdrive in 5ª marcia), **Boost +25 km/h** per `1.8s`, `+350 PT * furyMultiplier`, `+25%` Carica Ultimate, `+1` a `perfectShiftsCount` e `+1` al Moltiplicatore Furia!
    - Se il giocatore non preme nulla, l'auto continua a cambiare marcia automaticamente senza mai bloccare la guida.

### 2.3 Verticalità & Spettacolo: Rampe Stradali, Posti di Blocco e Barra "Ultimate" Caricabile
- **Rampe di Lancio Stradali (`type: 'ramp'`) & Sbarramenti:**
  - Lo spawner genera periodicamente un **Sbarramento Cantiere** con una **Rampa Gialla/Nera da Cantiere (`type: 'ramp'`)** posizionata davanti a barriere/ostacoli e accompagnata da una scia parabolica di **4 Monete/Quadrifogli Aerei (`yOffset > 1.0`)**.
  - Imboccando la rampa (`dz < 1.5 && dx < 0.72`), l'Alfetta decolla (`verticalVel = 4.3`, `airY` sale oltre `1.6m`), scavalcando in volo gli ostacoli sottostanti!
  - **Ricompensa Rampa:** `+500 PT * furyMultiplier`, `+30%` Carica Ultimate, `+1` a `rampJumpsCount`, `+1` al Moltiplicatore Furia e **riparazione istantanea del Paraurti d'Acciaio** (`armorState = 'intact'`).
- **Barra "Ultimate del Pilota" Caricabile (`ultimateCharge: 0 → 100`):**
  - Ricarica tramite azioni: Sportellata (`+35%`), Rampa (`+30%`), Cambiata Perfetta (`+25%`), Sorpasso Fionda (`+20%`), Moneta (`+3%`).
  - Quando `ultimateCharge >= 100`, si illumina il pulsante **ULTIMATE PRONTA!** nell'HUD (attivabile anche con **Swipe Giù** o tasto **`E` / `Shift`**).
  - Attivando `activateUltimate()` (`ultimateCharge` torna a `0`):
    - Attiva per `7.0s` il potere speciale del pilota selezionato (`elvis`, `tex`, `bond`, `spiderman`, `diabolik`, `callaghan`, e per `mg` attiva l'inedita Ultimate **"REGINA DELL'OLIO OVERDRIVE"** che conferisce scudo dorato, calamita monete e punti tripli su ogni chiazza d'olio!).

### 2.4 Loop di Assuefazione: Moltiplicatore Furia (x1–x10), Gradi Autodelta & Albo d'Oro Top 5
- **Moltiplicatore "Furia Bialbero" (`furyMultiplier: 1 → 10`):**
  - Parte da `1`. Ogni acrobazia incrementa `furyMultiplier = Math.min(10, furyMultiplier + 1)` e riporta `furyTimer = 7.5s`.
  - Se `furyTimer` scade senza nuove acrobazie, scala di 1 livello (`furyMultiplier = Math.max(1, furyMultiplier - 1)`) e riparte a `4.0s`.
  - Un tamponamento frontale azzera `furyMultiplier = 1`.
- **Grado Pilota & Pagella Trofei a Fine Corsa:**
  - Calcolo deterministico del Grado (`getDriverRank(score)`):
    - `< 5.000`: `"Turista di Abano"`
    - `5.000 – 14.999`: `"Amante del Bialbero"`
    - `15.000 – 34.999`: `"Pilota Corsie Veloci"`
    - `35.000 – 69.999`: `"Collaudatore Autodelta"`
    - `>= 70.000`: `"Leggenda del Quadrifoglio"`
  - Esposizione nella modale Game Over dei 4 contatori: *Sportellate Takedown*, *Cambiate Perfette*, *Salti su Rampa*, *Sorpassi in Scia*.
- **Albo d'Oro Locale Top 5 (`leaderboard` in `localStorage`):**
  - Chiave `alfetta_top5_leaderboard`: array ordinato per punteggio decrescente (max 5 voci) con `{ score, distance, driverId, rankTitle, date }`.
  - Visualizzato nella schermata di Fine Corsa per stimolare il replay immediato con tutti i 7 piloti.

---

## 3. Architettura & File Coinvolti

1. **`src/components/drive/driveStore.js`:**
   - Nuove proprietà di stato: `armorState`, `repairProgress`, `furyMultiplier`, `furyTimer`, `ultimateCharge`, `isDrafting`, `draftTimer`, `shiftWindowActive`, `shiftCooldown`, `takedownsCount`, `perfectShiftsCount`, `rampJumpsCount`, `slingshotsCount`, `leaderboard`.
   - Nuovi metodi: `takedownObstacle(id, direction)`, `triggerPerfectShift()`, `activateUltimate()`, `hitRamp(id)`, `getDriverRank(score)`, `updateLeaderboard()`.
   - Aggiornamento `spawnEntityPack()` per generare anche sequenze con `type: 'ramp'` + sbarramento + monete aeree (`yOffset`).
2. **`src/components/drive/DriveWorld.jsx`:**
   - Rilevamento collisioni aggiornato:
     - Se `obs.type === 'ramp'` -> chiama `driveStore.hitRamp(obs.id)`.
     - Se `obs.type === 'fiat500'` e il giocatore è in fase di sportellata laterale -> chiama `driveStore.takedownObstacle(obs.id, laneDelta)`.
     - Animazione fisica 3D delle Fiat 500 abbattute (`obs.knockedOut`) che volano lateralmente e ruotano.
   - Rendering 3D procedurale della **Rampa Gialla/Nera da Cantiere** con strisce di segnalazione e delle monete aeree (`coin.yOffset`).
   - Effetto visivo quando `armorState === 'damaged'`.
3. **`src/components/drive/Speedometer.jsx`:**
   - **HUD Superiore / Centrale:** Badge **Moltiplicatore Furia (`FURIA xN`)** con barra timer, indicatore stato **Paraurti d'Acciaio** (`INTATTO` / `DANNEGGIATO + tacche riparazione`), indicatore **SCIA ATTIVA**.
   - **Tachimetro Veglia Borletti Interattivo & Controlli:**
     - Spia/pulsante **"⚡ CAMBIA! (SHIFT)"** cliccabile/toccabile quando `shiftWindowActive` è vero.
     - Pulsante **Barra Ultimate (0–100%)** con icona del pilota attivo, cliccabile/toccabile quando al 100%.
     - Supporto gesture mobile **Swipe Su** (Cambiata Perfetta) e **Swipe Giù** (Attiva Ultimate), oltre a `Spazio`/`W`/`Freccia Su` e `E`/`Shift`/`Freccia Giù` da tastiera.
   - **Schermata Game Over Ridisegnata:** Grado Pilota ottenuto, griglia dei 4 Trofei di Manche (*Sportellate, Cambiate, Rampe, Scie*) e **Albo d'Oro Top 5** con badge del pilota.
4. **`src/components/drive/DriveAudio.js`:**
   - Effetti sonori dedicati per Sportellata Takedown, Cambiata Perfetta con scoppio marmitta, Decollo Rampa e Riparazione Meccanica.
