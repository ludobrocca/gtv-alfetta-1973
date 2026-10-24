# Design Specification: Vano Motore & Propulsore Bialbero AR01608 (1.779 cm³) in 3D

- **Autore**: Antigravity
- **Data**: 2026-10-24
- **Stato**: Approvato
- **Riferimenti Visivi**: `WhatsApp Image 2026-10-18 at 19.41.08.jpeg`, `WhatsApp Image 2026-10-18 at 19.41.10.jpeg`

---

## 1. Obiettivo del Progetto

Realizzare una ricostruzione 3D parametrica ad altissima fedeltà del vano motore e del propulsore **Alfa Romeo Bialbero 1.779 cm³ (codice AR01608, 122 CV DIN)** dell'Alfetta GT/GTV (Tipo 116), integrata nello Showroom 3D con:
1. **Apertura controvento del cofano motore (`Hood`)** incernierato anteriormente (`x = -0.942`).
2. **Generatore CAD Python dedicato (`scripts/build_bialbero_engine_glb.py`)** che esporta `public/models/alfetta-bialbero-engine.glb`.
3. **Pulsante dedicato "Motore" nella UI** che apre il cofano, esegue uno zoom cinematografico sul vano motore (con la medesima angolazione delle foto reali e orbita libera a 360°) e consente anche di mantenere il cofano aperto nelle altre inquadrature.
4. **Animazione "Motore Vivo" al minimo (950 RPM)** con rotazione di ventola gialla, puleggia pompa acqua, puleggia albero motore e puleggia alternatore, accompagnata da micro-vibrazione elastica del blocco Bialbero.

---

## 2. Mappatura Spaziale e Coordinate CAD `(X, Y, Z)`

Nel sistema di riferimento del modello CAD (`1 unità = 2,22 metri`):
- **Asse X (Longitudinale)**: da `x = -0.89` (traversa anteriore / radiatore) a `x = -0.352` (parafiamma / vasca riscaldatore).
- **Asse Y (Verticale)**: da `y = -0.165` (coppa dell'olio alettata Serie 116) a `y = +0.075` (sommità coperchio punterie e barilotto filtro aria), restando sempre al di sotto del profilo del cofano chiuso `hood_surface_height(x, z)`.
- **Asse Z (Trasversale)**:
  - **`z = 0.0` (Asse Mediano)**: Monoblocco, testata cross-flow a 80°, coperchio punterie a doppia gobba con pozzetti per le 4 candele, carter distribuzione anteriore a doppia catena, carter volano posteriore corto (schema Transaxle).
  - **`z > 0` (`+Z` = Lato Sinistro / Lato Guida / Lato Scarico)**:
    - Collettore di scarico 4-in-2 in ghisa bruno-ferrosa ossidata (accoppiamento cilindri 1–4 e 2–3).
    - Alternatore Bosch/Marelli anteriore basso con carcassa alettata e fascia centrale rosso-arancio.
    - Servofreno a depressione cadmiato + Pompa freni a doppio circuito con vaschetta traslucida ambrata a 2 tappi bianchi e cilindro metallico centrale + Vaschetta comando idraulico frizione bianca con tappo nero.
    - Vaschetta espansione liquido di raffreddamento in plastica traslucida verde-oliva con fascetta metallica nera e tappo metallico a orecchie sul passaruota sinistro.
    - Vaschetta liquido lavavetri in plastica traslucida bianco-latte con tappo tondo bianco sul passaruota sinistro.
    - Filtro cilindrico nero anteriore sinistro con tubazioni e raccordi in ottone.
  - **`z < 0` (`-Z` = Lato Destro / Lato Passeggero / Lato Aspirazione)**:
    - Rilievo `Alfa Romeo` e tappo `OLIO` a stella sul coperchio punterie + tubo recupero vapori olio nero.
    - Collettore di aspirazione in alluminio a 4 condotti con giro d'acqua inferiore e corpo termostato anteriore.
    - 2 Carburatori orizzontali doppio corpo Weber 40 DCOE / Dell'Orto DHLA 40 con distanziali termoisolanti, coperchi vaschette, levismi acceleratore tropicalizzati oro e raccordi benzina.
    - Scatola filtro aria a "Barilotto" cilindrico nero semilucido con 2 fascette metalliche a molla e proboscide anteriore.
    - Spinterogeno meccanico anteriore basso con calotta rosso-mattone e i 4 cavi candela neri ad alta tensione che scavalcano il coperchio punterie.
    - Bobina d'accensione e filtro/regolatore pressione benzina con bicchierino in vetro sul passaruota destro.

---

## 3. Materiali PBR Dedicati del Vano Motore

| Materiale | Aspetto e Parametri PBR | Componenti |
| :--- | :--- | :--- |
| `EngineCastAlu` | Alluminio fuso naturale granuloso (`roughness: 0.68, metalness: 0.72`) | Monoblocco, testata, collettore aspirazione, pompa acqua, coppa olio |
| `EngineSatinAlu` | Alluminio pressofuso satinato lucido (`roughness: 0.34, metalness: 0.88`) | Coperchio punterie, carter distribuzione, tappo `OLIO`, carcassa alternatore |
| `ExhaustCastIron` | Ghisa grezza bruno-ferrosa ossidata (`roughness: 0.88, metalness: 0.35`) | Collettore di scarico 4-in-2 e flange |
| `SemiGlossBlack` | Nero semilucido industriale (`roughness: 0.38, metalness: 0.18`) | Barilotto filtro aria, radiatore, convogliatore ventola, blocco riscaldatore, filtro A/C |
| `RubberHose` | Gomma nera opaca (`roughness: 0.85, metalness: 0.04`) | Manicotti acqua, tubo vapori olio, cavi candela, pipette, cinghia trapezoidale |
| `CadmiumGold` | Acciaio zincato giallo / cadmiato (`roughness: 0.32, metalness: 0.82`) | Piatto servofreno, levismi Weber/Dell'Orto, raccordi ottone, scrocco cofano |
| `CopperWasher` | Rame / Rosso-arancio (`roughness: 0.35, metalness: 0.65`) | Rondelle dadi coperchio punterie, fascia statore alternatore, calotta spinterogeno |
| `FanYellow` | Giallo pastello tecnico (`roughness: 0.40, metalness: 0.08`) | Ventola multipala radiatore, targhetta `AR` |
| `TankOliveTrans` | Plastica traslucida verde-oliva (`opacity: 0.82, roughness: 0.25`) | Vaschetta espansione liquido raffreddamento |
| `TankMilkTrans` | Plastica traslucida bianco-latte (`opacity: 0.86, roughness: 0.28`) | Vaschetta lavavetri, vaschetta frizione, tappi vaschetta freni |
| `TankAmberTrans` | Plastica traslucida ambrata (`opacity: 0.82, roughness: 0.22`) | Vaschetta liquido freni |
| `BayBodyPaint` | Vernice carrozzeria dinamica (sincronizzata con il selettore colori) | Passaruota interni ribassati (senza torri McPherson), traversa anteriore, parafiamma |
