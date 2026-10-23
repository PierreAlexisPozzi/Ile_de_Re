// Cheveux, barbes et cils, sur le corps réel (human.js).
//
// Comme dans les jeux réalistes, une chevelure est faite :
//  - de calottes : le cuir chevelu gonflé et lissé, couvert d'une texture de
//    mèches qui rayonnent depuis l'épi et s'effilent à la lisière (une couche
//    dense, une couche plus légère au-dessus pour le volume) ;
//  - de mèches libres (rubans texturés) pour ce qui dépasse du crâne :
//    cheveux longs, carré, frange, queue de cheval, chignon, nattes.
// La barbe suit le même principe sur le bas du visage.

import * as THREE from 'three';
import { PART, regionShell } from './human.js';

const geoCache = new Map();
const matCache = new Map();

// ----------------------------------------------------------------------
//  Textures de mèches : fils fins, racines plus sombres, pointes effilées.
//  dense : fond plein (la calotte ne laisse pas voir la peau) sauf aux pointes
// ----------------------------------------------------------------------
const texCache = {};
function strandTexture(kind = 'loose') {
  if (texCache[kind]) return texCache[kind];
  const W = 128, Hh = 512;
  const c = document.createElement('canvas');
  c.width = W; c.height = Hh;
  const ctx = c.getContext('2d');
  let seed = kind === 'dense' ? 5 : kind === 'lash' ? 23 : 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  if (kind === 'dense') {
    const g = ctx.createLinearGradient(0, 0, 0, Hh);
    g.addColorStop(0, 'rgba(150,150,150,1)'); g.addColorStop(0.62, 'rgba(165,165,165,1)'); g.addColorStop(0.8, 'rgba(165,165,165,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);
  }
  const n = kind === 'lash' ? 26 : kind === 'dense' ? 260 : 170;
  for (let i = 0; i < n; i++) {
    const x0 = kind === 'lash' ? (i + 0.5) * W / n + (rnd() - 0.5) * 3 : rnd() * W;
    const b = kind === 'lash' ? 40 : 140 + rnd() * 115;
    const len = kind === 'lash' ? 0.7 + rnd() * 0.3 : 0.6 + rnd() * 0.4;
    ctx.strokeStyle = `rgba(${b},${b},${b},${kind === 'lash' ? 0.95 : 0.5 + rnd() * 0.5})`;
    ctx.lineWidth = kind === 'lash' ? 2.2 : 0.6 + rnd() * 1.2;
    ctx.beginPath();
    ctx.moveTo(x0, 0);
    const wob = (rnd() - 0.5) * (kind === 'lash' ? 10 : 7);
    ctx.bezierCurveTo(x0 + wob * 0.2, Hh * 0.33 * len, x0 + wob * 0.6, Hh * 0.66 * len, x0 + wob, Hh * len);
    ctx.stroke();
  }
  // pointes effilées, racines plus sombres, bords adoucis
  const id = ctx.getImageData(0, 0, W, Hh);
  for (let y = 0; y < Hh; y++) {
    const fy = y / Hh;
    const ka = fy < 0.65 ? 1 : Math.max(0, 1 - (fy - 0.65) / 0.35);
    const kc = kind === 'lash' ? 1 : 0.7 + 0.3 * Math.min(1, fy * 3);
    for (let x = 0; x < W; x++) {
      const i = (y * W + x) * 4;
      id.data[i + 3] *= ka;
      id.data[i] *= kc; id.data[i + 1] *= kc; id.data[i + 2] *= kc;
    }
  }
  ctx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 4;
  texCache[kind] = t;
  return t;
}

export function hairMaterial(color, kind = 'loose') {
  const key = `${color}-${kind}`;
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({
    color, map: strandTexture(kind), alphaTest: kind === 'dense' ? 0.45 : 0.35, side: THREE.DoubleSide,
    roughness: 0.5, metalness: 0,
  });
  matCache.set(key, m);
  return m;
}

// ----------------------------------------------------------------------
//  Repère du visage et surface (pour coller les mèches à la peau)
// ----------------------------------------------------------------------
function faceFrame(v) {
  const eL = new THREE.Vector3(...v.J.eyeL), eR = new THREE.Vector3(...v.J.eyeR);
  const ec = eL.clone().add(eR).multiplyScalar(0.5);
  return { ec, iod: eL.distanceTo(eR), top: v.J.headTop[1] };
}

function surfaceIndex(v, parts) {
  const pts = [], nrm = [];
  for (let i = 0; i < v.part.length; i++) {
    if (!parts.includes(v.part[i])) continue;
    pts.push(v.pos[i * 3], v.pos[i * 3 + 1], v.pos[i * 3 + 2]);
    nrm.push(v.nrm[i * 3], v.nrm[i * 3 + 1], v.nrm[i * 3 + 2]);
  }
  const cell = 0.025;
  const grid = new Map();
  const key = (x, y, z) => `${x},${y},${z}`;
  for (let i = 0; i < pts.length / 3; i++) {
    const k = key(Math.floor(pts[i * 3] / cell), Math.floor(pts[i * 3 + 1] / cell), Math.floor(pts[i * 3 + 2] / cell));
    if (!grid.has(k)) grid.set(k, []);
    grid.get(k).push(i);
  }
  const near = (p) => {
    let best = -1, bd = 1e9;
    const cx = Math.floor(p.x / cell), cy = Math.floor(p.y / cell), cz = Math.floor(p.z / cell);
    for (let r = 1; r <= 3 && best < 0; r++) {
      for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) for (let dz = -r; dz <= r; dz++) {
        const l = grid.get(key(cx + dx, cy + dy, cz + dz));
        if (!l) continue;
        for (const i of l) {
          const d = (pts[i * 3] - p.x) ** 2 + (pts[i * 3 + 1] - p.y) ** 2 + (pts[i * 3 + 2] - p.z) ** 2;
          if (d < bd) { bd = d; best = i; }
        }
      }
    }
    if (best < 0) return null;
    const n = new THREE.Vector3(nrm[best * 3], nrm[best * 3 + 1], nrm[best * 3 + 2]);
    const q = new THREE.Vector3(pts[best * 3], pts[best * 3 + 1], pts[best * 3 + 2]);
    return { q, n, d: p.clone().sub(q).dot(n) };
  };
  return { near };
}

// ----------------------------------------------------------------------
//  Coupes
// ----------------------------------------------------------------------
// t : épaisseur de la calotte ; line : ligne des cheveux (0 normal, + dégarnie) ;
// crown : sommet chauve (tonsure, couronne) ; part : x de la raie ;
// long : longueur des mèches libres sous la calotte (dos, côtés) ;
// fringe : longueur de la frange ; gather : queue / chignon ; curl : boucles
const STYLES = {
  short: { t: 0.004, vol: 0.003 },
  sidepart: { t: 0.005, vol: 0.004, part: 0.035 },
  modern: { t: 0.006, vol: 0.005, part: 0.03 },
  crop: { t: 0.0022, vol: 0.0012 },
  roman: { t: 0.004, vol: 0.003, fringe: 0.045 },
  carved: { t: 0.004, vol: 0.003 },
  painted: { t: 0.004, vol: 0.003 },
  curly: { t: 0.01, vol: 0.008, curl: 1 },
  messy: { t: 0.008, vol: 0.007, long: 0.08, curl: 0.5, fringe: 0.05 },
  tonsure: { t: 0.0035, vol: 0.002, crown: 0.065 },
  fringe: { t: 0.0035, vol: 0.002, crown: 0.09, line: 0.6 },
  bob: { t: 0.007, vol: 0.005, part: 0.02, long: 0.13, fringe: 0.06 },
  rolls: { t: 0.007, vol: 0.006, part: 0.03, long: 0.11, rolls: true },
  long: { t: 0.006, vol: 0.005, part: 0, long: 0.32 },
  gaulish: { t: 0.008, vol: 0.007, long: 0.2, curl: 0.4 },
  gothic: { t: 0.006, vol: 0.005, part: 0, long: 0.28, fringe: 0.05 },
  ponytail: { t: 0.005, vol: 0.003, gather: 'nape', tail: 0.26 },
  bun: { t: 0.005, vol: 0.003, part: 0, gather: 'bun' },
  topbun: { t: 0.005, vol: 0.003, gather: 'top' },
  braids: { t: 0.005, vol: 0.003, part: 0, braids: 0.34 },
  wig: { t: 0.025, vol: 0.02, part: 0, long: 0.36, curl: 1.3 },
};

// Le cuir chevelu : sommets de la tête au-dessus de la ligne des cheveux
function scalpTest(v, st, F) {
  const { ec, iod, top } = F;
  return (i) => {
    if (v.part[i] !== PART.head) return false;
    const x = (v.pos[i * 3] - ec.x) / iod, y = (v.pos[i * 3 + 1] - ec.y) / iod, z = (v.pos[i * 3 + 2] - ec.z) / iod;
    const ax = Math.abs(x);
    let line = 0.72 + (st.line ?? 0) + 0.2 * Math.min(1, Math.max(0, (ax - 0.4) / 0.5)) - 0.62 * Math.min(1, Math.max(0, (0.6 - z) / 2.0));
    if (ax > 1.02 && z > -1.0) line = Math.max(line, 0.42);      // oreilles dégagées
    if (y < line) return false;
    if (st.crown) {
      const dy = top - v.pos[i * 3 + 1], dz = v.pos[i * 3 + 2] - (ec.z - 0.07);
      if (Math.hypot(dy * 1.4, dz) < st.crown && !(st.line && z > -0.2)) return false;
      if (st.line && y > 1.1 && z > -1.2) return false;   // calvitie du dessus et du front
    }
    return true;
  };
}

// Calotte : coque du cuir chevelu, mèches rayonnant depuis l'épi (ou la raie)
function capGeometry(v, st, F, off, smooth, uShift, out) {
  const scalp = scalpTest(v, st, F);
  const { pos, tris } = regionShell(v, scalp, { off, smooth });
  const crown = new THREE.Vector3(st.part ?? 0, F.top - 0.012, F.ec.z - (st.part !== undefined ? 0.02 : 0.075));
  const used = new Map();
  const list = [];
  for (const i of tris) if (!used.has(i)) { used.set(i, list.length); list.push(i); }
  // angle autour de l'épi et distance : v = 1 à l'épi, 0 à la lisière
  const ang = new Float32Array(list.length), dist = new Float32Array(list.length);
  const BINS = 48, maxD = new Float32Array(BINS);
  list.forEach((i, k) => {
    const dx = pos[i * 3] - crown.x, dy = pos[i * 3 + 1] - crown.y, dz = pos[i * 3 + 2] - crown.z;
    ang[k] = Math.atan2(dx, dz);
    dist[k] = Math.hypot(dx, dy, dz);
    const b = Math.floor((ang[k] / (Math.PI * 2) + 0.5) * BINS) % BINS;
    maxD[b] = Math.max(maxD[b], dist[k]);
  });
  // lissage des distances maximales entre secteurs voisins
  const md = Float32Array.from(maxD, (_, b) => Math.max(maxD[b], (maxD[(b + 1) % BINS] + maxD[(b + BINS - 1) % BINS]) / 2));
  const base = out.P.length / 3;
  list.forEach((i, k) => {
    out.P.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    out.N.push(v.nrm[i * 3], v.nrm[i * 3 + 1], v.nrm[i * 3 + 2]);
    const b = Math.floor((ang[k] / (Math.PI * 2) + 0.5) * BINS) % BINS;
    const vv = 1 - Math.min(1, dist[k] / (md[b] || 1)) * 0.92;
    out.UV.push((ang[k] / (Math.PI * 2) + 0.5) * 14 + uShift, vv);
  });
  for (let k = 0; k < tris.length; k += 3) out.I.push(base + used.get(tris[k]), base + used.get(tris[k + 1]), base + used.get(tris[k + 2]));
  return { scalp, pos, list, crown };
}

// Nombre d'arêtes jusqu'au bord de la zone (0 sur le bord)
function edgeHops(tris) {
  const cnt = new Map(), nb = new Map();
  const ek = (a, b) => (a < b ? a * 65536 + b : b * 65536 + a);
  for (let k = 0; k < tris.length; k += 3) {
    for (let e = 0; e < 3; e++) {
      const a = tris[k + e], b = tris[k + (e + 1) % 3];
      cnt.set(ek(a, b), (cnt.get(ek(a, b)) ?? 0) + 1);
      if (!nb.has(a)) nb.set(a, new Set());
      if (!nb.has(b)) nb.set(b, new Set());
      nb.get(a).add(b); nb.get(b).add(a);
    }
  }
  const hop = new Map();
  let front = [];
  for (const [k, c] of cnt) {
    if (c !== 1) continue;
    const a = Math.floor(k / 65536), b = k % 65536;
    for (const x of [a, b]) if (!hop.has(x)) { hop.set(x, 0); front.push(x); }
  }
  let d = 0;
  while (front.length) {
    d++;
    const next = [];
    for (const x of front) for (const y of nb.get(x)) if (!hop.has(y)) { hop.set(y, d); next.push(y); }
    front = next;
  }
  for (const x of nb.keys()) if (!hop.has(x)) hop.set(x, d);
  return hop;
}

function rng(seed) {
  let s = seed;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

// Un ruban qui part de la racine et suit la surface
function growCard(out, root, opt, surf, R) {
  const { len, vol, width, segs, flow, gravity, curl, gatherTo } = opt;
  const p = root.p.clone();
  let dir = flow.clone().normalize();
  const pts = [p.clone()], nrms = [root.n.clone()];
  const seg = len / segs;
  for (let s = 1; s <= segs; s++) {
    const t = s / segs;
    if (gatherTo) dir.lerp(gatherTo.clone().sub(p).normalize(), 0.4).normalize();
    else dir.addScaledVector(new THREE.Vector3(0, -1, 0), gravity * t).normalize();
    if (curl) {
      const a = s * 1.9 + R() * 6;
      dir.add(new THREE.Vector3(Math.sin(a), Math.cos(a * 1.3) * 0.4, Math.cos(a)).multiplyScalar(0.3 * curl)).normalize();
    }
    p.addScaledVector(dir, seg);
    const nb = surf.near(p);
    let n = nrms[nrms.length - 1];
    if (nb) {
      n = nb.n;
      const want = vol * (0.6 + 0.4 * t) + (opt.layer ?? 0);
      if (nb.d < want) p.addScaledVector(nb.n, want - nb.d);
      dir.addScaledVector(nb.n, -Math.min(0, dir.dot(nb.n))).normalize();
    }
    pts.push(p.clone());
    nrms.push(n.clone());
  }
  const base = out.P.length / 3;
  for (let s = 0; s <= segs; s++) {
    const a = pts[Math.max(0, s - 1)], b = pts[Math.min(segs, s + 1)];
    const tg = b.clone().sub(a).normalize();
    const side = tg.clone().cross(nrms[s]).normalize();
    const w = width * (1 - 0.35 * (s / segs));
    for (const k of [-0.5, 0.5]) {
      const q = pts[s].clone().addScaledVector(side, k * w);
      out.P.push(q.x, q.y, q.z);
      out.N.push(nrms[s].x, nrms[s].y, nrms[s].z);
      out.UV.push(opt.u0 + k * 0.25, 1 - s / segs);
    }
  }
  for (let s = 0; s < segs; s++) {
    const i = base + s * 2;
    out.I.push(i, i + 2, i + 1, i + 1, i + 2, i + 3);
  }
}

// Tube de mèches (queue de cheval, natte, chignon)
function tube(out, pts, r0, r1) {
  const curve = new THREE.CatmullRomCurve3(pts);
  for (let k = 0; k < 12; k++) {
    const ang = (k / 12) * Math.PI * 2;
    const segs = 10;
    const base = out.P.length / 3;
    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const c = curve.getPoint(t), tg = curve.getTangent(t);
      const ref = Math.abs(tg.x) < 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
      const side = ref.cross(tg).normalize();
      const up = tg.clone().cross(side).normalize();
      const rr = r0 + (r1 - r0) * t;
      const dirv = side.clone().multiplyScalar(Math.cos(ang)).addScaledVector(up, Math.sin(ang));
      const tn = tg.clone().cross(dirv).normalize();
      for (const kk of [-0.5, 0.5]) {
        const q = c.clone().addScaledVector(dirv, rr).addScaledVector(tn, kk * rr * 0.9);
        out.P.push(q.x, q.y, q.z);
        out.N.push(dirv.x, dirv.y, dirv.z);
        out.UV.push(k * 0.37 + kk * 0.3, 1 - t * 0.8);
      }
    }
    for (let s = 0; s < segs; s++) { const i = base + s * 2; out.I.push(i, i + 2, i + 1, i + 1, i + 2, i + 3); }
  }
}

function toGeometry(out, origin) {
  const g = new THREE.BufferGeometry();
  const P = new Float32Array(out.P);
  for (let i = 0; i < P.length; i += 3) { P[i] -= origin.x; P[i + 1] -= origin.y; P[i + 2] -= origin.z; }
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(out.N, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(out.UV, 2));
  g.setIndex(out.I);
  g.computeBoundingSphere();
  return g;
}
const newOut = () => ({ P: [], N: [], UV: [], I: [] });

// Chevelure attachée à la tête (repère du groupe « head » du squelette)
export function buildHairCards(v, style, color, sex, { hat = false } = {}) {
  if (!style || style === 'none' || style === 'bald') return null;
  const st = STYLES[style] ?? STYLES.short;
  const key = `${v.key}|hair|${style}|${hat ? 1 : 0}`;
  let geos = geoCache.get(key);
  if (!geos) {
    const F = faceFrame(v);
    const R = rng(1 + style.length * 977 + (sex === 'f' ? 13 : 0));
    const head = new THREE.Vector3(...v.J.head);
    const volK = hat ? 0.4 : 1;
    // calottes : couche dense, puis couche légère qui donne le volume
    const dense = newOut(), loose = newOut();
    const cap = capGeometry(v, st, F, 0.0012 + st.t * 0.45 * volK, 3, 0, dense);
    capGeometry(v, st, F, 0.0015 + st.t * volK, 6, 0.37, loose);
    // mèches libres
    const surf = surfaceIndex(v, [PART.head, PART.neck, PART.trunk]);
    const { ec, top } = F;
    const nape = new THREE.Vector3(0, ec.y - 0.07, ec.z - 0.15);
    const bunP = new THREE.Vector3(0, ec.y + 0.015, ec.z - 0.17);
    const topP = new THREE.Vector3(0, top + 0.035, ec.z - 0.05);
    const lists = { edgeBack: [], front: [], all: [] };
    for (const i of cap.list) {
      const z = v.pos[i * 3 + 2], y = v.pos[i * 3 + 1];
      lists.all.push(i);
      if (z > ec.z - 0.035 && y > ec.y + 0.03) lists.front.push(i);
      if (z < ec.z - 0.02 || y < ec.y + 0.03) lists.edgeBack.push(i);
    }
    const rootOf = (i, lift) => ({
      p: new THREE.Vector3(cap.pos[i * 3], cap.pos[i * 3 + 1], cap.pos[i * 3 + 2]).addScaledVector(new THREE.Vector3(v.nrm[i * 3], v.nrm[i * 3 + 1], v.nrm[i * 3 + 2]), lift),
      n: new THREE.Vector3(v.nrm[i * 3], v.nrm[i * 3 + 1], v.nrm[i * 3 + 2]),
    });
    const pick = (l) => l[Math.floor(R() * l.length)];
    const away = (p) => p.clone().sub(cap.crown).setY(0).normalize();
    if (st.long && !(hat && st.long < 0.15)) {
      // cheveux longs : mèches qui partent de l'arrière et des côtés du crâne
      const n = st.long > 0.2 ? 260 : 180;
      for (let k = 0; k < n; k++) {
        const i = pick(lists.edgeBack.length > 20 ? lists.edgeBack : lists.all);
        const r = rootOf(i, st.t * volK * 0.8);
        const flow = away(r.p).multiplyScalar(0.5).add(new THREE.Vector3(0, -1, 0));
        growCard(loose, r, {
          len: st.long * (0.7 + R() * 0.45), vol: st.t * volK + 0.004, width: 0.03, segs: st.long > 0.2 ? 10 : 6,
          flow, gravity: 0.6, curl: st.curl ?? 0, u0: R() * 8, layer: (k % 3) * 0.0015,
        }, surf, R);
      }
    }
    if (st.fringe && !hat) {
      for (let k = 0; k < 70 && lists.front.length; k++) {
        const r = rootOf(pick(lists.front), st.t * 0.8);
        const flow = new THREE.Vector3((r.p.x - (st.part ?? 0)) * 3, -0.8, 1.2);
        growCard(loose, r, { len: st.fringe * (0.7 + R() * 0.5), vol: st.t + 0.002, width: 0.022, segs: 4, flow, gravity: 0.6, curl: (st.curl ?? 0) * 0.5, u0: R() * 8 }, surf, R);
      }
    }
    if (st.curl && !st.long) {
      // boucles : petites mèches enroulées sur toute la calotte
      for (let k = 0; k < 160; k++) {
        const r = rootOf(pick(lists.all), st.t * 0.6);
        growCard(loose, r, { len: 0.035, vol: st.t, width: 0.018, segs: 4, flow: away(r.p).add(new THREE.Vector3(0, -0.5, 0)), gravity: 0.2, curl: 1.4, u0: R() * 8 }, surf, R);
      }
    }
    // ramassés : queue, chignon, nattes, rouleaux (mèches tirées depuis la calotte)
    const gatherP = st.gather === 'nape' ? nape : st.gather === 'bun' ? bunP : st.gather === 'top' ? topP : null;
    if (gatherP) {
      for (let k = 0; k < 45; k++) {
        const r = rootOf(pick(lists.edgeBack.length ? lists.edgeBack : lists.all), st.t * 0.7);
        growCard(loose, r, { len: r.p.distanceTo(gatherP) * 1.02, vol: st.t * 0.8 + 0.001, width: 0.013, segs: 6, flow: gatherP.clone().sub(r.p), gravity: 0, gatherTo: gatherP, u0: R() * 8 }, surf, R);
      }
      if (st.gather === 'nape') tube(loose, [nape, nape.clone().add(new THREE.Vector3(0, -0.08, -0.035)), nape.clone().add(new THREE.Vector3(0, -st.tail, -0.03))], 0.017, 0.007);
      else {
        for (let k = 0; k < 4; k++) {
          const pts = [];
          for (let a = 0; a <= 14; a++) {
            const an = a / 14 * Math.PI * 2 + k * 1.6;
            const rr = 0.03 - a * 0.0011;
            pts.push(gatherP.clone().add(new THREE.Vector3(Math.cos(an) * rr, Math.sin(an) * rr * 0.85, -0.01 + k * 0.005)));
          }
          tube(loose, pts, 0.012, 0.008);
        }
      }
    }
    if (st.braids) {
      for (const sx of [-1, 1]) {
        const a = new THREE.Vector3(sx * 0.068, ec.y - 0.05, ec.z - 0.075);
        tube(loose, [a, a.clone().add(new THREE.Vector3(sx * 0.015, -st.braids * 0.5, 0.035)), a.clone().add(new THREE.Vector3(sx * 0.008, -st.braids, 0.06))], 0.016, 0.009);
      }
    }
    if (st.rolls) {
      for (const sx of [-1, 1]) {
        const c0 = new THREE.Vector3(sx * 0.042, top - 0.01, ec.z + 0.015);
        const pts = [];
        for (let a = 0; a <= 14; a++) { const an = a / 14 * Math.PI * 2; pts.push(c0.clone().add(new THREE.Vector3(0, Math.sin(an) * 0.022, Math.cos(an) * 0.024))); }
        tube(loose, pts, 0.014, 0.014);
      }
    }
    geos = { dense: toGeometry(dense, head), loose: toGeometry(loose, head) };
    geoCache.set(key, geos);
  }
  const g = new THREE.Group();
  const a = new THREE.Mesh(geos.dense, hairMaterial(color, 'dense'));
  const b = new THREE.Mesh(geos.loose, hairMaterial(color, 'loose'));
  // pas d'ombres reçues : les mèches, à quelques millimètres du crâne, s'y ombreraient en noir
  for (const m of [a, b]) { m.castShadow = true; m.receiveShadow = false; g.add(m); }
  return g;
}

// ----------------------------------------------------------------------
//  Barbe et moustache (repère « head »)
// ----------------------------------------------------------------------
const BEARDS = {
  full: { t: 0.006, area: 'full', len: 0.05, stache: 0.018 },
  short: { t: 0.0035, area: 'full', len: 0, stache: 0.012 },
  goatee: { t: 0.005, area: 'chin', len: 0.025, stache: 0.014 },
  mustache: { t: 0.003, area: null, len: 0, stache: 0.016 },
  gaulish: { t: 0.003, area: null, len: 0, stache: 0.06, droop: true },
};
export function buildBeardCards(v, style, color) {
  const st = BEARDS[style];
  if (!st) return null;
  const key = `${v.key}|beard|${style}`;
  let geos = geoCache.get(key);
  if (!geos) {
    const F = faceFrame(v);
    const { ec, iod } = F;
    const R = rng(7 + style.length * 131);
    const rel = (i) => ({ x: (v.pos[i * 3] - ec.x) / iod, y: (v.pos[i * 3 + 1] - ec.y) / iod, z: (v.pos[i * 3 + 2] - ec.z) / iod });
    const isFace = (i) => v.part[i] === PART.head || v.part[i] === PART.neck;
    // lèvre supérieure : de la base du nez à la commissure, un peu plus large que la bouche
    const lip = (i) => { const p = rel(i); return p.y < -0.7 + Math.abs(p.x) * 0.25 && p.y > -1.04 + Math.abs(p.x) * 0.3 && Math.abs(p.x) < 0.6 && p.z > 0.45; };
    const mouth = (i) => { const p = rel(i); return p.y > -1.05 && p.y < -0.55 && Math.abs(p.x) < 0.45 && p.z > 0.6; };
    const bline = (ax) => -0.56 - 0.32 * Math.min(1, Math.max(0, (ax - 0.3) / 0.65));
    const full = (i) => { const p = rel(i); return isFace(i) && p.z > -0.9 && p.y < bline(Math.abs(p.x)) && p.y > -2.0 && Math.abs(p.x) < 1.2 && !mouth(i); };
    const chin = (i) => { const p = rel(i); return isFace(i) && p.y < -1.02 && p.y > -1.62 && Math.abs(p.x) < 0.38 && p.z > 0.2; };
    const dense = newOut(), loose = newOut();
    // coque : poils (texture légère, la barbe peinte sur la peau fait le fond),
    // effilés vers tous les bords de la zone
    const shell = (test, off, hops = 4) => {
      const { pos, tris } = regionShell(v, test, { off, smooth: 4 });
      const hop = edgeHops(tris);
      const used = new Map();
      const tgt = loose;
      const base = tgt.P.length / 3;
      for (const i of tris) {
        if (!used.has(i)) {
          used.set(i, used.size);
          tgt.P.push(pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
          tgt.N.push(v.nrm[i * 3], v.nrm[i * 3 + 1], v.nrm[i * 3 + 2]);
          tgt.UV.push(pos[i * 3] * 40 + pos[i * 3 + 2] * 13, 0.12 + 0.88 * Math.min(1, hop.get(i) / hops));
        }
        tgt.I.push(base + used.get(i));
      }
      return { pos, tris };
    };
    const surf = surfaceIndex(v, [PART.head, PART.neck, PART.trunk]);
    if (st.area) {
      const sh = shell(st.area === 'full' ? full : chin, st.t);
      if (st.len) {
        // longueur sous le menton
        const list = [...new Set(sh.tris)].filter((i) => rel(i).y < (st.area === 'full' ? -1.2 : -1.25));
        for (let k = 0; k < (st.area === 'full' ? 160 : 50) && list.length; k++) {
          const i = list[Math.floor(R() * list.length)];
          const n = new THREE.Vector3(v.nrm[i * 3], v.nrm[i * 3 + 1], v.nrm[i * 3 + 2]);
          const p = new THREE.Vector3(sh.pos[i * 3], sh.pos[i * 3 + 1], sh.pos[i * 3 + 2]);
          growCard(loose, { p, n }, { len: st.len * (0.6 + R() * 0.6), vol: st.t + 0.002, width: 0.016, segs: 4, flow: new THREE.Vector3(0, -1, 0.35), gravity: 0.4, curl: 0.15, u0: R() * 8 }, surf, R);
        }
      }
    }
    // moustache : coque sur la lèvre supérieure et mèches tombantes
    shell(lip, st.t * 0.8 + 0.0025, 3);
    const lipList = [];
    for (let i = 0; i < v.part.length; i++) if (isFace(i) && lip(i)) lipList.push(i);
    for (let k = 0; k < (st.droop ? 60 : 0) && lipList.length; k++) {
      const i = lipList[Math.floor(R() * lipList.length)];
      const n = new THREE.Vector3(v.nrm[i * 3], v.nrm[i * 3 + 1], v.nrm[i * 3 + 2]);
      const p = new THREE.Vector3(v.pos[i * 3], v.pos[i * 3 + 1], v.pos[i * 3 + 2]).addScaledVector(n, st.t);
      const sx = Math.sign(v.pos[i * 3] - ec.x) || 1;
      growCard(loose, { p, n }, { len: st.stache * (0.7 + R() * 0.5), vol: 0.002, width: 0.008, segs: 3, flow: new THREE.Vector3(sx * 0.9, -0.7, 0.2), gravity: st.droop ? 0.9 : 0.35, curl: 0.05, u0: R() * 8 }, surf, R);
    }
    const head = new THREE.Vector3(...v.J.head);
    geos = { dense: toGeometry(dense, head), loose: toGeometry(loose, head) };
    geoCache.set(key, geos);
  }
  const g = new THREE.Group();
  const a = new THREE.Mesh(geos.dense, hairMaterial(color, 'dense'));
  const b = new THREE.Mesh(geos.loose, hairMaterial(color, 'loose'));
  for (const m of [a, b]) { m.castShadow = true; g.add(m); }
  return g;
}

// ----------------------------------------------------------------------
//  Cils : bandes du maillage MakeHuman, texturées en poils fins
// ----------------------------------------------------------------------
export function lashUVs(geo, v) {
  const p = geo.attributes.position;
  const eyes = [new THREE.Vector3(...v.J.eyeL), new THREE.Vector3(...v.J.eyeR)];
  const n = p.count;
  const d = new Float32Array(n), grp = new Int8Array(n), ang = new Float32Array(n);
  const q = new THREE.Vector3();
  const lo = new Float32Array(4).fill(1), hi = new Float32Array(4).fill(0);
  for (let i = 0; i < n; i++) {
    q.fromBufferAttribute(p, i);
    const e = q.x > 0 ? 0 : 1;
    const rel = q.clone().sub(eyes[e]);
    const g = e * 2 + (rel.y > 0 ? 0 : 1);
    grp[i] = g;
    d[i] = rel.length();
    ang[i] = Math.atan2(rel.x, rel.y);
    lo[g] = Math.min(lo[g], d[i]); hi[g] = Math.max(hi[g], d[i]);
  }
  const uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const g = grp[i];
    uv[i * 2] = ang[i] * 3;
    uv[i * 2 + 1] = 1 - (d[i] - lo[g]) / ((hi[g] - lo[g]) || 1);
  }
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return geo;
}

export function lashMaterial2() {
  if (matCache.has('lash')) return matCache.get('lash');
  const m = new THREE.MeshStandardMaterial({ color: 0x2a1d14, map: strandTexture('lash'), alphaTest: 0.3, side: THREE.DoubleSide, roughness: 0.7 });
  matCache.set('lash', m);
  return m;
}
