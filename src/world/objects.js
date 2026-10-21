// Petits objets de quête posés dans le monde (silex, coquillages, amphores,
// tablettes de cire, engrenages, médailles, lettres…) et marqueurs lumineux.

import * as THREE from 'three';
import { flat } from './materials.js';
import { MAT } from './materials.js';

const PI = Math.PI;
const m = (geo, mat, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(geo, mat);
  o.position.set(x, y, z);
  o.castShadow = true;
  return o;
};

const MODELS = {
  flint: () => { const g = new THREE.Group(); g.add(m(new THREE.DodecahedronGeometry(0.12, 0), flat(0x3e3e46, 0.35), 0, 0.08)); return g; },
  stone: () => { const g = new THREE.Group(); g.add(m(new THREE.BoxGeometry(0.6, 0.35, 0.4), MAT.stonePale(), 0, 0.18)); return g; },
  shell: () => { const g = new THREE.Group(); const s = m(new THREE.SphereGeometry(0.08, 8, 6, 0, PI * 2, 0, PI / 2), flat(0xf0d8c0, 0.5), 0, 0.02); s.scale.set(1, 0.5, 1.2); g.add(s); return g; },
  resin: () => { const g = new THREE.Group(); g.add(m(new THREE.SphereGeometry(0.08, 8, 6), flat(0xc89030, 0.2, 0, { transparent: true, opacity: 0.85 }), 0, 0.08)); return g; },
  clay: () => { const g = new THREE.Group(); const c = m(new THREE.SphereGeometry(0.16, 8, 6), flat(0x9a6a48, 0.95), 0, 0.1); c.scale.y = 0.6; g.add(c); return g; },
  herb: () => {
    const g = new THREE.Group();
    for (let i = 0; i < 6; i++) {
      const b = m(new THREE.ConeGeometry(0.03, 0.35, 4), flat(0x5a8a3a, 0.9), Math.cos(i) * 0.06, 0.17, Math.sin(i) * 0.06);
      b.rotation.z = (i - 3) * 0.12;
      g.add(b);
    }
    g.add(m(new THREE.SphereGeometry(0.05, 6, 5), flat(0xe8d040, 0.8), 0, 0.36));
    return g;
  },
  wood: () => { const g = new THREE.Group(); for (let i = 0; i < 3; i++) { const l = m(new THREE.CylinderGeometry(0.05, 0.06, 0.8, 6), MAT.woodDark(), 0, 0.06 + i * 0.1, (i - 1) * 0.08); l.rotation.z = PI / 2; g.add(l); } return g; },
  amphora: () => { const g = new THREE.Group(); const a = m(new THREE.CylinderGeometry(0.2, 0.08, 0.85, 8), flat(0xb5703a, 0.8), 0, 0.3); a.rotation.z = 1.2; g.add(a); return g; },
  knucklebone: () => { const g = new THREE.Group(); const b = m(new THREE.BoxGeometry(0.06, 0.04, 0.09), flat(0xe8dcc0, 0.6), 0, 0.03); g.add(b); return g; },
  tablet: () => { const g = new THREE.Group(); g.add(m(new THREE.BoxGeometry(0.22, 0.03, 0.16), MAT.woodDark(), 0, 0.02)); g.add(m(new THREE.BoxGeometry(0.19, 0.01, 0.13), flat(0x2a2218, 0.5), 0, 0.04)); return g; },
  mosaic: () => { const g = new THREE.Group(); for (let i = 0; i < 4; i++) g.add(m(new THREE.BoxGeometry(0.06, 0.03, 0.06), flat([0xc83a2a, 0xe0d0a0, 0x2a4a8a, 0x1a1a1a][i], 0.6), (i % 2) * 0.07, 0.02, Math.floor(i / 2) * 0.07)); return g; },
  page: () => { const g = new THREE.Group(); const p = m(new THREE.BoxGeometry(0.3, 0.005, 0.22), flat(0xe8dcb0, 0.9), 0, 0.01); p.rotation.y = 0.4; g.add(p); return g; },
  scroll: () => { const g = new THREE.Group(); const s = m(new THREE.CylinderGeometry(0.03, 0.03, 0.35, 8), flat(0xe8dcb0, 0.9), 0, 0.03); s.rotation.z = PI / 2; g.add(s); return g; },
  letter: () => { const g = new THREE.Group(); g.add(m(new THREE.BoxGeometry(0.22, 0.01, 0.12), flat(0xf0ead8, 0.9), 0, 0.01)); g.add(m(new THREE.CylinderGeometry(0.02, 0.02, 0.012, 8), flat(0xa82a2a, 0.5), 0, 0.02)); return g; },
  hammer: () => { const g = new THREE.Group(); const h = m(new THREE.CylinderGeometry(0.02, 0.02, 0.35, 6), MAT.wood(), 0, 0.03); h.rotation.z = PI / 2; g.add(h); g.add(m(new THREE.BoxGeometry(0.06, 0.06, 0.13), MAT.iron(), 0.18, 0.04)); return g; },
  wool: () => { const g = new THREE.Group(); g.add(m(new THREE.BoxGeometry(0.6, 0.45, 0.45), flat(0xe0d6c0, 1), 0, 0.22)); return g; },
  gear: () => { const g = new THREE.Group(); const gr = m(new THREE.TorusGeometry(0.1, 0.03, 6, 12), flat(0xc8a050, 0.3, 0.8), 0, 0.03); gr.rotation.x = PI / 2; g.add(gr); for (let i = 0; i < 8; i++) { const t = m(new THREE.BoxGeometry(0.04, 0.04, 0.04), flat(0xc8a050, 0.3, 0.8), Math.cos(i / 8 * PI * 2) * 0.13, 0.03, Math.sin(i / 8 * PI * 2) * 0.13); g.add(t); } return g; },
  medal: () => { const g = new THREE.Group(); const c = m(new THREE.CylinderGeometry(0.05, 0.05, 0.01, 12), flat(0xd8b050, 0.3, 0.8), 0, 0.01); g.add(c); return g; },
  clapper: () => { const g = new THREE.Group(); const c = m(new THREE.CylinderGeometry(0.03, 0.08, 0.5, 8), MAT.iron(), 0, 0.08); c.rotation.z = PI / 2; g.add(c); return g; },
  powder: () => { const g = new THREE.Group(); g.add(m(new THREE.CylinderGeometry(0.25, 0.22, 0.5, 10), MAT.woodDark(), 0, 0.25)); return g; },
  barrel: () => { const g = new THREE.Group(); g.add(m(new THREE.CylinderGeometry(0.34, 0.3, 0.85, 12), MAT.wood(), 0, 0.43)); return g; },
  bread: () => { const g = new THREE.Group(); const b = m(new THREE.SphereGeometry(0.12, 8, 6), flat(0xb8783a, 0.8), 0, 0.08); b.scale.set(1.4, 0.6, 1); g.add(b); return g; },
  sack: () => { const g = new THREE.Group(); const s = m(new THREE.SphereGeometry(0.3, 8, 6), flat(0xd8cdb4, 1), 0, 0.25); s.scale.set(1, 0.85, 0.8); g.add(s); return g; },
  stake: () => { const g = new THREE.Group(); g.add(m(new THREE.BoxGeometry(0.08, 1.0, 0.08), MAT.wood(), 0, 0.5)); g.add(m(new THREE.BoxGeometry(0.2, 0.08, 0.02), flat(0xc83a2a, 0.7), 0, 0.92, 0.05)); return g; },
  kite: () => { const g = new THREE.Group(); const k = m(new THREE.PlaneGeometry(0.5, 0.6), flat(0xd8402a, 0.6, 0, { side: THREE.DoubleSide }), 0, 0.3); k.rotation.z = PI / 4; g.add(k); return g; },
  trash: () => { const g = new THREE.Group(); const b = m(new THREE.CylinderGeometry(0.04, 0.04, 0.22, 8), flat(0x3a8ac0, 0.2, 0, { transparent: true, opacity: 0.7 }), 0, 0.04); b.rotation.z = PI / 2; g.add(b); return g; },
  tube: () => { const g = new THREE.Group(); const t = m(new THREE.TorusGeometry(0.15, 0.025, 6, 16), flat(0x1a1a1a, 0.8), 0, 0.03); t.rotation.x = PI / 2; g.add(t); return g; },
  ration: () => { const g = new THREE.Group(); g.add(m(new THREE.BoxGeometry(0.12, 0.01, 0.18), flat(0xd8c8a0, 0.9), 0, 0.01)); return g; },
  coin: () => { const g = new THREE.Group(); g.add(m(new THREE.CylinderGeometry(0.03, 0.03, 0.005, 12), flat(0xd8b050, 0.3, 0.8), 0, 0.01)); return g; },
  map: () => { const g = new THREE.Group(); g.add(m(new THREE.BoxGeometry(0.4, 0.01, 0.3), flat(0xe8dcb0, 0.9), 0, 0.01)); return g; },
  fish: () => { const g = new THREE.Group(); const f = m(new THREE.SphereGeometry(0.06, 6, 5), flat(0x9aa8b0, 0.3, 0.4), 0, 0.05); f.scale.set(0.6, 0.6, 2.6); g.add(f); return g; },
  fragment: () => {
    const g = new THREE.Group();
    const f = m(new THREE.OctahedronGeometry(0.22, 0), new THREE.MeshStandardMaterial({ color: 0xfff0b0, emissive: 0xd4a857, emissiveIntensity: 1.2, metalness: 0.7, roughness: 0.2 }), 0, 0.6);
    f.userData.spin = true;
    g.add(f);
    const ring = m(new THREE.TorusGeometry(0.34, 0.015, 6, 24), new THREE.MeshBasicMaterial({ color: 0xffe9a0 }), 0, 0.6);
    ring.userData.spin2 = true;
    g.add(ring);
    return g;
  },
  anachronism: () => {
    const g = new THREE.Group();
    g.add(m(new THREE.BoxGeometry(0.08, 0.02, 0.14), flat(0x8a2aa0, 0.3, 0.5), 0, 0.02));
    return g;
  },
};

export function questModel(name) {
  const make = MODELS[name] ?? MODELS.page;
  const g = make();
  return g;
}

// Halo au sol + losange flottant pour signaler un point d'interaction
const markerMats = {
  main: new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.85, depthWrite: false }),
  side: new THREE.MeshBasicMaterial({ color: 0x9ad0ff, transparent: true, opacity: 0.8, depthWrite: false }),
  ring: new THREE.MeshBasicMaterial({ color: 0xffe9a0, transparent: true, opacity: 0.45, depthWrite: false, side: THREE.DoubleSide }),
};
export function interactMarker(main = true) {
  const g = new THREE.Group();
  const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), main ? markerMats.main : markerMats.side);
  d.scale.y = 1.5;
  d.position.y = 1.5;
  d.userData.float = true;
  g.add(d);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.6, 24), markerMats.ring);
  ring.rotation.x = -PI / 2;
  ring.position.y = 0.05;
  ring.userData.pulse = true;
  g.add(ring);
  return g;
}

export function beamMarker() {
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 60, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd36a, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false }));
  beam.position.y = 30;
  const g = new THREE.Group();
  g.add(beam);
  return g;
}
