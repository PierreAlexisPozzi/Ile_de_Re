// Faune de l'île : mouettes qui tournoient au-dessus du rivage, hérons
// cendrés et aigrettes garzettes à l'affût dans les marais, lapins de garenne
// dans les dunes, poissons (mulets, bars) qui sautent près du bord, cerfs dans
// la chênaie néolithique et ânes « en culotte » des marais salants.
// Chaque animal s'enfuit si l'on approche trop vite ; on peut l'observer (E).

import * as THREE from 'three';
import { heightAt, islandMask, marshMask, forestMask } from './terrain.js';
import { flat } from './materials.js';
import { clothMat } from '../gfx/cloth.js';
import { mulberry32, hashStr, angleDiff } from '../core/rng.js';

const PI = Math.PI;

function ell(r, sx, sy, sz, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
  m.scale.set(sx, sy, sz);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}
function cyl(r1, r2, h, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r1, r2, h, 6), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

// ---------- Modèles ----------
function gullModel() {
  const g = new THREE.Group();
  const white = flat(0xf4f4f0, 0.6), grey = flat(0x9aa0a8, 0.6), yellow = flat(0xe8b830, 0.5);
  g.add(ell(0.12, 1, 0.9, 2.2, white));
  g.add(ell(0.08, 1, 1, 1.1, white, 0, 0.06, 0.26));
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.08, 5), yellow);
  beak.rotation.x = PI / 2; beak.position.set(0, 0.05, 0.36); g.add(beak);
  const wings = [];
  for (const s of [-1, 1]) {
    const piv = new THREE.Group();
    piv.position.set(s * 0.08, 0.04, 0);
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.015, 0.2), grey);
    w.position.x = s * 0.28;
    const tip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.016, 0.14), flat(0x202020, 0.6));
    tip.position.x = s * 0.58;
    piv.add(w, tip);
    g.add(piv);
    wings.push({ piv, s });
  }
  g.userData.wings = wings;
  return g;
}

function wader(white) {
  // héron cendré (gris) ou aigrette garzette (blanche, plus petite)
  const g = new THREE.Group();
  const body = flat(white ? 0xf6f6f2 : 0x8e949a, 0.7);
  const dark = flat(white ? 0x1a1a1a : 0x2a2a2e, 0.6);
  const beakM = flat(white ? 0x1a1a1a : 0xd8b040, 0.5);
  const legM = flat(white ? 0x1a1a1a : 0x8a7a50, 0.6);
  const s = white ? 0.75 : 1;
  g.add(ell(0.16 * s, 0.9, 0.9, 1.8, body, 0, 0.95 * s, 0));
  const neck = new THREE.Group();
  neck.position.set(0, 1.05 * s, 0.2 * s);
  const n1 = cyl(0.035 * s, 0.05 * s, 0.38 * s, body, 0, 0.18 * s, 0.03 * s);
  n1.rotation.x = 0.25;
  neck.add(n1);
  const head = ell(0.06 * s, 0.9, 0.9, 1.4, body, 0, 0.38 * s, 0.08 * s);
  neck.add(head);
  const beak = new THREE.Mesh(new THREE.ConeGeometry(0.02 * s, 0.2 * s, 5), beakM);
  beak.rotation.x = PI / 2; beak.position.set(0, 0.38 * s, 0.24 * s);
  neck.add(beak);
  if (!white) neck.add(ell(0.02, 3, 0.4, 0.4, dark, 0, 0.42 * s, 0.03));
  g.add(neck);
  for (const sx of [-1, 1]) {
    const leg = cyl(0.012 * s, 0.012 * s, 0.85 * s, legM, sx * 0.06 * s, 0.43 * s, 0);
    g.add(leg);
  }
  g.add(ell(0.1 * s, 0.6, 0.4, 1.6, dark, 0, 0.92 * s, -0.25 * s));
  g.userData.neck = neck;
  return g;
}

function rabbitModel() {
  const g = new THREE.Group();
  const fur = flat(0x8a7058, 0.9);
  g.add(ell(0.12, 1, 0.9, 1.4, fur, 0, 0.14, 0));
  g.add(ell(0.075, 1, 1, 1.15, fur, 0, 0.24, 0.15));
  for (const sx of [-1, 1]) {
    const ear = ell(0.025, 0.6, 2.6, 0.5, fur, sx * 0.03, 0.36, 0.12);
    ear.rotation.x = -0.3;
    g.add(ear);
  }
  g.add(ell(0.035, 1, 1, 1, flat(0xf0eee8, 0.9), 0, 0.17, -0.17));
  return g;
}

function fishModel() {
  const g = new THREE.Group();
  const m = flat(0x9aa8b0, 0.3, 0.4);
  g.add(ell(0.08, 0.5, 0.7, 2.4, m));
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.12, 4), m);
  tail.rotation.x = -PI / 2; tail.position.z = -0.24; tail.scale.x = 0.2;
  g.add(tail);
  return g;
}

function deerModel() {
  const g = new THREE.Group();
  const fur = flat(0x8a5a32, 0.9), dark = flat(0x3a2a1a, 0.8);
  g.add(ell(0.32, 0.8, 0.85, 1.7, fur, 0, 1.05, 0));
  const neck = cyl(0.09, 0.13, 0.55, fur, 0, 1.38, 0.42);
  neck.rotation.x = 0.6;
  g.add(neck);
  const head = ell(0.11, 0.8, 0.9, 1.6, fur, 0, 1.6, 0.6);
  g.add(head);
  for (const sx of [-1, 1]) {
    const antler = cyl(0.015, 0.02, 0.5, flat(0xd8c8a8, 0.8), sx * 0.08, 1.88, 0.52);
    antler.rotation.z = -sx * 0.4;
    g.add(antler);
    const tine = cyl(0.012, 0.015, 0.25, flat(0xd8c8a8, 0.8), sx * 0.18, 1.95, 0.6);
    tine.rotation.x = 0.6;
    g.add(tine);
  }
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) g.add(cyl(0.035, 0.03, 0.85, dark, sx * 0.13, 0.43, sz * 0.38));
  g.add(ell(0.06, 0.9, 1, 0.6, flat(0xf0e8d8, 0.9), 0, 1.15, -0.53));
  return g;
}

function donkeyModel() {
  // âne des marais salants vêtu de sa célèbre « culotte » rayée contre les moustiques
  const g = new THREE.Group();
  const fur = flat(0x6e6258, 0.9), muzzle = flat(0xd8d0c4, 0.9);
  const pants = clothMat({ c: 0xf0ece0, p: 'stripes', c2: 0x2a3a6a });
  g.add(ell(0.34, 0.85, 0.85, 1.65, fur, 0, 0.95, 0));
  const neck = cyl(0.12, 0.16, 0.5, fur, 0, 1.25, 0.45);
  neck.rotation.x = 0.7;
  g.add(neck);
  g.add(ell(0.12, 0.8, 0.9, 1.9, fur, 0, 1.4, 0.68));
  g.add(ell(0.08, 0.9, 0.8, 0.9, muzzle, 0, 1.32, 0.9));
  for (const sx of [-1, 1]) {
    const ear = ell(0.04, 0.6, 2.8, 0.5, fur, sx * 0.07, 1.62, 0.58);
    ear.rotation.z = sx * 0.3;
    g.add(ear);
  }
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.8, 8), pants);
    leg.position.set(sx * 0.15, 0.42, sz * 0.36);
    leg.castShadow = true;
    g.add(leg);
  }
  return g;
}

const MAKERS = {
  gull: gullModel, heron: () => wader(false), egret: () => wader(true),
  rabbit: rabbitModel, fish: fishModel, deer: deerModel, donkey: donkeyModel,
};

export const FAUNA_INFO = {
  gull: { name: 'Goéland argenté', codex: 'faune-goeland' },
  heron: { name: 'Héron cendré', codex: 'faune-heron' },
  egret: { name: 'Aigrette garzette', codex: 'faune-aigrette' },
  rabbit: { name: 'Lapin de garenne', codex: 'faune-lapin' },
  fish: { name: 'Mulet doré', codex: 'faune-poissons' },
  deer: { name: 'Cerf élaphe', codex: 'faune-cerf' },
  donkey: { name: 'Âne en culotte', codex: 'faune-ane' },
};

export class Fauna {
  constructor(world) {
    this.world = world;
    this.group = new THREE.Group();
    world.root.add(this.group);
    this.animals = [];
    this.playerPos = new THREE.Vector3();
  }

  clear() {
    while (this.group.children.length) this.group.remove(this.group.children[0]);
    this.animals = [];
  }

  spawn(kind, x, z, extra = {}) {
    const g = MAKERS[kind]();
    g.position.set(x, heightAt(x, z), z);
    g.rotation.y = Math.random() * PI * 2;
    this.group.add(g);
    const a = {
      kind, obj: g, home: { x, z }, state: 'idle', t: Math.random() * 5, timer: 2 + Math.random() * 4,
      target: null, speed: 0, alt: 6 + Math.random() * 6, radius: 10 + Math.random() * 14, phase: Math.random() * 6, ...extra,
    };
    this.animals.push(a);
    return a;
  }

  load(era, town) {
    this.clear();
    const rng = mulberry32(hashStr('fauna' + era.id));
    const tx = town.position[0], tz = town.position[2];
    const findSpot = (test, tries = 300, r = 110) => {
      for (let i = 0; i < tries; i++) {
        const x = tx + (rng() - 0.5) * r * 2, z = tz + (rng() - 0.5) * r * 2;
        if (test(x, z)) return { x, z };
      }
      return null;
    };
    // mouettes au-dessus de la côte la plus proche
    for (let i = 0; i < 7; i++) {
      const p = findSpot((x, z) => heightAt(x, z) < 0.2 && Math.hypot(x - tx, z - tz) < 90);
      if (p) this.spawn('gull', p.x, p.z, { flying: true });
    }
    // échassiers dans les marais (ou sur l'estran)
    for (let i = 0; i < 6; i++) {
      const p = findSpot((x, z) => (marshMask(x, z) > 0.5 && heightAt(x, z) > 0.3) || (heightAt(x, z) > -0.3 && heightAt(x, z) < 0.35 && islandMask(x, z) > -0.05), 400, 140);
      if (p) this.spawn(i % 2 ? 'egret' : 'heron', p.x, p.z);
    }
    // lapins dans les dunes et les prés
    for (let i = 0; i < 9; i++) {
      const p = findSpot((x, z) => heightAt(x, z) > 0.8 && Math.hypot(x - tx, z - tz) > 30 && !this.world.isBlocked(x, z, 0.3));
      if (p) this.spawn('rabbit', p.x, p.z);
    }
    // poissons près du rivage
    for (let i = 0; i < 6; i++) {
      const p = findSpot((x, z) => { const h = heightAt(x, z); return h < -0.6 && h > -3; });
      if (p) this.spawn('fish', p.x, p.z, { swim: true });
    }
    if (era.id === 'prehistoire') {
      for (let i = 0; i < 4; i++) {
        const p = findSpot((x, z) => forestMask(x, z) > 0.2 && heightAt(x, z) > 1 && Math.hypot(x - tx, z - tz) > 25, 500, 80);
        if (p) this.spawn('deer', p.x, p.z);
      }
    }
  }

  // Animal observable le plus proche (pour l'interaction « Observer »)
  nearest(pos, maxD = 9) {
    let best = null, bd = maxD;
    for (const a of this.animals) {
      if (a.hidden) continue;
      const d = Math.hypot(a.obj.position.x - pos.x, a.obj.position.z - pos.z);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }

  update(dt, time) {
    const pp = this.playerPos;
    for (const a of this.animals) {
      const o = a.obj;
      a.t += dt;
      if (a.hidden) continue;
      const dpx = o.position.x - pp.x, dpz = o.position.z - pp.z;
      const dP = Math.hypot(dpx, dpz);
      switch (a.kind) {
        case 'gull': {
          const ang = a.t * (0.25 + a.phase * 0.02) + a.phase;
          o.position.set(a.home.x + Math.cos(ang) * a.radius, a.alt + Math.sin(a.t * 0.7) * 1.5, a.home.z + Math.sin(ang) * a.radius);
          o.rotation.y = -ang;
          o.rotation.z = 0.25;
          for (const w of o.userData.wings) w.piv.rotation.z = w.s * Math.sin(a.t * 6 + a.phase) * 0.5;
          break;
        }
        case 'heron':
        case 'egret': {
          if (a.state === 'fly') {
            a.flyT += dt;
            o.position.y = heightAt(o.position.x, o.position.z) + Math.min(8, a.flyT * 3);
            o.position.x += Math.sin(o.rotation.y) * 6 * dt;
            o.position.z += Math.cos(o.rotation.y) * 6 * dt;
            if (a.flyT > 5) {
              // se pose plus loin
              a.state = 'idle';
              a.home = { x: o.position.x, z: o.position.z };
              o.position.y = heightAt(o.position.x, o.position.z);
            }
            break;
          }
          if (dP < 7 && this.playerSpeed > 2.5) {
            a.state = 'fly'; a.flyT = 0;
            o.rotation.y = Math.atan2(dpx, dpz);
            break;
          }
          // affût : la tête plonge de temps en temps pour pêcher
          a.timer -= dt;
          const neck = o.userData.neck;
          if (a.timer < 0) { a.timer = 3 + Math.random() * 5; a.peck = 0.8; }
          if (a.peck > 0) { a.peck -= dt; neck.rotation.x = Math.sin((0.8 - a.peck) / 0.8 * PI) * 1.1; } else neck.rotation.x = 0;
          o.position.y = heightAt(o.position.x, o.position.z);
          break;
        }
        case 'rabbit': {
          if (dP < 6 && a.state !== 'flee') { a.state = 'flee'; a.timer = 2.5; o.rotation.y = Math.atan2(dpx, dpz); }
          a.timer -= dt;
          if (a.state === 'flee' || a.state === 'hop') {
            const sp = a.state === 'flee' ? 5 : 1.5;
            const nx = o.position.x + Math.sin(o.rotation.y) * sp * dt;
            const nz = o.position.z + Math.cos(o.rotation.y) * sp * dt;
            if (heightAt(nx, nz) > 0.5 && !this.world.isBlocked(nx, nz, 0.2)) { o.position.x = nx; o.position.z = nz; } else o.rotation.y += PI * 0.6;
            o.position.y = heightAt(o.position.x, o.position.z) + Math.abs(Math.sin(a.t * 10)) * 0.12;
            if (a.timer < 0) { a.state = 'idle'; a.timer = 2 + Math.random() * 4; }
          } else {
            o.position.y = heightAt(o.position.x, o.position.z);
            if (a.timer < 0) { a.state = 'hop'; a.timer = 0.8 + Math.random(); o.rotation.y += (Math.random() - 0.5) * 2; }
          }
          break;
        }
        case 'fish': {
          // nage en cercle sous la surface, saut de temps en temps
          const ang = a.t * 0.4 + a.phase;
          o.position.x = a.home.x + Math.cos(ang) * 4;
          o.position.z = a.home.z + Math.sin(ang) * 4;
          o.rotation.y = -ang + PI;
          a.timer -= dt;
          const tide = this.world.ocean.tide;
          if (a.timer < 0 && a.timer > -0.9) {
            const k = -a.timer / 0.9;
            o.position.y = tide + Math.sin(k * PI) * 0.9 - 0.1;
            o.rotation.x = (k - 0.5) * 2;
          } else {
            o.position.y = tide - 0.5;
            o.rotation.x = 0;
            if (a.timer < -0.9) a.timer = 6 + Math.random() * 10;
          }
          break;
        }
        case 'deer': {
          if (a.locked) { o.position.y = heightAt(o.position.x, o.position.z); break; }
          if (dP < 12 && this.playerSpeed > 3 && a.state !== 'flee') { a.state = 'flee'; a.timer = 4; o.rotation.y = Math.atan2(dpx, dpz); }
          a.timer -= dt;
          if (a.state === 'flee') {
            const nx = o.position.x + Math.sin(o.rotation.y) * 7 * dt, nz = o.position.z + Math.cos(o.rotation.y) * 7 * dt;
            if (heightAt(nx, nz) > 0.6 && Math.hypot(nx - a.home.x, nz - a.home.z) < 40) { o.position.x = nx; o.position.z = nz; } else o.rotation.y += PI * 0.5;
            if (a.timer < 0) a.state = 'idle';
          } else if (a.timer < 0) {
            a.timer = 3 + Math.random() * 4;
            o.rotation.y += (Math.random() - 0.5) * 1.5;
          }
          o.position.y = heightAt(o.position.x, o.position.z);
          break;
        }
        case 'donkey': {
          o.position.y = heightAt(o.position.x, o.position.z);
          o.rotation.y += Math.sin(a.t * 0.2) * 0.002;
          break;
        }
      }
    }
  }
}

export { angleDiff };
