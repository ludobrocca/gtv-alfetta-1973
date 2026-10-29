# Specifica di Design: Rimozione Banner HUD & Sistema VFX 3D Diegetico ("Show, Don't Tell")

**Data**: 2026-10-29  
**Progetto**: Alfa Romeo Alfetta GTV (1976) — 3D Showroom & Arcade Drive  
**Stato**: Approvato dal committente

---

## 1. Obiettivo & Filosofia Visiva ("Show, Don't Tell")
Eliminare completamente ogni banner testuale o riquadro rettangolare (`eventBanner` e i 7 box dei power-up attivi) che invade la visuale centrale e superiore dello schermo durante la guida ad alta velocità, sostituendoli con **effetti visivi 3D diegetici direttamente sull'Alfa Romeo Alfetta GTV e sulla pista**, affiancati da un discreto **Anello Timer Luminoso** integrato nella ghiera del tachimetro Veglia Borletti.

---

## 2. Pulizia HUD & Anello Timer sul Tachimetro (`Speedometer.jsx`)

1. **Rimozione Totale dei Box Sovrapposti alla Strada:**
   - Rimozione dal rendering di `Speedometer.jsx` di:
     - `eventBanner` (tutti i popup testuali di sportellata, scia, cambiata, salto, ecc.).
     - Tutti i 7 rettangoli impilati dei power-up (`activeTex`, `activeElvis`, `activeBond`, `activeSpiderman`, `activeDiabolik`, `activeCallaghan`, `activeMg`).
     - Il box testuale della Scia (`isDrafting`) e il box fisso della modalità MG.
2. **Anello Timer Integrato nel Tachimetro (`PowerupTimerRing`):**
   - Sulla cornice esterna del tachimetro circolare Veglia Borletti viene aggiunto un **Anello SVG Luminoso Progressivo** (`strokeDasharray` / `strokeDashoffset`).
   - Quando uno qualsiasi dei 7 power-up è attivo, l'anello si illumina col colore firma del pilota (`#e879f9` Elvis, `#fbbf24` Tex, `#fcd34d` Bond, `#f43f5e` Spider-Man, `#38bdf8` Diabolik, `#f97316` Callaghan, `#2dd4bf` MG), mostra una micro-icona sulla ghiera e si scarica fluidamente da `100%` a `0%`.
   - Negli **ultimi `1.5s`** di durata, l'anello e gli effetti 3D sull'auto lampeggiano rapidamente (effetto "warning blink" stile *Mario Kart*) per segnalare l'imminente scadenza.

---

## 3. Animazioni 3D Diegetiche dei 7 Power-Up (`CarPowerupVFX.jsx`, `CarViewer.jsx`, `DriveWorld.jsx`)

### 3.1 🎸 Elvis Presley — *Rock'n'Roll Nitro 2X* (`activePowerups.elvis > 0`)
- **Postbruciatori Fucsia/Oro:** Due coni di fiamma 3D animati che partono dai tubi di scarico posteriori dell'Alfetta.
- **Scia di Note Musicali 3D (`♪ / ♫`):** Particelle geometriche 3D a forma di nota musicale in oro e fucsia che fuoriescono dalla coda dell'auto, ondeggiano e scorrono all'indietro.
- **Scie Neon Gomme:** Doppio nastro luminoso fucsia/oro sull'asfalto dietro le ruote posteriori.

### 3.2 🕸️ Spider-Man — *Ragnatela Magnetica* (`activePowerups.spiderman > 0`)
- **Fili di Ragnatela 3D verso le Monete (`DriveWorld.jsx`):** Per ogni moneta attirata dal magnete (`0 < coin.z < 16`), un filo 3D bianco luminoso collega in tempo reale il frontale dell'Alfetta (`[carX, carY + 0.35, 0.4]`) alla posizione attuale della moneta (`[coinX, coinY, coin.z]`), mostrando visivamente la cattura!
- **Cerchio Ragnatela Radiale (`CarPowerupVFX.jsx`):** Anello geometrico rosso/blu a trama reticolare che ruota sotto l'Alfetta.

### 3.3 💎 Diabolik — *Fuga Invisibile 3X (Ghost Cloak)* (`activePowerups.diabolik > 0`)
- **Carrozzeria Fantasma Semi-Trasparente (`CarViewer.jsx`):** I materiali principali della scocca dell'Alfetta GTV vengono modulati dinamicamente a `transparent = true, opacity = 0.42` con bagliore emissivo ciano scuro (`#0284c7`), rendendo immediatamente visibile che l'auto è intangibile e può attraversare qualsiasi ostacolo. Al termine del power-up la carrozzeria torna opaca (`opacity = 1.0`).
- **Scia Fumogena Stealth (`CarPowerupVFX.jsx`):** Nubi 3D nero-ciano che avvolgono la coda.

### 3.4 🤠 Tex Willer — *Scudo Ranger Invulnerabile* (`activePowerups.tex > 0`)
- **Rostro / Scudo d'Ariete Dorato sul Muso (`CarPowerupVFX.jsx`):** Davanti alla calandra dell'Alfetta si materializza un cuneo energetico dorato a V con una **Stella da Ranger a 5 punte 3D** rotante sul frontale, progettato per speronare visivamente il traffico.

### 3.5 🔫 Ispettore Callaghan — *.44 Magnum Auto-Blast* (`activePowerups.callaghan > 0`)
- **Mirino Laser & Tracciante .44 Magnum (`CarPowerupVFX.jsx`):** Dal finestrino lato guida proietta in avanti un raggio laser rosso/ambra lungo la corsia; ogni volta che un ostacolo viene abbattuto (`magnumShotTimer > 0` in `driveStore`), si accende un **lampo di volata (muzzle flash) arancione** e un **tracciante balistico luminoso** verso il bersaglio!

### 3.6 🍸 James Bond 007 — *Q-Branch (Scudo + Turbo + Calamita)* (`activePowerups.bond > 0`)
- **Gadget Multi-Effetto Q-Branch (`CarPowerupVFX.jsx`):**
  - Fiammate postbruciatore **blu ghiaccio** dagli scarichi posteriori.
  - **Impulsi Radar Dorati Concentrici** che si espandono a terra per l'effetto calamita.
  - Scudo deflettente ottagonale argento/oro attorno alla scocca.

### 3.7 👑 MG (Maria Grazia) — *Regina dell'Olio Overdrive* (`activePowerups.mg > 0` o drift sull'olio)
- **Corona Reale d'Oro 3D sul Tetto (`CarPowerupVFX.jsx`):** Una corona dorata 3D con punte e gemme turchesi fluttua e ruota sopra il tetto dell'Alfetta, mentre dalle ruote scaturiscono scintille smeraldo/oro a ogni passaggio sull'olio.

---

## 4. VFX 3D degli Stati Meccanici di Guida (`CarPowerupVFX.jsx` & `driveStore.js`)

1. **⚠️ Fumo e Scintille dal Cofano (`armorState === 'damaged'`):**
   - Dalla fessura del cofano anteriore escono sbuffi continui di fumo grigio/nero 3D e fiammelle arancioni spinti all'indietro dalla velocità.
   - **Onda di Riparazione (`repairFlashTimer > 0`):** Alla riparazione del paraurti, un anello luminoso verde smeraldo scansiona la vettura facendo sparire il fumo.
2. **💨 Filetti del Vento in Scia (`isDrafting === true`):**
   - Nastri aerodinamici bianchi/azzurri scorrono lungo i fianchi e sopra il tetto dell'Alfetta mentre è in scia dietro una Fiat 500.
3. **⚡ Fiammata Doppietta in Zona Rossa (`shiftFlashTimer > 0`):**
   - Al momento di `triggerPerfectShift()`, lo scarico posteriore emette per `0.45s` un dardo di fuoco arancione/azzurro e un anello d'urto.
4. **💥 Esplosione Scintille da Sportellata (`takedownSparkTimer > 0`):**
   - Al momento di `takedownObstacle()`, dalla fiancata d'impatto (`takedownSparkSide`) esplode una raggera di scintille metalliche 3D giallo/oro.
