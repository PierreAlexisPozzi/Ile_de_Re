// État global de la partie et sauvegarde (localStorage).

const SAVE_KEY = 'fragments-du-temps:save:v2';

function fresh() {
  return {
    version: 2,
    avatar: 'explorer',
    era: 'contemporaine',
    unlockedEras: ['contemporaine'],
    player: { x: -176, z: 6, yaw: Math.PI, stamina: 100, maxStamina: 100, mount: null },
    xp: { expl: 0, hist: 0 },
    reputation: {},          // par ville
    money: { contemporaine: 20 },
    inventory: [],           // [{ id, qty }]
    quests: {},              // id -> { status: 'active'|'done', step, progress: {}, started }
    tracked: null,           // quête suivie (boussole)
    flags: {},
    codex: [],               // entrées débloquées
    visited: [],             // villes visitées
    observed: [],            // animaux observés
    photos: [],              // lieux photographiés
    time: 9.5,               // heure de jeu (0-24)
    day: 1,
    weather: 'clear',
    ending: null,
    options: { volume: 0.7, music: 0.6, sensitivity: 1, invertY: false, quality: 'high', nightLight: 0.6, brightness: 1 },
    stats: { playTime: 0, distance: 0 },
  };
}

export const state = fresh();

export function resetState(avatar) {
  const f = fresh();
  for (const k of Object.keys(state)) delete state[k];
  Object.assign(state, f);
  if (avatar) state.avatar = avatar;
}

export function save() {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    return false;
  }
}

export function hasSave() {
  try { return !!localStorage.getItem(SAVE_KEY); } catch (e) { return false; }
}

export function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const data = JSON.parse(raw);
    if (data.version !== 2) return false;
    const f = fresh();
    for (const k of Object.keys(state)) delete state[k];
    Object.assign(state, f, data, { options: { ...f.options, ...(data.options || {}) } });
    return true;
  } catch (e) {
    return false;
  }
}

// ---------- Raccourcis de lecture (utilisés par les conditions de dialogue) ----------
export const S = {
  flag: (k) => !!state.flags[k],
  val: (k) => state.flags[k],
  has: (id, n = 1) => (state.inventory.find((i) => i.id === id)?.qty ?? 0) >= n,
  count: (id) => state.inventory.find((i) => i.id === id)?.qty ?? 0,
  done: (q) => state.quests[q]?.status === 'done',
  active: (q) => state.quests[q]?.status === 'active',
  started: (q) => !!state.quests[q],
  step: (q) => state.quests[q]?.step ?? -1,
  rep: (town) => state.reputation[town] ?? 0,
  money: (era = state.era) => state.money[era] ?? 0,
  get era() { return state.era; },
  get hour() { return state.time; },
  night: () => state.time >= 21 || state.time < 6,
  fragments: () => state.inventory.filter((i) => i.id.startsWith('fragment-')).length,
  anachronisms: () => state.inventory.filter((i) => i.id.startsWith('ana-')).length,
};
