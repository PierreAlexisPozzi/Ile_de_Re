// Monde : terrain, océan, ciel, ville de l'époque, paysage, faune,
// collisions et objets interactifs. Une seule ville est construite par
// époque ; le reste de l'île reçoit un paysage propre à l'époque.

import * as THREE from 'three';
import { Terrain, Ocean, Sky, heightAt, setTownFlatten, setCarves, rawHeight } from './terrain.js';
import { setGeoEra } from './geo/shape.js';
import { TownBuilder } from './builder.js';
import { batchStatic } from '../gfx/batch.js';
import { LOCATION, placementOf } from './locations.js';
import { getEra } from '../story/eras.js';
import { buildLandscape } from './landscape.js';
import { Fauna } from './fauna.js';
import { TOWNS } from './towns/index.js';
import { setWeatherGround } from './materials.js';
import { WIND } from '../gfx/foliage.js';
import { state } from '../core/state.js';

export { heightAt };

export class World {
  constructor(scene) {
    this.scene = scene;
    this.root = new THREE.Group();
    scene.add(this.root);
    this.eraGroup = new THREE.Group();
    this.root.add(this.eraGroup);
    this.colliders = [];
    this.grid = new Map();
    this.cellSize = 6;
    this.spots = {};
    this.paths = {};
    this.interactables = [];
    this.animated = [];
    this.lights = [];
    this.currentEra = null;
    this.townCenter = { x: 0, z: 0 };
    this.time = 0;
  }

  build() {
    this.terrain = new Terrain(this.root);
    this.ocean = new Ocean(this.root);
    this.sky = new Sky(this.scene);
    this.fauna = new Fauna(this);
  }

  // ---------- Collisions (cercles sur grille spatiale) ----------
  addCollider(x, z, r) { this.colliders.push({ x, z, r }); }

  buildGrid() {
    this.grid.clear();
    const cs = this.cellSize;
    this.colliders.forEach((c, i) => {
      const x0 = Math.floor((c.x - c.r) / cs), x1 = Math.floor((c.x + c.r) / cs);
      const z0 = Math.floor((c.z - c.r) / cs), z1 = Math.floor((c.z + c.r) / cs);
      for (let gx = x0; gx <= x1; gx++) {
        for (let gz = z0; gz <= z1; gz++) {
          const k = gx * 100003 + gz;
          let arr = this.grid.get(k);
          if (!arr) { arr = []; this.grid.set(k, arr); }
          arr.push(i);
        }
      }
    });
  }

  resolveCollision(x, z, radius) {
    const cs = this.cellSize;
    for (let it = 0; it < 3; it++) {
      let moved = false;
      const gx = Math.floor(x / cs), gz = Math.floor(z / cs);
      for (let ax = gx - 1; ax <= gx + 1; ax++) {
        for (let az = gz - 1; az <= gz + 1; az++) {
          const arr = this.grid.get(ax * 100003 + az);
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
              moved = true;
            }
          }
        }
      }
      if (!moved) break;
    }
    return { x, z };
  }

  isBlocked(x, z, radius = 0.4) {
    const r = this.resolveCollision(x, z, radius);
    return Math.hypot(r.x - x, r.z - z) > 0.05;
  }

  // ---------- Chargement d'une époque ----------
  loadEra(eraId, flags = {}) {
    const era = getEra(eraId);
    const town = LOCATION[era.town];
    const def = TOWNS[eraId];
    this.currentEra = eraId;
    this.era = era;
    const pl = placementOf(era.town);
    this.placement = pl;
    this.townCenter = { x: pl.x, z: pl.z };
    this.townRot = pl.rot ?? 0;
    setGeoEra(eraId);

    // nettoyage
    while (this.eraGroup.children.length) {
      const c = this.eraGroup.children.pop();
      c.traverse((o) => { if (o.userData?.batched || o.userData?.disposable) o.geometry?.dispose(); });
    }
    this.colliders = [];
    this.interactables = [];
    this.animated = [];
    this.lights = [];

    // relief : plateau de la ville + bassins portuaires creusés (repère local)
    const tx = pl.x, tz = pl.z;
    const th = def.height ?? Math.max(1.4, rawHeight(tx, tz));
    const R = def.radius ?? 42;
    setTownFlatten(tx, tz, R, th);
    setWeatherGround(th, tx, tz, R + 20);
    const carveList = typeof def.carves === 'function' ? def.carves(flags) : (def.carves || []);
    setCarves(carveList.map((c) => ({ ...c, depth: c.depthRel !== undefined ? th + c.depthRel : (c.depth ?? -1.4) })), tx, tz, this.townRot);
    this.terrain.refresh(era.look, { x: tx, z: tz, half: R + 45 });
    this.ocean.refreshDepth();
    this.ocean.setColors(era.sea.deep, era.sea.shallow);

    // la ville
    const tb = new TownBuilder(this, town, eraId, flags, th, pl);
    def.build(tb, flags);
    const stats = batchStatic(tb.group);
    this.eraGroup.add(tb.group, tb.dyn);
    this.spots = tb.spots;
    this.paths = tb.paths;
    this.interactables.push(...tb.interactables);
    this.animated.push(...tb.animated);
    this.lights.push(...tb.lights);
    this.townBuilder = tb;

    // le reste de l'île
    const land = buildLandscape(this, era, town, flags, pl);
    this.eraGroup.add(land.group);
    this.animated.push(...land.animated);
    this.interactables.push(...land.interactables);

    this.buildGrid();
    this.fauna.load(era, pl);
    this.spawn = this.spots.spawn ?? { x: tx, z: tz + 6 };
    this.stats = { ...stats, colliders: this.colliders.length };
    return this.stats;
  }

  // Décalage exprimé dans le repère de la ville -> monde
  offset(dx, dz) {
    const c = Math.cos(this.townRot ?? 0), s = Math.sin(this.townRot ?? 0);
    return { x: dx * c + dz * s, z: -dx * s + dz * c };
  }
  toWorld(lx, lz) { const o = this.offset(lx, lz); return { x: this.townCenter.x + o.x, z: this.townCenter.z + o.z }; }

  spotPos(name, dx = 0, dz = 0) {
    const s = this.spots[name];
    if (!s) return null;
    const o = this.offset(dx, dz);
    return { x: s.x + o.x, z: s.z + o.z, y: heightAt(s.x + o.x, s.z + o.z) };
  }

  update(dt, time, hours, camera) {
    WIND.uTime.value = time;
    WIND.uStrength.value += ((state.weather === 'rain' ? 1.8 : 1) - WIND.uStrength.value) * Math.min(1, dt * 0.5);
    this.time = time;
    this.ocean.update(dt, time, hours);
    if (camera) this.sky.follow(camera);
    for (const a of this.animated) {
      const o = a.obj;
      switch (a.kind) {
        case 'swing':
          o.rotation.z = Math.sin(time * 1.3 + a.phase) * 0.07;
          break;
        case 'spin':
          o.rotation.z = time * (a.speed ?? 0.6);
          break;
        case 'custom':
          a.update?.(time, dt);
          break;
        case 'lighthouse':
          o.rotation.y = time * 0.45;
          o.userData.beamMat.opacity = 0.16 * (this.night ?? 0);
          o.visible = (this.night ?? 0) > 0.05;
          break;
        case 'fire':
          o.children.forEach((f, i) => {
            const s = 0.85 + Math.sin(time * (9 + i * 3) + i) * 0.15 + Math.random() * 0.08;
            f.scale.set(s, 0.8 + Math.random() * 0.5, s);
          });
          break;
        case 'bob': {
          o.position.y = this.ocean.tide + 0.1 + Math.sin(time * 1.1 + o.userData.bob) * 0.06;
          o.rotation.z = Math.sin(time * 0.9 + o.userData.bob) * 0.03;
          o.rotation.x = Math.sin(time * 0.7 + o.userData.bob * 2) * 0.02;
          break;
        }
        case 'flag': {
          const p = o.geometry.attributes.position;
          const base = o.userData.base;
          for (let i = 0; i < p.count; i++) {
            const x = base[i * 3];
            const k = (x + 1.1) / 2.2;
            p.setZ(i, Math.sin(time * 4 + x * 3) * 0.12 * k);
          }
          p.needsUpdate = true;
          break;
        }
      }
    }
    for (const l of this.lights) {
      if (l.flicker) l.light.intensity = l.base * (0.8 + Math.random() * 0.3);
    }
    this.fauna.update(dt, time);
  }
}
