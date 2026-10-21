// CHAPITRE 4 (chapitre majeur) — LE GRAND SIÈCLE, 1681 — Saint-Martin-de-Ré.
// Vauban trace l'enceinte de Saint-Martin. Ses plans ont été volés par un
// mystérieux « sieur de Grisval ». Commerce du sel avec les Hollandais,
// menace d'une frégate anglaise, et maître Ambroise, l'horloger-gardien.

import * as THREE from 'three';
import { look, SKIN, HAIR, EYES } from '../../characters/wardrobe.js';
import { buildBoat } from '../../world/builder.js';
import { S } from '../../core/state.js';

const ERA = 'xvii';

const npcs = [
  {
    id: 'vauban', name: 'Sébastien Le Prestre de Vauban', title: 'Commissaire général des fortifications', codex: 'perso-vauban',
    look: look(ERA, 'vauban'),
    home: 'vauban',
    routine: [
      { from: 6, to: 12, at: 'vauban', action: 'write' },
      { from: 12, to: 14, at: ['place', 2, -1.2], action: 'idle' },
      { from: 14, to: 19, at: 'chantier', action: 'point' },
      { from: 19, to: 6, at: 'vauban', action: 'read' },
    ],
    barks: ['Une place bien fortifiée épargne le sang des soldats.', 'Le bastion doit voir son voisin, et son voisin le voir.', 'Il faut que l\'île entière puisse se réfugier derrière ces murs.'],
    talk: 'vauban.chat',
  },
  {
    id: 'laroque', name: 'Capitaine de La Roque', title: 'Capitaine au régiment de Navarre', codex: 'vie-soldat-xvii',
    look: look(ERA, 'officer'),
    home: 'place-armes',
    routine: [
      { from: 6, to: 12, at: ['porte', -3.4, 1.5], action: 'idle' },
      { from: 12, to: 20, at: 'place-armes', action: 'idle' },
      { from: 20, to: 6, at: ['citadelle', -1, 0], action: 'idle' },
    ],
    barks: ['Garde à vous !', 'Les Anglais n\'oublient pas 1627.', 'La citadelle sera prête avant trois ans, foi de capitaine.'],
    talk: 'laroque.chat',
  },
  {
    id: 'sentinelle', name: 'Sentinelle', title: 'Soldat de garde à la porte',
    look: look(ERA, 'soldier', { hair: { style: 'long', color: HAIR.blond }, beard: { style: 'mustache', color: HAIR.blond } }),
    home: 'poste',
    routine: [{ from: 0, to: 24, at: 'poste', action: 'guard' }],
    barks: ['Qui vive ?', 'Circulez.', 'Le pain du régiment est en retard…'],
    talk: 'sentinelle.chat',
  },
  {
    id: 'ambroise', name: 'Maître Ambroise Lenoir', title: 'Maître horloger, gardien', codex: 'perso-ambroise',
    look: look(ERA, 'clockmaker'),
    home: 'horloger',
    routine: [{ from: 7, to: 20, at: 'horloger', action: 'write' }, { from: 20, to: 7, at: 'horloger', action: 'read' }],
    barks: ['Tic… tac… l\'échappement est juste.', 'Le temps est un mécanisme, monsieur. Ou madame.', 'Une horloge ne ment jamais, si on l\'entretient.'],
    talk: 'ambroise.chat',
  },
  {
    id: 'marguerite', name: 'Marguerite Gendron', title: 'Négociante en vins et sels', codex: 'perso-marguerite',
    look: look(ERA, 'merchantwoman'),
    home: 'tonneau:keeper',
    routine: [{ from: 7, to: 19, at: 'tonneau:keeper', action: 'write' }, { from: 19, to: 7, at: 'tonneau:keeper', action: 'idle' }],
    barks: ['Trois cents muids pour les Hollandais, au prix fort !', 'Le sel d\'Ars est le plus blanc du royaume.', 'Un bon contrat vaut mieux qu\'un bon canon.'],
    talk: 'marguerite.chat',
  },
  {
    id: 'hans', name: 'Hans van der Berg', title: 'Capitaine de la flûte « De Zeemeeuw »', codex: 'histoire-hollandais',
    look: look(ERA, 'dutch'),
    home: 'flute',
    routine: [{ from: 6, to: 21, at: 'flute', action: 'idle' }, { from: 21, to: 6, at: ['cabaret', -1, -1.2], action: 'drink' }],
    barks: ['Goedemorgen !', 'Le sel de Ré, c\'est l\'or blanc d\'Amsterdam.', 'Mon navire charge à la marée.'],
    talk: 'hans.chat',
  },
  {
    id: 'toinette', name: 'Toinette', title: 'Boulangère', codex: 'histoire-siege-1627',
    look: look(ERA, 'baker'),
    home: 'boulangerie:keeper',
    routine: [{ from: 5, to: 20, at: 'boulangerie:keeper', action: 'stir' }, { from: 20, to: 5, at: 'boulangerie:keeper', action: 'idle' }],
    barks: ['Pain chaud, pain de froment !', 'J\'avais sept ans quand les Anglais sont venus.', 'Mon homme était aux remparts, en 27.'],
    talk: 'toinette.chat',
  },
  {
    id: 'gilles', name: 'Abbé Gilles', title: 'Curé de Saint-Martin',
    look: look(ERA, 'priest'),
    home: 'eglise',
    routine: [{ from: 6, to: 21, at: 'eglise', action: 'read' }, { from: 21, to: 6, at: 'eglise', action: 'pray' }],
    barks: ['Que Dieu garde l\'île de Ré.', 'Ma cloche sonne faux depuis l\'orage.', 'Venez à vêpres.'],
    talk: 'gilles.chat',
  },
  {
    id: 'canonnier', name: 'Maître canonnier Brisseau', title: 'Chef de la batterie',
    look: look(ERA, 'soldier', { age: 'old', hair: { style: 'short', color: HAIR.grey }, beard: { style: 'full', color: HAIR.grey }, props: { right: null } }),
    home: 'batterie',
    routine: [{ from: 0, to: 24, at: 'batterie', action: 'lookout' }],
    barks: ['Trente-six livres de boulet, ça calme les ardeurs.', 'Ne fumez pas près de la poudre !'],
    talk: 'canonnier.chat',
  },
  {
    id: 'grisval', name: 'Le sieur de Grisval', title: 'Gentilhomme en gris',
    look: look(ERA, 'gentleman'),
    when: (s) => s.active('xvii.m7') && s.step('xvii.m7') >= 1 && !s.flag('grisval_gone'),
    home: 'bastion0',
    routine: [{ from: 0, to: 24, at: 'bastion0', action: 'idle' }],
    barks: ['…'],
    talk: 'grisval.final',
  },
];

const extras = [
  { name: 'Soldat', look: look(ERA, 'soldier'), path: 'ronde', barks: ['Qui vive ?', 'Encore un tour de ronde…'] },
  { name: 'Soldat', look: look(ERA, 'soldier', { hair: { style: 'long', color: HAIR.dark } }), path: 'ronde', barks: ['Le capitaine est d\'humeur noire.'] },
  { name: 'Terrassier', look: look(ERA, 'worker'), path: 'grande-rue', action: 'carry', barks: ['Encore une hotte de terre…', 'Le sieur de Vauban paie bien, au moins.'] },
  { name: 'Crieur public', look: look(ERA, 'crier'), path: 'grande-rue', barks: ['Oyez ! Ordonnance du roi sur les fortifications !', 'Vente de sel jeudi, sur le quai !', 'Défense de jeter les eaux sales par les fenêtres !'] },
  { name: 'Bourgeoise', look: look(ERA, 'merchantwoman', { outfit: { top: { c: 0x2a4a6a, p: 'velvet' }, robe: { c: 0x2a4a6a, p: 'wool', len: 0.98, flare: 1 } } }), path: 'quais', barks: ['Ces Hollandais achètent tout notre sel.', 'Bonjour, monsieur… madame ?'] },
  { name: 'Matelot', look: look(ERA, 'worker', { hat: { type: 'bonnet', c: 0x8a2a22 }, outfit: { sash: null } }), path: 'quais', action: 'carry', barks: ['Ce tonneau pèse un âne mort !'] },
];

const items = {
  'plans-vauban': { name: "Plans de l'enceinte de Saint-Martin", icon: '📐', type: 'document', desc: "Le tracé des bastions, des courtines et de la citadelle, de la main de Vauban.",
    read: "Sur le grand papier, à l'encre et au lavis : une étoile de pierre à quatre bastions entourant la ville, deux portes (« Porte Toiras », « Porte des Campani »), une citadelle carrée sur la mer. En marge : « Que chaque face soit vue et défendue depuis le flanc du bastion voisin. — V. »" },
  'tonneau-sel': { name: 'Barrique de sel', icon: '🛢', type: 'ressource', model: 'barrel', desc: 'Une barrique de sel blanc des marais d\'Ars, pour la flûte hollandaise.' },
  poudre: { name: 'Baril de poudre', icon: '💣', type: 'ressource', model: 'powder', desc: 'Poudre noire de l\'arsenal. À tenir loin des flammes.' },
  engrenage: { name: "Roue d'horlogerie", icon: '⚙', type: 'ressource', model: 'gear', desc: 'Une roue dentée de laiton, finement taillée.' },
  medaille: { name: 'Médaille de 1627', icon: '🏅', type: 'ressource', model: 'medal', desc: 'Une médaille de cuivre frappée pour les défenseurs de la citadelle de Toiras.' },
  'pain-regiment': { name: 'Pains de munition', icon: '🍞', type: 'ressource', desc: 'Trois gros pains bis pour les soldats de garde.' },
  battant: { name: 'Battant de cloche', icon: '🔔', type: 'ressource', model: 'clapper', desc: 'Le lourd battant de fer de la cloche de l\'église.' },
  'carreau-delft': { name: 'Carreau de Delft', icon: '🟦', type: 'artefact', codex: 'histoire-hollandais', desc: 'Un carreau de faïence bleue représentant un moulin, offert par Hans.' },
  'bouteille-vin': { name: "Bouteille de vin d'Aunis", icon: '🍷', type: 'ressource', desc: 'Un vin clairet de l\'île, léger et fruité.' },
  'pain-blanc': { name: 'Pain de froment', icon: '🥖', type: 'consommable', desc: 'Le pain blanc de Toinette.', use: { stamina: 50, text: 'Croustillant !' } },
  chocolat: { name: 'Tasse de chocolat', icon: '☕', type: 'consommable', desc: 'La nouvelle boisson à la mode à la Cour, venue d\'Espagne.', use: { stamina: 60, text: 'Épais, sucré, parfumé à la cannelle.' } },
  'eau-de-vie': { name: "Fiole d'eau-de-vie", icon: '🧪', type: 'consommable', desc: 'Eau-de-vie de vin distillée en Aunis : l\'ancêtre du cognac.', use: { stamina: 30, text: 'Ça brûle !' } },
  'onguent': { name: 'Onguent de l\'apothicaire', icon: '🫙', type: 'consommable', desc: 'Pour les écorchures et les ampoules.', use: { stamina: 70, text: 'Tes pieds te remercient.' } },
  'tabatiere': { name: 'Tabatière en corne', icon: '🟫', type: 'artefact', desc: 'La mode du tabac à priser gagne toute la France.' },
};

const shops = {
  tonneau: { name: "Au Tonneau d'Or", intro: 'Barriques, bouteilles et sacs de sel s\'entassent jusqu\'au plafond.', sign: { text: "Au Tonneau d'Or", sub: 'Vins · Sels · Eaux-de-vie', style: 'carved', icon: 'barrel' },
    wares: [{ item: 'bouteille-vin', price: 2 }, { item: 'eau-de-vie', price: 3 }] },
  cabaret: { name: 'Cabaret de la Marine', sign: { text: 'Cabaret de la Marine', sub: 'Vin, bière et tabac', style: 'carved', icon: 'ship' }, intro: 'Des marins de toutes les nations jouent aux dés près du feu.',
    wares: [{ item: 'chocolat', price: 3 }, { item: 'tabatiere', price: 6 }] },
  boulangerie: { name: 'Boulangerie Toinette', intro: 'L\'odeur du pain chaud emplit la rue.', wares: [{ item: 'pain-blanc', price: 1 }] },
  apothicaire: { name: 'Apothicaire', sign: { text: 'Apothicaire', sub: 'Drogues · Simples · Onguents', style: 'carved', icon: 'mortar' }, intro: 'Bocaux de faïence, herbes séchées et une odeur de camphre.', wares: [{ item: 'onguent', price: 2 }] },
  barbier: { name: 'Barbier-chirurgien', sign: { text: 'Barbier', sub: 'Barbe · Saignées · Dents', style: 'carved', icon: 'scissors' }, intro: '« Une saignée ? Non ? Une barbe, alors ? »', wares: [{ item: 'onguent', price: 3 }] },
  horlogerie: { name: 'Horlogerie Lenoir', sign: { text: 'Horlogerie', sub: 'Ambroise Lenoir, maître horloger', style: 'carved', icon: 'clock' }, intro: 'Des dizaines de pendules battent la mesure, presque à l\'unisson.', wares: [] },
};

const riddles = {
  'r-bastion': {
    title: 'La leçon de Vauban',
    q: "Vauban te met à l'épreuve : « Pourquoi mes bastions sont-ils en forme de pointe de flèche, et non ronds comme les vieilles tours ? »",
    options: ['Pour être plus beaux vus du ciel', "Pour qu'aucun endroit au pied des murs n'échappe aux tirs des bastions voisins", 'Pour économiser la pierre', 'Pour que les boulets glissent dessus'],
    answer: 1, hint: 'Pense à ce qui se passe au pied d\'une tour ronde : un « angle mort » que personne ne peut viser.',
    success: "« Exactement : le flanquement. Au pied d'une tour ronde, il reste un angle mort où l'assaillant est à l'abri. Avec des bastions en pointe, chaque face est battue par le flanc du bastion voisin. Pas un pouce de terrain n'échappe aux défenseurs. »",
    codex: 'vie-fortification', xp: 50,
  },
  'r-comptes': {
    title: 'Les comptes de Marguerite',
    doc: "Livre de comptes — Au Tonneau d'Or\n3 barriques de vin d'Aunis à 15 livres la barrique\nRemise au capitaine van der Berg : 20 sols par barrique",
    q: 'Combien Hans doit-il payer en tout ? (1 livre = 20 sols)',
    options: ['45 livres', '42 livres', '44 livres', '48 livres'],
    answer: 1, hint: '3 × 15 = 45 livres, moins 3 × 20 sols = 60 sols = 3 livres.',
    success: "42 livres tout rond. « Vous comptez mieux que mon commis ! » s'exclame Marguerite. Sous l'Ancien Régime, la livre tournois se divise en 20 sols, et le sol en 12 deniers.",
    codex: 'vie-monnaie-ancien-regime', xp: 40,
  },
  'r-horloge': {
    title: "Le mécanisme de l'horloge",
    q: "Ambroise te demande : « Quand la grande aiguille fait un tour complet du cadran, de combien avance la petite ? »",
    options: ['D\'un tour complet', "D'une heure, soit un douzième de tour", 'D\'une minute', 'Elle ne bouge pas'],
    answer: 1, hint: 'La grande aiguille compte les minutes, la petite les heures.',
    success: "« Une heure, un douzième de tour : c'est le rôle de la minuterie, ce petit train de roues que vous venez de remettre en place. » Les horloges d'église de l'époque n'avaient souvent qu'une seule aiguille, celle des heures.",
    codex: 'metier-horloger', xp: 40,
  },
};

const dialogues = {
  'sentinelle.m1': [
    ['sentinelle', 'Halte-là ! Qui vive ? Vous n\'êtes pas de la ville, avec cet accoutrement.'],
    ['me', "Je viens de très loin. Je cherche le sieur de Vauban."],
    ['sentinelle', 'Le sieur de Vauban ? Tout le monde veut le voir depuis qu\'il est arrivé. Allez vous présenter au capitaine de La Roque. Il est à la porte ou à la place d\'armes de la citadelle.'],
  ],
  'laroque.m1': [
    ['laroque', "Encore un curieux ? … Attendez. Habits étranges, carnet à la main, regard qui mesure tout… Vous êtes l'aide-géomètre que Paris devait nous envoyer, n'est-ce pas ?"],
    { choice: [
      { t: "C'est cela. Où trouver le sieur de Vauban ?", go: 'laroque.m1.yes', best: true },
      { t: "Non, je suis… de passage.", go: 'laroque.m1.no' },
    ] },
  ],
  'laroque.m1.yes': [
    ['laroque', "Enfin ! Il est de fort méchante humeur. Il travaille sous sa tente, au bastion sud-ouest, quand il n'arpente pas le chantier. Allez-y, et bon courage."],
  ],
  'laroque.m1.no': [
    ['laroque', "De passage… Bah. Le sieur de Vauban a besoin de bras et de têtes. Il est sous sa tente, au bastion sud-ouest. Dites-lui que je vous envoie."],
  ],
  'vauban.m2': [
    ['vauban', "Vous êtes l'aide-géomètre ? Vous tombez à propos… ou très mal. On m'a volé mes plans. Les plans de l'enceinte, ceux que le roi doit approuver !"],
    ['vauban', "Trois semaines de relevés, de calculs, de dessins. Envolés de ma table, cette nuit. Sans eux, le chantier s'arrête, et les Anglais n'attendront pas que je les refasse."],
    ['me', "Avez-vous une idée du voleur ?"],
    ['vauban', "Un gentilhomme est venu hier, vêtu de gris, qui se disait « sieur de Grisval ». Il posait des questions étranges sur l'horloge de l'église. Je l'ai éconduit. Cherchez des traces autour de la tente, du chantier et du port."],
  ],
  'toinette.m2': [
    ['toinette', "Un gentilhomme en gris ? Oh oui, mon petit ! À l'aube, il est passé devant ma boulangerie en courant, un grand rouleau sous le bras, vers le port."],
    ['toinette', "Il est allé droit à la flûte hollandaise. Il a parlé avec le capitaine, celui qui achète le sel de la dame Gendron. Va voir Marguerite, au Tonneau d'Or : elle sait tout ce qui se passe sur ce quai."],
  ],
  'marguerite.m3': [
    ['marguerite', "Le gentilhomme en gris ? Il a vendu des papiers à Hans van der Berg, le capitaine hollandais, pour une bourse de florins. Hans croit avoir acheté une belle carte de l'île."],
    ['marguerite', "Hans est un honnête homme, mais un Hollandais en affaires ne lâche rien sans contrepartie. Il attend mes trois barriques de sel depuis ce matin, et mes porteurs sont partis aux remparts."],
    ['marguerite', "Portez-lui mes trois barriques, depuis l'entrepôt de l'îlot. Un client satisfait est un client qui écoute."],
  ],
  'hans.m3': [
    ['hans', "Ah ! Le sel de madame Gendron. Enfin ! Goed, goed. Le sel de Ré est le meilleur pour saler nos harengs, vous savez."],
    ['me', "Capitaine, vous avez acheté des papiers à un homme en gris. Ce sont les plans des fortifications du roi."],
    ['hans', "Des plans de fortifications ? Godverdomme… Il m'a dit que c'était une carte des marais salants ! Si on les trouve à mon bord, on me pendra pour espionnage."],
    { choice: [
      { t: 'Rendez-les, et madame Gendron vous fera un bon prix sur le prochain chargement.', go: 'hans.deal', best: true },
      { t: 'Rendez-les, ou j\'appelle la garde.', go: 'hans.threat' },
    ] },
  ],
  'hans.deal': [
    ['hans', "Un bon prix ? Vous parlez comme un Amsterdammer ! Tenez, reprenez-les, et que je n'en entende plus parler. Saluez madame Gendron pour moi."],
    { do: [['give', 'plans-vauban'], ['rep', 10], ['flag', 'hans_ami']] },
  ],
  'hans.threat': [
    ['hans', 'Pas la garde ! Tenez, tenez, prenez-les. Mais je m\'en souviendrai, de l\'hospitalité française.'],
    { do: [['give', 'plans-vauban'], ['rep', -5]] },
  ],
  'vauban.m4': [
    ['vauban', "Mes plans ! Intacts ! Vous m'avez rendu trois semaines de vie. Je vous en dois au moins autant."],
    ['vauban', "Mais puisque vous êtes géomètre, voyons si vous comprenez ce que vous m'avez rapporté."],
    { do: [['riddle', 'r-bastion']] },
  ],
  'vauban.m4b': [
    ['vauban', "Bien. Maintenant, aidez-moi à reporter le tracé sur le terrain, au bastion de l'est. Plantez les trois jalons aux endroits marqués d'un piquet rouge : les maçons suivront nos lignes."],
  ],
  'vauban.m4c': [
    ['vauban', "Parfait. Le tracé est sur le terrain. Dans dix ans, ces lignes seront des murs de pierre de dix mètres de haut."],
    ['vauban', "J'ai bâti ou remanié plus de cent places fortes, savez-vous. Mais je crois que je me souviendrai de celle-ci. Et de vous."],
    { do: [['flag', 'xvii_plans'], ['codex', 'perso-vauban']] },
  ],
  'laroque.m5': [
    ['laroque', "Vous tombez bien. Une frégate anglaise a été aperçue au large du Fier, à l'aube. Elle longe la côte pour tâter nos défenses, comme en 1627."],
    ['laroque', "La batterie du front de mer manque de poudre. Allez chercher deux barils à l'arsenal de la citadelle et portez-les au maître canonnier Brisseau. Vite !"],
  ],
  'canonnier.m5': [
    ['canonnier', "De la poudre ! Juste à temps. Aidez-moi à charger les trois pièces : la gargousse, le boulet, le bourrage. Et hissez l'étendard royal sur la citadelle : qu'ils sachent à qui ils ont affaire."],
  ],
  'laroque.m5b': [
    ['narr', "Un coup de semonce part de la batterie et soulève une gerbe d'eau devant la frégate. Sur le pont, des silhouettes s'agitent. Lentement, le navire anglais vire de bord et s'éloigne vers le large."],
    ['laroque', "Ha ! Ils ont compris. La flotte anglaise n'a pas oublié la leçon de 1627. Le roi saura que la batterie a tenu bon."],
    { do: [['fn', (api) => removeFrigate(api)]] },
  ],
  'ambroise.m6': [
    ['ambroise', "Entrez, entrez. On m'a dit que vous aviez rendu ses plans au sieur de Vauban. Et ce disque que vous portez… je l'ai reconnu à travers ma vitrine."],
    ['ambroise', "Je suis horloger, comme mon père et le père de mon père. Et, comme eux, gardien. L'éclat qui m'a été confié dort dans le mécanisme de l'horloge de l'église : quel meilleur endroit pour une pièce du temps ?"],
    ['ambroise', "Mais le gentilhomme en gris est monté au clocher, la nuit dernière. Il n'a pas trouvé l'éclat, mais il a arraché trois roues de la minuterie pour arrêter l'horloge. Toute la ville vit à l'heure de midi depuis !"],
    ['ambroise', "Retrouvez mes trois roues : une est restée à l'atelier, une autre doit traîner au pied du clocher, et le galopin qui l'a vu fuir parle d'une caisse sur le quai."],
  ],
  'ambroise.m6b': [
    ['ambroise', "Mes roues ! Voyons… elles sont intactes. Montons ensemble au clocher. Je vous montrerai."],
  ],
  'horloge.fin': [
    ['narr', "Dans la chambre de l'horloge, au cœur du clocher, les poids pendent au bout de leurs cordes. Ambroise remet les roues en place, et tu tiens la lanterne."],
    ['ambroise', "Encore une question, jeune homme — ou jeune femme, je ne vois plus très bien."],
    { do: [['riddle', 'r-horloge']] },
  ],
  'ambroise.m7': [
    ['ambroise', "L'horloge bat de nouveau. Mais le gentilhomme en gris rôde encore : on l'a vu ce soir, sur le bastion de l'ouest, à la tombée du jour. Il guette."],
    ['ambroise', "Allez le trouver. Moi, je récupère l'éclat dans le mécanisme. Revenez me voir ensuite."],
  ],
  'grisval.final': [
    ['grisval', "Tiens donc. Le petit géomètre de Vauban. Vous avez rendu les plans, remis l'horloge en marche… Vous me gênez beaucoup, savez-vous."],
    ['me', "Qui êtes-vous vraiment ? Vous ne venez pas de ce siècle."],
    ['grisval', "Ni vous. Écoutez : je peux vous rendre riche, à n'importe quelle époque. Donnez-moi les éclats que vous portez, et vous aurez tout l'or que vous voudrez."],
    { choice: [
      { t: "La mémoire de l'île ne se vend pas.", go: 'grisval.refuse', best: true },
      { t: "Pourquoi voulez-vous les fragments ?", go: 'grisval.why' },
    ] },
  ],
  'grisval.why': [
    ['grisval', "Pour réparer une injustice vieille de deux siècles. Ma famille a tout perdu, parce que l'histoire l'a décidé. Moi, je décide de réécrire l'histoire."],
    { go: 'grisval.refuse' },
  ],
  'grisval.refuse': [
    ['grisval', "Comme vous voudrez. Nous nous reverrons… à une autre heure."],
    ['narr', "L'homme en gris recule vers le parapet. L'air se trouble autour de lui comme au-dessus d'un brasier, et il disparaît. Quelque chose tombe sur les pavés avec un petit bruit métallique."],
    { do: [['flag', 'grisval_gone']] },
  ],
  'ambroise.m7b': [
    ['ambroise', "Une montre… à porter au poignet ? Et ce verre, si plat, si clair… Aucun horloger de ce siècle ne sait faire cela. Pas même à Genève."],
    ['ambroise', "Voici l'éclat. Il battait dans le mécanisme comme un second balancier. Emportez-le, et que le temps vous soit favorable."],
    { do: [['give', 'fragment-xvii'], ['unlock', 'xix'], ['rep', 25], ['flag', 'frag_xvii']] },
    ['voice', "Le cinquième éclat retrouve sa place. Le temps suivant est celui de l'or blanc, à Ars, quand les marais salants couvraient l'île."],
  ],
  // ---------- secondaires ----------
  'toinette.offer': [
    ['toinette', "Viens là, que je te raconte. En 1627, j'avais sept ans. Les Anglais du duc de Buckingham ont débarqué à Sablanceaux et assiégé la citadelle pendant trois mois."],
    ['toinette', "Mon père était parmi les défenseurs du maréchal de Toiras. Il avait reçu une médaille. Je l'ai perdue hier, près des ruines du vieux fort, en allant cueillir du fenouil. Tu voudrais bien la chercher ?"],
    { choice: [{ t: 'Bien sûr, Toinette.', do: [['start', 'xvii.s1']] }, { t: 'Plus tard.', end: true }] },
  ],
  'toinette.s1': [
    ['toinette', "Elle est là… La médaille de mon père. On a mangé les chevaux, les chiens, puis le cuir des ceintures, pendant ce siège. Et puis les barques de Richelieu ont forcé le blocus, une nuit d'octobre."],
    ['toinette', "Les Anglais sont repartis. Mais on n'a jamais oublié. Merci, mon petit."],
  ],
  'toinette.offer2': [
    ['toinette', "Les soldats de garde à la porte n'ont pas eu leur pain ce matin, et mon commis est malade. Tu leur portes ? Trois pains de munition."],
    { choice: [{ t: "J'y vais.", do: [['start', 'xvii.s2'], ['give', 'pain-regiment']] }, { t: 'Pas maintenant.', end: true }] },
  ],
  'sentinelle.s2': [['sentinelle', 'Du pain ! Dieu vous bénisse. Depuis l\'aube, on monte la garde le ventre vide.']],
  'marguerite.offer': [
    ['marguerite', "Mon commis s'est encore embrouillé dans les comptes du capitaine van der Berg. Vous qui semblez instruit, pourriez-vous les vérifier ?"],
    { choice: [{ t: 'Montrez-moi le livre.', do: [['start', 'xvii.s3']] }, { t: 'Les chiffres et moi…', end: true }] },
  ],
  'marguerite.s3': [['marguerite', 'Quarante-deux livres. Je savais bien que mon commis me volait… de trois livres ! Tenez, pour votre peine.']],
  'gilles.offer': [
    ['gilles', "Mon fils, la cloche de l'église est muette depuis l'orage. Le battant s'est décroché et il est tombé au pied du clocher. Il est bien trop lourd pour mes vieux bras."],
    { choice: [{ t: 'Je vais vous le rapporter.', do: [['start', 'xvii.s4']] }, { t: 'Une autre fois, mon père.', end: true }] },
  ],
  'gilles.s4': [['gilles', "Le battant ! Le sonneur le remontera ce soir. Vous entendrez sonner l'angélus : ce sera un peu pour vous."]],
  'hans.offer': [
    ['hans', "Dites, vous connaissez le vin de l'île ? On dit qu'il est léger comme une brise. Rapportez-m'en une bouteille du Tonneau d'Or, je vous la paierai bien."],
    { choice: [{ t: 'Volontiers, capitaine.', do: [['start', 'xvii.s5']] }, { t: 'Non merci.', end: true }] },
  ],
  'hans.s5': [
    ['hans', "Mmm… Clairet, fruité, un peu salé, comme le vent d'ici. Les Hollandais emportent votre sel, votre vin et votre eau-de-vie. Nous, nous apportons le bois, le blé et le fromage de Hollande."],
    ['hans', 'Tenez, un carreau de Delft, pour votre maison. Un moulin, comme chez nous.'],
  ],
  // ---------- conversations ----------
  'vauban.chat': [['vauban', (S2) => (S2.done('xvii.m4') ? 'La pierre se souviendra de votre aide. Moi aussi.' : 'Une place bien fortifiée épargne le sang des soldats.')]],
  'laroque.chat': [['laroque', 'Garde à vous ! … Ah, c\'est vous. Repos.']],
  'sentinelle.chat': [['sentinelle', 'Circulez, circulez.']],
  'ambroise.chat': [['ambroise', 'Tic… tac… Le temps est un mécanisme. Il faut l\'entretenir.']],
  'marguerite.chat': [['marguerite', "Un bon contrat vaut mieux qu'un bon canon. Vous voulez voir ma marchandise ?"], { do: [['shop', 'tonneau']] }],
  'hans.chat': [['hans', (S2) => (S2.flag('hans_ami') ? 'Mon ami ! Le sel est chargé, nous partons pour Amsterdam à la marée.' : 'Goedemorgen.')]],
  'toinette.chat': [['toinette', 'Pain chaud, pain de froment !'], { do: [['shop', 'boulangerie']] }],
  'gilles.chat': [['gilles', 'Que Dieu garde l\'île de Ré.']],
  'canonnier.chat': [['canonnier', 'Ne fumez pas près de la poudre, nom d\'un chien !']],
};

// La frégate anglaise au large pendant la quête « Voiles anglaises »
function spawnFrigate(api) {
  if (api.world.eraGroup.getObjectByName('fregate')) return;
  const f = buildBoat('frigate');
  f.name = 'fregate';
  const s = api.world.spots.batterie;
  f.position.set(s.x - 20, 0.1, s.z - 70);
  f.rotation.y = Math.PI / 2;
  f.userData.noBatch = true;
  f.userData.bob = 1;
  api.world.eraGroup.add(f);
  api.world.animated.push({ obj: f, kind: 'bob' });
}
function removeFrigate(api) {
  const f = api.world.eraGroup.getObjectByName('fregate');
  if (!f) return;
  const t0 = performance.now();
  api.world.animated.push({ obj: f, kind: 'custom', update: () => {
    const k = (performance.now() - t0) / 1000;
    f.position.x -= 0.15;
    f.position.z -= 0.08;
    if (k > 20) f.visible = false;
  } });
}

const quests = [
  { id: 'xvii.m1', main: true, auto: true, chapter: 4, title: 'La ville de Saint-Martin', desc: 'En 1681, Saint-Martin se prépare à recevoir sa nouvelle enceinte.',
    steps: [
      { id: 'garde', type: 'talk', npc: 'sentinelle', dialogue: 'sentinelle.m1', text: 'Présente-toi à la sentinelle de la porte Toiras.' },
      { id: 'capitaine', type: 'talk', npc: 'laroque', dialogue: 'laroque.m1', text: 'Trouve le capitaine de La Roque.' },
    ],
    rewards: { xpHist: 40, money: 5, rep: 5 }, next: 'xvii.m2' },
  { id: 'xvii.m2', main: true, title: 'Les plans volés', desc: 'Les plans de la nouvelle enceinte ont disparu de la table de Vauban.',
    steps: [
      { id: 'vauban', type: 'talk', npc: 'vauban', dialogue: 'vauban.m2', text: 'Rencontre Vauban sous sa tente, au bastion sud-ouest.' },
      { id: 'indices', type: 'interact', text: 'Cherche des indices : tente, chantier, port.', targets: [
        { key: 'boue', at: ['table', 1.5, 1.8], label: 'Examiner les traces dans la boue', anim: 'crouch', duration: 1.4, text: "Des empreintes de souliers à talons fins, pas des bottes de soldat. Elles filent vers la Grande Rue." },
        { key: 'drap', at: ['chantier', 1, 1], label: "Examiner le lambeau de drap gris", anim: 'inspect', duration: 1.2, text: "Un morceau de drap gris, très fin, accroché à un clou de l'échafaudage. Un tissu étrange, presque brillant : rien de ce qu'on tisse ici." },
        { key: 'page', at: ['quai', -4, 0.5], model: 'page', label: 'Ramasser la page tombée', anim: 'inspect', duration: 1, text: "Une demi-feuille déchirée : un angle de bastion à l'encre, et l'initiale « V ». Le voleur est passé par le quai." },
      ] },
      { id: 'toinette', type: 'talk', npc: 'toinette', dialogue: 'toinette.m2', text: 'Interroge Toinette, la boulangère : elle voit passer tout le monde.' },
    ],
    rewards: { xpHist: 60, money: 5, rep: 10 }, next: 'xvii.m3' },
  { id: 'xvii.m3', main: true, title: 'Le négoce du sel', desc: 'Pour récupérer les plans, il faut gagner la confiance d\'un capitaine hollandais.',
    steps: [
      { id: 'marguerite', type: 'talk', npc: 'marguerite', dialogue: 'marguerite.m3', text: "Rends visite à Marguerite Gendron, au Tonneau d'Or." },
      { id: 'barriques', type: 'collect', item: 'tonneau-sel', count: 3, text: "Prends 3 barriques de sel à l'entrepôt de l'îlot.", label: 'Charger la barrique',
        spawns: [['ilot', -3.5, 0.8], ['ilot', 0, -0.6], ['ilot', 3.5, 0.8]] },
      { id: 'hans', type: 'deliver', npc: 'hans', item: 'tonneau-sel', count: 3, dialogue: 'hans.m3', text: 'Livre le sel au capitaine Hans, sur le quai.' },
    ],
    rewards: { xpExpl: 50, money: 8, codex: ['histoire-sel-xvii'] }, next: 'xvii.m4' },
  { id: 'xvii.m4', main: true, title: 'Le tracé de Vauban', desc: 'Rendre les plans, et aider Vauban à tracer les fortifications.',
    steps: [
      { id: 'rendre', type: 'deliver', npc: 'vauban', item: 'plans-vauban', count: 1, take: false, dialogue: 'vauban.m4', text: 'Rapporte les plans à Vauban.' },
      { id: 'consigne', type: 'talk', npc: 'vauban', dialogue: 'vauban.m4b', text: 'Écoute les consignes de Vauban.' },
      { id: 'jalons', type: 'interact', text: 'Plante les 3 jalons du tracé, au bastion de l\'est.', targets: [
        { key: 'j1', at: 'jalon1', model: 'stake', label: 'Planter le jalon', anim: 'hammer', duration: 1.6 },
        { key: 'j2', at: 'jalon2', model: 'stake', label: 'Planter le jalon', anim: 'hammer', duration: 1.6 },
        { key: 'j3', at: 'jalon3', model: 'stake', label: 'Planter le jalon', anim: 'hammer', duration: 1.6 },
      ] },
      { id: 'vauban', type: 'talk', npc: 'vauban', dialogue: 'vauban.m4c', text: 'Retourne voir Vauban.' },
    ],
    rewards: { xpHist: 90, money: 10, rep: 15, codex: ['lieu-saintmartin'] }, next: 'xvii.m5' },
  { id: 'xvii.m5', main: true, title: 'Voiles anglaises', desc: 'Une frégate anglaise longe la côte. La batterie doit être prête.',
    steps: [
      { id: 'capitaine', type: 'talk', npc: 'laroque', dialogue: 'laroque.m5', text: 'Le capitaine de La Roque te cherche.', onDone: [['fn', (api) => spawnFrigate(api)]] },
      { id: 'poudre', type: 'collect', item: 'poudre', count: 2, text: "Prends 2 barils de poudre à l'arsenal de la citadelle.", label: 'Prendre le baril de poudre',
        spawns: [['arsenal', -1, 0.8], ['arsenal', 1, 0.8]] },
      { id: 'canonnier', type: 'deliver', npc: 'canonnier', item: 'poudre', count: 2, dialogue: 'canonnier.m5', text: 'Apporte la poudre au maître canonnier, à la batterie.' },
      { id: 'charger', type: 'interact', text: "Charge les 3 canons et hisse l'étendard royal.", targets: [
        { key: 'c0', at: 'canon0', label: 'Charger le canon', anim: 'carry', duration: 1.6 },
        { key: 'c1', at: 'canon1', label: 'Charger le canon', anim: 'carry', duration: 1.6 },
        { key: 'c2', at: 'canon2', label: 'Charger le canon', anim: 'carry', duration: 1.6 },
        { key: 'flag', at: 'drapeau', label: "Hisser l'étendard royal", anim: 'cheer', duration: 1.6 },
      ] },
      { id: 'fin', type: 'talk', npc: 'laroque', dialogue: 'laroque.m5b', text: 'Fais ton rapport au capitaine de La Roque.' },
    ],
    rewards: { xpExpl: 70, money: 10, rep: 20, codex: ['histoire-guerres-maritimes'] }, next: 'xvii.m6' },
  { id: 'xvii.m6', main: true, title: "L'horloger", desc: "Le gentilhomme en gris a saboté l'horloge de l'église.",
    steps: [
      { id: 'ambroise', type: 'talk', npc: 'ambroise', dialogue: 'ambroise.m6', text: 'Maître Ambroise, l\'horloger, veut te parler.' },
      { id: 'roues', type: 'collect', item: 'engrenage', count: 3, text: "Retrouve les 3 roues d'horlogerie.", label: 'Ramasser la roue',
        spawns: [['horloger', 1.8, 0.9], ['clocher', -1.5, 1], ['quai-est', 2, 0.5]] },
      { id: 'rendre', type: 'deliver', npc: 'ambroise', item: 'engrenage', count: 3, dialogue: 'ambroise.m6b', text: 'Rapporte les roues à Ambroise.' },
      { id: 'clocher', type: 'interact', text: "Répare l'horloge dans le clocher avec Ambroise.", targets: [
        { key: 'horloge', at: 'clocher', label: "Remonter la minuterie de l'horloge", anim: 'hammer', duration: 2.6, dialogue: 'horloge.fin', codex: 'metier-horloger' },
      ] },
    ],
    rewards: { xpHist: 80, money: 8, rep: 15 }, next: 'xvii.m7' },
  { id: 'xvii.m7', main: true, title: 'Le gentilhomme en gris', desc: 'Affronter le sieur de Grisval.',
    steps: [
      { id: 'ambroise', type: 'talk', npc: 'ambroise', dialogue: 'ambroise.m7', text: 'Écoute maître Ambroise.' },
      { id: 'grisval', type: 'talk', npc: 'grisval', dialogue: 'grisval.final', text: "Trouve le gentilhomme en gris sur le bastion de l'ouest." },
      { id: 'montre', type: 'collect', item: 'ana-montre', count: 1, text: "Ramasse l'objet qu'il a laissé tomber.", label: "Ramasser l'objet", spawns: [['bastion0', 0.8, 0.6]] },
      { id: 'ambroise2', type: 'talk', npc: 'ambroise', dialogue: 'ambroise.m7b', text: 'Retourne voir maître Ambroise.' },
    ],
    rewards: { xpHist: 150, xpExpl: 50, rep: 20 } },
  // ---------- secondaires ----------
  { id: 'xvii.s1', giver: 'toinette', offer: 'toinette.offer', title: 'Souvenirs du siège', desc: 'Toinette a perdu la médaille de son père, défenseur de 1627.',
    steps: [
      { id: 'medaille', type: 'collect', item: 'medaille', count: 1, text: 'Cherche la médaille près des ruines du vieux fort.', label: 'Ramasser la médaille', spawns: [['vieux-fort', 1.5, 1]] },
      { id: 'rendre', type: 'deliver', npc: 'toinette', item: 'medaille', count: 1, dialogue: 'toinette.s1', text: 'Rends la médaille à Toinette.' },
    ],
    rewards: { xpHist: 50, money: 4, rep: 10, codex: ['histoire-siege-1627'] } },
  { id: 'xvii.s2', giver: 'toinette', offer: 'toinette.offer2', title: 'Le pain du régiment', desc: 'Porter leur pain aux soldats de garde.',
    requires: ['xvii.s1'],
    steps: [{ id: 'livrer', type: 'deliver', npc: 'sentinelle', item: 'pain-regiment', count: 1, dialogue: 'sentinelle.s2', text: 'Porte les pains à la sentinelle de la porte Toiras.' }],
    rewards: { xpExpl: 20, money: 3, rep: 5 } },
  { id: 'xvii.s3', giver: 'marguerite', offer: 'marguerite.offer', title: 'Les comptes de Marguerite', desc: 'Vérifier un livre de comptes en livres et en sols.',
    requires: ['xvii.m3'],
    steps: [
      { id: 'calcul', type: 'interact', text: 'Vérifie le livre de comptes, sur le comptoir.', targets: [{ key: 'livre', at: ['tonneau', 1.2, 0], model: 'page', label: 'Lire le livre de comptes', anim: 'read', duration: 1, riddle: 'r-comptes' }] },
      { id: 'marguerite', type: 'talk', npc: 'marguerite', dialogue: 'marguerite.s3', text: 'Donne le résultat à Marguerite.' },
    ],
    rewards: { xpHist: 40, money: 6 } },
  { id: 'xvii.s4', giver: 'gilles', offer: 'gilles.offer', title: 'La cloche muette', desc: "Le battant de la cloche est tombé.",
    steps: [
      { id: 'battant', type: 'collect', item: 'battant', count: 1, text: 'Ramasse le battant au pied du clocher.', label: 'Soulever le battant', spawns: [['clocher', -1, -2]] },
      { id: 'rendre', type: 'deliver', npc: 'gilles', item: 'battant', count: 1, dialogue: 'gilles.s4', text: "Rapporte le battant à l'abbé Gilles." },
    ],
    rewards: { xpExpl: 25, money: 3, rep: 10 } },
  { id: 'xvii.s5', giver: 'hans', offer: 'hans.offer', title: 'Le vin pour Amsterdam', desc: 'Faire goûter le vin de l\'île au capitaine hollandais.',
    requires: ['xvii.m3'],
    steps: [
      { id: 'acheter', type: 'collect', item: 'bouteille-vin', count: 1, text: "Achète une bouteille de vin au Tonneau d'Or." },
      { id: 'livrer', type: 'deliver', npc: 'hans', item: 'bouteille-vin', count: 1, dialogue: 'hans.s5', text: 'Apporte la bouteille à Hans.' },
    ],
    rewards: { xpExpl: 30, money: 4, items: ['carreau-delft'] } },
];

const codex = {
  'perso-vauban': { cat: 'personnages', era: ERA, title: 'Vauban (1633-1707)',
    text: "Sébastien Le Prestre de Vauban, ingénieur militaire de Louis XIV et maréchal de France, a bâti ou remanié plus de 160 places fortes. Il mène aussi 53 sièges, invente des méthodes d'attaque par tranchées et réfléchit aux impôts et à la misère du peuple. En 1681, il dessine l'enceinte de Saint-Martin-de-Ré. Douze de ses sites sont inscrits à l'UNESCO depuis 2008." },
  'perso-ambroise': { cat: 'personnages', era: ERA, title: 'Maître Ambroise Lenoir, horloger',
    text: "Troisième d'une lignée d'horlogers de Saint-Martin, Ambroise entretient l'horloge de l'église et les pendules des notables. Son père lui a transmis un secret : un éclat de « l'horloge des marées », qu'il cache dans le mécanisme de l'église." },
  'perso-marguerite': { cat: 'personnages', era: ERA, title: 'Marguerite Gendron, négociante',
    text: "Veuve d'un armateur, Marguerite tient seule le Tonneau d'Or et négocie avec les capitaines hollandais, anglais et nordiques. Au XVIIᵉ siècle, de nombreuses femmes de marchands dirigent les affaires familiales dans les ports de l'Atlantique." },
  'lieu-saintmartin': { cat: 'lieux', era: ERA, title: 'Les fortifications de Saint-Martin',
    text: "Construite à partir de 1681 sur les plans de Vauban, l'enceinte de Saint-Martin forme une étoile de bastions de 2 km de long, percée de deux portes monumentales (Toiras et Campani). La citadelle, achevée en 1685, servira plus tard de bagne : de 1873 à 1938, les forçats y attendaient leur départ pour la Guyane ou la Nouvelle-Calédonie. L'ensemble est inscrit au patrimoine mondial de l'UNESCO." },
  'histoire-vauban-re': { cat: 'histoire', era: ERA, title: "Pourquoi fortifier l'île ?",
    text: "L'île de Ré commande l'entrée de La Rochelle et des pertuis. En 1627, les Anglais du duc de Buckingham y débarquent pour soutenir les protestants rochelais. Après leur échec, Richelieu prend La Rochelle (1628). Sous Louis XIV, les guerres contre l'Angleterre et la Hollande font craindre de nouveaux débarquements : Vauban est chargé de rendre l'île imprenable." },
  'histoire-siege-1627': { cat: 'histoire', era: ERA, title: 'Le siège de 1627',
    text: "En juillet 1627, 6 000 soldats anglais commandés par le duc de Buckingham débarquent à Sablanceaux et assiègent la citadelle de Saint-Martin, défendue par le maréchal de Toiras. Affamés, les défenseurs tiennent trois mois, jusqu'à ce qu'une flottille de barques force le blocus en octobre. Buckingham, battu, rembarque en novembre." },
  'histoire-hollandais': { cat: 'histoire', era: ERA, title: 'Les Hollandais et le sel de Ré',
    text: "Au XVIIᵉ siècle, les Provinces-Unies (Hollande) dominent le commerce maritime européen. Leurs flûtes, navires de charge économiques, viennent chaque année charger le sel de Ré et de Brouage, indispensable pour saler les harengs de la mer du Nord. En échange arrivent bois, blé, toiles et fromages." },
  'histoire-sel-xvii': { cat: 'histoire', era: ERA, title: "L'or blanc au Grand Siècle",
    text: "Le sel de Ré, blanc et réputé, s'exporte dans toute l'Europe du Nord. Le roi le taxe par la gabelle, impôt très impopulaire, dont les provinces de l'Ouest sont en partie exemptées (« pays rédimés »). Des fortunes de négociants se bâtissent à Saint-Martin et à Ars." },
  'histoire-guerres-maritimes': { cat: 'histoire', era: ERA, title: 'Les guerres maritimes',
    text: "Entre 1652 et 1713, France, Angleterre et Hollande se disputent la maîtrise des mers. Colbert crée une puissante marine de guerre et fait fortifier les côtes. Batteries côtières, forts et tours à signaux surveillent les pertuis charentais, à proximité de l'arsenal de Rochefort fondé en 1666." },
  'vie-fortification': { cat: 'vie', era: ERA, title: 'La fortification bastionnée',
    text: "Inventé en Italie au XVIᵉ siècle pour résister à l'artillerie, le système bastionné remplace les hautes tours rondes par des murs bas et épais, précédés de fossés, et des bastions en pointe qui se protègent mutuellement par des tirs croisés (« flanquement »). Vauban le perfectionne en l'adaptant au terrain." },
  'vie-soldat-xvii': { cat: 'vie', era: ERA, title: 'Les soldats de Louis XIV',
    text: "L'infanterie royale porte le justaucorps gris-blanc, avec revers et parements aux couleurs du régiment, le chapeau de feutre et le mousquet. Le régiment de Navarre est l'un des plus anciens. Les soldats logent souvent chez l'habitant, avant que les casernes de Vauban ne se généralisent." },
  'vie-monnaie-ancien-regime': { cat: 'vie', era: ERA, title: 'Livres, sols et deniers',
    text: "Sous l'Ancien Régime, on compte en livres tournois : 1 livre = 20 sols (ou sous), 1 sol = 12 deniers. Les pièces réelles (louis d'or, écus d'argent, liards de cuivre) ont des valeurs fixées par le roi. Le système décimal (franc, centimes) ne sera adopté qu'en 1795." },
  'metier-horloger': { cat: 'metiers', era: ERA, title: "L'horloger",
    text: "L'horloger fabrique et entretient horloges et montres. Au XVIIᵉ siècle, l'invention du pendule (Huygens, 1656) puis du ressort spiral rend les horloges bien plus précises. Les clochers portent de grandes horloges à poids, remontées chaque jour, qui rythment la vie de la ville." },
};

export default {
  era: ERA, npcs, extras, items, shops, riddles, dialogues, quests, codex,
  onEnter(api) {
    const q = api.quests.st('xvii.m5');
    if (q?.status === 'active' && q.step >= 1) spawnFrigate(api);
  },
};

export { S, THREE };
