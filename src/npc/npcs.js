// PNJ : chaque habitant a un métier, une routine quotidienne (lieux et
// activités selon l'heure), une histoire personnelle (carnet), des répliques
// spontanées et des réactions au joueur (salut, surprise devant ses habits
// d'un autre temps, bousculade, vélo…). Les figurants animent les rues.

import * as THREE from 'three';
import { buildCharacter } from '../characters/rig.js';
import { look as wardrobeLook } from '../characters/wardrobe.js';
import { heightAt } from '../world/terrain.js';
import { NPCS, EXTRAS } from '../story/registry.js';
import { state, S } from '../core/state.js';
import { api, resolveAt } from '../systems/api.js';
import { angleDiff, mulberry32, hashStr } from '../core/rng.js';
import { unlockCodex } from '../systems/inventory.js';
import { on } from '../core/events.js';

const WALK = 1.25, JOG = 3.6;

// Réactions génériques par époque face à l'explorateur venu du futur
const STRANGER = {
  prehistoire: ["Hé ! D'où viens-tu, avec cette peau qui brille ?", 'Tes vêtements ne sont faits d\'aucune bête que je connaisse…'],
  antiquite: ['Par Mercure, quel étrange vêtement !', 'Un voyageur de Germanie, peut-être ?', 'Ces chausses… tu viens de Bretagne ?'],
  moyenage: ['Dieu me garde, quel accoutrement !', 'Un pèlerin, sans doute… de très loin.', 'Sainte Vierge, ses chausses sont toutes bleues !'],
  xvii: ['Voilà un drôle de garçon de chantier.', 'Monsieur vient de la Cour ? Ces habits…', "Encore un Hollandais qui s'habille à la mode d'ailleurs."],
  xix: ['Tiens, un baigneur de La Rochelle ?', "Il est habillé comme un Parisien, celui-là !", 'Les étrangers, ça vient voir le sel…'],
  wwii: ['Vous n\'êtes pas d\'ici, vous… faites attention.', 'Vos papiers sont en règle, au moins ?', 'Pas si fort, on pourrait nous entendre.'],
  contemporaine: ['Bonjour !', 'Belle journée pour pédaler !', 'Vous savez où est la plage ?'],
};
const BUMP = ['Hé ! Doucement !', 'Attention où tu marches !', 'Oh ! Pardon…', 'On ne court pas comme ça !'];

let bubbleLayer = null;
function layer() {
  if (!bubbleLayer) bubbleLayer = document.getElementById('world-labels');
  return bubbleLayer;
}

export class NPC {
  constructor(def, mgr, opts = {}) {
    this.def = def;
    this.id = def.id;
    this.mgr = mgr;
    this.extra = !!opts.extra;
    const lookSpec = def.look?.archetype ? wardrobeLook(def.look.era ?? def.era, def.look.archetype, def.look.with) : def.look;
    this.char = buildCharacter({ ...lookSpec, id: def.id, action: def.action });
    this.pos = this.char.group.position;
    this.yaw = 0;
    this.target = null;
    this.mode = 'routine';
    this.path = null;
    this.pathIdx = 0;
    this.stuck = 0;
    this.detour = 0;
    this.detourDir = 1;
    this.talking = false;
    this.followOn = false;
    this.cool = 0;
    this.sawStranger = false;
    this.bubbleT = 0;
    this.forcedAction = null;
    this.walkTarget = null;
    this.rng = mulberry32(hashStr(def.id));
    // étiquettes HTML (nom, bulle, marqueur de quête)
    this.el = document.createElement('div');
    this.el.className = 'npc-tag';
    this.el.innerHTML = `<div class="npc-marker"></div><div class="npc-bubble"></div><div class="npc-name"><b>${def.name ?? ''}</b>${def.title ? `<span>${def.title}</span>` : ''}</div>`;
    this.markerEl = this.el.querySelector('.npc-marker');
    this.bubbleEl = this.el.querySelector('.npc-bubble');
    this.nameEl = this.el.querySelector('.npc-name');
    layer()?.appendChild(this.el);
  }

  dispose() { this.el.remove(); }

  place(p, yaw = 0) {
    this.pos.set(p.x, heightAt(p.x, p.z), p.z);
    this.yaw = yaw;
    this.char.group.rotation.y = yaw;
  }

  setAction(a) { this.forcedAction = a; }
  follow(on) { this.followOn = on; if (on) this.say('Je te suis.'); }
  walkTo(at) { this.walkTarget = resolveAt(at); }

  say(text, dur = 3.2) {
    if (!text) return;
    this.bubbleEl.textContent = text;
    this.bubbleEl.classList.add('show');
    this.bubbleT = dur;
  }

  speak() { this.char.setAction('talk'); }

  // Entrée de routine correspondant à l'heure
  routineNow(h) {
    const r = this.def.routine;
    if (!r?.length) return null;
    for (const e of r) {
      const from = e.from ?? 0, to = e.to ?? 24;
      const inside = from <= to ? h >= from && h < to : h >= from || h < to;
      if (inside) return e;
    }
    return null;
  }

  // Avance vers une cible en contournant les obstacles simples
  moveToward(tx, tz, speed, dt) {
    const dx = tx - this.pos.x, dz = tz - this.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.25) return true;
    let ang = Math.atan2(dx, dz);
    if (this.detour > 0) { ang += this.detourDir * 1.1; this.detour -= dt; }
    const step = Math.min(d, speed * dt);
    let nx = this.pos.x + Math.sin(ang) * step, nz = this.pos.z + Math.cos(ang) * step;
    const r = api.world.resolveCollision(nx, nz, 0.32);
    // ne pas entrer dans l'eau profonde
    if (heightAt(r.x, r.z) < -0.2) return true;
    const mx = r.x - this.pos.x, mz = r.z - this.pos.z;
    const moved = Math.hypot(mx, mz);
    if (moved < step * 0.3) {
      this.stuck += dt;
      if (this.stuck > 0.6) { this.detour = 1.2; this.detourDir = this.rng() < 0.5 ? -1 : 1; this.stuck = 0; }
    } else this.stuck = Math.max(0, this.stuck - dt);
    this.pos.x = r.x; this.pos.z = r.z;
    this.pos.y = heightAt(r.x, r.z);
    this.turnTo(moved > 0.001 ? Math.atan2(mx, mz) : ang, dt, 7);
    this.char.speed = moved / dt;
    return false;
  }

  turnTo(yaw, dt, k = 5) {
    this.yaw += angleDiff(this.yaw, yaw) * Math.min(1, dt * k);
    this.char.group.rotation.y = this.yaw;
  }

  update(dt, ctx) {
    const { player, hour, camera, near } = ctx;
    const pd = Math.hypot(player.x - this.pos.x, player.z - this.pos.z);
    this.cool -= dt;
    this.char.speed = 0;

    if (this.hold && !this.talking) {
      // retenu à son poste (ex. derrière le comptoir quand le joueur entre dans la boutique)
      this.pos.set(this.hold.x, heightAt(this.hold.x, this.hold.z), this.hold.z);
      this.turnTo(this.hold.yaw ?? 0, dt, 6);
      this.char.setAction(this.hold.action ?? 'idle');
    } else if (this.talking) {
      this.turnTo(Math.atan2(player.x - this.pos.x, player.z - this.pos.z), dt, 6);
      this.char.setAction('talk');
      this.char.lookAtWorld({ x: player.x, y: player.y + 1.6, z: player.z });
    } else if (this.followOn) {
      if (pd > 2.4) this.moveToward(player.x, player.z, pd > 6 ? JOG : WALK * 1.4, dt);
      else this.turnTo(Math.atan2(player.x - this.pos.x, player.z - this.pos.z), dt);
      this.char.setAction('idle');
    } else if (this.walkTarget) {
      if (this.moveToward(this.walkTarget.x, this.walkTarget.z, WALK, dt)) this.walkTarget = null;
      this.char.setAction('idle');
    } else if (this.def.path || this.extraPath) {
      // figurant : boucle le long d'un chemin
      const pts = this.extraPath ?? api.world.paths[this.def.path];
      if (pts?.length) {
        const p = pts[this.pathIdx % pts.length];
        if (this.moveToward(p.x, p.z, WALK * (this.def.speed ?? 1), dt)) {
          this.pathIdx = (this.pathIdx + 1) % pts.length;
          if (this.def.pause && this.rng() < 0.3) this.waitT = 2 + this.rng() * 4;
        }
      }
      if (this.waitT > 0) { this.waitT -= dt; this.char.speed = 0; }
      this.char.setAction(this.def.action ?? 'idle');
    } else {
      const e = this.routineNow(hour) ?? { at: this.def.home, action: 'idle' };
      const p = resolveAt(e.at ?? this.def.home);
      if (p) {
        const arrived = Math.hypot(p.x - this.pos.x, p.z - this.pos.z) < 0.6;
        if (!arrived) {
          this.moveToward(p.x, p.z, WALK, dt);
          this.char.setAction('idle');
        } else {
          if (e.face !== undefined) this.turnTo(e.face, dt, 3);
          else if (p.rot !== undefined) this.turnTo(p.rot, dt, 3);
          this.char.setAction(this.forcedAction ?? e.action ?? this.def.action ?? 'idle');
        }
      } else {
        this.char.setAction(this.forcedAction ?? this.def.action ?? 'idle');
      }
    }

    // regard vers le joueur proche
    if (!this.talking) {
      if (pd < 5.5) this.char.lookAtWorld({ x: player.x, y: player.y + 1.6, z: player.z });
      else this.char.look = null;
    }

    // réactions
    if (pd < 1.0 && ctx.playerSpeed > 5 && this.cool < 0) {
      this.say(BUMP[Math.floor(this.rng() * BUMP.length)]);
      this.cool = 6;
    } else if (pd < 6 && !this.sawStranger && !this.talking && state.era !== 'contemporaine' && this.cool < 0 && this.rng() < 0.02) {
      const pool = STRANGER[state.era] ?? [];
      this.say(pool[Math.floor(this.rng() * pool.length)]);
      this.sawStranger = true;
      this.cool = 12;
    } else if (pd < 5 && this.cool < 0 && !this.talking && this.rng() < 0.004) {
      const g = typeof this.def.barks === 'function' ? this.def.barks(S) : this.def.barks;
      if (g?.length) { this.say(g[Math.floor(this.rng() * g.length)]); this.cool = 18; }
    } else if (ctx.onBike && pd < 7 && this.cool < 0 && !['wwii', 'contemporaine'].includes(state.era)) {
      this.say('Quelle étrange machine !');
      this.cool = 20;
    }

    this.char.update(dt);
    if (this.bubbleT > 0) {
      this.bubbleT -= dt;
      if (this.bubbleT <= 0) this.bubbleEl.classList.remove('show');
    }
    this.updateTag(camera, pd, near);
  }

  updateTag(camera, pd, near) {
    const v = new THREE.Vector3(this.pos.x, this.pos.y + 2.05 * this.char.scale + 0.15, this.pos.z).project(camera);
    const vis = v.z < 1 && pd < 45 && Math.abs(v.x) < 1.2 && Math.abs(v.y) < 1.2;
    if (!vis) { this.el.style.display = 'none'; return; }
    this.el.style.display = '';
    const x = (v.x * 0.5 + 0.5) * innerWidth, y = (-v.y * 0.5 + 0.5) * innerHeight;
    this.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
    // marqueur de quête
    let mk = '';
    if (!this.extra) {
      const task = api.quests.npcTask(this.id);
      if (task) mk = task.q.main ? '◆' : '?';
      else if (api.quests.offersFrom(this.id).length) mk = '!';
    }
    if (this.markerEl.textContent !== mk) {
      this.markerEl.textContent = mk;
      this.markerEl.className = 'npc-marker' + (mk === '!' ? ' offer' : mk ? ' task' : '');
    }
    this.nameEl.style.display = pd < 9 && !this.extra ? '' : 'none';
    this.el.style.opacity = pd > 32 ? String(Math.max(0, (45 - pd) / 13)) : '1';
    void near;
  }
}

export class NPCManager {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.list = [];
    this.byId = new Map();
  }

  clear() {
    for (const n of this.list) { this.group.remove(n.char.group); n.dispose(); }
    this.list = [];
    this.byId.clear();
  }

  load(eraId) {
    this.clear();
    for (const def of Object.values(NPCS)) {
      if (def.era !== eraId) continue;
      if (def.when && !def.when(S)) continue;
      this.add(def);
    }
    // figurants : villageois, passants, soldats en patrouille…
    (EXTRAS[eraId] ?? []).forEach((x, i) => {
      const def = { id: `extra-${eraId}-${i}`, era: eraId, name: x.name ?? '', title: '', ...x };
      const n = this.add(def, true);
      if (x.loopPath) n.extraPath = x.loopPath.map((at) => resolveAt(at)).filter(Boolean);
    });
  }

  add(def, extra = false) {
    const n = new NPC(def, this, { extra });
    const start = resolveAt(def.start ?? def.home ?? def.routine?.[0]?.at) ?? resolveAt(def.path ? undefined : 'spawn');
    let p = start ?? { x: api.world.spawn.x, z: api.world.spawn.z };
    if (def.path && api.world.paths[def.path]) {
      const pts = api.world.paths[def.path];
      n.pathIdx = Math.floor(n.rng() * pts.length);
      p = pts[n.pathIdx];
    }
    n.place(p, def.yaw ?? 0);
    // les habitants sont déjà à leur poste du moment
    const e = n.routineNow(state.time);
    if (e?.at) { const q = resolveAt(e.at); if (q) n.place(q, q.rot ?? 0); }
    this.group.add(n.char.group);
    this.list.push(n);
    this.byId.set(def.id, n);
    return n;
  }

  // Ajoute ou retire les PNJ dont la présence dépend de l'histoire (when)
  sync(eraId) {
    for (const def of Object.values(NPCS)) {
      if (def.era !== eraId || !def.when) continue;
      const want = def.when(S);
      const have = this.byId.get(def.id);
      if (want && !have) this.add(def);
      if (!want && have) {
        this.group.remove(have.char.group);
        have.dispose();
        this.list = this.list.filter((n) => n !== have);
        this.byId.delete(def.id);
      }
    }
  }

  get(id) { return this.byId.get(id); }

  nearest(pos, maxD = 3) {
    let best = null, bd = maxD;
    for (const n of this.list) {
      if (n.extra && !n.def.talk) continue;
      const d = Math.hypot(n.pos.x - pos.x, n.pos.z - pos.z);
      if (d < bd) { bd = d; best = n; }
    }
    return best;
  }

  talk(npc) {
    npc.talking = true;
    if (npc.def.codex) unlockCodex(npc.def.codex, true);
    const end = () => { npc.talking = false; npc.char.setAction('idle'); };
    const offFn = on('dialogue:end', (e) => { if (e.npc === npc.id) { end(); offFn(); } });
    if (npc.extra) {
      const lines = typeof npc.def.barks === 'function' ? npc.def.barks(S) : npc.def.barks;
      npc.say(lines?.[Math.floor(Math.random() * (lines?.length || 1))] ?? 'Bonjour.');
      setTimeout(end, 1500);
      offFn();
      return;
    }
    api.quests.talkTo(npc);
  }

  update(dt, ctx) {
    for (const n of this.list) {
      const d = Math.hypot(n.pos.x - ctx.player.x, n.pos.z - ctx.player.z);
      // au loin : on simplifie (pas d'animation fine)
      n.char.group.visible = d < 120;
      if (d > 120 && !n.followOn) { n.el.style.display = 'none'; continue; }
      n.update(dt, ctx);
    }
  }
}
