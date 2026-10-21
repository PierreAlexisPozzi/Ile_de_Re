// Moyen Âge (1190) — La Flotte, port de la côte nord. Les halles à charpente
// de bois, les maisons de pierre aux étals rabattus, l'église, le port et son
// quai, la tour de guet et son feu d'alarme, la palissade et sa porte, et à
// l'ouest l'abbaye cistercienne Notre-Dame des Châteliers en chantier :
// église, salle capitulaire, échafaudages, grue à roue et taille des pierres.

import * as THREE from 'three';
import { MAT, flat } from '../materials.js';
import { box, gableRoofGeometry } from '../builder.js';
import { hangingTexture } from '../../gfx/signs.js';

const PI = Math.PI;

export default {
  radius: 40,
  carves: [{ x0: -10, z0: -38, x1: 10, z1: -24, depth: -1.6 }],
  build(tb, flags) {
    tb.spot('spawn', 0, 18, { rot: PI });
    const pave = MAT.pave();
    const dirt = MAT.dirt();

    // rues : grand-rue est-ouest, rue du port vers le nord
    tb.street([[-34, 1], [0, 1], [34, 1]], 6.8, pave);
    tb.street([[0, 0], [0, -12], [0, -21]], 3.6, pave);
    tb.street([[0, 2], [0, 12], [0, 26]], 3.0, dirt);
    tb.street([[-34, 1], [-48, -1], [-62, -4]], 2.8, dirt);
    tb.plaza(0, -9, 22, 13, pave);
    tb.spot('place', 0, -4);

    // ---------- les halles médiévales ----------
    const halles = new THREE.Group();
    for (let ix = -2; ix <= 2; ix++) {
      for (let iz = -1; iz <= 1; iz++) {
        const post = new THREE.Mesh(box(0.32, 3.3, 0.32), MAT.woodDark());
        post.position.set(ix * 2.6, 1.65, iz * 2.8);
        halles.add(post);
        const base = new THREE.Mesh(box(0.55, 0.35, 0.55), MAT.stoneOld());
        base.position.set(ix * 2.6, 0.17, iz * 2.8);
        halles.add(base);
      }
    }
    for (const iz of [-1, 0, 1]) {
      const beam = new THREE.Mesh(box(11, 0.28, 0.28), MAT.woodDark());
      beam.position.set(0, 3.35, iz * 2.8);
      halles.add(beam);
    }
    const hroof = new THREE.Mesh(gableRoofGeometry(7.6, 12.4, 3.2, 0.7), [MAT.tilesOld(), MAT.woodDark()]);
    hroof.rotation.y = PI / 2;
    hroof.position.y = 3.45;
    halles.add(hroof);
    tb.put(halles, 0, -11, { col: 0 });
    for (let ix = -2; ix <= 2; ix++) for (const iz of [-1, 1]) tb.colL(ix * 2.6, -11 + iz * 2.8, 0.35);
    tb.spot('halles', 0, -6.6);
    // étals sous les halles
    const stall = (x, z, goods, keeperSpot) => {
      const g = new THREE.Group();
      const top = new THREE.Mesh(box(2.0, 0.08, 0.9), MAT.woodPale());
      top.position.y = 0.85;
      g.add(top);
      for (const [sx, sz] of [[-0.9, -0.35], [0.9, -0.35], [-0.9, 0.35], [0.9, 0.35]]) {
        const leg = new THREE.Mesh(box(0.08, 0.85, 0.08), MAT.wood());
        leg.position.set(sx, 0.42, sz);
        g.add(leg);
      }
      tb.put(g, x, z, { col: 0.9 });
      const gg = new THREE.Group();
      gg.position.set(x, tb.hL(x, z), z - 0.45);
      tb.group.add(gg);
      tb.goods(gg, goods, 0);
      if (keeperSpot) tb.spot(keeperSpot, x, z - 1.3, { rot: 0 });
    };
    stall(-3.9, -11.4, 'cloth', 'etal-laine');
    stall(0, -11.4, 'fish', 'etal-poisson');
    stall(3.9, -11.4, 'fruit', 'etal-fruits');
    tb.interact({ id: 'shop:halles', kind: 'shop', x: -3.9, z: -9.3, r: 2.0, label: 'Commercer — étal de la drapière', shop: { id: 'halles', name: 'Étal d\'Isabeau' } });
    tb.interact({ id: 'shop:poisson', kind: 'shop', x: 0, z: -9.3, r: 2.0, label: 'Commercer — étal du poissonnier', shop: { id: 'poissonnerie', name: 'Étal de Renaud' } });

    // proclamation clouée à un poteau des halles
    tb.poster({ id: 'oyez', kind: 'proclamation', title: 'Par ordre du sire de Mauléon', name: 'Proclamation du seigneur',
      body: "Que nul ne pêche ni ne vende poisson avant la cloche de prime. Que chaque feu fournisse un homme au guet de la tour. Que la dîme du sel soit portée à l'abbaye à la Saint-Michel.",
      footer: "Donné à La Flotte, l'an de grâce 1190", codex: 'vie-feodalite',
      read: "Au Moyen Âge, l'île de Ré dépend des seigneurs de Mauléon, vassaux des ducs d'Aquitaine — c'est-à-dire, depuis le mariage d'Aliénor d'Aquitaine avec Henri Plantagenêt (1152), des rois d'Angleterre. Les ordres du seigneur sont criés sur la place (« Oyez ! ») puis affichés.\n\nLa dîme est un impôt dû à l'Église : en principe le dixième des récoltes. À Ré, les moines des Châteliers percevaient notamment des droits sur le sel." },
    6.7, -8.6, 0, { mount: 'post', y: 1.5 });

    // ---------- maisons de pierre et boutiques de la grand-rue ----------
    const med = { style: 'stone', roof: 'tilesOld', shutter: 0x5a4a32, door: 0x4a3420, plinth: false, roofPitch: 0.5, lit: true };
    tb.house(-9, 7.6, PI, {
      ...med, w: 6, d: 6, floors: 2,
      shop: { id: 'boulanger', name: 'Le four banal', kind: 'etal', goods: ['bread'], hanging: { icon: 'bread', bg: '#5a3a20' } },
    });
    tb.house(9, 7.6, PI, {
      ...med, w: 6.5, d: 6, floors: 1,
      shop: { id: 'forge', name: 'Forge de Gautier', kind: 'forge', goods: ['anvil'], hanging: { icon: 'anvil', bg: '#3a3a40', text: 'Forge' } },
    });
    tb.house(-17, 7.6, PI, {
      ...med, w: 7, d: 6, floors: 2,
      shop: { id: 'taverne', name: 'Taverne Au Bon Port', kind: 'etal', goods: ['barrels'], hanging: { icon: 'ship', bg: '#2a3a5a' },
        sign: { text: 'Au Bon Port', sub: 'Taverne · vin d\'Aunis', style: 'gothic', icon: 'wine', y: 3.2 } },
    });
    tb.spot('forge-feu', 9, 11, { sound: 'forge' });
    // rangées mitoyennes : côté sud (façades au nord) et côté nord (façades au sud)
    tb.row(-34, 4.6, -20.5, 4.6, 1, { ...med, twoFloorChance: 0.5 });
    tb.row(12.5, 4.6, 34, 4.6, 1, { ...med, twoFloorChance: 0.5 });
    tb.row(-30, -2.6, -11.5, -2.6, -1, { ...med, twoFloorChance: 0.4 });
    tb.row(11.5, -2.6, 30, -2.6, -1, { ...med, twoFloorChance: 0.4 });
    tb.well(-8, -2);

    // petite église romane (Sainte-Catherine)
    const eg = new THREE.Group();
    const nave = new THREE.Mesh(box(7, 7, 14, 3), MAT.stoneOld());
    nave.position.y = 3.2;
    eg.add(nave);
    const nr = new THREE.Mesh(gableRoofGeometry(7, 14, 2.6), [MAT.tilesOld(), MAT.stoneOld()]);
    nr.position.y = 6.7;
    eg.add(nr);
    const bell = new THREE.Mesh(box(4, 12, 4, 3), MAT.stoneOld());
    bell.position.set(0, 5.8, 8.5);
    eg.add(bell);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(2.9, 4, 4), MAT.tilesOld());
    spire.rotation.y = PI / 4;
    spire.position.set(0, 13.8, 8.5);
    eg.add(spire);
    const portal = new THREE.Mesh(box(1.8, 3, 0.2), flat(0x1a1410, 1));
    portal.position.set(0, 1.5, 10.55);
    eg.add(portal);
    tb.put(eg, 22, 16, { rot: 0, col: 0 });
    tb.footprint(22, 16, 7, 14, 0);
    tb.colL(22, 24.5, 2.6);
    tb.door({ x: 22, z: 16, rot: 0, front: 10.6, dx: 0, type: 'church', name: 'Église Sainte-Catherine' });
    tb.spot('eglise', 22, 28.6, { rot: 0 });
    tb.spot('cloche', 22, 28.6);

    // ---------- le port ----------
    // quais de pierre autour du bassin creusé (x -10..10, z -38..-24)
    tb.quayEdge(-10, -24, -2.5, -24, tb.h);
    tb.quayEdge(2.5, -24, 10, -24, tb.h);
    tb.quayEdge(-10, -24, -10, -38, tb.h);
    tb.quayEdge(10, -24, 10, -38, tb.h);
    for (const x of [-10.4, 10.4]) for (let z = -37; z <= -25; z += 3) tb.colL(x, z, 0.7);
    tb.spot('quai', -6, -21.5, { rot: PI });
    tb.spot('quai-est', 6, -21.5, { rot: PI });
    for (let i = 0; i < 4; i++) tb.bollard(-9 + i * 6, -22.8);
    tb.boat(-4.5, -31, 0.2, 'sail');
    tb.boat(4.5, -33, -0.15, 'row', { boardable: true, label: 'Emprunter la barque' });
    tb.boat(20, -44, 0.6, 'sail');
    tb.crate(-12, -20); tb.crate(-12.8, -19.2, 0.5); tb.barrel(12, -20); tb.barrel(13, -19.5);
    tb.spot('ballots', -14, -18);

    // tour de guet et feu d'alarme, à l'entrée du port
    const tg = new THREE.Group();
    const tt = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.6, 10, 12), MAT.stoneOld());
    tt.position.y = 5;
    tg.add(tt);
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * PI * 2;
      const m = new THREE.Mesh(box(0.7, 0.8, 0.5), MAT.stoneOld());
      m.position.set(Math.cos(a) * 2.1, 10.3, Math.sin(a) * 2.1);
      m.rotation.y = -a;
      tg.add(m);
    }
    const brazier = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.4, 0.6, 10), MAT.iron());
    brazier.position.y = 10.4;
    tg.add(brazier);
    tb.put(tg, 15, -24, { col: 2.7 });
    tb.spot('tour-guet', 15, -20.8, { rot: PI });
    tb.spot('fanal', 15, -20.8);

    // palissade de pieux et porte de la ville, au sud
    for (let x = -30; x <= 30; x += 1.0) {
      if (Math.abs(x) < 2.2) continue;
      const pk = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 2.8, 6), MAT.woodDark());
      tb.put(pk, x, 30 + Math.sin(x * 0.4) * 0.3, { y: 1.3 });
    }
    for (let x = -30; x <= 30; x += 2.2) if (Math.abs(x) > 2.2) tb.colL(x, 30, 0.6);
    const gateL = new THREE.Mesh(box(2.0, 2.6, 0.18), MAT.wood());
    tb.put(gateL, flags.med_porte ? -1.1 : -2.1, 30.2, { y: 1.3, rot: flags.med_porte ? 0 : -1.2 });
    tb.spot('porte', 0, 27.5, { rot: 0 });
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(box(0.5, 3.6, 0.5), MAT.woodDark());
      tb.put(post, sx * 2.3, 30, { y: 1.8, col: 0.4 });
    }

    // ---------- l'abbaye des Châteliers en chantier (à l'ouest) ----------
    const ab = new THREE.Group();
    const church = new THREE.Mesh(box(9, 11, 18, 3), MAT.stoneOld());
    church.position.set(0, 5.2, 0);
    ab.add(church);
    const facade = new THREE.Mesh(box(10, 13, 1.2, 3), MAT.stoneOld());
    facade.position.set(0, 6.2, 9.5);
    ab.add(facade);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.4, 18), flat(0x223240, 0.3, 0.3));
    rose.rotation.x = PI / 2;
    rose.position.set(0, 8.4, 10.2);
    ab.add(rose);
    const ogive = new THREE.Mesh(box(2.2, 3.8, 0.5), flat(0x14100c, 1));
    ogive.position.set(0, 1.9, 10.2);
    ab.add(ogive);
    const gab = new THREE.Mesh(new THREE.ConeGeometry(5.6, 3.6, 3), MAT.stoneOld());
    gab.rotation.y = PI / 2;
    gab.scale.z = 0.22;
    gab.position.set(0, 14.4, 9.5);
    ab.add(gab);
    // le toit n'est posé que sur la moitié de la nef (chantier)
    const half = new THREE.Mesh(gableRoofGeometry(9, 9, 3.2), [MAT.tilesOld(), MAT.stoneOld()]);
    half.position.set(0, 10.7, 4.5);
    ab.add(half);
    for (let k = 0; k < 4; k++) {
      const truss = new THREE.Mesh(box(9.4, 0.25, 0.25), MAT.wood());
      truss.position.set(0, 10.9, -1.5 - k * 2.2);
      ab.add(truss);
    }
    // salle capitulaire (en construction) au sud de l'église
    const sc = new THREE.Mesh(box(7, 3.4, 7, 3), MAT.stoneOld());
    sc.position.set(8.5, 1.6, -4);
    ab.add(sc);
    for (const sx of [-1, 1]) {
      const pil = new THREE.Mesh(box(0.7, 4.5, 0.7), MAT.stonePale());
      pil.position.set(8.5 + sx * 1.6, 2.25, 0);
      ab.add(pil);
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.35, 6, 12, PI), MAT.stonePale());
    arch.position.set(8.5, 4.4, 0);
    ab.add(arch);
    const key = new THREE.Mesh(box(0.5, 0.6, 0.6), MAT.stonePale());
    key.position.set(8.5, 6.1, 0);
    ab.add(key);
    tb.put(ab, -40, -16, { col: 0 });
    tb.footprint(-40, -16, 9, 18, 0);
    tb.footprint(-40, -6.2, 10, 1.2, 0);
    tb.colL(-31.5, -20, 3.4);
    tb.colL(-33.1, -16, 0.5); tb.colL(-29.9, -16, 0.5);
    tb.spot('abbaye', -40, -3.8, { rot: 0 });
    tb.spot('cle-voute', -31.5, -14);
    tb.spot('capitulaire', -31.5, -13.2, { rot: 0 });
    tb.scaffolding(-40, -26.4, 6, 9, 0);
    tb.scaffolding(-34.2, -18, 3.2, 7.2, PI / 2);
    // grue à roue (cage d'écureuil)
    const crane = new THREE.Group();
    const mast = new THREE.Mesh(box(0.35, 9, 0.35), MAT.woodDark());
    mast.position.y = 4.5;
    crane.add(mast);
    const jib = new THREE.Mesh(box(0.25, 0.25, 6), MAT.woodDark());
    jib.position.set(0, 8.6, 2.6);
    crane.add(jib);
    const wheel = new THREE.Mesh(new THREE.TorusGeometry(1.6, 0.12, 6, 18), MAT.wood());
    wheel.position.set(0.9, 1.7, 0);
    wheel.rotation.y = PI / 2;
    crane.add(wheel);
    const rope = new THREE.Mesh(box(0.04, 4.6, 0.04), flat(0xb8a878, 0.9));
    rope.position.set(0, 6.3, 5.4);
    crane.add(rope);
    const block = new THREE.Mesh(box(0.9, 0.7, 0.9), MAT.stonePale());
    block.position.set(0, 3.6, 5.4);
    crane.add(block);
    tb.put(crane, -48, -6, { rot: PI / 2, col: 1.4 });
    tb.spot('grue', -46, -4.5, { rot: -PI / 2 });
    // tas de pierres de taille et loge des tailleurs
    for (let i = 0; i < 8; i++) {
      const st = new THREE.Mesh(box(0.9, 0.55, 0.65), MAT.stonePale());
      tb.put(st, -54 + (i % 4) * 1.1, 2 + Math.floor(i / 4) * 0.9, { y: 0.28, rot: tb.rng() * 0.3 });
    }
    tb.colL(-52.4, 2.5, 2.2);
    tb.spot('carriere', -52, 5.2, { rot: PI });
    tb.house(-58, -10, PI / 2, { ...med, w: 4.5, d: 3.5, floors: 1, roofPitch: 0.4, chimney: false, shutter: 0x4a3a2a });
    tb.spot('loge', -55.2, -10, { rot: PI / 2 });
    // jardin des simples de l'infirmerie
    for (let r = 0; r < 3; r++) {
      const bed = new THREE.Mesh(box(4, 0.25, 1.2), MAT.dirt());
      tb.put(bed, -48, 12 + r * 2, { y: 0.12 });
      for (let k = 0; k < 6; k++) {
        const pl = new THREE.Mesh(new THREE.IcosahedronGeometry(0.22, 0), flat([0x5a8a3a, 0x8a9a5a, 0x6a7a9a][r], 0.9));
        tb.put(pl, -49.6 + k * 0.65, 12 + r * 2, { y: 0.35 });
      }
    }
    tb.spot('jardin', -44.5, 14, { rot: -PI / 2 });
    tb.spot('scriptorium', -33.4, -3.6);

    // champs, vignes et arbres
    tb.vineRows(18, -18, 5, 10);
    for (const [x, z] of [[-14, 22], [14, 22], [28, -8], [-24, 26], [32, 24], [-58, 18]]) tb.tree(x, z, 'oak', 0.8 + tb.rng() * 0.4);

    // chemins des figurants
    tb.path('grandrue', [[-28, 3.2], [28, 3.2], [28, 0.8], [-28, 0.8]]);
    tb.path('port', [[-1.5, -4], [-1.5, -20], [1.5, -20], [1.5, -4]]);
    tb.path('chantier', [[-50, -2], [-44, -2], [-44, 4], [-50, 4]]);
  },
};

export { hangingTexture };
