// Fusion statique : regroupe tous les maillages immobiles d'une ville par
// matériau en quelques gros maillages. Une ville de plusieurs milliers de
// pièces (murs, tuiles, volets, pavés…) passe ainsi à quelques dizaines
// d'appels de dessin, ce qui garde le jeu fluide dans le navigateur.
// Les objets marqués userData.noBatch (drapeaux, flammes, bateaux…) restent à part.

import * as THREE from 'three';

export function batchStatic(root) {
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map();
  const remove = [];
  const v = new THREE.Vector3(), n = new THREE.Vector3();
  const rel = new THREE.Matrix4(), nm = new THREE.Matrix3();

  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh) return;
    for (let p = o; p && p !== root; p = p.parent) if (p.userData.noBatch) return;
    const g = o.geometry;
    if (!g?.attributes.position || !g.attributes.normal) return;
    rel.multiplyMatrices(rootInv, o.matrixWorld);
    nm.getNormalMatrix(rel);
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const total = g.index ? g.index.count : g.attributes.position.count;
    const groups = Array.isArray(o.material) && g.groups.length
      ? g.groups : [{ start: 0, count: total, materialIndex: 0 }];
    const P = g.attributes.position, N = g.attributes.normal, U = g.attributes.uv, I = g.index;
    for (const grp of groups) {
      const mat = mats[grp.materialIndex ?? 0];
      if (!mat) continue;
      let b = buckets.get(mat);
      if (!b) { b = { pos: [], nor: [], uv: [], cast: false }; buckets.set(mat, b); }
      if (o.castShadow) b.cast = true;
      const end = Math.min(total, grp.start + grp.count);
      for (let k = grp.start; k < end; k++) {
        const vi = I ? I.getX(k) : k;
        v.fromBufferAttribute(P, vi).applyMatrix4(rel);
        n.fromBufferAttribute(N, vi).applyMatrix3(nm).normalize();
        b.pos.push(v.x, v.y, v.z);
        b.nor.push(n.x, n.y, n.z);
        if (U) b.uv.push(U.getX(vi), U.getY(vi)); else b.uv.push(0, 0);
      }
    }
    remove.push(o);
  });

  for (const o of remove) o.parent?.remove(o);
  const merged = [];
  for (const [mat, b] of buckets) {
    if (!b.pos.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(b.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(b.nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(b.uv, 2));
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = b.cast;
    mesh.receiveShadow = true;
    mesh.userData.batched = true;
    root.add(mesh);
    merged.push(mesh);
  }
  return { removed: remove.length, meshes: merged.length };
}
