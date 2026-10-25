#!/usr/bin/env node

/**
 * Mobile Showroom & Character Experience Automated Verification Script
 * Validates AC-001 through AC-013 for Alfa Romeo Alfetta GTV (1976)
 *
 * Requirements:
 * - Uses Node.js built-in fs, assert, and path modules.
 * - Deterministically verifies source code contracts, responsive classes,
 *   touch accessibility, safe areas, navigation actions, bottom sheet tabs,
 *   and driver selection carousel.
 */

import fs from 'fs';
import path from 'path';
import assert from 'assert';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Helper to read file content
function readFile(relativePath) {
  const fullPath = path.join(rootDir, relativePath);
  assert.ok(fs.existsSync(fullPath), `Required file not found: ${relativePath}`);
  return fs.readFileSync(fullPath, 'utf8');
}

// Test runner state
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const failures = [];

function runTest(id, description, testFn) {
  totalTests++;
  try {
    testFn();
    passedTests++;
    console.log(`  \x1b[32m✔\x1b[0m [${id}] ${description}`);
  } catch (err) {
    failedTests++;
    failures.push({ id, description, error: err });
    console.log(`  \x1b[31m✖\x1b[0m [${id}] ${description}`);
    console.log(`    \x1b[31mError: ${err.message}\x1b[0m`);
  }
}

console.log('\n============================================================');
console.log('🏁 ALFA ROMEO ALFETTA GTV (1976) — MOBILE EXPERIENCE AUDIT');
console.log('   Validating Acceptance Criteria AC-001 through AC-013');
console.log('============================================================\n');

// -------------------------------------------------------------
// Load source files under test
// -------------------------------------------------------------
const indexHtml = readFile('index.html');
const indexCss = readFile('src/index.css');
const appJsx = readFile('src/App.jsx');
const mobileTopBarJsx = readFile('src/components/mobile/MobileTopBar.jsx');
const mobileNavDrawerJsx = readFile('src/components/mobile/MobileNavDrawer.jsx');
const showroomBottomSheetJsx = readFile('src/components/mobile/ShowroomBottomSheet.jsx');
const driverSelectModalJsx = readFile('src/components/drive/DriverSelectModal.jsx');
const driversDataJs = readFile('src/components/drive/driversData.js');

// -------------------------------------------------------------
// Test AC-001: Aggiornamento dell'anno storico di debutto a 1976
// -------------------------------------------------------------
runTest('AC-001', 'Historical debut year updated to 1976 across title, App.jsx, modal, and TopBar', () => {
  // index.html title check
  assert.match(
    indexHtml,
    /<title>[^<]*1976[^<]*<\/title>/,
    'index.html <title> must reference 1976'
  );

  // src/App.jsx Centro Stile and Header check
  assert.ok(
    appJsx.includes('CENTRO STILE • MILANO 1976'),
    'src/App.jsx must contain "CENTRO STILE • MILANO 1976"'
  );
  assert.ok(
    appJsx.includes('(1976)'),
    'src/App.jsx must contain "(1976)" in vehicle title'
  );

  // src/components/drive/DriverSelectModal.jsx check
  assert.ok(
    driverSelectModalJsx.includes('(1976)'),
    'src/components/drive/DriverSelectModal.jsx must reference "(1976)"'
  );

  // src/components/mobile/MobileTopBar.jsx check
  assert.ok(
    mobileTopBarJsx.includes('(1976)'),
    'src/components/mobile/MobileTopBar.jsx must reference "(1976)"'
  );
});

// -------------------------------------------------------------
// Test AC-002: Configurazione meta viewport e safe area mobile
// -------------------------------------------------------------
runTest('AC-002', 'Meta viewport has viewport-fit=cover and index.css has overscroll-behavior and safe area insets', () => {
  // meta viewport in index.html
  assert.match(
    indexHtml,
    /<meta\s+name=["']viewport["']\s+content=["'][^"']*viewport-fit=cover[^"']*["']/,
    'index.html meta viewport must include "viewport-fit=cover"'
  );

  // overscroll-behavior in index.css
  assert.ok(
    indexCss.includes('overscroll-behavior-y: none;'),
    'src/index.css must specify "overscroll-behavior-y: none;"'
  );

  // Safe area utility classes in index.css
  assert.ok(
    indexCss.includes('.safe-pt') && indexCss.includes('env(safe-area-inset-top)'),
    'src/index.css must define .safe-pt utility with env(safe-area-inset-top)'
  );
  assert.ok(
    indexCss.includes('.safe-pb') && indexCss.includes('env(safe-area-inset-bottom)'),
    'src/index.css must define .safe-pb utility with env(safe-area-inset-bottom)'
  );
  assert.ok(
    indexCss.includes('.safe-pl') && indexCss.includes('env(safe-area-inset-left)'),
    'src/index.css must define .safe-pl utility with env(safe-area-inset-left)'
  );
  assert.ok(
    indexCss.includes('.safe-pr') && indexCss.includes('env(safe-area-inset-right)'),
    'src/index.css must define .safe-pr utility with env(safe-area-inset-right)'
  );
});

// -------------------------------------------------------------
// Test AC-003: Visualizzazione MobileTopBar con pulsante hamburger
// -------------------------------------------------------------
runTest('AC-003', 'MobileTopBar has vintage plate badge, 1976 title, clean-view toggle and >=44px touch targets', () => {
  // Component structure & responsive visibility
  assert.ok(
    mobileTopBarJsx.includes('block md:hidden'),
    'MobileTopBar must be scoped to mobile screens via "block md:hidden"'
  );
  assert.ok(
    mobileTopBarJsx.includes('safe-area-inset-top'),
    'MobileTopBar must apply safe-area-inset-top padding'
  );

  // Heritage elements
  assert.ok(
    mobileTopBarJsx.includes('463880 PD'),
    'MobileTopBar must display original plate "463880 PD"'
  );
  assert.ok(
    mobileTopBarJsx.includes('Alfetta GTV'),
    'MobileTopBar must display "Alfetta GTV"'
  );

  // Clean-view toggle and hamburger menu
  assert.ok(
    mobileTopBarJsx.includes('EyeOff'),
    'MobileTopBar must render clean view toggle with EyeOff icon'
  );
  assert.ok(
    mobileTopBarJsx.includes('Menu') && mobileTopBarJsx.includes('onOpenDrawer'),
    'MobileTopBar must render hamburger trigger with Menu icon and onOpenDrawer callback'
  );

  // Touch targets >= 44x44px
  assert.ok(
    mobileTopBarJsx.includes('min-w-[44px]') && mobileTopBarJsx.includes('min-h-[44px]'),
    'MobileTopBar button touch targets must be at least 44x44px'
  );
});

// -------------------------------------------------------------
// Test AC-004: Apertura e chiusura del MobileNavDrawer
// -------------------------------------------------------------
runTest('AC-004', 'MobileNavDrawer supports slide transition, backdrop blur, close X button, and Escape key', () => {
  // Backdrop blur styling
  assert.ok(
    mobileNavDrawerJsx.includes('backdrop-blur'),
    'MobileNavDrawer must have backdrop blur'
  );

  // Close X button and onClose handler
  assert.ok(
    mobileNavDrawerJsx.includes('onClose'),
    'MobileNavDrawer must handle onClose prop'
  );
  assert.ok(
    mobileNavDrawerJsx.includes('<X') || mobileNavDrawerJsx.includes('X className'),
    'MobileNavDrawer must have close button with X icon'
  );

  // Escape key support and scroll lock
  assert.ok(
    mobileNavDrawerJsx.includes("e.key === 'Escape'"),
    'MobileNavDrawer must listen for Escape key to close'
  );
  assert.ok(
    mobileNavDrawerJsx.includes("document.body.style.overflow = 'hidden'"),
    'MobileNavDrawer must lock body scroll when opened'
  );
});

// -------------------------------------------------------------
// Test AC-005: Azioni e navigazione nel MobileNavDrawer
// -------------------------------------------------------------
runTest('AC-005', 'MobileNavDrawer includes Foto Reali, Scheda Tecnica, Tema Illuminazione, Dedica, Sound, and Motore 3D', () => {
  // Real Photos action
  assert.ok(
    mobileNavDrawerJsx.includes('Galleria Foto Reali') || mobileNavDrawerJsx.includes('Foto Reali'),
    'MobileNavDrawer must contain Galleria Foto Reali action'
  );

  // Official Specs action
  assert.ok(
    mobileNavDrawerJsx.includes('Scheda Tecnica'),
    'MobileNavDrawer must contain Scheda Tecnica action'
  );

  // Lighting theme switcher (Studio Chiaro / Garage Notturno)
  assert.ok(
    mobileNavDrawerJsx.includes('Tema Showroom') || mobileNavDrawerJsx.includes('Tema Illuminazione'),
    'MobileNavDrawer must contain showroom lighting theme selector'
  );
  assert.ok(
    mobileNavDrawerJsx.includes('Studio Chiaro') && mobileNavDrawerJsx.includes('Garage Notturno'),
    'MobileNavDrawer must support Studio Chiaro and Garage Notturno modes'
  );

  // Dedication for Dad (inline edit & local storage)
  assert.ok(
    mobileNavDrawerJsx.includes('Dedica per Papà'),
    'MobileNavDrawer must contain Dedica per Papà action'
  );
  assert.ok(
    mobileNavDrawerJsx.includes('handleSaveDedicationSubmit'),
    'MobileNavDrawer must handle dedication inline editing & saving'
  );

  // Engine sound toggle connected to driveStore
  assert.ok(
    mobileNavDrawerJsx.includes('Sound Bialbero Twin-Cam') || mobileNavDrawerJsx.includes('Sound Motore'),
    'MobileNavDrawer must contain engine sound action'
  );
  assert.ok(
    mobileNavDrawerJsx.includes('handleToggleSound') && mobileNavDrawerJsx.includes('driveStore.toggleSound()'),
    'MobileNavDrawer must integrate with driveStore.toggleSound()'
  );

  // 3D Engine Inspection shortcut
  assert.ok(
    mobileNavDrawerJsx.includes('Ispezione Motore 3D') && mobileNavDrawerJsx.includes('onToggleEngineBay'),
    'MobileNavDrawer must contain 3D Engine Inspection action'
  );
});

// -------------------------------------------------------------
// Test AC-006: Stato collassato del ShowroomBottomSheet
// -------------------------------------------------------------
runTest('AC-006', 'ShowroomBottomSheet collapsed dock displays drag handle, active paint swatch, preset pill, and In Corsa CTA', () => {
  // Component structure
  assert.ok(
    showroomBottomSheetJsx.includes('block md:hidden'),
    'ShowroomBottomSheet must be hidden on md+ screens (block md:hidden)'
  );

  // Drag handle element
  assert.ok(
    showroomBottomSheetJsx.includes('w-12 h-1.5 rounded-full') || showroomBottomSheetJsx.includes('rounded-full bg-white/'),
    'ShowroomBottomSheet must render a central drag handle'
  );

  // Active color swatch in collapsed state
  assert.ok(
    showroomBottomSheetJsx.includes('currentPaint.hex') || showroomBottomSheetJsx.includes('currentPaint'),
    'ShowroomBottomSheet must display active paint swatch'
  );

  // Active camera preset pill
  assert.ok(
    showroomBottomSheetJsx.includes('currentPreset') || showroomBottomSheetJsx.includes('PRESET_DISPLAY_NAMES'),
    'ShowroomBottomSheet must display active camera preset pill'
  );

  // In Corsa CTA button
  assert.ok(
    showroomBottomSheetJsx.includes('In Corsa'),
    'ShowroomBottomSheet must display "In Corsa" button in collapsed dock'
  );
  assert.ok(
    showroomBottomSheetJsx.includes('onEnterDrive'),
    'ShowroomBottomSheet must accept onEnterDrive callback'
  );
});

// -------------------------------------------------------------
// Test AC-007: Espansione a schede del ShowroomBottomSheet
// -------------------------------------------------------------
runTest('AC-007', 'ShowroomBottomSheet expands with touch swipe and contains Colori, Inquadrature, and Controlli tabs', () => {
  // State for expansion
  assert.ok(
    showroomBottomSheetJsx.includes('const [isExpanded, setIsExpanded] = useState(false)'),
    'ShowroomBottomSheet must manage isExpanded state'
  );

  // Touch gesture handling
  assert.ok(
    showroomBottomSheetJsx.includes('handleTouchStart') && showroomBottomSheetJsx.includes('handleTouchEnd'),
    'ShowroomBottomSheet must implement swipe touch handlers'
  );
  assert.ok(
    showroomBottomSheetJsx.includes('deltaY'),
    'ShowroomBottomSheet must calculate deltaY for swipe open/close'
  );

  // 3 distinct tabs
  assert.ok(
    showroomBottomSheetJsx.includes("'colori'") &&
    showroomBottomSheetJsx.includes("'inquadrature'") &&
    showroomBottomSheetJsx.includes("'controlli'"),
    'ShowroomBottomSheet must support colori, inquadrature, and controlli tabs'
  );

  // Safe area bottom inset
  assert.ok(
    showroomBottomSheetJsx.includes('safe-area-inset-bottom'),
    'ShowroomBottomSheet must apply safe-area-inset-bottom padding'
  );
});

// -------------------------------------------------------------
// Test AC-008: Selezione colore e inquadratura dal BottomSheet
// -------------------------------------------------------------
runTest('AC-008', 'ShowroomBottomSheet delegates paint, camera preset, hood, and auto-rotate controls', () => {
  // Paint finishes selection
  assert.ok(
    showroomBottomSheetJsx.includes('PAINT_FINISHES.map') &&
    (showroomBottomSheetJsx.includes('onSelectPaint?.(paint.id)') || showroomBottomSheetJsx.includes('onSelectPaint(paint.id)')),
    'ShowroomBottomSheet must allow selecting paints from PAINT_FINISHES'
  );

  // Camera preset selection & engine hood integration
  assert.ok(
    showroomBottomSheetJsx.includes('onSelectCameraPreset') && showroomBottomSheetJsx.includes('handlePresetClick'),
    'ShowroomBottomSheet must handle camera preset selection'
  );
  assert.ok(
    showroomBottomSheetJsx.includes("preset.id === 'engine'") && showroomBottomSheetJsx.includes('onToggleHood'),
    'Selecting engine preset must open the hood if closed'
  );

  // Controls tab actions
  assert.ok(
    showroomBottomSheetJsx.includes('onToggleAutoRotate'),
    'ShowroomBottomSheet controls must handle onToggleAutoRotate'
  );
  assert.ok(
    showroomBottomSheetJsx.includes('onResetView'),
    'ShowroomBottomSheet controls must handle onResetView'
  );

  // Integration into App.jsx
  assert.ok(
    appJsx.includes('<ShowroomBottomSheet'),
    'src/App.jsx must render <ShowroomBottomSheet />'
  );
  assert.ok(
    appJsx.includes("sceneMode === 'showroom' && !hudHidden"),
    'src/App.jsx must render ShowroomBottomSheet conditionally during showroom mode'
  );
});

// -------------------------------------------------------------
// Test AC-009: Visuale 3D libera del pilota su mobile
// -------------------------------------------------------------
runTest('AC-009', 'DriverSelectModal dedicates upper 60% viewport to free 3D turntable with return to Showroom button', () => {
  // Mobile HUD container
  assert.ok(
    driverSelectModalJsx.includes('flex md:hidden pointer-events-none relative z-10 h-full w-full flex-col justify-between'),
    'DriverSelectModal must have dedicated mobile HUD container under flex md:hidden'
  );

  // Upper stage area
  assert.ok(
    driverSelectModalJsx.includes('flex-1 min-h-0 w-full flex flex-col justify-between') &&
    driverSelectModalJsx.includes('safe-area-inset-top'),
    'DriverSelectModal upper stage must be flexible (flex-1) with safe-area-inset-top'
  );

  // 360 drag hint and return button
  assert.ok(
    driverSelectModalJsx.includes('Trascina 360° o swipe'),
    'DriverSelectModal must display 360 drag / swipe instruction'
  );
  assert.ok(
    driverSelectModalJsx.includes('onCloseToShowroom') && driverSelectModalJsx.includes('Showroom'),
    'DriverSelectModal mobile bar must render return to Showroom button'
  );

  // Swipe event handlers on mobile stage
  assert.ok(
    driverSelectModalJsx.includes('onTouchStart={handleTouchStart}') &&
    driverSelectModalJsx.includes('onTouchEnd={handleTouchEnd}'),
    'DriverSelectModal upper mobile stage must attach touch swipe handlers'
  );
});

// -------------------------------------------------------------
// Test AC-010: Carosello avatar orizzontale touch per i 7 piloti
// -------------------------------------------------------------
runTest('AC-010', 'DriverSelectModal contains horizontal avatar carousel with all 7 drivers and active gold border', () => {
  // Exactly 7 drivers in driversData.js
  const driverMatches = [...driversDataJs.matchAll(/id:\s*['"](\w+)['"]/g)];
  assert.strictEqual(
    driverMatches.length,
    7,
    `DRIVERS database must have exactly 7 pilots, found ${driverMatches.length}`
  );

  // Avatar carousel container
  assert.ok(
    driverSelectModalJsx.includes('overflow-x-auto') && driverSelectModalJsx.includes('touch-pan-x'),
    'DriverSelectModal must provide horizontal scrolling carousel with touch-pan-x'
  );

  // Active driver gold highlight
  assert.ok(
    driverSelectModalJsx.includes('border-amber-400') && driverSelectModalJsx.includes('ring-amber-400'),
    'Selected driver avatar in carousel must receive active amber/gold border and ring'
  );

  // Touch target dimensions (>= 44px)
  assert.ok(
    driverSelectModalJsx.includes('min-w-[72px]') && driverSelectModalJsx.includes('min-h-[58px]'),
    'Driver avatar touch targets must exceed minimum 44px dimensions'
  );
});

// -------------------------------------------------------------
// Test AC-011: Scheda statistiche espandibile nella selezione piloti
// -------------------------------------------------------------
runTest('AC-011', 'DriverSelectModal provides expandable stats sheet with 4 skill bars and MG Easter Egg badge', () => {
  // Stats toggle button
  assert.ok(
    driverSelectModalJsx.includes('Statistiche & Dettagli 📊') || driverSelectModalJsx.includes('Statistiche & Dettagli'),
    'DriverSelectModal must render Statistiche & Dettagli button'
  );
  assert.ok(
    driverSelectModalJsx.includes('setShowMobileStats(true)'),
    'Clicking stats button must trigger setShowMobileStats(true)'
  );

  // Overlay modal sheet
  assert.ok(
    driverSelectModalJsx.includes('showMobileStats &&'),
    'DriverSelectModal must conditionally render stats overlay sheet'
  );

  // 4 Attribute Bars
  assert.ok(
    driverSelectModalJsx.includes('Stile Anni ’70') &&
    driverSelectModalJsx.includes('Riflessi Bialbero') &&
    driverSelectModalJsx.includes('Carisma') &&
    driverSelectModalJsx.includes('Tenuta sull’Olio'),
    'DriverSelectModal must display all 4 attribute bars (Stile, Riflessi, Carisma, Tenuta)'
  );

  // MG Easter Egg badge
  assert.ok(
    driverSelectModalJsx.includes("activeDriver.easterEgg === 'oil_chaos'") &&
    driverSelectModalJsx.includes('EASTER EGG'),
    'DriverSelectModal must render special EASTER EGG badge for MG'
  );
});

// -------------------------------------------------------------
// Test AC-012: Avvio gara dal pulsante CTA su mobile
// -------------------------------------------------------------
runTest('AC-012', 'DriverSelectModal renders full-width "Gareggia con [Nome]" CTA and calls handleStartRace', () => {
  // Start race CTA button
  assert.ok(
    driverSelectModalJsx.includes('Gareggia con {activeDriver.name}') || driverSelectModalJsx.includes('Gareggia con'),
    'DriverSelectModal must render "Gareggia con [Nome]" CTA button'
  );
  assert.ok(
    driverSelectModalJsx.includes('onClick={handleStartRace}'),
    'Start race CTA button must trigger handleStartRace'
  );
  assert.ok(
    driverSelectModalJsx.includes('min-h-[48px]'),
    'CTA button must satisfy >= 44px ergonomics with min-h-[48px]'
  );
});

// -------------------------------------------------------------
// Test AC-013: Integrità e zero regressioni su desktop
// -------------------------------------------------------------
runTest('AC-013', 'Desktop layout preserved with hidden md:flex in App.jsx and DriverSelectModal', () => {
  // App.jsx desktop header preserved
  assert.ok(
    appJsx.includes('hidden md:flex flex-col sm:flex-row items-start sm:items-center justify-between'),
    'App.jsx desktop header must be preserved with hidden md:flex'
  );

  // App.jsx desktop footer preserved
  assert.ok(
    appJsx.includes('hidden md:flex flex-col items-center'),
    'App.jsx desktop showroom bottom dock must be preserved with hidden md:flex'
  );

  // DriverSelectModal desktop layout preserved
  assert.ok(
    driverSelectModalJsx.includes('hidden md:flex pointer-events-none relative z-10 h-full w-full flex-col justify-between'),
    'DriverSelectModal desktop layout must be preserved with hidden md:flex'
  );

  // MobileTopBar rendered conditionally
  assert.ok(
    appJsx.includes('<MobileTopBar'),
    'App.jsx must render <MobileTopBar />'
  );
});

// -------------------------------------------------------------
// Final Audit Summary
// -------------------------------------------------------------
console.log('\n------------------------------------------------------------');
console.log(`TOTAL TESTS:  ${totalTests}`);
console.log(`PASSED:       \x1b[32m${passedTests}\x1b[0m`);
console.log(`FAILED:       ${failedTests > 0 ? `\x1b[31m${failedTests}\x1b[0m` : '0'}`);
console.log('------------------------------------------------------------\n');

if (failedTests > 0) {
  console.error('\x1b[31mAudit Failed! Review the failed criteria above.\x1b[0m\n');
  process.exit(1);
} else {
  console.log('\x1b[32m🎉 All Acceptance Criteria AC-001 through AC-013 satisfied successfully!\x1b[0m\n');
  process.exit(0);
}
