# Alfa Romeo Alfetta GTV (1973) — Luxury 3D Showroom

Esposizione digitale 3D interattiva dedicata alla leggendaria **Alfa Romeo Alfetta GTV (1973)** disegnata da *Giorgetto Giugiaro (Italdesign)*, progettata con estetica editoriale **Museo Storico Alfa Romeo — Arese** e **Centro Stile Alfa Romeo**.

---

## 📁 Dove posizionare il modello 3D (`.glb`)

Posiziona il file `.glb` del modello 3D (es. esportato da **Meshy AI** o Blender) nel seguente percorso:

```text
public/models/alfa-romeo-1973.glb
```

### Caratteristiche di caricamento e normalizzazione automatica
- **Auto-Fitting & Centratura (`<Bounds>` + `<Center top>`)**: Qualsiasi siano la scala o l'origine del file `.glb` esportato da Meshy AI, la scena calcola automaticamente il bounding box del modello, lo poggia esattamente sul pavimento riflettente a quota `y = 0` e adatta l'inquadratura della telecamera.
- **Ricalcolo automatico delle Normali (`computeVertexNormals`)**: Se una mesh del file `.glb` è priva di attributi normali, lo showroom le genera automaticamente in fase di caricamento per garantire riflessi speculari e illuminazione PBR ottimali.
- **Verniciatura Configurabile Live**: È possibile mantenere la **Texture Originale GLB** di Meshy AI oppure applicare le vernici storiche *clearcoat* Alfa Romeo 1973 (*Rosso Alfa AR-501*, *Giallo Piper AR-116*, *Blu Pervinca Metallizzato*, *Argento Metallizzato*, *Verde Oliva Metallizzato*).
- **Fallback Geometrico Integrato**: Se il file `public/models/alfa-romeo-1973.glb` non è ancora presente, lo showroom mostra automaticamente una scultura low-poly della silhouette *Fastback Giugiaro 1973* e consente anche di trascinare qualsiasi file `.glb` direttamente nella finestra del browser (**Drag & Drop**).

---

## 🐳 Avvio con Docker (Consigliato)

L'applicazione è completamente containerizzata con un build multi-stage (`Node 20 Alpine` + `Nginx 1.27 Alpine` configurato con MIME type `model/gltf-binary` e compressione Gzip).

### 1. Avvia lo Showroom in Produzione
```bash
docker compose up -d --build
```
Apri il browser su: **[http://localhost:8080](http://localhost:8080)**

> 💡 **Hot-Swap del modello `.glb` senza rebuild**: La cartella `./public/models` è montata come volume in `/usr/share/nginx/html/models`. Se sostituisci o aggiorni `public/models/alfa-romeo-1973.glb`, ti basta ricaricare la pagina del browser per visualizzare il nuovo modello!

### 2. Ferma il Container
```bash
docker compose down
```

### 3. Modalità Sviluppo in Docker (Vite HMR)
Se desideri modificare il codice sorgente con Hot Module Replacement (HMR) dentro Docker:
```bash
docker compose --profile dev up
```
Apri il browser su: **[http://localhost:5173](http://localhost:5173)**

---

## 💻 Avvio Locale (Node.js + Vite)

Se preferisci eseguire il progetto direttamente sulla tua macchina locale (richiede **Node.js 18+**):

```bash
# 1. Installa le dipendenze
npm install

# 2. Avvia il server di sviluppo Vite
npm run dev
```

Per generare la build di produzione locale:
```bash
npm run build
npm run preview
```

---

## 🎛️ Funzionalità Principali dello Showroom

- **4 Viste Telecamera Cinematografiche**: *3/4 Anteriore*, *Profilo Giugiaro*, *Coda Tronca*, *Dettaglio Scudetto*.
- **3 Ambientazioni Luminose**: *Showroom Arese (Studio)*, *Tramonto Italiano (Golden Hour)*, *Galleria Notturna (Dramatic)*.
- **6 Finiture Carrozzeria**: *Texture Originale GLB* + 5 colori autentici Alfa Romeo 1973.
- **Hotspot Tecnici 3D Interattivi**: Scudetto & Doppio Faro, Motore Bialbero 1.8L (122 CV), Linea Fastback Giugiaro, Schema Transaxle & Ponte De Dion.
- **Strumenti di Ispezione**: Modalità *Wireframe* per ispezionare la topologia della mesh, controllo intensità fari e rotazione automatica su pedana.
