// Matériaux du bâti partagés et mis en cache : pierre de taille, moellons,
// enduit chaulé, tuiles canal, chaume, bois, pavés, terre battue, béton
// banché, ardoise… Tous reçoivent une carte de relief (bump) dérivée de
// leur texture pour accrocher la lumière rasante.

import * as THREE from 'three';
import {
  stoneTexture, plasterTexture, roofTexture, thatchTexture, woodTexture,
  paveTexture, dirtTexture, asphaltTexture, concreteTexture, shutterTexture, bumpOf, normalOf, sandTexture,
} from '../gfx/textures.js';
import { fbm } from '../gfx/texgen.js';

const cache = new Map();
export function cached(key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

// Vieillissement commun du bâti : variation de teinte à grande échelle (casse
// la répétition des textures) et pied des murs humide, éclaboussé de terre.
export const WEATHER = {
  tMacro: { value: null },
  uGround: { value: -999 },                       // niveau du sol de la ville active
  uTown: { value: new THREE.Vector3(0, 0, 0) },   // centre (x, z) et rayon de la ville
};
export function setWeatherGround(y, x, z, r) {
  WEATHER.uGround.value = y;
  WEATHER.uTown.value.set(x, z, r);
}
function macroTexture() {
  if (WEATHER.tMacro.value) return WEATHER.tMacro.value;
  const S = 256, a = fbm(S, 4, 5, 101), b = fbm(S, 8, 4, 202);
  const data = new Uint8Array(S * S * 4);
  for (let i = 0; i < S * S; i++) { data[i * 4] = a[i] * 255; data[i * 4 + 1] = b[i] * 255; data[i * 4 + 2] = 128; data[i * 4 + 3] = 255; }
  const t = new THREE.DataTexture(data, S, S);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.needsUpdate = true;
  WEATHER.tMacro.value = t;
  return t;
}
export function weathering(m, { damp = true } = {}) {
  macroTexture();
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, WEATHER);
    sh.defines = { ...(sh.defines || {}), WEATHER_DAMP: damp ? 1 : 0 };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
      .replace('#include <project_vertex>', `#include <project_vertex>
        {
          vec4 wq = vec4(transformed, 1.0);
          vec3 wn = objectNormal;
          #ifdef USE_INSTANCING
            wq = instanceMatrix * wq;
            wn = mat3(instanceMatrix) * wn;
          #endif
          vWPos = (modelMatrix * wq).xyz;
          vWNrm = normalize(mat3(modelMatrix) * wn);
        }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform sampler2D tMacro;\nuniform float uGround;\nuniform vec3 uTown;\nvarying vec3 vWPos;\nvarying vec3 vWNrm;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 an = abs(vWNrm);
          vec2 puv = an.y > 0.7 ? vWPos.xz : (an.x > an.z ? vWPos.zy : vWPos.xy);
          float m1 = texture2D(tMacro, puv * 0.07).r;
          float m2 = texture2D(tMacro, puv * 0.23 + 0.37).g;
          diffuseColor.rgb *= 1.0 + (m1 - 0.5) * 0.24 + (m2 - 0.5) * 0.14;
          diffuseColor.rgb *= mix(vec3(1.0), vec3(1.05, 1.0, 0.9), clamp((m1 - 0.45) * 1.5, 0.0, 1.0));
          #if WEATHER_DAMP == 1
            // pied de mur : humidité qui remonte, éclaboussures de terre
            float hg = vWPos.y - uGround;
            float town = 1.0 - smoothstep(uTown.z, uTown.z + 12.0, length(vWPos.xz - uTown.xy));
            float wall = 1.0 - smoothstep(0.45, 0.75, an.y);
            float d = (1.0 - smoothstep(0.0, 0.5 + m2 * 0.6, hg)) * step(-0.6, hg) * wall * town;
            diffuseColor.rgb *= 1.0 - d * 0.3;
            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.42, 0.37, 0.3), d * 0.18);
          #endif
        }`);
  };
  m.customProgramCacheKey = () => `weather-${damp ? 1 : 0}`;
  return m;
}

export function texturedMat(key, tex, opts = {}) {
  return cached(key, () => {
    const m = new THREE.MeshStandardMaterial({
      map: tex, normalMap: normalOf(tex, tex.userData.height ? 2 + (opts.bumpScale ?? 0.6) * 5 : 1.2 + (opts.bumpScale ?? 0.6) * 3),
      normalScale: new THREE.Vector2(1, 1),
      roughness: tex.userData.rough ? 1 : opts.roughness ?? 0.95, metalness: opts.metalness ?? 0,
      color: opts.color ?? 0xffffff, side: opts.side ?? THREE.FrontSide,
    });
    if (tex.userData.rough) m.roughnessMap = tex.userData.rough;
    return weathering(m, { damp: opts.damp ?? true });
  });
}

export function flat(color, rough = 0.85, metal = 0, extra = {}) {
  return cached(`flat-${color}-${rough}-${metal}-${JSON.stringify(extra)}`,
    () => new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra }));
}

export const MAT = {
  whitewash: () => texturedMat('whitewash', plasterTexture(0xf3eee0, 1), { bumpScale: 0.05, roughness: 0.85 }),
  cream: () => texturedMat('cream', plasterTexture(0xeee2c4, 1), { bumpScale: 0.05, roughness: 0.85 }),
  plasterOld: () => texturedMat('plasterOld', plasterTexture(0xe0d4ba, 1), { bumpScale: 0.08, roughness: 0.9 }),
  plasterGrey: () => texturedMat('plasterGrey', plasterTexture(0xc8c4b8, 1), { bumpScale: 0.08, roughness: 0.95 }),
  plasterRoman: () => texturedMat('plasterRoman', plasterTexture(0xe8d8bc, 1), { bumpScale: 0.06, roughness: 0.9 }),
  ochre: () => texturedMat('ochre', plasterTexture(0xd8b07a, 1), { bumpScale: 0.06, roughness: 0.9 }),
  stone: () => texturedMat('stone', stoneTexture(0xcabfa6, 1, false, 'ashlar'), { bumpScale: 0.8 }),
  stoneOld: () => texturedMat('stoneOld', stoneTexture(0xb6a888, 1, true), { bumpScale: 0.9 }),
  stonePale: () => texturedMat('stonePale', stoneTexture(0xe2ddd0, 1, false, 'ashlar'), { bumpScale: 0.6, roughness: 0.8 }),
  stoneDark: () => texturedMat('stoneDark', stoneTexture(0x7a7468, 1, true), { bumpScale: 0.9 }),
  rampart: () => texturedMat('rampart', stoneTexture(0xc8bc9c, 1, true), { bumpScale: 0.9 }),
  concrete: () => texturedMat('concrete', concreteTexture(1), { bumpScale: 0.4 }),
  tiles: () => texturedMat('tiles', roofTexture(0xb35a3a, 1, true), { bumpScale: 0.5, roughness: 0.9 }),
  tilesOld: () => texturedMat('tilesOld', roofTexture(0x9a5236, 1, true), { bumpScale: 0.5, roughness: 0.95 }),
  tilesNew: () => texturedMat('tilesNew', roofTexture(0xc0643e, 1, false), { bumpScale: 0.45, roughness: 0.85 }),
  slate: () => texturedMat('slate', roofTexture(0x4a5058, 1, false), { bumpScale: 0.4, roughness: 0.7 }),
  thatch: () => texturedMat('thatch', thatchTexture(1), { bumpScale: 0.7 }),
  wood: () => texturedMat('wood', woodTexture(0x6a4a2a, 1), { bumpScale: 0.3 }),
  woodDark: () => texturedMat('woodDark', woodTexture(0x46301a, 1), { bumpScale: 0.3 }),
  woodPale: () => texturedMat('woodPale', woodTexture(0x8a6a3a, 1), { bumpScale: 0.3 }),
  woodGrey: () => texturedMat('woodGrey', woodTexture(0x7a7468, 1), { bumpScale: 0.3 }),
  pave: () => texturedMat('pave', paveTexture(0x8a8276, 1), { bumpScale: 0.7 }),
  paveWarm: () => texturedMat('paveWarm', paveTexture(0xa09078, 1), { bumpScale: 0.7 }),
  paveRoman: () => texturedMat('paveRoman', paveTexture(0x9a9080, 1, 'flags'), { bumpScale: 0.7 }),
  dirt: () => texturedMat('dirt', dirtTexture(0x9a7a52, 1), { bumpScale: 0.4 }),
  dirtPale: () => texturedMat('dirtPale', dirtTexture(0xb8a07a, 1), { bumpScale: 0.35 }),
  sandPath: () => texturedMat('sandPath', sandTexture(1), { bumpScale: 0.2 }),
  asphalt: () => texturedMat('asphalt', asphaltTexture(1, false), { bumpScale: 0.2 }),
  cycleway: () => texturedMat('cycleway', asphaltTexture(1, true), { bumpScale: 0.2 }),
  glass: () => flat(0x1e2a34, 0.12, 0.4),
  glassLit: () => cached('glassLit', () => new THREE.MeshStandardMaterial({
    color: 0x2a2a28, roughness: 0.2, metalness: 0.2, emissive: 0xffbf6a, emissiveIntensity: 0,
  })),
  shopGlass: () => cached('shopGlass', () => new THREE.MeshStandardMaterial({
    color: 0x3a4a50, roughness: 0.08, metalness: 0.5, transparent: true, opacity: 0.55,
    emissive: 0xffd8a0, emissiveIntensity: 0,
  })),
  metal: () => flat(0x33332f, 0.4, 0.7),
  metalPale: () => flat(0x5a6a6a, 0.5, 0.5),
  iron: () => flat(0x26262a, 0.55, 0.6),
  gold: () => flat(0xc8a050, 0.35, 0.8),
  salt: () => flat(0xf6f2ea, 0.6),
  black: () => flat(0x0c0c0c, 0.9),
  white: () => flat(0xf4f2ec, 0.7),
  brine: () => cached('brine', () => new THREE.MeshStandardMaterial({
    color: 0xb8ccc8, transparent: true, opacity: 0.8, roughness: 0.1, metalness: 0.15,
  })),
};

export function shutterMat(color) {
  return texturedMat(`shutter-${color}`, shutterTexture(color, 1), { bumpScale: 0.25, roughness: 0.8 });
}

// Fenêtres éclairées la nuit : intensité pilotée par le cycle jour/nuit
export function setNightGlow(k) {
  const lit = MAT.glassLit();
  lit.emissiveIntensity = k * 1.1;
  MAT.shopGlass().emissiveIntensity = k * 0.6;
}
