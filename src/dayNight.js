// Cycle jour/nuit, soleil, lune, météo, brume.

import * as THREE from 'three';
import { getEra } from './eras.js';
import { state } from './state.js';

const DAY_LENGTH = 24 * 60; // 24 minutes de jeu = 1 jour
const SECONDS_PER_DAY = 86400;

export class DayNight {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    // centre d'intérêt (la ville de l'époque) : ombres et soleil le suivent
    this.focus = { x: 0, z: 0 };

    this.sun = new THREE.DirectionalLight(0xffe8c8, 1.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.left = -80;
    this.sun.shadow.camera.right = 80;
    this.sun.shadow.camera.top = 80;
    this.sun.shadow.camera.bottom = -80;
    this.sun.shadow.camera.near = 0.5;
    this.sun.shadow.camera.far = 300;
    scene.add(this.sun);
    scene.add(this.sun.target);

    this.ambient = new THREE.AmbientLight(0x6080a0, 0.5);
    scene.add(this.ambient);

    this.moon = new THREE.DirectionalLight(0x8898b8, 0.15);
    scene.add(this.moon);

    this.fog = new THREE.FogExp2(0xb0c0d0, 0.006);
    scene.fog = this.fog;

    // Soleil et lune visibles
    this.sunMesh = new THREE.Mesh(
      new THREE.SphereGeometry(8, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xfff0c8 })
    );
    scene.add(this.sunMesh);
    this.moonMesh = new THREE.Mesh(
      new THREE.SphereGeometry(5, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0xe8eef0 })
    );
    scene.add(this.moonMesh);
  }

  update(dt) {
    // Temps de jeu : 1 seconde réelle = ~60 secondes de jeu
    state.time = (state.time + dt * 60) % SECONDS_PER_DAY;

    const t = state.time / SECONDS_PER_DAY; // 0..1
    const angle = t * Math.PI * 2 - Math.PI / 2;
    const sunY = Math.sin(angle);
    const sunX = Math.cos(angle);

    const era = getEra(state.era);

    this.sun.position.set(this.focus.x + sunX * 100, sunY * 100, this.focus.z + 30);
    this.sun.target.position.set(this.focus.x, 0, this.focus.z);
    this.sunMesh.position.set(this.focus.x + sunX * 220, sunY * 220, this.focus.z + 60);

    this.moon.position.set(this.focus.x - sunX * 100, -sunY * 100, this.focus.z + 30);
    this.moonMesh.position.set(this.focus.x - sunX * 220, -sunY * 220, this.focus.z + 60);
    this.moonMesh.visible = sunY < 0.2;

    // Intensités selon la hauteur du soleil
    const dayFactor = Math.max(0, sunY);
    const nightFactor = Math.max(0, -sunY);

    // Couleur du soleil au lever/coucher
    const dawn = Math.max(0, 1 - Math.abs(sunY * 4));
    const sunColor = new THREE.Color().setHSL(
      0.08 + 0.02 * (1 - dawn),
      0.7,
      0.55 + 0.15 * dayFactor
    );
    if (dawn > 0.3) {
      sunColor.lerp(new THREE.Color(0xff9966), dawn * 0.7);
    }
    this.sun.color.copy(sunColor);
    this.sun.intensity = 0.2 + 1.0 * dayFactor;

    this.ambient.color.lerpColors(
      new THREE.Color(0x202840),
      new THREE.Color(0x9aa2a8),
      dayFactor
    );
    this.ambient.intensity = 0.25 + 0.4 * dayFactor;

    this.moon.intensity = 0.12 * nightFactor;

    // Ciel
    const skyTop = new THREE.Color(era.sky.day).lerp(
      new THREE.Color(era.sky.night), nightFactor
    );
    const skyHorizon = new THREE.Color(era.sky.horizon).lerp(
      new THREE.Color(0x1a2030), nightFactor * 0.7
    );
    if (dawn > 0.3) {
      skyHorizon.lerp(new THREE.Color(0xff7a3a), dawn * 0.6);
    }
    this.world.setSkyColors(skyTop, skyHorizon);

    // Brouillard
    const fogBase = era.fog.density;
    let fogDensity = fogBase + nightFactor * 0.004;
    if (state.weather === 'fog') fogDensity *= 4;
    if (state.weather === 'rain') fogDensity *= 1.8;
    this.fog.color.copy(skyHorizon).lerp(new THREE.Color(era.fog.color), 0.5);
    this.fog.density = fogDensity;
  }

  setFocus(x, z) {
    this.focus.x = x;
    this.focus.z = z;
  }

  getClock() {
    const total = state.time;
    const h = Math.floor(total / 3600);
    const m = Math.floor((total % 3600) / 60);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
}
