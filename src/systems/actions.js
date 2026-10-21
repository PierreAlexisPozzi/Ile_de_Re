// Exécution des actions déclarées dans l'histoire (dialogues, quêtes) :
//   ['start', q]  ['advance', q, étape?]  ['give', objet, n]  ['take', objet, n]
//   ['flag', clé, valeur]  ['rep', n]  ['xp', 'hist'|'expl', n]  ['money', n]
//   ['codex', id]  ['unlock', époque]  ['riddle', id]  ['shop', id]
//   ['travel', époque]  ['cine', id]  ['follow', pnj] ['unfollow', pnj]
//   ['action', pnj, anim]  ['toast', texte]  ['time', heure]  ['fn', (api) => {}]

import { state } from '../core/state.js';
import { emit } from '../core/events.js';
import { api } from './api.js';
import { addItem, removeItem, addXP, addMoney, addReputation, unlockCodex } from './inventory.js';
import { getEra } from '../story/eras.js';

export function act(actions, ctx = {}) {
  if (!actions) return;
  for (const a of actions) {
    if (typeof a === 'function') { a(api, ctx); continue; }
    const [op, x, y] = a;
    switch (op) {
      case 'start': api.quests.start(x); break;
      case 'advance': api.quests.advance(x, y); break;
      case 'complete': api.quests.complete(x); break;
      case 'give': addItem(x, y ?? 1); break;
      case 'take': removeItem(x, y ?? 1); break;
      case 'flag': state.flags[x] = y ?? true; emit('flags'); break;
      case 'rep': addReputation(getEra(state.era).town, x); break;
      case 'xp': addXP(x, y); break;
      case 'money': addMoney(x); emit('toast', { text: `+${x} ${getEra(state.era).currency}`, kind: 'money' }); break;
      case 'codex': unlockCodex(x); break;
      case 'unlock':
        if (!state.unlockedEras.includes(x)) {
          state.unlockedEras.push(x);
          emit('toast', { text: `Nouvelle époque accessible : ${getEra(x).name} — ${getEra(x).townName}`, kind: 'era' });
        }
        break;
      case 'riddle': api.ui.openRiddle(x, ctx); break;
      case 'shop': api.ui.openShop(x); break;
      case 'travel': api.travel(x); break;
      case 'cine': api.cinematic.play(x); break;
      case 'follow': api.npcs.get(x)?.follow(true); break;
      case 'unfollow': api.npcs.get(x)?.follow(false); break;
      case 'goto': api.npcs.get(x)?.walkTo(y); break;
      case 'action': api.npcs.get(x)?.setAction(y); break;
      case 'toast': emit('toast', { text: x, kind: y ?? 'info' }); break;
      case 'time': state.time = x; break;
      case 'fn': x(api, ctx); break;
      default: console.warn('Action inconnue', a);
    }
  }
}
