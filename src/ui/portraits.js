// Portraits des personnages pour les dialogues : chaque PNJ est rendu en
// buste dans une petite scène 3D hors écran, puis mis en cache (data URL).

import * as THREE from 'three';
import { buildCharacter } from '../characters/rig.js';

export class PortraitRenderer {
  constructor() {
    this.cache = new Map();
    this.canvas = document.createElement('canvas');
    this.canvas.width = 264;
    this.canvas.height = 300;
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.setPixelRatio(1);
    } catch (e) {
      this.renderer = null;
    }
    this.scene = new THREE.Scene();
    this.scene.add(new THREE.HemisphereLight(0xe8eef4, 0x4a3a2a, 1.2));
    const key = new THREE.DirectionalLight(0xfff0d8, 2.4);
    key.position.set(1.5, 2.5, 3);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9ac8ff, 1.2);
    rim.position.set(-2, 2, -2);
    this.scene.add(rim);
    this.camera = new THREE.PerspectiveCamera(24, 264 / 300, 0.05, 20);
  }

  // spec : spécification de personnage (rig.js) ; key : identifiant de cache
  get(key, spec) {
    if (this.cache.has(key)) return this.cache.get(key);
    if (!this.renderer || !spec) return '';
    const c = buildCharacter({ ...spec, action: 'idle' });
    c.update(0.016);
    c.group.rotation.y = 0.28;
    this.scene.add(c.group);
    c.group.updateMatrixWorld(true);
    const headY = 1.62 * c.scale;
    this.camera.position.set(0.18, headY + 0.02, 1.15);
    this.camera.lookAt(0, headY - 0.08, 0);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.render(this.scene, this.camera);
    const url = this.canvas.toDataURL('image/png');
    this.scene.remove(c.group);
    this.cache.set(key, url);
    return url;
  }

  // Icône de l'Astrolabe (voix du Gardien)
  astrolabe() {
    if (this.cache.has('__astrolabe')) return this.cache.get('__astrolabe');
    const c = document.createElement('canvas');
    c.width = 264; c.height = 300;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(132, 150, 10, 132, 150, 140);
    g.addColorStop(0, '#fff2c0'); g.addColorStop(0.35, '#d9b45f'); g.addColorStop(1, '#1a1206');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 264, 300);
    ctx.strokeStyle = '#3a2810'; ctx.lineWidth = 6;
    for (const r of [90, 66, 40]) { ctx.beginPath(); ctx.arc(132, 150, r, 0, Math.PI * 2); ctx.stroke(); }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 - Math.PI / 2;
      ctx.beginPath(); ctx.moveTo(132, 150); ctx.lineTo(132 + Math.cos(a) * 90, 150 + Math.sin(a) * 90); ctx.stroke();
      ctx.fillStyle = '#fff6d0';
      ctx.beginPath(); ctx.arc(132 + Math.cos(a) * 78, 150 + Math.sin(a) * 78, 8, 0, Math.PI * 2); ctx.fill();
    }
    const url = c.toDataURL();
    this.cache.set('__astrolabe', url);
    return url;
  }
}
