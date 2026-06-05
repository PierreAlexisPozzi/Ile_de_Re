// Audio procédural : on synthétise des ambiances et SFX simples avec
// WebAudio. Pas de fichiers requis.

import { state } from './state.js';

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.ambient = null;
    this.currentEra = null;
  }

  init() {
    if (this.ctx) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = state.options.masterVolume;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx?.state === 'suspended') this.ctx.resume();
  }

  // Drone d'ambiance par époque
  playAmbient(eraId) {
    if (!this.ctx) return;
    this.stopAmbient();
    this.currentEra = eraId;

    const eraTones = {
      prehistoire: [55, 110, 165],
      antiquite: [65.4, 130.8, 196],
      moyenage: [73.4, 146.8, 220],
      xvii: [82.4, 164.8, 246.9],
      xix: [98, 196, 293],
      wwii: [49, 98, 147],
      contemporaine: [87.3, 174.6, 261.6],
    };
    const tones = eraTones[eraId] || eraTones.contemporaine;

    const ambientGain = this.ctx.createGain();
    ambientGain.gain.value = 0;
    ambientGain.gain.linearRampToValueAtTime(0.05, this.ctx.currentTime + 2);
    ambientGain.connect(this.master);

    const oscs = [];
    for (const f of tones) {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.value = 0.4;
      // LFO
      const lfo = this.ctx.createOscillator();
      lfo.frequency.value = 0.1 + Math.random() * 0.2;
      const lfoGain = this.ctx.createGain();
      lfoGain.gain.value = 0.15;
      lfo.connect(lfoGain).connect(g.gain);
      lfo.start();
      o.connect(g).connect(ambientGain);
      o.start();
      oscs.push(o, lfo);
    }

    // Bruit "vent / vagues"
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.5;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const noiseFilter = this.ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.value = 400;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.value = 0.08;
    noise.connect(noiseFilter).connect(noiseGain).connect(ambientGain);
    noise.start();

    this.ambient = { gain: ambientGain, oscs, noise };
  }

  stopAmbient() {
    if (!this.ambient) return;
    const a = this.ambient;
    a.gain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.4);
    setTimeout(() => {
      a.oscs.forEach((o) => o.stop());
      a.noise.stop();
    }, 500);
    this.ambient = null;
  }

  // SFX courts
  sfx(kind) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    const g = this.ctx.createGain();
    g.connect(this.master);
    const o = this.ctx.createOscillator();
    o.connect(g);
    switch (kind) {
      case 'pickup':
        o.frequency.setValueAtTime(880, now);
        o.frequency.exponentialRampToValueAtTime(1760, now + 0.15);
        g.gain.setValueAtTime(0.2, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        o.start(now); o.stop(now + 0.3); break;
      case 'click':
        o.type = 'square';
        o.frequency.value = 440;
        g.gain.setValueAtTime(0.05, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
        o.start(now); o.stop(now + 0.1); break;
      case 'portal':
        o.frequency.setValueAtTime(110, now);
        o.frequency.exponentialRampToValueAtTime(880, now + 1.2);
        g.gain.setValueAtTime(0.18, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 1.5);
        o.start(now); o.stop(now + 1.6); break;
      case 'gull':
        o.type = 'triangle';
        o.frequency.setValueAtTime(900, now);
        o.frequency.linearRampToValueAtTime(1400, now + 0.12);
        o.frequency.linearRampToValueAtTime(700, now + 0.3);
        g.gain.setValueAtTime(0.06, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        o.start(now); o.stop(now + 0.45); break;
    }
  }

  setVolume(v) {
    state.options.masterVolume = v;
    if (this.master) this.master.gain.value = v;
  }
}
