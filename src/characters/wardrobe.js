// Garde-robe par époque : archétypes de costumes (métier + époque) qui
// produisent une « spec » de personnage pour rig.js. Les PNJ de l'histoire
// partent d'un archétype puis précisent visage, coiffure, couleurs.
//
//  look('xix', 'sauniere', { hair: {...}, face: {...} })

export const SKIN = {
  fair: 0xf0d0b8, light: 0xe6c0a2, medium: 0xcfa284, tan: 0xb08468, olive: 0xc29c7c, deep: 0x7e5640,
};
export const HAIR = {
  black: 0x18120e, dark: 0x2e2016, brown: 0x4e3420, chestnut: 0x6e4226, auburn: 0x8a4422,
  blond: 0xc4a062, fair: 0xd8c08a, red: 0xa04a22, grey: 0x9a948c, white: 0xd8d4cc,
};
export const EYES = { brown: 0x4a3020, hazel: 0x6a5a2a, blue: 0x4a6e96, green: 0x4a6e4a, grey: 0x6a7a82, dark: 0x2a1a10 };

// fusion : les clés d'outfit sont fusionnées une à une, le reste remplacé
export function merge(a, b) {
  if (!b) return a;
  const out = { ...a, ...b };
  if (a.outfit || b.outfit) {
    out.outfit = { ...(a.outfit || {}), ...(b.outfit || {}) };
    for (const k of Object.keys(b.outfit || {})) if (b.outfit[k] === null) delete out.outfit[k];
  }
  if (a.props || b.props) out.props = { ...(a.props || {}), ...(b.props || {}) };
  if (a.face || b.face) out.face = { ...(a.face || {}), ...(b.face || {}) };
  return out;
}

const W = {
  // ================= PRÉHISTOIRE (Néolithique) =================
  prehistoire: {
    hunter: () => ({
      sex: 'm', skin: SKIN.tan, hair: { style: 'messy', color: HAIR.dark }, beard: { style: 'short', color: HAIR.dark },
      face: { dirt: true },
      outfit: {
        top: { c: 0x6a4a2c, p: 'fur' }, sleeves: 'none',
        tunic: { c: 0x5e4228, p: 'fur', len: 0.42, flare: 0.5 },
        bottom: { c: 0x6a4a30, p: 'leather' }, legs: 'wrapped', wraps: { c: 0x7a5a3a, p: 'leather' },
        shoes: { type: 'wrap', c: 0x6a4a2a }, belt: { c: 0x4a3420, buckle: null },
        necklace: { type: 'bone' },
      },
      props: { right: 'spear' },
    }),
    sage: () => ({
      sex: 'f', age: 'old', skin: SKIN.tan, hair: { style: 'long', color: HAIR.grey }, eyes: EYES.grey,
      outfit: {
        top: { c: 0x8a6a4a, p: 'leather' }, sleeves: 'short',
        robe: { c: 0x76583a, p: 'leather', len: 0.88, flare: 0.8 },
        cape: { c: 0x8a7a68, p: 'fur', len: 0.95 },
        shoes: { type: 'wrap', c: 0x6a4a2a }, necklace: { type: 'shells' },
      },
      hat: { type: 'headband', c: 0x6a4a2a, c2: 0x2a2a2a },
      props: { right: 'staff' },
    }),
    knapper: () => ({
      sex: 'f', skin: SKIN.tan, hair: { style: 'braids', color: HAIR.chestnut }, face: { dirt: true },
      outfit: {
        top: { c: 0x9a7a52, p: 'leather' }, sleeves: 'none',
        skirt: { c: 0x8a6a42, p: 'leather', len: 0.55, flare: 0.5 },
        legs: 'bare', shoes: { type: 'wrap', c: 0x6a4a2a }, necklace: { type: 'shells' },
        belt: { c: 0x4a3420, buckle: null },
      },
      props: { right: 'flint' },
    }),
    fisher: () => ({
      sex: 'm', skin: SKIN.tan, hair: { style: 'long', color: HAIR.brown }, beard: { style: 'full', color: HAIR.brown },
      outfit: {
        top: { c: 0x7a6044, p: 'leather' }, sleeves: 'none',
        tunic: { c: 0x6a5038, p: 'leather', len: 0.4, flare: 0.45 },
        legs: 'bare', shoes: { type: 'bare' }, belt: { c: 0x4a3420, buckle: null },
      },
      props: { right: 'net' },
    }),
    potter: () => ({
      sex: 'f', skin: SKIN.medium, hair: { style: 'bun', color: HAIR.dark },
      outfit: {
        top: { c: 0xa08860, p: 'linen' }, sleeves: 'short',
        robe: { c: 0x8a7050, p: 'linen', len: 0.85, flare: 0.7 },
        shoes: { type: 'wrap', c: 0x6a4a2a }, necklace: { type: 'shells' },
      },
      props: { left: 'basket' },
    }),
    child: () => ({
      sex: 'm', age: 'child', skin: SKIN.tan, hair: { style: 'messy', color: HAIR.chestnut }, face: { dirt: true },
      outfit: {
        top: { c: 0x8a6a46, p: 'leather' }, sleeves: 'none',
        tunic: { c: 0x7a5a3a, p: 'leather', len: 0.32, flare: 0.4 },
        legs: 'bare', shoes: { type: 'bare' },
      },
    }),
    elder: () => ({
      sex: 'm', age: 'old', skin: SKIN.tan, hair: { style: 'long', color: HAIR.grey }, beard: { style: 'full', color: HAIR.white },
      outfit: {
        top: { c: 0x6a5a48, p: 'fur' }, sleeves: 'short',
        robe: { c: 0x5e4a36, p: 'leather', len: 0.8, flare: 0.6 },
        cape: { c: 0x9a8a78, p: 'fur', len: 0.8 },
        shoes: { type: 'wrap' }, necklace: { type: 'bone' },
      },
      props: { right: 'staff' },
    }),
  },

  // ================= ANTIQUITÉ (Gaule romaine, Santons) =================
  antiquite: {
    merchant: () => ({
      sex: 'm', skin: SKIN.olive, hair: { style: 'crop', color: HAIR.black }, eyes: EYES.dark,
      outfit: {
        top: { c: 0xece6d8, p: 'linen' }, sleeves: 'short',
        robe: { c: 0xf2eee2, p: 'wool', len: 0.88, flare: 0.75 },
        toga: { c: 0xf2eee2, p: 'wool' },
        legs: 'bare', shoes: { type: 'sandal' },
      },
      props: { left: 'tablet' },
    }),
    worker: () => ({
      sex: 'm', skin: SKIN.tan, hair: { style: 'crop', color: HAIR.brown }, face: { stubble: true },
      outfit: {
        top: { c: 0xa8824e, p: 'linen' }, sleeves: 'short',
        tunic: { c: 0xa07a48, p: 'linen', len: 0.5, flare: 0.5 },
        belt: { c: 0x5a3a20, buckle: null }, legs: 'bare', shoes: { type: 'sandal' },
      },
    }),
    matron: () => ({
      sex: 'f', skin: SKIN.olive, hair: { style: 'bun', color: HAIR.dark }, eyes: EYES.brown, face: { makeup: true },
      outfit: {
        top: { c: 0x8e3434, p: 'wool' }, sleeves: 'short',
        robe: { c: 0x8e3434, p: 'wool', len: 0.96, flare: 0.8 },
        shoes: { type: 'sandal' }, necklace: { type: 'pearls' },
      },
      hat: { type: 'palla', c: 0x7a5a3a },
    }),
    tavern: () => ({
      sex: 'f', skin: SKIN.medium, hair: { style: 'bun', color: HAIR.chestnut },
      outfit: {
        top: { c: 0x3a5a7a, p: 'wool' }, sleeves: 'short',
        robe: { c: 0x3a5a7a, p: 'wool', len: 0.95, flare: 0.8 },
        apron: { c: 0xd8ccb0, p: 'linen', len: 0.7 },
        shoes: { type: 'sandal' },
      },
      props: { right: 'mug' },
    }),
    gaul: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'long', color: HAIR.auburn }, beard: { style: 'gaulish', color: HAIR.auburn },
      eyes: EYES.blue,
      outfit: {
        top: { c: 0x5a6e42, p: 'wool' }, sleeves: 'long',
        tunic: { c: 0x5a6e42, p: 'wool', len: 0.48, flare: 0.5 },
        bottom: { c: 0x8a5a2a, p: 'check', c2: 0x3a5a2a }, legs: 'trousers',
        cape: { c: 0x8a3a22, p: 'check', c2: 0x3a2a1a, len: 0.85, fibula: 0xd4a857 },
        shoes: { type: 'wrap', c: 0x5a3a20 }, necklace: { type: 'torque' },
        belt: { c: 0x4a3420, buckle: 0xc8a050 },
      },
      props: { right: 'staff' },
    }),
    customs: () => ({
      sex: 'm', skin: SKIN.olive, hair: { style: 'crop', color: HAIR.dark }, face: { expression: 'stern' },
      outfit: {
        top: { c: 0x8a2a22, p: 'wool' }, sleeves: 'short',
        tunic: { c: 0x8a2a22, p: 'wool', len: 0.5, flare: 0.45 },
        belt: { c: 0x3a2a1a, buckle: 0xd8c070 },
        cape: { c: 0x6a4a2a, p: 'wool', len: 0.62 },
        legs: 'bare', shoes: { type: 'sandal' },
      },
      props: { left: 'tablet' },
    }),
    sailor: () => ({
      sex: 'm', skin: SKIN.tan, hair: { style: 'short', color: HAIR.black }, beard: { style: 'short', color: HAIR.black },
      outfit: {
        top: { c: 0xc8b896, p: 'linen' }, sleeves: 'none',
        tunic: { c: 0xc0ae8a, p: 'linen', len: 0.45, flare: 0.45 },
        legs: 'bare', shoes: { type: 'bare' }, belt: { c: 0x5a3a20, buckle: null },
      },
      hat: { type: 'pileus', c: 0x8a6a3a },
    }),
    child: () => ({
      sex: 'f', age: 'child', skin: SKIN.olive, hair: { style: 'braids', color: HAIR.dark },
      outfit: {
        top: { c: 0xd8c08a, p: 'linen' }, sleeves: 'short',
        robe: { c: 0xd8c08a, p: 'linen', len: 0.62, flare: 0.6 },
        shoes: { type: 'sandal' }, necklace: { type: 'pearls' },
      },
    }),
    saunier: () => ({
      sex: 'm', skin: SKIN.tan, hair: { style: 'short', color: HAIR.brown }, beard: { style: 'short', color: HAIR.brown },
      outfit: {
        top: { c: 0xd8d0bc, p: 'linen' }, sleeves: 'short',
        tunic: { c: 0xd0c8b2, p: 'linen', len: 0.48, flare: 0.5 },
        belt: { c: 0x5a3a20, buckle: null }, legs: 'bare', shoes: { type: 'sandal' },
      },
      hat: { type: 'straw', c: 0xc8b078, c2: 0x6a4a2a },
      props: { right: 'rake' },
    }),
  },

  // ================= MOYEN ÂGE (vers 1190) =================
  moyenage: {
    monk: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'tonsure', color: HAIR.brown },
      outfit: {
        // moines cisterciens : coule blanche (laine non teinte) et scapulaire noir
        top: { c: 0xe6e1d4, p: 'wool' }, sleeves: 'long',
        robe: { c: 0xe6e1d4, p: 'wool', len: 0.97, flare: 0.7 },
        scapular: { c: 0x1e1c1a, p: 'wool' },
        collar: { type: 'cowl', c: 0xe6e1d4 },
        belt: { c: 0x3a2a1a, buckle: null }, shoes: { type: 'sandal' },
      },
    }),
    peasant: () => ({
      sex: 'm', skin: SKIN.medium, hair: { style: 'short', color: HAIR.brown }, beard: { style: 'short', color: HAIR.brown },
      outfit: {
        top: { c: 0x8a6a3a, p: 'wool' }, sleeves: 'long',
        tunic: { c: 0x8a6a3a, p: 'wool', len: 0.48, flare: 0.5 },
        bottom: { c: 0x5a4a3a, p: 'wool' }, legs: 'hose',
        belt: { c: 0x3a2a1a, buckle: 0x8a8a8a }, shoes: { type: 'shoe', c: 0x4a3420 },
      },
      hat: { type: 'chaperon', c: 0x5a7a3a },
    }),
    peasantwoman: () => ({
      sex: 'f', skin: SKIN.light, hair: { style: 'bun', color: HAIR.chestnut },
      outfit: {
        top: { c: 0x6a5a8a, p: 'wool' }, sleeves: 'long',
        robe: { c: 0x6a5a8a, p: 'wool', len: 0.96, flare: 0.8 },
        apron: { c: 0xd8d0b8, p: 'linen', len: 0.68 },
        belt: { c: 0x3a2a1a, buckle: null }, shoes: { type: 'shoe', c: 0x4a3420 },
      },
      hat: { type: 'veil', c: 0xf0ece0 },
    }),
    merchant: () => ({
      sex: 'f', skin: SKIN.fair, hair: { style: 'bun', color: HAIR.auburn }, eyes: EYES.green,
      outfit: {
        top: { c: 0x2e4478, p: 'velvet' }, sleeves: 'long',
        robe: { c: 0x2e4478, p: 'wool', len: 0.98, flare: 0.9 },
        cape: { c: 0x7a2a2a, p: 'wool', len: 1.0, fibula: 0xd4a857 },
        belt: { c: 0x5a2a1a, buckle: 0xd4a857 }, shoes: { type: 'shoe', c: 0x3a2418 },
        necklace: { type: 'cross', c: 0xd4a857 },
      },
      hat: { type: 'wimple', c: 0xf2efe6 },
    }),
    smith: () => ({
      sex: 'm', build: 'stout', skin: SKIN.medium, hair: { style: 'short', color: HAIR.black }, beard: { style: 'full', color: HAIR.black },
      face: { dirt: true },
      outfit: {
        top: { c: 0xc8b896, p: 'linen' }, sleeves: 'rolled',
        bottom: { c: 0x4a3a2a, p: 'wool' }, legs: 'hose',
        apron: { c: 0x5a3a22, p: 'leather', len: 0.62, bib: true },
        belt: { c: 0x2a1a10, buckle: 0x8a8a8a }, shoes: { type: 'boot', c: 0x3a2a1a },
      },
      props: { right: 'hammer' },
    }),
    sergeant: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'short', color: HAIR.brown }, beard: { style: 'short', color: HAIR.brown },
      face: { expression: 'stern' },
      outfit: {
        top: { c: 0xb8a882, p: 'quilted' }, sleeves: 'long',
        tunic: { c: 0x8a2222, p: 'wool', len: 0.52, flare: 0.5 },
        bottom: { c: 0x4a4a4a, p: 'wool' }, legs: 'hose',
        belt: { c: 0x2a1a10, buckle: 0x8a8a8a }, shoes: { type: 'boot', c: 0x3a2a1a },
      },
      hat: { type: 'kettle' },
      props: { right: 'pike', left: 'sword' },
    }),
    knight: () => ({
      sex: 'm', skin: SKIN.fair, hair: { style: 'short', color: HAIR.blond }, beard: { style: 'short', color: HAIR.blond }, eyes: EYES.blue,
      outfit: {
        top: { c: 0xa0a4a8, p: 'mail' }, sleeves: 'long',
        tunic: { c: 0xa8241e, p: 'wool', len: 0.6, flare: 0.6 },
        bottom: { c: 0xa0a4a8, p: 'mail' }, legs: 'hose',
        cape: { c: 0x2a3a6a, p: 'wool', len: 1.05, fibula: 0xd4a857 },
        belt: { c: 0x2a1a10, buckle: 0xd4a857 }, shoes: { type: 'boot', c: 0x2a1a10 },
      },
      props: { left: 'sword' },
    }),
    fisherman: () => ({
      sex: 'm', skin: SKIN.tan, hair: { style: 'short', color: HAIR.dark }, beard: { style: 'full', color: HAIR.dark },
      outfit: {
        top: { c: 0x6a7a8a, p: 'wool' }, sleeves: 'rolled',
        tunic: { c: 0x5a6a7a, p: 'wool', len: 0.45, flare: 0.45 },
        bottom: { c: 0x6a5a42, p: 'wool' }, legs: 'hose',
        belt: { c: 0x3a2a1a, buckle: null }, shoes: { type: 'bare' },
      },
      hat: { type: 'chaperon', c: 0x8a3a2a },
      props: { right: 'net' },
    }),
    pilgrim: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'short', color: HAIR.grey },
      outfit: {
        top: { c: 0x7a7a7a, p: 'wool' }, sleeves: 'long',
        robe: { c: 0x6e6e70, p: 'wool', len: 0.9, flare: 0.7 },
        cape: { c: 0x5a5a5e, p: 'wool', len: 1.0 },
        belt: { c: 0x3a2a1a, buckle: null }, shoes: { type: 'shoe', c: 0x3a2a1a },
        bag: { type: 'satchel', c: 0x6a5a42 },
      },
      hat: { type: 'pilgrim', c: 0x5a5a5e },
      props: { right: 'pilgrimstaff' },
    }),
    child: () => ({
      sex: 'm', age: 'child', skin: SKIN.light, hair: { style: 'short', color: HAIR.blond },
      outfit: {
        top: { c: 0x9a8a5a, p: 'wool' }, sleeves: 'long',
        tunic: { c: 0x9a8a5a, p: 'wool', len: 0.35, flare: 0.4 },
        bottom: { c: 0x6a5a42, p: 'wool' }, legs: 'hose', shoes: { type: 'shoe', c: 0x4a3420 },
      },
    }),
  },

  // ================= XVIIᵉ SIÈCLE (1681) =================
  xvii: {
    vauban: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'wig', color: 0x4a3222, keepColor: true }, eyes: EYES.brown,
      face: { scar: true, expression: 'stern' },
      outfit: {
        top: { c: 0x8a2a22, p: 'velvet' }, sleeves: 'long',
        coat: { c: 0x4c4f5e, p: 'wool', len: 0.5, gap: 0.5, flare: 0.8 },
        cuffs: { c: 0x8a2a22, p: 'velvet' },
        buttons: { c: 0xd4a857, n: 7, y0: -0.04, y1: 0.36 },
        bottom: { c: 0x4c4f5e, p: 'wool' }, legs: 'breeches', stockings: { c: 0xd8d2c2, p: 'knit' },
        shoes: { type: 'buckle', c: 0x1a1410 }, collar: { type: 'cravat', c: 0xf4f0e6 },
      },
      hat: { type: 'plumed', c: 0x1c1a18, c2: 0xd4a857 },
      props: { left: 'plans' },
    }),
    officer: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'long', color: HAIR.dark }, beard: { style: 'mustache', color: HAIR.dark },
      outfit: {
        top: { c: 0x2a3a6a, p: 'wool' }, sleeves: 'long',
        coat: { c: 0xd6d2c6, p: 'wool', len: 0.52, gap: 0.45 },
        cuffs: { c: 0x2a3a6a, p: 'wool' }, buttons: { c: 0xd4a857, n: 6 },
        bottom: { c: 0x2a3a6a, p: 'wool' }, legs: 'breeches', stockings: { c: 0xd8d2c2, p: 'knit' },
        shoes: { type: 'buckle', c: 0x1a1410 }, collar: { type: 'cravat', c: 0xf4f0e6 },
        baldric: { c: 0x8a5a2a, p: 'leather' },
      },
      hat: { type: 'plumed', c: 0x1c1a18, c2: 0xd4a857 },
      props: { left: 'sword' },
    }),
    soldier: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'long', color: HAIR.brown }, beard: { style: 'mustache', color: HAIR.brown },
      outfit: {
        top: { c: 0xcfc9ba, p: 'serge' }, sleeves: 'long',
        coat: { c: 0xcfc9ba, p: 'serge', len: 0.5, gap: 0.35 },
        cuffs: { c: 0x8a2a22, p: 'wool' }, buttons: { c: 0xc0c0c0, n: 6 },
        bottom: { c: 0x8a8a84, p: 'serge' }, legs: 'breeches', stockings: { c: 0x8a8a84, p: 'knit' },
        shoes: { type: 'buckle', c: 0x1a1410 }, baldric: { c: 0x7a5a32, p: 'leather' },
      },
      hat: { type: 'felt', c: 0x1c1a18 },
      props: { right: 'musket' },
    }),
    merchantwoman: () => ({
      sex: 'f', skin: SKIN.fair, hair: { style: 'bun', color: HAIR.chestnut }, eyes: EYES.hazel,
      outfit: {
        top: { c: 0x6a2236, p: 'velvet' }, sleeves: 'long',
        robe: { c: 0x6a2236, p: 'wool', len: 0.98, flare: 1.0 },
        apron: { c: 0x2a2a2e, p: 'wool', len: 0.75 },
        shawl: { c: 0xece6d8, p: 'lace' }, shoes: { type: 'buckle', c: 0x2a1a10 },
        necklace: { type: 'pearls' },
      },
      hat: { type: 'coif', c: 0xf2efe6 },
    }),
    dutch: () => ({
      sex: 'm', skin: SKIN.fair, hair: { style: 'long', color: HAIR.fair }, beard: { style: 'goatee', color: HAIR.fair }, eyes: EYES.blue,
      outfit: {
        top: { c: 0x1c1c22, p: 'wool' }, sleeves: 'long',
        coat: { c: 0x1c1c22, p: 'wool', len: 0.5, gap: 0.3 },
        bottom: { c: 0x1c1c22, p: 'wool' }, legs: 'breeches', stockings: { c: 0x2a2a2e, p: 'knit' },
        shoes: { type: 'tallboot', c: 0x2a1e14 }, collar: { type: 'rabat', c: 0xf4f2ec },
        belt: { c: 0x3a2a1a, buckle: 0xc8a050 },
      },
      hat: { type: 'felt', c: 0x161618 },
    }),
    baker: () => ({
      sex: 'f', age: 'old', build: 'stout', skin: SKIN.light, hair: { style: 'bun', color: HAIR.grey },
      face: { expression: 'smile' },
      outfit: {
        top: { c: 0x5a4a3a, p: 'wool' }, sleeves: 'rolled',
        robe: { c: 0x5a4a3a, p: 'wool', len: 0.95, flare: 0.9 },
        apron: { c: 0xf0ece2, p: 'linen', len: 0.75, bib: true },
        shawl: { c: 0x8a4a3a, p: 'wool' }, shoes: { type: 'sabot' },
      },
      hat: { type: 'coif', c: 0xf2efe6 },
      props: { left: 'basket' },
    }),
    clockmaker: () => ({
      sex: 'm', age: 'old', skin: SKIN.light, hair: { style: 'fringe', color: HAIR.grey }, glasses: true,
      beard: { style: 'short', color: HAIR.white },
      outfit: {
        top: { c: 0xe6e0d0, p: 'linen' }, sleeves: 'long',
        coat: { c: 0x5a4028, p: 'velvet', len: 0.3, gap: 0.45 }, buttons: { c: 0xc8a050, n: 5 },
        apron: { c: 0x6a4a2a, p: 'leather', len: 0.55, bib: true },
        bottom: { c: 0x3a2a1e, p: 'wool' }, legs: 'breeches', stockings: { c: 0x6a6a64, p: 'knit' },
        shoes: { type: 'buckle', c: 0x1a1410 },
      },
    }),
    priest: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'short', color: HAIR.grey }, eyes: EYES.grey,
      outfit: {
        top: { c: 0x18181c, p: 'wool' }, sleeves: 'long',
        robe: { c: 0x18181c, p: 'wool', len: 0.98, flare: 0.6 },
        collar: { type: 'rabat', c: 0xf4f2ec }, buttons: { c: 0x18181c, n: 9, y0: 0.0, y1: 0.4, metal: false },
        shoes: { type: 'buckle', c: 0x101010 },
      },
      props: { left: 'book' },
    }),
    crier: () => ({
      sex: 'm', skin: SKIN.medium, hair: { style: 'long', color: HAIR.chestnut }, beard: { style: 'mustache', color: HAIR.chestnut },
      outfit: {
        top: { c: 0x8a2a22, p: 'wool' }, sleeves: 'long',
        coat: { c: 0x2a3a7a, p: 'wool', len: 0.5, gap: 0.5 }, cuffs: { c: 0x8a2a22, p: 'wool' },
        bottom: { c: 0x2a3a7a, p: 'wool' }, legs: 'breeches', stockings: { c: 0xd8d2c2, p: 'knit' },
        shoes: { type: 'buckle', c: 0x1a1410 },
      },
      hat: { type: 'felt', c: 0x1c1a18 },
      props: { right: 'scroll' },
    }),
    worker: () => ({
      sex: 'm', skin: SKIN.tan, hair: { style: 'short', color: HAIR.dark }, face: { stubble: true, dirt: true },
      outfit: {
        top: { c: 0xd8ceb6, p: 'linen' }, sleeves: 'rolled',
        bottom: { c: 0x6a5a42, p: 'wool' }, legs: 'breeches', stockings: { c: 0x8a8070, p: 'knit' },
        sash: { c: 0x8a2a22, p: 'wool' }, shoes: { type: 'shoe', c: 0x3a2a1a },
      },
      hat: { type: 'felt', c: 0x5a4a32 },
      props: { right: 'hammer' },
    }),
    gentleman: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'wig', color: 0x8a8a8a, keepColor: true },
      outfit: {
        top: { c: 0x5c5c60, p: 'velvet' }, sleeves: 'long',
        coat: { c: 0x6a6a6e, p: 'wool', len: 0.5, gap: 0.45 }, cuffs: { c: 0x4a4a4e, p: 'velvet' },
        buttons: { c: 0xc0c0c0, n: 7 },
        bottom: { c: 0x5c5c60, p: 'wool' }, legs: 'breeches', stockings: { c: 0xc8c8c4, p: 'knit' },
        shoes: { type: 'buckle', c: 0x1a1410 }, collar: { type: 'cravat', c: 0xf4f0e6 },
      },
      hat: { type: 'tricorne', c: 0x3a3a3e, c2: 0xc0c0c0 },
      props: { right: 'cane' },
    }),
  },

  // ================= XIXᵉ SIÈCLE (1862) =================
  xix: {
    sauniere: () => ({
      sex: 'f', skin: SKIN.medium, hair: { style: 'bun', color: HAIR.dark }, eyes: EYES.brown,
      outfit: {
        top: { c: 0x262838, p: 'wool' }, sleeves: 'long',
        robe: { c: 0x262838, p: 'wool', len: 0.94, flare: 0.85 },
        apron: { c: 0x5a6a8a, p: 'linen', len: 0.72 },
        shawl: { c: 0x7a3a34, p: 'floral', c2: 0xd8b070 },
        shoes: { type: 'sabot' },
      },
      hat: { type: 'quichenotte' },
      props: { right: 'rake' },
    }),
    saunier: () => ({
      sex: 'm', skin: SKIN.tan, hair: { style: 'short', color: HAIR.brown }, beard: { style: 'mustache', color: HAIR.brown },
      outfit: {
        // les sauniers travaillaient vêtus de toile blanche
        top: { c: 0xeeeae0, p: 'linen' }, sleeves: 'rolled',
        bottom: { c: 0xe2ded2, p: 'linen' }, legs: 'trousers',
        sash: { c: 0x2a3a6a, p: 'wool' }, shoes: { type: 'sabot' },
      },
      hat: { type: 'straw', c: 0xd8c088, c2: 0x2a2a2a },
      props: { right: 'rake' },
    }),
    mayor: () => ({
      sex: 'm', build: 'stout', skin: SKIN.light, hair: { style: 'sidepart', color: HAIR.grey }, beard: { style: 'full', color: HAIR.grey },
      outfit: {
        top: { c: 0x3a3a40, p: 'wool' }, sleeves: 'long',
        coat: { c: 0x18181c, p: 'wool', len: 0.58, gap: 0.4 },
        buttons: { c: 0x18181c, n: 5, y0: 0.0, y1: 0.28, metal: false },
        bottom: { c: 0x4a4a52, p: 'pinstripe', c2: 0x2a2a30 }, legs: 'trousers',
        shoes: { type: 'shoe', c: 0x101010 }, collar: { type: 'tie', c: 0x101010 },
        baldric: { c: 0xffffff, p: 'tricolor' },
      },
      hat: { type: 'tophat', c: 0x141416 },
      props: { right: 'cane' },
    }),
    fisherman: () => ({
      sex: 'm', age: 'old', skin: SKIN.tan, hair: { style: 'short', color: HAIR.grey }, beard: { style: 'full', color: HAIR.white },
      outfit: {
        top: { c: 0x3c5c7c, p: 'linen' }, sleeves: 'long',
        tunic: { c: 0x3c5c7c, p: 'linen', len: 0.25, flare: 0.4 },
        bottom: { c: 0x7a6248, p: 'linen' }, legs: 'trousers', shoes: { type: 'sabot', c: 0x9a7a50 },
      },
      hat: { type: 'beret', c: 0x1e2436 },
      props: { right: 'pipe' },
    }),
    captain: () => ({
      sex: 'm', skin: SKIN.tan, hair: { style: 'short', color: HAIR.dark }, beard: { style: 'full', color: HAIR.dark },
      outfit: {
        top: { c: 0x1c2438, p: 'wool' }, sleeves: 'long',
        coat: { c: 0x1c2438, p: 'wool', len: 0.22, gap: 0.0 }, buttons: { c: 0xc8a050, n: 5 },
        bottom: { c: 0x1c2438, p: 'wool' }, legs: 'trousers', shoes: { type: 'boot', c: 0x1a1410 },
        collar: { type: 'stand', c: 0x1c2438 },
      },
      hat: { type: 'sailorcap', c: 0x1c2438 },
    }),
    sailor: () => ({
      sex: 'm', skin: SKIN.tan, hair: { style: 'short', color: HAIR.blond }, eyes: EYES.blue,
      outfit: {
        top: { c: 0xf4f2ec, p: 'stripes', c2: 0x1c2a5a }, sleeves: 'long',
        bottom: { c: 0x1c2a5a, p: 'wool' }, legs: 'trousers', shoes: { type: 'bare' },
        collar: { type: 'sailor', c: 0x1c2a5a },
      },
      hat: { type: 'bachi', c: 0x1c2a5a },
    }),
    teacher: () => ({
      sex: 'f', skin: SKIN.fair, hair: { style: 'bun', color: HAIR.brown }, glasses: true, eyes: EYES.grey,
      outfit: {
        top: { c: 0x2a4436, p: 'wool' }, sleeves: 'long',
        robe: { c: 0x2a4436, p: 'wool', len: 0.98, flare: 0.75 },
        collar: { type: 'stand', c: 0xf2efe6 }, buttons: { c: 0x1a1a1a, n: 7, y0: 0.05, y1: 0.4, metal: false },
        shoes: { type: 'boot', c: 0x1a1410 },
      },
      props: { left: 'book' },
    }),
    grocer: () => ({
      sex: 'f', build: 'stout', skin: SKIN.light, hair: { style: 'bun', color: HAIR.chestnut }, face: { expression: 'smile' },
      outfit: {
        top: { c: 0x6a4a3a, p: 'wool' }, sleeves: 'rolled',
        robe: { c: 0x6a4a3a, p: 'wool', len: 0.94, flare: 0.85 },
        apron: { c: 0xf0ece2, p: 'linen', len: 0.75, bib: true },
        shoes: { type: 'sabot' },
      },
      hat: { type: 'coif', c: 0xf2efe6 },
    }),
    douanier: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'short', color: HAIR.dark }, beard: { style: 'mustache', color: HAIR.dark },
      face: { expression: 'stern' },
      outfit: {
        top: { c: 0x26342a, p: 'wool' }, sleeves: 'long',
        coat: { c: 0x26342a, p: 'wool', len: 0.35, gap: 0.0 }, buttons: { c: 0xc8a050, n: 6 },
        bottom: { c: 0x26342a, p: 'wool' }, legs: 'trousers', shoes: { type: 'boot', c: 0x101010 },
        belt: { c: 0x101010, buckle: 0xc8a050 }, collar: { type: 'stand', c: 0x8a2a22 },
      },
      hat: { type: 'kepi', c: 0x26342a, c2: 0x8a2a22 },
    }),
    mousse: () => ({
      sex: 'm', age: 'child', skin: SKIN.tan, hair: { style: 'short', color: HAIR.chestnut }, face: { freckles: true },
      outfit: {
        top: { c: 0xf4f2ec, p: 'stripes', c2: 0x1c2a5a }, sleeves: 'long',
        bottom: { c: 0x1c2a5a, p: 'wool' }, legs: 'trousers', shoes: { type: 'bare' },
      },
      hat: { type: 'bachi', c: 0x1c2a5a },
    }),
    villager: () => ({
      sex: 'f', skin: SKIN.light, hair: { style: 'bun', color: HAIR.brown },
      outfit: {
        top: { c: 0x4a3a5a, p: 'wool' }, sleeves: 'long',
        robe: { c: 0x3a3048, p: 'wool', len: 0.94, flare: 0.85 },
        apron: { c: 0xd8d0c0, p: 'linen', len: 0.7 }, shawl: { c: 0x2a2a3a, p: 'wool' },
        shoes: { type: 'sabot' },
      },
      hat: { type: 'quichenotte' },
    }),
    gentleman: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'sidepart', color: HAIR.grey }, beard: { style: 'goatee', color: HAIR.grey },
      outfit: {
        top: { c: 0x4a4a50, p: 'velvet' }, sleeves: 'long',
        coat: { c: 0x5e5e64, p: 'wool', len: 0.6, gap: 0.4 },
        bottom: { c: 0x3a3a40, p: 'pinstripe', c2: 0x6a6a70 }, legs: 'trousers',
        shoes: { type: 'shoe', c: 0x101010 }, collar: { type: 'tie', c: 0x2a2a2e },
      },
      hat: { type: 'tophat', c: 0x4a4a50 },
      props: { right: 'cane' },
    }),
  },

  // ================= SECONDE GUERRE MONDIALE (1943) =================
  wwii: {
    resistant: () => ({
      sex: 'm', skin: SKIN.medium, hair: { style: 'sidepart', color: HAIR.dark }, beard: { style: 'mustache', color: HAIR.dark },
      face: { stubble: true },
      outfit: {
        top: { c: 0xd8d2c4, p: 'linen' }, sleeves: 'long',
        coat: { c: 0x5a4a32, p: 'wool', len: 0.14, gap: 0.0 }, buttons: { c: 0x3a2a1a, n: 4, metal: false },
        bottom: { c: 0x4a4a46, p: 'wool' }, legs: 'trousers', shoes: { type: 'boot', c: 0x2a1e14 },
        collar: { type: 'scarf', c: 0x6a2a22 },
      },
      hat: { type: 'beret', c: 0x18181a },
    }),
    nurse: () => ({
      sex: 'f', skin: SKIN.fair, hair: { style: 'rolls', color: HAIR.chestnut }, eyes: EYES.green,
      outfit: {
        top: { c: 0x8c9cae, p: 'plain' }, sleeves: 'long',
        robe: { c: 0x8c9cae, p: 'plain', len: 0.62, flare: 0.6 },
        apron: { c: 0xf4f4f0, p: 'linen', len: 0.56, bib: true },
        armband: { c: 0xf4f4f0 }, legs: 'hose', bottom: { c: 0xc8b8a0, p: 'knit' },
        shoes: { type: 'shoe', c: 0x1a1410 },
      },
      hat: { type: 'coif', c: 0xf4f4f0 },
    }),
    baker: () => ({
      sex: 'm', build: 'stout', skin: SKIN.light, hair: { style: 'short', color: HAIR.brown }, beard: { style: 'mustache', color: HAIR.brown },
      face: { expression: 'smile' },
      outfit: {
        top: { c: 0xf2f0ea, p: 'linen' }, sleeves: 'rolled',
        bottom: { c: 0xd8d8d4, p: 'check', c2: 0x2a2a2a }, legs: 'trousers',
        apron: { c: 0xf4f2ec, p: 'linen', len: 0.6 }, shoes: { type: 'shoe', c: 0x2a1e14 },
      },
      hat: { type: 'beret', c: 0xf2f0ea },
      props: { left: 'baguette' },
    }),
    teacher: () => ({
      sex: 'f', skin: SKIN.light, hair: { style: 'rolls', color: HAIR.dark }, eyes: EYES.brown,
      outfit: {
        top: { c: 0x8a3a3a, p: 'knit' }, sleeves: 'long',
        coat: { c: 0x8a3a3a, p: 'knit', len: 0.1, gap: 0.35 },
        robe: { c: 0x3a4a6a, p: 'floral', c2: 0xd8c8a0, len: 0.62, flare: 0.65 },
        legs: 'hose', bottom: { c: 0xc8b8a0, p: 'knit' }, shoes: { type: 'shoe', c: 0x3a2418 },
      },
      props: { left: 'book' },
    }),
    child: () => ({
      sex: 'm', age: 'child', skin: SKIN.light, hair: { style: 'short', color: HAIR.blond }, face: { freckles: true },
      outfit: {
        top: { c: 0x6a6a5a, p: 'knit' }, sleeves: 'long',
        bottom: { c: 0x5a4632, p: 'wool' }, legs: 'shorts', shoes: { type: 'shoe', c: 0x3a2418 },
      },
      hat: { type: 'beret', c: 0x1e2436 },
    }),
    grandmother: () => ({
      sex: 'f', age: 'old', skin: SKIN.light, hair: { style: 'bun', color: HAIR.grey },
      outfit: {
        top: { c: 0x1c1c20, p: 'wool' }, sleeves: 'long',
        robe: { c: 0x1c1c20, p: 'wool', len: 0.82, flare: 0.7 },
        shawl: { c: 0x2a2a2e, p: 'knit' }, shoes: { type: 'shoe', c: 0x101010 },
      },
      props: { left: 'basket' },
    }),
    soldier: () => ({
      // soldat de l'armée d'occupation : uniforme feldgrau, sans insigne
      sex: 'm', skin: SKIN.fair, hair: { style: 'crop', color: HAIR.fair }, eyes: EYES.blue,
      outfit: {
        top: { c: 0x5a604e, p: 'serge' }, sleeves: 'long',
        coat: { c: 0x5a604e, p: 'serge', len: 0.2, gap: 0.0 }, buttons: { c: 0x8a8a7a, n: 5 },
        bottom: { c: 0x5a604e, p: 'serge' }, legs: 'trousers', shoes: { type: 'tallboot', c: 0x141414 },
        belt: { c: 0x141414, buckle: 0x8a8a7a }, collar: { type: 'stand', c: 0x3a4236 },
      },
      hat: { type: 'stahlhelm', c: 0x4b5142 },
      props: { right: 'rifle' },
    }),
    villager: () => ({
      sex: 'm', skin: SKIN.medium, hair: { style: 'short', color: HAIR.brown },
      outfit: {
        top: { c: 0xc8c0b0, p: 'linen' }, sleeves: 'long',
        coat: { c: 0x5a5a5e, p: 'wool', len: 0.16, gap: 0.4 },
        bottom: { c: 0x3e3e40, p: 'wool' }, legs: 'trousers', shoes: { type: 'shoe', c: 0x2a1e14 },
      },
      hat: { type: 'flatcap', c: 0x4a4a4c },
    }),
    villagerwoman: () => ({
      sex: 'f', skin: SKIN.light, hair: { style: 'bob', color: HAIR.brown },
      outfit: {
        top: { c: 0x5a6a4a, p: 'plain' }, sleeves: 'short',
        robe: { c: 0x5a6a4a, p: 'floral', c2: 0xe0d0a0, len: 0.6, flare: 0.65 },
        legs: 'hose', bottom: { c: 0xc8b8a0, p: 'knit' }, shoes: { type: 'shoe', c: 0x3a2418 },
      },
      hat: { type: 'headscarf', c: 0x8a3a3a, c2: 0xe8d8b0 },
      props: { left: 'basket' },
    }),
    trafficker: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'sidepart', color: HAIR.grey }, beard: { style: 'goatee', color: HAIR.grey },
      outfit: {
        top: { c: 0x3a3a3e, p: 'wool' }, sleeves: 'long',
        coat: { c: 0x6a6a6c, p: 'wool', len: 0.62, gap: 0.12, collar: true }, belt: { c: 0x5a5a5c, buckle: 0x8a8a8a },
        bottom: { c: 0x3a3a3e, p: 'wool' }, legs: 'trousers', shoes: { type: 'shoe', c: 0x101010 },
      },
      hat: { type: 'felt', c: 0x5a5a5e },
    }),
  },

  // ================= ÉPOQUE CONTEMPORAINE =================
  contemporaine: {
    archivist: () => ({
      sex: 'f', skin: SKIN.light, hair: { style: 'bob', color: 0x6a4a36 }, glasses: true, eyes: EYES.green,
      outfit: {
        top: { c: 0xe8e4dc, p: 'plain' }, sleeves: 'long',
        coat: { c: 0x2a3448, p: 'wool', len: 0.18, gap: 0.5 },
        bottom: { c: 0xb4a688, p: 'plain' }, legs: 'trousers', shoes: { type: 'shoe', c: 0x5a3a22 },
        collar: { type: 'scarf', c: 0xa83a3a },
      },
      props: { left: 'clipboard' },
    }),
    oldfisher: () => ({
      sex: 'm', age: 'old', skin: SKIN.tan, hair: { style: 'short', color: HAIR.grey }, beard: { style: 'full', color: HAIR.white },
      eyes: EYES.blue, face: { expression: 'smile' },
      outfit: {
        top: { c: 0xf4f2ec, p: 'stripes', c2: 0x1c2a5a }, sleeves: 'long',
        bottom: { c: 0x2a3450, p: 'denim' }, legs: 'trousers', shoes: { type: 'shoe', c: 0x6a4a2a },
      },
      hat: { type: 'sailorcap', c: 0x1c2438 },
    }),
    renter: () => ({
      sex: 'm', skin: SKIN.tan, hair: { style: 'short', color: HAIR.blond }, eyes: EYES.blue, face: { expression: 'smile' },
      outfit: {
        top: { c: 0x2a8a8a, p: 'plain' }, sleeves: 'short',
        bottom: { c: 0xc8b48a, p: 'plain' }, legs: 'shorts', shoes: { type: 'sneaker', c: 0xf0f0f0 },
      },
      hat: { type: 'cap', c: 0xc0302a },
    }),
    tourist: () => ({
      sex: 'f', skin: SKIN.fair, hair: { style: 'ponytail', color: HAIR.blond }, glasses: 'sun', eyes: EYES.blue,
      outfit: {
        top: { c: 0xe8c040, p: 'plain' }, sleeves: 'short',
        bottom: { c: 0x8a7a5a, p: 'plain' }, legs: 'shorts', shoes: { type: 'sneaker', c: 0xf4f4f4 },
        bag: { type: 'backpack', c: 0x3a5a7a },
      },
      hat: { type: 'sunhat', c: 0xe0cc98, c2: 0x2a5a8a },
      props: { right: 'camera' },
    }),
    cafe: () => ({
      sex: 'f', skin: SKIN.olive, hair: { style: 'ponytail', color: HAIR.black }, eyes: EYES.brown,
      outfit: {
        top: { c: 0x1e1e22, p: 'plain' }, sleeves: 'short',
        bottom: { c: 0x2a3a5a, p: 'denim' }, legs: 'trousers', shoes: { type: 'sneaker', c: 0x1a1a1a },
        apron: { c: 0x7a2a2a, p: 'plain', len: 0.6, bib: true },
      },
    }),
    child: () => ({
      sex: 'm', age: 'child', skin: SKIN.light, hair: { style: 'short', color: HAIR.blond }, face: { freckles: true },
      outfit: {
        top: { c: 0xf4f2ec, p: 'stripes', c2: 0xc0302a }, sleeves: 'short',
        bottom: { c: 0x2a4a8a, p: 'plain' }, legs: 'shorts', shoes: { type: 'sneaker', c: 0x2a6aca },
      },
    }),
    technician: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'crop', color: HAIR.brown }, beard: { style: 'short', color: HAIR.brown },
      outfit: {
        top: { c: 0x1e2a44, p: 'plain' }, sleeves: 'long',
        coat: { c: 0x1e2a44, p: 'plain', len: 0.1, gap: 0.0 },
        bottom: { c: 0x1e2a44, p: 'plain' }, legs: 'trousers', shoes: { type: 'boot', c: 0x1a1410 },
        collar: { type: 'turtleneck', c: 0x1e2a44 },
      },
      hat: { type: 'bonnet', c: 0x1e2a44 },
    }),
    birder: () => ({
      sex: 'f', skin: SKIN.fair, hair: { style: 'ponytail', color: HAIR.red }, face: { freckles: true }, eyes: EYES.green,
      outfit: {
        top: { c: 0x3a6a4a, p: 'knit' }, sleeves: 'long',
        coat: { c: 0x3a6a4a, p: 'knit', len: 0.12, gap: 0.0 },
        bottom: { c: 0x7a7458, p: 'plain' }, legs: 'trousers', shoes: { type: 'boot', c: 0x4a3420 },
      },
      props: { right: 'binoculars' },
    }),
    collector: () => ({
      sex: 'm', skin: SKIN.light, hair: { style: 'sidepart', color: 0x5a5650 }, glasses: true, beard: { style: 'goatee', color: 0x7a766e },
      eyes: EYES.grey, face: { expression: 'stern' },
      outfit: {
        top: { c: 0x2e2e32, p: 'knit' }, sleeves: 'long',
        coat: { c: 0x5a5a5e, p: 'wool', len: 0.62, gap: 0.25, collar: true },
        bottom: { c: 0x2a2a2e, p: 'plain' }, legs: 'trousers', shoes: { type: 'shoe', c: 0x101010 },
        collar: { type: 'turtleneck', c: 0x2e2e32 },
      },
    }),
    cyclist: () => ({
      sex: 'm', skin: SKIN.medium, hair: { style: 'short', color: HAIR.dark },
      outfit: {
        top: { c: 0xd04a2a, p: 'plain' }, sleeves: 'short',
        bottom: { c: 0x1e1e22, p: 'plain' }, legs: 'shorts', shoes: { type: 'sneaker', c: 0x2a2a2a },
      },
      hat: { type: 'bikehelmet', c: 0x2a6aca },
    }),
    walker: () => ({
      sex: 'f', age: 'old', skin: SKIN.light, hair: { style: 'bob', color: HAIR.white }, glasses: true,
      outfit: {
        top: { c: 0x8aa0c0, p: 'knit' }, sleeves: 'long',
        bottom: { c: 0xe8e2d4, p: 'plain' }, legs: 'trousers', shoes: { type: 'sneaker', c: 0xe8e8e8 },
      },
      hat: { type: 'sunhat', c: 0xe8dcb8, c2: 0x8a2a2a },
    }),
  },

  // ================= JOUEUR =================
  player: {
    explorer: () => ({
      id: 'player', sex: 'm', skin: SKIN.light, hair: { style: 'short', color: HAIR.brown }, eyes: EYES.hazel,
      face: { stubble: true },
      outfit: {
        top: { c: 0xb8b4a8, p: 'plain' }, sleeves: 'long',
        coat: { c: 0x5a6a42, p: 'serge', len: 0.2, gap: 0.5 }, buttons: { c: 0x3a3a2a, n: 4, metal: false },
        bottom: { c: 0x8a7a5a, p: 'plain' }, legs: 'trousers', shoes: { type: 'boot', c: 0x5a3a22 },
        bag: { type: 'backpack', c: 0x7a5a36 }, collar: { type: 'scarf', c: 0xb5462f },
      },
    }),
    exploratrice: () => ({
      id: 'player', sex: 'f', skin: SKIN.medium, hair: { style: 'ponytail', color: HAIR.dark }, eyes: EYES.brown,
      outfit: {
        top: { c: 0xd8d0c0, p: 'plain' }, sleeves: 'long',
        coat: { c: 0x2e5a5a, p: 'serge', len: 0.2, gap: 0.5 }, buttons: { c: 0x2a2a2a, n: 4, metal: false },
        bottom: { c: 0x6e6450, p: 'plain' }, legs: 'trousers', shoes: { type: 'boot', c: 0x4a3020 },
        bag: { type: 'backpack', c: 0x8a4a2a }, collar: { type: 'scarf', c: 0xd4a857 },
      },
    }),
    aventurier: () => ({
      id: 'player', sex: 'm', skin: SKIN.deep, hair: { style: 'curly', color: HAIR.black }, eyes: EYES.dark,
      beard: { style: 'short', color: HAIR.black },
      outfit: {
        top: { c: 0xe8e0cc, p: 'plain' }, sleeves: 'rolled',
        coat: { c: 0x7a4a2a, p: 'leather', len: 0.2, gap: 0.5 },
        bottom: { c: 0x3a4a5a, p: 'denim' }, legs: 'trousers', shoes: { type: 'boot', c: 0x3a2418 },
        bag: { type: 'backpack', c: 0x5a6a42 },
      },
    }),
  },
};

export function look(era, archetype, overrides) {
  const make = W[era]?.[archetype];
  if (!make) throw new Error(`Archétype inconnu : ${era}/${archetype}`);
  return merge(make(), overrides);
}

export const ARCHETYPES = Object.fromEntries(Object.entries(W).map(([e, v]) => [e, Object.keys(v)]));
