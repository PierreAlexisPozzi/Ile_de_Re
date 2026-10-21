// Cycle jour/nuit et météo : course du soleil (lever 6 h, coucher 21 h, l'été
// rétais), couleurs d'aube et de crépuscule, lune et étoiles, brouillard
// marin, pluie, fenêtres et lanternes qui s'allument à la nuit tombée.
// Une heure de jeu dure une minute réelle.

import * as THREE from 'three';
import { state } from '../core/state.js';
import { getEra } from '../story/eras.js';
import { setNightGlow } from '../world/materials.js';
import { emit } from '../core/events.js';

const SUNRISE = 6, SUNSET = 21;
const WEATHERS = ['clear', 'clear', 'clear', 'cloudy', 'cloudy', 'fog', 'rain'];

export class DayNight {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.sun = new THREE.DirectionalLight(0xfff1d8, 2.4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -48; sc.right = 48; sc.top = 48; sc.bottom = -48; sc.near = 1; sc.far = 260;
    this.sun.shadow.bias = -0.0004;
    this.sun.shadow.normalBias = 0.04;
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight(0xcfe0f0, 0x6a5a40, 0.9);
    scene.add(this.hemi);
    this.moon = new THREE.DirectionalLight(0x8aa0c8, 0.0);
    scene.add(this.moon, this.moon.target);
    this.fog = new THREE.FogExp2(0xc8d0d4, 0.004);
    scene.fog = this.fog;
    this.weatherT = 0;
    this.cloud = 0.3;
    this.fogBoost = 1;
    this.rain = this.makeRain();
    scene.add(this.rain);
    this.lastHour = Math.floor(state.time);
  }

  makeRain() {
    const N = 2400;
    const pos = new Float32Array(N * 6);
    for (let i = 0; i < N; i++) {
      const x = (Math.random() - 0.5) * 60, y = Math.random() * 30, z = (Math.random() - 0.5) * 60;
      pos.set([x, y, z, x + 0.05, y - 0.7, z + 0.05], i * 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xaab8c8, transparent: true, opacity: 0.35 }));
    l.frustumCulled = false;
    l.visible = false;
    return l;
  }

  setWeather(w) {
    state.weather = w;
    emit('weather', w);
  }

  // facteur 0..1 de jour, élévation du soleil
  sunInfo() {
    const t = state.time;
    const dayLen = SUNSET - SUNRISE;
    const k = (t - SUNRISE) / dayLen;           // 0 au lever, 1 au coucher
    const elev = Math.sin(Math.PI * Math.max(-0.25, Math.min(1.25, k)));
    const azim = Math.PI * (k - 0.5);           // est -> sud -> ouest
    return { elev, azim, k };
  }

  update(dt, focus) {
    // temps qui passe
    const before = state.time;
    state.time += dt / 60;
    if (state.time >= 24) { state.time -= 24; state.day++; }
    if (Math.floor(state.time) !== Math.floor(before)) emit('hour', Math.floor(state.time));

    // météo : change toutes les ~3 heures de jeu
    this.weatherT += dt / 60;
    if (this.weatherT > 3) {
      this.weatherT = 0;
      const era = state.era;
      const pool = era === 'wwii' ? [...WEATHERS, 'fog', 'cloudy'] : WEATHERS;
      if (!state.flags.lockWeather) this.setWeather(pool[Math.floor(Math.random() * pool.length)]);
    }
    const w = state.weather;
    const targetCloud = { clear: 0.28, cloudy: 0.72, fog: 0.55, rain: 0.92 }[w] ?? 0.3;
    this.cloud += (targetCloud - this.cloud) * Math.min(1, dt * 0.3);
    const targetFog = { clear: 1, cloudy: 1.2, fog: 4.2, rain: 2.0 }[w] ?? 1;
    this.fogBoost += (targetFog - this.fogBoost) * Math.min(1, dt * 0.3);

    const era = getEra(state.era);
    const { elev, azim } = this.sunInfo();
    const day = Math.max(0, Math.min(1, elev * 2.5 + 0.12));
    const night = 1 - Math.max(0, Math.min(1, elev * 4 + 0.6));
    const dusk = Math.max(0, 1 - Math.abs(elev) * 5) * (elev > -0.2 ? 1 : 0);
    const overcast = Math.max(0, (this.cloud - 0.4) / 0.6);

    // direction du soleil (sud = +z, est = +x)
    const dir = new THREE.Vector3(Math.sin(azim) * Math.cos(Math.max(elev, -0.3)), Math.sin(Math.max(elev, 0.04)), Math.cos(azim) * 0.55 + 0.35).normalize();
    const f = focus ?? { x: 0, z: 0 };
    this.sun.position.set(f.x + dir.x * 120, dir.y * 120, f.z + dir.z * 120);
    this.sun.target.position.set(f.x, 0, f.z);
    this.moon.position.set(f.x - dir.x * 100, Math.abs(dir.y) * 100 + 30, f.z - dir.z * 100);
    this.moon.target.position.set(f.x, 0, f.z);

    const sunCol = new THREE.Color(0xfff2dc).lerp(new THREE.Color(0xff9a5a), dusk * 0.85);
    this.sun.color.copy(sunCol);
    this.sun.intensity = (0.15 + 2.5 * day) * (1 - overcast * 0.55) * (elev > -0.05 ? 1 : 0.0);
    this.moon.intensity = 0.32 * night;
    // à l'intérieur, la lumière du ciel n'entre que par les fenêtres
    const indoorK = this.world.indoor ? 0.32 : 1;
    this.hemi.intensity = (0.25 + 0.75 * day) * indoorK;
    this.hemi.color.set(0x24304a).lerp(new THREE.Color(0xcfe0f0), day);
    this.hemi.groundColor.set(0x1a1a22).lerp(new THREE.Color(0x6a5a40), day);

    // ciel
    const u = this.world.sky.uniforms;
    const top = new THREE.Color(era.sky.day).lerp(new THREE.Color(era.sky.night), night);
    top.lerp(new THREE.Color(0x8a96a4), overcast * 0.6 * (1 - night));
    const hor = new THREE.Color(era.sky.horizon).lerp(new THREE.Color(0x1a2232), night * 0.9);
    hor.lerp(new THREE.Color(0xf09060), dusk * 0.7);
    hor.lerp(new THREE.Color(0xa8b0b8), overcast * 0.5 * (1 - night));
    u.topColor.value.copy(top);
    u.horizonColor.value.copy(hor);
    u.sunDir.value.copy(dir);
    u.sunColor.value.copy(sunCol);
    u.night.value = night;
    u.cloudiness.value = this.cloud;
    u.cloudColor.value.set(0xffffff).lerp(new THREE.Color(0x3a4252), night * 0.85).lerp(new THREE.Color(0x8a9098), overcast * 0.5);
    u.time.value += dt;

    // brouillard
    this.fog.color.copy(hor).lerp(new THREE.Color(era.fog.color), 0.4 * (1 - night));
    this.fog.density = era.fog.density * this.fogBoost * (1 + night * 0.3);

    // fenêtres éclairées, lanternes
    setNightGlow(Math.max(0, Math.min(1, (0.25 - elev) * 4)));

    // pluie autour de la caméra
    this.rain.visible = w === 'rain';
    if (this.rain.visible) {
      const p = this.rain.geometry.attributes.position;
      const a = p.array;
      for (let i = 0; i < a.length; i += 6) {
        a[i + 1] -= dt * 18; a[i + 4] -= dt * 18;
        if (a[i + 4] < -2) { a[i + 1] += 30; a[i + 4] += 30; }
      }
      p.needsUpdate = true;
      this.rain.position.set(f.x, 0, f.z);
    }
    this.daylight = day;
    this.night = night;
  }

  isNight() { return state.time >= SUNSET || state.time < SUNRISE; }
}
