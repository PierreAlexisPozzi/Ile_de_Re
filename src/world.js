// Génération procédurale de l'Île de Ré : terrain texturé, océan, plages,
// marais salants, forêts de pins, vignobles, bâtiments réalistes par époque,
// chemins, éléments d'époque — avec système de collisions.

import * as THREE from 'three';
import { LOCATIONS } from './locations.js';
import { getEra } from './eras.js';
import {
  stoneTexture, plasterTexture, roofTexture, thatchTexture, woodTexture,
  paveTexture, dirtTexture, asphaltTexture, grassDetailTexture,
  foliageTexture, barkTexture,
} from './textures.js';

const ISLAND_SIZE = 420;
const ISLAND_WIDTH = 140;
const TERRAIN_SEG = 200;
const WORLD_SIZE = 520;

function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noise2d(x, y, seed = 1) {
  const i = Math.floor(x), j = Math.floor(y);
  const fx = x - i, fy = y - j;
  const r = (a, b) => {
    const s = Math.sin((a * 374761393 + b * 668265263 + seed * 982451653)) * 43758.5453;
    return s - Math.floor(s);
  };
  const a = r(i, j), b = r(i + 1, j), c = r(i, j + 1), d = r(i + 1, j + 1);
  const ux = fx * fx * (3 - 2 * fx);
  const uy = fy * fy * (3 - 2 * fy);
  return (a * (1 - ux) + b * ux) * (1 - uy) + (c * (1 - ux) + d * ux) * uy;
}

function fbm(x, y, octaves = 4, seed = 1) {
  let sum = 0, amp = 0.5, freq = 1;
  for (let i = 0; i < octaves; i++) {
    sum += amp * noise2d(x * freq, y * freq, seed + i);
    amp *= 0.5; freq *= 2;
  }
  return sum;
}

function islandMask(x, z) {
  const nx = x / (ISLAND_SIZE / 2);
  const nz = z / (ISLAND_WIDTH / 2);
  let m = 1 - Math.sqrt(nx * nx * 0.9 + nz * nz);
  const pinch = Math.exp(-Math.pow((x + 40) / 18, 2)) * 0.45;
  m -= pinch;
  m += (fbm(x * 0.02 + 10, z * 0.02, 4, 7) - 0.5) * 0.25;
  return m;
}

export function heightAt(x, z) {
  const mask = islandMask(x, z);
  if (mask < 0) return -3 + mask * 6;
  const baseH = 0.5 + mask * 2.0;
  const dune = Math.exp(-Math.pow((Math.abs(z) - ISLAND_WIDTH * 0.35) / 8, 2)) *
    fbm(x * 0.04, z * 0.04, 3, 13) * 4 * mask;
  const marshMask = Math.max(0, (1 - Math.hypot((x + 130) / 70, (z + 40) / 30)));
  const marsh = -marshMask * 1.2;
  return baseH + dune + marsh;
}

function terrainColor(x, z, h, era) {
  const colors = {
    beach:  new THREE.Color(0xe6d4a4),
    grass:  new THREE.Color(era.ground),
    marsh:  new THREE.Color(0x8a9080),
    forest: new THREE.Color(0x445836),
    salt:   new THREE.Color(0xc8d4d0),
  };
  if (h < 0.6) return colors.beach;
  const marshMask = Math.max(0, 1 - Math.hypot((x + 130) / 65, (z + 40) / 28));
  if (marshMask > 0.4 && h < 1.4) {
    const q = (Math.floor(x / 4) + Math.floor(z / 4)) % 2 === 0;
    return q ? colors.salt : colors.marsh;
  }
  const vineMask = Math.max(0, 1 - Math.hypot((x - 25) / 30, (z - 35) / 14));
  if (vineMask > 0.4 && h > 1) return new THREE.Color(0x9a8a4a);
  const forestMask = Math.max(0, 1 - Math.hypot((x + 100) / 16, (z + 5) / 10));
  if (forestMask > 0.3 && h > 1) return colors.forest;
  return colors.grass;
}

// ---- Matériaux de bâtiment par style d'époque ----
function wallMaterial(style) {
  switch (style) {
    case 'huts':
      return new THREE.MeshStandardMaterial({ map: woodTexture(0x6a4a2a, 1), roughness: 0.95 });
    case 'roman':
      return new THREE.MeshStandardMaterial({ map: stoneTexture(0xd8cdb0, 1, false), roughness: 0.9 });
    case 'medieval':
      return new THREE.MeshStandardMaterial({ map: stoneTexture(0xb6a888, 1, true), roughness: 0.95 });
    case 'wwii':
      return new THREE.MeshStandardMaterial({ map: stoneTexture(0x8a8a80, 1, true), color: 0x9a9a90, roughness: 1 });
    case 'xvii':
    case 'xix':
    case 'contemporary':
    default:
      return new THREE.MeshStandardMaterial({ map: plasterTexture(0xeee6d2, 1), roughness: 0.85 });
  }
}

function roofMaterial(style) {
  if (style === 'huts') return new THREE.MeshStandardMaterial({ map: thatchTexture(1), roughness: 1 });
  if (style === 'wwii') return new THREE.MeshStandardMaterial({ map: stoneTexture(0x6a6a60, 1), color: 0x70706a, roughness: 1 });
  const tone = style === 'medieval' ? 0x9a5236 : 0xb35a3a;
  return new THREE.MeshStandardMaterial({ map: roofTexture(tone, 1, style !== 'contemporary'), roughness: 0.9 });
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.terrain = null;
    this.water = null;
    this.eraGroup = new THREE.Group();
    this.group.add(this.eraGroup);
    this.currentEra = null;
    this.tidal = 0;

    // Collisions
    this.colliders = [];           // {x, z, r}
    this.grid = new Map();         // clé "cx,cz" -> [index...]
    this.cellSize = 8;
  }

  build() {
    this.buildTerrain();
    this.buildOcean();
    this.buildSky();
    this.buildLocationMarkers();
  }

  buildTerrain() {
    const geo = new THREE.PlaneGeometry(
      ISLAND_SIZE + 80, ISLAND_WIDTH + 80,
      TERRAIN_SEG, Math.floor(TERRAIN_SEG * (ISLAND_WIDTH / ISLAND_SIZE))
    );
    geo.rotateX(-Math.PI / 2);
    const era = getEra('contemporaine');
    const positions = geo.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const h = heightAt(x, z);
      positions.setY(i, h);
      const c = terrainColor(x, z, h, era);
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      map: grassDetailTexture(80),
      roughness: 1,
      metalness: 0,
    });
    this.terrain = new THREE.Mesh(geo, mat);
    this.terrain.receiveShadow = true;
    this.group.add(this.terrain);
  }

  updateTerrainColors(era) {
    const positions = this.terrain.geometry.attributes.position;
    const colors = this.terrain.geometry.attributes.color;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const h = positions.getY(i);
      const c = terrainColor(x, z, h, era);
      colors.setXYZ(i, c.r, c.g, c.b);
    }
    colors.needsUpdate = true;
  }

  buildOcean() {
    const geo = new THREE.PlaneGeometry(WORLD_SIZE * 2, WORLD_SIZE * 2, 80, 80);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2a6090, transparent: true, opacity: 0.88,
      roughness: 0.2, metalness: 0.1,
    });
    this.water = new THREE.Mesh(geo, mat);
    this.water.position.y = 0;
    this.group.add(this.water);
    this.waterStart = geo.attributes.position.array.slice();
  }

  buildSky() {
    const geo = new THREE.SphereGeometry(WORLD_SIZE, 32, 16);
    const mat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0xa4c4dc) },
        horizonColor: { value: new THREE.Color(0xe4c898) },
        bottomColor: { value: new THREE.Color(0x2a3a4a) },
        offset: { value: 0 }, exponent: { value: 0.7 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 topColor, horizonColor, bottomColor;
        uniform float offset, exponent;
        varying vec3 vWorldPos;
        void main() {
          float h = normalize(vWorldPos).y + offset;
          if (h >= 0.0) {
            float t = pow(h, exponent);
            gl_FragColor = vec4(mix(horizonColor, topColor, t), 1.0);
          } else {
            float t = pow(-h, 0.5);
            gl_FragColor = vec4(mix(horizonColor, bottomColor, t), 1.0);
          }
        }`,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.scene.add(this.sky);
  }

  setSkyColors(top, horizon) {
    this.sky.material.uniforms.topColor.value.set(top);
    this.sky.material.uniforms.horizonColor.value.set(horizon);
  }

  buildLocationMarkers() {
    this.markers = new THREE.Group();
    for (const loc of LOCATIONS) {
      const geo = new THREE.CylinderGeometry(0.4, 0.4, 50, 6, 1, true);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xd4a857, transparent: true, opacity: 0.18, side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(geo, mat);
      const y = Math.max(2, heightAt(loc.position[0], loc.position[2]));
      beam.position.set(loc.position[0], y + 25, loc.position[2]);
      beam.userData.locId = loc.id;
      this.markers.add(beam);
    }
    this.group.add(this.markers);
  }

  // ---------- Collisions ----------
  addCollider(x, z, r) { this.colliders.push({ x, z, r }); }

  buildGrid() {
    this.grid.clear();
    const cs = this.cellSize;
    for (let i = 0; i < this.colliders.length; i++) {
      const c = this.colliders[i];
      const cx = Math.floor(c.x / cs), cz = Math.floor(c.z / cs);
      const key = `${cx},${cz}`;
      if (!this.grid.has(key)) this.grid.set(key, []);
      this.grid.get(key).push(i);
    }
  }

  resolveCollision(x, z, radius) {
    const cs = this.cellSize;
    const cx = Math.floor(x / cs), cz = Math.floor(z / cs);
    for (let it = 0; it < 2; it++) {
      for (let gx = cx - 1; gx <= cx + 1; gx++) {
        for (let gz = cz - 1; gz <= cz + 1; gz++) {
          const arr = this.grid.get(`${gx},${gz}`);
          if (!arr) continue;
          for (const idx of arr) {
            const c = this.colliders[idx];
            const dx = x - c.x, dz = z - c.z;
            const rr = c.r + radius;
            const d2 = dx * dx + dz * dz;
            if (d2 < rr * rr) {
              const d = Math.sqrt(d2) || 0.0001;
              const push = rr - d;
              x += (dx / d) * push;
              z += (dz / d) * push;
            }
          }
        }
      }
    }
    return { x, z };
  }

  // ---------- Chargement d'époque ----------
  loadEra(eraId) {
    this.currentEra = eraId;
    const era = getEra(eraId);

    while (this.eraGroup.children.length) {
      const c = this.eraGroup.children.pop();
      c.traverse?.((o) => {
        o.geometry?.dispose?.();
        if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
        else o.material?.dispose?.();
      });
    }
    this.colliders = [];

    this.updateTerrainColors(era);
    this.water.material.color.set(era.sea);

    this.buildPaths(era);
    for (const loc of LOCATIONS) this.buildLocationProps(loc, era);
    this.scatterVegetation(era);
    this.scatterEraProps(era);

    this.buildGrid();
  }

  buildLocationProps(loc, era) {
    const [lx, , lz] = loc.position;
    const y = heightAt(lx, lz);
    const group = new THREE.Group();
    group.position.set(lx, y, lz);
    const style = era.architecture;
    // closure d'enregistrement de collider en coordonnées monde
    const col = (localX, localZ, r) => this.addCollider(lx + localX, lz + localZ, r);

    switch (loc.id) {
      case 'phare-baleines': this.buildLighthouse(group, style, col); break;
      case 'saint-martin':   this.buildFort(group, style, col, 1); break;
      case 'fort-la-pree':   this.buildFort(group, style, col, 0.7); break;
      case 'ars':            this.buildChurch(group, style, col); break;
      case 'flotte':         this.buildPort(group, style, col); break;
      case 'bois-plage':     this.buildVineyard(group, style, col); break;
      case 'sainte-marie':   this.buildVillage(group, style, col, 9); break;
      case 'portes':         this.buildVillage(group, style, col, 7); break;
      case 'lilleau':        this.buildSalterns(group, style, col); break;
    }
    this.eraGroup.add(group);
  }

  // Maison texturée avec toit, porte et fenêtres
  addHouse(parent, x, z, w, d, wallH, rot, style, col) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rot;

    if (style === 'huts') {
      // hutte : murs torchis bas + toit de chaume conique
      const wall = new THREE.Mesh(new THREE.CylinderGeometry(w * 0.6, w * 0.65, wallH * 0.6, 8), wallMaterial(style));
      wall.position.y = wallH * 0.3; wall.castShadow = true; g.add(wall);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.8, wallH * 0.9, 8), roofMaterial(style));
      roof.position.y = wallH * 0.6 + wallH * 0.45; roof.castShadow = true; g.add(roof);
      parent.add(g);
      if (col) col(x, z, w * 0.7);
      return g;
    }

    const wallMat = wallMaterial(style);
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    body.position.y = wallH / 2;
    body.castShadow = true; body.receiveShadow = true;
    g.add(body);

    // toit à deux pentes
    const roofMat = roofMaterial(style);
    const roofH = Math.max(1.4, w * 0.4);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.001, w * 0.78, roofH, 3), roofMat);
    roof.rotation.y = Math.PI / 4;            // crête alignée
    roof.position.y = wallH + roofH / 2 - 0.05;
    roof.scale.z = d / (w * 1.1);
    roof.castShadow = true;
    g.add(roof);

    // débord de toit
    const eave = new THREE.Mesh(new THREE.BoxGeometry(w + 0.4, 0.18, d + 0.4),
      new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 0.9 }));
    eave.position.y = wallH + 0.02; g.add(eave);

    // porte
    const door = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.8, 0.08),
      new THREE.MeshStandardMaterial({ map: woodTexture(0x5a3a22, 1), roughness: 0.9 }));
    door.position.set(0, 0.9, d / 2 + 0.02);
    g.add(door);

    // fenêtres + volets
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x223240, roughness: 0.2, metalness: 0.3 });
    const shutterMat = new THREE.MeshStandardMaterial({ color: style === 'wwii' ? 0x55603f : 0x3a7a8a, roughness: 0.8 });
    const winY = wallH * 0.55;
    const offs = [-w * 0.3, w * 0.3];
    for (const ox of offs) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.9, 0.06), glassMat);
      win.position.set(ox, winY, d / 2 + 0.03); g.add(win);
      for (const sgn of [-1, 1]) {
        const sh = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.92, 0.05), shutterMat);
        sh.position.set(ox + sgn * 0.46, winY, d / 2 + 0.04); g.add(sh);
      }
    }
    // cheminée
    if (style !== 'wwii') {
      const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1, 0.4), wallMat);
      chimney.position.set(w * 0.25, wallH + roofH * 0.6, 0); g.add(chimney);
    }

    parent.add(g);
    if (col) {
      // collider ovale approximé par un cercle englobant
      const r = Math.max(w, d) * 0.55;
      col(x, z, r);
    }
    return g;
  }

  buildLighthouse(parent, style, col) {
    if (style === 'huts') {
      const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTexture(0x6a6258, 1, true), roughness: 1 });
      for (let i = 0; i < 3; i++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(1.6, 5, 1.6), stoneMat);
        m.position.set(Math.cos(i * 2.1) * 4, 2.5, Math.sin(i * 2.1) * 4);
        m.castShadow = true; parent.add(m);
        col && col(Math.cos(i * 2.1) * 4, Math.sin(i * 2.1) * 4, 1.2);
      }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(10, 1, 6), stoneMat);
      cap.position.y = 5.6; parent.add(cap);
      return;
    }
    if (style === 'roman' || style === 'medieval') {
      const mat = wallMaterial(style);
      const base = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 4.5, 9, 10), mat);
      base.position.y = 4.5; base.castShadow = true; parent.add(base);
      const fire = new THREE.Mesh(new THREE.SphereGeometry(0.8), new THREE.MeshBasicMaterial({ color: 0xff9944 }));
      fire.position.y = 9.5; parent.add(fire);
      col && col(0, 0, 4.2);
      return;
    }
    const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTexture(0xe4e0d8, 2), roughness: 0.8 });
    const baseH = style === 'xvii' ? 20 : 40;
    const baseR = style === 'xvii' ? 3.4 : 2.8;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 0.7, baseR, baseH, 18), stoneMat);
    tower.position.y = baseH / 2; tower.castShadow = true; parent.add(tower);
    // bandeau rouge (phare des baleines moderne)
    if (style !== 'xvii') {
      const band = new THREE.Mesh(new THREE.CylinderGeometry(baseR * 0.72, baseR * 0.78, 4, 18),
        new THREE.MeshStandardMaterial({ color: 0x9a3a2a, roughness: 0.8 }));
      band.position.y = baseH * 0.32; parent.add(band);
    }
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(2, 2.2, 4, 12),
      new THREE.MeshStandardMaterial({ color: 0x2a2a2a, metalness: 0.5, roughness: 0.4 }));
    lantern.position.y = baseH + 2; parent.add(lantern);
    const light = new THREE.Mesh(new THREE.SphereGeometry(1.2), new THREE.MeshBasicMaterial({ color: 0xfff0a8 }));
    light.position.y = baseH + 2; parent.add(light);
    const beacon = new THREE.PointLight(0xfff0c0, 1.2, 60); beacon.position.y = baseH + 2; parent.add(beacon);
    // maison de gardien
    this.addHouse(parent, 8, 4, 6, 5, 4, 0, style, col);
    if (style === 'wwii') {
      this.addBunker(parent, -8, 6, col);
    }
    col && col(0, 0, baseR + 0.6);
  }

  buildFort(parent, style, col, scale = 1) {
    const S = scale;
    const wallMat = wallMaterial(style === 'huts' ? 'medieval' : style);
    if (style === 'xvii' || style === 'xix' || style === 'contemporary' || style === 'wwii') {
      const points = 5;
      for (let i = 0; i < points; i++) {
        const a = (i / points) * Math.PI * 2;
        const bx = Math.cos(a) * 14 * S, bz = Math.sin(a) * 14 * S;
        const bastion = new THREE.Mesh(new THREE.BoxGeometry(7 * S, 5 * S, 7 * S), wallMat);
        bastion.position.set(bx, 2.5 * S, bz); bastion.rotation.y = a;
        bastion.castShadow = true; parent.add(bastion);
        col && col(bx, bz, 4 * S);
        // créneaux
        for (let k = -1; k <= 1; k++) {
          const cren = new THREE.Mesh(new THREE.BoxGeometry(1.4 * S, 1.2 * S, 1.4 * S), wallMat);
          cren.position.set(bx + Math.cos(a) * k * 2 * S, 5.2 * S, bz + Math.sin(a) * k * 2 * S);
          parent.add(cren);
        }
      }
      const keep = new THREE.Mesh(new THREE.BoxGeometry(16 * S, 6 * S, 16 * S), wallMat);
      keep.position.y = 3 * S; keep.castShadow = true; parent.add(keep);
      col && col(0, 0, 11 * S);
      // mât + drapeau (XVIIe / XIXe)
      if (style === 'xvii' || style === 'xix') {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 8), new THREE.MeshStandardMaterial({ color: 0x6a5436 }));
        pole.position.set(0, 6 * S + 4, 0); parent.add(pole);
        const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4),
          new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide }));
        flag.position.set(1.2, 6 * S + 6, 0); parent.add(flag);
      }
    } else {
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(4 * S, 5 * S, 12 * S, 10), wallMat);
      tower.position.y = 6 * S; tower.castShadow = true; parent.add(tower);
      col && col(0, 0, 5 * S);
    }
    // village autour pour Saint-Martin
    if (S >= 1) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.3;
        const r = 26 + (i % 2) * 5;
        this.addHouse(parent, Math.cos(a) * r, Math.sin(a) * r, 4.5, 4, 4, a, style, col);
      }
    }
  }

  buildChurch(parent, style, col) {
    if (style === 'huts' || style === 'roman') {
      const stone = new THREE.MeshStandardMaterial({ map: stoneTexture(0xa89878, 1), roughness: 1 });
      const altar = new THREE.Mesh(new THREE.BoxGeometry(3, 1.6, 3), stone);
      altar.position.y = 0.8; parent.add(altar); col && col(0, 0, 2);
      if (style === 'roman') {
        // colonnes romaines
        for (let i = -1; i <= 1; i += 2) {
          for (let j = -1; j <= 1; j += 2) {
            const colmn = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.45, 5, 12), stone);
            colmn.position.set(i * 4, 2.5, j * 4); colmn.castShadow = true; parent.add(colmn);
            col && col(i * 4, j * 4, 0.6);
          }
        }
      }
      // village
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        this.addHouse(parent, Math.cos(a) * 16, Math.sin(a) * 16, 4, 4, style === 'huts' ? 3 : 4, a, style, col);
      }
      return;
    }
    const stone = wallMaterial(style);
    const nave = new THREE.Mesh(new THREE.BoxGeometry(9, 8, 20), stone);
    nave.position.y = 4; nave.castShadow = true; parent.add(nave);
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.001, 7, 4, 3), roofMaterial(style));
    roof.rotation.y = Math.PI / 4; roof.position.y = 10; roof.scale.z = 2.6; parent.add(roof);
    col && col(0, 0, 8);
    // clocher noir et blanc d'Ars
    const tower = new THREE.Mesh(new THREE.BoxGeometry(4.5, 16, 4.5), stone);
    tower.position.set(0, 8, -12); tower.castShadow = true; parent.add(tower);
    col && col(0, -12, 3);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.8, 11, 4),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.7 }));
    spire.rotation.y = Math.PI / 4; spire.position.set(0, 21.5, -12); spire.castShadow = true; parent.add(spire);
    // village
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + 0.4;
      const r = 16 + (i % 2) * 4;
      this.addHouse(parent, Math.cos(a) * r, Math.sin(a) * r, 4.2, 4, 4, a, style, col);
    }
  }

  buildPort(parent, style, col) {
    const n = 7;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 15;
      this.addHouse(parent, Math.cos(a) * r, Math.sin(a) * r - 4, 4.6, 4.2, style === 'huts' ? 3 : 4.5, a, style, col);
    }
    // quai
    const dock = new THREE.Mesh(new THREE.BoxGeometry(14, 0.6, 5),
      new THREE.MeshStandardMaterial({ map: woodTexture(0x6a4a30, 2), roughness: 0.95 }));
    dock.position.set(0, 0.3, 22); dock.receiveShadow = true; parent.add(dock);
    // bateaux
    if (style !== 'huts') {
      const boatMat = new THREE.MeshStandardMaterial({ map: woodTexture(0x5a3a26, 1), roughness: 0.9 });
      for (let i = 0; i < 3; i++) {
        const bx = -4 + i * 4;
        const boat = new THREE.Mesh(new THREE.BoxGeometry(4, 1.1, 1.6), boatMat);
        boat.position.set(bx, 0.4, 26); boat.castShadow = true; parent.add(boat);
        if (style === 'contemporary' || style === 'xix' || style === 'xvii') {
          const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 5), boatMat);
          mast.position.set(bx, 3, 26); parent.add(mast);
          const sail = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 3),
            new THREE.MeshStandardMaterial({ color: 0xeee6d2, side: THREE.DoubleSide, roughness: 0.9 }));
          sail.position.set(bx + 0.8, 3, 26); sail.rotation.y = Math.PI / 2; parent.add(sail);
        }
      }
    }
  }

  buildVineyard(parent, style, col) {
    const stalkMat = new THREE.MeshStandardMaterial({ map: woodTexture(0x6a4a26, 1), roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({
      map: foliageTexture(style === 'wwii' ? 0x6a6a3a : 0x5a7a32, 1), roughness: 0.95,
    });
    const postMat = new THREE.MeshStandardMaterial({ color: 0x5a4632, roughness: 1 });
    if (style !== 'huts') {
      for (let r = -10; r <= 10; r += 2.5) {
        // poteaux + fil
        for (let p = -10; p <= 10; p += 5) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 1.2, 0.08), postMat);
          post.position.set(r, 0.6, p); parent.add(post);
        }
        for (let s = -10; s <= 10; s += 1) {
          const stalk = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.7, 0.07), stalkMat);
          stalk.position.set(r, 0.35, s); parent.add(stalk);
          const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.45, 0.4), leafMat);
          leaf.position.set(r, 0.85, s); parent.add(leaf);
        }
      }
    }
    // chai + maison
    this.addHouse(parent, 14, 0, 8, 6, 4.5, -Math.PI / 2, style, col);
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      this.addHouse(parent, Math.cos(a) * 18, Math.sin(a) * 14, 4, 4, style === 'huts' ? 3 : 4, a, style, col);
    }
  }

  buildVillage(parent, style, col, n) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const ring = i % 2;
      const r = 10 + ring * 6;
      const w = 4 + (i % 3) * 0.7;
      this.addHouse(parent, Math.cos(a) * r, Math.sin(a) * r, w, w * 0.9, style === 'huts' ? 3 : 4 + ring, a, style, col);
    }
    // puits central (sauf huttes)
    if (style !== 'huts') {
      const well = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1.2, 12),
        new THREE.MeshStandardMaterial({ map: stoneTexture(0xb6a888, 1, true), roughness: 1 }));
      well.position.y = 0.6; parent.add(well); col && col(0, 0, 1.2);
    }
  }

  buildSalterns(parent, style, col) {
    const water = new THREE.MeshStandardMaterial({ color: 0xb8c8c0, transparent: true, opacity: 0.75, roughness: 0.15, metalness: 0.1 });
    const bund = new THREE.MeshStandardMaterial({ map: dirtTexture(0x6a604a, 1), roughness: 1 });
    if (style === 'huts') {
      const lake = new THREE.Mesh(new THREE.PlaneGeometry(28, 18), water);
      lake.rotation.x = -Math.PI / 2; lake.position.y = 0.1; parent.add(lake);
      return;
    }
    for (let r = -3; r <= 3; r++) {
      for (let c = -3; c <= 3; c++) {
        const pond = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), water);
        pond.rotation.x = -Math.PI / 2; pond.position.set(r * 5, 0.06, c * 5); parent.add(pond);
        const wall = new THREE.Mesh(new THREE.BoxGeometry(5, 0.35, 0.3), bund);
        wall.position.set(r * 5, 0.15, c * 5 - 2.4); parent.add(wall);
      }
    }
    if (style === 'xix' || style === 'xvii' || style === 'contemporary') {
      for (let i = 0; i < 5; i++) {
        const heap = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 8),
          new THREE.MeshStandardMaterial({ color: 0xf6f2ea, roughness: 0.6 }));
        heap.position.set(-14 + i * 7, 1.1, 13); heap.castShadow = true; parent.add(heap);
        col && col(-14 + i * 7, 13, 1.5);
      }
      // cabane de saunier
      this.addHouse(parent, 16, -10, 4, 3.5, 3, 0, style, col);
    }
  }

  addBunker(parent, x, z, col) {
    const mat = new THREE.MeshStandardMaterial({ map: stoneTexture(0x8a8a80, 1, true), color: 0x88887e, roughness: 1 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(3, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    dome.scale.set(1, 0.6, 1); dome.position.set(x, 0, z); dome.castShadow = true; parent.add(dome);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(2, 0.5, 0.4), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    slit.position.set(x, 1.2, z + 2.6); parent.add(slit);
    col && col(x, z, 3.2);
  }

  // ---------- Chemins ----------
  buildPaths(era) {
    const style = era.architecture;
    const towns = [...LOCATIONS].sort((a, b) => a.position[0] - b.position[0]);
    const pts = towns.map((t) => new THREE.Vector3(t.position[0], 0, t.position[2]));
    const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
    const samples = curve.getPoints(180);

    const width = style === 'contemporary' ? 4.5 : 3.4;
    const tile = 4;
    const positions = [], uvs = [], indices = [];
    let dist = 0;
    for (let i = 0; i < samples.length; i++) {
      const p = samples[i];
      const a = samples[Math.max(0, i - 1)];
      const b = samples[Math.min(samples.length - 1, i + 1)];
      let dx = b.x - a.x, dz = b.z - a.z;
      const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
      const px = -dz, pz = dx;       // perpendiculaire
      const lx = p.x + px * width / 2, lz = p.z + pz * width / 2;
      const rx = p.x - px * width / 2, rz = p.z - pz * width / 2;
      const ly = Math.max(heightAt(lx, lz), 0.05) + 0.08;
      const ry = Math.max(heightAt(rx, rz), 0.05) + 0.08;
      positions.push(lx, ly, lz, rx, ry, rz);
      const v = dist / tile;
      uvs.push(0, v, 1, v);
      if (i > 0) dist += Math.hypot(p.x - samples[i - 1].x, p.z - samples[i - 1].z);
    }
    for (let i = 0; i < samples.length - 1; i++) {
      const a = i * 2, b = i * 2 + 1, c = i * 2 + 2, d = i * 2 + 3;
      indices.push(a, b, c, b, d, c);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    let map;
    if (style === 'contemporary') map = asphaltTexture(1, true);
    else if (style === 'huts' || style === 'wwii') map = dirtTexture(0x9a7a52, 1);
    else if (style === 'roman') map = paveTexture(0x9a9080, 1);
    else map = paveTexture(0x8a8276, 1);
    map.wrapT = THREE.RepeatWrapping;
    const mat = new THREE.MeshStandardMaterial({ map, roughness: 0.95, polygonOffset: true, polygonOffsetFactor: -2 });
    const path = new THREE.Mesh(geo, mat);
    path.receiveShadow = true;
    this.eraGroup.add(path);
  }

  // ---------- Éléments d'époque ----------
  scatterEraProps(era) {
    const style = era.architecture;
    const rng = mulberry32(99);
    const near = (locId) => LOCATIONS.find((l) => l.id === locId).position;

    if (style === 'huts') {
      // menhirs / dolmens
      const stoneMat = new THREE.MeshStandardMaterial({ map: stoneTexture(0x7a7468, 1, true), roughness: 1 });
      const base = near('phare-baleines');
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        const x = base[0] + 20 + Math.cos(a) * 8, z = base[2] + Math.sin(a) * 8;
        const menhir = new THREE.Mesh(new THREE.BoxGeometry(1.2, 4 + rng() * 2, 1), stoneMat);
        menhir.position.set(x, heightAt(x, z) + 2, z); menhir.rotation.y = rng(); menhir.castShadow = true;
        this.eraGroup.add(menhir); this.addCollider(x, z, 0.9);
      }
      // feu de camp
      const base2 = near('lilleau');
      const fire = new THREE.Mesh(new THREE.ConeGeometry(0.6, 1, 6), new THREE.MeshBasicMaterial({ color: 0xff7733 }));
      fire.position.set(base2[0] + 5, heightAt(base2[0] + 5, base2[2]) + 0.5, base2[2] + 5);
      this.eraGroup.add(fire);
      const fl = new THREE.PointLight(0xff7733, 1.5, 12); fl.position.copy(fire.position); this.eraGroup.add(fl);
    }

    if (style === 'roman') {
      // amphores éparses près de La Flotte
      const base = near('flotte');
      const amphMat = new THREE.MeshStandardMaterial({ color: 0xb5703a, roughness: 0.8 });
      for (let i = 0; i < 8; i++) {
        const x = base[0] + (rng() - 0.5) * 16, z = base[2] + (rng() - 0.5) * 16;
        const amph = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.12, 0.9, 8), amphMat);
        amph.position.set(x, heightAt(x, z) + 0.45, z); amph.rotation.z = rng() * 0.4; this.eraGroup.add(amph);
      }
    }

    if (style === 'medieval') {
      // charrette + barrières en bois près d'Ars
      const base = near('ars');
      const woodMat = new THREE.MeshStandardMaterial({ map: woodTexture(0x6a4a2a, 1), roughness: 1 });
      const cart = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.6, 1.4), woodMat);
      cart.position.set(base[0] + 8, heightAt(base[0] + 8, base[2]) + 0.7, base[2] + 6); this.eraGroup.add(cart);
      this.addCollider(base[0] + 8, base[2] + 6, 1.4);
      for (let i = 0; i < 10; i++) {
        const x = base[0] - 10 + i * 1.5, z = base[2] - 8;
        const fence = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1, 0.12), woodMat);
        fence.position.set(x, heightAt(x, z) + 0.5, z); this.eraGroup.add(fence);
      }
    }

    if (style === 'xvii' || style === 'xix') {
      // canons près de Saint-Martin
      const base = near('saint-martin');
      const metal = new THREE.MeshStandardMaterial({ color: 0x33332f, metalness: 0.7, roughness: 0.4 });
      for (let i = 0; i < 4; i++) {
        const x = base[0] - 18 + i * 4, z = base[2] - 16;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 1.8, 10), metal);
        barrel.rotation.z = Math.PI / 2; barrel.rotation.y = 0.3;
        barrel.position.set(x, heightAt(x, z) + 0.7, z); this.eraGroup.add(barrel);
        this.addCollider(x, z, 1);
      }
    }

    if (style === 'wwii') {
      // bunkers + sacs de sable le long de la côte sud
      const base = near('sainte-marie');
      this.addBunkerWorld(base[0] - 10, base[2] + 10);
      this.addBunkerWorld(base[0] + 12, base[2] + 8);
      const sandMat = new THREE.MeshStandardMaterial({ color: 0x8a7a4a, roughness: 1 });
      for (let i = 0; i < 12; i++) {
        const x = base[0] - 6 + (i % 6) * 1.1, z = base[2] + 13 + Math.floor(i / 6) * 0.8;
        const bag = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 5), sandMat);
        bag.scale.set(1.3, 0.7, 0.9); bag.position.set(x, heightAt(x, z) + 0.3, z); this.eraGroup.add(bag);
      }
    }

    if (style === 'contemporary') {
      // panneaux, bancs et arceaux à vélo dans les villages
      for (const locId of ['saint-martin', 'ars', 'flotte', 'bois-plage', 'sainte-marie']) {
        const base = near(locId);
        const metal = new THREE.MeshStandardMaterial({ color: 0x556b6b, metalness: 0.5, roughness: 0.5 });
        for (let i = 0; i < 3; i++) {
          const x = base[0] + 4 + i * 0.8, z = base[2] + 8;
          const arc = new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.04, 6, 12, Math.PI), metal);
          arc.position.set(x, heightAt(x, z) + 0.4, z); this.eraGroup.add(arc);
        }
        // banc
        const wood = new THREE.MeshStandardMaterial({ map: woodTexture(0x8a6a3a, 1), roughness: 0.9 });
        const bench = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.45), wood);
        bench.position.set(base[0] - 5, heightAt(base[0] - 5, base[2] + 6) + 0.5, base[2] + 6);
        this.eraGroup.add(bench); this.addCollider(base[0] - 5, base[2] + 6, 1);
        // panneau directionnel
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.4), metal);
        pole.position.set(base[0] + 6, heightAt(base[0] + 6, base[2] - 6) + 1.2, base[2] - 6); this.eraGroup.add(pole);
        const sign = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.3, 0.05), new THREE.MeshStandardMaterial({ color: 0x2a6a4a }));
        sign.position.set(base[0] + 6.4, heightAt(base[0] + 6, base[2] - 6) + 2.1, base[2] - 6); this.eraGroup.add(sign);
      }
    }
  }

  addBunkerWorld(x, z) {
    const g = new THREE.Group(); g.position.set(x, heightAt(x, z), z);
    this.addBunker(g, 0, 0, (cx, cz, r) => this.addCollider(x + cx, z + cz, r));
    this.eraGroup.add(g);
  }

  scatterVegetation(era) {
    const rng = mulberry32(42);
    const pineMat = new THREE.MeshStandardMaterial({ map: foliageTexture(0x3a5028, 1), roughness: 1 });
    const trunkMat = new THREE.MeshStandardMaterial({ map: barkTexture(1), roughness: 1 });
    const bushMat = new THREE.MeshStandardMaterial({ map: foliageTexture(0x4a6a32, 1), roughness: 1 });
    const oatMat = new THREE.MeshStandardMaterial({ color: 0x9aa06a, roughness: 1 });

    const density = era.vegetationDensity;
    const N = Math.floor(820 * density);

    // pins maritimes (deux étages de feuillage)
    const pineGeo = new THREE.ConeGeometry(2.0, 5.5, 7);
    const trunkGeo = new THREE.CylinderGeometry(0.3, 0.4, 3, 6);
    const pineMesh = new THREE.InstancedMesh(pineGeo, pineMat, N);
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, N);
    pineMesh.castShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    const pos = new THREE.Vector3();
    let count = 0, attempts = 0;
    while (count < N && attempts < N * 6) {
      attempts++;
      const x = (rng() - 0.5) * ISLAND_SIZE;
      const z = (rng() - 0.5) * ISLAND_WIDTH * 1.2;
      const mask = islandMask(x, z);
      if (mask < 0.15) continue;
      const marshMask = Math.max(0, 1 - Math.hypot((x + 130) / 65, (z + 40) / 28));
      if (marshMask > 0.4) continue;
      const forestMask = Math.max(0, 1 - Math.hypot((x + 100) / 16, (z + 5) / 10));
      const p = forestMask > 0.3 ? 0.9 : 0.15;
      if (rng() > p) continue;
      // ne pas planter au cœur des villages
      let tooClose = false;
      for (const loc of LOCATIONS) {
        if (Math.hypot(loc.position[0] - x, loc.position[2] - z) < 12) { tooClose = true; break; }
      }
      if (tooClose) continue;
      const h = heightAt(x, z);
      if (h < 0.8) continue;
      const scale = 0.8 + rng() * 0.7;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rng() * Math.PI);
      sc.set(scale, scale, scale);
      pos.set(x, h + 2.8 * scale + 1.5, z);
      m.compose(pos, q, sc); pineMesh.setMatrixAt(count, m);
      pos.set(x, h + 1.5 * scale, z);
      m.compose(pos, q, sc); trunkMesh.setMatrixAt(count, m);
      count++;
      this.addCollider(x, z, 0.7 * scale);
    }
    pineMesh.count = count; trunkMesh.count = count;
    this.eraGroup.add(pineMesh); this.eraGroup.add(trunkMesh);

    // buissons / fourrés
    const bushGeo = new THREE.SphereGeometry(0.9, 6, 5);
    const bushMesh = new THREE.InstancedMesh(bushGeo, bushMat, 400);
    let bc = 0;
    for (let i = 0; i < 1000 && bc < 400; i++) {
      const x = (rng() - 0.5) * ISLAND_SIZE;
      const z = (rng() - 0.5) * ISLAND_WIDTH * 1.1;
      const mask = islandMask(x, z);
      if (mask < 0.2) continue;
      const h = heightAt(x, z);
      if (h < 0.9) continue;
      const s = 0.6 + rng() * 0.9;
      q.identity(); sc.set(s, s * 0.8, s); pos.set(x, h + 0.5 * s, z);
      m.compose(pos, q, sc); bushMesh.setMatrixAt(bc++, m);
    }
    bushMesh.count = bc; bushMesh.castShadow = true; this.eraGroup.add(bushMesh);

    // oyats sur les dunes
    const tuftGeo = new THREE.ConeGeometry(0.5, 0.9, 4);
    const tuftMesh = new THREE.InstancedMesh(tuftGeo, oatMat, 600);
    let tc = 0;
    for (let i = 0; i < 1400 && tc < 600; i++) {
      const x = (rng() - 0.5) * ISLAND_SIZE;
      const z = (rng() - 0.5) * ISLAND_WIDTH * 1.2;
      const mask = islandMask(x, z);
      if (mask < 0 || mask > 0.3) continue;
      const h = heightAt(x, z);
      if (h < 0.4 || h > 2.5) continue;
      q.identity(); sc.set(0.6 + rng() * 0.5, 0.7 + rng() * 0.7, 0.6 + rng() * 0.5);
      pos.set(x, h + 0.45, z);
      m.compose(pos, q, sc); tuftMesh.setMatrixAt(tc++, m);
    }
    tuftMesh.count = tc; this.eraGroup.add(tuftMesh);
  }

  update(dt, time) {
    this.tidal = Math.sin(time / (12 * 60) * Math.PI * 2) * 0.5;
    this.water.position.y = this.tidal;
    const positions = this.water.geometry.attributes.position;
    const arr = positions.array;
    const start = this.waterStart;
    const t = time * 0.6;
    for (let i = 0; i < arr.length; i += 3) {
      const x = start[i], z = start[i + 2];
      arr[i + 1] = Math.sin(x * 0.05 + t) * 0.15 + Math.cos(z * 0.04 + t * 1.3) * 0.12;
    }
    positions.needsUpdate = true;
    this.markers.children.forEach((mk, i) => {
      mk.material.opacity = 0.12 + 0.06 * Math.sin(time * 1.5 + i);
    });
  }

  setMarkerVisible(visible) { this.markers.visible = visible; }
}

export const WORLD_BOUNDS = {
  size: WORLD_SIZE,
  island: { width: ISLAND_SIZE, height: ISLAND_WIDTH },
};
