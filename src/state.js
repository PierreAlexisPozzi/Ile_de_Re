// État global du jeu. Persistance via localStorage.

import { ERAS } from './eras.js';

const SAVE_KEY = 'fragments-du-temps:save:v1';

export const state = {
  era: 'contemporaine',
  unlockedEras: new Set(['contemporaine']),
  player: {
    position: [10, 2, 25],
    rotation: 0,
    onBike: false,
    swimming: false,
    stamina: 100,
    xpExploration: 0,
    xpHistorical: 0,
    fragmentsCollected: 0,
  },
  reputation: {},   // par lieu
  inventory: [],    // [{id, name, icon, description, type, qty}]
  quests: {},       // {questId: {step, done}}
  visitedLocations: new Set(),
  flags: {},        // drapeaux narratifs
  time: 8 * 3600,   // heure de jeu (secondes, 0-86400)
  weather: 'clear',
  options: { masterVolume: 0.7, mouseSensitivity: 1.0 },
};

export function unlockEra(id) {
  state.unlockedEras.add(id);
}

export function addXP(kind, amount) {
  if (kind === 'exploration') state.player.xpExploration += amount;
  else if (kind === 'historical') state.player.xpHistorical += amount;
}

export function gainReputation(locId, amount) {
  state.reputation[locId] = (state.reputation[locId] || 0) + amount;
}

export function visitLocation(locId) {
  if (!state.visitedLocations.has(locId)) {
    state.visitedLocations.add(locId);
    addXP('exploration', 25);
    return true;
  }
  return false;
}

export function save() {
  const data = {
    ...state,
    unlockedEras: [...state.unlockedEras],
    visitedLocations: [...state.visitedLocations],
  };
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    Object.assign(state, data);
    state.unlockedEras = new Set(data.unlockedEras);
    state.visitedLocations = new Set(data.visitedLocations);
    return true;
  } catch (e) {
    return false;
  }
}

export function reset() {
  state.era = 'contemporaine';
  state.unlockedEras = new Set(['contemporaine']);
  state.player = {
    position: [10, 2, 25],
    rotation: 0,
    onBike: false,
    swimming: false,
    stamina: 100,
    xpExploration: 0,
    xpHistorical: 0,
    fragmentsCollected: 0,
  };
  state.reputation = {};
  state.inventory = [];
  state.quests = {};
  state.visitedLocations = new Set();
  state.flags = {};
  state.time = 8 * 3600;
  state.weather = 'clear';
}
