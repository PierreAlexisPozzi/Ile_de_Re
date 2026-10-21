// Séquences cinématiques : introduction et grand final.
// Chaque plan : { era?, from, to, look | orbit, dur, title?, caption?, do? }

import { heightAt } from '../world/terrain.js';
import { LOCATION } from '../world/locations.js';
import { getEra } from './eras.js';

const town = (era) => {
  const p = LOCATION[getEra(era).town].position;
  return { x: p[0], z: p[2], y: heightAt(p[0], p[2]) };
};

// Plan en orbite autour d'une ville
const orbit = (era, r, h, a0, a1, dur, title, caption, lookH = 3) => {
  const c = town(era);
  return { era, orbit: { center: c, r, h, a0, a1, lookH }, dur, title, caption };
};

export const SEQUENCES = {
  intro: (state, api) => {
    const c = town('contemporaine');
    const ph = api.world.spots.phare ?? c;
    const d = api.world.spots.dalle ?? c;
    const sp = api.world.spawn;
    return [
      { from: { x: c.x - 90, y: 10, z: c.z - 30 }, to: { x: c.x - 55, y: 16, z: c.z - 14 }, look: { x: ph.x, y: c.y + 40, z: ph.z - 6 }, dur: 6.5,
        title: 'Les Fragments du Temps', caption: 'Île de Ré, Charente-Maritime — été 2026.', mustPlay: true },
      { orbit: { center: { x: ph.x, y: c.y, z: ph.z - 6 }, r: 42, h: 24, a0: -2.2, a1: -0.9, lookH: 18 }, dur: 7.5,
        caption: "Depuis trois jours, l'île oublie. Des noms s'effacent des plaques, des pages blanchissent dans les registres des gardiens du phare." },
      { from: { x: d.x + 10, y: c.y + 7, z: d.z + 12 }, to: { x: d.x + 3, y: c.y + 3.5, z: d.z + 4 }, look: { x: d.x, y: c.y + 0.4, z: d.z - 2.4 }, dur: 6,
        caption: "Sous la pointe des Baleines, raconte une légende oubliée, dort l'Horloge des Marées." },
      { from: { x: sp.x + 14, y: c.y + 9, z: sp.z + 16 }, to: { x: sp.x + 3, y: c.y + 3, z: sp.z + 6 }, look: { x: sp.x, y: c.y + 1.4, z: sp.z }, dur: 4.5,
        caption: "Une lettre t'a conduit jusqu'ici." },
    ];
  },

  finale: (state) => {
    const f = state.flags;
    const shots = [];
    const c = town('contemporaine');
    shots.push(orbit('contemporaine', 16, 7, 0.4, 1.6, 7, "L'Horloge des Marées", "Les marées et les siècles tournent de nouveau ensemble. L'île se souvient.", 2));
    shots.push(orbit('prehistoire', 38, 14, 0.2, 1.2, 8, 'Vers 4500 av. J.-C.',
      "Au bord du Fier, les premiers habitants chassent, pêchent, taillent le silex et dressent des pierres face au couchant." + (f.pre_vase ? ' Le vase de Néa dormira sous le sable pendant soixante siècles.' : '')));
    shots.push(orbit('antiquite', 42, 16, 2.4, 3.4, 8, 'IIᵉ siècle',
      "Ratis vit du sel et du vin. Les amphores partent vers Burdigala ; Romains et Santons apprennent à vivre ensemble." + (f.ant_mosaique ? ' Les dauphins de la mosaïque nagent encore.' : '')));
    shots.push(orbit('moyenage', 44, 18, -0.6, 0.6, 8, '1190',
      "Les moines blancs des Châteliers bâtissent pierre après pierre ; à La Flotte, pêcheurs et moines apprennent à partager la mer." + (f.med_paix ? ' La charte lue à voix haute a ramené la paix.' : '')));
    shots.push(orbit('xvii', 70, 30, 1.0, 2.2, 9, '1681',
      "Vauban enserre Saint-Martin d'une étoile de pierre. Plus de trois siècles plus tard, l'UNESCO la protégera."));
    shots.push(orbit('xix', 46, 20, 3.4, 4.6, 8, '1862',
      "L'or blanc d'Ars part sur les gabarres ; les sauniers ratissent, les femmes portent la quichenotte." + (f.xix_ecole ? " L'école ouvre ses portes aux enfants des marais." : '')));
    shots.push(orbit('wwii', 48, 20, 0.6, 1.8, 8, '1943',
      "Sous l'Occupation, l'île résiste en silence. Elle sera libérée le 8 mai 1945, l'une des toutes dernières terres de France."));
    shots.push({ era: 'contemporaine', orbit: { center: c, r: 90, h: 45, a0: 2.4, a1: 3.6, lookH: 10 }, dur: 9,
      title: "L'Île de Ré",
      caption: f.ending === 'gardien'
        ? "Aujourd'hui, Élise et Victor veillent ensemble sur la dalle. Et l'île garde la mémoire de tous ceux qui l'ont faite."
        : "Aujourd'hui, l'île garde la mémoire de tous ceux qui l'ont faite. Parfois, dans la brume, on aperçoit un homme en gris sur la pointe…" });
    return shots;
  },
};
