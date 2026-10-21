// Visage peint sur canvas puis projeté sur la sphère (déformée) de la tête.
// Repère UV de SphereGeometry : u = 0.25 face avant (+z), v = 0 sommet.
// Canvas 512x256 : x = 128 centre du visage, y = 128 équateur (ligne des yeux).
// Un x croissant va vers la gauche du personnage (sa joue gauche est à x>128).

import * as THREE from 'three';

const cache = new Map();
const W = 512, H = 256;
const CX = 128;

function rgb(c, k = 1) {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * k));
  const b = Math.min(255, Math.round((c & 255) * k));
  return `rgb(${r},${g},${b})`;
}
function rgba(c, a, k = 1) {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * k));
  const b = Math.min(255, Math.round((c & 255) * k));
  return `rgba(${r},${g},${b},${a})`;
}

// opts : skin, eyes, brows, lips, sex ('m'|'f'), age ('child'|'adult'|'old'),
// stubble, scar, freckles, hairPaint (couleur peinte sur le crâne/la nuque),
// hairline (0 = haute, 1 = basse), makeup, expression ('neutral'|'smile'|'stern'|'worried')
export function faceTexture(opts = {}) {
  const key = JSON.stringify(opts);
  if (cache.has(key)) return cache.get(key);

  const {
    skin = 0xe0b08c, eyes = 0x5a4632, brows = 0x3a2a1a, lips = null,
    sex = 'm', age = 'adult', stubble = false, scar = false, freckles = false,
    hairPaint = null, hairline = 0.5, makeup = false, expression = 'neutral',
    dirt = false,
  } = opts;
  const child = age === 'child', old = age === 'old';

  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');

  // --- peau de base + modelé (joues plus chaudes, tempes plus sombres) ---
  ctx.fillStyle = rgb(skin);
  ctx.fillRect(0, 0, W, H);
  // assombrit le bas (dessous du menton, cou)
  let g = ctx.createLinearGradient(0, 150, 0, H);
  g.addColorStop(0, rgba(skin, 0));
  g.addColorStop(1, rgba(skin, 0.55, 0.72));
  ctx.fillStyle = g; ctx.fillRect(0, 150, W, H - 150);
  // chaleur des joues et du nez
  for (const dx of [-34, 34]) {
    g = ctx.createRadialGradient(CX + dx, 150, 2, CX + dx, 150, 26);
    g.addColorStop(0, `rgba(205,90,80,${child ? 0.32 : makeup ? 0.3 : 0.16})`);
    g.addColorStop(1, 'rgba(205,90,80,0)');
    ctx.fillStyle = g; ctx.fillRect(CX + dx - 30, 120, 60, 60);
  }
  // ombre des orbites
  for (const dx of [-27, 27]) {
    g = ctx.createRadialGradient(CX + dx, 124, 3, CX + dx, 124, 20);
    g.addColorStop(0, rgba(skin, old ? 0.45 : 0.25, 0.7));
    g.addColorStop(1, rgba(skin, 0, 0.7));
    ctx.fillStyle = g; ctx.fillRect(CX + dx - 22, 102, 44, 44);
  }
  // arête du nez (lumière) et ombre sous le nez
  ctx.fillStyle = rgba(0xffffff, 0.08);
  ctx.fillRect(CX - 3, 118, 6, 30);
  ctx.fillStyle = rgba(skin, 0.5, 0.6);
  ctx.beginPath(); ctx.ellipse(CX, 154, 9, 3, 0, 0, Math.PI * 2); ctx.fill();

  // --- barbe naissante ---
  if (stubble) {
    ctx.fillStyle = rgba(brows, 0.22, 0.9);
    ctx.beginPath();
    ctx.moveTo(CX - 52, 140);
    ctx.quadraticCurveTo(CX - 50, 205, CX, 214);
    ctx.quadraticCurveTo(CX + 50, 205, CX + 52, 140);
    ctx.lineTo(CX + 30, 160);
    ctx.quadraticCurveTo(CX, 156, CX - 30, 160);
    ctx.closePath();
    ctx.fill();
    for (let i = 0; i < 500; i++) {
      const a = Math.random() * Math.PI, r = Math.random();
      const x = CX + Math.cos(a) * 48 * r;
      const y = 172 + Math.sin(a) * 38 * r;
      ctx.fillStyle = rgba(brows, 0.3);
      ctx.fillRect(x, y, 1, 1);
    }
  }

  // --- taches de rousseur ---
  if (freckles) {
    for (let i = 0; i < 40; i++) {
      const side = Math.random() > 0.5 ? 1 : -1;
      ctx.fillStyle = 'rgba(150,80,40,0.35)';
      ctx.beginPath();
      ctx.arc(CX + side * (12 + Math.random() * 28), 138 + Math.random() * 18, 1 + Math.random(), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- yeux ---
  const eyeW = child ? 11 : 9.5;
  const eyeH = child ? 6.5 : (old ? 4.2 : 5.2);
  const eyeY = 126;
  for (const side of [-1, 1]) {
    const ex = CX + side * 27;
    // blanc de l'œil
    ctx.fillStyle = '#f2ede4';
    ctx.beginPath(); ctx.ellipse(ex, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2); ctx.fill();
    // iris + pupille + reflet
    ctx.save();
    ctx.beginPath(); ctx.ellipse(ex, eyeY, eyeW, eyeH, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = rgb(eyes);
    ctx.beginPath(); ctx.arc(ex, eyeY + 0.5, eyeH * 1.05, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = rgb(eyes, 0.55);
    ctx.lineWidth = 1;
    ctx.strokeStyle = rgb(eyes, 0.45);
    ctx.stroke();
    ctx.fillStyle = '#0b0806';
    ctx.beginPath(); ctx.arc(ex, eyeY + 0.5, eyeH * 0.48, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(ex - 1.8, eyeY - 1.4, 1.3, 0, Math.PI * 2); ctx.fill();
    // ombre de la paupière supérieure
    ctx.fillStyle = 'rgba(60,35,25,0.28)';
    ctx.fillRect(ex - eyeW, eyeY - eyeH, eyeW * 2, eyeH * 0.6);
    ctx.restore();
    // trait de paupière (plus marqué : cils)
    ctx.strokeStyle = sex === 'f' || makeup ? 'rgba(20,12,8,0.95)' : 'rgba(45,28,20,0.85)';
    ctx.lineWidth = sex === 'f' ? 2.2 : 1.6;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY + 0.5, eyeW + 0.5, eyeH + 0.6, 0, Math.PI * 1.05, Math.PI * 1.95);
    ctx.stroke();
    if (sex === 'f') {
      // cils extérieurs
      ctx.beginPath();
      ctx.moveTo(ex + side * eyeW, eyeY - 1);
      ctx.lineTo(ex + side * (eyeW + 3), eyeY - 3.5);
      ctx.stroke();
    }
    // pli de paupière / poches (âgés)
    ctx.strokeStyle = rgba(skin, 0.7, 0.62);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(ex, eyeY - 1, eyeW + 1, eyeH + 3, 0, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
    if (old) {
      ctx.beginPath();
      ctx.ellipse(ex, eyeY + 4, eyeW - 1, eyeH, 0, Math.PI * 0.15, Math.PI * 0.85);
      ctx.stroke();
      // pattes d'oie
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath();
        ctx.moveTo(ex + side * (eyeW + 2), eyeY + k * 2);
        ctx.lineTo(ex + side * (eyeW + 8), eyeY + k * 4);
        ctx.stroke();
      }
    }
  }

  // --- sourcils ---
  ctx.strokeStyle = rgb(brows);
  ctx.lineCap = 'round';
  const browLift = expression === 'worried' ? -3 : expression === 'stern' ? 2 : 0;
  for (const side of [-1, 1]) {
    const bx = CX + side * 27;
    ctx.lineWidth = sex === 'f' ? 2.6 : child ? 2.6 : 4;
    ctx.beginPath();
    const inner = bx - side * 11, outer = bx + side * 12;
    const innerY = 113 + (expression === 'stern' ? 3 : expression === 'worried' ? -3 : 0);
    ctx.moveTo(inner, innerY);
    ctx.quadraticCurveTo(bx, 108 + browLift, outer, 113 + (expression === 'worried' ? 2 : 0));
    ctx.stroke();
  }

  // --- bouche ---
  const lipColor = lips ?? (sex === 'f' ? (makeup ? 0xa8343c : 0xb86a66) : 0xa8706a);
  const my = 172;
  const mw = child ? 11 : 14;
  // lèvre supérieure
  ctx.fillStyle = rgb(lipColor, 0.85);
  ctx.beginPath();
  ctx.moveTo(CX - mw, my);
  ctx.quadraticCurveTo(CX - mw * 0.4, my - 4, CX, my - 2.5);
  ctx.quadraticCurveTo(CX + mw * 0.4, my - 4, CX + mw, my);
  ctx.closePath();
  ctx.fill();
  // lèvre inférieure
  ctx.fillStyle = rgb(lipColor);
  ctx.beginPath();
  ctx.moveTo(CX - mw * 0.9, my + 0.5);
  ctx.quadraticCurveTo(CX, my + (sex === 'f' ? 7 : 5.5), CX + mw * 0.9, my + 0.5);
  ctx.closePath();
  ctx.fill();
  // commissure (sourire / sévère)
  ctx.strokeStyle = 'rgba(60,25,20,0.75)';
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const corner = expression === 'smile' ? -3 : expression === 'stern' || expression === 'worried' ? 2 : 0;
  ctx.moveTo(CX - mw, my + corner);
  ctx.quadraticCurveTo(CX, my + 1.5, CX + mw, my + corner);
  ctx.stroke();
  // sillons nasogéniens / rides du front (âgés)
  if (old || expression === 'smile') {
    ctx.strokeStyle = rgba(skin, old ? 0.8 : 0.4, 0.6);
    ctx.lineWidth = 1.3;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(CX + side * 12, 150);
      ctx.quadraticCurveTo(CX + side * 22, 162, CX + side * 19, 178);
      ctx.stroke();
    }
  }
  if (old) {
    ctx.strokeStyle = rgba(skin, 0.7, 0.62);
    for (let k = 0; k < 3; k++) {
      ctx.beginPath();
      ctx.moveTo(CX - 26, 90 + k * 6);
      ctx.quadraticCurveTo(CX, 86 + k * 6, CX + 26, 90 + k * 6);
      ctx.stroke();
    }
  }

  // --- cicatrice (Vauban : joue gauche) ---
  if (scar) {
    ctx.strokeStyle = 'rgba(150,70,60,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX + 30, 140);
    ctx.lineTo(CX + 42, 158);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,220,200,0.35)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(CX + 31, 139);
    ctx.lineTo(CX + 43, 157);
    ctx.stroke();
  }

  // --- salissures (préhistoire, chantier) ---
  if (dirt) {
    for (let i = 0; i < 18; i++) {
      ctx.fillStyle = `rgba(90,70,45,${0.08 + Math.random() * 0.12})`;
      ctx.beginPath();
      ctx.arc(CX + (Math.random() - 0.5) * 90, 100 + Math.random() * 100, 3 + Math.random() * 7, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- cheveux peints sur le crâne et la nuque (sous les cheveux 3D) ---
  if (hairPaint !== null) {
    ctx.fillStyle = rgb(hairPaint);
    // sommet du crâne, tempes et nuque ; le visage (x≈68..188) reste découvert.
    // x=0/512 = côté droit du personnage, x=256 = côté gauche, x=384 = nuque.
    const top = 56 + hairline * 26;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(W, 0);
    ctx.lineTo(W, 138);
    ctx.lineTo(W - 40, 150);
    ctx.lineTo(CX + 168, 150);
    ctx.lineTo(CX + 60, 118);
    ctx.lineTo(CX + 48, top + 6);
    ctx.quadraticCurveTo(CX, top - 10, CX - 48, top + 6);
    ctx.lineTo(CX - 60, 118);
    ctx.lineTo(0, 138);
    ctx.closePath();
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  cache.set(key, tex);
  return tex;
}
