# 1973/1976 Alfa Romeo Alfetta GTV — 100% Photo-Accurate Cockpit Implementation Plan

> **First Deliverable — Self-Contained Execution Blueprint**: This document contains every coordinate, dimension, material index, 3D mesh recipe, and 2D CanvasTexture specification needed to reproduce the interior cockpit from `WhatsApp Image 2026-10-18 at 19.39.07.jpeg` without re-analyzing the photo or guessing coordinates.

---

## 1. Visual Audit of Reference Photo (`WhatsApp Image 2026-10-18 at 19.39.07.jpeg`)

The photograph shows the iconic **1st-Series Alfetta GT / GTV (1974–1976) split-architecture cockpit** designed by Giorgetto Giugiaro:

1. **Split Instrument Binnacles (Iconic 1st-Series Feature)**:
   - **Left Pod (Driver Tachometer Binnacle)** directly behind the steering wheel (`z = +0.145`):
     - Sculpted black polyurethane anti-glare hood (`x = -0.24.. -0.145`, `y = 0.115.. 0.165`, `z = 0.095.. 0.195`).
     - Recessed silver/chrome inner rectangular bezel surrounding a single large **Veglia Borletti Contagiri (Tachometer)**.
     - **Blue dial face (`#133863`)**, white radial ticks and numerals `10, 20, 30, 40, 50, 60, 70` (`GIRI × 100`), red/orange sector from `60` to `70`, `"VEGLIA"` + `"BORLETTI"` script, white needle resting at bottom-left (`~7 o'clock`), central silver cap.
   - **Center-Left Pod (Speedometer & Auxiliary Gauges Binnacle)** mounted over the center of the dashboard (`z = -0.105.. +0.075`):
     - Wide hooded black polyurethane housing (`x = -0.25.. -0.145`, `y = 0.115.. 0.168`, `z = -0.105.. +0.075`).
     - Dark metallic/gunmetal rectangular instrument bezel held by **8 visible perimeter screws**.
     - **Left half of cluster (`z = +0.005.. +0.068`)**: Large square-framed **Speedometer (Contachilometri)** with **blue dial face (`#133863`)**, white scale `20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240` km/h, upper 5-digit odometer drum (`84665`), lower 4-digit trip drum (`0465`, last digit red), `"km/h"`, `"VEGLIA"`, white needle at rest (`20 km/h`).
     - **Right half of cluster (`z = -0.098.. +0.000`)**: 2×2 grid:
       - Top-left: **PRESS. OLIO** (`0 - 40 - 80`, blue face, white needle).
       - Bottom-left: **BENZINA** (`0 - 1/2 - 1`, blue face, red reserve sector, white needle).
       - Bottom-right: **TEMP. ACQUA** (`40 - 80 - 120`, blue face, red overheat sector, white needle).
       - Top-right: **2×2 Warning Lamp Bank** (green, red, amber, blue rectangular indicator jewels).

2. **Dashboard Fascia, Wood Veneer Strip & Far-Left Circular Vent**:
   - **Upper Dash Pad**: Matte black moulded polyurethane spanning `x = -0.305.. -0.155`, `z = -0.315.. +0.315`, `y = 0.085.. 0.125`.
   - **Far-Left Circular Air Vent (`z = +0.268, y = 0.105`)**: Black circular eyeball vent with horizontal louvers and chrome outer ring.
   - **Horizontal Mahogany Wood Veneer Strip (`InteriorWood`)**:
     - **Left Strip (`z = +0.195.. +0.245, y = 0.095.. 0.112`)**: Between the left circular vent and the tachometer pod; features a small **red warning jewel lamp** on its right end.
     - **Right Passenger Strip (`z = -0.295.. -0.105, y = 0.096.. 0.116`)**: Long polished mahogany/walnut trim bar across the passenger side with a **horizontal brushed-chrome trim strip** along its bottom edge (`y = 0.093`) and recessed passenger parcel shelf / grab handle cavity below (`y = 0.068.. 0.090`).

3. **Steering Wheel (`Volante a Calice in Legno a 3 Razze Nere`)**:
   - Center of wheel hub at `(sw_cx, sw_cy, sw_cz) = (-0.088, 0.124, 0.145)` tilted slightly upward (`~18°` around Z so the driver views the rim and tachometer cleanly).
   - **Polished Mahogany Wood Rim** (`r_major = 0.056`, tube radius `0.0052`) with dark inner finger-grip ring.
   - **3 Matte-Black Anodized Dished Spokes** at `-90°` (bottom vertical), `+15°` (left), and `+165°` (right), dished rearward from the deeper hub (`x = -0.102`) out to the wood rim (`x = -0.088`).
   - **3 Brushed Silver/Chrome Rectangular Spoke Inserts**: Each black spoke has a distinct silver metallic slot/insert plate near the outer third of the spoke (clearly visible in the photo).
   - **Central Horn Button**: Circular matte-black pad (`r = 0.017`) with a **brushed silver/gold circular Alfa Romeo Milano crest medallion** (`r = 0.0085`) in the center.
   - **Steering Column Shroud, Stalks & Ignition Switch**:
     - Black cylindrical/rectangular column housing from `x = -0.175` to `-0.104`.
     - Left & right stalks (`m_interior` + chrome tips).
     - **Silver Ignition Key Cylinder** protruding on the right side of the column shroud (`z = 0.122, y = 0.112`).

4. **Center Console Stack (HVAC Controls, Swivel Vents & Vintage Radio)**:
   - Angled central fascia panel (`x = -0.160` at top `y = 0.112` sloping down/rearward to `x = -0.130` at `y = 0.012`, centered at `z = 0.0`, width `0.156`).
   - **Top Row (`y = 0.096.. 0.110`)**: Horizontal air-distribution slider slot with a **blue `INT` bar** on the left, **orange `DEF/EXT` bar** on the right, and a central chrome slider tab.
   - **Middle Row (`y = 0.056.. 0.092`)**:
     - **Twin Circular Louvered Air Vents** at `z = +0.048` (left) and `z = -0.048` (right), radius `0.0165`, with rotatable directional vanes and white `"CLOSE FOR MAX DEF"` stencil text underneath.
     - **Two Central Vertical Rotary Knobs** at `z = 0.0`: upper knob (`y = 0.083`) with **orange arc scale**, lower knob (`y = 0.063`) with **light-blue arc scale**.
   - **Lower Row (`y = 0.020.. 0.050`)**: **1970s Car Radio Receiver**:
     - Brushed gunmetal/black DIN faceplate (`z = -0.059.. +0.059`), left/right chrome-ringed tuning & volume rotary knobs (`z = ±0.046`), black preset pushbuttons, illuminated dial scale with colored indicator dots.

5. **Transmission Tunnel, Wooden Gear Lever, Handbrake, Carpet & Seats**:
   - **Burgundy / Reddish-Brown Lower Carpet (`InteriorCarpet`, material index `11`)**: Lines the lower footwell firewall, inner sill walls, and lower sides of the transmission tunnel.
   - **Black Ribbed Grid Rubber Floor Mats (`RubberBlack`)**: Driver (`z = +0.06.. +0.27`) and passenger (`z = -0.27.. -0.06`) floor mats with moulded rectangular grid ribs.
   - **3 Driver Pedals (`z = +0.096.. +0.192, x = -0.235`)**: Clutch, Brake, and tall floor-mounted Accelerator pedal.
   - **Transmission Tunnel Console (`x = -0.14.. +0.22, z = -0.055.. +0.055`)**:
     - **Rectangular Chrome Shift Boot Bezel** at `x = -0.032, y = 0.024, z = 0.0`.
     - **Pleated Black Leather Shift Boot (`Cuffia Cambio`)**: 4-stepped pyramidal bellows rising from the chrome bezel to `y = 0.046`.
     - **Chrome Gear Lever Shaft** + **Polished Wooden Pear-Shaped Shift Knob (`Pomello in Legno`)** at `(-0.016, 0.092, 0.002)` with a black/white **5-speed + R shift pattern insert medallion** on top.
     - **Cigarette Lighter / Accessory Knob** at rear-right corner of the shift bezel (`x = -0.002, y = 0.026, z = -0.022`).
     - **Handbrake Lever (`Freno a Mano`)** behind the shift bezel at `[0.075, 0.036, -0.018]`.
   - **Front Bucket Seats with Cream/White Covers (`InteriorSeatCream`, material index `12`)**: Light cream/ivory fabric seat covers (`#e5e0d5`) visible at bottom of frame.
   - **Interior Door Cards (`InteriorDoorTan`, material index `13`)**: Olive-tan door panel with black armrest and chrome window crank handle.

---

## 2. Coordinate System Reference

- **Local CAD Space (`scripts/build_alfetta_gtv_glb.py` & child meshes inside `<group rotation={[0, Math.PI / 2, 0]}>` in `CarViewer.jsx`)**:
  - `X`: `-X` is Front (`-0.955`), `+X` is Rear (`+0.932`). Dashboard faces `+X`.
  - `Y`: Vertical (`-0.112` cabin floor, `+0.125` steering wheel center, `+0.278` roof peak).
  - `Z`: Lateral (`+Z` is Left/Driver side `+0.145`, `-Z` is Right/Passenger side `-0.145`).
- **World Camera Space (`CAMERA_PRESETS` in `src/components/CarViewer.jsx`)**:
  - `X_world = +z_cad`
  - `Y_world = y_cad + 0.228`
  - `Z_world = -x_cad`
  - **Cockpit Camera Preset (`id: 'cockpit'`, label: `'Abitacolo'`)**:
    - `position: [0.055, 0.385, -0.055]`
    - `target: [0.085, 0.325, 0.22]`

---

## 3. Execution Steps

1. **`scripts/build_alfetta_gtv_glb.py`**:
   - Add `m_carpet` (idx 11), `m_seat_cream` (idx 12), `m_door_tan` (idx 13).
   - Build complete 3D cockpit in Section 6 (split binnacles, mahogany wood strips, far-left round vent, sloped center console with twin round vents + knobs + radio, tunnel with chrome bezel + pleated leather boot + angled chrome shaft + lathe-turned wooden pear knob + lighter + handbrake, 3 pedals, ribbed floor mats, burgundy carpet, cream front seat covers, olive-tan door panels with chrome window cranks, 3-spoke dished wooden steering wheel with silver spoke inserts and column stalks, interior rearview mirror).
   - Run `python3 scripts/build_alfetta_gtv_glb.py`.
2. **`src/components/CarViewer.jsx`**:
   - Register `InteriorCarpet`, `InteriorSeatCream`, `InteriorDoorTan` in `createShowroomMaterials()`.
   - Add `<CockpitInstrumentsAndDetails />` with procedural `CanvasTexture`s for the blue Veglia tachometer, center speedometer + 3 aux gauges + warning lights + 8 bezel screws, HVAC slider/knobs + `"CLOSE FOR MAX DEF"` + radio dial, 5-speed shift knob medallion, and steering wheel Alfa Romeo horn emblem.
   - Add `'cockpit'` (`label: 'Abitacolo'`) preset to `CAMERA_PRESETS`, lower `near` plane to `0.015` and `minDistance` to `0.05` when in cockpit view, and add an interior soft point light.
3. **Rebuild & Verify**:
   - Run `docker compose up -d --build` and verify `http://localhost:8080/?preset=cockpit&rotate=0` in headless Chrome against `WhatsApp Image 2026-10-18 at 19.39.07.jpeg`.
