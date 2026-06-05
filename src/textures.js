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

// ---- Pierre de taille (moellons + joints de mortier) ----
export function stoneTexture(base = 0xcabfa6, repeat = 1, mossy = false) {
  const key = `stone-${base}-${repeat}-${mossy}`;
  if (cache.has(key)) return cache.get(key);
  const size = 256, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = lerpColor(base, 0x6a6258, 0.25); // mortier
  ctx.fillRect(0, 0, size, size);

  const rows = 7, rh = size / rows;
  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (size / 10);
    const cols = 5;
    const cw = size / cols;
    for (let cI = -1; cI <= cols; cI++) {
      const x = cI * cw + offset + 2;
      const y = r * rh + 2;
      const w = cw - 4 - Math.random() * 6;
      const h = rh - 4 - Math.random() * 4;
      const shade = 0.85 + Math.random() * 0.3;
      ctx.fillStyle = lerpColor(base, 0xffffff, (shade - 0.85) * 0.6);
      ctx.fillStyle = lerpColor(base, 0x000000, (1 - shade) * 0.4);
      const stone = lerpColor(base, Math.random() > 0.5 ? 0xffffff : 0x000000, Math.random() * 0.18);
      ctx.fillStyle = stone;
      roundRect(ctx, x, y, w, h, 3 + Math.random() * 3);
      ctx.fill();
    }
  }
  noiseOverlay(ctx, size, 0.18);
  if (mossy) {
    ctx.fillStyle = 'rgba(70,100,55,0.5)';
    for (let i = 0; i < 60; i++) {
      const x = Math.random() * size, y = size - Math.random() * size * 0.35;
      ctx.beginPath();
      ctx.arc(x, y, 4 + Math.random() * 10, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const tex = finalize(c, repeat);
  cache.set(key, tex);
  return tex;
}

// ---- Crépi / enduit (maisons rétaises blanches) ----
export function plasterTexture(base = 0xeee6d2, repeat = 1) {
  const key = `plaster-${base}-${repeat}`;
  if (cache.has(key)) return cache.get(key);
  const size = 256, c = canvas(size), ctx = c.getContext('2d');
  ctx.fillStyle = lerpColor(base, 0xffffff, 0);
  ctx.fillRect(0, 0, size, size);
  // taches d'usure
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(${120},${110},${90},${0.04 + Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 10 + Math.random() * 40, 0, Math.PI * 2);
    ctx.fill();
  }
  // soubassement humide en bas
  const grad = ctx.createLinearGradient(0, size * 0.7, 0, size);
  grad.addColorStop(0, 'rgba(90,80,60,0)');
  grad.addColorStop(1, 'rgba(70,75,55,0.35)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, size * 0.7, size, size * 0.3);
  noiseOverlay(ctx, size, 0.06);
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
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
