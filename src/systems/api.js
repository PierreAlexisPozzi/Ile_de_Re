// Point d'accès partagé aux systèmes du jeu (rempli par main.js au démarrage).
// Évite les dépendances circulaires entre modules : chacun appelle
// api.quests, api.dialogue, api.world… au moment de l'exécution.

import { heightAt } from '../world/terrain.js';

export const api = {
  world: null, player: null, npcs: null, quests: null, dialogue: null,
  ui: null, audio: null, cinematic: null, travel: null, questWorld: null, dayNight: null,
};

// Résout une position d'histoire : 'spot', ['spot', dx, dz], {x, z} ou {npc: id}
export function resolveAt(at) {
  if (!at) return null;
  if (typeof at === 'string') at = [at, 0, 0];
  if (Array.isArray(at)) {
    const s = api.world?.spots[at[0]];
    if (!s) { console.warn('Point inconnu :', at[0]); return null; }
    const o = api.world.offset ? api.world.offset(at[1] ?? 0, at[2] ?? 0) : { x: at[1] ?? 0, z: at[2] ?? 0 };
    const x = s.x + o.x, z = s.z + o.z;
    return { x, z, y: heightAt(x, z) };
  }
  if (at.npc) {
    const n = api.npcs?.get(at.npc);
    if (!n) return null;
    const p = n.char.group.position;
    return { x: p.x, z: p.z, y: p.y };
  }
  return { x: at.x, z: at.z, y: at.y ?? heightAt(at.x, at.z) };
}
