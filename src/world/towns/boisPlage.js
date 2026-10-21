// Seconde Guerre mondiale (1943) — Le Bois-Plage sous l'Occupation. Le bourg
// viticole et sa place, l'église, la boulangerie et ses tickets de pain, le
// café-tabac aux plaques émaillées, le dispensaire, la mairie et ses avis, la
// Kommandantur installée dans une villa réquisitionnée, l'école, les vignes et
// la cabane du résistant, et au sud les dunes hérissées de blockhaus du Mur de
// l'Atlantique, de barbelés et d'obstacles de plage — dont un en chantier.

import * as THREE from 'three';
import { MAT, flat } from '../materials.js';
import { box, gableRoofGeometry } from '../builder.js';
import { signTexture } from '../../gfx/signs.js';

const PI = Math.PI;

export default {
  // plateau réduit : les dunes et la plage restent naturelles
  radius: 26,
  build(tb, flags) {
    tb.spot('spawn', -38, 1.2, { rot: -PI / 2 });
    const pave = MAT.asphalt();
    const dirt = MAT.sandPath();
    // l'occupation : fenêtres occultées la nuit (défense passive)
    const w43 = { style: 'whitewash', roof: 'tiles', plinth: 0x3a3a3a, shutter: 0x6a8a9a, door: 0x4a5a5a, roofPitch: 0.36, lit: false };

    // ---------- rues ----------
    tb.street([[-44, 0.5], [-20, 0], [0, 0], [20, 0], [40, -1]], 5.0, pave);
    tb.street([[4, 2], [4, 14], [4.5, 24], [6, 30]], 4.0, dirt);           // route de la plage
    tb.street([[-26, -2], [-28, -14], [-28, -24]], 3.0, dirt);             // chemin des vignes
    tb.plaza(0, -8, 16, 10, MAT.pave());
    tb.spot('place', 2, -5);
    tb.spot('pompe', -3.4, -6.4, { rot: PI / 2 });
    tb.well(-5, -6.4, false);

    // ---------- l'église ----------
    const ch = new THREE.Group();
    const nave = new THREE.Mesh(box(9, 8, 17, 3), MAT.stoneOld());
    nave.position.set(0, 3.8, -10);
    ch.add(nave);
    const nr = new THREE.Mesh(gableRoofGeometry(9, 17, 3.0), [MAT.tilesOld(), MAT.stoneOld()]);
    nr.position.set(0, 7.8, -10);
    ch.add(nr);
    const tower = new THREE.Mesh(box(4.6, 13, 4.6, 3), MAT.stoneOld());
    tower.position.set(0, 6.5, 0);
    ch.add(tower);
    const spire = new THREE.Mesh(new THREE.ConeGeometry(3.3, 5.5, 4), MAT.slate());
    spire.rotation.y = PI / 4;
    spire.position.set(0, 15.7, 0);
    ch.add(spire);
    const door = new THREE.Mesh(box(1.8, 3, 0.2), MAT.woodDark());
    door.position.set(0, 1.5, 2.35);
    ch.add(door);
    const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 0.12, 20), MAT.white());
    clock.rotation.x = PI / 2;
    clock.position.set(0, 10.5, 2.36);
    ch.add(clock);
    tb.put(ch, 0, -15.5, { col: 0 });
    tb.footprint(0, -25.5, 9, 17, 0);
    tb.colL(0, -15.5, 3.1);
    tb.spot('eglise', 0, -11.6, { rot: 0 });

    // ---------- commerces de la rue principale (côté nord) ----------
    tb.house(-26, -6, 0, {
      ...w43, w: 7, d: 7, floors: 2, style: 'cream',
      shop: { id: 'epicerie', name: 'Épicerie Moderne', kind: 'vitrine', color: 0x2a4a3a, goods: ['sacks'], closed: false,
        sign: { text: 'ÉPICERIE MODERNE', sub: 'Alimentation · Mercerie · Quincaillerie', style: 'painted', bg: '#2a4a3a', fg: '#f0e8c8' } },
    });
    tb.house(-18.5, -6, 0, {
      ...w43, w: 7, d: 7, floors: 2,
      shop: { id: 'boulangerie', name: 'Boulangerie Guillon', kind: 'vitrine', color: 0x6a4a1a, goods: ['bread'],
        sign: { text: 'BOULANGERIE', sub: 'Pâtisserie · M. Guillon', style: 'painted', bg: '#f0e0b0', fg: '#5a2a10', icon: 'bread' },
        hanging: { icon: 'bread', bg: '#6a4a1a', text: 'Pain' } },
    });
    tb.house(-11.5, -6, 0, {
      ...w43, w: 6, d: 7, floors: 2, style: 'cream',
      shop: { id: 'cafe', name: 'Café de la Plage', kind: 'vitrine', color: 0x1e3a5a, goods: ['terrace'], awning: 0x8a2a22,
        sign: { text: 'CAFÉ DE LA PLAGE', sub: 'Tabac · Billard', style: 'enamel', bg: '#1e3a5a', fg: '#f4f2ec' },
        hanging: { icon: 'carotte', bg: '#f0ead8', style: 'iron' } },
    });
    // plaques émaillées publicitaires (marques imaginaires)
    tb.wall(8.4, -10, 8.4, -14, 2.4, 0.4, MAT.plasterOld());
    tb.plaque({ text: 'QUINQUINA RÉTAIS', sub: "L'apéritif des marins", style: 'enamel', bg: '#a8241e', fg: '#f4e8c8' }, 8.17, -11.1, -PI / 2, 1.6, 1.5);
    tb.plaque({ text: 'CHICORÉE LA MOUETTE', sub: 'La meilleure', style: 'enamel', bg: '#e8c040', fg: '#1a1a1a' }, 8.17, -13.0, -PI / 2, 1.5, 1.6);
    tb.house(12, -6, 0, {
      ...w43, w: 7, d: 7, floors: 2, style: 'cream', shutter: 0xd8d8d0,
      shop: { id: 'dispensaire', name: 'Dispensaire', kind: 'vitrine', color: 0xe8e8e0, goods: [],
        sign: { text: 'DISPENSAIRE', sub: 'Soins · Consultations · Vaccinations', style: 'painted', bg: '#f4f4f0', fg: '#1e2a4a' } },
    });
    tb.house(19.5, -6, 0, { ...w43, w: 6.4, d: 7, floors: 1, shutter: 0x4f7f5f });
    // la Kommandantur : une villa réquisitionnée
    tb.house(29, -7, 0, { ...w43, w: 9, d: 8, floors: 2, style: 'grey', roof: 'slate', shutter: 0x3a3a3a, door: 0x2a2a2a, doorX: 0, quoins: true, chimney: true, flowers: false });
    const ksign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.55), new THREE.MeshStandardMaterial({ map: signTexture({ text: 'KOMMANDANTUR', style: 'gothic', bg: '#f0ece0', fg: '#141414' }), roughness: 0.7 }));
    tb.put(ksign, 29, -2.94, { y: 3.0, shadow: false });
    // guérite rayée
    const box1 = new THREE.Group();
    const gw = new THREE.Mesh(box(1.1, 2.3, 1.1), flat(0xd8d8d0, 0.8));
    gw.position.y = 1.15; box1.add(gw);
    for (let i = 0; i < 4; i++) {
      const st = new THREE.Mesh(box(1.12, 0.22, 1.12), flat(0x1a1a1a, 0.8));
      st.position.y = 0.4 + i * 0.5; box1.add(st);
    }
    const gr = new THREE.Mesh(new THREE.ConeGeometry(0.95, 0.6, 4), flat(0x1a1a1a, 0.8));
    gr.rotation.y = PI / 4; gr.position.y = 2.6; box1.add(gr);
    tb.put(box1, 23.6, -3.4, { col: 0.8 });
    tb.spot('kommandantur', 26.2, -1.2, { rot: 0 });

    // ---------- côté sud ----------
    tb.house(-22, 6, PI, {
      ...w43, w: 7, d: 7, floors: 1,
      shop: { id: 'cycles', name: 'Cycles Brunet', kind: 'vitrine', color: 0x3a3a3a, goods: ['bikes'],
        sign: { text: 'CYCLES BRUNET', sub: 'Réparations · Pneus · T.S.F.', style: 'painted', bg: '#3a3a3a', fg: '#f0d890', icon: 'bicycle' } },
    });
    tb.house(-14, 6, PI, { ...w43, w: 8, d: 7, floors: 2, style: 'cream', shutter: 0x6a6a6a, door: 0x2a2a2a, doorX: 0, quoins: true, flowers: false });
    tb.plaque({ text: 'MAIRIE', style: 'carved', bg: '#e8e0c8', fg: '#2a2a2a' }, -14, 2.47, PI, 3.1, 1.6);
    tb.spot('mairie', -14, 0.6, { rot: PI });
    tb.house(-6, 6, PI, { ...w43, w: 6, d: 7, floors: 1, shutter: 0x4f7f5f });
    tb.house(14, 6, PI, {
      ...w43, w: 9, d: 7, floors: 1, style: 'old', roof: 'tilesOld',
      shop: { id: 'cave', name: 'Cave du Bois', kind: 'etal', color: 0x5a2a2a, goods: ['barrels', 'wine'],
        sign: { text: 'CAVE DU BOIS', sub: "Vins de l'île de Ré · Pineau", style: 'painted', bg: '#5a1a2a', fg: '#f0d890', icon: 'grapes' } },
    });
    tb.house(24, 6, PI, { ...w43, w: 7, d: 7, floors: 1, shutter: 0x6a8a9a });
    tb.row(-44, -2.5, -30, -2.5, -1, { ...w43, d: 6.2 });
    tb.row(-44, 2.5, -26, 2.5, 1, { ...w43, d: 6.2 });
    tb.row(29, 2.5, 40, 2.5, 1, { ...w43, d: 6.2 });

    // ---------- avis et affiches ----------
    tb.poster({ id: 'w-couvrefeu', kind: 'avis', header: 'AVIS', title: 'Couvre-feu',
      body: 'La circulation est interdite de 22 heures à 6 heures.\nToute personne trouvée dehors sans Ausweis sera arrêtée.\nLes fenêtres doivent être occultées.',
      footer: 'Le Feldkommandant',
      read: "Sous l'Occupation, le couvre-feu et l'occultation des fenêtres (« défense passive ») sont obligatoires. Les avis de l'occupant sont souvent bilingues.", codex: 'vie-occupation' },
    -16.4, 2.46, PI, { y: 1.6 });
    tb.poster({ id: 'w-ravitaillement', kind: 'avis', header: 'RAVITAILLEMENT', title: 'Cartes d\'alimentation — juin 1943',
      body: 'Distribution des tickets à la mairie, le lundi.\nCatégories E, J1, J2, J3, A, T, V.\nSe munir de sa carte et de son livret de famille.',
      footer: 'Le Maire',
      read: "Pain, viande, sucre, matières grasses, et même vêtements et chaussures : presque tout est rationné. Chaque Français a une catégorie selon son âge et son travail.", codex: 'vie-rationnement' },
    -11.6, 2.46, PI, { y: 1.6 });
    tb.poster({ id: 'w-cinema', kind: 'affiche19', header: 'Salle des fêtes — Samedi', title: 'CINÉMA',
      body: '« Les Visiteurs du soir »\nun film de Marcel Carné\navec Arletty et Jules Berry',
      footer: 'Séance à 20 h 30 précises', icon: 'book', bg: '#e8dcc0', accent: '#2a2a6a',
      read: "Le cinéma est l'une des rares distractions. Les séances finissent tôt, à cause du couvre-feu. « Les Visiteurs du soir » (1942) se passe au Moyen Âge : une façon de parler du présent sans être censuré." },
    -8.4, -2.46, 0, { y: 1.6 });
    tb.poster({ id: 'w-plage', kind: 'avis', header: 'ZONE INTERDITE', title: 'Accès aux plages interdit',
      body: 'Plages minées.\nTout contrevenant s\'expose aux plus graves sanctions.\nVERBOTEN — MINEN',
      footer: 'Feldkommandantur',
      read: "Sur toute la côte atlantique, les plages sont fermées, minées et couvertes d'obstacles contre un débarquement allié.", codex: 'histoire-mur-atlantique' },
    6.6, 16, -PI / 2, { mount: 'post', y: 1.5 });

    // ---------- l'école ----------
    tb.house(-15, -16, 0, { ...w43, w: 8, d: 6.4, floors: 1, style: 'cream', shutter: 0x4a5560, door: 0x2a3a4a, doorX: 0, flowers: false });
    tb.plaque({ text: 'ÉCOLE PUBLIQUE', style: 'carved', bg: '#e8e0c8', fg: '#2a2a2a' }, -15, -12.77, 0, 3.0, 2.4);
    tb.spot('ecole', -15, -11.4, { rot: 0 });
    tb.fence(-20, -11, -10, -11);
    tb.spot('radio', -12.4, -11.6, { rot: 0 });

    // ---------- vignes, chai et cabane de Lucien ----------
    tb.vineRows(-46, -44, 8, 16);
    tb.vineRows(18, -40, 9, 14);
    const hut = tb.house(-24, -30, PI / 2, { style: 'old', w: 3.8, d: 3.2, floors: 1, roof: 'tilesOld', shutter: 0x5a4a32, plinth: false, door: 0x5a4a32, chimney: false });
    hut.scale.y = 0.85;
    tb.spot('cabane', -21.6, -30, { rot: PI / 2 });
    tb.spot('cachette', -32, -26.6);
    tb.poster({ id: 'w-tract', kind: 'tract', header: 'FRANÇAIS !', title: 'Ne travaillez pas pour l\'ennemi',
      body: 'Refusez le Service du travail obligatoire.\nChaque bunker construit est une prison pour la France.\nL\'heure de la Libération viendra.',
      footer: 'Ici Londres — les Français parlent aux Français',
      read: "Un tract de la Résistance, glissé sous un caillou. En distribuer pouvait coûter la déportation. La croix de Lorraine est l'emblème de la France libre du général de Gaulle.", codex: 'histoire-resistance-re' },
    -21.98, -28.4, PI / 2, { y: 1.3, scale: 0.8 });

    // ---------- les dunes : Mur de l'Atlantique ----------
    tb.bunker(-18, 31, 0, true);
    tb.bunker(28, 31.5, -0.1, true);
    tb.bunker(-34, 30, 0.1, false);
    tb.spot('blockhaus', -18, 25.6, { rot: PI });
    tb.spot('obs0', -30, 26.2, { rot: 0 });
    tb.spot('obs1', 20, 26.6, { rot: 0 });
    tb.spot('obs2', -10, 27.4, { rot: 0 });
    // barbelés
    for (const [a, b] of [[-40, -8], [10, 40]]) tb.fence(a, 27.6, b, 27.6, MAT.iron(), 0.9);
    for (let x = -36; x <= 36; x += 6) tb.hedgehog(x + (x % 12 ? 1.5 : -1.5), 37.2);
    // panneaux « Achtung Minen »
    const mine = signTexture({ text: 'ACHTUNG MINEN', sub: 'Danger de mort — Mines', style: 'painted', bg: '#f0e8d0', fg: '#8a1a1a' });
    for (const x of [-26, 14, 34]) {
      const g = new THREE.Group();
      const post = new THREE.Mesh(box(0.08, 1.4, 0.08), MAT.woodDark());
      post.position.y = 0.7; g.add(post);
      const pl = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.25), new THREE.MeshStandardMaterial({ map: mine, side: THREE.DoubleSide }));
      pl.position.set(0, 1.25, 0.05); g.add(pl);
      tb.put(g, x, 26.8, { col: 0.2 });
    }
    // le chantier : coffrage de bois, ferraillage, sacs de ciment, bétonnière
    const site = new THREE.Group();
    const conc = MAT.concrete();
    for (const [w, d, x, z] of [[7, 0.6, 0, -2.7], [0.6, 6, -3.2, 0], [0.6, 6, 3.2, 0]]) {
      const wl = new THREE.Mesh(box(w, 1.6, d), conc);
      wl.position.set(x, 0.6, z); site.add(wl);
    }
    for (const [w, d, x, z] of [[7.4, 0.12, 0, -3.1], [0.12, 6.4, -3.6, 0], [0.12, 6.4, 3.6, 0]]) {
      const pl = new THREE.Mesh(box(w, 2.6, d), MAT.woodPale());
      pl.position.set(x, 1.3, z); site.add(pl);
    }
    for (let i = -3; i <= 3; i++) {
      const bar = new THREE.Mesh(box(0.04, 2.8, 0.04), flat(0x5a3a2a, 0.6, 0.4));
      bar.position.set(i * 0.9, 1.6, -2.7); site.add(bar);
    }
    tb.put(site, 8, 31, { col: 0 });
    for (const x of [5.2, 8, 10.8]) tb.colL(x, 28.3, 1.0);
    for (const z of [29.6, 32]) { tb.colL(4.8, z, 0.8); tb.colL(11.2, z, 0.8); }
    tb.scaffolding(12.6, 29, 2.4, 3.6, PI / 2);
    for (let i = 0; i < 5; i++) tb.sack(1.2 + (i % 3) * 0.6, 26.2 + Math.floor(i / 3) * 0.6);
    const mixer = new THREE.Group();
    const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.1, 10), flat(0x8a6a2a, 0.6, 0.3));
    drum.rotation.z = 0.6; drum.position.y = 1.1; mixer.add(drum);
    const frame = new THREE.Mesh(box(1.4, 0.5, 0.9), flat(0x3a3a3a, 0.7, 0.4));
    frame.position.y = 0.4; mixer.add(frame);
    tb.put(mixer, 13.4, 25.6, { rot: 0.5, col: 0.9 });
    tb.spot('chantier', 8, 26.2, { rot: 0 });
    tb.spot('wache', 4.8, 25, { rot: 0 });
    tb.spot('chantier-entree', 3.2, 21.4, { rot: 0 });
    tb.spot('fouille', 8, 30.4);
    tb.spot('dune', -4, 25.6);

    // ---------- chemins des figurants ----------
    tb.path('patrouille', [[-40, 1.6], [36, 1.6], [4.2, 1.6], [4.2, 22], [4.2, 1.6], [-40, 1.6]]);
    tb.path('rue', [[-40, -1.4], [36, -1.4], [-40, -1.2]]);
    tb.path('vignes', [[-27, -2], [-28, -22], [-27, -2.2]]);
  },
};
