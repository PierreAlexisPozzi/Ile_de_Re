// Constructeur de ville : toutes les coordonnées sont LOCALES au centre de
// la ville (x vers l'est, z vers le sud). Fournit maisons rétaises, rangées
// mitoyennes, boutiques (vitrine, étal, enseigne peinte, enseigne en potence,
// store), affiches lisibles, rues pavées, places, murs et remparts, quais,
// bateaux, mobilier et accessoires d'époque. Enregistre au passage :
//   - les points nommés (spots) et chemins utilisés par l'histoire et les PNJ,
//   - les collisions,
//   - les objets interactifs (affiches, boutiques, bateaux, bancs…).

import * as THREE from 'three';
import { heightAt } from './terrain.js';
import { leafCardTexture, leafCardsGeometry, lumpyGeometry, cardMaterial } from '../gfx/foliage.js';
import { shopInterior } from './interiors.js';
import { MAT, flat, shutterMat, cached } from './materials.js';
import { signTexture, hangingTexture, posterTexture } from '../gfx/signs.js';
import { mulberry32, hashStr } from '../core/rng.js';
import { foliageTexture } from '../gfx/textures.js';
import { texturedMat } from './materials.js';

const PI = Math.PI;

// Toit à deux pentes : faîtage le long de z. Groupe 0 = pentes, 1 = pignons.
export function gableRoofGeometry(w, d, h, overhang = 0.35) {
  const hw = w / 2 + overhang, hd = d / 2 + 0.1;
  const slope = Math.hypot(hw, h);
  const t = 1.5;
  const positions = [
    -hw, 0, -hd, 0, h, -hd, 0, h, hd, -hw, 0, hd,
    hw, 0, -hd, 0, h, -hd, 0, h, hd, hw, 0, hd,
    -w / 2, 0, -hd, w / 2, 0, -hd, 0, h, -hd,
    -w / 2, 0, hd, w / 2, 0, hd, 0, h, hd,
  ];
  const uvs = [
    0, 0, 0, slope / t, d / t, slope / t, d / t, 0,
    0, 0, 0, slope / t, d / t, slope / t, d / t, 0,
    0, 0, w / t, 0, w / (2 * t), h / t,
    0, 0, w / t, 0, w / (2 * t), h / t,
  ];
  const indices = [0, 3, 2, 0, 2, 1, 4, 5, 6, 4, 6, 7, 8, 10, 9, 11, 12, 13];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.addGroup(0, 12, 0);
  geo.addGroup(12, 6, 1);
  geo.computeVertexNormals();
  return geo;
}

// Boîte dont les UV suivent les dimensions réelles (textures à l'échelle)
const boxCache = new Map();
export function box(w, h, d, tile = 2) {
  const key = `${w.toFixed(2)}-${h.toFixed(2)}-${d.toFixed(2)}-${tile}`;
  if (boxCache.has(key)) return boxCache.get(key);
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv, n = g.attributes.normal;
  for (let i = 0; i < uv.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i));
    const sx = nx > 0.5 ? d : w;
    const sy = ny > 0.5 ? d : h;
    uv.setXY(i, uv.getX(i) * sx / tile, uv.getY(i) * sy / tile);
  }
  boxCache.set(key, g);
  return g;
}

export class TownBuilder {
  // placement : { x, z, rot } — centre et orientation de la ville dans le monde.
  // Tout ce que construit une ville est décrit dans son repère local.
  constructor(world, town, eraId, flags, height, placement) {
    this.world = world;
    this.town = town;
    this.era = eraId;
    this.flags = flags || {};
    this.cx = placement.x;
    this.cz = placement.z;
    this.rot = placement.rot ?? 0;
    this.rc = Math.cos(this.rot); this.rs = Math.sin(this.rot);
    this.h = height;
    this.group = new THREE.Group();          // statique : fusionné à la fin
    this.group.position.set(this.cx, 0, this.cz);
    this.group.rotation.y = this.rot;
    this.dyn = new THREE.Group();            // animé / interactif
    this.dyn.position.set(this.cx, 0, this.cz);
    this.dyn.rotation.y = this.rot;
    this.rng = mulberry32(hashStr(town.id + eraId));
    this.spots = {};
    this.paths = {};
    this.interactables = [];
    this.animated = [];                      // { obj, kind } animés chaque frame
    this.lights = [];
  }

  // ---------- utilitaires de repère ----------
  hL(x, z) { const w = this.W(x, z); return heightAt(w.x, w.z); }
  colL(x, z, r) { const w = this.W(x, z); this.world.addCollider(w.x, w.z, r); }
  W(x, z) { return { x: this.cx + x * this.rc + z * this.rs, z: this.cz - x * this.rs + z * this.rc }; }
  rand(a = 0, b = 1) { return a + (b - a) * this.rng(); }
  pick(arr) { return arr[Math.floor(this.rng() * arr.length)]; }

  spot(name, x, z, extra = {}) {
    const w = this.W(x, z);
    this.spots[name] = { ...extra, x: w.x, z: w.z, ...(extra.rot !== undefined ? { rot: extra.rot + this.rot } : {}) };
    return this.spots[name];
  }
  // point nommé donné directement en coordonnées du monde (hors de la ville)
  spotW(name, x, z, extra = {}) {
    this.spots[name] = { ...extra, x, z };
    return this.spots[name];
  }
  path(name, pts) {
    this.paths[name] = pts.map(([x, z]) => this.W(x, z));
  }
  interact(def) {
    const w = this.W(def.x, def.z);
    const it = { r: 2.2, ...def, x: w.x, z: w.z, y: def.y ?? (this.hL(def.x, def.z) + 1.2) };
    if (def.rot !== undefined) it.rot = def.rot + this.rot;
    this.interactables.push(it);
    return it;
  }

  // Pose un objet au sol (repère local) dans le groupe statique ou dynamique.
  put(obj, x, z, { y = 0, rot = 0, col = 0, dynamic = false, shadow = true } = {}) {
    obj.position.set(x, this.hL(x, z) + y, z);
    obj.rotation.y = rot;
    if (shadow) obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    (dynamic ? this.dyn : this.group).add(obj);
    if (col > 0) this.colL(x, z, col);
    return obj;
  }

  mesh(geo, mat, x, y, z, opts) {
    return this.put(new THREE.Mesh(geo, mat), x, z, { y, ...opts });
  }

  // ======================================================================
  //  MAISON RÉTAISE
  // ======================================================================
  // opts : w, d, floors, style ('whitewash'|'cream'|'old'|'stone'|'roman'|'grey'|'ochre'),
  //   shutter (couleur), door (couleur), closed, roofPitch, chimney, quoins,
  //   plinth (couleur du soubassement), flowers, lit (fenêtres éclairées la nuit),
  //   roof ('tiles'|'tilesOld'|'tilesNew'|'slate'|'thatch'), shop (voir shopfront),
  //   doorX, number, lantern
  house(x, z, rot, o = {}) {
    const w = o.w ?? 5, d = o.d ?? 6, floors = o.floors ?? 1;
    const wallH = floors * 2.85 + 0.35;
    const roofH = Math.max(1.0, w * (o.roofPitch ?? 0.36));
    const g = new THREE.Group();
    g.position.set(x, this.hL(x, z), z);
    g.rotation.y = rot;
    const wallMat = {
      whitewash: MAT.whitewash(), cream: MAT.cream(), old: MAT.plasterOld(), stone: MAT.stoneOld(),
      roman: MAT.plasterRoman(), grey: MAT.plasterGrey(), ochre: MAT.ochre(), rubble: MAT.stone(),
    }[o.style ?? 'whitewash'] || MAT.whitewash();
    const roofMat = (o.roof && MAT[o.roof]) ? MAT[o.roof]() : (o.style === 'stone' || o.style === 'old' ? MAT.tilesOld() : MAT.tiles());
    const add = (geo, mat, px, py, pz) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      g.add(m);
      return m;
    };

    // fondation légèrement enterrée (terrain pas parfaitement plat)
    add(box(w, wallH + 0.6, d), wallMat, 0, wallH / 2 - 0.3, 0);
    // soubassement (goudronné noir ou gris sur les maisons rétaises)
    if (o.plinth !== null && o.plinth !== false && o.style !== 'stone' && o.style !== 'rubble') {
      add(box(w + 0.05, 0.75, d + 0.05), flat(o.plinth ?? 0x6e6a62, 0.95), 0, 0.075, 0);
    }
    // toit à deux pentes + génoise
    const roof = new THREE.Mesh(gableRoofGeometry(w, d, roofH, o.overhang ?? 0.3), [roofMat, wallMat]);
    roof.position.y = wallH;
    g.add(roof);
    if (o.roof !== 'thatch') add(box(w + 0.42, 0.14, d + 0.12), MAT.tilesOld(), 0, wallH - 0.03, 0);

    // chaînes d'angle en pierre de taille
    if (o.quoins) {
      for (const sx of [-1, 1]) {
        for (let k = 0; k < Math.floor(wallH / 0.5); k++) {
          const bw = k % 2 ? 0.34 : 0.52;
          add(box(bw, 0.42, 0.06), MAT.stonePale(), sx * (w / 2 - bw / 2 + 0.02), 0.6 + k * 0.5, d / 2 + 0.03);
        }
      }
    }

    // porte (2,05 m) avec encadrement de pierre et imposte
    const front = d / 2;
    const doorX = o.doorX ?? -w * 0.25;
    if (o.door !== false && !o.shop) {
      add(box(1.0, 2.05, 0.08), o.doorMat ?? flat(o.door ?? 0x4a5a4a, 0.75), doorX, 1.025, front + 0.02);
      add(box(1.0, 0.4, 0.06), MAT.glass(), doorX, 2.3, front + 0.02);
      add(box(1.42, 0.2, 0.1), MAT.stonePale(), doorX, 2.62, front + 0.04);
      for (const sx of [-1, 1]) add(box(0.2, 2.6, 0.1), MAT.stonePale(), doorX + sx * 0.61, 1.3, front + 0.04);
      const knob = add(new THREE.SphereGeometry(0.035, 6, 5), MAT.gold(), doorX + 0.35, 1.0, front + 0.08);
      knob.castShadow = false;
    }

    // fenêtres à volets battants (ou clos), petits carreaux
    const shMat = shutterMat(o.shutter ?? 0x3f7f5f);
    const xs = [];
    if (w >= 6) xs.push(w * 0.08, w * 0.33);
    else xs.push(w * 0.24);
    for (let f = 0; f < floors; f++) {
      if (f === 0 && o.shop) continue;
      const wy = 1.55 + f * 2.85;
      const list = f === 0 ? xs : [doorX, ...xs];
      for (const ox of list) {
        const lit = (o.lit ?? true) && this.rng() < 0.45;
        add(box(0.9, 1.2, 0.06), lit ? MAT.glassLit() : MAT.glass(), ox, wy, front + 0.02);
        // croisillons
        add(box(0.05, 1.2, 0.04), MAT.white(), ox, wy, front + 0.06);
        add(box(0.9, 0.05, 0.04), MAT.white(), ox, wy + 0.15, front + 0.06);
        add(box(1.08, 0.08, 0.16), MAT.stonePale(), ox, wy - 0.66, front + 0.06);
        if (o.closed) {
          add(box(0.95, 1.24, 0.05), shMat, ox, wy, front + 0.08);
        } else {
          for (const sx of [-1, 1]) {
            const sh = add(box(0.46, 1.24, 0.05), shMat, ox + sx * 0.7, wy, front + 0.06);
            sh.rotation.y = sx * 0.08;
          }
        }
        if (o.flowers && f === 0 && this.rng() < 0.6) {
          add(box(0.8, 0.18, 0.2), flat(0x8a4a2a, 0.9), ox, wy - 0.55, front + 0.16);
          for (let k = -1; k <= 1; k++) {
            const fl = add(new THREE.SphereGeometry(0.1, 6, 5), flat(this.pick([0xd04a6a, 0xe0b040, 0xf0f0f0, 0xb04ab0]), 0.8), ox + k * 0.25, wy - 0.38, front + 0.18);
            fl.castShadow = false;
          }
        }
      }
      // fenêtres latérales (pignons) pour les maisons d'angle
      if (o.sideWindows && f === 0) {
        for (const sx of [-1, 1]) {
          const wnd = add(box(0.06, 1.0, 0.8), MAT.glass(), sx * (w / 2 + 0.02), wy, 0);
          wnd.castShadow = false;
        }
      }
    }

    // cheminée sur le pignon
    if (o.chimney !== false) {
      add(box(0.55, roofH + 1.0, 0.5), wallMat, 0, wallH + (roofH + 1.0) / 2 - 0.2, (this.rng() > 0.5 ? 1 : -1) * (d / 2 - 0.45));
    }
    // lanterne murale, numéro, gouttière
    if (o.lantern) {
      const lb = add(box(0.06, 0.06, 0.35), MAT.iron(), doorX + 0.9, 2.5, front + 0.18);
      lb.castShadow = false;
      add(box(0.18, 0.28, 0.18), MAT.glassLit(), doorX + 0.9, 2.3, front + 0.34);
    }
    if (o.number) {
      add(box(0.22, 0.16, 0.02), flat(0x1e3a8a, 0.4), doorX - 0.75, 2.2, front + 0.02);
    }
    if (o.gutter) {
      add(new THREE.CylinderGeometry(0.05, 0.05, wallH, 6), MAT.metalPale(), w / 2 - 0.1, wallH / 2, front + 0.08);
    }

    this.group.add(g);
    if (o.col !== false) this.footprint(x, z, w, d, rot);
    if (o.shop) this.shopfront(g, x, z, rot, w, d, o.shop, front);
    // porte d'entrée : on peut visiter la maison ou la boutique
    if (o.enter !== false && (o.door !== false || o.shop)) {
      this.door({
        x, z, rot, front, w, d, dx: o.shop ? 0 : doorX,
        type: o.enter?.type ?? (o.shop ? shopInterior(o.shop) : this.era === 'prehistoire' ? 'hut' : 'home'),
        name: o.enter?.name ?? o.shop?.name ?? (this.era === 'prehistoire' ? 'Hutte' : 'Maison'),
        shopId: o.shop?.id, sign: o.shop?.sign, locked: o.enter?.locked,
      });
    }
    if (o.hollyhocks ?? (o.flowers && this.rng() < 0.5)) this.hollyhocks(g, w, front, doorX);
    return g;
  }

  // Porte menant à un intérieur. def : { x, z, rot, front, dx, w, d, type, name, shopId, sign, locked }
  // (x, z, rot : centre et orientation du bâtiment dans le repère de la ville ; front : demi-profondeur)
  door(def) {
    const c = Math.cos(def.rot), s = Math.sin(def.rot);
    const at = (lx, lz) => this.W(def.x + lx * c + lz * s, def.z - lx * s + lz * c);
    const p = at(def.dx ?? 0, def.front + 0.75), out = at(def.dx ?? 0, def.front + 1.5);
    const it = {
      id: `door:${def.x.toFixed(1)}:${def.z.toFixed(1)}`, kind: 'door', x: 0, z: 0, r: 1.25,
      label: def.locked ? `${def.name} (fermé)` : `Entrer — ${def.name}`,
      interior: {
        type: def.type, name: def.name, w: def.w, d: def.d, doorX: 0, shopId: def.shopId, sign: def.sign, locked: def.locked,
        seed: `${this.era}:${def.x.toFixed(1)}:${def.z.toFixed(1)}`,
        out: { x: out.x, z: out.z, yaw: def.rot + this.rot },
      },
    };
    it.x = p.x; it.z = p.z; it.y = heightAt(p.x, p.z) + 1.2;
    this.interactables.push(it);
    return it;
  }

  // Collisions : rangée de cercles couvrant l'emprise rectangulaire
  footprint(x, z, w, d, rot) {
    const c = Math.cos(rot), s = Math.sin(rot);
    const r = Math.min(w, d) / 2;
    const long = Math.max(w, d);
    const n = Math.max(1, Math.ceil(long / (r * 1.4)));
    for (let i = 0; i < n; i++) {
      const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * (long - 2 * r * 0.9);
      const lx = w >= d ? t : 0, lz = w >= d ? 0 : t;
      this.colL(x + lx * c + lz * s, z - lx * s + lz * c, r * 1.02);
    }
  }

  // Roses trémières : emblème des ruelles rétaises
  hollyhocks(g, w, front, doorX) {
    const n = 2 + Math.floor(this.rng() * 3);
    const stemMat = flat(0x4a6a2a, 0.9);
    for (let i = 0; i < n; i++) {
      let px = (this.rng() - 0.5) * (w - 1);
      if (Math.abs(px - doorX) < 0.8) px += 1.1;
      const hgt = 1.4 + this.rng() * 0.9;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, hgt, 5), stemMat);
      stem.position.set(px, hgt / 2, front + 0.25);
      g.add(stem);
      const col = this.pick([0xd8507a, 0xe890b0, 0xb03a5a, 0xf4f0e8, 0xc860a8]);
      for (let k = 0; k < 6; k++) {
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 4), flat(col, 0.8));
        fl.scale.set(1, 0.6, 1);
        fl.position.set(px + (this.rng() - 0.5) * 0.12, hgt * (0.45 + k * 0.09), front + 0.3);
        g.add(fl);
      }
      const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 6, 4), flat(0x4e7a32, 0.9));
      leaf.scale.set(1, 0.5, 0.6);
      leaf.position.set(px, 0.3, front + 0.28);
      g.add(leaf);
    }
  }

  // Rangée de maisons mitoyennes le long d'un segment (façades sur la rue).
  // Pour un segment orienté d'ouest en est : face = +1 -> façades au nord,
  // maisons au sud du segment ; face = -1 -> façades au sud, maisons au nord.
  row(x0, z0, x1, z1, face, o = {}) {
    const dx = x1 - x0, dz = z1 - z0;
    const len = Math.hypot(dx, dz);
    const ux = dx / len, uz = dz / len;
    const nx = face > 0 ? uz : -uz;
    const nz = face > 0 ? -ux : ux;
    const rot = Math.atan2(nx, nz);
    let s = 0;
    const out = [];
    while (s < len - 3.6) {
      const w = Math.min(o.wMin ?? 4.2 + this.rng() * (o.wVar ?? 2.4), len - s);
      if (w < 3.6) break;
      const d = (o.d ?? 5.6) + this.rng() * 1.2;
      const floors = o.floors ?? (this.rng() < (o.twoFloorChance ?? 0.35) ? 2 : 1);
      const cx = x0 + ux * (s + w / 2) - nx * (d / 2);
      const cz = z0 + uz * (s + w / 2) - nz * (d / 2);
      const shutter = o.shutters ? this.pick(o.shutters) : o.shutter;
      out.push(this.house(cx, cz, rot, { ...o, w, d, floors, shutter, doorX: (this.rng() - 0.5) * (w - 2.2) }));
      s += w + (o.gap ?? 0);
    }
    return out;
  }

  // ======================================================================
  //  BOUTIQUES : vitrine, étal, enseigne peinte, enseigne en potence, store
  // ======================================================================
  // shop : { id, name, sign: {...signTexture def}, hanging: {...hangingTexture def},
  //   kind ('taberna'|'etal'|'vitrine'|'cafe'|'forge'|'open'), color (menuiseries),
  //   awning (couleur), goods: [..], keeper (id PNJ), closed (volets clos) }
  shopfront(g, hx, hz, rot, w, d, shop, front) {
    const kind = shop.kind ?? 'vitrine';
    const frameMat = flat(shop.color ?? 0x2e4a3a, 0.7);
    const add = (geo, mat, px, py, pz) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(px, py, pz);
      g.add(m);
      return m;
    };
    const openW = Math.min(w - 1.0, 3.6);
    if (kind === 'taberna') {
      // comptoir maçonné romain ouvert sur la rue, avec dolia encastrés
      add(box(openW, 2.4, 0.1), flat(0x2a2018, 0.95), 0, 1.2, front + 0.01);
      add(box(openW * 0.75, 1.0, 0.6), MAT.plasterRoman(), -openW * 0.12, 0.5, front + 0.4);
      add(box(openW * 0.75 + 0.1, 0.08, 0.7), MAT.stonePale(), -openW * 0.12, 1.02, front + 0.4);
      for (let i = 0; i < 3; i++) {
        add(new THREE.CylinderGeometry(0.16, 0.16, 0.04, 10), flat(0x6a3a22, 0.8), -openW * 0.42 + i * 0.55, 1.07, front + 0.4);
      }
    } else if (kind === 'etal' || kind === 'forge') {
      // ouvroir médiéval : volet inférieur rabattu en étal, volet supérieur en auvent
      add(box(openW, 1.7, 0.08), flat(0x1e1810, 0.95), 0, 1.6, front + 0.01);
      const counter = add(box(openW, 0.08, 0.8), MAT.woodPale(), 0, 0.85, front + 0.42);
      counter.castShadow = true;
      for (const sx of [-1, 1]) add(box(0.08, 0.85, 0.08), MAT.woodDark(), sx * (openW / 2 - 0.1), 0.42, front + 0.75);
      const upper = add(box(openW, 0.06, 0.75), MAT.woodDark(), 0, 2.55, front + 0.36);
      upper.rotation.x = 0.35;
      add(box(openW + 0.3, 0.2, 0.12), MAT.woodDark(), 0, 2.5, front + 0.04);
    } else {
      // vitrine à petits carreaux (XVIIᵉ–XIXᵉ) ou grande vitrine (contemporain)
      const modern = kind === 'cafe' || kind === 'modern';
      add(box(openW + 0.3, 2.6, 0.12), frameMat, 0, 1.3, front + 0.02);
      const winW = (openW - 1.1) / 2;
      for (const sx of [-1, 1]) {
        add(box(winW, 1.7, 0.05), MAT.shopGlass(), sx * (0.55 + winW / 2), 1.35, front + 0.09);
        if (!modern) {
          for (let k = 1; k < 3; k++) add(box(0.03, 1.7, 0.03), frameMat, sx * (0.55 + (winW * k) / 3), 1.35, front + 0.12);
          add(box(winW, 0.03, 0.03), frameMat, sx * (0.55 + winW / 2), 1.65, front + 0.12);
          add(box(winW, 0.03, 0.03), frameMat, sx * (0.55 + winW / 2), 1.05, front + 0.12);
        }
        add(box(winW + 0.1, 0.45, 0.16), frameMat, sx * (0.55 + winW / 2), 0.25, front + 0.1);
      }
      add(box(1.0, 2.1, 0.06), MAT.shopGlass(), 0, 1.05, front + 0.09);
      add(box(1.0, 0.08, 0.04), frameMat, 0, 1.05, front + 0.12);
      if (shop.closed) {
        for (const sx of [-1, 1]) add(box(winW + 0.05, 1.75, 0.04), shutterMat(shop.color ?? 0x55603f), sx * (0.55 + winW / 2), 1.35, front + 0.14);
      }
    }
    // enseigne peinte au-dessus de la devanture
    if (shop.sign) {
      const tex = signTexture(shop.sign);
      const sw = Math.min(w - 0.4, shop.sign.boardW ?? 3.4);
      const sh = sw * ((shop.sign.h ?? 128) / (shop.sign.w ?? 512));
      const board = add(new THREE.PlaneGeometry(sw, sh), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), 0, shop.sign.y ?? 2.85, front + 0.13);
      board.castShadow = false;
      add(box(sw + 0.12, sh + 0.12, 0.06), MAT.woodDark(), 0, shop.sign.y ?? 2.85, front + 0.09);
    }
    // enseigne en potence (perpendiculaire à la façade)
    if (shop.hanging) {
      const hx2 = (openW / 2 + 0.6) * (shop.hangSide ?? 1);
      const bracket = add(box(0.06, 0.06, 1.1), MAT.iron(), hx2, 3.25, front + 0.55);
      bracket.castShadow = false;
      add(box(0.04, 0.4, 0.04), MAT.iron(), hx2, 3.05, front + 0.05);
      const tex = hangingTexture(shop.hanging);
      const pm = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide, transparent: shop.hanging.style === 'iron', alphaTest: 0.1 });
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.8), pm);
      panel.rotation.y = PI / 2;
      // l'enseigne pend librement : on la garde hors fusion pour qu'elle se balance
      const pivot = new THREE.Group();
      pivot.position.set(hx2, 3.22, front + 0.85);
      panel.position.y = -0.45;
      pivot.add(panel);
      pivot.userData.noBatch = true;
      g.add(pivot);
      this.animated.push({ obj: pivot, kind: 'swing', phase: this.rng() * 6 });
    }
    // store banne rayé
    if (shop.awning) {
      const aw = new THREE.Mesh(new THREE.PlaneGeometry(openW + 0.6, 1.5),
        new THREE.MeshStandardMaterial({ map: awningTexture(shop.awning), side: THREE.DoubleSide, roughness: 0.9 }));
      aw.rotation.x = -PI / 2 + 0.45;
      aw.position.set(0, 2.55, front + 0.68);
      aw.castShadow = true;
      g.add(aw);
    }
    // marchandises exposées
    const goodsG = new THREE.Group();
    goodsG.position.set(0, 0, front);
    g.add(goodsG);
    for (const item of shop.goods || []) this.goods(goodsG, item, openW);

    // point d'interaction et place du boutiquier
    const c = Math.cos(rot), s = Math.sin(rot);
    const fx = hx + (front + 1.6) * s, fz = hz + (front + 1.6) * c;
    const kx = hx + (front + 0.9) * s + 1.3 * c, kz = hz + (front + 0.9) * c - 1.3 * s;
    if (shop.id) {
      this.spot(shop.id, fx, fz, { rot });
      this.spot(shop.id + ':keeper', kx, kz, { rot });
      this.interact({
        id: 'shop:' + shop.id, kind: 'shop', x: fx, z: fz, r: 1.8,
        label: `Commercer — ${shop.name ?? 'Boutique'}`, shop,
      });
    }
  }

  // Marchandises devant ou dans la boutique (repère : façade, z = 0)
  goods(g, item, openW) {
    const r = () => this.rng();
    const add = (geo, mat, x, y, z) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      m.castShadow = true;
      g.add(m);
      return m;
    };
    switch (item) {
      case 'bread': {
        add(box(1.4, 0.08, 0.6), MAT.woodPale(), -openW * 0.2, 0.92, 0.45);
        for (let i = 0; i < 7; i++) {
          const l = add(new THREE.SphereGeometry(0.1, 8, 6), flat(0xb8783a, 0.8), -openW * 0.2 - 0.55 + i * 0.18, 1.0, 0.4 + (i % 2) * 0.12);
          l.scale.set(1.4, 0.65, 0.9);
        }
        break;
      }
      case 'baguettes': {
        const basket = add(new THREE.CylinderGeometry(0.22, 0.18, 0.45, 10), MAT.woodPale(), openW * 0.3, 0.23, 0.6);
        basket.castShadow = true;
        for (let i = 0; i < 6; i++) {
          const b = add(new THREE.CapsuleGeometry(0.03, 0.55, 3, 6), flat(0xc8904a, 0.8), openW * 0.3 + (r() - 0.5) * 0.2, 0.7, 0.6 + (r() - 0.5) * 0.2);
          b.rotation.z = (r() - 0.5) * 0.4;
        }
        break;
      }
      case 'fish': {
        add(box(1.6, 0.1, 0.7), MAT.woodGrey(), -openW * 0.2, 0.92, 0.45);
        add(box(1.5, 0.06, 0.6), flat(0xd8e4e8, 0.3), -openW * 0.2, 0.98, 0.45);
        for (let i = 0; i < 8; i++) {
          const f = add(new THREE.SphereGeometry(0.06, 6, 5), flat(this.pick([0x8a9aa8, 0xa8b0b8, 0xc08060]), 0.35, 0.3), -openW * 0.2 - 0.6 + i * 0.17, 1.03, 0.4 + (i % 2) * 0.12);
          f.scale.set(0.6, 0.5, 2.6);
          f.rotation.y = 0.3;
        }
        break;
      }
      case 'wine':
      case 'barrels': {
        for (let i = 0; i < 3; i++) {
          const b = add(new THREE.CylinderGeometry(0.34, 0.3, 0.85, 12), MAT.wood(), openW * 0.3 + i * 0.75 - 0.4, 0.43, 0.7);
          b.castShadow = true;
          add(new THREE.TorusGeometry(0.33, 0.015, 4, 14), MAT.iron(), openW * 0.3 + i * 0.75 - 0.4, 0.65, 0.7).rotation.x = PI / 2;
        }
        if (item === 'wine') {
          for (let i = 0; i < 5; i++) add(new THREE.CylinderGeometry(0.035, 0.04, 0.28, 8), flat(0x2a4a2a, 0.15, 0.2), openW * 0.3 - 0.6 + i * 0.12, 1.0, 0.7);
        }
        break;
      }
      case 'salt': {
        for (let i = 0; i < 4; i++) {
          const s = add(new THREE.SphereGeometry(0.3, 8, 6), flat(0xd8cdb4, 1), -openW * 0.25 + i * 0.5, 0.25, 0.7 + (i % 2) * 0.3);
          s.scale.set(1, 0.85, 0.8);
        }
        break;
      }
      case 'fruit': {
        for (let i = 0; i < 3; i++) {
          add(box(0.5, 0.25, 0.4), MAT.woodPale(), -openW * 0.3 + i * 0.6, 0.85, 0.5);
          for (let k = 0; k < 6; k++) {
            add(new THREE.SphereGeometry(0.06, 6, 5), flat(this.pick([0xc83a2a, 0xe0a030, 0x6a9a2a, 0x7a2a5a]), 0.6), -openW * 0.3 + i * 0.6 + (r() - 0.5) * 0.35, 1.02, 0.5 + (r() - 0.5) * 0.25);
          }
          add(box(0.06, 0.8, 0.06), MAT.woodDark(), -openW * 0.3 + i * 0.6, 0.4, 0.5);
        }
        break;
      }
      case 'amphorae': {
        for (let i = 0; i < 5; i++) {
          const a = add(new THREE.CylinderGeometry(0.2, 0.08, 0.85, 8), flat(0xb5703a, 0.8), -openW * 0.4 + i * 0.4, 0.42, 0.9 + (i % 2) * 0.2);
          a.rotation.z = (r() - 0.5) * 0.15;
        }
        break;
      }
      case 'cloth': {
        add(box(1.4, 0.08, 0.6), MAT.woodPale(), -openW * 0.15, 0.92, 0.45);
        for (let i = 0; i < 4; i++) {
          const c = add(new THREE.CylinderGeometry(0.1, 0.1, 0.55, 8), flat(this.pick([0x2e4478, 0x8a2a22, 0x5a7a3a, 0xd8c8a0]), 0.9), -openW * 0.15 - 0.5 + i * 0.32, 1.06, 0.45);
          c.rotation.z = PI / 2;
        }
        break;
      }
      case 'anvil': {
        add(box(0.35, 0.5, 0.35), MAT.woodDark(), openW * 0.35, 0.25, 1.4);
        add(box(0.55, 0.18, 0.22), MAT.iron(), openW * 0.35, 0.58, 1.4);
        const tub = add(new THREE.CylinderGeometry(0.35, 0.3, 0.45, 12), MAT.wood(), openW * 0.35 + 0.9, 0.23, 1.3);
        tub.castShadow = true;
        const glow = add(box(0.6, 0.3, 0.6), new THREE.MeshStandardMaterial({ color: 0x2a1a10, emissive: 0xff5a1a, emissiveIntensity: 0.9 }), -openW * 0.25, 0.9, -0.35);
        glow.castShadow = false;
        break;
      }
      case 'clock': {
        const face = add(new THREE.CylinderGeometry(0.42, 0.42, 0.08, 20), MAT.white(), 0, 3.0, 0.2);
        face.rotation.x = PI / 2;
        add(box(0.04, 0.3, 0.02), MAT.black(), 0, 3.1, 0.26);
        add(box(0.22, 0.04, 0.02), MAT.black(), 0.08, 3.0, 0.26);
        break;
      }
      case 'books': {
        add(box(1.2, 0.8, 0.35), MAT.woodDark(), openW * 0.3, 0.4, 0.4);
        for (let i = 0; i < 8; i++) add(box(0.1, 0.3, 0.22), flat(this.pick([0x6a2a1a, 0x2a3a5a, 0x3a4a2a, 0x8a6a2a]), 0.8), openW * 0.3 - 0.45 + i * 0.13, 0.95, 0.4);
        break;
      }
      case 'flowers': {
        for (let i = 0; i < 5; i++) {
          add(new THREE.CylinderGeometry(0.16, 0.12, 0.3, 8), flat(0xa85a3a, 0.9), -openW * 0.4 + i * 0.4, 0.15, 0.8);
          add(new THREE.SphereGeometry(0.2, 7, 5), flat(this.pick([0xd04a6a, 0xf0c040, 0x8a4ac0, 0xf4f0f0]), 0.8), -openW * 0.4 + i * 0.4, 0.42, 0.8);
        }
        break;
      }
      case 'postcards': {
        const rack = add(new THREE.CylinderGeometry(0.05, 0.05, 1.6, 6), MAT.metalPale(), openW * 0.4, 0.8, 1.0);
        rack.castShadow = true;
        for (let k = 0; k < 4; k++) {
          for (let i = 0; i < 4; i++) {
            const a = (i / 4) * PI * 2;
            const card = add(new THREE.PlaneGeometry(0.14, 0.1), flat(this.pick([0x3a8ac0, 0xe0c060, 0xf0f0e8, 0x5ab0a0]), 0.6, 0, { side: THREE.DoubleSide }),
              openW * 0.4 + Math.cos(a) * 0.12, 0.7 + k * 0.22, 1.0 + Math.sin(a) * 0.12);
            card.rotation.y = -a + PI / 2;
          }
        }
        break;
      }
      case 'bikes': {
        for (let i = 0; i < 3; i++) this.bikeModel(g, -openW * 0.4 + i * 0.9, 1.4, PI / 2);
        break;
      }
      case 'terrace': {
        for (let i = 0; i < 2; i++) {
          const tx = -1.5 + i * 3, tz = 2.6;
          add(new THREE.CylinderGeometry(0.4, 0.4, 0.04, 14), MAT.white(), tx, 0.74, tz);
          add(new THREE.CylinderGeometry(0.03, 0.03, 0.74, 6), MAT.metal(), tx, 0.37, tz);
          for (const sx of [-1, 1]) {
            add(box(0.42, 0.04, 0.42), MAT.woodPale(), tx + sx * 0.65, 0.46, tz);
            add(box(0.42, 0.45, 0.04), MAT.woodPale(), tx + sx * 0.65, 0.7, tz + sx * 0.0 + 0.2);
          }
          add(new THREE.CylinderGeometry(0.03, 0.03, 2.3, 6), MAT.white(), tx, 1.15, tz);
          add(new THREE.ConeGeometry(1.3, 0.5, 10, 1, true), flat(i ? 0xb03a2a : 0xf0eee6, 0.9, 0, { side: THREE.DoubleSide }), tx, 2.35, tz);
        }
        break;
      }
      case 'icecream': {
        add(box(1.2, 0.9, 0.6), MAT.white(), openW * 0.25, 0.45, 0.6);
        add(box(1.1, 0.1, 0.5), MAT.shopGlass(), openW * 0.25, 0.95, 0.6);
        break;
      }
      case 'sacks': {
        for (let i = 0; i < 3; i++) {
          const s = add(new THREE.SphereGeometry(0.28, 8, 6), flat(0xb8a478, 1), -openW * 0.3 + i * 0.5, 0.25, 0.8);
          s.scale.set(1, 1.1, 0.8);
        }
        break;
      }
      case 'pots': {
        for (let i = 0; i < 6; i++) {
          const p = add(new THREE.CylinderGeometry(0.12, 0.09, 0.25 + r() * 0.15, 8), flat(0x9a6a42, 0.85), -openW * 0.4 + i * 0.28, 0.15, 0.8);
          p.castShadow = true;
        }
        break;
      }
    }
  }

  bikeModel(parent, x, z, rot, color = 0x2a6aca) {
    const g = new THREE.Group();
    const tube = flat(color, 0.4, 0.5);
    const tyre = flat(0x151515, 0.8);
    for (const sz of [-0.55, 0.55]) {
      const w = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.035, 6, 16), tyre);
      w.rotation.y = PI / 2;
      w.position.set(0, 0.34, sz);
      g.add(w);
    }
    const f1 = new THREE.Mesh(box(0.04, 0.04, 0.9), tube); f1.position.set(0, 0.62, 0); g.add(f1);
    const f2 = new THREE.Mesh(box(0.04, 0.5, 0.04), tube); f2.position.set(0, 0.55, -0.2); f2.rotation.x = 0.2; g.add(f2);
    const seat = new THREE.Mesh(box(0.14, 0.05, 0.24), flat(0x1a1a1a, 0.7)); seat.position.set(0, 0.84, -0.28); g.add(seat);
    const bar = new THREE.Mesh(box(0.5, 0.03, 0.03), tube); bar.position.set(0, 0.92, 0.42); g.add(bar);
    const basket = new THREE.Mesh(box(0.3, 0.2, 0.25), MAT.woodPale()); basket.position.set(0, 0.85, 0.6); g.add(basket);
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    parent.add(g);
    return g;
  }

  // ======================================================================
  //  AFFICHES (lisibles en jeu) ET PANNEAUX
  // ======================================================================
  // def : { id, kind, title, body, footer, header, ... , read: texte explicatif,
  //         codex: id d'entrée du carnet } ; mount : 'wall' | 'board' | 'post'
  poster(def, x, z, rot, { mount = 'wall', y = 1.7, scale = 1 } = {}) {
    const tex = posterTexture(def);
    const ratio = def.kind === 'programma' ? 0.5 : 724 / 512;
    const pw = (def.kind === 'programma' ? 2.4 : 0.75) * scale, ph = pw * ratio;
    const g = new THREE.Group();
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85 }));
    plane.position.y = y;
    plane.position.z = 0.02;
    g.add(plane);
    if (mount === 'board') {
      const b = new THREE.Mesh(box(pw + 0.3, ph + 0.3, 0.08), MAT.woodDark());
      b.position.set(0, y, -0.03);
      g.add(b);
      for (const sx of [-1, 1]) {
        const p = new THREE.Mesh(box(0.1, y + ph / 2, 0.1), MAT.woodDark());
        p.position.set(sx * (pw / 2 + 0.1), (y + ph / 2) / 2, -0.06);
        g.add(p);
      }
      const roof = new THREE.Mesh(box(pw + 0.6, 0.06, 0.4), MAT.woodDark());
      roof.position.set(0, y + ph / 2 + 0.2, 0.05);
      g.add(roof);
      this.colL(x, z, 0.6);
    } else if (mount === 'post') {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, y + ph / 2, 8), MAT.woodDark());
      p.position.set(0, (y + ph / 2) / 2, -0.08);
      g.add(p);
      this.colL(x, z, 0.4);
    }
    this.put(g, x, z, { rot });
    const fx = x + Math.sin(rot) * 1.2, fz = z + Math.cos(rot) * 1.2;
    this.interact({ id: 'poster:' + def.id, kind: 'poster', x: fx, z: fz, r: 2.0, y: this.hL(x, z) + y, label: 'Lire l\'affiche', poster: def });
    return g;
  }

  // Plaque ou enseigne simple fixée à un mur (nom de rue, MAIRIE…)
  plaque(def, x, z, rot, y = 3.0, w = 1.6) {
    const tex = signTexture(def);
    const h = w * ((def.h ?? 128) / (def.w ?? 512));
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.6 }));
    return this.put(m, x, z, { y, rot, shadow: false });
  }

  // ======================================================================
  //  SOLS : rues, places, chemins
  // ======================================================================
  street(pts, width, mat, lift = 0.06) {
    const samples = [];
    // densifie la polyligne pour épouser le terrain
    for (let i = 0; i < pts.length - 1; i++) {
      const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
      const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / 2));
      for (let k = 0; k < n; k++) samples.push([ax + (bx - ax) * (k / n), az + (bz - az) * (k / n)]);
    }
    samples.push(pts[pts.length - 1]);
    const positions = [], uvs = [], indices = [];
    let dist = 0;
    for (let i = 0; i < samples.length; i++) {
      const [px, pz] = samples[i];
      const a = samples[Math.max(0, i - 1)], b = samples[Math.min(samples.length - 1, i + 1)];
      let dx = b[0] - a[0], dz = b[1] - a[1];
      const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const nx = -dz, nz = dx;
      const lx = px + nx * width / 2, lz = pz + nz * width / 2;
      const rx = px - nx * width / 2, rz = pz - nz * width / 2;
      positions.push(lx, Math.max(this.hL(lx, lz), 0.05) + lift, lz, rx, Math.max(this.hL(rx, rz), 0.05) + lift, rz);
      if (i > 0) dist += Math.hypot(px - samples[i - 1][0], pz - samples[i - 1][1]);
      uvs.push(0, dist / 3, width / 3, dist / 3);
    }
    // ordre des sommets : faces tournées vers le ciel
    for (let i = 0; i < samples.length - 1; i++) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  plaza(x, z, w, d, mat, lift = 0.05) {
    const geo = new THREE.PlaneGeometry(w, d, Math.max(1, Math.ceil(w / 2)), Math.max(1, Math.ceil(d / 2)));
    geo.rotateX(-PI / 2);
    const p = geo.attributes.position, uv = geo.attributes.uv;
    for (let i = 0; i < p.count; i++) {
      const lx = x + p.getX(i), lz = z + p.getZ(i);
      p.setXYZ(i, lx, Math.max(this.hL(lx, lz), 0.05) + lift, lz);
      uv.setXY(i, lx / 3, lz / 3);
    }
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  // Mur entre deux points (rempart, enceinte, clôture), avec collisions.
  wall(x1, z1, x2, z2, h, th, mat, { col = true, base = 0, batter = 0 } = {}) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    const w = new THREE.Mesh(box(len, h, th, 3), mat);
    w.position.set(mx, this.hL(mx, mz) + h / 2 - 0.3 + base, mz);
    w.rotation.y = -Math.atan2(dz, dx);
    if (batter) w.scale.set(1, 1, 1);
    this.group.add(w);
    if (col) {
      const steps = Math.max(1, Math.ceil(len / Math.max(0.8, th)));
      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        this.colL(x1 + dx * t, z1 + dz * t, th * 0.55 + 0.25);
      }
    }
    return w;
  }

  // Clôture de piquets (vignes, enclos)
  fence(x1, z1, x2, z2, mat = MAT.wood(), h = 1.0) {
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.ceil(len / 1.5);
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.mesh(box(0.1, h, 0.1), mat, x1 + (x2 - x1) * t, h / 2, z1 + (z2 - z1) * t);
    }
    const rail = new THREE.Mesh(box(len, 0.06, 0.05), mat);
    const mx = (x1 + x2) / 2, mz = (z1 + z2) / 2;
    rail.position.set(mx, this.hL(mx, mz) + h * 0.75, mz);
    rail.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    this.group.add(rail);
  }

  // ======================================================================
  //  ACCESSOIRES
  // ======================================================================
  barrel(x, z, col = 0.45) { return this.mesh(new THREE.CylinderGeometry(0.34, 0.3, 0.85, 12), MAT.wood(), x, 0.43, z, { col }); }
  crate(x, z, s = 0.7) { return this.mesh(box(s, s, s), MAT.woodPale(), x, s / 2, z, { rot: this.rng() * 1.5, col: s * 0.5 }); }
  sack(x, z) {
    const m = this.mesh(new THREE.SphereGeometry(0.3, 8, 6), flat(0xd8cdb4, 1), x, 0.25, z);
    m.scale.set(1, 0.85, 0.8);
    return m;
  }
  amphora(x, z, tilt = 0) {
    const m = this.mesh(new THREE.CylinderGeometry(0.2, 0.09, 0.85, 8), flat(0xb5703a, 0.8), x, 0.42, z);
    m.rotation.z = tilt;
    return m;
  }
  saltHeap(x, z, s = 1.5) { return this.mesh(new THREE.ConeGeometry(s, s * 1.25, 10), MAT.salt(), x, s * 0.6, z, { col: s * 0.85 }); }
  bollard(x, z) { return this.mesh(new THREE.CylinderGeometry(0.13, 0.17, 0.7, 8), MAT.stoneDark(), x, 0.35, z, { col: 0.25 }); }
  lamp(x, z, era = 'xix') {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 3.4, 8), MAT.iron());
    pole.position.y = 1.7;
    g.add(pole);
    const head = new THREE.Mesh(era === 'modern' ? box(0.5, 0.12, 0.25) : new THREE.CylinderGeometry(0.16, 0.22, 0.4, 6), MAT.glassLit());
    head.position.y = 3.5;
    g.add(head);
    this.put(g, x, z, { col: 0.25 });
    return g;
  }
  bench(x, z, rot = 0, mat = MAT.woodPale()) {
    const g = new THREE.Group();
    const seat = new THREE.Mesh(box(1.8, 0.08, 0.45), mat);
    seat.position.y = 0.46;
    g.add(seat);
    const back = new THREE.Mesh(box(1.8, 0.4, 0.06), mat);
    back.position.set(0, 0.75, -0.2);
    g.add(back);
    for (const sx of [-1, 1]) {
      const leg = new THREE.Mesh(box(0.08, 0.46, 0.4), MAT.iron());
      leg.position.set(sx * 0.8, 0.23, 0);
      g.add(leg);
    }
    this.put(g, x, z, { rot });
    this.interact({ id: `bench:${x.toFixed(1)}:${z.toFixed(1)}`, kind: 'bench', x: x + Math.sin(rot) * 0.2, z: z + Math.cos(rot) * 0.2, r: 1.6, label: "S'asseoir", rot });
    return g;
  }
  well(x, z, roofed = true) {
    const g = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(1, 1.05, 1.0, 14), MAT.stoneOld());
    ring.position.y = 0.5;
    g.add(ring);
    const water = new THREE.Mesh(new THREE.CircleGeometry(0.85, 14), flat(0x1a2a30, 0.1, 0.3));
    water.rotation.x = -PI / 2;
    water.position.y = 0.6;
    g.add(water);
    if (roofed) {
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(box(0.12, 1.9, 0.12), MAT.wood());
        post.position.set(sx * 0.9, 1.4, 0);
        g.add(post);
      }
      const cap = new THREE.Mesh(gableRoofGeometry(2.2, 1.3, 0.7, 0.1), [MAT.tilesOld(), MAT.wood()]);
      cap.rotation.y = PI / 2;
      cap.position.y = 2.35;
      g.add(cap);
      const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 6), MAT.wood());
      axle.rotation.z = PI / 2;
      axle.position.y = 1.9;
      g.add(axle);
    }
    this.put(g, x, z, { col: 1.25 });
    return g;
  }
  cannon(x, z, rot = 0) {
    const g = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.24, 2.1, 12), MAT.metal());
    barrel.rotation.x = PI / 2 - 0.1;
    barrel.position.set(0, 0.68, 0.2);
    g.add(barrel);
    const carriage = new THREE.Mesh(box(0.6, 0.35, 1.4), MAT.woodDark());
    carriage.position.y = 0.42;
    g.add(carriage);
    for (const sx of [-1, 1]) {
      for (const sz of [-0.45, 0.45]) {
        const w = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 12), MAT.woodDark());
        w.rotation.z = PI / 2;
        w.position.set(sx * 0.36, 0.22, sz);
        g.add(w);
      }
    }
    this.put(g, x, z, { rot, col: 0.9 });
    return g;
  }
  flagpole(x, z, tex, h = 9) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, h, 8), MAT.wood());
    pole.position.y = h / 2;
    g.add(pole);
    this.put(g, x, z, { col: 0.4 });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 1.4, 10, 4),
      new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, roughness: 0.9 }));
    flag.position.set(x + 1.1, this.hL(x, z) + h - 0.8, z);
    flag.userData.noBatch = true;
    flag.userData.base = flag.geometry.attributes.position.array.slice();
    this.dyn.add(flag);
    this.animated.push({ obj: flag, kind: 'flag' });
    return g;
  }
  fire(x, z, size = 1) {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * PI * 2;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.07, 0.8 * size, 6), MAT.woodDark());
      log.rotation.z = PI / 2 - 0.3;
      log.rotation.y = a;
      log.position.set(Math.cos(a) * 0.25, 0.15, Math.sin(a) * 0.25);
      g.add(log);
      const st = new THREE.Mesh(new THREE.DodecahedronGeometry(0.16, 0), MAT.stoneDark());
      st.position.set(Math.cos(a) * 0.7 * size, 0.08, Math.sin(a) * 0.7 * size);
      g.add(st);
    }
    this.put(g, x, z, { col: 0.8 * size });
    const flames = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.22 * size, 0.7 * size, 7),
        new THREE.MeshBasicMaterial({ color: i ? 0xffa030 : 0xff5a1a, transparent: true, opacity: 0.85 }));
      f.position.set((i - 1) * 0.12, 0.45 * size, (i % 2) * 0.1);
      flames.add(f);
    }
    flames.position.set(x, this.hL(x, z), z);
    flames.userData.noBatch = true;
    this.dyn.add(flames);
    this.animated.push({ obj: flames, kind: 'fire' });
    const light = new THREE.PointLight(0xff8a3a, 2.2, 14 * size, 1.6);
    light.position.set(x, this.hL(x, z) + 1.0, z);
    this.dyn.add(light);
    this.lights.push({ light, base: 2.2, flicker: true });
    return g;
  }
  vineRows(x0, z0, rows, len, { abandoned = false, spacing = 2.2 } = {}) {
    const leafMat = texturedMat(abandoned ? 'vineDry' : 'vineGreen', foliageTexture(abandoned ? 0x7a6a3a : 0x587a30, 1), { bumpScale: 0.3 });
    for (let r = 0; r < rows; r++) {
      const x = x0 + r * spacing;
      for (let p = 0; p <= len; p += 5) this.mesh(box(0.08, 1.25, 0.08), MAT.woodDark(), x, 0.62, z0 + p);
      const wire = new THREE.Mesh(box(0.015, 0.015, len), MAT.metal());
      wire.position.set(x, this.hL(x, z0 + len / 2) + 1.0, z0 + len / 2);
      this.group.add(wire);
      for (let s = 0; s <= len; s += 1.0) {
        const z = z0 + s;
        if (this.hL(x, z) < 0.6) continue;
        this.mesh(box(0.07, 0.7, 0.07), MAT.woodDark(), x, 0.35, z);
        if (!abandoned || this.rng() > 0.55) {
          const leaf = this.mesh(new THREE.SphereGeometry(0.42, 6, 5), leafMat, x, 0.95, z);
          leaf.scale.set(0.7, 0.75, 1.2);
          if (!abandoned && this.era !== 'antiquite' && this.rng() < 0.3) {
            this.mesh(new THREE.SphereGeometry(0.07, 5, 4), flat(0x4a2048, 0.6), x + 0.2, 0.75, z);
          }
        }
      }
    }
  }
  scaffolding(x, z, w, h, rot = 0) {
    const g = new THREE.Group();
    for (const sx of [-w / 2, w / 2]) {
      for (const sz of [-0.5, 0.5]) {
        const p = new THREE.Mesh(box(0.12, h, 0.12), MAT.wood());
        p.position.set(sx, h / 2, sz);
        g.add(p);
      }
    }
    for (let lvl = 1; lvl <= Math.floor(h / 1.8); lvl++) {
      const plank = new THREE.Mesh(box(w + 0.3, 0.08, 1.1), MAT.woodPale());
      plank.position.y = lvl * 1.8;
      g.add(plank);
      const brace = new THREE.Mesh(box(0.06, 2.1, 0.06), MAT.wood());
      brace.position.set(0, lvl * 1.8 - 0.9, 0.5);
      brace.rotation.z = 0.9;
      g.add(brace);
    }
    this.put(g, x, z, { rot, col: w * 0.45 });
    return g;
  }
  bunker(x, z, rot = 0, big = true, ruined = false) {
    const g = new THREE.Group();
    const mat = MAT.concrete();
    const w = big ? 7 : 4, d = big ? 6 : 4, h = big ? 3 : 2.2;
    const body = new THREE.Mesh(box(w, h + 1, d), mat);
    body.position.y = h / 2 - 0.5;
    g.add(body);
    const cap = new THREE.Mesh(box(w + 0.8, 0.7, d + 0.8), mat);
    cap.position.y = h + 0.3;
    g.add(cap);
    const slit = new THREE.Mesh(box(big ? 2.4 : 1.4, 0.5, 0.5), MAT.black());
    slit.position.set(0, h * 0.62, d / 2 + 0.1);
    g.add(slit);
    const door = new THREE.Mesh(box(1.1, 1.9, 0.4), MAT.black());
    door.position.set(w * 0.25, 0.95, -d / 2 - 0.1);
    g.add(door);
    for (const sx of [-1, 1]) {
      const berm = new THREE.Mesh(new THREE.SphereGeometry(d * 0.45, 12, 8), MAT.sandPath());
      berm.scale.set(0.7, 0.45, 1);
      berm.position.set(sx * (w / 2 + 0.5), 0, 0);
      g.add(berm);
    }
    if (ruined) g.rotation.z = 0.12;
    this.put(g, x, z, { rot, col: Math.max(w, d) * 0.62 });
    if (!ruined) {
      // la porte est à l'arrière (face à la terre)
      this.door({ x, z, rot: rot + PI, front: d / 2 + 0.4, dx: -w * 0.25, w: 5.4, d: 5, type: 'bunker', name: 'Blockhaus' });
    }
    return g;
  }
  hedgehog(x, z) {
    const g = new THREE.Group();
    for (let i = 0; i < 3; i++) {
      const beam = new THREE.Mesh(box(0.16, 1.8, 0.16), MAT.metal());
      beam.rotation.set(0.9, (i / 3) * PI * 2, 0.5);
      g.add(beam);
    }
    this.put(g, x, z, { y: 0.5, col: 0.8 });
    return g;
  }
  rock(x, z, s = 1, mat = MAT.stoneDark()) {
    const m = this.mesh(new THREE.DodecahedronGeometry(s, 0), mat, x, s * 0.3, z, { col: s * 0.8 });
    m.rotation.set(this.rng() * 3, this.rng() * 3, this.rng() * 3);
    m.scale.set(1, 0.6, 0.9);
    return m;
  }
  tree(x, z, kind = 'oak', s = 1) {
    const g = new THREE.Group();
    const trunkH = kind === 'pine' ? 4 : kind === 'tamarisk' ? 1.6 : 2.6;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.26 * s, trunkH * s, 7), MAT.woodDark());
    trunk.position.y = trunkH * s / 2;
    trunk.rotation.z = kind === 'pine' ? 0.12 : 0;
    g.add(trunk);
    const leafCol = { oak: 0x4a6a2e, pine: 0x3a5228, tamarisk: 0x7a8a5a, fig: 0x4e7a3a, elm: 0x527030 }[kind] ?? 0x4a6a2e;
    const lm = texturedMat(`tree-${kind}-core`, foliageTexture(leafCol, 1), { bumpScale: 0.3, color: 0xb0b0b0 });
    const cardMat = cardMaterial(leafCardTexture(leafCol, kind === 'pine' || kind === 'tamarisk' ? 'needle' : 'broad'), `tree-cards-${kind}`);
    const n = kind === 'pine' ? 3 : 4;
    for (let i = 0; i < n; i++) {
      // noyau bosselé + cartes de feuilles découpées
      const r = (kind === 'pine' ? 1.5 : 1.3) * s;
      const a = (i / n) * PI * 2;
      const cl = new THREE.Group();
      cl.position.set(Math.cos(a) * 0.7 * s, (trunkH + (kind === 'pine' ? 0.6 : 0.8)) * s + (i % 2) * 0.4 * s, Math.sin(a) * 0.7 * s);
      cl.scale.set(r, r * (kind === 'pine' ? 0.5 : 0.8), r);
      const core = new THREE.Mesh(lumpyGeometry(7 + i, 1, 0.24), lm);
      core.scale.setScalar(0.66);
      cl.add(core);
      cl.add(new THREE.Mesh(leafCardsGeometry(10, 5 + i), cardMat));
      g.add(cl);
    }
    this.put(g, x, z, { col: 0.35 * s });
    return g;
  }

  // Bateau à quai (repère local) ; type selon l'époque. Embarquable si boardable.
  boat(x, z, rot, type = 'sail', { boardable = false, label } = {}) {
    const g = buildBoat(type);
    const w = this.W(x, z);
    g.position.set(w.x, 0.1, w.z);
    g.rotation.y = rot + this.rot;
    g.userData.noBatch = true;
    g.userData.bob = this.rng() * 6;
    this.world.eraGroup.add(g);
    this.animated.push({ obj: g, kind: 'bob' });
    if (boardable) {
      this.interact({ id: `boat:${type}:${x.toFixed(0)}`, kind: 'boat', x, z, r: 3.2, y: 1, label: label ?? 'Embarquer', boatType: type, boatObj: g });
    } else {
      this.colL(x, z, 1.8);
    }
    return g;
  }

  // Quai de pierre parementé autour d'un bassin (repère local) : mur du fond
  // du bassin jusqu'au niveau de la ville, couronné d'une margelle.
  quayEdge(x1, z1, x2, z2, top) {
    const dx = x2 - x1, dz = z2 - z1;
    const len = Math.hypot(dx, dz);
    const rot = -Math.atan2(dz, dx);
    const h = top + 2.0;
    const w = new THREE.Mesh(box(len, h, 0.9, 3), MAT.stone());
    w.position.set((x1 + x2) / 2, top + 0.04 - h / 2, (z1 + z2) / 2);
    w.rotation.y = rot;
    this.group.add(w);
    const cop = new THREE.Mesh(box(len + 0.3, 0.16, 1.1), MAT.stonePale());
    cop.position.set((x1 + x2) / 2, top + 0.1, (z1 + z2) / 2);
    cop.rotation.y = rot;
    this.group.add(cop);
    return w;
  }
}

// Store banne rayé
const awnCache = new Map();
function awningTexture(color) {
  if (awnCache.has(color)) return awnCache.get(color);
  const c = document.createElement('canvas');
  c.width = 128; c.height = 64;
  const ctx = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    ctx.fillStyle = i % 2 ? '#f2eee4' : `#${color.toString(16).padStart(6, '0')}`;
    ctx.fillRect(i * 16, 0, 16, 64);
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)';
  for (let x = 0; x < 128; x += 8) { ctx.beginPath(); ctx.arc(x + 4, 62, 4, 0, PI); ctx.fill(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  awnCache.set(color, t);
  return t;
}

// Embarcations d'époque (repère : origine à la ligne de flottaison)
export function buildBoat(type) {
  const g = new THREE.Group();
  const hullMat = type === 'modern' ? flat(0xf0f0ec, 0.5) : type === 'kayak' ? flat(0xe0702a, 0.5) : MAT.woodDark();
  const dims = {
    pirogue: [4.2, 0.55, 0.35], roman: [7, 1.4, 0.9], sail: [5, 1.3, 0.8], row: [3.6, 1.0, 0.55],
    gabarre: [7, 1.9, 1.0], chaloupe: [5.5, 1.5, 0.8], modern: [6, 2.0, 1.0], kayak: [3.2, 0.6, 0.3], canot: [4.5, 1.4, 0.7],
    ship: [22, 6, 3.2], frigate: [26, 6.5, 3.4],
  }[type] || [5, 1.3, 0.8];
  const [L, B, H] = dims;
  // coque : demi-cylindre effilé
  const pts = [];
  for (let i = 0; i <= 10; i++) {
    const t = i / 10;
    pts.push(new THREE.Vector2(Math.sin(t * PI) * (B / 2) + 0.01, (t - 0.5) * L));
  }
  const hull = new THREE.Mesh(new THREE.LatheGeometry(pts, 12, PI / 2, PI), hullMat);
  hull.rotation.x = PI / 2;
  hull.scale.set(1, 1, H / (B / 2));
  hull.position.y = 0.15;
  hull.castShadow = true;
  g.add(hull);
  hull.material = hull.material.clone();
  hull.material.side = THREE.DoubleSide;
  const deck = new THREE.Mesh(box(B * 0.92, 0.05, L * 0.9), MAT.woodPale());
  deck.position.y = 0.1;
  g.add(deck);
  if (['sail', 'roman', 'gabarre', 'chaloupe'].includes(type)) {
    const mastH = type === 'roman' ? 6 : type === 'gabarre' ? 7 : 5;
    const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.09, mastH, 6), MAT.wood());
    mast.position.set(0, mastH / 2, L * 0.08);
    g.add(mast);
    const sailCol = type === 'roman' ? 0xd8c8a0 : type === 'gabarre' ? 0xa8583a : 0xeee6d2;
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(type === 'roman' ? 3.6 : 2.6, mastH * 0.62),
      flat(sailCol, 0.9, 0, { side: THREE.DoubleSide }));
    sail.position.set(0, mastH * 0.58, L * 0.08 + (type === 'roman' ? 0.1 : -0.9));
    sail.rotation.y = type === 'roman' ? 0 : PI / 2;
    g.add(sail);
  }
  if (type === 'ship' || type === 'frigate') {
    // trois-mâts : château arrière, mâts et voiles carrées, pavillon
    const castle = new THREE.Mesh(box(B * 0.9, 2.2, L * 0.2), MAT.woodDark());
    castle.position.set(0, 1.4, -L * 0.38);
    g.add(castle);
    const sailMat = flat(0xece4cc, 0.9, 0, { side: THREE.DoubleSide });
    [[L * 0.28, 16], [0, 19], [-L * 0.24, 14]].forEach(([z, h]) => {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.24, h, 8), MAT.wood());
      mast.position.set(0, h / 2, z);
      g.add(mast);
      for (let k = 0; k < 3; k++) {
        const sw = (B * 1.25) * (1 - k * 0.18), sh = h * 0.2;
        const yard = new THREE.Mesh(box(sw + 0.4, 0.14, 0.14), MAT.wood());
        yard.position.set(0, h * (0.42 + k * 0.24) + sh / 2, z);
        g.add(yard);
        const sail = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), sailMat);
        sail.position.set(0, h * (0.42 + k * 0.24), z + 0.2);
        g.add(sail);
      }
    });
    const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 7, 6), MAT.wood());
    bowsprit.rotation.x = PI / 2 - 0.35;
    bowsprit.position.set(0, 2.2, L * 0.55);
    g.add(bowsprit);
    if (type === 'frigate') {
      for (const sx of [-1, 1]) for (let k = 0; k < 8; k++) {
        const port = new THREE.Mesh(box(0.1, 0.5, 0.6), MAT.black());
        port.position.set(sx * B * 0.47, 1.0, -L * 0.3 + k * L * 0.08);
        g.add(port);
      }
    }
  }
  if (type === 'gabarre' || type === 'chaloupe') {
    for (let i = 0; i < 4; i++) {
      const sack = new THREE.Mesh(new THREE.SphereGeometry(0.3, 7, 5), flat(0xd8cdb4, 1));
      sack.position.set((i % 2 - 0.5) * 0.5, 0.35, -L * 0.25 + Math.floor(i / 2) * 0.6);
      g.add(sack);
    }
  }
  if (type === 'modern') {
    const cabin = new THREE.Mesh(box(1.4, 0.9, 1.6), flat(0xf4f4f0, 0.4));
    cabin.position.set(0, 0.6, -0.4);
    g.add(cabin);
    const win = new THREE.Mesh(box(1.42, 0.3, 0.8), MAT.glass());
    win.position.set(0, 0.85, -0.2);
    g.add(win);
    const stripe = new THREE.Mesh(box(B * 1.01, 0.12, L * 0.8), flat(0x1e4a8a, 0.5));
    stripe.position.y = 0.2;
    g.add(stripe);
  }
  if (type === 'roman') {
    const prow = new THREE.Mesh(new THREE.ConeGeometry(0.2, 1.4, 6), MAT.woodDark());
    prow.rotation.x = -0.6;
    prow.position.set(0, 0.9, L * 0.48);
    g.add(prow);
  }
  // rames
  if (['row', 'pirogue', 'canot', 'kayak'].includes(type)) {
    const oar = new THREE.Mesh(box(0.05, 0.05, 2.2), MAT.wood());
    oar.position.set(B * 0.45, 0.35, 0);
    oar.rotation.y = 0.3;
    g.add(oar);
  }
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData.length = L;
  return g;
}

export { cached };
