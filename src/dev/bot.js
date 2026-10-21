// Bot de test : joue l'histoire automatiquement en suivant la quête suivie
// (téléportation vers l'objectif, dialogues, énigmes, objets…). Utilisé par
// les tests automatisés pour vérifier que toutes les quêtes sont réalisables.

import { state, S } from '../core/state.js';
import { api, resolveAt } from '../systems/api.js';
import { QUESTS, DIALOGUES, RIDDLES } from '../story/registry.js';

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Termine le dialogue en cours en choisissant les bonnes réponses
async function finishDialogue(maxSteps = 200) {
  for (let i = 0; i < maxSteps && api.dialogue.isOpen(); i++) {
    const ui = api.ui;
    if (ui.dlg?.choices) {
      const cur = api.dialogue.cur;
      const entry = cur.list[cur.i - 1];
      const opts = (entry?.choice ?? []).filter((o) => !o.if || o.if(S));
      let k = opts.findIndex((o) => o.best);
      if (k < 0) k = opts.findIndex((o) => o.do?.some((a) => a[0] === 'start' || a[0] === 'advance'));
      if (k < 0) k = opts.findIndex((o) => !o.end);
      if (k < 0) k = 0;
      const pk = ui.dlg.pick;
      ui.dlg = null;
      pk(k);
    } else if (ui.dlg) {
      ui.dlg.typing = false;
      ui.dialogueAdvance();
    }
    await wait(5);
  }
  if (api.ui.narr) api.ui.narrationClose();
}

function closePanels() {
  if (api.ui.panel === 'riddle') return;
  if (api.ui.panel) api.ui.close();
  if (api.ui.narr) api.ui.narrationClose();
}

async function solveRiddle() {
  if (api.ui.panel !== 'riddle') return false;
  const btns = document.querySelectorAll('#panel-body .riddle-opts button');
  // l'énigme ouverte est retrouvée par son texte
  const q = document.querySelector('#panel-body .riddle-q')?.textContent;
  const r = Object.values(RIDDLES).find((x) => x.q === q);
  if (!r) { api.ui.close(); return false; }
  btns[r.answer].click();
  await wait(800);
  if (api.ui.narr) api.ui.narrationClose();
  return true;
}

function goNear(p, d = 1.2) {
  api.player.teleport(p.x + d, p.z + d * 0.4);
}

// Un pas de bot ; renvoie une description de ce qui a été fait
export async function botStep() {
  closePanels();
  if (api.dialogue.isOpen()) { await finishDialogue(); return 'dialogue'; }
  if (await solveRiddle()) return 'riddle';
  if (api.player.mode === 'action') { await wait(100); return 'action'; }
  const id = state.tracked;
  if (!id || !S.active(id)) { api.quests.trackBest(); if (!state.tracked) return 'idle'; }
  const q = QUESTS[state.tracked];
  if (q.era !== state.era && !q.anyEra) { await api.travel(q.era, { silent: true, noCine: true, force: true }); return 'travel:' + q.era; }
  const st = q.steps[state.quests[state.tracked].step];
  const targets = api.quests.targets().filter((t) => t.questId === state.tracked);
  switch (st.type) {
    case 'talk':
    case 'deliver': {
      const n = api.npcs.get(st.npc);
      if (!n) return 'missing-npc:' + st.npc;
      if (st.type === 'deliver' && S.count(st.item) < (st.count ?? 1)) return 'missing-items:' + st.item;
      goNear(n.pos);
      api.npcs.talk(n);
      await finishDialogue();
      return 'talk:' + st.npc;
    }
    case 'collect': {
      const t = targets.find((x) => x.kind === 'pickup');
      if (!t) return 'collect-nothing:' + st.item;
      const p = resolveAt(t.at);
      goNear(p, 0.5);
      api.questWorld.refresh();
      const it = [...api.questWorld.items.values()].find((v) => v.t.key === t.key);
      if (it) await runTarget(it.t);
      return 'pickup:' + t.item;
    }
    case 'interact':
    case 'photo': {
      const t = targets[0];
      if (!t) return 'interact-nothing';
      if (t.target.requires && S.count(t.target.requires) < (t.target.need ?? 1)) return 'needs:' + t.target.requires;
      goNear(resolveAt(t.at), 0.5);
      api.questWorld.refresh();
      const it = [...api.questWorld.items.values()].find((v) => v.t.key === t.key && v.t.questId === t.questId);
      if (it) await runTarget(it.t);
      return st.type + ':' + t.key;
    }
    case 'goto':
    case 'escort': {
      const p = resolveAt(st.type === 'goto' ? st.at : st.to);
      if (st.type === 'escort') { const n = api.npcs.get(st.npc); n.follow(true); n.place(p); }
      goNear(p, 0.3);
      await wait(50);
      await finishDialogue();
      return 'goto';
    }
    case 'observe': {
      const kinds = Array.isArray(st.fauna) ? st.fauna : [st.fauna];
      for (const k of kinds) {
        if (state.quests[state.tracked].progress[k]) continue;
        let a = api.world.fauna.animals.find((x) => x.kind === k);
        if (!a) a = api.world.fauna.spawn(k, api.player.pos.x + 4, api.player.pos.z);
        api.player.teleport(a.obj.position.x - 3, a.obj.position.z);
        api.interaction.observe(a);
        return 'observe:' + k;
      }
      return 'observe-done';
    }
    case 'wait': {
      if (st.text.includes('portail') || st.text.includes('T)')) {
        const m = st.until.toString().match(/'(\w+)'/);
        if (m) { await api.travel(m[1], { silent: true, noCine: true, force: true }); return 'travel'; }
      }
      state.time = (state.time + 3) % 24;
      return 'wait';
    }
    case 'event':
      return 'event-blocked:' + st.id;
  }
  return 'unknown:' + st.type;
}

async function runTarget(t) {
  api.interaction.questTarget(t);
  for (let i = 0; i < 60 && api.player.mode === 'action'; i++) await wait(50);
  await wait(30);
  await solveRiddle();
  await finishDialogue();
  if (api.ui.narr) api.ui.narrationClose();
}

// Joue jusqu'à la fin (ou blocage)
export async function botRun(maxSteps = 600, untilQuest = null) {
  const log = [];
  let same = 0, last = '';
  for (let i = 0; i < maxSteps; i++) {
    if (untilQuest && S.done(untilQuest)) break;
    if (api.cinematic.active) { api.cinematic.shots = []; api.cinematic.finish(); }
    const r = await botStep();
    const key = `${state.tracked}|${r}|${state.tracked ? state.quests[state.tracked]?.step : ''}`;
    log.push(`${state.tracked ?? '-'} → ${r}`);
    if (key === last) { same++; if (same > 6) { log.push('BLOQUÉ'); break; } } else same = 0;
    last = key;
    if (r === 'idle') break;
    await wait(20);
  }
  return log;
}

// Vérifie que les points nommés et les cibles de quêtes ne sont pas dans un
// bâtiment ni dans l'eau (pour l'époque chargée).
export function checkSpots() {
  const w = api.world;
  const bad = [];
  for (const [name, s] of Object.entries(w.spots)) {
    if (w.isBlocked(s.x, s.z, 0.3)) bad.push(`point « ${name} » bloqué`);
  }
  for (const q of Object.values(QUESTS)) {
    if (q.era !== state.era) continue;
    for (const st of q.steps) {
      const ats = [];
      if (st.at) ats.push(st.at);
      if (st.to) ats.push(st.to);
      for (const t of st.targets || []) ats.push(t.at);
      for (const a of st.spawns || []) ats.push(a);
      for (const at of ats) {
        const p = resolveAt(at);
        if (!p) { bad.push(`${q.id}/${st.id} : point introuvable ${JSON.stringify(at)}`); continue; }
        if (w.isBlocked(p.x, p.z, 0.25)) bad.push(`${q.id}/${st.id} : cible dans un obstacle ${JSON.stringify(at)}`);
        if (p.y < 0.2) bad.push(`${q.id}/${st.id} : cible dans l'eau ${JSON.stringify(at)}`);
      }
    }
  }
  for (const n of api.npcs.list) {
    for (const e of n.def.routine || []) {
      const p = resolveAt(e.at);
      if (!p) { bad.push(`PNJ ${n.id} : point introuvable ${JSON.stringify(e.at)}`); continue; }
      if (w.isBlocked(p.x, p.z, 0.25)) bad.push(`PNJ ${n.id} : poste dans un obstacle ${JSON.stringify(e.at)}`);
    }
  }
  return bad;
}
