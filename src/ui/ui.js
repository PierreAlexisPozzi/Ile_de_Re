// Interface : HUD (époque, lieu, heure, météo, bourse, boussole, objectif,
// mini-carte, endurance), dialogues avec portraits 3D, narration, panneaux
// (sac, journal, carnet, carte, portail temporel, boutique, énigme, affiche,
// fiche du personnage, options, pause) et effets (flash, fondu).

import * as THREE from 'three';
import { state, S, save, load, hasSave } from '../core/state.js';
import { on, emit } from '../core/events.js';
import { pressed, pressedChar, releasePointer } from '../core/input.js';
import { ITEMS, ITEM_TYPES, CODEX, CODEX_CATS, QUESTS, NPCS, SHOPS, RIDDLES, shopKey } from '../story/registry.js';
import { ERAS, getEra } from '../story/eras.js';
import { LOCATIONS, LOCATION, nearestLocation } from '../world/locations.js';
import { heightAt, terrainColor, HALF_L } from '../world/terrain.js';
import { posterCanvas, signCanvas } from '../gfx/signs.js';
import { api, resolveAt } from '../systems/api.js';
import { useItem, spend, levelOf, nextLevelXP, SKILLS, hasSkill, repTitle, addItem, unlockCodex, addXP } from '../systems/inventory.js';
import { PortraitRenderer } from './portraits.js';
import { look } from '../characters/wardrobe.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const MAP = { x0: -235, x1: 235, z0: -88, z1: 88, ppu: 3 };

export class UI {
  constructor() {
    this.portraits = new PortraitRenderer();
    this.panel = null;          // panneau ouvert
    this.dlg = null;            // { next, choices, typing }
    this.narr = null;
    this.mapCanvas = null;
    this.mapEra = null;
    this.selected = {};
    on('toast', (t) => this.toast(t.text, t.kind));
    on('action:start', () => $('#action-bar').classList.remove('hidden'));
    on('action:progress', ({ k }) => { $('#action-fill').style.width = `${k * 100}%`; });
    on('action:end', () => $('#action-bar').classList.add('hidden'));
    on('quests', () => { if (this.panel === 'journal') this.openJournal(); });
    $('#panel-close').onclick = () => this.close();
    $('#dialogue').addEventListener('click', (e) => { if (!e.target.closest('button')) this.dialogueAdvance(); });
    $('#narration').addEventListener('click', () => this.narrationClose());
  }

  showHUD(on2) { $('#hud').classList.toggle('hidden', !on2); }
  panelOpen() { return !!this.panel || !!this.narr; }

  // ======================================================================
  //  HUD
  // ======================================================================
  toast(text, kind = 'info') {
    if (!text) return;
    const box = $('#toasts');
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = text;
    box.appendChild(el);
    while (box.children.length > 6) box.firstChild.remove();
    setTimeout(() => el.remove(), 5100);
  }

  hint(label) {
    const h = $('#hint');
    if (!label) { h.classList.add('hidden'); return; }
    h.classList.remove('hidden');
    $('#hint-label').textContent = label;
  }

  update(dt) {
    const era = getEra(state.era);
    $('#era-icon').textContent = era.icon;
    $('#era-name').textContent = era.name;
    $('#era-years').textContent = era.years;
    const p = api.player.pos;
    const loc = nearestLocation(p.x, p.z, 60);
    const town = LOCATION[era.town];
    const inTown = Math.hypot(p.x - town.position[0], p.z - town.position[2]) < 70;
    $('#hud-place').textContent = inTown ? era.townName : loc ? `Environs de ${loc.name}` : "Île de Ré";
    const h = Math.floor(state.time), m = Math.floor((state.time % 1) * 60);
    $('#hud-clock').textContent = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    $('#hud-weather').textContent = { clear: '☀ Clair', cloudy: '⛅ Nuageux', fog: '🌫 Brume', rain: '🌧 Pluie' }[state.weather] ?? '';
    $('#hud-money').textContent = `${S.money()} ${era.currencyShort}`;
    // objectif suivi
    const tq = state.tracked && QUESTS[state.tracked];
    const obj = $('#objective');
    if (tq && S.active(state.tracked)) {
      obj.classList.remove('hidden');
      $('#obj-title').textContent = (tq.main ? '✦ ' : '◇ ') + tq.title;
      const st = tq.steps[state.quests[state.tracked].step];
      let txt = st?.text ?? '';
      const total = st?.count ?? st?.targets?.length;
      if (st && (st.type === 'interact' || st.type === 'photo') && total > 1) txt += ` (${Object.keys(state.quests[state.tracked].progress).length}/${total})`;
      if (st?.type === 'collect' && (st.count ?? 1) > 1) txt += ` (${Math.min(st.count, S.count(st.item))}/${st.count})`;
      if (tq.era !== state.era) txt = `${getEra(tq.era).icon} À l'époque : ${getEra(tq.era).name} (T pour voyager)`;
      $('#obj-step').textContent = txt;
    } else obj.classList.add('hidden');
    // endurance
    const st2 = state.player;
    $('#stamina-bar').style.width = `${(st2.stamina / st2.maxStamina) * 100}%`;
    $('#stamina').style.opacity = st2.stamina < st2.maxStamina - 1 ? '1' : '0';
    $('#mode-icon').textContent = { bike: '🚲', boat: '⛵', swim: '🏊', sit: '🪑' }[api.player.mode] ?? '';
    this.updateCompass();
    this.drawMinimap();
  }

  updateCompass() {
    const cam = api.player.camera;
    const dir = new THREE.Vector3();
    cam.getWorldDirection(dir);
    const heading = Math.atan2(dir.x, -dir.z);
    const strip = $('#compass-strip');
    const W = $('#compass').clientWidth;
    const span = Math.PI * 1.1;
    if (!strip.childElementCount) {
      const names = { 0: 'N', 45: 'NE', 90: 'E', 135: 'SE', 180: 'S', 225: 'SO', 270: 'O', 315: 'NO' };
      for (let d = 0; d < 360; d += 15) {
        const s = document.createElement('span');
        s.dataset.a = d;
        s.textContent = names[d] ?? '·';
        if (names[d]) s.className = 'card';
        strip.appendChild(s);
      }
    }
    for (const s of strip.children) {
      const a = (Number(s.dataset.a) * Math.PI) / 180;
      let rel = a - heading;
      rel = Math.atan2(Math.sin(rel), Math.cos(rel));
      s.style.display = Math.abs(rel) > span / 2 ? 'none' : '';
      s.style.left = `${W / 2 + (rel / span) * W}px`;
    }
    const goal = $('#compass-goal');
    const t = api.quests.trackedTarget();
    const p = t && !t.otherEra ? resolveAt(t.at) : null;
    if (p) {
      const pp = api.player.pos;
      const b = Math.atan2(p.x - pp.x, -(p.z - pp.z));
      let rel = Math.atan2(Math.sin(b - heading), Math.cos(b - heading));
      const clamped = Math.max(-span / 2, Math.min(span / 2, rel));
      goal.style.display = '';
      goal.style.left = `${W / 2 + (clamped / span) * W}px`;
      const d = Math.hypot(p.x - pp.x, p.z - pp.z);
      goal.innerHTML = `◆ <small>${d < 1000 ? Math.round(d) + ' m' : ''}</small>`;
    } else goal.style.display = 'none';
  }

  // ---------- Carte de l'île (calculée à partir du relief réel) ----------
  buildMap() {
    if (this.mapEra === state.era && this.mapCanvas) return this.mapCanvas;
    const W = Math.round((MAP.x1 - MAP.x0) * MAP.ppu), H = Math.round((MAP.z1 - MAP.z0) * MAP.ppu);
    const c = this.mapCanvas ?? document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    const img = ctx.createImageData(W, H);
    const lookE = getEra(state.era).look;
    const step = 1 / MAP.ppu;
    for (let j = 0; j < H; j++) {
      for (let i = 0; i < W; i++) {
        const x = MAP.x0 + i * step, z = MAP.z0 + j * step;
        const h = heightAt(x, z);
        let r, g, b;
        if (h < 0.05) {
          const d = Math.min(1, -h / 4);
          r = 70 - 40 * d; g = 140 - 60 * d; b = 160 - 40 * d;
        } else {
          const col = terrainColor(x, z, h, lookE);
          const shade = 0.9 + Math.min(0.25, h * 0.04);
          r = col.r * 255 * shade; g = col.g * 255 * shade; b = col.b * 255 * shade;
        }
        const k = (j * W + i) * 4;
        img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = 255;
      }
    }
    ctx.putImageData(img, 0, 0);
    // bâtiments et obstacles de la ville
    ctx.fillStyle = 'rgba(120, 72, 52, 0.85)';
    const tc = api.world.townCenter;
    for (const col of api.world.colliders) {
      if (Math.hypot(col.x - tc.x, col.z - tc.z) > 90 || col.r < 0.8) continue;
      ctx.beginPath();
      ctx.arc((col.x - MAP.x0) * MAP.ppu, (col.z - MAP.z0) * MAP.ppu, col.r * MAP.ppu, 0, Math.PI * 2);
      ctx.fill();
    }
    this.mapCanvas = c;
    this.mapEra = state.era;
    return c;
  }

  drawMinimap() {
    const cv = $('#minimap');
    const ctx = cv.getContext('2d');
    const base = this.buildMap();
    const p = api.player.pos;
    const W = cv.width, s = 1.0;
    ctx.save();
    ctx.clearRect(0, 0, W, W);
    ctx.beginPath(); ctx.arc(W / 2, W / 2, W / 2 - 1, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#2a5a70'; ctx.fillRect(0, 0, W, W);
    const px = (p.x - MAP.x0) * MAP.ppu, pz = (p.z - MAP.z0) * MAP.ppu;
    ctx.drawImage(base, px - W / (2 * s), pz - W / (2 * s), W / s, W / s, 0, 0, W, W);
    // cibles de quêtes
    for (const t of api.quests.targets()) {
      const q = resolveAt(t.at);
      if (!q) continue;
      let x = W / 2 + (q.x - p.x) * MAP.ppu * s, y = W / 2 + (q.z - p.z) * MAP.ppu * s;
      const dx = x - W / 2, dy = y - W / 2, d = Math.hypot(dx, dy);
      if (d > W / 2 - 8) { x = W / 2 + dx / d * (W / 2 - 8); y = W / 2 + dy / d * (W / 2 - 8); }
      ctx.fillStyle = t.tracked ? '#ffd36a' : t.main ? '#e8c060' : '#8fe0ff';
      ctx.beginPath(); ctx.arc(x, y, t.tracked ? 5 : 3.5, 0, Math.PI * 2); ctx.fill();
    }
    // PNJ à quête
    for (const n of api.npcs.list) {
      if (n.extra) continue;
      const x = W / 2 + (n.pos.x - p.x) * MAP.ppu * s, y = W / 2 + (n.pos.z - p.z) * MAP.ppu * s;
      if (Math.hypot(x - W / 2, y - W / 2) > W / 2) continue;
      ctx.fillStyle = 'rgba(240,234,216,0.85)';
      ctx.fillRect(x - 1.5, y - 1.5, 3, 3);
    }
    ctx.restore();
    // joueur
    ctx.save();
    ctx.translate(W / 2, W / 2);
    ctx.rotate(Math.PI - api.player.yaw);
    ctx.fillStyle = '#fff';
    ctx.strokeStyle = '#000';
    ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(0, 3); ctx.lineTo(-5, 6); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = '#d9b45f'; ctx.font = "bold 13px 'Montserrat', sans-serif"; ctx.textAlign = 'center';
    ctx.fillText('N', W / 2, 14);
  }

  // ======================================================================
  //  DIALOGUES
  // ======================================================================
  portraitFor(who) {
    if (who === 'voice') return this.portraits.astrolabe();
    if (who === 'me') return this.portraits.get('me:' + state.avatar, look('player', state.avatar === 'exploratrice' ? 'exploratrice' : state.avatar === 'aventurier' ? 'aventurier' : 'explorer'));
    const n = api.npcs.get(who);
    if (n) return this.portraits.get(who, { ...n.char.spec });
    return '';
  }

  dialogueLine(info, next) {
    const d = $('#dialogue');
    releasePointer();
    d.classList.remove('hidden');
    d.className = '';
    d.classList.add(info.who === 'narr' ? 'narr' : info.who === 'voice' ? 'voice' : info.who === 'me' ? 'me' : 'npc');
    const img = this.portraitFor(info.who);
    if (img) { $('#dlg-portrait').src = img; d.classList.remove('no-portrait'); } else d.classList.add('no-portrait');
    $('#dlg-name').textContent = info.name;
    $('#dlg-role').textContent = info.role ?? '';
    $('#dlg-choices').innerHTML = '';
    $('#dlg-more').style.display = '';
    // cadrage caméra sur l'interlocuteur
    const n = info.npcId ? api.npcs.get(info.npcId) : api.dialogue.cur?.npc ? api.npcs.get(api.dialogue.cur.npc) : null;
    api.player.focus = n ? { x: n.pos.x, y: n.pos.y, z: n.pos.z } : null;
    // effet machine à écrire
    const el = $('#dlg-text');
    const full = info.text;
    let i = 0;
    clearInterval(this.typeTimer);
    el.textContent = '';
    this.dlg = { next, typing: true, full };
    this.typeTimer = setInterval(() => {
      i += 2;
      el.textContent = full.slice(0, i);
      if (i >= full.length) { clearInterval(this.typeTimer); this.dlg.typing = false; }
    }, 16);
    api.audio?.sfx('blip');
  }

  dialogueAdvance() {
    if (!this.dlg) return;
    if (this.dlg.choices) return;
    if (this.dlg.typing) {
      clearInterval(this.typeTimer);
      $('#dlg-text').textContent = this.dlg.full;
      this.dlg.typing = false;
      return;
    }
    const n = this.dlg.next;
    this.dlg = null;
    n?.();
  }

  dialogueChoices(opts, pick) {
    clearInterval(this.typeTimer);
    if (this.dlg?.full) $('#dlg-text').textContent = this.dlg.full;
    $('#dlg-more').style.display = 'none';
    const box = $('#dlg-choices');
    box.innerHTML = '';
    this.dlg = { choices: opts, pick };
    opts.forEach((o, k) => {
      const b = document.createElement('button');
      b.innerHTML = `<i>${k + 1}</i>${esc(o.text)}`;
      if (o.seen) b.classList.add('seen');
      b.onclick = (e) => { e.stopPropagation(); this.dlg = null; api.audio?.sfx('click'); pick(k); };
      box.appendChild(b);
    });
  }

  dialogueClose() {
    clearInterval(this.typeTimer);
    this.dlg = null;
    $('#dialogue').classList.add('hidden');
    api.player.focus = null;
  }

  // Narration (texte sur papier ancien)
  narration(text, title = '') {
    this.narr = true;
    releasePointer();
    $('#narr-title').textContent = title;
    $('#narr-text').textContent = text;
    $('#narration').classList.remove('hidden');
  }
  narrationClose() {
    this.narr = null;
    $('#narration').classList.add('hidden');
  }

  // ======================================================================
  //  PANNEAUX
  // ======================================================================
  open(kind, title, tabs = null) {
    this.panel = kind;
    releasePointer();
    $('#panel').classList.remove('hidden');
    $('#panel-title').textContent = title;
    const t = $('#panel-tabs');
    t.innerHTML = '';
    if (tabs) {
      for (const [id, label, fn] of tabs) {
        const b = document.createElement('button');
        b.textContent = label;
        if (this.selected[kind + ':tab'] === id) b.classList.add('on');
        b.onclick = () => { this.selected[kind + ':tab'] = id; fn(); };
        t.appendChild(b);
      }
    }
    return $('#panel-body');
  }

  close() {
    if (this.onPanelClose) { const f = this.onPanelClose; this.onPanelClose = null; f(); }
    this.panel = null;
    $('#panel').classList.add('hidden');
  }

  // ---------- Sac ----------
  openInventory() {
    const body = this.open('inventory', 'Sac de l\'explorateur');
    const groups = {};
    for (const e of state.inventory) {
      const d = ITEMS[e.id];
      if (!d) continue;
      (groups[d.type ?? 'ressource'] ??= []).push(e);
    }
    const sel = this.selected.inv;
    let html = '<div class="cols"><div>';
    const cats = Object.keys(groups).sort((a, b) => (ITEM_TYPES[a]?.order ?? 9) - (ITEM_TYPES[b]?.order ?? 9));
    if (!cats.length) html += '<p class="codex-locked">Ton sac est vide. Explore, aide les habitants, ramasse ce qui brille.</p>';
    for (const c of cats) {
      html += `<div class="inv-cat">${ITEM_TYPES[c]?.name ?? c}</div><div class="inv-grid">`;
      for (const e of groups[c]) {
        const d = ITEMS[e.id];
        html += `<div class="slot ${sel === e.id ? 'sel' : ''}" data-id="${e.id}" title="${esc(d.name)}">${d.icon ?? '•'}${e.qty > 1 ? `<span class="qty">${e.qty}</span>` : ''}</div>`;
      }
      html += '</div>';
    }
    html += '</div><div class="detail" id="inv-detail"></div></div>';
    body.innerHTML = html;
    body.querySelectorAll('.slot').forEach((s) => { s.onclick = () => { this.selected.inv = s.dataset.id; this.openInventory(); }; });
    const det = $('#inv-detail');
    const d = sel && ITEMS[sel];
    if (d && S.has(sel)) {
      det.innerHTML = `<h3>${d.icon ?? ''} ${esc(d.name)}</h3><div class="meta">${ITEM_TYPES[d.type]?.name ?? ''}${d.era ? ' · ' + getEra(d.era).name : ''}</div><p>${esc(d.desc ?? '')}</p>`;
      if (d.use) {
        const b = document.createElement('button');
        b.className = 'btn';
        b.textContent = d.use.label ?? 'Utiliser';
        b.onclick = () => { useItem(sel); this.openInventory(); };
        det.appendChild(b);
      }
      if (d.read) {
        const b = document.createElement('button');
        b.className = 'btn';
        b.textContent = 'Lire';
        b.onclick = () => { this.close(); this.narration(d.read, d.name); };
        det.appendChild(b);
      }
    } else det.innerHTML = '<p class="codex-locked">Sélectionne un objet.</p>';
  }

  // ---------- Journal ----------
  openJournal(filter = this.selected['journal:tab'] ?? 'active') {
    this.selected['journal:tab'] = filter;
    const body = this.open('journal', 'Journal de quêtes', [
      ['active', 'En cours', () => this.openJournal('active')],
      ['main', 'Histoire principale', () => this.openJournal('main')],
      ['done', 'Accomplies', () => this.openJournal('done')],
    ]);
    const ids = Object.keys(state.quests).filter((id) => QUESTS[id]).filter((id) => {
      const s = state.quests[id];
      if (filter === 'done') return s.status === 'done';
      if (filter === 'main') return QUESTS[id].main;
      return s.status === 'active';
    });
    ids.sort((a, b) => (QUESTS[b].main - QUESTS[a].main) || (getEra(QUESTS[a].era).order - getEra(QUESTS[b].era).order));
    if (!ids.length) { body.innerHTML = '<p class="codex-locked">Aucune quête ici pour l\'instant.</p>'; return; }
    body.innerHTML = ids.map((id) => {
      const q = QUESTS[id], s = state.quests[id];
      const steps = q.steps.map((st, k) => {
        if (k > s.step) return '';
        return `<li class="${k < s.step ? 'ok' : 'cur'}">${esc(st.text)}</li>`;
      }).join('');
      return `<div class="quest ${q.main ? 'main' : ''} ${s.status === 'done' ? 'done' : ''} ${state.tracked === id ? 'tracked' : ''}" data-id="${id}">
        <div class="era">${getEra(q.era).icon} ${getEra(q.era).name}${q.main ? ' · PRINCIPALE' : ''}${state.tracked === id ? ' · SUIVIE' : ''}</div>
        <h4>${esc(q.title)}</h4><div style="font-size:16px;color:#b9b2a0;font-style:italic">${esc(q.desc ?? '')}</div>
        <ol>${steps}</ol></div>`;
    }).join('');
    body.querySelectorAll('.quest').forEach((el) => {
      el.onclick = () => { if (S.active(el.dataset.id)) { state.tracked = el.dataset.id; this.openJournal(filter); } };
    });
  }

  // ---------- Carnet (codex) ----------
  openCodex(cat = this.selected['codex:tab'] ?? 'histoire') {
    this.selected['codex:tab'] = cat;
    const tabs = Object.entries(CODEX_CATS).map(([id, label]) => [id, label, () => this.openCodex(id)]);
    const body = this.open('codex', 'Carnet de l\'explorateur', tabs);
    const all = Object.entries(CODEX).filter(([, e]) => e.cat === cat);
    const got = all.filter(([id]) => state.codex.includes(id));
    const sel = this.selected.codex;
    let html = `<div class="cols"><div><div class="inv-cat">${got.length} / ${all.length} entrées</div>`;
    for (const [id, e] of all) {
      if (state.codex.includes(id)) html += `<div class="codex-entry" data-id="${id}"><b>${esc(e.title)}</b><span>${e.era ? getEra(e.era).name : ''}</span></div>`;
      else html += '<div class="codex-entry codex-locked">— entrée à découvrir —</div>';
    }
    html += '</div><div class="detail">';
    const e = sel && CODEX[sel];
    if (e && e.cat === cat && state.codex.includes(sel)) html += `<h3>${esc(e.title)}</h3><div class="meta">${e.era ? getEra(e.era).name : ''}</div><div class="codex-text">${esc(e.text)}</div>`;
    else html += '<p class="codex-locked">Le carnet se remplit au fil de tes découvertes : affiches lues, habitants rencontrés, lieux visités, animaux observés.</p>';
    html += '</div></div>';
    body.innerHTML = html;
    body.querySelectorAll('.codex-entry[data-id]').forEach((el) => { el.onclick = () => { this.selected.codex = el.dataset.id; this.openCodex(cat); }; });
  }

  // ---------- Carte ----------
  openMap() {
    const body = this.open('map', 'Carte de l\'Île de Ré');
    const base = this.buildMap();
    const c = document.createElement('canvas');
    c.id = 'bigmap';
    c.width = base.width; c.height = base.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(base, 0, 0);
    const P = (x, z) => [(x - MAP.x0) * MAP.ppu, (z - MAP.z0) * MAP.ppu];
    const era = getEra(state.era);
    ctx.textAlign = 'center';
    for (const l of LOCATIONS) {
      const [x, y] = P(l.position[0], l.position[2]);
      const here = l.id === era.town;
      ctx.fillStyle = here ? '#ffd36a' : 'rgba(240,234,216,0.75)';
      ctx.beginPath(); ctx.arc(x, y, here ? 9 : 5, 0, Math.PI * 2); ctx.fill();
      if (here) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke(); }
      ctx.font = `${here ? 'bold 26px' : '20px'} 'Cormorant Garamond', serif`;
      ctx.fillStyle = '#10161c';
      ctx.fillText(l.name, x + 1, y - 13);
      ctx.fillStyle = here ? '#fff3c8' : '#f0ead8';
      ctx.fillText(l.name, x, y - 14);
    }
    for (const t of api.quests.targets()) {
      const q = resolveAt(t.at);
      if (!q) continue;
      const [x, y] = P(q.x, q.z);
      ctx.fillStyle = t.tracked ? '#ffd36a' : '#8fe0ff';
      ctx.beginPath(); ctx.moveTo(x, y - 9); ctx.lineTo(x + 7, y); ctx.lineTo(x, y + 9); ctx.lineTo(x - 7, y); ctx.closePath(); ctx.fill();
    }
    const pp = api.player.pos;
    const [px, py] = P(pp.x, pp.z);
    ctx.save(); ctx.translate(px, py); ctx.rotate(Math.PI - api.player.yaw);
    ctx.fillStyle = '#ff5a3a'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, -13); ctx.lineTo(9, 10); ctx.lineTo(0, 5); ctx.lineTo(-9, 10); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.restore();
    body.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'map-wrap';
    wrap.appendChild(c);
    body.appendChild(wrap);
    const lg = document.createElement('div');
    lg.className = 'legend';
    lg.innerHTML = `<span><i style="background:#ffd36a"></i>Ville de l'époque : ${era.townName}</span><span><i style="background:#8fe0ff"></i>Objectifs</span><span><i style="background:#ff5a3a"></i>Toi</span><span><i style="background:#c4d0cc"></i>Marais salants</span><span><i style="background:#7e6a42"></i>Vignes</span>`;
    body.appendChild(lg);
  }

  // ---------- Portail temporel ----------
  openEras() {
    const body = this.open('eras', 'L\'Astrolabe — portail temporel');
    let html = '<p style="margin-bottom:12px;color:#b9b2a0;font-style:italic">Chaque époque te mène dans une ville de l\'île. Choisis une destination.</p><div class="eras">';
    for (const e of ERAS) {
      const locked = !state.unlockedEras.includes(e.id);
      const frag = S.has('fragment-' + e.id);
      html += `<button class="era-card ${locked ? 'locked' : ''} ${state.era === e.id ? 'current' : ''}" data-id="${e.id}">
        <div class="ic">${e.icon}</div><h3>${e.name}</h3><div class="yr">${e.years}</div><div class="town">📍 ${e.townName}</div>
        <p>${locked ? 'Époque encore scellée. Retrouve d\'abord le fragment précédent.' : esc(e.blurb)}</p>
        ${frag ? '<div class="frag">✦ Fragment retrouvé</div>' : ''}</button>`;
    }
    html += '</div>';
    body.innerHTML = html;
    body.querySelectorAll('.era-card').forEach((b) => {
      b.onclick = () => {
        const id = b.dataset.id;
        if (!state.unlockedEras.includes(id)) { this.toast('Cette époque est encore scellée.', 'info'); return; }
        if (id === state.era) { this.close(); return; }
        this.close();
        api.travel(id);
      };
    });
  }

  // ---------- Boutique ----------
  openShop(id) {
    const shop = SHOPS[shopKey(state.era, id)];
    if (!shop) { this.toast('Fermé.', 'info'); return; }
    const body = this.open('shop', shop.name);
    const era = getEra(state.era);
    const render = () => {
      let html = '';
      if (shop.sign) html += `<img class="shop-sign" src="${signCanvas(shop.sign).toDataURL()}" alt="">`;
      if (shop.intro) html += `<p style="font-style:italic;color:#d8d0bc;margin-bottom:10px">${esc(shop.intro)}</p>`;
      html += `<div style="margin-bottom:8px;color:#d9b45f">Ta bourse : ${S.money()} ${era.currency}</div><div class="wares">`;
      shop.wares.forEach((w, k) => {
        const d = ITEMS[w.item];
        const owned = d.unique && S.has(w.item);
        html += `<div class="ware"><div class="ic">${d.icon ?? '•'}</div><div class="nm"><b>${esc(d.name)}</b><span>${esc(w.note ?? d.desc ?? '')}</span></div>
          <div class="pr">${w.price} ${era.currencyShort}</div><button class="btn" data-k="${k}" ${owned || S.money() < w.price ? 'disabled' : ''}>${owned ? 'Possédé' : 'Acheter'}</button></div>`;
      });
      html += '</div>';
      body.innerHTML = html;
      body.querySelectorAll('button[data-k]').forEach((b) => {
        b.onclick = () => {
          const w = shop.wares[Number(b.dataset.k)];
          if (spend(w.price)) {
            addItem(w.item, 1);
            api.audio?.sfx('coin');
            emit('shop:buy', { shop: id, item: w.item });
            api.quests.onPickup(w.item);
            render();
          }
        };
      });
    };
    render();
  }

  // ---------- Énigme ----------
  openRiddle(id, ctx = {}) {
    const r = typeof id === 'string' ? RIDDLES[id] : id;
    if (!r) return;
    const body = this.open('riddle', r.title ?? 'Énigme');
    let tries = 0;
    const html = `${r.doc ? `<div class="riddle-doc">${esc(r.doc)}</div>` : ''}<div class="riddle-q">${esc(r.q)}</div>
      <div class="riddle-opts">${r.options.map((o, k) => `<button data-k="${k}">${esc(o)}</button>`).join('')}</div>
      <div class="riddle-hint" id="riddle-hint"></div>`;
    body.innerHTML = html;
    if (hasSkill('erudit') && r.hint) $('#riddle-hint').textContent = `💡 ${r.hint}`;
    body.querySelectorAll('button[data-k]').forEach((b) => {
      b.onclick = () => {
        const k = Number(b.dataset.k);
        if (k === r.answer) {
          b.classList.add('good');
          api.audio?.sfx('success');
          setTimeout(() => {
            this.close();
            if (r.success) this.narration(r.success, r.title ?? 'Énigme résolue');
            if (r.codex) unlockCodex(r.codex);
            addXP('hist', r.xp ?? 30);
            ctx.onSolved?.();
            if (r.onSolved) import('../systems/actions.js').then((m) => m.act(r.onSolved, ctx));
          }, 600);
        } else {
          b.classList.add('bad');
          tries++;
          api.audio?.sfx('fail');
          if (r.hint && tries >= 1) $('#riddle-hint').textContent = `💡 ${r.hint}`;
          if (r.wrong?.[k]) $('#riddle-hint').textContent = r.wrong[k];
        }
      };
    });
  }

  // ---------- Affiche ----------
  openPoster(def) {
    const body = this.open('poster', def.name ?? 'Affiche');
    const url = posterCanvas(def).toDataURL();
    body.innerHTML = `<div class="poster-view"><img src="${url}" alt=""><div class="poster-text"><h3>${esc(def.name ?? def.title ?? '')}</h3>${esc(def.read ?? '').replace(/\n/g, '<br>')}</div></div>`;
  }

  // ---------- Fiche du personnage ----------
  openCharacter() {
    const body = this.open('character', 'Carnet de route');
    const le = levelOf(state.xp.expl), lh = levelOf(state.xp.hist);
    const bar = (xp, lvl) => { const lo = 100 * (lvl - 1) * lvl / 2, hi = nextLevelXP(xp); return Math.round(((xp - lo) / (hi - lo)) * 100); };
    let html = '<div class="cols"><div>';
    html += `<div class="stat"><div class="lbl"><span>Niveau d'exploration ${le}</span><span>${state.xp.expl} XP</span></div><div class="bar"><div style="width:${bar(state.xp.expl, le)}%"></div></div></div>`;
    html += `<div class="stat"><div class="lbl"><span>Niveau historique ${lh}</span><span>${state.xp.hist} XP</span></div><div class="bar"><div style="width:${bar(state.xp.hist, lh)}%;background:#b49ad8"></div></div></div>`;
    html += `<div class="inv-cat">Fragments du Temps : ${S.fragments()} / 7 · Anachronismes : ${S.anachronisms()} / 6</div>`;
    html += '<div class="inv-cat">Réputation locale</div>';
    for (const e of ERAS) {
      const v = state.reputation[e.town] ?? 0;
      html += `<div class="opt-row"><span>${e.icon} ${e.townName}</span><span style="color:#d9b45f">${repTitle(v)} (${v})</span></div>`;
    }
    html += `<div class="inv-cat">Voyage</div><div class="opt-row"><span>Distance parcourue</span><span>${(state.stats.distance / 1000).toFixed(1)} km</span></div>
      <div class="opt-row"><span>Animaux observés</span><span>${state.observed.length} / 7</span></div>
      <div class="opt-row"><span>Carnet</span><span>${state.codex.length} / ${Object.keys(CODEX).length}</span></div>`;
    html += '</div><div><div class="inv-cat">Compétences</div>';
    for (const s of SKILLS) {
      const ok = hasSkill(s.id);
      const need = s.need.expl ? `exploration niv. ${s.need.expl}` : `historique niv. ${s.need.hist}`;
      html += `<div class="skill ${ok ? 'on' : 'off'}"><b>${s.name}</b> — ${s.desc} <i style="color:#8a94a0">(${need})</i></div>`;
    }
    html += '</div></div>';
    body.innerHTML = html;
  }

  // ---------- Pause / options ----------
  openPause() {
    const body = this.open('pause', 'Pause');
    body.innerHTML = `<div class="menu" style="padding:10px 0 4px">
      <button id="p-resume" class="primary">Reprendre</button>
      <button id="p-save">Sauvegarder</button>
      <button id="p-load" ${hasSave() ? '' : 'disabled'}>Charger la sauvegarde</button>
      <button id="p-char">Carnet de route</button>
      <button id="p-opt">Options</button>
      <button id="p-help">Commandes</button>
      <button id="p-quit">Menu principal</button></div>`;
    $('#p-resume').onclick = () => this.close();
    $('#p-save').onclick = () => { api.player.pos && (state.player.x = api.player.pos.x); this.toast(save() ? 'Partie sauvegardée.' : 'Sauvegarde impossible.', 'info'); };
    $('#p-load').onclick = () => { if (load()) { this.close(); api.restore(); } };
    $('#p-char').onclick = () => this.openCharacter();
    $('#p-opt').onclick = () => this.openOptions();
    $('#p-help').onclick = () => this.openHelp();
    $('#p-quit').onclick = () => { this.close(); api.quitToTitle(); };
  }

  openOptions() {
    const body = this.open('options', 'Options');
    const o = state.options;
    body.innerHTML = `
      <div class="opt-row"><span>Volume général</span><input type="range" min="0" max="1" step="0.05" value="${o.volume}" id="o-vol"></div>
      <div class="opt-row"><span>Musique</span><input type="range" min="0" max="1" step="0.05" value="${o.music}" id="o-mus"></div>
      <div class="opt-row"><span>Sensibilité de la souris</span><input type="range" min="0.3" max="2.5" step="0.1" value="${o.sensitivity}" id="o-sens"></div>
      <div class="opt-row"><span>Inverser l'axe vertical</span><input type="checkbox" id="o-inv" ${o.invertY ? 'checked' : ''}></div>
      <div class="opt-row"><span>Qualité graphique</span><select id="o-q"><option value="high">Haute</option><option value="medium">Moyenne</option><option value="low">Basse</option></select></div>
      <div class="opt-row"><span>Faisceau d'objectif</span><input type="checkbox" id="o-beam" ${o.beam !== false ? 'checked' : ''}></div>`;
    $('#o-q').value = o.quality;
    $('#o-vol').oninput = (e) => { o.volume = Number(e.target.value); api.audio?.applyVolume(); };
    $('#o-mus').oninput = (e) => { o.music = Number(e.target.value); api.audio?.applyVolume(); };
    $('#o-sens').oninput = (e) => { o.sensitivity = Number(e.target.value); };
    $('#o-inv').onchange = (e) => { o.invertY = e.target.checked; };
    $('#o-beam').onchange = (e) => { o.beam = e.target.checked; };
    $('#o-q').onchange = (e) => { o.quality = e.target.value; api.applyQuality?.(); };
  }

  openHelp() {
    const body = this.open('help', 'Commandes');
    const rows = [
      ['ZQSD / WASD / flèches', 'se déplacer'], ['Maj', 'courir (endurance)'], ['Espace', 'sauter · continuer un dialogue'],
      ['Souris', 'regarder (clic pour capturer) · molette : zoom'], ['E', 'parler, ramasser, examiner, lire, commercer, embarquer'],
      ['1 à 4', 'choisir une réponse'], ['Tab', 'sac'], ['J', 'journal de quêtes'], ['C', "carnet de l'explorateur"],
      ['M', 'carte'], ['T', "portail temporel (l'Astrolabe)"], ['B', 'vélo (quand il existe)'], ['P', 'carnet de route'], ['Échap', 'pause · fermer'],
    ];
    body.innerHTML = rows.map(([k, v]) => `<div class="opt-row"><span><kbd>${k}</kbd></span><span>${v}</span></div>`).join('');
  }

  // ======================================================================
  //  EFFETS
  // ======================================================================
  // Générique de fin : défile puis rend la main pour une exploration libre
  credits() {
    const box = $('#credits'), roll = $('#credits-roll');
    const ending = state.flags.ending === 'gardien' ? 'Fin : « Le Gardien réconcilié »' : 'Fin : « L\'Homme en gris »';
    roll.innerHTML = `<h1>Les Fragments du Temps</h1><p><i>${ending}</i></p>
      <h2>L'Île de Ré, à travers sept époques</h2>
      <p>Néolithique · Gaule romaine · Moyen Âge · Grand Siècle · XIXᵉ siècle · Occupation · Aujourd'hui</p>
      <h2>Gardiennes et gardiens de l'Horloge</h2>
      <p>Maëla, la sage des Portes<br>Brennos, l'ancien des Santons<br>Frère Anselme, des Châteliers<br>Maître Ambroise, horloger à Saint-Martin<br>Jeanne Bouyer, saunière à Ars<br>Hélène Garnier, infirmière au Bois-Plage<br>Élise Fournier, archiviste</p>
      <h2>Ton voyage</h2>
      <p>Quêtes accomplies : ${Object.values(state.quests).filter((q) => q.status === 'done').length}<br>
      Entrées du carnet : ${state.codex.length}<br>Anachronismes retrouvés : ${S.anachronisms()} / 6<br>
      Distance parcourue : ${(state.stats.distance / 1000).toFixed(1)} km</p>
      <h2>Merci d'avoir joué</h2><p>Les sept époques te restent ouvertes.<br>L'île a encore mille histoires à raconter.</p>`;
    box.classList.remove('hidden');
    const H = innerHeight;
    let y = H;
    roll.style.top = `${y}px`;
    const t0 = performance.now();
    const step = () => {
      y = H - ((performance.now() - t0) / 1000) * 48;
      roll.style.top = `${y}px`;
      if (y + roll.offsetHeight > -40 && !this.skipCredits) requestAnimationFrame(step);
      else {
        box.classList.add('hidden');
        this.skipCredits = false;
        for (const e of ERAS) if (!state.unlockedEras.includes(e.id)) state.unlockedEras.push(e.id);
        this.toast('Exploration libre : toutes les époques sont ouvertes.', 'era');
        save();
      }
    };
    box.onclick = () => { this.skipCredits = true; };
    requestAnimationFrame(step);
  }

  flash() {
    const f = $('#photo-flash');
    f.classList.add('on');
    setTimeout(() => f.classList.remove('on'), 60);
  }
  eraFlash(on2) { $('#era-flash').classList.toggle('on', on2); }
  fade(on2) { $('#fade').classList.toggle('on', on2); }

  // ======================================================================
  //  CLAVIER
  // ======================================================================
  handleKeys() {
    if (api.cinematic.active) return;
    if (this.narr) {
      if (pressed('Space') || pressed('KeyE') || pressed('Escape') || pressed('Enter')) this.narrationClose();
      return;
    }
    if (api.dialogue.isOpen()) {
      if (this.dlg?.choices) {
        for (let k = 1; k <= 6; k++) if (pressed('Digit' + k) || pressed('Numpad' + k)) {
          const opts = this.dlg.choices;
          if (k <= opts.length) { const pk = this.dlg.pick; this.dlg = null; pk(k - 1); }
          return;
        }
      } else if (pressed('Space') || pressed('KeyE') || pressed('Enter')) this.dialogueAdvance();
      if (pressed('Escape')) api.dialogue.abort();
      return;
    }
    if (pressed('Escape')) { if (this.panel) this.close(); else this.openPause(); return; }
    const toggle = (kind, fn) => { if (this.panel === kind) this.close(); else fn(); };
    if (pressed('Tab')) toggle('inventory', () => this.openInventory());
    if (pressedChar('j')) toggle('journal', () => this.openJournal());
    if (pressedChar('c')) toggle('codex', () => this.openCodex());
    if (pressedChar('m')) toggle('map', () => this.openMap());
    if (pressedChar('t')) toggle('eras', () => this.openEras());
    if (pressedChar('p')) toggle('character', () => this.openCharacter());
    if (pressedChar('h')) toggle('help', () => this.openHelp());
    if (!this.panel && pressedChar('b')) api.player.toggleBike();
  }
}

export { NPCS, HALF_L };
