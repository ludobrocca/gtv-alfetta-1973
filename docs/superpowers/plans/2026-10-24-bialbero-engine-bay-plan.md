# Implementation Plan: Vano Motore & Propulsore Bialbero AR01608 3D

- **Specifica**: `docs/superpowers/specs/2026-10-24-bialbero-engine-bay-design.md`
- **Data**: 2026-10-24

---

## 1. Criteri di Accettazione (Acceptance Criteria)

- **AC1 (Separazione e Cinematica Cofano Controvento)**:
  - Il cofano (`-0.955 <= x <= -0.352`) è esportato come nodo autonomo `Hood` incernierato anteriormente a `[-0.942, 0.044, 0.0]`, mentre la vasca dei tergicristalli (`-0.352 <= x <= -0.302`) rimane fissa sulla scocca.
  - A cofano chiuso (`hoodOpen = false`), il cofano è perfettamente a filo con i parafanghi e il frontale; a cofano aperto (`hoodOpen = true`), ruota controvento di ~68° mostrando la pagina interna nervata in tinta carrozzeria e i tiranti a V.
- **AC2 (Fedeltà Storica e Fotografica del Motore Bialbero AR01608)**:
  - Il file `public/models/alfetta-bialbero-engine.glb` generato da `scripts/build_bialbero_engine_glb.py` riproduce tutti i sottosistemi visibili nelle 2 foto reali e nella scheda tecnica (coperchio punterie a doppia gobba con grafia `Alfa Romeo` e tappo `OLIO`, 4 candele con cavi, collettore scarico 4-in-2 in ghisa, 2 carburatori doppio corpo con barilotto nero a 2 fascette, tubo sfiato olio, alternatore con fascia rossa, radiatore con ventola gialla, servofreno con vaschetta ambrata a 2 tappi bianchi + cilindro centrale, vaschette traslucide verde-oliva e bianco-latte sul passaruota sinistro, filtro A/C nero con raccordi in ottone, passaruota interni ribassati in tinta carrozzeria).
- **AC3 (Interazione UI e Inquadratura Dedicata)**:
  - Cliccando sul pulsante **"Motore"** nella barra inferiore, il cofano si apre controvento e la telecamera esegue uno zoom centrato sul vano motore con possibilità di orbitare/zoomare liberamente a 360°.
  - È possibile aprire/chiudere il cofano anche rimanendo nelle altre inquadrature esterne.
- **AC4 (Animazione "Motore Vivo" al Minimo)**:
  - Con il cofano aperto, i nodi rotanti (`Engine_Fan_Yellow`, `Engine_Pulley_WaterPump`, `Engine_Pulley_Crank`, `Engine_Pulley_Alt`) ruotano fluidamente e il blocco motore compie una micro-vibrazione elastica al minimo (~950 RPM).

---

## 2. Fasi di Sviluppo

### Fase 1: Aggiornamento `scripts/build_alfetta_gtv_glb.py` (Nodo `Hood` separato)
1. Separare la griglia del cofano (`-0.955 <= x <= -0.352`) dalla griglia fissa della vasca tergicristalli (`-0.352 <= x <= -0.302`).
2. Creare i builder dedicati per il nodo `Hood` (superficie esterna, palpebra anteriore `lip_grid`, ugelli lavavetri, pagina interna sottocofano nervata in tinta carrozzeria e gancio di chiusura posteriore) traslati rispetto al pivot anteriore `H_PIVOT = [-0.942, 0.044, 0.0]`.
3. Esportare il nodo `Hood` nel file `.glb` e rigenerare `public/models/alfa-romeo-1973-cad.glb` e `public/models/alfa-romeo-1973.glb`.

### Fase 2: Creazione `scripts/build_bialbero_engine_glb.py` (Modello 3D Motore Bialbero)
1. Scrivere il generatore parametrico `scripts/build_bialbero_engine_glb.py` con 12 materiali PBR specifici e geometria 3D completa di:
   - Vano motore (passaruota interni ribassati senza torri McPherson, parafiamma, traversa anteriore, scatola riscaldatore con scrocco cofano, tiranti cofano).
   - Monoblocco nervato, coppa olio Serie 116 alettata, testata cross-flow, carter distribuzione, coperchio punterie a doppia gobba con scritta `Alfa Romeo` in corsivo, tappo `OLIO` a stella, 6 bulloni con rondelle in rame, 4 candele con pipette e cavi ad alta tensione, 2 prigionieri anteriori.
   - Lato Scarico (`+Z`): Collettore 4-in-2 in ghisa curva, alternatore con fascia rossa, servofreno cadmiato, pompa freni con vaschetta ambrata a 2 tappi bianchi + cilindro centrale, vaschetta frizione bianca, vaschetta espansione verde-oliva con fascetta nera e tappo metallico, vaschetta lavavetri bianco-latte, filtro cilindrico nero anteriore con raccordi in ottone.
   - Lato Aspirazione (`-Z`): Collettore aspirazione a 4 condotti con giro d'acqua e termostato, 2 carburatori Weber 40 DCOE / Dell'Orto DHLA 40 con levismi dorati, barilotto filtro aria nero con 2 fascette e tubo vapori olio, spinterogeno con calotta rosso-mattone, bobina e filtro/regolatore benzina.
   - Raffreddamento e Nodi Rotanti: Radiatore nero con tappo e targhetta `AR`, convogliatore, manicotti acqua con fascette, e nodi separati `Engine_Fan_Yellow`, `Engine_Pulley_WaterPump`, `Engine_Pulley_Crank`, `Engine_Pulley_Alt`.
2. Eseguire lo script per generare `public/models/alfetta-bialbero-engine.glb`.

### Fase 3: Integrazione in `CarViewer.jsx` e `App.jsx`
1. Caricare `alfetta-bialbero-engine.glb` in `CarViewer.jsx` e mappare i materiali PBR (inclusa la sincronizzazione di `BayBodyPaint` con il colore carrozzeria attivo).
2. Animare l'apertura controvento del nodo `Hood` e dei tiranti a V, la rotazione di ventola e pulegge e la micro-vibrazione del motore in `useFrame`.
3. Aggiungere il preset camera `engine` (`Motore`) e il controllo di apertura cofano in `CarViewer.jsx` e `App.jsx`.

### Fase 4: Verifica Build e Test Visivo
1. Eseguire `npm run build` per verificare l'assenza di errori.
2. Verificare il rendering e l'animazione nel browser.
