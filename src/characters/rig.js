// Personnage articulé : corps humain réaliste (MakeHuman, voir human.js)
// skinné sur notre squelette (hanches, colonne, poitrine, cou, tête,
// épaules, coudes, poignets, hanches, genoux, chevilles, plus mâchoire et
// paupières), vêtements ajustés gonflés depuis le corps, puis costume
// d'époque superposé (voir costumes.js) et cheveux en mèches (hair.js).
//
// Échelle : 1 unité = 1 mètre. Un adulte mesure ~1,75 m, une porte 2,05 m.

import * as THREE from 'three';
import { clothMat, flatMat } from '../gfx/cloth.js';
import * as C from './costumes.js';
import { buildProp } from './props.js';
import { animate } from './anim.js';
import { hashStr } from '../core/rng.js';
import * as H from './human.js';
import { buildHairCards, buildBeardCards, lashUVs, lashMaterial2 } from './hair.js';

const PI = Math.PI;
const V2 = (x, y) => new THREE.Vector2(x, y);
const DOWN = new THREE.Vector3(0, -1, 0);

// Profils de l'ancien buste (repère colonne) : les accessoires du costume ont
// été dessinés pour eux ; on les recale sur le corps réel (retarget)
const OLD_TORSO = {
  m: [V2(0.128, -0.07), V2(0.136, -0.02), V2(0.14, 0.05), V2(0.146, 0.12), V2(0.156, 0.19), V2(0.163, 0.26), V2(0.164, 0.31), V2(0.155, 0.355), V2(0.128, 0.39), V2(0.085, 0.42), V2(0.055, 0.435)],
  f: [V2(0.132, -0.07), V2(0.125, -0.01), V2(0.117, 0.06), V2(0.126, 0.13), V2(0.146, 0.2), V2(0.152, 0.26), V2(0.145, 0.31), V2(0.134, 0.35), V2(0.11, 0.385), V2(0.072, 0.415), V2(0.047, 0.43)],
};
const OLD_SCALE = { m: [1.1, 0.78], f: [1.05, 0.8] };

function part(geometry, material, shadow = true) {
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = shadow;
  return m;
}

// Couleur de lèvres d'après la carnation
function lipColor(skin, sex) {
  const c = new THREE.Color(skin);
  return c.lerp(new THREE.Color(sex === 'f' ? 0xb04a52 : 0xa05a52), sex === 'f' ? 0.5 : 0.38).getHex();
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
    // attitude au repos (0 bras ballants, 1 poing sur la hanche, 2 bras croisés, 3 mains jointes)
    this.idleStyle = spec.idleStyle ?? (spec.age === 'child' ? 0 : Math.floor((this.seed * 7.31) % 4));
    this.hipBase = 0.95;
    this.longSkirt = false;
    this.build();
  }

  setAction(a) { this.action = a || 'idle'; }
  update(dt) {
    animate(this, dt);
    this.animateFace(dt);
  }

  // Clignements, regard qui suit la cible, petites saccades, mâchoire qui parle
  animateFace(dt) {
    if (!this.eyes) return;
    this.blinkT = (this.blinkT ?? 1 + this.seed) - dt;
    let close = 0;
    if (this.blinkT < 0.16) close = Math.sin(Math.max(0, this.blinkT) / 0.16 * Math.PI);
    if (this.blinkT <= 0) this.blinkT = 2 + Math.random() * 4;
    this.sacT = (this.sacT ?? 0) - dt;
    if (this.sacT <= 0) { this.sac = [(Math.random() - 0.5) * 0.18, (Math.random() - 0.5) * 0.08]; this.sacT = 0.6 + Math.random() * 2; }
    const ly = (this.look?.yaw ?? 0) * 0.35 + this.sac[0], lp = (this.look?.pitch ?? 0) * 0.4 + this.sac[1];
    for (const e of this.eyes) {
      e.rotation.y += (ly - e.rotation.y) * Math.min(1, dt * 12);
      e.rotation.x += (lp - e.rotation.x) * Math.min(1, dt * 12);
    }
    const j = this.j;
    const lid = close * 0.55 + Math.max(0, lp) * 0.25 + (this.spec.age === 'old' ? 0.08 : 0);
    j.lidL.rotation.x = lid; j.lidR.rotation.x = lid;
    j.lidLoL.rotation.x = -close * 0.12; j.lidLoR.rotation.x = -close * 0.12;
    // parole : la mâchoire s'ouvre en rythme
    const talking = this.action === 'talk' || this.speaking;
    this.jawT = (this.jawT ?? 0) + dt;
    const target = talking ? 0.05 + Math.max(0, Math.sin(this.jawT * 11) * Math.sin(this.jawT * 3.7 + 1)) * 0.11 : 0.015;
    j.jaw.rotation.x += (target - j.jaw.rotation.x) * Math.min(1, dt * 18);
  }

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
    const dy = (target.y ?? p.y + 1.6) - (p.y + this.eyeHeight * this.scale);
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

    const v = H.getVariant(H.variantKey(sex, age, build));
    this.v = v;
    const JW = (n) => new THREE.Vector3(...v.J[n]);
    const MS = v.measure;

    // ---------- Squelette (articulations du corps réel) ----------
    const j = this.j;
    const body = new THREE.Group();
    this.group.add(body);
    const height = s.height ?? (child ? 1.3 : sex === 'f' ? (old ? 1.6 : 1.65) : (old ? 1.72 : 1.77));
    this.scale = height / v.height;
    body.scale.setScalar(this.scale);
    j.body = body;
    const G = (parent, pos, name) => {
      const g = new THREE.Group();
      g.position.copy(pos);
      parent.add(g);
      if (name) j[name] = g;
      return g;
    };
    const rel = (a, b) => JW(a).sub(JW(b));
    const len = (a, b) => JW(a).distanceTo(JW(b));
    G(body, JW('hips'), 'hips');
    G(j.hips, rel('spine', 'hips'), 'spine');
    G(j.spine, rel('chest', 'spine'), 'chest');
    G(j.chest, rel('neck', 'chest'), 'neck');
    G(j.neck, rel('head', 'neck'), 'head');
    G(j.head, rel('jaw', 'head'), 'jaw');
    for (const sd of ['L', 'R']) {
      // paupières : pivot au centre de l'œil
      G(j.head, rel('eye' + sd, 'head'), 'lid' + sd);
      G(j.head, rel('eye' + sd, 'head'), 'lidLo' + sd);
      G(j.chest, rel('arm' + sd, 'chest'), 'arm' + sd);
      G(j['arm' + sd], new THREE.Vector3(0, -len('elbow' + sd, 'arm' + sd), 0), 'elbow' + sd);
      G(j['elbow' + sd], new THREE.Vector3(0, -len('hand' + sd, 'elbow' + sd), 0), 'hand' + sd);
      G(j.hips, rel('leg' + sd, 'hips'), 'leg' + sd);
      G(j['leg' + sd], new THREE.Vector3(0, -len('knee' + sd, 'leg' + sd), 0), 'knee' + sd);
      G(j['knee' + sd], new THREE.Vector3(0, -len('ankle' + sd, 'knee' + sd), 0), 'ankle' + sd);
    }
    // centre du crâne pour les chapeaux et coiffes (dessinés pour une tête de rayon 0,1)
    const hd = MS.head;
    const kHead = hd.halfW / 0.08;
    const eyeC = JW('eyeL').add(JW('eyeR')).multiplyScalar(0.5);
    const headC = new THREE.Vector3(0, eyeC.y - 0.004 * kHead, (hd.front + hd.back) / 2 + 0.004);
    G(j.head, headC.clone().sub(JW('head')), 'headC');
    j.headC.scale.setScalar(kHead);
    this.hipBase = v.J.hips[1];
    // segments de jambe (repère du corps, avant mise à l'échelle) pour la marche
    this.legL1 = len('kneeL', 'legL');
    this.legL2 = len('ankleL', 'kneeL');
    this.legLen = v.J.legL[1];
    this.eyeHeight = eyeC.y;

    // pose de repos du maillage : bras en A, avant-bras vers l'avant, jambes écartées
    const restQ = {};
    for (const sd of ['L', 'R']) {
      const qa = new THREE.Quaternion().setFromUnitVectors(DOWN, rel('elbow' + sd, 'arm' + sd).normalize());
      const fe = rel('hand' + sd, 'elbow' + sd).normalize().applyQuaternion(qa.clone().invert());
      restQ['arm' + sd] = qa;
      restQ['elbow' + sd] = new THREE.Quaternion().setFromUnitVectors(DOWN, fe);
      const ql = new THREE.Quaternion().setFromUnitVectors(DOWN, rel('knee' + sd, 'leg' + sd).normalize());
      const fk = rel('ankle' + sd, 'knee' + sd).normalize().applyQuaternion(ql.clone().invert());
      restQ['leg' + sd] = ql;
      restQ['knee' + sd] = new THREE.Quaternion().setFromUnitVectors(DOWN, fk);
    }

    // ---------- Matériaux ----------
    const skinHex = s.skin ?? 0xe0b08c;
    const hair = s.hair ?? { style: 'short', color: 0x3a2a1a };
    const hairColor = old && !s.hair?.keepColor ? (hair.grey ?? 0xb8b2aa) : hair.color;
    const bald = ['none', 'bald'].includes(hair.style);
    const hat = C.buildHat(s.hat?.type, s.hat?.c, s.hat?.c2);
    const beardStyle = s.beard?.style;
    const beardColor = old ? 0xc8c2b8 : s.beard?.color ?? hairColor;
    const skin = H.skinMaterial({
      skin: skinHex,
      lip: lipColor(skinHex, sex),
      brow: old ? 0x9a948c : (s.beard?.color ?? hairColor),
      beard: beardColor,
      scalp: hairColor,
      beardK: sex === 'm' && !child ? ({ full: 0.75, short: 0.6, goatee: 0.3, mustache: 0.18, gaulish: 0.2 }[beardStyle] ?? (beardStyle === 'stubble' || s.face?.stubble ? 0.55 : 0.12)) : 0,
      browK: sex === 'm' ? 0.85 : child ? 0.5 : 0.65,
      wrinkles: old ? 1 : child ? 0 : sex === 'm' ? 0.18 : 0.08,
      makeup: s.face?.makeup ? 1 : 0,
      scalpK: bald || hair.style === 'fringe' ? 0 : 0.9,
      freckles: s.face?.freckles ? 1 : 0,
      dirt: s.face?.dirt ? 1 : 0,
      blush: sex === 'f' ? 0.65 : 0.4,
    });
    this.skinMaterial = skin;
    const topM = H.garmentMaterial(clothMat(o.top ?? { c: 0x7a6a5a }));
    const botM = H.garmentMaterial(clothMat(o.bottom ?? o.top ?? { c: 0x4a4038 }));
    const coatM = o.coat ? H.garmentMaterial(clothMat({ c: o.coat.c, p: o.coat.p, c2: o.coat.c2 })) : null;
    const sleeveM = coatM && !o.coat.sleeveless ? coatM : (o.sleeveMat ? H.garmentMaterial(clothMat(o.sleeveMat)) : topM);
    const sleeves = o.sleeves ?? 'long';
    const legs = o.legs ?? 'trousers';
    const stockM = H.garmentMaterial(clothMat(o.stockings ?? { c: 0xe8e2d4, p: 'knit' }));
    const wrapM = H.garmentMaterial(clothMat(o.wraps ?? { c: 0xb8a882, p: 'linen' }));
    const gloveM = o.gloves ? H.garmentMaterial(clothMat({ c: o.gloves, p: 'leather' })) : null;

    // ---------- Vêtements ajustés (régions du corps) ----------
    const P = H.PART, vp = v.part, coord = v.coord;
    const armLen = { long: 0.985, rolled: 0.62, short: 0.34, none: 0 }[sleeves] ?? 0.985;
    const legBottom = { trousers: 0.02, hose: 0.0, breeches: 0.44, shorts: 0.62, wrapped: 0.06, bare: null }[legs];
    const isArm = (i) => vp[i] === P.armL || vp[i] === P.armR;
    const isLeg = (i) => vp[i] === P.legL || vp[i] === P.legR;
    const isFoot = (i) => vp[i] === P.footL || vp[i] === P.footR;
    const isHand = (i) => vp[i] === P.handL || vp[i] === P.handR;
    const trunk = (i) => vp[i] === P.trunk;
    const neckPart = (i) => vp[i] === P.neck;
    // encolure : courbe régulière sous la base du cou, plus basse devant
    const neckJ = v.J.neck;
    const neckSec = MS.at(neckJ[1] - 0.03);
    const sameSleeve = !o.sleeveMat;
    const topMin = legBottom === null ? -0.6 : 0.05;
    const OUT = 1;
    // champs de découpe : < 0 à l'intérieur du vêtement (unités ~ longueur de membre)
    const neckF = (i) => {
      const x = v.pos[i * 3], y = v.pos[i * 3 + 1], z = v.pos[i * 3 + 2];
      const front = Math.min(1, Math.max(0, (z - neckSec.cz) / (neckSec.rz || 0.1)));
      return (y - (neckJ[1] - 0.005 - 0.035 * front * front - Math.min(0.06, Math.abs(x)) * 0.05)) / 0.4;
    };
    const armF = (i, len) => (isArm(i) ? coord[i] - len : isHand(i) ? 1 + coord[i] - len : OUT);
    const layers = [];
    const add = (L) => { L.region = (i, m = 0) => L.field(i) < -m; layers.push(L); };
    // chemise / tunique (avec ses manches si même tissu)
    const topArm = sameSleeve ? armLen : 0;
    add({
      key: `top-${topArm}-${topMin}`, mat: topM, smooth: 6, folds: 0.003, blur: 0.035,
      // un peu d'aisance sur le buste (le tissu ne suit pas le relief de la poitrine)
      offFn: (i) => (trunk(i) && coord[i] > 0.45 ? (sex === 'f' ? 0.011 : 0.007) : 0.0045),
      field: (i) => Math.min(
        trunk(i) ? Math.max(topMin - coord[i], neckF(i)) : neckPart(i) ? neckF(i) : OUT,
        topArm > 0 ? armF(i, topArm) : OUT),
    });
    if (!sameSleeve && armLen > 0) add({ key: `sleeve-${armLen}`, mat: sleeveM, off: 0.0055, smooth: 4, field: (i) => armF(i, armLen) });
    if (o.coat && !o.coat.sleeveless) add({ key: 'coatsleeve', mat: coatM, off: 0.011, smooth: 6, folds: 0.004, field: (i) => armF(i, 0.975) });
    // bas : pantalon, culotte, short, chausses (ou seulement le haut des cuisses sous une tunique)
    const botTop = 0.32;
    add({
      key: `bottom-${legs}`, mat: botM, smooth: 6, folds: legs === 'hose' ? 0.001 : 0.004, blur: legs === 'hose' ? 0.02 : 0.04,
      // pantalons amples, chausses collantes
      offFn: (i) => (legs === 'hose' ? 0.0035 : isLeg(i) ? 0.008 + 0.006 * Math.min(1, coord[i] * 1.5) : 0.009),
      field: (i) => (trunk(i) ? coord[i] - botTop : isLeg(i) ? (legBottom ?? 0.82) - coord[i] : OUT),
    });
    if (legs === 'breeches') add({ key: 'stockings', mat: stockM, off: 0.0035, smooth: 2, folds: 0.001, field: (i) => (isLeg(i) ? coord[i] - 0.47 : isFoot(i) ? -1 : OUT) });
    if (legs === 'wrapped') add({ key: 'wraps', mat: wrapM, off: 0.009, smooth: 2, folds: 0.004, field: (i) => (isLeg(i) ? Math.max(coord[i] - 0.42, 0.05 - coord[i]) : OUT) });
    if (o.gloves) add({ key: 'gloves', mat: gloveM, off: 0.0025, smooth: 1, folds: 0, field: (i) => (isHand(i) ? -1 : isArm(i) ? 0.93 - coord[i] : OUT) });
    // chaussures ajustées au pied (souliers, bottes) ; sabots et sandales : modèles à part
    const shoes = o.shoes ?? { type: 'shoe', c: 0x2a1e14 };
    const fitted = { shoe: 0.02, buckle: 0.02, sneaker: 0.03, wrap: 0.14, boot: 0.24, tallboot: 0.44, felt: 0.12 };
    const shoeH = fitted[shoes.type];
    const shoeLeather = H.garmentMaterial(clothMat(shoes.type === 'sneaker' ? { c: shoes.c ?? 0xf0f0f0, p: 'plain', rough: 0.6 } : shoes.type === 'wrap' ? { c: shoes.c ?? 0x6a4a2a, p: 'leather' } : { c: shoes.c ?? 0x2a1e14, p: 'leather', rough: 0.5 }));
    if (shoeH !== undefined) {
      add({
        key: `shoe-${shoes.type}`, mat: shoeLeather, off: 0.006, smooth: 6, folds: 0,
        field: (i) => (isFoot(i) ? -1 : isLeg(i) ? coord[i] - shoeH : OUT),
        // semelle : épaisse et plate
        offFn: (i) => (v.pos[i * 3 + 1] < 0.02 ? 0.012 : 0.006),
      });
    }

    // la peau n'est conservée que là où rien ne la cache
    const covered = (i) => layers.some((L) => L.region(i, 0.025));
    const bodyKey = layers.map((L) => L.key).join('|');
    const bodyGeo = H.partGeometry(v, 'body', (a, b, c) => !(covered(a) && covered(b) && covered(c)), bodyKey);

    // pose de repos le temps de lier la peau au squelette
    for (const [n, q] of Object.entries(restQ)) j[n].quaternion.copy(q);
    this.group.updateMatrixWorld(true);
    const skeleton = new THREE.Skeleton(H.HUMAN_BONES().map((n) => j[n]));
    // deux niveaux de détail : complet de près, simplifié au loin (setLOD)
    this.lod = { hi: [], lo: [], level: 0 };
    const skinned = (geo, mat, shadow = true, lowCell = 0.024) => {
      const sm = new THREE.SkinnedMesh(geo, mat);
      sm.castShadow = shadow;
      sm.receiveShadow = true;
      sm.frustumCulled = false;
      body.add(sm);
      sm.updateMatrixWorld(true);
      sm.bind(skeleton, sm.matrixWorld);
      this.lod.hi.push(sm);
      if (lowCell) {
        const lo = new THREE.SkinnedMesh(H.simplifyGeometry(geo, lowCell), mat);
        lo.castShadow = shadow;
        lo.frustumCulled = false;
        lo.visible = false;
        body.add(lo);
        lo.updateMatrixWorld(true);
        lo.bind(skeleton, lo.matrixWorld);
        this.lod.lo.push(lo);
      }
      return sm;
    };
    this.skinnedMesh = skinned;
    skinned(bodyGeo, skin);
    skinned(lashUVs(H.partGeometry(v, 'lashes', null, 'all'), v), lashMaterial2(), false, 0);
    skinned(H.partGeometry(v, 'teeth', null, 'all'), H.teethMaterial(), false, 0);
    for (const L of layers) {
      const g = H.garmentGeometry(v, L.key, L.field, { off: L.off, smooth: L.smooth, folds: L.folds ?? 0.0025, offFn: L.offFn, blur: L.blur ?? 0.02 });
      skinned(g, L.mat);
    }
    for (const n of Object.keys(restQ)) j[n].quaternion.identity();
    this.skeleton = skeleton;

    // yeux : globes orientables
    const eg = H.eyeGeometries(v);
    this.eyes = [];
    for (const sd of ['L', 'R']) {
      const e = new THREE.Group();
      e.position.copy(rel('eye' + sd, 'head'));
      const em = part(eg[sd], H.eyeMaterial(s.eyes ?? 0x5a4632), false);
      e.add(em);
      j.head.add(e);
      this.eyes.push(e);
    }

    // ---------- Recalage des accessoires dessinés pour l'ancien buste ----------
    const spineW = JW('spine');
    const waistW = this.waistY();
    const neckW = JW('neck').y;
    const oldP = OLD_TORSO[sex], [osx, osz] = OLD_SCALE[sex];
    // hauteur (repère colonne de l'ancien rig) -> hauteur monde du corps réel
    const toWorldY = (yOld) => waistW + (yOld + 0.03) * (neckW - waistW) / 0.47;
    const secAt = (yOld) => MS.at(toWorldY(yOld));
    const retarget = (obj, frame = 'spine') => {
      const base = frame === 'chest' ? 0.22 : 0;
      const frameW = frame === 'chest' ? JW('chest') : spineW;
      const one = (m) => {
        const yo = m.position.y + base;
        const sc = secAt(yo);
        const ro = C.radiusAt(oldP, yo);
        m.position.x *= sc.rx / (ro * osx);
        m.position.z = sc.cz - frameW.z + m.position.z * (sc.rz / (ro * osz));
        m.position.y = toWorldY(yo) - frameW.y;
      };
      if (obj.position.lengthSq() > 1e-8) one(obj);
      else obj.children.forEach(one);
      return obj;
    };
    this.retarget = retarget;

    // Tête : cheveux en mèches, barbe, lunettes, couvre-chef
    if (!hat.hidesHair || ['braids', 'wig'].includes(hair.style)) {
      const hg = buildHairCards(v, hair.style, hairColor, sex, { hat: !!s.hat?.type });
      if (hg) { j.head.add(hg); this.lod.hi.push(hg.children[1]); }
    }
    if (beardStyle && beardStyle !== 'stubble' && sex === 'm') {
      const bg = buildBeardCards(v, beardStyle, beardColor);
      if (bg) j.head.add(bg);
    }
    if (s.glasses) {
      // repère des lunettes : verres devant les yeux réels
      const kg = Math.abs(v.J.eyeL[0] - v.J.eyeR[0]) / 2 / 0.027;
      const fc = G(j.head, new THREE.Vector3(0, eyeC.y - 0.002 * kg, eyeC.z + 0.016 - 0.103 * kg).sub(JW('head')), 'faceC');
      fc.scale.setScalar(kg);
      fc.add(C.buildGlasses(s.glasses === 'sun' ? 'sun' : 'glasses'));
    }
    j.headC.add(hat.head);
    if (hat.chest) j.chest.add(retarget(hat.chest, 'chest'));

    // Pieds : sabots, sandales (le pied nu reste visible) ; jarretières
    for (const sd of ['L', 'R']) {
      const knee = j['knee' + sd], ankle = j['ankle' + sd];
      if (legs === 'breeches') {
        const kr = 0.06 * (v.measure.head.halfW / 0.075);
        const garter = part(C.geo(`garter-${kr.toFixed(3)}`, () => new THREE.CylinderGeometry(kr, kr, 0.03, 14)), clothMat(o.bottom ?? o.top ?? { c: 0x4a4038 }), false);
        garter.position.y = -0.03;
        knee.add(garter);
      }
      if (shoeH === undefined && shoes.type !== 'bare') {
        const f = C.buildFoot(shoes.type, shoes.c, skin);
        f.children.forEach((m) => { if (m.material === skin) m.visible = false; });
        f.position.set(0, -0.005, 0.03);
        f.scale.set(1.05, 1, 1.12);
        ankle.add(f);
      }
    }

    // ---------- Vêtements superposés ----------
    // bassin réel : rayon et centre de la taille et des hanches (repère hanches)
    const hipsW = JW('hips');
    const waistSec = MS.at(waistW);
    const skirt = o.skirt || o.robe || o.tunic;
    const skirtFit = (len, flare, extra = {}) => this.fittedSkirt({ len, flare, waistW, hipsW, ...extra });
    if (skirt) {
      const len = skirt.len ?? (o.tunic ? 0.5 : 0.92);
      const m = skirtFit(len, skirt.flare ?? (o.tunic ? 0.55 : 1), { mat: C.dsMat({ c: skirt.c, p: skirt.p, c2: skirt.c2 }) });
      const pivot = new THREE.Group();
      pivot.add(m);
      j.hips.add(pivot);
      j.skirt = pivot;
      this.longSkirt = len > 0.7;
    }
    if (o.coat) {
      const gap = o.coat.gap ?? 0.55;
      if ((o.coat.len ?? 0.5) > 0.05) {
        const tails = skirtFit(o.coat.len ?? 0.5, o.coat.flare ?? 0.7, { mat: C.dsMat({ c: o.coat.c, p: o.coat.p, c2: o.coat.c2 }), gap: Math.max(gap, 0.05), k: 1.04 });
        if (j.skirt) j.skirt.add(tails);
        else {
          const pivot = new THREE.Group();
          pivot.add(tails);
          j.hips.add(pivot);
          j.skirt = pivot;
        }
      }
      // corps de la veste : coque ouverte devant
      this.trunkPanel(`coat-${gap}`, { off: 0.016, gap, yMin: waistW - 0.12 }, coatM);
      if (o.coat.collar) {
        const col = part(C.geo('coatcollar2', () => new THREE.TorusGeometry(0.075, 0.018, 6, 16, PI * 1.6)), clothMat(o.coat.collarMat ?? o.coat), false);
        col.rotation.x = PI / 2;
        col.rotation.z = PI / 2 + PI * 0.2;
        col.scale.set(MS.at(neckW - 0.02).rx / 0.06, 1, 1);
        col.position.set(0, neckW - 0.025 - spineW.y, MS.at(neckW - 0.02).cz - spineW.z);
        j.spine.add(col);
      }
    }
    if (o.cape) {
      const clen = o.cape.len ?? 1.0;
      const pivot = new THREE.Group();
      const shY = JW('armL').y;
      pivot.position.set(0, shY + 0.05 - JW('chest').y, MS.at(shY).back - JW('chest').z + 0.05);
      const m = C.buildCape({ ...o.cape, len: clen, width: Math.max(0.22, MS.at(shY - 0.05).rx * 1.15) });
      m.position.y = -clen / 2 + 0.02;
      pivot.add(m);
      j.chest.add(pivot);
      j.cape = pivot;
      if (o.cape.fibula) {
        const fib = part(C.geo('fibula', () => new THREE.CylinderGeometry(0.02, 0.02, 0.01, 10)), flatMat(o.cape.fibula, 0.3, 0.8), false);
        fib.rotation.x = PI / 2;
        fib.position.set(0.1, shY - 0.03 - JW('chest').y, MS.at(shY - 0.03).front - JW('chest').z + 0.01);
        j.chest.add(fib);
      }
    }
    if (o.shawl) {
      // fichu : couvre les épaules et le haut du dos, pointe croisée devant
      const shY = JW('armL').y;
      const sc = MS.at(shY - 0.1);
      const field = (i) => {
        if (isArm(i)) return coord[i] - 0.16;
        if (!trunk(i) && !neckPart(i)) return OUT;
        const x = v.pos[i * 3], y = v.pos[i * 3 + 1], z = v.pos[i * 3 + 2];
        const front = Math.min(1, Math.max(0, (z - sc.cz) / (sc.rz || 0.1)));
        const mid = 1 - Math.min(1, Math.abs(x) / 0.13);
        const cut = shY - 0.13 - 0.13 * front * mid;
        return Math.max((cut - y) / 0.3, neckF(i) + 0.03);
      };
      const g = H.garmentGeometry(v, 'shawl', field, { off: 0.016, smooth: 6, folds: 0.005, blur: 0.04 });
      this.skinnedMesh(g, H.garmentMaterial(clothMat({ c: o.shawl.c, p: o.shawl.p, c2: o.shawl.c2 })));
    }
    if (o.apron) {
      const ap = o.apron;
      const lower = skirt
        ? skirtFit(Math.min(ap.len ?? 0.7, (skirt.len ?? 0.9) - 0.04), skirt.flare ?? 1, { mat: C.dsMat({ c: ap.c, p: ap.p, c2: ap.c2 }), phiStart: -0.75, phiLength: 1.5, k: 1.035 })
        : skirtFit(ap.len ?? 0.6, 0.3, { mat: C.dsMat({ c: ap.c, p: ap.p, c2: ap.c2 }), phiStart: -0.7, phiLength: 1.4, k: 1.04 });
      (j.skirt ?? j.hips).add(lower);
      if (ap.bib) (this.trunkPanel('bib', { off: 0.012, phi: [-0.6, 1.2], yMin: waistW - 0.02, yMax: toWorldY(0.33) }, H.garmentMaterial(clothMat({ c: ap.c, p: ap.p, c2: ap.c2 }))));
    }
    if (o.scapular) {
      for (const ps of [-0.32, PI - 0.32]) {
        (this.trunkPanel(`scap-${ps}`, { off: 0.014, phi: [ps, 0.64], yMin: waistW - 0.1 }, H.garmentMaterial(clothMat({ c: o.scapular.c, p: o.scapular.p, c2: o.scapular.c2 }))));
        if (skirt) (j.skirt ?? j.hips).add(skirtFit((skirt.len ?? 0.9) - 0.12, skirt.flare ?? 1, { mat: C.dsMat({ c: o.scapular.c, p: o.scapular.p, c2: o.scapular.c2 }), phiStart: ps + 0.02, phiLength: 0.6, k: 1.03 }));
      }
    }
    const coatClosed = o.coat && !(o.coat.gap > 0.1);
    if (o.toga) {
      const sash = part(C.geo('togasash', () => new THREE.BoxGeometry(0.15, 0.66, 0.03)), clothMat(o.toga));
      sash.position.set(0, 0.17, 0.125);
      sash.rotation.z = 0.72;
      j.spine.add(retarget(sash));
      const back = part(sash.geometry, sash.material);
      back.position.set(0, 0.17, -0.125);
      back.rotation.z = 0.72;
      j.spine.add(retarget(back));
      const drape = part(C.geo('togadrape', () => new THREE.BoxGeometry(0.16, 0.05, 0.3)), clothMat(o.toga));
      drape.position.set(0.12, 0.38, 0);
      drape.rotation.z = -0.35;
      j.spine.add(retarget(drape));
    }
    if (o.belt) {
      const kb = coatClosed ? 1.1 : (o.belt.k ?? 1) * 1.03;
      const b = C.buildBelt({ ...o.belt, r: 1 });
      b.position.set(0, toWorldY(-0.03) - spineW.y, waistSec.cz - spineW.z);
      b.scale.set(waistSec.rx * kb + 0.004, 1, waistSec.rz * kb + 0.004);
      b.children[1]?.scale.set(1 / (waistSec.rx * kb), 1, 1 / (waistSec.rz * kb));
      j.spine.add(b);
    }
    if (o.baldric) {
      for (const [z, rz] of [[0.128, -0.68], [-0.128, 0.68]]) {
        const bd = part(C.geo('baldric', () => new THREE.BoxGeometry(0.09, 0.66, 0.02)), clothMat(o.baldric), false);
        bd.position.set(0, 0.16, z * (coatClosed ? 1.07 : 1.01));
        bd.rotation.z = rz;
        j.spine.add(retarget(bd));
      }
    }
    if (o.sash) {
      const sh = part(C.geo('sash2', () => new THREE.CylinderGeometry(1, 1, 0.09, 24, 1, true)), C.dsMat(o.sash), false);
      const sc = MS.at(toWorldY(-0.02));
      sh.position.set(0, toWorldY(-0.02) - spineW.y, sc.cz - spineW.z);
      sh.scale.set(sc.rx + 0.022, 1, sc.rz + 0.022);
      j.spine.add(sh);
    }
    if (o.collar) j.spine.add(retarget(C.buildCollar(o.collar.type, o.collar.c)));
    if (o.necklace) {
      const n = C.buildNecklace(o.necklace.type, o.necklace.c);
      n.position.y = o.necklace.type === 'torque' ? 0.432 : 0.415;
      j.spine.add(retarget(n));
    }
    if (o.buttons) {
      const bt = o.buttons;
      const g = new THREE.Group();
      const m = flatMat(bt.c ?? 0xd4a857, 0.35, bt.metal === false ? 0 : 0.75);
      const n = bt.n ?? 6;
      for (let i = 0; i < n; i++) {
        const yo = (bt.y0 ?? 0.02) + ((bt.y1 ?? 0.36) - (bt.y0 ?? 0.02)) * (i / Math.max(1, n - 1));
        const sc = secAt(yo);
        const b = part(C.geo('button', () => new THREE.SphereGeometry(0.0085, 6, 5)), m, false);
        b.position.set(bt.x ?? 0, toWorldY(yo) - spineW.y, sc.front - spineW.z + (coatClosed ? 0.02 : 0.009));
        g.add(b);
      }
      j.spine.add(g);
    }
    if (o.bag) j.spine.add(retarget(C.buildBag(o.bag.type, o.bag.c)));
    if (o.armband) {
      const ab = part(C.geo('armband', () => new THREE.CylinderGeometry(0.05, 0.05, 0.06, 12, 1, true)), C.dsMat(o.armband), false);
      ab.position.y = -0.09;
      j.armL.add(ab);
    }
    if (o.epaulettes) {
      for (const sd of ['L', 'R']) {
        const ep = part(C.geo('epaulette', () => new THREE.BoxGeometry(0.08, 0.015, 0.06)), clothMat(o.epaulettes), false);
        ep.position.y = 0.04;
        j['arm' + sd].add(ep);
      }
    }
    if (o.cuffs || sleeves === 'rolled') {
      for (const sd of ['L', 'R']) {
        const elbow = j['elbow' + sd];
        const fl = len('hand' + sd, 'elbow' + sd);
        if (o.cuffs) {
          const cuff = part(C.geo('cuff2', () => new THREE.CylinderGeometry(0.034, 0.042, 0.07, 12, 1, true)), C.dsMat(o.cuffs));
          cuff.position.y = -fl * 0.86;
          elbow.add(cuff);
        }
        if (sleeves === 'rolled') {
          const roll = part(C.geo('rollsleeve2', () => new THREE.TorusGeometry(0.041, 0.01, 6, 12)), sleeveM, false);
          roll.rotation.x = PI / 2;
          roll.position.y = -fl * 0.2;
          elbow.add(roll);
        }
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

  // Niveau de détail : 0 complet, 1 simplifié (au-delà de quelques mètres)
  setLOD(level) {
    if (!this.lod || this.lod.level === level) return;
    this.lod.level = level;
    for (const m of this.lod.hi) m.visible = level === 0;
    for (const m of this.lod.lo) m.visible = level === 1;
  }

  // Hauteur de la taille (section la plus fine entre bassin et poitrine)
  waistY() {
    if (this._waist) return this._waist;
    const J = this.v.J, MS = this.v.measure;
    let best = null;
    for (let y = J.hips[1] + 0.05; y < J.chest[1]; y += 0.01) {
      const r = MS.at(y).rx;
      if (!best || r < best.r) best = { y, r };
    }
    this._waist = best.y;
    return best.y;
  }

  // Jupe, robe ou pans d'habit : profil tourné qui enveloppe le bassin réel
  // et les cuisses, puis s'évase (repère hanches)
  fittedSkirt({ len, flare, waistW, hipsW, mat, gap = 0, k = 1, phiStart = 0, phiLength = PI * 2 }) {
    const MS = this.v.measure;
    const pos = this.v.pos, parts = this.v.part, P = H.PART;
    const key = `${this.v.key}-skirt-${len}-${flare}-${gap}-${k}-${phiStart}-${phiLength}`;
    const g = C.geo(key, () => {
      // emprise du corps (tronc et jambes) par tranche de hauteur
      const top = waistW;
      const prof = [];
      let zc = 0, rz0 = 0;
      const N = 10;
      for (let i = 0; i <= N; i++) {
        const t = i / N;
        const y = top - len * t;
        let rx = 0, f = -1, b = 1;
        for (let n = 0; n < pos.length / 3; n++) {
          const pp = parts[n];
          if (pp !== P.trunk && pp !== P.legL && pp !== P.legR) continue;
          const py = pos[n * 3 + 1];
          if (Math.abs(py - y) > 0.02) continue;
          rx = Math.max(rx, Math.abs(pos[n * 3])); f = Math.max(f, pos[n * 3 + 2]); b = Math.min(b, pos[n * 3 + 2]);
        }
        if (i === 0) { zc = (f + b) / 2; rz0 = (f - b) / 2; }
        const bodyR = Math.max(rx, (f - b) / 2 * 1.15) + 0.012;
        const flareR = (MS.at(waistW).rx + 0.015) + (0.035 + 0.17 * flare) * Math.pow(t, 1.3) * Math.min(1, len / 0.9);
        prof.push({ y: y - hipsW.y, r: Math.max(bodyR, flareR) * k, rx });
      }
      // la courbe ne se resserre pas en descendant
      for (let i = 1; i < prof.length; i++) prof[i].r = Math.max(prof[i].r, prof[i - 1].r * 0.995);
      const pts = prof.slice().reverse().map((q) => new THREE.Vector2(q.r, q.y));
      const lg = new THREE.LatheGeometry(pts, phiLength < PI * 2 ? 14 : 28, gap ? gap / 2 : phiStart, gap ? PI * 2 - gap : phiLength);
      // section elliptique, centrée sur le bassin
      const ratio = Math.min(1, (rz0 * 1.12 + 0.01) / (prof[0].r / k));
      const p = lg.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const y = p.getY(i);
        const t = Math.min(1, Math.max(0, (prof[0].y - y) / len));
        const kz = ratio + (1 - ratio) * Math.min(1, t * 1.6) * 0.85;
        p.setZ(i, p.getZ(i) * kz + (zc - hipsW.z) * (1 - t * 0.5));
      }
      lg.computeVertexNormals();
      return lg;
    });
    const m = part(g, mat, true);
    return m;
  }

  // Panneau de buste (veste ouverte, bavette, scapulaire) gonflé depuis le corps.
  // gap : ouverture devant (rad) ; phi : [début, ouverture] du secteur gardé
  trunkPanel(key, { off = 0.014, gap = 0, phi = null, yMin = -1, yMax = 9 }, mat) {
    const v = this.v, P = H.PART;
    const czCache = new Map();
    const czAt = (y) => { const k = Math.round(y * 50); if (!czCache.has(k)) czCache.set(k, v.measure.at(k / 50).cz); return czCache.get(k); };
    const neckY = v.J.neck[1], neckSec = v.measure.at(neckY - 0.03);
    const TAU = PI * 2;
    const field = (i) => {
      if (v.part[i] !== P.trunk && v.part[i] !== P.neck) return 1;
      const x = v.pos[i * 3], y = v.pos[i * 3 + 1], z = v.pos[i * 3 + 2];
      const front = Math.min(1, Math.max(0, (z - neckSec.cz) / (neckSec.rz || 0.1)));
      let f = (y - (neckY - 0.01 - 0.04 * front * front - Math.min(0.06, Math.abs(x)) * 0.05)) / 0.4;
      f = Math.max(f, (yMin - y) / 0.4, (y - yMax) / 0.4);
      const a = Math.atan2(x, z - czAt(y));          // 0 = devant
      if (gap) f = Math.max(f, (gap / 2 - Math.abs(a)) * 0.25);
      if (phi) {
        let d = a - phi[0];
        d = ((d % TAU) + TAU) % TAU;
        const outside = d > phi[1] ? Math.min(d - phi[1], TAU - d) : -Math.min(d, phi[1] - d);
        f = Math.max(f, outside * 0.25);
      }
      return f;
    };
    const geo = H.garmentGeometry(v, `panel-${key}-${yMin.toFixed(3)}-${yMax.toFixed(3)}`, field, { off, smooth: 6, folds: 0.004, blur: 0.04 });
    // géométrie en pose de repos : les matrices inverses du squelette y correspondent déjà
    return this.skinnedMesh(geo, mat);
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
