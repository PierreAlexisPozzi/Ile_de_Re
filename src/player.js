// Contrôleur joueur 3ème personne (caméra orbitale).

import * as THREE from 'three';
import { keys, moveVector, isRunning, isJumping, consumeMouseDelta } from './input.js';
import { heightAt } from './world.js';
import { state } from './state.js';

const WALK_SPEED = 6;
const RUN_SPEED = 12;
const BIKE_SPEED = 18;
const SWIM_SPEED = 3;
const JUMP_V = 7;
const GRAVITY = 22;
const CAM_DIST = 6;
const CAM_HEIGHT = 2.4;

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

    // Avatar simple : corps + tête
    const bodyMat = new THREE.MeshLambertMaterial({ color: 0x4a6a8a });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xe4b896 });
    this.body = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.2, 4, 8), bodyMat);
    this.body.position.y = 1.0;
    this.body.castShadow = true;
    this.head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), skinMat);
    this.head.position.y = 1.95;
    this.head.castShadow = true;
    this.group.add(this.body);
    this.group.add(this.head);

    // Vélo (caché par défaut)
    this.bike = this.buildBike();
    this.bike.visible = false;
    this.group.add(this.bike);

    scene.add(this.group);
    this.syncTransform();
  }

  buildBike() {
    const g = new THREE.Group();
    const tubeMat = new THREE.MeshLambertMaterial({ color: 0x222222 });
    const wheelMat = new THREE.MeshLambertMaterial({ color: 0x111111 });
    const wheelGeo = new THREE.TorusGeometry(0.45, 0.06, 6, 16);
    const w1 = new THREE.Mesh(wheelGeo, wheelMat);
    w1.rotation.y = Math.PI / 2; w1.position.set(0, 0.45, 0.7); g.add(w1);
    const w2 = new THREE.Mesh(wheelGeo, wheelMat);
    w2.rotation.y = Math.PI / 2; w2.position.set(0, 0.45, -0.7); g.add(w2);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 1.4), tubeMat);
    frame.position.set(0, 0.7, 0); g.add(frame);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.3), tubeMat);
    seat.position.set(0, 0.95, -0.4); g.add(seat);
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
    this.pitch -= dy * 0.0025 * state.options.mouseSensitivity;
    this.pitch = Math.max(-1.2, Math.min(0.9, this.pitch));

    // Détermination de la vitesse / mode
    const groundH = heightAt(this.position.x, this.position.z);
    const waterY = 0;
    const inWater = this.position.y < waterY + 0.5 && groundH < waterY;
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

    // Mouvement par rapport au regard caméra (yaw)
    const forwardX = -Math.sin(this.yaw), forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw), rightZ = -Math.sin(this.yaw);
    const moving = (fwd !== 0 || side !== 0);

    if (moving) {
      this.velocity.x = (forwardX * fx + rightX * sx) * speed;
      this.velocity.z = (forwardZ * fx + rightZ * sx) * speed;
      if (isRunning() && !this.swimming && !this.onBike) {
        state.player.stamina = Math.max(0, state.player.stamina - 8 * dt);
      }
      // Rotation du corps vers la direction de déplacement
      const targetYaw = Math.atan2(this.velocity.x, this.velocity.z);
      const diff = ((targetYaw - this.group.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
      this.group.rotation.y += diff * Math.min(1, dt * 8);
    } else {
      this.velocity.x *= 0.7;
      this.velocity.z *= 0.7;
      state.player.stamina = Math.min(100, state.player.stamina + 12 * dt);
    }

    // Saut + gravité
    if (this.swimming) {
      this.velocity.y = isJumping() ? 3 : -1.5;
      this.velocity.y *= 0.8;
    } else if (this.grounded && isJumping()) {
      this.velocity.y = JUMP_V;
      this.grounded = false;
    } else {
      this.velocity.y -= GRAVITY * dt;
    }

    // Intégration
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
    this.position.z += this.velocity.z * dt;

    // Limites du monde
    const lim = 240;
    this.position.x = Math.max(-lim, Math.min(lim, this.position.x));
    this.position.z = Math.max(-lim * 0.4, Math.min(lim * 0.4, this.position.z));

    // Collision sol
    const targetGroundH = heightAt(this.position.x, this.position.z);
    const floorY = Math.max(targetGroundH, -2);
    if (this.position.y <= floorY) {
      this.position.y = floorY;
      this.velocity.y = 0;
      this.grounded = true;
    } else {
      this.grounded = false;
    }

    // Animation simple (bobbing)
    if (moving && this.grounded && !this.onBike) {
      const t = performance.now() * 0.01;
      this.body.position.y = 1.0 + Math.sin(t * speed * 0.2) * 0.06;
      this.head.position.y = 1.95 + Math.sin(t * speed * 0.2) * 0.05;
    } else if (this.onBike) {
      this.body.position.y = 1.0;
      this.head.position.y = 1.95;
    }

    this.bike.visible = this.onBike;
    if (this.onBike) {
      // Rotation des roues
      const t = performance.now() * 0.01;
      this.bike.children[0].rotation.x = t * speed * 0.2;
      this.bike.children[1].rotation.x = t * speed * 0.2;
    }

    this.group.position.copy(this.position);

    // Caméra orbitale 3ème personne
    const camOffsetX = -Math.sin(this.yaw) * Math.cos(this.pitch) * CAM_DIST;
    const camOffsetZ = -Math.cos(this.yaw) * Math.cos(this.pitch) * CAM_DIST;
    const camOffsetY = Math.sin(this.pitch) * CAM_DIST + CAM_HEIGHT;
    this.camera.position.set(
      this.position.x - camOffsetX,
      this.position.y + camOffsetY,
      this.position.z - camOffsetZ
    );
    this.camera.lookAt(
      this.position.x, this.position.y + 1.6, this.position.z
    );

    // État partagé
    state.player.position = [this.position.x, this.position.y, this.position.z];
    state.player.rotation = this.yaw;
  }

  toggleBike() {
    this.onBike = !this.onBike;
  }

  teleportTo(x, z) {
    this.position.x = x;
    this.position.z = z;
    this.position.y = Math.max(heightAt(x, z), 0) + 1;
    this.velocity.set(0, 0, 0);
    this.syncTransform();
  }
}
