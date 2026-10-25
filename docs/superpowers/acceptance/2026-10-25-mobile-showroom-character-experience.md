# Acceptance Criteria: Esperienza Mobile Showroom & Selezione Piloti (1976)

**Spec:** `docs/superpowers/specs/2026-10-25-mobile-showroom-character-experience-design.md`  
**Date:** 2026-10-25  
**Status:** Draft  

---

## Criteria

| ID | Description | Test Type | Preconditions | Expected Result |
|----|-------------|-----------|---------------|-----------------|
| AC-001 | Aggiornamento dell'anno storico di debutto a 1976 | Logic | Codice sorgente caricato | Il titolo dell'applicazione in `index.html`, le intestazioni in `App.jsx` e il badge del Centro Stile riportano esplicitamente "1976" al posto di "1973". |
| AC-002 | Configurazione meta viewport e safe area mobile | UI interaction | Pagina aperta su browser mobile o simulatore con viewport mobile | Il tag `<meta name="viewport">` include `viewport-fit=cover`, il body ha `overscroll-behavior-y: none`, e gli elementi fissi applicano padding per `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)`. |
| AC-003 | Visualizzazione MobileTopBar con pulsante hamburger | UI interaction | Risoluzione viewport < 768px (es. 390x844px), modalità Showroom attiva | La barra desktop complessa è nascosta (`hidden md:flex`) ed è visibile la `MobileTopBar` con badge "463880 PD", titolo "Alfetta GTV (1976)", tasto toggle vista pulita e pulsante hamburger (≥ 44x44px). |
| AC-004 | Apertura e chiusura del MobileNavDrawer | UI interaction | MobileTopBar visibile, utente tocca il pulsante hamburger | Il drawer laterale scivola da destra con backdrop scuro sfocato; toccando il pulsante 'X', il backdrop o premendo Escape, il drawer si richiude dolcemente. |
| AC-005 | Azioni e navigazione nel MobileNavDrawer | UI interaction | MobileNavDrawer aperto | Nel drawer sono presenti e funzionanti i pulsanti per: aprire la Galleria Foto Reali, aprire la Scheda Tecnica, cambiare il tema (Garage Notturno / Studio Chiaro), modificare la dedica personalizzata e attivare/disattivare il sound motore. |
| AC-006 | Stato collassato del ShowroomBottomSheet | UI interaction | Risoluzione viewport < 768px, modalità Showroom attiva | In basso è visibile il dock collassato con maniglia centrale di trascinamento, indicatore circolare del colore attivo, nome della vista e grande pulsante "In Corsa". |
| AC-007 | Espansione a schede del ShowroomBottomSheet | UI interaction | ShowroomBottomSheet in stato collassato, utente tocca la maniglia o l'indicatore | Il bottom sheet si espande mostrando le 3 schede: "Colori" (griglia campioni), "Inquadrature" (scelte camera con scorciatoia Motore 3D) e "Controlli" (auto-rotazione, apri/chiudi cofano, reset vista). |
| AC-008 | Selezione colore e inquadratura dal BottomSheet | UI interaction | ShowroomBottomSheet espanso | Toccando un campione colore (es. Rosso Alfa), il colore della carrozzeria 3D si aggiorna istantaneamente; toccando una vista camera (es. Frontale), la telecamera 3D si sposta sulla coordinata corrispondente. |
| AC-009 | Visuale 3D libera del pilota su mobile | UI interaction | Risoluzione viewport < 768px, modalità 'drive' con stato 'selecting' (DriverSelectModal aperto) | Il 60% superiore dello schermo mostra il pilota 3D sul piedistallo senza sovrapposizione di schede testuali; trascinando orizzontalmente sul canvas il personaggio ruota a 360°. |
| AC-010 | Carosello avatar orizzontale touch per i 7 piloti | UI interaction | DriverSelectModal aperto su mobile | Nel 40% inferiore è presente una barra orizzontale con i 7 avatar (Elvis, Tex, Bond, Spiderman, Diabolik, Callaghan, MG); toccando un avatar, questo riceve il bordo dorato attivo e il modello 3D corrispondente si carica sul piedistallo. |
| AC-011 | Scheda statistiche espandibile nella selezione piloti | UI interaction | DriverSelectModal aperto su mobile | È presente un pulsante/pill "Dettagli & Statistiche"; toccandolo si apre un overlay con le 4 barre statistiche (Stile, Riflessi, Carisma, Tenuta) e il badge speciale per MG ("MG Oil Chaos"). |
| AC-012 | Avvio gara dal pulsante CTA su mobile | UI interaction | DriverSelectModal aperto su mobile con pilota selezionato | Toccando il pulsante "Gareggia con [Nome]", lo stato del gioco passa a 'playing', il modal si chiude e l'Alfetta parte sulla pista 3D con il pilota scelto al volante. |
| AC-013 | Integrità e zero regressioni su desktop | UI interaction | Risoluzione viewport ≥ 1024px (desktop) | La testata desktop originale, il pannello inferiore desktop a tutta larghezza e la griglia piloti desktop completa rimangono visualizzati e funzionanti come prima. |
