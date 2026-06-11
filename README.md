# Les Fragments du Temps — Île de Ré

Prototype jouable d'un jeu d'exploration et d'aventure en monde semi-ouvert,
basé sur l'Île de Ré (Charente-Maritime, France) et le voyage à travers
sept époques historiques.

Le joueur incarne un explorateur contemporain qui découvre un artefact lui
permettant de voyager dans le temps. Son but : réparer les anomalies
temporelles, aider les habitants de chaque époque et reconstituer
l'histoire de l'île.

## Lancer le jeu

### En ligne (GitHub Pages)

Une fois le PR fusionné dans `main` et GitHub Pages activé dans les
paramètres du dépôt (Settings → Pages → Source : *GitHub Actions*),
le jeu est jouable à :

**https://pierrealexispozzi.github.io/Ile_de_Re/**

Un workflow `.github/workflows/pages.yml` publie automatiquement le site
à chaque push sur `main`.

### En local

Aucune dépendance à installer ni réseau requis : Three.js est embarqué
dans `vendor/three.module.js` et chargé via un import-map local.

```bash
# Depuis la racine du dépôt :
python3 -m http.server 8000
# Puis ouvrir http://localhost:8000
```

Un serveur statique est requis (les modules ES ne se chargent pas en `file://`).

## Commandes

| Touche                 | Action                                |
| ---------------------- | ------------------------------------- |
| `Z` `Q` `S` `D` / flèches | Déplacement                        |
| `Shift`                | Courir                                |
| `Espace`               | Sauter                                |
| `E`                    | Interagir (PNJ, objets, lieux)        |
| `Tab`                  | Inventaire                            |
| `J`                    | Journal de quêtes                     |
| `M`                    | Carte                                 |
| `T`                    | Ouvrir le portail temporel            |
| `B`                    | Monter / descendre du vélo            |
| `Échap`                | Pause / fermer les panneaux           |
| Souris                 | Caméra (clic pour capturer)           |

## Systèmes implémentés

- **Monde 3D** : île procédurale fidèle à la géographie réelle, marais
  salants, plages, dunes, forêts de pins, vignobles, ports, fortifications.
- **9 lieux emblématiques** : Saint-Martin-de-Ré, La Flotte, Ars-en-Ré,
  Le Bois-Plage-en-Ré, Sainte-Marie-de-Ré, Les Portes-en-Ré, Phare des
  Baleines, Fort la Prée, Réserve de Lilleau des Niges.
- **7 époques = 7 villes** : chaque époque se déroule dans UNE ville de
  l'île, reconstituée avec un plan fidèle ; le voyage temporel téléporte
  le joueur dans la ville de l'époque :

  | Époque | Ville | Points d'intérêt |
  | ------ | ----- | ---------------- |
  | Préhistoire | Les Portes-en-Ré | campement, dolmen, alignement de menhirs |
  | Antiquité romaine | Sainte-Marie-de-Ré | villa à péristyle, horreum, jetée, marché |
  | Moyen Âge | La Flotte | halles, port, abbaye des Châteliers en chantier |
  | XVIIᵉ siècle | Saint-Martin-de-Ré | remparts Vauban en étoile, citadelle, bassin à flot |
  | XIXᵉ siècle | Ars-en-Ré | clocher noir et blanc, marais salants, gabarres |
  | Seconde Guerre mondiale | Le Bois-Plage-en-Ré | casemates, obstacles de plage, village occupé |
  | Contemporaine | Phare des Baleines | grand phare, vieille tour Vauban, pistes cyclables |
- **Cycle jour/nuit dynamique** avec soleil, lune et ciel coloré.
- **Météo** (clair, nuageux, brume marine, pluie).
- **Marées** : niveau de l'océan oscille au fil du temps.
- **PNJ** : marins, pêcheurs, sauniers, moines, soldats, marchands,
  résistants, touristes — dialogues contextuels par époque, routines.
- **Quêtes** : principale (Fragments du Temps) + secondaires par époque.
- **Inventaire** : artefacts, cartes anciennes, outils, documents.
- **Réputation** locale par village.
- **Progression** : XP d'exploration, XP historique, compétences.
- **Mini-carte** et carte plein écran.
- **Audio spatialisé** : ambiances maritimes, oiseaux, vent.

## Structure

```
index.html              Point d'entrée
style.css               UI
vendor/three.module.js  Three.js embarqué (aucune dépendance réseau)
src/
  main.js               Boucle de jeu, init Three.js, collisions
  world.js              Île, terrain texturé, bâtiments, chemins, colliders
  textures.js           Textures procédurales (pierre, tuiles, herbe, pavés…)
  character.js          Avatar humanoïde articulé (joueur + PNJ)
  locations.js          Les 9 lieux + bâtiments par époque
  eras.js               Configuration des 7 époques
  player.js             Contrôleur 3ème personne + collisions
  npcs.js               PNJ, dialogues, apparences par époque
  quests.js             Système de quêtes
  inventory.js          Sac et objets
  ui.js                 HUD, panneaux, journal
  dayNight.js           Soleil, lune, ciel, météo, marées
  audio.js              Bande-son et SFX
  input.js              Clavier / souris
  state.js              État global et sauvegarde
```

## Nouveautés de cette itération

- **Une ville par époque** : le portail temporel téléporte le joueur dans
  la ville où se déroule l'époque ; PNJ, fragment et quêtes y résident.
- **Plans de villes fidèles** : rues de maisons rétaises mitoyennes
  (murs chaulés, volets verts, tuiles canal, génoises, cheminées de
  pignon), places pavées, puits, ports reliés au bourg par une rue.
  Saint-Martin a ses remparts en étoile percés de deux portes, sa
  citadelle et son bassin à flot fermé par deux môles ; Ars son clocher
  noir et blanc et ses marais salants ; La Flotte ses halles et le
  chantier de l'abbaye (grue, échafaudages, pierres taillées).
- **Toits à deux pentes réels** : géométrie dédiée avec pignons dans le
  matériau du mur et pentes en tuiles — fini les toits coniques écrasés.
- **Textures enrichies avec relief (bump mapping)** : pierre de taille,
  tuiles, pavés, crépi, bois, terre battue ; nouvelles textures de
  **béton banché** (bunkers) et de **volets en planches peintes**.
- **Terrain aplani sous la ville active** (les villages rétais sont
  plats) — le terrain, le joueur et les PNJ partagent la même hauteur.
- **Proportions humaines** : avatar 1,80 m, portes 2,05 m, étages 2,80 m,
  encadrements de pierre, appuis de fenêtre.
- **Ombres mobiles** : la caméra d'ombres suit la ville active (avant,
  seules les environs de l'origine étaient ombragés).
- **Collisions** contre bâtiments, remparts, arbres et décor (grille
  spatiale pour rester performant).

## Extension

Le code est modulaire. Pour ajouter :

- **Une époque** : entrée dans `src/eras.js` (palette, PNJ, quêtes, props).
- **Un village** : entrée dans `src/locations.js`.
- **Une quête** : entrée dans `src/quests.js`.
- **Un PNJ** : entrée dans `src/npcs.js`.

## Vision artistique (référence de production)

Le prototype utilise du rendu stylisé low-poly pour rester performant dans
le navigateur. Une version cible utiliserait Unreal Engine 5 / Unity HDRP
avec photogrammétrie pour l'architecture rétaise et les vestiges
historiques. Voir `DESIGN.md` pour le cahier des charges complet.
