// Relief de l'île, océan (vagues et écume calculées sur le GPU, marées) et
// ciel procédural (dégradé, soleil, lune, étoiles, nuages).
//
// heightAt(x, z) est la source unique de vérité pour l'altitude du sol :
// terrain, joueur, PNJ, décor et quêtes l'utilisent tous.

import * as THREE from 'three';
import { fbm, smoothstep, clamp } from '../core/rng.js';
import { grassDetailTexture } from '../gfx/textures.js';

export const HALF_L = 210;
export const HALF_W = 58;
export const TERRAIN_W = 470;
export const TERRAIN_D = 170;

// ---------- Masques géographiques ----------
export function islandMask(x, z) {
  const nx = x / HALF_L, nz = z / HALF_W;
  let m = 1 - Math.sqrt(nx * nx * 0.92 + nz * nz);
  m -= Math.exp(-(((x + 40) / 16) ** 2)) * 0.38;              // isthme du Martray
  m -= Math.exp(-(((x + 134) / 24) ** 2 + ((z + 54) / 11) ** 2)) * 0.55; // anse du Fier d'Ars
  m += Math.exp(-(((x + 190) / 18) ** 2 + ((z + 6) / 26) ** 2)) * 0.12;  // pointe des Baleines
  m += (fbm(x * 0.02 + 10, z * 0.02, 4, 7) - 0.5) * 0.2;
  return m;
}

// Marais (Fier d'Ars, Lilleau des Niges, Loix) : terres basses à fleur d'eau
export function marshMask(x, z) {
  const a = Math.exp(-(((x + 128) / 40) ** 2 + ((z + 36) / 16) ** 2));
  const b = Math.exp(-(((x + 42) / 18) ** 2 + ((z + 28) / 12) ** 2));
  const c = Math.exp(-(((x + 92) / 18) ** 2 + ((z + 30) / 10) ** 2));
  return Math.max(a, b * 0.9, c * 0.8);
}
// Vignobles : centre-sud (Bois-Plage, La Couarde) et est (Sainte-Marie, La Flotte)
export function vineMask(x, z) {
  const a = Math.exp(-(((x - 30) / 50) ** 2 + ((z - 12) / 18) ** 2));
  const b = Math.exp(-(((x - 100) / 34) ** 2 + ((z - 0) / 20) ** 2));
  const c = Math.exp(-(((x + 10) / 26) ** 2 + ((z - 20) / 12) ** 2));
  return Math.max(a, b, c * 0.8);
}
// Bois et pinèdes : Trousse-Chemise (nord-ouest), Lizay, bois de la Combe à l'eau
export function forestMask(x, z) {
  const a = Math.exp(-(((x + 112) / 20) ** 2 + ((z + 4) / 14) ** 2));
  const b = Math.exp(-(((x + 158) / 16) ** 2 + ((z - 18) / 12) ** 2));
  const c = Math.exp(-(((x - 52) / 20) ** 2 + ((z - 30) / 9) ** 2));
  const d = Math.exp(-(((x + 20) / 14) ** 2 + ((z - 34) / 8) ** 2));
  return Math.max(a, b, c, d);
}

export function rawHeight(x, z) {
  const m = islandMask(x, z);
  if (m < 0) return -3 + m * 7;
  let h = 0.55 + m * 2.2 + (fbm(x * 0.06, z * 0.06, 3, 21) - 0.5) * 0.5;
  // cordon de dunes, plus haut sur la côte sud (Pertuis d'Antioche)
  const band = smoothstep(0.0, 0.05, m) * (1 - smoothstep(0.1, 0.2, m));
  const south = z > 0 ? 1 : 0.35;
  h += band * south * fbm(x * 0.05, z * 0.05, 3, 13) * 4.2;
  // marais : terres basses
  const mm = marshMask(x, z);
  h = h * (1 - mm * 0.75) + mm * 0.62 * 0.75;
  return h;
}

// ---------- Aplanissement de la ville active et bassins creusés ----------
let flat = null;      // { x, z, r, h }
let carves = [];      // { x0, z0, x1, z1, depth }

export function setTownFlatten(x, z, r, h) { flat = { x, z, r, h }; }
export function setCarves(list) { carves = list || []; }

export function heightAt(x, z) {
  let h = rawHeight(x, z);
  if (flat && h > 0) {
    const d = Math.hypot(x - flat.x, z - flat.z);
    const outer = flat.r * 1.6;
    if (d < outer) {
      const w = (1 - smoothstep(flat.r, outer, d)) * smoothstep(0.05, 0.55, h);
      h = h + (flat.h - h) * w;
    }
  }
  for (const c of carves) {
    if (c.r !== undefined) {
      if (Math.hypot(x - c.cx, z - c.cz) < c.r) h = Math.min(h, c.depth);
    } else if (x > c.x0 && x < c.x1 && z > c.z0 && z < c.z1) {
      h = Math.min(h, c.depth);
    }
  }
  return h;
}

// ---------- Couleurs du sol selon l'époque ----------
const C = (hex) => new THREE.Color(hex);
const SAND = C(0xe2cf9e), WETSAND = C(0xbfae84), DUNE = C(0xcfc392);
const MARSH = C(0x7a8a6e), SALTPAN = C(0xc4d0cc), BUND = C(0x8a8064);
const tmp = new THREE.Color();

export function terrainColor(x, z, h, look) {
  const out = new THREE.Color();
  if (h < 0.15) return out.copy(WETSAND);
  const m = islandMask(x, z);
  if (h < 0.75 && m < 0.06) return out.copy(SAND);
  const grass = tmp.set(look.ground);
  // cordon dunaire
  if (m < 0.12) {
    const t = smoothstep(0.03, 0.12, m);
    return out.copy(DUNE).lerp(grass, t * 0.7);
  }
  const mm = marshMask(x, z);
  if (mm > 0.45 && h < 1.2) {
    if (look.saltPans && mm > 0.55) {
      // mosaïque de bassins (œillets) et de bossis
      const cx = Math.floor((x + 400) / 5), cz = Math.floor((z + 400) / 5);
      const edge = ((x + 400) % 5) < 0.8 || ((z + 400) % 5) < 0.8;
      if (edge) return out.copy(BUND);
      return out.copy((cx + cz) % 3 === 0 ? MARSH : SALTPAN);
    }
    return out.copy(MARSH).lerp(grass, 0.25);
  }
  const vm = vineMask(x, z);
  if (look.vines && vm > 0.5) {
    const row = Math.floor((x + 400) / 2.2) % 2 === 0;
    return out.copy(row ? C(0x7e6a42) : C(look.vineGreen ?? 0x6a7a3a));
  }
  const fm = forestMask(x, z);
  if (fm > 0.4) return out.copy(grass).lerp(C(look.forestFloor ?? 0x4a5236), 0.6);
  // variations de prairie
  const n = fbm(x * 0.03, z * 0.03, 3, 5);
  return out.copy(grass).multiplyScalar(0.88 + n * 0.24);
}

// ======================================================================
//  TERRAIN
// ======================================================================
export class Terrain {
  constructor(parent) {
    const segX = 300, segZ = Math.round(segX * TERRAIN_D / TERRAIN_W);
    const geo = new THREE.PlaneGeometry(TERRAIN_W, TERRAIN_D, segX, segZ);
    geo.rotateX(-Math.PI / 2);
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 3), 3));
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true, map: grassDetailTexture(110), roughness: 1, metalness: 0,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    parent.add(this.mesh);
  }

  refresh(look) {
    const g = this.mesh.geometry;
    const pos = g.attributes.position, col = g.attributes.color;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      const h = heightAt(x, z);
      pos.setY(i, h);
      const c = terrainColor(x, z, h, look);
      col.setXYZ(i, c.r, c.g, c.b);
    }
    pos.needsUpdate = true;
    col.needsUpdate = true;
    g.computeVertexNormals();
    g.computeBoundingSphere();
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
  t.repeat.set(60, 60);
  return t;
}

export class Ocean {
  constructor(parent) {
    const W = 1100, D = 800;
    const geo = new THREE.PlaneGeometry(W, D, 260, 190);
    geo.rotateX(-Math.PI / 2);
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
    this.mesh = new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = -1;
    scene.add(this.mesh);
  }

  follow(camera) { this.mesh.position.copy(camera.position); }
}

export function clampToIsland(x, z) {
  return { x: clamp(x, -HALF_L - 40, HALF_L + 40), z: clamp(z, -HALF_W - 45, HALF_W + 45) };
}
