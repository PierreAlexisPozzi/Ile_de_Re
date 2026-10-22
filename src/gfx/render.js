// Chaîne de rendu : éclairage d'ambiance tiré du ciel (IBL), occlusion
// ambiante (GTAO), halo des lumières (bloom), étalonnage des couleurs et
// anticrénelage. La qualité choisie dans les options règle ce qui est actif :
//  - basse : rendu direct ;
//  - moyenne : IBL, bloom, étalonnage ;
//  - haute : tout, avec l'occlusion ambiante.

import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';

// Étalonnage : contraste doux, saturation, teinte chaude des hautes lumières, vignettage
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uContrast: { value: 1.12 },
    uSaturation: { value: 1.12 },
    uWarm: { value: new THREE.Color(1.03, 1.0, 0.95) },
    uVignette: { value: 0.32 },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; uniform float uContrast, uSaturation, uVignette; uniform vec3 uWarm;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      vec3 col = c.rgb;
      float l = dot(col, vec3(0.2126, 0.7152, 0.0722));
      col = mix(vec3(l), col, uSaturation);
      col = (col - 0.18) * uContrast + 0.18;
      col *= mix(vec3(1.0), uWarm, smoothstep(0.2, 1.2, l));
      vec2 d = vUv - 0.5;
      col *= 1.0 - uVignette * smoothstep(0.25, 0.85, dot(d, d) * 2.2);
      gl_FragColor = vec4(max(col, 0.0), c.a);
    }`,
};

// Normales robustes : normaliser un vecteur nul donne NaN sur certains GPU
// (Direct3D notamment) ; un seul pixel NaN, étalé par le halo, devient un
// grand carré noir à l'écran
THREE.ShaderChunk.normal_vertex = THREE.ShaderChunk.normal_vertex.replace(
  'vNormal = normalize( transformedNormal );',
  'vNormal = transformedNormal * inversesqrt( max( dot( transformedNormal, transformedNormal ), 1e-20 ) );');
THREE.ShaderChunk.normal_fragment_begin = THREE.ShaderChunk.normal_fragment_begin.replace(
  'vec3 normal = normalize( vNormal );',
  'vec3 normal = dot( vNormal, vNormal ) > 1e-8 ? normalize( vNormal ) : vec3( 0.0, 0.0, 1.0 );');

// Garde-fou avant le halo : pixels NaN/infinis remplacés, hautes lumières bornées
const SanitizeShader = {
  uniforms: { tDiffuse: { value: null } },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse; varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      if (any(isnan(c)) || any(isinf(c))) c = vec4(0.0, 0.0, 0.0, 1.0);
      gl_FragColor = vec4(clamp(c.rgb, 0.0, 64.0), c.a);
    }`,
};

export class RenderPipeline {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.quality = 'medium';
    this.composer = null;
    this.env = null;
  }

  setSky(skyMaterial) {
    // scène réduite au seul ciel, pour en tirer une carte d'environnement
    this.envScene = new THREE.Scene();
    this.envSky = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), skyMaterial);
    this.envScene.add(this.envSky);
    this.pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envT = 999;
  }

  setQuality(q) {
    this.quality = q;
    this.composer?.dispose?.();
    this.composer = null;
    if (q === 'low') { this.scene.environment = null; return; }
    const r = this.renderer;
    const size = r.getDrawingBufferSize(new THREE.Vector2());
    const rt = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: r.capabilities.isWebGL2 ? 4 : 0 });
    const c = new EffectComposer(r, rt);
    c.addPass(new RenderPass(this.scene, this.camera));
    if (q === 'high') {
      const ao = new GTAOPass(this.scene, this.camera, size.x, size.y);
      ao.output = GTAOPass.OUTPUT.Default;
      ao.blendIntensity = 0.85;
      ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.2, scale: 1.0, samples: 12 });
      ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 6, rings: 2, samples: 12 });
      this.ao = ao;
      c.addPass(ao);
    } else this.ao = null;
    c.addPass(new ShaderPass(SanitizeShader));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.22, 0.45, 0.88);
    c.addPass(this.bloom);
    this.grade = new ShaderPass(GradeShader);
    c.addPass(this.grade);
    c.addPass(new OutputPass());
    this.composer = c;
    this.envT = 999;
  }

  resize(w, h) {
    if (!this.composer) return;
    const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());
    this.composer.setSize(w, h);
    this.composer.setPixelRatio?.(this.renderer.getPixelRatio());
    this.ao?.setSize(size.x, size.y);
  }

  // Carte d'environnement recalculée de temps en temps (le ciel change lentement)
  updateEnvironment(dt, { indoor = false, night = 0 } = {}) {
    if (this.quality === 'low' || !this.envScene) return;
    if (indoor) { this.scene.environment = null; this.envT = 999; return; }
    this.envT += dt;
    if (this.envT < 2.5 && this.env) { this.scene.environment = this.env.texture; return; }
    this.envT = 0;
    const old = this.env;
    this.env = this.pmrem.fromScene(this.envScene, 0, 1, 1000);
    old?.dispose();
    this.scene.environment = this.env.texture;
    if (this.bloom) this.bloom.strength = 0.18 + night * 0.45;
    this.tuneMaterials();
  }

  // Part de l'éclairage du ciel : discrète sur les surfaces mates, franche sur
  // l'eau, le verre et le métal (reflets)
  tuneMaterials() {
    this.scene.traverse((o) => {
      const mats = o.material ? (Array.isArray(o.material) ? o.material : [o.material]) : [];
      for (const m of mats) {
        if (!m || m.userData.envTuned || m.envMapIntensity === undefined) continue;
        m.userData.envTuned = true;
        const shiny = (m.roughness ?? 1) < 0.35 || (m.metalness ?? 0) > 0.3;
        m.envMapIntensity = shiny ? 1.0 : 0.38;
      }
    });
  }

  render() {
    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  }
}
