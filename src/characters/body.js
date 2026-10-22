// Corps continu des personnages : une seule peau, sans coutures aux épaules,
// au cou, aux coudes ni aux genoux, déformée par le squelette (SkinnedMesh).
//
// La silhouette est décrite par des volumes implicites (champ de distance
// signée : tronc tourné d'après les profils du buste et du bassin, cou,
// trapèzes, deltoïdes, biceps, avant-bras, mains, cuisses, mollets) fondus les
// uns dans les autres, puis polygonisée par « surface nets » dans une pose de
// référence bras écartés (pose A). Les vêtements ajustés (chemise et manches,
// pantalon, culotte, bas, bandes molletières, gants) sont la même surface
// gonflée de quelques millimètres et découpée : ils épousent donc le corps et
// plient avec lui.

import * as THREE from 'three';

// Ordre des os (index de peau)
export const BONES = ['hips', 'spine', 'chest', 'neck', 'head', 'armL', 'elbowL', 'handL', 'armR', 'elbowR', 'handR', 'legL', 'kneeL', 'ankleL', 'legR', 'kneeR', 'ankleR'];
const B = Object.fromEntries(BONES.map((b, i) => [b, i]));
export const A_POSE = 0.62;            // écart des bras dans la pose de référence (rad)

// ---------- outils SDF ----------
const smin = (a, b, k) => {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
};
const clamp = (x, a, b) => (x < a ? a : x > b ? b : x);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };

// cône arrondi entre a et b (rayons ra, rb) ; renvoie aussi t ∈ [0,1]
function cone(px, py, pz, a, b, ra, rb) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const L2 = bx * bx + by * by + bz * bz;
  const t = clamp(((px - a[0]) * bx + (py - a[1]) * by + (pz - a[2]) * bz) / L2, 0, 1);
  const dx = px - a[0] - bx * t, dy = py - a[1] - by * t, dz = pz - a[2] - bz * t;
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (ra + (rb - ra) * t);
}
function ellipsoid(px, py, pz, c, r) {
  const x = (px - c[0]) / r[0], y = (py - c[1]) / r[1], z = (pz - c[2]) / r[2];
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const k1 = Math.sqrt((x / r[0]) ** 2 + (y / r[1]) ** 2 + (z / r[2]) ** 2);
  return k1 > 0 ? (k0 * (k0 - 1)) / k1 : -Math.min(r[0], r[1], r[2]);
}
function profR(prof, y) {
  if (y <= prof[0].y) return prof[0].x;
  for (let i = 1; i < prof.length; i++) {
    if (y <= prof[i].y) {
      const a = prof[i - 1], b = prof[i];
      return a.x + (b.x - a.x) * ((y - a.y) / (b.y - a.y));
    }
  }
  return prof[prof.length - 1].x;
}
// solide de révolution à section elliptique (profil r(y), échelles sx, sz)
function lathe(px, py, pz, prof, oy, sx, sz) {
  const y = py - oy;
  const y0 = prof[0].y, y1 = prof[prof.length - 1].y;
  const r = profR(prof, clamp(y, y0, y1));
  const q = Math.sqrt((px / sx) ** 2 + (pz / sz) ** 2);
  const dr = (q - r) * Math.min(sx, sz);
  const dv = Math.max(y0 - y, y - y1);
  if (dv <= 0) return dr;
  return dr < 0 ? dv : Math.hypot(dr, dv);
}

// ======================================================================
//  MORPHOLOGIE (pose A)
// ======================================================================
// m : { sex, build, P (profil buste), PV (profil bassin), tScale, pScale, limbK, legK, shoulderX, hipX }
export function makeMorph(m) {
  const A = A_POSE;
  const arm = (s) => {
    const S = [s * m.shoulderX, 1.41, -0.005];
    const dir = [s * Math.sin(A), -Math.cos(A), 0];
    const E = [S[0] + dir[0] * 0.275, S[1] + dir[1] * 0.275, S[2]];
    const H = [E[0] + dir[0] * 0.245, E[1] + dir[1] * 0.245, E[2]];
    return { S, E, H, dir, s };
  };
  const leg = (s) => ({ L: [s * m.hipX, 0.91, 0], K: [s * m.hipX, 0.48, 0], A: [s * m.hipX, 0.065, 0], s });
  return { ...m, armL: arm(1), armR: arm(-1), legL: leg(1), legR: leg(-1) };
}

// Composantes (distance signée de chaque partie)
function trunk(M, x, y, z) {
  const t = lathe(x, y, z, M.P, 1.05, M.tScale.x, M.tScale.z);
  const p = lathe(x, y, z, M.PV, 0.95, M.pScale.x, M.pScale.z);
  let d = smin(t, p, 0.05);
  // trapèzes : pente du cou vers les épaules
  for (const s of [-1, 1]) d = smin(d, ellipsoid(x, y, z, [s * 0.1, 1.452, -0.016], [0.095, 0.046, 0.055]), 0.035);
  return d;
}
function neckD(M, x, y, z) {
  const r = M.sex === 'f' ? 0.048 : 0.057;
  return cone(x, y, z, [0, 1.42, -0.006], [0, 1.585, 0.012], r * 1.1, r);
}
function armD(M, a, x, y, z) {
  const k = M.limbK;
  let d = cone(x, y, z, a.S, a.E, 0.043 * k, 0.036 * k);
  // deltoïde
  d = smin(d, ellipsoid(x, y, z, [a.S[0] + a.dir[0] * 0.035 - a.s * 0.004, a.S[1] + a.dir[1] * 0.035, a.S[2]], [0.047 * k, 0.062, 0.05 * k]), 0.025);
  // biceps (avant du bras)
  const bc = [a.S[0] + a.dir[0] * 0.15, a.S[1] + a.dir[1] * 0.15, a.S[2] + 0.012];
  d = smin(d, ellipsoid(x, y, z, bc, [0.037 * k, 0.08, 0.039 * k]), 0.025);
  // avant-bras : charnu près du coude, fin au poignet
  const f = cone(x, y, z, a.E, a.H, 0.036 * k, 0.025 * k);
  const fc = [a.E[0] + a.dir[0] * 0.07, a.E[1] + a.dir[1] * 0.07, a.E[2]];
  return smin(smin(d, f, 0.02), ellipsoid(x, y, z, fc, [0.037 * k, 0.07, 0.034 * k]), 0.025);
}
function handD(M, a, x, y, z) {
  const k = M.limbK;
  // repère de la main : axe = bras ; épaisseur vers le corps ; largeur vers l'avant
  const ax = a.dir, nx = [-a.s * Math.cos(A_POSE), -Math.sin(A_POSE), 0];
  const lx = x - a.H[0], ly = y - a.H[1], lz = z - a.H[2];
  const u = lx * ax[0] + ly * ax[1];                 // le long de l'axe
  const th = lx * nx[0] + ly * nx[1];                // épaisseur
  const w = lz;                                      // largeur
  // paume + doigts joints (moufle arrondie), légèrement recourbée
  const cu = clamp(u, 0.0, 0.15);
  const curl = cu > 0.1 ? (cu - 0.1) * 0.5 : 0;
  const hw = 0.041 * k * (1 - Math.max(0, cu - 0.09) * 2.2), ht = 0.016 * k;
  const du = Math.max(-u, u - 0.165, 0), dw = Math.max(Math.abs(w) - hw, 0), dt = Math.max(Math.abs(th - curl) - ht, 0);
  let d = Math.sqrt(du * du + dw * dw + dt * dt) - 0.008;
  // pouce
  const tA = [a.H[0] + ax[0] * 0.025 + nx[0] * 0.012, a.H[1] + ax[1] * 0.025 + nx[1] * 0.012, a.H[2] + 0.03 * k];
  const tB = [a.H[0] + ax[0] * 0.085 + nx[0] * 0.022, a.H[1] + ax[1] * 0.085 + nx[1] * 0.022, a.H[2] + 0.05 * k];
  d = smin(d, cone(x, y, z, tA, tB, 0.013 * k, 0.01 * k), 0.015);
  return d;
}
function legD(M, l, x, y, z) {
  const k = M.legK;
  let d = cone(x, y, z, l.L, l.K, 0.078 * k, 0.05 * k);
  d = smin(d, ellipsoid(x, y, z, [l.L[0] + l.s * 0.006, 0.76, 0.014], [0.07 * k, 0.15, 0.066 * k]), 0.04);     // quadriceps
  const s = cone(x, y, z, l.K, l.A, 0.05 * k, 0.034 * k);
  d = smin(d, s, 0.03);
  d = smin(d, ellipsoid(x, y, z, [l.K[0], 0.37, -0.02], [0.05 * k, 0.1, 0.05 * k]), 0.035);                     // mollet
  return d;
}

function components(M, x, y, z) {
  return {
    trunk: trunk(M, x, y, z), neck: neckD(M, x, y, z),
    armL: armD(M, M.armL, x, y, z), armR: armD(M, M.armR, x, y, z),
    handL: handD(M, M.armL, x, y, z), handR: handD(M, M.armR, x, y, z),
    legL: legD(M, M.legL, x, y, z), legR: legD(M, M.legR, x, y, z),
  };
}

// ---------- coupes des vêtements ajustés ----------
// distance (positive hors de la zone gardée) le long d'un membre : garde t ≤ tCut
function cutAlong(a, b, tCut, x, y, z) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const L = Math.sqrt(bx * bx + by * by + bz * bz);
  const t = ((x - a[0]) * bx + (y - a[1]) * by + (z - a[2]) * bz) / L;
  return t - tCut * L;
}
function armCut(M, a, len, x, y, z) {
  // len : fraction du bras couverte (0..1 sur l'ensemble bras + avant-bras)
  const d = armD(M, a, x, y, z);
  if (len >= 1) return Math.max(d, cutAlong(a.E, a.H, 0.97, x, y, z));
  if (len > 0.53) return Math.max(d, cutAlong(a.E, a.H, (len - 0.53) / 0.47, x, y, z));
  return Math.max(d, cutAlong(a.S, a.E, len / 0.53, x, y, z));
}
function legCut(M, l, from, to, x, y, z) {
  // garde la jambe entre les hauteurs from (haut) et to (bas)
  return Math.max(legD(M, l, x, y, z), y - from, to - y);
}

// Champ d'un calque de vêtement
export function garmentField(M, g) {
  const off = g.off ?? 0.006;
  return (x, y, z) => {
    let d = 1;
    if (g.trunk) d = Math.min(d, Math.max(trunk(M, x, y, z), g.trunk[0] - y, y - g.trunk[1]));
    if (g.arms) for (const a of [M.armL, M.armR]) d = smin(d, armCut(M, a, g.arms, x, y, z), 0.028);
    if (g.legs) for (const l of [M.legL, M.legR]) d = smin(d, legCut(M, l, g.legs[0], g.legs[1], x, y, z), 0.03);
    if (g.hands) for (const a of [M.armL, M.armR]) d = Math.min(d, handD(M, a, x, y, z));
    return d - off;
  };
}

export function bodyField(M) {
  return (x, y, z) => {
    const c = components(M, x, y, z);
    let d = smin(c.trunk, c.neck, 0.05);
    d = smin(d, c.armL, 0.028);
    d = smin(d, c.armR, 0.028);
    d = smin(d, c.handL, 0.02);
    d = smin(d, c.handR, 0.02);
    d = smin(d, Math.min(c.legL, c.legR), 0.04);
    return d;
  };
}

// ======================================================================
//  POLYGONISATION : surface nets
// ======================================================================
const BOUNDS = { x0: -0.7, x1: 0.7, y0: 0.03, y1: 1.64, z0: -0.2, z1: 0.24 };

function surfaceNets(f, b, step) {
  const nx = Math.ceil((b.x1 - b.x0) / step) + 1, ny = Math.ceil((b.y1 - b.y0) / step) + 1, nz = Math.ceil((b.z1 - b.z0) / step) + 1;
  const V = new Float32Array(nx * ny * nz);
  const idx = (i, j, k) => (k * ny + j) * nx + i;
  // passe grossière : loin de la surface, inutile de calculer finement
  const C = 4, cs = step * C;
  const cx = Math.ceil(nx / C) + 1, cy = Math.ceil(ny / C) + 1, cz = Math.ceil(nz / C) + 1;
  const VC = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++) for (let j = 0; j < cy; j++) for (let i = 0; i < cx; i++) {
    VC[(k * cy + j) * cx + i] = f(b.x0 + i * cs, b.y0 + j * cs, b.z0 + k * cs);
  }
  const far = cs * 1.3;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const vc = VC[(Math.round(k / C) * cy + Math.round(j / C)) * cx + Math.round(i / C)];
    V[idx(i, j, k)] = Math.abs(vc) > far ? vc : f(b.x0 + i * step, b.y0 + j * step, b.z0 + k * step);
  }
  const cellV = new Int32Array(nx * ny * nz).fill(-1);
  const pos = [];
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cv = new Float32Array(8);
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    for (let c = 0; c < 8; c++) {
      const [di, dj, dk] = corners[c];
      cv[c] = V[idx(i + di, j + dj, k + dk)];
      if (cv[c] < 0) mask |= 1 << c;
    }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, c] of edges) {
      const va = cv[a], vc = cv[c];
      if ((va < 0) === (vc < 0)) continue;
      const t = va / (va - vc);
      const A = corners[a], C = corners[c];
      sx += A[0] + (C[0] - A[0]) * t; sy += A[1] + (C[1] - A[1]) * t; sz += A[2] + (C[2] - A[2]) * t;
      n++;
    }
    cellV[idx(i, j, k)] = pos.length / 3;
    pos.push(b.x0 + (i + sx / n) * step, b.y0 + (j + sy / n) * step, b.z0 + (k + sz / n) * step);
  }
  const tri = [];
  const quad = (a, b2, c, d, flip) => {
    if (a < 0 || b2 < 0 || c < 0 || d < 0) return;
    if (flip) tri.push(a, b2, c, a, c, d); else tri.push(a, c, b2, a, d, c);
  };
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v0 = V[idx(i, j, k)] < 0;
    if (i < nx - 1 && j > 0 && k > 0 && v0 !== (V[idx(i + 1, j, k)] < 0)) {
      quad(cellV[idx(i, j - 1, k - 1)], cellV[idx(i, j, k - 1)], cellV[idx(i, j, k)], cellV[idx(i, j - 1, k)], v0);
    }
    if (j < ny - 1 && i > 0 && k > 0 && v0 !== (V[idx(i, j + 1, k)] < 0)) {
      quad(cellV[idx(i - 1, j, k - 1)], cellV[idx(i - 1, j, k)], cellV[idx(i, j, k)], cellV[idx(i, j, k - 1)], v0);
    }
    if (k < nz - 1 && i > 0 && j > 0 && v0 !== (V[idx(i, j, k + 1)] < 0)) {
      quad(cellV[idx(i - 1, j - 1, k)], cellV[idx(i, j - 1, k)], cellV[idx(i, j, k)], cellV[idx(i - 1, j, k)], v0);
    }
  }
  return { pos: new Float32Array(pos), index: tri };
}

// Projette les sommets sur la surface et calcule les normales par le gradient
function refine(f, pos) {
  const nor = new Float32Array(pos.length);
  const e = 0.002;
  for (let i = 0; i < pos.length; i += 3) {
    let x = pos[i], y = pos[i + 1], z = pos[i + 2];
    for (let it = 0; it < 2; it++) {
      const d = f(x, y, z);
      const gx = f(x + e, y, z) - f(x - e, y, z), gy = f(x, y + e, z) - f(x, y - e, z), gz = f(x, y, z + e) - f(x, y, z - e);
      const g2 = (gx * gx + gy * gy + gz * gz) / (4 * e * e) || 1;
      const k = d / g2 / (2 * e);
      x -= gx * k; y -= gy * k; z -= gz * k;
      if (it === 1) {
        const l = Math.hypot(gx, gy, gz) || 1;
        nor[i] = gx / l; nor[i + 1] = gy / l; nor[i + 2] = gz / l;
      }
    }
    pos[i] = x; pos[i + 1] = y; pos[i + 2] = z;
  }
  return nor;
}

// ======================================================================
//  PEAU : poids des os et coordonnées de texture
// ======================================================================
function along(a, b, x, y, z) {
  const bx = b[0] - a[0], by = b[1] - a[1], bz = b[2] - a[2];
  const L = Math.sqrt(bx * bx + by * by + bz * bz);
  return { t: ((x - a[0]) * bx + (y - a[1]) * by + (z - a[2]) * bz) / L, L };
}

function skinVertex(M, x, y, z) {
  const c = components(M, x, y, z);
  let best = 'trunk', bd = c.trunk;
  for (const k of ['neck', 'armL', 'armR', 'handL', 'handR', 'legL', 'legR']) if (c[k] < bd) { bd = c[k]; best = k; }
  const w = {};
  const add = (b, v) => { if (v > 0) w[b] = (w[b] ?? 0) + v; };
  let u = 0, v = 0;
  if (best === 'trunk') {
    const hs = sstep(0.95, 1.07, y), sc = sstep(1.19, 1.31, y);
    add('hips', 1 - hs); add('spine', hs * (1 - sc)); add('chest', sc);
    for (const a of [M.armL, M.armR]) {
      const ds = Math.hypot(x - a.S[0], y - a.S[1], z - a.S[2]);
      const k = (1 - sstep(0.03, 0.13, ds)) * 0.55;
      if (k > 0) { for (const b in w) w[b] *= 1 - k; add(a.s > 0 ? 'armL' : 'armR', k); }
    }
    for (const l of [M.legL, M.legR]) {
      if (Math.sign(x) !== l.s || Math.abs(x) < 0.02) continue;
      const k = (1 - sstep(0.84, 0.96, y)) * 0.55;
      if (k > 0) { for (const b in w) w[b] *= 1 - k; add(l.s > 0 ? 'legL' : 'legR', k); }
    }
    u = Math.atan2(x, z) / (Math.PI * 2) * 4.2; v = y / 0.22;
  } else if (best === 'neck') {
    const n = sstep(1.43, 1.53, y);
    add('chest', 1 - n); add('neck', n * (1 - sstep(1.57, 1.62, y) * 0.4)); add('head', n * sstep(1.57, 1.62, y) * 0.4);
    u = Math.atan2(x, z) / (Math.PI * 2) * 1.6; v = y / 0.22;
  } else if (best === 'armL' || best === 'armR' || best === 'handL' || best === 'handR') {
    const a = best.endsWith('L') ? M.armL : M.armR, sfx = best.endsWith('L') ? 'L' : 'R';
    const up = along(a.S, a.E, x, y, z);
    const dE = up.t - up.L;                       // > 0 après le coude
    const fo = along(a.E, a.H, x, y, z);
    const dH = fo.t - fo.L;                       // > 0 après le poignet
    const we = sstep(-0.035, 0.035, dE), wh = sstep(-0.01, 0.03, dH);
    const sh = (1 - sstep(0.0, 0.1, up.t)) * 0.45;
    add('chest', sh); add('arm' + sfx, (1 - we) * (1 - sh)); add('elbow' + sfx, we * (1 - wh) * (1 - sh)); add('hand' + sfx, wh * (1 - sh));
    const ang = Math.atan2(z - a.S[2], (x - a.S[0]) * Math.cos(A_POSE) * a.s + (y - a.S[1]) * Math.sin(A_POSE));
    u = ang / (Math.PI * 2) * 1.6; v = -(up.t) / 0.22;
  } else {
    const l = best === 'legL' ? M.legL : M.legR, sfx = best === 'legL' ? 'L' : 'R';
    const th = along(l.L, l.K, x, y, z);
    const dK = th.t - th.L;
    const sh = along(l.K, l.A, x, y, z);
    const dA = sh.t - sh.L;
    const wk = sstep(-0.035, 0.035, dK), wa = sstep(-0.03, 0.02, dA);
    const hp = (1 - sstep(0.0, 0.1, th.t)) * 0.45;
    add('hips', hp); add('leg' + sfx, (1 - wk) * (1 - hp)); add('knee' + sfx, wk * (1 - wa) * (1 - hp)); add('ankle' + sfx, wa * (1 - hp));
    u = Math.atan2(z, x - l.L[0]) / (Math.PI * 2) * 2.2; v = y / 0.22;
  }
  const list = Object.entries(w).sort((p, q) => q[1] - p[1]).slice(0, 4);
  const tot = list.reduce((s, e) => s + e[1], 0) || 1;
  return { list: list.map(([b, val]) => [B[b], val / tot]), u, v };
}

// Lissage : chaque sommet glisse vers la moyenne de ses voisins (répartit
// régulièrement les sommets avant la reprojection sur la surface)
function relax(pos, index, iters) {
  const n = pos.length / 3;
  const nb = Array.from({ length: n }, () => new Set());
  for (let i = 0; i < index.length; i += 3) {
    const a = index[i], b = index[i + 1], c = index[i + 2];
    nb[a].add(b); nb[a].add(c); nb[b].add(a); nb[b].add(c); nb[c].add(a); nb[c].add(b);
  }
  const tmp = new Float32Array(pos.length);
  for (let it = 0; it < iters; it++) {
    for (let v = 0; v < n; v++) {
      let x = 0, y = 0, z = 0, k = 0;
      for (const u of nb[v]) { x += pos[u * 3]; y += pos[u * 3 + 1]; z += pos[u * 3 + 2]; k++; }
      if (!k) { tmp.set(pos.subarray(v * 3, v * 3 + 3), v * 3); continue; }
      tmp[v * 3] = pos[v * 3] * 0.5 + (x / k) * 0.5;
      tmp[v * 3 + 1] = pos[v * 3 + 1] * 0.5 + (y / k) * 0.5;
      tmp[v * 3 + 2] = pos[v * 3 + 2] * 0.5 + (z / k) * 0.5;
    }
    pos.set(tmp);
  }
}

const cache = new Map();

// Géométrie skinnée (partagée) : key identifie la morphologie et le calque
export function skinnedGeometry(key, M, field, step = 0.018) {
  if (cache.has(key)) return cache.get(key);
  const { pos, index } = surfaceNets(field, BOUNDS, step);
  relax(pos, index, 2);
  refine(field, pos);
  const n = pos.length / 3;
  const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4), uv = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) {
    const r = skinVertex(M, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
    r.list.forEach(([b, val], k) => { si[i * 4 + k] = b; sw[i * 4 + k] = val; });
    uv[i * 2] = r.u; uv[i * 2 + 1] = r.v;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(si, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(sw, 4));
  g.setIndex(index);
  g.computeVertexNormals();
  g.computeBoundingSphere();
  g.boundingSphere.radius += 0.6;     // les membres bougent
  cache.set(key, g);
  return g;
}
