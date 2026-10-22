// Joueur : explorateur contemporain. Marche, course (endurance), saut,
// nage, vélo (époques où il existe), embarcations d'époque (pirogue,
// barque, gabarre, canot, kayak…), actions animées (ratisser, marteler,
// tailler le silex…), s'asseoir, et caméra à la troisième personne.

import * as THREE from 'three';
import { buildCharacter } from './characters/rig.js';
import { look } from './characters/wardrobe.js';
import { heightAt, clampToIsland } from './world/terrain.js';
import { buildBoat } from './world/builder.js';
import { state } from './core/state.js';
import { keys, moveVector, isRunning, consumeMouseDelta, consumeWheel, justPressed } from './core/input.js';
import { hasSkill } from './systems/inventory.js';
import { api } from './systems/api.js';
import { angleDiff } from './core/rng.js';
import { emit } from './core/events.js';

const WALK = 2.3, RUN = 5.6, SWIM = 1.9, BIKE = 7.5, GRAV = 22, JUMP = 6.2;
const BOAT_SPEED = { pirogue: 4, roman: 5, sail: 6, row: 4, gabarre: 5.5, chaloupe: 5, modern: 9.5, kayak: 4.6, canot: 4.4 };

export class Player {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.pos = this.group.position;
    this.vel = new THREE.Vector3();
    this.yaw = state.player.yaw ?? 0;           // orientation du corps
    this.camYaw = this.yaw + Math.PI;           // orientation de la caméra
    this.camPitch = 0.28;
    this.camDist = 5.2;
    this.grounded = true;
    this.mode = 'walk';                          // walk | swim | bike | boat | sit | action
    this.action = null;
    this.speed = 0;
    this.name = 'Sacha';
    this.focus = null;                           // cadrage de dialogue
    this.camPos = new THREE.Vector3();
    this.setAvatar(state.avatar);
    this.bike = makeBike();
    this.bike.visible = false;
    this.group.add(this.bike);
    this.boat = null;
  }

  setAvatar(id) {
    if (this.char) this.group.remove(this.char.group);
    const spec = look('player', id === 'exploratrice' ? 'exploratrice' : id === 'aventurier' ? 'aventurier' : 'explorer');
    this.char = buildCharacter({ ...spec, idleStyle: 0 });
    this.char.curiosity = 0.3;
    this.group.add(this.char.group);
    this.name = id === 'exploratrice' ? 'Sacha' : id === 'aventurier' ? 'Sacha' : 'Sacha';
  }

  teleport(x, z, yaw, indoor = false) {
    const c = indoor ? { x, z } : clampToIsland(x, z);
    this.pos.set(c.x, Math.max(heightAt(c.x, c.z), -0.2), c.z);
    this.vel.set(0, 0, 0);
    if (yaw !== undefined) { this.yaw = yaw; this.camYaw = yaw + Math.PI; }
    this.dismount(true);
    this.mode = 'walk';
    this.camPos.set(this.pos.x - Math.sin(this.yaw) * 5, this.pos.y + 3, this.pos.z - Math.cos(this.yaw) * 5);
  }

  canBike() {
    return (state.flags.velo || state.inventory.some((i) => i.id === 'velo')) && ['wwii', 'contemporaine'].includes(state.era) && this.mode !== 'boat';
  }

  toggleBike() {
    if (this.mode === 'bike') { this.mode = 'walk'; this.bike.visible = false; return; }
    if (!this.canBike()) {
      const has = state.flags.velo || state.inventory.some((i) => i.id === 'velo');
      emit('toast', { text: has ? "Pas de vélo à cette époque : il n'existe pas encore !" : "Il te faut d'abord un vélo (loueur près du phare).", kind: 'info' });
      return;
    }
    if (this.mode === 'swim') return;
    this.mode = 'bike';
    this.bike.visible = true;
  }

  board(type, obj) {
    this.dismount(true);
    this.mode = 'boat';
    this.boatType = type;
    this.boat = buildBoat(type);
    this.group.add(this.boat);
    if (obj) { obj.visible = false; this.hiddenBoat = obj; }
    // on se place sur l'eau, à côté du quai
    emit('toast', { text: 'Tu embarques. E près du rivage pour débarquer.', kind: 'info' });
  }

  dismount(silent = false) {
    if (this.mode === 'boat' && this.boat) {
      this.group.remove(this.boat);
      this.boat = null;
      if (this.hiddenBoat) {
        this.hiddenBoat.position.x = this.pos.x;
        this.hiddenBoat.position.z = this.pos.z;
        this.hiddenBoat.rotation.y = this.yaw;
        this.hiddenBoat.visible = true;
        this.hiddenBoat = null;
      }
      // trouve la terre ferme la plus proche
      if (!silent) {
        for (let r = 1; r < 16; r += 0.5) {
          let found = false;
          for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
            const x = this.pos.x + Math.sin(a) * r, z = this.pos.z + Math.cos(a) * r;
            if (heightAt(x, z) > 0.3 && !api.world.isBlocked(x, z)) {
              this.pos.set(x, heightAt(x, z), z);
              found = true;
              break;
            }
          }
          if (found) break;
        }
      }
    }
    if (this.mode === 'bike') this.bike.visible = false;
    if (this.mode !== 'action') this.mode = 'walk';
  }

  nearShore() {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 6) {
      if (heightAt(this.pos.x + Math.sin(a) * 4, this.pos.z + Math.cos(a) * 4) > 0.3) return true;
    }
    return false;
  }

  sit(rot) {
    this.mode = 'sit';
    this.yaw = rot;
    this.char.setAction('sit');
  }

  // Action animée bloquante (ratisser, marteler…) avec barre de progression
  playAction(anim, duration, onDone) {
    this.mode = 'action';
    this.action = { anim, t: 0, duration, onDone };
    this.char.setAction(anim);
    emit('action:start', { duration });
  }

  setPropTemp(name) { this.char.setProp('right', name); }

  update(dt) {
    const input = moveVector();
    const moving = input.fwd !== 0 || input.side !== 0;
    const locked = api.dialogue?.isOpen() || api.ui?.panelOpen() || api.cinematic?.active;

    // souris / zoom
    const { dx, dy } = consumeMouseDelta();
    const sens = 0.0024 * (state.options.sensitivity ?? 1);
    if (!locked) {
      this.camYaw -= dx * sens;
      this.camPitch += dy * sens * (state.options.invertY ? -1 : 1);
      this.camPitch = Math.max(-0.35, Math.min(1.25, this.camPitch));
      const w = consumeWheel();
      this.camDist = Math.max(2.2, Math.min(11, this.camDist + w * 0.004));
    } else consumeWheel();

    // action en cours
    if (this.mode === 'action') {
      const a = this.action;
      a.t += dt;
      emit('action:progress', { k: Math.min(1, a.t / a.duration) });
      if (a.t >= a.duration) {
        this.mode = 'walk';
        this.action = null;
        this.char.setAction('idle');
        emit('action:end');
        a.onDone?.();
      }
      this.char.speed = 0;
      this.char.update(dt);
      this.updateCamera(dt);
      return;
    }
    if (this.mode === 'sit') {
      if (moving && !locked) { this.mode = 'walk'; this.char.setAction('idle'); }
      this.group.rotation.y += angleDiff(this.group.rotation.y, this.yaw) * Math.min(1, dt * 6);
      this.char.speed = 0;
      this.char.update(dt);
      this.updateCamera(dt);
      return;
    }

    const groundH = heightAt(this.pos.x, this.pos.z);
    const tide = api.world?.ocean.tide ?? 0;
    const water = tide - groundH;
    if (this.mode !== 'boat' && this.mode !== 'bike') this.mode = water > 0.95 ? 'swim' : 'walk';
    if (this.mode === 'bike' && water > 0.4) { this.mode = 'swim'; this.bike.visible = false; }

    // vitesse cible
    let speed = WALK;
    const st = state.player;
    if (this.mode === 'swim') speed = SWIM * (hasSkill('nageur') ? 1.4 : 1);
    else if (this.mode === 'bike') speed = BIKE * (hasSkill('cycliste') ? 1.25 : 1) * (isRunning() ? 1.25 : 1);
    else if (this.mode === 'boat') speed = (BOAT_SPEED[this.boatType] ?? 4.5) * (hasSkill('marin') ? 1.3 : 1);
    else if (isRunning() && st.stamina > 1 && moving) speed = RUN;

    // direction relative à la caméra
    const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw);
    const rx = -fz, rz = fx;
    let wx = 0, wz = 0;
    if (moving && !locked) {
      const l = Math.hypot(input.fwd, input.side);
      wx = (fx * input.fwd + rx * input.side) / l;
      wz = (fz * input.fwd + rz * input.side) / l;
    }
    // accélération douce
    const acc = this.mode === 'boat' ? 1.6 : this.mode === 'bike' ? 3 : 10;
    this.vel.x += (wx * speed - this.vel.x) * Math.min(1, dt * acc);
    this.vel.z += (wz * speed - this.vel.z) * Math.min(1, dt * acc);

    // endurance
    if (moving && speed === RUN) st.stamina = Math.max(0, st.stamina - 12 * dt);
    else st.stamina = Math.min(st.maxStamina, st.stamina + (moving ? 6 : 14) * dt);

    // gravité, saut
    if (this.mode === 'walk') {
      if (this.grounded && keys.Space && !locked) { this.vel.y = JUMP; this.grounded = false; }
      this.vel.y -= GRAV * dt;
    } else this.vel.y = 0;

    // intégration + collisions
    let nx = this.pos.x + this.vel.x * dt, nz = this.pos.z + this.vel.z * dt;
    if (this.mode === 'boat') {
      // l'embarcation reste sur l'eau
      if (heightAt(nx, nz) > tide - 0.35) { nx = this.pos.x; nz = this.pos.z; this.vel.x *= -0.2; this.vel.z *= -0.2; }
    } else {
      const r = api.world.resolveCollision(nx, nz, this.mode === 'bike' ? 0.5 : 0.36);
      nx = r.x; nz = r.z;
    }
    const c = api.world.indoor ? { x: nx, z: nz } : clampToIsland(nx, nz);
    const moved = Math.hypot(c.x - this.pos.x, c.z - this.pos.z);
    state.stats.distance += moved;
    this.pos.x = c.x; this.pos.z = c.z;

    const gh = heightAt(this.pos.x, this.pos.z);
    if (this.mode === 'swim') {
      this.pos.y = tide - 0.15;
      this.grounded = true;
    } else if (this.mode === 'boat') {
      this.pos.y = tide + 0.05 + Math.sin(performance.now() / 700) * 0.04;
    } else {
      this.pos.y += this.vel.y * dt;
      if (this.pos.y <= gh) { this.pos.y = gh; this.vel.y = 0; this.grounded = true; } else if (this.pos.y > gh + 0.05) this.grounded = false;
      // petites marches : on suit le sol
      if (this.grounded) this.pos.y = gh;
    }

    // orientation du corps vers le déplacement
    const hs = Math.hypot(this.vel.x, this.vel.z);
    this.speed = hs;
    if (hs > 0.3 && moving) this.yaw += angleDiff(this.yaw, Math.atan2(this.vel.x, this.vel.z)) * Math.min(1, dt * (this.mode === 'boat' ? 2 : 10));
    this.group.rotation.y = this.yaw;

    // animation
    const ch = this.char;
    ch.speed = this.mode === 'boat' ? 0 : hs;
    if (this.mode === 'swim') ch.setAction('swim');
    else if (this.mode === 'bike') ch.setAction('pedal');
    else if (this.mode === 'boat') ch.setAction(['row', 'pirogue', 'canot', 'kayak'].includes(this.boatType) ? 'row' : 'sit');
    else if (ch.action !== 'idle' && !['wave', 'point', 'cheer'].includes(ch.action)) ch.setAction('idle');
    ch.j.body.position.y = this.mode === 'bike' ? 0.32 : this.mode === 'boat' ? 0.15 : 0;
    ch.update(dt);
    if (this.mode === 'bike') {
      this.bike.userData.wheels.forEach((w) => { w.rotation.x += hs * dt / 0.36; });
    }
    this.updateCamera(dt);
    // à l'intérieur, la sauvegarde retient la porte d'entrée
    if (!api.world.indoor) { st.x = this.pos.x; st.z = this.pos.z; st.yaw = this.yaw; }
  }

  // Caméra orbitale avec évitement des murs et cadrage pendant les dialogues
  updateCamera(dt) {
    const head = new THREE.Vector3(this.pos.x, this.pos.y + 1.55, this.pos.z);
    let target, look;
    if (this.focus) {
      // plan de dialogue : par-dessus l'épaule du joueur, face au PNJ
      const f = this.focus;
      const dx = f.x - this.pos.x, dz = f.z - this.pos.z;
      const d = Math.hypot(dx, dz) || 1;
      const ux = dx / d, uz = dz / d;
      target = new THREE.Vector3(this.pos.x - ux * 2.1 + uz * 0.9, this.pos.y + 1.85, this.pos.z - uz * 2.1 - ux * 0.9);
      look = new THREE.Vector3(f.x, (f.y ?? this.pos.y) + 1.5, f.z);
    } else {
      const dist = this.mode === 'boat' ? this.camDist + 3 : this.camDist;
      const cx = Math.sin(this.camYaw) * Math.cos(this.camPitch);
      const cz = Math.cos(this.camYaw) * Math.cos(this.camPitch);
      const cy = Math.sin(this.camPitch);
      // raccourcit le bras si un bâtiment s'interpose
      let k = 1;
      for (let s = 0.6; s <= dist; s += 0.4) {
        const px = head.x + cx * s, pz = head.z + cz * s, py = head.y + cy * s;
        if (py < heightAt(px, pz) + 0.3 || (py < head.y + 4 && api.world.isBlocked(px, pz, 0.15))) { k = Math.max(0.25, (s - 0.5) / dist); break; }
      }
      target = new THREE.Vector3(head.x + cx * dist * k, head.y + cy * dist * k + 0.2, head.z + cz * dist * k);
      look = head;
    }
    const minY = heightAt(target.x, target.z) + 0.35;
    if (target.y < minY) target.y = minY;
    // sous le plafond d'une pièce
    const ind = api.world?.indoor;
    if (ind && target.y > ind.ceil - 0.25) target.y = ind.ceil - 0.25;
    const tide = api.world?.ocean.tide ?? 0;
    if (target.y < tide + 0.3) target.y = tide + 0.3;
    this.camPos.lerp(target, 1 - Math.exp(-dt * (this.focus ? 4 : 14)));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(look);
  }
}

function makeBike() {
  const g = new THREE.Group();
  const tube = new THREE.MeshStandardMaterial({ color: 0x2a6aca, metalness: 0.5, roughness: 0.4 });
  const tyre = new THREE.MeshStandardMaterial({ color: 0x151515, roughness: 0.8 });
  const wheels = [];
  for (const z of [0.6, -0.6]) {
    const w = new THREE.Group();
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.035, 6, 20), tyre);
    t.rotation.y = Math.PI / 2;
    w.add(t);
    for (let i = 0; i < 6; i++) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.7, 0.01), tube);
      sp.rotation.x = (i / 6) * Math.PI;
      w.add(sp);
    }
    w.position.set(0, 0.36, z);
    g.add(w);
    wheels.push(w);
  }
  const add = (geo, x, y, z, rx = 0) => { const m = new THREE.Mesh(geo, tube); m.position.set(x, y, z); m.rotation.x = rx; m.castShadow = true; g.add(m); };
  add(new THREE.BoxGeometry(0.04, 0.04, 0.95), 0, 0.68, 0.0);
  add(new THREE.BoxGeometry(0.04, 0.55, 0.04), 0, 0.62, -0.25, 0.25);
  add(new THREE.BoxGeometry(0.04, 0.55, 0.04), 0, 0.62, 0.5, -0.3);
  add(new THREE.BoxGeometry(0.52, 0.03, 0.03), 0, 0.95, 0.42);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.26), new THREE.MeshStandardMaterial({ color: 0x1a1a1a }));
  seat.position.set(0, 0.92, -0.3);
  g.add(seat);
  const basket = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.26), new THREE.MeshStandardMaterial({ color: 0xb08a50, roughness: 0.9 }));
  basket.position.set(0, 0.86, 0.66);
  g.add(basket);
  g.userData.wheels = wheels;
  return g;
}
