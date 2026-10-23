// Corps humains réalistes, d'après MakeHuman (maillage et morphologies CC0,
// voir dev/tools/gen_humans.py) : peau continue skinnée sur notre squelette,
// visage détaillé (yeux, cils, dents), occlusion ambiante cuite, et
// vêtements ajustés obtenus en gonflant et lissant une région du corps.
//
// La peau est composée dans le shader : carnation, lèvres, joues, sourcils,
// barbe ou ombre de barbe, rides et cheveux ras sont dosés par personnage à
// partir de masques partagés (assets/humans/maskA.png, maskB.png).

import * as THREE from 'three';

let D = null;              // données décodées
let loading = null;
const variants = new Map();

export function humansReady() { return !!D; }

export function loadHumans(base = './assets/humans/') {
  if (loading) return loading;
  loading = (async () => {
    const [meta, bin] = await Promise.all([
      fetch(base + 'humans.json').then((r) => r.json()),
      fetch(base + 'humans.bin').then((r) => r.arrayBuffer()),
    ]);
    const T = { uint16: Uint16Array, int16: Int16Array, uint8: Uint8Array, float32: Float32Array };
    const view = (m) => new T[m.t](bin, m.o, m.n);
    const parts = {};
    for (const [k, p] of Object.entries(meta.parts)) parts[k] = { src: view(p.src), uv: view(p.uv), tris: view(p.tris) };
    const load = (src) => new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; });
    const [mA, mB, eye] = await Promise.all([load(base + 'maskA.png'), load(base + 'maskB.png'), load(base + 'eye.png')]);
    D = {
      meta, parts, count: meta.count, bones: meta.bones, Q: meta.quant, OY: meta.originY ?? 0,
      skinIndex: view(meta.skinIndex), skinWeight: view(meta.skinWeight),
      eyes: { uv: view(meta.eyes.uv), tris: view(meta.eyes.tris), count: meta.eyes.count },
      vraw: Object.fromEntries(Object.entries(meta.variants).map(([k, v]) => [k, { ...v, pos: view(v.pos), ao: view(v.ao), eyes: view(v.eyes) }])),
      img: { mA, mB, eye },
    };
    buildAdjacency();
  })();
  return loading;
}

export const HUMAN_BONES = () => D.bones;

// ----------------------------------------------------------------------
//  Morphologie : sexe, âge, carrure -> variante disponible
// ----------------------------------------------------------------------
export function variantKey(sex, age, build) {
  const a = age === 'child' ? 'child' : age === 'old' ? 'old' : 'adult';
  let b = build === 'stout' ? 'stout' : build === 'slim' ? 'slim' : 'normal';
  if (a === 'child' || (a === 'old' && b === 'slim')) b = 'normal';
  return `${sex === 'f' ? 'f' : 'm'}-${a}-${b}`;
}

// Parties du corps (d'après les poids de peau) et coordonnée le long du membre
export const PART = { head: 0, neck: 1, trunk: 2, armL: 3, armR: 4, handL: 5, handR: 6, legL: 7, legR: 8, footL: 9, footR: 10 };
const BONE_PART = {
  hips: 'trunk', spine: 'trunk', chest: 'trunk', neck: 'neck', head: 'head', jaw: 'head', lidL: 'head', lidR: 'head', lidLoL: 'head', lidLoR: 'head',
  armL: 'armL', elbowL: 'armL', handL: 'handL', armR: 'armR', elbowR: 'armR', handR: 'handR',
  legL: 'legL', kneeL: 'legL', ankleL: 'footL', legR: 'legR', kneeR: 'legR', ankleR: 'footR',
};

let ADJ = null;            // voisins (indices « needed ») du maillage du corps
function buildAdjacency() {
  const { src, tris } = D.parts.body;
  const sets = Array.from({ length: D.count }, () => new Set());
  for (let i = 0; i < tris.length; i += 3) {
    const a = src[tris[i]], b = src[tris[i + 1]], c = src[tris[i + 2]];
    sets[a].add(b); sets[a].add(c); sets[b].add(a); sets[b].add(c); sets[c].add(a); sets[c].add(b);
  }
  ADJ = sets.map((s) => Int32Array.from(s));
}

export function getVariant(key) {
  if (variants.has(key)) return variants.get(key);
  const raw = D.vraw[key] ?? D.vraw['m-adult-normal'];
  const N = D.count, Q = D.Q;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N * 3; i++) pos[i] = raw.pos[i] / Q + (i % 3 === 1 ? D.OY : 0);
  const ao = new Float32Array(N);
  for (let i = 0; i < N; i++) ao[i] = raw.ao[i] / 255;
  // normales soudées (les coutures UV ne cassent pas l'ombrage)
  const nrm = new Float32Array(N * 3);
  const { src, tris } = D.parts.body;
  const va = new THREE.Vector3(), vb = new THREE.Vector3(), vc = new THREE.Vector3();
  for (let i = 0; i < tris.length; i += 3) {
    const a = src[tris[i]], b = src[tris[i + 1]], c = src[tris[i + 2]];
    va.fromArray(pos, a * 3); vb.fromArray(pos, b * 3); vc.fromArray(pos, c * 3);
    vb.sub(va); vc.sub(va); vb.cross(vc);
    for (const k of [a, b, c]) { nrm[k * 3] += vb.x; nrm[k * 3 + 1] += vb.y; nrm[k * 3 + 2] += vb.z; }
  }
  for (let i = 0; i < N; i++) {
    const l = Math.hypot(nrm[i * 3], nrm[i * 3 + 1], nrm[i * 3 + 2]) || 1;
    nrm[i * 3] /= l; nrm[i * 3 + 1] /= l; nrm[i * 3 + 2] /= l;
  }
  const J = raw.joints;
  // partie du corps dominante et coordonnée normalisée le long du membre
  const part = new Uint8Array(N), coord = new Float32Array(N);
  const sums = new Float32Array(11);
  const bones = D.bones;
  const P = (n) => new THREE.Vector3(...J[n]);
  const along = (p, a, b) => { const ab = b.clone().sub(a); return p.clone().sub(a).dot(ab) / ab.lengthSq(); };
  const sh = { L: P('armL'), R: P('armR') }, el = { L: P('elbowL'), R: P('elbowR') }, wr = { L: P('handL'), R: P('handR') };
  const tip = { L: P('handTipL'), R: P('handTipR') };
  const hipY = J.hips[1], shY = (J.armL[1] + J.armR[1]) / 2, neckY = J.neck[1], headY = J.head[1];
  const legTop = (J.legL[1] + J.legR[1]) / 2, ank = (J.ankleL[1] + J.ankleR[1]) / 2;
  const p = new THREE.Vector3();
  for (let i = 0; i < N; i++) {
    sums.fill(0);
    for (let k = 0; k < 4; k++) {
      const w = D.skinWeight[i * 4 + k];
      if (w) sums[PART[BONE_PART[bones[D.skinIndex[i * 4 + k]]]]] += w;
    }
    let best = 0;
    for (let k = 1; k < 11; k++) if (sums[k] > sums[best]) best = k;
    part[i] = best;
    p.fromArray(pos, i * 3);
    switch (best) {
      case PART.trunk: coord[i] = (p.y - hipY) / (shY - hipY); break;
      case PART.neck: coord[i] = (p.y - neckY) / (headY - neckY); break;
      case PART.head: coord[i] = (p.y - headY); break;
      case PART.armL: case PART.armR: {
        const s = best === PART.armL ? 'L' : 'R';
        const t1 = along(p, sh[s], el[s]);
        coord[i] = t1 < 1 ? t1 * 0.5 : 0.5 + along(p, el[s], wr[s]) * 0.5;
        break;
      }
      case PART.handL: case PART.handR: {
        const s = best === PART.handL ? 'L' : 'R';
        coord[i] = 1 + along(p, wr[s], tip[s]);
        break;
      }
      case PART.legL: case PART.legR: coord[i] = (p.y - ank) / (legTop - ank); break;
      default: coord[i] = p.y / ank;   // pieds : 0 à la plante, 1 à la cheville
    }
  }
  const v = { key, raw, pos, nrm, ao, J, part, coord, height: raw.height, eyes: raw.eyes };
  v.measure = measure(v);
  variants.set(key, v);
  return v;
}

// Mesures pour habiller : sections du tronc (repère monde, pose de repos)
function measure(v) {
  const { pos, part, J } = v;
  const sec = (y0, y1) => {
    let rx = 0, front = -1, back = 1;
    for (let i = 0; i < D.count; i++) {
      if (part[i] !== PART.trunk && part[i] !== PART.neck) continue;
      const y = pos[i * 3 + 1];
      if (y < y0 || y > y1) continue;
      const x = Math.abs(pos[i * 3]), z = pos[i * 3 + 2];
      if (x > rx) rx = x;
      if (z > front) front = z;
      if (z < back) back = z;
    }
    return { rx, front, back, cz: (front + back) / 2, rz: (front - back) / 2 };
  };
  const at = (y) => sec(y - 0.012, y + 0.012);
  // tête : boîte du crâne au-dessus des yeux
  let hx = 0, hTop = 0, hFront = -1, hBack = 1;
  const eyeY = (J.eyeL[1] + J.eyeR[1]) / 2;
  for (let i = 0; i < D.count; i++) {
    if (part[i] !== PART.head) continue;
    const y = pos[i * 3 + 1];
    if (y > hTop) hTop = y;
    if (y < eyeY) continue;
    hx = Math.max(hx, Math.abs(pos[i * 3]));
    hFront = Math.max(hFront, pos[i * 3 + 2]);
    hBack = Math.min(hBack, pos[i * 3 + 2]);
  }
  return { at, head: { halfW: hx, top: hTop, front: hFront, back: hBack, eyeY } };
}

// ----------------------------------------------------------------------
//  Géométries
// ----------------------------------------------------------------------
const geoCache = new Map();

// Corps (ou cils / dents) : triangles retenus par keep(a, b, c) (indices « needed »)
export function partGeometry(v, partName, keep = null, cacheKey = null) {
  const ck = cacheKey && `${v.key}|${partName}|${cacheKey}`;
  if (ck && geoCache.has(ck)) return geoCache.get(ck);
  const { src, uv, tris } = D.parts[partName];
  const used = new Int32Array(src.length).fill(-1);
  const idx = [];
  let n = 0;
  for (let i = 0; i < tris.length; i += 3) {
    const a = tris[i], b = tris[i + 1], c = tris[i + 2];
    if (keep && !keep(src[a], src[b], src[c])) continue;
    for (const k of [a, b, c]) { if (used[k] < 0) used[k] = n++; idx.push(used[k]); }
  }
  const P = new Float32Array(n * 3), Nn = new Float32Array(n * 3), UV = new Float32Array(n * 2), C = new Float32Array(n * 3);
  const SI = new Uint8Array(n * 4), SW = new Uint8Array(n * 4);
  for (let k = 0; k < src.length; k++) {
    const j = used[k];
    if (j < 0) continue;
    const s = src[k];
    for (let d = 0; d < 3; d++) { P[j * 3 + d] = v.pos[s * 3 + d]; Nn[j * 3 + d] = v.nrm[s * 3 + d]; }
    UV[j * 2] = uv[k * 2] / 65535; UV[j * 2 + 1] = uv[k * 2 + 1] / 65535;
    const a = 1 - Math.min(0.85, v.ao[s] * 1.35);
    C[j * 3] = a; C[j * 3 + 1] = a; C[j * 3 + 2] = a;
    for (let d = 0; d < 4; d++) { SI[j * 4 + d] = D.skinIndex[s * 4 + d]; SW[j * 4 + d] = D.skinWeight[s * 4 + d]; }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(Nn, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(UV, 2));
  g.setAttribute('color', new THREE.BufferAttribute(C, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(SI, 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(SW, 4, true));
  g.setIndex(idx);
  if (partName !== 'body') g.computeVertexNormals();
  g.computeBoundingSphere();
  if (ck) geoCache.set(ck, g);
  return g;
}

// Coque d'une région du corps : positions gonflées et lissées (indices « needed »)
// et triangles de la région. Sert aux vêtements, aux cheveux et à la barbe.
export function regionShell(v, inRegion, { off = 0.006, smooth = 4, folds = 0, offFn = null, blur = 0, sink = 0 } = {}) {
  const N = D.count;
  const inside = new Uint8Array(N);
  for (let i = 0; i < N; i++) inside[i] = inRegion(i) ? 1 : 0;
  const S = new Float32Array(N * 3);
  const offs = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    if (!inside[i]) continue;
    const o = offFn ? offFn(i) : off;
    offs[i] = o;
    const px = v.pos[i * 3], py = v.pos[i * 3 + 1], pz = v.pos[i * 3 + 2];
    const f = folds * (Math.sin(py * 61 + px * 13) * 0.6 + Math.sin(py * 23 - pz * 31 + px * 7) * 0.4);
    for (let d = 0; d < 3; d++) S[i * 3 + d] = v.pos[i * 3 + d] + v.nrm[i * 3 + d] * (o + f);
  }
  // distance (en arêtes) au bord de la région : loin des bords, le tissu peut
  // passer sous les reliefs du corps (la peau cachée n'est pas dessinée)
  const hop = new Uint8Array(N).fill(255);
  let front = [];
  for (let i = 0; i < N; i++) {
    if (!inside[i]) continue;
    for (const j of ADJ[i]) if (!inside[j]) { hop[i] = 0; front.push(i); break; }
  }
  for (let d = 1; d < 6 && front.length; d++) {
    const next = [];
    for (const i of front) for (const j of ADJ[i]) if (inside[j] && hop[j] === 255) { hop[j] = d; next.push(j); }
    front = next;
  }
  // flou spatial (indépendant de la densité du maillage) : gomme mamelons,
  // nombril, doigts de pied… sans mêler deux surfaces qui se font face
  if (blur > 0) {
    const cell = blur, grid = new Map();
    const key = (x, y, z) => `${x},${y},${z}`;
    for (let i = 0; i < N; i++) {
      if (!inside[i]) continue;
      const k = key(Math.floor(S[i * 3] / cell), Math.floor(S[i * 3 + 1] / cell), Math.floor(S[i * 3 + 2] / cell));
      if (!grid.has(k)) grid.set(k, []);
      grid.get(k).push(i);
    }
    const B = new Float32Array(S);
    const s2 = (blur * 0.5) ** 2;
    for (let i = 0; i < N; i++) {
      if (!inside[i] || hop[i] < 3) continue;
      const cx = Math.floor(S[i * 3] / cell), cy = Math.floor(S[i * 3 + 1] / cell), cz = Math.floor(S[i * 3 + 2] / cell);
      let x = 0, y = 0, z = 0, wsum = 0;
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
        const l = grid.get(key(cx + dx, cy + dy, cz + dz));
        if (!l) continue;
        for (const j of l) {
          const ddx = S[j * 3] - S[i * 3], ddy = S[j * 3 + 1] - S[i * 3 + 1], ddz = S[j * 3 + 2] - S[i * 3 + 2];
          const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
          if (d2 > blur * blur) continue;
          const nd = v.nrm[i * 3] * v.nrm[j * 3] + v.nrm[i * 3 + 1] * v.nrm[j * 3 + 1] + v.nrm[i * 3 + 2] * v.nrm[j * 3 + 2];
          if (nd <= 0.2) continue;
          const w = Math.exp(-d2 / s2) * nd * nd;
          x += S[j * 3] * w; y += S[j * 3 + 1] * w; z += S[j * 3 + 2] * w; wsum += w;
        }
      }
      if (wsum > 0) { B[i * 3] = x / wsum; B[i * 3 + 1] = y / wsum; B[i * 3 + 2] = z / wsum; }
    }
    S.set(B);
  }
  const T = new Float32Array(N * 3);
  for (let it = 0; it < smooth; it++) {
    T.set(S);
    for (let i = 0; i < N; i++) {
      if (!inside[i]) continue;
      const nb = ADJ[i];
      let x = 0, y = 0, z = 0, c = 0;
      for (const j of nb) { if (!inside[j]) continue; x += S[j * 3]; y += S[j * 3 + 1]; z += S[j * 3 + 2]; c++; }
      if (c < nb.length) continue;
      x /= c; y /= c; z /= c;
      let nx = S[i * 3] + (x - S[i * 3]) * 0.6, ny = S[i * 3 + 1] + (y - S[i * 3 + 1]) * 0.6, nz = S[i * 3 + 2] + (z - S[i * 3 + 2]) * 0.6;
      const dx = nx - v.pos[i * 3], dy = ny - v.pos[i * 3 + 1], dz = nz - v.pos[i * 3 + 2];
      const dn = dx * v.nrm[i * 3] + dy * v.nrm[i * 3 + 1] + dz * v.nrm[i * 3 + 2];
      const minOff = hop[i] < 4 ? offs[i] * 0.7 : offs[i] * 0.7 - sink;
      if (dn < minOff) { const k = minOff - dn; nx += v.nrm[i * 3] * k; ny += v.nrm[i * 3 + 1] * k; nz += v.nrm[i * 3 + 2] * k; }
      T[i * 3] = nx; T[i * 3 + 1] = ny; T[i * 3 + 2] = nz;
    }
    S.set(T);
  }
  const { src, tris } = D.parts.body;
  const out = [];
  for (let i = 0; i < tris.length; i += 3) {
    const a = src[tris[i]], b = src[tris[i + 1]], c = src[tris[i + 2]];
    if (inside[a] && inside[b] && inside[c]) out.push(a, b, c);
  }
  return { pos: S, tris: out, inside };
}

// Vêtement ajusté : région du corps gonflée de `off` mètres, lissée
// (`smooth` passes) pour gommer l'anatomie, avec un léger relief de plis.
// inRegion(i) -> vrai si le sommet i est couvert ; offFn(i) -> décalage local.
// Géométrie d'une région découpée proprement : field(i) < 0 à l'intérieur ;
// les triangles à cheval sont coupés le long de la ligne field = 0 (sommets
// interpolés, poids de peau compris), d'où des ourlets nets.
function clippedGeometry(v, pos, field) {
  const { src, uv, tris } = D.parts.body;
  const P = [], Nn = [], UV = [], C = [], SI = [], SW = [], idx = [];
  const map = new Map();
  const f = new Float32Array(src.length);
  for (let k = 0; k < src.length; k++) f[k] = field(src[k]);
  const emit = (k) => {
    if (map.has(k)) return map.get(k);
    const s = src[k], n = P.length / 3;
    P.push(pos[s * 3], pos[s * 3 + 1], pos[s * 3 + 2]);
    Nn.push(v.nrm[s * 3], v.nrm[s * 3 + 1], v.nrm[s * 3 + 2]);
    UV.push(uv[k * 2] / 65535, uv[k * 2 + 1] / 65535);
    const a = 1 - Math.min(0.85, v.ao[s] * 1.35);
    C.push(a, a, a);
    for (let d = 0; d < 4; d++) { SI.push(D.skinIndex[s * 4 + d]); SW.push(D.skinWeight[s * 4 + d]); }
    map.set(k, n);
    return n;
  };
  const edge = (ka, kb) => {
    const key = ka < kb ? `${ka}_${kb}` : `${kb}_${ka}`;
    if (map.has(key)) return map.get(key);
    const t = f[ka] / (f[ka] - f[kb]);
    const sa = src[ka], sb = src[kb], n = P.length / 3;
    for (let d = 0; d < 3; d++) P.push(pos[sa * 3 + d] + (pos[sb * 3 + d] - pos[sa * 3 + d]) * t);
    for (let d = 0; d < 3; d++) Nn.push(v.nrm[sa * 3 + d] + (v.nrm[sb * 3 + d] - v.nrm[sa * 3 + d]) * t);
    UV.push((uv[ka * 2] + (uv[kb * 2] - uv[ka * 2]) * t) / 65535, (uv[ka * 2 + 1] + (uv[kb * 2 + 1] - uv[ka * 2 + 1]) * t) / 65535);
    const ao = v.ao[sa] + (v.ao[sb] - v.ao[sa]) * t, a = 1 - Math.min(0.85, ao * 1.35);
    C.push(a, a, a);
    // poids : mélange des deux extrémités, 4 os les plus lourds
    const w = new Map();
    for (const [s0, k0] of [[sa, 1 - t], [sb, t]]) {
      for (let d = 0; d < 4; d++) {
        const bi = D.skinIndex[s0 * 4 + d], bw = D.skinWeight[s0 * 4 + d] * k0;
        if (bw > 0) w.set(bi, (w.get(bi) ?? 0) + bw);
      }
    }
    const top = [...w.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4);
    const sum = top.reduce((acc, e) => acc + e[1], 0) || 1;
    let left = 255;
    for (let d = 0; d < 4; d++) {
      const e = top[d];
      SI.push(e ? e[0] : 0);
      const q = e ? (d === top.length - 1 ? left : Math.round(e[1] / sum * 255)) : 0;
      left -= q;
      SW.push(q);
    }
    map.set(key, n);
    return n;
  };
  for (let i = 0; i < tris.length; i += 3) {
    const T = [tris[i], tris[i + 1], tris[i + 2]];
    const ins = T.map((k) => f[k] < 0);
    const nIn = ins.filter(Boolean).length;
    if (nIn === 0) continue;
    if (nIn === 3) { idx.push(emit(T[0]), emit(T[1]), emit(T[2])); continue; }
    // polygone découpé (ordre conservé)
    const poly = [];
    for (let e = 0; e < 3; e++) {
      const a = T[e], b = T[(e + 1) % 3];
      if (ins[e]) poly.push(emit(a));
      if (ins[e] !== ins[(e + 1) % 3]) poly.push(edge(a, b));
    }
    for (let q = 1; q < poly.length - 1; q++) idx.push(poly[0], poly[q], poly[q + 1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(Nn, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
  g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint8Array(SI), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(new Uint8Array(SW), 4, true));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return g;
}

// Normales lissées par-dessus les coutures UV (sommets dédoublés)
export function weldNormals(g) {
  g.computeVertexNormals();
  const p = g.attributes.position, n = g.attributes.normal;
  const acc = new Map();
  const key = (i) => `${Math.round(p.getX(i) * 2e4)},${Math.round(p.getY(i) * 2e4)},${Math.round(p.getZ(i) * 2e4)}`;
  for (let i = 0; i < p.count; i++) {
    const k = key(i);
    const a = acc.get(k) ?? [0, 0, 0];
    a[0] += n.getX(i); a[1] += n.getY(i); a[2] += n.getZ(i);
    acc.set(k, a);
  }
  for (let i = 0; i < p.count; i++) {
    const a = acc.get(key(i));
    const l = Math.hypot(a[0], a[1], a[2]) || 1;
    n.setXYZ(i, a[0] / l, a[1] / l, a[2] / l);
  }
  return g;
}

// Vêtement ajusté : région field(i) < 0 du corps, gonflée de `off` mètres,
// lissée (`smooth` passes) pour gommer l'anatomie, avec un léger relief de plis.
export function garmentGeometry(v, key, field, { off = 0.006, smooth = 4, folds = 0.0025, offFn = null, blur = 0 } = {}) {
  const ck = `${v.key}|garment|${key}`;
  if (geoCache.has(ck)) return geoCache.get(ck);
  // la coque déborde un peu de la région pour que la découpe tombe sur des sommets gonflés
  // la peau couverte n'est pas dessinée : loin des ourlets, le tissu peut passer sous ses reliefs
  const { pos } = regionShell(v, (i) => field(i) < 0.12, { off, smooth, folds, offFn, blur, sink: 0.02 });
  const g = clippedGeometry(v, pos, field);
  weldNormals(g);
  // le tissu reçoit moins d'occlusion que la peau qu'il recouvre
  const col = g.attributes.color;
  for (let i = 0; i < col.count; i++) { const a = 0.35 + 0.65 * col.getX(i); col.setXYZ(i, a, a, a); }
  geoCache.set(ck, g);
  return g;
}

// Niveau de détail réduit : regroupement des sommets par cellules de `cell`
// mètres (position moyenne, autres attributs du premier sommet du groupe)
const lodCache = new Map();
// La tête (os de la tête, de la mâchoire et des paupières) garde tous ses sommets.
export function simplifyGeometry(g, cell = 0.024) {
  const ck = `${g.uuid}|${cell}`;
  const SI = g.attributes.skinIndex, SW = g.attributes.skinWeight;
  const headBones = new Set(['head', 'jaw', 'lidL', 'lidR', 'lidLoL', 'lidLoR'].map((b) => D.bones.indexOf(b)));
  if (lodCache.has(ck)) return lodCache.get(ck);
  const P = g.attributes.position, n = P.count;
  const ids = new Int32Array(n), clusters = new Map();
  const acc = [], rep = [];
  for (let i = 0; i < n; i++) {
    let top = 0;
    if (SI) for (let d = 1; d < 4; d++) if (SW.array[i * 4 + d] > SW.array[i * 4 + top]) top = d;
    const k = SI && headBones.has(SI.array[i * 4 + top]) ? `v${i}`
      : `${Math.floor(P.getX(i) / cell)},${Math.floor(P.getY(i) / cell)},${Math.floor(P.getZ(i) / cell)}`;
    let c = clusters.get(k);
    if (c === undefined) { c = rep.length; clusters.set(k, c); rep.push(i); acc.push([0, 0, 0, 0]); }
    ids[i] = c;
    const a = acc[c];
    a[0] += P.getX(i); a[1] += P.getY(i); a[2] += P.getZ(i); a[3]++;
  }
  const out = new THREE.BufferGeometry();
  for (const [name, attr] of Object.entries(g.attributes)) {
    const sz = attr.itemSize, src = attr.array;
    const arr = new src.constructor(rep.length * sz);
    rep.forEach((r, c) => { for (let d = 0; d < sz; d++) arr[c * sz + d] = src[r * sz + d]; });
    out.setAttribute(name, new THREE.BufferAttribute(arr, sz, attr.normalized));
  }
  const pos = out.attributes.position;
  acc.forEach((a, c) => pos.setXYZ(c, a[0] / a[3], a[1] / a[3], a[2] / a[3]));
  const I = g.index.array, idx = [];
  for (let t = 0; t < I.length; t += 3) {
    const a = ids[I[t]], b = ids[I[t + 1]], c = ids[I[t + 2]];
    if (a !== b && b !== c && a !== c) idx.push(a, b, c);
  }
  out.setIndex(idx);
  out.computeVertexNormals();
  out.computeBoundingSphere();
  lodCache.set(ck, out);
  return out;
}

// Yeux : deux globes (gauche, droite) centrés sur leur pivot
export function eyeGeometries(v) {
  const ck = `${v.key}|eyes`;
  if (geoCache.has(ck)) return geoCache.get(ck);
  const n = D.eyes.count, Q = D.Q;
  const side = new Int8Array(n);
  for (let i = 0; i < n; i++) side[i] = v.eyes[i * 3] > 0 ? 1 : -1;
  const out = {};
  for (const s of [1, -1]) {
    const c = v.J[s > 0 ? 'eyeL' : 'eyeR'];
    const map = new Int32Array(n).fill(-1);
    const P = [], UV = [], idx = [];
    for (let i = 0; i < D.eyes.tris.length; i += 3) {
      const t = [D.eyes.tris[i], D.eyes.tris[i + 1], D.eyes.tris[i + 2]];
      if (t.some((k) => side[k] !== s)) continue;
      for (const k of t) {
        if (map[k] < 0) {
          map[k] = P.length / 3;
          P.push(v.eyes[k * 3] / Q - c[0], v.eyes[k * 3 + 1] / Q + D.OY - c[1], v.eyes[k * 3 + 2] / Q - c[2]);
          UV.push(D.eyes.uv[k * 2] / 65535, D.eyes.uv[k * 2 + 1] / 65535);
        }
        idx.push(map[k]);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(UV, 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    out[s > 0 ? 'L' : 'R'] = g;
  }
  geoCache.set(ck, out);
  return out;
}

// ----------------------------------------------------------------------
//  Matériaux
// ----------------------------------------------------------------------
let shared = null;
function sharedTextures() {
  if (shared) return shared;
  const tex = (img, srgb = false) => {
    const t = new THREE.Texture(img);
    t.needsUpdate = true;
    t.flipY = false;
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  };
  // bruit tuilable : grain de peau, poils (barbe, sourcils, cheveux ras)
  const S = 256, c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  const id = ctx.createImageData(S, S);
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < S * S; i++) {
    id.data[i * 4] = 110 + rnd() * 90;
    id.data[i * 4 + 1] = rnd() * 255;
    id.data[i * 4 + 2] = rnd() * 255;
    id.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(id, 0, 0);
  // flou léger du canal R (grain doux)
  ctx.globalAlpha = 0.5;
  ctx.drawImage(c, 1, 0); ctx.drawImage(c, 0, 1);
  const noise = new THREE.CanvasTexture(c);
  noise.wrapS = noise.wrapT = THREE.RepeatWrapping;
  const mA = tex(D.img.mA), mB = tex(D.img.mB);
  mA.flipY = mB.flipY = true;
  shared = { mA, mB, noise };
  return shared;
}

// Peau d'un personnage : o = { skin, lip, brow, beard, beardK, browK, wrinkles, blush, scalp, scalpK, makeup, dirt, freckles }
export function skinMaterial(o) {
  const T = sharedTextures();
  const col = (c) => new THREE.Color(c);
  const skin = col(o.skin ?? 0xd8a888);
  const U = {
    tMaskA: { value: T.mA }, tMaskB: { value: T.mB }, tNoise: { value: T.noise },
    uSkin: { value: skin },
    uLip: { value: col(o.lip ?? skin.clone().lerp(new THREE.Color(0xa04848), 0.45).getHex()) },
    uBrow: { value: col(o.brow ?? 0x3a2a1a) },
    uBeard: { value: col(o.beard ?? o.brow ?? 0x3a2a1a) },
    uScalp: { value: col(o.scalp ?? o.brow ?? 0x3a2a1a) },
    uMakeup: { value: col(o.makeupColor ?? 0x5a3a4a) },
    uA: { value: new THREE.Vector4(o.beardK ?? 0, o.browK ?? 0.6, o.wrinkles ?? 0, o.makeup ?? 0) },
    uB: { value: new THREE.Vector4(o.scalpK ?? 0, o.freckles ?? 0, o.dirt ?? 0, o.blush ?? 0.5) },
  };
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xffffff, roughness: 0.55, metalness: 0, vertexColors: true,
    sheen: 0.4, sheenRoughness: 0.55, sheenColor: new THREE.Color(0xff9a80),
    clearcoat: 0.04, clearcoatRoughness: 0.5,
  });
  m.userData.skinUniforms = U;
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vSkinUv;')
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvSkinUv = uv;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform sampler2D tMaskA, tMaskB, tNoise;
        uniform vec3 uSkin, uLip, uBrow, uBeard, uScalp, uMakeup;
        uniform vec4 uA, uB;
        varying vec2 vSkinUv;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          vec4 mA = texture2D(tMaskA, vSkinUv);
          vec4 mB = texture2D(tMaskB, vSkinUv);
          vec4 n1 = texture2D(tNoise, vSkinUv * 7.0);
          vec4 n2 = texture2D(tNoise, vSkinUv * 41.0);
          vec4 n3 = texture2D(tNoise, vSkinUv * vec2(170.0, 60.0));
          vec3 c = uSkin * (0.95 + 0.1 * n1.r);
          // rougeurs (nez, oreilles, mains) et joues
          c = mix(c, c * vec3(1.06, 0.84, 0.82), mB.b * 0.65);
          c = mix(c, c * vec3(1.05, 0.86, 0.86), mA.a * uB.w);
          // taches de rousseur, saleté
          c *= 1.0 - uB.y * mA.a * step(0.82, n2.g) * 0.25;
          c = mix(c, c * vec3(0.72, 0.66, 0.6), uB.z * smoothstep(0.4, 0.9, n1.b));
          // creux des yeux, maquillage
          c *= 1.0 - mB.r * 0.1;
          c = mix(c, uMakeup, mB.r * uA.w * 0.55);
          // lèvres
          c = mix(c, uLip, mA.r * (0.85 + 0.15 * n2.r));
          // barbe : ombre bleutée de rasage, poils plus ou moins drus
          float bd = mA.b * uA.x;
          // ombre bleutée de la repousse, puis poils fins plus ou moins serrés
          c = mix(c, c * vec3(0.84, 0.86, 0.9), clamp(bd * 1.6, 0.0, 1.0) * 0.3);
          float dots = step(1.0 - 0.75 * bd, texture2D(tNoise, vSkinUv * 160.0).g);
          c = mix(c, mix(c, uBeard, 0.8), dots * clamp(bd * 1.2, 0.0, 0.85) * (0.4 + 0.6 * smoothstep(0.5, 0.9, uA.x)));
          // sourcils : traits fins
          float br = smoothstep(0.25, 0.85, mA.g) * smoothstep(0.3, 0.7, n3.b * 0.65 + mA.g * 0.5) * uA.y;
          c = mix(c, uBrow, clamp(br, 0.0, 0.85));
          // cheveux ras / naissance des cheveux sous les cheveux en cartes
          float sc = mB.g * uB.x;
          c = mix(c, uScalp, clamp(sc * (0.55 + 0.45 * smoothstep(0.3, 0.7, n3.r)), 0.0, 1.0));
          // rides (âge)
          float wr = mB.a * uA.z * (0.5 + 0.5 * sin(vSkinUv.x * 1400.0 + n1.g * 3.0));
          c *= 1.0 - wr * 0.18;
          diffuseColor.rgb *= c;
        }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = clamp(roughnessFactor - texture2D(tMaskA, vSkinUv).r * 0.2 + texture2D(tMaskA, vSkinUv).b * uA.x * 0.25, 0.25, 1.0);`);
  };
  m.customProgramCacheKey = () => 'skin-v1';
  return m;
}

// Iris recoloré (brun, noisette, vert, bleu, gris)
const eyeMats = new Map();
export function eyeMaterial(iris = 0x5a3a20) {
  if (eyeMats.has(iris)) return eyeMats.get(iris);
  const img = D.img.eye;
  const S = 512, c = document.createElement('canvas');
  c.width = c.height = S;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, S, S);
  const id = ctx.getImageData(0, 0, S, S);
  const tc = new THREE.Color(iris);
  const tr = tc.r * 255, tg = tc.g * 255, tb = tc.b * 255;
  for (let i = 0; i < S * S; i++) {
    const r = id.data[i * 4], g = id.data[i * 4 + 1], b = id.data[i * 4 + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    const sat = mx ? (mx - mn) / mx : 0;
    // l'iris est la zone saturée et sombre (le blanc de l'œil est clair et terne)
    const k = Math.max(0, Math.min(1, (sat - 0.3) * 3)) * (mx < 200 ? 1 : 0);
    if (k <= 0) continue;
    const l = (r * 0.3 + g * 0.59 + b * 0.11) / 110;
    id.data[i * 4] = r + (Math.min(255, tr * l) - r) * k;
    id.data[i * 4 + 1] = g + (Math.min(255, tg * l) - g) * k;
    id.data[i * 4 + 2] = b + (Math.min(255, tb * l) - b) * k;
  }
  ctx.putImageData(id, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  const m = new THREE.MeshPhysicalMaterial({ map: t, roughness: 0.2, clearcoat: 1, clearcoatRoughness: 0.03, alphaTest: 0.5 });
  eyeMats.set(iris, m);
  return m;
}

let lashMat = null, teethMat = null;
export function lashMaterial() {
  lashMat ??= new THREE.MeshStandardMaterial({ color: 0x1a120c, roughness: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.85 });
  return lashMat;
}
export function teethMaterial() {
  teethMat ??= new THREE.MeshPhysicalMaterial({ color: 0xe8e0cc, roughness: 0.35, clearcoat: 0.3 });
  return teethMat;
}

// Tissu des vêtements ajustés : motif projeté (triplanaire, en pose de repos)
// pour ne pas dépendre du dépliage UV du corps
const garmentMats = new Map();
export function garmentMaterial(base) {
  if (garmentMats.has(base)) return garmentMats.get(base);
  const m = base.clone();
  m.vertexColors = true;
  const map = base.map;
  const rep = map ? map.repeat.x : 1;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tFab = { value: map };
    sh.uniforms.uRep = { value: rep * 6.0 };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vRestP;\nvarying vec3 vRestN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvRestP = position;\nvRestN = normal;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tFab;\nuniform float uRep;\nvarying vec3 vRestP;\nvarying vec3 vRestN;')
      .replace('#include <map_fragment>', `
        {
          vec3 bw = pow(abs(normalize(vRestN)), vec3(4.0));
          bw /= (bw.x + bw.y + bw.z);
          vec3 p = vRestP * uRep;
          vec4 tx = texture2D(tFab, p.zy) * bw.x + texture2D(tFab, p.xz) * bw.y + texture2D(tFab, p.xy) * bw.z;
          diffuseColor *= tx;
        }`);
  };
  m.customProgramCacheKey = () => 'garment-v1';
  garmentMats.set(base, m);
  return m;
}
