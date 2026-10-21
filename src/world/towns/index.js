// Une ville par époque. Ajouter une époque = ajouter un module de ville ici
// (et un fichier d'histoire dans story/eras/).

import phare from './phare.js';
import portes from './portes.js';
import sainteMarie from './sainteMarie.js';
import flotte from './flotte.js';
import saintMartin from './saintMartin.js';
import ars from './ars.js';
import boisPlage from './boisPlage.js';

const placeholder = {
  radius: 30,
  build(tb) {
    tb.spot('spawn', 0, 6);
  },
};

export const TOWNS = {
  contemporaine: phare,
  prehistoire: portes,
  antiquite: sainteMarie,
  moyenage: flotte,
  xvii: saintMartin,
  xix: ars,
  wwii: boisPlage,
};
