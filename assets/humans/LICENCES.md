# Corps humains

Les fichiers de ce dossier sont dérivés de **MakeHuman** (https://www.makehumancommunity.org,
dépôt https://github.com/makehumancommunity/makehuman) :

- maillage de base « hm08 » (corps, cils, dents, aides d'articulations) ;
- cibles de morphologie « macrodetails » (sexe, âge, musculature, poids, taille, proportions) ;
- squelette par défaut et ses poids de peau ;
- yeux « high-poly » et leur texture `brown_eye.png`.

Ces éléments ont été placés par leurs auteurs sous licence **CC0 1.0** (domaine public),
en septembre 2020 : Data Collection AB, Joel Palmius, Jonas Hauquier ; cibles d'origine
© 2014 Manuel Bastioni.

`humans.bin`, `humans.json`, `maskA.png`, `maskB.png` et `eye.png` sont produits par
`dev/tools/gen_humans.py` : morphologies du jeu, poids ramenés à notre squelette,
occlusion ambiante cuite, masques du visage peints dans l'espace UV.

Usage : `python3 dev/tools/gen_humans.py /chemin/vers/makehuman/makehuman`
(Python 3 avec numpy et Pillow).
