// Époque contemporaine — le site du Phare des Baleines (pointe ouest).
// Le grand phare de 1854 (57 m, 257 marches), la vieille tour des Baleines
// bâtie sous Vauban (1682), les anciens logements des gardiens devenus musée,
// une rangée de commerces (café, crêperie, souvenirs, glacier, loueur de
// vélos), le hameau du Gillieux, la piste cyclable, la plage de la Conche.
// L'exposition « Mémoires de Ré » se remplit selon les choix faits dans le passé.

import * as THREE from 'three';
import { MAT, flat } from '../materials.js';
import { box } from '../builder.js';
import { signTexture } from '../../gfx/signs.js';

const PI = Math.PI;

export default {
  radius: 40,
  build(tb, flags) {
    const pave = MAT.paveWarm();
    tb.spot('spawn', 4, 10, { rot: PI });

    // ---------- sols ----------
    tb.plaza(0, 4, 36, 17, pave);
    tb.street([[18, 7], [40, 7], [72, 9]], 5.5, MAT.asphalt());
    tb.street([[18, 11.5], [40, 12], [72, 14]], 2.6, MAT.cycleway(), 0.075);
    tb.street([[0, 12], [1, 22], [3, 33]], 2.2, MAT.sandPath());
    tb.street([[-17, 2], [-22, 1]], 2.4, pave);
    tb.street([[-6, -6], [-10, -11], [-13, -14]], 2.0, MAT.sandPath());
    tb.street([[30, 4], [42, -6], [52, -15]], 1.8, MAT.dirtPale());

    // ---------- le grand phare ----------
    const phare = new THREE.Group();
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 4.2, 46, 8), MAT.stonePale());
    shaft.position.y = 23;
    phare.add(shaft);
    for (let k = 0; k < 8; k++) {
      // arêtes de pierre de taille sur l'octogone
      const a = (k / 8) * PI * 2 + PI / 8;
      const e = new THREE.Mesh(box(0.35, 46, 0.35), MAT.stone());
      e.position.set(Math.cos(a) * 3.35, 23, Math.sin(a) * 3.35);
      e.rotation.z = Math.cos(a) * 0.033;
      e.rotation.x = -Math.sin(a) * 0.033;
      phare.add(e);
    }
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(5.2, 5.6, 2.4, 8), MAT.stone());
    plinth.position.y = 1.0;
    phare.add(plinth);
    const gallery = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.0, 0.7, 16), MAT.stonePale());
    gallery.position.y = 46.3;
    phare.add(gallery);
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(3.5, 3.5, 1.1, 16, 1, true), flat(0x2a2a2e, 0.4, 0.6, { side: THREE.DoubleSide }));
    rail.position.y = 47.2;
    phare.add(rail);
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 2.1, 3.4, 12), MAT.glassLit());
    lantern.position.y = 48.6;
    phare.add(lantern);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(2.05, 16, 8, 0, PI * 2, 0, PI / 2), flat(0x9a2a22, 0.5, 0.3));
    cap.position.y = 50.3;
    phare.add(cap);
    const door = new THREE.Mesh(box(1.4, 2.6, 0.3), MAT.woodDark());
    door.position.set(0, 1.3, 5.5);
    phare.add(door);
    for (let k = 1; k < 7; k++) {
      const w = new THREE.Mesh(box(0.5, 0.9, 0.2), MAT.glass());
      const y = k * 6.5;
      const r = 4.15 - (y / 46) * 1.45;
      w.position.set(0, y, r + 0.05);
      phare.add(w);
    }
    tb.put(phare, 0, -2, { col: 0 });
    tb.colL(0, -2, 5.4);
    tb.spot('phare', 0, 4.6, { rot: PI });

    // faisceau tournant du phare (la nuit)
    const beamPivot = new THREE.Group();
    beamPivot.position.set(0, tb.hL(0, -2) + 48.6, -2);
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide });
    for (const s of [1, -1]) {
      const beam = new THREE.Mesh(new THREE.ConeGeometry(4, 90, 12, 1, true), beamMat);
      beam.rotation.z = s * PI / 2;
      beam.position.x = s * 45;
      beamPivot.add(beam);
    }
    beamPivot.userData.noBatch = true;
    beamPivot.userData.beamMat = beamMat;
    tb.dyn.add(beamPivot);
    tb.animated.push({ obj: beamPivot, kind: 'lighthouse' });

    // ---------- la vieille tour des Baleines (1682) ----------
    const tour = new THREE.Group();
    const t1 = new THREE.Mesh(new THREE.CylinderGeometry(2.8, 3.5, 17, 16), MAT.stoneOld());
    t1.position.y = 8.5;
    tour.add(t1);
    const t2 = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 0.9, 16), MAT.stonePale());
    t2.position.y = 17.2;
    tour.add(t2);
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * PI * 2;
      const m = new THREE.Mesh(box(0.7, 0.8, 0.5), MAT.stoneOld());
      m.position.set(Math.cos(a) * 3.0, 18.0, Math.sin(a) * 3.0);
      m.rotation.y = -a;
      tour.add(m);
    }
    const tdoor = new THREE.Mesh(box(1.2, 2.2, 0.4), MAT.woodDark());
    tdoor.position.set(0, 1.1, 3.35);
    tour.add(tdoor);
    const arch = new THREE.Mesh(box(1.7, 0.4, 0.5), MAT.stonePale());
    arch.position.set(0, 2.4, 3.35);
    tour.add(arch);
    tb.put(tour, -14, -18, { col: 0 });
    tb.colL(-14, -18, 3.8);
    tb.spot('tour', -14, -13.7, { rot: PI });

    // la dalle aux sept encoches
    const dalle = new THREE.Group();
    const slab = new THREE.Mesh(new THREE.CylinderGeometry(1.7, 1.8, 0.25, 28), MAT.stoneDark());
    slab.position.y = 0.05;
    dalle.add(slab);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * PI * 2;
      const notch = new THREE.Mesh(box(0.2, 0.06, 0.5), flat(0x14100c, 0.9));
      notch.position.set(Math.cos(a) * 1.2, 0.19, Math.sin(a) * 1.2);
      notch.rotation.y = -a;
      dalle.add(notch);
    }
    const spiral = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.04, 6, 24), flat(0xc8a050, 0.4, 0.7));
    spiral.rotation.x = PI / 2;
    spiral.position.y = 0.19;
    dalle.add(spiral);
    tb.put(dalle, -8, -13);
    tb.spot('dalle', -8, -10.6, { rot: PI });
    tb.spot('dalle-centre', -8, -13);

    // ---------- logements des gardiens : musée et maison ----------
    tb.house(13, -3.5, 0, { w: 10, d: 6, floors: 1, style: 'whitewash', shutter: 0x9a2a22, roof: 'tilesNew', quoins: true, plinth: 0x58544c, chimney: true, door: 0x6a2a22 });
    tb.plaque({ text: 'MUSÉE DU PHARE', sub: 'Mémoire des gardiens · Exposition', style: 'enamel', bg: '#7a1e1a' }, 13, -0.47, 0, 3.0, 2.6);
    tb.spot('musee', 11, 2, { rot: PI });
    tb.house(-13, -3.5, 0, { w: 9, d: 6, floors: 1, style: 'whitewash', shutter: 0x9a2a22, roof: 'tilesNew', quoins: true, plinth: 0x58544c, door: 0x6a2a22, flowers: true });
    tb.spot('gardien', -12, 2, { rot: PI });

    // vitrine « La une de 1945 » (anomalie du prologue)
    const vit = new THREE.Group();
    const vb = new THREE.Mesh(box(1.2, 1.0, 0.6), MAT.woodDark());
    vb.position.y = 0.5;
    vit.add(vb);
    const vg = new THREE.Mesh(box(1.1, 0.5, 0.5), MAT.shopGlass());
    vg.position.y = 1.25;
    vit.add(vg);
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.4), new THREE.MeshStandardMaterial({ map: signTexture({ text: "L'ÉCHO DE RÉ", sub: '8 mai 1945 — L\'île est libre !', style: 'fat', bg: '#ece4cc', fg: '#1a1a1a' }) }));
    paper.rotation.x = -PI / 2 + 0.3;
    paper.position.set(0, 1.08, 0);
    vit.add(paper);
    tb.put(vit, 18.5, 1.5, { col: 0.8 });
    tb.spot('vitrine', 18.5, 3.2, { rot: PI });

    // ---------- exposition « Mémoires de Ré » (conséquences des choix) ----------
    const expo = [
      ['pre_vase', 'Vase néolithique', "Vase en céramique façonné au colombin, décoré à l'ongle. Retrouvé intact aux Portes : la potière Néa l'avait enfoui sous le campement."],
      ['ant_mosaique', 'Mosaïque de la villa', "Fragment de mosaïque gallo-romaine aux dauphins, restauré grâce aux tesselles retrouvées dans la villa de Sainte-Marie."],
      ['med_charte', 'Charte des Châteliers (copie)', "La charte d'Eble de Mauléon (1156) fondant l'abbaye. Sa lecture attentive avait apaisé la querelle des pêcheurs et des moines de La Flotte."],
      ['xvii_plans', 'Plans de Vauban (fac-similé)', "Le tracé de l'enceinte bastionnée de Saint-Martin, signé du commissaire général des fortifications. Les originaux furent retrouvés à temps en 1681."],
      ['xix_ecole', "Photographie de l'école d'Ars", "Les premiers élèves de l'école communale d'Ars, ouverte grâce à la souscription de 1862. Au premier rang, en sabots, le petit Désiré."],
      ['wwii_carnet', 'Carnet de la Résistance', "Le carnet chiffré de Madeleine, institutrice du Bois-Plage : relevés des casemates du Mur de l'Atlantique transmis à Londres en 1943."],
    ];
    expo.forEach(([flag, name, text], k) => {
      const x = 22.5, z = -8 + k * 2.2;
      const g = new THREE.Group();
      const ped = new THREE.Mesh(box(0.8, 1.0, 0.8), MAT.stonePale());
      ped.position.y = 0.5;
      g.add(ped);
      const glass = new THREE.Mesh(box(0.7, 0.7, 0.7), MAT.shopGlass());
      glass.position.y = 1.35;
      g.add(glass);
      if (flags[flag]) {
        const obj = new THREE.Mesh(new THREE.IcosahedronGeometry(0.2, 0), flat([0x9a6a48, 0x3a6a8a, 0xe8dcb0, 0xe6dcc0, 0xd8d0c0, 0x6a2a1a][k], 0.6));
        obj.position.y = 1.25;
        g.add(obj);
      }
      tb.put(g, x, z, { col: 0.55 });
      tb.interact({
        id: 'expo:' + flag, kind: 'custom', x: x - 1.2, z, r: 1.4, label: flags[flag] ? `Vitrine : ${name}` : 'Vitrine vide',
        do: [['fn', (api) => api.ui.narration(flags[flag] ? text : "« Objet en cours de prêt. » La vitrine est vide… comme si cet objet n'avait jamais été retrouvé.", flags[flag] ? name : 'Exposition « Mémoires de Ré »')]],
      });
    });
    tb.plaque({ text: 'MÉMOIRES DE RÉ', sub: 'Exposition en plein air', style: 'modern', bg: '#1e3a5a' }, 24.2, -2.5, PI / 2, 2.2, 2.4);

    // ---------- commerces au sud du parvis ----------
    tb.house(-14, 18.5, PI, {
      w: 7, d: 6, floors: 2, shutter: 0x2a5a7a, roof: 'tilesNew', flowers: true, plinth: 0x46423c,
      shop: { id: 'cafe', name: 'Café des Baleines', kind: 'cafe', color: 0x1e4a6a, awning: 0x1e4a6a, goods: ['terrace'],
        sign: { text: 'Café des Baleines', sub: 'Glaces · Crêpes · Terrasse', style: 'modern', bg: '#1e4a6a', icon: 'coffee' } },
    });
    tb.house(-5.4, 18.6, PI, {
      w: 5.6, d: 6, floors: 1, shutter: 0x8a5a2a, roof: 'tilesNew', plinth: 0x46423c,
      shop: { id: 'creperie', name: 'Crêperie La Conche', kind: 'modern', color: 0x8a5a2a, awning: 0xc0602a, goods: ['flowers'],
        sign: { text: 'Crêperie La Conche', sub: 'Galettes de blé noir · Cidre', style: 'painted', bg: '#8a3a1a', icon: 'crepe' }, hanging: { icon: 'crepe', bg: '#6a3a1a' } },
    });
    tb.house(1.5, 18.4, PI, {
      w: 6.2, d: 6, floors: 1, shutter: 0x3f7f5f, roof: 'tilesNew', plinth: 0x46423c,
      shop: { id: 'boutique', name: 'Boutique du Phare', kind: 'modern', color: 0x2e6a4a, awning: 0x2e6a4a, goods: ['postcards'],
        sign: { text: 'Boutique du Phare', sub: 'Souvenirs · Livres · Fleur de sel', style: 'modern', bg: '#2e5a4a', icon: 'lighthouse' } },
    });
    tb.house(8.2, 18.7, PI, {
      w: 5.0, d: 6, floors: 1, shutter: 0xd0607a, roof: 'tilesNew', plinth: 0x46423c,
      shop: { id: 'glacier', name: 'Glaces de la Pointe', kind: 'modern', color: 0xd0607a, awning: 0xe080a0, goods: ['icecream'],
        sign: { text: 'Glaces', sub: 'Artisanales depuis 1972', style: 'modern', bg: '#c0507a', icon: 'icecream' } },
    });
    tb.house(15, 18.4, PI, {
      w: 6.6, d: 6, floors: 1, shutter: 0x2a6aca, roof: 'tilesNew', plinth: 0x46423c,
      shop: { id: 'cycles', name: 'Cycles du Phare', kind: 'modern', color: 0x2a5aaa, awning: 0x2a6aca, goods: ['bikes'],
        sign: { text: 'Cycles du Phare', sub: 'Location de vélos · Réparations', style: 'modern', bg: '#2a5aaa', icon: 'bicycle' } },
    });

    // ---------- hameau du Gillieux, le long de la route ----------
    tb.row(26, 2.5, 48, 2.5, -1, { shutters: [0x3f7f5f, 0x6a8aa0, 0x8a6a9a, 0x3f7f5f], twoFloorChance: 0.2, flowers: true, plinth: 0x2a2826, number: true, roof: 'tilesNew' });
    tb.row(26, 16.5, 48, 16.5, 1, { shutters: [0x3f7f5f, 0x2a5a7a, 0x3f7f5f], twoFloorChance: 0.15, flowers: true, plinth: 0x2a2826, number: true, roof: 'tilesNew' });
    tb.spot('hameau', 36, 9);

    // ---------- mobilier, affiches, nature ----------
    const table = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.45, 1.05, 12), MAT.stonePale());
    tb.put(table, -21, 1, { y: 0.52, col: 0.7 });
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.05, 20), new THREE.MeshStandardMaterial({ map: signTexture({ text: 'Table d\'orientation', sub: 'Pertuis Breton · Pertuis d\'Antioche', style: 'enamel', bg: '#2a4a6a', w: 256, h: 256 }) }));
    tb.put(disc, -21, 1, { y: 1.08 });
    tb.spot('orientation', -19.5, 1.8, { rot: -PI / 2 });
    tb.bench(-20, 5.5, -PI / 2);
    tb.spot('banc', -20.2, 5.5, { rot: -PI / 2 });
    tb.bench(-3, 10.8, PI);
    tb.bench(6, 10.8, PI);
    tb.bikeModel(tb.group, 20, 11, 0.3, 0x2a6aca).position.y = tb.hL(20, 11);
    tb.lamp(-9, 9, 'modern');
    tb.lamp(9, 9, 'modern');
    tb.lamp(30, 9.5, 'modern');

    const posters = [
      { id: 'c-phare', kind: 'tourism', header: 'Phare des Baleines', title: '257 MARCHES', icon: 'lighthouse', body: 'Montez au sommet : vue à 360° sur les pertuis', footer: 'Ouvert tous les jours · 10 h – 19 h', bg: '#1e5a8a', bg2: '#e8c070',
        name: 'Visite du phare', codex: 'lieu-phare',
        read: "Le grand phare des Baleines a été allumé en 1854 pour remplacer la tour de 1682, devenue trop basse et trop éloignée du rivage qui avançait. Haut de 57 mètres, il compte 257 marches. Sa lumière porte à 27 milles nautiques (50 km) et guide les navires entre le pertuis Breton et le pertuis d'Antioche, semés de récifs appelés « les Baleineaux ». On raconte que le nom de la pointe vient des baleines qui venaient s'y échouer." },
      { id: 'c-lilleau', kind: 'tourism', header: 'Réserve naturelle', title: 'LILLEAU DES NIGES', icon: 'shell', body: 'Sorties nature : bernaches, avocettes, aigrettes', footer: 'Départ de l\'observatoire · 9 h', bg: '#3a7a5a', bg2: '#d8e0a0',
        name: 'Réserve de Lilleau des Niges', codex: 'lieu-lilleau',
        read: "Créée en 1980, la réserve naturelle nationale de Lilleau des Niges protège 120 hectares d'anciens marais salants et de vasières au fond du Fier d'Ars. Chaque hiver, des milliers de bernaches cravants venues de Sibérie y font halte ; au printemps, avocettes, échasses blanches et aigrettes garzettes y nichent. Les visiteurs observent les oiseaux depuis des postes discrets, sans les déranger." },
      { id: 'c-sel', kind: 'tourism', header: 'Ars-en-Ré · 15 août', title: 'FÊTE DU SEL', icon: 'salt', body: 'Récolte à l\'ancienne, marché, musique', footer: 'Écomusée du marais salant', bg: '#2a7ab0', bg2: '#f0d080',
        name: 'Fête du sel', codex: 'metier-saunier',
        read: "Le sel a fait la richesse de l'île pendant près de mille ans. Les sauniers récoltent encore à la main, avec le « las » (un long râteau), le gros sel au fond des œillets et la fleur de sel qui cristallise en surface les jours chauds et ventés. Au XIXᵉ siècle, l'île comptait plus de 8 000 œillets ; ils sont environ 3 000 aujourd'hui, entretenus par une centaine de sauniers." },
      { id: 'c-vauban', kind: 'tourism', header: 'Saint-Martin-de-Ré', title: 'VAUBAN · UNESCO', icon: 'fleurdelis', iconColor: '#fff3c8', body: 'Exposition : l\'enceinte bastionnée de 1681', footer: 'Patrimoine mondial depuis 2008', bg: '#4a3a6a', bg2: '#e0a060',
        name: 'Exposition Vauban', codex: 'lieu-saintmartin',
        read: "Depuis 2008, les fortifications de Saint-Martin-de-Ré font partie du « réseau des sites majeurs de Vauban » inscrit au patrimoine mondial de l'UNESCO. Sébastien Le Prestre de Vauban dessina en 1681 une enceinte bastionnée capable d'abriter toute la population de l'île en cas d'invasion, avec une citadelle sur le front de mer." },
      { id: 'c-marees', kind: 'tourism', header: 'Pêche à pied', title: 'GRANDES MARÉES', icon: 'shell', body: 'Respectez les tailles minimales et l\'heure de la marée montante', footer: 'Coefficient 112 · basse mer 14 h 32', bg: '#1e4a6a', bg2: '#80c0c8',
        name: 'Grandes marées', codex: 'vie-marees',
        read: "Lors des grandes marées, la mer découvre plusieurs centaines de mètres d'estran autour de l'île. Les pêcheurs à pied y cherchent palourdes, coques et huîtres — en respectant des tailles minimales pour préserver les coquillages. Mais attention : la mer remonte vite, et les écluses à poissons, ces murets de pierre en arc, retiennent alors les poissons comme elles le font depuis des siècles." },
      { id: 'c-conference', kind: 'tourism', header: 'Musée du Phare · samedi 18 h', title: "L'HORLOGE DES MARÉES", icon: 'clock', iconColor: '#3a2a1a', body: "Légende et archives, par Élise Fournier, archiviste", footer: 'Entrée libre', bg: '#5a3a2a', bg2: '#e0c080',
        name: "Conférence : l'Horloge des Marées", codex: 'legende-horloge',
        read: "« Une vieille légende rétaise parle d'une horloge qui ne marque pas les heures, mais les marées et les siècles. Les moines des Châteliers l'appelaient Horologium Maris. Chaque génération en aurait confié une pièce à un gardien… » — Résumé de la conférence d'Élise Fournier, archiviste du musée du phare." },
    ];
    tb.poster(posters[0], 4.5, 15.2, PI, { mount: 'board' });
    tb.poster(posters[1], 21.5, 9.5, -PI / 2, { mount: 'board' });
    tb.poster(posters[2], -9.3, 15.48, PI, { y: 1.6 });
    tb.poster(posters[3], 12, 15.58, PI, { y: 1.6 });
    tb.poster(posters[4], -2, 30, PI, { mount: 'post' });
    tb.poster(posters[5], 9.2, -0.45, 0, { y: 1.55 });

    // pins et tamaris, dont le pin où s'accroche le cerf-volant d'Hugo
    tb.tree(24, 24, 'pine', 1.2);
    tb.spot('pin', 22.6, 24.5);
    tb.tree(-26, 14, 'tamarisk', 1.0);
    tb.tree(-22, 20, 'pine', 1.0);
    tb.tree(32, 24, 'pine', 0.9);
    tb.tree(-4, -24, 'tamarisk', 0.9);
    tb.spot('ecluse', -25, -3, { rot: -PI / 2 });

    // observatoire de la réserve (cabane en bois)
    tb.house(54, -17, PI / 4, { w: 4, d: 3, floors: 1, style: 'old', roof: 'tilesOld', shutter: 0x5a4a32, plinth: false, chimney: false, door: 0x5a4a32 });
    tb.spot('observatoire', 51.5, -14);
    tb.spot('plage', 3, 28);
    tb.spot('poubelle', 0, 26);
    tb.mesh(new THREE.CylinderGeometry(0.35, 0.3, 0.9, 10), flat(0x2a6a3a, 0.6), 1.4, 0.45, 26, { col: 0.4 });

    // bateaux : kayak de location et vedette au mouillage
    tb.boat(-30, 8, -PI / 2, 'kayak', { boardable: true, label: 'Prendre le kayak' });
    tb.boat(-36, -16, 0.4, 'modern');

    // chemins des figurants
    tb.path('parvis', [[-12, 8], [12, 8], [16, 12], [-14, 12]]);
    tb.path('route', [[20, 9], [46, 9.5], [62, 11], [46, 10], [20, 9.5]]);
    tb.path('plage', [[0, 14], [2, 26], [6, 32], [-4, 30], [0, 14]]);
  },
};
