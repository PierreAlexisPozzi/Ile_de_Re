// PNJ. Chaque PNJ a une époque, un lieu d'origine, un dialogue et
// éventuellement une quête à donner.

import * as THREE from 'three';
import { heightAt } from './world.js';
import { state } from './state.js';

export const NPC_DEFS = [
  // Préhistoire
  {
    id: 'orven',
    name: 'Orven, chasseur',
    era: 'prehistoire',
    location: 'lilleau',
    portrait: '🦌',
    color: 0x6a4a26,
    questId: 'q-prehistoire-chasse',
    dialogue: [
      "Les grands cerfs descendent vers la mer chaque crépuscule.",
      "Apporte-moi trois silex et nous chasserons ensemble.",
      "Le ciel s'est fendu cette nuit. Quelque chose ne va pas.",
    ],
  },
  {
    id: 'maela',
    name: 'Maëla, sage',
    era: 'prehistoire',
    location: 'phare-baleines',
    portrait: '🌿',
    color: 0x4a5a3a,
    dialogue: [
      "Ces pierres dressées chantent quand la lune est ronde.",
      "Une voix t'a appelé, voyageur ? Elle vient des fragments.",
    ],
  },
  // Antiquité romaine
  {
    id: 'lucius',
    name: 'Lucius, marchand',
    era: 'antiquite',
    location: 'flotte',
    portrait: '🏺',
    color: 0xa84a3a,
    questId: 'q-antiquite-amphores',
    dialogue: [
      "Salve ! Le vin de Burdigala se vend bien ici.",
      "J'ai perdu trois amphores dans les bois. Aide-moi à les retrouver.",
      "Cette île est riche en sel. Bientôt, tout l'Empire l'aimera.",
    ],
  },
  {
    id: 'quintus',
    name: 'Quintus, saunier',
    era: 'antiquite',
    location: 'lilleau',
    portrait: '🧂',
    color: 0xd4a857,
    dialogue: [
      "Le sel pousse comme un fruit. Il suffit d'attendre le soleil.",
      "Tu n'es pas d'ici. Tes vêtements... étrange tissu.",
    ],
  },
  // Moyen Âge
  {
    id: 'frere-anselme',
    name: 'Frère Anselme',
    era: 'moyenage',
    location: 'flotte',
    portrait: '⛪',
    color: 0x44402a,
    questId: 'q-moyenage-manuscrit',
    dialogue: [
      "Que la paix soit avec toi, voyageur.",
      "Un manuscrit a disparu de notre abbaye. Aide-nous à le retrouver.",
      "Nous bâtissons Notre-Dame-de-Ré, pierre après pierre.",
    ],
  },
  {
    id: 'aelis',
    name: 'Aélis, fileuse',
    era: 'moyenage',
    location: 'ars',
    portrait: '🧵',
    color: 0x8a7a3a,
    dialogue: [
      "Le clocher noir et blanc guide les marins, les bons comme les mauvais.",
      "Méfie-toi des Anglais : ils rôdent sur nos côtes.",
    ],
  },
  // XVIIᵉ
  {
    id: 'vauban',
    name: 'Sébastien Le Prestre de Vauban',
    era: 'xvii',
    location: 'saint-martin',
    portrait: '⚜',
    color: 0x4a3a26,
    questId: 'q-xvii-plans',
    dialogue: [
      "Mes plans pour la citadelle ont été dérobés. Retrouve-les.",
      "Une fortification ne vaut que par les hommes qui la défendent.",
      "L'île doit tenir : c'est notre porte vers l'Atlantique.",
    ],
  },
  {
    id: 'marie-louise',
    name: 'Marie-Louise, sauniere',
    era: 'xvii',
    location: 'lilleau',
    portrait: '⛵',
    color: 0xc8a878,
    dialogue: [
      "Le roi prélève sa gabelle, mais le sel reste notre fierté.",
      "Mon mari pêche au large. Le veux-tu revoir ?",
    ],
  },
  // XIXᵉ
  {
    id: 'capitaine-borel',
    name: 'Capitaine Borel',
    era: 'xix',
    location: 'saint-martin',
    portrait: '⚓',
    color: 0x1a3a5a,
    questId: 'q-xix-baleinier',
    dialogue: [
      "Nous partons pour les Indes. Veux-tu être du voyage ?",
      "Le phare neuf, à l'ouest, sauve cent navires chaque hiver.",
    ],
  },
  {
    id: 'jeanne',
    name: 'Jeanne, vigneronne',
    era: 'xix',
    location: 'bois-plage',
    portrait: '🍇',
    color: 0x6a3a3a,
    dialogue: [
      "Goûte donc ce pineau, étranger.",
      "Le phylloxéra menace nos ceps. Que ferons-nous ?",
    ],
  },
  // WWII
  {
    id: 'leon-resistant',
    name: 'Léon, résistant',
    era: 'wwii',
    location: 'ars',
    portrait: '🕯',
    color: 0x3a3a3a,
    questId: 'q-wwii-messages',
    dialogue: [
      "Parle bas. Ils ont des oreilles partout.",
      "Porte ce message à La Flotte, sans être vu.",
      "Un jour, l'île sera libre. Tiens bon.",
    ],
  },
  {
    id: 'helene-infirmiere',
    name: 'Hélène, infirmière',
    era: 'wwii',
    location: 'saint-martin',
    portrait: '🩹',
    color: 0xc4a8a8,
    dialogue: [
      "Nous manquons de tout. Mais nous tenons.",
      "Les bunkers font peur aux enfants.",
    ],
  },
  // Contemporaine
  {
    id: 'paul-pecheur',
    name: 'Paul, pêcheur',
    era: 'contemporaine',
    location: 'saint-martin',
    portrait: '🐟',
    color: 0x2a5a78,
    questId: 'q-contemp-anomalie',
    dialogue: [
      "L'eau a un goût étrange ce matin. Comme du sel d'autrefois.",
      "Un voyageur, hier, m'a parlé d'un \"fragment\". Toi aussi ?",
      "Si tu vas au phare, ouvre l'œil. Il s'y passe des choses.",
    ],
  },
  {
    id: 'elise-guide',
    name: 'Élise, guide du patrimoine',
    era: 'contemporaine',
    location: 'phare-baleines',
    portrait: '🗝',
    color: 0x4a6a8a,
    questId: 'q-main-fragments',
    dialogue: [
      "Cet artefact dans ta main... d'où le tiens-tu ?",
      "Il ressemble à un fragment retrouvé en fouilles. Sept fragments en tout.",
      "Si tu les réunis, tu pourras reconstituer l'histoire de l'île.",
    ],
  },
  {
    id: 'marin-bois',
    name: 'Marin, vigneron',
    era: 'contemporaine',
    location: 'bois-plage',
    portrait: '🍷',
    color: 0x6a3a3a,
    dialogue: [
      "Bienvenue au Bois-Plage. Goûte donc notre rosé.",
      "Sept kilomètres de plage juste derrière le vignoble.",
    ],
  },
  {
    id: 'sandra-touriste',
    name: 'Sandra, touriste',
    era: 'contemporaine',
    location: 'sainte-marie',
    portrait: '📷',
    color: 0xc88a4a,
    dialogue: [
      "Tu connais un endroit pour observer les hérons ?",
      "Lilleau des Niges, paraît-il, c'est magnifique au lever du soleil.",
    ],
  },
];

export class NPCManager {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.npcs = [];
  }

  loadEra(eraId, locations) {
    while (this.group.children.length) {
      const c = this.group.children.pop();
      c.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.(); });
    }
    this.npcs = [];

    for (const def of NPC_DEFS) {
      if (def.era !== eraId) continue;
      const loc = locations.find((l) => l.id === def.location);
      if (!loc) continue;
      // Position autour du lieu (rayon aléatoire stable)
      const seed = def.id.charCodeAt(0);
      const angle = (seed % 17) / 17 * Math.PI * 2;
      const r = 6 + (seed % 5);
      const x = loc.position[0] + Math.cos(angle) * r;
      const z = loc.position[2] + Math.sin(angle) * r;
      const y = heightAt(x, z);
      const npc = this.buildNPCMesh(def);
      npc.position.set(x, y, z);
      npc.userData = { def, originalY: y, locId: loc.id };
      this.group.add(npc);
      this.npcs.push(npc);
    }
  }

  buildNPCMesh(def) {
    const g = new THREE.Group();
    const bodyMat = new THREE.MeshLambertMaterial({ color: def.color });
    const skinMat = new THREE.MeshLambertMaterial({ color: 0xd4a888 });
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.35, 1.1, 4, 8), bodyMat
    );
    body.position.y = 0.9; g.add(body);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 10), skinMat
    );
    head.position.y = 1.8; g.add(head);
    return g;
  }

  update(dt, time, playerPos) {
    for (const npc of this.npcs) {
      // Légère oscillation idle + rotation vers le joueur si proche
      const dx = playerPos.x - npc.position.x;
      const dz = playerPos.z - npc.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 8) {
        npc.rotation.y = Math.atan2(dx, dz);
      }
      npc.position.y = npc.userData.originalY + Math.sin(time * 1.5 + npc.position.x) * 0.04;
    }
  }

  // PNJ le plus proche dans un rayon donné
  nearest(pos, maxDist = 2.5) {
    let best = null;
    let bestD = maxDist;
    for (const npc of this.npcs) {
      const dx = pos.x - npc.position.x;
      const dz = pos.z - npc.position.z;
      const d = Math.hypot(dx, dz);
      if (d < bestD) { bestD = d; best = npc; }
    }
    return best;
  }
}
