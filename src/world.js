// Génération procédurale de l'Île de Ré : terrain heightmap, océan, plages,
// marais salants, forêts de pins, vignobles, bâtiments par époque.

import * as THREE from 'three';
import { LOCATIONS } from './locations.js';
import { getEra } from './eras.js';

const ISLAND_SIZE = 420;       // taille en unités du monde (E-O)
const ISLAND_WIDTH = 140;      // largeur (N-S)
const TERRAIN_SEG = 200;       // résolution heightmap
const WORLD_SIZE = 520;        // étendue totale (avec océan)

// PRNG déterministe
function mulberry32(seed) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Bruit valeur simple
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

// Forme de l'île : un long ovale orienté est-ouest, étranglé au milieu
// (Le Martray), avec un cap occidental (Phare des Baleines).
function islandMask(x, z) {
  const nx = x / (ISLAND_SIZE / 2);
  const nz = z / (ISLAND_WIDTH / 2);
  // base ovale
  let m = 1 - Math.sqrt(nx * nx * 0.9 + nz * nz);
  // étranglement central (Le Martray)
  const pinch = Math.exp(-Math.pow((x + 40) / 18, 2)) * 0.45;
  m -= pinch;
  // ondulation du littoral
  m += (fbm(x * 0.02 + 10, z * 0.02, 4, 7) - 0.5) * 0.25;
  return m;
}

export function heightAt(x, z) {
  const mask = islandMask(x, z);
  if (mask < 0) return -3 + mask * 6;     // fond marin
  // île : faible relief (l'île est plate), dunes côtières, marais en creux
  const baseH = 0.5 + mask * 2.0;
  const dune = Math.exp(-Math.pow((Math.abs(z) - ISLAND_WIDTH * 0.35) / 8, 2)) *
    fbm(x * 0.04, z * 0.04, 3, 13) * 4 * mask;
  // dépressions de marais salants au nord-ouest
  const marshMask = Math.max(0, (1 - Math.hypot((x + 130) / 70, (z + 40) / 30)));
  const marsh = -marshMask * 1.2;
  return baseH + dune + marsh;
}

// Type de terrain (renvoie une couleur)
function terrainColor(x, z, h, era) {
  const colors = {
    sand:   new THREE.Color(0xd8c598),
    beach:  new THREE.Color(0xe6d4a4),
    grass:  new THREE.Color(era.ground),
    marsh:  new THREE.Color(0x8a9080),
    forest: new THREE.Color(0x445836),
    rock:   new THREE.Color(0x7a7468),
    salt:   new THREE.Color(0xc8d4d0),
  };
  if (h < 0.6) return colors.beach;
  // marais salants (sols quadrillés près du nord-ouest)
  const marshMask = Math.max(0, 1 - Math.hypot((x + 130) / 65, (z + 40) / 28));
  if (marshMask > 0.4 && h < 1.4) {
    const q = (Math.floor(x / 4) + Math.floor(z / 4)) % 2 === 0;
    return q ? colors.salt : colors.marsh;
  }
  // vignobles autour du Bois-Plage
  const vineMask = Math.max(0, 1 - Math.hypot((x - 25) / 30, (z - 35) / 14));
  if (vineMask > 0.4 && h > 1) {
    return new THREE.Color(0x9a8a4a);
  }
  // forêts plus à l'est (forêt de Trousse-Chemise)
  const forestMask = Math.max(0, 1 - Math.hypot((x + 100) / 16, (z + 5) / 10));
  if (forestMask > 0.3 && h > 1) return colors.forest;
  return colors.grass;
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
    this.rng = mulberry32(1337);
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
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.computeVertexNormals();

    const mat = new THREE.MeshLambertMaterial({
      vertexColors: true,
      flatShading: false,
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
    const mat = new THREE.MeshPhongMaterial({
      color: 0x2a6090,
      transparent: true,
      opacity: 0.85,
      shininess: 80,
      specular: 0x99bbdd,
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
        offset: { value: 0 },
        exponent: { value: 0.7 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
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
        }
      `,
    });
    this.sky = new THREE.Mesh(geo, mat);
    this.scene.add(this.sky);
  }

  setSkyColors(top, horizon) {
    this.sky.material.uniforms.topColor.value.set(top);
    this.sky.material.uniforms.horizonColor.value.set(horizon);
  }

  buildLocationMarkers() {
    // Beacons lumineux pour repérer les lieux à distance
    this.markers = new THREE.Group();
    for (const loc of LOCATIONS) {
      const geo = new THREE.CylinderGeometry(0.4, 0.4, 50, 6, 1, true);
      const mat = new THREE.MeshBasicMaterial({
        color: 0xd4a857,
        transparent: true,
        opacity: 0.18,
        side: THREE.DoubleSide,
      });
      const beam = new THREE.Mesh(geo, mat);
      const y = Math.max(2, heightAt(loc.position[0], loc.position[2]));
      beam.position.set(loc.position[0], y + 25, loc.position[2]);
      beam.userData.locId = loc.id;
      this.markers.add(beam);
    }
    this.group.add(this.markers);
  }

  // Construit les bâtiments et la végétation selon l'époque
  loadEra(eraId) {
    this.currentEra = eraId;
    const era = getEra(eraId);

    // Vider les anciens props
    while (this.eraGroup.children.length) {
      const c = this.eraGroup.children.pop();
      c.geometry?.dispose?.();
      if (c.material?.length) c.material.forEach((m) => m.dispose());
      else c.material?.dispose?.();
    }

    this.updateTerrainColors(era);
    this.water.material.color.set(era.sea);

    // Bâtiments par lieu, selon l'architecture
    for (const loc of LOCATIONS) {
      this.buildLocationProps(loc, era);
    }

    // Végétation procédurale
    this.scatterVegetation(era);
  }

  buildLocationProps(loc, era) {
    const [x, , z] = loc.position;
    const y = heightAt(x, z);
    const group = new THREE.Group();
    group.position.set(x, y, z);

    const style = era.architecture;

    // Bâtiment iconique adapté
    switch (loc.id) {
      case 'phare-baleines': this.buildLighthouse(group, style); break;
      case 'saint-martin':   this.buildFort(group, style); break;
      case 'fort-la-pree':   this.buildFort(group, style, 0.7); break;
      case 'ars':            this.buildChurch(group, style); break;
      case 'flotte':         this.buildPort(group, style); break;
      case 'bois-plage':     this.buildVineyard(group, style); break;
      case 'sainte-marie':   this.buildVillage(group, style, 8); break;
      case 'portes':         this.buildVillage(group, style, 6); break;
      case 'lilleau':        this.buildSalterns(group, style); break;
    }

    this.eraGroup.add(group);
  }

  buildLighthouse(parent, style) {
    if (style === 'prehistoire' || style === 'huts') {
      // Promontoire nu avec un dolmen
      const stoneMat = new THREE.MeshLambertMaterial({ color: 0x6a6258 });
      for (let i = 0; i < 3; i++) {
        const g = new THREE.BoxGeometry(1.4, 4, 1.4);
        const m = new THREE.Mesh(g, stoneMat);
        m.position.set(Math.cos(i * 2.1) * 3, 2, Math.sin(i * 2.1) * 3);
        parent.add(m);
      }
      const cap = new THREE.Mesh(new THREE.BoxGeometry(7, 0.8, 5), stoneMat);
      cap.position.y = 4.4; parent.add(cap);
      return;
    }
    if (style === 'roman' || style === 'medieval') {
      const mat = new THREE.MeshLambertMaterial({ color: 0xc8b89a });
      const base = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.5, 6, 8), mat);
      base.position.y = 3; parent.add(base);
      const fire = new THREE.Mesh(
        new THREE.SphereGeometry(0.6),
        new THREE.MeshBasicMaterial({ color: 0xff9944 })
      );
      fire.position.y = 6.5; parent.add(fire);
      return;
    }
    // XVII+ : phare en pierre/blanc avec lanterne
    const stoneMat = new THREE.MeshLambertMaterial({ color: 0xe4e0d8 });
    const baseH = style === 'xvii' ? 14 : 28;
    const baseR = style === 'xvii' ? 2.6 : 2.2;
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(baseR * 0.7, baseR, baseH, 16),
      stoneMat
    );
    tower.position.y = baseH / 2; parent.add(tower);
    const lantern = new THREE.Mesh(
      new THREE.CylinderGeometry(1.4, 1.6, 3, 12),
      new THREE.MeshLambertMaterial({ color: 0x3a3a3a })
    );
    lantern.position.y = baseH + 1.5; parent.add(lantern);
    const light = new THREE.Mesh(
      new THREE.SphereGeometry(0.9),
      new THREE.MeshBasicMaterial({ color: 0xfff0a8 })
    );
    light.position.y = baseH + 1.5; parent.add(light);
    if (style === 'wwii') {
      const camouflage = new THREE.Mesh(
        new THREE.BoxGeometry(6, 2, 6),
        new THREE.MeshLambertMaterial({ color: 0x4a503a })
      );
      camouflage.position.y = 1; parent.add(camouflage);
    }
  }

  buildFort(parent, style, scale = 1) {
    const wallMat = new THREE.MeshLambertMaterial({
      color: style === 'wwii' ? 0x6a6a5a :
             style === 'medieval' ? 0x9a8870 :
             style === 'huts' ? 0x6a6258 : 0xc8b89a,
    });
    const S = scale;
    // Enceinte étoilée simplifiée (5 bastions)
    if (style === 'xvii' || style === 'xix' || style === 'contemporary' || style === 'wwii') {
      const points = 5;
      for (let i = 0; i < points; i++) {
        const a = (i / points) * Math.PI * 2;
        const bastion = new THREE.Mesh(
          new THREE.BoxGeometry(6 * S, 3 * S, 6 * S),
          wallMat
        );
        bastion.position.set(Math.cos(a) * 12 * S, 1.5 * S, Math.sin(a) * 12 * S);
        bastion.rotation.y = a;
        parent.add(bastion);
      }
      // mur central
      const keep = new THREE.Mesh(
        new THREE.BoxGeometry(14 * S, 4 * S, 14 * S),
        wallMat
      );
      keep.position.y = 2 * S;
      parent.add(keep);
    } else {
      // Mur d'enceinte simple ou tour
      const tower = new THREE.Mesh(
        new THREE.CylinderGeometry(3 * S, 4 * S, 8 * S, 8),
        wallMat
      );
      tower.position.y = 4 * S;
      parent.add(tower);
    }
  }

  buildChurch(parent, style) {
    if (style === 'huts' || style === 'roman') {
      // Pas d'église : un petit autel
      const stone = new THREE.MeshLambertMaterial({ color: 0xa89878 });
      const altar = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 2), stone);
      altar.position.y = 0.5; parent.add(altar);
      return;
    }
    const stone = new THREE.MeshLambertMaterial({ color: 0xd8d0c0 });
    const nave = new THREE.Mesh(new THREE.BoxGeometry(6, 5, 14), stone);
    nave.position.y = 2.5; parent.add(nave);
    const roof = new THREE.Mesh(
      new THREE.ConeGeometry(5, 3, 4),
      new THREE.MeshLambertMaterial({ color: 0x6a4a3a })
    );
    roof.rotation.y = Math.PI / 4;
    roof.position.y = 6.5;
    roof.scale.set(1.2, 1, 1.6);
    parent.add(roof);
    // Clocher Ars-en-Ré (noir et blanc, pointu)
    const tower = new THREE.Mesh(new THREE.BoxGeometry(3, 10, 3), stone);
    tower.position.set(0, 5, -8); parent.add(tower);
    const spire = new THREE.Mesh(
      new THREE.ConeGeometry(1.8, 7, 8),
      new THREE.MeshLambertMaterial({ color: 0x222222 })
    );
    spire.position.set(0, 13.5, -8); parent.add(spire);
  }

  buildPort(parent, style) {
    const stone = new THREE.MeshLambertMaterial({
      color: style === 'huts' ? 0xa89878 : 0xe0d4be,
    });
    const roofMat = new THREE.MeshLambertMaterial({
      color: style === 'wwii' ? 0x4a4a3a : 0xa8553a,
    });
    // Quelques maisons autour d'un quai
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const r = 10;
      const house = new THREE.Mesh(new THREE.BoxGeometry(3.5, 3, 3.5), stone);
      house.position.set(Math.cos(a) * r, 1.5, Math.sin(a) * r);
      parent.add(house);
      const roof = new THREE.Mesh(
        new THREE.ConeGeometry(2.8, 2, 4),
        roofMat
      );
      roof.rotation.y = Math.PI / 4;
      roof.position.set(Math.cos(a) * r, 4, Math.sin(a) * r);
      parent.add(roof);
    }
    // Quai et bateaux
    const dock = new THREE.Mesh(
      new THREE.BoxGeometry(8, 0.4, 3),
      new THREE.MeshLambertMaterial({ color: 0x6a4a30 })
    );
    dock.position.set(0, 0.2, 14); parent.add(dock);
    if (style !== 'huts') {
      const boatMat = new THREE.MeshLambertMaterial({ color: 0x5a3a26 });
      for (let i = 0; i < 3; i++) {
        const boat = new THREE.Mesh(
          new THREE.BoxGeometry(3, 0.8, 1.2),
          boatMat
        );
        boat.position.set(-3 + i * 3, 0.3, 16);
        parent.add(boat);
        if (style === 'contemporary' || style === 'xix') {
          const mast = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.08, 4),
            boatMat
          );
          mast.position.set(-3 + i * 3, 2.5, 16);
          parent.add(mast);
        }
      }
    }
  }

  buildVineyard(parent, style) {
    // Rangées de vignes
    const stalkMat = new THREE.MeshLambertMaterial({ color: 0x6a4a26 });
    const leafMat = new THREE.MeshLambertMaterial({
      color: style === 'wwii' ? 0x5a5a3a : 0x6a8a3a,
    });
    if (style !== 'huts' && style !== 'roman' || style === 'roman') {
      for (let r = -8; r <= 8; r += 2) {
        for (let s = -8; s <= 8; s += 0.8) {
          const stalk = new THREE.Mesh(
            new THREE.BoxGeometry(0.05, 0.6, 0.05), stalkMat
          );
          stalk.position.set(r, 0.3, s); parent.add(stalk);
          const leaf = new THREE.Mesh(
            new THREE.BoxGeometry(0.5, 0.3, 0.3), leafMat
          );
          leaf.position.set(r, 0.7, s); parent.add(leaf);
        }
      }
    }
    // Petit chai
    const chai = new THREE.Mesh(
      new THREE.BoxGeometry(6, 3, 4),
      new THREE.MeshLambertMaterial({ color: 0xd8c8a8 })
    );
    chai.position.set(10, 1.5, 0); parent.add(chai);
  }

  buildVillage(parent, style, n) {
    const stone = new THREE.MeshLambertMaterial({
      color: style === 'huts' ? 0xa89878 : 0xe8dcc0,
    });
    const roofMat = new THREE.MeshLambertMaterial({
      color: style === 'wwii' ? 0x4a4a3a :
             style === 'huts' ? 0x6a4a26 : 0xb8654a,
    });
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = 7 + (i % 2) * 4;
      if (style === 'huts') {
        // Huttes coniques
        const hut = new THREE.Mesh(
          new THREE.ConeGeometry(1.6, 2.4, 8),
          roofMat
        );
        hut.position.set(Math.cos(a) * r, 1.2, Math.sin(a) * r);
        parent.add(hut);
      } else {
        const w = 2.5 + (i % 3) * 0.6;
        const h = 2.5;
        const house = new THREE.Mesh(new THREE.BoxGeometry(w, h, w), stone);
        house.position.set(Math.cos(a) * r, h / 2, Math.sin(a) * r);
        parent.add(house);
        const roof = new THREE.Mesh(
          new THREE.ConeGeometry(w * 0.85, 1.6, 4),
          roofMat
        );
        roof.rotation.y = Math.PI / 4;
        roof.position.set(Math.cos(a) * r, h + 0.8, Math.sin(a) * r);
        parent.add(roof);
      }
    }
  }

  buildSalterns(parent, style) {
    // Bassins quadrillés
    const water = new THREE.MeshPhongMaterial({
      color: 0xb8c8c0, transparent: true, opacity: 0.7, shininess: 80,
    });
    const bund = new THREE.MeshLambertMaterial({ color: 0x6a604a });
    if (style === 'huts') {
      // Pas de salines, juste eau libre
      const lake = new THREE.Mesh(new THREE.PlaneGeometry(20, 14), water);
      lake.rotation.x = -Math.PI / 2;
      lake.position.y = 0.1; parent.add(lake);
      return;
    }
    for (let r = -3; r <= 3; r++) {
      for (let c = -3; c <= 3; c++) {
        const pond = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), water);
        pond.rotation.x = -Math.PI / 2;
        pond.position.set(r * 4, 0.05, c * 4); parent.add(pond);
        if (c === -3) {
          const wall = new THREE.Mesh(new THREE.BoxGeometry(4, 0.3, 0.2), bund);
          wall.position.set(r * 4, 0.1, c * 4 - 1.85); parent.add(wall);
        }
      }
    }
    // Tas de sel
    if (style === 'xix' || style === 'xvii' || style === 'contemporary') {
      for (let i = 0; i < 4; i++) {
        const heap = new THREE.Mesh(
          new THREE.ConeGeometry(1.2, 1.5, 6),
          new THREE.MeshLambertMaterial({ color: 0xf4f0e8 })
        );
        heap.position.set(-10 + i * 6, 0.75, 10); parent.add(heap);
      }
    }
  }

  scatterVegetation(era) {
    const rng = mulberry32(42);
    const pineMat = new THREE.MeshLambertMaterial({ color: 0x3a5028 });
    const trunkMat = new THREE.MeshLambertMaterial({ color: 0x5a3a26 });
    const oysterMat = new THREE.MeshLambertMaterial({ color: 0x88a07c });

    const density = era.vegetationDensity;
    const N = Math.floor(900 * density);

    // Instanced trees pour performances
    const pineGeo = new THREE.ConeGeometry(1.4, 4.5, 6);
    const trunkGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.5, 5);
    const pineMesh = new THREE.InstancedMesh(pineGeo, pineMat, N);
    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, N);

    const m = new THREE.Matrix4();
    let count = 0;
    let attempts = 0;
    while (count < N && attempts < N * 6) {
      attempts++;
      const x = (rng() - 0.5) * ISLAND_SIZE;
      const z = (rng() - 0.5) * ISLAND_WIDTH * 1.2;
      const mask = islandMask(x, z);
      if (mask < 0.15) continue;
      // Pas d'arbres sur les salines / marais
      const marshMask = Math.max(0, 1 - Math.hypot((x + 130) / 65, (z + 40) / 28));
      if (marshMask > 0.4) continue;
      // Forêts denses près du nord-ouest
      const forestMask = Math.max(0, 1 - Math.hypot((x + 100) / 16, (z + 5) / 10));
      const isInForest = forestMask > 0.3;
      const p = isInForest ? 0.9 : 0.15;
      if (rng() > p) continue;

      const h = heightAt(x, z);
      if (h < 0.8) continue;
      const scale = 0.7 + rng() * 0.7;
      m.makeScale(scale, scale, scale);
      m.setPosition(x, h + 2.2 * scale, z);
      pineMesh.setMatrixAt(count, m);
      m.setPosition(x, h + 0.75 * scale, z);
      trunkMesh.setMatrixAt(count, m);
      count++;
    }
    pineMesh.count = count;
    trunkMesh.count = count;
    pineMesh.castShadow = true;
    this.eraGroup.add(pineMesh);
    this.eraGroup.add(trunkMesh);

    // Touffes d'oyats sur les dunes
    const tuftGeo = new THREE.ConeGeometry(0.5, 0.8, 4);
    const tuftMesh = new THREE.InstancedMesh(tuftGeo, oysterMat, 500);
    let tc = 0;
    for (let i = 0; i < 1200 && tc < 500; i++) {
      const x = (rng() - 0.5) * ISLAND_SIZE;
      const z = (rng() - 0.5) * ISLAND_WIDTH * 1.2;
      const mask = islandMask(x, z);
      if (mask < 0 || mask > 0.3) continue;
      const h = heightAt(x, z);
      if (h < 0.4 || h > 2.5) continue;
      m.makeScale(0.6 + rng() * 0.5, 0.7 + rng() * 0.6, 0.6 + rng() * 0.5);
      m.setPosition(x, h + 0.4, z);
      tuftMesh.setMatrixAt(tc++, m);
    }
    tuftMesh.count = tc;
    this.eraGroup.add(tuftMesh);
  }

  // Anime l'eau (vagues + marée)
  update(dt, time) {
    // marée : ±0.5 sur ~12 minutes de jeu
    this.tidal = Math.sin(time / (12 * 60) * Math.PI * 2) * 0.5;
    this.water.position.y = this.tidal;
    // ondes simples
    const positions = this.water.geometry.attributes.position;
    const arr = positions.array;
    const start = this.waterStart;
    const t = time * 0.6;
    for (let i = 0; i < arr.length; i += 3) {
      const x = start[i], z = start[i + 2];
      arr[i + 1] = Math.sin(x * 0.05 + t) * 0.15 + Math.cos(z * 0.04 + t * 1.3) * 0.12;
    }
    positions.needsUpdate = true;

    // Ondulation discrète des marqueurs
    this.markers.children.forEach((m, i) => {
      m.material.opacity = 0.12 + 0.06 * Math.sin(time * 1.5 + i);
    });
  }

  setMarkerVisible(visible) {
    this.markers.visible = visible;
  }
}

export const WORLD_BOUNDS = {
  size: WORLD_SIZE,
  island: { width: ISLAND_SIZE, height: ISLAND_WIDTH },
};
