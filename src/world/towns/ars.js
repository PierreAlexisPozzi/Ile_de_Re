// XIXᵉ siècle (1862) — Ars-en-Ré sous le Second Empire. Le bourg des sauniers :
// la Grande Rue et ses boutiques, la place de l'église Saint-Étienne et son
// clocher noir et blanc (amer des marins), la mairie au drapeau tricolore,
// l'école communale, le port au bout de son chenal avec les gabarres de sel,
// le bureau des Douanes impériales, le magasin à sel, et à l'ouest les marais
// salants : œillets, bossis, mulons de sel, cabane de saunier et ânes en culotte.

import * as THREE from 'three';
import { MAT, flat } from '../materials.js';
import { box, gableRoofGeometry } from '../builder.js';

const PI = Math.PI;

function tricolor() {
  const c = document.createElement('canvas');
  c.width = 192; c.height = 128;
  const ctx = c.getContext('2d');
  ['#1e3a8a', '#f4f2ec', '#c8241e'].forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(i * 64, 0, 64, 128); });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default {
  radius: 44,
  // le chenal du port d'Ars, creusé jusqu'au Fier
  carves: [
    { x0: -9, z0: -30, x1: 9, z1: -21 },
    { x0: -3.5, z0: -56, x1: 3.5, z1: -29 },
  ],
  build(tb, flags) {
    tb.spot('spawn', 0, 44, { rot: PI });
    const pave = MAT.pave();
    const dirt = MAT.dirtPale();
    const top = tb.h;
    const xix = { style: 'whitewash', roof: 'tiles', plinth: 0x3a3a3a, shutter: 0x4f7f5f, door: 0x3f6a52, roofPitch: 0.36, flowers: true };

    // ---------- rues ----------
    tb.street([[0, 48], [0, 30], [0, 12], [0, -4], [0, -18]], 5.0, pave);
    tb.street([[-40, 12], [-20, 12], [0, 12], [20, 12], [38, 12]], 4.0, pave);
    tb.street([[-40, 12], [-44, 4], [-44, -8]], 3.0, dirt);       // chemin des marais
    tb.plaza(7.2, -4, 9.6, 14, pave);
    tb.plaza(-3, -19.2, 54, 3.8, pave);                          // quai
    tb.spot('entree', 2.6, 40, { rot: PI });
    tb.spot('place', 6, -2);
    tb.spot('croisement', -3.6, 10.2);

    // ---------- le port : quais, chenal, gabarres ----------
    tb.quayEdge(-30, -21.1, -9, -21.1, top);
    tb.quayEdge(9, -21.1, 26, -21.1, top);
    tb.quayEdge(-9, -21.1, -9, -30, top);
    tb.quayEdge(9, -21.1, 9, -30, top);
    tb.quayEdge(-9, -30, -3.5, -30, top);
    tb.quayEdge(3.5, -30, 9, -30, top);
    for (const x of [-3.9, 3.9]) for (let z = -54; z <= -32; z += 3.2) tb.colL(x, z, 0.5);
    for (let i = 0; i < 5; i++) tb.bollard(-26 + i * 12.5, -20.6);
    tb.spot('sainte-anne', -4.5, -25.5);           // la gabarre de Borel (animée par l'histoire)
    tb.boat(4.8, -26.5, -0.08, 'gabarre');
    tb.boat(0, -40, PI / 2 + 0.05, 'canot');
    tb.boat(-6.5, -28.6, 0.2, 'row', { boardable: true, label: 'Prendre la barque' });
    tb.spot('gabarre', -4.6, -19.4, { rot: PI });
    tb.spot('quai', 4.6, -19.4, { rot: PI });
    tb.spot('quai-ouest', -22, -19.4, { rot: PI });
    for (let i = 0; i < 4; i++) tb.sack(-1.2 + (i % 2) * 0.6, -18.2 - Math.floor(i / 2) * 0.5);
    tb.barrel(17.4, -19.4);
    tb.barrel(18.2, -19.0);

    // maisons du quai (façades au nord, sur le port)
    tb.house(-25, -14, PI, {
      ...xix, w: 7, d: 6.4, floors: 2, style: 'grey', shutter: 0x4a5560, flowers: false,
      shop: { id: 'douane', name: 'Bureau des Douanes', kind: 'vitrine', color: 0x2a3a2a, goods: [],
        sign: { text: 'DOUANES IMPÉRIALES', sub: 'Bureau d\'Ars', style: 'enamel', bg: '#1e3a6a', fg: '#f4f2ec' } },
    });
    tb.house(-14, -14, PI, {
      ...xix, w: 9, d: 6.6, floors: 2, style: 'cream', quoins: true, shutter: 0x6a6a6a, flowers: false,
      shop: { id: 'lescure', name: 'Lescure & Cie', kind: 'vitrine', color: 0x3a2a1a, goods: ['salt', 'sacks'],
        sign: { text: 'E. LESCURE & Cie', sub: 'Négoce de sels en gros · Expéditions', style: 'painted', bg: '#2a2018', fg: '#e8d090', icon: 'salt' } },
    });
    tb.house(9, -14.5, PI, { ...xix, w: 11, d: 6, floors: 1, style: 'old', roof: 'tilesOld', flowers: false, door: 0x5a4a32, doorX: 0 });
    tb.plaque({ text: 'MAGASIN À SEL', sub: 'Lescure & Cie', style: 'painted', bg: '#e8e0c8', fg: '#2a2018' }, 9, -17.55, PI, 2.9, 3.2);
    tb.saltHeap(14, -18.3, 0.55);
    tb.spot('magasin', 9, -19.2, { rot: PI });
    tb.house(22, -14, PI, {
      ...xix, w: 6, d: 6, floors: 1, shutter: 0x2a4a7a, flowers: false,
      shop: { id: 'bureau-port', name: 'Bureau du port', kind: 'vitrine', color: 0x2a3a5a, goods: [],
        sign: { text: 'BUREAU DU PORT', sub: 'Registre des passages', style: 'painted', bg: '#f0ead8', fg: '#1e2a4a', icon: 'anchor' } },
    });
    tb.spot('registre', 22, -18.4, { rot: PI });

    // ---------- Grande Rue : les commerces ----------
    const shopW = { ...xix, w: 6, d: 7, floors: 2, twoFloorChance: 1 };
    tb.house(-6, 18, PI / 2, {
      ...shopW, shutter: 0x6a4a2a,
      shop: { id: 'epicerie', name: 'Épicerie Rivaud', kind: 'vitrine', color: 0x5a3a1a, goods: ['sacks', 'pots'], awning: 0x8a2a22,
        sign: { text: 'ÉPICERIE', sub: 'Denrées coloniales · Mercerie · Huiles', style: 'painted', bg: '#5a3a1a', fg: '#f0d890', icon: 'coffee' } },
    });
    tb.house(-6, 24.5, PI / 2, {
      ...shopW, style: 'cream',
      shop: { id: 'tabac', name: 'Débit de tabac', kind: 'vitrine', color: 0x6a1a1a, goods: [],
        sign: { text: 'TABAC', sub: 'Débit n° 1 · Timbres-poste', style: 'painted', bg: '#6a1a1a', fg: '#f4e8c8' },
        hanging: { icon: 'carotte', bg: '#f0ead8', style: 'iron' } },
    });
    tb.house(-6, 31, PI / 2, {
      ...shopW,
      shop: { id: 'boulangerie', name: 'Boulangerie Guérin', kind: 'vitrine', color: 0x7a5a2a, goods: ['bread', 'baguettes'],
        sign: { text: 'BOULANGERIE', sub: 'Pain de ménage · Fouaces', style: 'painted', bg: '#f0e0b0', fg: '#5a2a10', icon: 'bread' } },
    });
    tb.house(6, 18, -PI / 2, {
      ...shopW, w: 7,
      shop: { id: 'cafe', name: 'Café du Commerce', kind: 'vitrine', color: 0x1e3a2a, goods: ['terrace'], awning: 0x2a5a3a,
        sign: { text: 'CAFÉ DU COMMERCE', sub: 'Billard · Limonade · Journaux', style: 'painted', bg: '#1e3a2a', fg: '#f0d890' } },
    });
    tb.house(6, 24.5, -PI / 2, {
      ...shopW, style: 'cream',
      shop: { id: 'pharmacie', name: 'Pharmacie Morin', kind: 'vitrine', color: 0x1e2a4a, goods: ['pots'],
        sign: { text: 'PHARMACIE', sub: 'Drogues · Herboristerie', style: 'painted', bg: '#1e2a4a', fg: '#f0ead8', icon: 'mortar' } },
    });
    tb.house(6, 31, -PI / 2, {
      ...shopW,
      shop: { id: 'sabotier', name: 'Sabotier', kind: 'etal', color: 0x5a4a32, goods: [],
        hanging: { icon: 'boot', text: 'Sabots', bg: '#5a4a32' } },
    });
    tb.row(-2.5, 34.2, -2.5, 46, 1, { ...xix, d: 6.4, shutters: [0x4f7f5f, 0x6a8a9a, 0x3f6a52] });
    tb.row(2.5, 46, 2.5, 34.2, 1, { ...xix, d: 6.4, shutters: [0x4f7f5f, 0x6a8a9a, 0x3f6a52] });

    // ---------- place de l'église, mairie, hôtel ----------
    tb.house(-8, -5, PI / 2, { ...xix, w: 10, d: 7, floors: 2, style: 'cream', quoins: true, shutter: 0x6a6a6a, door: 0x2a2a2a, doorX: 0, lantern: true, flowers: false });
    tb.plaque({ text: 'MAIRIE', style: 'carved', bg: '#e8e0c8', fg: '#2a2a2a' }, -4.47, -5, PI / 2, 3.1, 1.8);
    tb.flagpole(-3.6, -8.2, tricolor(), 7);
    tb.spot('mairie', -1.6, -5, { rot: -PI / 2 });
    tb.house(-6.5, 5, PI / 2, { ...xix, w: 6, d: 7 });
    tb.house(7, 7, -PI / 2, {
      ...xix, w: 6, d: 7, floors: 2, style: 'cream', shutter: 0x6a2a2a, lantern: true,
      shop: { id: 'hotel', name: 'Hôtel du Commerce', kind: 'vitrine', color: 0x4a1a1a, goods: [],
        sign: { text: 'HÔTEL DU COMMERCE', sub: 'Chambres · Table d\'hôte · Écurie', style: 'painted', bg: '#4a1a1a', fg: '#f0d890' } },
    });
    tb.well(9, 1);
    tb.lamp(2.9, -10.4);
    tb.lamp(2.9, 6.4);
    tb.lamp(-2.9, 14.6);
    tb.lamp(2.9, 36);
    tb.bench(11.6, -9.6, PI);
    tb.tree(12, 2.6, 'elm', 0.9);

    // l'église Saint-Étienne et son clocher noir et blanc
    const ch = new THREE.Group();
    const nave = new THREE.Mesh(box(17, 8, 9, 3), MAT.stoneOld());
    nave.position.set(8.5, 3.8, 0);
    ch.add(nave);
    const nr = new THREE.Mesh(gableRoofGeometry(9, 17, 2.8), [MAT.tilesOld(), MAT.stoneOld()]);
    nr.rotation.y = PI / 2;
    nr.position.set(8.5, 7.8, 0);
    ch.add(nr);
    for (let k = 0; k < 4; k++) {
      const b = new THREE.Mesh(box(0.8, 5, 0.8), MAT.stoneOld());
      b.position.set(1.5 + k * 4.4, 2.4, 4.8);
      ch.add(b);
      const wnd = new THREE.Mesh(box(1.0, 2.6, 0.06), flat(0x2a3a5a, 0.3, 0.2));
      wnd.position.set(3.7 + k * 4.4, 4.4, 4.53);
      if (k < 3) ch.add(wnd);
    }
    const tower = new THREE.Mesh(box(5, 13, 5, 3), MAT.stonePale());
    tower.position.set(-2.5, 6.5, 0);
    ch.add(tower);
    // flèche octogonale : base blanche, pointe noire (repère pour les navires)
    const sW = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 2.5, 6, 8), MAT.whitewash());
    sW.position.set(-2.5, 16, 0);
    ch.add(sW);
    const sB = new THREE.Mesh(new THREE.ConeGeometry(1.55, 13, 8), flat(0x18181a, 0.6));
    sB.position.set(-2.5, 25.5, 0);
    ch.add(sB);
    const cross = new THREE.Mesh(box(0.1, 1.2, 0.1), MAT.iron());
    cross.position.set(-2.5, 32.5, 0);
    ch.add(cross);
    const arm = new THREE.Mesh(box(0.6, 0.1, 0.1), MAT.iron());
    arm.position.set(-2.5, 32.7, 0);
    ch.add(arm);
    const portal = new THREE.Mesh(box(0.2, 3.4, 2.0), MAT.woodDark());
    portal.position.set(-5.05, 1.7, 0);
    ch.add(portal);
    const arch = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 1.0, 0.24, 12, 1, false, 0, PI), MAT.stoneDark());
    arch.rotation.set(0, 0, PI / 2);
    arch.rotation.order = 'ZYX';
    arch.position.set(-5.05, 3.4, 0);
    ch.add(arch);
    const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.9, 0.12, 20), MAT.white());
    clock.rotation.z = PI / 2;
    clock.position.set(-5.06, 10.4, 0);
    ch.add(clock);
    tb.put(ch, 17, -4, { col: 0 });
    tb.footprint(25.5, -4, 17, 9, 0);
    tb.colL(14.5, -4, 3.3);
    tb.spot('eglise', 10.6, -2.2, { rot: -PI / 2 });

    // ---------- ruelles blanches aux roses trémières ----------
    tb.row(-40, 10, -10.5, 10, -1, { ...xix, hollyhocks: true, shutters: [0x4f7f5f, 0x6a8a9a, 0x3f6a52, 0x7a9a7a] });
    tb.row(-24, 14, -10, 14, 1, { ...xix, hollyhocks: true, shutters: [0x4f7f5f, 0x6a8a9a] });
    tb.row(13.5, 10, 38, 10, -1, { ...xix, hollyhocks: true, shutters: [0x4f7f5f, 0x6a8a9a, 0x3f6a52] });
    tb.row(10.5, 14, 38, 14, 1, { ...xix, hollyhocks: true, shutters: [0x4f7f5f, 0x7a9a7a] });
    tb.spot('maison-jeanne', -20, 12.2, { rot: 0 });

    // l'école communale
    tb.house(-31, 18, PI, { ...xix, w: 8, d: 6.6, floors: 1, style: 'cream', shutter: 0x4a5560, door: 0x2a3a4a, doorX: 0, flowers: false, quoins: true });
    tb.plaque({ text: 'ÉCOLE COMMUNALE', style: 'carved', bg: '#e8e0c8', fg: '#2a2a2a' }, -31, 14.67, 0, 3.0, 2.6);
    if (flags.xix_ecole) tb.plaque({ text: 'ÉCOLE DE FILLES', style: 'painted', bg: '#f0ead8', fg: '#2a3a6a' }, -31, 14.67, 0, 2.55, 2.2);
    tb.spot('ecole', -28, 12.6, { rot: 0 });
    tb.fence(-35, 21.4, -27, 21.4);

    // ---------- affiches et avis ----------
    tb.poster({ id: 'x-sel', kind: 'affiche19', header: 'Mairie d\'Ars-en-Ré', title: 'AVIS AUX SAUNIERS',
      body: 'La levée du sel des marais de la commune commencera le lundi 4 août 1862.\nLes mulons devront être couverts avant les pluies d\'équinoxe.',
      footer: 'Le Maire, A. Rivaille', icon: 'salt', accent: '#1e3a6a',
      read: "Un avis municipal : on « lève » le sel en été, on le met en tas (les mulons) qu'on couvre de terre ou de paille avant les pluies d'automne.", codex: 'metier-saunier' },
    -4.48, -0.4, PI / 2, { y: 1.6 });
    tb.poster({ id: 'x-vapeur', kind: 'affiche19', header: 'Service régulier', title: 'BATEAU À VAPEUR',
      body: 'La Rochelle — Saint-Martin-de-Ré\nDépart tous les jours à la marée.\nVoyageurs, marchandises, bestiaux.',
      footer: 'Prix des places : 1 fr. 50 — 75 c.', icon: 'steamer', bg: '#f0e6c8',
      read: "Depuis le milieu du siècle, des bateaux à vapeur à roues relient l'île au continent. La traversée prend environ deux heures." },
    -2.62, 20.2, -PI / 2, { mount: 'board', y: 1.5 });
    tb.poster({ id: 'x-tirage', kind: 'avis', header: 'EMPIRE FRANÇAIS', title: 'Recrutement de l\'armée — Classe 1861',
      body: 'Les jeunes gens de la classe 1861 sont invités à se présenter à la mairie de Saint-Martin pour le tirage au sort, le 2 septembre.',
      footer: 'Le Préfet de la Charente-Inférieure',
      read: "Sous le Second Empire, le service militaire se décide par tirage au sort : les « mauvais numéros » partent pour sept ans, sauf s'ils paient un remplaçant.", codex: 'vie-second-empire' },
    -4.48, -9.2, PI / 2, { y: 1.6 });
    tb.poster({ id: 'x-photo', kind: 'affiche19', header: 'Pour quelques jours seulement', title: 'PHOTOGRAPHIE',
      body: 'M. Delpech, photographe de Paris, fait le portrait sur verre et sur papier, en plein air.\nPose : dix secondes.',
      footer: 'Place de l\'Église', icon: 'camera', accent: '#3a2a1a',
      read: "Le procédé au collodion humide (1851) permet des portraits nets en quelques secondes. Les photographes ambulants sillonnent les campagnes.", codex: 'vie-photographie' },
    11.2, -10.8, 0, { mount: 'post', y: 1.5 });
    tb.poster({ id: 'x-foire', kind: 'affiche19', header: 'Saint-Martin-de-Ré', title: 'GRANDE FOIRE',
      body: 'Bestiaux, chevaux, ânes du Poitou, vins et eaux-de-vie de l\'île.\nLe 11 novembre, jour de la Saint-Martin.',
      footer: 'Musique · Danses · Illuminations', icon: 'grapes', bg: '#ecdcb4',
      read: 'Les foires rythment la vie de l\'île : on y vend le vin, le sel, les bêtes, et on y loue les journaliers.' },
    2.62, 27.6, PI / 2, { y: 1.6 });

    // ---------- les marais salants ----------
    const pansX = [-36, -30.6, -25.2, -19.8], pansZ = [-33, -27.6, -22.2];
    const brine = MAT.brine();
    let k = 0;
    for (const pz of pansZ) {
      for (const px of pansX) {
        const pond = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 4.6), brine);
        pond.rotation.x = -PI / 2;
        pond.position.set(px, tb.hL(px, pz) + 0.04, pz);
        pond.receiveShadow = true;
        tb.group.add(pond);
        tb.wall(px - 2.7, pz - 2.6, px + 2.7, pz - 2.6, 0.35, 0.6, MAT.dirt(), { col: false });
        tb.wall(px - 2.7, pz - 2.6, px - 2.7, pz + 2.6, 0.35, 0.6, MAT.dirt(), { col: false });
        // petits tas de sel rose-blanc au bord de certains œillets
        if ((k * 7) % 3 === 0) tb.mesh(new THREE.ConeGeometry(0.35, 0.3, 8), MAT.salt(), px + 1.6, 0.15, pz + 2.0);
        k++;
      }
    }
    tb.wall(-44, -19.4, -16.7, -19.4, 0.3, 1.4, MAT.dirt(), { col: false });   // la digue
    tb.spot('oeillet0', -30.6, -19.3, { rot: PI });
    tb.spot('oeillet1', -25.2, -19.3, { rot: PI });
    tb.spot('oeillet2', -16.9, -27.6, { rot: -PI / 2 });
    tb.spot('marais', -28, -18.9, { rot: PI });
    tb.spot('marais-gris', -40, -20.4, { rot: PI });
    // mulons de sel et cabane du saunier
    for (let i = 0; i < 3; i++) tb.saltHeap(-14.5, -34 + i * 4.2, 1.5);
    tb.spot('mulon', -16.5, -22.6, { rot: PI });
    const hut = tb.house(-41, -15.5, PI, { style: 'whitewash', w: 3.6, d: 3.2, floors: 1, roof: 'tiles', shutter: 0x4f7f5f, plinth: false, door: 0x5a4a32, chimney: false, lit: false });
    hut.scale.y = 0.8;
    tb.spot('cabane', -41, -19.0, { rot: PI });
    tb.spot('ane', -34.5, -18.8);
    tb.spot('ane2', -39, -19.6);
    // moulin à vent sur la butte, au sud-ouest
    const mill = new THREE.Group();
    const mt = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 2.2, 7, 14), MAT.whitewash());
    mt.position.y = 3.5; mill.add(mt);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(2.1, 1.8, 14), MAT.woodDark());
    cap.position.y = 7.9; mill.add(cap);
    tb.put(mill, -34, 32, { col: 2.3 });
    const sails = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Mesh(box(0.7, 4.6, 0.05), flat(0xe8e0c8, 0.9));
      s.position.y = 2.4;
      const p = new THREE.Group();
      p.rotation.z = (i / 4) * PI * 2;
      p.add(s);
      sails.add(p);
    }
    sails.position.set(-34, tb.hL(-34, 32) + 7, 34.3);
    sails.userData.noBatch = true;
    tb.dyn.add(sails);
    tb.animated.push({ obj: sails, kind: 'spin', speed: 0.5 });
    tb.spot('moulin', -34, 35.6);

    // estran au nord-ouest (écluse à poissons, pêche à pied)
    tb.spot('estran', -20, -39, { rot: PI });
    tb.spot('ecluse0', -24, -37.6, { rot: PI });
    tb.spot('ecluse1', -14, -41, { rot: PI });

    // le phare des Baleines, au bout de l'île (gardien)
    tb.spot('phare', -104, 0.5, { rot: -PI / 2 });

    // le photographe ambulant et sa chambre sur trépied
    const cam = new THREE.Group();
    const bx = new THREE.Mesh(box(0.42, 0.36, 0.5), MAT.woodDark());
    bx.position.y = 1.45; cam.add(bx);
    const bell = new THREE.Mesh(box(0.36, 0.32, 0.3), flat(0x141414, 0.8));
    bell.position.set(0, 1.45, 0.38); cam.add(bell);
    const lens = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.2, 10), MAT.metal());
    lens.rotation.x = PI / 2;
    lens.position.set(0, 1.45, 0.62); cam.add(lens);
    const cloth = new THREE.Mesh(box(0.5, 0.5, 0.08), flat(0x111111, 0.95));
    cloth.position.set(0, 1.42, -0.3); cam.add(cloth);
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.025, 1.4, 5), MAT.wood());
      leg.position.set(Math.sin(a) * 0.25, 0.65, Math.cos(a) * 0.25);
      leg.rotation.set(Math.cos(a) * 0.3, 0, -Math.sin(a) * 0.3);
      cam.add(leg);
    }
    tb.put(cam, 4.6, -7.8, { rot: PI * 0.8, col: 0.4 });
    tb.spot('photographe', 5.6, -6.4, { rot: PI * 0.8 });
    tb.spot('pose', 7.6, -10.4, { rot: 0 });

    // charrette de sel et futailles devant le magasin
    tb.crate(16.2, -18.6, 0.9);
    tb.barrel(-31.2, -18.6);

    // ---------- chemins des figurants ----------
    tb.path('grande-rue', [[1.2, 44], [1.2, 12], [-1.2, -2], [-1.2, -16], [1.2, -2], [-1.2, 12], [-1.2, 44]]);
    tb.path('quai', [[-28, -19.6], [20, -19.6], [-28, -19.4]]);
    tb.path('digue', [[-43, -19.2], [-17, -19.2], [-43, -19.0]]);
    tb.path('rue-marais', [[-38, 12], [30, 12], [-38, 12.2]]);
  },
};
