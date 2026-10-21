// Paysage de l'île hors de la ville de l'époque, à sa place géographique
// réelle. L'île change avec le temps :
//  - Néolithique : chênaie dense, trois îles, pas de sel ni de vigne ;
//  - à partir des Romains : vignes, premiers marais salants, fermes ;
//  - Moyen Âge : villages autour de leur église, gués envasés ;
//  - XVIIᵉ–XIXᵉ : moulins à vent, mulons de sel, tour puis phare des Baleines ;
//  - XIXᵉ : pinèdes plantées pour fixer les dunes ;
//  - 1943 : bunkers du Mur de l'Atlantique sur la côte sud ;
//  - aujourd'hui : pistes cyclables, bunkers basculés, pont vers le continent.

import * as THREE from 'three';
import { heightAt, marshMask, vineMask, forestMask, coastDist, atlanticSide } from './terrain.js';
import { MAT, flat, texturedMat } from './materials.js';
import { foliageTexture, barkTexture } from '../gfx/textures.js';
import { leafCardTexture, grassTuftTexture, leafCardsGeometry, lumpyGeometry, tuftGeometry, cardMaterial } from '../gfx/foliage.js';
import { mulberry32, hashStr, smoothstep } from '../core/rng.js';
import { gableRoofGeometry, box } from './builder.js';
import { LOCATIONS, placementOf, localToWorld } from './locations.js';
import { BRIDGE, geoEra } from './geo/shape.js';
import { batchStatic } from '../gfx/batch.js';

const PI = Math.PI;
const ORDER = { prehistoire: 1, antiquite: 2, moyenage: 3, xvii: 4, xix: 5, wwii: 6, contemporaine: 7 };
// emprise de l'île (unités de monde)
const IX0 = -800, IX1 = 810, IZ0 = -435, IZ1 = 430;

export function buildLandscape(world, era, town, flags, pl) {
  const group = new THREE.Group();
  const animated = [];
  const interactables = [];
  const rng = mulberry32(hashStr('land-' + era.id));
  const o = ORDER[era.id];
  const tx = pl.x, tz = pl.z;
  const nearTown = (x, z, r = 62) => Math.hypot(x - tx, z - tz) < r;
  const ctx = { world, era, group, animated, interactables, rng, o, nearTown, flags, town, pl };

  roads(ctx);
  vegetation(ctx);
  if (era.look.vines) vineyards(ctx);
  if (era.look.saltPans && o >= 3) saltHeaps(ctx);
  if (era.look.windmills) windmills(ctx);
  villages(ctx);
  landmarks(ctx);
  if (o >= 3) fishWeirs(ctx);
  if (era.look.bunkers) coastBunkers(ctx, false);
  if (era.look.ruinedBunkers) coastBunkers(ctx, true);
  if (geoEra().bridge) bridge(ctx);
  return { group, animated, interactables };
}

const rand = (rng, a, b) => a + (b - a) * rng();
const land = (x, z, d = 2) => coastDist(x, z) > d;

// ----------------------------------------------------------------------
//  Routes et chemins entre les villages
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

// Réseau routier réel : la grande route (D735) et la route du sud (D201)
const ROADS = [
  { min: 2, pts: [[800, 281], [745, 300], [689, 311], [640, 270], [560, 190], [470, 120], [418, 100], [350, 60], [280, 15], [210, 0], [130, 8], [40, 25], [-30, 32], [-83, 38], [-170, 20], [-260, 5], [-330, -2], [-400, -6], [-470, -22], [-520, -38], [-564, -50], [-610, -80], [-650, -140], [-694, -192], [-730, -250], [-768, -305]] },
  { min: 3, pts: [[689, 311], [600, 330], [530, 345], [478, 348], [400, 300], [300, 230], [200, 160], [120, 115], [78, 100], [0, 70], [-83, 38]] },
  { min: 3, pts: [[-694, -192], [-650, -260], [-600, -320], [-540, -350], [-468, -361]] },
  { min: 3, pts: [[-230, 10], [-215, -40], [-200, -100], [-185, -150], [-178, -170]] },
];
function roads({ era, group, o, nearTown, pl }) {
  const mat = o <= 2 ? MAT.dirtPale() : o >= 6 ? MAT.asphalt() : MAT.dirt();
  const width = o === 1 ? 1.6 : o >= 6 ? 6.5 : o === 2 ? 3 : 4;
  for (const road of ROADS) {
    if (o < road.min && !(o === 1 && road === ROADS[0])) continue;
    const curve = new THREE.CatmullRomCurve3(road.pts.map(([x, z]) => new THREE.Vector3(x, 0, z)), false, 'catmullrom', 0.5);
    const pts = curve.getSpacedPoints(Math.ceil(curve.getLength() / 4)).map((p) => ({ x: p.x, z: p.z }));
    let seg = [];
    const flush = () => { if (seg.length > 2) strip(group, seg, width, mat); seg = []; };
    for (const p of pts) {
      if (nearTown(p.x, p.z, 52) || heightAt(p.x, p.z) < 0.25) flush(); else seg.push(p);
    }
    flush();
    // piste cyclable rouge le long de la grande route
    if (era.look.bikePaths && road === ROADS[0]) {
      let bs = [];
      for (let i = 0; i < pts.length; i++) {
        const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
        const dx = b.x - a.x, dz = b.z - a.z, dl = Math.hypot(dx, dz) || 1;
        const p = { x: pts[i].x - (dz / dl) * 7, z: pts[i].z + (dx / dl) * 7 };
        if (nearTown(p.x, p.z, 45) || heightAt(p.x, p.z) < 0.3) { if (bs.length > 2) strip(group, bs, 2.6, MAT.cycleway(), 0.08); bs = []; } else bs.push(p);
      }
      if (bs.length > 2) strip(group, bs, 2.6, MAT.cycleway(), 0.08);
    }
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

// Échantillonne l'île, plus densément près de la ville active
function sampler(rng, pl, near = 320) {
  return () => {
    if (rng() < 0.55) {
      const a = rng() * PI * 2, r = Math.sqrt(rng()) * near;
      return [pl.x + Math.cos(a) * r, pl.z + Math.sin(a) * r];
    }
    return [rand(rng, IX0, IX1), rand(rng, IZ0, IZ1)];
  };
}

function vegetation({ world, era, group, rng, o, nearTown, pl }) {
  const look = era.look;
  const trunks = [], crowns = [], pineTrunks = [], pineCrowns = [], tamarisk = [];
  const bushes = [], gorse = [], oyats = [], reeds = [], salicorne = [];
  const N = Math.floor(2600 * look.treeDensity);
  const pick = sampler(rng, pl);

  for (let i = 0; i < N * 6 && trunks.length + pineTrunks.length < N; i++) {
    const [x, z] = pick();
    const d = coastDist(x, z);
    if (d < 6 || nearTown(x, z, 62)) continue;
    const h = heightAt(x, z);
    if (h < 0.9) continue;
    if (marshMask(x, z) > 0.4) continue;
    if (look.vines && vineMask(x, z) > 0.45) continue;
    const fm = forestMask(x, z);
    const dens = o === 1 ? 0.3 + fm : fm > 0.35 ? 0.9 : 0.06;
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

  // dunes à oyats, ajoncs en fleurs, tamaris du littoral, roseaux des marais
  for (let i = 0; i < 9000; i++) {
    const [x, z] = pick();
    const d = coastDist(x, z);
    if (d < 1 || nearTown(x, z, 52)) continue;
    const h = heightAt(x, z);
    if (h < 0.4) continue;
    const s = 0.5 + rng() * 0.8;
    const atl = atlanticSide(x, z);
    if (atl > 0.45 && d < 30) {
      if (rng() < 0.6) oyats.push(compose(x, h - 0.05, z, 0.9 + rng() * 0.6, 0.8 + rng() * 0.6, 0.9 + rng() * 0.6, rng() * PI));
      else if (rng() < 0.35) gorse.push(compose(x, h + 0.35 * s, z, s, s * 0.7, s));
      else if (rng() < 0.3 && o >= 2) tamarisk.push(compose(x, h + 1.4 * s, z, 1.4 * s, 1.1 * s, 1.4 * s, rng() * PI));
    } else if (marshMask(x, z) > 0.45 || (d < 8 && atl < 0.4)) {
      if (rng() < 0.5) salicorne.push(compose(x, h + 0.12, z, 0.5 + rng() * 0.4, 0.25, 0.5 + rng() * 0.4, rng() * PI));
      else reeds.push(compose(x, h - 0.05, z, 0.7, 1.5 + rng() * 0.8, 0.7, rng() * PI));
    } else if (rng() < 0.25) {
      bushes.push(compose(x, h + 0.45 * s, z, s, s * 0.75, s, rng() * PI));
    }
  }

  const bark = texturedMat('bark', barkTexture(1), { bumpScale: 0.4 });
  const leafBase = look.trees === 'oak' ? 0x45652a : 0x4e6e30;
  const crownMat = texturedMat(`crown-${look.trees}`, foliageTexture(mix(leafBase, 0x000000, 0.25), 1), { bumpScale: 0.3 });
  const pineMat = texturedMat('pinecrown', foliageTexture(0x2a4220, 1), { bumpScale: 0.3 });
  instanced(group, new THREE.CylinderGeometry(0.16, 0.26, 3, 6), bark, trunks);
  instanced(group, new THREE.CylinderGeometry(0.12, 0.2, 6, 6), bark, pineTrunks);
  // houppiers : noyau bosselé sombre + cartes de feuilles découpées
  bushy(group, crowns, crownMat, leafCardTexture(leafBase, 'broad'), 'crown-' + look.trees, 9);
  bushy(group, pineCrowns, pineMat, leafCardTexture(0x34502a, 'needle'), 'pine', 8);
  bushy(group, tamarisk, texturedMat('tamarisk', foliageTexture(0x5a6a44, 1)), leafCardTexture(0x7a8a5c, 'needle'), 'tamarisk', 9);
  bushy(group, bushes, texturedMat('bush', foliageTexture(0x34501f, 1)), leafCardTexture(0x4a6a32, 'broad'), 'bush', 7);
  bushy(group, gorse, texturedMat('gorse', foliageTexture(0x4a5a1a, 1)), leafCardTexture(0x9a9020, 'needle'), 'gorse', 8);
  // oyats, roseaux et salicornes : touffes croisées
  tufts(group, oyats, grassTuftTexture(0xa8ac70), 'oyat');
  tufts(group, reeds, grassTuftTexture(0x8a8a50), 'reed');
  instanced(group, new THREE.IcosahedronGeometry(0.4, 0), flat(0x8a5a4a, 1), salicorne, false);
  grass({ group, rng, nearTown, look, pl });
}

// Noyau + cartes de feuilles partageant les mêmes matrices d'instance
function bushy(group, matrices, coreMat, cardTex, key, cards) {
  if (!matrices.length) return;
  const core = lumpyGeometry(key.length * 31, 1, 0.24).clone().scale(0.64, 0.64, 0.64);
  instanced(group, core, coreMat, matrices);
  instanced(group, leafCardsGeometry(cards, key.length * 17), cardMaterial(cardTex, 'cards-' + key), matrices);
}

function tufts(group, matrices, tex, key) {
  if (!matrices.length) return;
  const im = instanced(group, tuftGeometry(), cardMaterial(tex, 'tuft-' + key), matrices, false);
  // plans verticaux : pas d'ombres reçues (évite l'acné d'ombre qui les noircit)
  if (im) im.receiveShadow = false;
}

// Touffes d'herbe dans les prés autour de la ville active
function grass({ group, rng, nearTown, look, pl }) {
  const list = [];
  for (let i = 0; i < 20000 && list.length < 6000; i++) {
    const a = rng() * PI * 2, r = 47 + Math.sqrt(rng()) * 130;
    const x = pl.x + Math.cos(a) * r, z = pl.z + Math.sin(a) * r;
    if (nearTown(x, z, 47)) continue;
    if (coastDist(x, z) < 8 || marshMask(x, z) > 0.4) continue;
    const h = heightAt(x, z);
    if (h < 0.9) continue;
    const s = 0.45 + rng() * 0.5;
    list.push(compose(x, h - 0.02, z, s * 1.3, s, s * 1.3, rng() * PI));
  }
  tufts(group, list, grassTuftTexture(look.grassTuft ?? 0x6a8a3a), 'grass');
}

function mix(a, b, t) {
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

// ----------------------------------------------------------------------
//  Vignobles en rangs (autour de la ville ; plus loin, la couleur du sol suffit)
// ----------------------------------------------------------------------
function vineyards({ era, group, rng, nearTown, pl }) {
  const stalks = [], leaves = [];
  const abandoned = era.id === 'wwii';
  const R = 260;
  for (let x = pl.x - R; x < pl.x + R; x += 2.4) {
    for (let z = pl.z - R; z < pl.z + R; z += 1.3) {
      if (vineMask(x, z) < 0.55 || nearTown(x, z, 56) || !nearTown(x, z, R)) continue;
      if (coastDist(x, z) < 10) continue;
      const h = heightAt(x, z);
      if (h < 0.8) continue;
      if (abandoned && rng() < 0.4) continue;
      stalks.push(compose(x, h + 0.35, z, 1, 1, 1));
      leaves.push(compose(x, h + 0.9, z, 0.5, 0.45, 0.75, rng() * 0.3));
    }
  }
  instanced(group, new THREE.BoxGeometry(0.07, 0.7, 0.07), MAT.woodDark(), stalks, false);
  instanced(group, lumpyGeometry(11, 0, 0.3),
    texturedMat(abandoned ? 'vineDry' : 'vineGreen', foliageTexture(abandoned ? 0x7a6a3a : (era.look.vineGreen ?? 0x587a30), 1), { bumpScale: 0.3 }), leaves);
}

// Mulons : tas de sel récolté au bord des marais
function saltHeaps({ group, rng, nearTown, world }) {
  const heaps = [];
  for (let i = 0; i < 3000 && heaps.length < 90; i++) {
    const x = rand(rng, -720, 0), z = rand(rng, -330, 40);
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
  const spots = [[-620, -95], [-700, -235], [-300, -115], [-250, -40], [-20, 12], [120, 45], [300, 135], [520, 250], [-505, -300], [610, 300]];
  for (const [x, z] of spots) {
    if (nearTown(x, z, 55) || !land(x, z, 8)) continue;
    const g = new THREE.Group();
    const h = heightAt(x, z);
    g.position.set(x, h, z);
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.0, 2.6, 8, 14), era.id === 'xix' || era.id === 'contemporaine' ? MAT.whitewash() : MAT.stoneOld());
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
    g.rotation.y = Math.atan2(-0.4, 1);   // ailes face au vent d'ouest
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    group.add(g);
    animated.push({ obj: hub, kind: 'spin', speed: 0.5 });
    world.addCollider(x, z, 2.8);
  }
}

// ----------------------------------------------------------------------
//  Villages vus de loin (maisons simplifiées autour de leur église)
// ----------------------------------------------------------------------
function villages({ group, world, era, o, town, rng }) {
  if (o === 1) return;            // au Néolithique, pas encore de village
  const vg = new THREE.Group();
  const roofMat = MAT.tiles(), roofOld = MAT.tilesOld();
  const walls = [MAT.whitewash(), MAT.cream(), MAT.plasterOld()];
  for (const loc of LOCATIONS) {
    if (loc.village === false || loc.mainland || loc.id === town.id) continue;
    const [vx, , vz] = loc.position;
    const r2 = mulberry32(hashStr(loc.id + era.id));
    // taille du village selon l'époque
    const n = o === 2 ? 3 : Math.round((o === 3 ? 10 : o <= 5 ? 22 : 34) * (0.7 + r2() * 0.6));
    const placed = [];
    const ang = r2() * PI;
    for (let k = 0, tries = 0; k < n && tries < n * 30; tries++) {
      const along = (r2() - 0.5) * (12 + n * 3.2), across = (r2() - 0.5) * (8 + n * 1.6);
      const x = vx + Math.cos(ang) * along - Math.sin(ang) * across;
      const z = vz + Math.sin(ang) * along + Math.cos(ang) * across;
      if (!land(x, z, 6) || placed.some((p) => Math.hypot(p[0] - x, p[1] - z) < 8)) continue;
      placed.push([x, z]);
      k++;
      const w = 5 + r2() * 4, d = 5 + r2() * 2, fl = o >= 4 && r2() < 0.3 ? 2 : 1;
      const hgt = fl * 2.9 + 0.4;
      const hb = new THREE.Group();
      const body = new THREE.Mesh(box(w, hgt + 0.6, d, 3), walls[Math.floor(r2() * walls.length)]);
      body.position.y = hgt / 2 - 0.3;
      hb.add(body);
      const roof = new THREE.Mesh(gableRoofGeometry(w, d, Math.max(1, w * 0.36)), [o >= 5 ? roofMat : roofOld, body.material]);
      roof.position.y = hgt;
      hb.add(roof);
      hb.position.set(x, heightAt(x, z), z);
      hb.rotation.y = ang + (r2() < 0.5 ? 0 : PI / 2);
      vg.add(hb);
      world.addCollider(x, z, Math.min(w, d) * 0.6);
    }
    // église et clocher (à partir du Moyen Âge)
    if (o >= 3 && placed.length) {
      const [cx, cz] = [vx + 2, vz - 2];
      if (land(cx, cz, 6)) {
        const ch = new THREE.Group();
        const nave = new THREE.Mesh(box(8, 7, 16, 3), MAT.stoneOld());
        nave.position.y = 3.2;
        ch.add(nave);
        const nr = new THREE.Mesh(gableRoofGeometry(8, 16, 2.6), [MAT.tilesOld(), MAT.stoneOld()]);
        nr.position.y = 6.7;
        ch.add(nr);
        const tower = new THREE.Mesh(box(4.4, 14, 4.4, 3), MAT.stoneOld());
        tower.position.set(0, 7, 9);
        ch.add(tower);
        const spireMat = loc.id === 'ars' && o >= 4 ? flat(0x18181a, 0.6) : MAT.slate();
        const spire = new THREE.Mesh(new THREE.ConeGeometry(3.1, loc.id === 'ars' ? 12 : 5, 8), spireMat);
        spire.position.set(0, 14 + (loc.id === 'ars' ? 6 : 2.5), 9);
        ch.add(spire);
        ch.position.set(cx, heightAt(cx, cz), cz);
        ch.rotation.y = ang;
        vg.add(ch);
        world.addCollider(cx, cz, 6);
      }
    }
  }
  vg.traverse((m) => { if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  batchStatic(vg);
  group.add(vg);
}

// ----------------------------------------------------------------------
//  Monuments visibles au loin (selon leur date de construction)
// ----------------------------------------------------------------------
function landmarks({ group, world, o, nearTown }) {
  const add = (fn, x, z, r) => {
    if (nearTown(x, z, 70)) return;
    const g = fn();
    g.position.set(x, heightAt(x, z), z);
    g.traverse((m) => { if (m.isMesh) m.castShadow = true; });
    group.add(g);
    world.addCollider(x, z, r);
  };
  const ph = placementOf('phare-baleines');
  // Tour des Baleines (Vauban, 1682)
  if (o >= 4) {
    const p = localToWorld(ph, -14, -13.7);
    add(() => {
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 3.4, 17, 14), MAT.stoneOld());
      t.position.y = 8.5; g.add(t);
      const top = new THREE.Mesh(new THREE.CylinderGeometry(3, 3, 0.8, 14), MAT.stonePale());
      top.position.y = 17.2; g.add(top);
      return g;
    }, p.x, p.z, 3.6);
  }
  // Phare des Baleines (1854)
  if (o >= 5) {
    const p = localToWorld(ph, 0, 4.6);
    add(() => {
      const g = new THREE.Group();
      const t = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 4, 46, 18), MAT.stonePale());
      t.position.y = 23; g.add(t);
      const lan = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 3.6, 12), flat(0x1c1c20, 0.35, 0.55));
      lan.position.y = 48; g.add(lan);
      const glow = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), MAT.glassLit());
      glow.position.y = 48; g.add(glow);
      return g;
    }, p.x, p.z, 4.5);
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
      return g;
    }, 517, 128, 12);
  }
  // Ruines de l'abbaye des Châteliers (démantelée en 1623-1625)
  if (o >= 4) {
    const p = localToWorld(placementOf('flotte'), -40, -16);
    add(() => {
      const g = new THREE.Group();
      const facade = new THREE.Mesh(box(10, 12, 1.4, 3), MAT.stoneOld());
      facade.position.y = 6; g.add(facade);
      const gable = new THREE.Mesh(new THREE.ConeGeometry(5.6, 3.5, 3), MAT.stoneOld());
      gable.rotation.y = PI / 2; gable.scale.z = 0.25; gable.position.y = 13.6; g.add(gable);
      const arch = new THREE.Mesh(box(3, 6, 1.6), flat(0x101010, 1));
      arch.position.y = 3; g.add(arch);
      for (const sx of [-1, 1]) {
        const w = new THREE.Mesh(box(1.1, 6, 9, 3), MAT.stoneOld());
        w.position.set(sx * 4.6, 2.5, -5); g.add(w);
      }
      return g;
    }, p.x, p.z, 6);
  }
}

// ----------------------------------------------------------------------
//  Écluses à poissons : murets de pierre en arc sur l'estran
// ----------------------------------------------------------------------
function fishWeirs({ group }) {
  const centers = [[480, 392], [545, 380], [610, 352], [-780, -262], [-735, -95], [-150, -228], [330, 30], [700, 335]];
  for (const [cx0, cz0] of centers) {
    // on cherche l'estran devant ce point, puis on oriente l'arc vers la côte
    const gx = coastDist(cx0 + 2, cz0) - coastDist(cx0 - 2, cz0), gz = coastDist(cx0, cz0 + 2) - coastDist(cx0, cz0 - 2);
    const gl = Math.hypot(gx, gz) || 1;
    const nx = -gx / gl, nz = -gz / gl;                 // vers le large
    const d0 = coastDist(cx0, cz0);
    const cx = cx0 + nx * (d0 + 9), cz = cz0 + nz * (d0 + 9);
    const base = Math.atan2(nz, nx);
    for (let i = 0; i <= 16; i++) {
      const a = base - PI / 2 + PI * (i / 16);
      const x = cx + Math.cos(a) * 18, z = cz + Math.sin(a) * 10;
      const h = heightAt(x, z);
      if (h > 0.4) continue;
      const b = new THREE.Mesh(box(2.4, 1.0, 0.9), MAT.stoneDark());
      b.position.set(x, Math.max(h, -1.4) + 0.2, z);
      b.rotation.y = -a + PI / 2;
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
  for (let i = 0; i < 4000 && n < 22; i++) {
    const x = rand(rng, -760, 760), z = rand(rng, -200, 420);
    if (atlanticSide(x, z) < 0.7) continue;
    const d = coastDist(x, z);
    if (d < 4 || d > 7 || nearTown(x, z, 60) || heightAt(x, z) < 0.6) continue;
    const gx = coastDist(x + 2, z) - coastDist(x - 2, z), gz = coastDist(x, z + 2) - coastDist(x, z - 2);
    const face = Math.atan2(-gx, -gz);               // meurtrière tournée vers le large
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
    // aujourd'hui, l'érosion a emporté la dune : le bunker a glissé sur la plage
    const bx = ruined ? x + Math.sin(face) * (d + 2) : x;
    const bz = ruined ? z + Math.cos(face) * (d + 2) : z;
    g.position.set(bx, heightAt(bx, bz) - (ruined ? 0.8 : 0), bz);
    g.rotation.y = face;
    if (ruined) { g.rotation.z = (rng() - 0.5) * 0.5; g.rotation.x = 0.25; }
    g.traverse((m2) => { if (m2.isMesh) m2.castShadow = true; });
    group.add(g);
    world.addCollider(bx, bz, 3.6);
    n++;
  }
}

// ----------------------------------------------------------------------
//  Le pont de l'île de Ré (1988) : 2,9 km, entre Sablanceaux et La Pallice
// ----------------------------------------------------------------------
function bridge({ group }) {
  const curve = new THREE.CatmullRomCurve3(BRIDGE.map(([x, z]) => new THREE.Vector3(x, 0, z)));
  const L = curve.getLength();
  const n = Math.ceil(L / 3);
  const pts = curve.getSpacedPoints(n);
  // profil en long : le tablier s'élève jusqu'à la passe navigable
  const deckY = (t) => 3 + 13 * Math.sin(Math.min(1, Math.max(0, (t - 0.05) / 0.9)) * PI) ** 0.8;
  const deckMat = flat(0xc8c4bc, 0.8), pierMat = MAT.concrete(), railMat = flat(0xe8e8e4, 0.5, 0.3);
  const bg = new THREE.Group();
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1];
    const t0 = i / n, t1 = (i + 1) / n;
    const ya = deckY(t0), yb = deckY(t1);
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const seg = new THREE.Mesh(box(8, 1.4, len + 0.05), deckMat);
    seg.position.set((a.x + b.x) / 2, (ya + yb) / 2, (a.z + b.z) / 2);
    seg.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
    seg.rotation.x = -Math.atan2(yb - ya, len);
    bg.add(seg);
    for (const s of [-1, 1]) {
      const rail = new THREE.Mesh(box(0.15, 1.0, len + 0.05), railMat);
      rail.position.set(0, 1.2, 0);
      rail.position.x = s * 3.9;
      const holder = new THREE.Group();
      holder.position.copy(seg.position);
      holder.rotation.copy(seg.rotation);
      holder.add(rail);
      bg.add(holder);
    }
    if (i % 6 === 0) {
      const h = ya + 14;
      const pier = new THREE.Mesh(box(5, h, 3, 3), pierMat);
      pier.position.set(a.x, ya - h / 2 - 0.6, a.z);
      pier.rotation.y = seg.rotation.y;
      bg.add(pier);
    }
  }
  bg.traverse((m) => { if (m.isMesh) m.castShadow = true; });
  batchStatic(bg);
  group.add(bg);
}

export { smoothstep };
