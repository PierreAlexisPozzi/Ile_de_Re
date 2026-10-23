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

// Grappe de feuilles sur fond transparent : rameaux portant des feuilles
// ombrées (face éclairée, revers plus sombre, nervure), ou aiguilles de pin
// groupées en pinceaux
export function leafCardTexture(base = 0x4a6a32, kind = 'broad') {
  const key = `leaf2-${base}-${kind}`;
  if (texCache.has(key)) return texCache.get(key);
  const S = 256;
  const c = document.createElement('canvas');
  c.width = S; c.height = S;
  const ctx = c.getContext('2d');
  const rng = mulberry32(base ^ (kind.length * 977));
  const twigs = kind === 'needle' ? 16 : 11;
  for (let t = 0; t < twigs; t++) {
    // rameau : part du bord vers l'intérieur de la grappe
    const a0 = rng() * Math.PI * 2, r0 = S * (0.18 + rng() * 0.3);
    const x0 = S / 2 + Math.cos(a0) * r0 * 0.4, y0 = S / 2 + Math.sin(a0) * r0 * 0.4;
    const dir = a0 + (rng() - 0.5) * 1.2;
    const len = S * (0.18 + rng() * 0.16);
    ctx.strokeStyle = hex(mix(base, 0x3a2a18, 0.6));
    ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(dir) * len, y0 + Math.sin(dir) * len); ctx.stroke();
    const n = kind === 'needle' ? 9 : 9;
    for (let k = 0; k < n; k++) {
      const f = (k + 0.5) / n;
      const px = x0 + Math.cos(dir) * len * f, py = y0 + Math.sin(dir) * len * f;
      const shade = rng();
      const lit = hex(mix(base, 0xa8c870, 0.25 + shade * 0.35));
      const dark = hex(mix(base, 0x0e1608, 0.35 + shade * 0.3));
      if (kind === 'needle') {
        // pinceau d'aiguilles
        for (let m = 0; m < 7; m++) {
          const a = dir + (m - 3) * 0.28 + (rng() - 0.5) * 0.2;
          const l = 9 + rng() * 7;
          ctx.strokeStyle = m % 2 ? lit : dark;
          ctx.lineWidth = 1.1;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * l, py + Math.sin(a) * l); ctx.stroke();
        }
      } else {
        for (const side of [-1, 1]) {
          const a = dir + side * (0.7 + rng() * 0.5);
          const l = 7 + rng() * 6, w = l * (0.42 + rng() * 0.12);
          ctx.save();
          ctx.translate(px + Math.cos(a) * l * 0.55, py + Math.sin(a) * l * 0.55);
          ctx.rotate(a + Math.PI / 2);
          // revers sombre, puis face éclairée décalée : volume de la feuille
          ctx.fillStyle = dark;
          ctx.beginPath(); ctx.ellipse(0, 0, w * 0.5, l * 0.55, 0, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = lit;
          ctx.beginPath(); ctx.ellipse(-w * 0.08, -l * 0.04, w * 0.4, l * 0.48, 0, 0, Math.PI * 2); ctx.fill();
          ctx.strokeStyle = 'rgba(30,40,15,0.45)';
          ctx.lineWidth = 0.6;
          ctx.beginPath(); ctx.moveTo(0, -l * 0.45); ctx.lineTo(0, l * 0.45); ctx.stroke();
          ctx.restore();
        }
      }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  texCache.set(key, t);
  return t;
}

// Touffe d'herbe : brins fins et effilés, pied sombre, pointes claires.
// Teinte neutre : la couleur vient de l'instance (couleur du sol sous la touffe)
export function grassTuftTexture(base = 0x6a8a3a) {
  const key = `grass2-${base}`;
  if (texCache.has(key)) return texCache.get(key);
  const W = 128, H = 192;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const rng = mulberry32(base);
  for (let i = 0; i < 150; i++) {
    const x0 = W * 0.1 + rng() * W * 0.8;
    const h = H * (0.35 + rng() * 0.62);
    const lean = (rng() - 0.5) * W * 0.4;
    const w = 0.7 + rng() * 1.3;
    const v = rng();
    const g = ctx.createLinearGradient(0, H, 0, H - h);
    g.addColorStop(0, hex(mix(base, 0x1a2008, 0.55)));
    g.addColorStop(1, hex(mix(base, v > 0.6 ? 0xe8e0a0 : 0xb8d080, 0.3 + v * 0.35)));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(x0 - w, H);
    ctx.quadraticCurveTo(x0 + lean * 0.25, H - h * 0.6, x0 + lean, H - h);
    ctx.quadraticCurveTo(x0 + lean * 0.25 + w * 0.6, H - h * 0.55, x0 + w, H);
    ctx.closePath();
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
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
    // cartes moyennes réparties dans le volume du houppier (un nuage de rameaux)
    const dirv = new THREE.Vector3(rng() - 0.5, (rng() - 0.5) * 0.8, rng() - 0.5).normalize();
    const off = dirv.multiplyScalar(0.25 + Math.sqrt(rng()) * 0.55);
    const s = 0.42 + rng() * 0.2;
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

// Soude les sommets confondus (positions identiques)
function weld(src) {
  const p = src.attributes.position, map = new Map(), pos = [], idx = [];
  for (let i = 0; i < p.count; i++) {
    const k = `${p.getX(i).toFixed(4)},${p.getY(i).toFixed(4)},${p.getZ(i).toFixed(4)}`;
    if (!map.has(k)) { map.set(k, pos.length / 3); pos.push(p.getX(i), p.getY(i), p.getZ(i)); }
    idx.push(map.get(k));
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  return g;
}

// Noyau irrégulier (icosaèdre bosselé) pour que le feuillage ne soit pas creux
export function lumpyGeometry(seed = 3, detail = 1, amp = 0.22) {
  const key = `lumpy-${seed}-${detail}-${amp}`;
  if (geoCache.has(key)) return geoCache.get(key);
  // sommets soudés : ombrage lisse (pas de facettes de « rocher »)
  const g = weld(new THREE.IcosahedronGeometry(1, detail + 1));
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

// Vent : temps commun aux feuillages et aux herbes (avancé par le monde)
export const WIND = { uTime: { value: 0 }, uStrength: { value: 1 } };

// kind : 'leaf' (grappes des houppiers) ou 'grass' (touffes, ancrées au sol)
export function cardMaterial(tex, key, kind = 'leaf') {
  if (matCache.has(key)) return matCache.get(key);
  const m = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.45, side: THREE.FrontSide, roughness: 0.85 });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WIND);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime, uStrength;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec3 ip = vec3(0.0);
          #ifdef USE_INSTANCING
            ip = instanceMatrix[3].xyz;
          #endif
          float ph = ip.x * 0.37 + ip.z * 0.29;
          float gust = 0.6 + 0.4 * sin(uTime * 0.31 + ip.x * 0.02);
          ${kind === 'grass'
            ? 'float k = uv.y * uv.y * 0.16 * uStrength * gust;\n          transformed.x += sin(uTime * 1.9 + ph) * k;\n          transformed.z += cos(uTime * 1.5 + ph * 1.3) * k * 0.6;'
            : '#ifdef USE_INSTANCING\n          float k = 0.035 * uStrength * gust * length(position);\n          #else\n          float k = 0.03 * uStrength * gust;\n          #endif\n          transformed.x += sin(uTime * 1.3 + ph + position.y) * k;\n          transformed.z += cos(uTime * 1.1 + ph + position.x) * k;'}
        }`);
  };
  m.customProgramCacheKey = () => `card-${kind}`;
  matCache.set(key, m);
  return m;
}
