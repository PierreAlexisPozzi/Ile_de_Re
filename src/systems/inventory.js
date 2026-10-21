// Inventaire, bourse par époque, carnet (codex), expérience, niveaux,
// compétences et réputation locale.

import { state } from '../core/state.js';
import { emit } from '../core/events.js';
import { ITEMS, CODEX } from '../story/registry.js';

// ---------- Inventaire ----------
export function addItem(id, qty = 1, silent = false) {
  const def = ITEMS[id];
  if (!def) { console.warn('Objet inconnu', id); return false; }
  const e = state.inventory.find((i) => i.id === id);
  if (e) e.qty += qty; else state.inventory.push({ id, qty });
  if (!silent) emit('toast', { text: `${def.icon ?? '•'} ${def.name}${qty > 1 ? ' ×' + qty : ''}`, kind: 'item' });
  if (def.codex) unlockCodex(def.codex, true);
  emit('inventory');
  return true;
}

export function removeItem(id, qty = 1) {
  const i = state.inventory.findIndex((x) => x.id === id);
  if (i < 0) return false;
  state.inventory[i].qty -= qty;
  if (state.inventory[i].qty <= 0) state.inventory.splice(i, 1);
  emit('inventory');
  return true;
}

export function itemCount(id) {
  return state.inventory.find((i) => i.id === id)?.qty ?? 0;
}

// Utilisation d'une provision : redonne de l'endurance
export function useItem(id) {
  const def = ITEMS[id];
  if (!def?.use) return false;
  if (def.use.stamina) {
    state.player.stamina = Math.min(state.player.maxStamina, state.player.stamina + def.use.stamina);
  }
  removeItem(id, 1);
  emit('toast', { text: def.use.text ?? `Tu consommes : ${def.name}`, kind: 'info' });
  return true;
}

// ---------- Monnaie (une bourse par époque) ----------
export function addMoney(amount, era = state.era) {
  state.money[era] = (state.money[era] ?? 0) + amount;
  emit('money');
}
export function spend(amount, era = state.era) {
  if ((state.money[era] ?? 0) < amount) return false;
  state.money[era] -= amount;
  emit('money');
  return true;
}

// ---------- Carnet de l'explorateur ----------
export function unlockCodex(id, quiet = false) {
  if (!CODEX[id] || state.codex.includes(id)) return false;
  state.codex.push(id);
  addXP('hist', 10, true);
  emit('toast', { text: `📖 Carnet : ${CODEX[id].title}`, kind: 'codex', quiet });
  return true;
}

// ---------- Expérience et niveaux ----------
// Seuils : niveau n atteint à 100 * n * (n + 1) / 2 XP
export function levelOf(xp) {
  let n = 0;
  while (100 * (n + 1) * (n + 2) / 2 <= xp) n++;
  return n + 1;
}
export function nextLevelXP(xp) {
  const lvl = levelOf(xp);
  return 100 * lvl * (lvl + 1) / 2;
}

export const SKILLS = [
  { id: 'endurance', name: 'Endurance', desc: "Davantage d'endurance pour courir.", need: { expl: 2 } },
  { id: 'nageur', name: 'Nageur', desc: 'Nage plus rapide.', need: { expl: 3 } },
  { id: 'cycliste', name: 'Cycliste', desc: 'Vélo plus rapide.', need: { expl: 4 } },
  { id: 'marin', name: 'Marin', desc: 'Les embarcations filent plus vite.', need: { expl: 5 } },
  { id: 'erudit', name: 'Érudit', desc: 'Les indices des énigmes sont gratuits.', need: { hist: 2 } },
  { id: 'oeil', name: "Œil de l'historien", desc: 'Les objets de quête brillent de plus loin.', need: { hist: 3 } },
  { id: 'polyglotte', name: 'Polyglotte', desc: 'Comprend le latin et le vieux français des archives.', need: { hist: 4 } },
  { id: 'gardien', name: 'Gardien du Temps', desc: "L'Astrolabe guide vers chaque fragment.", need: { hist: 6 } },
];

export function hasSkill(id) {
  const s = SKILLS.find((k) => k.id === id);
  if (!s) return false;
  const le = levelOf(state.xp.expl), lh = levelOf(state.xp.hist);
  return (!s.need.expl || le >= s.need.expl) && (!s.need.hist || lh >= s.need.hist);
}

export function addXP(kind, amount, quiet = false) {
  const before = levelOf(state.xp[kind]);
  state.xp[kind] += amount;
  const after = levelOf(state.xp[kind]);
  if (!quiet) emit('toast', { text: `+${amount} XP ${kind === 'hist' ? 'historique' : "d'exploration"}`, kind: 'xp' });
  if (after > before) {
    emit('toast', { text: `Niveau ${kind === 'hist' ? 'historique' : "d'exploration"} ${after} !`, kind: 'level' });
    for (const s of SKILLS) {
      const need = s.need[kind];
      if (need && need === after && hasSkill(s.id)) emit('toast', { text: `Compétence débloquée : ${s.name}`, kind: 'level' });
    }
    if (hasSkill('endurance')) state.player.maxStamina = 150;
  }
  emit('xp');
}

// ---------- Réputation locale ----------
export function addReputation(town, amount) {
  state.reputation[town] = (state.reputation[town] ?? 0) + amount;
  if (amount > 0) emit('toast', { text: `Réputation +${amount}`, kind: 'rep' });
  emit('rep');
}

export function repTitle(v) {
  if (v >= 80) return 'Héros local';
  if (v >= 50) return 'Ami de la ville';
  if (v >= 25) return 'Bien connu';
  if (v >= 5) return 'Visiteur apprécié';
  if (v < 0) return 'Mal vu';
  return 'Étranger';
}
