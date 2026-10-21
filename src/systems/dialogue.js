// Moteur de dialogue arborescent.
// Un dialogue est une liste d'entrées :
//   ['pnj', 'texte']                 réplique (pnj = id, 'me' = joueur,
//                                     'narr' = narration, 'voice' = l'Astrolabe)
//   { do: [actions] }                actions (voir actions.js)
//   { go: 'autre' }                  saut vers un autre dialogue
//   { if: (S) => bool, go: 'id' }    saut conditionnel
//   { choice: [{ t, go?, do?, if?, end? }] }  choix du joueur
// Les dialogues réagissent à l'état du monde via les conditions (S).

import { S, state } from '../core/state.js';
import { emit } from '../core/events.js';
import { DIALOGUES, NPCS } from '../story/registry.js';
import { act } from './actions.js';
import { api } from './api.js';

export class DialogueRunner {
  constructor() {
    this.cur = null;
  }

  isOpen() { return !!this.cur; }

  start(id, opts = {}) {
    const list = DIALOGUES[id];
    if (!list) { console.warn('Dialogue inconnu', id); opts.onEnd?.(true); return; }
    this.cur = { rootId: id, id, list, i: 0, npc: opts.npc ?? null, onEnd: opts.onEnd, ctx: opts.ctx ?? {} };
    emit('dialogue:start', { id, npc: this.cur.npc });
    this.step();
  }

  speakerName(who) {
    if (who === 'me') return api.player?.name ?? 'Toi';
    if (who === 'narr') return '';
    if (who === 'voice') return "Voix de l'Astrolabe";
    return NPCS[who]?.name ?? who;
  }

  step() {
    const c = this.cur;
    if (!c) return;
    while (c.i < c.list.length) {
      const e = c.list[c.i++];
      if (Array.isArray(e)) {
        let [who, text] = e;
        if (who === 'npc') who = c.npc ?? 'narr';
        const npcId = NPCS[who] ? who : null;
        if (npcId) api.npcs?.get(npcId)?.speak();
        api.ui.dialogueLine({
          who, name: this.speakerName(who), text: format(text, c.ctx), npcId,
          role: NPCS[who]?.title ?? '',
        }, () => this.step());
        return;
      }
      if (e.choice) {
        const opts = e.choice.filter((o) => !o.if || o.if(S));
        api.ui.dialogueChoices(opts.map((o) => ({ text: format(o.t, c.ctx), seen: o.go && state.flags['seen:' + o.go] })), (k) => this.pick(opts[k]));
        return;
      }
      if (e.if) {
        if (e.if(S)) { this.jump(e.go); }
        continue;
      }
      if (e.do) act(e.do, c.ctx);
      if (e.go) { this.jump(e.go); continue; }
      if (!this.cur) return;   // une action a pu fermer le dialogue
    }
    this.finish(true);
  }

  jump(id) {
    const list = DIALOGUES[id];
    if (!list) { console.warn('Dialogue inconnu', id); return; }
    state.flags['seen:' + this.cur.id] = true;
    this.cur.id = id;
    this.cur.list = list;
    this.cur.i = 0;
  }

  pick(opt) {
    if (!this.cur || !opt) return;
    if (opt.do) act(opt.do, this.cur.ctx);
    if (!this.cur) return;
    if (opt.go) { this.jump(opt.go); this.step(); return; }
    if (opt.end || !opt.go) this.finish(!opt.abort);
  }

  finish(completed) {
    const c = this.cur;
    if (!c) return;
    this.cur = null;
    state.flags['seen:' + c.id] = true;
    state.flags['seen:' + c.rootId] = true;
    api.ui.dialogueClose();
    emit('dialogue:end', { id: c.rootId, last: c.id, npc: c.npc, ctx: c.ctx, completed });
    c.onEnd?.(completed, c);
  }

  // Échap : interrompt sans valider l'étape de quête en cours
  abort() { this.finish(false); }
}

function format(t, ctx = {}) {
  if (typeof t === 'function') t = t(S, ctx);
  return String(t)
    .replace(/\{nom\}/g, api.player?.name ?? 'Sacha')
    .replace(/\{heure\}/g, `${Math.floor(state.time)}h`);
}
