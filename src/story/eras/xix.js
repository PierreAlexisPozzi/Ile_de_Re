// CHAPITRE 5 — L'OR BLANC, 1862 — Ars-en-Ré, sous le Second Empire.
// Les cours du sel s'effondrent. Ernest Lescure, négociant ruiné, est
// tenté de vendre à un mystérieux « M. Gris » l'éclat que sa famille garde.
// Jeanne Bouyer, saunière, Auguste Borel, patron de la gabarre Sainte-Anne,
// et une institutrice qui veut ouvrir une école de filles.

import { look, HAIR, EYES, SKIN } from '../../characters/wardrobe.js';
import { buildBoat } from '../../world/builder.js';

const ERA = 'xix';

const npcs = [
  {
    id: 'jeanne', name: 'Jeanne Bouyer', title: 'Saunière, gardienne', codex: 'perso-jeanne',
    look: look(ERA, 'sauniere', { eyes: EYES.green, face: { freckles: true } }),
    home: 'marais',
    routine: [
      { from: 6, to: 12, at: 'oeillet0', action: 'rake' },
      { from: 12, to: 14, at: 'marais', action: 'idle' },
      { from: 14, to: 19, at: 'oeillet1', action: 'rake' },
      { from: 19, to: 6, at: 'maison-jeanne', action: 'idle' },
    ],
    barks: ['Le sel, ça se cueille comme une fleur.', 'Pas de vent, pas de sel.', 'Trois mois que Lescure ne nous paie plus…'],
    talk: 'jeanne.chat',
  },
  {
    id: 'ernest', name: 'Ernest Lescure', title: 'Négociant en sels', codex: 'perso-ernest',
    look: look(ERA, 'gentleman', { hair: { style: 'sidepart', color: HAIR.dark }, beard: { style: 'short', color: HAIR.dark }, eyes: EYES.grey,
      face: { expression: 'worried' }, outfit: { coat: { c: 0x2a2a30, p: 'wool', len: 0.6, gap: 0.4 }, bottom: { c: 0x3a3438, p: 'pinstripe', c2: 0x5a5458 } },
      hat: { type: 'tophat', c: 0x1a1a1c }, props: { right: null } }),
    when: (s) => !s.done('xix.m5'),
    home: 'lescure:keeper',
    routine: [
      { from: 7, to: 19, at: 'lescure:keeper', action: 'write' },
      { from: 19, to: 22, at: ['quai', -1, 0.4], action: 'idle' },
      { from: 22, to: 7, at: 'lescure:keeper', action: 'read' },
    ],
    barks: ['Douze francs la tonne… c\'est la ruine.', 'Le chemin de fer nous tuera tous.', 'Ces comptes ne tombent jamais juste.'],
    talk: 'ernest.chat',
  },
  {
    id: 'borel', name: 'Auguste Borel', title: 'Patron de la gabarre « Sainte-Anne »', codex: 'perso-borel',
    look: look(ERA, 'captain', { hair: { style: 'short', color: HAIR.chestnut }, beard: { style: 'full', color: HAIR.auburn }, eyes: EYES.blue }),
    home: 'gabarre',
    routine: [
      { from: 5, to: 20, at: 'gabarre', action: 'idle' },
      { from: 20, to: 23, at: 'cafe', action: 'drink' },
      { from: 23, to: 5, at: 'gabarre', action: 'sit' },
    ],
    barks: ['Vent de noroît, mer belle demain.', 'La Sainte-Anne a quarante ans et pas une voie d\'eau.', 'Nantes en deux jours, si le vent veut bien.'],
    talk: 'borel.chat',
  },
  {
    id: 'maire', name: 'Monsieur Rivaille', title: "Maire d'Ars", codex: 'vie-second-empire',
    look: look(ERA, 'mayor'),
    home: 'mairie',
    routine: [{ from: 8, to: 18, at: 'mairie', action: 'idle' }, { from: 18, to: 8, at: ['place', 1, 2], action: 'idle' }],
    barks: ['Ars, première commune salinière de l\'île !', 'L\'Empereur a des projets pour nos côtes.', 'Ah, les finances communales…'],
    talk: 'maire.chat',
  },
  {
    id: 'firmin', name: 'Firmin', title: 'Garde champêtre',
    look: look(ERA, 'douanier', { age: 'old', hair: { style: 'short', color: HAIR.grey }, beard: { style: 'mustache', color: HAIR.grey }, face: { expression: 'smile' },
      outfit: { top: { c: 0x2a3450, p: 'wool' }, coat: { c: 0x2a3450, p: 'wool', len: 0.35, gap: 0.0 }, bottom: { c: 0x2a3450, p: 'wool' },
        collar: { type: 'stand', c: 0x2a3450 }, baldric: { c: 0xd8c8a0, p: 'leather' } },
      hat: { type: 'kepi', c: 0x2a3450, c2: 0xc8a050 } }),
    home: 'entree',
    routine: [{ from: 6, to: 21, at: 'entree', action: 'guard' }, { from: 21, to: 6, at: 'croisement', action: 'idle' }],
    barks: ['Au nom de la loi !', 'On ne laisse pas divaguer ses ânes dans les vignes.', 'Rien à signaler, comme toujours.'],
    talk: 'firmin.chat',
  },
  {
    id: 'lefort', name: 'Brigadier Lefort', title: 'Douanier', codex: 'vie-douane',
    look: look(ERA, 'douanier'),
    home: 'douane',
    routine: [{ from: 6, to: 14, at: 'douane', action: 'guard' }, { from: 14, to: 20, at: 'quai-ouest', action: 'lookout' }, { from: 20, to: 6, at: 'douane', action: 'idle' }],
    barks: ['Rien à déclarer ?', 'Le sel ne sort pas d\'ici sans acquit.', 'Les fraudeurs passent par les marais, la nuit.'],
    talk: 'lefort.chat',
  },
  {
    id: 'aubineau', name: 'Mademoiselle Aubineau', title: 'Institutrice', codex: 'histoire-ecole-xix',
    look: look(ERA, 'teacher'),
    home: 'ecole',
    routine: [{ from: 7, to: 18, at: 'ecole', action: 'read' }, { from: 18, to: 7, at: ['croisement', -4, 0.4], action: 'idle' }],
    barks: ['Les filles aussi ont droit à l\'instruction.', 'Lire, écrire, compter : voilà la vraie liberté.', 'Il me faudrait des ardoises…'],
    talk: 'aubineau.chat',
  },
  {
    id: 'mathurin', name: 'Père Mathurin', title: 'Pêcheur à pied', codex: 'histoire-ecluses',
    look: look(ERA, 'fisherman'),
    home: 'estran',
    routine: [{ from: 5, to: 13, at: 'estran', action: 'fish' }, { from: 13, to: 20, at: ['quai', 2, 0], action: 'sit' }, { from: 20, to: 5, at: ['quai', 2, 0], action: 'idle' }],
    barks: ['À marée basse, l\'écluse donne toujours.', 'De mon temps, on prenait des bars gros comme ça.', 'Le Fier, c\'est mon jardin.'],
    talk: 'mathurin.chat',
  },
  {
    id: 'rivaud', name: 'Madame Rivaud', title: 'Épicière',
    look: look(ERA, 'grocer'),
    home: 'epicerie:keeper',
    routine: [{ from: 6, to: 20, at: 'epicerie:keeper', action: 'idle' }, { from: 20, to: 6, at: 'epicerie:keeper', action: 'write' }],
    barks: ['Café, sucre, chandelles, fil et aiguilles !', 'Le café vient des îles, ma petite dame.', 'On fait crédit… jusqu\'à la récolte.'],
    talk: 'rivaud.chat',
  },
  {
    id: 'delpech', name: 'Monsieur Delpech', title: 'Photographe ambulant', codex: 'vie-photographie',
    look: look(ERA, 'gentleman', { hair: { style: 'curly', color: HAIR.dark }, beard: { style: 'goatee', color: HAIR.dark },
      outfit: { top: { c: 0x5a2a2a, p: 'velvet' }, coat: { c: 0x3a3a3e, p: 'velvet', len: 0.4, gap: 0.45 } }, hat: { type: 'beret', c: 0x1a1a1a }, props: { right: null } }),
    home: 'photographe',
    routine: [{ from: 8, to: 19, at: 'photographe', action: 'inspect' }, { from: 19, to: 8, at: 'hotel', action: 'idle' }],
    barks: ['Ne bougez plus !', 'La lumière de l\'île est la plus belle de France.', 'Dix secondes d\'immobilité, et vous voilà éternel.'],
    talk: 'delpech.chat',
  },
  {
    id: 'pierrot', name: 'Pierrot', title: 'Mousse de la Sainte-Anne',
    look: look(ERA, 'mousse'),
    home: 'quai',
    routine: [{ from: 6, to: 21, at: ['gabarre', 1.4, 0.6], action: 'carry' }, { from: 21, to: 6, at: ['gabarre', 1.4, 0.6], action: 'sit' }],
    barks: ['Un jour, je serai patron de gabarre !', 'Le patron Borel sait tout de la mer.', 'Vous avez vu l\'âne en culotte ?'],
    talk: 'pierrot.chat',
  },
  {
    id: 'gardien', name: 'Le gardien du phare', title: 'Phare des Baleines',
    look: look(ERA, 'captain', { age: 'old', hair: { style: 'short', color: HAIR.white }, beard: { style: 'full', color: HAIR.white }, hat: { type: 'cap', c: 0x1c2438 } }),
    home: 'phare',
    routine: [{ from: 0, to: 24, at: 'phare', action: 'lookout' }],
    barks: ['Cinquante mètres de haut et deux cent cinquante-sept marches.', 'Le feu ne doit jamais s\'éteindre.'],
    talk: 'gardien.chat',
  },
  {
    id: 'gris', name: 'Monsieur Gris', title: 'Négociant de Paris',
    look: look(ERA, 'gentleman', { hair: { style: 'sidepart', color: HAIR.grey }, beard: null,
      outfit: { top: { c: 0x6a6a70, p: 'wool' }, coat: { c: 0x6e6e74, p: 'wool', len: 0.62, gap: 0.3 }, bottom: { c: 0x5a5a60, p: 'wool' } },
      hat: { type: 'tophat', c: 0x5e5e64 } }),
    when: (s) => s.active('xix.m6') && s.step('xix.m6') >= 1 && !s.flag('gris_gone'),
    home: 'marais-gris',
    routine: [{ from: 0, to: 24, at: 'marais-gris', action: 'idle' }],
    barks: ['…'],
    talk: 'gris.final',
  },
];

const extras = [
  { name: 'Saunier', look: look(ERA, 'saunier'), path: 'digue', action: 'carry', barks: ['Encore une ladure de sel !', 'Le vent a bien tourné.'] },
  { name: 'Saunière', look: look(ERA, 'villager'), path: 'grande-rue', barks: ['Bonjour la compagnie.', 'Il paraît que Lescure va tout perdre…'] },
  { name: 'Saunière', look: look(ERA, 'villager', { outfit: { robe: { c: 0x2a2a3a, p: 'wool', len: 0.94, flare: 0.85 }, apron: { c: 0x6a7a9a, p: 'check', c2: 0xe0e0e8, len: 0.7 } } }), path: 'rue-marais', barks: ['Ma quichenotte me protège du soleil… et des galants !'] },
  { name: 'Matelot', look: look(ERA, 'sailor'), path: 'quai', action: 'carry', barks: ['Ces sacs pèsent cinquante kilos chacun.', 'Paré à virer !'] },
  { name: 'Matelot', look: look(ERA, 'sailor', { hair: { style: 'short', color: HAIR.dark }, beard: { style: 'short', color: HAIR.dark } }), path: 'quai', barks: ['La marée n\'attend personne.'] },
  { name: 'Bourgeois', look: look(ERA, 'gentleman', { hair: { style: 'sidepart', color: HAIR.brown }, beard: { style: 'mustache', color: HAIR.brown } }), path: 'grande-rue', barks: ['Avez-vous lu le Journal de La Rochelle ?', 'Bonjour, bonjour.'] },
];

const items = {
  permis: { name: 'Permis de séjour', icon: '📜', type: 'document', desc: 'Délivré par le maire d\'Ars. Tamponné à l\'aigle impérial.',
    read: "Mairie d'Ars-en-Ré. — Nous, Maire de la commune, autorisons le porteur, voyageur, à séjourner dans la commune pour ses études. Fait à Ars, le 12 août 1862. — A. Rivaille." },
  'sac-sel': { name: 'Sac de sel', icon: '🧂', type: 'ressource', model: 'sack', desc: 'Cinquante kilos de gros sel gris des marais d\'Ars.' },
  'lettre-ernest': { name: "Lettre d'Ernest Lescure", icon: '✉', type: 'document', desc: 'Une enveloppe cachetée de cire, adressée à « Jeanne Bouyer, saunière ». Quelque chose de dur est glissé à l\'intérieur.',
    read: "« Jeanne, je pars cette nuit. Mes créanciers prendront la maison, le magasin et jusqu'à mon nom. Un homme en gris m'a offert de tout payer contre l'éclat que ma famille garde depuis deux siècles. Je n'ai pu me résoudre à vendre la mémoire de l'île. Que Jeanne la garde mieux que moi. — Ernest Lescure, Ars, 1862. »" },
  ardoises: { name: "Paquet d'ardoises", icon: '🔲', type: 'ressource', desc: 'Douze ardoises d\'écolier et une boîte de crayons d\'ardoise.' },
  poisson: { name: 'Bar', icon: '🐟', type: 'ressource', model: 'fish', desc: 'Un beau bar pris dans l\'écluse à poissons.' },
  ballot: { name: 'Ballot de contrebande', icon: '📦', type: 'ressource', model: 'sack', desc: 'Du sel et du tabac cachés pour échapper aux droits.' },
  'bidon-huile': { name: "Bidon d'huile de colza", icon: '🛢', type: 'ressource', desc: 'L\'huile qui alimente la lampe du phare des Baleines.' },
  'photo-1862': { name: 'Portrait sur papier albuminé', icon: '🖼', type: 'artefact', codex: 'vie-photographie',
    desc: "Jeanne en quichenotte, Auguste Borel la pipe à la main, et toi, un peu flou d'avoir bougé. Au dos : « Ars, août 1862 »." },
  'pain-menage': { name: 'Pain de ménage', icon: '🍞', type: 'consommable', desc: 'Un gros pain rond qui se garde toute la semaine.', use: { stamina: 50, text: 'Dense et savoureux.' } },
  fouace: { name: 'Fouace', icon: '🥯', type: 'consommable', desc: 'Une brioche de fête, parfumée à l\'eau de fleur d\'oranger.', use: { stamina: 60, text: 'Un délice.' } },
  'cafe-xix': { name: 'Tasse de café', icon: '☕', type: 'consommable', desc: 'Un café noir et sucré, servi au comptoir.', use: { stamina: 40, text: 'Réveillé !' } },
  limonade: { name: 'Limonade', icon: '🥤', type: 'consommable', desc: 'La boisson à la mode, bouchée d\'une bille de verre.', use: { stamina: 35, text: 'Pétillante.' } },
  pastilles: { name: 'Pastilles de réglisse', icon: '🍬', type: 'consommable', desc: 'Contre la toux des marais.', use: { stamina: 25, text: 'Ça adoucit la gorge.' } },
  sabots: { name: 'Paire de sabots', icon: '👞', type: 'artefact', desc: 'Des sabots de bois de peuplier, les chaussures des sauniers.' },
  timbre: { name: "Timbre à l'effigie de l'Empereur", icon: '✉', type: 'artefact', codex: 'vie-second-empire', desc: 'Un timbre de 20 centimes, bleu, à l\'effigie de Napoléon III.' },
  'sel-fin': { name: 'Sachet de fleur de sel', icon: '🧂', type: 'artefact', desc: 'La « fleur de sel », cristaux fins récoltés à la surface des œillets.' },
};

const shops = {
  epicerie: { name: 'Épicerie Rivaud', intro: 'Sacs de café vert, pains de sucre, chandelles et bobines de fil.',
    wares: [{ item: 'ardoises', price: 2 }, { item: 'cafe-xix', price: 1 }, { item: 'pastilles', price: 1 }] },
  tabac: { name: 'Débit de tabac', intro: 'Le monopole de l\'État : tabac, timbres-poste et papier à lettres.', wares: [{ item: 'timbre', price: 1 }] },
  boulangerie: { name: 'Boulangerie Guérin', intro: 'Les miches rondes refroidissent sur les claies.', wares: [{ item: 'pain-menage', price: 1 }, { item: 'fouace', price: 2 }] },
  cafe: { name: 'Café du Commerce', intro: 'On joue au billard et on lit le journal à voix haute pour ceux qui ne savent pas lire.', wares: [{ item: 'cafe-xix', price: 1 }, { item: 'limonade', price: 1 }] },
  pharmacie: { name: 'Pharmacie Morin', intro: 'Bocaux de porcelaine, balances de cuivre et odeur de camphre.', wares: [{ item: 'pastilles', price: 1 }] },
  sabotier: { name: 'Sabotier', intro: 'Les copeaux de peuplier volent sous la cuillère du sabotier.', wares: [{ item: 'sabots', price: 3 }] },
  lescure: { name: 'Lescure & Cie', intro: 'Échantillons de sel dans des bocaux étiquetés, cartes marines et registres empilés.', wares: [{ item: 'sel-fin', price: 2 }] },
  hotel: { name: 'Hôtel du Commerce', intro: 'Table d\'hôte à midi, chambres à l\'étage, écurie dans la cour.', wares: [{ item: 'fouace', price: 2 }, { item: 'limonade', price: 1 }] },
  douane: { name: 'Bureau des Douanes', intro: 'Un comptoir, une balance, et l\'aigle impérial au mur. Rien à vendre ici.', wares: [] },
  'bureau-port': { name: 'Bureau du port', intro: 'Le registre des passages est ouvert sur le pupitre.', wares: [] },
};

const riddles = {
  'r-sel': {
    title: 'Le secret du sel',
    q: "Jeanne te demande : « Alors, d'où vient le sel qui se forme dans mes œillets ? »",
    options: ['Il tombe avec la pluie', "L'eau de mer s'évapore au soleil et au vent, et le sel cristallise", 'On fait bouillir l\'eau dans des chaudrons', 'Il remonte de la terre du marais'],
    answer: 1, hint: 'Pas de feu ici : seulement le soleil… et le vent.',
    success: "« Voilà ! L'eau de mer entre à marée haute dans le grand bassin, le jas, puis passe de bassin en bassin, de plus en plus salée. Dans l'œillet, le soleil et le vent finissent le travail : le sel cristallise, et on le tire avec le las. »",
    codex: 'metier-saunier', xp: 40,
  },
  'r-dette': {
    title: 'Le livre de comptes',
    doc: "Livre de comptes de la maison Lescure — sauniers d'Ars\nJeanne Bouyer : 5 tonnes de sel livrées chaque mois\nPrix convenu : 12 francs la tonne\nImpayés : juin, juillet, août",
    q: 'Combien Ernest Lescure doit-il à Jeanne ?',
    options: ['60 francs', '150 francs', '180 francs', '200 francs'],
    answer: 2, hint: '5 tonnes × 12 francs, pendant trois mois.',
    success: "180 francs : près d'une demi-année de salaire d'un ouvrier. Sous la dernière page, une note de la main d'Ernest : « M. Gris propose 50 000 francs pour l'objet. Il sait. Comment sait-il ? »",
    codex: 'histoire-sel-xix', xp: 40,
  },
};

const dialogues = {
  'firmin.m1': [
    ['firmin', 'Halte-là, au nom de la loi ! … Bon, je plaisante, mais pas tout à fait. Un étranger habillé de la sorte, à Ars, ça se remarque.'],
    ['me', "Je suis un voyageur. J'étudie l'histoire de l'île."],
    ['firmin', "Un savant ! Comme ce monsieur de Paris, l'autre semaine, en redingote grise… Allez voir monsieur le maire, à la mairie, sur la place de l'église. Il vous donnera un permis de séjour, et tout sera en règle."],
  ],
  'maire.m1': [
    ['maire', "Un voyageur savant ? Bienvenue à Ars, première commune salinière de l'île ! Voici votre permis de séjour, en bonne et due forme."],
    { do: [['give', 'permis']] },
    ['maire', "Vous tombez mal, hélas. Le sel ne vaut plus rien : douze francs la tonne ! Le chemin de fer amène à Paris le sel du Midi et celui des mines de l'Est, et nos marais n'ont plus de clients."],
    ['maire', "Et voilà que M. Lescure, notre plus gros négociant, ne paie plus ses sauniers depuis trois mois. Ils parlent de faire grève de la levée. Si le sel reste dans les œillets, c'est toute la commune qui sombre."],
    ['maire', "Allez donc voir Jeanne Bouyer, dans les marais, à l'ouest du port. C'est elle qui parle au nom des sauniers. Une tête dure, mais un cœur d'or."],
  ],
  'jeanne.m2': [
    ['jeanne', "Le maire vous envoie ? Il croit qu'on fait grève par plaisir. Regardez mes mains : trente ans de sel. Et pas un sou depuis le mois de mai."],
    ['me', "Je voudrais comprendre votre métier."],
    ['jeanne', "Comprendre ? Alors on apprend avec les mains. Prenez le las — le grand râteau — et tirez le sel de trois œillets. Doucement : on ramène le sel au bord sans remuer la vase."],
    ['jeanne', "Et regardez Cadet, mon âne, avec sa culotte. Il porte le sel jusqu'aux mulons. Ne riez pas, sans culotte les taons le dévoreraient !"],
  ],
  'jeanne.m2b': [
    ['jeanne', 'Pas mal, pour un savant ! Vous avez le geste. Mais dites-moi…'],
    { do: [['riddle', 'r-sel']] },
  ],
  'jeanne.m3': [
    ['jeanne', "Le sel est là, beau et blanc, mais à quoi bon si personne ne l'achète ? M. Lescure nous doit trois mois. Avant, c'était un homme droit. Depuis qu'un certain M. Gris lui tourne autour, il ne dort plus."],
    ['jeanne', "Allez le voir à son comptoir, sur le quai. Un étranger, il l'écoutera peut-être. Nous, il nous évite."],
  ],
  'ernest.m3': [
    ['ernest', "Un voyageur ? Asseyez-vous, je vous prie. Excusez le désordre : je suis un homme ruiné, monsieur, ou madame. Ruiné à quarante-deux ans."],
    ['ernest', "Les Lescure négocient le sel d'Ars depuis Louis XIV. Mais aujourd'hui, avec le chemin de fer, le sel du Midi arrive à Paris pour moins cher que le nôtre à Nantes. Mes créanciers de La Rochelle exigent leur dû."],
    ['me', "Et M. Gris ?"],
    ['ernest', "… Vous le connaissez ? Il prétend être négociant à Paris. Il m'offre de payer toutes mes dettes en échange d'un… objet de famille. Un objet qui ne m'appartient pas vraiment. Il sait des choses qu'il ne devrait pas savoir."],
    ['ernest', "Découvrez qui il est. Il loge à l'Hôtel du Commerce ; les douaniers savent qui débarque à Ars ; et mon livre de comptes, sur le comptoir… vérifiez-le, je n'ai plus la tête aux chiffres."],
  ],
  'ernest.m3b': [
    ['me', "Personne n'a vu M. Gris débarquer. Il a signé le registre de l'hôtel d'une encre qui ne fait pas de pâtés. Et il savait, pour l'objet."],
    ['ernest', "Alors c'est vrai… Mon grand-père disait que des « voleurs de temps » viendraient un jour. Je le prenais pour un vieux fou."],
    ['ernest', "Je vais vous dire la vérité. Ma famille garde un éclat de cristal qui bat comme un cœur. Un éclat de l'Horloge des Marées. Les Bouyer et les Lescure le gardent ensemble depuis deux siècles. Jeanne le sait, elle aussi."],
    ['ernest', "Je ne le vendrai pas… si je peux l'éviter. Mais pour cela, il faut que mon dernier chargement parte pour Nantes."],
  ],
  'ernest.m4': [
    ['ernest', "La gabarre Sainte-Anne d'Auguste Borel doit appareiller à la marée, pour Nantes, avec mon dernier sel. Si la cargaison arrive, je paierai les sauniers et mes créanciers patienteront."],
    ['ernest', "Mais les portefaix refusent de charger tant qu'ils ne sont pas payés. Je ne leur en veux pas. Vous… accepteriez-vous de porter quelques sacs ?"],
  ],
  'borel.m4': [
    ['borel', "Du sel de Lescure, porté par un savant ! On aura tout vu. Posez ça dans la cale, tenez, là. Pierrot, aide donc !"],
    ['borel', "Avec ça, j'ai mon plein. Allez inscrire le départ au registre du port, au bureau, à côté du magasin : c'est la loi. Je signe après vous, comme témoin."],
  ],
  'registre.m4': [
    ['narr', "Sur le pupitre du bureau du port, le grand registre des passages est ouvert. Tu trempes la plume dans l'encrier et tu écris, de ta plus belle écriture :"],
    ['narr', "« 14 août 1862, gabarre Sainte-Anne, patron A. Borel, d'Ars, chargée de sel pour Nantes. Mer belle. »"],
    ['voice', "Cette ligne, quelqu'un la lira dans cent soixante ans."],
  ],
  'borel.m4b': [
    ['borel', "Mer belle, c'est bien vu ! Le vent est au noroît, la marée est pleine. Larguez les amarres, Pierrot !"],
    ['narr', "La Sainte-Anne glisse dans le chenal, sa grande voile brune gonflée par la brise. Sur le quai, les sauniers ôtent leur chapeau."],
    { do: [['fn', (api) => departGabarre(api)], ['flag', 'sainte_anne']] },
  ],
  'ernest.m5': [
    ['ernest', "La Sainte-Anne est partie… mais il est trop tard. Mes créanciers ont fait saisir la maison ce soir. Demain, on effacera le nom des Lescure des registres du commerce d'Ars."],
    ['ernest', "M. Gris est revenu. Il pose ses billets sur la table et me dit : « Tout cela disparaîtra si vous me donnez l'éclat. » Que feriez-vous, à ma place ?"],
    { choice: [
      { t: "La mémoire de l'île ne se vend pas. Confiez l'éclat à Jeanne.", go: 'ernest.m5.keep', best: true },
      { t: 'Sauvez votre maison. Personne ne vous le reprochera.', go: 'ernest.m5.sell' },
    ] },
  ],
  'ernest.m5.sell': [
    ['ernest', "… Personne, sauf moi. Chaque matin, en me rasant. Non. Vous m'avez tendu la tentation, et j'y vois clair, à présent."],
    { go: 'ernest.m5.keep' },
  ],
  'ernest.m5.keep': [
    ['ernest', "Vous avez raison. J'ai été gardien avant d'être négociant. Je pars cette nuit pour La Rochelle, sans un sou, mais l'éclat restera ici."],
    ['narr', "Ernest écrit quelques lignes d'une main tremblante, glisse dans l'enveloppe un éclat de cristal qui palpite d'une lumière bleue, et la cachette à la cire."],
    ['ernest', "Portez ceci à Jeanne Bouyer, en main propre. Elle saura. Et… si un jour quelqu'un dit que les Lescure ont trahi, vous saurez, vous, que ce n'est pas vrai."],
    { do: [['give', 'lettre-ernest'], ['rep', 15]] },
  ],
  'jeanne.m5': [
    ['narr', "Jeanne brise le cachet et lit la lettre à voix haute, lentement, comme on lit à l'école :"],
    ['jeanne', "« Je n'ai pu me résoudre à vendre la mémoire de l'île. Que Jeanne la garde mieux que moi. — Ernest Lescure, Ars, 1862. »"],
    ['jeanne', "Le pauvre homme… On le traitait de voleur sur le quai, et il donne tout ce qui lui reste. Je garderai l'éclat, Ernest. Et mes enfants le garderont après moi."],
    { do: [['flag', 'know_ernest'], ['codex', 'perso-ernest']] },
  ],
  'jeanne.m6': [
    ['jeanne', "Il est revenu. L'homme en gris. Il rôde au bout des marais, près de la cabane, quand le soleil baisse. Il m'a dit qu'il savait ce que je cachais."],
    ['jeanne', "Je n'ai pas peur de lui. Mais vous, vous avez l'air de savoir d'où il vient. Allez lui parler. Moi, je ne bouge pas d'ici."],
  ],
  'gris.final': [
    ['gris', "Ah. Le petit voyageur qui a fait partir la gabarre. Vous avez fait échouer une affaire excellente."],
    ['me', "Vous n'êtes pas négociant. Personne ne vous a vu débarquer. Vous venez d'ailleurs… comme moi."],
    ['gris', "D'ailleurs, et de plus tard. Je connais la suite, voyez-vous : Ernest mourra pauvre à La Rochelle, et son nom sera rayé des registres. Je voulais lui épargner cela. Je voulais épargner cela à ma famille."],
    { choice: [
      { t: 'Votre famille ? Vous êtes… un Lescure ?', go: 'gris.who', best: true },
      { t: "L'éclat ne vous appartient pas.", go: 'gris.refuse' },
    ] },
  ],
  'gris.who': [
    ['gris', "… Vous en savez trop, ou pas assez. Ernest a eu tort de vous écouter. Il a choisi l'oubli."],
    { go: 'gris.refuse' },
  ],
  'gris.refuse': [
    ['gris', "Gardez votre éclat, et votre saunière. Il en reste deux. Nous nous reverrons, dans un temps plus sombre que celui-ci."],
    ['narr', "L'homme en gris recule vers le marais. Sa silhouette tremble comme un mirage au-dessus des œillets, puis s'efface. Sur la digue, un petit carton rectangulaire voltige dans le vent."],
    { do: [['flag', 'gris_gone']] },
  ],
  'jeanne.m6b': [
    ['jeanne', "Un ticket… de « métro » ? Composté en 2025 ? Je ne sais pas ce que c'est, mais ça ne vient pas de chez nous."],
    ['jeanne', "Prenez l'éclat. Ernest me l'a confié pour le garder, et le meilleur moyen de le garder, c'est de le remettre à sa place, dans l'Horloge. Les Bouyer s'en souviendront."],
    { do: [['give', 'fragment-xix'], ['unlock', 'wwii'], ['rep', 25], ['flag', 'frag_xix']] },
    ['voice', "Le sixième éclat retrouve sa place. Le dernier attend dans les heures sombres de l'Occupation, au Bois-Plage, en 1943."],
  ],
  // ---------- secondaires ----------
  'aubineau.offer': [
    ['aubineau', "Bonjour ! Vous êtes le voyageur dont tout le monde parle ? Vous me semblez instruit. Moi, je voudrais ouvrir une école pour les filles d'Ars."],
    ['aubineau', "La loi le permet, mais monsieur le maire dit que les filles des sauniers n'ont pas besoin de lire pour ratisser. Si vous pouviez le convaincre… et me trouver des ardoises, à l'épicerie."],
    { choice: [{ t: 'Je vais parler au maire.', do: [['start', 'xix.s1']] }, { t: 'Plus tard.', end: true }] },
  ],
  'maire.s1': [
    ['maire', "L'école des filles ? Mademoiselle Aubineau est bien têtue. Il faut payer une institutrice, chauffer une salle… Et à quoi bon ?"],
    { choice: [
      { t: "Une saunière qui sait compter ne se fait plus voler sur le prix du sel.", go: 'maire.s1.ok', best: true },
      { t: "C'est la mode, à Paris.", go: 'maire.s1.bof' },
    ] },
  ],
  'maire.s1.ok': [
    ['maire', "… Hum. Voilà un argument que mes administrés comprendront. Et puis l'Empereur veut des écoles partout. Soit ! Dites à mademoiselle Aubineau qu'elle aura la salle du rez-de-chaussée."],
  ],
  'maire.s1.bof': [
    ['maire', "À Paris ? Ici, on se moque bien de Paris. … Mais bon, si cela fait taire mademoiselle Aubineau, qu'elle ait sa salle."],
  ],
  'aubineau.s1': [
    ['aubineau', "Il a dit oui ? Et des ardoises ! Lundi, douze petites filles apprendront à écrire leur nom. Merci, du fond du cœur."],
    { do: [['flag', 'xix_ecole']] },
  ],
  'mathurin.offer': [
    ['mathurin', "Hé, l'étranger ! Tu vois ce mur de pierres sèches sur l'estran ? C'est une écluse à poissons. À marée haute, le poisson entre ; à marée basse, il reste prisonnier."],
    ['mathurin', "Mais mes vieilles jambes ne me portent plus sur les cailloux glissants. Va relever les deux bouchauds de l'écluse et rapporte-moi trois beaux bars."],
    { choice: [{ t: "J'y vais.", do: [['start', 'xix.s2']] }, { t: 'Une autre fois.', end: true }] },
  ],
  'mathurin.s2': [
    ['mathurin', "Trois bars ! Tu as la main, mon gars, ou ma fille, je ne vois plus bien. Ces écluses, ce sont nos anciens qui les ont bâties, pierre par pierre, il y a des siècles."],
  ],
  'lefort.offer': [
    ['lefort', "Psst. Vous qui vous promenez partout… Les fraudeurs cachent du sel et du tabac pour ne pas payer les droits. J'ai deux cachettes en tête : la cabane du marais, et sous le quai, à l'ouest."],
    ['lefort', "Si vous trouvez quelque chose, rapportez-le-moi. Discrètement."],
    { choice: [{ t: 'Comptez sur moi, brigadier.', do: [['start', 'xix.s3']] }, { t: 'Je ne suis pas un mouchard.', end: true }] },
  ],
  'lefort.s3': [
    ['lefort', "Deux ballots ! Du sel non déclaré et du tabac de contrebande. Les douanes impériales vous remercient. La prime d'usage vous revient."],
    ['lefort', "Ne le dites à personne : les fraudeurs sont souvent des pauvres gens. Mais la loi est la loi."],
  ],
  'rivaud.offer': [
    ['rivaud', "Ah, vous tombez bien ! Le gardien du phare des Baleines attend son huile de colza depuis deux jours, et mon commis est au lit avec la fièvre. Sans huile, pas de feu, et sans feu…"],
    ['rivaud', "C'est loin, tout au bout de l'île, à l'ouest. Vous voulez bien y aller ?"],
    { choice: [{ t: "J'y cours.", do: [['start', 'xix.s4'], ['give', 'bidon-huile']] }, { t: 'Pas maintenant.', end: true }] },
  ],
  'gardien.s4': [
    ['gardien', "L'huile ! Juste à temps : la lampe aurait baissé cette nuit. Le phare a huit ans, vous savez : on l'a bâti en 1854 pour remplacer la vieille tour des Baleines, trop basse."],
    ['gardien', "Cinquante mètres de haut. Par temps clair, on le voit à plus de quarante kilomètres. Les marins du monde entier comptent sur nous."],
  ],
  'delpech.offer': [
    ['delpech', "Quel visage ! Quel costume étrange ! Il me faut votre portrait, avec deux figures du pays : une saunière en quichenotte et un vieux loup de mer. Vous me les amenez ?"],
    { choice: [{ t: 'Je vais leur demander.', do: [['start', 'xix.s5']] }, { t: 'Je ne tiens pas en place, désolé.', end: true }] },
  ],
  'jeanne.s5': [['jeanne', "Un portrait ? Moi ? Bon… mais je garde ma quichenotte, et je ne souris pas, ça fait des rides."]],
  'borel.s5': [['borel', 'Un portrait ! Ma femme sera bien contente. Je prends ma pipe, et j\'arrive.']],
  'pose.s5': [
    ['delpech', "Tout le monde en place ! Mademoiselle Bouyer à gauche, patron Borel à droite, et vous au milieu. Ne bougez plus… Un… deux… …dix !"],
    ['narr', 'Le photographe replace le bouchon sur l\'objectif et file sous sa tente noire développer la plaque de verre.'],
  ],
  'delpech.s5': [
    ['delpech', "Voici votre tirage, sur papier albuminé. Vous avez un peu bougé, mais l'ensemble est d'une vérité saisissante !"],
  ],
  // ---------- conversations ----------
  'jeanne.chat': [['jeanne', (S) => (S.done('xix.m6') ? 'Prenez soin de l\'éclat. Et repassez un jour, voir mes petits-enfants.' : 'Pas de vent, pas de sel.')]],
  'ernest.chat': [['ernest', 'Excusez-moi, ces comptes me rendent fou. Vous voulez voir nos échantillons ?'], { do: [['shop', 'lescure']] }],
  'borel.chat': [['borel', (S) => (S.flag('sainte_anne') ? 'Pierrot a eu le mal de mer jusqu\'au pertuis, mais la Sainte-Anne file comme un cygne !' : 'La Sainte-Anne n\'attend que son chargement.')]],
  'maire.chat': [['maire', 'Ars, première commune salinière de l\'île ! … Enfin, pour combien de temps.']],
  'firmin.chat': [['firmin', 'Rien à signaler. Sauf vous, peut-être.']],
  'lefort.chat': [['lefort', 'Rien à déclarer ? Alors circulez.']],
  'aubineau.chat': [['aubineau', (S) => (S.flag('xix_ecole') ? 'Mes élèves savent déjà écrire leur nom. La petite Bouyer est la meilleure !' : 'Lire, écrire, compter : voilà la vraie liberté.')]],
  'mathurin.chat': [['mathurin', 'Le Fier, c\'est mon jardin. Et la marée, ma pendule.']],
  'rivaud.chat': [['rivaud', 'Café, sucre, chandelles ! Qu\'est-ce qu\'il vous faut ?'], { do: [['shop', 'epicerie']] }],
  'delpech.chat': [['delpech', 'La lumière de l\'île est la plus belle de France. Ni Paris ni Nice n\'ont ce bleu.']],
  'pierrot.chat': [['pierrot', (S) => (S.flag('sainte_anne') ? 'Le patron m\'a laissé à terre cette fois… La prochaine, je pars !' : 'Un jour, je serai patron de gabarre, comme monsieur Borel !')]],
  'gardien.chat': [['gardien', 'Le feu ne doit jamais s\'éteindre. Jamais.']],
};

// La gabarre Sainte-Anne : amarrée au port, puis qui s'en va par le chenal
function gabarre(api) {
  let g = api.world.eraGroup.getObjectByName('sainte-anne');
  if (g) return g;
  const s = api.world.spots['sainte-anne'];
  if (!s) return null;
  g = buildBoat('gabarre');
  g.name = 'sainte-anne';
  g.position.set(s.x, 0.1, s.z);
  g.rotation.y = 0.05 + (api.world.townRot ?? 0);
  g.userData.noBatch = true;
  g.userData.bob = 2;
  api.world.eraGroup.add(g);
  api.world.animated.push({ obj: g, kind: 'bob' });
  return g;
}
function departGabarre(api) {
  const g = gabarre(api);
  if (!g) return;
  // trajet dans le repère de la ville : vers l'axe du chenal (x = 0), puis vers le nord
  const w = api.world;
  const c = Math.cos(w.townRot ?? 0), s = Math.sin(w.townRot ?? 0);
  const local = () => {
    const dx = g.position.x - w.townCenter.x, dz = g.position.z - w.townCenter.z;
    return { x: dx * c - dz * s, z: dx * s + dz * c };
  };
  w.animated.push({ obj: g, kind: 'custom', update: (t, dt) => {
    if (!g.visible) return;
    const step = Math.min(dt, 0.1) * 1.6;
    const l = local();
    let mx = 0, mz = 0;
    if (Math.abs(l.x) > 0.1) mx = -Math.sign(l.x) * Math.min(step, Math.abs(l.x));
    else mz = -step;
    const o = w.offset(mx, mz);
    g.position.x += o.x; g.position.z += o.z;
    if (l.z < -70) g.visible = false;
  } });
}

const quests = [
  { id: 'xix.m1', main: true, auto: true, chapter: 5, title: 'Ars-en-Ré, 1862', desc: "Sous le Second Empire, le bourg des sauniers traverse une crise.",
    steps: [
      { id: 'garde', type: 'talk', npc: 'firmin', dialogue: 'firmin.m1', text: "Le garde champêtre t'attend à l'entrée du bourg." },
      { id: 'maire', type: 'talk', npc: 'maire', dialogue: 'maire.m1', text: 'Présente-toi au maire, à la mairie (place de l\'église).' },
    ],
    rewards: { xpHist: 40, money: 6, rep: 5, codex: ['lieu-ars'] }, next: 'xix.m2' },
  { id: 'xix.m2', main: true, title: "L'or blanc", desc: 'Apprendre le métier de saunier avec Jeanne Bouyer.',
    steps: [
      { id: 'jeanne', type: 'talk', npc: 'jeanne', dialogue: 'jeanne.m2', text: 'Trouve Jeanne Bouyer dans les marais salants, à l\'ouest du port.' },
      { id: 'oeillets', type: 'interact', text: 'Tire le sel de 3 œillets avec le las.', targets: [
        { key: 'o0', at: 'oeillet0', label: 'Tirer le sel avec le las', anim: 'rake', duration: 2.2, text: 'Tu ramènes doucement le sel gris vers le bord de l\'œillet. Il crisse sous le râteau.' },
        { key: 'o1', at: 'oeillet1', label: 'Tirer le sel avec le las', anim: 'rake', duration: 2.2, text: 'Un petit tas de cristaux luisants se forme sur la ladure, le bord du bassin.' },
        { key: 'o2', at: 'oeillet2', label: 'Cueillir la fleur de sel', anim: 'rake', duration: 2.2, text: 'À la surface flottent de fines paillettes : la fleur de sel, qu\'on cueille délicatement.' },
      ] },
      { id: 'ane', type: 'observe', fauna: 'donkey', count: 1, text: "Observe l'âne en culotte de Jeanne (approche doucement, E)." },
      { id: 'jeanne2', type: 'talk', npc: 'jeanne', dialogue: 'jeanne.m2b', text: 'Retourne voir Jeanne.' },
    ],
    rewards: { xpExpl: 60, money: 5, rep: 10, codex: ['vie-quichenotte'] }, next: 'xix.m3' },
  { id: 'xix.m3', main: true, title: 'Le négociant ruiné', desc: 'Ernest Lescure ne paie plus ses sauniers, et un certain M. Gris lui tourne autour.',
    steps: [
      { id: 'jeanne', type: 'talk', npc: 'jeanne', dialogue: 'jeanne.m3', text: 'Écoute ce que Jeanne a à dire de M. Lescure.' },
      { id: 'ernest', type: 'talk', npc: 'ernest', dialogue: 'ernest.m3', text: 'Rends visite à Ernest Lescure, à son comptoir sur le quai.' },
      { id: 'enquete', type: 'interact', text: 'Enquête sur M. Gris : l\'hôtel, la douane, le livre de comptes.', targets: [
        { key: 'hotel', at: ['hotel', 0.4, 0], model: 'page', label: "Consulter le registre de l'hôtel", anim: 'read', duration: 1.2,
          text: "Registre des voyageurs de l'Hôtel du Commerce : « V. Gris, rentier, Paris. » L'encre est fine, régulière, sans un pâté : aucune plume d'oie n'écrit ainsi." },
        { key: 'douane', at: ['douane', 0.4, 0], model: 'page', label: 'Interroger le registre des douanes', anim: 'read', duration: 1.2,
          text: "Le brigadier Lefort feuillette ses registres : « Gris ? Personne de ce nom n'a débarqué, ni par le vapeur, ni par les barques. Il est apparu, voilà tout. »" },
        { key: 'livre', at: ['lescure', 1.2, 0], model: 'page', label: 'Vérifier le livre de comptes', anim: 'read', duration: 1, riddle: 'r-dette' },
      ] },
      { id: 'ernest2', type: 'talk', npc: 'ernest', dialogue: 'ernest.m3b', text: 'Fais ton rapport à Ernest Lescure.' },
    ],
    rewards: { xpHist: 80, money: 6, rep: 10, codex: ['histoire-sel-xix'] }, next: 'xix.m4' },
  { id: 'xix.m4', main: true, title: 'La gabarre Sainte-Anne', desc: 'Faire partir le dernier chargement d\'Ernest pour Nantes.',
    steps: [
      { id: 'ernest', type: 'talk', npc: 'ernest', dialogue: 'ernest.m4', text: 'Écoute le plan d\'Ernest.' },
      { id: 'sacs', type: 'collect', item: 'sac-sel', count: 4, text: 'Prends 4 sacs de sel devant le magasin à sel.', label: 'Charger le sac sur l\'épaule',
        spawns: [['magasin', -3, 0], ['magasin', -1, 0.3], ['magasin', 1, 0.3], ['magasin', 3, 0]] },
      { id: 'borel', type: 'deliver', npc: 'borel', item: 'sac-sel', count: 4, dialogue: 'borel.m4', text: 'Porte les sacs à Auguste Borel, patron de la Sainte-Anne.' },
      { id: 'registre', type: 'interact', text: 'Inscris le départ au registre du bureau du port.', targets: [
        { key: 'registre', at: 'registre', model: 'page', label: 'Écrire dans le registre des passages', anim: 'write', duration: 2, dialogue: 'registre.m4', codex: 'histoire-gabarres' },
      ] },
      { id: 'depart', type: 'talk', npc: 'borel', dialogue: 'borel.m4b', text: 'Assiste au départ de la Sainte-Anne.' },
    ],
    rewards: { xpExpl: 80, money: 10, rep: 15, codex: ['perso-borel'] }, next: 'xix.m5' },
  { id: 'xix.m5', main: true, title: "La lettre d'Ernest", desc: 'Ruiné, Ernest doit choisir : vendre l\'éclat ou le confier.',
    steps: [
      { id: 'ernest', type: 'talk', npc: 'ernest', dialogue: 'ernest.m5', text: 'Ernest Lescure veut te parler, à son comptoir.' },
      { id: 'jeanne', type: 'deliver', npc: 'jeanne', item: 'lettre-ernest', count: 1, dialogue: 'jeanne.m5', text: 'Remets la lettre d\'Ernest à Jeanne Bouyer, en main propre.' },
    ],
    rewards: { xpHist: 100, rep: 15 }, next: 'xix.m6' },
  { id: 'xix.m6', main: true, title: 'Monsieur Gris', desc: "L'homme en gris rôde dans les marais.",
    steps: [
      { id: 'jeanne', type: 'talk', npc: 'jeanne', dialogue: 'jeanne.m6', text: 'Jeanne a quelque chose à te dire.' },
      { id: 'gris', type: 'talk', npc: 'gris', dialogue: 'gris.final', text: "Trouve l'homme en gris au bout des marais, près de la cabane." },
      { id: 'ticket', type: 'collect', item: 'ana-ticket', count: 1, text: "Ramasse le carton qu'il a laissé tomber.", label: 'Ramasser le carton', spawns: [['marais-gris', 0.9, 0.6]] },
      { id: 'jeanne2', type: 'talk', npc: 'jeanne', dialogue: 'jeanne.m6b', text: 'Retourne voir Jeanne.' },
    ],
    rewards: { xpHist: 150, xpExpl: 50, rep: 20 } },
  // ---------- secondaires ----------
  { id: 'xix.s1', giver: 'aubineau', offer: 'aubineau.offer', title: "L'école des filles", desc: 'Aider mademoiselle Aubineau à ouvrir une école pour les filles.',
    requires: ['xix.m1'],
    steps: [
      { id: 'maire', type: 'talk', npc: 'maire', dialogue: 'maire.s1', text: 'Convaincs le maire d\'ouvrir une école de filles.' },
      { id: 'ardoises', type: 'collect', item: 'ardoises', count: 1, text: "Achète un paquet d'ardoises à l'épicerie Rivaud." },
      { id: 'livrer', type: 'deliver', npc: 'aubineau', item: 'ardoises', count: 1, dialogue: 'aubineau.s1', text: 'Apporte les ardoises à mademoiselle Aubineau.' },
    ],
    rewards: { xpHist: 60, money: 3, rep: 15, codex: ['histoire-ecole-xix'] } },
  { id: 'xix.s2', giver: 'mathurin', offer: 'mathurin.offer', title: 'Les écluses à poissons', desc: 'Relever l\'écluse du père Mathurin.',
    steps: [
      { id: 'ecluse', type: 'interact', text: "Relève les 2 bouchauds de l'écluse, sur l'estran.", targets: [
        { key: 'e0', at: 'ecluse0', label: 'Relever le bouchaud', anim: 'crouch', duration: 1.6, text: 'Dans le bouchaud, la nasse de bois au point bas de l\'écluse, des poissons frétillent.' },
        { key: 'e1', at: 'ecluse1', label: 'Relever le bouchaud', anim: 'crouch', duration: 1.6, text: 'Un crabe vert s\'enfuit en marchant de côté. Derrière lui, de beaux bars argentés.' },
      ] },
      { id: 'poissons', type: 'collect', item: 'poisson', count: 3, text: 'Ramasse 3 bars.', label: 'Prendre le bar', spawns: [['ecluse0', 1.2, 0.6], ['ecluse1', -1.2, 0.6], ['estran', 0, -1.2]] },
      { id: 'livrer', type: 'deliver', npc: 'mathurin', item: 'poisson', count: 3, dialogue: 'mathurin.s2', text: 'Rapporte les bars au père Mathurin.' },
    ],
    rewards: { xpExpl: 40, money: 4, rep: 5, codex: ['histoire-ecluses'] } },
  { id: 'xix.s3', giver: 'lefort', offer: 'lefort.offer', title: 'Les fraudeurs du marais', desc: 'Trouver les cachettes des contrebandiers.',
    steps: [
      { id: 'ballots', type: 'collect', item: 'ballot', count: 2, text: 'Fouille la cabane du marais et le dessous du quai ouest.', label: 'Prendre le ballot caché',
        spawns: [['cabane', 1.2, 0.4], ['quai-ouest', -2, 0.2]] },
      { id: 'livrer', type: 'deliver', npc: 'lefort', item: 'ballot', count: 2, dialogue: 'lefort.s3', text: 'Remets les ballots au brigadier Lefort.' },
    ],
    rewards: { xpExpl: 40, money: 6, rep: 5, codex: ['vie-douane'] } },
  { id: 'xix.s4', giver: 'rivaud', offer: 'rivaud.offer', title: "L'huile du phare", desc: "Porter l'huile au gardien du phare des Baleines.",
    requires: ['xix.m2'],
    steps: [{ id: 'livrer', type: 'deliver', npc: 'gardien', item: 'bidon-huile', count: 1, dialogue: 'gardien.s4', text: "Porte le bidon d'huile au gardien du phare des Baleines, tout à l'ouest de l'île." }],
    rewards: { xpExpl: 60, money: 5, rep: 10, codex: ['lieu-phare-1854'] } },
  { id: 'xix.s5', giver: 'delpech', offer: 'delpech.offer', title: 'Le portrait', desc: 'Poser pour le photographe ambulant.',
    requires: ['xix.m2'],
    steps: [
      { id: 'jeanne', type: 'talk', npc: 'jeanne', dialogue: 'jeanne.s5', text: 'Demande à Jeanne de poser.' },
      { id: 'borel', type: 'talk', npc: 'borel', dialogue: 'borel.s5', text: 'Demande à Auguste Borel de poser.' },
      { id: 'pose', type: 'interact', text: 'Prends la pose devant l\'appareil.', targets: [
        { key: 'pose', at: 'pose', label: 'Prendre la pose', anim: 'idle', duration: 3, dialogue: 'pose.s5' },
      ] },
      { id: 'tirage', type: 'talk', npc: 'delpech', dialogue: 'delpech.s5', text: 'Récupère ton tirage auprès de M. Delpech.' },
    ],
    rewards: { xpHist: 40, money: 2, items: ['photo-1862'] } },
];

const codex = {
  'perso-jeanne': { cat: 'personnages', era: ERA, title: 'Jeanne Bouyer, saunière',
    text: "Saunière à Ars depuis l'enfance, Jeanne parle au nom des sauniers face aux négociants. Sa famille et celle des Lescure gardent ensemble, depuis le règne de Louis XIV, un éclat de l'Horloge des Marées. Ses descendants vivent encore sur l'île." },
  'perso-ernest': { cat: 'personnages', era: ERA, title: 'Ernest Lescure, négociant',
    text: "Négociant en sels d'Ars, ruiné par l'effondrement des cours dans les années 1860. Tenté de vendre l'éclat confié à sa famille, il choisit de le remettre à Jeanne Bouyer avant de quitter l'île sans un sou. Sa lettre en témoigne : « Je n'ai pu me résoudre à vendre la mémoire de l'île. »" },
  'perso-borel': { cat: 'personnages', era: ERA, title: 'Auguste Borel, patron de gabarre',
    text: "Patron de la gabarre Sainte-Anne, Auguste Borel transporte le sel d'Ars vers Nantes, La Rochelle et Bordeaux. Son départ du 14 août 1862 est consigné au registre du port." },
  'lieu-ars': { cat: 'lieux', era: ERA, title: 'Ars-en-Ré',
    text: "Ars est au XIXᵉ siècle la grande commune salinière de l'île. Le clocher de l'église Saint-Étienne, à la flèche peinte en noir et blanc, sert d'amer : un repère que les marins voient de loin pour entrer dans le pertuis. Le port, au bout d'un long chenal, s'ouvre sur le Fier d'Ars." },
  'metier-saunier': { cat: 'metiers', era: ERA, title: 'Le saunier',
    text: "Au printemps, le saunier nettoie et prépare les bassins. L'été, l'eau de mer circule du jas (le grand réservoir) vers les métières puis les œillets, de plus en plus salée. Le soleil et le vent font cristalliser le sel, que le saunier « tire » avec le las, un long râteau de bois. Le sel est mis en tas, les mulons." },
  'vie-quichenotte': { cat: 'vie', era: ERA, title: 'La quichenotte',
    text: "Coiffe de toile blanche tendue sur des baleines, la quichenotte protégeait le visage des saunières et des paysannes du soleil. La tradition raconte que son nom vient de l'anglais « kiss not » (« pas de baiser »), mais c'est sans doute une légende : il viendrait plutôt du mot « cagnotte » ou « quichon »." },
  'histoire-sel-xix': { cat: 'histoire', era: ERA, title: 'La crise du sel',
    text: "Au milieu du XIXᵉ siècle, le chemin de fer amène dans toute la France le sel du Midi et celui, très bon marché, des mines de l'Est. Les marais de l'Atlantique perdent leurs clients : sur l'île de Ré, beaucoup de marais sont abandonnés ou transformés en parcs à huîtres et en vignes." },
  'histoire-gabarres': { cat: 'histoire', era: ERA, title: 'Les gabarres',
    text: "Les gabarres sont des bateaux de charge à fond plat, à une voile, capables d'entrer dans les petits ports et les chenaux envasés. Elles transportent le sel, le vin et les marchandises entre les îles, La Rochelle, Nantes et les estuaires." },
  'histoire-ecole-xix': { cat: 'histoire', era: ERA, title: "L'école au XIXᵉ siècle",
    text: "La loi Guizot (1833) oblige chaque commune à entretenir une école de garçons. La loi Falloux (1850) l'étend aux filles dans les communes de plus de 800 habitants, et la loi Duruy (1867) renforce cette obligation. Il faudra attendre les lois Ferry (1881-1882) pour une école gratuite, laïque et obligatoire pour tous." },
  'histoire-ecluses': { cat: 'histoire', era: ERA, title: 'Les écluses à poissons',
    text: "Ces murs de pierres sèches en forme de fer à cheval, bâtis sur l'estran, piègent les poissons à marée descendante. L'île de Ré en comptait plus de 140 ; une douzaine sont encore entretenues par des associations d'« écluseurs »." },
  'vie-douane': { cat: 'vie', era: ERA, title: 'Douaniers et fraudeurs',
    text: "Les douaniers surveillent les côtes et perçoivent les droits sur le sel et le tabac. Leur sentier de ronde suit le littoral. Les fraudeurs, souvent des sauniers pauvres, cachent du sel dans les marais pour le vendre sans payer l'impôt." },
  'lieu-phare-1854': { cat: 'lieux', era: ERA, title: 'Le phare des Baleines (1854)',
    text: "Construit de 1849 à 1854 pour remplacer la vieille tour des Baleines, trop basse, le phare mesure 57 mètres et compte 257 marches. Ses gardiens entretiennent la lampe à huile, puis à pétrole, et remontent la machine qui fait tourner l'optique." },
  'vie-photographie': { cat: 'vie', era: ERA, title: 'La photographie',
    text: "Inventée en 1839 avec le daguerréotype, la photographie devient plus simple avec le collodion humide (1851) : une plaque de verre, quelques secondes de pose, et des tirages sur papier albuminé. Les photographes ambulants font le portrait des familles de la campagne." },
  'vie-second-empire': { cat: 'vie', era: ERA, title: 'Le Second Empire',
    text: "De 1852 à 1870, Napoléon III règne sur la France. On parle de « Douanes impériales », les pièces portent l'effigie de l'Empereur, le service militaire se décide par tirage au sort. La devise « Liberté, Égalité, Fraternité » ne sera inscrite au fronton des mairies qu'à partir de 1880." },
};

export default {
  era: ERA, npcs, extras, items, shops, riddles, dialogues, quests, codex,
  onEnter(api) {
    if (!api.quests.st('xix.m4') || api.quests.st('xix.m4').status !== 'done') gabarre(api);
  },
};

export { SKIN };
