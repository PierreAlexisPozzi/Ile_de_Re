// Textures procédurales générées sur canvas (aucun fichier requis).
// Pierre, tuiles d'argile, mousse, crépi, bois, pavés, herbe, sable, feuillage…
// Toutes les textures sont mises en cache et configurées pour se répéter.

import * as THREE from 'three';

const cache = new Map();

function canvas(size = 256) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  return c;
}

function lerpColor(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${bl})`;
}

function noiseOverlay(ctx, size, intensity = 0.12, scale = 1) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * intensity;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

function finalize(c, repeat = 1) {
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(repeat, repeat);
  tex.anisotropy = 4;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// Bruit de valeur raccordable (se répète sans couture sur la texture)
function tileNoise(size, period, seed) {
  const g = new Float32Array(period * period);
  let st = seed * 9301 + 49297;
  for (let i = 0; i < g.length; i++) { st = (st * 9301 + 49297) % 233280; g[i] = st / 233280; }
  const out = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    const fy = (y / size) * period, y0 = Math.floor(fy), ty = fy - y0, sy = ty * ty * (3 - 2 * ty);
    for (let x = 0; x < size; x++) {
      const fx = (x / size) * period, x0 = Math.floor(fx), tx = fx - x0, sx = tx * tx * (3 - 2 * tx);
      const a = g[(y0 % period) * period + (x0 % period)], b = g[(y0 % period) * period + ((x0 + 1) % period)];
      const c = g[((y0 + 1) % period) * period + (x0 % period)], d = g[((y0 + 1) % period) * period + ((x0 + 1) % period)];
      out[y * size + x] = a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
    }
  }
  return out;
}
function tileFbm(size, basePeriod, octaves, seed) {
  const out = new Float32Array(size * size);
  let amp = 0.5, tot = 0;
  for (let o = 0; o < octaves; o++) {
    const n = tileNoise(size, basePeriod << o, seed + o * 17);
    for (let i = 0; i < out.length; i++) out[i] += n[i] * amp;
    tot += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= tot;
  return out;
}

// Carte de normales calculée à partir de la luminance de la texture (Sobel)
export function normalOf(tex, strength = 2) {
  const key = 'n' + strength;
  if (tex.userData[key]) return tex.userData[key];
  const src = tex.image;
  const w = src.width, h = src.height;
  if (!src.getContext) return null;
  // copie lue une seule fois (évite l'avertissement de relecture du canvas d'origine)
  const rc = document.createElement('canvas');
  rc.width = w; rc.height = h;
  const rctx = rc.getContext('2d', { willReadFrequently: true });
  rctx.drawImage(src, 0, 0);
  const d = rctx.getImageData(0, 0, w, h).data;
  const L = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) L[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const oc = c.getContext('2d');
  const img = oc.createImageData(w, h);
  const at = (x, y) => L[((y + h) % h) * w + ((x + w) % w)];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x - 1, y) + at(x - 1, y + 1));
      const dy = (at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1)) - (at(x - 1, y - 1) + 2 * at(x, y - 1) + at(x + 1, y - 1));
      let nx = -dx * strength, ny = dy * strength, nz = 1;
      const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const k = (y * w + x) * 4;
      img.data[k] = (nx * 0.5 + 0.5) * 255; img.data[k + 1] = (ny * 0.5 + 0.5) * 255; img.data[k + 2] = (nz * 0.5 + 0.5) * 255; img.data[k + 3] = 255;
    }
  }
  oc.putImageData(img, 0, 0);
  const n = new THREE.CanvasTexture(c);
  n.wrapS = n.wrapT = THREE.RepeatWrapping;
  n.repeat.copy(tex.repeat);
  n.anisotropy = 4;
  tex.userData[key] = n;
  return n;
}

// Relief : réutilise le même canvas comme bump map (luminance = hauteur).
// Donne du grain aux moellons, joints, tuiles et pavés sans coût mémoire notable.
export function bumpOf(tex) {
  if (tex.userData.bump) return tex.userData.bump;
  const b = new THREE.CanvasTexture(tex.image);
  b.wrapS = b.wrapT = THREE.RepeatWrapping;
  b.repeat.copy(tex.repeat);
  b.anisotropy = 4;
  tex.userData.bump = b;
  return b;
}

// ---- Pierre de taille (moellons + joints de mortier) ----
export function stoneTexture(base = 0xcabfa6, repeat = 1, mossy = false) {
  const key = `stone-${base}-${repeat}-${mossy}`;
  if (cache.has(key)) return cache.get(key);
  const size = 512, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = lerpColor(base, 0x4a443c, 0.45); // mortier en retrait
  ctx.fillRect(0, 0, size, size);
  // assises de moellons de hauteurs inégales
  let y = 0;
  while (y < size) {
    let rh = 46 + Math.random() * 34;
    if (size - y < rh + 24) rh = size - y;           // la dernière assise remplit le reste
    let x = -Math.random() * 60;
    while (x < size) {
      const cw = 60 + Math.random() * 70;
      const stone = lerpColor(base, Math.random() > 0.5 ? 0xffffff : 0x3a342c, Math.random() * 0.22);
      ctx.fillStyle = stone;
      const sw = cw - 6 - Math.random() * 4, sh = rh - 6 - Math.random() * 3;
      roundRect(ctx, x + 3, y + 3, sw, sh, 5 + Math.random() * 6);
      ctx.fill();
      // arête éclairée en haut, ombrée en bas
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fillRect(x + 6, y + 4, cw - 14, 3);
      ctx.fillStyle = 'rgba(0,0,0,0.16)'; ctx.fillRect(x + 6, y + rh - 8, cw - 14, 3);
      x += cw;
    }
    y += rh;
  }
  // patine : altération et salissures douces, mousse discrète au pied du mur
  const img = ctx.getImageData(0, 0, size, size);
  const wear = tileFbm(size, 4, 4, base & 255);
  const moss = mossy ? tileFbm(size, 6, 3, 31) : null;
  for (let i = 0; i < size * size; i++) {
    const p = i * 4, yy = Math.floor(i / size) / size;
    const k = 0.86 + wear[i] * 0.26 + (Math.random() - 0.5) * 0.08;
    let r = img.data[p] * k, g = img.data[p + 1] * k, b = img.data[p + 2] * k;
    if (moss) {
      const m = Math.max(0, moss[i] - 0.58) * 2.4 * (0.35 + 0.65 * yy);
      r = r * (1 - m * 0.45) + 70 * m * 0.45; g = g * (1 - m * 0.35) + 95 * m * 0.35; b = b * (1 - m * 0.5) + 55 * m * 0.5;
    }
    img.data[p] = Math.min(255, r); img.data[p + 1] = Math.min(255, g); img.data[p + 2] = Math.min(255, b);
  }
  ctx.putImageData(img, 0, 0);
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Crépi / enduit (maisons rétaises blanches) ----
export function plasterTexture(base = 0xeee6d2, repeat = 1) {
  const key = `plaster-${base}-${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const size = 512, c = canvas(size), ctx = c.getContext('2d');
  const img = ctx.createImageData(size, size);
  const r0 = (base >> 16) & 255, g0 = (base >> 8) & 255, b0 = base & 255;
  // enduit à la chaux : marbrures douces, salissures, grain fin, coulures de pluie
  const mottle = tileFbm(size, 4, 4, base & 255);
  const dirt = tileFbm(size, 3, 3, (base >> 8) & 255 + 7);
  const grain = tileNoise(size, 128, 3);
  const streak = new Float32Array(size);
  for (let x = 0; x < size; x++) streak[x] = Math.random() < 0.035 ? 0.4 + Math.random() * 0.6 : 0;
  for (let x = 1; x < size - 1; x++) streak[x] = Math.max(streak[x], (streak[x - 1] + streak[x + 1]) * 0.35);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const i = y * size + x;
      let k = 0.94 + (mottle[i] - 0.5) * 0.14 + (grain[i] - 0.5) * 0.06;
      const st = dirt[i] > 0.6 ? (dirt[i] - 0.6) * 1.2 : 0;
      const rain = streak[x] * (0.06 + 0.06 * (y / size)) * (0.6 + 0.4 * mottle[i]);
      const damp = y > size * 0.78 ? ((y - size * 0.78) / (size * 0.22)) ** 1.5 * 0.22 : 0;
      k -= rain + damp * 0.6;
      const p = i * 4;
      img.data[p] = Math.min(255, r0 * k - st * 40 - damp * 25);
      img.data[p + 1] = Math.min(255, g0 * k - st * 38 - damp * 15);
      img.data[p + 2] = Math.min(255, b0 * k - st * 46 - damp * 30);
      img.data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Tuiles d'argile cuite (toiture) ----
export function roofTexture(base = 0xb35a3a, repeat = 1, mossy = true) {
  const key = `roof-${base}-${repeat}-${mossy}`;
  if (cache.has(key)) return cache.get(key);
  const size = 256, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = lerpColor(base, 0x000000, 0.25);
  ctx.fillRect(0, 0, size, size);
  const rows = 8, rh = size / rows;
  const tilesPerRow = 9, tw = size / tilesPerRow;
  for (let r = 0; r < rows; r++) {
    const y = r * rh;
    const offset = (r % 2) * (tw / 2);
    for (let t = -1; t <= tilesPerRow; t++) {
      const x = t * tw + offset;
      const shade = lerpColor(base, Math.random() > 0.5 ? 0xffaa77 : 0x7a3a26, Math.random() * 0.35);
      ctx.fillStyle = shade;
      ctx.beginPath();
      // tuile demi-cylindre vue de dessus : arrondi en bas
      ctx.moveTo(x, y);
      ctx.lineTo(x + tw, y);
      ctx.lineTo(x + tw, y + rh * 0.7);
      ctx.quadraticCurveTo(x + tw / 2, y + rh * 1.15, x, y + rh * 0.7);
      ctx.closePath();
      ctx.fill();
      // ombre de chevauchement
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x, y + rh * 0.62, tw, 2);
    }
  }
  if (mossy) {
    ctx.fillStyle = 'rgba(80,105,60,0.45)';
    for (let i = 0; i < 35; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * size, Math.random() * size, 3 + Math.random() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  noiseOverlay(ctx, size, 0.1);
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Chaume (huttes préhistoriques) ----
export function thatchTexture(repeat = 1) {
  const key = `thatch-${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const size = 256, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#9a7a3a';
  ctx.fillRect(0, 0, size, size);
  ctx.lineWidth = 1;
  for (let i = 0; i < 1200; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    ctx.strokeStyle = lerpColor(0x9a7a3a, Math.random() > 0.5 ? 0xc8a85a : 0x5a4422, Math.random() * 0.6);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 4, y + 8 + Math.random() * 10);
    ctx.stroke();
  }
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Bois (poutres, bateaux, vignes) ----
export function woodTexture(base = 0x6a4a2a, repeat = 1) {
  const key = `wood-${base}-${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const size = 256, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = lerpColor(base, 0xffffff, 0.05);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 30; i++) {
    ctx.strokeStyle = lerpColor(base, 0x000000, 0.2 + Math.random() * 0.2);
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const y = Math.random() * size;
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(size * 0.3, y + (Math.random() - 0.5) * 12, size * 0.7, y + (Math.random() - 0.5) * 12, size, y);
    ctx.stroke();
  }
  noiseOverlay(ctx, size, 0.08);
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Pavés / chemins pavés ----
export function paveTexture(base = 0x8a8276, repeat = 1) {
  const key = `pave-${base}-${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const size = 256, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = lerpColor(base, 0x000000, 0.3);
  ctx.fillRect(0, 0, size, size);
  const n = 6, cw = size / n;
  for (let r = 0; r < n; r++) {
    const offset = (r % 2) * (cw / 2);
    for (let cI = -1; cI <= n; cI++) {
      const x = cI * cw + offset + 2 + Math.random() * 2;
      const y = r * cw + 2 + Math.random() * 2;
      ctx.fillStyle = lerpColor(base, Math.random() > 0.5 ? 0xffffff : 0x000000, Math.random() * 0.22);
      roundRect(ctx, x, y, cw - 4, cw - 4, 4);
      ctx.fill();
    }
  }
  noiseOverlay(ctx, size, 0.14);
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Terre battue / sentier ----
export function dirtTexture(base = 0x9a7a52, repeat = 1) {
  const key = `dirt-${base}-${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const size = 256, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = lerpColor(base, 0x000000, 0.05);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 400; i++) {
    ctx.fillStyle = lerpColor(base, Math.random() > 0.5 ? 0xc8a878 : 0x5a4428, Math.random() * 0.4);
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // ornières
  for (let i = 0; i < 2; i++) {
    ctx.strokeStyle = 'rgba(60,45,30,0.3)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    const x = size * (0.3 + i * 0.4);
    ctx.moveTo(x, 0); ctx.lineTo(x + (Math.random() - 0.5) * 30, size);
    ctx.stroke();
  }
  noiseOverlay(ctx, size, 0.12);
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Asphalte / piste cyclable contemporaine ----
export function asphaltTexture(repeat = 1, cycleLane = false) {
  const key = `asphalt-${repeat}-${cycleLane}`;
  if (cache.has(key)) return cache.get(key);
  const size = 256, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#3a3a40';
  ctx.fillRect(0, 0, size, size);
  noiseOverlay(ctx, size, 0.18);
  if (cycleLane) {
    // ligne médiane pointillée
    ctx.fillStyle = '#d8d2b8';
    for (let y = 10; y < size; y += 40) ctx.fillRect(size / 2 - 4, y, 8, 22);
  }
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Herbe / sol détaillé (multiplié sur les couleurs de sommet) ----
export function grassDetailTexture(repeat = 60) {
  const key = `grassdetail-${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const size = 128, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#e2e2e2';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 3000; i++) {
    const v = 200 + Math.random() * 55;
    ctx.fillStyle = `rgba(${v},${v},${v},0.5)`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1, 1 + Math.random() * 3);
  }
  noiseOverlay(ctx, size, 0.12);
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Sable ----
export function sandTexture(repeat = 1) {
  const key = `sand-${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const size = 128, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#e2cf9e';
  ctx.fillRect(0, 0, size, size);
  noiseOverlay(ctx, size, 0.14);
  // rides de sable
  ctx.strokeStyle = 'rgba(180,160,110,0.3)';
  for (let y = 0; y < size; y += 6) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    for (let x = 0; x <= size; x += 8) ctx.lineTo(x, y + Math.sin(x * 0.2) * 2);
    ctx.stroke();
  }
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Feuillage de pin ----
export function foliageTexture(base = 0x3a5028, repeat = 1) {
  const key = `foliage-${base}-${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const size = 128, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = lerpColor(base, 0x000000, 0.15);
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 900; i++) {
    ctx.strokeStyle = lerpColor(base, Math.random() > 0.5 ? 0x7aa84a : 0x223316, Math.random() * 0.6);
    ctx.lineWidth = 1;
    const x = Math.random() * size, y = Math.random() * size;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (Math.random() - 0.5) * 6, y - 3 - Math.random() * 5);
    ctx.stroke();
  }
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Écorce ----
export function barkTexture(repeat = 1) {
  const key = `bark-${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const size = 128, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#6a4a30';
  ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = lerpColor(0x6a4a30, 0x000000, 0.2 + Math.random() * 0.3);
    ctx.lineWidth = 1 + Math.random() * 2;
    ctx.beginPath();
    const x = Math.random() * size;
    ctx.moveTo(x, 0);
    ctx.bezierCurveTo(x + (Math.random() - 0.5) * 8, size * 0.5, x + (Math.random() - 0.5) * 8, size * 0.5, x, size);
    ctx.stroke();
  }
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Béton banché (bunkers du Mur de l'Atlantique) ----
export function concreteTexture(repeat = 1) {
  const key = `concrete-${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const size = 256, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = '#8d8d85';
  ctx.fillRect(0, 0, size, size);
  // lignes horizontales des planches de coffrage
  for (let y = 0; y < size; y += 22) {
    ctx.strokeStyle = `rgba(60,60,55,${0.25 + Math.random() * 0.2})`;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size, y); ctx.stroke();
    ctx.strokeStyle = 'rgba(200,200,190,0.12)';
    ctx.beginPath(); ctx.moveTo(0, y + 2); ctx.lineTo(size, y + 2); ctx.stroke();
  }
  // coulures et taches d'humidité
  for (let i = 0; i < 16; i++) {
    const x = Math.random() * size, y = Math.random() * size;
    const grad = ctx.createLinearGradient(x, y, x, y + 30 + Math.random() * 60);
    grad.addColorStop(0, 'rgba(55,60,50,0.25)');
    grad.addColorStop(1, 'rgba(55,60,50,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(x - 3, y, 6 + Math.random() * 8, 30 + Math.random() * 60);
  }
  noiseOverlay(ctx, size, 0.1);
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Volet en planches peintes (vert rétais, gris, etc.) ----
export function shutterTexture(base = 0x3f7f5f, repeat = 1) {
  const key = `shutter-${base}-${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const size = 64, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = lerpColor(base, 0x000000, 0.1);
  ctx.fillRect(0, 0, size, size);
  const planks = 4, pw = size / planks;
  for (let p = 0; p < planks; p++) {
    ctx.fillStyle = lerpColor(base, p % 2 ? 0xffffff : 0x000000, 0.08 + Math.random() * 0.06);
    ctx.fillRect(p * pw + 1, 0, pw - 2, size);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath(); ctx.moveTo(p * pw, 0); ctx.lineTo(p * pw, size); ctx.stroke();
  }
  // traverses en Z
  ctx.fillStyle = lerpColor(base, 0x000000, 0.2);
  ctx.fillRect(0, 6, size, 5);
  ctx.fillRect(0, size - 11, size, 5);
  noiseOverlay(ctx, size, 0.08);
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Cloth / tissu pour vêtements PNJ et joueur ----
export function clothTexture(base = 0x4a6a8a, repeat = 1) {
  const key = `cloth-${base}-${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const size = 64, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = lerpColor(base, 0xffffff, 0.04);
  ctx.fillRect(0, 0, size, size);
  noiseOverlay(ctx, size, 0.08);
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (w <= 0 || h <= 0) return;
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
