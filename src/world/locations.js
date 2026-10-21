// Lieux de l'Île de Ré. Coordonnées du monde : x = ouest→est, z = nord→sud
// (z négatif = côte nord, face au pertuis Breton ; z positif = côte sud,
// face au pertuis d'Antioche). L'île s'étire d'environ x = -210 à x = 210 ;
// l'isthme du Martray l'étrangle vers x = -40.

export const LOCATIONS = [
  {
    id: 'phare-baleines', name: 'Phare des Baleines', position: [-188, 0, -6], icon: '🗼',
    description: "À la pointe occidentale de l'île, le grand phare de 1854 veille sur la mer des Pertuis, à côté de la vieille tour de Vauban.",
  },
  {
    id: 'lilleau', name: 'Lilleau des Niges', position: [-138, 0, -40], icon: '🦩',
    description: "Marais et vasières du Fier d'Ars : réserve naturelle où font halte des milliers d'oiseaux migrateurs.",
  },
  {
    id: 'portes', name: 'Les Portes-en-Ré', position: [-122, 0, -18], icon: '🏘',
    description: "Village le plus au nord, entre pinèdes, dunes et le Fier d'Ars.",
  },
  {
    id: 'ars', name: 'Ars-en-Ré', position: [-78, 0, -8], icon: '⛪',
    description: "Le clocher noir et blanc de Saint-Étienne sert d'amer aux marins. Ancienne capitale du sel.",
  },
  {
    id: 'saint-martin', name: 'Saint-Martin-de-Ré', position: [8, 0, -20], icon: '🏰',
    description: "Capitale de l'île, ceinte des remparts de Vauban (patrimoine mondial de l'UNESCO).",
  },
  {
    id: 'fort-la-pree', name: 'Fort La Prée', position: [52, 0, -42], icon: '🛡',
    description: "Le plus ancien fort de l'île, bâti en 1625 face au continent.",
  },
  {
    id: 'flotte', name: 'La Flotte', position: [72, 0, -26], icon: '⛵',
    description: "Port médiéval, halles et ruines de l'abbaye cistercienne des Châteliers (1156).",
  },
  {
    id: 'bois-plage', name: 'Le Bois-Plage-en-Ré', position: [22, 0, 18], icon: '🍇',
    description: "Cœur viticole de l'île, ouvert sur une immense plage de sable fin.",
  },
  {
    id: 'sainte-marie', name: 'Sainte-Marie-de-Ré', position: [112, 0, 18], icon: '🏖',
    description: "Village du sud-est, aux falaises calcaires et aux écluses à poissons.",
  },
];

export const LOCATION = Object.fromEntries(LOCATIONS.map((l) => [l.id, l]));

export function nearestLocation(x, z, maxDist = Infinity) {
  let best = null, bestD = maxDist;
  for (const loc of LOCATIONS) {
    const d = Math.hypot(loc.position[0] - x, loc.position[2] - z);
    if (d < bestD) { bestD = d; best = loc; }
  }
  return best;
}
