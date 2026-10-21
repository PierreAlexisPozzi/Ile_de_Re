// Point d'entrée : moteur de rendu, systèmes, voyage dans le temps, boucle
// de jeu, écran titre, sauvegarde.

import * as THREE from 'three';
import { state, S, save, load, hasSave, resetState } from './core/state.js';
import { on, emit } from './core/events.js';
import { initInput, endFrame, releasePointer } from './core/input.js';
import { World } from './world/world.js';
import { heightAt } from './world/terrain.js';
import { LOCATION } from './world/locations.js';
import { Player } from './player.js';
import { NPCManager } from './npc/npcs.js';
import { QuestManager } from './systems/quests.js';
import { DialogueRunner } from './systems/dialogue.js';
import { QuestWorld } from './systems/questWorld.js';
import { Interaction } from './systems/interaction.js';
import { DayNight } from './systems/dayNight.js';
import { AudioManager } from './systems/audio.js';
import { Cinematic } from './systems/cinematic.js';
import { UI } from './ui/ui.js';
import { api } from './systems/api.js';
import { loadFonts } from './gfx/signs.js';
import { getEra } from './story/eras.js';
import { ERA_HOOKS } from './story/registry.js';
import { look } from './characters/wardrobe.js';
import './story/index.js';

const $ = (s) => document.querySelector(s);

// ---------- Rendu ----------
const canvas = $('#game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 1600);

function applyQuality() {
  const q = state.options.quality;
  renderer.setPixelRatio(Math.min(devicePixelRatio, q === 'high' ? 2 : q === 'medium' ? 1.25 : 0.85));
  renderer.shadowMap.enabled = q !== 'low';
  if (dayNight) {
    dayNight.sun.castShadow = q !== 'low';
    const s = q === 'high' ? 2048 : 1024;
    if (dayNight.sun.shadow.mapSize.x !== s) {
      dayNight.sun.shadow.mapSize.set(s, s);
      dayNight.sun.shadow.map?.dispose();
      dayNight.sun.shadow.map = null;
    }
  }
}
function resize() {
  renderer.setSize(innerWidth, innerHeight);
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);
resize();

// ---------- Systèmes ----------
const world = new World(scene);
const player = new Player(scene, camera);
const npcs = new NPCManager(scene);
const quests = new QuestManager();
const dialogue = new DialogueRunner();
const questWorld = new QuestWorld(scene);
const interaction = new Interaction();
let dayNight = null;
const audio = new AudioManager();
const cinematic = new Cinematic(camera);
const ui = new UI();
Object.assign(api, { world, player, npcs, quests, dialogue, questWorld, ui, audio, cinematic, camera, scene, renderer });
api.applyQuality = applyQuality;
api.on = on;
initInput(canvas);

on('quests', () => { questWorld.refresh(); npcs.sync(state.era); });
on('flags', () => npcs.sync(state.era));
on('hour', (h) => {
  const inTown = Math.hypot(player.pos.x - world.townCenter.x, player.pos.z - world.townCenter.z) < 80;
  if (inTown && ['moyenage', 'xvii', 'xix', 'wwii'].includes(state.era) && h >= 7 && h <= 21) audio.bell(h % 12 === 0 ? 3 : 1);
});

// ---------- Voyage dans le temps ----------
let traveling = false;
async function travel(eraId, opts = {}) {
  if (traveling && !opts.force) return;
  traveling = true;
  const silent = !!opts.silent;
  if (!silent) {
    releasePointer();
    ui.eraFlash(true);
    audio.sfx('portal');
    await new Promise((r) => setTimeout(r, 750));
  }
  if (dialogue.isOpen()) dialogue.abort();
  player.dismount(true);
  state.era = eraId;
  const era = getEra(eraId);
  if (!state.visited.includes(eraId)) state.visited.push(eraId);
  world.loadEra(eraId, state.flags);
  npcs.load(eraId);
  questWorld.clear();
  audio.setEra(eraId);
  audio.clearSpatial();
  for (const l of world.lights) audio.addSpatial('fire', l.light.position);
  for (const s of Object.values(world.spots)) if (s.sound) audio.addSpatial(s.sound, { x: s.x, y: heightAt(s.x, s.z) + 1, z: s.z });
  if (!opts.keepPos) {
    const sp = world.spawn;
    player.teleport(sp.x, sp.z, sp.rot ?? Math.PI);
  }
  ui.mapEra = null;
  quests.checkAuto();
  if (state.tracked && quests.def(state.tracked)?.era !== eraId) quests.trackBest();
  ERA_HOOKS[eraId]?.onEnter?.(api);
  questWorld.refresh();
  emit('era', eraId);
  if (!silent) {
    setTimeout(() => ui.eraFlash(false), 150);
    if (!opts.noCine) cinematic.arrival(eraId, () => emit('arrived', eraId));
    else emit('arrived', eraId);
    ui.toast(`${era.icon} ${era.name} — ${era.townName}`, 'era');
  }
  traveling = false;
}
api.travel = travel;

function restore() {
  player.setAvatar(state.avatar);
  const p = { ...state.player };
  travel(state.era, { silent: true, keepPos: true, force: true }).then(() => {
    player.teleport(p.x, p.z, p.yaw);
    state.player.stamina = p.stamina ?? 100;
    ui.toast('Partie chargée.', 'info');
  });
}
api.restore = restore;

let started = false;
function quitToTitle() {
  started = false;
  ui.showHUD(false);
  $('#title').classList.remove('hidden');
  $('#btn-continue').classList.toggle('hidden', !hasSave());
  $('#title-menu').classList.remove('hidden');
  $('#avatar-pick').classList.add('hidden');
  releasePointer();
}
api.quitToTitle = quitToTitle;

// ---------- Écran titre ----------
function setupTitle() {
  $('#btn-continue').classList.toggle('hidden', !hasSave());
  $('#btn-new').onclick = () => {
    audio.init(); audio.resume();
    $('#title-menu').classList.add('hidden');
    $('#avatar-pick').classList.remove('hidden');
    document.querySelectorAll('.avatar').forEach((b) => {
      const id = b.dataset.avatar;
      b.querySelector('img').src = ui.portraits.get('title:' + id, look('player', id));
      b.onclick = () => newGame(id);
    });
  };
  $('#btn-back').onclick = () => { $('#title-menu').classList.remove('hidden'); $('#avatar-pick').classList.add('hidden'); };
  $('#btn-continue').onclick = () => {
    audio.init(); audio.resume();
    if (!load()) { ui.toast('Sauvegarde illisible.', 'info'); return; }
    $('#title').classList.add('hidden');
    started = true;
    ui.showHUD(true);
    applyQuality();
    audio.applyVolume();
    restore();
  };
  $('#btn-help').onclick = () => { $('#title').classList.add('hidden'); ui.openHelp(); ui.onPanelClose = () => $('#title').classList.remove('hidden'); };
}

async function newGame(avatar) {
  resetState(avatar);
  player.setAvatar(avatar);
  $('#title').classList.add('hidden');
  started = true;
  applyQuality();
  await travel('contemporaine', { silent: true, force: true });
  cinematic.play('intro', () => {
    ui.showHUD(true);
    quests.start('pro.m1');
    dialogue.start('pro.opening');
  });
}

// ---------- Boucle ----------
let last = performance.now();
let saveT = 0;
let titleT = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (!dayNight) { renderer.render(scene, camera); endFrame(); return; }

  if (started) {
    if (cinematic.active) cinematic.update(dt);
    else player.update(dt);
    const p = player.pos;
    dayNight.update(dt, p);
    world.night = dayNight.night;
    world.update(dt, t, state.time, camera);
    world.fauna.playerPos.copy(p);
    world.fauna.playerSpeed = player.speed;
    npcs.update(dt, { player: p, hour: state.time, camera, playerSpeed: player.speed, onBike: player.mode === 'bike' });
    if (!cinematic.active) {
      quests.tick(p);
      interaction.update();
      ui.handleKeys();
    }
    questWorld.update(dt, t, p);
    ui.update(dt);
    const inTown = Math.hypot(p.x - world.townCenter.x, p.z - world.townCenter.z) < 60;
    audio.update(dt, camera, { inTown, night: dayNight.isNight() });
    ERA_HOOKS[state.era]?.onUpdate?.(api, dt);
    state.stats.playTime += dt;
    saveT += dt;
    if (saveT > 90 && !cinematic.active && !dialogue.isOpen()) { saveT = 0; save(); }
  } else {
    // fond animé de l'écran titre : lent travelling autour du phare
    titleT += dt;
    const c = world.townCenter;
    const a = titleT * 0.05 + 2.2;
    const h = heightAt(c.x, c.z);
    camera.position.set(c.x + Math.sin(a) * 70, h + 26, c.z + Math.cos(a) * 70);
    camera.lookAt(c.x, h + 16, c.z);
    dayNight.update(0, { x: c.x, z: c.z });
    world.night = dayNight.night;
    world.update(dt, t, state.time, camera);
  }
  if (!window.__dev.noRender) renderer.render(scene, camera);
  endFrame();
}

// ---------- Chargement ----------
async function boot() {
  const bar = $('#loading-bar'), hint = $('#loading-hint');
  const step = async (label, k, fn) => {
    hint.textContent = label;
    bar.style.width = `${k}%`;
    await new Promise((r) => setTimeout(r, 30));
    await fn();
  };
  await step('Chargement des polices d\'époque…', 10, () => loadFonts());
  await step("Relevé de la côte et des marais…", 30, () => world.build());
  await step('Allumage du phare…', 55, () => { dayNight = new DayNight(scene, world); api.dayNight = dayNight; applyQuality(); });
  await step('Les habitants se réveillent…', 80, () => travel('contemporaine', { silent: true, force: true }));
  await step('Réglage de l\'Astrolabe…', 100, () => {});
  state.time = 19.2;
  $('#loading').classList.add('hidden');
  $('#title').classList.remove('hidden');
  setupTitle();
}

// ---------- Outils de test (utilisés par les tests automatisés) ----------
window.__dev = {
  api, state, S, travel, save, load,
  newGame, quests, get started() { return started; },
  unlockAll() { for (const e of ['prehistoire', 'antiquite', 'moyenage', 'xvii', 'xix', 'wwii', 'contemporaine']) if (!state.unlockedEras.includes(e)) state.unlockedEras.push(e); },
  teleport(x, z) { player.teleport(x, z); },
  stats: () => ({ ...world.stats, calls: renderer.info.render.calls, tris: renderer.info.render.triangles }),
  bot: () => import('./dev/bot.js'),
};
api.interaction = interaction;

requestAnimationFrame(loop);
boot().catch((e) => { console.error(e); $('#loading-hint').textContent = 'Erreur de chargement : ' + e.message; });
