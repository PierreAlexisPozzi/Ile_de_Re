// Interactions (touche E) : parler, ramasser, examiner, photographier,
// lire une affiche, commercer, s'asseoir, embarquer, observer un animal.
// Choisit chaque frame la meilleure cible devant le joueur.

import { state, S } from '../core/state.js';
import { emit } from '../core/events.js';
import { pressed } from '../core/input.js';
import { api } from './api.js';
import { act } from './actions.js';
import { addItem, itemCount, removeItem, unlockCodex, addXP } from './inventory.js';
import { ITEMS, CODEX } from '../story/registry.js';
import { FAUNA_INFO } from '../world/fauna.js';

export class Interaction {
  constructor() {
    this.current = null;
  }

  find() {
    const p = api.player.pos;
    const yaw = api.player.yaw;
    const fwd = (x, z) => {
      const dx = x - p.x, dz = z - p.z;
      const d = Math.hypot(dx, dz) || 1;
      return (dx * Math.sin(yaw) + dz * Math.cos(yaw)) / d;   // cos de l'angle
    };
    const cands = [];
    if (api.player.mode === 'boat') {
      if (api.player.nearShore()) cands.push({ kind: 'disembark', score: 100, label: 'Débarquer' });
      return cands[0] ?? null;
    }
    const q = api.questWorld.nearest(p, 2.4);
    if (q) cands.push({ kind: 'quest', v: q, score: 30 - Math.hypot(q.pos.x - p.x, q.pos.z - p.z), label: q.t.label });
    const n = api.npcs.nearest(p, 3.0);
    if (n) cands.push({ kind: 'npc', v: n, score: 20 + fwd(n.pos.x, n.pos.z) * 3 - Math.hypot(n.pos.x - p.x, n.pos.z - p.z), label: `Parler à ${n.def.name}` });
    for (const it of api.world.interactables) {
      const d = Math.hypot(it.x - p.x, it.z - p.z);
      if (d < it.r) cands.push({ kind: it.kind, v: it, score: 10 - d + fwd(it.x, it.z) * 2, label: it.label });
    }
    const f = api.world.fauna.nearest(p, 8);
    if (f && fwd(f.obj.position.x, f.obj.position.z) > 0.5) {
      cands.push({ kind: 'fauna', v: f, score: 2, label: `Observer : ${FAUNA_INFO[f.kind].name}` });
    }
    cands.sort((a, b) => b.score - a.score);
    return cands[0] ?? null;
  }

  update() {
    if (api.dialogue.isOpen() || api.ui.panelOpen() || api.cinematic.active || api.player.mode === 'action') {
      api.ui.hint(null);
      return;
    }
    const c = this.find();
    this.current = c;
    api.ui.hint(c ? c.label : null);
    if (c && pressed('KeyE')) this.run(c);
  }

  run(c) {
    switch (c.kind) {
      case 'npc': api.npcs.talk(c.v); api.audio?.sfx('click'); break;
      case 'quest': this.questTarget(c.v.t); break;
      case 'poster': {
        const def = c.v.poster;
        api.ui.openPoster(def);
        if (!state.flags['read:' + def.id]) { state.flags['read:' + def.id] = true; addXP('hist', 15, true); }
        if (def.codex) unlockCodex(def.codex);
        emit('poster:read', { id: def.id });
        break;
      }
      case 'shop': api.ui.openShop(c.v.shop.id); break;
      case 'bench': api.player.sit(c.v.rot); break;
      case 'boat':
        if (c.v.requires && !S.flag(c.v.requires)) { emit('toast', { text: c.v.locked ?? 'Cette embarcation ne t\'appartient pas.', kind: 'info' }); break; }
        api.player.board(c.v.boatType, c.v.boatObj);
        break;
      case 'disembark': api.player.dismount(); break;
      case 'fauna': this.observe(c.v); break;
      case 'custom': act(c.v.do ?? [], {}); break;
      case 'door': api.interiors.enter(c.v.interior); break;
      case 'exit': api.interiors.exit(); break;
    }
  }

  observe(a) {
    const info = FAUNA_INFO[a.kind];
    api.player.char.setAction('lookout');
    setTimeout(() => api.player.char.setAction('idle'), 1500);
    if (!state.observed.includes(a.kind)) {
      state.observed.push(a.kind);
      addXP('expl', 20);
      if (info.codex) unlockCodex(info.codex);
    }
    emit('toast', { text: `Observé : ${info.name}`, kind: 'info' });
    api.quests.onObserve(a.kind);
  }

  // Objet ou point d'intérêt de quête
  questTarget(t) {
    const st = t.step;
    if (t.kind === 'pickup') {
      api.player.char.setAction('inspect');
      setTimeout(() => api.player.char.setAction('idle'), 700);
      state.flags['picked:' + t.key] = true;
      addItem(t.item, 1);
      api.audio?.sfx('pickup');
      api.questWorld.remove(t.key);
      api.quests.onPickup(t.item);
      emit('quests');
      return;
    }
    const tg = t.target;
    if (tg.requires && itemCount(tg.requires) < (tg.need ?? 1)) {
      emit('toast', { text: tg.missing ?? `Il te faut : ${ITEMS[tg.requires]?.name ?? tg.requires}`, kind: 'info' });
      return;
    }
    if (tg.cond && !tg.cond(S)) {
      emit('toast', { text: tg.condText ?? 'Pas maintenant.', kind: 'info' });
      return;
    }
    const finish = () => {
      if (tg.consume) removeItem(tg.consume, tg.consumeN ?? 1);
      if (tg.give) addItem(tg.give, 1);
      if (tg.do) act(tg.do, { questId: t.questId });
      if (t.kind === 'photo') {
        api.ui.flash();
        api.audio?.sfx('shutter');
        if (!state.photos.includes(tg.key ?? t.key)) state.photos.push(tg.key ?? t.key);
      }
      if (tg.text) api.ui.narration(tg.text, tg.title);
      if (tg.codex) unlockCodex(tg.codex);
      api.quests.markDone(t.questId, t.key);
    };
    const afterAnim = () => {
      if (tg.riddle) {
        api.ui.openRiddle(tg.riddle, { onSolved: finish });
      } else if (tg.dialogue) {
        api.dialogue.start(tg.dialogue, { ctx: { questId: t.questId }, onEnd: (ok) => { if (ok) finish(); } });
      } else finish();
    };
    if (tg.anim || t.kind === 'photo') {
      if (t.kind === 'photo') api.player.setPropTemp('camera');
      api.player.playAction(tg.anim ?? 'point', tg.duration ?? (t.kind === 'photo' ? 0.9 : 1.6), () => {
        if (t.kind === 'photo') api.player.setPropTemp(null);
        afterAnim();
      });
    } else afterAnim();
    void CODEX;
  }
}
