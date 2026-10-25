# Specifica di Design: Esperienza Mobile Showroom & Selezione Piloti (App Store & Play Store Ready)

**Data**: 2026-10-25  
**Progetto**: Alfa Romeo Alfetta GTV (1976) — 3D Showroom & Arcade Drive  
**Stato**: Approvato dal committente (In attesa di review spec)

---

## 1. Obiettivi & Visione
Preparare l'applicazione per la pubblicazione su **Apple App Store** e **Google Play Store** (tramite wrapper nativi quali Capacitor / PWA avanzata), offrendo un'esperienza mobile d'eccellenza conforme agli standard **Apple Human Interface Guidelines (HIG)**, **Material Design 3** e principi di **Thumb Zone Ergonomics**.

Inoltre, l'iterazione provvede a:
1. **Aggiornamento Storico Ufficiale:** Correzione dell'anno di riferimento del modello da 1973 a **1976** (anno del debutto dell'Alfetta GTV 2000 Cat. B2).
2. **TopBar & Menu Hamburger Mobile:** Eliminazione del sovraccarico visivo superiore su schermi verticali tramite barra pulita e cassetto laterale a scorrimento (*Slide-Over Nav Drawer*).
3. **Showroom Mobile Bottom Sheet:** Dock inferiore collassabile ed ergonomico a schede per gestire campioni colore, inquadrature 3D, ispezione vano motore e avvio corsa a una sola mano.
4. **Selezione Piloti 3D a Schermo Intero:** Riorganizzazione della schermata piloti (`DriverSelectModal`) in stile arcade mobile (*Brawl Stars / Mario Kart Tour*): stage 3D libero e ruotabile al 60% superiore, carosello avatar orizzontale touch al 40% inferiore e scheda statistiche/easter egg espandibile su richiesta.

---

## 2. Principi Fondamentali di Ergonomia Mobile (UI/UX Pro Max)

- **Thumb Zone Ergonomics:** Tutti i controlli frequenti (cambio colore, cambio vista, avvio corsa, scorrimento piloti) risiedono nel terzo inferiore dello schermo (zona naturale del pollice).
- **Safe Area Insets:** Utilizzo rigoroso di `env(safe-area-inset-top)` e `env(safe-area-inset-bottom)` con `viewport-fit=cover` per evitare occlusioni con notch, Dynamic Island e Home Indicator di iOS/Android.
- **Touch Target Minimi:** Tutte le superfici interattive rispettano o superano i 44x44 pt/px raccomandati.
- **Prevenzione Conflitti Gesture:** `overscroll-behavior-y: none` per bloccare il reload involontario della pagina durante la manipolazione orbitale 3D; gestione differenziata delle gesture swipe orizzontali.
- **Glassmorphism & Contrasto:** Superfici traslucide (`backdrop-blur-xl`, `bg-black/60` / `bg-white/80`) con bordature di luce 1px per garantire leggibilità WCAG AAA e feedback visivo immediato al tocco (`active:scale-95`).

---

## 3. Architettura & Componenti

### 3.1 Aggiornamento Metadati & Anno Storico (1976)
- **`src/App.jsx` & `index.html`:** Aggiornamento del titolo in *"Alfa Romeo Alfetta GTV (1976)"*.
- **Badge Storico:** Aggiornamento dicitura *"CENTRO STILE • MILANO 1976"* e riferimenti al debutto della GTV 2000 (Targa Nera 463880 PD).
- File di storage localStorage: mantenimento retrocompatibile della chiave per la dedica personalizzata.

### 3.2 `src/components/mobile/MobileTopBar.jsx`
Barra superiore dedicata ai dispositivi mobile (`< md`), visualizzata unicamente quando `sceneMode === 'showroom'`:
- **Elementi visibili:**
  - Sinistra: Punto luce rosso Alfa, badge compatto *"463880 PD"* e intestazione tipografica vintage *"Alfetta GTV (1976)"*.
  - Destra: Pulsante rapido **"Occhio"** (per nascondere l'interfaccia e ammirare la vettura) e pulsante **"Hamburger"** (icona a 3 barre in vetro sfocato con target 44x44px).
- **Safe Area:** Padding top con `env(safe-area-inset-top)`.

### 3.3 `src/components/mobile/MobileNavDrawer.jsx`
Drawer a scorrimento laterale dal bordo destro (`right-0`), con backdrop sfocato scuro:
- **Header:** Logo storico Alfa Romeo, badge targa e pulsante `X` di chiusura rapida (chiudibile anche toccando il backdrop o premendo Esc).
- **Voci di Navigazione & Controlli:**
  1. **Galleria Foto Reali (9 foto):** apre la modale galleria dell'esemplare 463880 PD.
  2. **Scheda Tecnica Omologazione:** visualizza le specifiche del motore Bialbero AR01608 e schema Transaxle.
  3. **Tema Showroom (Toggle Notte / Studio):** passaggio tra Garage Notturno e Studio Chiaro.
  4. **Personalizza Dedica:** visualizzazione ed editing inline della dedica per Papà con persistenza localStorage.
  5. **Sound Motore Twin-Cam:** switch toggle per la sintesi sonora audio Bialbero.
  6. **Ispezione Vano Motore 3D:** scorciatoia per sollevare il cofano controvento e inquadrare il Bialbero.
  7. **Crediti & Storia:** omaggio al design di Giorgetto Giugiaro e Circolo Patavino Auto Storiche.

### 3.4 `src/components/mobile/ShowroomBottomSheet.jsx`
Dock inferiore collassabile a due stati per lo Showroom:
- **Stato Collassato (Altezza ~80px + safe area):**
  - Maniglia di trascinamento (*drag handle*) centrale in alto.
  - Indicatore compatto del colore attivo (swatch tondo con nome sintetico) e inquadratura attiva.
  - Grande pulsante primario fiammante **"In Corsa"** con gradiente rosso Alfa Romeo e icona tachimetro.
- **Stato Espanso (Altezza ~45vh):**
  - Barra a schede orizzontale:
    - **Tab 1: Colori (🎨):** Griglia di campioni colore cerchiati grandi con etichetta (Grigio Chiaro Met. AR 727, Rosso Alfa AR 501, Blu Olandese, ecc.).
    - **Tab 2: Viste (📷):** Viste camera con icone dedicate (*Hero 3/4*, *Frontale*, *Profilo Giugiaro*, *Posteriore*, *Abitacolo Interno*, *Motore 3D* con apertura automatica del cofano).
    - **Tab 3: Controlli (⚙️):** Toggle rotazione continua (Play/Pausa), comando apri/chiudi cofano e reset vista.
  - Toccando il backdrop o trascinando verso il basso il foglio si richiude tornando allo stato collassato.

### 3.5 Ristrutturazione Mobile `src/components/drive/DriverSelectModal.jsx`
Su dispositivi mobile (`< md` o orientamento portrait):
- **Stage 3D Libero (60% superiore):**
  - Canvas Three.js con il modello 3D del pilota (Elvis, Spiderman, Bond, Tex, Diabolik, Callaghan, MG) su piedistallo circolare illuminato.
  - Supporto touch completo: rotazione a 360° del modello con drag a 1 dito; swipe rapido orizzontale per cambiare pilota.
  - In alto a sinistra: pulsante compatto `← Showroom`.
  - In alto a destra: badge della classe pilota (es. "LEGGENDARIO", "SPECIALE").
- **Selettore & Action Bar (40% inferiore):**
  - **Carosello Avatar:** Barra orizzontale a scorrimento con gli avatar dei 7 piloti; evidenziazione con anello dorato e animazione di scala per il pilota selezionato.
  - **Card Sintetica:** Nome cubitale, sottotitolo e mini-badge abilità speciale.
  - **Pulsante CTA Principale:** Grande bottone a tutta larghezza **"Gareggia con [Nome]"**.
  - **Pill Dettagli & Statistiche:** Pulsante secondario che espande un overlay trasparente con le 4 barre statistiche (Stile, Riflessi, Carisma, Tenuta) e l'indicazione dell'Easter Egg per MG (*MG Oil Chaos*).

---

## 4. Gestione dello Stato & Flusso Dati
- **Sincronizzazione Unificata:** Nessuna duplicazione dello stato Three.js; sia il layout desktop sia i componenti mobile condividono i medesimi store (`driveStore`) e state hook di `App.jsx` (`activePaintId`, `activePresetId`, `hoodOpen`, `lightingMode`, `dedication`).
- **Media Queries Pulite:** Rendering condizionale responsive basato su Tailwind (`md:hidden` per i componenti mobile, `hidden md:flex` per i componenti desktop), garantendo zero regressioni per gli utenti desktop.
- **Scroll Lock:** All'apertura del drawer o dei modali a tutto schermo viene inibito lo scroll del documento di fondo.

---

## 5. Verifica e Criteri di Collaudo
1. **Verifica Safe Area & Notch:** Test del rendering con simulatore mobile (iPhone con Dynamic Island e Android con navigation bar) verificando che nessun tasto o testo sia parzialmente coperto.
2. **Verifica Ergonomia & Touch Targets:** Tutti i pulsanti del drawer, del bottom sheet e del carosello piloti risultano facilmente cliccabili con un solo pollice (≥ 44px).
3. **Verifica Gesture 3D & Zero Conflitti:** Ruotando l'auto o il pilota su mobile non si verifica pull-to-refresh o scorrimento indesiderato della pagina.
4. **Verifica Anno 1976:** Tutti i testi, badge e intestazioni indicano coerentemente "1976".
5. **Verifica Desktop Integrity:** Su schermi desktop (≥ 768px), la TopBar classica, la barra inferiore a tutta larghezza e il selettore piloti a griglia rimangono al 100% inalterati e perfettamente funzionanti.
