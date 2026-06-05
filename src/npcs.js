// PNJ. Chaque PNJ a une époque, un lieu d'origine, un dialogue et
// éventuellement une quête à donner.

import * as THREE from 'three';
import { heightAt } from './world.js';
import { state } from './state.js';
import { buildHumanoid, animateHumanoid } from './character.js';

// Apparence d'un PNJ selon son métier et son époque.
function npcLook(def, eraId) {
  const hatByEra = {
    prehistoire: null, antiquite: null, moyenage: null,
    xvii: 'tricorne', xix: null, wwii: null, contemporaine: 'cap',
  };
  let hat = hatByEra[eraId] || null;
  let shirt = def.color;
  let pants = 0x3a3326;
  let hair = 0x33271a;
  if (def.id.includes('frere') || def.id.includes('anselme')) { hat = 'monk'; shirt = 0x4a3f2a; pants = 0x4a3f2a; }
  if (def.id.includes('resistant') || def.id.includes('leon')) { hat = 'cap'; }
  if (eraId === 'wwii' && def.id.includes('helene')) hat = null;
  if (def.id.includes('soldat') || def.portrait === '⚙') hat = 'helmet';
  if (def.id.includes('vauban')) { hat = 'tricorne'; shirt = 0x4a2a1a; }
  return {
    shirt, pants, hair, skin: 0xe0ad88, accent: 0x8a5a2a,
    hat, backpack: false,
  };
}

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
      // Position sur la place du village (devant les bâtiments, pas dedans)
      const seed = def.id.charCodeAt(0) + def.id.charCodeAt(1);
      const angle = (seed % 17) / 17 * Math.PI * 2;
      const r = 5 + (seed % 3);
      const x = loc.position[0] + Math.cos(angle) * r;
      const z = loc.position[2] + Math.sin(angle) * r;
      const y = heightAt(x, z);
      const av = buildHumanoid(npcLook(def, eraId));
      av.group.position.set(x, y, z);
      av.group.userData = { def, originalY: y, locId: loc.id };
      av.group.userData.parts = av.parts;
      av.group.userData.phase = seed;
      this.group.add(av.group);
      this.npcs.push(av.group);
    }
  }

  update(dt, time, playerPos) {
    for (const npc of this.npcs) {
      const dx = playerPos.x - npc.position.x;
      const dz = playerPos.z - npc.position.z;
      const d = Math.hypot(dx, dz);
      if (d < 9) {
        const target = Math.atan2(dx, dz);
        const diff = ((target - npc.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
        npc.rotation.y += diff * Math.min(1, dt * 4);
      }
      // animation de repos (respiration / léger balancement)
      const phase = time * 1.4 + npc.userData.phase;
      animateHumanoid(npc.userData.parts, phase, 0, dt, false);
      npc.position.y = npc.userData.originalY;
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
