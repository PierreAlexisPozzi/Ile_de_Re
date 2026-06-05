// HUD, panneaux, dialogue, carte.

import { state, save, load, reset } from './state.js';
import { ERAS, getEra } from './eras.js';
import { LOCATIONS } from './locations.js';
import { QUESTS, ITEMS } from './quests.js';

const $ = (s) => document.querySelector(s);

export function showToast(text, kind = '') {
  const el = document.createElement('div');
  el.className = `toast ${kind}`;
  el.textContent = text;
  $('#toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

export function setObjective(text) {
  $('#objective-text').textContent = text;
}

export function updateHUD(dayNight, currentLocation) {
  $('#era-name').textContent = getEra(state.era).name;
  $('#location-name').textContent = currentLocation?.name || '—';
  $('#clock').textContent = dayNight.getClock();
  const weatherNames = { clear: 'Clair', cloudy: 'Nuageux', fog: 'Brume marine', rain: 'Pluie' };
  $('#weather').textContent = weatherNames[state.weather] || 'Clair';
}

export function showInteractHint(label) {
  $('#interact-hint').classList.remove('hidden');
  $('#interact-label').textContent = label;
}
export function hideInteractHint() {
  $('#interact-hint').classList.add('hidden');
}

// Dialogue
let dialogueOpen = false;
let dialogueLine = 0;
let dialogueDef = null;
let dialogueCallback = null;

export function isDialogueOpen() { return dialogueOpen; }

export function openDialogue(npcDef, onClose) {
  dialogueDef = npcDef;
  dialogueLine = 0;
  dialogueCallback = onClose;
  dialogueOpen = true;
  $('#npc-portrait').textContent = npcDef.portrait || '?';
  $('#npc-name').textContent = npcDef.name;
  $('#panel-dialogue').classList.remove('hidden');
  renderDialogue();
}

function renderDialogue() {
  $('#npc-line').textContent = dialogueDef.dialogue[dialogueLine];
  const choices = $('#npc-choices');
  choices.innerHTML = '';
  const last = dialogueLine >= dialogueDef.dialogue.length - 1;
  if (!last) {
    const btn = document.createElement('button');
    btn.textContent = '› Continuer';
    btn.onclick = () => { dialogueLine++; renderDialogue(); };
    choices.appendChild(btn);
  }
  if (dialogueDef.questId && !state.quests[dialogueDef.questId]) {
    const btn = document.createElement('button');
    btn.textContent = '⚐ Accepter la quête';
    btn.onclick = () => {
      closeDialogue();
      dialogueCallback?.('quest', dialogueDef.questId);
    };
    choices.appendChild(btn);
  }
  const close = document.createElement('button');
  close.textContent = '✕ Fermer';
  close.onclick = closeDialogue;
  choices.appendChild(close);
}

export function closeDialogue() {
  dialogueOpen = false;
  $('#panel-dialogue').classList.add('hidden');
}

// Inventaire
let invSelected = null;
export function openInventory() {
  const grid = $('#inv-grid');
  grid.innerHTML = '';
  const slots = 24;
  for (let i = 0; i < slots; i++) {
    const slot = document.createElement('div');
    slot.className = 'inv-slot';
    const item = state.inventory[i];
    if (item) {
      const def = ITEMS[item.id];
      slot.textContent = def?.icon || '?';
      slot.title = def?.name || '';
      slot.onclick = () => {
        invSelected = item.id;
        document.querySelectorAll('.inv-slot.selected').forEach((s) => s.classList.remove('selected'));
        slot.classList.add('selected');
        const d = ITEMS[item.id];
        $('#inv-desc').innerHTML =
          `<strong>${d.name}</strong> ×${item.qty}<br>${d.description}`;
      };
    } else {
      slot.classList.add('empty');
      slot.textContent = '·';
    }
    grid.appendChild(slot);
  }
  if (state.inventory.length === 0) {
    $('#inv-desc').textContent = 'Inventaire vide. Explore et accepte des quêtes.';
  } else {
    $('#inv-desc').textContent = 'Sélectionne un objet pour voir sa description.';
  }
  $('#panel-inventory').classList.remove('hidden');
}

// Quêtes
export function openQuestJournal() {
  const list = $('#quest-list');
  list.innerHTML = '';
  const active = [], done = [];
  for (const id in state.quests) {
    const q = QUESTS[id];
    if (!q) continue;
    (state.quests[id].done ? done : active).push(id);
  }
  if (active.length === 0 && done.length === 0) {
    list.innerHTML = '<p>Aucune quête. Parle aux habitants pour en obtenir.</p>';
  }
  for (const id of [...active, ...done]) {
    const q = QUESTS[id];
    const s = state.quests[id];
    const div = document.createElement('div');
    div.className = `quest-item ${q.main ? 'main' : ''} ${s.done ? 'done' : ''}`;
    div.innerHTML = `
      <div class="era-tag">${getEra(q.era).icon} ${getEra(q.era).name}${q.main ? ' · PRINCIPALE' : ''}</div>
      <h3>${q.title}</h3>
      <div class="step">${s.done ? '✓ Accomplie' : q.steps[s.step] || '—'}</div>
    `;
    list.appendChild(div);
  }
  $('#panel-quests').classList.remove('hidden');
}

// Carte plein écran
export function openMap(playerPos) {
  const canvas = $('#bigmap');
  const ctx = canvas.getContext('2d');
  drawMap(ctx, canvas.width, canvas.height, playerPos, true);
  $('#panel-map').classList.remove('hidden');
}

// Mini-carte
export function drawMinimap(playerPos, yaw) {
  const canvas = $('#minimap');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);

  // Fond
  ctx.fillStyle = '#0a1828';
  ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2, 0, Math.PI * 2); ctx.fill();

  // Île approximative
  ctx.save();
  ctx.beginPath(); ctx.arc(W / 2, H / 2, W / 2 - 2, 0, Math.PI * 2); ctx.clip();
  const scale = 0.32;
  const cx = W / 2 - playerPos.x * scale;
  const cy = H / 2 - playerPos.z * scale;
  ctx.fillStyle = '#3a4a2a';
  ctx.beginPath();
  ctx.ellipse(cx, cy, 200 * scale, 65 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  // Lieux
  for (const loc of LOCATIONS) {
    const x = cx + loc.position[0] * scale;
    const y = cy + loc.position[2] * scale;
    ctx.fillStyle = '#d4a857';
    ctx.beginPath(); ctx.arc(x, y, 2.5, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();

  // Indicateur joueur (flèche pointant dans la direction du regard)
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-yaw);
  ctx.fillStyle = '#5fa86c';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(5, 5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  // Nord
  ctx.fillStyle = '#d4a857';
  ctx.font = '11px serif';
  ctx.textAlign = 'center';
  ctx.fillText('N', W / 2, 14);
}

function drawMap(ctx, W, H, playerPos, withLabels) {
  ctx.fillStyle = '#0a1420';
  ctx.fillRect(0, 0, W, H);

  // Océan
  ctx.fillStyle = '#1a3a58';
  ctx.fillRect(0, 0, W, H);

  // Île
  const cx = W / 2, cy = H / 2;
  const scaleX = (W - 60) / 360;
  const scaleY = (H - 60) / 160;
  ctx.fillStyle = '#3a4a2a';
  ctx.strokeStyle = '#d8c598';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, 180 * scaleX, 60 * scaleY, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  // Étranglement
  ctx.fillStyle = '#1a3a58';
  ctx.beginPath();
  ctx.ellipse(cx + (-40) * scaleX, cy, 18 * scaleX, 35 * scaleY, 0, 0, Math.PI * 2);
  ctx.fill();

  // Marais salants
  ctx.fillStyle = 'rgba(184,200,192,0.4)';
  ctx.fillRect(cx + (-160) * scaleX, cy + (-50) * scaleY, 80 * scaleX, 30 * scaleY);

  // Lieux
  for (const loc of LOCATIONS) {
    const x = cx + loc.position[0] * scaleX;
    const y = cy + loc.position[2] * scaleY;
    const hasActiveQuest = Object.keys(state.quests).some((qid) => {
      const q = QUESTS[qid];
      return q && !state.quests[qid].done &&
        require_npc_loc(qid, loc.id);
    });
    ctx.fillStyle = hasActiveQuest ? '#b478d4' : '#d4a857';
    ctx.beginPath();
    ctx.arc(x, y, 6, 0, Math.PI * 2);
    ctx.fill();
    if (withLabels) {
      ctx.fillStyle = '#e8e4d8';
      ctx.font = '12px serif';
      ctx.textAlign = 'center';
      ctx.fillText(loc.name, x, y - 10);
    }
  }

  // Joueur
  const px = cx + playerPos.x * scaleX;
  const py = cy + playerPos.z * scaleY;
  ctx.fillStyle = '#5fa86c';
  ctx.beginPath();
  ctx.arc(px, py, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function require_npc_loc(qid, locId) {
  // Heuristique : on suppose qu'une quête est "à" un lieu si son ID le mentionne
  // ou si on l'a démarrée auprès d'un PNJ qui s'y trouve. Pour ce prototype,
  // toujours afficher les lieux pertinents comme actifs.
  return true;
}

// Portail temporel
export function openEraPanel(onSelect) {
  const grid = $('#era-grid');
  grid.innerHTML = '';
  for (const era of ERAS) {
    const card = document.createElement('div');
    card.className = 'era-card';
    if (!state.unlockedEras.has(era.id)) card.classList.add('locked');
    if (state.era === era.id) card.classList.add('current');
    card.innerHTML = `
      <div class="name">${era.icon} ${era.name}</div>
      <div class="years">${era.years}</div>
      <div class="blurb">${era.blurb}</div>
    `;
    card.onclick = () => {
      if (!state.unlockedEras.has(era.id)) {
        showToast('Cette époque n\'est pas encore accessible.', 'era');
        return;
      }
      if (state.era === era.id) return;
      onSelect(era.id);
    };
    grid.appendChild(card);
  }
  $('#panel-era').classList.remove('hidden');
}

export function closeAllPanels() {
  document.querySelectorAll('.panel').forEach((p) => p.classList.add('hidden'));
  dialogueOpen = false;
}

export function isAnyPanelOpen() {
  return [...document.querySelectorAll('.panel')].some(
    (p) => !p.classList.contains('hidden')
  );
}

// Effet de flash lors d'un changement d'époque
export function eraFlash() {
  const el = $('#era-flash');
  el.classList.add('active');
  setTimeout(() => el.classList.remove('active'), 600);
}

// Boutons close génériques
document.addEventListener('click', (e) => {
  if (e.target.matches('[data-close]')) {
    e.target.closest('.panel').classList.add('hidden');
  }
});
