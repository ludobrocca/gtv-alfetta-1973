# Design Spec — Ultimate del Pilota al centro + Takedown Cam

**Data:** 2026-10-30 · **Branch:** `feat/pilot-ultimates-focus`

## Obiettivi (richiesta utente)
1. Eliminare la "sfera" che avvolge l'auto con Tex/Bond/Diabolik: su mobile copre tutta la visuale.
2. Togliere i power-up raccoglibili dal percorso: l'unico modo di ottenere un potere è l'**Ultimate del pilota scelto** → la scelta del personaggio conta.
3. Tasto Ultimate = **grande bottone rosso a fungo** stile cruscotto anni '70, che si illumina mentre si carica e "esplode" di luce quando è pronto.
4. Barra Ultimate più lenta; mai carica durante un'Ultimate attiva (oggi ad alta velocità torna al 100% mentre l'Ultimate è ancora attiva).
5. **Takedown Cam**: 5 sportellate consecutive senza subire danni → zoom cinematografico sull'auto abbattuta + slow-motion + grosso bonus punti.

## A. Store (`src/components/drive/driveStore.js`)

### A1. Niente power-up sul percorso
- In `spawnEntityPack()` il ramo "Driver-Themed Power-up" deve generare invece un pacchetto di monete (o un Fiat 500 da sportellare). `this.powerups` resta sempre `[]` (manteniamo l'array e `collectPowerup()` per compatibilità, ma non viene più popolato).

### A2. Carica Ultimate più lenta
Nuove costanti esportate:
```js
export const ULT_GAIN = {
  takedown: 12, perfectShift: 8, goodShift: 3, ramp: 10,
  slingshot: 6, nearMiss: 6, closePass: 5, coin: 1, smash: 4, mgOil: 5,
};
export const ULTIMATE_DURATION = 7.0;
```
- Sostituire tutti i valori hardcoded di `addUltimateCharge(...)` con `ULT_GAIN.*`.
- Aggiungere getter `isUltimateActive()` → `true` se `this.ultimateTimer > 0`.
- `activateUltimate()` imposta `this.ultimateTimer = ULTIMATE_DURATION` (oltre ai power-up del pilota già esistenti, usando `ULTIMATE_DURATION` al posto di `7.0`).
- `addUltimateCharge()` **non fa nulla** se `isUltimateActive()`.
- `update()` decrementa `ultimateTimer`; `resetGame()`/`triggerCrash()` lo azzerano.

### A3. Takedown Streak + Takedown Cam
Nuove costanti: `TAKEDOWN_STREAK_TARGET = 5`, `TAKEDOWN_CAM_DURATION = 1.6` (secondi reali), `TAKEDOWN_CAM_TIMESCALE = 0.3`, `TAKEDOWN_SURGE_POINTS = 2500`.
Nuovo stato: `takedownStreak`, `takedownCamTimer`, `takedownCamTarget` (`{ id, side }` o `null`), `timeScale` (1 normale), `takedownSurge` (`{ points, timer }` o `null`), `takedownCamsCount`.
- `takedownObstacle()`: `takedownStreak++`. Quando `takedownStreak % TAKEDOWN_STREAK_TARGET === 0`: `takedownCamTimer = TAKEDOWN_CAM_DURATION`, `takedownCamTarget = { id, side: direction }`, punti extra `TAKEDOWN_SURGE_POINTS * furyMultiplier`, `takedownSurge = { points, timer: 2.2 }`, `takedownCamsCount++`, furia +2, `driveAudio.playTakedownSlam()` (se esiste un SFX più enfatico usarlo).
- `handleFrontalImpact()` (ramo damaged) e `triggerCrash()`: `takedownStreak = 0`.
- `update(delta)`: all'inizio calcolare `realDt = min(delta,0.1)`; se `takedownCamTimer > 0` → decrementarlo con `realDt`, `timeScale = TAKEDOWN_CAM_TIMESCALE`, altrimenti `timeScale = 1`. Tutta la simulazione usa `dt = realDt * timeScale`. `takedownSurge.timer` decrementa con `realDt`.
- `resetGame()` azzera tutto.

## B. Visual / UI

### B1. Sfera rimossa + VFX mobile-safe
- `CarViewer.jsx`: eliminare la mesh `texShieldRef` (sfera wireframe r=1.52) e la sua logica. Lo scudo di Tex/Bond diventa un sottile **contorno dorato aderente alla carrozzeria**: emissive dorato tenue su `CarPaint`/`CarPaintRear` (stessa tecnica del Ghost Cloak di Diabolik, `emissiveIntensity ≈ 0.25`), niente geometria aggiuntiva.
- `CarPowerupVFX.jsx`: nessun effetto deve stare tra la camera (z≈-3.5, y≈1.4) e l'auto né superare la sagoma dell'auto di molto. In particolare: fumo Diabolik (oggi sfere a z=-1.2 scalate) → piccolo e basso (y≤0.25, scale ≤0.25, opacità ≤0.25) dietro alle ruote; anelli radar Bond/ragnatela Spider-Man raggio ≤1.0 e opacità ≤0.35, orizzontali a terra; nessuna sfera grande. Verificare a aspect ratio mobile (9:19.5).

### B2. Power-up rimossi dal mondo
- `DriveWorld.jsx`: rimuovere il rendering e la collisione dei power-up (array sempre vuoto, ma il codice morto va tolto).
- Knockout physics delle auto sportellate: moltiplicare `delta` per `driveStore.timeScale` (slow-mo coerente).

### B3. Bottone Ultimate rosso (`Speedometer.jsx` → nuovo `src/components/drive/UltimateButton.jsx`)
Props: `{ charge, active, activeTime, driver, onActivate }`.
- Bottone circolare tipo "fungo" da cruscotto (≈64–72px), ghiera cromata (gradiente zinc), cupola rossa (`radial-gradient` da `#ff4d4d` a `#7f0000`) con riflesso speculare in alto.
- Carica 0–99%: cupola rosso scuro, un anello SVG attorno alla ghiera si riempie in senso orario (oro→rosso) col %; icona badge pilota al centro; % piccolo sotto.
- 100%: cupola rosso vivo con glow pulsante (`box-shadow` rosso multiplo + keyframe `ult-ready-glow`), scritta "ULTI" incisa, piccolo hint "TOCCA / ↓".
- Attiva: cupola si "preme" (scale 0.94, inset shadow), anello mostra il tempo residuo che si svuota, colore del pilota.
- Mantiene `aria-label`, `active:scale-90`, `pointer-events-auto`. Sostituisce l'attuale barra/bottone ultimate testuale. Layout: accanto alla `AlfaGearboxConsole` (console flex-1 + bottone a destra) anche su mobile, così resta nella thumb zone.

### B4. Takedown Cam (`DriveCameraDirector.jsx`)
- Se `driveStore.takedownCamTimer > 0` e il target esiste in `driveStore.obstacles`: camera si avvicina lateralmente all'auto abbattuta (posizione ≈ target + (side*2.2, 1.1, -1.6)), `lookAt` sull'auto abbattuta, FOV 38 (zoom), lerp rapido. Al termine torna alla chase cam con il lerp normale.
- HUD: durante `takedownSurge` mostrare vicino al punteggio (top bar, non al centro dello schermo) un chip "💥 TAKEDOWN x5 +N PT" che pulsa; nella top bar mostrare anche lo streak corrente come 5 piccoli pallini (riempiti = sportellate consecutive verso la prossima Takedown Cam).

## Non-obiettivi
Nessuna modifica al cambio/console, nessuna nuova geometria del personaggio.
