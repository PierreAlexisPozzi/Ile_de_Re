// CHAPITRE 6 — LES HEURES SOMBRES, 1943 — Le Bois-Plage sous l'Occupation.
// Un blockhaus du Mur de l'Atlantique va être coulé sur la cachette du dernier
// éclat. Hélène Garnier, infirmière et gardienne, la Résistance, le
// rationnement, le couvre-feu, et un trafiquant du marché noir vêtu de gris.

import { look, HAIR, EYES } from '../../characters/wardrobe.js';

const ERA = 'wwii';

const npcs = [
  {
    id: 'helene', name: 'Hélène Garnier', title: 'Infirmière, gardienne', codex: 'perso-helene',
    look: look(ERA, 'nurse'),
    home: 'dispensaire',
    routine: [
      { from: 7, to: 19, at: 'dispensaire', action: 'idle' },
      { from: 19, to: 22, at: ['place', -1, 1], action: 'idle' },
      { from: 22, to: 7, at: 'dispensaire', action: 'read' },
    ],
    barks: ['Encore une plaie infectée, et plus de sulfamides…', 'Bonjour. Vous n\'êtes pas d\'ici, vous.', 'Rentrez avant le couvre-feu.'],
    talk: 'helene.chat',
  },
  {
    id: 'rose', name: 'Mémé Rose', title: "Grand-mère d'Hélène",
    look: look(ERA, 'grandmother'),
    home: 'pompe',
    routine: [{ from: 7, to: 12, at: 'pompe', action: 'idle' }, { from: 12, to: 18, at: ['place', -3, 2], action: 'sit' }, { from: 18, to: 7, at: 'pompe', action: 'idle' }],
    barks: ['Du pain gris, encore du pain gris…', 'De mon temps, on mangeait du beurre.', 'Ma petite Hélène se tue à la tâche.'],
    talk: 'rose.chat',
  },
  {
    id: 'marcel', name: 'Marcel Guillon', title: 'Boulanger',
    look: look(ERA, 'baker'),
    home: 'boulangerie:keeper',
    routine: [{ from: 4, to: 20, at: 'boulangerie:keeper', action: 'stir' }, { from: 20, to: 4, at: 'boulangerie:keeper', action: 'idle' }],
    barks: ['Pain gris, tickets s\'il vous plaît.', 'La farine est coupée de son et de fèves.', 'Vivement le pain blanc !'],
    talk: 'marcel.chat',
  },
  {
    id: 'lucien', name: 'Lucien', title: 'Vigneron… et résistant', codex: 'histoire-resistance-re',
    look: look(ERA, 'resistant'),
    home: 'cabane',
    routine: [{ from: 6, to: 20, at: 'cabane', action: 'rake' }, { from: 20, to: 6, at: 'cabane', action: 'idle' }],
    barks: ['La vigne se moque bien de la guerre.', 'Les murs ont des oreilles…', 'Vous n\'avez rien vu, d\'accord ?'],
    talk: 'lucien.chat',
  },
  {
    id: 'chaigneau', name: 'Madame Chaigneau', title: 'Institutrice',
    look: look(ERA, 'teacher'),
    home: 'ecole',
    routine: [{ from: 8, to: 17, at: 'ecole', action: 'read' }, { from: 17, to: 8, at: 'radio', action: 'idle' }],
    barks: ['Les enfants ont faim, ils n\'arrivent plus à apprendre.', 'Notre poste de T.S.F. est en panne…', 'L\'école, c\'est la liberté de demain.'],
    talk: 'chaigneau.chat',
  },
  {
    id: 'jojo', name: 'Jojo', title: 'Écolier',
    look: look(ERA, 'child'),
    home: 'place',
    routine: [{ from: 7, to: 20, at: ['place', 3, 1], action: 'play' }, { from: 20, to: 7, at: ['pompe', 1, 1.5], action: 'sit' }],
    barks: ['J\'ai perdu ma galoche dans les dunes…', 'Mon père est prisonnier en Allemagne.', 'Un jour, je verrai la mer de près, quand ils seront partis.'],
    talk: 'jojo.chat',
  },
  {
    id: 'bonnin', name: 'Père Bonnin', title: 'Vigneron, Cave du Bois',
    look: look(ERA, 'villager', { age: 'old', hair: { style: 'short', color: HAIR.grey }, beard: { style: 'mustache', color: HAIR.white }, hat: { type: 'beret', c: 0x1a1a1e },
      outfit: { apron: { c: 0x3a2a4a, p: 'linen', len: 0.7 } } }),
    home: 'cave:keeper',
    routine: [{ from: 6, to: 20, at: 'cave:keeper', action: 'idle' }, { from: 20, to: 6, at: 'cave:keeper', action: 'drink' }],
    barks: ['Ils réquisitionnent mon vin, ces messieurs.', 'Le pineau, c\'est le soleil en bouteille.', 'Ma cave a plus d\'un secret.'],
    talk: 'bonnin.chat',
  },
  {
    id: 'albert', name: 'Albert', title: 'Facteur',
    look: look(ERA, 'villager', { hat: { type: 'kepi', c: 0x1c2438, c2: 0x8a2a22 }, outfit: { coat: { c: 0x1c2438, p: 'wool', len: 0.2, gap: 0 }, bag: { type: 'satchel', c: 0x4a3420 } } }),
    home: 'mairie',
    routine: [{ from: 7, to: 18, at: 'mairie', action: 'idle' }, { from: 18, to: 7, at: ['cafe', -1, 0.6], action: 'drink' }],
    barks: ['Courrier ! … Enfin, quand il arrive.', 'Les lettres des prisonniers mettent des mois.', 'Mon vélo a plus de rustines que de pneu.'],
    talk: 'albert.chat',
  },
  {
    id: 'soldat', name: 'Sentinelle', title: "Soldat de l'armée d'occupation",
    look: look(ERA, 'soldier'),
    home: 'wache',
    routine: [{ from: 0, to: 24, at: 'wache', action: 'guard' }],
    barks: ['Halt !', 'Papiere, bitte.', 'Verboten !'],
    talk: 'soldat.chat',
  },
  {
    id: 'trafiquant', name: 'Le « Parisien »', title: 'Trafiquant du marché noir',
    look: look(ERA, 'trafficker'),
    when: (s) => s.started('wwii.m5') && !s.flag('trafic_gone') && !(s.active('wwii.m6') && s.step('wwii.m6') >= 1),
    home: 'cafe',
    routine: [{ from: 0, to: 24, at: ['cafe', 1.4, 0.8], action: 'idle' }],
    barks: ['Du beurre, du café, du vrai… pour qui peut payer.', 'Tout s\'achète, ma petite dame.'],
    talk: 'trafiquant.chat',
  },
  {
    id: 'trafiquant-blockhaus', name: 'Le « Parisien »', title: 'Trafiquant du marché noir',
    look: look(ERA, 'trafficker'),
    when: (s) => s.active('wwii.m6') && s.step('wwii.m6') >= 1 && !s.flag('trafic_gone'),
    home: 'blockhaus',
    routine: [{ from: 0, to: 24, at: 'blockhaus', action: 'idle' }],
    barks: ['…'],
    talk: 'trafiquant.final',
  },
];

const extras = [
  { name: 'Soldat', look: look(ERA, 'soldier', { hair: { style: 'crop', color: HAIR.brown }, eyes: EYES.brown }), path: 'patrouille', barks: ['Halt !', 'Weitergehen.', 'Couvre-feu, vingt-deux heures !'] },
  { name: 'Soldat', look: look(ERA, 'soldier'), path: 'patrouille', barks: ['Papiere.', 'Nicht stehen bleiben.'] },
  { name: 'Villageoise', look: look(ERA, 'villagerwoman'), path: 'rue', barks: ['On dit qu\'il y aura des sardines au marché…', 'Encore deux heures de queue pour du pain.'] },
  { name: 'Villageois', look: look(ERA, 'villager'), path: 'rue', barks: ['Ma bicyclette roule sur des pneus en tuyau d\'arrosage.', 'Ils ont encore réquisitionné des chevaux.'] },
  { name: 'Vigneronne', look: look(ERA, 'villagerwoman', { hat: { type: 'sunhat', c: 0xd8c088 }, props: { left: 'basket' } }), path: 'vignes', barks: ['Belle vendange en perspective, si on nous la laisse.'] },
];

const items = {
  'message': { name: 'Message caché', icon: '📝', type: 'document', desc: 'Un papier roulé, glissé dans la mie d\'un pain.',
    read: "« La vigne attend le vendangeur. Le porteur est sûr. — M. »" },
  'faux-papiers': { name: 'Faux papiers', icon: '🪪', type: 'document', desc: 'Une carte d\'identité et un Ausweis (laissez-passer) imités à la perfection.',
    read: "Carte d'identité au nom de « Garnier, Camille », aide-infirmière, née à Rochefort. Tampon de la mairie. Laissez-passer pour la zone côtière." },
  'carnet-croquis': { name: 'Carnet de croquis', icon: '📒', type: 'document', desc: 'Les positions des blockhaus de la côte, dessinées en cachette.',
    read: "Trois croquis au crayon : un blockhaus pour canon face à la mer, une casemate pour mitrailleuse, un abri en chantier. Distances, épaisseurs, angles de tir. Rien n'est écrit en clair." },
  'boite-fer': { name: 'Boîte de fer rouillée', icon: '🗃', type: 'artefact', desc: 'Sortie du sable, sous le coffrage du blockhaus. Elle palpite d\'une lueur bleue.' },
  sulfamides: { name: 'Boîte de sulfamides', icon: '💊', type: 'ressource', model: 'ration', desc: 'Des médicaments contre l\'infection, parachutés par Londres.' },
  lettre: { name: 'Lettre', icon: '✉', type: 'ressource', desc: 'Une lettre à distribuer. Certaines viennent des camps de prisonniers.' },
  barrique: { name: 'Barrique de vin', icon: '🛢', type: 'ressource', model: 'barrel', desc: 'Un fût de vin de l\'île à soustraire aux réquisitions.' },
  'lampe-tsf': { name: 'Lampe de T.S.F.', icon: '💡', type: 'ressource', model: 'tube', desc: 'Une lampe radio de rechange, introuvable ou presque.' },
  galoche: { name: 'Galoche', icon: '👞', type: 'ressource', desc: 'Une chaussure à semelle de bois : le cuir est réservé à l\'occupant.' },
  'pain-gris': { name: 'Pain gris', icon: '🍞', type: 'consommable', desc: 'Le pain du rationnement, lourd et gris, coupé de son.', use: { stamina: 40, text: 'Ça cale…' } },
  ersatz: { name: 'Café d\'orge', icon: '☕', type: 'consommable', desc: 'Un « café national » fait d\'orge grillée et de chicorée.', use: { stamina: 25, text: 'Ça n\'a de café que le nom.' } },
  topinambour: { name: 'Soupe de topinambours', icon: '🥣', type: 'consommable', desc: 'Les légumes de la guerre : topinambours et rutabagas.', use: { stamina: 45, text: 'Nourrissant, à défaut d\'être bon.' } },
  pineau: { name: 'Verre de pineau', icon: '🍷', type: 'consommable', desc: 'Le vin de liqueur des Charentes.', use: { stamina: 30, text: 'Doux et chaleureux.' } },
  rustine: { name: 'Rustines', icon: '🩹', type: 'artefact', desc: 'Pour réparer les chambres à air : un trésor en 1943.' },
};

const shops = {
  boulangerie: { name: 'Boulangerie Guillon', intro: 'Une longue file d\'attente, tickets à la main. Le pain est gris et pèse lourd.', wares: [{ item: 'pain-gris', price: 1 }] },
  epicerie: { name: 'Épicerie Moderne', intro: 'Les rayons sont presque vides. Une ardoise annonce : « Pas de sucre cette semaine ».', wares: [{ item: 'ersatz', price: 1 }, { item: 'topinambour', price: 1 }] },
  cafe: { name: 'Café de la Plage', intro: 'Quelques habitués parlent à voix basse autour du poêle. Une affiche rappelle : « Taisez-vous, méfiez-vous, les oreilles ennemies vous écoutent ».', wares: [{ item: 'ersatz', price: 1 }] },
  cave: { name: 'Cave du Bois', intro: 'Odeur de bois et de vin. Des fûts portent une étiquette de réquisition.', wares: [{ item: 'pineau', price: 2 }] },
  cycles: { name: 'Cycles Brunet', intro: 'Des vélos démontés partout. Ici, on répare aussi les postes de T.S.F.', wares: [{ item: 'lampe-tsf', price: 4 }, { item: 'rustine', price: 1 }] },
  dispensaire: { name: 'Dispensaire', intro: 'Une salle blanche, deux lits, une armoire à pharmacie presque vide.', wares: [] },
};

const riddles = {
  'r-mur': {
    title: 'Le Mur de l\'Atlantique',
    q: 'Pourquoi les blockhaus ont-ils des murs de béton armé de deux à trois mètres d\'épaisseur ?',
    options: ['Pour garder la fraîcheur en été', 'Pour résister aux bombes des avions et aux obus des navires', 'Parce que le sable est instable', 'Pour être vus de loin'],
    answer: 1, hint: 'Ils doivent tenir sous le feu d\'une flotte de débarquement.',
    success: "Exact. De 1942 à 1944, l'organisation Todt fait couler des millions de mètres cubes de béton, de la Norvège à l'Espagne, pour empêcher un débarquement allié. Sur l'île de Ré, des dizaines d'ouvrages surveillent les plages et les pertuis.",
    codex: 'histoire-mur-atlantique', xp: 50,
  },
  'r-ration': {
    title: 'Le ticket de pain',
    q: 'En 1943, un adulte (catégorie A) a droit à 275 grammes de pain par jour. Combien pour une semaine ?',
    options: ['1,5 kg', '1,925 kg', '2,4 kg', '2,75 kg'],
    answer: 1, hint: '7 jours × 275 grammes.',
    success: "1,925 kg : moins de deux kilos de pain gris par semaine, et presque rien d'autre. Beaucoup de Français ont faim ; le marché noir prospère, à des prix que seuls les plus riches peuvent payer.",
    codex: 'vie-rationnement', xp: 40,
  },
};

const dialogues = {
  'rose.m1': [
    ['rose', "Malheureux ! Planté au milieu de la rue, dans cet accoutrement ! Vous voulez finir à la Kommandantur ? Ils contrôlent les papiers à chaque coin de rue."],
    ['me', "Je cherche quelqu'un qui garde un… objet très ancien."],
    ['rose', "… Montrez-moi ce que vous tenez. Ce disque de bronze… Ma mère m'en a parlé, quand j'étais petite : « Un jour, un voyageur viendra avec l'astrolabe. »"],
    ['rose', "Allez voir ma petite-fille, Hélène, au dispensaire, dans la rue principale. Et marchez comme si vous étiez d'ici."],
  ],
  'helene.m1': [
    ['helene', "Mémé vous envoie ? Fermez la porte. Vite."],
    ['helene', "Je m'appelle Hélène Garnier. Je soigne les gens du Bois avec trois fois rien. Et, comme ma mère et sa mère avant elle, je garde un éclat de l'Horloge des Marées."],
    ['helene', "Enfin… je le gardais. Ma grand-mère l'avait caché sous le plancher de la vieille cabane des douaniers, dans la dune. Mais les Allemands ont rasé la cabane : ils construisent un blockhaus à la place."],
    ['helene', "Ils coulent le béton dans quelques jours. Si l'éclat reste dessous, il sera enterré pour des siècles. Il faut le sortir de là. Mais sans papiers, vous ne pourrez jamais approcher de la côte."],
    ['helene', "Allez voir Marcel, le boulanger. Demandez-lui « un pain bien cuit pour la tante de Nantes ». Il comprendra."],
  ],
  'marcel.m2': [
    ['marcel', "Bonjour. Vos tickets, s'il vous plaît. … Vous désirez ?"],
    { choice: [
      { t: 'Un pain bien cuit, pour la tante de Nantes.', go: 'marcel.m2.ok', best: true },
      { t: "Hélène m'envoie pour des faux papiers.", go: 'marcel.m2.bad' },
    ] },
  ],
  'marcel.m2.bad': [
    ['marcel', "Chut ! Malheureux ! Pas si fort ! … Il y a un soldat qui achète son pain juste derrière vous."],
    ['narr', 'Marcel attend que le soldat soit sorti, puis te glisse un pain dans les mains en te fusillant du regard.'],
    { do: [['rep', -5]] },
    { go: 'marcel.m2.ok' },
  ],
  'marcel.m2.ok': [
    ['marcel', "Un pain bien cuit… Tenez. Et ne le mangez pas en route : il est pour Lucien, dans sa cabane au milieu des vignes, au nord-ouest du bourg."],
    { do: [['give', 'message']] },
  ],
  'lucien.m2': [
    ['lucien', "Un pain de Marcel ? … « La vigne attend le vendangeur. » Bon. Asseyez-vous."],
    ['lucien', "Des papiers pour approcher de la côte… Ça se fait. J'ai des tampons de mairie, un peu d'encre, et un ami qui dessine mieux que les fonctionnaires."],
    ['narr', 'Lucien sort d\'une caisse à vendange une carte d\'identité vierge et un laissez-passer. En quelques minutes, tu deviens « Camille Garnier, aide-infirmière ».'],
    { do: [['give', 'faux-papiers']] },
    ['lucien', "En échange, j'ai besoin de vous. Mais d'abord, apprenez à ne pas trembler devant un contrôle."],
  ],
  'lucien.m3': [
    ['lucien', "Londres veut savoir ce que les Allemands construisent sur nos plages. Chaque blockhaus, chaque canon, chaque champ de mines. Ces renseignements sauveront des vies, le jour du débarquement."],
    ['lucien', "Vous avez des papiers d'infirmière : vous pouvez approcher des dunes. Dessinez-moi trois ouvrages : le gros blockhaus à l'ouest, la casemate à l'est, et le chantier près de la route de la plage."],
    ['lucien', "Prenez ce carnet. Pas de mots, seulement des dessins. Si on vous arrête, vous dessinez les oiseaux."],
    { do: [['give', 'carnet-croquis']] },
  ],
  'lucien.m3b': [
    ['lucien', "Bon travail. Ces croquis partiront pour Londres par le prochain courrier. … Je les recopie. L'original, gardez-le, ou plutôt donnez-le à Hélène : elle saura le cacher."],
    ['lucien', "Un jour, quand tout ça sera fini, il faudra que les gens sachent ce qu'on a vécu ici."],
    { do: [['flag', 'wwii_carnet'], ['codex', 'histoire-resistance-re']] },
  ],
  'helene.m4': [
    ['helene', "Lucien m'a prévenue : le béton sera coulé demain à l'aube. C'est cette nuit ou jamais."],
    ['helene', "Il y a une sentinelle devant le chantier. Avec vos papiers d'aide-infirmière, et moi en blouse, on dira qu'on vient soigner un ouvrier blessé. Attendons la nuit, et partons ensemble."],
  ],
  'helene.m4.go': [
    ['helene', "C'est l'heure. Suivez-moi… non, passez devant, je vous suis. Doucement, le long de la route de la plage."],
  ],
  'soldat.m4': [
    ['soldat', 'Halt ! Couvre-feu ! Papiere !'],
    { choice: [
      { t: "(Tendre les faux papiers) Infirmières. Un ouvrier blessé au chantier.", go: 'soldat.m4.ok', best: true },
      { t: '(Courir vers les dunes)', go: 'soldat.m4.run' },
    ] },
  ],
  'soldat.m4.run': [
    ['narr', "Hélène te retient fermement par le bras. « Tu es folle ? Il tirerait. » Elle s'avance avec un grand sourire."],
    { go: 'soldat.m4.ok' },
  ],
  'soldat.m4.ok': [
    ['narr', 'Le soldat examine longuement les papiers à la lueur bleuie de sa lampe. Il regarde la blouse d\'Hélène, la sacoche, le brassard.'],
    ['soldat', '… Gut. Schnell. Vite. Dix minutes.'],
  ],
  'fouille.m4': [
    ['narr', "Dans l'ombre du coffrage, Hélène compte les pas depuis l'ancien piquet de la cabane. « Ici. » Tu creuses le sable entre les fers à béton…"],
    ['narr', "Tes doigts heurtent du métal froid : une petite boîte de fer, rongée par la rouille. À travers les interstices filtre une lueur bleue, qui bat comme un cœur."],
  ],
  'helene.m4b': [
    ['helene', "On l'a. On l'a ! Demain, ils couleront leur béton sur du sable, rien de plus."],
    ['helene', "Je garde la boîte au dispensaire, cachée dans l'armoire, entre les bandes. Personne ne fouille les pansements."],
  ],
  'helene.m5': [
    ['helene', "J'ai un problème. Pierre, le pêcheur, a une plaie infectée à la jambe. Sans sulfamides, il perdra sa jambe, ou pire. Et je n'en ai plus une seule boîte."],
    ['helene', "Ce matin, un homme est venu. Un trafiquant, un « Parisien » au manteau gris, qui vend de tout au marché noir. Il m'a proposé des sulfamides… contre « le cristal bleu ». Il sait, pour l'éclat."],
    ['helene', "Lucien dit que le réseau a reçu un parachutage de Londres, la semaine dernière : des armes, et des médicaments. Le père Bonnin les cache dans sa cave. Allez le voir."],
  ],
  'bonnin.m5': [
    ['bonnin', "Des médicaments ? Chut… Les fûts du fond, ceux marqués « réquisitionné » : les Allemands n'y touchent jamais, ils croient qu'ils sont déjà à eux. Il y a une boîte cachée derrière. Prenez-la."],
  ],
  'helene.m5b': [
    ['helene', "Des sulfamides ! De quoi soigner Pierre, et bien d'autres. Ce Parisien n'aura rien de moi."],
    ['narr', 'Hélène file au chevet du pêcheur. Par la fenêtre du café, le trafiquant au manteau gris vous regarde passer, sans sourire.'],
  ],
  'helene.m6': [
    ['helene', "Le Parisien m'a laissé un mot : « Ce soir, au vieux blockhaus de l'ouest. Venez seule avec le cristal, ou je parle à la Kommandantur de vos amis des vignes. »"],
    ['helene', "Je ne peux pas y aller. Mais vous… vous venez d'ailleurs, comme lui, n'est-ce pas ? Allez-y à ma place."],
  ],
  'trafiquant.final': [
    ['npc', "Encore vous. Toujours vous. Le Néolithique, Rome, les moines, Vauban, Ars… et maintenant ici. Vous êtes un vrai pot de colle."],
    ['me', "Vous menacez de dénoncer des résistants pour un éclat de cristal ?"],
    ['npc', "… Non. Je ne l'aurais pas fait. Je voulais seulement lui faire peur. Je ne suis pas de ceux-là."],
    ['npc', "Vous ne comprenez pas. Tant que je n'ai pas les sept éclats, je ne peux pas réparer ce qui a été fait à ma famille. Et vous les avez presque tous."],
    { choice: [
      { t: "Ce que l'Horloge garde n'appartient à personne. Pas même à moi.", go: 'trafiquant.refuse', best: true },
      { t: 'Qui êtes-vous, à la fin ?', go: 'trafiquant.who' },
    ] },
  ],
  'trafiquant.who': [
    ['npc', "Vous le saurez bien assez tôt. Chez vous. À votre époque. Je vous y attendrai, près de la dalle."],
    { go: 'trafiquant.refuse' },
  ],
  'trafiquant.refuse': [
    ['narr', "L'homme en gris recule dans l'ombre du blockhaus. Un grésillement, une odeur d'ozone… et il n'y a plus personne. Sur le béton, quelque chose s'allume et s'éteint : un rectangle de verre lumineux."],
    { do: [['flag', 'trafic_gone']] },
  ],
  'helene.m6b': [
    ['helene', "Un… téléphone ? Sans fil ? Et cette image : « Antiquités Lescure, Saint-Martin »… Lescure. Ce nom ne me dit rien."],
    ['helene', "Prenez l'éclat. Ma grand-mère disait : « Quand le voyageur viendra, rends-lui ce qui est à l'Horloge. » Le temps est venu."],
    { do: [['give', 'fragment-wwii'], ['rep', 30], ['flag', 'frag_wwii']] },
    ['helene', "Et si un jour, plus tard, vous croisez une petite fille qui me ressemble… dites-lui que sa grand-mère était courageuse. Enfin, un peu."],
    ['voice', "Les sept éclats sont réunis. Retourne à ton époque, au phare des Baleines. Le Cœur de l'Horloge t'y attend… et celui qui l'a volé aussi."],
  ],
  // ---------- secondaires ----------
  'rose.offer': [
    ['rose', "Mon petit, mes jambes ne me portent plus jusqu'à la boulangerie, et la queue dure deux heures. Tenez, voilà quelques sous. Vous me rapporteriez mon pain gris ?"],
    { choice: [{ t: 'Bien sûr, Mémé.', do: [['start', 'wwii.s1'], ['money', 2]] }, { t: 'Plus tard.', end: true }] },
  ],
  'rose.s1': [
    ['rose', "Merci, mon petit. Deux cent soixante-quinze grammes par jour… Tu te rends compte ? Avant la guerre, mon homme en mangeait un kilo."],
    { do: [['riddle', 'r-ration']] },
  ],
  'albert.offer': [
    ['albert', "Mon vélo a crevé, encore. Je dois distribuer trois lettres dans la rue principale. Vous voulez bien me donner un coup de main ? Les boîtes sont sur les portes."],
    { choice: [{ t: "D'accord.", do: [['start', 'wwii.s2'], ['give', 'lettre', 3]] }, { t: 'Je suis pressé.', end: true }] },
  ],
  'albert.s2': [
    ['albert', "Merci ! La lettre pour les Martin venait d'un camp de prisonniers, en Allemagne. Leur fils est vivant. Vous leur avez apporté la meilleure nouvelle de l'année."],
  ],
  'bonnin.offer': [
    ['bonnin', "Ils viennent demain réquisitionner encore vingt barriques. Si vous m'aidez à en cacher deux dans la vigne, sous les sarments, mes petits-enfants boiront mon vin après la guerre."],
    { choice: [{ t: 'Je vous aide.', do: [['start', 'wwii.s3']] }, { t: 'Trop risqué.', end: true }] },
  ],
  'bonnin.s3': [
    ['bonnin', "Ha ! Deux barriques de sauvées. Ce vin-là, on le boira le jour de la Libération. Vous serez invité, où que vous soyez."],
  ],
  'chaigneau.offer': [
    ['chaigneau', "Notre vieux poste de T.S.F. est en panne : une lampe a grillé. Le soir, quelques-uns d'entre nous écoutent… certaines émissions. C'est interdit, bien sûr. Brunet, le marchand de cycles, aurait peut-être une lampe."],
    { choice: [{ t: 'Je vais voir chez Brunet.', do: [['start', 'wwii.s4']] }, { t: 'Je ne veux pas d\'ennuis.', end: true }] },
  ],
  'chaigneau.s4': [
    ['narr', "Madame Chaigneau remplace la lampe, ferme les volets et tourne doucement le bouton. Un sifflement, des brouillages… puis quatre notes de timbale."],
    ['voice', "« Ici Londres ! Les Français parlent aux Français. Veuillez écouter tout d'abord quelques messages personnels… La mouette a mangé le raisin. Je répète : la mouette a mangé le raisin. »"],
    ['chaigneau', "Ces phrases idiotes sont des messages codés pour les réseaux. Quelque part, quelqu'un sait ce que veut dire la mouette. Merci. Vous nous avez rendu une voix."],
  ],
  'jojo.offer': [
    ['jojo', "J'ai perdu une galoche en courant dans la dune, près des barbelés. Si ma mère s'en aperçoit, je suis mort. Il n'y a plus de chaussures nulle part !"],
    { choice: [{ t: 'Je vais la chercher. Ne t\'approche pas des barbelés.', do: [['start', 'wwii.s5']] }, { t: 'Débrouille-toi.', end: true }] },
  ],
  'jojo.s5': [
    ['jojo', "Ma galoche ! Merci ! Tu sais, avant, j'avais des vraies chaussures en cuir. Maintenant c'est des semelles en bois, ça fait clac-clac dans la classe."],
  ],
  // ---------- conversations ----------
  'helene.chat': [['helene', (S) => (S.done('wwii.m6') ? 'Prenez soin de vous, voyageur. Et de l\'île.' : 'Rentrez avant le couvre-feu. Vingt-deux heures, pas une minute de plus.')]],
  'rose.chat': [['rose', 'Du pain gris, encore du pain gris… Enfin, tant qu\'il y en a.']],
  'marcel.chat': [['marcel', 'Pain gris, tickets s\'il vous plaît.'], { do: [['shop', 'boulangerie']] }],
  'lucien.chat': [['lucien', (S) => (S.flag('wwii_carnet') ? 'Vos croquis sont partis. Londres a bien reçu.' : 'Vous n\'avez rien vu, d\'accord ?')]],
  'chaigneau.chat': [['chaigneau', 'Les enfants ont faim, mais ils apprennent quand même. Ce sont eux, la France de demain.']],
  'jojo.chat': [['jojo', 'Mon père est prisonnier en Allemagne. Il rentrera quand la guerre sera finie, maman dit.']],
  'bonnin.chat': [['bonnin', 'Un petit verre de pineau ? Ça réchauffe le cœur.'], { do: [['shop', 'cave']] }],
  'albert.chat': [['albert', 'Courrier ! Enfin, quand il arrive.']],
  'soldat.chat': [['soldat', (S) => (S.has('faux-papiers') ? '… Papiere. … Gut. Weiter.' : 'Halt ! Zurück ! Zone interdite !')]],
  'trafiquant.chat': [['trafiquant', 'Du café, du vrai, du beurre, des bas de soie… Tout s\'achète. Même les souvenirs.']],
};

const quests = [
  { id: 'wwii.m1', main: true, auto: true, chapter: 6, title: 'Le Bois-Plage, 1943', desc: "L'île est occupée. Un voyageur sans papiers ne passe pas inaperçu.",
    steps: [
      { id: 'rose', type: 'talk', npc: 'rose', dialogue: 'rose.m1', text: 'Une vieille dame te fait signe, près de la pompe de la place.' },
      { id: 'helene', type: 'talk', npc: 'helene', dialogue: 'helene.m1', text: 'Rends-toi au dispensaire et parle à Hélène Garnier.' },
    ],
    rewards: { xpHist: 50, money: 4, rep: 5, codex: ['vie-occupation', 'perso-helene'] }, next: 'wwii.m2' },
  { id: 'wwii.m2', main: true, title: 'Le pain du matin', desc: 'Obtenir des faux papiers par la filière du boulanger.',
    steps: [
      { id: 'marcel', type: 'talk', npc: 'marcel', dialogue: 'marcel.m2', text: 'Va à la boulangerie et prononce la phrase convenue.' },
      { id: 'lucien', type: 'deliver', npc: 'lucien', item: 'message', count: 1, dialogue: 'lucien.m2', text: 'Porte le pain à Lucien, dans sa cabane au milieu des vignes.' },
    ],
    rewards: { xpExpl: 60, money: 4, rep: 10 }, next: 'wwii.m3' },
  { id: 'wwii.m3', main: true, title: "Le Mur de l'Atlantique", desc: 'Relever les ouvrages allemands des dunes pour la Résistance.',
    steps: [
      { id: 'lucien', type: 'talk', npc: 'lucien', dialogue: 'lucien.m3', text: 'Écoute ce que Lucien attend de toi.' },
      { id: 'croquis', type: 'interact', text: 'Dessine discrètement les 3 ouvrages des dunes.', targets: [
        { key: 'b0', at: 'obs0', label: 'Dessiner le blockhaus', anim: 'write', duration: 2, requires: 'carnet-croquis', text: 'Un gros blockhaus pour canon, tourné vers la mer. Tu notes l\'épaisseur du toit en nombre de pas.' },
        { key: 'b1', at: 'obs1', label: 'Dessiner la casemate', anim: 'write', duration: 2, requires: 'carnet-croquis', riddle: 'r-mur' },
        { key: 'b2', at: 'obs2', label: 'Dessiner le chantier', anim: 'write', duration: 2, requires: 'carnet-croquis', text: 'Le chantier : coffrages, ferrailles, sacs de ciment. Des ouvriers requis y travaillent de force.' },
      ] },
      { id: 'rapport', type: 'deliver', npc: 'lucien', item: 'carnet-croquis', count: 1, take: false, dialogue: 'lucien.m3b', text: 'Rapporte le carnet à Lucien.' },
    ],
    rewards: { xpHist: 90, money: 5, rep: 15, codex: ['histoire-mur-atlantique'] }, next: 'wwii.m4' },
  { id: 'wwii.m4', main: true, title: 'Sous le béton', desc: 'Sauver l\'éclat avant que le blockhaus ne soit coulé.',
    steps: [
      { id: 'helene', type: 'talk', npc: 'helene', dialogue: 'helene.m4', text: 'Retrouve Hélène au dispensaire.' },
      { id: 'nuit', type: 'wait', until: (S) => S.night(), text: 'Attends la nuit (une heure de jeu = une minute, ou touche N).' },
      { id: 'depart', type: 'talk', npc: 'helene', dialogue: 'helene.m4.go', text: 'Il fait nuit. Va chercher Hélène.' },
      { id: 'escorte', type: 'escort', npc: 'helene', to: 'chantier-entree', r: 5, text: 'Conduis Hélène jusqu\'à la route de la plage, près du chantier.', onStart: [['follow', 'helene']] },
      { id: 'garde', type: 'talk', npc: 'soldat', dialogue: 'soldat.m4', text: 'Passe le contrôle de la sentinelle.' },
      { id: 'fouille', type: 'interact', text: 'Fouille le sable sous le coffrage.', targets: [
        { key: 'fouille', at: 'fouille', label: 'Creuser le sable', anim: 'crouch', duration: 2.4, dialogue: 'fouille.m4', give: 'boite-fer' },
      ] },
      { id: 'retour', type: 'talk', npc: 'helene', dialogue: 'helene.m4b', text: 'Rejoins Hélène.', onDone: [['unfollow', 'helene']] },
    ],
    rewards: { xpExpl: 100, money: 6, rep: 20 }, next: 'wwii.m5' },
  { id: 'wwii.m5', main: true, title: 'Le marché noir', desc: 'Un trafiquant propose des médicaments contre l\'éclat.',
    steps: [
      { id: 'helene', type: 'talk', npc: 'helene', dialogue: 'helene.m5', text: 'Hélène a besoin de toi au dispensaire.' },
      { id: 'bonnin', type: 'talk', npc: 'bonnin', dialogue: 'bonnin.m5', text: 'Va voir le père Bonnin, à la Cave du Bois.' },
      { id: 'boite', type: 'collect', item: 'sulfamides', count: 1, text: 'Prends la boîte cachée derrière les fûts de la cave.', label: 'Prendre la boîte de sulfamides', spawns: [['cave', -1.6, -0.2]] },
      { id: 'soins', type: 'deliver', npc: 'helene', item: 'sulfamides', count: 1, dialogue: 'helene.m5b', text: 'Apporte les sulfamides à Hélène.' },
    ],
    rewards: { xpHist: 80, money: 6, rep: 15, codex: ['vie-marche-noir'] }, next: 'wwii.m6' },
  { id: 'wwii.m6', main: true, title: "L'homme au manteau gris", desc: 'Le trafiquant donne rendez-vous au vieux blockhaus.',
    steps: [
      { id: 'helene', type: 'talk', npc: 'helene', dialogue: 'helene.m6', text: 'Hélène a reçu un message.' },
      { id: 'blockhaus', type: 'talk', npc: 'trafiquant-blockhaus', dialogue: 'trafiquant.final', text: 'Rejoins le trafiquant au grand blockhaus de l\'ouest, dans la dune.' },
      { id: 'objet', type: 'collect', item: 'ana-smartphone', count: 1, text: "Ramasse l'objet lumineux qu'il a laissé.", label: "Ramasser l'objet", spawns: [['blockhaus', 0.9, 0.6]] },
      { id: 'helene2', type: 'talk', npc: 'helene', dialogue: 'helene.m6b', text: 'Retourne voir Hélène.' },
    ],
    rewards: { xpHist: 160, xpExpl: 60, rep: 20 } },
  // ---------- secondaires ----------
  { id: 'wwii.s1', giver: 'rose', offer: 'rose.offer', title: 'Le pain de Mémé Rose', desc: 'Faire la queue à la boulangerie pour Mémé Rose.',
    requires: ['wwii.m1'],
    steps: [
      { id: 'acheter', type: 'collect', item: 'pain-gris', count: 1, text: 'Achète un pain gris à la boulangerie Guillon.' },
      { id: 'livrer', type: 'deliver', npc: 'rose', item: 'pain-gris', count: 1, dialogue: 'rose.s1', text: 'Rapporte le pain à Mémé Rose.' },
    ],
    rewards: { xpHist: 40, money: 2, rep: 10, codex: ['vie-rationnement'] } },
  { id: 'wwii.s2', giver: 'albert', offer: 'albert.offer', title: 'La tournée du facteur', desc: 'Distribuer trois lettres.',
    steps: [
      { id: 'boites', type: 'interact', text: 'Glisse les 3 lettres dans les boîtes de la rue principale.', targets: [
        { key: 'l0', at: ['mairie', -6, 0.8], label: 'Glisser la lettre', anim: 'point', duration: 0.8, requires: 'lettre', consume: 'lettre' },
        { key: 'l1', at: ['mairie', 8, 0.8], label: 'Glisser la lettre', anim: 'point', duration: 0.8, requires: 'lettre', consume: 'lettre' },
        { key: 'l2', at: ['mairie', 38, 0.8], label: 'Glisser la lettre', anim: 'point', duration: 0.8, requires: 'lettre', consume: 'lettre' },
      ] },
      { id: 'albert', type: 'talk', npc: 'albert', dialogue: 'albert.s2', text: 'Retourne voir Albert, le facteur.' },
    ],
    rewards: { xpExpl: 30, money: 3, rep: 10 } },
  { id: 'wwii.s3', giver: 'bonnin', offer: 'bonnin.offer', title: 'Le vin de la Libération', desc: 'Soustraire deux barriques aux réquisitions.',
    requires: ['wwii.m2'],
    steps: [
      { id: 'barriques', type: 'collect', item: 'barrique', count: 2, text: 'Prends 2 barriques devant la Cave du Bois.', label: 'Soulever la barrique', spawns: [['cave', 1.6, 0.4], ['cave', 2.6, 0.2]] },
      { id: 'cacher', type: 'interact', text: 'Cache les barriques sous les sarments, dans la vigne.', targets: [
        { key: 'cache', at: 'cachette', label: 'Cacher les barriques', anim: 'carry', duration: 2, requires: 'barrique', need: 2, consume: 'barrique', consumeN: 2 },
      ] },
      { id: 'bonnin', type: 'talk', npc: 'bonnin', dialogue: 'bonnin.s3', text: 'Préviens le père Bonnin.' },
    ],
    rewards: { xpExpl: 40, money: 4, rep: 10, codex: ['histoire-vigne-re'] } },
  { id: 'wwii.s4', giver: 'chaigneau', offer: 'chaigneau.offer', title: 'Ici Londres', desc: 'Réparer le poste de T.S.F. de l\'école.',
    requires: ['wwii.m2'],
    steps: [
      { id: 'lampe', type: 'collect', item: 'lampe-tsf', count: 1, text: 'Achète une lampe de T.S.F. chez Cycles Brunet.' },
      { id: 'livrer', type: 'deliver', npc: 'chaigneau', item: 'lampe-tsf', count: 1, dialogue: 'chaigneau.s4', text: 'Apporte la lampe à Madame Chaigneau, à l\'école.' },
    ],
    rewards: { xpHist: 50, money: 2, rep: 10, codex: ['histoire-radio-londres'] } },
  { id: 'wwii.s5', giver: 'jojo', offer: 'jojo.offer', title: 'La galoche de Jojo', desc: 'Retrouver la galoche perdue dans la dune.',
    steps: [
      { id: 'galoche', type: 'collect', item: 'galoche', count: 1, text: 'Cherche la galoche dans la dune, près des barbelés.', label: 'Ramasser la galoche', spawns: [['dune', 0, 0]] },
      { id: 'livrer', type: 'deliver', npc: 'jojo', item: 'galoche', count: 1, dialogue: 'jojo.s5', text: 'Rends sa galoche à Jojo.' },
    ],
    rewards: { xpExpl: 25, money: 2, rep: 10, codex: ['vie-penurie'] } },
];

const codex = {
  'perso-helene': { cat: 'personnages', era: ERA, title: 'Hélène Garnier, infirmière',
    text: "Infirmière au dispensaire du Bois-Plage pendant l'Occupation, Hélène soigne les habitants avec des moyens de fortune et aide discrètement la Résistance. Gardienne d'un éclat de l'Horloge des Marées, comme sa mère et sa grand-mère, elle est la grand-mère d'Élise." },
  'vie-occupation': { cat: 'vie', era: ERA, title: "L'île sous l'Occupation",
    text: "Occupée dès juin 1940, l'île de Ré fait partie de la « zone côtière interdite » : il faut un Ausweis (laissez-passer) pour y entrer ou en sortir. Couvre-feu, réquisitions de logements, de chevaux et de vin, contrôles : la vie quotidienne est surveillée. L'île n'est libérée que le 8 mai 1945, avec la poche de La Rochelle." },
  'vie-rationnement': { cat: 'vie', era: ERA, title: 'Le rationnement',
    text: "À partir de 1940, pain, viande, sucre, beurre, café, savon, chaussures et vêtements sont rationnés. Chaque Français reçoit une carte et des tickets selon sa catégorie : E (enfants), J1, J2, J3 (jeunes), A (adultes), T (travailleurs de force), V (vieillards). Les files d'attente s'allongent devant les boutiques." },
  'vie-marche-noir': { cat: 'vie', era: ERA, title: 'Le marché noir',
    text: "Les produits rationnés se vendent en cachette à des prix énormes : le beurre ou le café peuvent coûter dix fois leur prix officiel. Certains s'enrichissent, d'autres pratiquent le « marché gris », échanges de services entre voisins et colis venus de la campagne." },
  'vie-penurie': { cat: 'vie', era: ERA, title: 'Le temps des ersatz',
    text: "Faute de tout, on invente des produits de remplacement, les « ersatz » : café d'orge ou de glands, saccharine au lieu du sucre, semelles de bois, pneus de vélo en tuyau d'arrosage, voitures au gazogène qui roulent au charbon de bois. On mange topinambours et rutabagas." },
  'histoire-mur-atlantique': { cat: 'histoire', era: ERA, title: "Le Mur de l'Atlantique",
    text: "De 1942 à 1944, l'Allemagne fait construire par l'organisation Todt une ligne de fortifications de la Norvège à l'Espagne. Sur l'île de Ré, blockhaus, batteries, casemates, champs de mines et obstacles de plage surveillent les côtes. Aujourd'hui, certains de ces bunkers, minés par l'érosion, basculent sur les plages." },
  'histoire-resistance-re': { cat: 'histoire', era: ERA, title: 'La Résistance',
    text: "Dès 1940, des Français refusent l'occupation : ils distribuent des tracts, cachent des aviateurs alliés, fabriquent des faux papiers, renseignent Londres sur les défenses côtières. Ces renseignements, comme les plans du Mur de l'Atlantique, ont aidé à préparer le Débarquement du 6 juin 1944. Beaucoup de résistants l'ont payé de leur vie." },
  'histoire-radio-londres': { cat: 'histoire', era: ERA, title: 'Radio Londres',
    text: "Depuis Londres, la BBC diffuse chaque soir l'émission « Les Français parlent aux Français ». Écouter la radio anglaise est interdit, mais des millions de Français le font en cachette. Les « messages personnels », phrases mystérieuses, sont des codes destinés aux réseaux de résistance." },
  'histoire-vigne-re': { cat: 'histoire', era: ERA, title: "La vigne de l'île",
    text: "La vigne couvre une grande partie de l'île depuis le Moyen Âge. Au XIXᵉ siècle, le phylloxéra la ravage puis elle est replantée. Pendant la guerre, le vin est réquisitionné par l'occupant. Aujourd'hui, les vignerons de l'île produisent vins, pineau et cognac." },
};

export default {
  era: ERA, npcs, extras, items, shops, riddles, dialogues, quests, codex,
};
