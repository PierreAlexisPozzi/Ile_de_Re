// Enseignes et affiches peintes sur canvas avec des polices d'époque
// embarquées (voir style.css et /fonts) : capitales romaines (Cinzel),
// gothique (UnifrakturMaguntia), XVIIᵉ (IM Fell English), affiches du XIXᵉ
// (Abril Fatface, Rye), machine à écrire 1940 (Special Elite), moderne
// (Montserrat). Les mêmes canvas servent de texture 3D et d'image dans le
// panneau de lecture.

import * as THREE from 'three';

export const FONTS = {
  roman: "600 {s}px 'Cinzel', 'Times New Roman', serif",
  gothic: "400 {s}px 'UnifrakturMaguntia', 'Pirata One', serif",
  gothic2: "400 {s}px 'Pirata One', 'UnifrakturMaguntia', serif",
  fell: "400 {s}px 'IM Fell English', Georgia, serif",
  fellItalic: "italic 400 {s}px 'IM Fell English', Georgia, serif",
  fat: "400 {s}px 'Abril Fatface', Georgia, serif",
  western: "400 {s}px 'Rye', 'Abril Fatface', serif",
  type: "400 {s}px 'Special Elite', 'Courier New', monospace",
  sans: "700 {s}px 'Montserrat', 'Helvetica Neue', Arial, sans-serif",
  serif: "700 {s}px 'Cormorant Garamond', Georgia, serif",
  serifItalic: "italic 500 {s}px 'Cormorant Garamond', Georgia, serif",
};

// Attend le chargement des polices avant de générer les textures.
export async function loadFonts() {
  if (!document.fonts?.load) return;
  const fams = ['Cinzel', 'UnifrakturMaguntia', 'Pirata One', 'IM Fell English', 'Abril Fatface', 'Rye',
    'Special Elite', 'Montserrat', 'Cormorant Garamond'];
  const loads = fams.map((f) => document.fonts.load(`32px '${f}'`).catch(() => null));
  loads.push(document.fonts.load("italic 32px 'Cormorant Garamond'").catch(() => null));
  await Promise.race([Promise.all(loads), new Promise((r) => setTimeout(r, 4000))]);
}

function font(name, size) {
  return (FONTS[name] || FONTS.serif).replace('{s}', Math.round(size));
}

// Écrit un texte centré en réduisant la taille jusqu'à ce qu'il tienne.
function fitText(ctx, text, x, y, maxW, fontName, size, fill, opts = {}) {
  let s = size;
  ctx.font = font(fontName, s);
  while (ctx.measureText(text).width > maxW && s > 8) {
    s -= 1;
    ctx.font = font(fontName, s);
  }
  ctx.textAlign = opts.align || 'center';
  ctx.textBaseline = 'middle';
  if (opts.shadow) {
    ctx.fillStyle = opts.shadow;
    ctx.fillText(text, x + 2, y + 2);
  }
  if (opts.stroke) {
    ctx.strokeStyle = opts.stroke;
    ctx.lineWidth = opts.strokeW || 3;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  return s;
}

function grain(ctx, w, h, amount = 0.08) {
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * amount;
    d[i] += n; d[i + 1] += n; d[i + 2] += n;
  }
  ctx.putImageData(img, 0, 0);
}

function wear(ctx, w, h, n = 30, color = 'rgba(60,40,20,0.12)') {
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(Math.random() * w, Math.random() * h, 3 + Math.random() * 20, 2 + Math.random() * 8, Math.random() * 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function woodBoard(ctx, w, h, base = '#6a4a2a') {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  for (let i = 0; i < 40; i++) {
    ctx.strokeStyle = `rgba(30,18,8,${0.08 + Math.random() * 0.12})`;
    ctx.lineWidth = 1 + Math.random() * 2;
    const y = Math.random() * h;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(w * 0.3, y + (Math.random() - 0.5) * 10, w * 0.7, y + (Math.random() - 0.5) * 10, w, y);
    ctx.stroke();
  }
  // joints de planches
  for (let y = h / 3; y < h; y += h / 3) {
    ctx.fillStyle = 'rgba(20,10,4,0.35)';
    ctx.fillRect(0, y, w, 2);
  }
}

function parchment(ctx, w, h, tint = [232, 220, 186]) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, `rgb(${tint[0]},${tint[1]},${tint[2]})`);
  g.addColorStop(1, `rgb(${tint[0] - 50},${tint[1] - 55},${tint[2] - 60})`);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  wear(ctx, w, h, 40, 'rgba(120,90,40,0.07)');
  grain(ctx, w, h, 0.06);
}

// ======================================================================
//  PICTOGRAMMES (enseignes parlantes pour une population peu lettrée)
// ======================================================================
export const ICONS = {
  bread(ctx, x, y, s, c = '#c8883a') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(x, y, s * 0.42, s * 0.24, -0.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(80,40,10,0.8)'; ctx.lineWidth = s * 0.03;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath(); ctx.moveTo(x + i * s * 0.14 - s * 0.06, y - s * 0.12); ctx.lineTo(x + i * s * 0.14 + s * 0.06, y + s * 0.08); ctx.stroke();
    }
  },
  fish(ctx, x, y, s, c = '#8aa0b0') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(x - s * 0.05, y, s * 0.34, s * 0.16, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + s * 0.25, y); ctx.lineTo(x + s * 0.45, y - s * 0.16); ctx.lineTo(x + s * 0.45, y + s * 0.16); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(x - s * 0.26, y - s * 0.03, s * 0.03, 0, Math.PI * 2); ctx.fill();
  },
  key(ctx, x, y, s, c = '#c8a050') {
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.07;
    ctx.beginPath(); ctx.arc(x - s * 0.22, y, s * 0.13, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - s * 0.09, y); ctx.lineTo(x + s * 0.38, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + s * 0.3, y); ctx.lineTo(x + s * 0.3, y + s * 0.12); ctx.moveTo(x + s * 0.2, y); ctx.lineTo(x + s * 0.2, y + s * 0.1); ctx.stroke();
  },
  clock(ctx, x, y, s, c = '#f0e8d0') {
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, s * 0.36, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a2018'; ctx.lineWidth = s * 0.03; ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * s * 0.28, y + Math.sin(a) * s * 0.28);
      ctx.lineTo(x + Math.cos(a) * s * 0.33, y + Math.sin(a) * s * 0.33); ctx.stroke();
    }
    ctx.lineWidth = s * 0.04;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - s * 0.22); ctx.moveTo(x, y); ctx.lineTo(x + s * 0.15, y + s * 0.05); ctx.stroke();
  },
  anvil(ctx, x, y, s, c = '#3a3a40') {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.moveTo(x - s * 0.4, y - s * 0.12); ctx.lineTo(x + s * 0.3, y - s * 0.12); ctx.lineTo(x + s * 0.42, y - s * 0.2);
    ctx.lineTo(x + s * 0.2, y + s * 0.02); ctx.lineTo(x + s * 0.12, y + s * 0.02); ctx.lineTo(x + s * 0.2, y + s * 0.25);
    ctx.lineTo(x - s * 0.25, y + s * 0.25); ctx.lineTo(x - s * 0.15, y + s * 0.02); ctx.lineTo(x - s * 0.3, y + s * 0.02);
    ctx.closePath(); ctx.fill();
  },
  wine(ctx, x, y, s, c = '#7a1a2a') {
    ctx.fillStyle = '#2a4a2a';
    ctx.fillRect(x - s * 0.3, y - s * 0.05, s * 0.16, s * 0.36);
    ctx.fillRect(x - s * 0.26, y - s * 0.24, s * 0.08, s * 0.2);
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x + s * 0.02, y - s * 0.2); ctx.lineTo(x + s * 0.3, y - s * 0.2);
    ctx.quadraticCurveTo(x + s * 0.3, y + s * 0.05, x + s * 0.16, y + s * 0.06); ctx.quadraticCurveTo(x + s * 0.02, y + s * 0.05, x + s * 0.02, y - s * 0.2); ctx.fill();
    ctx.fillStyle = '#d8d0c0'; ctx.fillRect(x + s * 0.14, y + s * 0.06, s * 0.04, s * 0.2); ctx.fillRect(x + s * 0.06, y + s * 0.26, s * 0.2, s * 0.04);
  },
  barrel(ctx, x, y, s, c = '#8a5a2a') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(x, y, s * 0.3, s * 0.36, 0, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#2a2a2a'; ctx.lineWidth = s * 0.04;
    for (const dy of [-0.2, 0.2]) { ctx.beginPath(); ctx.moveTo(x - s * 0.27, y + dy * s); ctx.lineTo(x + s * 0.27, y + dy * s); ctx.stroke(); }
  },
  ship(ctx, x, y, s, c = '#5a3a1a') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x - s * 0.4, y + s * 0.1); ctx.lineTo(x + s * 0.4, y + s * 0.1); ctx.lineTo(x + s * 0.28, y + s * 0.28); ctx.lineTo(x - s * 0.3, y + s * 0.28); ctx.closePath(); ctx.fill();
    ctx.fillRect(x - s * 0.02, y - s * 0.38, s * 0.035, s * 0.5);
    ctx.fillStyle = '#efe6d0';
    ctx.beginPath(); ctx.moveTo(x + s * 0.03, y - s * 0.34); ctx.lineTo(x + s * 0.3, y + s * 0.04); ctx.lineTo(x + s * 0.03, y + s * 0.04); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - s * 0.04, y - s * 0.3); ctx.lineTo(x - s * 0.28, y + s * 0.04); ctx.lineTo(x - s * 0.04, y + s * 0.04); ctx.closePath(); ctx.fill();
  },
  boot(ctx, x, y, s, c = '#3a2418') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x - s * 0.15, y - s * 0.35); ctx.lineTo(x + s * 0.08, y - s * 0.35); ctx.lineTo(x + s * 0.08, y + s * 0.1);
    ctx.lineTo(x + s * 0.38, y + s * 0.18); ctx.lineTo(x + s * 0.38, y + s * 0.3); ctx.lineTo(x - s * 0.15, y + s * 0.3); ctx.closePath(); ctx.fill();
  },
  scissors(ctx, x, y, s, c = '#8a8a90') {
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.06;
    ctx.beginPath(); ctx.moveTo(x - s * 0.3, y - s * 0.3); ctx.lineTo(x + s * 0.2, y + s * 0.15); ctx.moveTo(x + s * 0.3, y - s * 0.3); ctx.lineTo(x - s * 0.2, y + s * 0.15); ctx.stroke();
    ctx.beginPath(); ctx.arc(x - s * 0.24, y + s * 0.24, s * 0.1, 0, Math.PI * 2); ctx.arc(x + s * 0.24, y + s * 0.24, s * 0.1, 0, Math.PI * 2); ctx.stroke();
  },
  mortar(ctx, x, y, s, c = '#c8b890') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x - s * 0.3, y - s * 0.05); ctx.lineTo(x + s * 0.3, y - s * 0.05); ctx.quadraticCurveTo(x + s * 0.28, y + s * 0.3, x, y + s * 0.3); ctx.quadraticCurveTo(x - s * 0.28, y + s * 0.3, x - s * 0.3, y - s * 0.05); ctx.fill();
    ctx.fillStyle = '#8a6a3a';
    ctx.save(); ctx.translate(x + s * 0.1, y - s * 0.15); ctx.rotate(0.6); ctx.fillRect(-s * 0.04, -s * 0.25, s * 0.08, s * 0.32); ctx.restore();
  },
  coffee(ctx, x, y, s, c = '#f0ece2') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x - s * 0.25, y - s * 0.12); ctx.lineTo(x + s * 0.2, y - s * 0.12); ctx.lineTo(x + s * 0.15, y + s * 0.2); ctx.lineTo(x - s * 0.2, y + s * 0.2); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.05; ctx.beginPath(); ctx.arc(x + s * 0.22, y + s * 0.02, s * 0.08, -1.4, 1.4); ctx.stroke();
    ctx.strokeStyle = 'rgba(240,236,226,0.7)'; ctx.lineWidth = s * 0.03;
    for (const dx of [-0.1, 0.02]) { ctx.beginPath(); ctx.moveTo(x + dx * s, y - s * 0.18); ctx.quadraticCurveTo(x + dx * s + s * 0.06, y - s * 0.28, x + dx * s, y - s * 0.38); ctx.stroke(); }
  },
  bicycle(ctx, x, y, s, c = '#f4f4f4') {
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.045;
    ctx.beginPath(); ctx.arc(x - s * 0.24, y + s * 0.1, s * 0.16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(x + s * 0.24, y + s * 0.1, s * 0.16, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - s * 0.24, y + s * 0.1); ctx.lineTo(x - s * 0.04, y - s * 0.12); ctx.lineTo(x + s * 0.14, y - s * 0.12); ctx.lineTo(x + s * 0.24, y + s * 0.1);
    ctx.moveTo(x - s * 0.04, y - s * 0.12); ctx.lineTo(x, y + s * 0.1); ctx.lineTo(x + s * 0.14, y - s * 0.12);
    ctx.moveTo(x - s * 0.08, y - s * 0.2); ctx.lineTo(x + s * 0.02, y - s * 0.2); ctx.moveTo(x + s * 0.14, y - s * 0.12); ctx.lineTo(x + s * 0.12, y - s * 0.24); ctx.stroke();
  },
  icecream(ctx, x, y, s) {
    ctx.fillStyle = '#d8a860';
    ctx.beginPath(); ctx.moveTo(x - s * 0.14, y - s * 0.02); ctx.lineTo(x + s * 0.14, y - s * 0.02); ctx.lineTo(x, y + s * 0.38); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4b8c8'; ctx.beginPath(); ctx.arc(x, y - s * 0.1, s * 0.15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#f8f0d8'; ctx.beginPath(); ctx.arc(x, y - s * 0.26, s * 0.12, 0, Math.PI * 2); ctx.fill();
  },
  crepe(ctx, x, y, s) {
    ctx.fillStyle = '#e0b060';
    ctx.beginPath(); ctx.moveTo(x - s * 0.35, y + s * 0.15); ctx.quadraticCurveTo(x, y - s * 0.45, x + s * 0.35, y + s * 0.15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(140,80,30,0.5)';
    for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(x + (Math.random() - 0.5) * s * 0.4, y + (Math.random() - 0.2) * s * 0.2, s * 0.03, 0, Math.PI * 2); ctx.fill(); }
  },
  book(ctx, x, y, s, c = '#7a2a1a') {
    ctx.fillStyle = c; ctx.fillRect(x - s * 0.3, y - s * 0.22, s * 0.6, s * 0.44);
    ctx.fillStyle = '#f0e8d0'; ctx.fillRect(x - s * 0.26, y - s * 0.18, s * 0.24, s * 0.36); ctx.fillRect(x + s * 0.02, y - s * 0.18, s * 0.24, s * 0.36);
  },
  salt(ctx, x, y, s) {
    ctx.fillStyle = '#f6f2ea';
    ctx.beginPath(); ctx.moveTo(x - s * 0.38, y + s * 0.25); ctx.lineTo(x, y - s * 0.3); ctx.lineTo(x + s * 0.38, y + s * 0.25); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(140,150,160,0.6)'; ctx.lineWidth = s * 0.02; ctx.stroke();
  },
  grapes(ctx, x, y, s) {
    ctx.fillStyle = '#5a2a5a';
    const rows = [[0], [-1, 1], [-2, 0, 2], [-1, 1], [0]];
    rows.forEach((r, i) => r.forEach((k) => { ctx.beginPath(); ctx.arc(x + k * s * 0.07, y - s * 0.15 + i * s * 0.11, s * 0.075, 0, Math.PI * 2); ctx.fill(); }));
    ctx.fillStyle = '#4a7a2a'; ctx.beginPath(); ctx.ellipse(x + s * 0.12, y - s * 0.26, s * 0.12, s * 0.06, -0.4, 0, Math.PI * 2); ctx.fill();
  },
  anchor(ctx, x, y, s, c = '#2a2a30') {
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.06;
    ctx.beginPath(); ctx.arc(x, y - s * 0.3, s * 0.06, 0, Math.PI * 2); ctx.moveTo(x, y - s * 0.24); ctx.lineTo(x, y + s * 0.3);
    ctx.moveTo(x - s * 0.16, y - s * 0.12); ctx.lineTo(x + s * 0.16, y - s * 0.12); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y + s * 0.05, s * 0.28, 0.2, Math.PI - 0.2); ctx.stroke();
  },
  pharmacy(ctx, x, y, s) {
    ctx.fillStyle = '#2aa04a';
    ctx.fillRect(x - s * 0.1, y - s * 0.32, s * 0.2, s * 0.64);
    ctx.fillRect(x - s * 0.32, y - s * 0.1, s * 0.64, s * 0.2);
  },
  lighthouse(ctx, x, y, s) {
    ctx.fillStyle = '#f0ece2';
    ctx.beginPath(); ctx.moveTo(x - s * 0.12, y + s * 0.35); ctx.lineTo(x - s * 0.07, y - s * 0.22); ctx.lineTo(x + s * 0.07, y - s * 0.22); ctx.lineTo(x + s * 0.12, y + s * 0.35); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#b03a2a'; ctx.fillRect(x - s * 0.1, y + s * 0.05, s * 0.2, s * 0.08);
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(x - s * 0.08, y - s * 0.34, s * 0.16, s * 0.12);
    ctx.fillStyle = '#ffe080';
    ctx.beginPath(); ctx.moveTo(x, y - s * 0.28); ctx.lineTo(x - s * 0.42, y - s * 0.4); ctx.lineTo(x - s * 0.42, y - s * 0.18); ctx.closePath(); ctx.fill();
  },
  shell(ctx, x, y, s, c = '#f0d8b8') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x, y + s * 0.3); ctx.arc(x, y + s * 0.3, s * 0.4, Math.PI * 1.15, Math.PI * 1.85); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(140,90,50,0.6)'; ctx.lineWidth = s * 0.02;
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * 1.18 + (i / 6) * Math.PI * 0.64;
      ctx.beginPath(); ctx.moveTo(x, y + s * 0.3); ctx.lineTo(x + Math.cos(a) * s * 0.38, y + s * 0.3 + Math.sin(a) * s * 0.38); ctx.stroke();
    }
  },
  wool(ctx, x, y, s) {
    ctx.fillStyle = '#d8c8a0';
    ctx.beginPath(); ctx.arc(x, y, s * 0.28, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(120,100,60,0.6)'; ctx.lineWidth = s * 0.025;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.arc(x, y, s * (0.1 + Math.abs(i) * 0.04), i * 0.6, i * 0.6 + 2.2); ctx.stroke(); }
  },
  horseshoe(ctx, x, y, s, c = '#5a5a60') {
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.1;
    ctx.beginPath(); ctx.arc(x, y - s * 0.02, s * 0.24, Math.PI * 0.85, Math.PI * 2.15); ctx.stroke();
  },
  amphora(ctx, x, y, s, c = '#b5703a') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x - s * 0.05, y - s * 0.38); ctx.lineTo(x + s * 0.05, y - s * 0.38); ctx.lineTo(x + s * 0.06, y - s * 0.22);
    ctx.quadraticCurveTo(x + s * 0.26, y - s * 0.12, x + s * 0.18, y + s * 0.15); ctx.lineTo(x, y + s * 0.4); ctx.lineTo(x - s * 0.18, y + s * 0.15);
    ctx.quadraticCurveTo(x - s * 0.26, y - s * 0.12, x - s * 0.06, y - s * 0.22); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.04;
    ctx.beginPath(); ctx.arc(x - s * 0.1, y - s * 0.26, s * 0.06, Math.PI * 0.5, Math.PI * 1.5); ctx.arc(x + s * 0.1, y - s * 0.26, s * 0.06, -Math.PI * 0.5, Math.PI * 0.5); ctx.stroke();
  },
  scales(ctx, x, y, s, c = '#c8a050') {
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.04;
    ctx.beginPath(); ctx.moveTo(x, y - s * 0.32); ctx.lineTo(x, y + s * 0.3); ctx.moveTo(x - s * 0.34, y - s * 0.22); ctx.lineTo(x + s * 0.34, y - s * 0.22);
    ctx.moveTo(x - s * 0.18, y + s * 0.3); ctx.lineTo(x + s * 0.18, y + s * 0.3); ctx.stroke();
    for (const sx of [-1, 1]) { ctx.beginPath(); ctx.arc(x + sx * s * 0.3, y, s * 0.12, 0, Math.PI); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + sx * s * 0.34, y - s * 0.22); ctx.lineTo(x + sx * s * 0.3, y); ctx.stroke(); }
  },
  hat(ctx, x, y, s, c = '#2a2420') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(x, y + s * 0.15, s * 0.4, s * 0.08, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - s * 0.18, y - s * 0.2, s * 0.36, s * 0.35);
  },
  flower(ctx, x, y, s) {
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      ctx.fillStyle = '#d06a8a';
      ctx.beginPath(); ctx.arc(x + Math.cos(a) * s * 0.15, y + Math.sin(a) * s * 0.15, s * 0.11, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#f0d060'; ctx.beginPath(); ctx.arc(x, y, s * 0.08, 0, Math.PI * 2); ctx.fill();
  },
  deer(ctx, x, y, s, c = '#8a3a1a') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(x, y, s * 0.26, s * 0.12, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(x - s * 0.22, y + s * 0.05, s * 0.04, s * 0.22); ctx.fillRect(x + s * 0.18, y + s * 0.05, s * 0.04, s * 0.22);
    ctx.fillRect(x - s * 0.1, y + s * 0.05, s * 0.04, s * 0.2); ctx.fillRect(x + s * 0.08, y + s * 0.05, s * 0.04, s * 0.2);
    ctx.beginPath(); ctx.moveTo(x + s * 0.2, y - s * 0.05); ctx.lineTo(x + s * 0.32, y - s * 0.25); ctx.lineTo(x + s * 0.4, y - s * 0.2); ctx.lineTo(x + s * 0.28, y); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.025;
    ctx.beginPath(); ctx.moveTo(x + s * 0.33, y - s * 0.24); ctx.lineTo(x + s * 0.28, y - s * 0.42); ctx.moveTo(x + s * 0.3, y - s * 0.34); ctx.lineTo(x + s * 0.2, y - s * 0.4);
    ctx.moveTo(x + s * 0.36, y - s * 0.24); ctx.lineTo(x + s * 0.42, y - s * 0.42); ctx.stroke();
  },
  spiral(ctx, x, y, s, c = '#8a3a1a') {
    ctx.strokeStyle = c; ctx.lineWidth = s * 0.04;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 6; a += 0.1) {
      const r = (a / (Math.PI * 6)) * s * 0.38;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (a === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
  },
  hand(ctx, x, y, s, c = '#8a3a1a') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(x, y + s * 0.08, s * 0.16, s * 0.18, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 4; i++) ctx.fillRect(x - s * 0.14 + i * s * 0.085, y - s * 0.32, s * 0.06, s * 0.3);
    ctx.save(); ctx.translate(x + s * 0.16, y); ctx.rotate(-0.7); ctx.fillRect(0, -s * 0.03, s * 0.2, s * 0.06); ctx.restore();
  },
  fleurdelis(ctx, x, y, s, c = '#d4a857') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.moveTo(x, y - s * 0.38); ctx.quadraticCurveTo(x + s * 0.12, y - s * 0.15, x, y + s * 0.05); ctx.quadraticCurveTo(x - s * 0.12, y - s * 0.15, x, y - s * 0.38); ctx.fill();
    for (const sx of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(x + sx * s * 0.04, y - s * 0.02);
      ctx.quadraticCurveTo(x + sx * s * 0.38, y - s * 0.28, x + sx * s * 0.3, y - s * 0.02);
      ctx.quadraticCurveTo(x + sx * s * 0.24, y + s * 0.08, x + sx * s * 0.08, y + s * 0.06); ctx.fill();
    }
    ctx.fillRect(x - s * 0.2, y + s * 0.05, s * 0.4, s * 0.06);
    ctx.beginPath(); ctx.moveTo(x - s * 0.08, y + s * 0.11); ctx.lineTo(x + s * 0.08, y + s * 0.11); ctx.lineTo(x, y + s * 0.35); ctx.closePath(); ctx.fill();
  },
  lion(ctx, x, y, s, c = '#e0b040') {
    ctx.fillStyle = c;
    ctx.beginPath(); ctx.ellipse(x - s * 0.05, y + s * 0.02, s * 0.25, s * 0.1, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(x + s * 0.2, y - s * 0.1, s * 0.1, 0, Math.PI * 2); ctx.fill();
    for (const dx of [-0.25, -0.12, 0.05, 0.15]) ctx.fillRect(x + dx * s, y + s * 0.05, s * 0.04, s * 0.18);
    ctx.lineWidth = s * 0.03; ctx.strokeStyle = c;
    ctx.beginPath(); ctx.moveTo(x - s * 0.28, y); ctx.quadraticCurveTo(x - s * 0.42, y - s * 0.2, x - s * 0.3, y - s * 0.28); ctx.stroke();
  },
};

// ======================================================================
//  ENSEIGNES
// ======================================================================
const texCache = new Map();
function makeTex(c) {
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// style : 'painted' | 'carved' | 'enamel' | 'roman' | 'gothic' | 'modern' | 'fell' | 'fat' | 'neon'
export function signCanvas(def) {
  const { text = '', sub = '', style = 'painted', w = 512, h = 128, icon = null } = def;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  const ix = icon ? h * 0.62 : 0;
  const textX = icon ? (w + ix) / 2 : w / 2;
  const maxW = (icon ? w - ix : w) - 40;
  const hasSub = !!sub;
  const ty = hasSub ? h * 0.42 : h * 0.52;

  switch (style) {
    case 'carved': {
      woodBoard(ctx, w, h, def.bg || '#3a2614');
      ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 4; ctx.strokeRect(8, 8, w - 16, h - 16);
      fitText(ctx, text, textX, ty, maxW, def.font || 'fell', h * 0.5, '#e8c870', { shadow: 'rgba(0,0,0,0.6)' });
      if (hasSub) fitText(ctx, sub, textX, h * 0.76, maxW, 'fellItalic', h * 0.2, '#d8c090');
      break;
    }
    case 'enamel': {
      ctx.fillStyle = def.bg || '#1e3a8a';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = '#f4f4ee'; ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      fitText(ctx, text, textX, ty, maxW, def.font || 'sans', h * 0.42, '#f6f6f0');
      if (hasSub) fitText(ctx, sub, textX, h * 0.76, maxW, 'sans', h * 0.16, '#d8dce8');
      wear(ctx, w, h, 8, 'rgba(40,30,20,0.25)');
      break;
    }
    case 'roman': {
      // inscription peinte en rouge sur enduit (tituli picti)
      ctx.fillStyle = def.bg || '#e8dcc4';
      ctx.fillRect(0, 0, w, h);
      wear(ctx, w, h, 25, 'rgba(150,120,80,0.12)');
      ctx.strokeStyle = '#8a2a1a'; ctx.lineWidth = 3;
      ctx.strokeRect(12, 12, w - 24, h - 24);
      fitText(ctx, text, textX, ty, maxW, 'roman', h * 0.46, def.fg || '#9a2418');
      if (hasSub) fitText(ctx, sub, textX, h * 0.76, maxW, 'roman', h * 0.17, '#5a2a1a');
      grain(ctx, w, h, 0.05);
      break;
    }
    case 'gothic': {
      parchment(ctx, w, h, [214, 196, 150]);
      ctx.strokeStyle = '#5a2a1a'; ctx.lineWidth = 4; ctx.strokeRect(8, 8, w - 16, h - 16);
      fitText(ctx, text, textX, ty, maxW, 'gothic', h * 0.52, def.fg || '#3a1a10');
      if (hasSub) fitText(ctx, sub, textX, h * 0.78, maxW, 'gothic2', h * 0.2, '#6a2a1a');
      break;
    }
    case 'modern': {
      ctx.fillStyle = def.bg || '#2a6a5a';
      ctx.fillRect(0, 0, w, h);
      fitText(ctx, text.toUpperCase(), textX, ty, maxW, 'sans', h * 0.4, def.fg || '#ffffff');
      if (hasSub) fitText(ctx, sub, textX, h * 0.76, maxW, 'serifItalic', h * 0.22, def.fg2 || '#f0f0e8');
      break;
    }
    case 'fat': {
      // façade peinte XIXᵉ : lettres grasses sur bandeau
      ctx.fillStyle = def.bg || '#efe6d0';
      ctx.fillRect(0, 0, w, h);
      ctx.strokeStyle = def.fg || '#2a2a3a'; ctx.lineWidth = 3;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      fitText(ctx, text, textX, ty, maxW, def.font || 'fat', h * 0.5, def.fg || '#2a2a3a');
      if (hasSub) fitText(ctx, sub, textX, h * 0.78, maxW, 'fellItalic', h * 0.2, def.fg || '#2a2a3a');
      wear(ctx, w, h, 15);
      grain(ctx, w, h, 0.05);
      break;
    }
    case 'blank': {
      woodBoard(ctx, w, h, def.bg || '#5a3a20');
      break;
    }
    default: {
      // planche peinte (fond coloré, lettres claires)
      ctx.fillStyle = def.bg || '#2e4a3a';
      ctx.fillRect(0, 0, w, h);
      for (let i = 0; i < 8; i++) {
        ctx.fillStyle = 'rgba(0,0,0,0.06)';
        ctx.fillRect(0, (i * h) / 8, w, 1);
      }
      ctx.strokeStyle = def.fg || '#efe6c8'; ctx.lineWidth = 3;
      ctx.strokeRect(10, 10, w - 20, h - 20);
      fitText(ctx, text, textX, ty, maxW, def.font || 'fell', h * 0.48, def.fg || '#efe6c8');
      if (hasSub) fitText(ctx, sub, textX, h * 0.76, maxW, def.subFont || 'fellItalic', h * 0.2, def.fg || '#efe6c8');
      wear(ctx, w, h, 12);
      grain(ctx, w, h, 0.05);
    }
  }
  if (icon && ICONS[icon]) {
    ICONS[icon](ctx, ix / 2 + 6, h / 2, h * 0.9, def.iconColor);
  }
  return c;
}

export function signTexture(def) {
  const key = 'sign:' + JSON.stringify(def);
  if (!texCache.has(key)) texCache.set(key, makeTex(signCanvas(def)));
  return texCache.get(key);
}

// Enseigne en potence : pictogramme seul (ou avec mot), forme découpée.
export function hangingCanvas(def) {
  const { icon = 'bread', text = '', bg = '#5a3a20', style = 'wood', iconColor } = def;
  const s = 256;
  const c = document.createElement('canvas');
  c.width = s; c.height = s;
  const ctx = c.getContext('2d');
  if (style === 'iron') {
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, s, s);
    ctx.fillStyle = '#1e1e22';
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.46, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = bg;
    ctx.beginPath(); ctx.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2); ctx.fill();
  } else {
    woodBoard(ctx, s, s, bg);
    ctx.strokeStyle = '#c8a050'; ctx.lineWidth = 6; ctx.strokeRect(10, 10, s - 20, s - 20);
  }
  if (ICONS[icon]) ICONS[icon](ctx, s / 2, text ? s * 0.44 : s / 2, s * 0.8, iconColor);
  if (text) fitText(ctx, text, s / 2, s * 0.84, s - 40, def.font || 'fell', 34, '#f0e0b0', { shadow: 'rgba(0,0,0,0.5)' });
  return c;
}

export function hangingTexture(def) {
  const key = 'hang:' + JSON.stringify(def);
  if (!texCache.has(key)) texCache.set(key, makeTex(hangingCanvas(def)));
  return texCache.get(key);
}

// ======================================================================
//  AFFICHES
//  kind : ordonnance | avis | tract | programma | proclamation | affiche19 |
//         tourism | hide | notice
// ======================================================================
function wrapLines(ctx, text, maxW) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
  }
  if (line) lines.push(line);
  return lines;
}

function paragraph(ctx, text, x, y, maxW, fontName, size, color, lineH = 1.25, align = 'center') {
  ctx.font = font(fontName, size);
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'top';
  let yy = y;
  for (const para of text.split('\n')) {
    for (const l of wrapLines(ctx, para, maxW)) {
      ctx.fillText(l, x, yy);
      yy += size * lineH;
    }
  }
  return yy;
}

export function posterCanvas(def) {
  const W = 512, H = def.kind === 'programma' ? 256 : 724;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const title = def.title || '';
  const body = def.body || '';
  const foot = def.footer || '';

  switch (def.kind) {
    case 'ordonnance': {
      parchment(ctx, W, H, [236, 226, 196]);
      ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = 3; ctx.strokeRect(18, 18, W - 36, H - 36);
      ctx.lineWidth = 1; ctx.strokeRect(26, 26, W - 52, H - 52);
      ICONS.fleurdelis(ctx, W / 2, 92, 90, '#2a2a5a');
      fitText(ctx, def.header || 'DE PAR LE ROY', W / 2, 168, W - 80, 'fell', 44, '#1a1008');
      ctx.fillStyle = '#1a1008'; ctx.fillRect(80, 196, W - 160, 2);
      fitText(ctx, title, W / 2, 232, W - 80, 'fellItalic', 32, '#2a1a10');
      const yy = paragraph(ctx, body, W / 2, 272, W - 90, 'fell', 27, '#1e140c', 1.3);
      paragraph(ctx, foot, W / 2, Math.max(yy + 20, H - 120), W - 100, 'fellItalic', 20, '#3a2a1a', 1.25);
      break;
    }
    case 'avis': {
      ctx.fillStyle = '#ece6d4'; ctx.fillRect(0, 0, W, H);
      wear(ctx, W, H, 30, 'rgba(110,90,60,0.1)');
      ctx.strokeStyle = '#141414'; ctx.lineWidth = 5; ctx.strokeRect(16, 16, W - 32, H - 32);
      fitText(ctx, def.header || 'AVIS', W / 2, 92, W - 60, 'sans', 92, '#141414');
      ctx.fillStyle = '#141414'; ctx.fillRect(40, 150, W - 80, 4);
      fitText(ctx, title, W / 2, 190, W - 70, 'sans', 30, '#1a1a1a');
      const yy = paragraph(ctx, body, W / 2, 236, W - 70, 'type', 27, '#1a1a1a', 1.4);
      paragraph(ctx, foot, W - 50, Math.max(yy + 30, H - 120), W - 100, 'type', 21, '#2a2a2a', 1.3, 'right');
      grain(ctx, W, H, 0.07);
      break;
    }
    case 'tract': {
      ctx.fillStyle = '#e4ddc8'; ctx.fillRect(0, 0, W, H);
      ctx.save(); ctx.translate(W / 2, H / 2); ctx.rotate(-0.02); ctx.translate(-W / 2, -H / 2);
      fitText(ctx, def.header || 'FRANÇAIS !', W / 2, 90, W - 60, 'type', 64, '#1e1e7a');
      // croix de Lorraine
      ctx.fillStyle = '#9a1e1e';
      ctx.fillRect(W / 2 - 7, 140, 14, 120); ctx.fillRect(W / 2 - 34, 162, 68, 12); ctx.fillRect(W / 2 - 46, 196, 92, 12);
      fitText(ctx, title, W / 2, 300, W - 60, 'type', 32, '#1a1a1a');
      paragraph(ctx, body, W / 2, 344, W - 70, 'type', 27, '#1a1a1a', 1.4);
      paragraph(ctx, foot, W / 2, H - 100, W - 80, 'type', 22, '#9a1e1e', 1.3);
      ctx.restore();
      grain(ctx, W, H, 0.1);
      break;
    }
    case 'programma': {
      // inscription électorale peinte sur un mur (comme à Pompéi)
      ctx.fillStyle = '#ece2cc'; ctx.fillRect(0, 0, W, H);
      wear(ctx, W, H, 30, 'rgba(160,130,90,0.12)');
      fitText(ctx, title, W / 2, H * 0.36, W - 30, 'roman', 64, '#a2261a');
      fitText(ctx, body, W / 2, H * 0.72, W - 40, 'roman', 34, '#2a2a2a');
      grain(ctx, W, H, 0.06);
      break;
    }
    case 'proclamation': {
      parchment(ctx, W, H, [222, 204, 160]);
      ctx.strokeStyle = '#6a2a1a'; ctx.lineWidth = 6; ctx.strokeRect(20, 20, W - 40, H - 40);
      // écu de gueules au lion d'or
      ctx.fillStyle = '#a8241e';
      ctx.beginPath(); ctx.moveTo(W / 2 - 50, 40); ctx.lineTo(W / 2 + 50, 40); ctx.lineTo(W / 2 + 50, 100);
      ctx.quadraticCurveTo(W / 2 + 50, 140, W / 2, 158); ctx.quadraticCurveTo(W / 2 - 50, 140, W / 2 - 50, 100); ctx.closePath(); ctx.fill();
      ICONS.lion(ctx, W / 2, 96, 100, '#e0b040');
      fitText(ctx, def.header || 'Oyez, oyez !', W / 2, 190, W - 70, 'gothic', 62, '#2a120a');
      fitText(ctx, title, W / 2, 252, W - 80, 'gothic2', 34, '#6a1a10');
      paragraph(ctx, body, W / 2, 296, W - 90, 'gothic2', 30, '#2a1a10', 1.3);
      paragraph(ctx, foot, W / 2, H - 110, W - 100, 'gothic2', 24, '#6a1a10', 1.3);
      break;
    }
    case 'affiche19': {
      ctx.fillStyle = def.bg || '#efe3c0'; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = '#2a2018'; ctx.lineWidth = 4; ctx.strokeRect(14, 14, W - 28, H - 28);
      ctx.lineWidth = 1.5; ctx.strokeRect(22, 22, W - 44, H - 44);
      fitText(ctx, def.header || '', W / 2, 70, W - 60, 'western', 40, def.accent || '#8a1a1a');
      if (def.icon && ICONS[def.icon]) ICONS[def.icon](ctx, W / 2, 180, 170, def.iconColor);
      fitText(ctx, title, W / 2, def.icon ? 300 : 160, W - 60, 'fat', 54, '#1e1a16');
      const yy = paragraph(ctx, body, W / 2, def.icon ? 350 : 220, W - 70, 'fell', 29, '#2a2018', 1.3);
      paragraph(ctx, foot, W / 2, Math.max(yy + 20, H - 120), W - 80, 'fat', 26, def.accent || '#8a1a1a', 1.25);
      wear(ctx, W, H, 40);
      grain(ctx, W, H, 0.06);
      break;
    }
    case 'tourism': {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, def.bg || '#2a7ab0');
      g.addColorStop(1, def.bg2 || '#f0c060');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
      // soleil + vagues stylisées
      ctx.fillStyle = 'rgba(255,240,200,0.85)';
      ctx.beginPath(); ctx.arc(W * 0.72, H * 0.3, 70, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      for (let i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.moveTo(0, H * 0.55 + i * 22);
        for (let x = 0; x <= W; x += 16) ctx.lineTo(x, H * 0.55 + i * 22 + Math.sin(x * 0.03 + i) * 8);
        ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath(); ctx.fill();
      }
      if (def.icon && ICONS[def.icon]) ICONS[def.icon](ctx, W * 0.3, H * 0.33, 200, def.iconColor);
      fitText(ctx, def.header || '', W / 2, 60, W - 60, 'sans', 30, '#ffffff', { shadow: 'rgba(0,0,0,0.35)' });
      fitText(ctx, title, W / 2, H * 0.62, W - 50, 'sans', 56, '#ffffff', { shadow: 'rgba(0,0,0,0.4)' });
      ctx.fillStyle = 'rgba(10,30,50,0.45)'; ctx.fillRect(30, H * 0.67, W - 60, 120);
      paragraph(ctx, body, W / 2, H * 0.68 + 6, W - 90, 'serifItalic', 32, '#ffffff', 1.2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, H - 80, W, 80);
      fitText(ctx, foot, W / 2, H - 40, W - 40, 'sans', 24, '#ffffff');
      break;
    }
    case 'hide': {
      // peau tendue peinte à l'ocre (préhistoire)
      ctx.fillStyle = '#c8a878'; ctx.fillRect(0, 0, W, H);
      wear(ctx, W, H, 60, 'rgba(120,80,40,0.12)');
      (def.motifs || ['deer', 'spiral', 'hand']).forEach((m, i) => {
        if (ICONS[m]) ICONS[m](ctx, W * (0.3 + (i % 2) * 0.4), H * (0.25 + i * 0.22), 200, i % 2 ? '#2a1a10' : '#8a3a1a');
      });
      grain(ctx, W, H, 0.1);
      break;
    }
    default: {
      // avis manuscrit simple
      parchment(ctx, W, H);
      fitText(ctx, title, W / 2, 80, W - 60, def.font || 'fell', 44, '#1e140c');
      paragraph(ctx, body, W / 2, 140, W - 80, def.font || 'fell', 24, '#1e140c', 1.3);
      paragraph(ctx, foot, W / 2, H - 100, W - 80, 'fellItalic', 22, '#3a2a1a', 1.3);
    }
  }
  return c;
}

export function posterTexture(def) {
  const key = 'poster:' + JSON.stringify(def);
  if (!texCache.has(key)) {
    const c = posterCanvas(def);
    const t = makeTex(c);
    t.userData.canvas = c;
    texCache.set(key, t);
  }
  return texCache.get(key);
}
