// Personnage articulé : squelette (hanches, colonne, poitrine, cou, tête,
// épaules, coudes, poignets, hanches, genoux, chevilles), corps modelé en
// profils tournés (LatheGeometry) et capsules, tête déformée avec visage
// peint, puis superposition du costume (voir costumes.js).
//
// Échelle : 1 unité = 1 mètre. Un adulte mesure ~1,75 m, une porte 2,05 m.

import * as THREE from 'three';
import { faceTexture } from './face.js';
import { clothMat, flatMat } from '../gfx/cloth.js';
import * as C from './costumes.js';
import { buildProp } from './props.js';
import { animate } from './anim.js';
import { hashStr } from '../core/rng.js';

const PI = Math.PI;
const V = (x, y) => new THREE.Vector2(x, y);
const BASE_H = 1.755;

// Profils du buste (repère colonne : y = 0 à la taille, 0.44 à la base du cou)
const TORSO = {
  m: [V(0.001, -0.07), V(0.128, -0.07), V(0.136, -0.02), V(0.14, 0.05), V(0.146, 0.12), V(0.156, 0.19),
    V(0.163, 0.26), V(0.164, 0.31), V(0.155, 0.355), V(0.128, 0.39), V(0.085, 0.42), V(0.055, 0.435), V(0.001, 0.44)],
  f: [V(0.001, -0.07), V(0.132, -0.07), V(0.125, -0.01), V(0.117, 0.06), V(0.126, 0.13), V(0.146, 0.2),
    V(0.152, 0.26), V(0.145, 0.31), V(0.134, 0.35), V(0.11, 0.385), V(0.072, 0.415), V(0.047, 0.43), V(0.001, 0.435)],
};
// Profil du bassin (repère hanches)
const PELVIS = {
  m: [V(0.001, -0.13), V(0.09, -0.13), V(0.13, -0.09), V(0.146, -0.03), V(0.146, 0.02), V(0.14, 0.06), V(0.13, 0.09), V(0.001, 0.09)],
  f: [V(0.001, -0.13), V(0.1, -0.13), V(0.138, -0.09), V(0.152, -0.03), V(0.15, 0.02), V(0.126, 0.06), V(0.112, 0.09), V(0.001, 0.09)],
};

// Membre effilé : calotte hémisphérique en haut (articulation), galbe, calotte
// en bas. y = 0 au pivot supérieur, y = -len au pivot inférieur. Les calottes
// de même rayon de part et d'autre d'une articulation rendent la jointure invisible.
function limbGeometry(len, radii) {
  const pts = [];
  const rB = radii[radii.length - 1], rT = radii[0];
  for (let i = 0; i <= 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * (Math.PI / 2);
    pts.push(V(Math.max(0.0005, Math.cos(a) * rB), -len + Math.sin(a) * rB));
  }
  for (let i = radii.length - 2; i >= 1; i--) {
    pts.push(V(radii[i], -len * (i / (radii.length - 1))));
  }
  for (let i = 0; i <= 5; i++) {
    const a = (i / 5) * (Math.PI / 2);
    pts.push(V(Math.max(0.0005, Math.cos(a) * rT), Math.sin(a) * rT));
  }
  return new THREE.LatheGeometry(pts, 14);
}

const headMatCache = new Map();
function headMaterial(opts) {
  const key = JSON.stringify(opts);
  if (!headMatCache.has(key)) {
    headMatCache.set(key, new THREE.MeshStandardMaterial({ map: faceTexture(opts), roughness: 0.62 }));
  }
  return headMatCache.get(key);
}

function part(geometry, material, shadow = true) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = shadow;
  return m;
}

export class Character {
  constructor(spec) {
    this.spec = spec;
    this.group = new THREE.Group();
    this.j = {};
    this.seed = (hashStr(spec.id || JSON.stringify(spec).slice(0, 64)) % 1000) / 100;
    this.t = this.seed * 3;
    this.gaitPhase = 0;
    this.pedalPhase = 0;
    this.speed = 0;
    this.action = spec.action || 'idle';
    this.look = null;
    this.pose = null;
    this.curiosity = spec.curiosity ?? 1;
    this.stoop = spec.age === 'old' ? 0.13 : 0;
    this.hipBase = 0.95;
    this.longSkirt = false;
    this.build();
  }

  setAction(a) { this.action = a || 'idle'; }
  update(dt) { animate(this, dt); }

  // Fait regarder le personnage vers un point du monde (ou null).
  lookAtWorld(target) {
    if (!target) { this.look = null; return; }
    const p = this.group.position;
    const dx = target.x - p.x, dz = target.z - p.z;
    const yaw = this.group.rotation.y;
    // repère local : avant = +z, gauche = +x
    const lx = dx * Math.cos(yaw) - dz * Math.sin(yaw);
    const lz = dx * Math.sin(yaw) + dz * Math.cos(yaw);
    const ang = Math.atan2(lx, lz);
    if (Math.abs(ang) > 1.7) { this.look = null; return; }
    const dist = Math.hypot(dx, dz) || 1;
    const dy = (target.y ?? p.y + 1.6) - (p.y + 1.6 * this.scale);
    this.look = {
      yaw: Math.max(-1.0, Math.min(1.0, ang)),
      pitch: Math.max(-0.4, Math.min(0.4, -Math.atan2(dy, dist))),
    };
  }

  build() {
    const s = this.spec;
    const o = s.outfit || {};
    const sex = s.sex === 'f' ? 'f' : 'm';
    const age = s.age || 'adult';
    const child = age === 'child';
    const old = age === 'old';
    const build = s.build || 'normal';
    const P = TORSO[sex];
    const PV = PELVIS[sex];

    const tScale = new THREE.Vector3(sex === 'm' ? 1.1 : 1.05, 1, sex === 'm' ? 0.78 : 0.8);
    const pScale = new THREE.Vector3(sex === 'm' ? 1.04 : 1.12, 1, sex === 'm' ? 0.76 : 0.8);
    if (build === 'stout') { tScale.x *= 1.12; tScale.z *= 1.28; pScale.x *= 1.08; pScale.z *= 1.2; }
    if (build === 'slim') { tScale.x *= 0.94; tScale.z *= 0.92; pScale.x *= 0.95; }
    const limbK = (sex === 'f' ? 0.9 : 1) * (build === 'stout' ? 1.12 : build === 'slim' ? 0.92 : 1);
    const shoulderX = (sex === 'm' ? 0.205 : 0.185) * (build === 'stout' ? 1.1 : 1);
    this.torsoProfile = P;
    this.torsoScale = tScale;

    // ---------- Squelette ----------
    const j = this.j;
    const body = new THREE.Group();
    this.group.add(body);
    const height = s.height ?? (child ? 1.25 : sex === 'f' ? (old ? 1.6 : 1.66) : (old ? 1.7 : 1.76));
    this.scale = height / BASE_H;
    body.scale.setScalar(this.scale);
    j.body = body;
    const G = (parent, x, y, z, name) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      parent.add(g);
      if (name) j[name] = g;
      return g;
    };
    G(body, 0, 0.95, 0, 'hips');
    G(j.hips, 0, 0.1, 0, 'spine');
    G(j.spine, 0, 0.22, 0, 'chest');
    G(j.chest, 0, 0.2, 0.005, 'neck');
    G(j.neck, 0, 0.075, 0, 'head');
    G(j.head, 0, 0.1, 0, 'headC');
    if (child) j.headC.scale.setScalar(1.24);
    G(j.chest, shoulderX, 0.14, -0.005, 'armL');
    G(j.chest, -shoulderX, 0.14, -0.005, 'armR');
    G(j.armL, 0, -0.275, 0, 'elbowL');
    G(j.armR, 0, -0.275, 0, 'elbowR');
    G(j.elbowL, 0, -0.245, 0, 'handL');
    G(j.elbowR, 0, -0.245, 0, 'handR');
    const hipX = sex === 'f' ? 0.1 : 0.095;
    G(j.hips, hipX, -0.04, 0, 'legL');
    G(j.hips, -hipX, -0.04, 0, 'legR');
    G(j.legL, 0, -0.43, 0, 'kneeL');
    G(j.legR, 0, -0.43, 0, 'kneeR');
    G(j.kneeL, 0, -0.415, 0, 'ankleL');
    G(j.kneeR, 0, -0.415, 0, 'ankleR');

    // ---------- Matériaux ----------
    const skin = flatMat(s.skin ?? 0xe0b08c, 0.62);
    const topM = clothMat(o.top ?? { c: 0x7a6a5a });
    const botM = clothMat(o.bottom ?? o.top ?? { c: 0x4a4038 });
    const coatM = o.coat ? clothMat(o.coat) : null;
    const sleeveM = coatM && !o.coat.sleeveless ? coatM : (o.sleeveMat ? clothMat(o.sleeveMat) : topM);
    const sleeves = o.sleeves ?? 'long';
    const upperArmM = sleeves === 'none' ? skin : sleeveM;
    const foreArmM = sleeves === 'long' ? sleeveM : skin;
    const handM = o.gloves ? clothMat({ c: o.gloves, p: 'leather' }) : skin;
    const legs = o.legs ?? 'trousers';
    const stockM = clothMat(o.stockings ?? { c: 0xe8e2d4, p: 'knit' });
    const wrapM = clothMat(o.wraps ?? { c: 0xb8a882, p: 'linen' });
    const thighM = legs === 'bare' || legs === 'shorts' ? skin : botM;
    const shinM = { trousers: botM, hose: botM, breeches: stockM, bare: skin, shorts: skin, wrapped: wrapM }[legs] ?? botM;

    // ---------- Corps ----------
    const pelvis = part(C.geo(`pelvis-${sex}`, () => new THREE.LatheGeometry(PV, 20)), botM);
    pelvis.scale.copy(pScale);
    j.hips.add(pelvis);
    const torso = part(C.geo(`torso-${sex}`, () => new THREE.LatheGeometry(P, 24)), topM);
    torso.scale.copy(tScale);
    j.spine.add(torso);

    const k = limbK;
    const upperGeo = C.geo(`upperarm-${k}`, () => limbGeometry(0.275, [0.05 * k, 0.05 * k, 0.046 * k, 0.042 * k, 0.04 * k]));
    const foreGeo = C.geo(`forearm-${k}`, () => limbGeometry(0.245, [0.04 * k, 0.042 * k, 0.037 * k, 0.032 * k, 0.029 * k]));
    const palmGeo = C.geo('palm', () => new THREE.SphereGeometry(0.045, 10, 8));
    const thumbGeo = C.geo('thumb', () => new THREE.CapsuleGeometry(0.012, 0.03, 3, 6));
    for (const side of ['L', 'R']) {
      const arm = j['arm' + side], elbow = j['elbow' + side], hand = j['hand' + side];
      arm.add(part(upperGeo, upperArmM));
      elbow.add(part(foreGeo, foreArmM));
      const palm = part(palmGeo, handM);
      palm.scale.set(0.78, 1.2, 0.5);
      palm.position.y = -0.055;
      hand.add(palm);
      const thumb = part(thumbGeo, handM, false);
      thumb.position.set(0, -0.03, 0.026);
      thumb.rotation.x = 0.6;
      hand.add(thumb);
      if (o.cuffs) {
        const cuff = part(C.geo('cuff', () => new THREE.CylinderGeometry(0.05, 0.062, 0.1, 12, 1, true)), C.dsMat(o.cuffs));
        cuff.position.y = -0.2;
        elbow.add(cuff);
      }
      if (sleeves === 'rolled') {
        const roll = part(C.geo('rollsleeve', () => new THREE.TorusGeometry(0.043, 0.012, 6, 12)), sleeveM, false);
        roll.rotation.x = PI / 2;
        roll.position.y = -0.05;
        elbow.add(roll);
      }
    }

    const neck = part(C.geo('neck', () => new THREE.CylinderGeometry(0.05, 0.057, 0.13, 12)), skin);
    neck.position.y = 0.035;
    j.neck.add(neck);

    // Tête et visage
    const hair = s.hair ?? { style: 'short', color: 0x3a2a1a };
    const hairColor = old && !s.hair?.keepColor ? (hair.grey ?? 0xb8b2aa) : hair.color;
    const bald = ['none', 'bald', 'tonsure', 'fringe'].includes(hair.style);
    const hat = C.buildHat(s.hat?.type, s.hat?.c, s.hat?.c2);
    const faceOpts = {
      skin: s.skin ?? 0xe0b08c,
      eyes: s.eyes ?? 0x5a4632,
      brows: old ? 0xa8a29a : (s.beard?.color ?? hairColor),
      sex, age,
      stubble: !!(s.face?.stubble || s.beard?.style === 'stubble'),
      scar: !!s.face?.scar,
      freckles: !!s.face?.freckles,
      makeup: !!s.face?.makeup,
      expression: s.face?.expression ?? 'neutral',
      dirt: !!s.face?.dirt,
      hairPaint: bald ? null : hairColor,
      hairline: s.face?.hairline ?? (sex === 'f' ? 0.25 : 0.5),
    };
    const headGeo = C.geo('head', () => C.deformHeadGeometry(new THREE.SphereGeometry(C.HEAD_R, 32, 24), C.HEAD_R));
    const head = part(headGeo, headMaterial(faceOpts));
    j.headC.add(head);
    const earGeo = C.geo('ear', () => new THREE.SphereGeometry(0.024, 8, 6));
    for (const sx of [-1, 1]) {
      const ear = part(earGeo, skin, false);
      ear.scale.set(0.42, 1, 0.72);
      ear.position.set(sx * 0.079, -0.006, -0.008);
      j.headC.add(ear);
    }
    const nose = part(C.geo('nose', () => new THREE.SphereGeometry(0.017, 10, 8)), skin, false);
    const nk = old || build === 'stout' ? 1.18 : child ? 0.8 : 1;
    nose.scale.set(0.72 * nk, 1.3 * nk, 1.05 * nk);
    nose.position.set(0, -0.018, 0.093);
    nose.rotation.x = -0.25;
    j.headC.add(nose);

    if (!hat.hidesHair || ['braids', 'wig'].includes(hair.style)) {
      j.headC.add(C.buildHair(hair.style, hairColor, sex));
    }
    if (s.beard) j.headC.add(C.buildBeard(s.beard.style, old ? 0xc8c2b8 : s.beard.color ?? hairColor));
    if (s.glasses) j.headC.add(C.buildGlasses(s.glasses === 'sun' ? 'sun' : 'glasses'));
    j.headC.add(hat.head);
    if (hat.chest) j.chest.add(hat.chest);

    // Jambes et pieds
    const legK = (sex === 'f' ? 1.02 : 1) * (build === 'stout' ? 1.1 : build === 'slim' ? 0.94 : 1);
    const lk = legK;
    const thighGeo = C.geo(`thigh-${lk}`, () => limbGeometry(0.43, [0.079 * lk, 0.076 * lk, 0.068 * lk, 0.06 * lk, 0.053 * lk]));
    const shinGeo = C.geo(`shin-${lk}`, () => limbGeometry(0.415, [0.053 * lk, 0.057 * lk, 0.05 * lk, 0.043 * lk, 0.037 * lk]));
    const shoes = o.shoes ?? { type: 'shoe', c: 0x2a1e14 };
    for (const side of ['L', 'R']) {
      const leg = j['leg' + side], knee = j['knee' + side], ankle = j['ankle' + side];
      leg.add(part(thighGeo, thighM));
      knee.add(part(shinGeo, shinM));
      if (legs === 'shorts') {
        // ourlet du short au-dessus du genou : le bas de la cuisse reste en peau
        const hem = part(C.geo(`shorthem-${lk}`, () => new THREE.CylinderGeometry(0.068 * lk, 0.064 * lk, 0.05, 12, 1, true)), C.dsMat(o.bottom ?? { c: 0x4a4038 }), false);
        hem.position.y = -0.22;
        leg.add(hem);
      }
      if (legs === 'shorts') {
        const top = part(C.geo(`shorttop-${lk}`, () => limbGeometry(0.2, [0.081 * lk, 0.079 * lk, 0.075 * lk, 0.072 * lk, 0.07 * lk])), botM);
        leg.add(top);
      }
      if (legs === 'breeches') {
        const garter = part(C.geo('garter', () => new THREE.CylinderGeometry(0.06, 0.06, 0.035, 12)), botM, false);
        garter.position.y = -0.04;
        knee.add(garter);
      }
      ankle.add(C.buildFoot(shoes.type, shoes.c, skin));
    }

    // ---------- Vêtements superposés ----------
    const topR = sex === 'f' ? 0.158 : 0.152;
    const skirtSX = pScale.x * 1.05, skirtSZ = pScale.z * 1.1;
    const skirt = o.skirt || o.robe || o.tunic;
    if (skirt) {
      const len = skirt.len ?? (o.tunic ? 0.5 : 0.92);
      const m = C.buildSkirt({ ...skirt, len, flare: skirt.flare ?? (o.tunic ? 0.55 : 1), topR, sx: skirtSX, sz: skirtSZ });
      const pivot = new THREE.Group();
      pivot.add(m);
      j.hips.add(pivot);
      j.skirt = pivot;
      this.longSkirt = len > 0.7;
    }
    if (o.coat) {
      const gap = o.coat.gap ?? 0.55;
      if ((o.coat.len ?? 0.5) > 0.05) {
        const tails = C.buildCoatTails({ ...o.coat, len: o.coat.len ?? 0.5, gap: Math.max(gap, 0.05), topR: topR + 0.006, flare: o.coat.flare ?? 0.7 });
        if (j.skirt) j.skirt.add(tails);
        else {
          const pivot = new THREE.Group();
          pivot.add(tails);
          j.hips.add(pivot);
          j.skirt = pivot;
        }
      }
      const shell = C.buildTorsoShell(P, tScale, {
        ...o.coat, k: 1.06, phiStart: gap / 2, phiLength: PI * 2 - gap, yMin: -0.07,
      });
      j.spine.add(shell);
      if (o.coat.collar) {
        const col = part(C.geo('coatcollar', () => new THREE.TorusGeometry(0.075, 0.018, 6, 16, PI * 1.6)), clothMat(o.coat.collarMat ?? o.coat), false);
        col.rotation.x = PI / 2;
        col.rotation.z = PI / 2 + PI * 0.2;
        col.scale.set(1.25, 1, 1);
        col.position.y = 0.425;
        j.spine.add(col);
      }
    }
    if (o.cape) {
      const len = o.cape.len ?? 1.0;
      const pivot = new THREE.Group();
      pivot.position.set(0, 0.17, -0.01);
      const m = C.buildCape({ ...o.cape, len });
      m.position.y = -len / 2 + 0.02;
      pivot.add(m);
      j.chest.add(pivot);
      j.cape = pivot;
      if (o.cape.fibula) {
        const fib = part(C.geo('fibula', () => new THREE.CylinderGeometry(0.02, 0.02, 0.01, 10)), flatMat(o.cape.fibula, 0.3, 0.8), false);
        fib.rotation.x = PI / 2;
        fib.position.set(0.1, 0.13, 0.11);
        j.chest.add(fib);
      }
    }
    if (o.shawl) j.chest.add(C.buildShawl(o.shawl));
    if (o.apron) {
      const ap = o.apron;
      const lower = skirt
        ? C.buildSkirt({ ...ap, len: Math.min(ap.len ?? 0.7, (skirt.len ?? 0.9) - 0.04), flare: skirt.flare ?? 1, topR, phiStart: -0.75, phiLength: 1.5, k: 1.035, sx: skirtSX, sz: skirtSZ })
        : C.buildSkirt({ ...ap, len: ap.len ?? 0.6, flare: 0.3, topR: topR + 0.01, phiStart: -0.7, phiLength: 1.4, k: 1.04, sx: pScale.x * 1.02, sz: pScale.z * 1.05 });
      (j.skirt ?? j.hips).add(lower);
      if (ap.bib) {
        j.spine.add(C.buildTorsoShell(P, tScale, { ...ap, phiStart: -0.6, phiLength: 1.2, k: 1.05, yMin: -0.02, yMax: 0.33 }));
      }
    }
    if (o.scapular) {
      for (const ps of [-0.32, PI - 0.32]) {
        j.spine.add(C.buildTorsoShell(P, tScale, { ...o.scapular, phiStart: ps, phiLength: 0.64, k: 1.045, yMin: -0.07 }));
        if (skirt) {
          (j.skirt ?? j.hips).add(C.buildSkirt({ ...o.scapular, len: (skirt.len ?? 0.9) - 0.12, flare: skirt.flare ?? 1, topR, phiStart: ps + 0.02, phiLength: 0.6, k: 1.03, sx: skirtSX, sz: skirtSZ }));
        }
      }
    }
    const zK0 = (tScale.z / 0.78) * (o.coat && !(o.coat.gap > 0.1) ? 1.07 : 1.01);
    if (o.toga) {
      const sash = part(C.geo('togasash', () => new THREE.BoxGeometry(0.15, 0.66, 0.03)), clothMat(o.toga));
      sash.position.set(0, 0.17, 0.125 * tScale.z / 0.78);
      sash.rotation.z = 0.72;
      j.spine.add(sash);
      const back = sash.clone();
      back.position.z = -0.125 * tScale.z / 0.78;
      j.spine.add(back);
      const drape = part(C.geo('togadrape', () => new THREE.BoxGeometry(0.16, 0.05, 0.3)), clothMat(o.toga));
      drape.position.set(0.12, 0.38, 0);
      drape.rotation.z = -0.35;
      j.spine.add(drape);
    }
    if (o.belt) {
      const kb = o.coat && !(o.coat.gap > 0.1) ? 1.08 : (o.belt.k ?? 1);
      const b = C.buildBelt({ ...o.belt, r: C.radiusAt(P, -0.03) * kb });
      b.position.y = -0.03;
      b.scale.set(tScale.x, 1, tScale.z);
      j.spine.add(b);
    }
    if (o.baldric) {
      // écharpe ou baudrier porté en diagonale (écharpe tricolore du maire)
      const bd = part(C.geo('baldric', () => new THREE.BoxGeometry(0.09, 0.66, 0.02)), clothMat(o.baldric), false);
      bd.position.set(0, 0.16, 0.128 * zK0);
      bd.rotation.z = -0.68;
      j.spine.add(bd);
      const bk = bd.clone();
      bk.position.z = -0.128 * zK0;
      bk.rotation.z = 0.68;
      j.spine.add(bk);
    }
    if (o.sash) {
      const sh = part(C.geo('sash', () => new THREE.CylinderGeometry(0.148, 0.148, 0.09, 22, 1, true)), C.dsMat(o.sash), false);
      sh.position.y = -0.02;
      sh.scale.set(tScale.x, 1, tScale.z);
      j.spine.add(sh);
    }
    const zK = tScale.z / 0.78;
    if (o.collar) {
      const col = C.buildCollar(o.collar.type, o.collar.c);
      col.scale.z = zK * (o.coat && !(o.coat.gap > 0.1) ? 1.06 : 1);
      j.spine.add(col);
    }
    if (o.necklace) {
      const n = C.buildNecklace(o.necklace.type, o.necklace.c);
      n.position.y = o.necklace.type === 'torque' ? 0.432 : 0.415;
      n.scale.z = zK;
      j.spine.add(n);
    }
    if (o.buttons) {
      const kz = o.coat && !(o.coat.gap > 0.1) ? 1.06 : 1;
      j.spine.add(C.buildButtons(P, tScale.z * kz, o.buttons));
    }
    if (o.bag) {
      const bag = C.buildBag(o.bag.type, o.bag.c);
      bag.scale.z = zK;
      j.spine.add(bag);
    }
    if (o.armband) {
      const ab = part(C.geo('armband', () => new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12, 1, true)), C.dsMat(o.armband), false);
      ab.position.y = -0.09;
      j.armL.add(ab);
    }
    if (o.epaulettes) {
      for (const side of ['L', 'R']) {
        const ep = part(C.geo('epaulette', () => new THREE.BoxGeometry(0.08, 0.015, 0.06)), clothMat(o.epaulettes), false);
        ep.position.y = 0.05;
        j['arm' + side].add(ep);
      }
    }

    // ---------- Objets tenus ----------
    const props = s.props || {};
    if (props.right) {
      this.propR = buildProp(props.right);
      if (this.propR) j.handR.add(this.propR);
      this.armsBusyR = !this.propR?.userData.vertical;
    }
    if (props.left) {
      this.propL = buildProp(props.left);
      if (this.propL) j.handL.add(this.propL);
      this.armsBusy = !this.propL?.userData.vertical;
    }

    this.update(0.001);
  }

  // Remplace l'objet tenu (ex. le joueur sort l'appareil photo).
  setProp(side, name) {
    const hand = side === 'left' ? this.j.handL : this.j.handR;
    const key = side === 'left' ? 'propL' : 'propR';
    if (this[key]) hand.remove(this[key]);
    this[key] = name ? buildProp(name) : null;
    if (this[key]) hand.add(this[key]);
  }

  setVisible(v) { this.group.visible = v; }
}

export function buildCharacter(spec) {
  return new Character(spec);
}
