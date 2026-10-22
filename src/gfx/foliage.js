// Feuillages : houppiers et buissons « touffus » (un noyau plein + des cartes
// de feuilles découpées en alpha, aux normales sphériques pour un ombrage doux),
// et touffes d'herbe instanciées. Tout est généré sur canvas, sans image externe.

import * as THREE from 'three';
import { mulberry32 } from '../core/rng.js';

const texCache = new Map();
const geoCache = new Map();
const matCache = new Map();

function hex(c) { return '#' + c.toString(16).padStart(6, '0'); }
function mix(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

// Grappe de feuilles sur fond transparent
export function leafCardTexture(base = 0x4a6a32, kind = 'broad') {
  const key = `leaf-${base}-${kind}`;
  if (texCache.has(key)) return texCache.get(key);
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  const rng = mulberry32(base ^ (kind.length * 977));
  const n = kind === 'needle' ? 620 : 380;
  for (let i = 0; i < n; i++) {
    // densité plus forte au centre : silhouette arrondie et dentelée
    const a = rng() * Math.PI * 2, r = Math.sqrt(rng()) * S * 0.46;
    const x = S / 2 + Math.cos(a) * r, y = S / 2 + Math.sin(a) * r;
    const shade = rng();
    ctx.fillStyle = hex(mix(base, shade > 0.5 ? 0x9ac060 : 0x18240e, Math.abs(shade - 0.5) * 1.2));
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rng() * Math.PI * 2);
    if (kind === 'needle') {
      ctx.fillRect(-0.8, -7, 1.6, 14);
    } else {
      const l = 8 + rng() * 8;
      ctx.beginPath();
      ctx.ellipse(0, 0, l * 0.45, l, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

// Touffe d'herbe (brins effilés) sur fond transparent
export function grassTuftTexture(base = 0x6a8a3a) {
  const key = `grass-${base}`;
  if (texCache.has(key)) return texCache.get(key);
  const W = 128, H = 128;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const rng = mulberry32(base);
  for (let i = 0; i < 70; i++) {
    const x0 = W * 0.15 + rng() * W * 0.7;
    const h = H * (0.45 + rng() * 0.5);
    const lean = (rng() - 0.5) * W * 0.35;
    const w = 1.5 + rng() * 2.5;
    ctx.fillStyle = hex(mix(base, rng() > 0.5 ? 0xb8c878 : 0x2a3a14, rng() * 0.5));
    ctx.beginPath();
    ctx.moveTo(x0 - w, H);
    ctx.quadraticCurveTo(x0 + lean * 0.3, H - h * 0.6, x0 + lean, H - h);
    ctx.quadraticCurveTo(x0 + lean * 0.3 + w * 0.5, H - h * 0.55, x0 + w, H);
    ctx.closePath();
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  texCache.set(key, t);
  return t;
}

// Cartes de feuilles orientées au hasard autour du centre (rayon 1)
export function leafCardsGeometry(count = 7, seed = 7) {
  const key = `cards-${count}-${seed}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const rng = mulberry32(seed);
  const pos = [], nor = [], uv = [], idx = [];
  const v = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler();
  for (let k = 0; k < count; k++) {
    e.set(rng() * Math.PI, rng() * Math.PI * 2, rng() * Math.PI);
    q.setFromEuler(e);
    const off = new THREE.Vector3((rng() - 0.5) * 0.5, (rng() - 0.5) * 0.4, (rng() - 0.5) * 0.5);
    const s = 0.9 + rng() * 0.35;
    const base = pos.length / 3;
    for (const [px, py, u, w] of [[-1, -1, 0, 0], [1, -1, 1, 0], [1, 1, 1, 1], [-1, 1, 0, 1]]) {
      v.set(px * s, py * s, 0).applyQuaternion(q).add(off);
      pos.push(v.x, v.y, v.z);
      // normale sphérique : la grappe s'éclaire comme un volume
      const n = v.clone().normalize();
      nor.push(n.x, n.y * 0.8 + 0.2, n.z);
      uv.push(u, w);
    }
    // les deux faces, enroulées en sens inverse (le côté « double » de three.js
    // retournerait la normale et noircirait la carte vue de dos)
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
    idx.push(base, base + 2, base + 1, base, base + 3, base + 2);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeBoundingSphere();
  geoCache.set(key, g);
  return g;
}

// Noyau irrégulier (icosaèdre bosselé) pour que le feuillage ne soit pas creux
export function lumpyGeometry(seed = 3, detail = 1, amp = 0.22) {
  const key = `lumpy-${seed}-${detail}-${amp}`;
  if (geoCache.has(key)) return geoCache.get(key);
  const g = new THREE.IcosahedronGeometry(1, detail);
  const p = g.attributes.position;
  const rng = mulberry32(seed);
  const bumps = Array.from({ length: 6 }, () => new THREE.Vector3(rng() - 0.5, rng() - 0.5, rng() - 0.5).normalize());
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    let d = 0;
    for (const b of bumps) d += Math.max(0, n.dot(b)) ** 3;
    v.multiplyScalar(1 + amp * (d - 0.5) + (rng() - 0.5) * amp * 0.4);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  geoCache.set(key, g);
  return g;
}

// Croix de deux plans verticaux pour l'herbe (base au sol, hauteur 1)
export function tuftGeometry() {
  if (geoCache.has('tuft')) return geoCache.get('tuft');
  const a = new THREE.PlaneGeometry(1, 1);
  a.translate(0, 0.5, 0);
  const b = a.clone().rotateY(Math.PI / 2);
  const c2 = a.clone().rotateY(Math.PI / 4);
  const pos = [], nor = [], uv = [], idx = [];
  for (const g of [a, b, c2]) {
    const base = pos.length / 3;
    const gp = g.attributes.position, gu = g.attributes.uv;
    for (let i = 0; i < gp.count; i++) {
      pos.push(gp.getX(i), gp.getY(i), gp.getZ(i));
      nor.push(0, 1, 0);           // éclairée comme le sol
      uv.push(gu.getX(i), gu.getY(i));
    }
    const gi = g.index.array;
    for (let i = 0; i < gi.length; i++) idx.push(base + gi[i]);
    for (let i = 0; i < gi.length; i += 3) idx.push(base + gi[i], base + gi[i + 2], base + gi[i + 1]);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  geoCache.set('tuft', g);
  return g;
}

export function cardMaterial(tex, key) {
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.FrontSide, roughness: 0.9 });
  matCache.set(key, m);
  return m;
}
