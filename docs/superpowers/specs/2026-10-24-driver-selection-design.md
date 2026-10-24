# Specifica di Design: Selezione Piloti 3D Low-Poly & Easter Egg "MG Oil Chaos"

**Data**: 2026-10-24  
**Progetto**: Alfa Romeo Alfetta GTV (1973) — 3D Showroom & Arcade Drive  

---

## 1. Obiettivo
Aggiungere alla modalità **"In Corsa"** una schermata arcade di selezione del pilota con **7 personaggi giocabili**, ciascuno modellato in **3D low-poly sfaccettato (`flatShading`)** e visibile sia nella vetrina 3D di selezione sia seduto al volante dell'Alfetta GTV durante la guida. Includere inoltre l'Easter Egg dedicato a **Maria Grazia ("MG")** che riempie continuamente ogni corsia della pista di chiazze d'olio.

---

## 2. I 7 Personaggi Giocabili (`DRIVERS`)
1. **`elvis` — Elvis Presley ("The King")**
   - Estetica 3D Low-Poly: Ciuffo pompadour nero corvino con basette, occhiali da sole dorati, tuta bianca da concerto con colletto alto rialzato, scollo a V e dettagli oro.
2. **`tex` — Tex Willer ("Aquila della Notte")**
   - Estetica 3D Low-Poly: Cappello cowboy Stetson beige a tesa incurvata, fazzoletto nero al collo, camicia gialla Ranger con taschini, volto deciso.
3. **`bond` — James Bond ("Agente 007")**
   - Estetica 3D Low-Poly: Smoking nero con revers a lancia, camicia bianca, papillon nero, capelli castano scuro con riga laterale.
4. **`spiderman` — L'Uomo Ragno ("Amichevole Ragno di Quartiere")**
   - Estetica 3D Low-Poly: Maschera rossa sfaccettata con grandi lenti oculari bianche bordate di nero, ragnatele nere sul volto e tuta rosso/blu.
5. **`diabolik` — Diabolik ("Il Re del Terrore")**
   - Estetica 3D Low-Poly: Maschera e calzamaglia integrale nera con apertura a V sugli occhi di ghiaccio e sopracciglia scure a vista.
6. **`callaghan` — Ispettore Callaghan ("Clint Eastwood / Dirty Harry")**
   - Estetica 3D Low-Poly: Capelli castano-grigi pettinati all'indietro, occhiali scuri / sguardo socchiuso, giacca in tweed marrone, gilet/camicia chiara e cravatta bordeaux.
7. **`mg` — Maria Grazia ("MG — La Moglie")**
   - Estetica 3D Low-Poly (da foto di riferimento): Capelli biondo caldo/dorato a caschetto mosso fino alle spalle, occhiali cat-eye verde petrolio con lenti trasparenti, rossetto rosso-corallo, orecchini a cerchietto, collana d'oro sottile con piccoli ciondoli luminosi, blusa color bronzo/tortora.
   - **Easter Egg Gameplay**: Attiva la modalità **"MG Oil Chaos"** — ogni corsia (`-1`, `0`, `+1`) viene tappezzata continuamente di chiazze d'olio ravvicinate insieme agli ostacoli normali, facendo scodare e sbandare l'Alfetta GTV da una corsia all'altra.

---

## 3. Architettura & Componenti

### 3.1 `src/components/drive/DriverCharacter3D.jsx`
- Esporta il catalogo `DRIVERS` (metadati, colori, motti, flag Easter Egg) e il componente React Three Fiber `<DriverCharacter3D driverId={...} pose="preview" | "driving" />`.
- In `pose="preview"`: Il modello 3D ruota dolcemente sul proprio piedistallo all'interno del Canvas della schermata di selezione.
- In `pose="driving"`: Il modello 3D è posizionato sul sedile anteriore sinistro del gruppo `carRef` dell'Alfetta GTV (`[-0.145, 0.055, 0.045]` nello spazio locale dell'auto scalata), con le mani sul volante Hellebore e inclinazione dinamica della testa/busto sincronizzata con `driveStore.carRoll` e `driveStore.skidTimer`.

### 3.2 `src/components/drive/DriverSelectModal.jsx`
- Overlay arcade mostrato quando `driveStore.mode === 'drive' && driveStore.gameState === 'selecting'`.
- Contiene un `<Canvas>` 3D dedicato per la preview low-poly interattiva del pilota selezionato, la scheda descrittiva con badge speciale per MG, la griglia dei 7 piloti (navigabile via click o tastiera `←`/`→`/`Invio`) e il pulsante **"SCENDI IN PISTA"**.

### 3.3 `src/components/drive/driveStore.js`
- Nuovo stato `selectedDriver = 'elvis'` (default) e `gameState = 'selecting' | 'playing' | 'gameover'`.
- `setMode('drive')` apre la selezione pilota (`gameState = 'selecting'`, `speedKmh = 0`).
- `selectDriver(driverId)` aggiorna il pilota attivo.
- `startRaceWithDriver(driverId)` avvia la corsa (`gameState = 'playing'`).
- `openDriverSelect()` permette di cambiare pilota in qualsiasi momento dall'HUD di guida o dalla schermata di Game Over.
- In `spawnEntityPack()` / `updateSpawns()`: quando `this.selectedDriver === 'mg'`, oltre agli ostacoli standard vengono generati tappeti continui di chiazze d'olio (`type: 'oil'`) su tutte e 3 le corsie (`-1`, `0`, `+1`) ogni `6.5` unità lungo `Z` (evitando collisioni dirette con l'ingombro immediato di una Fiat 500 o barriera).
