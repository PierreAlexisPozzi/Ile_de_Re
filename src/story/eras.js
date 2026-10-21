// Les sept époques. Chaque époque se déroule dans UNE ville de l'île ; elle
// fixe aussi l'allure du paysage (essences d'arbres, marais salants, vignes,
// moulins, bunkers…), la lumière, la mer et l'ambiance sonore.

export const ERAS = [
  {
    id: 'prehistoire', name: 'Néolithique', short: 'Préhistoire', years: 'vers 4500 av. J.-C.', order: 1,
    town: 'portes', townName: 'Les Portes-en-Ré', currency: 'coquillages', currencyShort: 'coq.',
    blurb: "Un campement de chasseurs-pêcheurs au bord du Fier, entre forêt de chênes et dunes. Les premiers paysans dressent des pierres.",
    icon: '🪨',
    look: { ground: 0x5a6e34, forestFloor: 0x3a4628, saltPans: false, vines: false, trees: 'oak', treeDensity: 1.6, pines: false },
    sky: { day: 0x6aa0d0, horizon: 0xc8d4cc, night: 0x060c18 },
    sea: { deep: 0x1c4a5a, shallow: 0x4a8e8e }, fog: { color: 0xa8b8b0, density: 0.0065 },
  },
  {
    id: 'antiquite', name: 'Gaule romaine', short: 'Antiquité', years: 'IIᵉ siècle apr. J.-C.', order: 2,
    town: 'sainte-marie', townName: 'Sainte-Marie-de-Ré', currency: 'sesterces', currencyShort: 'HS',
    blurb: "Le vicus de Ratis : villa, entrepôt et petit port d'où partent le sel et le vin vers Burdigala et Mediolanum Santonum.",
    icon: '🏛',
    look: { ground: 0x76763e, forestFloor: 0x4a5032, saltPans: true, vines: true, vineGreen: 0x5e7a34, trees: 'elm', treeDensity: 0.7, pines: false },
    sky: { day: 0x5f98d0, horizon: 0xe0d4b0, night: 0x08101e },
    sea: { deep: 0x1a4a6e, shallow: 0x46a0a6 }, fog: { color: 0xc0c8c4, density: 0.005 },
  },
  {
    id: 'moyenage', name: 'Moyen Âge', short: 'Moyen Âge', years: '1190', order: 3,
    town: 'flotte', townName: 'La Flotte', currency: 'deniers', currencyShort: 'd.',
    blurb: "Sous les Plantagenêts, les moines blancs des Châteliers bâtissent leur abbaye ; le port de La Flotte vit du sel, du vin et de la pêche.",
    icon: '⚔',
    look: { ground: 0x6a6c3e, forestFloor: 0x464c2e, saltPans: true, vines: true, trees: 'oak', treeDensity: 0.8, pines: false },
    sky: { day: 0x6098c8, horizon: 0xd4ccb4, night: 0x070c1a },
    sea: { deep: 0x1a466a, shallow: 0x469aa0 }, fog: { color: 0xb4bcbc, density: 0.0058 },
  },
  {
    id: 'xvii', name: 'Grand Siècle', short: 'XVIIᵉ siècle', years: '1681', order: 4,
    town: 'saint-martin', townName: 'Saint-Martin-de-Ré', currency: 'livres', currencyShort: 'l.',
    blurb: "Vauban vient fortifier Saint-Martin : remparts en étoile, citadelle, port de guerre. Les navires hollandais chargent le sel de l'île.",
    icon: '⚜',
    look: { ground: 0x6e6c3c, forestFloor: 0x4a4e30, saltPans: true, vines: true, trees: 'elm', treeDensity: 0.5, pines: false, windmills: true },
    sky: { day: 0x6496c8, horizon: 0xdcd0b0, night: 0x080d1c },
    sea: { deep: 0x184468, shallow: 0x4496a0 }, fog: { color: 0xbcc2c0, density: 0.005 },
  },
  {
    id: 'xix', name: 'XIXᵉ siècle', short: 'XIXᵉ siècle', years: '1862', order: 5,
    town: 'ars', townName: 'Ars-en-Ré', currency: 'francs', currencyShort: 'F',
    blurb: "Apogée de l'or blanc : Ars, premier port saunier de l'île, voit partir les gabarres chargées de sel. Le phare des Baleines brille depuis 1854.",
    icon: '⚓',
    look: { ground: 0x7a7844, forestFloor: 0x464e2e, saltPans: true, vines: true, trees: 'pine', treeDensity: 0.9, pines: true, windmills: true },
    sky: { day: 0x6a9ccc, horizon: 0xe2d6b8, night: 0x080e1e },
    sea: { deep: 0x1a4a6c, shallow: 0x48a0a4 }, fog: { color: 0xc4c8c4, density: 0.0045 },
  },
  {
    id: 'wwii', name: 'Occupation', short: '1939-1945', years: '1943', order: 6,
    town: 'bois-plage', townName: 'Le Bois-Plage-en-Ré', currency: 'francs', currencyShort: 'F',
    blurb: "L'île est occupée. Le Mur de l'Atlantique bétonne les dunes, le couvre-feu tombe à 22 heures, et dans l'ombre la Résistance s'organise.",
    icon: '📻',
    look: { ground: 0x66643c, forestFloor: 0x3e4428, saltPans: true, vines: true, vineGreen: 0x6a7040, trees: 'pine', treeDensity: 0.8, pines: true, bunkers: true },
    sky: { day: 0x6a88a8, horizon: 0xb8b8ac, night: 0x050a14 },
    sea: { deep: 0x1a3e56, shallow: 0x3e8288 }, fog: { color: 0xa4aaa8, density: 0.0068 },
  },
  {
    id: 'contemporaine', name: 'Aujourd\'hui', short: 'Contemporaine', years: '2026', order: 7,
    town: 'phare-baleines', townName: 'Phare des Baleines', currency: 'euros', currencyShort: '€',
    blurb: "Pistes cyclables, réserves naturelles, patrimoine classé : l'île préserve sa mémoire… tant que l'Horloge des Marées tourne.",
    icon: '🚲',
    look: { ground: 0x828248, forestFloor: 0x4a5232, saltPans: true, vines: true, trees: 'pine', treeDensity: 1.0, pines: true, bikePaths: true, ruinedBunkers: true },
    sky: { day: 0x5f9ad6, horizon: 0xe4dcc4, night: 0x070d1e },
    sea: { deep: 0x174a72, shallow: 0x3eaab0 }, fog: { color: 0xc8d0d4, density: 0.0038 },
  },
];

export const ERA = Object.fromEntries(ERAS.map((e) => [e.id, e]));
export function getEra(id) { return ERA[id] || ERAS[6]; }
export const ERA_ORDER = ['prehistoire', 'antiquite', 'moyenage', 'xvii', 'xix', 'wwii', 'contemporaine'];
