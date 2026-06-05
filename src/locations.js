// Les 9 lieux emblématiques de l'Île de Ré.
// Coordonnées en unités du monde de jeu : x = est-ouest (positif vers l'est),
// z = nord-sud (négatif vers le nord). L'île s'étire d'environ -180 à 180 en x.

export const LOCATIONS = [
  {
    id: 'phare-baleines',
    name: 'Phare des Baleines',
    position: [-165, 0, -20],
    radius: 28,
    icon: '🗼',
    description:
      'Au bout occidental de l\'île, le phare veille sur les côtes depuis 1854. ' +
      'On dit qu\'un mécanisme ancien dort sous ses fondations.',
    historical: {
      prehistoire: 'Promontoire rocheux battu par les vents, repère des premiers chasseurs.',
      antiquite: 'Feux allumés par les marins romains pour signaler la pointe.',
      moyenage: 'Première tour de guet en bois.',
      xvii: 'Tour de Vauban en pierre (1682).',
      xix: 'Phare actuel inauguré en 1854.',
      wwii: 'Occupé, intégré au Mur de l\'Atlantique.',
      contemporaine: 'Musée, panorama à 360°, monument classé.',
    },
  },
  {
    id: 'lilleau',
    name: 'Réserve de Lilleau des Niges',
    position: [-130, 0, -45],
    radius: 40,
    icon: '🦩',
    description: 'Marais et lagunes accueillant des milliers d\'oiseaux migrateurs.',
    historical: {
      prehistoire: 'Estuaire vaseux, riche en gibier d\'eau.',
      antiquite: 'Premières salines exploitées par les Romains.',
      moyenage: 'Salines monastiques.',
      xvii: 'Réseau de marais salants étendu.',
      xix: 'Apogée du sel rétais.',
      wwii: 'Marais en partie abandonnés.',
      contemporaine: 'Réserve naturelle nationale depuis 1980.',
    },
  },
  {
    id: 'portes',
    name: 'Les Portes-en-Ré',
    position: [-115, 0, -30],
    radius: 22,
    icon: '🏘',
    description: 'Village le plus septentrional, pinède et plages sauvages.',
    historical: {
      prehistoire: 'Dunes mouvantes.',
      antiquite: 'Hameau de pêcheurs.',
      moyenage: 'Village de pêche et de sel.',
      xvii: 'Petit port de cabotage.',
      xix: 'Village de sauniers.',
      wwii: 'Position d\'observation allemande.',
      contemporaine: 'Station balnéaire familiale.',
    },
  },
  {
    id: 'ars',
    name: 'Ars-en-Ré',
    position: [-65, 0, 0],
    radius: 24,
    icon: '⛪',
    description: 'Clocher noir et blanc, ancien port du sel.',
    historical: {
      prehistoire: 'Forêt côtière.',
      antiquite: 'Carrefour de routes.',
      moyenage: 'Église Saint-Étienne (XIᵉ siècle), repère des marins.',
      xvii: 'Port d\'embarquement du sel rétais.',
      xix: 'Capitale du sel.',
      wwii: 'Occupé, blockhaus alentour.',
      contemporaine: 'Plus beau village de France.',
    },
  },
  {
    id: 'saint-martin',
    name: 'Saint-Martin-de-Ré',
    position: [10, 0, -10],
    radius: 32,
    icon: '🏰',
    description: 'Capitale fortifiée par Vauban, citadelle, port animé.',
    historical: {
      prehistoire: 'Calme baie protégée.',
      antiquite: 'Port romain mineur.',
      moyenage: 'Bourg fortifié.',
      xvii: 'Vauban dessine la citadelle et les remparts (1681).',
      xix: 'Port de pêche et d\'embarquement vers les colonies.',
      wwii: 'Citadelle bagne, occupation allemande.',
      contemporaine: 'Inscrit UNESCO (réseau Vauban).',
    },
  },
  {
    id: 'fort-la-pree',
    name: 'Fort la Prée',
    position: [40, 0, -8],
    radius: 18,
    icon: '🛡',
    description: 'Plus ancienne fortification de l\'île, 1625.',
    historical: {
      prehistoire: 'Pointe rocheuse.',
      antiquite: 'Site de débarquement.',
      moyenage: 'Tour de guet.',
      xvii: 'Fort bastionné érigé en 1625.',
      xix: 'Caserne militaire.',
      wwii: 'Bunker intégré.',
      contemporaine: 'Monument historique, expositions.',
    },
  },
  {
    id: 'flotte',
    name: 'La Flotte',
    position: [55, 0, -6],
    radius: 22,
    icon: '⛵',
    description: 'Port médiéval, marché historique, abbaye des Châteliers à proximité.',
    historical: {
      prehistoire: 'Côte abritée.',
      antiquite: 'Mouillage.',
      moyenage: 'Abbaye cistercienne des Châteliers (1156).',
      xvii: 'Port marchand prospère.',
      xix: 'Pêche et négoce du vin.',
      wwii: 'Port occupé.',
      contemporaine: 'Plus beau village de France.',
    },
  },
  {
    id: 'bois-plage',
    name: 'Le Bois-Plage-en-Ré',
    position: [25, 0, 35],
    radius: 26,
    icon: '🍇',
    description: 'Vignobles, longues plages, cœur viticole de l\'île.',
    historical: {
      prehistoire: 'Forêt de chênes.',
      antiquite: 'Vignes plantées par les Romains.',
      moyenage: 'Domaines monastiques.',
      xvii: 'Vignobles royaux.',
      xix: 'Apogée du vignoble rétais.',
      wwii: 'Champs en partie abandonnés.',
      contemporaine: 'Cave coopérative, plage de sept kilomètres.',
    },
  },
  {
    id: 'sainte-marie',
    name: 'Sainte-Marie-de-Ré',
    position: [85, 0, 25],
    radius: 24,
    icon: '🏖',
    description: 'Village côtier oriental, falaises et plages.',
    historical: {
      prehistoire: 'Falaise battue par les vents.',
      antiquite: 'Premier débarquement romain.',
      moyenage: 'Église Sainte-Marie (XIIᵉ siècle).',
      xvii: 'Bourg agricole.',
      xix: 'Village de pêcheurs.',
      wwii: 'Côte fortifiée, batteries allemandes.',
      contemporaine: 'Station balnéaire familiale.',
    },
  },
];

export const LOCATION_INDEX = Object.fromEntries(LOCATIONS.map((l, i) => [l.id, i]));

export function nearestLocation(x, z, maxDist = Infinity) {
  let best = null;
  let bestD = maxDist;
  for (const loc of LOCATIONS) {
    const dx = loc.position[0] - x;
    const dz = loc.position[2] - z;
    const d = Math.sqrt(dx * dx + dz * dz);
    if (d < bestD) { bestD = d; best = loc; }
  }
  return best;
}
