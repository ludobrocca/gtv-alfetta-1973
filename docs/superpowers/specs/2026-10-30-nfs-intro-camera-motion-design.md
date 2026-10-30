# Design Spec — PS2 Need for Speed Style Intro Motion Camera

**Data:** 2026-10-30 · **Branch:** `feat/nfs-intro-camera`

## Obiettivo
All'inizio di ogni manche (quando si seleziona il pilota o si preme "Riprova"), aggiungere una sequenza cinematografica della telecamera di **2.6 secondi** in stile *Need for Speed* (era PS2: *Underground / Most Wanted*):
- La telecamera parte bassissima a filo d'asfalto davanti al muso dell'Alfa Romeo Alfetta GTV (1976), inquadrando la calandra a cuore cromata, il Biscione e i doppi fari tondi mentre l'auto è già in marcia a 20 km/h.
- Compie una carrellata dinamica ad arco lungo la fiancata (specchietto, pilota 3D al volante, badge Quadrifoglio/GTV).
- Risale dolcemente scavalcando il montante posteriore e la coda tronca fastback.
- Si ancora senza scatti (zero pop) nella classica visuale posteriore chase camera a Z=-3.55, pronta per la guida.
- Inclinazione dinamica (Dutch angle / roll) tipica dei giochi arcade PS2 che si livella all'ancoraggio.
- Barre cinemascope discrete (letterbox superiore/inferiore) con tipografia vintage Autodelta che si ritraggono all'aggancio.
- Tasto/Tap "Salta": premendo Spazio o toccando lo schermo durante l'intro, la telecamera si posiziona subito dietro se il giocatore vuole partire all'istante.

---

## 1. Store (`src/components/drive/driveStore.js`)
- Costante esportata:
  ```js
  export const INTRO_CAM_DURATION = 2.6; // Durata animazione introduttiva in secondi
  ```
- Nuovo stato:
  - `this.introCamTimer = 0;` (in secondi)
- Metodi:
  - `triggerIntroCam()`: imposta `this.introCamTimer = INTRO_CAM_DURATION;` e notifica i listener.
  - `skipIntroCam()`: se `this.introCamTimer > 0`, lo porta a 0 istantaneamente.
  - In `startRaceWithDriver(driverId)`: chiama `this.resetGame('playing'); this.triggerIntroCam();`.
  - In `update(delta)`: decrementa `this.introCamTimer` con `realDt` (`Math.max(0, this.introCamTimer - realDt)`).
  - In `resetGame(initialState = 'playing')`: `this.introCamTimer = 0;` (mantiene compatibilità al 100% con tutti i test esistenti).

---

## 2. Regia Telecamera 3D (`src/components/drive/DriveCameraDirector.jsx`)
Quando `driveStore.introCamTimer > 0`:
- Calcolo progresso: `p = 1 - (driveStore.introCamTimer / INTRO_CAM_DURATION)` ($0 \to 1$).
- Curva di interpolazione fluida (hermite / smoothstep):
  - **Fase Iniziale ($p=0$)**:
    - Posizione: `X = carX + 1.15`, `Y = carY + 0.32` (bassa a filo asfalto), `Z = 3.65` (davanti al muso).
    - LookAt: `LX = carX + 0.05`, `LY = carY + 0.55` (stemma Alfa sul cofano), `LZ = 0.8`.
    - FOV: `62°` (grandangolo dinamico).
    - Roll: `-0.08 rad` (inclinazione arcade PS2).
  - **Fase Fiancata ($p \approx 0.45$)**:
    - Posizione: `X = carX + 2.15`, `Y = carY + 0.95`, `Z = -0.4`.
    - LookAt: `LX = carX + 0.1`, `LY = carY + 0.65`, `LZ = 0.2`.
  - **Fase Ancoraggio Posteriore ($p \to 1.0$)**:
    - Raggiunge esattamente la chase camera: `targetPos = (carX * 0.68, targetY, -3.55)`, `targetLookAt = (carX * 0.88, lookY, 5.5)`.
    - FOV: `46°`.
    - Roll: `0 rad` (`camera.up.set(0, 1, 0)`).
- All'inizio del timer (`introCamTimer === INTRO_CAM_DURATION` o primo frame), inizializza le coordinate correnti al punto di partenza per evitare qualsiasi salto.
- In `useFrame`, se `introCamTimer > 0`, applica roll a `camera.up.set(Math.sin(roll), Math.cos(roll), 0)`.

---

## 3. UI & HUD (`src/components/drive/Speedometer.jsx`)
- Polling a 30Hz: legge `introCamActive = (driveStore.introCamTimer || 0) > 0`.
- Durante l'intro:
  - Barre letterbox cinemascope sottili in alto e in basso con scritte d'epoca:
    - In alto: `AUTODELTA CORSE • 1976 ALFA ROMEO ALFETTA GTV`
    - In basso: `BIALBERO 2.0 • TOCCA PER SALTARE`
  - Al termine dell'intro (`p = 1`), le barre scivolano via dolcemente con transizione CSS `translate-y`.
  - Un tap sullo schermo o la barra spaziatrice durante l'intro chiama `driveStore.skipIntroCam()`.
- Su "Riprova" in GameOver modal e con tasto Spazio/Enter da GameOver: attiva `driveStore.resetGame('playing'); driveStore.triggerIntroCam();`.
