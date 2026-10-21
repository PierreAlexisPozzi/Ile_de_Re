// Néolithique (vers 4500 av. J.-C.) — le campement du clan de la Pointe, aux
// Portes, au bord du Fier d'Ars. Huttes rondes de branchages et de torchis
// couvertes de roseaux, longue maison de la potière, foyer central, séchoirs
// à poissons, atelier de taille du silex, totem et peaux peintes, dolmen à
// l'est et alignement de menhirs tourné vers le couchant.

import * as THREE from 'three';
import { MAT, flat } from '../materials.js';
import { box } from '../builder.js';

const PI = Math.PI;

function hut(tb, x, z, r = 2.1, h = 1.5) {
  const g = new THREE.Group();
  const wall = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.08, h, 12, 1, true), flat(0x7a6448, 0.95, 0, { side: THREE.DoubleSide }));
  wall.position.y = h / 2;
  g.add(wall);
  // torchis : bandes plus claires
  const daub = new THREE.Mesh(new THREE.CylinderGeometry(r * 1.01, r * 1.09, h * 0.5, 12, 1, true), MAT.dirtPale());
  daub.position.y = h * 0.3;
  g.add(daub);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.35, r * 1.25, 14, 1, true), MAT.thatch());
  roof.position.y = h + r * 0.6;
  g.add(roof);
  const top = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 8), MAT.woodDark());
  top.position.y = h + r * 1.3;
  g.add(top);
  const door = new THREE.Mesh(box(0.9, 1.3, 0.2), flat(0x1a1410, 1));
  door.position.set(0, 0.65, r * 1.02);
  g.add(door);
  const rot = Math.atan2(-x, -z);   // porte tournée vers le foyer
  tb.put(g, x, z, { rot, col: r * 1.05 });
  return g;
}

export default {
  radius: 34,
  build(tb, flags) {
    tb.spot('spawn', 2, 22, { rot: PI });

    // sentiers de terre battue
    const path = MAT.dirtPale();
    tb.street([[2, 26], [1, 14], [0, 6]], 2.0, path);
    tb.street([[0, 2], [-2, -8], [-4, -15]], 1.8, path);
    tb.street([[4, 2], [14, -2], [22, -4]], 1.6, path);
    tb.street([[-4, 3], [-16, 1], [-26, -2]], 1.6, path);
    tb.street([[2, 14], [8, 24], [12, 36]], 1.4, path);

    // foyer central
    tb.fire(0, 4, 1.1);
    tb.spot('foyer', 0, 7, { rot: PI });
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * PI * 2 + 0.3;
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.25, 1.6, 8), MAT.woodDark());
      log.rotation.z = PI / 2;
      tb.put(log, Math.cos(a) * 3.2, 4 + Math.sin(a) * 3.2, { y: 0.2, rot: -a });
    }
    tb.spot('banc-foyer', 2.4, 6.2);

    // huttes en cercle
    const huts = [[-11, 0], [-9, 11], [9, 12], [12, 1], [-6, -7], [7, -7]];
    huts.forEach(([x, z]) => hut(tb, x, z, 2.0 + tb.rng() * 0.4));

    // longue maison de la potière (plan rectangulaire, toit de roseaux)
    tb.house(-18, 12, PI / 2, { w: 4.6, d: 9, floors: 1, style: 'old', roof: 'thatch', roofPitch: 0.6, plinth: false, chimney: false,
      door: 0x2a2018, shutter: 0x4a3a2a, closed: true, lit: false });
    tb.spot('potiere', -12.2, 12.5, { rot: -PI / 2 });
    tb.spot('four', -13, 17);
    const kiln = new THREE.Group();
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8, 0, PI * 2, 0, PI / 2), MAT.dirt());
    kiln.add(dome);
    const mouth = new THREE.Mesh(box(0.5, 0.4, 0.2), flat(0x1a1410, 1));
    mouth.position.set(0, 0.2, 0.85);
    kiln.add(mouth);
    tb.put(kiln, -13, 18.5, { col: 1 });
    for (let i = 0; i < 4; i++) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.35 + tb.rng() * 0.2, 9), flat(0x8a5a3a, 0.9));
      tb.put(pot, -15.2 + i * 0.5, 15.6, { y: 0.18 });
    }

    // atelier de taille du silex
    const anvil = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55, 0), MAT.stoneDark());
    anvil.scale.set(1.2, 0.6, 1);
    tb.put(anvil, -9, 6, { y: 0.25, col: 0.6 });
    for (let i = 0; i < 14; i++) {
      const flake = new THREE.Mesh(new THREE.TetrahedronGeometry(0.06, 0), flat(0x4a4a52, 0.35));
      tb.put(flake, -9 + (tb.rng() - 0.5) * 2, 6 + (tb.rng() - 0.5) * 2, { y: 0.03, shadow: false });
    }
    tb.spot('atelier', -7.6, 6.5, { rot: -PI / 2 });
    tb.spot('taille', -9, 7.3);

    // séchoirs à poissons et peaux tendues
    for (let i = 0; i < 3; i++) {
      const rack = new THREE.Group();
      for (const sx of [-1, 1]) {
        const post = new THREE.Mesh(box(0.1, 1.8, 0.1), MAT.wood());
        post.position.set(sx * 1.1, 0.9, 0);
        rack.add(post);
      }
      const bar = new THREE.Mesh(box(2.4, 0.08, 0.08), MAT.wood());
      bar.position.y = 1.7;
      rack.add(bar);
      for (let f = 0; f < 5; f++) {
        const fish = new THREE.Mesh(new THREE.SphereGeometry(0.07, 6, 5), flat(0xa8b0a8, 0.5, 0.2));
        fish.scale.set(0.6, 3, 0.5);
        fish.position.set(-0.9 + f * 0.45, 1.35, 0);
        rack.add(fish);
      }
      tb.put(rack, -6 + i * 4.5, -12, { rot: 0.1 * i, col: 0.8 });
    }
    tb.spot('sechoir', 2, -10, { rot: 0 });

    // totem et peaux peintes à l'entrée du campement
    const totem = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 4.2, 8), MAT.woodDark());
    pole.position.y = 2.1;
    totem.add(pole);
    for (let k = 0; k < 3; k++) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.06, 6, 12), flat([0x8a3a1a, 0xe8dcc0, 0x2a1a10][k], 0.8));
      ring.rotation.x = PI / 2;
      ring.position.y = 1.2 + k * 0.9;
      totem.add(ring);
    }
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), flat(0xe8dcc0, 0.7));
    skull.scale.set(0.8, 0.7, 1.3);
    skull.position.set(0, 4.3, 0.1);
    totem.add(skull);
    for (const sx of [-1, 1]) {
      const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 0.9, 5), flat(0xd8c8a8, 0.8));
      antler.position.set(sx * 0.3, 4.65, 0);
      antler.rotation.z = -sx * 0.6;
      totem.add(antler);
    }
    tb.put(totem, 3.5, 17, { col: 0.4 });
    tb.poster({ id: 'p-chasse', kind: 'hide', motifs: ['deer', 'spiral', 'hand'], name: 'Peau peinte : la grande chasse', codex: 'vie-neolithique',
      read: "Sur la peau tendue, à l'ocre rouge et au charbon : un cerf aux grands bois, une spirale, une main posée. Pour le clan, la main dit « nous étions là », la spirale dit le retour des saisons et des marées, et le cerf, la chasse qui nourrit l'hiver.\n\nAu Néolithique, les habitants de la côte atlantique sont à la fois chasseurs, pêcheurs, cueilleurs… et déjà paysans : ils sèment l'orge et le blé amidonnier, élèvent moutons et chèvres, et façonnent leurs premières poteries." },
    -1.5, 17.5, PI, { mount: 'board', y: 1.4 });
    tb.poster({ id: 'p-couchant', kind: 'hide', motifs: ['spiral', 'hand', 'spiral'], name: 'Peau peinte : la pierre du couchant', codex: 'lieu-menhirs',
      read: "Maëla a peint ici sept spirales en ligne, et sous la dernière, un demi-cercle rouge qui s'enfonce dans des vagues : le soleil qui meurt dans la mer. Toutes les spirales regardent vers lui.\n\nLes hommes du Néolithique orientaient souvent leurs pierres dressées vers le lever ou le coucher du soleil aux solstices : les menhirs servaient de calendrier, de repère et de lieu de rassemblement." },
    -21, 5.5, -PI / 2, { mount: 'post', y: 1.5 });

    // alignement de menhirs vers le couchant (ouest)
    const menhirs = [];
    for (let i = 0; i < 5; i++) {
      const x = -22 - i * 4.2, z = -1 - i * 0.6;
      const h = 2.4 + tb.rng() * 1.6 - i * 0.15;
      const m = new THREE.Mesh(new THREE.BoxGeometry(1.0, h, 0.8), MAT.stoneDark());
      m.position.set(x, tb.hL(x, z) + h / 2 - 0.2, z);
      m.rotation.y = 0.2 + tb.rng() * 0.3;
      m.castShadow = true;
      menhirs.push(m);
      // la troisième pierre a été renversée par l'étranger : elle reste animable
      if (i === 2 && !flags.menhir_up) {
        m.rotation.z = PI / 2 - 0.08;
        m.position.y = tb.hL(x, z) + 0.45;
        m.userData.noBatch = true;
        tb.dyn.add(m);
        tb.refs = { ...(tb.refs || {}), menhir: m, menhirH: h };
      } else tb.group.add(m);
      tb.colL(x, z, 0.8);
      tb.spot('menhir' + i, x + 1.6, z + 1.2);
    }
    tb.spot('menhirs', -30, 2.5);

    // dolmen à l'est, face à la mer
    const dol = new THREE.Group();
    for (const [sx, sz] of [[-1.3, -0.6], [1.3, -0.6], [-1.3, 0.8], [1.3, 0.8]]) {
      const up = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.1, 1.2), MAT.stoneDark());
      up.position.set(sx, 1.0, sz);
      dol.add(up);
    }
    const back = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.0, 0.6), MAT.stoneDark());
    back.position.set(0, 1.0, -1.4);
    dol.add(back);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(4.0, 0.75, 3.6), MAT.stoneDark());
    cap.position.y = 2.45;
    cap.rotation.z = 0.05;
    dol.add(cap);
    const mound = new THREE.Mesh(new THREE.SphereGeometry(3.5, 12, 8, 0, PI * 2, 0, PI / 2), MAT.dirt());
    mound.scale.set(1.3, 0.35, 1.2);
    mound.position.z = -2.4;
    dol.add(mound);
    tb.put(dol, 24, -6, { rot: PI, col: 0 });
    tb.colL(22.7, -6, 1);
    tb.colL(25.3, -6, 1);
    tb.colL(24, -4.6, 1.1);
    tb.spot('dolmen', 24, -9, { rot: 0 });

    // rivage : pirogue de Kern, plage aux silex et aux coquillages
    tb.boat(-3, -22, 0.2, 'pirogue', { boardable: true, label: 'Emprunter la pirogue de Kern' });
    tb.interactables[tb.interactables.length - 1].requires = 'pirogue_ok';
    tb.interactables[tb.interactables.length - 1].locked = "La pirogue de Kern fuit : elle n'est pas en état de naviguer.";
    tb.spot('rivage', -1, -15, { rot: PI });
    tb.spot('plage-est', 22, -15);
    tb.spot('plage-ouest', -16, -16);
    tb.spot('marais', -24, -13);
    for (let i = 0; i < 6; i++) tb.rock(28 + tb.rng() * 6, -13 - tb.rng() * 3, 0.5 + tb.rng() * 0.5);

    // quelques pins de la pointe (résine) et chênes autour du camp
    tb.tree(30, 10, 'pine', 1.0);
    tb.spot('pin1', 28.6, 10.6);
    tb.tree(-28, 16, 'pine', 0.9);
    tb.spot('pin2', -26.8, 16.4);
    tb.tree(14, 26, 'pine', 1.0);
    tb.spot('pin3', 12.6, 26.4);
    for (const [x, z] of [[-20, 24], [22, 22], [26, 30], [-30, 28], [-14, 30], [32, 2]]) tb.tree(x, z, 'oak', 0.9 + tb.rng() * 0.4);

    // la clairière de chasse, au sud dans la chênaie
    tb.spot('foret', 6, 30);
    tb.spot('trace1', 4, 32);
    tb.spot('trace2', 10, 40);
    tb.spot('trace3', 18, 46);
    tb.spot('clairiere', 24, 52);

    // aire de troc (peau étendue, poteries, poissons)
    const mat = new THREE.Mesh(box(2.4, 0.04, 1.6), flat(0x8a6a48, 1));
    tb.put(mat, 6, 9, { y: 0.03 });
    for (let i = 0; i < 3; i++) {
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.11, 0.3, 8), flat(0x8a5a3a, 0.9));
      tb.put(pot, 5.3 + i * 0.6, 8.6, { y: 0.17 });
    }
    tb.interact({ id: 'shop:troc', kind: 'shop', x: 6, z: 10.6, r: 2.2, label: 'Troquer au campement', shop: { id: 'troc', name: 'Troc du clan' } });

    // chemins des figurants
    tb.path('camp', [[-5, 9], [5, 9], [6, -2], [-5, -2]]);
    tb.path('rive', [[-10, -14], [8, -14], [16, -15], [-10, -15]]);
  },
};
