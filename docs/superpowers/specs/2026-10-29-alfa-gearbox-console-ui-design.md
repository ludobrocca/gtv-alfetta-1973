# Design Spec — Console Cambio Transaxle a 5 Marce + Contagiri Autodelta

**Data:** 2026-10-29 · **Branch:** `feat/alfa-gearbox-console-ui` · **Stato:** Approvato dall'utente

## Obiettivo
Il cambio è ora una meccanica core. Sostituire il piccolo riquadro testuale "`{gear}ª MARCIA / RPM`" e il bottone "⚡ CAMBIA!" in `Speedometer.jsx` con una **console tunnel Alfa Romeo 1976** (griglia ad H cromata + pomello in mogano + contagiri segmentato con "Zona Doppietta"), e rendere la progressione delle marce **reale** (guidata dal giocatore) invece che ricalcolata passivamente dalla velocità.

## 1. Fisica del cambio (`src/components/drive/driveStore.js`)

### Costanti esportate
```js
export const GEAR_BANDS = [
  null,
  { min: 0,   max: 76  }, // 1ª
  { min: 65,  max: 102 }, // 2ª
  { min: 88,  max: 128 }, // 3ª
  { min: 112, max: 154 }, // 4ª
  { min: 138, max: 195 }, // 5ª
];
export const GEAR_ACCEL = [0, 26, 20, 15, 11, 8]; // km/h/s in-gear acceleration
export const RPM_IDLE = 1500;
export const RPM_SHIFT_GOOD = 4200;
export const RPM_SHIFT_PERFECT = 5200;
export const RPM_LIMITER = 6500;
export const RPM_MAX = 7000;
export const OVERDRIVE_BONUS_KMH = 20;
export const OVERDRIVE_DURATION = 3.5;
export const PERFECT_SHIFT_BONUS_KMH = 10;
export const GOOD_SHIFT_BONUS_KMH = 5;
export const SHIFT_BOOST_ACCEL_MULT = 1.5;
```

### Nuovo stato
`overdriveTimer` (s), `limiterTimer` (s), `shiftFeedback` = `{ quality: 'perfect'|'good'|'overdrive'|'auto', label, timer }` oppure `null`.
`resetGame()` deve impostare: `gear = 1`, `rpm = initialState === 'playing' ? RPM_IDLE : 950`, `overdriveTimer = 0`, `limiterTimer = 0`, `shiftFeedback = null`, e velocità iniziale `playing` = **40 km/h** (in 1ª).

### Loop `update(dt)` (sostituisce la sezione 7 attuale "auto-gear da speed")
1. **Target speed**:
   - Nitro (Elvis/Bond): `ELVIS_SPEED` (comportamento invariato).
   - Marce 1ª–4ª: `band.max` (il motore tira fino al limitatore → il giocatore deve cambiare).
   - 5ª: `min(band.max, 140 + ramp + boost/draft bonus)` dove `ramp = min(58, distance*0.038)`.
   - Overdrive attivo: `+OVERDRIVE_BONUS_KMH`.
2. **Accelerazione**: `GEAR_ACCEL[gear]`, ma `85` se nitro/boost/drafting (invariato).
3. **Auto-correzione marcia (silenziosa)**: se `speed > band.max + 3` e `gear < 5` → `gear++` (feedback `auto`, `playGearShiftPop`). Se `speed < band.min - 5` e `gear > 1` → `gear--`.
4. **RPM**: `ratio = clamp((speed - band.min*0.72) / (band.max - band.min*0.72))`, `targetRpm = RPM_IDLE + ratio * (RPM_MAX - 300 - RPM_IDLE) + airBonus + rpmBlip`; in overdrive `targetRpm = max(targetRpm, 6500)`. Smoothing invariato (`14*dt`). Durante `shiftTimer > 0` (0.24s clutch) target = 3150.
5. **Limitatore**: se `rpm >= RPM_LIMITER` → aggiungere oscillazione `sin(t*60)*120`, `limiterTimer += dt`; se `limiterTimer > 3.0` e `gear < 5` → upshift assistito (feedback `auto`, nessun bonus). Altrimenti `limiterTimer = 0`.
6. **Finestra doppietta**: `shiftWindowActive = shiftCooldown <= 0 && rpm >= RPM_SHIFT_PERFECT && !(gear === 5 && overdriveTimer > 0)`.
7. Decremento `overdriveTimer`, `shiftFeedback.timer` (→ `null` a 0).

### `triggerPerfectShift()` — ritorna `false | true`
- Non `playing` → `false`.
- **Perfetta** (`shiftWindowActive === true`): logica attuale (punti 350×furia, +25% ultimate, furia+1, boost 1.8, `shiftFlashTimer = 0.55`, `perfectShiftsCount++`, `playPerfectShiftBackfire`), `shiftCooldown = 0.6`. Se `gear < 5` → `gear++`, `speed = min(215, speed + PERFECT_SHIFT_BONUS_KMH)`, feedback `perfect` "⚡ DOPPIETTA PERFETTA! +10 KM/H". Se `gear === 5` → `overdriveTimer = OVERDRIVE_DURATION`, feedback `overdrive` "🔥 OVERDRIVE AUTODELTA 6.500 RPM!".
- **Buona** (`!shiftWindowActive && gear < 5 && shiftCooldown <= 0 && rpm >= RPM_SHIFT_GOOD`): `gear++`, `speed += GOOD_SHIFT_BONUS_KMH`, `150×furia` punti, `+10%` ultimate, `shiftCooldown = 0.6`, `shiftTimer = 0.24`, `playGearShiftPop`, feedback `good` "⚙️ CAMBIATA BUONA +5 KM/H".
- Altrimenti `false`.

### `handleFrontalImpact()`
Nel ramo `intact → damaged`: `gear = Math.max(1, gear - 2)`, `overdriveTimer = 0`.

## 2. UI — `src/components/drive/AlfaGearboxConsole.jsx` (nuovo)
Props: `{ gear, rpm, shiftWindowActive, overdriveActive, shiftFeedback, onShift }`. È un `<button>` (pointer-events-auto, `active:scale-95`, `aria-label="Cambia marcia"`), altezza ≈ 68–76px, larghezza piena del contenitore (max-w-md), sfondo pelle nera/alluminio spazzolato (`bg-gradient-to-b from-zinc-800 via-zinc-900 to-black`, bordo `zinc-600`, cuciture `border-dashed` sottili).

Layout orizzontale a 3 sezioni:
1. **Griglia ad H (SVG ~84×60)**: canali cromati per 1ª(alto-sx) 2ª(basso-sx) 3ª(alto-centro) 4ª(basso-centro) 5ª(alto-dx) R(basso-dx, opacità 0.35); etichette piccole. **Pomello mogano** (cerchio con `radialGradient` marrone `#7c2d12→#3b0a02` + puntino oro stemma) posizionato con `transform: translate()` e `transition: transform 260ms cubic-bezier(.34,1.56,.64,1)`. Quando `rpm > 5500` pomello vibra (classe keyframe `gear-knob-shake`); quando `shiftWindowActive` alone oro/rosso (`drop-shadow`).
2. **Contagiri segmentato** (centro, flex-1): 24 segmenti da 1.000 a 7.000 RPM. Colore per segmento acceso: `< 5200` ambra/bianco, `5200–6300` oro→rosso Alfa ("ZONA DOPPIETTA" etichettata sotto la fascia), `> 6300` rosso intenso. Segmenti spenti `zinc-800`. Tacche "1 2 3 4 5 6 7" sotto (×1000). Al limitatore (`rpm >= 6500`) l'intera barra lampeggia.
3. **Tamburo marcia** (dx): grande cifra `1ª..5ª` (font mono, bold, `text-3xl`), sotto `"5ª OD"` se overdrive, e `rpm.toLocaleString('it-IT')` RPM. Se `shiftWindowActive` mostra la spia rotonda rossa pulsante "⚡ CAMBIA!".

**Badge feedback**: se `shiftFeedback` presente, chip assoluto sopra la console (`-top-3`, dentro la console, mai al centro dello schermo), colore per qualità (perfect oro, overdrive fucsia/rosso, good zinco/verde, auto grigio), animazione fade/scale.

Keyframes (`gear-knob-shake`, `gear-limiter-flash`) aggiunti in `src/index.css`.

## 3. Integrazione `Speedometer.jsx`
- Sostituire il blocco "1. Spia/Bottone CAMBIA! / DOPPIETTA" (ternario `shiftWindowActive ? <button> : <div>`) con `<AlfaGearboxConsole … onShift={() => driveStore.triggerPerfectShift()} />`.
- Aggiungere al polling 30Hz: `overdriveActive = driveStore.overdriveTimer > 0`, `shiftFeedback` (copia shallow).
- La riga "Ultimate" resta accanto/sotto; su mobile la console occupa la riga intera (layout `flex-col`), su `sm:` le due stanno affiancate con la console più larga (`sm:flex-[1.4]`).
- Il testo "`{gear}ª MARCIA`" dentro il tachimetro resta (è diegetico) ma mostra `OD` se overdrive.
- Controlli invariati: Freccia Su / W / Spazio, swipe-up, tap su tachimetro, tap sulla console.

## 4. Non-obiettivi
Nessuna scalata manuale da parte del giocatore, nessuna retromarcia funzionante, nessuna modifica 3D.
