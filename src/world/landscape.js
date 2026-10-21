// Paysage de l'île hors de la ville de l'époque. L'île change avec le temps :
//  - Néolithique : chênaie dense, marais vierges, pas de sel ni de vigne ;
//  - à partir des Romains : vignes, premiers marais salants ;
//  - XVIIᵉ–XIXᵉ : moulins à vent, mulons de sel, tour puis phare des Baleines ;
//  - XIXᵉ : pinèdes plantées pour fixer les dunes ;
//  - 1943 : bunkers du Mur de l'Atlantique et obstacles de plage ;
//  - aujourd'hui : pistes cyclables, bunkers basculés sur les plages.

import * as THREE from 'three';
import {
  heightAt, islandMask, marshMask, vineMask, forestMask, HALF_L,
} from './terrain.js';
import { MAT, flat, texturedMat } from './materials.js';
import { foliageTexture, barkTexture } from '../gfx/textures.js';
import { mulberry32, hashStr, smoothstep } from '../core/rng.js';
import { gableRoofGeometry, box } from './builder.js';
import { LOCATIONS } from './locations.js';

const PI = Math.PI;
const ORDER = { prehistoire: 1, antiquite: 2, moyenage: 3, xvii: 4, xix: 5, wwii: 6, contemporaine: 7 };

export function buildLandscape(world, era, town, flags) {
  const group = new THREE.Group();
  const animated = [];
  const interactables = [];
  const rng = mulberry32(hashStr('land-' + era.id));
  const o = ORDER[era.id];
  const tx = town.position[0], tz = town.position[2];
  const nearTown = (x, z, r = 62) => Math.hypot(x - tx, z - tz) < r;
  const ctx = { world, era, group, animated, interactables, rng, o, nearTown, flags };

  roads(ctx);
  vegetation(ctx);
  if (era.look.vines) vineyards(ctx);
  if (era.look.saltPans && o >= 3) saltHeaps(ctx);
  if (era.look.windmills) windmills(ctx);
  landmarks(ctx, town);
  if (o >= 3) fishWeirs(ctx);
  if (era.look.bunkers) coastBunkers(ctx, false);
  if (era.look.ruinedBunkers) coastBunkers(ctx, true);
  return { group, animated, interactables };
}

// ----------------------------------------------------------------------
//  Routes et chemins
// ----------------------------------------------------------------------
function strip(group, pts, width, mat, lift = 0.07) {
  const positions = [], uvs = [], idx = [];
  let dist = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    let dx = b.x - a.x, dz = b.z - a.z;
    const dl = Math.hypot(dx, dz) || 1; dx /= dl; dz /= dl;
    const nx = -dz, nz = dx;
    const lx = p.x + nx * width / 2, lz = p.z + nz * width / 2;
    const rx = p.x - nx * width / 2, rz = p.z - nz * width / 2;
    positions.push(lx, Math.max(heightAt(lx, lz), 0.05) + lift, lz, rx, Math.max(heightAt(rx, rz), 0.05) + lift, rz);
    if (i > 0) dist += Math.hypot(p.x - pts[i - 1].x, p.z - pts[i - 1].z);
    uvs.push(0, dist / 3, width / 3, dist / 3);
  }
  for (let i = 0; i < pts.length - 1; i++) { const k = i * 2; idx.push(k, k + 2, k + 1, k + 1, k + 2, k + 3); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  m.userData.disposable = true;
  group.add(m);
  return m;
}

function roads({ era, group, o, nearTown }) {
  // grande route de l'île reliant les villages d'ouest en est
  const towns = [...LOCATIONS].filter((l) => l.id !== 'lilleau' && l.id !== 'fort-la-pree')
    .sort((a, b) => a.position[0] - b.position[0]);
  const ctrl = towns.map((t) => new THREE.Vector3(t.position[0], 0, t.position[2] + 6));
  const curve = new THREE.CatmullRomCurve3(ctrl, false, 'catmullrom', 0.5);
  const pts = curve.getPoints(260).map((p) => ({ x: p.x, z: p.z }));
  // on interrompt la route dans la ville (ses rues prennent le relais)
  const segments = [];
  let cur = [];
  for (const p of pts) {
    if (nearTown(p.x, p.z, 40) || heightAt(p.x, p.z) < 0.3) {
      if (cur.length > 2) segments.push(cur);
      cur = [];
    } else cur.push(p);
  }
  if (cur.length > 2) segments.push(cur);
  const mat = o === 1 ? MAT.dirtPale() : o === 7 ? MAT.asphalt() : o >= 4 && o <= 5 ? MAT.dirt() : MAT.dirt();
  const width = o === 1 ? 1.6 : o === 7 ? 5.5 : 3.2;
  for (const s of segments) strip(group, s, width, mat);

  if (era.look.bikePaths) {
    // piste cyclable (revêtement rouge et ligne médiane) en léger décalage
    const off = pts.map((p, i) => {
      const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
      let dx = b.x - a.x, dz = b.z - a.z;
      const dl = Math.hypot(dx, dz) || 1;
      return { x: p.x - (dz / dl) * 7, z: p.z + (dx / dl) * 7 };
    });
    let seg = [];
    for (const p of off) {
      if (nearTown(p.x, p.z, 30) || heightAt(p.x, p.z) < 0.3) { if (seg.length > 2) strip(group, seg, 2.6, MAT.cycleway(), 0.08); seg = []; } else seg.push(p);
    }
    if (seg.length > 2) strip(group, seg, 2.6, MAT.cycleway(), 0.08);
  }
}

// ----------------------------------------------------------------------
//  Végétation instanciée
// ----------------------------------------------------------------------
function instanced(group, geo, mat, matrices, shadow = true) {
  if (!matrices.length) return null;
  const im = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((m, i) => im.setMatrixAt(i, m));
  im.castShadow = shadow;
  im.receiveShadow = true;
  im.instanceMatrix.needsUpdate = true;
  im.computeBoundingSphere();
  group.add(im);
  return im;
}

const M4 = () => new THREE.Matrix4();
function compose(x, y, z, sx, sy, sz, ry = 0, rx = 0, rz = 0) {
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  return M4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
}

function vegetation({ world, era, group, rng, o, nearTown }) {
  const look = era.look;
  const trunks = [], crowns = [], pineTrunks = [], pineCrowns = [], tamarisk = [];
  const bushes = [], gorse = [], oyats = [], reeds = [], salicorne = [];
  const N = Math.floor(1400 * look.treeDensity);

  for (let i = 0; i < N * 4 && trunks.length + pineTrunks.length < N; i++) {
    const x = (rng() - 0.5) * HALF_L * 2;
    const z = (rng() - 0.5) * 130;
    const m = islandMask(x, z);
    if (m < 0.1 || nearTown(x, z, 60)) continue;
    const h = heightAt(x, z);
    if (h < 0.9) continue;
    if (marshMask(x, z) > 0.4) continue;
    if (look.vines && vineMask(x, z) > 0.45) continue;
    const fm = forestMask(x, z);
    const dens = o === 1 ? 0.35 + fm : fm > 0.35 ? 0.85 : 0.07;
    if (rng() > dens) continue;
    const s = 0.75 + rng() * 0.6;
    const usePine = look.pines && (fm > 0.35 || rng() < 0.4);
    if (usePine) {
      // pin maritime : long fût penché, houppier en parasol
      const lean = (rng() - 0.5) * 0.18;
      const th = (6 + rng() * 4) * s;
      pineTrunks.push(compose(x, h + th / 2, z, s, th / 6, s, rng() * PI, lean, lean * 0.5));
      pineCrowns.push(compose(x + lean * th * 0.5, h + th + 0.3, z, 2.6 * s, 1.0 * s, 2.6 * s, rng() * PI));
      pineCrowns.push(compose(x + lean * th * 0.5 + (rng() - 0.5) * 1.6, h + th - 0.4, z + (rng() - 0.5) * 1.6, 1.9 * s, 0.8 * s, 1.9 * s, rng() * PI));
    } else {
      const th = (look.trees === 'oak' ? 3 : 3.6) * s;
      trunks.push(compose(x, h + th / 2, z, s * 1.2, th / 3, s * 1.2, rng() * PI));
      const cr = look.trees === 'oak' ? 2.6 : 2.0;
      crowns.push(compose(x, h + th + cr * 0.55 * s, z, cr * s, cr * 0.8 * s, cr * s, rng() * PI));
      crowns.push(compose(x + (rng() - 0.5) * 2 * s, h + th + cr * 0.3 * s, z + (rng() - 0.5) * 2 * s, cr * 0.75 * s, cr * 0.6 * s, cr * 0.75 * s, rng() * PI));
    }
    world.addCollider(x, z, 0.45 * s);
  }

  // bosquets, ajoncs en fleurs, tamaris du littoral
  for (let i = 0; i < 2600; i++) {
    const x = (rng() - 0.5) * HALF_L * 2, z = (rng() - 0.5) * 130;
    const m = islandMask(x, z);
    if (m < 0.02 || nearTown(x, z, 52)) continue;
    const h = heightAt(x, z);
    if (h < 0.7) continue;
    const s = 0.5 + rng() * 0.8;
    if (m < 0.12) {
      if (rng() < 0.55) oyats.push(compose(x, h + 0.35, z, 0.6 + rng() * 0.5, 0.7 + rng() * 0.6, 0.6 + rng() * 0.5, rng() * PI));
      else if (rng() < 0.35) gorse.push(compose(x, h + 0.35 * s, z, s, s * 0.7, s));
      else if (rng() < 0.25 && o >= 2) tamarisk.push(compose(x, h + 1.4 * s, z, 1.4 * s, 1.1 * s, 1.4 * s, rng() * PI));
    } else if (marshMask(x, z) > 0.45) {
      if (rng() < 0.5) salicorne.push(compose(x, h + 0.12, z, 0.5 + rng() * 0.4, 0.25, 0.5 + rng() * 0.4, rng() * PI));
      else reeds.push(compose(x, h + 0.7, z, 0.35, 1.2 + rng() * 0.6, 0.35, rng() * PI));
    } else if (rng() < 0.35) {
      bushes.push(compose(x, h + 0.45 * s, z, s, s * 0.75, s, rng() * PI));
    }
  }

  const bark = texturedMat('bark', barkTexture(1), { bumpScale: 0.4 });
  const crownMat = texturedMat(`crown-${look.trees}`, foliageTexture(look.trees === 'oak' ? 0x45652a : 0x4e6e30, 1), { bumpScale: 0.3 });
  const pineMat = texturedMat('pinecrown', foliageTexture(0x34502a, 1), { bumpScale: 0.3 });
  instanced(group, new THREE.CylinderGeometry(0.16, 0.26, 3, 6), bark, trunks);
  instanced(group, new THREE.IcosahedronGeometry(1, 1), crownMat, crowns);
  instanced(group, new THREE.CylinderGeometry(0.12, 0.2, 6, 6), bark, pineTrunks);
  instanced(group, new THREE.IcosahedronGeometry(1, 1), pineMat, pineCrowns);
  instanced(group, new THREE.IcosahedronGeometry(1, 0), texturedMat('tamarisk', foliageTexture(0x7a8a5c, 1)), tamarisk);
  instanced(group, new THREE.IcosahedronGeometry(1, 0), texturedMat('bush', foliageTexture(0x4a6a32, 1)), bushes);
  instanced(group, new THREE.IcosahedronGeometry(0.7, 0), texturedMat('gorse', foliageTexture(0x8a8a2a, 1)), gorse);
  instanced(group, new THREE.ConeGeometry(0.35, 0.9, 5), flat(0xa8ac70, 1), oyats, false);
  instanced(group, new THREE.CylinderGeometry(0.02, 0.05, 1, 4), flat(0x8a8a50, 1), reeds, false);
  instanced(group, new THREE.IcosahedronGeometry(0.4, 0), flat(0x8a5a4a, 1), salicorne, false);
}

// ----------------------------------------------------------------------
//  Vignobles en rangs
// ----------------------------------------------------------------------
function vineyards({ era, group, rng, o, nearTown }) {
  const stalks = [], leaves = [];
  const abandoned = era.id === 'wwii';
  for (let x = -HALF_L; x < HALF_L; x += 2.4) {
    for (let z = -60; z < 60; z += 1.3) {
      if (vineMask(x, z) < 0.55 || nearTown(x, z, 56)) continue;
      const h = heightAt(x, z);
      if (h < 0.8 || islandMask(x, z) < 0.12) continue;
      if (abandoned && rng() < 0.4) continue;
      stalks.push(compose(x, h + 0.35, z, 1, 1, 1));
      leaves.push(compose(x, h + 0.9, z, 0.5, 0.45, 0.75, rng() * 0.3));
    }
  }
  instanced(group, new THREE.BoxGeometry(0.07, 0.7, 0.07), MAT.woodDark(), stalks, false);
  instanced(group, new THREE.IcosahedronGeometry(1, 0),
    texturedMat(abandoned ? 'vineDry' : 'vineGreen', foliageTexture(abandoned ? 0x7a6a3a : (era.look.vineGreen ?? 0x587a30), 1), { bumpScale: 0.3 }), leaves);
}

// Mulons : tas de sel récolté au bord des marais
function saltHeaps({ group, rng, nearTown, world }) {
  const heaps = [];
  for (let i = 0; i < 400 && heaps.length < 40; i++) {
    const x = -170 + rng() * 140, z = -55 + rng() * 40;
    if (marshMask(x, z) < 0.6 || nearTown(x, z, 50)) continue;
    const h = heightAt(x, z);
    if (h < 0.4) continue;
    const s = 0.9 + rng() * 0.8;
    heaps.push(compose(x, h + s * 0.55, z, s, s, s));
    world.addCollider(x, z, s * 0.9);
  }
  instanced(group, new THREE.ConeGeometry(1.4, 1.6, 10), MAT.salt(), heaps);
}

// ----------------------------------------------------------------------
//  Moulins à vent (tours de pierre chaulées)
// ----------------------------------------------------------------------
function windmills({ group, animated, world, nearTown, era }) {
  const spots = [[-28, 8], [58, 6], [-100, 12], [96, -6], [-150, 6], [128, 4]];
  for (const [x, z] of spots) {
    if (nearTown(x, z, 50) || islandMask(x, z) < 0.15) continue;
    const g = new THREE.Group();
    const h = heightAt(x, z);
    g.position.set(x, h, z);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.6, 8, 14), era.id === 'xix' ? MAT.whitewash() : MAT.stoneOld());
    tower.position.y = 3.8;
    g.add(tower);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.4, 2.4, 14), MAT.woodDark());
    cap.position.y = 9;
    g.add(cap);
    const door = new THREE.Mesh(box(1, 2, 0.1), MAT.woodDark());
    door.position.set(0, 1, 2.45);
    g.add(door);
    const hub = new THREE.Group();
    hub.position.set(0, 8.4, 2.4);
    for (let i = 0; i < 4; i++) {
      const arm = new THREE.Group();
      arm.rotation.z = (i / 4) * PI * 2;
      const spar = new THREE.Mesh(box(0.15, 6.5, 0.12), MAT.wood());
      spar.position.y = 3.25;
      arm.add(spar);
      const sail = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 5), flat(0xe6dcc4, 0.9, 0, { side: THREE.DoubleSide }));
      sail.position.set(0.75, 3.6, 0.05);
      arm.add(sail);
      hub.add(arm);
    }
    hub.userData.noBatch = true;
    g.add(hub);
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    group.add(g);
    animated.push({ obj: hub, kind: 'spin', speed: 0.5 });
    world.addCollider(x, z, 2.8);
  }
}

// ----------------------------------------------------------------------
//  Monuments visibles au loin (selon leur date de construction)
// ----------------------------------------------------------------------
function landmarks({ group, world, o, era }, town) {
  const add = (fn, x, z) => {
    if (Math.hypot(x - town.position[0], z - town.position[2]) < 70) return;
    const g = fn();
    g.position.set(x, heightAt(x, z), z);
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    group.add(g);
  };
  // Tour des Baleines (Vauban, 1682)
  if (o >= 4) {
    add(() => {
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 17, 14), MAT.stoneOld());
      t.position.y = 8.5; g.add(t);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.8, 14), MAT.stonePale());
      top.position.y = 17.2; g.add(top);
      world.addCollider(-202, -24, 3.6);
      return g;
    }, -202, -24);
  }
  // Phare des Baleines (1854)
  if (o >= 5) {
    add(() => {
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4, 46, 18), MAT.stonePale());
      t.position.y = 23; g.add(t);
      const lan = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 3.6, 12), flat(0x1c1c20, 0.35, 0.55));
      lan.position.y = 48; g.add(lan);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), MAT.glassLit());
      glow.position.y = 48; g.add(glow);
      world.addCollider(-188, -10, 4.5);
      return g;
    }, -188, -10);
  }
  // Fort La Prée (1625)
  if (o >= 4) {
    add(() => {
      const g = new THREE.Group();
      const keep = new THREE.Mesh(box(14, 6, 14, 3), MAT.rampart());
      keep.position.y = 2.6; g.add(keep);
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * PI * 2 + PI / 4;
        const b = new THREE.Mesh(box(6, 6.4, 6, 3), MAT.rampart());
        b.position.set(Math.cos(a) * 9, 2.8, Math.sin(a) * 9);
        b.rotation.y = PI / 4;
        g.add(b);
      }
      const roof = new THREE.Mesh(gableRoofGeometry(8, 10, 3), [MAT.slate(), MAT.rampart()]);
      roof.position.y = 5.6; g.add(roof);
      world.addCollider(54, -46, 12);
      return g;
    }, 54, -46);
  }
  // Ruines de l'abbaye des Châteliers (démantelée en 1623-1625)
  if (o >= 4) {
    add(() => {
      const g = new THREE.Group();
      const facade = new THREE.Mesh(box(10, 12, 1.4, 3), MAT.stoneOld());
      facade.position.y = 6; g.add(facade);
      const gable = new THREE.Mesh(new THREE.ConeGeometry(5.6, 3.5, 3), MAT.stoneOld());
      gable.rotation.y = PI / 2; gable.scale.z = 0.25; gable.position.y = 13.6; g.add(gable);
      const arch = new THREE.Mesh(box(3, 6, 1.6), flat(0x101010, 1));
      arch.position.y = 3; g.add(arch);
      for (const sx of [-1, 1]) {
        const w = new THREE.Mesh(box(1.1, 4 + Math.random() * 3, 9, 3), MAT.stoneOld());
        w.position.set(sx * 4.6, 2.5, -5); g.add(w);
      }
      world.addCollider(40, -36, 6);
      return g;
    }, 40, -36);
  }
}

// ----------------------------------------------------------------------
//  Écluses à poissons : murets de pierre en arc sur l'estran
// ----------------------------------------------------------------------
function fishWeirs({ group }) {
  const weirs = [[128, 46, 0.2], [96, 50, -0.1], [-196, 14, 1.2], [-60, 44, 0.05]];
  for (const [cx, cz, rot] of weirs) {
    for (let i = 0; i <= 14; i++) {
      const a = PI * (0.1 + 0.8 * (i / 14));
      const x = cx + Math.cos(a + rot) * 16, z = cz + Math.sin(a + rot) * 9;
      const h = heightAt(x, z);
      if (h > 0.4) continue;
      const b = new THREE.Mesh(box(2.4, 1.0, 0.9), MAT.stoneDark());
      b.position.set(x, Math.max(h, -1.4) + 0.2, z);
      b.rotation.y = -(a + rot) + PI / 2;
      b.castShadow = true;
      group.add(b);
    }
  }
}

// ----------------------------------------------------------------------
//  Bunkers du Mur de l'Atlantique (1943) puis basculés sur les plages
// ----------------------------------------------------------------------
function coastBunkers({ group, world, rng, nearTown }, ruined) {
  let n = 0;
  for (let x = -180; x < 180 && n < 12; x += 22 + rng() * 10) {
    // cherche le pied de dune côté sud
    for (let z = 30; z < 62; z += 1.5) {
      const m = islandMask(x, z);
      if (m < 0.05 && heightAt(x, z) > 0.4) {
        if (nearTown(x, z, 55)) break;
        const g = new THREE.Group();
        const body = new THREE.Mesh(box(6, 3, 5, 3), MAT.concrete());
        body.position.y = 1.2;
        g.add(body);
        const cap = new THREE.Mesh(box(6.8, 0.6, 5.8, 3), MAT.concrete());
        cap.position.y = 2.9;
        g.add(cap);
        const slit = new THREE.Mesh(box(2.2, 0.45, 0.4), MAT.black());
        slit.position.set(0, 1.9, 2.5);
        g.add(slit);
        const zz = ruined ? z + 4 : z;
        g.position.set(x, heightAt(x, zz) - (ruined ? 0.8 : 0), zz);
        if (ruined) { g.rotation.z = (rng() - 0.5) * 0.5; g.rotation.x = 0.25; }
        g.traverse((m2) => { if (m2.isMesh) m2.castShadow = true; });
        group.add(g);
        world.addCollider(x, zz, 3.6);
        n++;
        break;
      }
    }
  }
}

export { smoothstep };
