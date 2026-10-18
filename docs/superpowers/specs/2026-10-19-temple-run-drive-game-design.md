# Design Specification: Alfa Romeo Alfetta GTV 1973 — "In Corsa" Endless Runner

- **Author**: Antigravity Pair Programmer
- **Date**: 2026-10-19
- **Status**: Approved
- **Feature**: 3-Lane Endless Runner ("Temple Run / Subway Surfers" Style) for Papà

---

## 1. Executive Summary

Transform the existing "In Corsa" driving mode of the Alfa Romeo Alfetta GTV 1973 luxury showroom into an addictive, responsive 3-lane endless runner minigame designed specifically for the user's father.

### Core Objectives:
1. **Eliminate Hillside Clipping**: Completely remove the roadside cone hills that clipped into the car body.
2. **3-Lane Track System**: A clean, vintage Italian alpine highway divided into Left (`-1`), Center (`0`), and Right (`+1`) lanes with smooth lane switching and vehicle roll/sway.
3. **Temple Run 90° Turns**: At regular intervals (every 300–500m), an advance road sign alerts the player to an upcoming sharp 90° turn. Players must hit the turn key/swipe within the reaction window to perform a power-slide drift; failing triggers a crash against the guardrail.
4. **Retro Obstacles**:
   - **Fiat 500 Vintage**: Slow-moving period cars cruising in a lane to overtake.
   - **Cantiere Vintage Barriers**: Red-and-white striped wooden construction barriers.
   - **Oil Slicks (Macchia d'Olio)**: Glossy dark patches causing a 1-second traction slide with tire screech.
5. **Themed Power-Ups for Dad**:
   - **🤠 Tex Willer — "Il Ranger Invulnerabile"**: Floating 3D Stetson cowboy hat. Grants 6 seconds of golden shield aura; smashes through obstacles without penalty.
   - **🎸 Elvis Presley — "Rock'n'Roll Super Speed"**: Floating 3D golden vinyl record. Plays a high-energy 50s Rockabilly guitar jingle (royalty-free), activates nitro speed boost, widens camera FOV, and doubles score points (2x).
6. **Scoring & LocalStorage**: Distance in meters + Alfa Romeo gold quadrifoglio emblems collected. Personal best saved to `localStorage` under `alfetta_personal_best`.
7. **Mobile & Desktop Controls**:
   - **Desktop**: Left/Right (`←`/`→` or `A`/`D`) to change lanes and execute 90° turns; Space/Enter to restart.
   - **Mobile**: Touch swipe Left/Right, plus on-screen touch arrow buttons for accessibility.
8. **Game Loop & Polish**: Playing -> Crash/GameOver -> Dedicated results card for Dad with personal best and immediate restart.

---

## 2. Architecture & Data Flow

```
+-------------------------------------------------------------+
|                       driveStore.js                         |
|  - gameState: 'playing' | 'gameover' | 'turn_window'        |
|  - lane: -1 | 0 | 1 (current & target lateral X)            |
|  - speedKmh, distanceMeters, score, bestScore               |
|  - powerups: { texTimer: number, elvisTimer: number }       |
|  - activeObstacles: Array<{ id, type, lane, z, active }>    |
|  - activeCoins: Array<{ id, lane, z, active }>              |
|  - turnEvent: { active: bool, direction: 'L'|'R', z: number }|
+------------------------------+------------------------------+
                               |
       +-----------------------+-----------------------+
       |                                               |
       v                                               v
+-----------------------------+        +-----------------------------+
|       DriveWorld.jsx        |        |      Speedometer.jsx        |
| (Three.js 3D Game World)    |        | (Arcade HUD & Overlays)     |
| - 3-Lane Modular Road Mesh  |        | - Score & Personal Best     |
| - Fiat 500 & Barriers       |        | - Active Power-Up Timers    |
| - Tex Stetson & Elvis Vinyl |        | - 90° Turn Arrow Alerts     |
| - Gold Coins & Oil Slicks   |        | - Mobile Touch Controls     |
| - Collision Detection Loop  |        | - Game Over / Restart Modal |
+-----------------------------+        +-----------------------------+
               |
               v
+-----------------------------+
|    DriveCameraDirector      |
| - Follows car lateral X     |
| - Dynamic drift lean        |
| - Nitro FOV zoom effect     |
+-----------------------------+
```

---

## 3. Power-Ups & Audio Specification

### 3.1 Tex Willer — "Il Ranger Invulnerabile"
- **Visuals**: A 3D Stetson cowboy hat mesh rotating smoothly above the road.
- **Trigger**: Drive over the hat icon.
- **Duration**: 6 seconds.
- **Mechanic**:
  - The Alfetta emits a shimmering golden halo.
  - When colliding with a Fiat 500 or barrier, the obstacle is blasted away with explosion particles instead of ending the run.
  - HUD displays a stylized Tex badge: *"TEX WILLER: INVULNERABILE!"*.

### 3.2 Elvis Presley — "Rock'n'Roll Super Speed"
- **Visuals**: A 3D golden vinyl record disc with grooved ridges rotating with sparkles.
- **Trigger**: Drive over the vinyl icon.
- **Duration**: 6 seconds.
- **Mechanic**:
  - Automatically boosts car speed to ~175 km/h.
  - Camera FOV expands by +12 degrees for an exhilarating sense of speed.
  - Audio: A punchy, royalty-free 50s Rockabilly swing riff generated via Web Audio API / high-energy audio buffer, 100% legal with zero DMCA risks.
  - Score multiplier set to **2x**.

---

## 4. Obstacles & Collision Mechanics

1. **Fiat 500 Classic**:
   - Model: Styled retro microcar cruising forward at 40 km/h in a single lane.
   - Hit: Instant crash (unless Tex shield active).
2. **Transenne Stradali (Cantiere)**:
   - Model: Red-and-white striped vintage wooden barriers.
   - Hit: Instant crash (unless Tex shield active).
3. **Macchia d'Olio (Oil Slick)**:
   - Model: Dark reflective puddle on the asphalt.
   - Hit: Causes car to fishtail with a tire screech sound; pushes the car toward an adjacent lane or locks steering for 0.8s without causing game over.
4. **Scudetti Alfa Romeo (Coins)**:
   - Model: Gold circular coins with the Biscione / Quadrifoglio crest.
   - Hit: +50 bonus points, sparkling sound effect.

---

## 5. Temple Run 90° Turn Mechanics

- Every 350 meters, a turn junction is spawned.
- A flashing road sign warns: **"CURVA PERICOLOSA: PREMI ← / →"**.
- The turn trigger zone is active between `Z_turn - 12m` and `Z_turn + 4m`.
- If the player inputs the correct direction within this window:
  - The car initiates a cinematic high-speed drift with tire smoke.
  - The road switches to the perpendicular heading, maintaining continuous velocity.
  - Bonus +150 "Perfetta Derapata!" points.
- If the player misses the window or inputs the wrong direction:
  - The car plows into the roadside barrier -> Game Over crash sequence.

---

## 6. Personal Best & Dedication to Dad

- Current Score = `(distance in meters) + (coins * 50) + (turn drifts * 150)`.
- Personal Best stored in `localStorage.getItem('alfetta_personal_best')`.
- On Game Over:
  - Sound: Vintage screech and bump.
  - Modal pops up with dark glassmorphism styling:
    - **"PARTITA TERMINATA"**
    - **"Distanza: X m"** | **"Punti Totali: Y"**
    - **"Record Personale: Z"** (with glowing gold badge if beaten!)
    - Special message: *"Grande prestazione, Papà! Pronto per un'altra manche?"*
    - Big restart button: **"RIPROVA (SPAZIO)"** or tap on mobile.

---

## 7. Controls & Ergonomics

| Action | Desktop Keyboard | Mobile Touchscreen |
| :--- | :--- | :--- |
| **Cambia Corsia Sx** | `←` or `A` | Swipe a sinistra / Tasto `◀` |
| **Cambia Corsia Dx** | `→` or `D` | Swipe a destra / Tasto `▶` |
| **Svolta a 90°** | `←` / `→` o `A` / `D` | Swipe nella direzione indicata |
| **Ricomincia** | `Spazio` o `Invio` | Tap su "Riprova" |
| **Torna Showroom**| Tasto "Esc" o click HUD | Tap su "Torna allo Showroom" |
