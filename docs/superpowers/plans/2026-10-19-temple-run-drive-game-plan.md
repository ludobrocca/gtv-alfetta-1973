# Implementation Plan: 3-Lane Temple Run Minigame ("In Corsa")

- **Target Branch**: `main`
- **Spec**: `docs/superpowers/specs/2026-10-19-temple-run-drive-game-design.md`
- **Date**: 2026-10-19

---

## 1. Acceptance Criteria

### AC1: Road Environment & Hillside Clipping Removal
- **Given** the user enters "In Corsa" mode,
- **When** the 3D scene renders,
- **Then** there are **NO** cone-shaped hills clipping into the car at any speed or angle.
- **Then** the road displays a 3-lane configuration (Left, Center, Right) with clear white lane dividers and vintage alpine scenery (telegraph poles, trees, guardrails).

### AC2: 3-Lane Movement & Vehicle Dynamics
- **Given** the car is driving,
- **When** the user presses Left / `A` or Right / `D` (or swipes / taps touch arrows on mobile),
- **Then** the car smoothly transitions laterally between lanes (`-1`, `0`, `1`) with realistic body roll and suspension lean.
- **Then** the camera follows the car's lateral movement smoothly.

### AC3: Obstacle Generation & Collisions
- **Given** the player is in `'playing'` mode without an active Tex shield,
- **When** the car collides with a Fiat 500 or a striped barrier,
- **Then** the car triggers a crash sequence and transitions to `'gameover'`.
- **When** the car hits an oil slick,
- **Then** the car skids with tire screeches and momentarily slides without ending the run.

### AC4: Power-Ups (Tex Willer & Elvis Presley)
- **Given** the player picks up the 3D Stetson hat (Tex Willer),
- **Then** a golden shield illuminates the Alfetta for 6 seconds.
- **Then** colliding with any obstacle smashes the obstacle into debris and awards bonus points without causing a Game Over.
- **Given** the player picks up the 3D golden vinyl (Elvis Presley),
- **Then** the car instantly accelerates to ~175 km/h with motion blur/FOV expansion.
- **Then** a high-energy 50s Rockabilly swing guitar/bass riff plays.
- **Then** score accumulation is doubled (2x) for 6 seconds.

### AC5: Temple Run 90° Sudden Turns
- **Given** the car approaches a turn junction (every ~350m),
- **When** the turn indicator flashes,
- **If** the player inputs the turn direction within the reaction window, the car performs a stylish power-slide drift into the new lane with tire smoke and earns +150 drift points.
- **If** the player fails to turn, the car crashes against the barrier -> Game Over.

### AC6: Score, Personal Best & Dedicated Results Card
- **Given** a run ends,
- **Then** the final score is calculated and compared to `localStorage.getItem('alfetta_personal_best')`.
- **Then** the Game Over modal displays the score, best score (with "Nuovo Record!" if surpassed), a heartfelt message for Dad, and a "Riprova" button.
- **When** the user clicks "Riprova" or presses Space/Enter,
- **Then** the run restarts immediately without reloading the page.

### AC7: Mobile & Desktop Usability
- **Given** a smartphone or tablet screen,
- **Then** touch buttons (left/right arrows) and swipe gestures are responsive with zero UI overlap.

---

## 2. Step-by-Step Implementation Steps

### Phase 1: Web Audio Synthesis & Retro Rockabilly Jingle (`DriveAudio.js`)
1. Create `src/components/drive/DriveAudio.js` with Web Audio API nodes:
   - 50s Rockabilly 12-bar swing bassline + twangy lead guitar riff (Elvis mode).
   - Tex Willer mystic shield hum & impact blast.
   - Coin pickup chime & tire skid / crash sound.
   - Master volume and mute support integrated with existing sound toggle.

### Phase 2: Game State Store Upgrade (`driveStore.js`)
2. Extend `DriveStore` with:
   - `lane`: current target lane (-1, 0, 1) and continuous `carX`.
   - `carRoll`: roll angle during lane shifts.
   - `gameState`: `'playing'` | `'gameover'`.
   - `score`, `bestScore`, `coinsCollected`.
   - `activePowerups`: `{ tex: 0, elvis: 0 }`.
   - `obstacles`, `coins`, `powerups` spawner and lifecycle array.
   - `turnEvent`: 90° turn state and detection window.
   - Methods: `changeLane(dir)`, `triggerTurn(dir)`, `resetGame()`, `onHitObstacle()`.

### Phase 3: 3D Game World & Entities (`DriveWorld.jsx`)
3. Refactor `DriveWorld.jsx`:
   - Strip out clipping `hillsRef` meshes.
   - Implement clean 3-lane highway geometry (width = 4.8m, 3 distinct lanes).
   - Create procedural 3D obstacle models:
     - Vintage Fiat 500 (chassis, roof, wheels, headlights/taillights).
     - Retro striped wooden barriers.
     - Oil slick puddles.
   - Create 3D collectible models:
     - Tex Stetson hat (lathe/cylinder brim, crown, hatband).
     - Elvis Golden vinyl disc (grooves, center label).
     - Golden Quadrifoglio Alfa coins.
   - Add collision detection in `useFrame` between car bounding box and entities.
   - Add 90° turn junction visual signs and drift particle effects.

### Phase 4: Car Motion & Camera Coupling (`CarViewer.jsx` & `DriveCameraDirector.jsx`)
4. Link `driveStore.carX` and `carRoll` to the rendered 3D Alfetta GTV model.
5. Add Tex Willer golden shield aura mesh around the car body.
6. Update `DriveCameraDirector.jsx` to follow `carX` dynamically with a rear 3rd-person chase camera, drift yaw, and Elvis nitro FOV zoom.

### Phase 5: Arcade HUD & Mobile Controls (`Speedometer.jsx`)
7. Add arcade overlay:
   - Distance & Score counter, Best Record badge.
   - Active power-up indicators with countdown timer bars (🤠 Tex, 🎸 Elvis).
   - 90° Turn warning banner with flashing direction arrow.
   - Ergonomic mobile touch buttons (Left/Right) and touch swipe event listeners.
   - Game Over results dialog with restart trigger.

### Phase 6: Build Verification & Deployment
8. Run `npm run build` to verify clean compilation with zero lint/build errors.
9. Verify in browser: check performance, lane switches, collisions, power-ups, audio, and mobile responsiveness.
10. Commit changes and push to GitHub repository so Vercel automatically redeploys.
