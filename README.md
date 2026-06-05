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
- **7 époques** : Préhistoire, Antiquité romaine, Moyen Âge, XVIIᵉ siècle
  (Vauban), XIXᵉ siècle, Seconde Guerre mondiale, Époque contemporaine.
  Chaque époque modifie la palette, la végétation, les bâtiments, les PNJ
  et les quêtes disponibles.
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

- **Collisions** contre les bâtiments, arbres et éléments de décor (grille
  spatiale pour rester performant).
- **Avatar articulé** : tête, bras, jambes animés, sac d'explorateur,
  proportions réalistes par rapport aux bâtiments (~1,8 m).
- **Textures procédurales** : pierre de taille avec mortier et mousse,
  tuiles d'argile cuite, crépi rétais, chaume, bois, pavés, terre battue,
  asphalte (piste cyclable), feuillage, écorce, herbe.
- **Bâtiments réalistes** : portes, fenêtres à volets, cheminées, toits à
  deux pentes, créneaux, clochers, bunkers.
- **Chemins** reliant les villages, au revêtement propre à chaque époque
  (terre, pavés romains/médiévaux, asphalte contemporain).
- **Éléments d'époque** : menhirs et feu de camp (Préhistoire), amphores
  (Antiquité), charrette et barrières (Moyen Âge), canons (XVIIᵉ/XIXᵉ),
  bunkers et sacs de sable (WWII), bancs, panneaux et arceaux à vélo
  (contemporain).

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
