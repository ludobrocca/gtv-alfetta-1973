# Acceptance Criteria: Rimozione Banner HUD & Sistema VFX 3D Diegetico ("Show, Don't Tell")

**Spec:** `docs/superpowers/specs/2026-10-29-diegetic-3d-powerup-vfx-no-banners-design.md`  
**Date:** 2026-10-29  
**Status:** Approved  

---

## Criteria

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-001 | Rimozione totale dei banner testuali e dei box power-up dal centro/alto di Speedometer.jsx | Logic | Codice sorgente di `Speedometer.jsx` analizzato | `Speedometer.jsx` non renderizza più il blocco `eventBanner`, né la pila dei 7 rettangoli testuali dei power-up, lasciando la visuale stradale libera. |
| AC-002 | Anello Timer SVG luminoso integrato nella ghiera del tachimetro Veglia Borletti | Logic | Power-up attivo in `driveStore.activePowerups` | `Speedometer.jsx` calcola il power-up attivo e renderizza nella ghiera del tachimetro un anello SVG progressivo (`strokeDasharray` / `strokeDashoffset`) colorato in base al pilota, con lampeggio di avviso negli ultimi `1.5s`. |
| AC-003 | Animazioni 3D diegetiche per Elvis (Note Musicali 3D + Postbruciatori), Tex (Rostro + Stella Ranger), 007 (Radar + Jet) e MG (Corona 3D) | Logic | Componente `src/components/drive/CarPowerupVFX.jsx` montato dentro `carDriveGroupRef` in `CarViewer.jsx` | `CarPowerupVFX.jsx` esiste, è montato sull'Alfetta in `CarViewer.jsx` e contiene i gruppi 3D dedicati per `elvis` (fiamme + note musicali), `tex` (rostro + stella), `bond` (radar + postbruciatori) e `mg` (corona reale 3D sul tetto), con lampeggio sotto `1.5s`. |
| AC-004 | Fili di Ragnatela 3D di Spider-Man verso le monete e Mirino Laser / Tracciante .44 Magnum di Callaghan | Logic | `spiderman` o `callaghan` attivi in `driveStore` | `DriveWorld.jsx` renderizza i fili 3D di ragnatela tra la posizione dell'auto (`carX`, `carY`) e le monete nel raggio del magnete; `CarPowerupVFX.jsx` renderizza il laser e il tracciante/muzzle flash quando `magnumShotTimer > 0`. |
| AC-005 | Effetto Ghost Cloak semi-trasparente sulla carrozzeria dell'Alfetta GTV per Diabolik | Logic | `driveStore.activePowerups.diabolik > 0` durante `sceneMode === 'drive'` | `CarViewer.jsx` modula l'opacità dei materiali della carrozzeria rendendola traslucida (`opacity < 0.6`, `transparent = true`) finché `diabolik > 0` e la ripristina a `opacity = 1.0` quando scade. |
| AC-006 | VFX 3D degli stati meccanici (Fumo Cofano Danneggiato, Onda Riparazione, Filetti Vento Scia, Fiammata Doppietta e Scintille Sportellata) | Logic | Azioni di guida eseguite in `driveStore.js` | `driveStore.js` imposta e aggiorna `shiftFlashTimer`, `takedownSparkTimer`, `takedownSparkSide`, `repairFlashTimer`, `magnumShotTimer`; `CarPowerupVFX.jsx` renderizza il fumo dal cofano quando `armorState === 'damaged'`, l'onda di riparazione, i filetti del vento quando `isDrafting === true`, la fiammata di scarico e le scintille laterali. |
