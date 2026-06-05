// Inventaire simple.

import { state } from './state.js';
import { ITEMS } from './quests.js';
import { showToast } from './ui.js';

export function addItem(itemId, qty = 1) {
  const def = ITEMS[itemId];
  if (!def) return false;
  const existing = state.inventory.find((i) => i.id === itemId);
  if (existing) {
    existing.qty += qty;
  } else {
    state.inventory.push({ id: itemId, qty });
  }
  showToast(`Objet obtenu : ${def.name}`, 'item');
  return true;
}

export function hasItem(itemId) {
  return state.inventory.some((i) => i.id === itemId);
}

export function removeItem(itemId, qty = 1) {
  const idx = state.inventory.findIndex((i) => i.id === itemId);
  if (idx < 0) return false;
  state.inventory[idx].qty -= qty;
  if (state.inventory[idx].qty <= 0) state.inventory.splice(idx, 1);
  return true;
}
