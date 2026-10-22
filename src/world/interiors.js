// Intérieurs des bâtiments. Chaque porte de la ville mène à une pièce générée
// selon le type de bâtiment et l'époque : maison (table, cheminée, lit,
// vaisselier…), boutique (comptoir, étagères, commerçant), café et taverne,
// forge, église, école, mairie, bureau, dispensaire, entrepôt, hutte
// néolithique, blockhaus. La pièce est construite à l'écart de l'île ; on y
// entre et on en sort par un fondu au noir. Le sol, les collisions et les
// objets interactifs de la pièce remplacent ceux de la ville le temps de la visite.

import * as THREE from 'three';
import { MAT, flat } from './materials.js';
import { box, gableRoofGeometry } from './builder.js';
import { setIndoor } from './terrain.js';
import { mulberry32, hashStr } from '../core/rng.js';
import { state } from '../core/state.js';
import { api } from '../systems/api.js';
import { emit } from '../core/events.js';
import { signTexture } from '../gfx/signs.js';

const PI = Math.PI;
// la pièce est posée en mer, dans un coin de la carte où l'on ne va jamais
const ORIGIN = { x: 1040, z: -430, y: 1.2 };
const CEIL = 2.9;

const ORDER = { prehistoire: 1, antiquite: 2, moyenage: 3, xvii: 4, xix: 5, wwii: 6, contemporaine: 7 };

// Objets du quotidien à examiner, par époque
const CURIOS = {
  prehistoire: ["Une lame de silex emmanchée dans un bois de cerf.", "Un collier de coquillages percés, enfilés sur un tendon.", "Un vase à fond rond, décoré au peigne et à l'ongle.", "Des peaux de phoque tendues à sécher."],
  antiquite: ["Une lampe à huile en terre cuite, décorée d'un dauphin.", "Des tablettes de cire et un stylet de bronze.", "Une amphore de vin de Burdigala, encore scellée.", "Un petit autel domestique pour les dieux lares."],
  moyenage: ["Un coffre de chêne bardé de fer : tout le bien de la maisonnée.", "Une écuelle de bois et une cuillère de corne.", "Un chapelet de buis pendu à un clou.", "Une lanterne de corne : la lumière passe à travers la corne amincie."],
  xvii: ["Un almanach de l'année 1681, avec les dates des marées.", "Une gravure du siège de la citadelle, en 1627.", "Un rouet pour filer la laine.", "Une tabatière en corne de bœuf."],
  xix: ["Un calendrier des Postes de 1862.", "Une lettre d'un fils marin, partie de Nantes.", "Une horloge comtoise qui bat la seconde.", "Une lampe à pétrole : la nouveauté du siècle."],
  wwii: ["Une carte d'alimentation et ses tickets découpés.", "Un poste de T.S.F., le bouton réglé tout bas.", "La photo d'un prisonnier de guerre, dans un cadre de bois.", "Un masque à gaz dans sa boîte de métal."],
  contemporaine: ["Un guide touristique de l'île, corné à la page des pistes cyclables.", "Des cartes postales du phare des Baleines.", "Un pot de fleur de sel de l'île.", "Une affiche des régates de Saint-Martin."],
};

// Type d'intérieur selon la boutique
export function shopInterior(shop) {
  const id = shop.id ?? '';
  if (/dispensaire/.test(id)) return 'infirmary';
  if (/hotel|taverne|cabaret|taberna|cafe|creperie|glacier/.test(id) || shop.kind === 'taberna' || shop.kind === 'cafe') return 'tavern';
  if (/forge|faber|sabotier/.test(id) || shop.kind === 'forge') return 'forge';
  if (/horlog/.test(id)) return 'clockmaker';
  if (/douane|bureau|lescure|mairie/.test(id)) return 'office';
  return 'shop';
}

export class Interiors {
  constructor(world, scene) {
    this.world = world;
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.active = null;
    this.busy = false;
    this.window = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xdde8f0, emissiveIntensity: 1, roughness: 0.2 });
    this.windowLights = [];
  }

  get inside() { return !!this.active; }

  async enter(def) {
    if (this.busy || this.active) return;
    if (def.locked) { emit('toast', { text: def.locked, kind: 'info' }); return; }
    this.busy = true;
    api.ui.fade(true);
    api.audio?.sfx('click');
    await new Promise((r) => setTimeout(r, 380));
    const room = this.build(def);
    this.active = { def, room };
    // la pièce remplace le sol, les collisions et les objets de la ville
    this.saved = { colliders: this.world.colliders, interactables: this.world.interactables };
    this.world.colliders = room.colliders;
    this.world.buildGrid();
    this.world.interactables = room.interactables;
    this.world.indoor = { ...room.bounds, ceil: ORIGIN.y + CEIL, def };
    setIndoor(room.bounds);
    api.player.teleport(room.spawn.x, room.spawn.z, room.spawn.yaw, true);
    api.player.camDistSaved = api.player.camDist;
    api.player.camDist = Math.min(api.player.camDist, 3.2);
    // le commerçant rejoint son comptoir
    this.keeper = null;
    if (def.shopId && room.keeperSpot) {
      const k = api.npcs.list.find((n) => !n.extra && keeperOf(n, def.shopId));
      if (k) { k.hold = room.keeperSpot; this.keeper = k; }
    }
    emit('indoor', true);
    api.ui.toast(`🚪 ${def.name ?? 'Intérieur'}`, 'info');
    setTimeout(() => api.ui.fade(false), 120);
    this.busy = false;
  }

  async exit(quick = false) {
    if (!this.active || this.busy) return;
    this.busy = true;
    if (!quick) { api.ui.fade(true); await new Promise((r) => setTimeout(r, 350)); }
    const { def, room } = this.active;
    this.group.remove(room.group);
    room.group.traverse((o) => { if (o.isMesh && o.userData.own) o.geometry.dispose(); });
    for (const l of this.windowLights) l.parent?.remove(l);
    this.windowLights = [];
    this.world.colliders = this.saved.colliders;
    this.world.interactables = this.saved.interactables;
    this.world.buildGrid();
    this.world.indoor = null;
    setIndoor(null);
    if (this.keeper) { this.keeper.hold = null; this.keeper = null; }
    this.active = null;
    api.player.camDist = api.player.camDistSaved ?? api.player.camDist;
    api.player.teleport(def.out.x, def.out.z, def.out.yaw);
    emit('indoor', false);
    if (!quick) setTimeout(() => api.ui.fade(false), 120);
    this.busy = false;
  }

  // Lumière du jour par les fenêtres, lampes plus vives la nuit
  update(dt, day) {
    if (!this.active) return;
    const d = Math.max(0, Math.min(1, day));
    this.window.emissive.setRGB(0.2 + 0.75 * d, 0.24 + 0.74 * d, 0.32 + 0.66 * d);
    this.window.emissiveIntensity = 0.35 + 0.9 * d;
    for (const l of this.active.room.lamps) l.intensity = l.userData.base * (1.25 - 0.55 * d) * (l.userData.flicker ? 0.85 + Math.random() * 0.25 : 1);
    for (const l of this.windowLights) l.intensity = 2.2 * d;
    for (const f of this.active.room.fires) f.children.forEach((c, i) => c.scale.setScalar(0.8 + Math.sin(performance.now() / 90 + i * 2) * 0.15));
  }

  // ======================================================================
  //  CONSTRUCTION D'UNE PIÈCE
  // ======================================================================
  build(def) {
    const era = state.era, o = ORDER[era];
    const rng = mulberry32(hashStr(def.seed ?? def.name ?? 'room'));
    const type = def.type ?? 'home';
    const big = type === 'church' ? [9, 18] : type === 'school' ? [9, 8] : null;
    const W = Math.max(4.2, big?.[0] ?? (def.w ?? 6) - 0.6), D = Math.max(4.2, big?.[1] ?? (def.d ?? 6) - 0.6);
    const H = type === 'church' ? 7 : type === 'bunker' ? 2.4 : type === 'hut' ? 3.2 : CEIL;
    const g = new THREE.Group();
    g.position.set(ORIGIN.x, ORIGIN.y, ORIGIN.z);
    this.group.add(g);
    const colliders = [], interactables = [], lamps = [], fires = [];
    const W2 = W / 2, D2 = D / 2;
    const add = (geo, mat, x, y, z, opts = {}) => {
      const m = new THREE.Mesh(geo, mat);
      m.position.set(x, y, z);
      if (opts.ry) m.rotation.y = opts.ry;
      m.castShadow = opts.shadow ?? true;
      m.receiveShadow = true;
      g.add(m);
      return m;
    };
    const wx = (x) => ORIGIN.x + x, wz = (z) => ORIGIN.z + z;
    const col = (x, z, r) => colliders.push({ x: wx(x), z: wz(z), r });
    const solid = (x, z, w, d) => {
      // collisions d'un meuble rectangulaire (cercles en ligne)
      const r = Math.min(w, d) / 2, n = Math.max(1, Math.ceil(Math.max(w, d) / (r * 1.6)));
      for (let i = 0; i < n; i++) {
        const t = n === 1 ? 0 : (i / (n - 1) - 0.5) * (Math.max(w, d) - r * 2);
        col(x + (w >= d ? t : 0), z + (w >= d ? 0 : t), r * 1.05);
      }
    };
    const interact = (it) => interactables.push({ r: 1.6, ...it, x: wx(it.x), z: wz(it.z), y: ORIGIN.y + (it.y ?? 1.1) });
    const lamp = (x, y, z, color, base, flicker = false, dist = 9) => {
      const l = new THREE.PointLight(color, base, dist, 1.6);
      l.position.set(x, y, z);
      l.userData = { base, flicker };
      g.add(l);
      lamps.push(l);
      return l;
    };

    // ---------- matériaux selon l'époque et le type ----------
    const floorMat = type === 'bunker' ? MAT.concrete()
      : type === 'hut' ? MAT.dirt()
      : type === 'church' ? MAT.pave()
      : type === 'forge' ? MAT.dirt()
      : o <= 3 ? (type === 'shop' || type === 'tavern' ? MAT.paveWarm() : MAT.dirtPale())
      : o === 2 ? MAT.paveRoman()
      : o >= 7 ? MAT.woodPale()
      : type === 'office' || type === 'school' || type === 'infirmary' ? MAT.woodPale() : MAT.wood();
    const wallMat = type === 'bunker' ? MAT.concrete()
      : type === 'hut' ? MAT.dirtPale()
      : type === 'church' ? MAT.stoneOld()
      : o === 2 ? MAT.plasterRoman()
      : o <= 3 ? MAT.stoneOld()
      : o >= 7 ? MAT.whitewash()
      : rng() < 0.5 ? MAT.whitewash() : MAT.cream();

    // ---------- coque : sol, murs, plafond ----------
    add(box(W + 0.6, 0.6, D + 0.6), floorMat, 0, -0.3, 0).castShadow = false;
    const T = 0.3;
    add(box(W + 2 * T, H, T), wallMat, 0, H / 2, -D2 - T / 2);                 // fond
    add(box(T, H, D + 2 * T), wallMat, -W2 - T / 2, H / 2, 0);                 // gauche
    add(box(T, H, D + 2 * T), wallMat, W2 + T / 2, H / 2, 0);                  // droite
    // façade percée de la porte (au centre ou décalée) et de fenêtres
    const doorX = Math.max(-W2 + 0.9, Math.min(W2 - 0.9, def.doorX ?? 0));
    const dl = doorX - 0.55, dr = doorX + 0.55;
    if (dl > -W2) add(box(dl + W2, H, T), wallMat, (-W2 + dl) / 2, H / 2, D2 + T / 2);
    if (dr < W2) add(box(W2 - dr, H, T), wallMat, (W2 + dr) / 2, H / 2, D2 + T / 2);
    add(box(1.1, H - 2.1, T), wallMat, doorX, 2.1 + (H - 2.1) / 2, D2 + T / 2);
    const door = add(box(1.05, 2.1, 0.08), o <= 1 ? MAT.thatch() : MAT.woodDark(), doorX, 1.05, D2 - 0.02);
    door.castShadow = false;
    // plafond (charpente apparente sauf béton et hutte)
    if (type === 'hut') {
      const cone = add(new THREE.ConeGeometry(Math.max(W, D) * 0.75, 2.6, 8, 1, true), MAT.thatch(), 0, H + 1.2, 0, { shadow: true });
      cone.material = cone.material.clone(); cone.material.side = THREE.DoubleSide;
      add(box(W + 0.6, 0.2, D + 0.6), MAT.thatch(), 0, H + 2.6, 0);
    } else {
      add(box(W + 0.6, 0.25, D + 0.6), type === 'bunker' ? MAT.concrete() : o >= 7 ? MAT.whitewash() : MAT.plasterOld(), 0, H + 0.12, 0);
      if (type !== 'bunker' && o <= 6) for (let x = -W2 + 0.7; x < W2; x += 1.3) add(box(0.18, 0.22, D), MAT.woodDark(), x, H - 0.11, 0, { shadow: false });
    }

    // hutte et blockhaus : un peu de jour par le trou de fumée ou la porte
    if (type === 'hut' || type === 'bunker') {
      const sl = new THREE.PointLight(0xdfe8ff, 2, 9, 1.6);
      sl.position.set(0, H + (type === 'hut' ? 1.5 : -0.3), type === 'hut' ? 0 : D2 - 0.8);
      g.add(sl);
      this.windowLights.push(sl);
    }
    // fenêtres : panneaux lumineux (jour/nuit) et lumière du dehors
    const windows = [];
    if (type !== 'bunker' && type !== 'hut') {
      const ys = type === 'church' ? 3.4 : 1.55, wh = type === 'church' ? 2.6 : 1.15, ww = type === 'church' ? 0.9 : 0.9;
      const xs = [];
      for (let x = -W2 + 1.1; x < W2 - 0.8; x += type === 'church' ? 99 : 2.2) if (Math.abs(x - doorX) > 1.3) xs.push(x);
      for (const x of xs.slice(0, 3)) windows.push([x, ys, D2 - 0.02, 0]);
      if (type === 'church') for (let z = -D2 + 2; z < D2 - 2; z += 3.2) { windows.push([-W2 + 0.02, ys, z, PI / 2]); windows.push([W2 - 0.02, ys, z, -PI / 2]); }
      else if (D > 5) windows.push([-W2 + 0.02, ys, -D2 / 3, PI / 2]);
      for (const [x, y, z, ry] of windows) {
        const pane = add(new THREE.PlaneGeometry(ww, wh), type === 'church' ? stainedMat(rng) : this.window, x, y, z + (ry ? 0 : -0.02), { ry: ry || PI, shadow: false });
        pane.position.x += ry > 0 ? 0.02 : ry < 0 ? -0.02 : 0;
        // cadre et croisillons
        const fr = flat(0xf0ece2, 0.6);
        add(box(ww + 0.12, 0.08, 0.06), fr, x, y + wh / 2, z, { ry, shadow: false });
        add(box(ww + 0.12, 0.08, 0.06), fr, x, y - wh / 2, z, { ry, shadow: false });
        if (type !== 'church') add(box(0.05, wh, 0.05), fr, x, y, z, { ry, shadow: false });
        const wl = new THREE.PointLight(0xdfe8ff, 2, 6, 1.8);
        const into = ry ? [Math.sign(ry) * 0.9, 0] : [0, -0.9];
        wl.position.set(x + into[0], y, z + into[1]);
        g.add(wl);
        this.windowLights.push(wl);
      }
    }

    // ---------- mobilier selon le type ----------
    const F = { add, solid, col, interact, lamp, rng, o, era, W2, D2, H, fires, g, def, doorX };
    let keeperSpot = null;
    switch (type) {
      case 'shop': keeperSpot = furnishShop(F); break;
      case 'tavern': keeperSpot = furnishTavern(F); break;
      case 'forge': keeperSpot = furnishForge(F); break;
      case 'clockmaker': keeperSpot = furnishClockmaker(F); break;
      case 'office': keeperSpot = furnishOffice(F); break;
      case 'infirmary': keeperSpot = furnishInfirmary(F); break;
      case 'church': furnishChurch(F); break;
      case 'school': furnishSchool(F); break;
      case 'mairie': furnishOffice(F, true); break;
      case 'warehouse': furnishWarehouse(F); break;
      case 'hut': furnishHut(F); break;
      case 'museum': furnishMuseum(F); break;
      case 'bunker': furnishBunker(F); break;
      default: furnishHome(F);
    }
    // un objet du quotidien à examiner
    const curios = CURIOS[era] ?? CURIOS.xix;
    const txt = curios[Math.floor(rng() * curios.length)];
    const cx = (rng() - 0.5) * (W - 2.4), cz = -D2 + 0.9;
    interact({ id: 'curio', kind: 'custom', x: cx, z: cz + 0.8, label: 'Examiner', do: [['toast', txt, 'info']] });
    if (type !== 'church' && type !== 'hut' && type !== 'bunker') {
      const shelf = add(box(1.2, 0.06, 0.3), MAT.woodDark(), cx, 1.45, cz - 0.35);
      shelf.castShadow = false;
      add(new THREE.SphereGeometry(0.11, 8, 6), flat(0x8a6a4a, 0.7), cx - 0.3, 1.58, cz - 0.35);
      add(box(0.22, 0.28, 0.04), flat(0x3a2a1a, 0.8), cx + 0.25, 1.62, cz - 0.42);
    }

    // sortie
    interact({ id: 'exit', kind: 'exit', x: doorX, z: D2 - 0.6, r: 1.3, label: 'Sortir' });
    // murs (collisions)
    for (let x = -W2; x <= W2; x += 0.8) { col(x, -D2 - 0.45, 0.5); if (Math.abs(x - doorX) > 0.75) col(x, D2 + 0.45, 0.5); }
    for (let z = -D2; z <= D2; z += 0.8) { col(-W2 - 0.45, z, 0.5); col(W2 + 0.45, z, 0.5); }
    col(doorX, D2 + 1.2, 0.6);

    g.traverse((m) => { if (m.isMesh) m.userData.own = true; });
    return {
      group: g, colliders, interactables, lamps, fires,
      spawn: { x: wx(doorX), z: wz(D2 - 1.2), yaw: PI },
      bounds: { x0: wx(-W2 - 1), x1: wx(W2 + 1), z0: wz(-D2 - 1), z1: wz(D2 + 2), y: ORIGIN.y },
      keeperSpot: keeperSpot ? { x: wx(keeperSpot[0]), z: wz(keeperSpot[1]), yaw: keeperSpot[2] ?? 0, action: keeperSpot[3] ?? 'idle' } : null,
    };
  }
}

function keeperOf(npc, shopId) {
  const k = shopId + ':keeper';
  if (npc.def.home === k || npc.def.home === shopId) return true;
  return (npc.def.routine || []).some((e) => e.at === k || (Array.isArray(e.at) && e.at[0] === k));
}

function stainedMat(rng) {
  const c = document.createElement('canvas');
  c.width = 64; c.height = 160;
  const ctx = c.getContext('2d');
  const cols = ['#2a4a9a', '#9a2a2a', '#d8b040', '#2a7a4a', '#6a2a8a', '#e8e0c8'];
  for (let y = 0; y < 160; y += 16) for (let x = 0; x < 64; x += 16) { ctx.fillStyle = cols[Math.floor(rng() * cols.length)]; ctx.fillRect(x, y, 16, 16); }
  ctx.strokeStyle = '#111'; ctx.lineWidth = 2;
  for (let y = 0; y <= 160; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(64, y); ctx.stroke(); }
  for (let x = 0; x <= 64; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 160); ctx.stroke(); }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, emissive: 0xffffff, emissiveMap: t, emissiveIntensity: 0.9, roughness: 0.4 });
}

// ======================================================================
//  ACCESSOIRES
// ======================================================================
const woodFor = (o) => (o <= 3 ? MAT.woodDark() : o >= 7 ? MAT.woodPale() : MAT.wood());

function table(F, x, z, w = 1.6, d = 0.9, ry = 0) {
  const m = woodFor(F.o);
  F.add(box(w, 0.07, d), m, x, 0.76, z, { ry });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const lx = sx * (w / 2 - 0.08), lz = sz * (d / 2 - 0.08);
    F.add(box(0.07, 0.74, 0.07), m, x + lx * Math.cos(ry) + lz * Math.sin(ry), 0.37, z - lx * Math.sin(ry) + lz * Math.cos(ry), { ry });
  }
  F.solid(x, z, ry ? d : w, ry ? w : d);
}
function chair(F, x, z, ry) {
  const m = woodFor(F.o);
  if (F.o <= 3) {                         // escabeau / banc
    F.add(box(0.42, 0.06, 0.42), m, x, 0.44, z, { ry });
    for (const [a, b] of [[-0.16, -0.16], [0.16, -0.16], [0, 0.16]]) F.add(box(0.05, 0.44, 0.05), m, x + a, 0.22, z + b);
  } else {
    F.add(box(0.44, 0.05, 0.44), m, x, 0.46, z, { ry });
    const bx = x - Math.sin(ry) * 0.2, bz = z - Math.cos(ry) * 0.2;
    F.add(box(0.44, 0.5, 0.05), m, bx, 0.72, bz, { ry });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) F.add(box(0.04, 0.46, 0.04), m, x + sx * 0.18, 0.23, z + sz * 0.18);
  }
  F.interact({ id: `sit:${x.toFixed(1)}:${z.toFixed(1)}`, kind: 'bench', x: x + Math.sin(ry) * 0.3, z: z + Math.cos(ry) * 0.3, r: 0.9, label: "S'asseoir", rot: ry });
}
function fireplace(F, x, z, ry = 0) {
  const stone = F.o <= 3 ? MAT.stone() : MAT.stonePale();
  F.add(box(1.8, 1.3, 0.6), stone, x, 0.65, z, { ry });
  F.add(box(1.2, 0.9, 0.62), MAT.black(), x, 0.45, z + Math.cos(ry) * 0.01, { ry, shadow: false });
  F.add(box(2.0, 0.12, 0.75), stone, x, 1.34, z, { ry });
  F.add(box(1.0, F.H - 1.4, 0.5), stone, x, 1.4 + (F.H - 1.4) / 2, z - Math.cos(ry) * 0.05, { ry });
  const fz = z + Math.cos(ry) * 0.12, fx = x + Math.sin(ry) * 0.12;
  F.fires.push(flames(F, fx, 0.15, fz));
  F.lamp(fx + Math.sin(ry) * 0.6, 0.8, fz + Math.cos(ry) * 0.6, 0xff9a4a, 1.6, true);
  F.solid(x, z, ry ? 0.6 : 1.8, ry ? 1.8 : 0.6);
}
function flames(F, x, y, z) {
  const fg = new THREE.Group();
  fg.position.set(x, y, z);
  const mat = new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.85 });
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.45, 6), mat);
    f.position.set((i - 1) * 0.12, 0.2, 0);
    fg.add(f);
  }
  for (let i = 0; i < 3; i++) {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 5), MAT.woodDark());
    log.rotation.z = PI / 2; log.rotation.y = i; log.position.y = 0.02;
    fg.add(log);
  }
  F.g.add(fg);
  return fg;
}
function bed(F, x, z, ry = 0) {
  const m = woodFor(F.o);
  F.add(box(1.0, 0.4, 2.0), m, x, 0.2, z, { ry });
  F.add(box(0.92, 0.18, 1.9), flat(F.o === 1 ? 0x7a5a3a : 0xece6d6, 0.95), x, 0.48, z, { ry, shadow: false });
  F.add(box(0.94, 0.06, 1.2), flat([0x7a2a22, 0x2a3a6a, 0x5a6a3a, 0x8a6a3a][Math.floor(F.rng() * 4)], 0.95), x, 0.58, z + Math.cos(ry) * 0.3, { ry, shadow: false });
  if (F.o >= 3) F.add(box(1.0, 0.9, 0.08), m, x - Math.sin(ry) * 0.98, 0.45, z - Math.cos(ry) * 0.98, { ry });
  F.solid(x, z, ry ? 2.0 : 1.0, ry ? 1.0 : 2.0);
  F.interact({ id: `bed:${x.toFixed(1)}:${z.toFixed(1)}`, kind: 'sleep', x: x + Math.cos(ry) * 0.9, z: z - Math.sin(ry) * 0.9, r: 1.2, label: "Dormir jusqu'au matin" });
}
function shelves(F, x, z, w, ry, goods) {
  const m = woodFor(F.o);
  F.add(box(w, 2.1, 0.4), m, x, 1.05, z, { ry });
  for (let k = 0; k < 4; k++) {
    for (let i = 0; i < Math.floor(w / 0.32); i++) {
      const gx = -w / 2 + 0.2 + i * 0.32;
      const px = x + gx * Math.cos(ry), pz = z - gx * Math.sin(ry);
      const y = 0.35 + k * 0.5;
      const item = goods[(i + k) % goods.length];
      prop(F, item, px + Math.sin(ry) * 0.12, y, pz + Math.cos(ry) * 0.12);
    }
  }
  F.solid(x, z, ry ? 0.45 : w, ry ? w : 0.45);
}
const GOODS = {
  bread: ['loaf', 'loaf', 'basket'], grocery: ['jar', 'sack', 'bottle', 'box'], wine: ['bottle', 'bottle', 'barrelS'],
  pharmacy: ['jar', 'jar', 'bottle'], cloth: ['roll', 'roll', 'box'], tools: ['box', 'pot', 'jar'], clocks: ['clock', 'box'],
  books: ['book', 'book', 'box'], fish: ['basket', 'jar'], salt: ['sack', 'sack', 'jar'], pottery: ['pot', 'pot', 'amph'],
};
function prop(F, item, x, y, z) {
  const r = F.rng();
  switch (item) {
    case 'loaf': F.add(new THREE.SphereGeometry(0.11, 8, 6), flat(0xb8803a, 0.8), x, y + 0.06, z).scale.set(1.3, 0.6, 1); break;
    case 'basket': F.add(new THREE.CylinderGeometry(0.14, 0.11, 0.14, 10), flat(0x9a7a4a, 0.9), x, y + 0.07, z); break;
    case 'jar': F.add(new THREE.CylinderGeometry(0.07, 0.07, 0.2, 10), flat([0xe8e0d0, 0x4a6a8a, 0x8a4a2a][Math.floor(r * 3)], 0.4), x, y + 0.1, z); break;
    case 'bottle': F.add(new THREE.CylinderGeometry(0.035, 0.045, 0.3, 8), flat([0x2a4a2a, 0x5a1a1a, 0x8a7a3a][Math.floor(r * 3)], 0.2, 0.1), x, y + 0.15, z); break;
    case 'sack': F.add(new THREE.SphereGeometry(0.14, 8, 6), flat(0xc8b890, 0.95), x, y + 0.12, z).scale.set(1, 1.2, 0.9); break;
    case 'box': F.add(box(0.24, 0.16, 0.2), flat([0x8a6a4a, 0xa83a3a, 0x3a5a8a, 0xd8c8a0][Math.floor(r * 4)], 0.8), x, y + 0.08, z); break;
    case 'roll': F.add(new THREE.CylinderGeometry(0.07, 0.07, 0.3, 10), flat([0x8a2a2a, 0x2a3a7a, 0xd8c8a0, 0x4a6a3a][Math.floor(r * 4)], 0.9), x, y + 0.08, z).rotation.z = PI / 2; break;
    case 'clock': F.add(new THREE.CylinderGeometry(0.1, 0.1, 0.05, 14), flat(0xf0ece0, 0.5), x, y + 0.14, z).rotation.x = PI / 2; break;
    case 'book': F.add(box(0.05, 0.24, 0.17), flat([0x6a2a1a, 0x2a3a5a, 0x3a5a2a][Math.floor(r * 3)], 0.8), x, y + 0.12, z); break;
    case 'pot': F.add(new THREE.SphereGeometry(0.11, 8, 6), flat(0xa86a3a, 0.8), x, y + 0.1, z); break;
    case 'amph': F.add(new THREE.CylinderGeometry(0.06, 0.1, 0.32, 8), flat(0xb5703a, 0.8), x, y + 0.16, z); break;
    case 'barrelS': F.add(new THREE.CylinderGeometry(0.11, 0.1, 0.22, 10), MAT.wood(), x, y + 0.11, z).rotation.z = PI / 2; break;
  }
}
function barrel(F, x, z) { F.add(new THREE.CylinderGeometry(0.34, 0.3, 0.85, 12), MAT.wood(), x, 0.43, z); F.col(x, z, 0.38); }
function rug(F, x, z, w, d) {
  const c = document.createElement('canvas'); c.width = 64; c.height = 64;
  const ctx = c.getContext('2d');
  const base = ['#7a2a22', '#2a3a5a', '#5a4a2a'][Math.floor(F.rng() * 3)];
  ctx.fillStyle = base; ctx.fillRect(0, 0, 64, 64);
  ctx.strokeStyle = '#d8b870'; ctx.lineWidth = 3; ctx.strokeRect(5, 5, 54, 54); ctx.strokeRect(14, 14, 36, 36);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const m = F.add(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ map: t, roughness: 1 }), x, 0.012, z, { shadow: false });
  m.rotation.x = -PI / 2;
}
function wallText(F, x, y, z, ry, def, w = 1.4) {
  const tex = signTexture(def);
  const h = w * ((def.h ?? 128) / (def.w ?? 512));
  F.add(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }), x, y, z, { ry, shadow: false });
}
function candle(F, x, y, z) {
  F.add(new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6), flat(0xf0ead8, 0.7), x, y + 0.09, z, { shadow: false });
  F.add(new THREE.SphereGeometry(0.025, 6, 4), new THREE.MeshBasicMaterial({ color: 0xffc060 }), x, y + 0.21, z, { shadow: false });
}
function ceilingLamp(F, x, z) {
  const y = F.H - 0.5;
  if (F.o >= 6) {
    F.add(new THREE.CylinderGeometry(0.02, 0.02, 0.5, 4), MAT.iron(), x, F.H - 0.25, z, { shadow: false });
    F.add(new THREE.ConeGeometry(0.28, 0.2, 14, 1, true), flat(0xf0ece0, 0.6, 0, { side: THREE.DoubleSide }), x, y, z, { shadow: false });
    F.add(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xfff0c0 }), x, y - 0.06, z, { shadow: false });
    F.lamp(x, y - 0.2, z, 0xffe2b0, 3.2, false, 10);
  } else if (F.o >= 4) {
    F.add(new THREE.CylinderGeometry(0.12, 0.08, 0.3, 8), MAT.glassLit(), x, y, z, { shadow: false });
    F.lamp(x, y - 0.2, z, 0xffc070, 2.2, true, 8);
  } else {
    candle(F, x, 0.8, z);
    F.lamp(x, 1.2, z, 0xffb060, 1.4, true, 6);
  }
}

// ======================================================================
//  AMÉNAGEMENTS
// ======================================================================
function furnishHome(F) {
  const { W2, D2, rng, o } = F;
  table(F, 0, -0.3, 1.6, 0.9);
  chair(F, -0.55, 0.35, PI); chair(F, 0.55, 0.35, PI); chair(F, -0.55, -0.95, 0);
  if (rng() < 0.6) chair(F, 0.55, -0.95, 0);
  F.add(new THREE.CylinderGeometry(0.08, 0.06, 0.14, 8), flat(0xa86a3a, 0.8), 0.3, 0.86, -0.3);
  F.add(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 12), flat(0xe8e0d0, 0.4), -0.3, 0.81, -0.2);
  if (o <= 6) fireplace(F, -W2 + 0.35, -0.3, PI / 2); else F.add(box(0.7, 0.9, 0.5), flat(0xe8e8e4, 0.4), -W2 + 0.4, 0.45, -0.3);
  bed(F, W2 - 0.65, -D2 + 1.15, 0);
  if (o >= 4) {
    // armoire et vaisselier
    F.add(box(1.1, 2.0, 0.55), woodFor(o), W2 - 0.45, 1.0, 0.9, { ry: -PI / 2 });
    F.solid(W2 - 0.45, 0.9, 0.55, 1.1);
    shelves(F, -W2 + 1.5, -D2 + 0.3, 1.4, 0, ['pot', 'jar', 'bottle']);
  } else {
    F.add(box(1.0, 0.55, 0.55), MAT.woodDark(), W2 - 0.45, 0.28, 0.9);    // coffre
    F.solid(W2 - 0.45, 0.9, 0.55, 1.0);
  }
  if (o >= 5) rug(F, 0, -0.3, 2.4, 1.6);
  if (o === 5) {
    // horloge comtoise
    F.add(box(0.5, 2.1, 0.32), MAT.woodDark(), -W2 + 0.35, 1.05, D2 - 1.0, { ry: PI / 2 });
    F.add(new THREE.CylinderGeometry(0.17, 0.17, 0.03, 16), flat(0xf0ece0, 0.4), -W2 + 0.53, 1.65, D2 - 1.0).rotation.z = PI / 2;
    F.col(-W2 + 0.35, D2 - 1.0, 0.35);
  }
  if (o === 6) {
    // poste de T.S.F.
    F.add(box(0.5, 0.36, 0.28), MAT.wood(), W2 - 0.45, 1.2, 0.9);
    F.add(box(0.3, 0.2, 0.02), flat(0xd8c8a0, 0.7), W2 - 0.45, 1.22, 0.75);
  }
  ceilingLamp(F, 0, -0.3);
}

function furnishShop(F) {
  const { W2, D2, def, o } = F;
  const id = def.shopId ?? '';
  const goods = /boulang|pistrinum|pain/.test(id) ? GOODS.bread
    : /pharma|apothic/.test(id) ? GOODS.pharmacy
    : /halles|drap|boutique/.test(id) ? GOODS.cloth
    : /tonneau|cave|vin/.test(id) ? GOODS.wine
    : /poisson/.test(id) ? GOODS.fish
    : /sel|lescure|salin/.test(id) ? GOODS.salt
    : /troc/.test(id) ? GOODS.pottery
    : GOODS.grocery;
  // comptoir en travers de la boutique
  const cz = -D2 + 1.7;
  F.add(box(2 * W2 - 1.2, 0.95, 0.6), woodFor(o), 0, 0.48, cz);
  F.add(box(2 * W2 - 1.1, 0.06, 0.7), o >= 5 ? MAT.stonePale() : woodFor(o), 0, 0.98, cz);
  F.solid(0, cz, 2 * W2 - 1.2, 0.6);
  // balance et marchandises sur le comptoir
  F.add(box(0.5, 0.04, 0.3), MAT.gold(), -0.6, 1.03, cz);
  F.add(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12), MAT.gold(), -0.75, 1.2, cz);
  F.add(new THREE.CylinderGeometry(0.12, 0.12, 0.02, 12), MAT.gold(), -0.45, 1.2, cz);
  for (let i = 0; i < 4; i++) prop(F, goods[i % goods.length], 0.2 + i * 0.3, 1.01, cz);
  shelves(F, -W2 / 2, -D2 + 0.3, Math.min(2.4, W2 - 0.3), 0, goods);
  shelves(F, W2 / 2, -D2 + 0.3, Math.min(2.4, W2 - 0.3), 0, goods);
  // sacs, tonneaux ou paniers côté client
  barrel(F, -W2 + 0.5, D2 - 1.4);
  F.interact({ id: 'counter', kind: 'shop', x: 0.4, z: cz + 0.9, r: 1.6, label: `Commercer — ${def.name ?? 'Boutique'}`, shop: { id } });
  if (def.sign) wallText(F, 0, F.H - 0.55, -D2 + 0.02, 0, def.sign, Math.min(2.4, 2 * W2 - 1));
  ceilingLamp(F, 0, 0.2);
  return [0.3, cz - 0.75, 0, 'idle'];
}

function furnishTavern(F) {
  const { W2, D2, o, rng } = F;
  const cz = -D2 + 1.5;
  F.add(box(2 * W2 - 1.6, 1.05, 0.6), woodFor(o), -0.4, 0.52, cz);
  F.add(box(2 * W2 - 1.5, 0.06, 0.7), woodFor(o), -0.4, 1.08, cz);
  F.solid(-0.4, cz, 2 * W2 - 1.6, 0.6);
  shelves(F, 0, -D2 + 0.3, Math.min(3.2, 2 * W2 - 1), 0, o === 2 ? GOODS.pottery : GOODS.wine);
  for (let i = 0; i < 3; i++) F.add(new THREE.CylinderGeometry(0.05, 0.04, 0.12, 8), o === 2 ? flat(0xa86a3a, 0.8) : MAT.glass(), -1 + i * 0.5, 1.17, cz);
  barrel(F, W2 - 0.5, -D2 + 0.6);
  barrel(F, W2 - 0.5, -D2 + 1.4);
  const tables = [[-W2 / 2, D2 / 3], [W2 / 2, D2 / 3]];
  for (const [x, z] of tables) {
    table(F, x, z, 1.0, 0.8);
    chair(F, x - 0.6, z, PI / 2); chair(F, x + 0.6, z, -PI / 2);
  }
  if (o <= 6 && rng() < 0.7) fireplace(F, -W2 + 0.35, -0.6, PI / 2);
  F.interact({ id: 'counter', kind: 'shop', x: 0, z: cz + 0.9, r: 1.6, label: `Commander — ${F.def.name ?? 'Comptoir'}`, shop: { id: F.def.shopId } });
  ceilingLamp(F, -W2 / 2, D2 / 3); ceilingLamp(F, W2 / 2, D2 / 3);
  return [0.6, cz - 0.7, 0, 'idle'];
}

function furnishForge(F) {
  const { W2, D2 } = F;
  // foyer de forge et soufflet
  F.add(box(1.6, 0.9, 1.1), MAT.stone(), -W2 + 1.0, 0.45, -D2 + 0.8);
  F.fires.push(flames(F, -W2 + 1.0, 0.92, -D2 + 0.8));
  F.lamp(-W2 + 1.0, 1.4, -D2 + 1.4, 0xff7a2a, 2.8, true, 9);
  F.add(box(1.4, F.H - 1, 1.0), MAT.stoneDark(), -W2 + 1.0, 1 + (F.H - 1) / 2, -D2 + 0.6);
  F.solid(-W2 + 1.0, -D2 + 0.8, 1.6, 1.1);
  F.add(box(0.7, 0.3, 1.0), MAT.woodDark(), -W2 + 2.2, 1.0, -D2 + 0.8);
  // enclume sur son billot
  F.add(new THREE.CylinderGeometry(0.28, 0.32, 0.6, 10), MAT.woodDark(), 0.4, 0.3, -0.2);
  F.add(box(0.6, 0.22, 0.24), MAT.metal(), 0.4, 0.72, -0.2);
  F.col(0.4, -0.2, 0.45);
  // outils au mur et tonneau d'eau
  for (let i = 0; i < 5; i++) F.add(box(0.05, 0.6, 0.05), MAT.iron(), W2 - 0.1, 1.5, -1 + i * 0.35);
  barrel(F, W2 - 0.6, D2 - 1.5);
  F.interact({ id: 'counter', kind: 'shop', x: 0.4, z: 0.9, r: 1.6, label: `Commercer — ${F.def.name ?? 'Forge'}`, shop: { id: F.def.shopId } });
  return [0.4, -0.85, 0, 'hammer'];
}

function furnishClockmaker(F) {
  const { W2, D2 } = F;
  const cz = -D2 + 1.6;
  F.add(box(2.4, 0.9, 0.7), MAT.woodDark(), 0, 0.45, cz);
  F.solid(0, cz, 2.4, 0.7);
  for (let i = 0; i < 4; i++) F.add(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), MAT.gold(), -0.8 + i * 0.4, 0.93, cz);
  // pendules au mur
  for (let i = 0; i < 6; i++) {
    const x = -W2 + 0.8 + (i % 3) * 1.2, y = 1.3 + Math.floor(i / 3) * 0.8;
    F.add(new THREE.CylinderGeometry(0.2, 0.2, 0.06, 16), flat(0xf0ece0, 0.4), x, y, -D2 + 0.05).rotation.x = PI / 2;
    F.add(box(0.48, 0.48, 0.05), MAT.woodDark(), x, y, -D2 + 0.02);
  }
  F.add(box(0.5, 2.1, 0.32), MAT.woodDark(), W2 - 0.4, 1.05, -D2 + 0.3);
  F.lamp(0, 1.6, cz, 0xffd090, 1.6, false, 6);
  F.interact({ id: 'counter', kind: 'shop', x: 0, z: cz + 0.9, r: 1.6, label: `Commercer — ${F.def.name ?? 'Horlogerie'}`, shop: { id: F.def.shopId } });
  ceilingLamp(F, 0, 0.6);
  return [0, cz - 0.7, 0, 'write'];
}

function furnishOffice(F, mairie = false) {
  const { W2, D2, o } = F;
  table(F, 0, -D2 + 1.6, 1.8, 0.9);
  chair(F, 0, -D2 + 0.9, 0);
  chair(F, -0.5, -D2 + 2.4, PI); chair(F, 0.5, -D2 + 2.4, PI);
  F.add(box(0.4, 0.06, 0.3), flat(0xe8dcb0, 0.9), 0.2, 0.82, -D2 + 1.6);   // registre ouvert
  candle(F, -0.6, 0.79, -D2 + 1.5);
  shelves(F, -W2 + 0.3, 0, Math.min(2.4, D2 * 2 - 2), PI / 2, GOODS.books);
  if (mairie) {
    wallText(F, 0, F.H - 0.6, -D2 + 0.02, 0, { text: o === 5 ? 'EMPIRE FRANÇAIS' : 'RÉPUBLIQUE FRANÇAISE', style: 'carved', bg: '#e8e0c8', fg: '#2a2a2a' }, 2.2);
    // drapeau
    F.add(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), MAT.wood(), W2 - 0.6, 1.1, -D2 + 0.5);
    const c = document.createElement('canvas'); c.width = 96; c.height = 64;
    const ctx = c.getContext('2d');
    ['#1e3a8a', '#f4f2ec', '#c8241e'].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(i * 32, 0, 32, 64); });
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    if (o !== 6) F.add(new THREE.PlaneGeometry(0.9, 0.6), new THREE.MeshStandardMaterial({ map: t, side: THREE.DoubleSide }), W2 - 0.15, 1.85, -D2 + 0.5, { ry: PI / 2, shadow: false });
  }
  ceilingLamp(F, 0, -0.2);
  if (F.def.shopId) F.interact({ id: 'counter', kind: 'shop', x: 0, z: -D2 + 2.6, r: 1.6, label: `Au guichet — ${F.def.name ?? ''}`, shop: { id: F.def.shopId } });
  return [0, -D2 + 0.9, 0, 'write'];
}

function furnishInfirmary(F) {
  const { W2, D2 } = F;
  bed(F, -W2 + 0.65, -D2 + 1.2, 0);
  bed(F, W2 - 0.65, -D2 + 1.2, 0);
  F.add(box(1.2, 1.8, 0.45), flat(0xe8e8e2, 0.5), 0, 0.9, -D2 + 0.3);
  F.solid(0, -D2 + 0.3, 1.2, 0.45);
  for (let i = 0; i < 4; i++) prop(F, 'jar', -0.4 + i * 0.27, 1.3, -D2 + 0.4);
  table(F, 0, 0.6, 1.2, 0.7);
  chair(F, 0, 1.25, PI);
  F.interact({ id: 'counter', kind: 'shop', x: 0, z: 1.6, r: 1.6, label: `Dispensaire`, shop: { id: F.def.shopId } });
  ceilingLamp(F, 0, 0);
  return [0, -0.2, 0, 'idle'];
}

function furnishChurch(F) {
  const { W2, D2, o } = F;
  // chœur et autel
  F.add(box(2 * W2, 0.3, 2.8), MAT.stonePale(), 0, 0.15, -D2 + 1.4);
  F.add(box(1.8, 1.0, 0.8), MAT.stonePale(), 0, 0.8, -D2 + 0.9);
  F.solid(0, -D2 + 0.9, 1.8, 0.8);
  F.add(box(1.9, 0.04, 0.85), flat(0xf4f2ec, 0.8), 0, 1.32, -D2 + 0.9);
  for (const x of [-0.6, 0.6]) { candle(F, x, 1.34, -D2 + 0.9); F.lamp(x, 1.7, -D2 + 1.1, 0xffc070, 0.8, true, 5); }
  F.add(box(0.1, 1.4, 0.1), MAT.gold(), 0, 2.3, -D2 + 0.6);
  F.add(box(0.7, 0.1, 0.1), MAT.gold(), 0, 2.6, -D2 + 0.6);
  // bancs
  for (let z = -D2 + 4; z < D2 - 2; z += 1.4) {
    for (const s of [-1, 1]) {
      const x = s * (W2 / 2 + 0.2);
      F.add(box(W2 - 1.0, 0.08, 0.4), MAT.woodDark(), x, 0.45, z);
      F.add(box(W2 - 1.0, 0.5, 0.06), MAT.woodDark(), x, 0.75, z + 0.22);
      F.solid(x, z, W2 - 1.0, 0.5);
      F.interact({ id: `pew:${s}:${z.toFixed(1)}`, kind: 'bench', x, z: z - 0.45, r: 0.9, label: "S'asseoir et se recueillir", rot: PI });
    }
  }
  // piliers
  for (let z = -D2 + 3; z < D2 - 1; z += 3.2) for (const s of [-1, 1]) { F.add(new THREE.CylinderGeometry(0.3, 0.34, F.H, 10), MAT.stoneOld(), s * (W2 - 0.9), F.H / 2, z); F.col(s * (W2 - 0.9), z, 0.4); }
  F.lamp(0, F.H - 1, 0, 0xffe0b0, o >= 6 ? 2.2 : 1.2, false, 16);
}

function furnishSchool(F) {
  const { W2, D2, o, era } = F;
  // tableau noir et leçon du jour
  const lesson = {
    xix: { text: 'Le 14 août 1862', sub: 'Morale : la propreté est une politesse.' },
    wwii: { text: 'Le 12 juin 1943', sub: 'Dictée : « Les blés sont mûrs… »' },
    contemporaine: { text: 'Mardi', sub: 'Les marais salants de l\'île' },
  }[era] ?? { text: 'Leçon', sub: 'Lire, écrire, compter' };
  wallText(F, 0, 1.7, -D2 + 0.03, 0, { ...lesson, style: 'painted', bg: '#1e2a22', fg: '#e8ecdc' }, 2.6);
  F.add(box(1.4, 0.8, 0.7), woodFor(o), 0, 0.4, -D2 + 1.4);
  F.solid(0, -D2 + 1.4, 1.4, 0.7);
  for (let r = 0; r < 3; r++) for (const s of [-1, 1]) {
    const x = s * 1.3, z = -D2 + 3 + r * 1.3;
    if (z > D2 - 1.4) continue;
    // pupitre à deux places et son banc
    const wood = o >= 7 ? MAT.woodPale() : MAT.wood();
    F.add(box(1.4, 0.06, 0.5), wood, x, 0.72, z);
    F.add(box(1.4, 0.3, 0.04), wood, x, 0.55, z - 0.23);
    for (const sx of [-0.62, 0.62]) { F.add(box(0.05, 0.72, 0.45), MAT.woodDark(), x + sx, 0.36, z); F.add(box(0.05, 0.42, 0.28), MAT.woodDark(), x + sx, 0.21, z + 0.45); }
    F.add(box(1.4, 0.06, 0.3), wood, x, 0.42, z + 0.45);
    F.add(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 8), MAT.black(), x - 0.4, 0.76, z - 0.12);
    F.solid(x, z + 0.2, 1.4, 0.9);
  }
  // carte de France
  const c = document.createElement('canvas'); c.width = 128; c.height = 128;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#e8e0c8'; ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = '#9ab07a';
  ctx.beginPath(); [[60, 10], [90, 20], [110, 40], [100, 70], [110, 100], [70, 118], [40, 110], [20, 80], [10, 50], [35, 40], [40, 20]].forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y))); ctx.closePath(); ctx.fill();
  ctx.strokeStyle = '#4a5a8a'; ctx.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  F.add(new THREE.PlaneGeometry(1.2, 1.2), new THREE.MeshStandardMaterial({ map: t }), -W2 + 0.03, 1.7, 0, { ry: PI / 2, shadow: false });
  F.add(new THREE.CylinderGeometry(0.25, 0.28, 0.9, 10), MAT.iron(), W2 - 0.6, 0.45, 0);
  F.col(W2 - 0.6, 0, 0.4);
  ceilingLamp(F, 0, 0);
}

function furnishWarehouse(F) {
  const { W2, D2, rng, o } = F;
  for (let i = 0; i < 10; i++) {
    const x = -W2 + 0.7 + rng() * (2 * W2 - 1.4), z = -D2 + 0.7 + rng() * (2 * D2 - 3);
    if (o === 2) { F.add(new THREE.CylinderGeometry(0.16, 0.24, 0.9, 10), flat(0xb5703a, 0.8), x, 0.45, z); F.col(x, z, 0.3); } else barrel(F, x, z);
  }
  ceilingLamp(F, 0, 0);
}

function furnishHut(F) {
  const { W2, D2 } = F;
  // foyer central
  for (let i = 0; i < 8; i++) { const a = (i / 8) * PI * 2; F.add(new THREE.DodecahedronGeometry(0.16, 0), MAT.stone(), Math.cos(a) * 0.5, 0.1, Math.sin(a) * 0.5); }
  F.fires.push(flames(F, 0, 0.05, 0));
  F.lamp(0, 0.9, 0, 0xffa050, 3.2, true, 10);
  F.col(0, 0, 0.6);
  // couches de fourrures, poteries, poissons qui fument
  for (const [x, z] of [[-W2 + 0.9, -D2 + 1.0], [W2 - 0.9, -D2 + 1.0]]) {
    F.add(box(1.2, 0.15, 1.8), flat(0x6a4a2a, 1), x, 0.08, z, { shadow: false });
    F.interact({ id: `fur:${x}`, kind: 'bench', x, z: z + 1.1, r: 0.9, label: "S'asseoir sur les fourrures", rot: PI });
    F.interact({ id: `furs:${x}`, kind: 'sleep', x: x + (x < 0 ? 0.9 : -0.9), z, r: 1.0, label: "Dormir jusqu'au matin" });
  }
  for (let i = 0; i < 4; i++) prop(F, 'pot', -W2 + 0.5 + i * 0.35, 0, D2 - 0.6);
  for (let i = 0; i < 4; i++) F.add(new THREE.ConeGeometry(0.06, 0.35, 5), flat(0x8a9aa0, 0.6), -0.6 + i * 0.4, 2.2, -0.8).rotation.x = PI;
}

function furnishBunker(F) {
  const { W2, D2 } = F;
  // meurtrière vers la mer, caisses de munitions, couchettes, périscope
  F.add(box(2.0, 0.4, 0.3), new THREE.MeshBasicMaterial({ color: 0x9ab0c0 }), 0, 1.6, -D2 + 0.02, { shadow: false });
  for (let i = 0; i < 4; i++) { F.add(box(0.6, 0.35, 0.4), flat(0x4a5040, 0.8), W2 - 0.5, 0.18 + (i % 2) * 0.36, -D2 + 0.6 + Math.floor(i / 2) * 0.45); }
  F.solid(W2 - 0.5, -D2 + 0.8, 0.6, 1.0);
  bed(F, -W2 + 0.65, D2 - 1.6, 0);
  F.add(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 8), MAT.metal(), 0.8, 1.1, -D2 + 0.6);
  F.lamp(0, F.H - 0.4, 0, 0xffe0a0, 1.4, false, 7);
}

function furnishMuseum(F) {
  const { W2, D2 } = F;
  // vitrines : un objet de chaque époque de l'île
  const items = [
    ['pot', 'Vase néolithique (vers 4500 av. J.-C.), trouvé aux Portes.'],
    ['amph', 'Amphore romaine, pêchée au large de Sainte-Marie.'],
    ['book', 'Page d\'un psautier de l\'abbaye des Châteliers.'],
    ['clock', 'Mécanisme de l\'horloge du phare, XIXᵉ siècle.'],
  ];
  items.forEach(([it, txt], i) => {
    const x = -W2 + 1.2 + i * ((2 * W2 - 2.4) / 3), z = -0.4;
    F.add(box(0.7, 0.9, 0.7), MAT.woodDark(), x, 0.45, z);
    const glass = F.add(box(0.66, 0.6, 0.66), new THREE.MeshStandardMaterial({ color: 0xddeeff, transparent: true, opacity: 0.18, roughness: 0.05 }), x, 1.2, z, { shadow: false });
    glass.renderOrder = 2;
    prop(F, it, x, 0.9, z);
    F.col(x, z, 0.5);
    F.interact({ id: `vitrine:${i}`, kind: 'custom', x, z: z + 0.9, r: 1.0, label: 'Regarder la vitrine', do: [['toast', txt, 'info']] });
  });
  // lentille de Fresnel au fond de la salle
  const lens = F.add(new THREE.CylinderGeometry(0.6, 0.6, 1.4, 16), new THREE.MeshStandardMaterial({ color: 0xcfe8f0, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.2 }), 0, 1.1, -D2 + 0.9, { shadow: false });
  lens.renderOrder = 2;
  F.col(0, -D2 + 0.9, 0.8);
  ceilingLamp(F, -W2 / 2, 0); ceilingLamp(F, W2 / 2, 0);
}
