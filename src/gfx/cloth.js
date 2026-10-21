// Textures de tissus et matières pour les costumes, générées sur canvas :
// toile, lin, laine, denim, fourrure, cuir, carreaux gaulois, marinière,
// imprimé fleuri, cotte de mailles, gambison matelassé, dentelle, velours…
// Toutes sont mises en cache par (motif, couleurs).

import * as THREE from 'three';

const cache = new Map();

function hex(c) {
  return `#${c.toString(16).padStart(6, '0')}`;
}

function mix(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return `rgb(${Math.round(ar + (br - ar) * t)},${Math.round(ag + (bg - ag) * t)},${Math.round(ab + (bb - ab) * t)})`;
}

function grain(ctx, size, amount) {
  const img = ctx.getImageData(0, 0, size, size);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 255 * amount;
    d[i] = Math.max(0, Math.min(255, d[i] + n));
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
  }
  ctx.putImageData(img, 0, 0);
}

const PATTERNS = {
  // toile unie : fine trame croisée
  plain(ctx, s, c) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    ctx.globalAlpha = 0.08;
    for (let i = 0; i < s; i += 2) {
      ctx.fillStyle = i % 4 ? '#fff' : '#000';
      ctx.fillRect(0, i, s, 1);
      ctx.fillRect(i, 0, 1, s);
    }
    ctx.globalAlpha = 1;
    grain(ctx, s, 0.06);
  },
  // lin : fils irréguliers
  linen(ctx, s, c) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 260; i++) {
      ctx.strokeStyle = mix(c, Math.random() > 0.5 ? 0xffffff : 0x000000, 0.08 + Math.random() * 0.08);
      ctx.lineWidth = 0.6 + Math.random();
      const y = Math.random() * s;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(s, y + (Math.random() - 0.5) * 3); ctx.stroke();
      const x = Math.random() * s;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + (Math.random() - 0.5) * 3, s); ctx.stroke();
    }
    grain(ctx, s, 0.05);
  },
  // laine : bouloché, doux
  wool(ctx, s, c) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = mix(c, Math.random() > 0.5 ? 0xffffff : 0x000000, Math.random() * 0.14);
      ctx.beginPath();
      ctx.arc(Math.random() * s, Math.random() * s, 0.8 + Math.random() * 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, s, 0.08);
  },
  // denim : sergé diagonal bleu
  denim(ctx, s, c) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    ctx.lineWidth = 1;
    for (let i = -s; i < s * 2; i += 3) {
      ctx.strokeStyle = mix(c, 0xffffff, 0.12 + Math.random() * 0.06);
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + s, s); ctx.stroke();
    }
    grain(ctx, s, 0.1);
  },
  // fourrure : mèches orientées
  fur(ctx, s, c) {
    ctx.fillStyle = mix(c, 0x000000, 0.25); ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 1600; i++) {
      ctx.strokeStyle = mix(c, Math.random() > 0.4 ? 0xffffff : 0x000000, Math.random() * 0.35);
      ctx.lineWidth = 1 + Math.random() * 1.5;
      const x = Math.random() * s, y = Math.random() * s;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + (Math.random() - 0.5) * 4, y + 4, x + (Math.random() - 0.5) * 6, y + 7 + Math.random() * 6);
      ctx.stroke();
    }
  },
  // cuir : marbrures et usure
  leather(ctx, s, c) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = mix(c, Math.random() > 0.5 ? 0xffffff : 0x000000, 0.03 + Math.random() * 0.05);
      ctx.beginPath();
      ctx.ellipse(Math.random() * s, Math.random() * s, 4 + Math.random() * 14, 3 + Math.random() * 8, Math.random() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
    grain(ctx, s, 0.07);
  },
  // carreaux (braies gauloises, tartan simple)
  check(ctx, s, c, c2) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    const n = 4, w = s / n;
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = hex(c2);
    for (let i = 0; i < n; i++) {
      ctx.fillRect(i * w, 0, w * 0.35, s);
      ctx.fillRect(0, i * w, s, w * 0.35);
    }
    ctx.globalAlpha = 0.25;
    ctx.fillStyle = '#fff';
    for (let i = 0; i < n; i++) {
      ctx.fillRect(i * w + w * 0.6, 0, 1.5, s);
      ctx.fillRect(0, i * w + w * 0.6, s, 1.5);
    }
    ctx.globalAlpha = 1;
    grain(ctx, s, 0.06);
  },
  // rayures horizontales (marinière : 21 rayures bleu marine sur blanc)
  stripes(ctx, s, c, c2) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = hex(c2);
    const n = 8;
    for (let i = 0; i < n; i++) ctx.fillRect(0, i * (s / n), s, s / n * 0.38);
    grain(ctx, s, 0.04);
  },
  // rayures verticales fines (chemise, costume rayé)
  pinstripe(ctx, s, c, c2) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    ctx.fillStyle = hex(c2);
    for (let x = 0; x < s; x += 8) ctx.fillRect(x, 0, 1.5, s);
    grain(ctx, s, 0.05);
  },
  // bandes verticales bleu-blanc-rouge (écharpe tricolore)
  tricolor(ctx, s) {
    const cols = ['#24408e', '#f4f4f0', '#d0263a'];
    for (let i = 0; i < 3; i++) { ctx.fillStyle = cols[i]; ctx.fillRect((i * s) / 3, 0, s / 3 + 1, s); }
    grain(ctx, s, 0.03);
  },
  // imprimé fleuri (robes des années 1940)
  floral(ctx, s, c, c2) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * s, y = Math.random() * s;
      ctx.fillStyle = hex(c2);
      for (let p = 0; p < 5; p++) {
        const a = (p / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(x + Math.cos(a) * 3, y + Math.sin(a) * 3, 2.4, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = '#f3e3a0';
      ctx.beginPath(); ctx.arc(x, y, 1.6, 0, Math.PI * 2); ctx.fill();
    }
    grain(ctx, s, 0.04);
  },
  // cotte de mailles : anneaux imbriqués
  mail(ctx, s, c) {
    ctx.fillStyle = '#2a2a2c'; ctx.fillRect(0, 0, s, s);
    ctx.lineWidth = 1.4;
    for (let y = 0; y < s + 6; y += 5) {
      for (let x = (y / 5) % 2 ? 3 : 0; x < s + 6; x += 6) {
        ctx.strokeStyle = mix(c, 0xffffff, Math.random() * 0.3);
        ctx.beginPath(); ctx.arc(x, y, 2.8, 0, Math.PI * 2); ctx.stroke();
      }
    }
  },
  // gambison / matelassé : losanges cousus
  quilted(ctx, s, c) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = mix(c, 0x000000, 0.35);
    ctx.lineWidth = 1.5;
    for (let i = -s; i < s * 2; i += 12) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + s, s); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(i, s); ctx.lineTo(i + s, 0); ctx.stroke();
    }
    grain(ctx, s, 0.07);
  },
  // dentelle (cravate, col)
  lace(ctx, s, c) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    ctx.strokeStyle = 'rgba(120,110,95,0.35)';
    for (let y = 4; y < s; y += 9) {
      for (let x = 4; x < s; x += 9) {
        ctx.beginPath(); ctx.arc(x, y, 3, 0, Math.PI * 2); ctx.stroke();
      }
    }
  },
  // velours / drap fin : léger lustre
  velvet(ctx, s, c) {
    const g = ctx.createLinearGradient(0, 0, s, s);
    g.addColorStop(0, mix(c, 0xffffff, 0.08));
    g.addColorStop(0.5, hex(c));
    g.addColorStop(1, mix(c, 0x000000, 0.12));
    ctx.fillStyle = g; ctx.fillRect(0, 0, s, s);
    grain(ctx, s, 0.04);
  },
  // tricot côtelé (pull, chaussettes)
  knit(ctx, s, c) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    for (let x = 0; x < s; x += 4) {
      ctx.fillStyle = mix(c, 0x000000, 0.15);
      ctx.fillRect(x, 0, 1, s);
    }
    for (let y = 0; y < s; y += 3) {
      ctx.fillStyle = mix(c, 0xffffff, 0.06);
      ctx.fillRect(0, y, s, 1);
    }
    grain(ctx, s, 0.05);
  },
  // drap militaire grossier (feldgrau, gris-blanc)
  serge(ctx, s, c) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    ctx.lineWidth = 1;
    for (let i = -s; i < s * 2; i += 4) {
      ctx.strokeStyle = mix(c, 0x000000, 0.08);
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i - s, s); ctx.stroke();
    }
    grain(ctx, s, 0.09);
  },
  // paille tressée (chapeaux)
  straw(ctx, s, c) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 4) {
      for (let x = (y / 4) % 2 ? 0 : 4; x < s; x += 8) {
        ctx.fillStyle = mix(c, 0x000000, 0.18);
        ctx.fillRect(x, y, 4, 4);
      }
    }
    grain(ctx, s, 0.1);
  },
  // bois clair (sabots, manches d'outils)
  wood(ctx, s, c) {
    ctx.fillStyle = hex(c); ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 24; i++) {
      ctx.strokeStyle = mix(c, 0x000000, 0.1 + Math.random() * 0.15);
      ctx.lineWidth = 1 + Math.random();
      const x = Math.random() * s;
      ctx.beginPath(); ctx.moveTo(x, 0);
      ctx.bezierCurveTo(x + 6, s * 0.3, x - 6, s * 0.7, x, s); ctx.stroke();
    }
    grain(ctx, s, 0.05);
  },
};

export function clothTexture(pattern = 'plain', color = 0x888888, color2 = 0x222222) {
  const key = `${pattern}-${color}-${color2}`;
  if (cache.has(key)) return cache.get(key);
  const s = 64;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  (PATTERNS[pattern] || PATTERNS.plain)(ctx, s, color, color2);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const rep = { stripes: [1, 3], pinstripe: [3, 1], floral: [4, 4], check: [2, 2], mail: [3, 3], quilted: [2, 2], tricolor: [1, 1] }[pattern] || [2, 2];
  tex.repeat.set(rep[0], rep[1]);
  cache.set(key, tex);
  return tex;
}

// Matériau de tissu partagé (une instance par combinaison).
const matCache = new Map();
export function clothMat(spec) {
  // spec : couleur (nombre) ou { c, p, c2, rough, metal, emissive }
  const s = typeof spec === 'number' ? { c: spec } : spec;
  const key = JSON.stringify(s);
  if (matCache.has(key)) return matCache.get(key);
  const pattern = s.p || 'plain';
  const mat = new THREE.MeshStandardMaterial({
    map: clothTexture(pattern, s.c ?? 0x888888, s.c2 ?? 0x222222),
    roughness: s.rough ?? (pattern === 'leather' ? 0.6 : pattern === 'velvet' ? 0.7 : 0.9),
    metalness: s.metal ?? (pattern === 'mail' ? 0.6 : 0),
  });
  if (s.emissive) { mat.emissive = new THREE.Color(s.emissive); mat.emissiveIntensity = 0.4; }
  matCache.set(key, mat);
  return mat;
}

// Matériau uni non texturé (métal, peau, os…)
export function flatMat(color, rough = 0.7, metal = 0) {
  const key = `flat-${color}-${rough}-${metal}`;
  if (matCache.has(key)) return matCache.get(key);
  const mat = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  matCache.set(key, mat);
  return mat;
}
