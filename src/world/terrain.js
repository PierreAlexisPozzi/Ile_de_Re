// Relief de l'île, océan (vagues et écume calculées sur le GPU, marées) et
// ciel procédural (dégradé, soleil, lune, étoiles, nuages).
//
// heightAt(x, z) est la source unique de vérité pour l'altitude du sol :
// terrain, joueur, PNJ, décor et quêtes l'utilisent tous.

import * as THREE from 'three';
import { fbm, smoothstep, clamp } from '../core/rng.js';
import { coastDist, atlanticSide, fordFactor, WORLD } from './geo/shape.js';
import { grassDetailTexture } from '../gfx/textures.js';

// Fenêtre du terrain (l'île réelle à l'échelle 1 unité ≈ 15 m, plus la côte
// continentale de La Rochelle à l'est, au bout du pont)
export const TX0 = -860, TZ0 = -470, TSTEP = 3, TNX = 648, TNZ = 314;
export const TX1 = TX0 + TNX * TSTEP, TZ1 = TZ0 + TNZ * TSTEP;
export { WORLD };

// ---------- Masques géographiques ----------
// Distance à la côte de l'époque (unités), positive à terre
export { coastDist, atlanticSide };
// compatibilité : 0 sur la côte, 1 à 60 unités dans les terres
export function islandMask(x, z) { return clamp(coastDist(x, z) / 60, -1, 1); }

function ell(x, z, cx, cz, rx, rz, a = 0) {
  const c = Math.cos(a), s = Math.sin(a);
  const dx = x - cx, dz = z - cz;
  const u = (dx * c + dz * s) / rx, v = (-dx * s + dz * c) / rz;
  return Math.exp(-(u * u + v * v));
}
// Marais (salants ou naturels) : autour du Fier d'Ars, Loix, Lilleau des Niges, La Couarde
export function marshMask(x, z) {
  return Math.max(
    ell(x, z, -500, -62, 120, 42),          // entre Ars et le Fier
    ell(x, z, -575, -170, 38, 75, 0.2),     // rive ouest du Fier (Saint-Clément)
    ell(x, z, -440, -245, 72, 34),          // Lilleau des Niges, Les Portes
    ell(x, z, -240, -130, 95, 55),          // Loix
    ell(x, z, -300, -40, 95, 26),           // le Martray, La Couarde
    ell(x, z, -80, -50, 70, 20),            // fond de la Fosse de Loix
  ) * (1 - smoothstep(0.35, 0.8, atlanticSide(x, z)) * 0.6);
}
// Vignobles : La Couarde, Le Bois-Plage, Saint-Martin, La Flotte, Sainte-Marie
export function vineMask(x, z) {
  return Math.max(
    ell(x, z, -40, 50, 90, 32, -0.3),
    ell(x, z, 130, 60, 120, 45, -0.3),
    ell(x, z, 330, 180, 110, 60, -0.5),
    ell(x, z, 570, 270, 80, 45, -0.3),
    ell(x, z, -650, -120, 48, 40) * 0.9,
  );
}
// Bois et pinèdes : Trousse-Chemise, le Lizay, dunes boisées de la côte sud
export function forestMask(x, z) {
  return Math.max(
    ell(x, z, -415, -405, 55, 20, 0.3),
    ell(x, z, -530, -410, 55, 18, -0.1),
    ell(x, z, -705, -150, 22, 60, 0.45),
    ell(x, z, -20, 110, 120, 16, -0.36),
    ell(x, z, 230, 205, 120, 16, -0.5),
  );
}

export function rawHeight(x, z) {
  const d = coastDist(x, z);
  const atl = atlanticSide(x, z);
  if (d < 0) {
    // estran en pente douce : large au nord et dans le Fier, plus court face à l'Atlantique
    const slope = 0.035 + atl * 0.055;
    return Math.max(-16, 0.12 + d * slope);
  }
  let h = 0.12 + Math.min(d, 6) * 0.11;
  h += smoothstep(4, 45, d) * 1.4;
  h += (fbm(x * 0.018, z * 0.018, 3, 21) - 0.5) * 1.3 * smoothstep(6, 35, d);
  // cordon dunaire face à l'Atlantique
  const dune = atl * smoothstep(1.5, 7, d) * (1 - smoothstep(16, 42, d));
  h += dune * (1.8 + fbm(x * 0.035, z * 0.035, 3, 13) * 7.5);
  // marais : terres basses à fleur d'eau
  const mm = marshMask(x, z);
  h = h + (0.55 + (fbm(x * 0.05, z * 0.05, 2, 9) - 0.5) * 0.2 - h) * Math.min(1, mm * 1.15) * smoothstep(1, 6, d);
  // gués du Moyen Âge : vase découverte à marée basse
  const ford = fordFactor(x, z);
  if (ford > 0) h = h + (-0.05 - h) * ford;
  return h;
}

// ---------- Aplanissement de la ville active et bassins creusés ----------
let flat = null;      // { x, z, r, h }
let carves = [];      // repère local de la ville : { x0, z0, x1, z1, depth } ou { cx, cz, r, depth }
let carveT = { x: 0, z: 0, c: 1, s: 0 };

export function setTownFlatten(x, z, r, h) { flat = { x, z, r, h }; }
// rot : orientation de la ville (les bassins sont décrits dans son repère local)
export function setCarves(list, tx = 0, tz = 0, rot = 0) {
  carves = list || [];
  carveT = { x: tx, z: tz, c: Math.cos(rot), s: Math.sin(rot) };
}

// Intérieur visité : le sol de la pièce remplace le relief
let indoor = null;
export function setIndoor(b) { indoor = b; }

export function heightAt(x, z) {
  if (indoor && x > indoor.x0 && x < indoor.x1 && z > indoor.z0 && z < indoor.z1) return indoor.y;
  let h = rawHeight(x, z);
  if (flat && h > 0) {
    const d = Math.hypot(x - flat.x, z - flat.z);
    const outer = flat.r * 1.6;
    if (d < outer) {
      const w = (1 - smoothstep(flat.r, outer, d)) * smoothstep(0.05, 0.55, h);
      h = h + (flat.h - h) * w;
    }
  }
  if (carves.length) {
    // monde -> repère local de la ville (inverse de la rotation Y)
    const dx = x - carveT.x, dz = z - carveT.z;
    const lx = dx * carveT.c - dz * carveT.s, lz = dx * carveT.s + dz * carveT.c;
    for (const c of carves) {
      if (c.r !== undefined) {
        if (Math.hypot(lx - c.cx, lz - c.cz) < c.r) h = Math.min(h, c.depth);
      } else if (lx > c.x0 && lx < c.x1 && lz > c.z0 && lz < c.z1) {
        h = Math.min(h, c.depth);
      }
    }
  }
  return h;
}

// ---------- Couleurs du sol selon l'époque ----------
const C = (hex) => new THREE.Color(hex);
const SAND = C(0xe2cf9e), WETSAND = C(0xbfae84), DUNE = C(0xd2c696), MUD = C(0x8a8068);
const MARSH = C(0x7a8a6e), SALTPAN = C(0xc4d0cc), BUND = C(0x8a8064);
const tmp = new THREE.Color();

export function terrainColor(x, z, h, look) {
  const out = new THREE.Color();
  const d = coastDist(x, z);
  const atl = atlanticSide(x, z);
  if (h < 0.18) return out.copy(WETSAND).lerp(MUD, 1 - atl);
  const grass = tmp.set(look.ground);
  // plage et cordon dunaire (côte atlantique), vase et prés salés ailleurs
  if (d < 3.5) return out.copy(atl > 0.5 ? SAND : MUD).lerp(grass, atl > 0.5 ? 0 : 0.35);
  if (atl > 0.4 && d < 40) {
    const t = smoothstep(14, 40, d);
    return out.copy(DUNE).lerp(grass, t * 0.85);
  }
  const mm = marshMask(x, z);
  if (mm > 0.42 && h < 1.2) {
    if (look.saltPans && mm > 0.5) {
      // mosaïque de bassins (œillets) et de bossis
      const cx = Math.floor((x + 2000) / 5), cz = Math.floor((z + 2000) / 5);
      const edge = ((x + 2000) % 5) < 0.8 || ((z + 2000) % 5) < 0.8;
      if (edge) return out.copy(BUND);
      return out.copy((cx + cz) % 3 === 0 ? MARSH : SALTPAN);
    }
    return out.copy(MARSH).lerp(grass, 0.25);
  }
  const vm = vineMask(x, z);
  if (look.vines && vm > 0.5) {
    const row = Math.floor((x + 2000) / 2.2) % 2 === 0;
    return out.copy(row ? C(0x7e6a42) : C(look.vineGreen ?? 0x6a7a3a));
  }
  const fm = forestMask(x, z);
  if (fm > 0.4) return out.copy(grass).lerp(C(look.forestFloor ?? 0x4a5236), 0.6);
  // variations de prairie
  const n = fbm(x * 0.03, z * 0.03, 3, 5);
  return out.copy(grass).multiplyScalar(0.88 + n * 0.24);
}

// ======================================================================
//  TERRAIN : grille globale (3 unités) + maillage fin autour de la ville
// ======================================================================
function gridGeometry(x0, z0, nx, nz, step) {
  const pos = new Float32Array((nx + 1) * (nz + 1) * 3);
  const uv = new Float32Array((nx + 1) * (nz + 1) * 2);
  let k = 0, u = 0;
  for (let j = 0; j <= nz; j++) {
    for (let i = 0; i <= nx; i++) {
      pos[k++] = x0 + i * step; pos[k++] = 0; pos[k++] = z0 + j * step;
      uv[u++] = i / nx; uv[u++] = 1 - j / nz;
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(pos.length), 3));
  return g;
}
function gridIndex(nx, nz, skip) {
  const idx = [];
  for (let j = 0; j < nz; j++) {
    for (let i = 0; i < nx; i++) {
      if (skip && skip(i, j)) continue;
      const a = j * (nx + 1) + i, b = a + 1, c = a + nx + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
  }
  return idx.length > 65535 ? new THREE.Uint32BufferAttribute(idx, 1) : new THREE.Uint16BufferAttribute(idx, 1);
}

export class Terrain {
  constructor(parent) {
    this.parent = parent;
    const geo = gridGeometry(TX0, TZ0, TNX, TNZ, TSTEP);
    geo.setIndex(gridIndex(TNX, TNZ));
    this.mat = new THREE.MeshStandardMaterial({
      vertexColors: true, map: grassDetailTexture(260), roughness: 1, metalness: 0,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.receiveShadow = true;
    parent.add(this.mesh);
    this.patch = null;
  }

  fill(g, look) {
    const pos = g.attributes.position, col = g.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = heightAt(x, z);
      pos.setY(i, h - (g.userData.skirt?.[i] ?? 0));
      const c = terrainColor(x, z, h, look);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
  }

  // refresh(look, { x, z, half }) : zone fine (1 unité) autour de la ville
  refresh(look, focus) {
    const g = this.mesh.geometry;
    if (this.patch) { this.patch.geometry.dispose(); this.parent.remove(this.patch); this.patch = null; }
    let skip = null;
    if (focus) {
      const i0 = Math.floor((focus.x - focus.half - TX0) / TSTEP), i1 = Math.ceil((focus.x + focus.half - TX0) / TSTEP);
      const j0 = Math.floor((focus.z - focus.half - TZ0) / TSTEP), j1 = Math.ceil((focus.z + focus.half - TZ0) / TSTEP);
      skip = (i, j) => i >= i0 && i < i1 && j >= j0 && j < j1;
      const px0 = TX0 + i0 * TSTEP, pz0 = TZ0 + j0 * TSTEP;
      const nx = (i1 - i0) * TSTEP, nz = (j1 - j0) * TSTEP;
      const pg = gridGeometry(px0, pz0, nx, nz, 1);
      pg.setIndex(gridIndex(nx, nz));
      // jupe autour de la zone fine pour masquer les raccords
      const skirt = new Float32Array(pg.attributes.position.count);
      pg.userData.skirt = skirt;
      this.fill(pg, look);
      this.patch = new THREE.Mesh(pg, this.mat);
      this.patch.receiveShadow = true;
      this.patch.add(this.skirtMesh(px0, pz0, nx, nz, look));
      this.parent.add(this.patch);
    }
    g.setIndex(gridIndex(TNX, TNZ, skip));
    this.fill(g, look);
  }

  skirtMesh(x0, z0, nx, nz, look) {
    const ring = [];
    for (let i = 0; i < nx; i++) ring.push([x0 + i, z0]);
    for (let j = 0; j < nz; j++) ring.push([x0 + nx, z0 + j]);
    for (let i = nx; i > 0; i--) ring.push([x0 + i, z0 + nz]);
    for (let j = nz; j > 0; j--) ring.push([x0, z0 + j]);
    ring.push(ring[0]);
    const pos = [], col = [], idx = [];
    for (const [x, z] of ring) {
      const h = heightAt(x, z);
      const c = terrainColor(x, z, h, look);
      pos.push(x, h, z, x, h - 2.5, z);
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
    }
    for (let k = 0; k < ring.length - 1; k++) {
      const a = k * 2;
      idx.push(a, a + 1, a + 2, a + 2, a + 1, a + 3, a, a + 2, a + 1, a + 2, a + 3, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(ring.length * 4), 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    return new THREE.Mesh(g, this.mat);
  }
}

// ======================================================================
//  OCÉAN : vagues dans le vertex shader, écume sur les hauts-fonds
// ======================================================================
function waterNormalMap() {
  const s = 256;
  const c = document.createElement('canvas');
  c.width = c.height = s;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(s, s);
  const hgt = (x, y) => {
    let v = 0;
    for (let o = 0; o < 4; o++) {
      const f = 2 ** o * 2;
      v += Math.sin((x / s) * Math.PI * 2 * f + o * 1.7) * Math.cos((y / s) * Math.PI * 2 * f * 0.8 + o) / (o + 1);
      v += Math.sin(((x + y) / s) * Math.PI * 2 * (f + 1) + o * 2.3) / (o + 2);
    }
    return v;
  };
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const dx = hgt(x + 1, y) - hgt(x - 1, y);
      const dy = hgt(x, y + 1) - hgt(x, y - 1);
      const n = new THREE.Vector3(-dx * 2.2, -dy * 2.2, 1).normalize();
      const i = (y * s + x) * 4;
      img.data[i] = (n.x * 0.5 + 0.5) * 255;
      img.data[i + 1] = (n.y * 0.5 + 0.5) * 255;
      img.data[i + 2] = (n.z * 0.5 + 0.5) * 255;
      img.data[i + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(140, 80);
  return t;
}

export class Ocean {
  constructor(parent) {
    const W = 2600, D = 1500;
    const geo = new THREE.PlaneGeometry(W, D, 420, 240);
    geo.rotateX(-Math.PI / 2);
    geo.translate(100, 0, 0);
    // profondeur du fond sous chaque sommet (couleur et écume)
    const pos = geo.attributes.position;
    const depth = new Float32Array(pos.count);
    for (let i = 0; i < pos.count; i++) depth[i] = rawHeight(pos.getX(i), pos.getZ(i));
    geo.setAttribute('aGround', new THREE.BufferAttribute(depth, 1));
    this.geo = geo;
    this.uTime = { value: 0 };
    this.uShallow = { value: new THREE.Color(0x4aa0a8) };
    this.uDeep = { value: new THREE.Color(0x1e4a6a) };
    this.normalMap = waterNormalMap();
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.9,
      normalMap: this.normalMap, normalScale: new THREE.Vector2(0.35, 0.35),
    });
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = this.uTime;
      shader.uniforms.uShallow = this.uShallow;
      shader.uniforms.uDeep = this.uDeep;
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>
          uniform float uTime;
          attribute float aGround;
          varying float vGround;
          varying vec2 vWorldXZ;`)
        .replace('#include <begin_vertex>', `
          vec3 transformed = vec3(position);
          vec4 wpos = modelMatrix * vec4(position, 1.0);
          float shoal = clamp(1.0 - (-aGround) / 6.0, 0.15, 1.0);
          transformed.y += (sin(wpos.x * 0.05 + uTime * 0.6) * 0.16
                         + cos(wpos.z * 0.045 + uTime * 0.75) * 0.13
                         + sin((wpos.x + wpos.z) * 0.13 + uTime * 1.4) * 0.05) * shoal;
          vGround = aGround;
          vWorldXZ = wpos.xz;`);
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>
          uniform float uTime;
          uniform vec3 uShallow;
          uniform vec3 uDeep;
          varying float vGround;
          varying vec2 vWorldXZ;`)
        .replace('#include <color_fragment>', `#include <color_fragment>
          float shallowK = smoothstep(-5.0, -0.2, vGround);
          diffuseColor.rgb = mix(uDeep, uShallow, shallowK);
          // écume des vagues qui déferlent sur le rivage
          float foamBand = smoothstep(-0.9, 0.1, vGround);
          float ripple = 0.5 + 0.5 * sin(vGround * 9.0 - uTime * 2.2 + sin(vWorldXZ.x * 0.15) * 2.0);
          float foam = foamBand * smoothstep(0.55, 0.95, ripple);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.95, 0.97, 0.96), foam * 0.8);
          diffuseColor.a = mix(0.72, 0.94, 1.0 - shallowK * 0.6);`);
    };
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = 1;
    parent.add(this.mesh);
    this.tide = 0;
  }

  setColors(deep, shallow) {
    this.uDeep.value.set(deep);
    this.uShallow.value.set(shallow);
  }

  // Marée : demi-période de ~6 min de jeu réel ; amplitude ±0.45
  update(dt, time, gameHours) {
    this.uTime.value = time;
    this.tide = Math.sin((gameHours / 12.4) * Math.PI * 2) * 0.45;
    this.mesh.position.y = this.tide;
    this.normalMap.offset.set(time * 0.004, time * 0.0025);
  }

  // Recalcule la profondeur (après creusement de bassins)
  refreshDepth() {
    const pos = this.geo.attributes.position;
    const a = this.geo.attributes.aGround;
    for (let i = 0; i < pos.count; i++) a.array[i] = heightAt(pos.getX(i), pos.getZ(i));
    a.needsUpdate = true;
  }
}

// ======================================================================
//  CIEL : dégradé, soleil, lune, étoiles et nuages procéduraux
// ======================================================================
export class Sky {
  constructor(scene) {
    this.uniforms = {
      topColor: { value: new THREE.Color(0x6fa0d0) },
      horizonColor: { value: new THREE.Color(0xd8e0e4) },
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      sunColor: { value: new THREE.Color(0xfff2d0) },
      night: { value: 0 },
      cloudiness: { value: 0.35 },
      cloudColor: { value: new THREE.Color(0xffffff) },
      time: { value: 0 },
    };
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: this.uniforms,
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          gl_Position = p.xyww;
        }`,
      fragmentShader: `
        uniform vec3 topColor, horizonColor, sunDir, sunColor, cloudColor;
        uniform float night, cloudiness, time;
        varying vec3 vDir;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
        }
        float fbm(vec2 p) {
          float v = 0.0, a = 0.5;
          for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.02; a *= 0.5; }
          return v;
        }
        void main() {
          vec3 d = normalize(vDir);
          float h = max(d.y, -0.2);
          vec3 col = mix(horizonColor, topColor, pow(max(h, 0.0), 0.55));
          if (d.y < 0.0) col = mix(horizonColor, horizonColor * 0.55, min(1.0, -d.y * 4.0));
          // halo et disque solaire
          float sd = max(dot(d, normalize(sunDir)), 0.0);
          col += sunColor * (pow(sd, 6.0) * 0.25 + pow(sd, 60.0) * 0.5) * (1.0 - night);
          col = mix(col, sunColor * 1.6, smoothstep(0.9993, 0.9997, sd) * (1.0 - night * 0.9));
          // lune (opposée au soleil)
          float md = max(dot(d, -normalize(sunDir)), 0.0);
          col = mix(col, vec3(0.92, 0.94, 0.98), smoothstep(0.9990, 0.9994, md) * night);
          col += vec3(0.25, 0.3, 0.4) * pow(md, 30.0) * 0.4 * night;
          // étoiles
          if (night > 0.01 && d.y > 0.0) {
            vec2 sp = d.xz / (d.y + 0.25) * 140.0;
            float st = hash(floor(sp));
            float tw = 0.6 + 0.4 * sin(time * 3.0 + st * 40.0);
            col += vec3(1.0) * step(0.9965, st) * night * tw * smoothstep(0.0, 0.25, d.y);
          }
          // nuages
          if (d.y > 0.0) {
            vec2 cp = d.xz / (d.y + 0.12) * 1.6 + vec2(time * 0.006, time * 0.002);
            float n = fbm(cp);
            float c = smoothstep(1.0 - cloudiness * 0.95, 1.15 - cloudiness * 0.6, n + 0.15);
            vec3 cc = cloudColor * (0.75 + 0.35 * fbm(cp * 2.0 + 3.0));
            cc += sunColor * pow(sd, 4.0) * 0.3 * (1.0 - night);
            col = mix(col, cc, c * smoothstep(0.0, 0.18, d.y) * 0.92);
          }
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(1700, 32, 16), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    scene.add(this.mesh);
  }

  follow(camera) { this.mesh.position.copy(camera.position); }
}

export function clampToIsland(x, z) {
  return { x: clamp(x, TX0 + 20, TX1 - 20), z: clamp(z, TZ0 + 20, TZ1 - 20) };
}
