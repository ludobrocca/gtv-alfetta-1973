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
  },
  {
    id: 'tex',
    name: 'Tex Willer',
    subtitle: 'Aquila della Notte',
    tagline: '«Per tutti i diavoli, Kit! Questa Alfetta corre più di Dinamite!»',
    accentColor: '#eab308',
    badge: 'RANGER',
    easterEgg: null,
  },
  {
    id: 'bond',
    name: 'James Bond',
    subtitle: 'Agente 007 • MI6',
    tagline: '«Bialbero 1.8 a doppi carburatori… agitato, non mescolato.»',
    accentColor: '#94a3b8',
    badge: '007',
    easterEgg: null,
  },
  {
    id: 'spiderman',
    name: 'L’Uomo Ragno',
    subtitle: 'Amichevole Ragno di Quartiere',
    tagline: '«Il mio senso di ragno pizzica… attenzione alle 500 in corsia!»',
    accentColor: '#ef4444',
    badge: 'MARVEL',
    easterEgg: null,
  },
  {
    id: 'diabolik',
    name: 'Diabolik',
    subtitle: 'Il Re del Terrore',
    tagline: '«Ginko non ci prenderà mai su questa GT disegnata da Giugiaro.»',
    accentColor: '#6366f1',
    badge: 'COLPO',
    easterEgg: null,
  },
  {
    id: 'callaghan',
    name: 'Isp. Callaghan',
    subtitle: 'Clint Eastwood • Dirty Harry',
    tagline: '«Coraggio… fatti sotto e fammi contento con quei 122 cavalli.»',
    accentColor: '#d97706',
    badge: 'MAGNUM',
    easterEgg: null,
  },
  {
    id: 'mg',
    name: 'Maria Grazia (MG)',
    subtitle: 'La Moglie • Special Guest',
    tagline: '«Ma chi ha versato tutto quest’olio sull’asfalto?! Tenetevi forte!»',
    accentColor: '#14b8a6',
    badge: '★ EASTER EGG OLIO',
    easterEgg: 'oil_chaos',
  },
];

export function getDriverById(id) {
  return DRIVERS.find((d) => d.id === id) || DRIVERS[0];
}
