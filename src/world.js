// Génération procédurale de l'Île de Ré : terrain texturé, océan, plages,
// marais salants, forêts de pins, vignobles — et une VILLE PAR ÉPOQUE,
// reconstituée avec un plan fidèle (rues de maisons rétaises mitoyennes,
// port, monuments) et des textures réalistes sur chaque structure.
//
// Époque → ville :
//   Préhistoire   → Les Portes-en-Ré   (campement, dolmen, menhirs)
//   Antiquité     → Sainte-Marie-de-Ré (villa, horreum, jetée romaine)
//   Moyen Âge     → La Flotte          (halles, port, abbaye en chantier)
//   XVIIᵉ siècle  → Saint-Martin-de-Ré (remparts Vauban, citadelle, bassin)
//   XIXᵉ siècle   → Ars-en-Ré          (clocher noir et blanc, marais salants)
//   WWII          → Le Bois-Plage      (bunkers, plage minée, village occupé)
//   Contemporaine → Phare des Baleines (musée, pistes cyclables)

import * as THREE from 'three';
import { LOCATIONS } from './locations.js';
import { getEra } from './eras.js';
import {
  stoneTexture, plasterTexture, roofTexture, thatchTexture, woodTexture,
  paveTexture, dirtTexture, asphaltTexture, grassDetailTexture,
  foliageTexture, barkTexture, concreteTexture, shutterTexture, bumpOf,
} from './textures.js';

const ISLAND_SIZE = 420;
const ISLAND_WIDTH = 140;
const TERRAIN_SEG = 200;
const WORLD_SIZE = 520;

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise2d(x, y, seed = 1) {
  const i = Math.floor(x), j = Math.floor(y);
  const fx = x - i, fy = y - j;
  const r = (a, b) => {
    const s = Math.sin((a * 374761393 + b * 668265263 + seed * 982451653)) * 43758.5453;
    return s - Math.floor(s);
  };
  const a = r(i, j), b = r(i + 1, j), c = r(i, j + 1), d = r(i + 1, j + 1);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

function fbm(x, y, octaves = 4, seed = 1) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2d(x * freq, y * freq, seed + i);
    amp *= 0.5; freq *= 2;
  }
  return sum;
}

function islandMask(x, z) {
  const nx = x / (ISLAND_SIZE / 2);
  const nz = z / (ISLAND_WIDTH / 2);
  let m = 1 - Math.sqrt(nx * nx * 0.9 + nz * nz);
  const pinch = Math.exp(-Math.pow((x + 40) / 18, 2)) * 0.45;
  m -= pinch;
  m += (fbm(x * 0.02 + 10, z * 0.02, 4, 7) - 0.5) * 0.25;
  return m;
}

function rawHeight(x, z) {
  const mask = islandMask(x, z);
  if (mask < 0) return -3 + mask * 6;
  const baseH = 0.5 + mask * 2.0;
  const dune = Math.exp(-Math.pow((Math.abs(z) - ISLAND_WIDTH * 0.35) / 8, 2)) *
    fbm(x * 0.04, z * 0.04, 3, 13) * 4 * mask;
  const marshMask = Math.max(0, (1 - Math.hypot((x + 130) / 70, (z + 40) / 30)));
  const marsh = -marshMask * 1.2;
  return baseH + dune + marsh;
}

// Aplanissement du terrain sous la ville active : les villages rétais sont
// construits à plat. heightAt reste la source unique de vérité (joueur, PNJ,
// décor et maillage du terrain l'utilisent tous).
let flat = null; // { x, z, r, h }

export function setTownFlatten(x, z, r, h) {
  flat = { x, z, r, h };
}

export function heightAt(x, z) {
  let h = rawHeight(x, z);
  if (flat && h > 0) {
    const d = Math.hypot(x - flat.x, z - flat.z);
    const outer = flat.r * 1.7;
    if (d < outer) {
      let t = (d - flat.r) / (outer - flat.r);
      t = Math.max(0, Math.min(1, t));
      t = t * t * (3 - 2 * t);
      h = flat.h * (1 - t) + h * t;
    }
  }
  return h;
}

function terrainColor(x, z, h, era) {
  const colors = {
    beach:  new THREE.Color(0xe6d4a4),
    grass:  new THREE.Color(era.ground),
    marsh:  new THREE.Color(0x8a9080),
    forest: new THREE.Color(0x445836),
    salt:   new THREE.Color(0xc8d4d0),
  };
  if (h < 0.6) return colors.beach;
  const marshMask = Math.max(0, 1 - Math.hypot((x + 130) / 65, (z + 40) / 28));
  if (marshMask > 0.4 && h < 1.4) {
    const q = (Math.floor(x / 4) + Math.floor(z / 4)) % 2 === 0;
    return q ? colors.salt : colors.marsh;
  }
  const vineMask = Math.max(0, 1 - Math.hypot((x - 25) / 30, (z - 35) / 14));
  if (vineMask > 0.4 && h > 1) return new THREE.Color(0x9a8a4a);
  const forestMask = Math.max(0, 1 - Math.hypot((x + 100) / 16, (z + 5) / 10));
  if (forestMask > 0.3 && h > 1) return colors.forest;
  return colors.grass;
}

// ---------- Géométrie de toit à deux pentes (pignons inclus) ----------
// Faîtage le long de z. Groupe 0 = pentes (tuiles), groupe 1 = pignons (mur).
function gableRoofGeometry(w, d, h, overhang = 0.35) {
  const hw = w / 2 + overhang, hd = d / 2 + 0.08;
  const slope = Math.hypot(hw, h);
  const positions = [
    // pente gauche
    -hw, 0, -hd, 0, h, -hd, 0, h, hd, -hw, 0, hd,
    // pente droite
    hw, 0, -hd, 0, h, -hd, 0, h, hd, hw, 0, hd,
    // pignon avant (z = -hd)
    -w / 2, 0, -hd, w / 2, 0, -hd, 0, h, -hd,
    // pignon arrière (z = +hd)
    -w / 2, 0, hd, w / 2, 0, hd, 0, h, hd,
  ];
  const t = 1.5; // mètres par répétition de texture
  const uvs = [
    0, 0, 0, slope / t, d / t, slope / t, d / t, 0,
    0, 0, 0, slope / t, d / t, slope / t, d / t, 0,
    0, 0, w / t, 0, w / (2 * t), h / t,
    0, 0, w / t, 0, w / (2 * t), h / t,
  ];
  const indices = [
    0, 3, 2, 0, 2, 1,       // gauche
    4, 5, 6, 4, 6, 7,       // droite
    8, 10, 9,               // pignon avant
    11, 12, 13,             // pignon arrière
  ];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.addGroup(0, 12, 0);   // pentes -> matériau tuiles
  geo.addGroup(12, 6, 1);   // pignons -> matériau mur
  geo.computeVertexNormals();
  return geo;
}

// ---------- Matériaux mis en cache (avec relief) ----------
const matCache = new Map();
function cachedMat(key, maker) {
  if (!matCache.has(key)) matCache.set(key, maker());
  return matCache.get(key);
}

function texturedMat(key, tex, opts = {}) {
  return cachedMat(key, () => new THREE.MeshStandardMaterial({
    map: tex, bumpMap: bumpOf(tex), bumpScale: opts.bumpScale ?? 0.6,
    roughness: opts.roughness ?? 0.95, metalness: opts.metalness ?? 0,
    color: opts.color ?? 0xffffff,
  }));
}

const MAT = {
  whitewash:  () => texturedMat('whitewash', plasterTexture(0xf2ecdd, 1), { bumpScale: 0.15, roughness: 0.85 }),
  plasterOld: () => texturedMat('plasterOld', plasterTexture(0xe2d8c0, 1), { bumpScale: 0.2, roughness: 0.9 }),
  stone:      () => texturedMat('stone', stoneTexture(0xcabfa6, 1, false), { bumpScale: 0.8 }),
  stoneOld:   () => texturedMat('stoneOld', stoneTexture(0xb6a888, 1, true), { bumpScale: 0.9 }),
  stonePale:  () => texturedMat('stonePale', stoneTexture(0xe4e0d4, 1, false), { bumpScale: 0.6, roughness: 0.8 }),
  stoneDark:  () => texturedMat('stoneDark', stoneTexture(0x7a7468, 1, true), { bumpScale: 0.9 }),
  concrete:   () => texturedMat('concrete', concreteTexture(1), { bumpScale: 0.4 }),
  tiles:      () => texturedMat('tiles', roofTexture(0xb35a3a, 1, true), { bumpScale: 0.5, roughness: 0.9 }),
  tilesOld:   () => texturedMat('tilesOld', roofTexture(0x9a5236, 1, true), { bumpScale: 0.5, roughness: 0.95 }),
  thatch:     () => texturedMat('thatch', thatchTexture(1), { bumpScale: 0.7 }),
  wood:       () => texturedMat('wood', woodTexture(0x6a4a2a, 1), { bumpScale: 0.3 }),
  woodDark:   () => texturedMat('woodDark', woodTexture(0x4a3018, 1), { bumpScale: 0.3 }),
  woodPale:   () => texturedMat('woodPale', woodTexture(0x8a6a3a, 1), { bumpScale: 0.3 }),
  pave:       () => texturedMat('pave', paveTexture(0x8a8276, 1), { bumpScale: 0.7 }),
  paveRoman:  () => texturedMat('paveRoman', paveTexture(0x9a9080, 1), { bumpScale: 0.7 }),
  dirt:       () => texturedMat('dirt', dirtTexture(0x9a7a52, 1), { bumpScale: 0.4 }),
  glass:      () => cachedMat('glass', () => new THREE.MeshStandardMaterial({ color: 0x223240, roughness: 0.15, metalness: 0.4 })),
  metal:      () => cachedMat('metal', () => new THREE.MeshStandardMaterial({ color: 0x33332f, metalness: 0.7, roughness: 0.4 })),
  metalPale:  () => cachedMat('metalPale', () => new THREE.MeshStandardMaterial({ color: 0x556b6b, metalness: 0.5, roughness: 0.5 })),
  salt:       () => cachedMat('salt', () => new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.6 })),
};
// volets : un matériau par couleur
function shutterMat(color) {
  const tex = shutterTexture(color, 1);
  return texturedMat(`shutter-${color}`, tex, { bumpScale: 0.25, roughness: 0.8 });
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.terrain = null;
    this.water = null;
    this.eraGroup = new THREE.Group();
    this.group.add(this.eraGroup);
    this.currentEra = null;
    this.tidal = 0;
    this.spawn = { x: -150, z: -16 };
    this.rng = mulberry32(7);

    // Collisions
    this.colliders = [];           // {x, z, r}
    this.grid = new Map();         // clé "cx,cz" -> [index...]
    this.cellSize = 8;
  }

  build() {
    this.buildTerrain();
    this.buildOcean();
    this.buildSky();
    this.markers = new THREE.Group();
    this.group.add(this.markers);
  }

  buildTerrain() {
    const geo = new THREE.PlaneGeometry(
      ISLAND_SIZE + 80, ISLAND_WIDTH + 80,
      TERRAIN_SEG, Math.floor(TERRAIN_SEG * (ISLAND_WIDTH / ISLAND_SIZE))
    );
    geo.rotateX(-Math.PI / 2);
    const positions = geo.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: grassDetailTexture(80),
      roughness: 1,
      metalness: 0,
    });
    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.group.add(this.terrain);
    this.refreshTerrain(getEra('contemporaine'));
  }

  // Recalcule hauteurs (aplanissement de la ville active) et couleurs.
  refreshTerrain(era) {
    const positions = this.terrain.geometry.attributes.position;
    const colors = this.terrain.geometry.attributes.color;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const h = heightAt(x, z);
      positions.setY(i, h);
      const c = terrainColor(x, z, h, era);
      colors.setXYZ(i, c.r, c.g, c.b);
    }
    positions.needsUpdate = true;
    colors.needsUpdate = true;
    this.terrain.geometry.computeVertexNormals();
  }

  buildOcean() {
    const geo = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 80, 80);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a6090, transparent: true, opacity: 0.88,
      roughness: 0.2, metalness: 0.1,
    });
    this.water = new THREE.Mesh(geo, mat);
    this.water.position.y = 0;
    this.group.add(this.water);
    this.waterStart = geo.attributes.position.array.slice();
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(WORLD_SIZE, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0xa4c4dc) },
        horizonColor: { value: new THREE.Color(0xe4c898) },
        bottomColor: { value: new THREE.Color(0x2a3a4a) },
        offset: { value: 0 }, exponent: { value: 0.7 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor, horizonColor, bottomColor;
        uniform float offset, exponent;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y + offset;
          if (h >= 0.0) {
            float t = pow(h, exponent);
            gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
          } else {
            float t = pow(-h, 0.5);
            gl_FragColor = vec4(mix(horizonColor, bottomColor, t), 1.0);
          }
        }`,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.scene.add(this.sky);
  }

  setSkyColors(top, horizon) {
    this.sky.material.uniforms.topColor.value.set(top);
    this.sky.material.uniforms.horizonColor.value.set(horizon);
  }

  // Balise dorée au-dessus de la ville de l'époque active.
  buildTownMarker(town) {
    while (this.markers.children.length) {
      const c = this.markers.children.pop();
      c.geometry?.dispose?.(); c.material?.dispose?.();
    }
    const geo = new THREE.CylinderGeometry(0.4, 0.4, 60, 6, 1, true);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xd4a857, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
    });
    const beam = new THREE.Mesh(geo, mat);
    const y = Math.max(2, heightAt(town.position[0], town.position[2]));
    beam.position.set(town.position[0], y + 30, town.position[2]);
    this.markers.add(beam);
  }

  // ---------- Collisions ----------
  addCollider(x, z, r) { this.colliders.push({ x, z, r }); }

  buildGrid() {
    this.grid.clear();
    const cs = this.cellSize;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      const cx = Math.floor(c.x / cs), cz = Math.floor(c.z / cs);
      const key = `${cx},${cz}`;
      if (!this.grid.has(key)) this.grid.set(key, []);
      this.grid.get(key).push(i);
    }
  }

  resolveCollision(x, z, radius) {
    const cs = this.cellSize;
    const cx = Math.floor(x / cs), cz = Math.floor(z / cs);
    for (let it = 0; it < 2; it++) {
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gz = cz - 1; gz <= cz + 1; gz++) {
          const arr = this.grid.get(`${gx},${gz}`);
          if (!arr) continue;
          for (const idx of arr) {
            const c = this.colliders[idx];
            const dx = x - c.x, dz = z - c.z;
            const rr = c.r + radius;
            const d2 = dx * dx + dz * dz;
            if (d2 < rr * rr) {
              const d = Math.sqrt(d2) || 0.0001;
              const push = rr - d;
              x += (dx / d) * push;
              z += (dz / d) * push;
            }
          }
        }
      }
    }
    return { x, z };
  }

  // ---------- Chargement d'époque : UNE ville ----------
  loadEra(eraId) {
    this.currentEra = eraId;
    const era = getEra(eraId);
    const town = LOCATIONS.find((l) => l.id === era.town);
    const [tx, , tz] = town.position;

    // Aplanit le terrain sous la ville (les villages rétais sont plats).
    const th = Math.max(1.3, rawHeight(tx, tz));
    setTownFlatten(tx, tz, 42, th);

    while (this.eraGroup.children.length) {
      const c = this.eraGroup.children.pop();
      c.traverse?.((o) => {
        o.geometry?.dispose?.();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose?.());
      });
    }
    this.colliders = [];
    this.rng = mulberry32(eraId.length * 1013 + 7);

    this.refreshTerrain(era);
    this.water.material.color.set(era.sea);

    // Contexte de construction : origine locale = centre de la ville.
    this.t = { x: tx, z: tz, h: th, era, group: new THREE.Group() };
    this.t.group.position.set(tx, 0, tz);
    this.eraGroup.add(this.t.group);
    this.spawn = { x: tx, z: tz + 5 };

    this.buildIslandRoad(era);

    switch (eraId) {
      case 'prehistoire':   this.buildPortesPrehistoire(); break;
      case 'antiquite':     this.buildSainteMarieAntique(); break;
      case 'moyenage':      this.buildFlotteMedievale(); break;
      case 'xvii':          this.buildSaintMartinVauban(); break;
      case 'xix':           this.buildArsXIX(); break;
      case 'wwii':          this.buildBoisPlageWWII(); break;
      case 'contemporaine': this.buildPhareContemporain(); break;
    }

    this.scatterVegetation(era, tx, tz);
    this.buildTownMarker(town);
    this.buildGrid();
  }

  getSpawn() { return this.spawn; }

  // ---------- Briques de construction (coordonnées locales à la ville) ----------
  // Hauteur du sol pour un point local.
  hL(x, z) { return heightAt(this.t.x + x, this.t.z + z); }
  colL(x, z, r) { this.addCollider(this.t.x + x, this.t.z + z, r); }

  // Maison rétaise : murs chaulés (ou pierre), toit de tuiles canal à deux
  // pentes avec pignons, porte encadrée de pierre, fenêtres à volets,
  // cheminée sur pignon. Échelle humaine : porte 2.05 m, étage 2.8 m.
  house(x, z, rot, o = {}) {
    const w = o.w ?? 4.6, d = o.d ?? 5.6, floors = o.floors ?? 1;
    const style = o.style ?? 'whitewash';
    const wallH = floors * 2.8 + 0.4;
    const roofH = w * (o.roofPitch ?? 0.42);
    const g = new THREE.Group();
    g.position.set(x, this.hL(x, z), z);
    g.rotation.y = rot;

    const wallMat = {
      whitewash: MAT.whitewash(), old: MAT.plasterOld(), stone: MAT.stoneOld(),
      roman: MAT.stone(), concrete: MAT.concrete(),
    }[style] || MAT.whitewash();
    const roofMat = style === 'stone' || style === 'old' ? MAT.tilesOld() : MAT.tiles();

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    body.position.y = wallH / 2;
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);

    // toit à deux pentes, faîtage le long de la profondeur, pignons en mur
    const roof = new THREE.Mesh(gableRoofGeometry(w, d, roofH), [roofMat, wallMat]);
    roof.position.y = wallH;
    roof.castShadow = true;
    g.add(roof);
    // génoise (corniche) sous les gouttières
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.16, d + 0.16), MAT.tilesOld());
    cornice.position.y = wallH - 0.02;
    g.add(cornice);

    // porte (2.05 m, proportionnée au joueur de 1.8 m) + encadrement pierre
    if (o.door !== false) {
      const doorX = o.doorX ?? -w * 0.22;
      const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 2.05, 0.08),
        o.closed ? MAT.woodDark() : MAT.wood());
      door.position.set(doorX, 1.02, d / 2 + 0.03);
      g.add(door);
      const lintel = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.22, 0.1), MAT.stonePale());
      lintel.position.set(doorX, 2.2, d / 2 + 0.04); g.add(lintel);
      for (const sgn of [-1, 1]) {
        const jamb = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.1, 0.1), MAT.stonePale());
        jamb.position.set(doorX + sgn * 0.6, 1.05, d / 2 + 0.04); g.add(jamb);
      }
    }

    // fenêtres + volets sur la façade (et l'étage le cas échéant)
    const shMat = shutterMat(o.shutter ?? 0x3f7f5f);
    const winXs = w > 5.4 ? [w * 0.05, w * 0.32] : [w * 0.25];
    for (let f = 0; f < floors; f++) {
      const winY = 1.5 + f * 2.8;
      const xs = f === 0 ? winXs : [-w * 0.22, ...winXs]; // fenêtre au-dessus de la porte
      for (const ox of xs) {
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.15, 0.06), MAT.glass());
        win.position.set(ox, winY, d / 2 + 0.03); g.add(win);
        const sill = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.08, 0.12), MAT.stonePale());
        sill.position.set(ox, winY - 0.62, d / 2 + 0.05); g.add(sill);
        if (o.closed) {
          const sh = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.18, 0.05), shMat);
          sh.position.set(ox, winY, d / 2 + 0.06); g.add(sh);
        } else {
          for (const sgn of [-1, 1]) {
            const sh = new THREE.Mesh(new THREE.BoxGeometry(0.42, 1.18, 0.05), shMat);
            sh.position.set(ox + sgn * 0.65, winY, d / 2 + 0.05);
            sh.rotation.y = sgn * 0.12;
            g.add(sh);
          }
        }
      }
    }

    // cheminée sur le pignon
    if (o.chimney !== false) {
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.5, roofH + 0.9, 0.5), wallMat);
      chimney.position.set((this.rng() > 0.5 ? 1 : -1) * (w / 2 - 0.4), wallH + (roofH + 0.9) / 2 - 0.2, 0);
      g.add(chimney);
    }

    this.t.group.add(g);
    if (o.col !== false) this.colL(x, z, Math.max(w, d) * 0.58);
    return g;
  }

  // Rangée de maisons mitoyennes le long d'un segment (façades alignées sur
  // le segment, qui borde la rue). face = +1/-1 : côté de la rue.
  row(x0, z0, x1, z1, face, o = {}) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len;
    const nx = face > 0 ? uz : -uz;
    const nz = face > 0 ? -ux : ux;
    const rot = Math.atan2(nx, nz);
    let s = 0;
    while (s < len - 3.6) {
      const w = Math.min(3.8 + this.rng() * 2.2, len - s);
      const d = 5.2 + this.rng() * 1.4;
      const floors = o.floors ?? (this.rng() < (o.twoFloorChance ?? 0.35) ? 2 : 1);
      const cx = x0 + ux * (s + w / 2) - nx * (d / 2);
      const cz = z0 + uz * (s + w / 2) - nz * (d / 2);
      this.house(cx, cz, rot, { ...o, w, d, floors });
      s += w + (o.gap ?? 0);
    }
  }

  // Bande de sol (rue, quai, piste) suivant le terrain. Points en LOCAL.
  street(pts, width, mat, lift = 0.07) {
    const samples = pts.map(([x, z]) => new THREE.Vector3(this.t.x + x, 0, this.t.z + z));
    this.strip(samples, width, mat, lift);
  }

  strip(samples, width, mat, lift = 0.07) {
    const positions = [], uvs = [], indices = [];
    let dist = 0;
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      const a = samples[Math.max(0, i - 1)];
      const b = samples[Math.min(samples.length - 1, i + 1)];
      let dx = b.x - a.x, dz = b.z - a.z;
      const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const px = -dz, pz = dx;
      const lx = p.x + px * width / 2, lz = p.z + pz * width / 2;
      const rx = p.x - px * width / 2, rz = p.z - pz * width / 2;
      const ly = Math.max(heightAt(lx, lz), 0.05) + lift;
      const ry = Math.max(heightAt(rx, rz), 0.05) + lift;
      positions.push(lx, ly, lz, rx, ry, rz);
      if (i > 0) dist += Math.hypot(p.x - samples[i - 1].x, p.z - samples[i - 1].z);
      const v = dist / 4;
      uvs.push(0, v, 1, v);
    }
    for (let i = 0; i < samples.length - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      indices.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.eraGroup.add(mesh);
  }

  // Place pavée rectangulaire.
  plaza(x, z, w, d, mat) {
    const geo = new THREE.PlaneGeometry(w, d, Math.ceil(w / 4), Math.ceil(d / 4));
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, this.hL(x + pos.getX(i), z + pos.getZ(i)) - this.hL(x, z) + 0.06);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.position.set(this.t.x + x, this.hL(x, z), this.t.z + z);
    m.receiveShadow = true;
    this.eraGroup.add(m);
  }

  // Mur (rempart, enceinte) entre deux points locaux, avec colliders.
  wallSeg(x1, z1, x2, z2, h, th, mat) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(len, h, th), mat);
    wall.position.set(mx, this.hL(mx, mz) + h / 2, mz);
    wall.rotation.y = -Math.atan2(dz, dx);
    wall.castShadow = true; wall.receiveShadow = true;
    this.t.group.add(wall);
    const steps = Math.max(1, Math.ceil(len / (th + 1)));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.colL(x1 + dx * t, z1 + dz * t, th * 0.7 + 0.4);
    }
    return wall;
  }

  // ---------- Petits éléments réutilisables ----------
  prop(mesh, x, z, yOff = 0, colR = 0) {
    mesh.position.set(x, this.hL(x, z) + yOff, z);
    mesh.castShadow = true;
    this.t.group.add(mesh);
    if (colR > 0) this.colL(x, z, colR);
    return mesh;
  }

  barrel(x, z) {
    this.prop(new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.85, 10), MAT.wood()), x, z, 0.43);
  }
  crate(x, z, s = 0.7) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(s, s, s), MAT.woodPale());
    m.rotation.y = this.rng() * 1.5;
    this.prop(m, x, z, s / 2);
  }
  amphora(x, z, tilt = 0) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.1, 0.85, 8),
      cachedMat('amphora', () => new THREE.MeshStandardMaterial({ color: 0xb5703a, roughness: 0.8 })));
    m.rotation.z = tilt;
    this.prop(m, x, z, 0.42);
  }
  saltHeap(x, z, s = 1.6) {
    this.prop(new THREE.Mesh(new THREE.ConeGeometry(s, s * 1.3, 9), MAT.salt()), x, z, 0, s * 0.9);
  }
  bollard(x, z) {
    this.prop(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.7, 8), MAT.stoneDark()), x, z, 0.35);
  }
  bench(x, z, rot = 0) {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.1, 0.45), MAT.woodPale());
    seat.position.y = 0.48; g.add(seat);
    for (const sgn of [-1, 1]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 0.4), MAT.metalPale());
      leg.position.set(sgn * 0.75, 0.24, 0); g.add(leg);
    }
    g.rotation.y = rot;
    this.prop(g, x, z, 0, 0.9);
  }
  signPost(x, z, color = 0x2a6a4a) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.4, 6), MAT.metalPale());
    pole.position.y = 1.2; g.add(pole);
    const sign = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.28, 0.04),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6 }));
    sign.position.set(0.4, 2.1, 0); g.add(sign);
    this.prop(g, x, z, 0, 0.3);
  }
  bikeRack(x, z) {
    for (let i = 0; i < 3; i++) {
      const arc = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 12, Math.PI), MAT.metalPale());
      this.prop(arc, x + i * 0.9, z, 0.4);
    }
    this.colL(x + 0.9, z, 1.4);
  }
  cannon(x, z, rot = 0) {
    const g = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, 2.0, 10), MAT.metal());
    barrel.rotation.x = Math.PI / 2 - 0.12;
    barrel.position.y = 0.62; g.add(barrel);
    for (const sgn of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 12), MAT.woodDark());
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(sgn * 0.45, 0.4, -0.2); g.add(wheel);
    }
    g.rotation.y = rot;
    this.prop(g, x, z, 0, 1.0);
  }
  flagpole(x, z, color = 0xffffff) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 9, 8), MAT.wood());
    pole.position.y = 4.5; g.add(pole);
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.3),
      new THREE.MeshStandardMaterial({ color, side: THREE.DoubleSide, roughness: 0.9 }));
    flag.position.set(1.1, 8.2, 0); g.add(flag);
    this.prop(g, x, z, 0, 0.4);
  }
  well(x, z) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.05, 1.1, 12), MAT.stoneOld());
    ring.position.y = 0.55; g.add(ring);
    for (const sgn of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.8, 0.12), MAT.wood());
      post.position.set(sgn * 0.9, 1.4, 0); g.add(post);
    }
    const cap = new THREE.Mesh(gableRoofGeometry(2.4, 1.4, 0.7, 0.1), [MAT.tilesOld(), MAT.wood()]);
    cap.position.y = 2.3; g.add(cap);
    this.prop(g, x, z, 0, 1.3);
  }
  marketStall(x, z, rot = 0, awning = 0xa84a3a) {
    const g = new THREE.Group();
    const table = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.1, 1.0), MAT.woodPale());
    table.position.y = 0.85; g.add(table);
    for (const [sx, sz] of [[-1, -0.4], [1, -0.4], [-1, 0.4], [1, 0.4]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.08), MAT.wood());
      leg.position.set(sx, 0.43, sz); g.add(leg);
    }
    const top = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.6),
      new THREE.MeshStandardMaterial({ color: awning, side: THREE.DoubleSide, roughness: 0.9 }));
    top.rotation.x = -Math.PI / 2 + 0.25;
    top.position.y = 2.1; g.add(top);
    for (const sx of [-1.1, 1.1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 2.1, 6), MAT.wood());
      post.position.set(sx, 1.05, 0.7); g.add(post);
    }
    g.rotation.y = rot;
    this.prop(g, x, z, 0, 1.4);
  }
  boat(x, z, rot, type = 'sail') {
    // Bateaux à flot : y fixé au niveau de la mer, pas au terrain.
    const g = new THREE.Group();
    const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.45, 4.6, 8, 1),
      MAT.woodDark());
    hull.rotation.z = Math.PI / 2;
    hull.scale.set(1, 1, 0.45);
    hull.position.y = 0.35; g.add(hull);
    if (type === 'sail' || type === 'gabarre') {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 5.4, 6), MAT.wood());
      mast.position.set(0.3, 2.9, 0); g.add(mast);
      if (type === 'sail') {
        const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 3.4),
          cachedMat('sail', () => new THREE.MeshStandardMaterial({ color: 0xeee6d2, side: THREE.DoubleSide, roughness: 0.9 })));
        sail.position.set(0.3, 3.0, 0); sail.rotation.y = Math.PI / 2; g.add(sail);
      }
    }
    if (type === 'modern') {
      const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.8, 1.1),
        cachedMat('cabin', () => new THREE.MeshStandardMaterial({ color: 0xf0f0f0, roughness: 0.5 })));
      cabin.position.set(-0.4, 0.95, 0); g.add(cabin);
    }
    g.position.set(this.t.x + x, 0.15, this.t.z + z);
    g.rotation.y = rot;
    g.traverse((c) => (c.castShadow = true));
    this.eraGroup.add(g);
    this.addCollider(this.t.x + x, this.t.z + z, 2.2);
  }
  lampPost(x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, 3.4, 8), MAT.metal());
    pole.position.y = 1.7; g.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.3),
      cachedMat('lampHead', () => new THREE.MeshStandardMaterial({ color: 0xfff0b0, emissive: 0xd4a857, emissiveIntensity: 0.5 })));
    head.position.y = 3.5; g.add(head);
    this.prop(g, x, z, 0, 0.3);
  }

  // ---------- Monuments ----------
  // Bunker type casemate du Mur de l'Atlantique (béton banché).
  bunker(x, z, rot = 0, big = true) {
    const g = new THREE.Group();
    const mat = MAT.concrete();
    const w = big ? 7 : 4, d = big ? 6 : 4, h = big ? 3 : 2.2;
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.y = h / 2; g.add(body);
    // toit débordant arrondi (casquette anti-éclats)
    const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.8, 0.7, d + 0.8), mat);
    cap.position.y = h + 0.3; g.add(cap);
    // embrasure de tir
    const slit = new THREE.Mesh(new THREE.BoxGeometry(big ? 2.4 : 1.4, 0.5, 0.5),
      cachedMat('slit', () => new THREE.MeshStandardMaterial({ color: 0x0c0c0c })));
    slit.position.set(0, h * 0.62, d / 2 + 0.1); g.add(slit);
    // entrée à l'arrière
    const doorway = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.4),
      cachedMat('slit', () => new THREE.MeshStandardMaterial({ color: 0x0c0c0c })));
    doorway.position.set(w * 0.25, 0.95, -d / 2 - 0.1); g.add(doorway);
    // talus de sable contre les flancs
    for (const sgn of [-1, 1]) {
      const berm = new THREE.Mesh(new THREE.SphereGeometry(d * 0.45, 8, 6),
        cachedMat('berm', () => new THREE.MeshStandardMaterial({ color: 0xcdb98a, roughness: 1 })));
      berm.scale.set(0.7, 0.45, 1);
      berm.position.set(sgn * (w / 2 + 0.5), 0, 0); g.add(berm);
    }
    g.rotation.y = rot;
    g.traverse((c) => { c.castShadow = true; c.receiveShadow = true; });
    this.prop(g, x, z, 0, Math.max(w, d) * 0.62);
  }

  // Hérisson tchèque (obstacle de plage).
  hedgehog(x, z) {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.16, 1.8, 0.16), MAT.metal());
      beam.rotation.set(0.9, (i / 3) * Math.PI * 2, 0.5);
      g.add(beam);
    }
    this.prop(g, x, z, 0.5, 0.8);
  }

  scaffolding(x, z, w, h, rot = 0) {
    const g = new THREE.Group();
    const mat = MAT.wood();
    for (const sx of [-w / 2, w / 2]) {
      for (const sz of [-0.5, 0.5]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, h, 0.12), mat);
        post.position.set(sx, h / 2, sz); g.add(post);
      }
    }
    for (let lvl = 1; lvl <= Math.floor(h / 1.8); lvl++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(w + 0.3, 0.08, 1.1), mat);
      plank.position.y = lvl * 1.8; g.add(plank);
    }
    g.rotation.y = rot;
    this.prop(g, x, z, 0, w * 0.4);
  }

  // ---------- Route de l'île (relie les emplacements des villes) ----------
  buildIslandRoad(era) {
    const style = era.architecture;
    const towns = [...LOCATIONS].sort((a, b) => a.position[0] - b.position[0]);
    const pts = towns.map((t) => new THREE.Vector3(t.position[0], 0, t.position[2]));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const samples = curve.getPoints(180);
    let map;
    if (style === 'contemporary') map = asphaltTexture(1, true);
    else if (style === 'huts' || style === 'wwii') map = dirtTexture(0x9a7a52, 1);
    else map = paveTexture(0x8a8276, 1);
    map.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshStandardMaterial({
      map, bumpMap: bumpOf(map), bumpScale: 0.4,
      roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2,
    });
    this.strip(samples, style === 'contemporary' ? 4.5 : 3.4, mat, 0.08);
  }

  // ---------- Vignobles (présents depuis les Romains) ----------
  vineyardField(cx, cz, rows = 8, length = 18, abandoned = false) {
    const stalkMat = MAT.woodDark();
    const leafMat = texturedMat(abandoned ? 'vineDry' : 'vineGreen',
      foliageTexture(abandoned ? 0x7a6a3a : 0x5a7a32, 1), { bumpScale: 0.3 });
    const postMat = MAT.wood();
    for (let r = 0; r < rows; r++) {
      const x = cx + r * 2.4;
      for (let p = 0; p <= length; p += 6) {
        const z = cz + p;
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.3, 0.08), postMat);
        this.prop(post, x, z, 0.65);
      }
      for (let s = 0; s <= length; s += 1.1) {
        const z = cz + s;
        if (this.hL(x, z) < 0.8) continue;
        const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.7, 0.07), stalkMat);
        this.prop(stalk, x, z, 0.35);
        if (!abandoned || this.rng() > 0.6) {
          const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.4), leafMat);
          this.prop(leaf, x, z, 0.95);
        }
      }
    }
  }

  // Cherche le rivage depuis le centre-ville dans une direction (coord. locales).
  findShore(dirX, dirZ, start = 26) {
    for (let r = start; r < 200; r += 2) {
      if (heightAt(this.t.x + dirX * r, this.t.z + dirZ * r) < 0.25) return r;
    }
    return 80;
  }

  // Quai de pierre au rivage + bateaux. Retourne la distance du quai.
  harbour(dirX, dirZ, o = {}) {
    const shoreR = this.findShore(dirX, dirZ);
    const qx = dirX * (shoreR - 3), qz = dirZ * (shoreR - 3);
    const rot = Math.atan2(dirX, dirZ);
    const quayW = o.width ?? 30;
    // plateforme de quai en pierre
    const quay = new THREE.Mesh(new THREE.BoxGeometry(quayW, 2.2, 9), MAT.stone());
    quay.position.set(this.t.x + qx, 0.7, this.t.z + qz);
    quay.rotation.y = rot;
    quay.receiveShadow = true; quay.castShadow = true;
    this.eraGroup.add(quay);
    // surface pavée du quai
    const deck = new THREE.Mesh(new THREE.BoxGeometry(quayW, 0.1, 9), MAT.pave());
    deck.position.set(this.t.x + qx, 1.85, this.t.z + qz);
    deck.rotation.y = rot;
    deck.receiveShadow = true;
    this.eraGroup.add(deck);
    // le joueur marche autour, pas à travers
    const px = -dirZ, pz = dirX;
    for (let s = -quayW / 2; s <= quayW / 2; s += 4) {
      this.colL(qx + px * s, qz + pz * s, 4.2);
    }
    // bittes d'amarrage
    for (let s = -quayW / 2 + 3; s <= quayW / 2 - 3; s += 6) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.6, 8), MAT.stoneDark());
      b.position.set(this.t.x + qx + px * s + dirX * 3.8, 2.2, this.t.z + qz + pz * s + dirZ * 3.8);
      this.eraGroup.add(b);
    }
    // ponton de bois s'avançant en mer
    const jetty = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.25, 14), MAT.woodPale());
    jetty.position.set(this.t.x + qx + dirX * 12, 0.8, this.t.z + qz + dirZ * 12);
    jetty.rotation.y = rot;
    jetty.castShadow = true;
    this.eraGroup.add(jetty);
    // bateaux d'époque
    const types = o.boats ?? ['sail', 'sail', 'row'];
    types.forEach((type, i) => {
      const s = -8 + i * 8;
      this.boat(qx + px * s + dirX * 9, qz + pz * s + dirZ * 9, rot + 0.3 * (i - 1), type);
    });
    // môles de Saint-Martin : deux bras de pierre fermant le bassin
    if (o.moles) {
      for (const sgn of [-1, 1]) {
        const mx = qx + px * sgn * quayW * 0.55 + dirX * 10;
        const mz = qz + pz * sgn * quayW * 0.55 + dirZ * 10;
        const mole = new THREE.Mesh(new THREE.BoxGeometry(4, 2.4, 20), MAT.stone());
        mole.position.set(this.t.x + mx, 0.6, this.t.z + mz);
        mole.rotation.y = rot + sgn * 0.35;
        mole.castShadow = true;
        this.eraGroup.add(mole);
        const head = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.4, 4.5, 10), MAT.stonePale());
        head.position.set(this.t.x + mx + dirX * 10, 2.2, this.t.z + mz + dirZ * 10);
        this.eraGroup.add(head);
        for (let s = -8; s <= 8; s += 4) this.colL(mx + dirX * s * 0.9, mz + dirZ * s * 0.9, 2.6);
      }
    }
    return shoreR;
  }

  // ====================================================================
  //  LES SEPT VILLES
  // ====================================================================

  // ----- Préhistoire : campement des Portes-en-Ré -----
  buildPortesPrehistoire() {
    this.spawn = { x: this.t.x, z: this.t.z + 18 };
    // sentier de terre vers le rivage
    this.street([[0, 24], [0, 8], [0, -10]], 2.2, new THREE.MeshStandardMaterial({
      map: dirtTexture(0xa3845a, 1), bumpMap: bumpOf(dirtTexture(0xa3845a, 1)), bumpScale: 0.3, roughness: 1,
    }));

    // huttes en cercle autour du feu
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      const r = 11 + (i % 2) * 3;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const g = new THREE.Group();
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.9, 1.5, 9), MAT.wood());
      wall.position.y = 0.75; wall.castShadow = true; g.add(wall);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2.2, 9), MAT.thatch());
      roof.position.y = 2.4; roof.castShadow = true; g.add(roof);
      this.prop(g, x, z, 0, 2.1);
    }
    // feu central
    const fire = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.9, 6),
      cachedMat('fire', () => new THREE.MeshBasicMaterial({ color: 0xff7733 })));
    this.prop(fire, 0, 0, 0.45, 1.0);
    const fl = new THREE.PointLight(0xff7733, 1.6, 14);
    fl.position.set(this.t.x, this.t.h + 1, this.t.z);
    this.t.group.add(fl);
    // pierres autour du feu
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const st = new THREE.Mesh(new THREE.SphereGeometry(0.25, 6, 5), MAT.stoneDark());
      this.prop(st, Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0.1);
    }

    // dolmen
    const dolmen = new THREE.Group();
    for (const sgn of [-1, 1]) {
      const up = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 1.6), MAT.stoneDark());
      up.position.set(sgn * 1.2, 1.1, 0); dolmen.add(up);
    }
    const cap = new THREE.Mesh(new THREE.BoxGeometry(4, 0.7, 2.6), MAT.stoneDark());
    cap.position.y = 2.5; dolmen.add(cap);
    dolmen.traverse((c) => (c.castShadow = true));
    this.prop(dolmen, 20, -8, 0, 2.6);

    // alignement de menhirs vers le nord
    for (let i = 0; i < 5; i++) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.1, 2.6 + this.rng() * 1.8, 0.9), MAT.stoneDark());
      m.rotation.y = this.rng();
      this.prop(m, -16 - i * 4, -10 - i * 5, 1.4, 1.0);
    }

    // séchoirs à poissons et peaux tendues
    for (let i = 0; i < 3; i++) {
      const rack = new THREE.Group();
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.7, 0.1), MAT.wood());
        post.position.set(sx, 0.85, 0); rack.add(post);
      }
      const bar = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.07, 0.07), MAT.wood());
      bar.position.y = 1.55; rack.add(bar);
      for (let f = 0; f < 3; f++) {
        const fish = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.5, 0.04),
          cachedMat('fish', () => new THREE.MeshStandardMaterial({ color: 0x9aa8a0, roughness: 0.6 })));
        fish.position.set(-0.7 + f * 0.7, 1.25, 0); rack.add(fish);
      }
      rack.rotation.y = this.rng() * 3;
      this.prop(rack, 16 + i * 3, 8 + i * 2, 0, 1.0);
    }

    // pirogue monoxyle au rivage nord
    const shoreR = this.findShore(0, -1);
    const canoe = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 4.4, 7, 1, false, 0, Math.PI), MAT.woodDark());
    canoe.rotation.set(Math.PI, 0, Math.PI / 2);
    canoe.position.set(this.t.x + 3, 0.5, this.t.z - shoreR + 3);
    canoe.castShadow = true;
    this.eraGroup.add(canoe);
  }

  // ----- Antiquité : Sainte-Marie-de-Ré, comptoir romain -----
  buildSainteMarieAntique() {
    this.spawn = { x: this.t.x, z: this.t.z + 16 };
    const pave = MAT.paveRoman();
    // decumanus est-ouest + cardo vers la jetée au sud
    this.street([[-34, 0], [0, 0], [34, 0]], 4.2, pave);
    this.street([[0, 0], [0, 20], [0, 36]], 3.6, pave);
    this.plaza(0, 6, 18, 12, pave);

    // villa romaine : corps + ailes + péristyle de colonnes
    const villa = this.house(-17, -9, 0, {
      w: 12, d: 8, floors: 1, style: 'roman', roofPitch: 0.26,
      shutter: 0x8a5a2a, door: false, chimney: false,
    });
    for (let i = 0; i < 6; i++) {
      const colm = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 3.2, 12), MAT.stonePale());
      colm.castShadow = true;
      this.prop(colm, -22 + i * 2.1, -3.6, 1.6);
    }
    const portico = new THREE.Mesh(new THREE.BoxGeometry(12.6, 0.5, 2.4), MAT.tiles());
    this.prop(portico, -17, -3.6, 3.5);
    this.colL(-17, -9, 7);

    // horreum (entrepôt à grain et sel)
    this.house(14, -8, 0, { w: 14, d: 7, floors: 1, style: 'roman', roofPitch: 0.3, door: false, chimney: false });
    const horDoor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.6, 0.12), MAT.woodDark());
    this.prop(horDoor, 14, -4.4, 1.3);

    // maisons d'artisans au sud du decumanus (façades sur la rue)
    this.row(-30, 2.8, -10, 2.8, 1, { style: 'old', shutter: 0x8a5a2a, twoFloorChance: 0, gap: 0.4 });
    this.row(10, 2.8, 30, 2.8, 1, { style: 'old', shutter: 0x8a5a2a, twoFloorChance: 0, gap: 0.4 });

    // marché : étals, amphores, sacs
    this.marketStall(-4, 8, 0.3, 0xa84a3a);
    this.marketStall(5, 9, -0.2, 0x8a7a3a);
    for (let i = 0; i < 6; i++) this.amphora(7 + (i % 3), 13 + Math.floor(i / 3) * 1.2, this.rng() * 0.3);
    this.crate(-7, 12); this.crate(-8.2, 12.6, 0.5);

    // jetée de pierre romaine au rivage sud + barque
    const shoreR = this.findShore(0, 1, 30);
    const jetty = new THREE.Mesh(new THREE.BoxGeometry(3.4, 1.8, 22), MAT.stone());
    jetty.position.set(this.t.x, 0.5, this.t.z + shoreR + 6);
    jetty.castShadow = true; jetty.receiveShadow = true;
    this.eraGroup.add(jetty);
    for (let s = 0; s < 20; s += 4) this.colL(0, shoreR + s - 2, 2.4);
    this.boat(5, shoreR + 8, 0.4, 'sail');
    for (let i = 0; i < 4; i++) this.amphora(1 + (i % 2) * 1.2, shoreR - 3 - Math.floor(i / 2), 0);

    // borne milliaire
    const mile = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.36, 1.6, 10), MAT.stonePale());
    this.prop(mile, 2.5, 18, 0.8, 0.5);
  }

  // ----- Moyen Âge : La Flotte, halles et abbaye en chantier -----
  buildFlotteMedievale() {
    this.spawn = { x: this.t.x, z: this.t.z + 16 };
    const pave = MAT.pave();
    // rue principale + venelle vers le port (nord)
    this.street([[-30, 4], [0, 2], [30, 4]], 3.6, pave);
    this.street([[0, 2], [-2, -14], [-2, -30]], 3.0, pave);
    this.plaza(0, -4, 20, 14, pave);

    // halles médiévales : charpente de bois ouverte sous grand toit de tuiles
    const halles = new THREE.Group();
    for (let px = -1; px <= 1; px++) {
      for (let pz = -1; pz <= 1; pz++) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.4, 0.3), MAT.woodDark());
        post.position.set(px * 3.6, 1.7, pz * 2.6);
        post.castShadow = true;
        halles.add(post);
      }
    }
    const hallRoof = new THREE.Mesh(gableRoofGeometry(9.6, 7.4, 2.6, 0.6), [MAT.tilesOld(), MAT.woodDark()]);
    hallRoof.position.y = 3.4;
    hallRoof.castShadow = true;
    halles.add(hallRoof);
    this.prop(halles, 1, -6, 0, 0);
    for (const [hx, hz] of [[-2.6, -8.6], [4.6, -8.6], [-2.6, -3.4], [4.6, -3.4]]) this.colL(hx, hz, 0.5);
    this.marketStall(-2, -5.5, 0.2, 0x6a8a4a);
    this.barrel(4, -5); this.crate(4.8, -4.2);

    // rangées de maisons en pierre le long de la rue
    this.row(-28, 8, -4, 8, 1, { style: 'stone', shutter: 0x5a4a32, twoFloorChance: 0.5 });
    this.row(6, 8, 28, 8, 1, { style: 'stone', shutter: 0x5a4a32, twoFloorChance: 0.5 });
    this.row(-26, -1, -14, -1, -1, { style: 'stone', shutter: 0x5a4a32 });
    this.row(10, -12, 26, -12, 1, { style: 'stone', shutter: 0x5a4a32 });
    this.well(8, -2);

    // abbaye des Châteliers : façade gothique + nef en construction
    const ab = new THREE.Group();
    const facade = new THREE.Mesh(new THREE.BoxGeometry(10, 11, 1.4), MAT.stoneOld());
    facade.position.y = 5.5; facade.castShadow = true; ab.add(facade);
    // rosace
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 16),
      cachedMat('rose', () => new THREE.MeshStandardMaterial({ color: 0x223240, roughness: 0.3 })));
    rose.rotation.x = Math.PI / 2;
    rose.position.set(0, 7.5, 0.7); ab.add(rose);
    // portail ogival
    const portal = new THREE.Mesh(new THREE.BoxGeometry(2.2, 3.6, 0.5),
      cachedMat('slit', () => new THREE.MeshStandardMaterial({ color: 0x0c0c0c })));
    portal.position.set(0, 1.8, 0.6); ab.add(portal);
    // pignon triangulaire
    const gable = new THREE.Mesh(new THREE.ConeGeometry(5.4, 3.2, 4), MAT.stoneOld());
    gable.rotation.y = Math.PI / 4;
    gable.scale.z = 0.2;
    gable.position.y = 12.5; ab.add(gable);
    // murs latéraux inachevés (hauteurs croissantes)
    for (const sgn of [-1, 1]) {
      for (let seg = 0; seg < 4; seg++) {
        const h = 7 - seg * 1.4;
        const wallSeg = new THREE.Mesh(new THREE.BoxGeometry(1.1, h, 4.4), MAT.stoneOld());
        wallSeg.position.set(sgn * 4.5, h / 2, -3.2 - seg * 4.4);
        wallSeg.castShadow = true;
        ab.add(wallSeg);
      }
    }
    this.prop(ab, 26, -22, 0, 0);
    this.colL(26, -22, 6.5);
    this.colL(26, -32, 5);
    // chantier : échafaudages, grue à roue, pierres taillées
    this.scaffolding(31.5, -27, 3.2, 6.5, Math.PI / 2);
    const crane = new THREE.Group();
    const mastC = new THREE.Mesh(new THREE.BoxGeometry(0.3, 7, 0.3), MAT.woodDark());
    mastC.position.y = 3.5; crane.add(mastC);
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 5), MAT.woodDark());
    arm.position.set(0, 6.6, 2.2); crane.add(arm);
    const rope = new THREE.Mesh(new THREE.BoxGeometry(0.04, 3.4, 0.04),
      cachedMat('rope', () => new THREE.MeshStandardMaterial({ color: 0xb8a878 })));
    rope.position.set(0, 4.9, 4.4); crane.add(rope);
    const block = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.7, 0.9), MAT.stonePale());
    block.position.set(0, 3, 4.4); crane.add(block);
    crane.traverse((c) => (c.castShadow = true));
    this.prop(crane, 20, -26, 0, 1.2);
    for (let i = 0; i < 5; i++) {
      const cut = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.7), MAT.stonePale());
      cut.rotation.y = this.rng();
      this.prop(cut, 16 + (i % 3) * 1.4, -19 - Math.floor(i / 3) * 1.2, 0.3);
    }

    // port médiéval au nord, relié par la venelle
    const shoreR = this.harbour(0, -1, { width: 24, boats: ['sail', 'row'] });
    this.street([[-2, -30], [-1, -(shoreR - 8)]], 3.0, pave);
  }

  // ----- XVIIᵉ : Saint-Martin-de-Ré fortifié par Vauban -----
  buildSaintMartinVauban() {
    this.spawn = { x: this.t.x, z: this.t.z + 24 };
    const pave = MAT.pave();
    // trame de rues : grand-rue nord-sud (de porte à porte), rues est-ouest
    this.street([[0, 50], [0, 30], [0, 8], [0, -16], [0, -46]], 4.2, pave);
    this.street([[-30, 8], [0, 8], [30, 8]], 3.6, pave);
    this.street([[-26, -10], [0, -10], [26, -10]], 3.6, pave);
    this.plaza(-14, -1, 16, 10, pave);

    // remparts Vauban : enceinte hexagonale à 6 bastions en étoile,
    // portes au sud (campagne) et au nord (port)
    const R = 52, B = 64;
    const stone = MAT.stone();
    const gateAngles = [Math.PI / 2, -Math.PI / 2];
    for (let i = 0; i < 6; i++) {
      const a0 = (i / 6) * Math.PI * 2;
      const a1 = ((i + 1) / 6) * Math.PI * 2;
      const am = (a0 + a1) / 2;
      const s0 = [Math.cos(a0) * R, Math.sin(a0) * R];
      const s1 = [Math.cos(a1) * R, Math.sin(a1) * R];
      // courtine (percée d'une porte au sud et au nord)
      const isGate = gateAngles.some((ga) =>
        Math.abs(((am - ga + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.35);
      if (isGate) {
        const gx = (s0[0] + s1[0]) / 2, gz = (s0[1] + s1[1]) / 2;
        this.wallSeg(s0[0], s0[1], gx * 0.96 - 4, gz * 0.96, 4.5, 2.6, stone);
        this.wallSeg(gx * 0.96 + 4, gz * 0.96, s1[0], s1[1], 4.5, 2.6, stone);
        // porte des Campani : deux tourelles
        for (const sgn of [-1, 1]) {
          const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.9, 6.5, 10), stone);
          tower.castShadow = true;
          this.prop(tower, gx * 0.96 + sgn * 4.4, gz * 0.96, 3.2, 2.1);
          const cap = new THREE.Mesh(new THREE.ConeGeometry(2.0, 1.8, 10),
            cachedMat('slate', () => new THREE.MeshStandardMaterial({ color: 0x3a4048, roughness: 0.7 })));
          this.prop(cap, gx * 0.96 + sgn * 4.4, gz * 0.96, 7.3);
        }
      } else {
        this.wallSeg(s0[0], s0[1], s1[0], s1[1], 4.5, 2.6, stone);
      }
      // bastion en flèche au sommet i
      const tip = [Math.cos(a0) * B, Math.sin(a0) * B];
      const shoulderL = [Math.cos(a0 - 0.18) * (R - 2), Math.sin(a0 - 0.18) * (R - 2)];
      const shoulderR = [Math.cos(a0 + 0.18) * (R - 2), Math.sin(a0 + 0.18) * (R - 2)];
      this.wallSeg(shoulderL[0], shoulderL[1], tip[0], tip[1], 4.5, 2.4, stone);
      this.wallSeg(tip[0], tip[1], shoulderR[0], shoulderR[1], 4.5, 2.4, stone);
      // canon sur la plateforme du bastion
      const cx = Math.cos(a0) * (B - 6), cz = Math.sin(a0) * (B - 6);
      this.cannon(cx, cz, a0 + Math.PI / 2);
    }

    // citadelle au nord-est, adossée à l'enceinte : carré bastionné + casernes
    const C = { x: 26, z: -20, s: 10 };
    this.wallSeg(C.x - C.s, C.z - C.s, C.x + C.s, C.z - C.s, 5, 2.2, stone);
    this.wallSeg(C.x + C.s, C.z - C.s, C.x + C.s, C.z + C.s, 5, 2.2, stone);
    this.wallSeg(C.x + C.s, C.z + C.s, C.x + 4, C.z + C.s, 5, 2.2, stone);
    this.wallSeg(C.x - 4, C.z + C.s, C.x - C.s, C.z + C.s, 5, 2.2, stone);
    this.wallSeg(C.x - C.s, C.z + C.s, C.x - C.s, C.z - C.s, 5, 2.2, stone);
    this.house(C.x - 3, C.z - 5, 0, { w: 9, d: 5, floors: 2, style: 'old', shutter: 0x4a5560, twoFloorChance: 1 });
    this.house(C.x + 5.5, C.z - 1, Math.PI / 2, { w: 7, d: 4.5, floors: 1, style: 'old', shutter: 0x4a5560 });
    this.flagpole(C.x - 5, C.z + 4, 0xffffff);

    // église Saint-Martin : grosse tour-clocher carrée + nef
    const ch = new THREE.Group();
    const nave = new THREE.Mesh(new THREE.BoxGeometry(8, 7, 16), MAT.stoneOld());
    nave.position.y = 3.5; nave.castShadow = true; ch.add(nave);
    const naveRoof = new THREE.Mesh(gableRoofGeometry(8, 16, 3), [MAT.tilesOld(), MAT.stoneOld()]);
    naveRoof.position.y = 7; naveRoof.castShadow = true; ch.add(naveRoof);
    const tower = new THREE.Mesh(new THREE.BoxGeometry(5.5, 16, 5.5), MAT.stoneOld());
    tower.position.set(0, 8, -10.5); tower.castShadow = true; ch.add(tower);
    const platform = new THREE.Mesh(new THREE.BoxGeometry(6.2, 0.8, 6.2), MAT.stonePale());
    platform.position.set(0, 16.2, -10.5); ch.add(platform);
    this.prop(ch, -14, -24, 0, 0);
    this.colL(-14, -24, 5.5);
    this.colL(-14, -34.5, 4);

    // maisons de ville (blanches, volets gris-vert d'époque)
    this.row(-28, 13, -4, 13, 1, { shutter: 0x57705e, twoFloorChance: 0.6 });
    this.row(4, 13, 28, 13, 1, { shutter: 0x57705e, twoFloorChance: 0.6 });
    this.row(4, 3, 28, 3, -1, { shutter: 0x57705e, twoFloorChance: 0.5 });
    this.row(4, -14, 12, -14, -1, { shutter: 0x4a5560 });
    this.row(-28, -14, -24, -14, -1, { shutter: 0x4a5560 });
    this.well(-14, 0);
    this.barrel(-8, 2); this.barrel(-7, 3); this.crate(-9, 1.6);

    // port : bassin à flot fermé par deux môles, au nord (hors les murs),
    // relié par la grand-rue qui franchit la porte nord
    const shoreR = this.harbour(0, -1, { width: 34, boats: ['sail', 'sail', 'sail'], moles: true });
    this.street([[0, -46], [0, -(shoreR - 8)]], 4.2, pave);
  }

  // ----- XIXᵉ : Ars-en-Ré, capitale du sel -----
  buildArsXIX() {
    this.spawn = { x: this.t.x, z: this.t.z + 14 };
    const pave = MAT.pave();
    this.street([[-30, 6], [0, 4], [30, 6]], 3.8, pave);
    this.plaza(0, -6, 18, 14, pave);

    // église Saint-Étienne : clocher noir et blanc (amer pour les marins)
    const ch = new THREE.Group();
    const nave = new THREE.Mesh(new THREE.BoxGeometry(7.5, 6.5, 14), MAT.stoneOld());
    nave.position.y = 3.25; nave.castShadow = true; ch.add(nave);
    const naveRoof = new THREE.Mesh(gableRoofGeometry(7.5, 14, 2.8), [MAT.tilesOld(), MAT.stoneOld()]);
    naveRoof.position.y = 6.5; ch.add(naveRoof);
    const base = new THREE.Mesh(new THREE.BoxGeometry(5, 11, 5), MAT.stoneOld());
    base.position.set(0, 5.5, -9.5); base.castShadow = true; ch.add(base);
    // flèche octogonale : moitié basse blanche, pointe noire
    const spireWhite = new THREE.Mesh(new THREE.ConeGeometry(3.1, 7, 8),
      cachedMat('spireW', () => new THREE.MeshStandardMaterial({ color: 0xf4f0e6, roughness: 0.7 })));
    spireWhite.position.set(0, 14.5, -9.5); spireWhite.castShadow = true; ch.add(spireWhite);
    const spireBlack = new THREE.Mesh(new THREE.ConeGeometry(1.85, 7.5, 8),
      cachedMat('spireB', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.6 })));
    spireBlack.position.set(0, 19.2, -9.5); spireBlack.castShadow = true; ch.add(spireBlack);
    this.prop(ch, -8, -18, 0, 0);
    this.colL(-8, -18, 5);
    this.colL(-8, -27.5, 3.6);

    // rues de maisons blanches aux volets verts (cœur d'Ars)
    this.row(-28, 10, -4, 10, 1, { shutter: 0x3f7f5f, twoFloorChance: 0.3 });
    this.row(4, 10, 28, 10, 1, { shutter: 0x3f7f5f, twoFloorChance: 0.3 });
    this.row(-26, 1, -12, 1, -1, { shutter: 0x3f7f5f });
    this.row(12, 1, 26, 1, -1, { shutter: 0x3f7f5f });
    this.well(7, -4);
    this.bench(-4, -3, 0.4);

    // marais salants à l'ouest : bassins, tas de sel, cabanes de sauniers
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        const px = -52 + r * 7, pz = -4 + c * 7;
        const pond = new THREE.Mesh(new THREE.PlaneGeometry(6, 6),
          cachedMat('brine', () => new THREE.MeshStandardMaterial({
            color: 0xb8c8c0, transparent: true, opacity: 0.78, roughness: 0.12, metalness: 0.1,
          })));
        pond.rotation.x = -Math.PI / 2;
        pond.position.set(this.t.x + px, this.hL(px, pz) + 0.04, this.t.z + pz);
        this.eraGroup.add(pond);
        const bund = new THREE.Mesh(new THREE.BoxGeometry(6.8, 0.35, 0.4), MAT.dirt());
        bund.position.set(this.t.x + px, this.hL(px, pz) + 0.15, this.t.z + pz - 3.4);
        this.eraGroup.add(bund);
        const bund2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.35, 6.8), MAT.dirt());
        bund2.position.set(this.t.x + px - 3.4, this.hL(px, pz) + 0.15, this.t.z + pz);
        this.eraGroup.add(bund2);
      }
    }
    for (let i = 0; i < 5; i++) this.saltHeap(-50 + i * 6, 20, 1.4 + this.rng() * 0.6);
    this.house(-40, 26, 0.3, { w: 4, d: 3.4, floors: 1, style: 'old', shutter: 0x5a4a32, chimney: false });
    // saunier avec sa "simoussi" (brouette à sel) : simple brouette
    const barrow = new THREE.Group();
    const tray = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.3, 0.7), MAT.woodPale());
    tray.position.y = 0.45; barrow.add(tray);
    const wheelB = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.08, 10), MAT.woodDark());
    wheelB.rotation.z = Math.PI / 2; wheelB.position.set(0, 0.3, 0.5); barrow.add(wheelB);
    this.prop(barrow, -36, 19, 0, 0.8);

    // port du sel au nord : quai + gabarres chargées, relié par la rue du port
    const shoreR = this.harbour(0, -1, { width: 26, boats: ['gabarre', 'gabarre', 'sail'] });
    this.street([[2, 0], [2, -20], [2, -(shoreR - 8)]], 3.2, pave);
    for (let i = 0; i < 6; i++) {
      const sack = new THREE.Mesh(new THREE.SphereGeometry(0.4, 7, 6),
        cachedMat('sack', () => new THREE.MeshStandardMaterial({ color: 0xd8cdb4, roughness: 1 })));
      sack.scale.set(1, 0.8, 1);
      sack.position.set(this.t.x - 6 + (i % 3) * 1.1, 2.2, this.t.z - shoreR + 3 + Math.floor(i / 3));
      this.eraGroup.add(sack);
    }

    // vignoble au sud-est (le vignoble rétais est à son apogée)
    this.vineyardField(24, 18, 7, 16);
  }

  // ----- WWII : Le Bois-Plage occupé, Mur de l'Atlantique -----
  buildBoisPlageWWII() {
    this.spawn = { x: this.t.x, z: this.t.z - 9 };
    const dirt = texturedMat('dirtRoad', dirtTexture(0x8a7048, 1), { bumpScale: 0.4 });
    this.street([[-28, -8], [0, -10], [28, -8]], 3.6, dirt);
    this.street([[0, -10], [0, 8], [0, 26]], 3.2, dirt);

    // village aux volets clos, façades ternies
    this.row(-26, -5, -4, -5, 1, { style: 'old', shutter: 0x55603f, closed: true, twoFloorChance: 0.3 });
    this.row(4, -5, 26, -5, 1, { style: 'old', shutter: 0x55603f, closed: true, twoFloorChance: 0.3 });
    this.row(-26, -14, -6, -14, -1, { style: 'old', shutter: 0x55603f, closed: true });
    this.row(6, -14, 24, -14, -1, { style: 'old', shutter: 0x55603f, closed: true });
    // petite église de village
    const ch = new THREE.Group();
    const nave = new THREE.Mesh(new THREE.BoxGeometry(6, 5.5, 10), MAT.stoneOld());
    nave.position.y = 2.75; nave.castShadow = true; ch.add(nave);
    const naveRoof = new THREE.Mesh(gableRoofGeometry(6, 10, 2.4), [MAT.tilesOld(), MAT.stoneOld()]);
    naveRoof.position.y = 5.5; ch.add(naveRoof);
    const towerW = new THREE.Mesh(new THREE.BoxGeometry(3.4, 9, 3.4), MAT.stoneOld());
    towerW.position.set(0, 4.5, -6.5); towerW.castShadow = true; ch.add(towerW);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.4, 4, 4),
      cachedMat('spireB', () => new THREE.MeshStandardMaterial({ color: 0x14141a, roughness: 0.6 })));
    spire.rotation.y = Math.PI / 4;
    spire.position.set(0, 11, -6.5); ch.add(spire);
    this.prop(ch, -18, -28, 0, 0);
    this.colL(-18, -28, 4.5);
    this.colL(-18, -34.5, 2.6);

    // mirador en bois à l'entrée du village
    const tw = new THREE.Group();
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.16, 6.5, 0.16), MAT.woodDark());
      leg.position.set(sx, 3.25, sz);
      leg.rotation.z = -sx * 0.08; leg.rotation.x = sz * 0.08;
      tw.add(leg);
    }
    const cab = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.7, 2.6), MAT.woodDark());
    cab.position.y = 7.2; cab.castShadow = true; tw.add(cab);
    const twRoof = new THREE.Mesh(gableRoofGeometry(2.8, 2.8, 0.8, 0.2), [MAT.woodDark(), MAT.woodDark()]);
    twRoof.position.y = 8.05; tw.add(twRoof);
    this.prop(tw, 10, 4, 0, 1.6);

    // dunes au sud : casemates, tobrouk, obstacles et barbelés
    const shoreR = this.findShore(0, 1, 24);
    this.bunker(-10, shoreR - 10, 0.15, true);
    this.bunker(14, shoreR - 12, -0.2, true);
    this.bunker(2, shoreR - 18, 0, false);
    // hérissons tchèques et pieux sur l'estran
    for (let i = 0; i < 8; i++) {
      this.hedgehog(-18 + i * 5 + this.rng() * 2, shoreR - 3 + this.rng() * 3);
    }
    for (let i = 0; i < 10; i++) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 2.2, 6), MAT.woodDark());
      pole.rotation.z = (this.rng() - 0.5) * 0.3;
      this.prop(pole, -20 + i * 4.5, shoreR + 1 + this.rng() * 2, 1.0);
    }
    // lignes de barbelés sur piquets
    for (const zOff of [shoreR - 7, shoreR - 6]) {
      for (let x = -20; x <= 20; x += 4) {
        const picket = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.2, 5), MAT.metal());
        this.prop(picket, x, zOff, 0.6);
      }
      const wire = new THREE.Mesh(new THREE.BoxGeometry(40, 0.04, 0.04),
        cachedMat('wire', () => new THREE.MeshStandardMaterial({ color: 0x222220, roughness: 0.6 })));
      this.prop(wire, 0, zOff, 1.0);
      this.colL(0, zOff, 1.2); this.colL(-10, zOff, 1.2); this.colL(10, zOff, 1.2);
    }
    // panneau "ACHTUNG MINEN"
    this.signPost(-3, shoreR - 8, 0x8a2a1a);

    // vignoble abandonné au nord-ouest
    this.vineyardField(-42, -44, 6, 14, true);
    // sacs de sable près du poste
    for (let i = 0; i < 8; i++) {
      const bag = new THREE.Mesh(new THREE.SphereGeometry(0.38, 6, 5),
        cachedMat('sand', () => new THREE.MeshStandardMaterial({ color: 0x8a7a4a, roughness: 1 })));
      bag.scale.set(1.3, 0.65, 0.9);
      this.prop(bag, 8 + (i % 4) * 0.9, 6.5 + Math.floor(i / 4) * 0.7, 0.25);
    }
    this.colL(9.5, 7, 1.8);
  }

  // ----- Contemporaine : le Phare des Baleines, patrimoine vivant -----
  buildPhareContemporain() {
    this.spawn = { x: this.t.x, z: this.t.z + 18 };
    const asphalt = texturedMat('cycleway', asphaltTexture(1, true), { bumpScale: 0.2, roughness: 0.95 });
    // piste cyclable arrivant de l'est + parvis pavé
    this.street([[40, 14], [18, 12], [0, 10]], 3.4, asphalt);
    this.plaza(0, 4, 22, 16, MAT.pave());

    // le grand phare (1854) : fût de pierre, galerie, lanterne noire
    const phare = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4.0, 46, 20), MAT.stonePale());
    tower.position.y = 23; tower.castShadow = true; phare.add(tower);
    // corniche et galerie
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 0.5, 20), MAT.stonePale());
    gallery.position.y = 46.2; phare.add(gallery);
    const railing = new THREE.Mesh(new THREE.CylinderGeometry(3.3, 3.3, 1.1, 20, 1, true), MAT.metal());
    railing.position.y = 47; phare.add(railing);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 3.6, 14),
      cachedMat('lantern', () => new THREE.MeshStandardMaterial({ color: 0x1c1c20, metalness: 0.55, roughness: 0.35 })));
    lantern.position.y = 49; phare.add(lantern);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.0, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      cachedMat('lantern', () => new THREE.MeshStandardMaterial({ color: 0x1c1c20, metalness: 0.55, roughness: 0.35 })));
    dome.position.y = 50.8; phare.add(dome);
    const lightBall = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8),
      cachedMat('beam', () => new THREE.MeshBasicMaterial({ color: 0xfff0a8 })));
    lightBall.position.y = 49; phare.add(lightBall);
    const beacon = new THREE.PointLight(0xfff0c0, 1.4, 80);
    beacon.position.y = 49; phare.add(beacon);
    this.prop(phare, -8, -10, 0, 4.6);

    // la vieille tour des Baleines (Vauban, 1682) à côté
    const vt = new THREE.Group();
    const vtTower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 17, 14), MAT.stoneOld());
    vtTower.position.y = 8.5; vtTower.castShadow = true; vt.add(vtTower);
    const vtTop = new THREE.Mesh(new THREE.ConeGeometry(3.0, 2.6, 14), MAT.tilesOld());
    vtTop.position.y = 18.2; vt.add(vtTop);
    this.prop(vt, 7, -14, 0, 3.8);

    // musée et maison du gardien
    this.house(14.5, -2, Math.PI / 2, { w: 9, d: 5.5, floors: 1, shutter: 0x9a3a2a, twoFloorChance: 0 });
    this.house(-15, 2, -Math.PI / 2, { w: 6, d: 5, floors: 1, shutter: 0x9a3a2a });
    // billetterie / boutique
    this.house(4, 14, Math.PI, { w: 5, d: 4, floors: 1, shutter: 0x3f7f5f, chimney: false });

    // hameau du Gillieux le long de la piste
    this.row(20, 17, 38, 17, 1, { shutter: 0x3f7f5f, twoFloorChance: 0.2 });
    this.row(22, 9, 36, 9, -1, { shutter: 0x4a6a8a, twoFloorChance: 0.2 });

    // mobilier contemporain : arceaux vélo, bancs, panneaux, lampadaires
    this.bikeRack(-4, 14);
    this.bench(-8, 8, 0.2);
    this.bench(-1, 17, -0.3);
    this.signPost(8, 16);
    this.signPost(-12, 12, 0x8a6a2a);
    this.lampPost(10, 10);
    this.lampPost(-10, 14);
    // table d'orientation face à la mer
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 1.0, 10), MAT.stonePale());
    this.prop(table, -16, -18, 0.5, 0.8);

    // sentier vers la plage à l'ouest
    this.street([[-16, 0], [-30, -4], [-44, -6]], 2.2,
      texturedMat('sandPath', dirtTexture(0xcdb98a, 1), { bumpScale: 0.3 }));

    // vignoble au sud-est (les vignes de Saint-Clément voisines)
    this.vineyardField(26, 26, 6, 14);
  }

  // ---------- Végétation ----------
  scatterVegetation(era, townX, townZ) {
    const rng = mulberry32(42);
    const pineMat = texturedMat('pine', foliageTexture(0x3a5028, 1), { bumpScale: 0.3 });
    const trunkMat = texturedMat('bark', barkTexture(1), { bumpScale: 0.4 });
    const bushMat = texturedMat('bush', foliageTexture(0x4a6a32, 1), { bumpScale: 0.3 });
    const oatMat = cachedMat('oat', () => new THREE.MeshStandardMaterial({ color: 0x9aa06a, roughness: 1 }));

    const density = era.vegetationDensity;
    const N = Math.floor(820 * density);

    const pineGeo = new THREE.ConeGeometry(2.0, 5.5, 7);
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 3, 6);
    const pineMesh = new THREE.InstancedMesh(pineGeo, pineMat, N);
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, N);
    pineMesh.castShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const pos = new THREE.Vector3();
    let count = 0, attempts = 0;
    while (count < N && attempts < N * 6) {
      attempts++;
      const x = (rng() - 0.5) * ISLAND_SIZE;
      const z = (rng() - 0.5) * ISLAND_WIDTH * 1.2;
      const mask = islandMask(x, z);
      if (mask < 0.15) continue;
      // pas d'arbres dans la ville de l'époque
      if (Math.hypot(townX - x, townZ - z) < 55) continue;
      const marshMask = Math.max(0, 1 - Math.hypot((x + 130) / 65, (z + 40) / 28));
      if (marshMask > 0.4) continue;
      const forestMask = Math.max(0, 1 - Math.hypot((x + 100) / 16, (z + 5) / 10));
      const p = forestMask > 0.3 ? 0.9 : 0.15;
      if (rng() > p) continue;
      const h = heightAt(x, z);
      if (h < 0.8) continue;
      const scale = 0.8 + rng() * 0.7;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI);
      sc.set(scale, scale, scale);
      pos.set(x, h + 2.8 * scale + 1.5, z);
      m.compose(pos, q, sc); pineMesh.setMatrixAt(count, m);
      pos.set(x, h + 1.5 * scale, z);
      m.compose(pos, q, sc); trunkMesh.setMatrixAt(count, m);
      count++;
      this.addCollider(x, z, 0.7 * scale);
    }
    pineMesh.count = count; trunkMesh.count = count;
    this.eraGroup.add(pineMesh); this.eraGroup.add(trunkMesh);

    // buissons / fourrés
    const bushGeo = new THREE.SphereGeometry(0.9, 6, 5);
    const bushMesh = new THREE.InstancedMesh(bushGeo, bushMat, 400);
    let bc = 0;
    for (let i = 0; i < 1000 && bc < 400; i++) {
      const x = (rng() - 0.5) * ISLAND_SIZE;
      const z = (rng() - 0.5) * ISLAND_WIDTH * 1.1;
      const mask = islandMask(x, z);
      if (mask < 0.2) continue;
      if (Math.hypot(townX - x, townZ - z) < 48) continue;
      const h = heightAt(x, z);
      if (h < 0.9) continue;
      const s = 0.6 + rng() * 0.9;
      q.identity(); sc.set(s, s * 0.8, s); pos.set(x, h + 0.5 * s, z);
      m.compose(pos, q, sc); bushMesh.setMatrixAt(bc++, m);
    }
    bushMesh.count = bc; bushMesh.castShadow = true; this.eraGroup.add(bushMesh);

    // oyats sur les dunes
    const tuftGeo = new THREE.ConeGeometry(0.5, 0.9, 4);
    const tuftMesh = new THREE.InstancedMesh(tuftGeo, oatMat, 600);
    let tc = 0;
    for (let i = 0; i < 1400 && tc < 600; i++) {
      const x = (rng() - 0.5) * ISLAND_SIZE;
      const z = (rng() - 0.5) * ISLAND_WIDTH * 1.2;
      const mask = islandMask(x, z);
      if (mask < 0 || mask > 0.3) continue;
      const h = heightAt(x, z);
      if (h < 0.4 || h > 2.5) continue;
      q.identity(); sc.set(0.6 + rng() * 0.5, 0.7 + rng() * 0.7, 0.6 + rng() * 0.5);
      pos.set(x, h + 0.45, z);
      m.compose(pos, q, sc); tuftMesh.setMatrixAt(tc++, m);
    }
    tuftMesh.count = tc; this.eraGroup.add(tuftMesh);
  }

  update(dt, time) {
    this.tidal = Math.sin(time / (12 * 60) * Math.PI * 2) * 0.5;
    this.water.position.y = this.tidal;
    const positions = this.water.geometry.attributes.position;
    const arr = positions.array;
    const start = this.waterStart;
    const t = time * 0.6;
    for (let i = 0; i < arr.length; i += 3) {
      const x = start[i], z = start[i + 2];
      arr[i + 1] = Math.sin(x * 0.05 + t) * 0.15 + Math.cos(z * 0.04 + t * 1.3) * 0.12;
    }
    positions.needsUpdate = true;
    this.markers.children.forEach((mk, i) => {
      mk.material.opacity = 0.12 + 0.06 * Math.sin(time * 1.5 + i);
    });
  }

  setMarkerVisible(visible) { this.markers.visible = visible; }
}

export const WORLD_BOUNDS = {
  size: WORLD_SIZE,
  island: { width: ISLAND_SIZE, height: ISLAND_WIDTH },
};
