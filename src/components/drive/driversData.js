// Playable Low-Poly Drivers for "In Corsa" Arcade Mode
// Includes the 6 pop-culture icons + Maria Grazia ("MG") with the continuous Oil Slicks Easter Egg.

export const DRIVERS = [
  {
    id: 'elvis',
    name: 'Elvis',
    subtitle: 'The King of Rock ’n’ Roll',
    tagline: '«Thank you, thank you very much… giù tutto col Bialbero!»',
    accentColor: '#f59e0b',
    badge: 'KING',
    easterEgg: null,
    stats: { style: 100, reflexes: 88, charisma: 100, grip: 85 },
  },
  {
    id: 'tex',
    name: 'Tex Willer',
    subtitle: 'Aquila della Notte',
    tagline: '«Per tutti i diavoli, Kit! Questa Alfetta corre più di Dinamite!»',
    accentColor: '#eab308',
    badge: 'RANGER',
    easterEgg: null,
    stats: { style: 90, reflexes: 96, charisma: 95, grip: 92 },
  },
  {
    id: 'bond',
    name: 'James Bond',
    subtitle: 'Papà in versione Agente 007 • Smoking & Piazzetta',
    tagline: '«Bialbero 1.8 a doppi carburatori… agitato, non mescolato.»',
    accentColor: '#38bdf8',
    badge: '007',
    easterEgg: null,
    stats: { style: 100, reflexes: 95, charisma: 98, grip: 94 },
  },
  {
    id: 'spiderman',
    name: 'L’Uomo Ragno',
    subtitle: 'Papà in versione Amichevole Ragno di Quartiere',
    tagline: '«Il mio senso di ragno pizzica… attenzione alle 500 in corsia!»',
    accentColor: '#ef4444',
    badge: 'MARVEL',
    easterEgg: null,
    stats: { style: 92, reflexes: 100, charisma: 90, grip: 96 },
  },
  {
    id: 'diabolik',
    name: 'Diabolik',
    subtitle: 'Papà in versione Il Re del Terrore',
    tagline: '«Ginko non ci prenderà mai su questa GT disegnata da Giugiaro.»',
    accentColor: '#818cf8',
    badge: 'COLPO',
    easterEgg: null,
    stats: { style: 96, reflexes: 98, charisma: 94, grip: 95 },
  },
  {
    id: 'callaghan',
    name: 'Isp. Callaghan',
    subtitle: 'Papà in versione Dirty Harry • Taglio Anni ’80 & .44 Magnum',
    tagline: '«Coraggio… fatti sotto e fammi contento con quei 122 cavalli.»',
    accentColor: '#f97316',
    badge: 'MAGNUM',
    easterEgg: null,
    stats: { style: 94, reflexes: 95, charisma: 100, grip: 90 },
  },
  {
    id: 'mg',
    name: 'Maria Grazia (MG)',
    subtitle: 'La Moglie • Il Contraltare Ufficiale',
    tagline: '«Ma chi ha versato tutto quest’olio sull’asfalto?! Tenetevi forte!»',
    accentColor: '#14b8a6',
    badge: '★ EASTER EGG OLIO',
    easterEgg: 'oil_chaos',
    stats: { style: 100, reflexes: 92, charisma: 100, grip: 15 },
  },
];

export function getDriverById(id) {
  return DRIVERS.find((d) => d.id === id) || DRIVERS[0];
}
