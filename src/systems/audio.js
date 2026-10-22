// Audio procédural (WebAudio, aucun fichier) :
//  - musique générative propre à chaque époque (gammes, timbres, tempo) ;
//  - ambiances : ressac selon la distance à la mer, vent, oiseaux le jour,
//    grillons la nuit, mouettes, rumeur du village, cloche des heures ;
//  - sources spatialisées en 3D (feu de camp, forge) ;
//  - effets d'interface et de jeu.

import { state } from '../core/state.js';
import { heightAt } from '../world/terrain.js';

const A4 = 440;
const midi = (n) => A4 * Math.pow(2, (n - 69) / 12);

// Instruments et écriture musicale par époque
const STYLES = {
  prehistoire: { tempo: 62, root: 50, scale: [0, 3, 5, 7, 10], chords: [[0], [5], [0], [7]], lead: 'flute', bass: 'drone', drum: 'skin', beats: 4, density: 0.45 },
  antiquite: { tempo: 76, root: 52, scale: [0, 2, 3, 5, 7, 9, 10], chords: [[0, 7], [5, 12], [3, 10], [7, 14]], lead: 'lyre', bass: 'lyrebass', drum: 'frame', beats: 4, density: 0.6 },
  moyenage: { tempo: 84, root: 50, scale: [0, 2, 3, 5, 7, 9, 10], chords: [[0, 7], [0, 7], [10, 17], [5, 12]], lead: 'recorder', bass: 'vielle', drum: 'tabor', beats: 6, density: 0.65 },
  xvii: { tempo: 96, root: 55, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], lead: 'harpsi', bass: 'harpsibass', drum: null, beats: 4, density: 0.85 },
  xix: { tempo: 116, root: 53, scale: [0, 2, 4, 5, 7, 9, 11], chords: [[0, 4, 7], [5, 9, 12], [7, 11, 14], [0, 4, 7]], lead: 'accordion', bass: 'accbass', drum: null, beats: 3, density: 0.7 },
  wwii: { tempo: 66, root: 50, scale: [0, 2, 3, 5, 7, 8, 10], chords: [[0, 3, 7], [8, 12, 15], [5, 8, 12], [7, 10, 14]], lead: 'piano', bass: 'piano', drum: null, beats: 4, density: 0.4 },
  contemporaine: { tempo: 88, root: 52, scale: [0, 2, 4, 7, 9], chords: [[0, 4, 7, 11], [9, 12, 16], [5, 9, 12, 16], [7, 11, 14]], lead: 'guitar', bass: 'pad', drum: 'brush', beats: 4, density: 0.55 },
};

export class AudioManager {
  constructor() {
    this.ctx = null;
    this.style = null;
    this.nextNote = 0;
    this.beat = 0;
    this.bar = 0;
    this.lastLead = 7;
    this.spatial = [];
  }

  init() {
    if (this.ctx) return;
    const C = window.AudioContext || window.webkitAudioContext;
    if (!C) return;
    // tampon audio plus large : évite les craquements quand le rendu 3D est chargé
    let ctx;
    try { ctx = new C({ latencyHint: 'playback' }); } catch (e) { ctx = new C(); }
    this.ctx = ctx;
    // compression douce (un compresseur trop serré fait « pomper » le bruit de fond)
    this.comp = ctx.createDynamicsCompressor();
    this.comp.threshold.value = -12; this.comp.knee.value = 12; this.comp.ratio.value = 3;
    this.comp.attack.value = 0.01; this.comp.release.value = 0.3;
    this.comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.connect(this.comp);
    this.music = ctx.createGain();
    this.music.connect(this.master);
    this.sfxBus = ctx.createGain();
    this.sfxBus.connect(this.master);
    this.amb = ctx.createGain();
    this.amb.connect(this.master);
    // réverbération légère (impulsion synthétique)
    this.reverb = ctx.createConvolver();
    const len = ctx.sampleRate * 2.2;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6);
    }
    this.reverb.buffer = ir;
    this.revGain = ctx.createGain();
    this.revGain.gain.value = 0.28;
    this.reverb.connect(this.revGain).connect(this.master);
    this.noiseBuf = this.makeNoise();
    this.pinkBuf = this.makeNoise('pink');
    this.brownBuf = this.makeNoise('brown');
    this.applyVolume();
    this.startAmbience();
    this.timer = setInterval(() => this.schedule(), 90);
  }

  resume() { if (this.ctx?.state === 'suspended') this.ctx.resume(); }

  applyVolume() {
    if (!this.ctx) return;
    this.master.gain.value = state.options.volume ?? 0.7;
    this.music.gain.value = (state.options.music ?? 0.6) * 0.5;
  }

  // Bruits de fond : blanc (souffles brefs), rose (vent, rumeur), brun (ressac).
  // Les bruits rose et brun sont bien plus doux à l'oreille que le blanc filtré,
  // qui sonne comme une friture. Leur boucle est raccordée sans saut (pas de clic).
  makeNoise(kind = 'white') {
    const len = this.ctx.sampleRate * (kind === 'white' ? 2 : 6);
    const b = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = b.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, br = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === 'pink') {
        b0 = 0.99765 * b0 + w * 0.099046; b1 = 0.963 * b1 + w * 0.2965164; b2 = 0.57 * b2 + w * 1.0526913;
        d[i] = (b0 + b1 + b2 + w * 0.1848) * 0.2;
      } else if (kind === 'brown') {
        br = (br + 0.02 * w) / 1.02;
        d[i] = br * 3.2;
      } else d[i] = w;
    }
    if (kind !== 'white') {
      // retire la dérive pour que la fin rejoigne le début, puis fondu de raccord
      const drift = d[len - 1] - d[0];
      for (let i = 0; i < len; i++) d[i] -= drift * (i / (len - 1));
      const F = Math.floor(this.ctx.sampleRate * 0.05);
      for (let i = 0; i < F; i++) { const k = i / F; d[len - F + i] = d[len - F + i] * (1 - k) + d[i] * k; }
      let peak = 0;
      for (let i = 0; i < len; i++) peak = Math.max(peak, Math.abs(d[i]));
      for (let i = 0; i < len; i++) d[i] *= 0.9 / peak;
    }
    return b;
  }

  // ---------- Musique ----------
  setEra(id) {
    this.style = STYLES[id] ?? STYLES.contemporaine;
    if (!this.ctx) return;
    this.nextNote = this.ctx.currentTime + 0.5;
    this.beat = 0;
    this.bar = 0;
  }

  schedule() {
    if (!this.ctx || !this.style || this.muted) return;
    const s = this.style;
    const spb = 60 / s.tempo;
    while (this.nextNote < this.ctx.currentTime + 0.4) {
      const t = this.nextNote;
      const chord = s.chords[this.bar % s.chords.length];
      if (this.beat === 0) {
        // basse / bourdon sur le premier temps
        this.voice(s.bass, midi(s.root - 12 + chord[0]), t, spb * s.beats * 0.95, 0.16);
        if (s.bass === 'pad' || s.bass === 'vielle' || s.bass === 'drone') {
          for (const n of chord.slice(1)) this.voice(s.bass, midi(s.root + n - 12), t, spb * s.beats, 0.06);
        }
      } else if (s.bass === 'accbass' || s.bass === 'harpsibass' || s.bass === 'lyrebass') {
        // accompagnement (valse à l'accordéon, basse d'Alberti…)
        const n = chord[(this.beat) % chord.length];
        this.voice(s.bass, midi(s.root + n), t, spb * 0.8, 0.07);
      }
      // mélodie : marche aléatoire sur la gamme, attirée par l'accord
      if (Math.random() < s.density) {
        const sc = s.scale;
        let step = this.lastLead + Math.round((Math.random() - 0.5) * 3);
        if (Math.random() < 0.3) {
          const target = sc.indexOf(chord[Math.floor(Math.random() * chord.length)] % 12);
          if (target >= 0) step = target + 7 * Math.floor(this.lastLead / 7);
        }
        step = Math.max(3, Math.min(13, step));
        this.lastLead = step;
        const oct = Math.floor(step / sc.length), deg = sc[step % sc.length];
        const dur = spb * (Math.random() < 0.25 ? 2 : 1);
        this.voice(s.lead, midi(s.root + 12 + oct * 12 + deg), t, dur, 0.1);
      }
      if (s.drum && (this.beat === 0 || (s.drum === 'brush' && this.beat % 2 === 1) || (s.drum === 'tabor' && this.beat === 3))) {
        this.drum(s.drum, t, this.beat === 0 ? 0.25 : 0.12);
      }
      this.nextNote += spb;
      this.beat = (this.beat + 1) % s.beats;
      if (this.beat === 0) this.bar++;
    }
  }

  voice(kind, f, t, dur, vol) {
    const c = this.ctx;
    const g = c.createGain();
    g.connect(this.music);
    const send = c.createGain();
    send.gain.value = 0.6;
    g.connect(send).connect(this.reverb);
    const env = (a, d, sus, r) => {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + a);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol * sus), t + a + d);
      g.gain.setValueAtTime(Math.max(0.0001, vol * sus), t + Math.max(a + d, dur));
      g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + d, dur) + r);
    };
    const osc = (type, freq, detune = 0) => {
      const o = c.createOscillator();
      o.type = type;
      o.frequency.value = freq;
      o.detune.value = detune;
      return o;
    };
    const end = t + dur + 1.2;
    let out = g;
    const filt = (type, freq, q = 0.7) => {
      const fl = c.createBiquadFilter();
      fl.type = type; fl.frequency.value = freq; fl.Q.value = q;
      fl.connect(out);
      out = fl;
      return fl;
    };
    switch (kind) {
      case 'flute':
      case 'recorder': {
        const o = osc('sine', f);
        const vib = osc('sine', 5.2);
        const vg = c.createGain(); vg.gain.value = f * 0.006;
        vib.connect(vg).connect(o.frequency);
        const n = c.createBufferSource(); n.buffer = this.noiseBuf;
        const ng = c.createGain(); ng.gain.value = 0.04;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 2;
        n.connect(bp).connect(ng).connect(g);
        o.connect(g);
        env(0.06, 0.2, 0.7, 0.25);
        [o, vib, n].forEach((x) => { x.start(t); x.stop(end); });
        break;
      }
      case 'lyre':
      case 'lyrebass':
      case 'guitar': {
        const lp = filt('lowpass', kind === 'guitar' ? 2600 : 3200);
        const o = osc('triangle', f), o2 = osc('sawtooth', f, 4);
        const g2 = c.createGain(); g2.gain.value = 0.25;
        o.connect(lp); o2.connect(g2).connect(lp);
        lp.disconnect(); lp.connect(g);
        env(0.004, 0.35, 0.15, 0.9);
        [o, o2].forEach((x) => { x.start(t); x.stop(end); });
        break;
      }
      case 'harpsi':
      case 'harpsibass': {
        const o = osc('square', f), o2 = osc('sawtooth', f * 2, 3);
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3800;
        const g2 = c.createGain(); g2.gain.value = 0.3;
        o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g);
        env(0.002, 0.25, 0.08, 0.35);
        [o, o2].forEach((x) => { x.start(t); x.stop(end); });
        break;
      }
      case 'accordion':
      case 'accbass': {
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1900;
        const trem = osc('sine', 6);
        const tg = c.createGain(); tg.gain.value = 0.25;
        const amp = c.createGain(); amp.gain.value = 0.75;
        trem.connect(tg).connect(amp.gain);
        for (const det of [-9, 0, 9]) { const o = osc('sawtooth', f, det); o.connect(lp); o.start(t); o.stop(end); }
        lp.connect(amp).connect(g);
        env(0.04, 0.1, 0.8, 0.15);
        trem.start(t); trem.stop(end);
        break;
      }
      case 'vielle':
      case 'drone':
      case 'pad': {
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'pad' ? 900 : 1300;
        for (const det of [-6, 6]) { const o = osc(kind === 'pad' ? 'triangle' : 'sawtooth', f, det); o.connect(lp); o.start(t); o.stop(end); }
        lp.connect(g);
        env(0.4, 0.4, 0.7, 0.8);
        break;
      }
      case 'piano':
      default: {
        const o = osc('triangle', f), o2 = osc('sine', f * 2);
        const g2 = c.createGain(); g2.gain.value = 0.2;
        o.connect(g); o2.connect(g2).connect(g);
        env(0.004, 0.6, 0.12, 1.0);
        [o, o2].forEach((x) => { x.start(t); x.stop(end); });
      }
    }
  }

  drum(kind, t, vol) {
    const c = this.ctx;
    const g = c.createGain();
    g.connect(this.music);
    if (kind === 'brush') {
      const n = c.createBufferSource(); n.buffer = this.noiseBuf;
      const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000;
      n.connect(hp).connect(g);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * 0.3, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      n.start(t); n.stop(t + 0.2);
      return;
    }
    const o = c.createOscillator();
    o.frequency.setValueAtTime(kind === 'skin' ? 90 : 140, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.25);
    o.connect(g);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.start(t); o.stop(t + 0.4);
  }

  // ---------- Ambiances ----------
  loopNoise(buf, type, freq, q = 0.7, offset = 0) {
    const c = this.ctx;
    const n = c.createBufferSource(); n.buffer = buf; n.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
    // second filtre en série : coupe franche des aigus (plus de souffle sifflant)
    const f2 = c.createBiquadFilter(); f2.type = 'lowpass'; f2.frequency.value = Math.max(freq * 2.2, 900);
    const g = c.createGain(); g.gain.value = 0;
    n.connect(f).connect(f2).connect(g).connect(this.amb);
    n.start(c.currentTime, offset);
    return { n, f, g };
  }

  startAmbience() {
    this.waves = this.loopNoise(this.brownBuf, 'lowpass', 700, 0.5);
    this.foam = this.loopNoise(this.pinkBuf, 'bandpass', 1100, 0.5, 2.7);
    this.wind = this.loopNoise(this.pinkBuf, 'bandpass', 520, 0.6, 1.3);
    this.crowd = this.loopNoise(this.pinkBuf, 'bandpass', 420, 0.9, 4.1);
    this.ambT = 0;
  }

  // appelé chaque frame : volumes d'ambiance et position de l'auditeur
  update(dt, camera, info) {
    if (!this.ctx) return;
    const c = this.ctx;
    const L = c.listener;
    const p = camera.position;
    const fwd = camera.getWorldDirection(new (camera.position.constructor)());
    if (L.positionX) {
      L.positionX.value = p.x; L.positionY.value = p.y; L.positionZ.value = p.z;
      L.forwardX.value = fwd.x; L.forwardY.value = fwd.y; L.forwardZ.value = fwd.z;
      L.upX.value = 0; L.upY.value = 1; L.upZ.value = 0;
    }
    this.ambT += dt;
    // proximité de la mer : échantillonne le relief autour de l'auditeur
    let sea = 0;
    for (let a = 0; a < 8; a++) {
      for (const r of [6, 14, 28]) {
        if (heightAt(p.x + Math.cos(a * 0.785) * r, p.z + Math.sin(a * 0.785) * r) < 0) { sea = Math.max(sea, 1 - r / 34); }
      }
    }
    // houle : vagues qui montent et se retirent (deux périodes non multiples)
    const swell = 0.55 + 0.45 * Math.max(0, Math.sin(this.ambT * 0.9) * 0.6 + Math.sin(this.ambT * 0.37) * 0.4);
    const now = c.currentTime;
    const set = (node, v, tc = 0.4) => { node.g.gain.cancelScheduledValues(now); node.g.gain.setTargetAtTime(v, now, tc); };
    set(this.waves, sea * 0.17 * swell);
    set(this.foam, sea * 0.05 * swell * swell, 0.6);
    set(this.wind, (state.weather === 'rain' ? 0.06 : 0.02) + Math.min(0.03, Math.max(0, p.y - 4) * 0.003), 0.8);
    this.wind.f.frequency.setTargetAtTime(480 + Math.sin(this.ambT * 0.2) * 160, now, 1.5);
    set(this.crowd, info.inTown && !info.night ? 0.025 : 0.0, 0.8);
    // oiseaux le jour, grillons la nuit, mouettes au bord de l'eau
    if (!info.night && Math.random() < dt * 0.5) this.chirp();
    if (info.night && Math.random() < dt * 0.9) this.cricket();
    if (sea > 0.3 && Math.random() < dt * 0.12) this.sfx('gull');
    for (const s of this.spatial) {
      s.pan.positionX.value = s.pos.x; s.pan.positionY.value = s.pos.y; s.pan.positionZ.value = s.pos.z;
      if (s.kind === 'forge' && Math.random() < dt * 1.4) this.clang(s);
      if (s.kind === 'fire' && Math.random() < dt * 2.2) this.crackle(s);
    }
  }

  chirp() {
    const c = this.ctx, t = c.currentTime;
    const o = c.createOscillator(), g = c.createGain();
    const f = 2600 + Math.random() * 1800;
    o.frequency.setValueAtTime(f, t);
    for (let i = 0; i < 3; i++) o.frequency.linearRampToValueAtTime(f * (i % 2 ? 1.25 : 0.9), t + 0.05 * (i + 1));
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.018, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
    o.connect(g).connect(this.amb); o.start(t); o.stop(t + 0.25);
  }
  // stridulation : trains de 3-4 impulsions à enveloppe douce (pas de clics)
  cricket() {
    const c = this.ctx, t = c.currentTime + 0.02;
    const o = c.createOscillator(), g = c.createGain();
    o.frequency.value = 3900 + Math.random() * 500;
    const n = 3 + Math.floor(Math.random() * 2), v = 0.004 + Math.random() * 0.003;
    g.gain.setValueAtTime(0, t);
    for (let i = 0; i < n; i++) {
      const s = t + i * 0.055;
      g.gain.linearRampToValueAtTime(0, s);
      g.gain.linearRampToValueAtTime(v, s + 0.012);
      g.gain.linearRampToValueAtTime(0, s + 0.032);
    }
    o.connect(g).connect(this.amb); o.start(t); o.stop(t + n * 0.055 + 0.05);
  }

  // Sources sonores placées dans le monde (feu, forge)
  clearSpatial() {
    for (const s of this.spatial) { try { s.src?.stop(); } catch (e) { /* déjà arrêté */ } s.pan.disconnect(); }
    this.spatial = [];
  }
  addSpatial(kind, pos) {
    if (!this.ctx) return;
    const c = this.ctx;
    const pan = c.createPanner();
    pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse'; pan.refDistance = 3; pan.maxDistance = 60; pan.rolloffFactor = 1.4;
    pan.connect(this.amb);
    const s = { kind, pos, pan };
    if (kind === 'fire') {
      // ronflement grave du foyer ; les crépitements sont ajoutés un à un (crackle)
      const n = c.createBufferSource(); n.buffer = this.brownBuf; n.loop = true;
      const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      const g = c.createGain(); g.gain.value = 0.09;
      n.connect(f).connect(g).connect(pan); n.start(c.currentTime, Math.random() * 5);
      s.src = n;
    }
    this.spatial.push(s);
  }
  crackle(s) {
    const c = this.ctx, t = c.currentTime + 0.01;
    const n = c.createBufferSource(); n.buffer = this.noiseBuf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800 + Math.random() * 2200; f.Q.value = 1.2;
    const g = c.createGain();
    const v = 0.05 + Math.random() * 0.07, d = 0.02 + Math.random() * 0.04;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    n.connect(f).connect(g).connect(s.pan); n.start(t, Math.random() * 1.5); n.stop(t + d + 0.02);
  }
  clang(s) {
    const c = this.ctx, t = c.currentTime;
    for (const f of [1200, 1830, 2650]) {
      const o = c.createOscillator(), g = c.createGain();
      o.frequency.value = f; o.type = 'triangle';
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.12, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
      o.connect(g).connect(s.pan); o.start(t); o.stop(t + 0.7);
    }
  }

  bell(n = 1) {
    if (!this.ctx) return;
    const c = this.ctx;
    for (let k = 0; k < n; k++) {
      const t = c.currentTime + k * 1.6;
      for (const [f, v] of [[220, 0.12], [440, 0.06], [552, 0.04], [660, 0.03]]) {
        const o = c.createOscillator(), g = c.createGain();
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 3);
        o.connect(g).connect(this.amb); g.connect(this.reverb); o.start(t); o.stop(t + 3.1);
      }
    }
  }

  // ---------- Effets ----------
  sfx(kind) {
    if (!this.ctx) return;
    const c = this.ctx, t = c.currentTime;
    const g = c.createGain();
    g.connect(this.sfxBus);
    const o = c.createOscillator();
    o.connect(g);
    const tone = (f0, f1, dur, vol, type = 'sine') => {
      o.type = type;
      o.frequency.setValueAtTime(f0, t);
      o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.8);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.004);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.start(t); o.stop(t + dur + 0.05);
    };
    switch (kind) {
      case 'click': tone(660, 520, 0.08, 0.05, 'square'); break;
      case 'blip': tone(880, 880, 0.04, 0.012, 'triangle'); break;
      case 'pickup': tone(700, 1500, 0.25, 0.14); break;
      case 'coin': tone(1300, 2100, 0.3, 0.1, 'triangle'); break;
      case 'success': tone(523, 1046, 0.5, 0.12, 'triangle'); break;
      case 'fail': tone(220, 150, 0.3, 0.08, 'sawtooth'); break;
      case 'shutter': {
        const n = c.createBufferSource(); n.buffer = this.noiseBuf;
        const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2500;
        n.connect(hp).connect(g); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.25, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        n.start(t); n.stop(t + 0.15);
        break;
      }
      case 'portal': {
        tone(110, 1760, 2.2, 0.16, 'sine');
        const o2 = c.createOscillator(), g2 = c.createGain();
        o2.frequency.setValueAtTime(330, t); o2.frequency.exponentialRampToValueAtTime(2200, t + 2);
        g2.gain.setValueAtTime(0.0001, t); g2.gain.linearRampToValueAtTime(0.06, t + 0.005); g2.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
        o2.connect(g2).connect(this.reverb); o2.start(t); o2.stop(t + 2.5);
        break;
      }
      case 'gull': {
        o.type = 'triangle';
        o.frequency.setValueAtTime(900, t); o.frequency.linearRampToValueAtTime(1500, t + 0.12); o.frequency.linearRampToValueAtTime(700, t + 0.35);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.03, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
        o.start(t); o.stop(t + 0.45);
        break;
      }
      case 'splash': {
        const n = c.createBufferSource(); n.buffer = this.noiseBuf;
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 900;
        n.connect(lp).connect(g); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.2, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
        n.start(t); n.stop(t + 0.55);
        break;
      }
      default: tone(440, 440, 0.1, 0.05);
    }
  }
}
