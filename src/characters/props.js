// Objets tenus en main : sagaie, panier, amphore, tablette de cire, plans
// roulés, marteau, las de saunier, filet, mousquet, fusil, lanterne,
// appareil photo, jumelles… Chaque objet est construit dans le repère de la
// main (origine au poignet, axe -y le long des doigts quand le bras pend).
//
// `vertical: true` : le moteur d'animation garde l'objet à la verticale
// (hampes, perches) en compensant l'inclinaison du bras.

import * as THREE from 'three';
import { clothMat, flatMat } from '../gfx/cloth.js';
import { geo } from './costumes.js';

const PI = Math.PI;
const wood = () => clothMat({ c: 0x7a5a36, p: 'wood', rough: 0.8 });
const darkWood = () => clothMat({ c: 0x4a321c, p: 'wood', rough: 0.8 });
const iron = () => flatMat(0x55575a, 0.45, 0.75);
const brass = () => flatMat(0xc8a050, 0.35, 0.8);

function m(g, mat, shadow = true) {
  const o = new THREE.Mesh(g, mat);
  o.castShadow = shadow;
  return o;
}

// Hampe verticale centrée sur la prise ; bas à ~0.86 m sous la main.
function pole(len, r = 0.016, mat = wood()) {
  const p = m(geo(`pole-${len}-${r}`, () => new THREE.CylinderGeometry(r, r * 1.1, len, 8)), mat);
  p.position.y = len / 2 - 0.86;
  return p;
}

const BUILDERS = {
  spear() {
    const g = new THREE.Group();
    g.add(pole(1.95, 0.016));
    const tip = m(geo('flinttip', () => new THREE.ConeGeometry(0.03, 0.14, 4)), flatMat(0x6a6a72, 0.5));
    tip.position.y = 1.09 + 0.07;
    tip.scale.z = 0.4;
    g.add(tip);
    return { g, vertical: true };
  },
  pike() {
    const g = new THREE.Group();
    g.add(pole(2.4, 0.018, darkWood()));
    const tip = m(geo('piketip', () => new THREE.ConeGeometry(0.025, 0.22, 4)), iron());
    tip.position.y = 1.54 + 0.11;
    g.add(tip);
    return { g, vertical: true };
  },
  staff() {
    const g = new THREE.Group();
    g.add(pole(1.7, 0.02, darkWood()));
    const knob = m(geo('staffknob', () => new THREE.SphereGeometry(0.03, 8, 6)), darkWood());
    knob.position.y = 0.86;
    g.add(knob);
    return { g, vertical: true };
  },
  pilgrimstaff() {
    const g = BUILDERS.staff().g;
    const gourd = m(geo('gourd', () => new THREE.SphereGeometry(0.05, 8, 6)), flatMat(0xb8904a, 0.7));
    gourd.position.set(0.05, 0.6, 0);
    gourd.scale.y = 1.3;
    g.add(gourd);
    return { g, vertical: true };
  },
  rake() {
    // « las » du saunier : longue perche terminée par une planchette
    const g = new THREE.Group();
    g.add(pole(2.6, 0.015));
    const board = m(geo('lasboard', () => new THREE.BoxGeometry(0.4, 0.1, 0.02)), wood());
    board.position.y = -0.82;
    g.add(board);
    return { g, vertical: true };
  },
  broom() {
    const g = new THREE.Group();
    g.add(pole(1.3, 0.014));
    const head = m(geo('broomhead', () => new THREE.ConeGeometry(0.09, 0.3, 8)), clothMat({ c: 0xb89a5a, p: 'straw' }));
    head.position.y = -0.86 + 0.12;
    g.add(head);
    return { g, vertical: true };
  },
  oar() {
    const g = new THREE.Group();
    g.add(pole(2.2, 0.018));
    const blade = m(geo('oarblade', () => new THREE.BoxGeometry(0.14, 0.5, 0.02)), wood());
    blade.position.y = -0.86 + 0.25;
    g.add(blade);
    return { g, vertical: true };
  },
  musket() {
    const g = new THREE.Group();
    const stock = m(geo('musketstock', () => new THREE.BoxGeometry(0.045, 0.55, 0.07)), darkWood());
    stock.position.y = -0.55;
    const barrel = m(geo('musketbarrel', () => new THREE.CylinderGeometry(0.012, 0.014, 1.15, 8)), iron());
    barrel.position.y = 0.25;
    g.add(stock, barrel);
    return { g, vertical: true };
  },
  rifle() {
    const g = new THREE.Group();
    const stock = m(geo('riflestock', () => new THREE.BoxGeometry(0.04, 0.5, 0.06)), darkWood());
    stock.position.y = -0.5;
    const barrel = m(geo('riflebarrel', () => new THREE.CylinderGeometry(0.01, 0.012, 0.85, 8)), iron());
    barrel.position.y = 0.15;
    const sling = m(geo('riflesling', () => new THREE.BoxGeometry(0.01, 0.7, 0.02)), clothMat({ c: 0x3a3022, p: 'leather' }));
    sling.position.set(0, -0.2, -0.04);
    g.add(stock, barrel, sling);
    return { g, vertical: true };
  },
  sword() {
    // épée au fourreau, portée à la ceinture (main gauche)
    const g = new THREE.Group();
    const sheath = m(geo('sheath', () => new THREE.BoxGeometry(0.035, 0.8, 0.02)), clothMat({ c: 0x2a1e14, p: 'leather' }));
    sheath.position.set(0.04, -0.4, -0.06);
    sheath.rotation.x = 0.35;
    const hilt = m(geo('hilt', () => new THREE.BoxGeometry(0.12, 0.02, 0.02)), brass());
    hilt.position.set(0.04, 0.02, 0.06);
    g.add(sheath, hilt);
    return { g };
  },
  torch() {
    const g = new THREE.Group();
    const p = m(geo('torchstick', () => new THREE.CylinderGeometry(0.02, 0.025, 0.55, 6)), darkWood());
    p.position.y = 0.15;
    const flame = m(geo('torchflame', () => new THREE.ConeGeometry(0.05, 0.16, 6)), new THREE.MeshBasicMaterial({ color: 0xffa040 }), false);
    flame.position.y = 0.5;
    g.add(p, flame);
    return { g, vertical: true, light: 0xffa040 };
  },
  stoneaxe() {
    const g = new THREE.Group();
    const h = m(geo('axehandle', () => new THREE.CylinderGeometry(0.015, 0.018, 0.5, 6)), wood());
    h.position.y = 0.12;
    const head = m(geo('axehead', () => new THREE.BoxGeometry(0.05, 0.1, 0.12)), flatMat(0x5a5a60, 0.6));
    head.position.set(0, 0.34, 0.04);
    g.add(h, head);
    return { g, vertical: true };
  },
  hammer() {
    const g = new THREE.Group();
    const h = m(geo('hammerhandle', () => new THREE.CylinderGeometry(0.014, 0.016, 0.34, 6)), wood());
    h.position.y = -0.1;
    h.rotation.x = PI / 2;
    h.position.set(0, -0.07, 0.1);
    const head = m(geo('hammerhead', () => new THREE.BoxGeometry(0.05, 0.05, 0.12)), iron());
    head.position.set(0, -0.07, 0.26);
    head.rotation.x = PI / 2;
    g.add(h, head);
    return { g };
  },
  basket() {
    const g = new THREE.Group();
    const b = m(geo('basket', () => new THREE.CylinderGeometry(0.15, 0.11, 0.16, 12, 1, true)), new THREE.MeshStandardMaterial({
      map: clothMat({ c: 0xb08a50, p: 'straw' }).map, side: THREE.DoubleSide, roughness: 0.9,
    }));
    b.position.y = -0.3;
    const bottom = m(geo('basketbottom', () => new THREE.CircleGeometry(0.11, 12)), clothMat({ c: 0xa07a40, p: 'straw' }));
    bottom.rotation.x = -PI / 2;
    bottom.position.y = -0.38;
    const handle = m(geo('baskethandle', () => new THREE.TorusGeometry(0.14, 0.008, 4, 12, PI)), wood());
    handle.position.y = -0.22;
    const fill = m(geo('basketfill', () => new THREE.SphereGeometry(0.12, 8, 5, 0, PI * 2, 0, PI / 2)), flatMat(0xc8b080, 0.8));
    fill.position.y = -0.27;
    fill.scale.y = 0.4;
    g.add(b, bottom, handle, fill);
    return { g };
  },
  amphora() {
    const g = new THREE.Group();
    const pts = [[0.001, -0.3], [0.03, -0.27], [0.1, -0.12], [0.12, 0.0], [0.1, 0.1], [0.05, 0.16], [0.035, 0.25], [0.04, 0.27]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    const a = m(geo('amphorabody', () => new THREE.LatheGeometry(pts, 12)), flatMat(0xb5703a, 0.8));
    a.position.set(0, -0.12, 0.12);
    a.rotation.x = -0.3;
    g.add(a);
    return { g };
  },
  tablet() {
    const g = new THREE.Group();
    const t = m(geo('waxtablet', () => new THREE.BoxGeometry(0.16, 0.012, 0.12)), darkWood());
    t.position.set(0, -0.08, 0.07);
    const wax = m(geo('wax', () => new THREE.BoxGeometry(0.14, 0.004, 0.1)), flatMat(0x2a2218, 0.5));
    wax.position.set(0, -0.072, 0.07);
    g.add(t, wax);
    return { g };
  },
  scroll() {
    const g = new THREE.Group();
    const s = m(geo('scroll', () => new THREE.CylinderGeometry(0.022, 0.022, 0.26, 10)), flatMat(0xe8dcb8, 0.8));
    s.rotation.z = PI / 2;
    s.position.set(0, -0.08, 0.04);
    g.add(s);
    return { g };
  },
  plans() {
    const g = new THREE.Group();
    const s = m(geo('plansroll', () => new THREE.CylinderGeometry(0.03, 0.03, 0.6, 10)), flatMat(0xe6dcc0, 0.8));
    s.rotation.x = PI / 2 - 0.4;
    s.position.set(0, -0.07, 0.12);
    g.add(s);
    return { g };
  },
  book() {
    const g = new THREE.Group();
    const b = m(geo('book', () => new THREE.BoxGeometry(0.16, 0.035, 0.22)), clothMat({ c: 0x6a2a1a, p: 'leather' }));
    b.position.set(0, -0.08, 0.08);
    g.add(b);
    return { g };
  },
  lantern() {
    const g = new THREE.Group();
    const frame = m(geo('lanternframe', () => new THREE.CylinderGeometry(0.06, 0.07, 0.18, 6)), iron());
    frame.position.y = -0.22;
    const glow = m(geo('lanternglow', () => new THREE.CylinderGeometry(0.045, 0.05, 0.12, 6)),
      new THREE.MeshStandardMaterial({ color: 0xffe0a0, emissive: 0xffb050, emissiveIntensity: 1.2 }), false);
    glow.position.y = -0.22;
    const ring = m(geo('lanternring', () => new THREE.TorusGeometry(0.03, 0.006, 4, 10)), iron());
    ring.position.y = -0.09;
    g.add(frame, glow, ring);
    return { g, light: 0xffb050 };
  },
  net() {
    const g = new THREE.Group();
    const n = m(geo('netbundle', () => new THREE.SphereGeometry(0.16, 8, 6)), clothMat({ c: 0x8a7a5a, p: 'mail' }));
    n.scale.set(1, 1.4, 0.6);
    n.position.set(0, -0.2, 0.05);
    g.add(n);
    return { g };
  },
  fish() {
    const g = new THREE.Group();
    const f = m(geo('fishbody', () => new THREE.SphereGeometry(0.06, 8, 6)), flatMat(0x8a9aa0, 0.4, 0.3));
    f.scale.set(0.5, 2.6, 0.9);
    f.position.y = -0.2;
    g.add(f);
    return { g };
  },
  bread() {
    const g = new THREE.Group();
    const loaf = m(geo('loaf', () => new THREE.SphereGeometry(0.08, 10, 8)), flatMat(0xb87a3a, 0.8));
    loaf.scale.set(1, 0.6, 1.4);
    loaf.position.set(0, -0.09, 0.06);
    g.add(loaf);
    return { g };
  },
  baguette() {
    const g = new THREE.Group();
    const b = m(geo('baguette', () => new THREE.CapsuleGeometry(0.025, 0.5, 4, 8)), flatMat(0xc8904a, 0.8));
    b.position.set(0, -0.07, 0.05);
    b.rotation.x = 0.4;
    g.add(b);
    return { g };
  },
  bottle() {
    const g = new THREE.Group();
    const b = m(geo('bottle', () => new THREE.CylinderGeometry(0.03, 0.035, 0.22, 10)), flatMat(0x2a4a2a, 0.15, 0.2));
    b.position.set(0, -0.08, 0.05);
    g.add(b);
    return { g };
  },
  mug() {
    const g = new THREE.Group();
    const c = m(geo('mug', () => new THREE.CylinderGeometry(0.035, 0.032, 0.09, 10)), flatMat(0x9a6a3a, 0.7));
    c.position.set(0, -0.07, 0.05);
    g.add(c);
    return { g };
  },
  camera() {
    const g = new THREE.Group();
    const body = m(geo('camerabody', () => new THREE.BoxGeometry(0.13, 0.08, 0.06)), flatMat(0x1a1a1a, 0.4));
    body.position.set(0, -0.06, 0.06);
    const lens = m(geo('cameralens', () => new THREE.CylinderGeometry(0.03, 0.03, 0.07, 12)), flatMat(0x222222, 0.3, 0.4));
    lens.rotation.x = PI / 2;
    lens.position.set(0, -0.06, 0.12);
    g.add(body, lens);
    return { g };
  },
  phone() {
    const g = new THREE.Group();
    const p = m(geo('phone', () => new THREE.BoxGeometry(0.07, 0.14, 0.008)), flatMat(0x111318, 0.2, 0.4));
    p.position.set(0, -0.08, 0.04);
    g.add(p);
    return { g };
  },
  binoculars() {
    const g = new THREE.Group();
    for (const sx of [-1, 1]) {
      const t = m(geo('binotube', () => new THREE.CylinderGeometry(0.022, 0.026, 0.12, 10)), flatMat(0x2a2e26, 0.5));
      t.rotation.x = PI / 2;
      t.position.set(sx * 0.03, -0.06, 0.06);
      g.add(t);
    }
    return { g };
  },
  map() {
    const g = new THREE.Group();
    const p = m(geo('mapsheet', () => new THREE.BoxGeometry(0.28, 0.004, 0.2)), flatMat(0xe8dcb0, 0.9));
    p.position.set(0, -0.07, 0.1);
    p.rotation.x = -0.3;
    g.add(p);
    return { g };
  },
  clipboard() {
    const g = new THREE.Group();
    const p = m(geo('clipboard', () => new THREE.BoxGeometry(0.22, 0.3, 0.01)), flatMat(0x8a6a3a, 0.7));
    p.position.set(0, -0.08, 0.06);
    p.rotation.x = -0.9;
    g.add(p);
    return { g };
  },
  bucket() {
    const g = new THREE.Group();
    const b = m(geo('bucket', () => new THREE.CylinderGeometry(0.12, 0.1, 0.22, 12)), wood());
    b.position.y = -0.3;
    g.add(b);
    return { g };
  },
  pipe() {
    const g = new THREE.Group();
    const stem = m(geo('pipestem', () => new THREE.CylinderGeometry(0.005, 0.005, 0.14, 5)), darkWood());
    stem.rotation.x = PI / 2;
    stem.position.set(0, -0.07, 0.07);
    const bowl = m(geo('pipebowl', () => new THREE.CylinderGeometry(0.018, 0.014, 0.04, 8)), darkWood());
    bowl.position.set(0, -0.06, 0.14);
    g.add(stem, bowl);
    return { g };
  },
  quill() {
    const g = new THREE.Group();
    const q = m(geo('quill', () => new THREE.ConeGeometry(0.012, 0.22, 5)), flatMat(0xf4f0e8, 0.8));
    q.position.set(0, -0.02, 0.05);
    q.rotation.x = 0.4;
    g.add(q);
    return { g };
  },
  cane() {
    const g = new THREE.Group();
    const p = pole(0.9, 0.012, darkWood());
    p.position.y = -0.42;
    g.add(p);
    return { g, vertical: true };
  },
  umbrella() {
    const g = new THREE.Group();
    g.add(pole(0.9, 0.01, darkWood()));
    return { g, vertical: true };
  },
  flint() {
    const g = new THREE.Group();
    const s = m(geo('flintnodule', () => new THREE.DodecahedronGeometry(0.04, 0)), flatMat(0x4a4a52, 0.4));
    s.position.set(0, -0.08, 0.04);
    g.add(s);
    return { g };
  },
  kite() {
    const g = new THREE.Group();
    const k = m(geo('kite', () => new THREE.PlaneGeometry(0.4, 0.5)), new THREE.MeshStandardMaterial({ color: 0xd8402a, side: THREE.DoubleSide }));
    k.position.set(0, 0.2, 0.1);
    k.rotation.z = PI / 4;
    g.add(k);
    return { g };
  },
  ladle() {
    const g = new THREE.Group();
    const h = m(geo('ladle', () => new THREE.CylinderGeometry(0.01, 0.01, 0.4, 5)), wood());
    h.position.set(0, -0.1, 0.1);
    h.rotation.x = 1.2;
    g.add(h);
    return { g };
  },
};

export function buildProp(name) {
  const b = BUILDERS[name];
  if (!b) return null;
  const res = b();
  res.g.userData.vertical = !!res.vertical;
  if (res.light) {
    const l = new THREE.PointLight(res.light, 0.8, 6);
    l.position.y = res.vertical ? 0.5 : -0.2;
    res.g.add(l);
    res.g.userData.light = l;
  }
  return res.g;
}

export const PROP_NAMES = Object.keys(BUILDERS);
