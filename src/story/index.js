// Inscription de tout le contenu narratif dans le registre.
import { register } from './registry.js';
import common from './common.js';
import contemporaine from './eras/contemporaine.js';
import prehistoire from './eras/prehistoire.js';
import antiquite from './eras/antiquite.js';
import moyenage from './eras/moyenage.js';
import xvii from './eras/xvii.js';
import xix from './eras/xix.js';
import wwii from './eras/wwii.js';

[common, contemporaine, prehistoire, antiquite, moyenage, xvii, xix, wwii].forEach(register);
