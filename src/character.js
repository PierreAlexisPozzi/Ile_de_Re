// Constructeur d'avatar humanoïde articulé, partagé par le joueur et les PNJ.
// Membres séparés (jambes, bras, tête) pour une animation de marche crédible.
// Échelle : ~1.8 unité de haut, cohérente avec des bâtiments réalistes.

import * as THREE from 'three';
import { clothTexture } from './textures.js';

export function buildHumanoid(opts = {}) {
  const {
    shirt = 0x3a6ea5,
    pants = 0x394251,
    skin = 0xe6b48f,
    hair = 0x3a2a1a,
    backpack = false,
    hat = null,        // null | 'cap' | 'tricorne' | 'helmet' | 'monk'
    accent = 0xb5462f,
  } = opts;

  const g = new THREE.Group();
  const parts = {};

  const shirtMat = new THREE.MeshStandardMaterial({ map: clothTexture(shirt), color: shirt, roughness: 0.85 });
  const pantsMat = new THREE.MeshStandardMaterial({ map: clothTexture(pants), color: pants, roughness: 0.85 });
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.6 });
  const hairMat = new THREE.MeshStandardMaterial({ color: hair, roughness: 0.9 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: 0x2a2018, roughness: 0.7 });

  // --- Hanches (pivot du bas du corps) ---
  const hips = new THREE.Group();
  hips.position.y = 0.85;
  g.add(hips);

  // --- Torse (légèrement tapered) ---
  const torsoGeo = new THREE.CylinderGeometry(0.19, 0.24, 0.62, 12);
  const torso = new THREE.Mesh(torsoGeo, shirtMat);
  torso.position.y = 0.32;
  torso.castShadow = true;
  hips.add(torso);

  // ceinture / accent
  const beltGeo = new THREE.CylinderGeometry(0.245, 0.245, 0.08, 12);
  const belt = new THREE.Mesh(beltGeo, new THREE.MeshStandardMaterial({ color: accent, roughness: 0.7 }));
  belt.position.y = 0.02;
  hips.add(belt);

  // --- Cou + tête ---
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.1, 8), skinMat);
  neck.position.y = 0.66;
  hips.add(neck);

  const headPivot = new THREE.Group();
  headPivot.position.y = 0.72;
  hips.add(headPivot);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 14), skinMat);
  head.scale.set(1, 1.12, 0.95);
  head.position.y = 0.1;
  head.castShadow = true;
  headPivot.add(head);
  parts.head = headPivot;

  // cheveux (calotte)
  const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.165, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
  hairMesh.scale.set(1, 1.05, 0.98);
  hairMesh.position.y = 0.13;
  headPivot.add(hairMesh);

  // yeux (petits points sombres)
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x201810, roughness: 0.4 });
  for (const sx of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 8), eyeMat);
    eye.position.set(sx * 0.06, 0.1, 0.145);
    headPivot.add(eye);
  }
  // nez
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 6), skinMat);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, 0.075, 0.16);
  headPivot.add(nose);

  // --- Chapeau ---
  if (hat) headPivot.add(buildHat(hat, accent));

  // --- Bras (épaule -> pivot) ---
  function makeArm(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.26, 0.58, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.055, 0.32, 8), shirtMat);
    upper.position.y = -0.16;
    pivot.add(upper);
    const fore = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.3, 8), skinMat);
    fore.position.y = -0.46;
    pivot.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), skinMat);
    hand.position.y = -0.62;
    pivot.add(hand);
    pivot.children.forEach((c) => (c.castShadow = true));
    hips.add(pivot);
    return pivot;
  }
  parts.armL = makeArm(-1);
  parts.armR = makeArm(1);

  // --- Jambes (hanche -> pivot) ---
  function makeLeg(side) {
    const pivot = new THREE.Group();
    pivot.position.set(side * 0.11, 0.02, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.07, 0.42, 8), pantsMat);
    thigh.position.y = -0.21;
    pivot.add(thigh);
    const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.05, 0.4, 8), pantsMat);
    shin.position.y = -0.62;
    pivot.add(shin);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.07, 0.24), shoeMat);
    foot.position.set(0, -0.82, 0.05);
    pivot.add(foot);
    pivot.children.forEach((c) => (c.castShadow = true));
    hips.add(pivot);
    return pivot;
  }
  parts.legL = makeLeg(-1);
  parts.legR = makeLeg(1);

  // --- Sac à dos d'explorateur ---
  if (backpack) {
    const packMat = new THREE.MeshStandardMaterial({ color: 0x6b5536, roughness: 0.9 });
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.18), packMat);
    pack.position.set(0, 0.35, -0.26);
    pack.castShadow = true;
    hips.add(pack);
    const flap = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.05), new THREE.MeshStandardMaterial({ color: 0x55432a, roughness: 0.9 }));
    flap.position.set(0, 0.5, -0.34);
    hips.add(flap);
    // rouleau de carte
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.36, 8), new THREE.MeshStandardMaterial({ color: 0xd8c9a0 }));
    roll.rotation.z = Math.PI / 2;
    roll.position.set(0, 0.58, -0.3);
    hips.add(roll);
  }

  parts.hips = hips;
  parts.group = g;
  return { group: g, parts };
}

function buildHat(type, accent) {
  const grp = new THREE.Group();
  grp.position.y = 0.18;
  switch (type) {
    case 'cap': {
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: accent, roughness: 0.7 }));
      cap.scale.set(1, 0.7, 1);
      grp.add(cap);
      const brim = new THREE.Mesh(new THREE.CircleGeometry(0.14, 16),
        new THREE.MeshStandardMaterial({ color: accent, roughness: 0.7, side: THREE.DoubleSide }));
      brim.rotation.x = -Math.PI / 2.2;
      brim.position.set(0, 0.02, 0.13);
      grp.add(brim);
      break;
    }
    case 'tricorne': {
      const mat = new THREE.MeshStandardMaterial({ color: 0x1a1208, roughness: 0.8 });
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.13, 0.12, 10), mat);
      crown.position.y = 0.05;
      grp.add(crown);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.03, 3), mat);
      grp.add(brim);
      break;
    }
    case 'helmet': {
      const mat = new THREE.MeshStandardMaterial({ color: 0x3a3f33, roughness: 0.5, metalness: 0.4 });
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.7), mat);
      grp.add(dome);
      break;
    }
    case 'monk': {
      const hood = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 10, 0, Math.PI * 2, 0, Math.PI / 1.6),
        new THREE.MeshStandardMaterial({ color: 0x4a3f2a, roughness: 0.95 }));
      hood.scale.set(1, 1.1, 1.15);
      hood.position.y = -0.02;
      grp.add(hood);
      break;
    }
  }
  return grp;
}

// Anime un avatar : phase = avancement du cycle, intensity = 0..1 (immobile->course)
export function animateHumanoid(parts, phase, intensity, dt, onBike = false) {
  const swing = Math.sin(phase) * 0.7 * intensity;
  const swing2 = Math.sin(phase + Math.PI) * 0.7 * intensity;
  if (onBike) {
    // pédalage : jambes tournent, buste penché
    parts.legL.rotation.x = Math.sin(phase) * 0.8 + 0.3;
    parts.legR.rotation.x = Math.sin(phase + Math.PI) * 0.8 + 0.3;
    parts.armL.rotation.x = 0.6;
    parts.armR.rotation.x = 0.6;
    parts.hips.rotation.x = 0.35;
    return;
  }
  parts.hips.rotation.x = 0;
  parts.legL.rotation.x = swing;
  parts.legR.rotation.x = swing2;
  parts.armL.rotation.x = swing2 * 0.9;
  parts.armR.rotation.x = swing * 0.9;
  // léger ballant + respiration au repos
  const breathe = Math.sin(phase * 0.3) * 0.02 * (1 - intensity);
  parts.head.rotation.z = Math.sin(phase) * 0.04 * intensity;
  parts.hips.position.y = 0.85 + Math.abs(Math.sin(phase)) * 0.05 * intensity + breathe;
}
