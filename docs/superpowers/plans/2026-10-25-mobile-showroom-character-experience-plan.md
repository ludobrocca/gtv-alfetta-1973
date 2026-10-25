# Esperienza Mobile Showroom & Selezione Piloti Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task. It will decide whether each batch should run in parallel or serial subagent mode and will pass only task-local context to each subagent. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creare un'esperienza mobile d'eccellenza per lo Showroom 3D e la Selezione Piloti dell'Alfa Romeo Alfetta GTV (1976) pronta per App Store e Google Play Store, con barra superiore con menu hamburger, dock inferiore a schede (Bottom Sheet), stage 3D libero con carosello avatar orizzontale, Safe Area Insets e aggiornamento dell'anno storico a 1976.

**Architecture:** Approccio modulare a componenti dedicati per mobile (`MobileTopBar`, `MobileNavDrawer`, `ShowroomBottomSheet`, layout mobile in `DriverSelectModal`), integrati tramite Tailwind responsive media-queries (`md:hidden` vs `hidden md:flex`) in modo da preservare al 100% l'esperienza desktop esistente. Gestione rigorosa di viewport-fit=cover, `env(safe-area-inset-*)`, touch-action ed ergonomia a una mano.

**Tech Stack:** React 18, Three.js, @react-three/fiber, @react-three/drei, Lucide React, Tailwind CSS, Vite.

---

### Task 1: Aggiornamento Storico Anno 1976, Meta Viewport & Safe Areas CSS

**Files:**
- Modify: `index.html`
- Modify: `src/index.css`
- Modify: `src/App.jsx`
- Satisfies: `AC-001`, `AC-002`

- [ ] **Step 1: Aggiornare index.html con viewport-fit=cover e anno 1976**

Modificare il tag `<meta name="viewport">` per includere `viewport-fit=cover` e aggiornare il `<title>` da 1973 a 1976:
```html
<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
<title>Alfa Romeo Alfetta GTV (1976) • Showroom 3D & In Corsa</title>
```

- [ ] **Step 2: Aggiungere utility CSS Safe Area e prevenzione overscroll in src/index.css**

Aggiungere in `src/index.css`:
```css
html, body {
  overscroll-behavior-y: none;
  -webkit-tap-highlight-color: transparent;
}

.safe-pt {
  padding-top: max(1rem, env(safe-area-inset-top));
}

.safe-pb {
  padding-bottom: max(1rem, env(safe-area-inset-bottom));
}

.safe-pl {
  padding-left: max(1rem, env(safe-area-inset-left));
}

.safe-pr {
  padding-right: max(1rem, env(safe-area-inset-right));
}
```

- [ ] **Step 3: Aggiornare tutti i riferimenti all'anno 1976 in src/App.jsx**

Aggiornare il testo del Centro Stile a *"CENTRO STILE • MILANO 1976"* e l'intestazione a *"Alfa Romeo Alfetta GTV (1976)"*.

- [ ] **Step 4: Verificare la build Vite**

Run: `npm run build`  
Expected: Build completata con successo in `dist/`.

- [ ] **Step 5: Commit delle modifiche**

```bash
git add index.html src/index.css src/App.jsx
git commit -m "feat(mobile): configure viewport-fit=cover, safe areas and update year to 1976"
```

---

### Task 2: Componente MobileTopBar e Drawer Hamburger MobileNavDrawer

**Files:**
- Create: `src/components/mobile/MobileTopBar.jsx`
- Create: `src/components/mobile/MobileNavDrawer.jsx`
- Modify: `src/App.jsx`
- Satisfies: `AC-003`, `AC-004`, `AC-005`

- [ ] **Step 1: Creare src/components/mobile/MobileTopBar.jsx**

Implementare la barra superiore mobile compatta con:
- Padding superiore dinamico `env(safe-area-inset-top)`.
- Badge targa nera *"463880 PD"* e titolo *"Alfetta GTV (1976)"*.
- Pulsante per nascondere l'interfaccia (`EyeOff`) e pulsante Hamburger (icona a 3 barre) con touch target minimo 44x44px.

- [ ] **Step 2: Creare src/components/mobile/MobileNavDrawer.jsx**

Implementare il cassetto laterale a scorrimento dal bordo destro con:
- Backdrop scuro sfocato (`backdrop-blur-md bg-black/60`).
- Header con logo storico Alfa Romeo, badge e pulsante di chiusura `X`.
- Link rapidi alle modali:
  - 📸 *Foto Reali (9 scatti)*
  - 📋 *Scheda Tecnica Ufficiale*
  - ☀️/🌙 *Tema Illuminazione (Garage Notturno / Studio Chiaro)*
  - ✍️ *Personalizza Dedica* con input inline
  - 🔊 *Sound Motore Bialbero* toggle
  - ⚙️ *Ispezione Motore 3D* (apre il cofano controvento e centra la camera)
- Supporto chiusura via tocco su backdrop o tasto Escape.

- [ ] **Step 3: Integrare MobileTopBar e MobileNavDrawer in src/App.jsx**

Integrare i componenti in `src/App.jsx`, condizionando la barra desktop con `hidden md:flex` e la `MobileTopBar` con `block md:hidden`. Gestire lo stato `isNavDrawerOpen`.

- [ ] **Step 4: Verificare la build Vite**

Run: `npm run build`  
Expected: Build superata senza errori di bundling.

- [ ] **Step 5: Commit delle modifiche**

```bash
git add src/components/mobile/MobileTopBar.jsx src/components/mobile/MobileNavDrawer.jsx src/App.jsx
git commit -m "feat(mobile): add MobileTopBar and MobileNavDrawer hamburger menu"
```

---

### Task 3: Componente ShowroomBottomSheet (Colori, Viste & Controlli a una mano)

**Files:**
- Create: `src/components/mobile/ShowroomBottomSheet.jsx`
- Modify: `src/App.jsx`
- Satisfies: `AC-006`, `AC-007`, `AC-008`

- [ ] **Step 1: Creare src/components/mobile/ShowroomBottomSheet.jsx**

Implementare il foglio inferiore collassabile ed ergonomico con:
- **Stato Collassato:**
  - Maniglia di trascinamento (*drag handle*) centrale.
  - Indicatore del colore attivo con cerchio swatch e nome.
  - Indicatore dell'inquadratura attiva.
  - Grande pulsante rosso Alfa Romeo **"In Corsa"** con icona tachimetro.
- **Stato Espanso (tap su maniglia o swipe up):**
  - Barra tab con 3 sezioni:
    - Tab *Colori*: campioni cerchiati grandi con etichette dei codici AR storici.
    - Tab *Viste*: pulsanti camera (*Hero 3/4*, *Frontale*, *Profilo Giugiaro*, *Posteriore*, *Abitacolo Interno*, *Motore 3D*).
    - Tab *Controlli*: *Pausa/Avvia Rotazione*, *Apri/Chiudi Cofano*, *Reset Vista*.
  - Safe area padding `env(safe-area-inset-bottom)`.

- [ ] **Step 2: Integrare ShowroomBottomSheet in src/App.jsx**

Aggiornare il footer di `src/App.jsx`:
- Nascondere il footer desktop su schermi piccoli (`hidden md:block`).
- Renderizzare `<ShowroomBottomSheet />` quando `!hudHidden && sceneMode === 'showroom'` (`block md:hidden`).
- Collegare tutte le callback: `onSelectPaint`, `onSelectPreset`, `onToggleAutoRotate`, `onToggleHood`, `onResetView`, `onEnterDrive`.

- [ ] **Step 3: Verificare la build Vite**

Run: `npm run build`  
Expected: Build completata con successo.

- [ ] **Step 4: Commit delle modifiche**

```bash
git add src/components/mobile/ShowroomBottomSheet.jsx src/App.jsx
git commit -m "feat(mobile): add ShowroomBottomSheet with tabbed paint, camera and controls"
```

---

### Task 4: Ristrutturazione Mobile di DriverSelectModal (Stage 3D 60% + Carosello Touch 40%)

**Files:**
- Modify: `src/components/drive/DriverSelectModal.jsx`
- Satisfies: `AC-009`, `AC-010`, `AC-011`, `AC-012`, `AC-013`

- [ ] **Step 1: Riorganizzare il layout mobile in DriverSelectModal.jsx**

Modificare `DriverSelectModal.jsx` per applicare:
- **Zona Superiore (60% altezza su mobile):** Canvas 3D a tutto schermo con il pilota su piedistallo; touch drag abilitato per ruotare il modello a 360°; tasto `← Showroom` compatto in alto a sinistra e badge pilota in alto a destra.
- **Zona Inferiore (40% altezza su mobile):**
  - Carosello avatar orizzontale a scorrimento fluido con i 7 piloti (icone grandi, ring oro sul selezionato).
  - Nome pilota, sottotitolo e mini-badge abilità.
  - Tasto principale CTA a tutta larghezza **"Gareggia con [Nome]"**.
  - Pulsante espandibile **"Dettagli & Statistiche 📊"** per visualizzare le 4 barre attributi (Stile, Riflessi, Carisma, Tenuta) e l'Easter Egg di MG in un mini-drawer senza coprire il personaggio.
- **Preservazione Desktop:** Mantenere il layout desktop originale con classi `hidden md:flex` e applicare la vista ottimizzata con `flex md:hidden`.

- [ ] **Step 2: Aggiungere il supporto gesture swipe orizzontale per cambio pilota su mobile**

Aggiungere `onTouchStart` e `onTouchEnd` sullo stage 3D mobile per sfogliare comodamente il pilota precedente/successivo con uno swipe del dito.

- [ ] **Step 3: Verificare la build Vite**

Run: `npm run build`  
Expected: Build superata.

- [ ] **Step 4: Commit delle modifiche**

```bash
git add src/components/drive/DriverSelectModal.jsx
git commit -m "feat(mobile): redesign DriverSelectModal with 60% 3D stage and horizontal avatar carousel"
```

---

### Task 5: Collaudo Globale, Script di Verifica e Audit Funzionale

**Files:**
- Create: `scripts/verify_mobile_experience.js`
- Test: Esecuzione verifica automatizzata
- Satisfies: `AC-001` through `AC-013`

- [ ] **Step 1: Scrivere lo script di test automatizzato scripts/verify_mobile_experience.js**

Lo script verifica deterministicamente che:
1. `index.html` contenga `viewport-fit=cover` e "1976".
2. `src/App.jsx` contenga i riferimenti a "1976", importi e renderizzi `MobileTopBar`, `MobileNavDrawer`, `ShowroomBottomSheet`.
3. `src/components/mobile/MobileTopBar.jsx` e `MobileNavDrawer.jsx` esportino i componenti corretti con gestione safe-area e target touch.
4. `src/components/mobile/ShowroomBottomSheet.jsx` gestisca le 3 schede (Colori, Viste, Controlli) e il pulsante In Corsa.
5. `src/components/drive/DriverSelectModal.jsx` contenga il carosello orizzontale dei 7 piloti e il CTA di gara.

- [ ] **Step 2: Eseguire lo script di verifica**

Run: `node scripts/verify_mobile_experience.js`  
Expected: Tutti i test passano con exit code 0.

- [ ] **Step 3: Eseguire npm run build di produzione**

Run: `npm run build`  
Expected: Bundle generato senza errori.

- [ ] **Step 4: Commit finale dello script di verifica**

```bash
git add scripts/verify_mobile_experience.js
git commit -m "test: add verification script for mobile showroom and driver selection"
```
