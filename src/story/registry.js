// Registre central du contenu narratif : objets, entrées du carnet, quêtes,
// dialogues, PNJ et boutiques de toutes les époques. Chaque fichier d'époque
// (story/eras/*.js) y déclare son contenu ; les moteurs n'y accèdent que
// par ces tables. Ajouter une époque = ajouter un fichier et l'importer
// dans story/index.js.

export const ITEMS = {};
export const CODEX = {};
export const QUESTS = {};
export const DIALOGUES = {};
export const NPCS = {};
export const SHOPS = {};
export const RIDDLES = {};
export const EXTRAS = {};      // figurants par époque
export const ERA_HOOKS = {};   // { onEnter(api) } par époque

export const shopKey = (era, id) => `${era}:${id}`;

// Avertit si deux époques déclarent le même identifiant (ils s'écraseraient)
function checkDuplicates(pack) {
  const tables = { items: ITEMS, codex: CODEX, dialogues: DIALOGUES, riddles: RIDDLES };
  for (const [k, table] of Object.entries(tables)) {
    for (const id of Object.keys(pack[k] || {})) if (table[id]) console.warn(`Doublon (${k}) : « ${id} » redéfini par ${pack.era}`);
  }
  for (const n of pack.npcs || []) if (NPCS[n.id]) console.warn(`Doublon (PNJ) : « ${n.id} » redéfini par ${pack.era}`);
  for (const q of pack.quests || []) if (QUESTS[q.id]) console.warn(`Doublon (quête) : « ${q.id} »`);
}

export function register(pack) {
  checkDuplicates(pack);
  Object.assign(ITEMS, pack.items || {});
  Object.assign(CODEX, pack.codex || {});
  Object.assign(DIALOGUES, pack.dialogues || {});
  // les boutiques sont propres à chaque époque (« boulangerie » existe en 1681, 1862 et 1943)
  for (const [id, shop] of Object.entries(pack.shops || {})) SHOPS[shopKey(pack.era, id)] = { id, era: pack.era, ...shop };
  Object.assign(RIDDLES, pack.riddles || {});
  for (const q of pack.quests || []) QUESTS[q.id] = { era: pack.era, ...q };
  for (const n of pack.npcs || []) NPCS[n.id] = { era: pack.era, ...n };
  if (pack.extras) EXTRAS[pack.era] = pack.extras;
  if (pack.onEnter || pack.onUpdate) ERA_HOOKS[pack.era] = { onEnter: pack.onEnter, onUpdate: pack.onUpdate };
}

// Catégories d'objets de l'inventaire
export const ITEM_TYPES = {
  fragment: { name: 'Fragments du Temps', order: 0 },
  artefact: { name: 'Artefacts', order: 1 },
  carte: { name: 'Cartes anciennes', order: 2 },
  document: { name: 'Documents historiques', order: 3 },
  outil: { name: 'Outils', order: 4 },
  ressource: { name: 'Ressources de quête', order: 5 },
  anachronisme: { name: 'Anachronismes', order: 6 },
  consommable: { name: 'Provisions', order: 7 },
};

export const CODEX_CATS = {
  histoire: 'Histoire',
  lieux: 'Lieux et monuments',
  metiers: 'Métiers et savoir-faire',
  personnages: 'Personnages',
  faune: 'Faune',
  flore: 'Flore',
  vie: 'Vie quotidienne',
};
