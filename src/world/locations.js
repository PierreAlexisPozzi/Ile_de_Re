// Lieux de l'Île de Ré, à leur position réelle (projection de geo/coast.js :
// x vers l'est, z vers le sud, 1 unité ≈ 15 m). Les villages marqués d'une
// époque y accueillent la ville détaillée de cette époque ; les autres sont
// représentés au loin par un hameau simplifié.
//
// placement : centre et orientation de la ville détaillée (rotation autour
// de l'axe vertical, en radians), ajustés pour que ses quais, sa plage ou son
// port tombent sur la vraie côte.

export const LOCATIONS = [
  {
    id: 'phare-baleines', name: 'Phare des Baleines', position: [-768, 0, -318], icon: '🗼', village: false,
    placement: { x: -760, z: -296, rot: -1.0 },
    description: "À la pointe occidentale de l'île, le grand phare de 1854 veille sur la mer des Pertuis, à côté de la vieille tour de Vauban.",
  },
  {
    id: 'portes', name: 'Les Portes-en-Ré', position: [-468, 0, -361], icon: '🏘',
    placement: { x: -468, z: -413, rot: 0 },
    description: "Le village le plus au nord, entre les bois de Trousse-Chemise et du Lizay, les dunes et le Fier d'Ars.",
  },
  {
    id: 'saint-clement', name: 'Saint-Clément-des-Baleines', position: [-694, 0, -192], icon: '🏘',
    description: "Village des marais et des dunes, au pied du phare des Baleines.",
  },
  {
    id: 'lilleau', name: 'Lilleau des Niges', position: [-438, 0, -263], icon: '🦩', village: false,
    description: "Marais et vasières du Fier d'Ars : réserve naturelle où font halte des milliers d'oiseaux migrateurs.",
  },
  {
    id: 'ars', name: 'Ars-en-Ré', position: [-564, 0, -47], icon: '⛪',
    placement: { x: -564, z: -47, rot: -Math.PI / 4 },
    description: "Le clocher noir et blanc de Saint-Étienne sert d'amer aux marins. Ancienne capitale du sel, au bord du Fier d'Ars.",
  },
  {
    id: 'loix', name: 'Loix', position: [-178, 0, -170], icon: '🏘',
    description: "Presqu'île de marais salants entre le Fier d'Ars et la Fosse de Loix. Elle fut longtemps une île à part entière.",
  },
  {
    id: 'martray', name: 'Le Martray', position: [-400, 0, -6], icon: '〰', village: false,
    description: "Le point le plus étroit de l'île : quelques dizaines de mètres entre l'océan et les marais. Autrefois, un chenal séparait ici l'île d'Ars de l'île de Ré.",
  },
  {
    id: 'couarde', name: 'La Couarde-sur-Mer', position: [-83, 0, 35], icon: '🏘',
    description: "Village du centre de l'île, entre vignes et plages de la côte sud.",
  },
  {
    id: 'saint-martin', name: 'Saint-Martin-de-Ré', position: [210, 0, -18], icon: '🏰',
    placement: { x: 205, z: -2, rot: 0 },
    description: "Capitale de l'île, ceinte des remparts de Vauban (patrimoine mondial de l'UNESCO).",
  },
  {
    id: 'bois-plage', name: 'Le Bois-Plage-en-Ré', position: [78, 0, 97], icon: '🍇',
    placement: { x: 69, z: 118, rot: -0.49 },
    description: "Cœur viticole de l'île, ouvert sur une immense plage de sable fin.",
  },
  {
    id: 'flotte', name: 'La Flotte', position: [418, 0, 90], icon: '⛵',
    placement: { x: 414, z: 111, rot: -0.5 },
    description: "Port médiéval, halles et ruines de l'abbaye cistercienne des Châteliers (1156).",
  },
  {
    id: 'fort-la-pree', name: 'Fort La Prée', position: [517, 0, 131], icon: '🛡', village: false,
    description: "Le plus ancien fort de l'île, bâti en 1625 face au continent.",
  },
  {
    id: 'sainte-marie', name: 'Sainte-Marie-de-Ré', position: [478, 0, 361], icon: '🏖',
    placement: { x: 478, z: 392, rot: 0 },
    description: "Village du sud-est, aux falaises calcaires et aux écluses à poissons.",
  },
  {
    id: 'rivedoux', name: 'Rivedoux-Plage', position: [689, 0, 311], icon: '🏘',
    description: "La porte de l'île : on y débarquait du bac, avant le pont.",
  },
  {
    id: 'sablanceaux', name: 'Pointe de Sablanceaux', position: [800, 0, 281], icon: '🌉', village: false,
    description: "Pointe orientale de l'île, où les Anglais de Buckingham débarquèrent en 1627 et où s'appuie aujourd'hui le pont.",
  },
  {
    id: 'la-rochelle', name: 'La Rochelle (continent)', position: [990, 0, 290], icon: '⚓', village: false, mainland: true,
    description: "Le continent, de l'autre côté du pertuis.",
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

// Centre et orientation de la ville détaillée d'un lieu
export function placementOf(id) {
  const l = LOCATION[id];
  return l.placement ?? { x: l.position[0], z: l.position[2], rot: 0 };
}
// Repère local d'une ville -> monde (rotation autour de l'axe vertical)
export function localToWorld(pl, lx, lz) {
  const c = Math.cos(pl.rot ?? 0), s = Math.sin(pl.rot ?? 0);
  return { x: pl.x + lx * c + lz * s, z: pl.z - lx * s + lz * c };
}
