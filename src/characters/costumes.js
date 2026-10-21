// Bibliothèque de costumes : coiffures, barbes, couvre-chefs, vêtements
// superposés (jupes, pans d'habit, capes, tabliers, châles, scapulaires…),
// chaussures et accessoires. Tout est construit en géométrie procédurale et
// attaché aux articulations du squelette (voir rig.js) pour suivre l'animation.
//
// Conventions : le personnage regarde vers +z, sa gauche est +x.
// LatheGeometry : phi = 0 -> +z (avant). SphereGeometry : phi = π/2 -> avant.

import * as THREE from 'three';
import { clothMat, flatMat } from '../gfx/cloth.js';

const PI = Math.PI;
const FRONT = PI / 2;   // phi « avant » pour SphereGeometry
const BACK = PI * 1.5;
export const HEAD_R = 0.1;

// ---------- Cache de géométries (partagées entre personnages) ----------
const geoCache = new Map();
export function geo(key, make) {
  if (!geoCache.has(key)) geoCache.set(key, make());
  return geoCache.get(key);
}

// Déformation de la sphère de tête : mâchoire affinée, menton, crâne.
// Appliquée à la tête ET aux cheveux/barbes/bonnets pour qu'ils épousent la forme.
export function deformHeadGeometry(g, r) {
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    let x = p.getX(i) / r, y = p.getY(i) / r, z = p.getZ(i) / r;
    if (y < 0) {
      const t = -y;
      x *= 1 - 0.3 * t * t;
      z = z * (1 - 0.1 * t) + 0.07 * t * t * Math.max(0, z);
    }
    if (z < 0) z *= 1.07;
    p.setXYZ(i, x * 0.8 * r, y * 1.1 * r, z * 0.97 * r);
  }
  g.computeVertexNormals();
  return g;
}

function headShell(key, r, phiStart, phiLength, thetaStart, thetaLength, segs = 22) {
  return geo(`shell-${key}-${r}-${phiStart}-${phiLength}-${thetaStart}-${thetaLength}`, () =>
    deformHeadGeometry(new THREE.SphereGeometry(r, segs, Math.ceil(segs * 0.7), phiStart, phiLength, thetaStart, thetaLength), r));
}

function mesh(g, m, shadow = false) {
  const o = new THREE.Mesh(g, m);
  o.castShadow = shadow;
  return o;
}

// Matériau de tissu double face (vêtements ouverts : jupes, capes, chapeaux)
const dsCache = new Map();
export function dsMat(spec) {
  const base = clothMat(spec);
  if (!dsCache.has(base)) {
    const m = base.clone();
    m.side = THREE.DoubleSide;
    dsCache.set(base, m);
  }
  return dsCache.get(base);
}

// ======================================================================
//  COIFFURES
// ======================================================================
export function buildHair(style, color, sex = 'm') {
  const g = new THREE.Group();
  if (!style || style === 'none' || style === 'bald') return g;
  const R = HEAD_R;
  const curly = style === 'wig' || style === 'curly' || style === 'messy';
  const mat = clothMat({ c: color, p: curly ? 'wool' : 'linen', rough: 0.85 });

  const cap = (r = 1.06, theta = 0.37) =>
    mesh(headShell('cap', R * r, 0, PI * 2, 0, PI * theta), mat);
  const back = (r = 1.06, w = 0.68, theta = 0.6) =>
    mesh(headShell('back', R * r, BACK - PI * w, PI * w * 2, 0, PI * theta), mat);

  switch (style) {
    case 'short':
    case 'sidepart':
      g.add(cap(), back());
      if (style === 'sidepart') {
        const top = mesh(headShell('part', R * 1.1, FRONT - 0.9, 1.6, 0, PI * 0.22), mat);
        top.position.set(0.006, 0.004, 0);
        g.add(top);
      }
      break;
    case 'crop':
      g.add(cap(1.025, 0.36), back(1.025, 0.66, 0.58));
      break;
    case 'curly':
      g.add(cap(1.12, 0.4), back(1.12, 0.7, 0.62));
      break;
    case 'tonsure': {
      // couronne de cheveux, sommet rasé (moines)
      g.add(mesh(headShell('tonsure', R * 1.05, 0, PI * 2, PI * 0.2, PI * 0.2), mat));
      g.add(back(1.05, 0.62, 0.6));
      break;
    }
    case 'fringe': {
      // calvitie : couronne latérale et arrière seulement
      g.add(mesh(headShell('fringe', R * 1.04, BACK - PI * 0.72, PI * 1.44, PI * 0.3, PI * 0.3), mat));
      break;
    }
    case 'long':
    case 'messy': {
      g.add(cap(1.07), back(1.07, 0.7, 0.62));
      const len = sex === 'f' ? 0.32 : 0.2;
      const tail = mesh(geo(`longback-${len}`, () =>
        new THREE.CylinderGeometry(0.083, 0.1, len, 16, 1, true, PI / 2 + 0.25, PI - 0.5)), dsMat({ c: color, p: 'linen' }));
      tail.scale.set(1, 1, 0.95);
      tail.position.set(0, -0.04 - len / 2, -0.005);
      g.add(tail);
      if (style === 'messy') {
        for (let i = 0; i < 7; i++) {
          const a = (i / 7) * PI * 2;
          const lock = mesh(geo('lock', () => new THREE.SphereGeometry(0.028, 6, 5)), mat);
          lock.position.set(Math.cos(a) * 0.075, 0.07 + Math.sin(i * 1.7) * 0.02, Math.sin(a) * 0.085 - 0.01);
          lock.scale.set(1, 0.7, 1);
          g.add(lock);
        }
      }
      break;
    }
    case 'bun':
    case 'topbun': {
      g.add(cap(1.04, 0.38), back(1.04, 0.7, 0.6));
      const bun = mesh(geo('bun', () => new THREE.SphereGeometry(0.042, 12, 10)), mat);
      if (style === 'topbun') bun.position.set(0, 0.115, -0.03);
      else bun.position.set(0, 0.035, -0.112);
      g.add(bun);
      break;
    }
    case 'ponytail': {
      g.add(cap(1.05), back(1.05, 0.7, 0.58));
      const tail = mesh(geo('ponytail', () => new THREE.CapsuleGeometry(0.024, 0.16, 4, 8)), mat);
      tail.position.set(0, -0.05, -0.115);
      tail.rotation.x = 0.25;
      g.add(tail);
      break;
    }
    case 'braids': {
      g.add(cap(1.05), back(1.05, 0.7, 0.6));
      for (const sx of [-1, 1]) {
        const braid = mesh(geo('braid', () => new THREE.CapsuleGeometry(0.02, 0.26, 4, 8)), mat);
        braid.position.set(sx * 0.07, -0.16, -0.01);
        braid.rotation.z = sx * 0.12;
        g.add(braid);
      }
      break;
    }
    case 'bob':
    case 'rolls': {
      g.add(cap(1.07), back(1.07, 0.78, 0.62));
      const side = mesh(geo('bobside', () =>
        new THREE.CylinderGeometry(0.088, 0.096, 0.13, 18, 1, true, PI / 2 - 0.5, PI + 1.0)), dsMat({ c: color, p: 'linen' }));
      side.position.set(0, -0.06, -0.004);
      side.scale.set(1, 1, 1.02);
      g.add(side);
      if (style === 'rolls') {
        for (const sx of [-1, 1]) {
          const roll = mesh(geo('roll', () => new THREE.TorusGeometry(0.026, 0.017, 8, 14)), mat);
          roll.position.set(sx * 0.045, 0.1, 0.03);
          roll.rotation.y = PI / 2;
          g.add(roll);
        }
      }
      break;
    }
    case 'wig': {
      // perruque in-folio (années 1680) : volume bouclé tombant sur les épaules
      g.add(cap(1.14, 0.42), back(1.14, 0.75, 0.6));
      for (const sx of [-1, 1]) {
        const mass = mesh(geo('wigside', () => new THREE.SphereGeometry(0.06, 12, 10)), mat);
        mass.scale.set(0.75, 2.2, 0.95);
        mass.position.set(sx * 0.09, -0.11, -0.015);
        g.add(mass);
      }
      const backMass = mesh(geo('wigback', () => new THREE.SphereGeometry(0.08, 12, 10)), mat);
      backMass.scale.set(1.15, 1.6, 0.7);
      backMass.position.set(0, -0.09, -0.08);
      g.add(backMass);
      break;
    }
    default:
      g.add(cap(), back());
  }
  return g;
}

// ======================================================================
//  BARBES ET MOUSTACHES
// ======================================================================
export function buildBeard(style, color) {
  const g = new THREE.Group();
  if (!style || style === 'none' || style === 'stubble') return g;
  const mat = clothMat({ c: color, p: 'wool', rough: 0.9 });
  const R = HEAD_R;
  const mustache = (w = 0.026, drop = 0) => {
    for (const sx of [-1, 1]) {
      const m = mesh(geo('stache', () => new THREE.CapsuleGeometry(0.008, 0.026, 3, 6)), mat);
      m.position.set(sx * 0.016, -0.052 - drop * 0.4, 0.088);
      m.rotation.z = sx * (PI / 2 - 0.35 - drop * 2.5);
      m.scale.set(1, w / 0.026, 1);
      g.add(m);
    }
  };
  switch (style) {
    case 'full':
      g.add(mesh(headShell('beardfull', R * 1.07, FRONT - PI * 0.47, PI * 0.94, PI * 0.56, PI * 0.38), mat));
      mustache(0.03);
      break;
    case 'short':
      g.add(mesh(headShell('beardshort', R * 1.03, FRONT - PI * 0.45, PI * 0.9, PI * 0.6, PI * 0.3), mat));
      mustache(0.026);
      break;
    case 'goatee': {
      const gt = mesh(geo('goatee', () => new THREE.CapsuleGeometry(0.014, 0.025, 4, 6)), mat);
      gt.position.set(0, -0.098, 0.074);
      gt.rotation.x = 0.4;
      g.add(gt);
      mustache(0.022);
      break;
    }
    case 'mustache':
      mustache(0.026);
      break;
    case 'gaulish':
      // longues moustaches tombantes des Gaulois
      mustache(0.05, 0.25);
      break;
  }
  return g;
}

// ======================================================================
//  COUVRE-CHEFS
//  Retourne { head: Group, chest?: Group } (certains, comme le chaperon,
//  ont une partie posée sur les épaules).
// ======================================================================
export function buildHat(type, c = null, c2 = null) {
  const head = new THREE.Group();
  const out = { head, chest: null, hidesHair: false };
  if (!type) return out;
  const R = HEAD_R;
  const fc = c ?? 0x2a2420;
  const felt = clothMat({ c: fc, p: 'wool', rough: 0.95 });
  const feltDS = dsMat({ c: fc, p: 'wool', rough: 0.95 });
  const add = (o) => { head.add(o); return o; };

  const disc = (r, h, segs = 28) => geo(`disc-${r}-${h}-${segs}`, () => new THREE.CylinderGeometry(r, r, h, segs));

  switch (type) {
    case 'quichenotte': {
      // Coiffe des Rétaises : câline blanche + arceau de carton baleiné
      // couvert de toile, avançant largement devant le visage, et bavolet.
      const cotton = clothMat({ c: 0xf4f1e8, p: 'linen', rough: 0.85 });
      const cottonDS = dsMat({ c: 0xf4f1e8, p: 'stripes', c2: 0xe2ddd0 });
      add(mesh(headShell('caline', R * 1.09, 0, PI * 2, 0, PI * 0.36), cotton));
      add(mesh(headShell('calineback', R * 1.09, BACK - PI * 0.72, PI * 1.44, 0, PI * 0.64), cotton));
      const arch = mesh(geo('quich-arch', () =>
        new THREE.CylinderGeometry(0.118, 0.112, 0.3, 20, 6, true, PI / 2, PI)), cottonDS, true);
      arch.rotation.x = PI / 2;
      arch.position.set(0, 0.0, 0.07);
      add(arch);
      // bords cousus (ourlet)
      const hem = mesh(geo('quich-hem', () => new THREE.TorusGeometry(0.112, 0.006, 5, 20, PI)), flatMat(0xe8e2d4));
      hem.position.set(0, 0.0, 0.22);
      add(hem);
      const bav = mesh(geo('quich-bav', () =>
        new THREE.CylinderGeometry(0.11, 0.15, 0.14, 18, 1, true, PI / 2 + 0.1, PI - 0.2)), cottonDS);
      bav.position.set(0, -0.1, -0.02);
      add(bav);
      out.hidesHair = true;
      break;
    }
    case 'coif': {
      const linen = clothMat({ c: c ?? 0xf0ece0, p: 'linen' });
      add(mesh(headShell('coif', R * 1.1, 0, PI * 2, 0, PI * 0.42), linen));
      add(mesh(headShell('coifback', R * 1.1, BACK - PI * 0.72, PI * 1.44, 0, PI * 0.66), linen));
      out.hidesHair = true;
      break;
    }
    case 'veil':
    case 'wimple':
    case 'palla': {
      const veilMat = dsMat({ c, p: type === 'palla' ? 'wool' : 'linen' });
      add(mesh(headShell('veiltop', R * 1.12, 0, PI * 2, 0, PI * 0.42), veilMat));
      add(mesh(headShell('veilback', R * 1.12, BACK - PI * 0.74, PI * 1.48, 0, PI * 0.66), veilMat));
      const drape = mesh(geo(`veildrape-${type}`, () =>
        new THREE.CylinderGeometry(0.1, type === 'palla' ? 0.2 : 0.16, type === 'palla' ? 0.36 : 0.28, 18, 1, true, PI / 2 - 0.1, PI + 0.2)), veilMat, true);
      drape.position.set(0, type === 'palla' ? -0.2 : -0.16, -0.01);
      add(drape);
      if (type === 'wimple') {
        // guimpe blanche autour du menton et du cou
        const w = mesh(geo('wimple', () =>
          new THREE.CylinderGeometry(0.075, 0.11, 0.16, 16, 1, true)), dsMat({ c: 0xf2efe6, p: 'linen' }));
        w.position.set(0, -0.12, 0.0);
        w.scale.set(1, 1, 1.1);
        add(w);
      }
      out.hidesHair = true;
      break;
    }
    case 'chaperon':
    case 'furhood':
    case 'cowlup': {
      // capuchon enveloppant + pèlerine sur les épaules
      const m = type === 'furhood' ? dsMat({ c, p: 'fur' }) : dsMat({ c, p: 'wool' });
      add(mesh(headShell(`hood-${type}`, R * 1.2, FRONT + PI * 0.3, PI * 1.4, 0, PI * 0.78), m));
      if (type === 'chaperon') {
        const tail = mesh(geo('liripipe', () => new THREE.CapsuleGeometry(0.018, 0.22, 3, 6)), m);
        tail.position.set(0, -0.02, -0.15);
        tail.rotation.x = -0.9;
        add(tail);
      }
      const cape = new THREE.Group();
      const shoulders = mesh(geo(`hoodcape-${type}`, () =>
        new THREE.CylinderGeometry(0.1, 0.27, 0.2, 18, 1, true)), m, true);
      shoulders.scale.set(1.15, 1, 0.85);
      shoulders.position.y = 0.16;
      cape.add(shoulders);
      out.chest = cape;
      out.hidesHair = true;
      break;
    }
    case 'tricorne': {
      const crown = add(mesh(geo('tri-crown', () => new THREE.CylinderGeometry(0.084, 0.092, 0.085, 18)), felt, true));
      crown.position.y = 0.105;
      const brim = add(mesh(geo('tri-brim', () => new THREE.CylinderGeometry(0.2, 0.135, 0.075, 3, 1, true)), feltDS, true));
      brim.position.y = 0.09;
      const trim = add(mesh(geo('tri-trim', () => new THREE.TorusGeometry(0.2, 0.005, 4, 3)), flatMat(c2 ?? 0xd4a857, 0.4, 0.6)));
      trim.rotation.x = PI / 2;
      trim.rotation.z = PI / 2;
      trim.position.y = 0.127;
      break;
    }
    case 'plumed':
    case 'felt':
    case 'pilgrim': {
      // chapeau de feutre à larges bords (XVIIe), avec plume ou coquille
      const brimR = type === 'felt' ? 0.17 : 0.2;
      const brim = add(mesh(disc(brimR, 0.012), felt, true));
      brim.position.y = 0.075;
      if (type === 'pilgrim') { brim.rotation.x = -0.25; }
      const crown = add(mesh(geo(`crown-${type}`, () =>
        new THREE.CylinderGeometry(0.08, 0.092, type === 'felt' ? 0.09 : 0.11, 18)), felt, true));
      crown.position.y = 0.125;
      const top = add(mesh(geo('crowntop', () => new THREE.SphereGeometry(0.08, 14, 6, 0, PI * 2, 0, PI / 2)), felt));
      top.scale.y = 0.35;
      top.position.y = type === 'felt' ? 0.17 : 0.18;
      const band = add(mesh(geo(`band-${type}`, () => new THREE.CylinderGeometry(0.093, 0.093, 0.022, 18)), flatMat(type === 'plumed' ? (c2 ?? 0xa83a2a) : 0x1a1410)));
      band.position.y = 0.088;
      if (type === 'plumed') {
        const plumeMat = flatMat(0xf4f0e8, 0.9);
        for (let i = 0; i < 5; i++) {
          const f = mesh(geo('plume', () => new THREE.SphereGeometry(0.03, 8, 6)), plumeMat);
          f.scale.set(0.55, 0.4, 1.8);
          f.position.set(0.07 + i * 0.012, 0.13 + Math.sin(i * 0.6) * 0.03, 0.05 - i * 0.045);
          f.rotation.x = -0.4 + i * 0.12;
          add(f);
        }
      }
      if (type === 'pilgrim') {
        // coquille Saint-Jacques des pèlerins de Compostelle
        const shell = add(mesh(geo('scallop', () => new THREE.CircleGeometry(0.035, 10, 0, PI)), flatMat(0xf0e6d0, 0.6)));
        shell.position.set(0, 0.14, 0.095);
        shell.rotation.x = -0.2;
      }
      break;
    }
    case 'straw':
    case 'sunhat':
    case 'boater': {
      const straw = clothMat({ c: c ?? 0xd8c088, p: 'straw' });
      const strawDS = dsMat({ c: c ?? 0xd8c088, p: 'straw' });
      const brimR = type === 'sunhat' ? 0.25 : type === 'straw' ? 0.22 : 0.15;
      const brim = add(mesh(geo(`brim-${type}`, () =>
        new THREE.CylinderGeometry(brimR * 0.55, brimR, type === 'sunhat' ? 0.05 : 0.02, 28, 1, true)), strawDS, true));
      brim.position.y = type === 'sunhat' ? 0.06 : 0.075;
      const flat = add(mesh(geo(`brimflat-${type}`, () => new THREE.RingGeometry(0.08, brimR * 0.56, 28)), strawDS));
      flat.rotation.x = -PI / 2;
      flat.position.y = type === 'sunhat' ? 0.085 : 0.085;
      const crown = add(mesh(geo(`scrown-${type}`, () =>
        new THREE.CylinderGeometry(type === 'boater' ? 0.088 : 0.075, 0.09, type === 'boater' ? 0.065 : 0.08, 18)), straw, true));
      crown.position.y = 0.115;
      const band = add(mesh(geo(`sband-${type}`, () => new THREE.CylinderGeometry(0.091, 0.091, 0.022, 18)), flatMat(c2 ?? 0x1a2a4a)));
      band.position.y = 0.095;
      break;
    }
    case 'tophat': {
      const brim = add(mesh(disc(0.135, 0.01), felt, true));
      brim.position.y = 0.08;
      brim.scale.set(1, 1, 1.12);
      const crown = add(mesh(geo('top-crown', () => new THREE.CylinderGeometry(0.088, 0.08, 0.18, 20)), clothMat({ c, p: 'velvet' }), true));
      crown.position.y = 0.17;
      const band = add(mesh(geo('top-band', () => new THREE.CylinderGeometry(0.083, 0.083, 0.03, 20)), flatMat(0x111111)));
      band.position.y = 0.1;
      break;
    }
    case 'beret':
    case 'bachi': {
      const b = add(mesh(geo('beret', () => new THREE.SphereGeometry(0.115, 18, 10)), clothMat({ c, p: 'wool' }), true));
      b.scale.set(1.0, 0.32, 1.05);
      b.position.set(type === 'beret' ? -0.012 : 0, 0.098, -0.005);
      b.rotation.z = type === 'beret' ? 0.15 : 0;
      const band = add(mesh(geo('beretband', () => new THREE.CylinderGeometry(0.09, 0.092, 0.025, 18)), clothMat({ c, p: 'knit' })));
      band.position.y = 0.083;
      if (type === 'bachi') {
        // bonnet de marin et son pompon rouge
        const pom = add(mesh(geo('pompon', () => new THREE.SphereGeometry(0.024, 10, 8)), clothMat({ c: 0xc0282a, p: 'wool' })));
        pom.position.y = 0.14;
      } else {
        const stem = add(mesh(geo('beretstem', () => new THREE.CylinderGeometry(0.004, 0.006, 0.02, 5)), flatMat(c)));
        stem.position.set(-0.02, 0.135, 0);
      }
      break;
    }
    case 'flatcap':
    case 'sailorcap':
    case 'cap':
    case 'kepi': {
      const m = type === 'cap' ? clothMat({ c, p: 'plain' }) : clothMat({ c, p: 'wool' });
      if (type === 'flatcap') {
        const top = add(mesh(geo('flatcap', () => new THREE.SphereGeometry(0.108, 18, 10)), m, true));
        top.scale.set(1, 0.32, 1.12);
        top.position.set(0, 0.098, 0.01);
      } else if (type === 'cap') {
        add(mesh(headShell('capdome', R * 1.1, 0, PI * 2, 0, PI * 0.36), m));
      } else {
        const h = type === 'kepi' ? 0.1 : 0.06;
        const crown = add(mesh(geo(`crown-${type}`, () =>
          new THREE.CylinderGeometry(type === 'kepi' ? 0.08 : 0.1, 0.09, h, 18)), m, true));
        crown.position.y = 0.09 + h / 2;
        if (type === 'kepi') crown.rotation.x = -0.12;
        const band = add(mesh(geo(`cband-${type}`, () => new THREE.CylinderGeometry(0.092, 0.092, 0.024, 18)), flatMat(type === 'kepi' ? c2 : 0x111111)));
        band.position.y = 0.095;
        const badge = add(mesh(geo('badge', () => new THREE.CircleGeometry(0.012, 10)), flatMat(0xd4a857, 0.4, 0.7)));
        badge.position.set(0, 0.112, 0.092);
      }
      // visière
      const visor = add(mesh(geo(`visor-${type}`, () =>
        new THREE.CylinderGeometry(0.1, 0.1, 0.008, 18, 1, false, -PI / 2, PI)), flatMat(type === 'cap' ? c : 0x161616, 0.5), true));
      visor.position.set(0, type === 'cap' ? 0.06 : 0.085, 0.05);
      visor.scale.set(0.95, 1, type === 'cap' ? 0.85 : 0.6);
      visor.rotation.x = type === 'cap' ? 0.1 : 0.2;
      break;
    }
    case 'stahlhelm': {
      // casque allemand de 1935 (sans insigne)
      const pts = [[0.128, -0.075], [0.122, -0.045], [0.112, -0.02], [0.107, 0.02], [0.1, 0.06], [0.082, 0.1], [0.05, 0.125], [0.001, 0.135]]
        .map(([x, y]) => new THREE.Vector2(x, y));
      const h = add(mesh(geo('stahl', () => new THREE.LatheGeometry(pts, 20)), dsMat({ c: c ?? 0x4b5142, p: 'plain', rough: 0.6 }), true));
      h.scale.set(0.95, 1, 1.05);
      h.position.y = 0.035;
      out.hidesHair = true;
      break;
    }
    case 'galea': {
      const metal = flatMat(c ?? 0x9a8a5a, 0.45, 0.7);
      const dome = add(mesh(headShell('galea', R * 1.14, 0, PI * 2, 0, PI * 0.42), metal, true));
      dome.position.y = 0.005;
      const neck = add(mesh(geo('galea-neck', () =>
        new THREE.CylinderGeometry(0.1, 0.14, 0.05, 14, 1, true, PI / 2 + 0.2, PI - 0.4)), dsMat({ c: c ?? 0x9a8a5a, rough: 0.45, metal: 0.7 })));
      neck.position.set(0, 0.0, -0.02);
      for (const sx of [-1, 1]) {
        const cheek = add(mesh(geo('cheekguard', () => new THREE.BoxGeometry(0.008, 0.08, 0.06)), metal));
        cheek.position.set(sx * 0.088, -0.04, 0.035);
      }
      const crest = add(mesh(geo('crest', () => new THREE.BoxGeometry(0.025, 0.06, 0.2)), clothMat({ c: c2 ?? 0xa02020, p: 'wool' })));
      crest.position.y = 0.16;
      out.hidesHair = true;
      break;
    }
    case 'nasal':
    case 'kettle': {
      const metal = flatMat(0x8a8c90, 0.4, 0.75);
      if (type === 'nasal') {
        const pts = [[0.1, -0.0], [0.098, 0.04], [0.085, 0.09], [0.05, 0.14], [0.001, 0.17]].map(([x, y]) => new THREE.Vector2(x, y));
        const h = add(mesh(geo('nasal', () => new THREE.LatheGeometry(pts, 18)), metal, true));
        h.scale.set(0.9, 1, 1.05);
        h.position.y = 0.02;
        const bar = add(mesh(geo('nasalbar', () => new THREE.BoxGeometry(0.018, 0.07, 0.01)), metal));
        bar.position.set(0, -0.005, 0.104);
      } else {
        const dome = add(mesh(headShell('kettle', R * 1.15, 0, PI * 2, 0, PI * 0.45), metal, true));
        dome.position.y = 0.01;
        const brim = add(mesh(geo('kettlebrim', () => new THREE.CylinderGeometry(0.12, 0.19, 0.05, 20, 1, true)), dsMat({ c: 0x8a8c90, rough: 0.4, metal: 0.75 })));
        brim.position.y = 0.035;
      }
      out.hidesHair = true;
      break;
    }
    case 'bikehelmet': {
      const shell = add(mesh(headShell('bikehelm', R * 1.22, 0, PI * 2, 0, PI * 0.44), clothMat({ c, p: 'stripes', c2: 0x222222, rough: 0.4 }), true));
      shell.position.y = 0.005;
      shell.scale.set(1, 1, 1.12);
      out.hidesHair = true;
      break;
    }
    case 'headband': {
      const band = add(mesh(geo('hband', () => new THREE.TorusGeometry(0.087, 0.008, 6, 20)), clothMat({ c, p: 'leather' })));
      band.rotation.x = PI / 2;
      band.position.y = 0.055;
      band.scale.set(1, 1.15, 1);
      const feather = add(mesh(geo('hfeather', () => new THREE.CapsuleGeometry(0.008, 0.11, 3, 6)), flatMat(c2 ?? 0x8a5a2a)));
      feather.position.set(0.075, 0.12, -0.04);
      feather.rotation.z = -0.35;
      break;
    }
    case 'pileus': {
      const cap = add(mesh(geo('pileus', () => new THREE.ConeGeometry(0.095, 0.13, 18, 1, true)), feltDS, true));
      cap.position.y = 0.13;
      break;
    }
    case 'headscarf': {
      const m = dsMat({ c, p: 'floral', c2 });
      add(mesh(headShell('scarf', R * 1.1, 0, PI * 2, 0, PI * 0.4), m));
      add(mesh(headShell('scarfback', R * 1.1, BACK - PI * 0.72, PI * 1.44, 0, PI * 0.62), m));
      const knot = add(mesh(geo('scarfknot', () => new THREE.SphereGeometry(0.028, 8, 6)), m));
      knot.position.set(0, 0.11, 0.06);
      knot.scale.set(1.4, 0.8, 1);
      out.hidesHair = false;
      break;
    }
    case 'bonnet': {
      const m = clothMat({ c, p: 'knit' });
      add(mesh(headShell('bonnet', R * 1.12, 0, PI * 2, 0, PI * 0.5), m));
      const fold = add(mesh(geo('bonnetfold', () => new THREE.CylinderGeometry(0.095, 0.097, 0.04, 20, 1, true)), dsMat({ c, p: 'knit' })));
      fold.position.y = 0.035;
      fold.scale.set(0.86, 1, 1.02);
      out.hidesHair = true;
      break;
    }
    case 'cloche': {
      const m = clothMat({ c, p: 'wool' });
      add(mesh(headShell('cloche', R * 1.14, 0, PI * 2, 0, PI * 0.47), m));
      const brim = add(mesh(geo('clochebrim', () => new THREE.CylinderGeometry(0.1, 0.13, 0.03, 20, 1, true)), dsMat({ c, p: 'wool' })));
      brim.position.y = 0.025;
      brim.scale.set(0.9, 1, 1.05);
      break;
    }
  }
  return out;
}

// ======================================================================
//  LUNETTES
// ======================================================================
export function buildGlasses(kind = 'glasses') {
  const g = new THREE.Group();
  const frame = flatMat(kind === 'sun' ? 0x1a1a1a : 0x3a2a1a, 0.4, 0.3);
  for (const sx of [-1, 1]) {
    const ring = mesh(geo('lensring', () => new THREE.TorusGeometry(0.019, 0.0028, 5, 14)), frame);
    ring.position.set(sx * 0.027, 0.002, 0.103);
    g.add(ring);
    if (kind === 'sun') {
      const lens = mesh(geo('lens', () => new THREE.CircleGeometry(0.019, 14)), flatMat(0x101418, 0.1, 0.5));
      lens.position.set(sx * 0.027, 0.002, 0.104);
      g.add(lens);
    }
    const arm = mesh(geo('glassarm', () => new THREE.BoxGeometry(0.003, 0.003, 0.09)), frame);
    arm.position.set(sx * 0.072, 0.006, 0.06);
    g.add(arm);
  }
  const bridge = mesh(geo('bridge', () => new THREE.BoxGeometry(0.016, 0.003, 0.003)), frame);
  bridge.position.set(0, 0.008, 0.104);
  g.add(bridge);
  return g;
}

// ======================================================================
//  CHAUSSURES (attachées à la cheville ; la semelle est à y = -0.07)
// ======================================================================
export function buildFoot(type = 'shoe', c = 0x2a1e14, skinMat) {
  const g = new THREE.Group();
  const shoeGeo = geo('shoe', () => new THREE.CapsuleGeometry(0.042, 0.13, 4, 10));
  const sole = geo('sole', () => new THREE.BoxGeometry(0.085, 0.018, 0.23));
  const leather = clothMat({ c, p: 'leather', rough: 0.55 });
  const addShoe = (m, sy = 0.78, sx = 0.95) => {
    const s = mesh(shoeGeo, m, true);
    s.rotation.x = PI / 2;
    s.scale.set(sx, 1, sy);
    s.position.set(0, -0.04, 0.045);
    g.add(s);
    return s;
  };
  switch (type) {
    case 'bare':
      addShoe(skinMat, 0.6, 0.85);
      break;
    case 'sandal': {
      addShoe(skinMat, 0.6, 0.85);
      const so = mesh(sole, clothMat({ c: 0x6a4a2a, p: 'leather' }));
      so.position.set(0, -0.062, 0.045);
      g.add(so);
      for (const z of [0.0, 0.08]) {
        const strap = mesh(geo('strap', () => new THREE.TorusGeometry(0.038, 0.006, 4, 12)), clothMat({ c: 0x5a3a1a, p: 'leather' }));
        strap.rotation.x = PI / 2;
        strap.scale.set(1, 1.2, 0.7);
        strap.position.set(0, -0.035, z);
        g.add(strap);
      }
      break;
    }
    case 'wrap': {
      // chaussons de cuir lacés (préhistoire, Gaulois, paysans)
      addShoe(clothMat({ c: c ?? 0x6a4a2a, p: 'leather' }), 0.82, 1.0);
      const cuff = mesh(geo('wrapcuff', () => new THREE.CylinderGeometry(0.052, 0.056, 0.09, 10)), clothMat({ c: c ?? 0x6a4a2a, p: 'fur' }));
      cuff.position.y = 0.0;
      g.add(cuff);
      break;
    }
    case 'sabot': {
      const wood = clothMat({ c: c ?? 0xc8a070, p: 'wood', rough: 0.7 });
      const s = mesh(geo('sabot', () => new THREE.CapsuleGeometry(0.05, 0.15, 4, 10)), wood, true);
      s.rotation.x = PI / 2 - 0.08;
      s.scale.set(1, 1, 0.95);
      s.position.set(0, -0.032, 0.05);
      g.add(s);
      break;
    }
    case 'boot':
    case 'tallboot': {
      addShoe(leather, 0.85);
      const h = type === 'tallboot' ? 0.34 : 0.18;
      const shaft = mesh(geo(`bootshaft-${h}`, () => new THREE.CylinderGeometry(0.06, 0.05, h, 12)), leather, true);
      shaft.position.y = h / 2 - 0.04;
      g.add(shaft);
      break;
    }
    case 'sneaker': {
      addShoe(clothMat({ c: c ?? 0xf0f0f0, p: 'plain', rough: 0.6 }), 0.85, 1.02);
      const so = mesh(sole, flatMat(0xe8e8e8, 0.8));
      so.position.set(0, -0.064, 0.045);
      so.scale.set(1.05, 1.2, 1.0);
      g.add(so);
      for (const sx of [-1, 1]) {
        const stripe = mesh(geo('snkstripe', () => new THREE.BoxGeometry(0.004, 0.018, 0.09)), flatMat(0x2a5aa0, 0.6));
        stripe.position.set(sx * 0.041, -0.04, 0.05);
        g.add(stripe);
      }
      break;
    }
    case 'buckle': {
      addShoe(leather, 0.75);
      const buckle = mesh(geo('buckle', () => new THREE.BoxGeometry(0.035, 0.02, 0.008)), flatMat(0xd8c070, 0.3, 0.8));
      buckle.position.set(0, -0.01, 0.1);
      buckle.rotation.x = -0.6;
      g.add(buckle);
      const heel = mesh(geo('heel', () => new THREE.BoxGeometry(0.05, 0.03, 0.05)), flatMat(0x2a1a10, 0.6));
      heel.position.set(0, -0.06, -0.035);
      g.add(heel);
      break;
    }
    default:
      addShoe(leather);
      {
        const so = mesh(sole, flatMat(0x1a120c, 0.8));
        so.position.set(0, -0.063, 0.045);
        g.add(so);
      }
  }
  return g;
}

// ======================================================================
//  VÊTEMENTS SUPERPOSÉS
// ======================================================================

// Jupe / robe / tunique / soutane accrochée aux hanches.
// top : y du haut (repère hanches), len : longueur, flare : évasement.
export function buildSkirt({ c, p = 'wool', c2, len = 0.9, flare = 1, top = 0.08, topR = 0.152, phiStart = 0, phiLength = PI * 2, k = 1, sx = 1.18, sz = 0.92 }) {
  const bottomR = topR + 0.035 + 0.17 * flare * Math.min(1, len / 0.9);
  const pts = [];
  const N = 6;
  for (let i = 0; i <= N; i++) {
    const t = i / N;                       // 0 = bas, 1 = haut
    const y = top - len * (1 - t);
    const r = bottomR + (topR - bottomR) * Math.pow(t, 0.75);
    pts.push(new THREE.Vector2(r, y));
  }
  if (k !== 1) pts.forEach((v) => { v.x *= k; });
  const g = geo(`skirt-${len}-${flare}-${top}-${topR}-${phiStart}-${phiLength}-${k}`, () =>
    new THREE.LatheGeometry(pts, phiLength < PI * 2 ? 12 : 24, phiStart, phiLength));
  const m = mesh(g, dsMat({ c, p, c2 }), true);
  m.scale.set(sx, 1, sz);
  return m;
}

// Pans d'habit ouverts devant (justaucorps, redingote, manteau).
export function buildCoatTails({ c, p = 'wool', c2, len = 0.55, gap = 0.6, top = 0.08, topR = 0.158, flare = 0.7 }) {
  const bottomR = topR + 0.012 + (0.03 + 0.12 * flare) * Math.min(1, Math.max(0, (len - 0.12) / 0.4));
  const pts = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4;
    pts.push(new THREE.Vector2(bottomR + (topR - bottomR) * t, top - len * (1 - t)));
  }
  const g = geo(`tails-${len}-${gap}-${top}-${flare}`, () => new THREE.LatheGeometry(pts, 22, gap / 2, PI * 2 - gap));
  const m = mesh(g, dsMat({ c, p, c2 }), true);
  m.scale.set(1.2, 1, 0.95);
  return m;
}

// Coque de buste (veste ouverte sur le gilet, tablier à bavette, plastron…)
// profile : profil du torse (repère colonne), k : facteur de gonflement.
export function buildTorsoShell(profile, scale, { c, p = 'wool', c2, phiStart = 0, phiLength = PI * 2, k = 1.05, yMin = -1, yMax = 1 }) {
  const pts = profile.filter((v) => v.y >= yMin - 1e-6 && v.y <= yMax + 1e-6)
    .map((v) => new THREE.Vector2(Math.max(0.001, v.x * k), v.y));
  const key = `shell-${pts.map((v) => v.x.toFixed(3) + v.y.toFixed(3)).join()}-${phiStart}-${phiLength}`;
  const g = geo(key, () => new THREE.LatheGeometry(pts, 22, phiStart, phiLength));
  const m = mesh(g, dsMat({ c, p, c2 }), true);
  m.scale.copy(scale);
  return m;
}

// Cape / sagum / pèlerine, accrochée aux épaules (repère poitrine).
export function buildCape({ c, p = 'wool', c2, len = 1.0, width = 0.24 }) {
  const g = geo(`cape-${len}-${width}`, () =>
    new THREE.CylinderGeometry(width * 0.62, width + 0.12, len, 18, 3, true, PI / 2 - 0.35, PI + 0.7));
  const m = mesh(g, dsMat({ c, p, c2 }), true);
  m.scale.set(1.2, 1, 0.75);
  return m;
}

// Châle / fichu croisé sur les épaules (repère poitrine).
export function buildShawl({ c, p = 'wool', c2 }) {
  const pts = [[0.29, -0.06], [0.28, 0.04], [0.26, 0.11], [0.2, 0.17], [0.12, 0.205], [0.075, 0.22]]
    .map(([x, y]) => new THREE.Vector2(x, y));
  const g = geo('shawl', () => new THREE.LatheGeometry(pts, 22));
  const m = mesh(g, dsMat({ c, p, c2 }), true);
  m.scale.set(1.0, 1, 0.72);
  return m;
}

// Ceinture (repère colonne, à la taille).
export function buildBelt({ c = 0x3a2a1a, buckle = 0xc8a860, r = 0.143 }) {
  const g = new THREE.Group();
  const b = mesh(geo(`belt-${r}`, () => new THREE.CylinderGeometry(r * 1.03, r * 1.03, 0.04, 22, 1, true)), dsMat({ c, p: 'leather' }));
  g.add(b);
  if (buckle) {
    const bk = mesh(geo('beltbuckle', () => new THREE.BoxGeometry(0.035, 0.03, 0.01)), flatMat(buckle, 0.35, 0.7));
    bk.position.set(0, 0, r * 1.03 + 0.004);
    g.add(bk);
  }
  return g;
}

// Panneau plat (scapulaire, tablier simple, rabat…)
export function buildPanel({ c, p = 'wool', c2, w = 0.28, h = 1.0, t = 0.012 }) {
  return mesh(geo(`panel-${w}-${h}-${t}`, () => new THREE.BoxGeometry(w, h, t)), clothMat({ c, p, c2 }), true);
}

// Collier / torque / pendentif (repère poitrine, au cou).
export function buildNecklace(type, c = 0xd4a857) {
  const g = new THREE.Group();
  switch (type) {
    case 'torque': {
      const t = mesh(geo('torque', () => new THREE.TorusGeometry(0.075, 0.009, 6, 20, PI * 1.75)), flatMat(c, 0.3, 0.85));
      t.rotation.x = PI / 2;
      t.rotation.z = PI / 2 + PI * 0.125;
      t.scale.set(1.15, 1, 1);
      g.add(t);
      break;
    }
    case 'shells':
    case 'bone':
    case 'pearls': {
      const n = 11;
      for (let i = 0; i < n; i++) {
        const a = PI * 0.28 + (i / (n - 1)) * PI * 0.44;
        const bead = mesh(type === 'bone'
          ? geo('bonebead', () => new THREE.CylinderGeometry(0.006, 0.006, 0.03, 5))
          : geo(`bead-${type}`, () => new THREE.SphereGeometry(type === 'pearls' ? 0.007 : 0.011, 6, 5)),
        flatMat(type === 'pearls' ? 0xf4f0e8 : type === 'bone' ? 0xe8dcc0 : 0xf0e0c8, 0.5));
        const sa = Math.sin(a);
        bead.position.set(Math.cos(a) * 0.075, -sa * sa * 0.085, sa * 0.145);
        if (type === 'bone') bead.rotation.z = a;
        g.add(bead);
      }
      break;
    }
    case 'cross': {
      const v = mesh(geo('crossv', () => new THREE.BoxGeometry(0.01, 0.04, 0.004)), flatMat(c, 0.3, 0.8));
      const h = mesh(geo('crossh', () => new THREE.BoxGeometry(0.028, 0.01, 0.004)), flatMat(c, 0.3, 0.8));
      v.position.set(0, -0.1, 0.14);
      h.position.set(0, -0.092, 0.141);
      g.add(v, h);
      break;
    }
  }
  return g;
}

// Boutons alignés sur le devant (repère colonne).
export function buildButtons(profile, scaleZ, { c = 0xd4a857, n = 6, y0 = 0.02, y1 = 0.36, x = 0, metal = true }) {
  const g = new THREE.Group();
  const m = flatMat(c, 0.35, metal ? 0.75 : 0);
  for (let i = 0; i < n; i++) {
    const y = y0 + (y1 - y0) * (i / Math.max(1, n - 1));
    const r = radiusAt(profile, y);
    const b = mesh(geo('button', () => new THREE.SphereGeometry(0.0085, 6, 5)), m);
    b.position.set(x, y, r * scaleZ + 0.004);
    g.add(b);
  }
  return g;
}

// Rayon du profil de torse à une hauteur donnée (interpolation linéaire).
export function radiusAt(profile, y) {
  for (let i = 0; i < profile.length - 1; i++) {
    const a = profile[i], b = profile[i + 1];
    if ((y >= a.y && y <= b.y) || (y <= a.y && y >= b.y)) {
      const t = (y - a.y) / ((b.y - a.y) || 1);
      return a.x + (b.x - a.x) * t;
    }
  }
  return profile[Math.floor(profile.length / 2)].x;
}

// Col : rabat (XVIIe), cravate de dentelle, col marin, col de chemise, col montant.
export function buildCollar(type, c = 0xf4f1e8) {
  const g = new THREE.Group();
  switch (type) {
    case 'rabat': {
      for (const sx of [-1, 1]) {
        const tab = mesh(geo('rabat', () => new THREE.BoxGeometry(0.045, 0.07, 0.004)), clothMat({ c, p: 'linen' }));
        tab.position.set(sx * 0.024, 0.37, 0.115);
        tab.rotation.x = -0.2;
        g.add(tab);
      }
      break;
    }
    case 'cravat': {
      const knot = mesh(geo('cravatknot', () => new THREE.SphereGeometry(0.025, 8, 6)), clothMat({ c, p: 'lace' }));
      knot.position.set(0, 0.395, 0.088);
      knot.scale.set(1.2, 0.8, 0.8);
      const fall = mesh(geo('cravatfall', () => new THREE.ConeGeometry(0.04, 0.11, 8, 1, true)), dsMat({ c, p: 'lace' }));
      fall.position.set(0, 0.33, 0.115);
      fall.rotation.x = PI - 0.25;
      fall.scale.set(1, 1, 0.4);
      g.add(knot, fall);
      break;
    }
    case 'sailor': {
      const flap = mesh(geo('sailorcollar', () => new THREE.BoxGeometry(0.24, 0.16, 0.008)), clothMat({ c: c ?? 0x1a2a5a, p: 'pinstripe', c2: 0xf0f0f0 }));
      flap.position.set(0, 0.34, -0.138);
      flap.rotation.x = 0.35;
      g.add(flap);
      break;
    }
    case 'shirt':
    case 'stand':
    case 'turtleneck': {
      const h = type === 'turtleneck' ? 0.07 : 0.035;
      const ring = mesh(geo(`collarring-${type}`, () =>
        new THREE.CylinderGeometry(0.055, 0.062, h, 16, 1, true)), dsMat({ c, p: type === 'turtleneck' ? 'knit' : 'linen' }));
      ring.position.y = 0.44 + h / 2 - 0.01;
      ring.scale.set(1.05, 1, 1);
      g.add(ring);
      break;
    }
    case 'tie': {
      const ring = mesh(geo('collarring-shirt', () =>
        new THREE.CylinderGeometry(0.055, 0.062, 0.035, 16, 1, true)), dsMat({ c: 0xf2f2ee, p: 'linen' }));
      ring.position.y = 0.455;
      const tie = mesh(geo('tie', () => new THREE.BoxGeometry(0.03, 0.26, 0.006)), clothMat({ c, p: 'plain' }));
      tie.position.set(0, 0.31, 0.134);
      tie.rotation.x = -0.12;
      g.add(ring, tie);
      break;
    }
    case 'cowl': {
      // capuchon de moine rabattu sur les épaules
      const cowl = mesh(geo('cowl', () => new THREE.TorusGeometry(0.11, 0.045, 8, 18)), clothMat({ c, p: 'wool' }));
      cowl.rotation.x = PI / 2;
      cowl.scale.set(1.25, 1, 1);
      cowl.position.set(0, 0.41, -0.03);
      g.add(cowl);
      break;
    }
    case 'scarf': {
      const ring = mesh(geo('scarfring', () => new THREE.TorusGeometry(0.075, 0.025, 8, 16)), clothMat({ c, p: 'knit' }));
      ring.rotation.x = PI / 2;
      ring.position.y = 0.43;
      ring.scale.set(1.2, 1, 1);
      const end = mesh(geo('scarfend', () => new THREE.BoxGeometry(0.05, 0.22, 0.012)), clothMat({ c, p: 'knit' }));
      end.position.set(0.04, 0.3, 0.136);
      g.add(ring, end);
      break;
    }
  }
  return g;
}

// Sac : besace en bandoulière, sac à dos, carquois.
export function buildBag(type, c = 0x6b5536) {
  const g = new THREE.Group();
  const leather = clothMat({ c, p: type === 'backpack' ? 'plain' : 'leather' });
  if (type === 'backpack') {
    const body = mesh(geo('backpack', () => new THREE.BoxGeometry(0.3, 0.4, 0.16)), leather, true);
    body.position.set(0, 0.22, -0.17);
    const flap = mesh(geo('bpflap', () => new THREE.BoxGeometry(0.31, 0.14, 0.05)), clothMat({ c: 0x4a3a28 }));
    flap.position.set(0, 0.37, -0.22);
    const roll = mesh(geo('bproll', () => new THREE.CylinderGeometry(0.04, 0.04, 0.34, 8)), flatMat(0x5a6a4a));
    roll.rotation.z = PI / 2;
    roll.position.set(0, 0.36, -0.19);
    for (const sx of [-1, 1]) {
      const strap = mesh(geo('bpstrap', () => new THREE.BoxGeometry(0.035, 0.36, 0.01)), clothMat({ c: 0x2a2a2a }));
      strap.position.set(sx * 0.09, 0.22, 0.125);
      g.add(strap);
    }
    g.add(body, flap, roll);
  } else if (type === 'quiver') {
    const q = mesh(geo('quiver', () => new THREE.CylinderGeometry(0.045, 0.04, 0.5, 8)), clothMat({ c, p: 'leather' }), true);
    q.position.set(-0.08, 0.25, -0.14);
    q.rotation.z = 0.35;
    g.add(q);
  } else {
    // besace en bandoulière (gauche -> droite)
    const pouch = mesh(geo('satchel', () => new THREE.BoxGeometry(0.06, 0.2, 0.24)), leather, true);
    pouch.position.set(-0.19, -0.05, 0.02);
    const strap = mesh(geo('satchelstrap', () => new THREE.BoxGeometry(0.03, 0.62, 0.008)), leather);
    strap.position.set(0, 0.2, 0.12);
    strap.rotation.z = 0.62;
    const strapBack = strap.clone();
    strapBack.position.z = -0.115;
    g.add(pouch, strap, strapBack);
  }
  return g;
}
