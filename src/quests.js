// Système de quêtes. La quête principale "Les Fragments du Temps"
// débloque progressivement les époques. Chaque époque a une ou deux
// quêtes secondaires.

import { state, unlockEra, addXP } from './state.js';
import { showToast } from './ui.js';

export const QUESTS = {
  // Quête principale
  'q-main-fragments': {
    title: 'Les Fragments du Temps',
    main: true,
    era: 'contemporaine',
    steps: [
      "Parle à Élise, la guide, au Phare des Baleines.",
      "Récupère le 1er fragment près du phare.",
      "Voyage en Préhistoire et trouve le 2ᵉ fragment.",
      "Voyage en Antiquité romaine et trouve le 3ᵉ fragment.",
      "Voyage au Moyen Âge et trouve le 4ᵉ fragment.",
      "Voyage au XVIIᵉ siècle et trouve le 5ᵉ fragment.",
      "Voyage au XIXᵉ siècle et trouve le 6ᵉ fragment.",
      "Voyage à la WWII et trouve le 7ᵉ fragment.",
      "Reviens au Phare des Baleines réunir les fragments.",
    ],
    reward: { xpHistorical: 500 },
  },

  // Quêtes secondaires
  'q-prehistoire-chasse': {
    title: 'La chasse au cerf',
    era: 'prehistoire',
    steps: [
      "Trouve 3 silex près des dunes.",
      "Rapporte-les à Orven.",
    ],
    reward: { xpExploration: 80, item: 'silex-poli' },
  },
  'q-antiquite-amphores': {
    title: 'Les amphores perdues',
    era: 'antiquite',
    steps: [
      "Retrouve 3 amphores dans la forêt près de La Flotte.",
      "Reviens voir Lucius.",
    ],
    reward: { xpHistorical: 100, item: 'piece-romaine' },
  },
  'q-moyenage-manuscrit': {
    title: 'Le manuscrit volé',
    era: 'moyenage',
    steps: [
      "Cherche le manuscrit aux abords de l'abbaye des Châteliers.",
      "Rapporte-le à frère Anselme.",
    ],
    reward: { xpHistorical: 120, item: 'manuscrit-medieval' },
  },
  'q-xvii-plans': {
    title: 'Les plans de Vauban',
    era: 'xvii',
    steps: [
      "Récupère les plans dans les bastions de Saint-Martin.",
      "Rapporte-les à Vauban.",
    ],
    reward: { xpHistorical: 150, item: 'plans-vauban' },
  },
  'q-xix-baleinier': {
    title: 'Le départ du baleinier',
    era: 'xix',
    steps: [
      "Trouve la boussole d'argent du capitaine.",
      "Rapporte-la au port de Saint-Martin.",
    ],
    reward: { xpHistorical: 130, item: 'boussole-argent' },
  },
  'q-wwii-messages': {
    title: 'Messages de la Résistance',
    era: 'wwii',
    steps: [
      "Porte le message codé à Hélène à Saint-Martin.",
      "Reviens en faire rapport à Léon.",
    ],
    reward: { xpHistorical: 180, item: 'carnet-resistance' },
  },
  'q-contemp-anomalie': {
    title: "Anomalie au port",
    era: 'contemporaine',
    steps: [
      "Trouve la source des bruits étranges au port de Saint-Martin.",
      "Reviens parler à Paul.",
    ],
    reward: { xpExploration: 100 },
  },
};

export const ITEMS = {
  'fragment-1': { name: 'Fragment du Temps I', icon: '✨', description: 'Premier fragment d\'un mécanisme ancien.' },
  'fragment-2': { name: 'Fragment du Temps II', icon: '✨', description: 'Deuxième fragment, trouvé en Préhistoire.' },
  'fragment-3': { name: 'Fragment du Temps III', icon: '✨', description: 'Troisième fragment, gravé d\'inscriptions romaines.' },
  'fragment-4': { name: 'Fragment du Temps IV', icon: '✨', description: 'Quatrième fragment, marqué d\'une croix.' },
  'fragment-5': { name: 'Fragment du Temps V', icon: '✨', description: 'Cinquième fragment, scellé par Vauban.' },
  'fragment-6': { name: 'Fragment du Temps VI', icon: '✨', description: 'Sixième fragment, taché par le sel.' },
  'fragment-7': { name: 'Fragment du Temps VII', icon: '✨', description: 'Septième fragment, corrodé par la guerre.' },
  'silex-poli': { name: 'Silex poli', icon: '🪨', description: 'Outil de chasse préhistorique.' },
  'piece-romaine': { name: 'As romain', icon: '🪙', description: 'Pièce de bronze, Iᵉʳ siècle.' },
  'manuscrit-medieval': { name: 'Manuscrit médiéval', icon: '📜', description: 'Enluminure de l\'abbaye des Châteliers.' },
  'plans-vauban': { name: 'Plans de Vauban', icon: '📐', description: 'Plans originaux de la citadelle de Saint-Martin.' },
  'boussole-argent': { name: 'Boussole d\'argent', icon: '🧭', description: 'Boussole du capitaine Borel, XIXᵉ siècle.' },
  'carnet-resistance': { name: 'Carnet de la Résistance', icon: '📓', description: 'Carnet codé sauvé de l\'Occupation.' },
  'carte-ancienne': { name: 'Carte ancienne', icon: '🗺', description: 'Carte de l\'île dessinée à la main.' },
};

export class QuestSystem {
  start(questId) {
    if (state.quests[questId]) return false;
    state.quests[questId] = { step: 0, done: false };
    const q = QUESTS[questId];
    showToast(`Nouvelle quête : ${q.title}`, 'quest');
    return true;
  }

  advance(questId) {
    const q = QUESTS[questId];
    const s = state.quests[questId];
    if (!q || !s || s.done) return false;
    s.step++;
    if (s.step >= q.steps.length) {
      this.complete(questId);
    } else {
      showToast(`Quête mise à jour : ${q.title}`, 'quest');
    }
    return true;
  }

  complete(questId) {
    const q = QUESTS[questId];
    const s = state.quests[questId];
    if (!q || !s || s.done) return;
    s.done = true;
    showToast(`Quête accomplie : ${q.title}`, 'quest');
    if (q.reward?.xpExploration) addXP('exploration', q.reward.xpExploration);
    if (q.reward?.xpHistorical) addXP('historical', q.reward.xpHistorical);
    // Récompenses spécifiques traitées par l'inventaire si besoin
  }

  isActive(questId) {
    return state.quests[questId] && !state.quests[questId].done;
  }
  isDone(questId) {
    return state.quests[questId]?.done;
  }
  currentStep(questId) {
    const s = state.quests[questId];
    return s ? s.step : -1;
  }

  // Quête principale : avance et débloque les époques
  progressMain() {
    const id = 'q-main-fragments';
    if (!state.quests[id]) this.start(id);
    const s = state.quests[id];
    if (s.done) return;
    // l'index de step correspond au fragment collecté
    const fragmentMap = ['', 'fragment-2', 'fragment-3', 'fragment-4', 'fragment-5', 'fragment-6', 'fragment-7'];
    const eraMap = ['', 'prehistoire', 'antiquite', 'moyenage', 'xvii', 'xix', 'wwii'];
    if (s.step < eraMap.length - 1) {
      const next = eraMap[s.step + 1];
      if (next) unlockEra(next);
    }
    this.advance(id);
  }
}

export const questSystem = new QuestSystem();
