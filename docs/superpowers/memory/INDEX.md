# Repository Memory Index — Alfa Romeo Alfetta GTV (1976)

## Architecture Overview
- **Showroom & 3D Car (`src/components/CarViewer.jsx`)**: Renders the 1976 Alfa Romeo Alfetta GTV 2.0, Bialbero engine bay, procedural emblems, and mounts `<CarPowerupVFX />` and `<DriverCharacter3D />` in drive mode.
- **Endless Runner & Burnout Gameplay Store (`src/components/drive/driveStore.js`)**: Singleton 60fps state store managing 3-lane coordinates (`laneToX`: `+X` = Left, `-X` = Right), 5-speed Transaxle gearbox (`GEAR_BANDS`, `GEAR_ACCEL`), Pilot Ultimates (`ULT_GAIN`, `ultimateTimer`), Takedown Streak & Slow-Mo Cam (`takedownStreak`, `takedownCamTimer`, `timeScale`), PS2 NFS Intro Camera (`introCamTimer`), and Scenic Zones.
- **3D Highway & Entities (`src/components/drive/DriveWorld.jsx`)**: Deforms `roadMeshRef`, `vergeLeftRef`, `vergeRightRef` per frame to follow rolling hills (`getRoadElevation(z)`), scrolls instanced fences/trees/arches, and runs collision detection for Fiat 500s, barriers, oil slicks, stunt ramps, and coins.
- **Camera Director (`src/components/drive/DriveCameraDirector.jsx`)**: Controls 3rd-person chase camera, PS2 NFS intro sweep, Takedown slow-mo zoom, and dynamic FOV/roll.
- **HUD (`src/components/drive/Speedometer.jsx`, `AlfaGearboxConsole.jsx`, `UltimateButton.jsx`)**: Banner-free diegetic HUD with Veglia Borletti speedometer, H-gate mahogany shifter console, and red mushroom Ultimate button.
- **Audio (`src/components/drive/DriveAudio.js`)**: Web Audio API procedural synthesizer for Bialbero engine notes and arcade SFX.
- **Verification Suites (`scripts/verify_*.js`)**: Headless Node.js verification scripts asserting live `driveStore` physics and source contracts.
