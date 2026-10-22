// CHAPITRE 2 — GAULE ROMAINE, IIᵉ siècle — Sainte-Marie (vicus de Ratis).
// Commerce maritime, sel et vin, Romains et Santons. Une fraude à la douane,
// une cargaison d'amphores, une pièce venue du futur, et Brennos, le vieux
// Santon qui garde le Fragment de Ratis dans l'ancien sanctuaire gaulois.

import { look, SKIN, HAIR, EYES } from '../../characters/wardrobe.js';

const ERA = 'antiquite';

const npcs = [
  {
    id: 'brennos', name: 'Brennos', title: 'Ancien des Santons, gardien', codex: 'perso-brennos',
    look: look(ERA, 'gaul', { age: 'old', hair: { style: 'long', color: HAIR.grey }, beard: { style: 'gaulish', color: HAIR.white } }),
    home: 'fanum',
    routine: [
      { from: 6, to: 12, at: ['borne', 1.2, 0.6], action: 'idle' },
      { from: 12, to: 21, at: 'fanum', action: 'pray' },
      { from: 21, to: 6, at: ['fanum', 2, 1], action: 'sit' },
    ],
    barks: ['Les Romains ont des routes droites. Nous avions des chemins vivants.', 'Ratis… la fougère. Voilà le vrai nom de cette île.', 'Le vent apporte des étrangers, ces temps-ci.'],
    talk: 'brennos.chat',
  },
  {
    id: 'lucius', name: 'Lucius Pompeius Varro', title: 'Négociant en vin et en sel', codex: 'perso-lucius',
    look: look(ERA, 'merchant', { eyes: EYES.brown, face: { expression: 'smile' } }),
    home: 'horreum',
    routine: [
      { from: 7, to: 12, at: 'horreum', action: 'write' },
      { from: 12, to: 14, at: ['taberna', 1.5, 1.5], action: 'drink' },
      { from: 14, to: 20, at: 'horreum', action: 'write' },
      { from: 20, to: 7, at: ['villa', 3, 2], action: 'idle' },
    ],
    barks: ['Le vin de Burdigala vaut de l\'or, le sel de Ratis aussi.', 'Encore cette maudite tablette…', 'Salve, ami !'],
    talk: 'lucius.chat',
  },
  {
    id: 'titus', name: 'Titus Aufidius', title: 'Fonctionnaire des douanes', codex: 'vie-portorium',
    look: look(ERA, 'customs'),
    home: 'statio',
    routine: [{ from: 7, to: 19, at: 'statio', action: 'write' }, { from: 19, to: 7, at: ['taberna', -1.5, 1.6], action: 'drink' }],
    barks: ['Deux et demi pour cent. Pas un as de moins.', 'Montrez-moi vos tablettes.', 'Rome voit tout, jusqu\'au bout de l\'Océan.'],
    talk: 'titus.chat',
  },
  {
    id: 'aelia', name: 'Aelia', title: 'Tenancière de la taberna',
    look: look(ERA, 'tavern'),
    home: 'taberna:keeper',
    routine: [{ from: 6, to: 24, at: 'taberna:keeper', action: 'idle' }, { from: 0, to: 6, at: 'taberna:keeper', action: 'idle' }],
    barks: ['Du vin chaud au miel ?', 'Mon garum est le meilleur de la côte !', 'Ici on paye avant de boire.'],
    talk: 'aelia.chat',
  },
  {
    id: 'quintus', name: 'Quintus', title: 'Saunier (salinator)', codex: 'metier-salinator',
    look: look(ERA, 'saunier'),
    home: 'salines',
    routine: [{ from: 6, to: 19, at: ['saline4', 0, 0.4], action: 'rake' }, { from: 19, to: 6, at: 'salines', action: 'idle' }],
    barks: ['Le soleil et le vent travaillent pour moi.', 'Sal, salis… et salarium !', 'Attention aux bassins, ne marche pas dedans.'],
    talk: 'quintus.chat',
  },
  {
    id: 'julia', name: 'Julia', title: 'Fille de Lucius',
    look: look(ERA, 'child'),
    home: ['forum', 3, -1],
    routine: [{ from: 8, to: 19, at: ['forum', 3, -1], action: 'play' }, { from: 19, to: 8, at: ['villa', 1, 2], action: 'idle' }],
    barks: ['Tu sais jouer aux osselets ?', 'Mon père dit que tu viens de très loin.', 'Mercure, il protège les voleurs aussi !'],
  },
  {
    id: 'claudia', name: 'Claudia Severa', title: 'Maîtresse de la villa',
    look: look(ERA, 'matron', { hair: { style: 'bun', color: HAIR.auburn }, eyes: EYES.green }),
    home: 'villa',
    routine: [
      { from: 7, to: 11, at: 'vigne', action: 'idle' },
      { from: 11, to: 20, at: 'villa', action: 'idle' },
      { from: 20, to: 7, at: 'villa', action: 'idle' },
    ],
    barks: ['Les vendanges approchent.', 'Ma mosaïque… quelle tristesse.', 'Bienvenue sous mon toit.'],
    talk: 'claudia.chat',
  },
  {
    id: 'sextus', name: 'Sextus', title: 'Pêcheur et batelier',
    look: look(ERA, 'sailor'),
    home: 'pecheur',
    routine: [{ from: 5, to: 20, at: 'pecheur', action: 'fish' }, { from: 20, to: 5, at: ['taberna', 0, 2.5], action: 'drink' }],
    barks: ['Les maquereaux arrivent avec le vent d\'ouest.', 'La Fortuna a eu chaud au passage des rochers.', 'Un garum ? Demande à Aelia.'],
  },
];

const extras = [
  { name: 'Porteur', look: look(ERA, 'worker'), path: 'port', barks: ['Pousse-toi, c\'est lourd !', 'Encore vingt amphores à décharger…'], action: 'carry' },
  { name: 'Porteur', look: look(ERA, 'worker', { hair: { style: 'short', color: HAIR.black }, outfit: { top: { c: 0x8a6a4a, p: 'linen' }, tunic: { c: 0x8a6a4a, p: 'linen', len: 0.5, flare: 0.5 } } }), path: 'port', barks: ['Ave !', 'Le navire repart à la marée.'] },
  { name: 'Matrone', look: look(ERA, 'matron', { outfit: { top: { c: 0x3a6a4a, p: 'wool' }, robe: { c: 0x3a6a4a, p: 'wool', len: 0.96, flare: 0.8 } }, hat: { type: 'palla', c: 0xd8c8a0 } }), path: 'decumanus', barks: ['Le pain est cher, cette saison.', 'As-tu vu le nouveau navire ?'] },
  { name: 'Marchand santon', look: look(ERA, 'gaul', { outfit: { cape: null }, props: { right: 'basket' } }), path: 'decumanus', barks: ['Mes laines viennent de Mediolanum.', 'Les Romains paient bien, il faut l\'avouer.'] },
];

const items = {
  amphore: { name: 'Amphore de vin', icon: '🏺', type: 'ressource', model: 'amphora', desc: 'Une amphore Dressel scellée au plâtre, marquée du timbre de Lucius.' },
  'tablette-fausse': { name: 'Tablette de cire (fausse)', icon: '📋', type: 'document', desc: 'La déclaration présentée à la douane : « XXX amphores ». Les lettres sont maladroites.' },
  'tablette-vraie': { name: 'Tablette de cire (originale)', icon: '📋', type: 'document', model: 'tablet', desc: 'La vraie déclaration de cargaison, avec le sceau de Lucius.',
    read: 'NAVIS FORTVNA · EX BVRDIGALA\nAMPHORAE VINI · XXIV\nSAL · MODII · CC\nL · POMPEIVS · VARRO · SIGNAVIT' },
  sel: { name: 'Panier de sel', icon: '🧂', type: 'ressource', desc: 'Du gros sel gris des salines de Quintus.' },
  poissons: { name: 'Panier de poissons', icon: '🐟', type: 'ressource', desc: 'Maquereaux et sardines, pour le garum.' },
  osselet: { name: 'Osselet', icon: '🦴', type: 'ressource', model: 'knucklebone', desc: "Un astragale de mouton : on y joue comme aux dés." },
  tesselles: { name: 'Sac de tesselles', icon: '🧩', type: 'ressource', model: 'mosaic', desc: 'De petits cubes de pierre et de verre colorés.' },
  tesselle: { name: 'Tesselle bleue', icon: '🟦', type: 'artefact', desc: "Un petit cube de pâte de verre bleue, souvenir de la mosaïque aux dauphins." },
  sesterce: { name: 'Sesterce de Marc Aurèle', icon: '🪙', type: 'artefact', codex: 'vie-monnaie-romaine', desc: "Grosse pièce de laiton à l'effigie de l'empereur philosophe." },
  vinum: { name: 'Coupe de vin miellé', icon: '🍷', type: 'consommable', desc: 'Du vin coupé d\'eau et adouci au miel (mulsum).', use: { stamina: 40, text: 'Doux et épicé.' } },
  panis: { name: 'Pain rond', icon: '🍞', type: 'consommable', desc: 'Un pain rond marqué de huit parts, comme à Pompéi.', use: { stamina: 50, text: 'Il est encore tiède.' } },
  garum: { name: 'Fiole de garum', icon: '🫙', type: 'consommable', desc: 'La sauce de poisson fermenté qui relève tous les plats romains.', use: { stamina: 25, text: "Ça sent fort… mais c'est délicieux sur du pain." } },
  'lampe-huile': { name: "Lampe à huile", icon: '🪔', type: 'artefact', codex: 'vie-romaine', desc: 'Une lampe en terre cuite ornée d\'un dauphin.' },
  'fibule': { name: 'Fibule émaillée', icon: '📍', type: 'artefact', desc: 'Une broche gauloise en bronze émaillé, pour fermer un manteau.' },
};

const shops = {
  taberna: { name: "Taberna d'Aelia", intro: "Le comptoir de maçonnerie est percé de jarres (dolia) d'où Aelia puise vin et sauces.", sign: { text: 'TABERNA', sub: 'VINVM · GARVM · PANIS', style: 'roman', icon: 'amphora' },
    wares: [{ item: 'vinum', price: 1 }, { item: 'garum', price: 2 }, { item: 'lampe-huile', price: 5 }] },
  pistrinum: { name: 'Pistrinum', intro: 'Une meule de pierre tourne au fond, actionnée par un âne.', sign: { text: 'PISTRINVM', sub: 'PANIS · FARINA', style: 'roman', icon: 'bread' },
    wares: [{ item: 'panis', price: 1 }] },
  faber: { name: 'Faber', intro: 'Le forgeron répare socs, clous et ferrures de navire.', sign: { text: 'FABER', sub: 'FERRVM · AES', style: 'roman', icon: 'anvil' },
    wares: [{ item: 'fibule', price: 6 }] },
};

const riddles = {
  'r-tablette': {
    title: 'La tablette originale',
    doc: 'NAVIS FORTVNA · EX BVRDIGALA\nAMPHORAE VINI · XXIV\nSAL · MODII · CC',
    q: "Combien d'amphores de vin la Fortuna transportait-elle vraiment ?",
    options: ['XXX — trente', 'XXIV — vingt-quatre', 'XIV — quatorze', 'CC — deux cents'],
    answer: 1, hint: 'X vaut 10, V vaut 5, I vaut 1. Placé avant un chiffre plus grand, le I se retranche : IV = 4.',
    success: "XXIV : vingt-quatre amphores, exactement ce que contient l'entrepôt. La fausse tablette, elle, annonçait XXX, trente : de quoi accuser Lucius d'avoir caché six amphores à la douane !",
    codex: 'vie-chiffres-romains', xp: 40,
  },
  'r-borne': {
    title: 'La borne milliaire',
    doc: 'IMP · CAES · M · AVRELIO\nANTONINO · AVG\nA · MEDIOLANO · SANTONVM\nM · P · XL',
    q: 'Combien de milles romains séparent cette borne de Mediolanum Santonum (Saintes) ?',
    options: ['Quatre milles', 'Quarante milles', 'Soixante milles', 'Quatorze milles'],
    answer: 1, hint: '« M · P » signifie milia passuum, les milles. XL : 10 retranché de 50 (L).',
    success: "Quarante milles : environ soixante kilomètres. Un mille romain valait mille pas doubles, soit à peu près 1 480 mètres. Les bornes milliaires jalonnaient les voies et portaient le nom de l'empereur qui les avait fait réparer.",
    codex: 'lieu-voies-romaines', xp: 35,
  },
};

const dialogues = {
  'brennos.m1': [
    ['brennos', "Tu regardes la borne comme si elle allait te parler. Elle ne parle qu'à ceux qui lisent le latin. Moi, je lis les gens."],
    ['brennos', "… Et ce que tu tiens dans ta main, je le connais. La roue des marées. Mon grand-père en parlait au coin du feu, avant que les Romains n'arrivent."],
    ['me', "Vous en gardez un éclat, n'est-ce pas ?"],
    ['brennos', "Doucement, étranger. Il y a une lune, un autre est venu me poser la même question. Un homme en manteau gris, qui payait avec des pièces étranges. Il a menacé, il a fouillé."],
    ['brennos', "Lucius, le négociant, a reçu une de ses pièces. Et depuis, tout va de travers pour lui : la douane l'accuse de fraude, ses amphores tombent des charrettes…"],
    ['brennos', "Aide Lucius. Montre que tu n'es pas comme l'homme gris. Ensuite, nous parlerons de la roue."],
    { do: [['money', 3], ['codex', 'histoire-ratis']] },
  ],
  'lucius.m2': [
    ['lucius', "Salve ! Brennos t'envoie ? Ce vieux Santon a bon cœur, sous ses moustaches."],
    ['lucius', "Je suis Lucius Pompeius Varro, négociant de Burdigala. Je vends le vin de la Gironde aux gens d'ici, et j'emporte leur sel jusqu'à Rome."],
    ['lucius', "Mais rien ne va ! Ce matin, ma charrette s'est renversée sur la route de l'ouest. Trois amphores ont roulé dans les fougères. Tu veux bien les ramener ? Mes porteurs ont peur des serpents."],
  ],
  'lucius.m2b': [
    ['lucius', "Intactes ! Les amphores Dressel sont solides, mais pas à ce point d'habitude. Les dieux t'aiment."],
    ['lucius', "Tu remarques le col épais et les deux anses ? On les empile dans les cales, la pointe dans le sable. Une amphore, c'est vingt-six litres de vin."],
  ],
  'titus.m3': [
    ['titus', "Halte. Tu travailles pour Lucius Pompeius Varro ? Alors tu travailles pour un fraudeur."],
    ['titus', "Sa tablette déclare trente amphores de vin. Mes hommes en ont compté vingt-quatre dans son entrepôt. Six amphores ont disparu… et Rome n'a pas touché son quarantième dessus."],
    ['me', "Lucius n'a pas l'air d'un voleur."],
    ['titus', "Les voleurs n'en ont jamais l'air. Apporte-moi une preuve, ou je saisis toute la cargaison avant les calendes."],
  ],
  'aelia.m3': [
    ['aelia', "Un homme en manteau gris ? Oh oui ! Il a bu ici trois soirs de suite, assis près de la table de Lucius. Il payait avec une pièce dorée et argentée, ronde comme une lune, que personne n'a voulue."],
    ['aelia', "La veille de l'arrivée de la Fortuna, je l'ai vu échanger une tablette avec celle que Lucius avait oubliée sur le comptoir. J'ai cru qu'il se trompait."],
    ['aelia', "Il est parti si vite qu'il a laissé tomber l'autre tablette derrière mes jarres. Va voir, elle doit y être encore."],
  ],
  'titus.m3b': [
    ['titus', "Montre… Le sceau de Lucius, intact. XXIV amphores. Et l'autre tablette… les lettres tremblent, la cire a été refaite."],
    ['titus', "Je m'étais trompé. L'homme gris a voulu faire saisir la cargaison de Lucius. Pourquoi ? Je l'ignore, mais je n'aime pas qu'on se moque de la douane impériale."],
    ['titus', "Dis à Lucius qu'il est libre de vendre son vin. Et qu'il paie son quarantième, comme tout le monde."],
  ],
  'quintus.m4': [
    ['quintus', "Lucius veut deux cents boisseaux de sel pour la Fortuna, et mes aides sont malades. Prends ce râteau."],
    ['quintus', "L'eau de mer entre par la vanne, s'évapore au soleil de bassin en bassin, et le sel se dépose au fond. Tu ramènes les cristaux vers le bord, doucement, sans remuer la vase."],
    ['quintus', "Le sel, c'est la vie ! Les soldats de Rome étaient autrefois payés en sel : de là vient le mot salarium, le salaire."],
  ],
  'lucius.m4': [
    ['lucius', "Du sel de Ratis ! Gris, humide, plein de goût. À Rome, on en sale les poissons, les olives, les jambons."],
    ['lucius', "Tu as sauvé ma cargaison, mon honneur, et maintenant mon chargement. Mais j'ai encore une chose à te montrer…"],
  ],
  'lucius.m5': [
    ['lucius', "Regarde cette pièce. L'homme gris me l'a donnée pour payer trois sacs de sel. Personne n'en veut : ni or, ni argent, ni bronze… et ce visage, ce n'est aucun empereur."],
    ['lucius', "« 2 EURO »… « 2019 ». Qu'est-ce que c'est que ces chiffres barbares ? Prends-la, elle me porte malheur."],
    { do: [['give', 'ana-euro']] },
    ['me', "Une pièce de deux euros, frappée en 2019. L'homme gris est bien passé par ici."],
    ['lucius', "Brennos te cherchait, je crois. Il a dit : « Quand le soleil touchera la mer, au vieux sanctuaire. »"],
  ],
  'brennos.m5': [
    ['brennos', "Tu as aidé Lucius, l'homme de Rome, sans rien demander. Les Santons appellent ça la vertu des hôtes."],
    ['brennos', "Avant le fanum des Romains, il y avait ici un sanctuaire de bois, et une pierre que nos druides appelaient la Gardienne. Les Romains ont bâti leur temple autour, mais la pierre est restée."],
    ['brennos', "Ce que je garde dort sous elle. L'homme gris a fouillé le temple. Il n'a jamais pensé à la vieille pierre des Santons. Les Romains non plus."],
  ],
  'fanum.stone': [
    ['narr', "Brennos pose sa paume sur la pierre sacrée et murmure quelques mots gaulois. Puis il glisse la main dans une fente, sous la base, et en sort un éclat doré enveloppé dans une toile de lin."],
    { do: [['give', 'fragment-antiquite'], ['unlock', 'moyenage'], ['rep', 20], ['flag', 'frag_ant']] },
    ['brennos', "Romains et Santons ont fini par vivre ensemble, par se marier, par prier les mêmes dieux sous des noms différents. La roue des marées garde tout cela."],
    ['voice', "Le troisième éclat retrouve sa place. Le temps suivant est celui des moines blancs, à La Flotte, quand l'île appartenait aux rois d'Angleterre."],
  ],
  'brennos.chat': [['brennos', (S) => (S.done('ant.m5') ? 'Que la roue tourne, voyageur. Et que les fougères repoussent toujours sur Ratis.' : 'Les Romains ont des routes droites. Nous avions des chemins vivants.')]],
  'lucius.chat': [['lucius', 'Le vin de Burdigala, le sel de Ratis : voilà de quoi faire fortune, si la douane veut bien me laisser tranquille !']],
  'titus.chat': [['titus', (S) => (S.done('ant.m3') ? 'Bonne journée, ami. Et pas de contrebande !' : 'Deux et demi pour cent. Pas un as de moins.')]],
  'aelia.chat': [['aelia', 'Assieds-toi ! Vin, garum, pain : tout est frais.'], { do: [['shop', 'taberna']] }],
  'quintus.chat': [['quintus', 'Le soleil et le vent travaillent pour moi. Moi, je ratisse.']],
  'claudia.chat': [['claudia', (S) => (S.flag('ant_mosaique') ? 'Mes dauphins nagent de nouveau dans la cour. Merci, ami.' : 'Bienvenue dans ma villa. Pardonne le désordre de la cour.')]],
  // ---------- secondaires ----------
  'aelia.offer': [
    ['aelia', "Il me faut des poissons frais pour mon garum, et Sextus, le batelier, m'en a promis un panier. Tu veux bien aller le chercher à la jetée ?"],
    { choice: [
      { t: "J'y vais.", do: [['start', 'ant.s1']] },
      { t: "Le garum, c'est quoi exactement ?", go: 'aelia.garum' },
      { t: 'Plus tard.', end: true },
    ] },
  ],
  'aelia.garum': [
    ['aelia', "Des entrailles de poisson, beaucoup de sel, et le soleil pendant des semaines, dans de grandes cuves. Ça sent fort, mais une goutte relève n'importe quel plat. Toute la Gaule en raffole !"],
    { choice: [{ t: "D'accord, je vais chercher les poissons.", do: [['start', 'ant.s1']] }, { t: 'Je reviendrai.', end: true }] },
  ],
  'sextus.s1': [['sextus', 'Le panier pour Aelia ? Le voilà : des maquereaux de ce matin. Dis-lui que je viendrai boire ce soir.'], { do: [['give', 'poissons']] }],
  'aelia.s1': [['aelia', "Parfaits ! Je les mets au sel tout de suite. Tiens, une fiole de mon garum de l'an passé : il est à point."], { do: [['give', 'garum']] }],
  'julia.offer': [
    ['julia', "J'ai perdu mes osselets ! Cinq, dans tout le forum. Sans eux, je ne peux pas jouer au jeu des cinq pierres."],
    { choice: [{ t: 'Je vais les retrouver.', do: [['start', 'ant.s2']] }, { t: 'Une autre fois.', end: true }] },
  ],
  'julia.s2': [
    ['julia', "Tous les cinq ! Regarde : on en lance un, et pendant qu'il vole, on ramasse les autres. Les dieux décident qui gagne."],
    ['julia', 'Tiens, celui-là, c\'est pour toi : il porte bonheur.'],
  ],
  'titus.offer': [
    ['titus', "Tu sais lire le latin, voyageur ? La borne milliaire de la place indique la distance jusqu'à Mediolanum Santonum. Dis-moi combien de milles, et je saurai si tu es lettré."],
    { choice: [{ t: 'Je vais la lire.', do: [['start', 'ant.s3']] }, { t: 'Le latin et moi…', end: true }] },
  ],
  'titus.s3': [['titus', 'Quarante milles, exactement. Tu lis le latin comme un magistrat. Rome est partout où on lit ses pierres.']],
  'claudia.offer': [
    ['claudia', "Les grappes sont mûres, et mes vendangeurs sont partis aider aux salines. Aide-moi à cueillir quatre ceps, que je puisse goûter le vin de l'année."],
    { choice: [{ t: 'Avec plaisir.', do: [['start', 'ant.s4']] }, { t: 'Pas maintenant.', end: true }] },
  ],
  'claudia.s4': [
    ['claudia', "De belles grappes noires. Ce sont les Romains qui ont apporté la vigne en Gaule, mais ce sont les Gaulois qui ont inventé le tonneau pour transporter le vin. Chacun son talent !"],
    { do: [['codex', 'flore-vigne']] },
  ],
  'claudia.offer2': [
    ['claudia', "Ma mosaïque aux dauphins… Le gel de l'hiver a arraché des tesselles. Les ouvriers en ont rangé des sacs dans l'entrepôt de Lucius et près de la villa, mais personne ne sait les remettre."],
    { choice: [{ t: 'Je vais essayer de la restaurer.', do: [['start', 'ant.s5']] }, { t: 'Je ne suis pas mosaïste…', end: true }] },
  ],
  'mosaique.fin': [
    ['narr', "Tesselle après tesselle, tu reconstitues les vagues bleues et le dos des dauphins. Claudia te regarde faire, émue."],
    { do: [['flag', 'ant_mosaique'], ['give', 'tesselle'], ['rep', 10]] },
    ['claudia', "Mes dauphins ! Ils nagent de nouveau. Tant que la villa tiendra debout, on se souviendra de toi ici."],
  ],
};

const quests = [
  { id: 'ant.m1', main: true, auto: true, chapter: 2, title: "Ratis, l'île aux fougères", desc: 'Au IIᵉ siècle, Romains et Santons se partagent le petit port de Sainte-Marie.',
    steps: [{ id: 'brennos', type: 'talk', npc: 'brennos', dialogue: 'brennos.m1', text: 'Parle au vieux Santon près de la borne milliaire.' }],
    rewards: { xpHist: 40, rep: 5 }, next: 'ant.m2' },
  { id: 'ant.m2', main: true, title: 'Le marchand de Burdigala', desc: 'Lucius Pompeius Varro a perdu une partie de sa cargaison.',
    steps: [
      { id: 'lucius', type: 'talk', npc: 'lucius', dialogue: 'lucius.m2', text: "Va voir Lucius à son entrepôt (l'horreum)." },
      { id: 'amphores', type: 'collect', item: 'amphore', count: 3, text: "Retrouve 3 amphores tombées sur la route de l'ouest.", label: "Ramasser l'amphore",
        spawns: [['route-ouest', 2, -2], ['route-ouest', -3, 3], ['route-ouest', 6, 4], ['route-ouest', -7, -1]] },
      { id: 'rendre', type: 'deliver', npc: 'lucius', item: 'amphore', count: 3, dialogue: 'lucius.m2b', text: 'Rapporte les amphores à Lucius.' },
    ],
    rewards: { xpExpl: 40, money: 5, rep: 10, codex: ['vie-amphores'] }, next: 'ant.m3' },
  { id: 'ant.m3', main: true, title: 'Les tablettes du publicain', desc: 'La douane accuse Lucius de fraude. Quelqu\'un a falsifié sa déclaration.',
    steps: [
      { id: 'titus', type: 'talk', npc: 'titus', dialogue: 'titus.m3', text: 'Parle à Titus Aufidius, au poste de douane près de la jetée.' },
      { id: 'indices', type: 'interact', text: "Examine la cargaison dans l'entrepôt.", targets: [
        { key: 'c1', at: ['caisses', -1, 0], label: 'Compter les amphores', anim: 'inspect', duration: 1.4, text: "Vingt-quatre amphores, toutes scellées au plâtre et marquées « L·P·V ». Aucune trace d'amphore manquante." },
        { key: 'c2', at: ['horreum', -3, 0.5], label: 'Examiner le registre de bord', anim: 'read', duration: 1.4, text: "Le registre du capitaine de la Fortuna note : « vingt-quatre amphores de vin, deux cents boisseaux de sel au retour ». Ce n'est pas ce que dit la tablette de la douane." },
      ] },
      { id: 'aelia', type: 'talk', npc: 'aelia', dialogue: 'aelia.m3', text: "Interroge Aelia, à la taberna : elle a peut-être vu quelque chose." },
      { id: 'tablette', type: 'interact', text: "Cherche la tablette originale derrière les jarres de la taberna, et lis-la.", targets: [
        { key: 'tab', at: ['taberna', -2.6, -0.2], model: 'tablet', label: 'Lire la tablette de cire', anim: 'inspect', duration: 1, riddle: 'r-tablette', give: 'tablette-vraie' },
      ] },
      { id: 'preuve', type: 'deliver', npc: 'titus', item: 'tablette-vraie', count: 1, dialogue: 'titus.m3b', text: 'Apporte la tablette originale à Titus.' },
    ],
    rewards: { xpHist: 70, money: 6, rep: 15, codex: ['vie-portorium'] }, next: 'ant.m4' },
  { id: 'ant.m4', main: true, title: 'Le sel de Ratis', desc: 'Il faut remplir la cale de la Fortuna de sel, pour son retour vers Burdigala.',
    steps: [
      { id: 'quintus', type: 'talk', npc: 'quintus', dialogue: 'quintus.m4', text: 'Va aider Quintus aux salines, à l\'est.' },
      { id: 'ratisser', type: 'interact', text: 'Ratisse le sel dans 3 bassins.', targets: [
        { key: 's1', at: 'saline1', label: 'Ratisser le sel', anim: 'rake', duration: 2.4, give: 'sel' },
        { key: 's2', at: 'saline3', label: 'Ratisser le sel', anim: 'rake', duration: 2.4, give: 'sel' },
        { key: 's3', at: 'saline7', label: 'Ratisser le sel', anim: 'rake', duration: 2.4, give: 'sel' },
      ] },
      { id: 'livrer', type: 'deliver', npc: 'lucius', item: 'sel', count: 3, dialogue: 'lucius.m4', text: 'Porte les 3 paniers de sel à Lucius.' },
    ],
    rewards: { xpExpl: 50, money: 8, rep: 10, codex: ['metier-salinator'] }, next: 'ant.m5' },
  { id: 'ant.m5', main: true, title: 'La pièce venue du futur', desc: "L'homme gris a payé Lucius avec une monnaie inconnue.",
    steps: [
      { id: 'lucius', type: 'talk', npc: 'lucius', dialogue: 'lucius.m5', text: 'Lucius veut te montrer quelque chose.' },
      { id: 'brennos', type: 'talk', npc: 'brennos', dialogue: 'brennos.m5', text: 'Retrouve Brennos au vieux sanctuaire (le fanum).' },
      { id: 'pierre', type: 'interact', text: 'Approche de la pierre sacrée des Santons avec Brennos.', targets: [
        { key: 'pierre', at: 'fanum', label: 'Toucher la pierre sacrée', anim: 'pray', duration: 2, dialogue: 'fanum.stone', codex: 'lieu-fanum' },
      ] },
    ],
    rewards: { xpHist: 120, xpExpl: 40, rep: 20, items: ['sesterce'] } },
  // ---------- secondaires ----------
  { id: 'ant.s1', giver: 'aelia', offer: 'aelia.offer', title: "Le garum d'Aelia", desc: 'Le garum ne se fait pas sans poissons.',
    steps: [
      { id: 'sextus', type: 'talk', npc: 'sextus', dialogue: 'sextus.s1', text: 'Va chercher le panier de poissons chez Sextus, à la jetée.' },
      { id: 'aelia', type: 'deliver', npc: 'aelia', item: 'poissons', count: 1, dialogue: 'aelia.s1', text: 'Rapporte les poissons à Aelia.' },
    ],
    rewards: { xpExpl: 25, money: 3, rep: 5, codex: ['vie-garum'] } },
  { id: 'ant.s2', giver: 'julia', offer: 'julia.offer', title: 'Les osselets de Julia', desc: 'Julia a semé ses osselets sur le forum.',
    steps: [
      { id: 'osselets', type: 'collect', item: 'osselet', count: 5, text: 'Retrouve 5 osselets autour du forum.', label: "Ramasser l'osselet",
        spawns: [['forum', -6, -3], ['forum', 7.5, 4.5], ['forum', 9, -4], ['forum', -9, 2], ['forum', 2, 5], ['statue', 1, 1]] },
      { id: 'julia', type: 'deliver', npc: 'julia', item: 'osselet', count: 5, dialogue: 'julia.s2', text: 'Rends ses osselets à Julia.' },
    ],
    rewards: { xpExpl: 25, money: 2, rep: 5, codex: ['vie-jeux'] } },
  { id: 'ant.s3', giver: 'titus', offer: 'titus.offer', title: 'La borne milliaire', desc: 'Titus veut savoir si tu lis le latin.',
    requires: ['ant.m3'],
    steps: [
      { id: 'lire', type: 'interact', text: 'Déchiffre la borne milliaire du forum.', targets: [{ key: 'borne', at: 'borne', label: 'Lire la borne milliaire', anim: 'read', duration: 1, riddle: 'r-borne' }] },
      { id: 'titus', type: 'talk', npc: 'titus', dialogue: 'titus.s3', text: 'Donne ta réponse à Titus.' },
    ],
    rewards: { xpHist: 40, money: 3 } },
  { id: 'ant.s4', giver: 'claudia', offer: 'claudia.offer', title: 'La vendange de la villa', desc: 'Aider Claudia Severa à vendanger.',
    steps: [
      { id: 'cueillir', type: 'interact', text: 'Cueille les grappes de 4 ceps.', targets: [
        { key: 'v1', at: ['vigne', -4, -6], label: 'Vendanger', anim: 'crouch', duration: 1.4 },
        { key: 'v2', at: ['vigne', -2, -2], label: 'Vendanger', anim: 'crouch', duration: 1.4 },
        { key: 'v3', at: ['vigne', 0, 2], label: 'Vendanger', anim: 'crouch', duration: 1.4 },
        { key: 'v4', at: ['vigne', 2, -4], label: 'Vendanger', anim: 'crouch', duration: 1.4 },
      ] },
      { id: 'claudia', type: 'talk', npc: 'claudia', dialogue: 'claudia.s4', text: 'Retourne voir Claudia.' },
    ],
    rewards: { xpExpl: 30, money: 4, rep: 10 } },
  { id: 'ant.s5', giver: 'claudia', offer: 'claudia.offer2', title: 'La mosaïque aux dauphins', desc: 'Restaurer la mosaïque de la villa.',
    requires: ['ant.s4'],
    steps: [
      { id: 'tesselles', type: 'collect', item: 'tesselles', count: 3, text: 'Retrouve 3 sacs de tesselles.', label: 'Prendre le sac de tesselles',
        spawns: [['horreum', 3, 1], ['villa', -6, 1.5], ['villa', 6, 1.5]] },
      { id: 'poser', type: 'interact', text: 'Restaure la mosaïque de la cour.', targets: [
        { key: 'mos', at: 'mosaique', label: 'Poser les tesselles', consume: 'tesselles', consumeN: 3, anim: 'crouch', duration: 3, dialogue: 'mosaique.fin', codex: 'vie-mosaique' },
      ] },
    ],
    rewards: { xpHist: 60, money: 5 } },
];

const codex = {
  'perso-brennos': { cat: 'personnages', era: ERA, title: 'Brennos, ancien des Santons',
    text: "Né deux siècles après la conquête de César, Brennos parle latin aux Romains et gaulois à sa petite-fille. Il garde les chants, les noms des sources et des pierres, et un éclat de « la roue des marées » confié par son grand-père." },
  'perso-lucius': { cat: 'personnages', era: ERA, title: 'Lucius Pompeius Varro, négociant',
    text: "Négociant (negotiator) de Burdigala (Bordeaux), Lucius achète le sel de l'île et y vend le vin de Gironde. Il espère devenir édile de sa cité. Son navire, la Fortuna, est une corbita, un gros voilier de commerce ventru." },
  'histoire-ratis': { cat: 'histoire', era: ERA, title: "Ratis, l'île des Santons",
    text: "Avant la conquête romaine (58-51 av. J.-C.), la région appartient au peuple gaulois des Santons, dont la capitale deviendra Mediolanum Santonum (Saintes). L'île serait alors appelée Ratis, « la fougère ». Sous l'Empire, la Gaule se romanise : villas, routes, monnaie, latin, temples… mais les Gaulois gardent bien des traditions." },
  'vie-portorium': { cat: 'vie', era: ERA, title: 'La douane romaine',
    text: "La Quadragesima Galliarum, taxe de 2,5 % (un quarantième) sur les marchandises, était perçue dans des postes de douane (stationes) aux frontières des provinces, dans les ports et sur les routes. Les marchands déclaraient leurs cargaisons sur des tablettes de cire." },
  'vie-chiffres-romains': { cat: 'vie', era: ERA, title: 'Les chiffres romains',
    text: "I = 1, V = 5, X = 10, L = 50, C = 100, D = 500, M = 1 000. Un chiffre plus petit placé avant un plus grand se retranche (IV = 4, IX = 9, XL = 40). On les utilise encore pour les siècles, les rois et les cadrans d'horloge." },
  'lieu-voies-romaines': { cat: 'lieux', era: ERA, title: 'Voies et bornes milliaires',
    text: "Les Romains ont construit en Gaule un réseau de routes pavées ou empierrées. Tous les mille pas (environ 1,48 km), une borne milliaire indiquait la distance jusqu'à la ville la plus proche et honorait l'empereur qui avait fait réparer la route." },
  'metier-salinator': { cat: 'metiers', era: ERA, title: 'Les sauniers romains',
    text: "Les Romains exploitaient déjà les marais littoraux : l'eau de mer s'évaporait dans des bassins peu profonds et laissait le sel. Indispensable pour conserver la nourriture, le sel était si précieux que le mot « salaire » vient du latin salarium, l'argent donné aux soldats pour acheter leur sel." },
  'vie-amphores': { cat: 'vie', era: ERA, title: 'Les amphores',
    text: "Grandes jarres de terre cuite à deux anses et à pied pointu, les amphores transportaient vin, huile, garum et olives. Leur forme permettait de les caler dans le sable des cales. Les archéologues les classent par types (Dressel, Gauloise…) pour retracer les routes du commerce." },
  'vie-garum': { cat: 'vie', era: ERA, title: 'Le garum',
    text: "Sauce de poisson fermenté au sel et au soleil pendant plusieurs semaines, le garum était le condiment préféré des Romains. On en produisait sur toutes les côtes de l'Empire, y compris en Gaule atlantique. Les meilleurs garums valaient très cher." },
  'vie-jeux': { cat: 'vie', era: ERA, title: 'Les jeux des enfants romains',
    text: "Osselets (astragales de mouton), noix, toupies, poupées articulées, cerceaux : les enfants romains jouaient à des jeux que l'on reconnaît encore. Les osselets servaient aussi de dés pour les adultes." },
  'vie-mosaique': { cat: 'vie', era: ERA, title: 'La mosaïque',
    text: "Les riches villas gallo-romaines ornaient leurs sols de mosaïques faites de milliers de tesselles (petits cubes de pierre, de terre cuite ou de verre). Les motifs marins — dauphins, poissons, Neptune — étaient très appréciés au bord de l'Océan." },
  'vie-programmata': { cat: 'vie', era: ERA, title: 'Les inscriptions électorales',
    text: "Les murs des villes romaines portaient des slogans peints en lettres rouges appelant à voter pour tel candidat aux magistratures locales. Ces « programmata » nous renseignent sur la vie politique et les métiers des cités." },
  'lieu-fanum': { cat: 'lieux', era: ERA, title: 'Le fanum gallo-romain',
    text: "Le fanum est un temple typique de la Gaule romaine : une salle carrée et haute (la cella) entourée d'une galerie à colonnes. Il était souvent bâti à l'emplacement d'un ancien sanctuaire gaulois, mêlant dieux romains et divinités locales." },
  'vie-monnaie-romaine': { cat: 'vie', era: ERA, title: 'La monnaie romaine',
    text: "L'aureus d'or, le denier d'argent, le sesterce de laiton et l'as de bronze circulaient dans tout l'Empire. Un sesterce valait quatre as ; un légionnaire gagnait environ 1 200 sesterces par an. Les pièces portaient le portrait de l'empereur." },
  'vie-romaine': { cat: 'vie', era: ERA, title: 'La vie dans un vicus',
    text: "Un vicus est une petite agglomération sans statut de cité : quelques rues, un marché, des boutiques (tabernae), des artisans, parfois un temple et des thermes. On y vit au rythme du commerce, des récoltes et du port." },
};

export default { era: ERA, npcs, extras, items, shops, riddles, dialogues, quests, codex };
