# Acceptance Criteria: Overhaul Gameplay Arcade "Burnout x Bialbero"

**Spec:** `docs/superpowers/specs/2026-10-29-burnout-arcade-gameplay-overhaul-design.md`  
**Date:** 2026-10-29  
**Status:** Draft  

---

## Criteria

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-001 | Fisica Sportellata Takedown laterale sulle auto del traffico | Logic | `gameState === 'playing'`, Fiat 500 attiva affiancata durante cambio corsia | Invocando `takedownObstacle(id, dir)`, l'auto avversaria passa a `knockedOut = true` con velocità laterale `vx !== 0`, `score` aumenta di `300 * furyMultiplier`, `takedownsCount` incrementa di 1 e `ultimateCharge` cresce di 35. |
| AC-002 | Sistema di sopravvivenza "Paraurti d'Acciaio" a 2 stadi con auto-riparazione | Logic | `gameState === 'playing'`, `armorState === 'intact'` | Un primo impatto frontale porta `armorState` a `'damaged'` e `furyMultiplier` a `1` senza terminare la partita; dopo 3 Sportellate o 1 Rampa, `armorState` torna `'intact'`. Un impatto frontale mentre `armorState === 'damaged'` imposta `gameState = 'gameover'`. |
| AC-003 | Scia Aerodinamica (Drafting) e Sorpasso Fionda (Slingshot) | Logic | `gameState === 'playing'`, Alfetta dietro a una Fiat 500 nella stessa corsia | `isDrafting` diventa `true` e `draftTimer` cresce; cambiando corsia con `draftTimer >= 0.35`, scatta il Sorpasso Fionda con incremento `slingshotsCount`, `boostTimer > 0`, `+250 * furyMultiplier` punti e `+20` a `ultimateCharge`. |
| AC-004 | Cambiata Perfetta in Zona Rossa (Redline Shift Mastery) | Logic | `gameState === 'playing'`, `shiftWindowActive === true` | Invocando `triggerPerfectShift()`, `perfectShiftsCount` incrementa di 1, `score` cresce di `350 * furyMultiplier`, `ultimateCharge` cresce di 25 e si attiva il turbo boost. |
| AC-005 | Rampe di Lancio Stradali, salto sbarramenti e monete aeree | Logic | `gameState === 'playing'`, rampa (`type === 'ramp'`) generata in pista | Invocando `hitRamp(id)`, `verticalVel` sale a `>= 4.0` per far decollare l'auto sopra gli ostacoli, `rampJumpsCount` incrementa di 1, `ultimateCharge` sale di 30 e `armorState` torna `'intact'`. |
| AC-006 | Barra Ultimate Pilota (0–100%) attivabile a comando | Logic | `gameState === 'playing'`, `ultimateCharge === 100` | Invocando `activateUltimate()`, `ultimateCharge` si azzera a `0` e il power-up specifico del pilota selezionato si attiva per `>= 6.5` secondi. |
| AC-007 | Moltiplicatore dinamico "Furia Bialbero" da x1 a x10 | Logic | `gameState === 'playing'` | Ogni acrobazia incrementa `furyMultiplier` di 1 fino a un massimo di `10` e imposta `furyTimer > 0`; quando `furyTimer` scade, `furyMultiplier` decresce gradualmente fino a `1`. |
| AC-008 | Grado Pilota Autodelta e Albo d'Oro Locale Top 5 | Logic | Corsa terminata (`triggerCrash`) con punteggio valido | `getDriverRank(score)` restituisce il titolo corretto tra i 5 gradi previsti e `leaderboard` salva in `localStorage` (`alfetta_top5_leaderboard`) fino a 5 record ordinati per punteggio decrescente con pilota, distanza e grado. |
| AC-009 | HUD Interattivo (Furia, Paraurti, Spia SHIFT, Bottone Ultimate e Riepilogo Burnout) | Logic | Componenti `Speedometer.jsx`, `DriveWorld.jsx` e `DriveAudio.js` compilati | L'HUD renderizza il Moltiplicatore Furia, lo stato del Paraurti d'Acciaio, la spia interattiva per la Cambiata Perfetta, il pulsante Ultimate 0–100% e la schermata Game Over con i 4 Trofei di Manche e l'Albo d'Oro Top 5; la build Vite compila senza errori. |
