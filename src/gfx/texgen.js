// Matériaux procéduraux « physiques » : chaque générateur calcule, pixel par
// pixel et sans couture, une couleur, une hauteur et une rugosité. La hauteur
// donne la carte de normales (relief réel des joints, des arêtes, du grain) et
// assombrit les creux ; la rugosité distingue mortier mat et pierre polie.
//
//  - moellons : pierres irrégulières (cellules de Voronoï étirées), joints de
//    mortier en creux, lichens et mousses ;
//  - pierre de taille : assises régulières, blocs chanfreinés, traces d'outil ;
//  - pavés : rangées de pavés bombés de largeurs variées, terre et herbe dans
//    les joints ; dallage romain polygonal ;
//  - tuiles canal (tuiles creuses alternées) et ardoises ;
//  - enduit à la chaux projeté (crépi) ; planches de bois veinées ; terre battue.

import * as THREE from 'three';

// ---------- bruit et outils ----------
function hash(i, j, s) {
  let h = (Math.imul(i, 374761393) + Math.imul(j, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
// bruit de valeur raccordable de période p (en cellules) sur une texture de taille S
function valueNoise(S, p, seed) {
  const out = new Float32Array(S * S);
  for (let y = 0; y < S; y++) {
    const fy = (y / S) * p, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < S; x++) {
      const fx = (x / S) * p, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
      const a = hash(x0 % p, y0 % p, seed), b = hash((x0 + 1) % p, y0 % p, seed);
      const c = hash(x0 % p, (y0 + 1) % p, seed), d = hash((x0 + 1) % p, (y0 + 1) % p, seed);
      out[y * S + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  }
  return out;
}
export function fbm(S, p, oct, seed, gain = 0.5) {
  const out = new Float32Array(S * S);
  let amp = 1, tot = 0;
  for (let o = 0; o < oct; o++) {
    const n = valueNoise(S, p << o, seed + o * 31);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    tot += amp; amp *= gain;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const rgb = (c) => [((c >> 16) & 255) / 255, ((c >> 8) & 255) / 255, (c & 255) / 255];

// Voronoï raccordable : n x n germes ; ax étire les cellules horizontalement.
// Renvoie F1, F2 (en unités de cellule) et l'identifiant de la cellule.
function voronoi(S, n, seed, ax = 1, jitter = 0.85) {
  const F1 = new Float32Array(S * S), F2 = new Float32Array(S * S), id = new Int32Array(S * S);
  const px = new Float32Array(n * n), py = new Float32Array(n * n);
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
    px[j * n + i] = i + 0.5 + (hash(i, j, seed) - 0.5) * jitter;
    py[j * n + i] = j + 0.5 + (hash(i, j, seed + 7) - 0.5) * jitter;
  }
  for (let y = 0; y < S; y++) {
    const fy = (y / S) * n, cy = Math.floor(fy);
    for (let x = 0; x < S; x++) {
      const fx = (x / S) * n, cx = Math.floor(fx);
      let d1 = 9, d2 = 9, best = 0;
      // germes décalés d'au plus ±0,45 cellule : 3 rangées suffisent ; 5 colonnes
      // quand les cellules sont étirées en largeur
      const rx = ax < 0.9 ? 2 : 1;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -rx; dx <= rx; dx++) {
        const gi = cx + dx, gj = cy + dy;
        const wi = ((gi % n) + n) % n, wj = ((gj % n) + n) % n;
        const k = wj * n + wi;
        const qx = px[k] + (gi - wi), qy = py[k] + (gj - wj);
        const ddx = (qx - fx) * ax, ddy = qy - fy;
        const d = Math.sqrt(ddx * ddx + ddy * ddy);
        if (d < d1) { d2 = d1; d1 = d; best = k; } else if (d < d2) d2 = d;
      }
      const i = y * S + x;
      F1[i] = d1; F2[i] = d2; id[i] = best;
    }
  }
  return { F1, F2, id };
}

// ---------- assemblage : couleur, hauteur, rugosité -> textures ----------
function build(S, col, height, rough, repeat, cavity = 0.35) {
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  for (let i = 0; i < S * S; i++) {
    // les creux reçoivent moins de lumière ambiante
    const ao = 1 - cavity * (1 - height[i]);
    img.data[i * 4] = clamp(col[i * 3] * ao) * 255;
    img.data[i * 4 + 1] = clamp(col[i * 3 + 1] * ao) * 255;
    img.data[i * 4 + 2] = clamp(col[i * 3 + 2] * ao) * 255;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 8;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.userData.height = { data: height, size: S };
  if (rough) {
    const rc = document.createElement('canvas');
    rc.width = rc.height = S;
    const rctx = rc.getContext('2d');
    const ri = rctx.createImageData(S, S);
    for (let i = 0; i < S * S; i++) {
      const r = clamp(rough[i]) * 255;
      ri.data[i * 4] = r; ri.data[i * 4 + 1] = r; ri.data[i * 4 + 2] = r; ri.data[i * 4 + 3] = 255;
    }
    rctx.putImageData(ri, 0, 0);
    const rt = new THREE.CanvasTexture(rc);
    rt.wrapS = rt.wrapT = THREE.RepeatWrapping;
    rt.repeat.set(repeat, repeat);
    tex.userData.rough = rt;
  }
  return tex;
}

// Carte de normales d'après la hauteur (dérivées centrées, raccordables)
export function normalFromHeight(tex, strength = 3) {
  const key = 'nh' + strength;
  if (tex.userData[key]) return tex.userData[key];
  const { data: h, size: S } = tex.userData.height;
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(S, S);
  const at = (x, y) => h[((y + S) % S) * S + ((x + S) % S)];
  const k = strength * S / 256;
  for (let y = 0; y < S; y++) {
    for (let x = 0; x < S; x++) {
      const dx = (at(x + 1, y) - at(x - 1, y)) * k, dy = (at(x, y + 1) - at(x, y - 1)) * k;
      let nx = -dx, ny = dy, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const p = (y * S + x) * 4;
      img.data[p] = (nx * 0.5 + 0.5) * 255; img.data[p + 1] = (ny * 0.5 + 0.5) * 255; img.data[p + 2] = (nz * 0.5 + 0.5) * 255; img.data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const n = new THREE.CanvasTexture(c);
  n.wrapS = n.wrapT = THREE.RepeatWrapping;
  n.repeat.copy(tex.repeat);
  n.anisotropy = 8;
  tex.userData[key] = n;
  return n;
}

// ---------- générateurs ----------

// Moellons (murs de pierre sèche ou hourdés à la chaux)
export function rubbleTexture(base, repeat = 1, mossy = false, seed = 1) {
  const S = 512, N = S * S;
  const v = voronoi(S, 7, seed, 0.62);
  const fine = fbm(S, 32, 3, seed + 3), med = fbm(S, 8, 3, seed + 5), chip = fbm(S, 64, 2, seed + 9);
  const moss = mossy ? fbm(S, 6, 4, seed + 11) : null;
  const col = new Float32Array(N * 3), hgt = new Float32Array(N), rgh = new Float32Array(N);
  const B = rgb(base), M = rgb(0xcfc4a8);
  for (let i = 0; i < N; i++) {
    const e = v.F2[i] - v.F1[i];
    const w = 0.045 + (chip[i] - 0.5) * 0.05;
    // pierres arrondies : le bord s'adoucit avec la distance au germe
    const m = sstep(w, w + 0.09, e) * sstep(1.05, 0.8, v.F1[i]);  // 1 = pierre, 0 = joint
    const r1 = hash(v.id[i], 3, seed), r2 = hash(v.id[i], 5, seed);
    const dome = 1 - clamp(v.F1[i] * 1.2) ** 2;
    hgt[i] = m * (0.55 + 0.25 * dome + 0.2 * fine[i]) + (1 - m) * (0.3 + 0.1 * fine[i]);
    const kv = (0.72 + 0.4 * r1) * (0.86 + 0.28 * med[i]) * (0.92 + 0.16 * fine[i]);
    const warm = (r2 - 0.5) * 0.12;
    let r = B[0] * kv * (1 + warm), g = B[1] * kv, b = B[2] * kv * (1 - warm);
    // mortier à la chaux, sableux
    const mk = 0.78 + 0.25 * fine[i];
    r = r * m + M[0] * mk * (1 - m) * 1.05; g = g * m + M[1] * mk * (1 - m) * 1.03; b = b * m + M[2] * mk * (1 - m) * 0.98;
    // lichens clairs et mousses dans les joints
    if (moss) {
      const mo = sstep(0.55, 0.75, moss[i]) * (1 - m * 0.6);
      r += (0.3 - r) * mo * 0.55; g += (0.38 - g) * mo * 0.5; b += (0.2 - b) * mo * 0.55;
    }
    const li = sstep(0.82, 0.9, fine[i] * 0.6 + med[i] * 0.5) * m * 0.35;
    r += (0.86 - r) * li; g += (0.84 - g) * li; b += (0.7 - b) * li;
    col[i * 3] = r; col[i * 3 + 1] = g; col[i * 3 + 2] = b;
    rgh[i] = 0.78 + 0.2 * (1 - m) + 0.05 * fine[i];
  }
  return build(S, col, hgt, rgh, repeat, 0.3);
}

// Pierre de taille : assises régulières, blocs aux arêtes chanfreinées
export function ashlarTexture(base, repeat = 1, seed = 2) {
  const S = 512, N = S * S;
  const rows = 6, rh = S / rows;
  const fine = fbm(S, 64, 3, seed + 1), med = fbm(S, 8, 3, seed + 2), tool = fbm(S, 128, 1, seed + 3);
  const col = new Float32Array(N * 3), hgt = new Float32Array(N), rgh = new Float32Array(N);
  const B = rgb(base);
  // longueurs de blocs par assise (somme = largeur de la texture)
  const cuts = [];
  for (let r = 0; r < rows; r++) {
    const ws = [];
    let tot = 0;
    while (tot < S) { const w = rh * (1.4 + hash(r, ws.length, seed) * 1.6); ws.push(w); tot += w; }
    const k = S / tot;
    const off = hash(r, 99, seed) * S;
    let x = 0;
    cuts.push(ws.map((w) => { const c0 = (x + off) % S; x += w * k; return [c0, w * k]; }));
  }
  for (let y = 0; y < S; y++) {
    const r = Math.floor(y / rh), yy = y - r * rh;
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      let bi = 0, dx = 0;
      for (let b = 0; b < cuts[r].length; b++) {
        const [c0, w] = cuts[r][b];
        const lx = ((x - c0) % S + S) % S;
        if (lx < w) { bi = b; dx = Math.min(lx, w - lx); break; }
      }
      const dy = Math.min(yy, rh - yy);
      const d = Math.min(dx, dy) + (fine[i] - 0.5) * 3;
      const m = sstep(1.5, 3.5, d);                       // joint fin
      const ch = sstep(2, 9, d);                           // chanfrein
      const id = r * 37 + bi;
      const kv = (0.82 + 0.26 * hash(id, 1, seed)) * (0.9 + 0.2 * med[i]) * (0.94 + 0.12 * fine[i]);
      hgt[i] = m * (0.55 + 0.35 * ch + 0.1 * tool[i]) + (1 - m) * 0.15;
      const warm = (hash(id, 2, seed) - 0.5) * 0.1;
      col[i * 3] = B[0] * kv * (1 + warm) * (0.82 + 0.18 * m);
      col[i * 3 + 1] = B[1] * kv * (0.82 + 0.18 * m);
      col[i * 3 + 2] = B[2] * kv * (1 - warm) * (0.82 + 0.18 * m);
      rgh[i] = 0.72 + 0.2 * (1 - m) + 0.06 * tool[i];
    }
  }
  return build(S, col, hgt, rgh, repeat, 0.35);
}

// Pavés en rangées (largeurs variées), bombés, terre et herbe dans les joints
export function settsTexture(base, repeat = 1, seed = 3) {
  const S = 512, N = S * S;
  const rows = 16, rh = S / rows;
  const fine = fbm(S, 64, 3, seed + 1), med = fbm(S, 8, 3, seed + 2), grass = fbm(S, 16, 2, seed + 4);
  const col = new Float32Array(N * 3), hgt = new Float32Array(N), rgh = new Float32Array(N);
  const B = rgb(base), J = rgb(0x5a4a38), G = rgb(0x4a6030);
  const cuts = [];
  for (let r = 0; r < rows; r++) {
    const ws = [];
    let tot = 0;
    while (tot < S) { const w = rh * (0.8 + hash(r, ws.length, seed) * 0.7); ws.push(w); tot += w; }
    const k = S / tot, off = hash(r, 77, seed) * S;
    let x = 0;
    cuts.push(ws.map((w) => { const c0 = (x + off) % S; x += w * k; return [c0, w * k]; }));
  }
  for (let y = 0; y < S; y++) {
    const r = Math.floor(y / rh), yy = y - r * rh;
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      let bi = 0, ux = 0, w = 1;
      for (let b = 0; b < cuts[r].length; b++) {
        const [c0, ww] = cuts[r][b];
        const lx = ((x - c0) % S + S) % S;
        if (lx < ww) { bi = b; ux = lx; w = ww; break; }
      }
      // pavé arrondi : distance normalisée au centre
      const nx = (ux / w - 0.5) * 2, ny = (yy / rh - 0.5) * 2;
      const q = Math.pow(Math.pow(Math.abs(nx), 4) + Math.pow(Math.abs(ny), 4), 0.25) + (fine[i] - 0.5) * 0.18;
      const m = sstep(0.98, 0.84, q);
      const id = r * 53 + bi;
      const dome = clamp(1 - q * q);
      hgt[i] = m * (0.45 + 0.45 * dome + 0.1 * fine[i]) + (1 - m) * 0.08 * fine[i];
      const kv = (0.7 + 0.45 * hash(id, 1, seed)) * (0.88 + 0.24 * med[i]) * (0.9 + 0.2 * fine[i]);
      const tint = (hash(id, 2, seed) - 0.5) * 0.14;
      let cr = B[0] * kv * (1 + tint), cg = B[1] * kv, cb = B[2] * kv * (1 - tint);
      // joints : terre, et un peu d'herbe par endroits
      const gr = sstep(0.62, 0.75, grass[i]);
      const jr = J[0] + (G[0] - J[0]) * gr, jg = J[1] + (G[1] - J[1]) * gr, jb = J[2] + (G[2] - J[2]) * gr;
      cr = cr * m + jr * (1 - m); cg = cg * m + jg * (1 - m); cb = cb * m + jb * (1 - m);
      col[i * 3] = cr; col[i * 3 + 1] = cg; col[i * 3 + 2] = cb;
      // le dessus des pavés est poli par les passages
      rgh[i] = m * (0.74 + 0.18 * (1 - dome)) + (1 - m) * 0.95;
    }
  }
  return build(S, col, hgt, rgh, repeat, 0.4);
}

// Dallage polygonal (voie romaine)
export function flagTexture(base, repeat = 1, seed = 4) {
  const S = 512, N = S * S;
  const v = voronoi(S, 5, seed, 1, 0.9);
  const fine = fbm(S, 64, 3, seed + 1), med = fbm(S, 8, 3, seed + 2);
  const col = new Float32Array(N * 3), hgt = new Float32Array(N), rgh = new Float32Array(N);
  const B = rgb(base), J = rgb(0x6a5a44);
  for (let i = 0; i < N; i++) {
    const e = v.F2[i] - v.F1[i] + (fine[i] - 0.5) * 0.05;
    const m = sstep(0.03, 0.08, e);
    const kv = (0.78 + 0.32 * hash(v.id[i], 1, seed)) * (0.88 + 0.24 * med[i]) * (0.92 + 0.16 * fine[i]);
    hgt[i] = m * (0.6 + 0.25 * sstep(0.03, 0.3, e) + 0.15 * fine[i]) + (1 - m) * 0.1;
    col[i * 3] = B[0] * kv * m + J[0] * (1 - m);
    col[i * 3 + 1] = B[1] * kv * m + J[1] * (1 - m);
    col[i * 3 + 2] = B[2] * kv * m + J[2] * (1 - m);
    rgh[i] = 0.6 + 0.35 * (1 - m) + 0.1 * fine[i];
  }
  return build(S, col, hgt, rgh, repeat, 0.35);
}

// Tuiles canal : rangées de tuiles creuses (courant) et bombées (couvrant)
export function canalTileTexture(base, repeat = 1, mossy = true, seed = 5) {
  const S = 512, N = S * S;
  const cols = 9, rows = 4, cw = S / cols, rh = S / rows;
  const fine = fbm(S, 64, 2, seed + 1), med = fbm(S, 6, 3, seed + 2), lich = fbm(S, 32, 3, seed + 3);
  const col = new Float32Array(N * 3), hgt = new Float32Array(N), rgh = new Float32Array(N);
  const B = rgb(base);
  for (let y = 0; y < S; y++) {
    const r = Math.floor(y / rh), v = (y - r * rh) / rh;   // v : 0 haut de la tuile, 1 bas (recouvrement)
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const c = Math.floor(x / cw), u = (x - c * cw) / cw;
      const convex = (c % 2) === 0;
      const prof = Math.sin(Math.PI * u);
      // le bas de chaque tuile recouvre la suivante : léger ressaut
      const lip = sstep(0.82, 1, v) * 0.12;
      let h = convex ? 0.45 + 0.5 * prof ** 0.7 : 0.35 - 0.25 * prof;
      h += v * 0.08 + lip + (fine[i] - 0.5) * 0.05;
      const edge = convex ? sstep(0, 0.12, Math.min(u, 1 - u)) : 1;
      hgt[i] = clamp(h * (0.6 + 0.4 * edge));
      const id = r * 31 + c;
      const kv = (0.75 + 0.35 * hash(id, 1, seed)) * (0.85 + 0.3 * med[i]) * (0.92 + 0.12 * fine[i]);
      const burn = (hash(id, 2, seed) - 0.5) * 0.25;            // cuisson plus ou moins poussée
      let cr = B[0] * kv * (1 + burn * 0.3), cg = B[1] * kv * (1 - burn * 0.2), cb = B[2] * kv * (1 - burn * 0.3);
      // ombre portée sous le recouvrement de la rangée supérieure
      const sh = 1 - sstep(0.1, 0, v) * 0.22;
      cr *= sh; cg *= sh; cb *= sh;
      if (mossy) {
        const lk = sstep(0.68, 0.8, lich[i]) * (convex ? 1 : 0.5);
        cr += (0.82 - cr) * lk * 0.55; cg += (0.8 - cg) * lk * 0.5; cb += (0.62 - cb) * lk * 0.45;   // lichens clairs
        const mo = sstep(0.62, 0.8, med[i]) * (convex ? 0.2 : 0.7);
        cr += (0.28 - cr) * mo * 0.5; cg += (0.33 - cg) * mo * 0.45; cb += (0.18 - cb) * mo * 0.5;  // mousse dans les courants
      }
      col[i * 3] = cr; col[i * 3 + 1] = cg; col[i * 3 + 2] = cb;
      rgh[i] = 0.75 + 0.2 * fine[i];
    }
  }
  return build(S, col, hgt, rgh, repeat, 0.4);
}

// Ardoises : rangées décalées, bords légèrement irréguliers
export function slateTexture(base, repeat = 1, seed = 6) {
  const S = 512, N = S * S;
  const rows = 12, rh = S / rows, cols = 8, cw = S / cols;
  const fine = fbm(S, 64, 2, seed + 1), med = fbm(S, 8, 2, seed + 2);
  const col = new Float32Array(N * 3), hgt = new Float32Array(N), rgh = new Float32Array(N);
  const B = rgb(base);
  for (let y = 0; y < S; y++) {
    const r = Math.floor(y / rh), v = (y - r * rh) / rh;
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const xs = (x + (r % 2) * cw / 2) % S;
      const c = Math.floor(xs / cw), u = (xs - c * cw) / cw;
      const gap = sstep(0, 0.04, Math.min(u, 1 - u) + (fine[i] - 0.5) * 0.03);
      const id = r * 17 + c;
      hgt[i] = (0.4 + 0.5 * v) * gap + (1 - gap) * 0.1;
      const kv = (0.8 + 0.3 * hash(id, 1, seed)) * (0.9 + 0.2 * med[i]) * (0.94 + 0.12 * fine[i]) * (0.75 + 0.25 * gap);
      col[i * 3] = B[0] * kv; col[i * 3 + 1] = B[1] * kv; col[i * 3 + 2] = B[2] * kv * 1.03;
      rgh[i] = 0.5 + 0.3 * fine[i];
    }
  }
  return build(S, col, hgt, rgh, repeat, 0.35);
}

// Enduit à la chaux projeté (crépi) : grain, marbrures, salissures douces
export function roughcastTexture(base, repeat = 1, seed = 7) {
  const S = 512, N = S * S;
  const grain = fbm(S, 128, 2, seed + 1), mid = fbm(S, 32, 3, seed + 2), mottle = fbm(S, 4, 4, seed + 3);
  const col = new Float32Array(N * 3), hgt = new Float32Array(N), rgh = new Float32Array(N);
  const B = rgb(base);
  for (let i = 0; i < N; i++) {
    // chaux lissée à la truelle : grain discret, ondulations douces
    hgt[i] = 0.2 * grain[i] + 0.3 * mid[i] + 0.5 * mottle[i];
    const k = (0.9 + 0.12 * (mottle[i] - 0.5) * 2) * (0.95 + 0.1 * mid[i]);
    const dirt = sstep(0.6, 0.85, mottle[i] * 0.7 + mid[i] * 0.4) * 0.12;
    col[i * 3] = B[0] * k - dirt * 0.9; col[i * 3 + 1] = B[1] * k - dirt; col[i * 3 + 2] = B[2] * k - dirt * 1.1;
    rgh[i] = 0.85 + 0.12 * grain[i];
  }
  return build(S, col, hgt, rgh, repeat, 0.1);
}

// Planches de bois veinées
export function plankTexture(base, repeat = 1, seed = 8) {
  const S = 256, N = S * S;
  const planks = 4, pw = S / planks;
  const warp = fbm(S, 4, 3, seed + 1), fine = fbm(S, 64, 2, seed + 2);
  const col = new Float32Array(N * 3), hgt = new Float32Array(N), rgh = new Float32Array(N);
  const B = rgb(base);
  for (let y = 0; y < S; y++) {
    const p = Math.floor(y / pw), v = (y - p * pw) / pw;
    for (let x = 0; x < S; x++) {
      const i = y * S + x;
      const gap = sstep(0, 0.06, Math.min(v, 1 - v));
      const grainV = 0.5 + 0.5 * Math.sin((v * 18 + warp[i] * 6 + hash(p, 1, seed) * 10) * Math.PI);
      const knot = Math.max(0, 1 - Math.hypot((x / S - hash(p, 2, seed)) * 8, (v - 0.5) * 2.5)) ** 3 * (hash(p, 3, seed) > 0.5 ? 1 : 0);
      const kv = (0.82 + 0.25 * hash(p, 4, seed)) * (0.9 + 0.1 * grainV) * (0.92 + 0.12 * fine[i]) * (1 - knot * 0.45);
      hgt[i] = gap * (0.6 + 0.06 * grainV + 0.1 * fine[i]) + (1 - gap) * 0.05;
      col[i * 3] = B[0] * kv * (0.7 + 0.3 * gap); col[i * 3 + 1] = B[1] * kv * (0.7 + 0.3 * gap); col[i * 3 + 2] = B[2] * kv * (0.7 + 0.3 * gap);
      rgh[i] = 0.7 + 0.2 * fine[i];
    }
  }
  return build(S, col, hgt, rgh, repeat, 0.3);
}

// Terre battue : grain, cailloux, flaques sèches
export function earthTexture(base, repeat = 1, seed = 9) {
  const S = 256, N = S * S;
  const v = voronoi(S, 22, seed, 1, 0.9);
  const fine = fbm(S, 64, 2, seed + 1), med = fbm(S, 8, 3, seed + 2);
  const col = new Float32Array(N * 3), hgt = new Float32Array(N), rgh = new Float32Array(N);
  const B = rgb(base);
  for (let i = 0; i < N; i++) {
    const pr = hash(v.id[i], 3, seed);
    const pebble = hash(v.id[i], 1, seed) > 0.86 ? sstep(0.18 + pr * 0.25, 0.08 + pr * 0.15, v.F1[i]) : 0;
    const kv = (0.85 + 0.3 * med[i]) * (0.9 + 0.2 * fine[i]);
    const pk = 0.8 + 0.5 * hash(v.id[i], 2, seed);
    hgt[i] = 0.35 + 0.25 * med[i] + 0.15 * fine[i] + pebble * 0.35;
    col[i * 3] = B[0] * kv * (1 - pebble) + B[0] * pk * 1.05 * pebble;
    col[i * 3 + 1] = B[1] * kv * (1 - pebble) + B[1] * pk * pebble;
    col[i * 3 + 2] = B[2] * kv * (1 - pebble) + B[2] * pk * 0.95 * pebble;
    rgh[i] = 0.92 - pebble * 0.25;
  }
  return build(S, col, hgt, rgh, repeat, 0.3);
}
