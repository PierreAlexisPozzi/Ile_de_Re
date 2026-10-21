// Moteur de quêtes. Une quête est une suite d'étapes ; chaque étape a un type :
//   talk      parler à un PNJ (dialogue joué, étape validée à la fin)
//   deliver   apporter des objets à un PNJ
//   collect   ramasser des objets posés dans le monde
//   interact  agir sur un ou plusieurs points (avec animation, texte, énigme)
//   photo     photographier un lieu (époque contemporaine)
//   observe   observer un animal (héron, aigrette…)
//   goto      se rendre à un endroit
//   escort    guider un PNJ jusqu'à un endroit
//   wait      attendre une condition (la nuit, la marée basse…)
//   event     validée par une action ['advance', id] depuis un dialogue
// Voir story/eras/*.js pour le contenu.

import { state, S } from '../core/state.js';
import { emit } from '../core/events.js';
import { QUESTS, ITEMS } from '../story/registry.js';
import { addItem, removeItem, itemCount, addXP, addMoney, addReputation, unlockCodex } from './inventory.js';
import { act } from './actions.js';
import { api, resolveAt } from './api.js';
import { getEra } from '../story/eras.js';

export class QuestManager {
  def(id) { return QUESTS[id]; }
  st(id) { return state.quests[id]; }

  step(id) {
    const q = QUESTS[id], s = state.quests[id];
    if (!q || !s || s.status !== 'active') return null;
    return q.steps[s.step] ?? null;
  }

  requirementsMet(q) {
    return (q.requires || []).every((r) => S.done(r)) && (!q.cond || q.cond(S));
  }

  start(id, quiet = false) {
    const q = QUESTS[id];
    if (!q) { console.warn('Quête inconnue', id); return false; }
    if (state.quests[id]) return false;
    state.quests[id] = { status: 'active', step: 0, progress: {}, started: state.stats.playTime };
    if (!quiet) emit('toast', { text: `${q.main ? '✦ Quête principale' : '◇ Nouvelle quête'} : ${q.title}`, kind: 'quest' });
    if (q.main || !state.tracked || !S.active(state.tracked)) state.tracked = id;
    this.enterStep(id);
    emit('quests');
    return true;
  }

  enterStep(id) {
    const st = this.step(id);
    if (!st) return;
    if (st.onStart) act(st.onStart, { questId: id });
    // une étape « collect » peut être déjà satisfaite par l'inventaire
    if (st.type === 'collect' && itemCount(st.item) >= (st.count ?? 1) && !st.fresh) this.advance(id);
    if (st.type === 'wait' && st.until?.(S)) this.advance(id);
  }

  advance(id, stepId) {
    const q = QUESTS[id], s = state.quests[id];
    if (!q || !s || s.status !== 'active') return false;
    const st = q.steps[s.step];
    if (stepId && st?.id !== stepId) return false;
    if (st?.onDone) act(st.onDone, { questId: id });
    if (state.quests[id].status !== 'active') return true; // onDone a pu terminer la quête
    s.step++;
    s.progress = {};
    if (s.step >= q.steps.length) { this.complete(id); return true; }
    emit('toast', { text: `◇ ${q.title} — ${q.steps[s.step].text}`, kind: 'step' });
    this.enterStep(id);
    emit('quests');
    return true;
  }

  complete(id) {
    const q = QUESTS[id], s = state.quests[id];
    if (!q || !s || s.status === 'done') return;
    s.status = 'done';
    s.step = q.steps.length;
    emit('toast', { text: `✔ Quête accomplie : ${q.title}`, kind: 'done' });
    const r = q.rewards || {};
    if (r.xpHist) addXP('hist', r.xpHist);
    if (r.xpExpl) addXP('expl', r.xpExpl);
    if (r.money) { addMoney(r.money, q.era); emit('toast', { text: `+${r.money} ${getEra(q.era).currency}`, kind: 'money' }); }
    if (r.rep) addReputation(getEra(q.era).town, r.rep);
    for (const it of r.items || []) addItem(...(Array.isArray(it) ? it : [it, 1]));
    for (const c of r.codex || []) unlockCodex(c);
    if (r.unlock) act([['unlock', r.unlock]]);
    if (q.onComplete) act(q.onComplete, { questId: id });
    emit('quest:done', { id });
    if (state.tracked === id) state.tracked = null;
    if (q.next) this.start(q.next);
    this.checkAuto();
    if (!state.tracked) this.trackBest();
    emit('quests');
  }

  // Démarre les quêtes automatiques dont les prérequis sont remplis
  checkAuto() {
    for (const q of Object.values(QUESTS)) {
      if (!q.auto || state.quests[q.id]) continue;
      if (q.era !== state.era && !q.anyEra) continue;
      if (this.requirementsMet(q)) this.start(q.id);
    }
  }

  trackBest() {
    const act2 = Object.keys(state.quests).filter((id) => S.active(id));
    const here = act2.filter((id) => QUESTS[id].era === state.era || QUESTS[id].anyEra);
    const main = here.find((id) => QUESTS[id].main) ?? act2.find((id) => QUESTS[id].main);
    state.tracked = main ?? here[0] ?? act2[0] ?? null;
  }

  // Quêtes qu'un PNJ peut proposer
  offersFrom(npcId) {
    return Object.values(QUESTS).filter((q) => q.giver === npcId && !state.quests[q.id]
      && (q.era === state.era || q.anyEra) && this.requirementsMet(q));
  }

  // Étape active qui implique ce PNJ (parler, livrer, escorter)
  npcTask(npcId) {
    for (const [id, s] of Object.entries(state.quests)) {
      if (s.status !== 'active') continue;
      const q = QUESTS[id];
      if (q.era !== state.era && !q.anyEra) continue;
      const st = q.steps[s.step];
      if (st && (st.type === 'talk' || st.type === 'deliver') && st.npc === npcId) return { id, q, st };
    }
    return null;
  }

  // Lance la conversation adaptée quand le joueur parle à un PNJ
  talkTo(npc) {
    const task = this.npcTask(npc.id);
    if (task) {
      const { id, st } = task;
      if (st.type === 'deliver') {
        const need = st.count ?? 1;
        if (itemCount(st.item) < need) {
          api.dialogue.start(st.missing ?? '_missing', {
            npc: npc.id, ctx: { item: st.item, need, have: itemCount(st.item), npcId: npc.id },
          });
          return;
        }
        api.dialogue.start(st.dialogue, {
          npc: npc.id, ctx: { questId: id },
          onEnd: (ok) => {
            if (!ok || !S.active(id) || this.step(id) !== st) return;
            if (st.take !== false) removeItem(st.item, need);
            this.advance(id);
          },
        });
        return;
      }
      api.dialogue.start(st.dialogue, {
        npc: npc.id, ctx: { questId: id },
        onEnd: (ok) => { if (ok && !st.manual && this.step(id) === st) this.advance(id); },
      });
      return;
    }
    const offers = this.offersFrom(npc.id);
    if (offers.length) {
      api.dialogue.start(offers[0].offer, { npc: npc.id, ctx: { questId: offers[0].id } });
      return;
    }
    const def = npc.def;
    const d = typeof def.talk === 'function' ? def.talk(S) : def.talk;
    api.dialogue.start(d ?? '_default', { npc: npc.id, ctx: { npcId: npc.id } });
  }

  // ---------- Événements du monde ----------
  onPickup(itemId) {
    for (const [id, s] of Object.entries(state.quests)) {
      const st = this.step(id);
      if (st?.type === 'collect' && st.item === itemId && itemCount(itemId) >= (st.count ?? 1)) this.advance(id);
    }
  }

  // cible d'une étape interact / photo / observe validée
  markDone(id, key) {
    const s = state.quests[id], st = this.step(id);
    if (!st) return;
    s.progress[key] = true;
    const total = st.count ?? st.targets?.length ?? 1;
    const done = Object.keys(s.progress).length;
    emit('quests');
    if (done >= total) this.advance(id);
    else emit('toast', { text: `${st.text} (${done}/${total})`, kind: 'step' });
  }

  onObserve(kind) {
    for (const [id] of Object.entries(state.quests)) {
      const st = this.step(id);
      if (st?.type === 'observe' && (st.fauna === kind || st.fauna?.includes?.(kind))) {
        const s = state.quests[id];
        if (!s.progress[kind]) this.markDone(id, kind);
      }
    }
  }

  // appelé chaque frame : étapes goto / escort / wait
  tick(playerPos) {
    for (const [id, s] of Object.entries(state.quests)) {
      if (s.status !== 'active') continue;
      const q = QUESTS[id];
      if (q.era !== state.era && !q.anyEra) continue;
      const st = q.steps[s.step];
      if (!st) continue;
      if (st.type === 'goto') {
        const p = resolveAt(st.at);
        if (p && Math.hypot(p.x - playerPos.x, p.z - playerPos.z) < (st.r ?? 4)) {
          if (st.dialogue) {
            if (!api.dialogue.isOpen()) api.dialogue.start(st.dialogue, { ctx: { questId: id }, onEnd: () => this.advance(id, st.id) });
          } else this.advance(id);
        }
      } else if (st.type === 'escort') {
        const n = api.npcs.get(st.npc);
        const p = resolveAt(st.to);
        if (n && p && Math.hypot(n.pos.x - p.x, n.pos.z - p.z) < (st.r ?? 4)) {
          n.follow(false);
          this.advance(id);
        }
      } else if (st.type === 'wait') {
        if (st.until?.(S)) this.advance(id);
      }
    }
  }

  // ---------- Cibles visibles dans le monde (objets, marqueurs) ----------
  // Retourne la liste des cibles de toutes les étapes actives de l'époque courante.
  targets() {
    const out = [];
    for (const [id, s] of Object.entries(state.quests)) {
      if (s.status !== 'active') continue;
      const q = QUESTS[id];
      if (q.era !== state.era && !q.anyEra) continue;
      const st = q.steps[s.step];
      if (!st) continue;
      const base = { questId: id, step: st, main: !!q.main, tracked: state.tracked === id };
      switch (st.type) {
        case 'collect':
          (st.spawns || []).forEach((at, k) => {
            const key = `${id}:${s.step}:c${k}`;
            if (state.flags['picked:' + key]) return;
            out.push({ ...base, key, kind: 'pickup', at, item: st.item, model: st.model ?? ITEMS[st.item]?.model, label: st.label ?? `Ramasser : ${ITEMS[st.item]?.name}` });
          });
          break;
        case 'interact':
        case 'photo':
          (st.targets || []).forEach((t, k) => {
            const key = t.key ?? `t${k}`;
            if (s.progress[key]) return;
            out.push({ ...base, key, kind: st.type, at: t.at, target: t, model: t.model, label: t.label ?? st.label ?? 'Examiner' });
          });
          break;
        case 'talk':
        case 'deliver':
          out.push({ ...base, key: `${id}:npc`, kind: 'npc', at: { npc: st.npc } });
          break;
        case 'goto':
          out.push({ ...base, key: `${id}:goto`, kind: 'goto', at: st.at });
          break;
        case 'escort':
          out.push({ ...base, key: `${id}:escort`, kind: 'goto', at: st.to });
          break;
        case 'observe':
          if (st.at) out.push({ ...base, key: `${id}:obs`, kind: 'zone', at: st.at });
          break;
      }
    }
    return out;
  }

  // Cible principale de la quête suivie (pour la boussole)
  trackedTarget() {
    const id = state.tracked;
    if (!id || !S.active(id)) return null;
    const q = QUESTS[id];
    if (q.era !== state.era && !q.anyEra) return { otherEra: q.era };
    return this.targets().find((t) => t.questId === id) ?? null;
  }
}
