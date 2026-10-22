// Matériaux du bâti partagés et mis en cache : pierre de taille, moellons,
// enduit chaulé, tuiles canal, chaume, bois, pavés, terre battue, béton
// banché, ardoise… Tous reçoivent une carte de relief (bump) dérivée de
// leur texture pour accrocher la lumière rasante.

import * as THREE from 'three';
import {
  stoneTexture, plasterTexture, roofTexture, thatchTexture, woodTexture,
  paveTexture, dirtTexture, asphaltTexture, concreteTexture, shutterTexture, bumpOf, normalOf, sandTexture,
} from '../gfx/textures.js';

const cache = new Map();
export function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

export function texturedMat(key, tex, opts = {}) {
  return cached(key, () => new THREE.MeshStandardMaterial({
    map: tex, normalMap: normalOf(tex, 1.2 + (opts.bumpScale ?? 0.6) * 3), normalScale: new THREE.Vector2(1, 1),
    roughness: opts.roughness ?? 0.95, metalness: opts.metalness ?? 0,
    color: opts.color ?? 0xffffff, side: opts.side ?? THREE.FrontSide,
  }));
}

export function flat(color, rough = 0.85, metal = 0, extra = {}) {
  return cached(`flat-${color}-${rough}-${metal}-${JSON.stringify(extra)}`,
    () => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }));
}

export const MAT = {
  whitewash: () => texturedMat('whitewash', plasterTexture(0xf3eee0, 1), { bumpScale: 0.15, roughness: 0.85 }),
  cream: () => texturedMat('cream', plasterTexture(0xeee2c4, 1), { bumpScale: 0.15, roughness: 0.85 }),
  plasterOld: () => texturedMat('plasterOld', plasterTexture(0xe0d4ba, 1), { bumpScale: 0.2, roughness: 0.9 }),
  plasterGrey: () => texturedMat('plasterGrey', plasterTexture(0xc8c4b8, 1), { bumpScale: 0.2, roughness: 0.95 }),
  plasterRoman: () => texturedMat('plasterRoman', plasterTexture(0xe8d8bc, 1), { bumpScale: 0.15, roughness: 0.9 }),
  ochre: () => texturedMat('ochre', plasterTexture(0xd8b07a, 1), { bumpScale: 0.15, roughness: 0.9 }),
  stone: () => texturedMat('stone', stoneTexture(0xcabfa6, 1, false), { bumpScale: 0.8 }),
  stoneOld: () => texturedMat('stoneOld', stoneTexture(0xb6a888, 1, true), { bumpScale: 0.9 }),
  stonePale: () => texturedMat('stonePale', stoneTexture(0xe2ddd0, 1, false), { bumpScale: 0.6, roughness: 0.8 }),
  stoneDark: () => texturedMat('stoneDark', stoneTexture(0x7a7468, 1, true), { bumpScale: 0.9 }),
  rampart: () => texturedMat('rampart', stoneTexture(0xc8bc9c, 1, true), { bumpScale: 0.9 }),
  concrete: () => texturedMat('concrete', concreteTexture(1), { bumpScale: 0.4 }),
  tiles: () => texturedMat('tiles', roofTexture(0xb35a3a, 1, true), { bumpScale: 0.5, roughness: 0.9 }),
  tilesOld: () => texturedMat('tilesOld', roofTexture(0x9a5236, 1, true), { bumpScale: 0.5, roughness: 0.95 }),
  tilesNew: () => texturedMat('tilesNew', roofTexture(0xc0643e, 1, false), { bumpScale: 0.45, roughness: 0.85 }),
  slate: () => texturedMat('slate', roofTexture(0x4a5058, 1, false), { bumpScale: 0.4, roughness: 0.7 }),
  thatch: () => texturedMat('thatch', thatchTexture(1), { bumpScale: 0.7 }),
  wood: () => texturedMat('wood', woodTexture(0x6a4a2a, 1), { bumpScale: 0.3 }),
  woodDark: () => texturedMat('woodDark', woodTexture(0x46301a, 1), { bumpScale: 0.3 }),
  woodPale: () => texturedMat('woodPale', woodTexture(0x8a6a3a, 1), { bumpScale: 0.3 }),
  woodGrey: () => texturedMat('woodGrey', woodTexture(0x7a7468, 1), { bumpScale: 0.3 }),
  pave: () => texturedMat('pave', paveTexture(0x8a8276, 1), { bumpScale: 0.7 }),
  paveWarm: () => texturedMat('paveWarm', paveTexture(0xa09078, 1), { bumpScale: 0.7 }),
  paveRoman: () => texturedMat('paveRoman', paveTexture(0x9a9080, 1), { bumpScale: 0.7 }),
  dirt: () => texturedMat('dirt', dirtTexture(0x9a7a52, 1), { bumpScale: 0.4 }),
  dirtPale: () => texturedMat('dirtPale', dirtTexture(0xb8a07a, 1), { bumpScale: 0.35 }),
  sandPath: () => texturedMat('sandPath', sandTexture(1), { bumpScale: 0.2 }),
  asphalt: () => texturedMat('asphalt', asphaltTexture(1, false), { bumpScale: 0.2 }),
  cycleway: () => texturedMat('cycleway', asphaltTexture(1, true), { bumpScale: 0.2 }),
  glass: () => flat(0x1e2a34, 0.12, 0.4),
  glassLit: () => cached('glassLit', () => new THREE.MeshStandardMaterial({
    color: 0x2a2a28, roughness: 0.2, metalness: 0.2, emissive: 0xffbf6a, emissiveIntensity: 0,
  })),
  shopGlass: () => cached('shopGlass', () => new THREE.MeshStandardMaterial({
    color: 0x3a4a50, roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.55,
    emissive: 0xffd8a0, emissiveIntensity: 0,
  })),
  metal: () => flat(0x33332f, 0.4, 0.7),
  metalPale: () => flat(0x5a6a6a, 0.5, 0.5),
  iron: () => flat(0x26262a, 0.55, 0.6),
  gold: () => flat(0xc8a050, 0.35, 0.8),
  salt: () => flat(0xf6f2ea, 0.6),
  black: () => flat(0x0c0c0c, 0.9),
  white: () => flat(0xf4f2ec, 0.7),
  brine: () => cached('brine', () => new THREE.MeshStandardMaterial({
    color: 0xb8ccc8, transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.15,
  })),
};

export function shutterMat(color) {
  return texturedMat(`shutter-${color}`, shutterTexture(color, 1), { bumpScale: 0.25, roughness: 0.8 });
}

// Fenêtres éclairées la nuit : intensité pilotée par le cycle jour/nuit
export function setNightGlow(k) {
  const lit = MAT.glassLit();
  lit.emissiveIntensity = k * 1.1;
  MAT.shopGlass().emissiveIntensity = k * 0.6;
}
