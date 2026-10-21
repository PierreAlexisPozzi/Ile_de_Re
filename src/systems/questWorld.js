// Présence des quêtes dans le monde 3D : objets à ramasser, points
// d'interaction (halo + losange), faisceau doré sur l'objectif suivi.

import * as THREE from 'three';
import { state } from '../core/state.js';
import { questModel, interactMarker, beamMarker } from '../world/objects.js';
import { api, resolveAt } from './api.js';
import { hasSkill } from './inventory.js';

export class QuestWorld {
  constructor(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);
    this.items = new Map();     // key -> { obj, t }
    this.beam = beamMarker();
    this.beam.visible = false;
    scene.add(this.beam);
  }

  clear() {
    for (const { obj } of this.items.values()) this.group.remove(obj);
    this.items.clear();
  }

  refresh() {
    if (!api.world?.spots) return;
    const want = new Map();
    for (const t of api.quests.targets()) {
      if (t.kind === 'pickup' || t.kind === 'interact' || t.kind === 'photo') want.set(t.key + '@' + t.questId, t);
    }
    for (const [k, v] of this.items) {
      if (!want.has(k)) { this.group.remove(v.obj); this.items.delete(k); }
    }
    for (const [k, t] of want) {
      if (this.items.has(k)) { this.items.get(k).t = t; continue; }
      const p = resolveAt(t.at);
      if (!p) continue;
      const obj = new THREE.Group();
      obj.position.set(p.x, p.y, p.z);
      if (t.kind === 'pickup' || t.model) {
        const model = questModel(t.model ?? 'page');
        obj.add(model);
      }
      const mk = interactMarker(t.main);
      if (t.kind === 'photo') mk.children[0].material = mk.children[0].material.clone(), mk.children[0].material.color.set(0x8ae0ff);
      obj.add(mk);
      obj.userData.marker = mk;
      this.group.add(obj);
      this.items.set(k, { obj, t, pos: p });
    }
  }

  remove(key) {
    for (const [k, v] of this.items) {
      if (v.t.key === key) { this.group.remove(v.obj); this.items.delete(k); }
    }
  }

  nearest(pos, maxD = 2.4) {
    let best = null, bd = maxD;
    for (const v of this.items.values()) {
      const d = Math.hypot(v.pos.x - pos.x, v.pos.z - pos.z);
      if (d < bd && Math.abs(v.pos.y - pos.y) < 3) { bd = d; best = v; }
    }
    return best;
  }

  update(dt, time, playerPos) {
    const far = hasSkill('oeil') ? 60 : 38;
    for (const v of this.items.values()) {
      const d = Math.hypot(v.pos.x - playerPos.x, v.pos.z - playerPos.z);
      v.obj.visible = d < far + 30;
      v.obj.traverse((o) => {
        if (o.userData.float) o.position.y = 1.5 + Math.sin(time * 2 + v.pos.x) * 0.12, o.rotation.y = time * 1.5;
        if (o.userData.pulse) { const s = 1 + Math.sin(time * 3) * 0.12; o.scale.set(s, s, s); }
        if (o.userData.spin) o.rotation.y = time * 1.2;
        if (o.userData.spin2) o.rotation.x = time * 0.8;
      });
      if (v.obj.userData.marker) v.obj.userData.marker.visible = d < far;
    }
    // faisceau sur l'objectif suivi
    const tt = api.quests.trackedTarget();
    if (tt && !tt.otherEra && tt.at) {
      const p = resolveAt(tt.at);
      if (p) {
        const d = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
        this.beam.visible = d > 12 && state.options.beam !== false;
        this.beam.position.set(p.x, p.y, p.z);
        this.beam.children[0].material.opacity = 0.1 + 0.06 * Math.sin(time * 2);
        return;
      }
    }
    this.beam.visible = false;
  }
}
