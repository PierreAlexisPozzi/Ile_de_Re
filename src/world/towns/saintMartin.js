// XVIIᵉ siècle (1681) — Saint-Martin-de-Ré au moment où Vauban trace sa
// nouvelle enceinte. Le port en bassin avec son îlot central, les quais bordés
// de maisons de négoce, la Grande Rue qui monte vers l'église fortifiée,
// l'enceinte bastionnée en étoile (achevée à l'ouest, en chantier à l'est),
// la porte Toiras, la citadelle sur la mer, la batterie côtière, et la flûte
// hollandaise venue charger le sel.

import * as THREE from 'three';
import { MAT, flat } from '../materials.js';
import { box, gableRoofGeometry } from '../builder.js';
import { ICONS } from '../../gfx/signs.js';

const PI = Math.PI;
const R = 44;                       // rayon de la courtine
const TIPS = [PI + 0.12, PI * 0.69, PI * 0.31, -0.12];   // pointes des bastions (0 = est, π/2 = sud)
const P = (a, r) => [Math.cos(a) * r, Math.sin(a) * r];

function royalFlag() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 160;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1e3a8a';
  ctx.fillRect(0, 0, 256, 160);
  ICONS.fleurdelis(ctx, 80, 55, 70, '#e8c050');
  ICONS.fleurdelis(ctx, 176, 55, 70, '#e8c050');
  ICONS.fleurdelis(ctx, 128, 115, 70, '#e8c050');
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export default {
  radius: 50,
  carves: [
    { x0: -16, z0: -46, x1: 16, z1: -35 },
    { x0: -16, z0: -35, x1: -7, z1: -25 },
    { x0: 7, z0: -35, x1: 16, z1: -25 },
    { x0: -16, z0: -25, x1: -1.6, z1: -21.5 },
    { x0: 1.6, z0: -25, x1: 16, z1: -21.5 },
  ],
  build(tb, flags) {
    tb.spot('spawn', 0, 52, { rot: PI });
    const pave = MAT.pave();
    const top = tb.h;

    // ---------- quais du bassin et îlot ----------
    tb.quayEdge(-16, -21.5, -1.6, -21.5, top);
    tb.quayEdge(1.6, -21.5, 16, -21.5, top);
    tb.quayEdge(-16, -21.5, -16, -38, top);
    tb.quayEdge(16, -21.5, 16, -38, top);
    tb.quayEdge(-7, -25, 7, -25, top);
    tb.quayEdge(-7, -25, -7, -35, top);
    tb.quayEdge(7, -25, 7, -35, top);
    tb.quayEdge(-7, -35, 7, -35, top);
    for (const x of [-16.5, 16.5]) for (let z = -37; z <= -23; z += 2.8) tb.colL(x, z, 0.7);
    tb.plaza(0, -18.5, 40, 6, pave);
    tb.plaza(0, -30, 13.4, 9.4, pave);
    tb.plaza(0, -23.3, 3.2, 3.6, pave);
    for (const sx of [-1, 1]) tb.wall(sx * 1.8, -21.6, sx * 1.8, -25, 1.0, 0.25, MAT.stonePale());
    tb.spot('quai', -8, -19.5, { rot: PI });
    tb.spot('quai-est', 9, -19.5, { rot: PI });
    tb.spot('ilot', 0, -27.5);
    // maisons de l'îlot (entrepôts de sel)
    tb.house(-3.2, -31.6, PI / 2, { style: 'cream', w: 5.6, d: 5.2, floors: 2, roof: 'tilesOld', shutter: 0x57705e, plinth: false, door: 0x4a3420 });
    tb.house(3.2, -31.6, -PI / 2, { style: 'old', w: 5.6, d: 5.2, floors: 2, roof: 'tilesOld', shutter: 0x4a5560, plinth: false, door: 0x4a3420 });
    for (let i = 0; i < 4; i++) tb.bollard(-14 + i * 9.4, -20.6);
    // bateaux au port et flûte hollandaise au mouillage
    tb.boat(-11.5, -30, 0.1, 'chaloupe', { boardable: true, label: 'Prendre la chaloupe' });
    tb.boat(11.5, -29, -0.1, 'sail');
    tb.boat(-4, -41, 0.3, 'row');
    tb.boat(-30, -56, 1.2, 'ship');
    tb.spot('flute', -24, -36, { rot: PI });

    // ---------- maisons des quais (façades sur le port) ----------
    const xvii = { style: 'cream', roof: 'tilesOld', plinth: 0x8a8472, shutter: 0x57705e, door: 0x3a2a1a, roofPitch: 0.45, quoins: true };
    tb.house(-11, -12.4, PI, {
      ...xvii, w: 7, d: 6.6, floors: 2,
      shop: { id: 'tonneau', name: "Au Tonneau d'Or", kind: 'vitrine', color: 0x6a2a1a, goods: ['wine'],
        sign: { text: "Au Tonneau d'Or", sub: 'Vins · Sels · Eaux-de-vie', style: 'carved', icon: 'barrel' }, hanging: { icon: 'barrel', bg: '#4a2a14' } },
    });
    tb.house(-19, -12.4, PI, {
      ...xvii, w: 7, d: 6.6, floors: 2,
      shop: { id: 'cabaret', name: 'Cabaret de la Marine', kind: 'etal', goods: ['barrels'],
        sign: { text: 'Cabaret de la Marine', sub: 'Vin, bière et tabac', style: 'carved', icon: 'ship' }, hanging: { icon: 'anchor', bg: '#2a3a5a' } },
    });
    tb.row(-34, -15.4, -22.6, -15.4, 1, { ...xvii, floors: 2 });
    tb.row(8.5, -15.4, 15.5, -15.4, 1, { ...xvii, floors: 2 });
    tb.row(-21, -22, -21, -33, -1, { ...xvii, floors: 2, shutters: [0x57705e, 0x4a5560] });

    // ---------- Grande Rue, place et église ----------
    tb.street([[0, -16], [0, 0], [0, 20], [0, 40], [0, 52]], 5.0, pave);
    tb.street([[-30, 0], [0, 0], [14, 0]], 4.2, pave);
    tb.street([[-26, 12], [0, 12], [14, 12]], 3.6, pave);
    tb.plaza(-14, 5.5, 10, 7, pave);
    tb.spot('place', -14, 4.2);
    tb.well(-14, 6.4);
    tb.house(-6, -5.6, PI / 2, {
      ...xvii, w: 6, d: 7, floors: 2,
      shop: { id: 'horlogerie', name: 'Horlogerie Lenoir', kind: 'vitrine', color: 0x2a3a2a, goods: ['clock'],
        sign: { text: 'Horlogerie', sub: 'Ambroise Lenoir, maître horloger', style: 'carved', icon: 'clock' }, hanging: { icon: 'clock', bg: '#2a2a2a', style: 'iron' } },
    });
    tb.house(6, -5.6, -PI / 2, {
      ...xvii, w: 6, d: 7, floors: 2, style: 'old',
      shop: { id: 'boulangerie', name: 'Boulangerie Toinette', kind: 'etal', goods: ['bread', 'baguettes'],
        hanging: { icon: 'bread', bg: '#6a3a1a', text: 'Pain' } },
    });
    tb.house(-6, 6.6, PI / 2, {
      ...xvii, w: 6, d: 7, floors: 2,
      shop: { id: 'apothicaire', name: 'Apothicaire', kind: 'vitrine', color: 0x2a4a3a, goods: ['pots'],
        sign: { text: 'Apothicaire', sub: 'Drogues · Simples · Onguents', style: 'carved', icon: 'mortar' }, hanging: { icon: 'mortar', bg: '#2a4a3a' } },
    });
    tb.house(6, 6.6, -PI / 2, {
      ...xvii, w: 6, d: 7, floors: 2, style: 'old',
      shop: { id: 'barbier', name: 'Barbier-chirurgien', kind: 'vitrine', color: 0x5a1a1a, goods: [],
        sign: { text: 'Barbier', sub: 'Barbe · Saignées · Dents', style: 'carved', icon: 'scissors' }, hanging: { icon: 'scissors', bg: '#5a1a1a' } },
    });
    tb.spot('horloger', -1.0, -4.2, { rot: PI / 2 });
    // rangées le long de la Grande Rue
    tb.row(-3, 16, -3, 38, 1, { ...xvii, floors: 1, twoFloorChance: 0.4, style: 'whitewash' });
    tb.row(3, 38, 3, 16, 1, { ...xvii, floors: 1, twoFloorChance: 0.4, style: 'whitewash' });
    tb.row(-30, -2.4, -9.5, -2.4, -1, { ...xvii, floors: 2 });
    tb.row(-30, 2.4, -19.2, 2.4, 1, { ...xvii, floors: 1, twoFloorChance: 0.5 });
    // l'église Saint-Martin, massive et fortifiée
    const ch = new THREE.Group();
    const nave = new THREE.Mesh(box(10, 9, 22, 3), MAT.stoneOld());
    nave.position.y = 4.2;
    ch.add(nave);
    const nr = new THREE.Mesh(gableRoofGeometry(10, 22, 3.6), [MAT.slate(), MAT.stoneOld()]);
    nr.position.y = 8.7;
    ch.add(nr);
    const tower = new THREE.Mesh(box(7, 22, 7, 3), MAT.stoneOld());
    tower.position.set(0, 10.6, -14);
    ch.add(tower);
    const crown = new THREE.Mesh(box(8, 1, 8, 3), MAT.stonePale());
    crown.position.set(0, 21.8, -14);
    ch.add(crown);
    for (let k = 0; k < 12; k++) {
      const side = Math.floor(k / 3), t = (k % 3) - 1;
      const pos = [[t * 2.6, 3.8], [3.8, t * 2.6], [t * 2.6, -3.8], [-3.8, t * 2.6]][side];
      const mer = new THREE.Mesh(box(0.9, 1.0, 0.5), MAT.stoneOld());
      mer.position.set(pos[0], 22.7, -14 + pos[1]);
      ch.add(mer);
    }
    const clock = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.2, 20), MAT.white());
    clock.rotation.z = PI / 2;
    clock.position.set(-3.6, 15, -14);
    ch.add(clock);
    const hand = new THREE.Mesh(box(0.1, 1.1, 0.12), MAT.black());
    hand.position.set(-3.75, 15.4, -14);
    ch.add(hand);
    const portal = new THREE.Mesh(box(0.3, 3.6, 2.2), MAT.black());
    portal.position.set(-5.1, 1.8, 2);
    ch.add(portal);
    tb.put(ch, 20, 6, { col: 0 });
    tb.footprint(20, 6, 10, 22, 0);
    tb.colL(20, -8, 4.4);
    tb.spot('eglise', 13, 8, { rot: -PI / 2 });
    tb.spot('clocher', 15.2, -8, { rot: -PI / 2 });

    // ---------- l'enceinte bastionnée ----------
    const stone = MAT.rampart();
    const built = (a) => Math.cos(a) < 0.25;          // l'ouest et le sud sont achevés
    const points = [];
    TIPS.forEach((t, k) => {
      const tip = P(t, R + 13);
      const sL = P(t + 0.17, R), sR = P(t - 0.17, R);
      const h = built(t) ? 6 : 2.4;
      tb.wall(sL[0], sL[1], tip[0], tip[1], h, 3, stone);
      tb.wall(tip[0], tip[1], sR[0], sR[1], h, 3, stone);
      points.push([sL, sR, t]);
      if (built(t)) tb.cannon(...P(t, R + 7), -t + PI / 2);
      tb.spot('bastion' + k, ...P(t, R - 4));
    });
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k][1], b = points[k + 1][0];
      const mid = (points[k][2] + points[k + 1][2]) / 2;
      const h = built(mid) ? 6 : 2.4;
      if (k === 1) {
        // courtine sud percée de la porte Toiras
        const g0 = P(PI / 2 + 0.1, R), g1 = P(PI / 2 - 0.1, R);
        tb.wall(a[0], a[1], g0[0], g0[1], h, 3, stone);
        tb.wall(g1[0], g1[1], b[0], b[1], h, 3, stone);
      } else tb.wall(a[0], a[1], b[0], b[1], h, 3, stone);
    }
    // raccord à la mer : à l'ouest jusqu'au rivage, à l'est vers la citadelle
    const w0 = points[0][0];
    tb.wall(w0[0], w0[1], -46, -30, 6, 3, stone);
    const e0 = points[3][1];
    tb.wall(e0[0], e0[1], 26, -14, 2.4, 3, stone);
    // fossé au pied des murs
    tb.street(TIPS.map((t) => P(t, R + 16)).reverse(), 5, MAT.dirt(), 0.03);

    // la porte Toiras (pavillon de pierre au sud)
    const gate = new THREE.Group();
    const body = new THREE.Mesh(box(10, 8, 7, 3), MAT.stonePale());
    body.position.y = 3.8;
    gate.add(body);
    const pass = new THREE.Mesh(box(3.6, 4.6, 7.2), MAT.black());
    pass.position.y = 2.3;
    gate.add(pass);
    const pedi = new THREE.Mesh(new THREE.ConeGeometry(5.8, 2.4, 3), MAT.stonePale());
    pedi.rotation.y = PI / 2;
    pedi.scale.z = 0.2;
    pedi.position.set(0, 9, 3.4);
    gate.add(pedi);
    const groof = new THREE.Mesh(gableRoofGeometry(10, 7, 2.6), [MAT.slate(), MAT.stonePale()]);
    groof.rotation.y = PI / 2;
    groof.position.y = 7.8;
    gate.add(groof);
    const arms = new THREE.Mesh(new THREE.CircleGeometry(0.9, 18), new THREE.MeshStandardMaterial({ map: royalFlag() }));
    arms.position.set(0, 6, 3.55);
    gate.add(arms);
    tb.put(gate, 0, R, { col: 0 });
    for (const sx of [-1, 1]) { tb.colL(sx * 3.8, R, 1.6); tb.colL(sx * 3.8, R - 2.4, 1.2); tb.colL(sx * 3.8, R + 2.4, 1.2); }
    tb.spot('porte', 0, R + 6, { rot: PI });
    tb.spot('poste', 3.2, R + 5, { rot: PI });

    // chantier de l'est : jalons, terre, échafaudages
    tb.spot('chantier', ...P(TIPS[2] - 0.3, R - 6));
    tb.spot('jalon1', ...P(TIPS[3] + 0.4, R + 3));
    tb.spot('jalon2', ...P(TIPS[3] + 0.24, R + 8));
    tb.spot('jalon3', ...P(TIPS[2] - 0.18, R + 6));
    tb.scaffolding(...P(TIPS[2] - 0.3, R + 1), 5, 4, -(TIPS[2] - 0.3) + PI / 2);
    for (let i = 0; i < 4; i++) tb.crate(...P(TIPS[2] - 0.45 - i * 0.04, R - 5 - i * 0.6), 0.8);
    // tente de travail de Vauban (table à dessin)
    const tent = new THREE.Group();
    const canvas = new THREE.Mesh(new THREE.ConeGeometry(3.2, 3.6, 4, 1, true), flat(0xe8e0c8, 0.95, 0, { side: THREE.DoubleSide }));
    canvas.rotation.y = PI / 4;
    canvas.position.y = 1.8;
    tent.add(canvas);
    const table = new THREE.Mesh(box(1.8, 0.08, 1.0), MAT.woodDark());
    table.position.set(0, 0.85, 2.6);
    tent.add(table);
    const plan = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8), flat(0xe8dcb0, 0.9));
    plan.rotation.x = -PI / 2;
    plan.position.set(0, 0.9, 2.6);
    tent.add(plan);
    for (const [sx, sz] of [[-0.8, 2.2], [0.8, 2.2], [-0.8, 3.0], [0.8, 3.0]]) {
      const leg = new THREE.Mesh(box(0.06, 0.85, 0.06), MAT.woodDark());
      leg.position.set(sx, 0.42, sz);
      tent.add(leg);
    }
    tb.put(tent, -20, 24, { rot: 0.6, col: 2.6 });
    tb.spot('vauban', -18.6, 27, { rot: 0.6 + PI });
    tb.spot('table', -18.2, 26.4);

    // ---------- la citadelle (en construction, sur la mer) ----------
    const C = { x: 36, z: -24, s: 11 };
    tb.wall(C.x - C.s, C.z - C.s, C.x + C.s, C.z - C.s, 6, 2.6, stone);
    tb.wall(C.x + C.s, C.z - C.s, C.x + C.s, C.z + C.s, 6, 2.6, stone);
    tb.wall(C.x + C.s, C.z + C.s, C.x - C.s, C.z + C.s, 6, 2.6, stone);
    tb.wall(C.x - C.s, C.z + C.s, C.x - C.s, C.z + 3, 6, 2.6, stone);
    tb.wall(C.x - C.s, C.z - 3, C.x - C.s, C.z - C.s, 6, 2.6, stone);
    for (const [sx, sz] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
      const bx = C.x + sx * C.s, bz = C.z + sz * C.s;
      tb.wall(bx - sx * 3, bz, bx + sx * 4, bz + sz * 4, 6, 2.4, stone);
      tb.wall(bx + sx * 4, bz + sz * 4, bx, bz - sz * 3, 6, 2.4, stone);
    }
    tb.house(C.x + 2, C.z - 5, 0, { ...xvii, style: 'grey', w: 14, d: 5, floors: 2, roof: 'slate', shutter: 0x4a5560, quoins: false });
    tb.house(C.x + 5, C.z + 5, PI, { ...xvii, style: 'stone', w: 5, d: 4, floors: 1, roof: 'slate', door: 0x2a2a2a, closed: true, chimney: false });
    tb.spot('arsenal', C.x + 5, C.z + 1.6, { rot: 0 });
    tb.spot('citadelle', C.x - C.s - 3, C.z, { rot: PI / 2 });
    tb.spot('place-armes', C.x - 4, C.z + 2);
    tb.flagpole(C.x - 4, C.z + 6, royalFlag(), 11);
    tb.spot('drapeau', C.x - 4, C.z + 7.6);
    // batterie côtière sur le front de mer
    for (const [x, z] of [[18.6, -31], [21.8, -31], [18.6, -27]]) tb.cannon(x, z, PI);
    tb.spot('batterie', 21.5, -27.4, { rot: PI });
    tb.spot('canon0', 18.6, -29.4); tb.spot('canon1', 21.8, -29.4); tb.spot('canon2', 18.6, -25.4);
    for (let i = 0; i < 6; i++) tb.mesh(new THREE.SphereGeometry(0.15, 8, 6), MAT.iron(), 22.6 + (i % 3) * 0.35, 0.15, -26 + Math.floor(i / 3) * 0.35);

    // ---------- l'ancien fort de Toiras (vestiges du siège de 1627) ----------
    for (let i = 0; i < 4; i++) tb.rock(-40 + i * 2.2, 4 + (i % 2) * 1.6, 1.0 + tb.rng() * 0.5, MAT.stoneOld());
    tb.spot('vieux-fort', -36, 8);

    // jardins et vignes à l'intérieur des murs (refuge des habitants en cas de siège)
    tb.vineRows(-36, 16, 5, 10);
    tb.vineRows(14, 22, 6, 10);
    for (const [x, z] of [[-14, 34], [18, 38], [-30, 4], [26, 8], [10, 30]]) tb.tree(x, z, 'elm', 0.9 + tb.rng() * 0.3);

    // affiches : ordonnance royale, enrôlement, vente de sel
    tb.poster({ id: 'ordonnance', kind: 'ordonnance', title: 'Ordonnance sur les fortifications', name: 'Ordonnance du roi',
      body: "Il est ordonné à tous les habitants de l'Isle de Ré de prêter main-forte aux travaux de l'enceinte et de la citadelle de Saint-Martin, selon les plans du sieur de Vauban, commissaire général des fortifications, à peine de vingt livres d'amende.",
      footer: 'Fait à Saint-Germain-en-Laye, le 12 avril 1681. LOUIS.', codex: 'histoire-vauban-re',
      read: "En 1681, Louis XIV charge Vauban de fortifier Saint-Martin pour protéger l'île — et La Rochelle — des flottes anglaise et hollandaise. Vauban dessine une enceinte bastionnée assez vaste pour abriter toute la population de l'île et son bétail, et une citadelle sur la mer. Les travaux mobilisent soldats, ouvriers payés et corvées d'habitants pendant des années." },
    -10.2, 2.9, PI, { mount: 'board', y: 1.4 });
    tb.poster({ id: 'enrolement', kind: 'notice', font: 'fell', title: 'AVIS — ENRÔLEMENT', name: 'Avis de recrutement',
      body: "On fait savoir que le régiment de Navarre, en garnison en cette ville, reçoit les hommes de bonne volonté, âgés de dix-huit à quarante ans, de la taille de cinq pieds au moins. Il leur sera donné un écu d'engagement.", footer: 'Le capitaine de La Roque', codex: 'vie-soldat-xvii',
      read: "Sous Louis XIV, l'armée se recrute par engagement volontaire (parfois forcé…) : un « écu d'engagement » est versé à la signature. Les soldats portent le justaucorps gris-blanc de l'infanterie, avec revers aux couleurs du régiment, et le mousquet à mèche, bientôt remplacé par le fusil à silex." },
    -3, 20, PI / 2, { mount: 'board', y: 1.4 });
    tb.poster({ id: 'vente-sel', kind: 'notice', font: 'fell', title: 'Vente de sel', name: 'Annonce de vente de sel',
      body: "Jeudi prochain, sur le quai, vente à la criée de trois cents muids de sel blanc des marais d'Ars et de Loix, pour le compte de la dame Gendron, négociante.", footer: 'Payable en livres tournois', codex: 'histoire-sel-xvii',
      read: "Au XVIIᵉ siècle, le sel de l'île de Ré est l'un des plus réputés d'Europe. Des flottes entières, surtout hollandaises et nordiques, viennent le charger à Saint-Martin et à Ars. Il se vend au « muid », une mesure variable selon les ports. Le roi le taxe lourdement par la gabelle, mais les provinces de l'Ouest en sont en partie exemptées." },
    -14.5, -15.7, PI, { mount: 'board', y: 1.4 });

    // chemins des figurants
    tb.path('grande-rue', [[1.5, -14], [1.5, 40], [-1.5, 40], [-1.5, -14]]);
    tb.path('quais', [[-14, -19], [14, -19], [14, -18], [-14, -18]]);
    const rp = (a) => P(a, R - 5);
    tb.path('ronde', [rp(TIPS[0]), rp(TIPS[1]), rp(PI / 2), rp(TIPS[2]), rp(TIPS[3]), rp(TIPS[2]), rp(PI / 2), rp(TIPS[1])]);
  },
};
