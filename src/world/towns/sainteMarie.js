// Gaule romaine (IIᵉ siècle) — le vicus de Sainte-Marie, sur la côte sud.
// Decumanus pavé et cardo descendant vers la jetée, place du marché avec
// statue de Mercure et borne milliaire, taberna à comptoir maçonné,
// boulangerie, entrepôt (horreum) du négociant, poste de douane (statio),
// villa à péristyle et sa mosaïque, vignes, salines, et ancien sanctuaire
// gaulois devenu fanum. Inscriptions électorales peintes sur les murs.

import * as THREE from 'three';
import { MAT, flat } from '../materials.js';
import { box, gableRoofGeometry } from '../builder.js';
import { buildCharacter } from '../../characters/rig.js';
import { look } from '../../characters/wardrobe.js';

const PI = Math.PI;

function column(h = 3.4) {
  const g = new THREE.Group();
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.29, h, 12), MAT.stonePale());
  shaft.position.y = h / 2 + 0.2;
  g.add(shaft);
  const base = new THREE.Mesh(box(0.7, 0.2, 0.7), MAT.stonePale());
  base.position.y = 0.1;
  g.add(base);
  const cap = new THREE.Mesh(box(0.66, 0.22, 0.66), MAT.stonePale());
  cap.position.y = h + 0.3;
  g.add(cap);
  return g;
}

// Statue de marbre : un personnage dont on remplace les étoffes par de la pierre
function statue(spec, action) {
  const c = buildCharacter({ ...spec, action });
  c.setAction(action);
  for (let i = 0; i < 20; i++) c.update(0.05);
  const marble = MAT.stonePale();
  c.group.traverse((o) => { if (o.isMesh) { o.material = marble; } });
  return c.group;
}

export default {
  radius: 40,
  build(tb, flags) {
    tb.spot('spawn', 2, 12, { rot: PI });
    const pave = MAT.paveRoman();

    // voies : decumanus (est-ouest) et cardo (vers la mer)
    tb.street([[-38, 0], [0, 0], [38, 0]], 4.6, pave);
    tb.street([[0, -26], [0, 0], [0, 18], [0, 27]], 4.2, pave);
    tb.street([[-38, 0], [-52, 2], [-70, 4]], 3.2, MAT.dirt());
    tb.plaza(0, 7, 18, 10, pave);
    tb.spot('forum', 0, 7);

    // statue de Mercure, dieu du commerce, et borne milliaire
    const ped = new THREE.Mesh(box(1.4, 1.5, 1.4), MAT.stonePale());
    tb.put(ped, -5, 8, { y: 0.75, col: 1.0 });
    const merc = statue(look('antiquite', 'merchant', { hair: { style: 'curly', color: 0xffffff }, outfit: { robe: null, toga: null, tunic: { c: 0xffffff, len: 0.45, flare: 0.5 }, cape: { c: 0xffffff, len: 0.7 } }, hat: { type: 'pileus', c: 0xffffff }, props: { right: 'staff', left: null } }), 'point');
    tb.put(merc, -5, 8, { y: 1.5, rot: PI / 2 });
    tb.spot('statue', -3.4, 8.2);
    const mile = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 1.9, 12), MAT.stonePale());
    tb.put(mile, 3.2, 1.8, { y: 0.95, col: 0.5 });
    tb.spot('borne', 3.2, 3.3, { rot: PI });
    tb.well(5, 9);

    // ---------- commerces du decumanus (côté nord, façades au sud) ----------
    const roman = { style: 'roman', roof: 'tiles', chimney: false, plinth: false, shutter: 0x6a4a2a, door: 0x5a3a20, roofPitch: 0.3 };
    tb.house(-9, -5.4, 0, {
      ...roman, w: 7, d: 6, floors: 1,
      shop: { id: 'taberna', name: 'Taberna d\'Aelia', kind: 'taberna', goods: ['amphorae'],
        sign: { text: 'TABERNA', sub: 'VINVM · GARVM · PANIS', style: 'roman', icon: 'amphora' }, hanging: { icon: 'wine', bg: '#6a3a1a' } },
    });
    tb.house(-17, -5.4, 0, {
      ...roman, w: 6, d: 6, floors: 1,
      shop: { id: 'pistrinum', name: 'Pistrinum (boulangerie)', kind: 'taberna', goods: ['bread'],
        sign: { text: 'PISTRINVM', sub: 'PANIS · FARINA', style: 'roman', icon: 'bread' } },
    });
    tb.house(9, -5.4, 0, {
      ...roman, w: 6.5, d: 6, floors: 1,
      shop: { id: 'faber', name: 'Faber (forgeron)', kind: 'forge', goods: ['anvil'],
        sign: { text: 'FABER', sub: 'FERRVM · AES', style: 'roman', icon: 'anvil' } },
    });
    tb.row(-36, -2.4, -21, -2.4, -1, { ...roman, twoFloorChance: 0, gap: 0.3 });
    tb.row(13, -2.4, 36, -2.4, -1, { ...roman, twoFloorChance: 0.1, gap: 0.3 });
    // côté sud, façades au nord
    tb.row(-36, 2.4, -10, 2.4, 1, { ...roman, twoFloorChance: 0, gap: 0.4 });
    tb.row(10, 2.4, 36, 2.4, 1, { ...roman, twoFloorChance: 0, gap: 0.4 });

    // inscriptions électorales peintes (programmata)
    tb.poster({ id: 'prog-lucius', kind: 'programma', title: 'L · POMPEIVM · VARRONEM', body: 'AED · O · V · F · SALINATORES · ROG', name: 'Inscription électorale',
      codex: 'vie-programmata', read: "« Lucius Pompeius Varro, édile : il en est digne, votez pour lui ! Les sauniers le demandent. »\n\nDans les villes romaines, on peignait sur les murs, en grandes lettres rouges, des appels à voter pour les candidats aux magistratures locales : les « programmata ». Les corporations (ici les sauniers, salinatores) soutenaient leur candidat. Pompéi en a conservé des centaines." },
    -27, -2.36, 0, { y: 2.0, scale: 0.95 });
    tb.poster({ id: 'prog-titus', kind: 'programma', title: 'T · AVFIDIVM · IIVIR', body: 'NAVTAE · ET · NEGOTIATORES · ROG', name: 'Inscription électorale',
      codex: 'vie-programmata', read: "« Titus Aufidius, duumvir : les bateliers et les négociants le demandent. »\n\nLes duumvirs étaient les deux premiers magistrats d'une cité romaine, élus chaque année. Les inscriptions électorales étaient souvent effacées puis repeintes d'une élection à l'autre." },
    24, 2.36, PI, { y: 2.0, scale: 0.95 });

    // ---------- entrepôt du négociant (horreum) ----------
    tb.house(18, -17, 0, { ...roman, w: 14, d: 8, floors: 1, door: false, roofPitch: 0.24 });
    const gate = new THREE.Mesh(box(2.6, 2.8, 0.12), MAT.woodDark());
    tb.put(gate, 18, -12.95, { y: 1.4 });
    tb.plaque({ text: 'HORREVM', sub: 'L · POMPEI · VARRONIS · NEGOTIATORIS', style: 'roman' }, 18, -12.9, 0, 3.4, 4.0);
    tb.spot('horreum', 18, -11, { rot: PI });
    tb.spot('caisses', 23, -11);
    for (let i = 0; i < 5; i++) tb.crate(25.5 + (i % 3) * 0.9, -12.2 + Math.floor(i / 3) * 0.9, 0.75);
    for (let i = 0; i < 6; i++) tb.amphora(12.5 + (i % 3) * 0.55, -11.6 - Math.floor(i / 3) * 0.6, (tb.rng() - 0.5) * 0.2);
    // charrette renversée sur la route de l'ouest (amphores tombées)
    const cart = new THREE.Group();
    const bed = new THREE.Mesh(box(2.4, 0.2, 1.4), MAT.wood());
    bed.position.y = 0.7;
    cart.add(bed);
    for (const sx of [-1, 1]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 0.12, 14), MAT.woodDark());
      wheel.rotation.x = PI / 2;
      wheel.position.set(0, 0.6, sx * 0.8);
      cart.add(wheel);
    }
    cart.rotation.z = 0.35;
    tb.put(cart, -48, 4.5, { col: 1.5 });
    tb.spot('route-ouest', -50, 2);

    // ---------- villa à péristyle de Claudia Severa ----------
    tb.house(-22, -20, 0, { ...roman, w: 16, d: 8, floors: 1, roofPitch: 0.24, shutter: 0x8a3a2a, doorX: 0 });
    for (const sx of [-1, 1]) tb.house(-22 + sx * 9.5, -12.5, sx > 0 ? -PI / 2 : PI / 2, { ...roman, w: 7, d: 4, floors: 1, roofPitch: 0.26, door: false });
    for (let i = 0; i < 6; i++) tb.put(column(3.2), -28.5 + i * 2.6, -15.4, { col: 0.35 });
    const portico = new THREE.Mesh(box(16.5, 0.3, 2.6), MAT.tiles());
    tb.put(portico, -22, -14.9, { y: 3.65 });
    // cour avec mosaïque (complète si restaurée)
    const mos = document.createElement('canvas');
    mos.width = mos.height = 256;
    const mc = mos.getContext('2d');
    mc.fillStyle = '#e8dcc0'; mc.fillRect(0, 0, 256, 256);
    mc.strokeStyle = '#2a2a2a'; mc.lineWidth = 8; mc.strokeRect(10, 10, 236, 236);
    mc.strokeStyle = '#8a2a1a'; mc.lineWidth = 4; mc.strokeRect(24, 24, 208, 208);
    for (let i = 0; i < 4; i++) {
      // dauphins stylisés
      mc.save(); mc.translate(128, 128); mc.rotate((i * PI) / 2);
      mc.fillStyle = '#2a4a8a';
      mc.beginPath(); mc.ellipse(0, -70, 38, 14, 0.3, 0, PI * 2); mc.fill();
      mc.beginPath(); mc.moveTo(30, -60); mc.lineTo(48, -48); mc.lineTo(44, -72); mc.closePath(); mc.fill();
      mc.restore();
    }
    mc.fillStyle = '#c83a2a'; mc.beginPath(); mc.arc(128, 128, 22, 0, PI * 2); mc.fill();
    if (!flags.ant_mosaique) {
      mc.fillStyle = '#8a7a60';
      for (let i = 0; i < 9; i++) { mc.beginPath(); mc.arc(60 + tb.rng() * 140, 60 + tb.rng() * 140, 10 + tb.rng() * 16, 0, PI * 2); mc.fill(); }
    }
    const mtex = new THREE.CanvasTexture(mos);
    mtex.colorSpace = THREE.SRGBColorSpace;
    const mosaic = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), new THREE.MeshStandardMaterial({ map: mtex, roughness: 0.6 }));
    mosaic.rotation.x = -PI / 2;
    tb.put(mosaic, -22, -10.5, { y: 0.07, shadow: false });
    tb.spot('mosaique', -22, -7.2, { rot: PI });
    tb.spot('villa', -22, -12.3, { rot: PI });
    tb.wall(-31, -8, -25.6, -8, 1.4, 0.5, MAT.plasterRoman());
    tb.wall(-18.4, -8, -13, -8, 1.4, 0.5, MAT.plasterRoman());

    // vignes de la villa
    tb.vineRows(-40, 9, 6, 16);
    tb.spot('vigne', -34, 18);

    // ---------- poste de douane et jetée ----------
    tb.house(7.5, 21, -PI / 2, { ...roman, w: 5, d: 5, floors: 1, shutter: 0x8a2a22 });
    tb.plaque({ text: 'STATIO', sub: 'PORTORIVM · QVADRAGESIMA GALLIARVM', style: 'roman' }, 4.94, 21, -PI / 2, 2.9, 2.6);
    tb.spot('statio', 3.2, 21, { rot: PI / 2 });
    tb.poster({ id: 'edictum', kind: 'notice', font: 'roman', title: 'EDICTVM PORTORII', name: 'Le tarif de la douane',
      body: 'QVADRAGESIMA GALLIARVM\nVINVM · SAL · GARVM · LANA\nPRO MERCE · II S · ET · SEMIS · IN · C', footer: 'T · AVFIDIVS · STATIONARIVS', codex: 'vie-portorium',
      read: "« Le quarantième des Gaules : sur toute marchandise — vin, sel, garum, laine — deux et demi pour cent de sa valeur. »\n\nLa Quadragesima Galliarum était une taxe douanière de 2,5 % prélevée sur les marchandises qui entraient ou sortaient des provinces gauloises. Des postes de douane (stationes) jalonnaient les ports et les routes ; les fonctionnaires y contrôlaient les cargaisons et les tablettes de déclaration." },
    1.8, 18.5, PI / 2, { mount: 'board', y: 1.4 });
    // jetée de pierre jusqu'à la mer
    for (let z = 26; z <= 46; z += 4) {
      const blk = new THREE.Mesh(box(3.6, 3.2, 4.2), MAT.stone());
      blk.position.set(0, -0.6, z);
      tb.group.add(blk);
      tb.colL(-2.2, z, 0.6); tb.colL(2.2, z, 0.6);
    }
    const deck = new THREE.Mesh(box(3.6, 0.15, 22), MAT.paveRoman());
    deck.position.set(0, 1.05, 36);
    tb.group.add(deck);
    tb.spot('jetee', 0, 30, { rot: 0 });
    tb.boat(4.5, 40, 0.1, 'roman');
    tb.boat(-4.5, 34, -0.2, 'row', { boardable: true, label: 'Emprunter la barque' });
    for (let i = 0; i < 6; i++) tb.amphora(1.2 + (i % 2) * 0.6, 26.5 + Math.floor(i / 2) * 0.6, 0);
    tb.spot('pecheur', -2.8, 27.5, { rot: 0 });

    // ---------- salines de Quintus, à l'est ----------
    for (let r = 0; r < 3; r++) {
      for (let c = 0; c < 3; c++) {
        const px = 41 + c * 6.5, pz = 5 + r * 6.5;
        const pond = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 5.6), MAT.brine());
        pond.rotation.x = -PI / 2;
        pond.position.set(px, tb.hL(px, pz) + 0.05, pz);
        tb.dyn.add(pond);
        tb.wall(px - 3, pz - 3.1, px + 3, pz - 3.1, 0.4, 0.4, MAT.dirt(), { col: false });
        tb.wall(px - 3.1, pz - 3, px - 3.1, pz + 3, 0.4, 0.4, MAT.dirt(), { col: false });
        tb.spot(`saline${r * 3 + c}`, px, pz + 2.4);
      }
    }
    for (let i = 0; i < 3; i++) tb.saltHeap(58, 6 + i * 5, 1.1);
    tb.spot('salines', 44, 1.5);

    // ---------- ancien sanctuaire gaulois devenu fanum ----------
    const fanum = new THREE.Group();
    const cella = new THREE.Mesh(box(4.2, 6, 4.2, 3), MAT.plasterRoman());
    cella.position.y = 2.8;
    fanum.add(cella);
    const croof = new THREE.Mesh(new THREE.ConeGeometry(3.6, 2.2, 4), MAT.tiles());
    croof.rotation.y = PI / 4;
    croof.position.y = 6.9;
    fanum.add(croof);
    const cdoor = new THREE.Mesh(box(1.4, 2.4, 0.1), flat(0x1a1410, 1));
    cdoor.position.set(0, 1.2, 2.12);
    fanum.add(cdoor);
    // galerie à colonnes autour de la cella
    for (let k = 0; k < 12; k++) {
      const side = Math.floor(k / 3), t = (k % 3) - 1;
      const pos = [[t * 2.6, 4.1], [4.1, t * 2.6], [t * 2.6, -4.1], [-4.1, t * 2.6]][side];
      const col = column(2.6);
      col.position.set(pos[0], 0, pos[1]);
      fanum.add(col);
    }
    const groof = new THREE.Mesh(box(9.2, 0.25, 9.2), MAT.tiles());
    groof.position.y = 3.1;
    fanum.add(groof);
    tb.put(fanum, 28, -24, { col: 0 });
    tb.colL(28, -24, 3.4);
    for (const [dx, dz] of [[-4.1, -4.1], [4.1, -4.1], [-4.1, 4.1], [4.1, 4.1]]) tb.colL(28 + dx, -24 + dz, 0.4);
    // la vieille pierre sacrée des Santons, devant le fanum
    const sacred = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.7), MAT.stoneDark());
    sacred.rotation.y = 0.4;
    tb.put(sacred, 28, -17.5, { y: 0.7, col: 0.6 });
    tb.spot('fanum', 28, -15.6, { rot: PI });
    tb.spot('pierre-sacree', 28, -16.2);
    tb.street([[0, -6], [10, -14], [24, -17]], 2.0, MAT.dirtPale());

    // arbres : ormes, figuiers, pins parasols
    for (const [x, z] of [[-12, 14], [12, 13], [-30, 28], [22, 26], [36, -10], [-40, -12], [40, -26]]) tb.tree(x, z, tb.rng() < 0.5 ? 'elm' : 'fig', 0.8 + tb.rng() * 0.4);

    // chemins des figurants
    tb.path('decumanus', [[-30, 1.2], [30, 1.2], [30, -1.2], [-30, -1.2]]);
    tb.path('port', [[1.5, 5], [1.5, 26], [-1.5, 26], [-1.5, 5]]);
  },
};
