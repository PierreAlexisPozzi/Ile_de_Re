// Contrôleur joueur 3ème personne (caméra orbitale) avec avatar articulé,
// animation de marche et collisions contre le décor.

import * as THREE from 'three';
import { keys, moveVector, isRunning, isJumping, consumeMouseDelta } from './input.js';
import { heightAt } from './world.js';
import { state } from './state.js';
import { buildHumanoid, animateHumanoid } from './character.js';

const WALK_SPEED = 5;
const RUN_SPEED = 10;
const BIKE_SPEED = 16;
const SWIM_SPEED = 3;
const JUMP_V = 6.5;
const GRAVITY = 22;
const CAM_DIST = 6;
const CAM_HEIGHT = 2.6;
const BODY_RADIUS = 0.45;

export class Player {
  constructor(scene, camera) {
    this.scene = scene;
    this.camera = camera;
    this.group = new THREE.Group();
    this.position = new THREE.Vector3(...state.player.position);
    this.velocity = new THREE.Vector3();
    this.yaw = state.player.rotation;
    this.pitch = 0.2;
    this.grounded = true;
    this.swimming = false;
    this.onBike = state.player.onBike;
    this.walkPhase = 0;
    this.world = null;              // injecté par main.js pour les collisions

    // Avatar humanoïde (explorateur contemporain)
    const av = buildHumanoid({
      shirt: 0x2f6f4f, pants: 0x3a3f4a, skin: 0xe6b48f,
      hair: 0x2a1d12, backpack: true, hat: 'cap', accent: 0xb5462f,
    });
    this.avatar = av.group;
    this.parts = av.parts;
    this.group.add(this.avatar);

    // Vélo (caché par défaut)
    this.bike = this.buildBike();
    this.bike.visible = false;
    this.group.add(this.bike);

    scene.add(this.group);
    this.syncTransform();
  }

  buildBike() {
    const g = new THREE.Group();
    const tubeMat = new THREE.MeshStandardMaterial({ color: 0x222428, metalness: 0.6, roughness: 0.4 });
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.8 });
    const wheelGeo = new THREE.TorusGeometry(0.42, 0.06, 8, 18);
    this.bikeWheelF = new THREE.Mesh(wheelGeo, wheelMat);
    this.bikeWheelF.rotation.y = Math.PI / 2; this.bikeWheelF.position.set(0, 0.42, 0.62); g.add(this.bikeWheelF);
    this.bikeWheelB = new THREE.Mesh(wheelGeo, wheelMat);
    this.bikeWheelB.rotation.y = Math.PI / 2; this.bikeWheelB.position.set(0, 0.42, -0.62); g.add(this.bikeWheelB);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 1.2), tubeMat);
    frame.position.set(0, 0.62, 0); g.add(frame);
    const seatPost = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3), tubeMat);
    seatPost.position.set(0, 0.78, -0.32); g.add(seatPost);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.06, 0.26), new THREE.MeshStandardMaterial({ color: 0x2a2018 }));
    seat.position.set(0, 0.92, -0.32); g.add(seat);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.04), tubeMat);
    bar.position.set(0, 0.92, 0.5); g.add(bar);
    g.children.forEach((c) => (c.castShadow = true));
    return g;
  }

  syncTransform() {
    this.group.position.copy(this.position);
    this.group.rotation.y = this.yaw;
  }

  update(dt) {
    // Souris
    const { dx, dy } = consumeMouseDelta();
    this.yaw -= dx * 0.0025 * state.options.mouseSensitivity;
    this.pitch += dy * 0.0025 * state.options.mouseSensitivity;
    this.pitch = Math.max(-1.2, Math.min(0.9, this.pitch));

    // Mode / vitesse
    const groundH = heightAt(this.position.x, this.position.z);
    const inWater = this.position.y < 0.5 && groundH < 0;
    this.swimming = inWater;
    state.player.swimming = this.swimming;
    state.player.onBike = this.onBike;

    let speed;
    if (this.swimming) speed = SWIM_SPEED;
    else if (this.onBike) speed = BIKE_SPEED;
    else if (isRunning() && state.player.stamina > 0) speed = RUN_SPEED;
    else speed = WALK_SPEED;

    const { fwd, side } = moveVector();
    const len = Math.hypot(fwd, side) || 1;
    const fx = fwd / len, sx = side / len;

    const forwardX = -Math.sin(this.yaw), forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw), rightZ = -Math.sin(this.yaw);
    const moving = (fwd !== 0 || side !== 0);

    if (moving) {
      this.velocity.x = (forwardX * fx + rightX * sx) * speed;
      this.velocity.z = (forwardZ * fx + rightZ * sx) * speed;
      if (isRunning() && !this.swimming && !this.onBike) {
        state.player.stamina = Math.max(0, state.player.stamina - 8 * dt);
      }
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z);
      const diff = ((targetYaw - this.group.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
      this.group.rotation.y += diff * Math.min(1, dt * 10);
    } else {
      this.velocity.x *= 0.7;
      this.velocity.z *= 0.7;
      state.player.stamina = Math.min(100, state.player.stamina + 12 * dt);
    }

    // Saut / gravité
    if (this.swimming) {
      this.velocity.y = (isJumping() ? 3 : -1.5) * 0.8;
    } else if (this.grounded && isJumping()) {
      this.velocity.y = JUMP_V;
      this.grounded = false;
    } else {
      this.velocity.y -= GRAVITY * dt;
    }

    // Intégration horizontale + collisions
    let nx = this.position.x + this.velocity.x * dt;
    let nz = this.position.z + this.velocity.z * dt;
    if (this.world) {
      const r = this.world.resolveCollision(nx, nz, BODY_RADIUS);
      nx = r.x; nz = r.z;
    }
    this.position.x = nx;
    this.position.z = nz;
    this.position.y += this.velocity.y * dt;

    // Limites du monde
    const lim = 240;
    this.position.x = Math.max(-lim, Math.min(lim, this.position.x));
    this.position.z = Math.max(-lim * 0.4, Math.min(lim * 0.4, this.position.z));

    // Sol
    const targetGroundH = heightAt(this.position.x, this.position.z);
    const floorY = Math.max(targetGroundH, -2);
    if (this.position.y <= floorY) {
      this.position.y = floorY;
      this.velocity.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    // Animation de l'avatar
    const horizSpeed = Math.hypot(this.velocity.x, this.velocity.z);
    const intensity = Math.min(1, horizSpeed / RUN_SPEED + (this.onBike ? 0.4 : 0));
    this.walkPhase += dt * (4 + horizSpeed * 1.1);
    animateHumanoid(this.parts, this.walkPhase, moving ? Math.max(0.3, intensity) : 0, dt, this.onBike);

    // Position assise sur le vélo
    this.bike.visible = this.onBike;
    this.avatar.position.y = this.onBike ? 0.32 : 0;
    if (this.onBike) {
      const spin = this.walkPhase * 1.6;
      this.bikeWheelF.rotation.x = spin;
      this.bikeWheelB.rotation.x = spin;
    }

    this.group.position.copy(this.position);

    // Caméra orbitale + anti-clipping simple
    let camDist = CAM_DIST;
    const camOffsetX = -Math.sin(this.yaw) * Math.cos(this.pitch) * camDist;
    const camOffsetZ = -Math.cos(this.yaw) * Math.cos(this.pitch) * camDist;
    const camOffsetY = Math.sin(this.pitch) * camDist + CAM_HEIGHT;
    const camX = this.position.x - camOffsetX;
    const camZ = this.position.z - camOffsetZ;
    const camGround = heightAt(camX, camZ) + 1;
    this.camera.position.set(camX, Math.max(this.position.y + camOffsetY, camGround), camZ);
    this.camera.lookAt(this.position.x, this.position.y + 1.5, this.position.z);

    state.player.position = [this.position.x, this.position.y, this.position.z];
    state.player.rotation = this.yaw;
  }

  toggleBike() { this.onBike = !this.onBike; }

  teleportTo(x, z) {
    this.position.x = x;
    this.position.z = z;
    this.position.y = Math.max(heightAt(x, z), 0) + 1;
    this.velocity.set(0, 0, 0);
    this.syncTransform();
  }
}
