// Rendu cartographique de l'île à partir de sa vraie géographie, pour une
// époque donnée : mer graduée selon la profondeur, plages et dunes, vasières,
// marais (salants ou non), vignes, bois, et le pont à l'époque actuelle.

import { coastDist, atlanticSide, fordFactor, BRIDGE } from '../world/geo/shape.js';
import { marshMask, vineMask, forestMask } from '../world/terrain.js';

const rgb = (h) => [(h >> 16) & 255, (h >> 8) & 255, h & 255];

// M : { x0, x1, z0, z1, ppu } ; geo : entrée de ERA_GEO ; look : apparence de l'époque
export function renderIslandMap(M, geo, look, { detail = true } = {}) {
  const W = Math.round((M.x1 - M.x0) * M.ppu), H = Math.round((M.z1 - M.z0) * M.ppu);
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(W, H);
  const grass = rgb(look?.ground ?? 0x7a8a4a);
  const vine = rgb(look?.vineGreen ?? 0x6a7a3a);
  const SAND = [226, 207, 158], MUD = [150, 140, 112], MARSH = [122, 138, 110], SALT = [196, 208, 204], FOREST = [70, 92, 56];
  for (let j = 0; j < H; j++) {
    const z = M.z0 + (j + 0.5) / M.ppu;
    for (let i = 0; i < W; i++) {
      const x = M.x0 + (i + 0.5) / M.ppu;
      const d = coastDist(x, z, geo);
      let r, g, b;
      if (d < 0) {
        // mer : du turquoise des hauts-fonds au bleu profond du large
        const k = Math.min(1, -d / 140);
        r = 92 - 62 * k; g = 160 - 88 * k; b = 172 - 52 * k;
        if (d > -6) { const f = 1 + d / 6; r += 30 * f; g += 24 * f; b += 10 * f; }
      } else {
        const atl = atlanticSide(x, z);
        let col = grass;
        if (detail) {
          const ford = fordFactor(x, z, geo);
          if (ford > 0.3) col = MUD;
          else if (d < 3.5) col = atl > 0.5 ? SAND : MUD;
          else if (atl > 0.4 && d < 22) col = SAND;
          else {
            const mm = marshMask(x, z);
            if (mm > 0.45) col = look?.saltPans && ((Math.floor(x / 6) + Math.floor(z / 6)) % 3) ? SALT : MARSH;
            else if (look?.vines && vineMask(x, z) > 0.5) col = vine;
            else if (forestMask(x, z) > 0.4 || (look?.trees === 'oak' && look?.treeDensity > 1.2)) col = FOREST;
          }
        } else if (d < 3) col = SAND;
        const shade = 0.92 + Math.min(0.12, d / 400);
        [r, g, b] = col.map((v) => v * shade);
      }
      const k = (j * W + i) * 4;
      img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  if (geo?.bridge) {
    ctx.strokeStyle = '#f2efe8';
    ctx.lineWidth = Math.max(1.5, 6 * M.ppu);
    ctx.beginPath();
    BRIDGE.forEach(([x, z], k) => (k ? ctx.lineTo : ctx.moveTo).call(ctx, (x - M.x0) * M.ppu, (z - M.z0) * M.ppu));
    ctx.stroke();
  }
  return c;
}
