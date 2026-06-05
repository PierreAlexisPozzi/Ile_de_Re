// Point d'entrée du jeu : initialisation Three.js, boucle de jeu, glue
// entre tous les systèmes.

import * as THREE from 'three';
import { state, save, load, reset } from './state.js';
import { ERAS, getEra } from './eras.js';
import { LOCATIONS, nearestLocation } from './locations.js';
import { World, heightAt } from './world.js';
import { Player } from './player.js';
import { DayNight } from './dayNight.js';
import { NPCManager } from './npcs.js';
import { questSystem, QUESTS, ITEMS } from './quests.js';
import { addItem, hasItem } from './inventory.js';
import { initInput, keys, justPressed } from './input.js';
import { AudioManager } from './audio.js';
import {
  updateHUD, setObjective, showInteractHint, hideInteractHint,
  showToast, openDialogue, closeDialogue, isDialogueOpen,
  openInventory, openQuestJournal, openMap, openEraPanel,
  closeAllPanels, isAnyPanelOpen, drawMinimap, eraFlash,
} from './ui.js';

// ---------- Three.js setup ----------
const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  62, window.innerWidth / window.innerHeight, 0.1, 600
);

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---------- Systèmes ----------
const world = new World(scene);
const player = new Player(scene, camera);
const dayNight = new DayNight(scene, world);
const npcs = new NPCManager(scene);
const audio = new AudioManager();

initInput(canvas);

// Fragments du temps : un par époque, placés près de lieux pertinents
const FRAGMENT_LOCATIONS = {
  contemporaine: { id: 'fragment-1', loc: 'phare-baleines', offset: [4, 0, 4] },
  prehistoire:   { id: 'fragment-2', loc: 'lilleau',        offset: [-3, 0, 5] },
  antiquite:     { id: 'fragment-3', loc: 'flotte',         offset: [0, 0, -7] },
  moyenage:      { id: 'fragment-4', loc: 'ars',            offset: [3, 0, -3] },
  xvii:          { id: 'fragment-5', loc: 'saint-martin',   offset: [5, 0, 5] },
  xix:           { id: 'fragment-6', loc: 'bois-plage',     offset: [-4, 0, 3] },
  wwii:          { id: 'fragment-7', loc: 'sainte-marie',   offset: [0, 0, 6] },
};

// Group qui contient le fragment courant
const fragmentGroup = new THREE.Group();
scene.add(fragmentGroup);

function spawnFragment(eraId) {
  while (fragmentGroup.children.length) {
    const c = fragmentGroup.children.pop();
    c.geometry?.dispose?.();
    c.material?.dispose?.();
  }
  const def = FRAGMENT_LOCATIONS[eraId];
  if (!def) return;
  if (hasItem(def.id)) return;
  const loc = LOCATIONS.find((l) => l.id === def.loc);
  const [ox, , oz] = def.offset;
  const x = loc.position[0] + ox;
  const z = loc.position[2] + oz;
  const y = heightAt(x, z) + 1.5;
  const geo = new THREE.OctahedronGeometry(0.5, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xfff0a8,
    emissive: 0xd4a857,
    emissiveIntensity: 0.8,
    metalness: 0.6,
    roughness: 0.2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.userData = { fragmentId: def.id };
  fragmentGroup.add(mesh);

  // Halo
  const halo = new THREE.PointLight(0xd4a857, 1.5, 10);
  halo.position.copy(mesh.position);
  fragmentGroup.add(halo);
}

// ---------- Boucle de jeu ----------
let lastTime = performance.now();
let currentLocation = null;
let started = false;

function gameLoop(t) {
  requestAnimationFrame(gameLoop);
  const dt = Math.min(0.05, (t - lastTime) / 1000);
  lastTime = t;
  if (!started) return;

  // Mises à jour
  if (!isAnyPanelOpen()) {
    player.update(dt);
  }
  dayNight.update(dt);
  world.update(dt, t / 1000);
  npcs.update(dt, t / 1000, player.position);

  // Animation des fragments
  for (const mesh of fragmentGroup.children) {
    if (mesh.userData.fragmentId) {
      mesh.rotation.y += dt * 1.4;
      mesh.position.y += Math.sin(t * 0.003) * 0.005;
    }
  }

  // Lieu courant
  const nearest = nearestLocation(player.position.x, player.position.z, 40);
  if (nearest !== currentLocation) {
    currentLocation = nearest;
    if (currentLocation && !state.visitedLocations.has(currentLocation.id)) {
      state.visitedLocations.add(currentLocation.id);
      showToast(`Lieu découvert : ${currentLocation.name}`, 'quest');
    }
  }

  // Interactions
  handleInteractions();

  // Inputs (panneaux)
  handlePanelInputs();

  // HUD
  updateHUD(dayNight, currentLocation);
  drawMinimap(player.position, player.yaw);

  // Mouettes ponctuelles
  if (Math.random() < 0.0008) audio.sfx('gull');

  renderer.render(scene, camera);
}

function handleInteractions() {
  if (isAnyPanelOpen()) { hideInteractHint(); return; }

  // PNJ proche
  const npc = npcs.nearest(player.position, 3.0);
  if (npc) {
    showInteractHint(`Parler à ${npc.userData.def.name}`);
    if (justPressed('KeyE')) {
      audio.sfx('click');
      openDialogue(npc.userData.def, (kind, data) => {
        if (kind === 'quest') {
          questSystem.start(data);
        }
      });
    }
    return;
  }

  // Fragment proche
  for (const mesh of fragmentGroup.children) {
    if (!mesh.userData.fragmentId) continue;
    const dx = mesh.position.x - player.position.x;
    const dz = mesh.position.z - player.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 2.5) {
      showInteractHint('Récupérer le fragment');
      if (justPressed('KeyE')) {
        addItem(mesh.userData.fragmentId);
        audio.sfx('pickup');
        state.player.fragmentsCollected++;
        questSystem.progressMain();
        // Première fois -> auto-démarrer
        if (!state.quests['q-main-fragments']) {
          questSystem.start('q-main-fragments');
        }
        // Retire le fragment
        while (fragmentGroup.children.length) {
          fragmentGroup.children.pop();
        }
        if (state.player.fragmentsCollected >= 7) {
          showToast('Tu as réuni les 7 fragments !', 'era');
          setObjective('Retourne au Phare des Baleines pour terminer ton voyage.');
        } else {
          setObjective("Voyage vers une époque débloquée pour trouver le prochain fragment (T).");
        }
      }
      return;
    }
  }

  hideInteractHint();
}

function handlePanelInputs() {
  if (justPressed('Escape')) {
    if (isAnyPanelOpen()) closeAllPanels();
    else document.getElementById('panel-pause').classList.remove('hidden');
    return;
  }
  if (isDialogueOpen()) return;
  if (justPressed('Tab')) {
    if (document.getElementById('panel-inventory').classList.contains('hidden')) openInventory();
    else closeAllPanels();
  }
  if (justPressed('KeyJ')) {
    if (document.getElementById('panel-quests').classList.contains('hidden')) openQuestJournal();
    else closeAllPanels();
  }
  if (justPressed('KeyM')) {
    if (document.getElementById('panel-map').classList.contains('hidden')) openMap(player.position);
    else closeAllPanels();
  }
  if (justPressed('KeyT')) {
    if (document.getElementById('panel-era').classList.contains('hidden')) {
      openEraPanel((eraId) => travelTo(eraId));
    } else closeAllPanels();
  }
  if (justPressed('KeyB')) {
    if (!player.swimming) player.toggleBike();
  }
}

function travelTo(eraId) {
  closeAllPanels();
  state.era = eraId;
  eraFlash();
  audio.sfx('portal');
  setTimeout(() => {
    world.loadEra(eraId);
    npcs.loadEra(eraId, LOCATIONS);
    spawnFragment(eraId);
    audio.playAmbient(eraId);
    showToast(`Tu voyages : ${getEra(eraId).name}`, 'era');
    updateObjectiveForEra(eraId);
  }, 200);
}

function updateObjectiveForEra(eraId) {
  if (state.player.fragmentsCollected >= 7) {
    setObjective('Retourne au Phare des Baleines.');
    return;
  }
  const def = FRAGMENT_LOCATIONS[eraId];
  if (def && !hasItem(def.id)) {
    const loc = LOCATIONS.find((l) => l.id === def.loc);
    setObjective(`Trouve le fragment près de : ${loc.name}.`);
  } else {
    setObjective("Explore. Parle aux habitants. Ouvre le portail (T).");
  }
}

// ---------- Boot ----------
function setupTitleScreen() {
  document.getElementById('btn-start').addEventListener('click', () => {
    document.getElementById('title-screen').classList.add('hidden');
    document.getElementById('hud').classList.remove('hidden');
    audio.init();
    audio.resume();
    started = true;
    canvas.requestPointerLock?.();
    travelTo('contemporaine');
  });

  // Pause panel buttons
  document.getElementById('resume').onclick = () => {
    closeAllPanels();
    canvas.requestPointerLock?.();
  };
  document.getElementById('save').onclick = () => {
    if (save()) showToast('Partie sauvegardée.', 'quest');
    else showToast('Échec de la sauvegarde.', 'item');
  };
  document.getElementById('load').onclick = () => {
    if (load()) {
      showToast('Partie chargée.', 'quest');
      player.teleportTo(state.player.position[0], state.player.position[2]);
      travelTo(state.era);
    } else {
      showToast('Aucune sauvegarde trouvée.', 'item');
    }
    closeAllPanels();
  };
  document.getElementById('quit').onclick = () => {
    reset();
    started = false;
    closeAllPanels();
    document.getElementById('hud').classList.add('hidden');
    document.getElementById('title-screen').classList.remove('hidden');
  };
}

async function preload() {
  const bar = document.getElementById('loadingBar');
  const hint = document.getElementById('loadingHint');
  const steps = [
    ['Cartographie de l\'île…', () => world.build()],
    ['Génération du terrain…', () => {}],
    ['Réveil de l\'océan…', () => {}],
    ['Plantation des pinèdes…', () => world.loadEra('contemporaine')],
    ['Convocation des habitants…', () => npcs.loadEra('contemporaine', LOCATIONS)],
    ['Calibrage du portail temporel…', () => {}],
  ];
  for (let i = 0; i < steps.length; i++) {
    hint.textContent = steps[i][0];
    bar.style.width = `${((i + 1) / steps.length) * 100}%`;
    await new Promise((r) => setTimeout(r, 200));
    try { steps[i][1](); } catch (e) { console.error(e); }
  }
  document.getElementById('loading').classList.add('hidden');
  document.getElementById('title-screen').classList.remove('hidden');
}

setupTitleScreen();
preload();

// Lance la boucle (même avant l'écran titre, pour le rendu de fond)
requestAnimationFrame(gameLoop);
