# Les Fragments du Temps — Île de Ré

Jeu d'exploration et d'aventure en 3D, jouable dans le navigateur, qui fait
voyager le joueur à travers sept époques de l'histoire de l'île de Ré
(Charente-Maritime). Chaque époque se joue dans une ville de l'île,
reconstituée avec ses rues, ses commerces et leurs enseignes, ses affiches,
ses habitants en costume d'époque, leurs métiers et leurs histoires.

## Lancer le jeu

### En ligne (GitHub Pages)

**https://pierrealexispozzi.github.io/Ile_de_Re/**

Le workflow `.github/workflows/pages.yml` publie le site à chaque push sur
`main` (Settings → Pages → Source : *GitHub Actions*).

### En local

Aucune dépendance ni connexion requise : Three.js est embarqué dans
`vendor/three.module.js`, les polices dans `fonts/`, toutes les textures
sont générées par le code.

```bash
python3 -m http.server 8000   # depuis la racine du dépôt
# puis ouvrir http://localhost:8000
```

Un serveur statique est nécessaire (les modules ES ne se chargent pas en `file://`).

## L'histoire

Élise, archiviste au musée du phare des Baleines, t'écrit : « Venez vite.
L'île oublie. » Des noms s'effacent des plaques et des mémoires, des pages
de registres deviennent blanches. Sous la pointe dort
l'**Horloge des Marées**, commencée par les premiers habitants de l'île et
complétée à chaque époque par une pièce confiée à un gardien. Quelqu'un a
volé son Cœur et dispersé ses sept éclats dans le temps. Avec l'Astrolabe,
tu remontes les siècles pour les retrouver… et tu croises partout un
mystérieux voyageur vêtu de gris, qui sème des objets venus du futur.

| Chapitre | Époque | Ville | Ce qui s'y joue |
| -------- | ------ | ----- | --------------- |
| Prologue | 2026 | Phare des Baleines | Élise, le musée, la vieille tour, la dalle aux sept encoches |
| 1 | Néolithique (~4500 av. J.-C.) | Les Portes | Le clan de Maëla : chasse, taille du silex, poterie, le menhir tombé, le dolmen |
| 2 | Antiquité (IIᵉ s.) | Sainte-Marie | Lucius le marchand, Brennos le Santon : forum, taberna, salines, villa et sa mosaïque |
| 3 | Moyen Âge (1190) | La Flotte | Les moines des Châteliers et les pêcheurs : halles, charte, cloche, fanal, abbaye en chantier |
| 4 | Grand Siècle (1681) | Saint-Martin | Vauban et ses plans volés, le sel des Hollandais, une frégate anglaise, l'horloger Ambroise |
| 5 | Second Empire (1862) | Ars | Jeanne la saunière, Ernest Lescure le négociant ruiné, la gabarre Sainte-Anne, l'école des filles |
| 6 | Occupation (1943) | Le Bois-Plage | Hélène l'infirmière, la Résistance, le rationnement, un blockhaus coulé sur la cachette du dernier éclat |
| Finale | 2026 | Phare des Baleines | Le voyageur en gris démasqué, deux fins selon ce que tu as découvert |

Chaque chapitre compte une suite de quêtes principales et cinq quêtes
secondaires. Les choix laissent des traces : le musée du présent expose ce
que tu as sauvé (le vase de Néa, la mosaïque, la charte, les plans de
Vauban, l'école d'Ars, le carnet de croquis), et la finale dépend des
preuves et des vérités rassemblées en chemin.

## La vraie île, au fil du temps

- L'île reprend son **vrai contour** : relation OpenStreetMap « Île de Ré », © contributeurs OpenStreetMap, licence ODbL.
  En face, on voit la **côte de La Rochelle** (limites communales de Charente-Maritime, france-geojson).
  Une unité du monde vaut environ 15 m. Les villes, elles, sont à l'échelle humaine.
- Le relief découle de la côte : plages et dunes face à l'Atlantique, vasières au nord et dans le Fier d'Ars, marais salants, vignes et pinèdes à leur place réelle.
  Les villages des autres époques se dessinent au loin, reliés par les routes réelles.
- **La forme de l'île change selon l'époque.** Cette reconstitution est approximative.
  - Au Néolithique, la mer est plus basse et l'île n'est qu'un chapelet de trois îles (Ars, Loix, Ré).
  - Dans l'Antiquité, des chenaux séparent encore ces trois îles.
  - Au Moyen Âge, ces chenaux deviennent des gués qui se découvrent à marée basse.
  - À partir du XVIIᵉ siècle, les marais salants ont soudé l'île.
  - Aujourd'hui, les dunes reculent sous l'érosion et le pont (1988) relie l'île au continent.
- La **carte** (`M`) montre la vraie forme de l'île avec la frise « L'île au fil du temps ».
  Un clic sur une époque affiche la forme de l'île à ce moment-là, avec une explication.

## Entrer dans les bâtiments

`E` devant une porte fait entrer dans le bâtiment. Chaque pièce est meublée selon son usage et son époque :

- maisons : cheminée, lit, vaisselier, horloge comtoise en 1862, poste de T.S.F. en 1943 ;
- boutiques (le commerçant attend derrière son comptoir), cafés et tavernes ;
- forge et horlogerie ;
- églises (vitraux, bancs où se recueillir), écoles (leçon du jour au tableau), mairies ;
- bureaux, dispensaire, entrepôts de sel et d'amphores ;
- huttes néolithiques, blockhaus, musée du phare.

La lumière du jour entre par les fenêtres. Chaque intérieur contient un objet du quotidien à examiner.

## Rendu

- Éclairage d'ambiance tiré du ciel : reflets sur l'eau, le verre et le métal.
- Occlusion ambiante, halo des lumières, étalonnage des couleurs et anticrénelage.
- Textures procédurales de pierre, d'enduit, de sable et d'herbe, avec cartes de normales.

La qualité (Échap → Options) règle ces effets. Elle baisse automatiquement si l'image devient trop lente.

La nuit, une lanterne éclaire les abords du voyageur et la lune baigne l'île d'une lumière bleutée.
Deux réglages, « Luminosité générale » et « Clarté des nuits », permettent d'y voir plus clair.
On peut aussi dormir dans un lit, ou passer la nuit avec la touche `N`.

## Ce que contient le jeu

- **Personnages** : une seule peau continue, sans raccords au cou, aux épaules, aux coudes ni aux genoux.
  Elle est générée à partir de volumes anatomiques (trapèzes, deltoïdes, biceps, quadriceps, mollets) et déformée par le squelette.
  Les vêtements ajustés (chemises et manches, pantalons, culottes, bas, gants) épousent le corps et plient avec lui.
  La tête est sculptée (nez, orbites, arcades, pommettes, lèvres, menton) et les yeux sont en relief : ils clignent et suivent le regard.
  Les animations sont procédurales (marche, course, gestes de métier), et chacun a son attitude au repos : bras ballants, poing sur la hanche, bras croisés ou mains jointes.
- **Costumes d'époque** : peaux et parures néolithiques, tuniques, toges et
  pallas romaines, cottes, guimpes et scapulaires médiévaux, justaucorps,
  tricornes et rabats du Grand Siècle, quichenottes des saunières, redingotes
  et hauts-de-forme, uniformes, tenues des années 1940 et d'aujourd'hui.
- **Commerces** : chaque ville a ses boutiques avec un commerçant, une
  vitrine ou un étal, une enseigne peinte ou gravée, une enseigne en potence
  qui se balance au vent, des marchandises et une monnaie d'époque
  (coquillages, sesterces, deniers, livres, francs, euros).
- **Affiches et avis** lisibles en jeu, en polices d'époque : programmata
  peints sur les murs romains, proclamations médiévales, ordonnances
  royales, affiches du XIXᵉ, avis de l'occupant et tracts de la Résistance,
  affiches touristiques d'aujourd'hui.
- **Monde** : île entière au relief procédural (marais salants, dunes,
  vignes, pinèdes, Fier d'Ars), océan animé avec marées, ciel, cycle
  jour/nuit (une heure de jeu = une minute), météo, faune (goélands,
  hérons, aigrettes, lapins, cerfs, ânes en culotte), végétation instanciée.
- **Systèmes** : dialogues à choix, énigmes, journal de quêtes, inventaire,
  carnet (codex historique), réputation, expérience et compétences, carte,
  boussole, vélo et embarcations, sauvegarde automatique, musique et sons
  générés selon l'époque, cinématiques d'arrivée et de fin.

## Commandes

| Touche | Action |
| ------ | ------ |
| `Z Q S D` / `W A S D` / flèches | Se déplacer |
| `Maj` | Courir |
| `Espace` | Sauter (ou passer une réplique) |
| `E` | Parler, ramasser, interagir, lire une affiche, commercer, entrer dans un bâtiment |
| `1` … `4` | Choisir une réponse dans un dialogue |
| `Tab` | Sac |
| `J` | Journal de quêtes |
| `C` | Carnet (codex) |
| `M` | Carte |
| `T` | Portail temporel |
| `P` | Fiche du personnage |
| `B` | Monter / descendre du vélo |
| `N` | Passer le temps : dormir jusqu'au matin, ou attendre le soir |
| `H` | Aide |
| `Échap` | Pause, options, fermer un panneau |
| Souris | Caméra (cliquer pour la capturer), molette pour le zoom |

## Structure

```
index.html               Point d'entrée (HUD, dialogues, panneaux)
style.css                Interface
fonts/                   Polices d'époque (licences libres, voir LICENCES.md)
vendor/three.module.js   Three.js r160 embarqué
vendor/jsm/              Modules de post-traitement de Three.js r160
src/
  main.js                Initialisation, boucle de jeu, voyages dans le temps
  player.js              Joueur à la 3ᵉ personne : marche, nage, vélo, bateau
  core/                  État et sauvegarde, entrées, événements, aléatoire
  gfx/                   Textures procédurales, tissus, feuillages,
                         enseignes et affiches (canvas), fusion de maillages
  characters/            Squelette, visages, costumes, accessoires, animations,
                         garde-robe par époque (wardrobe.js)
  world/                 Terrain, océan, ciel, paysage, faune, matériaux,
                         constructeur de villes (builder.js), intérieurs
    geo/                 Contour réel de l'île (coast.js) et sa forme
                         selon les époques (shape.js)
    towns/               Une ville par époque
  npc/                   PNJ : routines, déplacements, réactions, bulles
  systems/               Quêtes, dialogues, actions, interactions, inventaire,
                         jour/nuit, audio, cinématiques
  story/                 Tout le contenu narratif
    eras.js              Les 7 époques (ville, monnaie, ciel, mer, paysage)
    common.js            Objets et entrées du carnet communs
    eras/*.js            Un fichier par époque : PNJ, dialogues, quêtes,
                         objets, boutiques, énigmes, carnet
  ui/                    HUD, panneaux, portraits des PNJ
  dev/bot.js             Bot de test qui joue l'histoire
dev/                     Pages de développement (galerie de personnages,
                         enseignes, carte du relief)
```

## Ajouter du contenu

- **Une époque** : une entrée dans `src/story/eras.js`, une ville dans
  `src/world/towns/` (déclarée dans `towns/index.js`) et un fichier
  d'histoire dans `src/story/eras/` (déclaré dans `story/index.js`).
- **Une ville** : `build(tb)` reçoit un constructeur qui sait poser des
  maisons (`tb.house`, `tb.row`), des boutiques avec enseigne
  (`shop: { id, name, sign, hanging, goods }`), des affiches (`tb.poster`),
  des rues, des places, des quais, des bateaux, et nommer des points
  (`tb.spot`) que l'histoire utilise pour placer PNJ et objets.
- **Un PNJ** : `{ id, name, title, look: look('xix', 'sauniere', {...}),
  routine: [{ from, to, at, action }], barks, talk }` dans le fichier de
  l'époque. Les archétypes de costumes sont dans `characters/wardrobe.js`.
- **Une quête** : une suite d'étapes `talk`, `deliver`, `collect`,
  `interact`, `observe`, `goto`, `escort`, `wait`, avec récompenses
  (expérience, monnaie, réputation, objets, entrées du carnet).
- **Un dialogue** : liste de répliques `[qui, texte]`, choix
  `{ choice: [{ t, go, do }] }` et actions `{ do: [['give', 'objet']] }`.

## Tests

Le bot de `src/dev/bot.js` joue l'histoire en accéléré dans un navigateur
sans affichage (Playwright) : il suit la quête active, parle aux PNJ, résout
les énigmes, ramasse les objets et voyage d'une époque à l'autre jusqu'à la
finale. Il sait aussi accepter et jouer toutes les quêtes secondaires, et
vérifier qu'aucun point de quête n'est inaccessible (dans un mur ou dans l'eau).
Dans la console du navigateur : `__dev.bot().then((b) => b.botRun(600))`.
