// Cinématiques : plans de caméra interpolés, bandes noires, titres et
// sous-titres. Sert à l'introduction, à l'arrivée dans chaque époque et au
// grand final qui retrace l'histoire de l'île de la préhistoire à nos jours.

import * as THREE from 'three';
import { state } from '../core/state.js';
import { pressed } from '../core/input.js';
import { heightAt } from '../world/terrain.js';
import { getEra } from '../story/eras.js';
import { LOCATION } from '../world/locations.js';
import { api } from './api.js';
import { SEQUENCES } from '../story/cinematics.js';

const $ = (s) => document.querySelector(s);
const ease = (t) => t * t * (3 - 2 * t);

export class Cinematic {
  constructor(camera) {
    this.camera = camera;
    this.active = false;
    this.shots = [];
    this.cur = null;
    this.onEnd = null;
  }

  play(id, onEnd) {
    const make = SEQUENCES[id];
    if (!make) { onEnd?.(); return; }
    this.start(make(state, api), onEnd);
  }

  // Plan d'arrivée dans une époque : survol de la ville avec carton-titre
  arrival(eraId, onEnd) {
    const era = getEra(eraId);
    const t = LOCATION[era.town].position;
    const c = { x: t[0], z: t[2] };
    const h = heightAt(c.x, c.z);
    this.start([{
      from: { x: c.x - 38, y: h + 24, z: c.z + 40 }, to: { x: c.x - 10, y: h + 12, z: c.z + 34 },
      look: { x: c.x, y: h + 2, z: c.z }, dur: 5,
      title: `${era.townName}`, caption: `${era.name} — ${era.years}`,
    }], onEnd);
  }

  start(shots, onEnd) {
    this.shots = [...shots];
    this.onEnd = onEnd;
    this.active = true;
    $('#cine').classList.remove('hidden');
    api.ui.showHUD(false);
    $('#world-labels').style.display = 'none';
    this.next();
  }

  async next() {
    const s = this.shots.shift();
    if (!s) { this.finish(); return; }
    if (s.era && s.era !== state.era) {
      api.ui.fade(true);
      await new Promise((r) => setTimeout(r, 850));
      await api.travel(s.era, { silent: true, noCine: true });
      api.ui.fade(false);
    }
    if (s.do) s.do(api);
    this.cur = { ...s, t: 0 };
    $('#cine-title').textContent = s.title ?? '';
    $('#cine-caption').textContent = s.caption ?? '';
    $('#cine-title').style.opacity = s.title ? '1' : '0';
    $('#cine-caption').style.opacity = s.caption ? '1' : '0';
  }

  finish() {
    this.active = false;
    this.cur = null;
    $('#cine').classList.add('hidden');
    $('#world-labels').style.display = '';
    api.ui.showHUD(true);
    const f = this.onEnd;
    this.onEnd = null;
    f?.();
  }

  update(dt) {
    if (!this.active || !this.cur) return;
    if (pressed('Escape')) { this.shots = this.shots.filter((s) => s.mustPlay); if (!this.shots.length) { this.finish(); return; } this.next(); return; }
    const s = this.cur;
    s.t += dt;
    const k = Math.min(1, s.t / s.dur);
    const e = ease(k);
    const P = (v) => (typeof v === 'function' ? v(k) : v);
    const a = P(s.from), b = P(s.to ?? s.from);
    const look = P(s.look);
    if (s.orbit) {
      const ang = s.orbit.a0 + (s.orbit.a1 - s.orbit.a0) * e;
      const c = s.orbit.center;
      this.camera.position.set(c.x + Math.sin(ang) * s.orbit.r, c.y + s.orbit.h, c.z + Math.cos(ang) * s.orbit.r);
      this.camera.lookAt(c.x, c.y + (s.orbit.lookH ?? 3), c.z);
    } else {
      this.camera.position.set(a.x + (b.x - a.x) * e, a.y + (b.y - a.y) * e, a.z + (b.z - a.z) * e);
      this.camera.lookAt(new THREE.Vector3(look.x, look.y, look.z));
    }
    // fondu des textes en fin de plan
    if (s.dur - s.t < 0.9) {
      $('#cine-title').style.opacity = '0';
      $('#cine-caption').style.opacity = '0';
    }
    if (k >= 1) { this.cur = null; this.next(); }
  }
}
