// Forme de l'île et son évolution au fil des époques.
//
// Le contour réel (geo/coast.js) est tramé sur une grille, puis converti en
// distance signée à la côte (positive à terre, négative en mer, en unités de
// monde ≈ 15 m). Chaque époque applique ensuite ses modifications :
//  - Néolithique : la mer est plus basse de quelques mètres, l'estran est
//    plus large ; l'île n'est encore qu'un chapelet de trois îles (Ars, Loix,
//    Ré) séparées par des chenaux marins ;
//  - Antiquité : toujours trois îles, chenaux plus étroits ;
//  - Moyen Âge : les chenaux s'envasent et deviennent des gués découverts à
//    marée basse ; les moines endiguent les premiers marais ;
//  - XVIIᵉ – 1943 : l'île est soudée par les marais salants ; le cordon
//    dunaire de la côte sud est plus large qu'aujourd'hui ;
//  - aujourd'hui : l'érosion a grignoté les dunes (les blockhaus de 1943
//    basculent sur la plage) et le pont relie l'île au continent (1988).

import { ISLAND, MAINLAND } from './coast.js';

export const WORLD = { x0: -900, x1: 1100, z0: -500, z1: 500 };
const CELL = 2;
const NX = (WORLD.x1 - WORLD.x0) / CELL, NZ = (WORLD.z1 - WORLD.z0) / CELL;

// ---------- Tramage et transformée de distance ----------
function rings() {
  const toPts = (flat) => { const p = []; for (let i = 0; i < flat.length; i += 2) p.push([flat[i], flat[i + 1]]); return p; };
  return [toPts(ISLAND), ...MAINLAND.map(toPts)];
}

function rasterize(polys) {
  const land = new Uint8Array(NX * NZ);
  const xs = [];
  for (const poly of polys) {
    for (let j = 0; j < NZ; j++) {
      const zc = WORLD.z0 + (j + 0.5) * CELL;
      xs.length = 0;
      for (let i = 0, n = poly.length; i < n; i++) {
        const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % n];
        if ((az <= zc && bz > zc) || (bz <= zc && az > zc)) xs.push(ax + ((zc - az) / (bz - az)) * (bx - ax));
      }
      xs.sort((a, b) => a - b);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const i0 = Math.max(0, Math.ceil((xs[k] - WORLD.x0) / CELL - 0.5));
        const i1 = Math.min(NX - 1, Math.floor((xs[k + 1] - WORLD.x0) / CELL - 0.5));
        for (let i = i0; i <= i1; i++) land[j * NX + i] = 1;
      }
    }
  }
  return land;
}

// Transformée de distance euclidienne exacte (Felzenszwalb & Huttenlocher)
function edt1d(f, n, d, v, z) {
  let k = 0;
  v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
  for (let q = 1; q < n; q++) {
    let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
    while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
    k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
  }
  k = 0;
  for (let q = 0; q < n; q++) {
    while (z[k + 1] < q) k++;
    d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
  }
}
function edt(feature) {
  const INF = 1e20, out = new Float32Array(NX * NZ);
  const n = Math.max(NX, NZ);
  const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NZ; j++) f[j] = feature[j * NX + i] ? 0 : INF;
    edt1d(f, NZ, d, v, z);
    for (let j = 0; j < NZ; j++) out[j * NX + i] = d[j];
  }
  for (let j = 0; j < NZ; j++) {
    for (let i = 0; i < NX; i++) f[i] = out[j * NX + i];
    edt1d(f, NX, d, v, z);
    for (let i = 0; i < NX; i++) out[j * NX + i] = d[i];
  }
  return out;
}

let SDF = null;
function build() {
  const land = rasterize(rings());
  const sea = new Uint8Array(land.length);
  for (let i = 0; i < land.length; i++) sea[i] = land[i] ? 0 : 1;
  const toSea = edt(sea), toLand = edt(land);
  SDF = new Float32Array(land.length);
  for (let i = 0; i < land.length; i++) {
    SDF[i] = land[i] ? (Math.sqrt(toSea[i]) - 0.5) * CELL : -(Math.sqrt(toLand[i]) - 0.5) * CELL;
  }
}

// Distance signée à la côte actuelle (interpolation bilinéaire)
export function baseDist(x, z) {
  if (!SDF) build();
  const fx = (x - WORLD.x0) / CELL - 0.5, fz = (z - WORLD.z0) / CELL - 0.5;
  if (fx < 0 || fz < 0 || fx >= NX - 1 || fz >= NZ - 1) return -200;
  const i = fx | 0, j = fz | 0, tx = fx - i, tz = fz - j;
  const k = j * NX + i;
  const a = SDF[k] + (SDF[k + 1] - SDF[k]) * tx;
  const b = SDF[k + NX] + (SDF[k + NX + 1] - SDF[k + NX]) * tx;
  return a + (b - a) * tz;
}

// ---------- Côté atlantique (côte sud-ouest, face au pertuis d'Antioche) ----------
// Une « épine » suit l'axe de l'île ; ce qui est au sud de l'épine regarde l'Atlantique.
const SPINE = [[-830, -280], [-720, -190], [-610, -80], [-500, -40], [-300, -30], [-100, 0], [120, 20], [320, 100], [520, 210], [720, 270], [860, 280]];
export function atlanticSide(x, z) {
  let best = Infinity, side = 0;
  for (let i = 0; i < SPINE.length - 1; i++) {
    const [ax, az] = SPINE[i], [bx, bz] = SPINE[i + 1];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const px = ax + dx * t, pz = az + dz * t;
    const d = (x - px) ** 2 + (z - pz) ** 2;
    if (d < best) { best = d; side = dx * (z - az) - dz * (x - ax); }
  }
  // 1 franchement au sud de l'axe, 0 au nord ; transition sur ~60 unités
  const s = Math.sign(side) * Math.sqrt(best);
  return Math.max(0, Math.min(1, 0.5 + s / 120));
}

// ---------- Géographie des époques ----------
// Chenaux séparant les trois îles d'origine (Ars, Loix, Ré)
const MARTRAY = [[-394, -30], [-396, -12], [-399, 8], [-402, 30]];                 // Ars | Ré
const LOIX = [[-108, -30], [-140, -38], [-190, -44], [-250, -46], [-305, -52], [-348, -58]]; // Loix | Ré

export const ERA_GEO = {
  prehistoire: { grow: 9, atlantic: 6, channels: [{ pts: MARTRAY, w: 34 }, { pts: LOIX, w: 30 }],
    note: "Vers 4500 av. J.-C., la mer est plus basse de quelques mètres : l'estran est immense. Ré n'est pas une île mais trois : Ars, Loix et Ré, séparées par des chenaux marins." },
  antiquite: { grow: 3, atlantic: 5, channels: [{ pts: MARTRAY, w: 20 }, { pts: LOIX, w: 18 }],
    note: "Au temps des Romains, l'archipel compte toujours trois îles. Les chenaux du Martray et de Loix se traversent en barque." },
  moyenage: { grow: 1, atlantic: 4, channels: [{ pts: MARTRAY, w: 14, ford: true }, { pts: LOIX, w: 14, ford: true }],
    note: "En 1190, les chenaux s'envasent : on les passe à gué à marée basse. Les moines commencent à endiguer les marais qui souderont les trois îles." },
  xvii: { grow: 0, atlantic: 3, channels: [],
    note: "Au XVIIᵉ siècle, les marais salants ont soudé les trois îles en une seule. Le Martray n'est plus qu'un étroit cordon de dunes." },
  xix: { grow: 0, atlantic: 2.5, channels: [],
    note: "En 1862, les marais salants couvrent l'ouest de l'île ; on plante des pins pour fixer les dunes de la côte sud." },
  wwii: { grow: 0, atlantic: 2, channels: [],
    note: "En 1943, le Mur de l'Atlantique hérisse les dunes de la côte sud de blockhaus." },
  contemporaine: { grow: 0, atlantic: 0, channels: [], bridge: true,
    note: "Aujourd'hui, l'érosion grignote les dunes (les blockhaus basculent sur les plages) et le pont, ouvert en 1988, relie l'île à La Rochelle." },
};

let ERA = ERA_GEO.contemporaine;
export function setGeoEra(id) { ERA = ERA_GEO[id] ?? ERA_GEO.contemporaine; }
export function geoEra() { return ERA; }

function polyDist(x, z, pts) {
  let best = Infinity;
  for (let i = 0; i < pts.length - 1; i++) {
    const [ax, az] = pts[i], [bx, bz] = pts[i + 1];
    const dx = bx - ax, dz = bz - az, L2 = dx * dx + dz * dz;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / L2));
    const d = Math.hypot(x - ax - dx * t, z - az - dz * t);
    if (d < best) best = d;
  }
  return best;
}

// Distance signée à la côte de l'époque donnée (ou de l'époque courante)
export function coastDist(x, z, era = ERA) {
  let d = baseDist(x, z);
  if (d < -150) return d;
  // la mer plus basse découvre l'estran ; les dunes atlantiques s'avancent
  d += era.grow;
  if (era.atlantic) d += era.atlantic * atlanticSide(x, z) * (d > -40 ? 1 : 0);
  for (const c of era.channels) {
    if (c.ford) continue;
    const cd = polyDist(x, z, c.pts) - c.w / 2;
    if (cd < d) d = cd;
  }
  return d;
}

// Gués de l'époque (0..1) : chenaux envasés découverts à marée basse
export function fordFactor(x, z, era = ERA) {
  let f = 0;
  for (const c of era.channels) {
    if (!c.ford) continue;
    const cd = polyDist(x, z, c.pts) - c.w / 2;
    f = Math.max(f, Math.min(1, Math.max(0, -cd / 4)));
  }
  return f;
}

// ---------- Le pont de l'île de Ré (1988) ----------
export const BRIDGE = [[798, 279], [830, 286], [870, 293], [910, 298], [948, 301], [975, 304]];
