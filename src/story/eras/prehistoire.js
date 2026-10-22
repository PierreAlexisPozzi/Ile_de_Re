// CHAPITRE 1 — NÉOLITHIQUE, vers 4500 av. J.-C. — Les Portes-en-Ré.
// Le clan de la Pointe. Gagner la confiance des premiers habitants : tailler
// le silex, suivre la piste du cerf, redresser la pierre du couchant, et
// recevoir de Maëla, la gardienne, le Fragment des Pierres levées.

import { look, SKIN, HAIR, EYES } from '../../characters/wardrobe.js';
import { heightAt } from '../../world/terrain.js';

const ERA = 'prehistoire';

const npcs = [
  {
    id: 'maela', name: 'Maëla', title: 'Sage du clan, gardienne', codex: 'perso-maela',
    look: look(ERA, 'sage', { eyes: EYES.green }),
    home: 'banc-foyer',
    routine: [
      { from: 6, to: 11, at: ['dolmen', -1.5, -1], action: 'pray' },
      { from: 11, to: 19, at: ['menhirs', 2, 0], action: 'idle' },
      { from: 19, to: 6, at: 'banc-foyer', action: 'sit' },
    ],
    barks: ['Les pierres écoutent la mer.', "Le vent tourne… quelque chose s'approche.", 'Assieds-toi près du feu, voyageur.'],
    talk: 'maela.chat',
  },
  {
    id: 'orven', name: 'Orven', title: 'Chasseur, chef de la chasse', codex: 'perso-orven',
    look: look(ERA, 'hunter', { eyes: EYES.brown }),
    home: ['spawn', -1, -6],
    routine: [
      { from: 6, to: 17, at: ['spawn', -1, -6], action: 'guard' },
      { from: 17, to: 22, at: ['foyer', -2.5, 0.5], action: 'idle' },
      { from: 22, to: 6, at: ['foyer', -2.5, 0.5], action: 'sit' },
    ],
    barks: ['Les cerfs descendent boire au crépuscule.', 'Une sagaie mal taillée, un ventre vide.', 'Ne marche pas sur les traces !'],
    talk: 'orven.chat',
  },
  {
    id: 'tala', name: 'Tala', title: 'Tailleuse de silex',
    look: look(ERA, 'knapper'),
    home: 'atelier',
    routine: [{ from: 6, to: 20, at: 'atelier', action: 'knap' }, { from: 20, to: 6, at: ['foyer', 2.5, -2], action: 'sit' }],
    barks: ['Toc… toc… la pierre a son humeur.', 'Le bon silex sonne clair.', "Attention aux éclats, ils coupent comme l'herbe des dunes."],
    talk: 'tala.chat',
  },
  {
    id: 'kern', name: 'Kern', title: 'Pêcheur',
    look: look(ERA, 'fisher'),
    home: 'sechoir',
    routine: [
      { from: 5, to: 11, at: ['rivage', 2, -2], action: 'fish' },
      { from: 11, to: 20, at: 'sechoir', action: 'idle' },
      { from: 20, to: 5, at: ['foyer', 3, 1], action: 'sit' },
    ],
    barks: ['La marée basse donne les coques et les palourdes.', 'Ma pirogue prend l\'eau…', 'Les mulets sautent ce matin.'],
    talk: 'kern.chat',
  },
  {
    id: 'nea', name: 'Néa', title: 'Potière',
    look: look(ERA, 'potter'),
    home: 'potiere',
    routine: [{ from: 6, to: 20, at: 'potiere', action: 'stir' }, { from: 20, to: 6, at: ['foyer', 0, 3], action: 'sit' }],
    barks: ["L'argile du marais est la meilleure.", 'Un vase, ça se monte en colombins, patiemment.', 'Le feu décide de la couleur.'],
    talk: 'nea.chat',
  },
  {
    id: 'brann', name: 'Brann', title: 'Enfant du clan',
    look: look(ERA, 'child'),
    home: ['rivage', -4, 2],
    routine: [{ from: 7, to: 20, at: ['rivage', -4, 2], action: 'play' }, { from: 20, to: 7, at: ['foyer', 1, 2.5], action: 'sit' }],
    barks: ['Tu viens de la mer ? Ou du ciel ?', 'Regarde mes coquillages !', 'Orven dit que je chasserai l\'hiver prochain.'],
  },
  {
    id: 'doran', name: 'Doran', title: 'Ancien du clan',
    look: look(ERA, 'elder'),
    home: ['foyer', -3, -1.5],
    routine: [{ from: 0, to: 24, at: ['foyer', -3, -1.5], action: 'sit' }],
    barks: ['Mes os sentent la pluie.', 'Quand j\'étais jeune, la mer était plus loin.', 'Viens ce soir, au feu. Je raconterai.'],
    talk: 'doran.chat',
  },
];

const extras = [
  { name: 'Femme du clan', look: look(ERA, 'potter', { hair: { style: 'braids', color: HAIR.dark }, props: { left: null } }), path: 'camp', barks: ['Le grain doit être moulu avant la nuit.', 'Tu as faim, étranger ?'] },
  { name: 'Chasseur', look: look(ERA, 'hunter', { hair: { style: 'long', color: HAIR.auburn }, beard: { style: 'short', color: HAIR.auburn } }), path: 'rive', barks: ['Les phoques sont revenus sur les rochers.', "L'étranger aux habits lisses…"] },
];

const items = {
  silex: { name: 'Rognon de silex', icon: '🪨', type: 'ressource', model: 'flint', desc: 'Un nodule de silex noir à cortex blanc, ramassé sur la grève.' },
  'pointe-silex': { name: 'Pointe de sagaie en silex', icon: '🔺', type: 'outil', codex: 'metier-silex', desc: "Taillée par percussion puis retouchée par pression. Tranchante comme un rasoir." },
  'bois-cerf': { name: 'Bois de cerf', icon: '🦌', type: 'artefact', desc: "Un andouiller offert par Orven. On en fait des manches, des harpons, des pics à creuser." },
  'hache-polie': { name: 'Hache polie', icon: '🪓', type: 'artefact', codex: 'vie-neolithique', desc: "Lame de pierre verte polie des heures durant sur un grès mouillé, emmanchée dans du frêne. L'outil des premiers défricheurs." },
  coquillage: { name: 'Coquillage', icon: '🐚', type: 'ressource', model: 'shell', desc: 'Coque, littorine, nasse… La grève en est couverte.' },
  'collier-coquillages': { name: 'Collier de coquillages', icon: '📿', type: 'artefact', codex: 'vie-parure', desc: "Le cadeau de Brann : des coquillages percés enfilés sur un tendon." },
  resine: { name: 'Résine de pin', icon: '🟠', type: 'ressource', model: 'resin', desc: 'Une larme de résine collante, parfumée.' },
  argile: { name: "Motte d'argile", icon: '🟤', type: 'ressource', model: 'clay', desc: "L'argile grise du bord du marais." },
  'vase-neolithique': { name: 'Vase néolithique', icon: '🏺', type: 'artefact', codex: 'metier-potier', desc: 'Façonné par Néa, décoré de petites empreintes d\'ongle. Tu le gardes comme un trésor.' },
  herbe: { name: 'Plante médicinale', icon: '🌿', type: 'ressource', model: 'herb', desc: 'Salicorne, immortelle, criste marine…' },
  'poisson-seche': { name: 'Poisson séché', icon: '🐟', type: 'consommable', desc: 'Du mulet séché au vent et au soleil.', use: { stamina: 50, text: 'Salé et nourrissant.' } },
  'galette-orge': { name: "Galette d'orge", icon: '🫓', type: 'consommable', desc: "Cuite sur une pierre chaude.", use: { stamina: 40, text: 'Croquante et un peu brûlée.' } },
  'lame-silex': { name: 'Lame de silex', icon: '🗡', type: 'outil', desc: 'Un long éclat tranchant, emmanché dans un os.' },
};

const shops = {
  troc: { name: 'Troc du clan', intro: "Ici, pas de monnaie : on échange. Les coquillages percés servent de mesure entre familles.",
    wares: [{ item: 'poisson-seche', price: 1 }, { item: 'galette-orge', price: 1 }, { item: 'lame-silex', price: 3 }, { item: 'hache-polie', price: 8 }] },
};

const riddles = {
  'r-couchant': {
    title: 'La pierre du couchant',
    doc: "« Quand le soleil meurt dans la mer,\nla pierre au cœur de spirale le regarde mourir. »\n— chant de Maëla",
    q: 'Vers où la pierre renversée doit-elle regarder, une fois redressée ?',
    options: ["Vers l'est, là où le soleil naît", 'Vers le nord, vers le Fier', "Vers l'ouest, là où il se couche dans l'océan", 'Vers le sud, vers la forêt'],
    answer: 2, hint: "Le soleil « meurt dans la mer » au couchant. Et la peau peinte près des pierres montre toutes les spirales tournées vers lui.",
    success: "Tu montres le couchant. Maëla sourit : « Tu as des yeux, voyageur. Les anciens alignaient les pierres sur le soleil du solstice d'été, quand il se couche le plus au nord. »",
    codex: 'lieu-menhirs', xp: 40,
  },
};

const dialogues = {
  // ---------- quête 1 ----------
  'orven.m1': [
    ['orven', "Halte ! Qui es-tu ? Tu sens la fumée froide et tes habits brillent comme la peau d'un poisson."],
    ['me', "Je viens de très loin. Je cherche… une pierre qui garde la mémoire de cette terre."],
    ['orven', "Une pierre ? Il y a quatre lunes, un autre étranger est venu. Un homme gris, à la peau sans poils, qui parlait trop. Il a renversé une de nos pierres dressées."],
    ['orven', "Je ne fais pas confiance aux étrangers. Mais ce n'est pas moi qui décide de ces choses. Va voir Maëla, la sage. Elle est près des pierres ou au dolmen."],
  ],
  'maela.m1': [
    ['maela', "Ah… La pierre qui tourne. Je l'ai vue en rêve, la nuit où la mer a reculé de travers."],
    ['maela', "Mes mères me l'ont dit, et leurs mères avant elles : les premiers du clan ont posé une pierre qui écoute la mer. Chaque peuple qui viendra après nous y ajoutera la sienne."],
    ['me', 'Vous gardez un de ses éclats, n\'est-ce pas ?'],
    ['maela', "Je garde ce qui doit être gardé. L'homme gris l'a cherché, lui aussi. Il a fouillé, crié, renversé la pierre du couchant. Il n'a pas trouvé."],
    ['maela', "Je ne donne pas ce que je garde au premier venu, même s'il porte la pierre qui tourne. Montre au clan qui tu es : apprends la pierre qui coupe avec Tala, puis suis la piste du cerf avec Orven."],
  ],
  // ---------- quête 2 ----------
  'tala.m2': [
    ['tala', "Maëla t'envoie ? Elle veut que tu apprennes le silex. Bien. Montre-moi tes mains… Des mains d'enfant. On va arranger ça."],
    ['tala', "D'abord, il me faut de la bonne pierre. Va sur la grève, vers le soleil levant : la mer y roule des rognons de silex noir. Rapporte-m'en trois."],
  ],
  'tala.m2b': [
    ['tala', "Ceux-là sonnent bien. Écoute : toc… clair, sans fêlure."],
    ['tala', "Maintenant, à genoux devant la pierre d'atelier. Tu frappes le bord avec le percuteur, toujours en biais, et tu enlèves les éclats un à un. Doucement. La pierre a son humeur."],
  ],
  'tala.m2c': [
    ['tala', "… Pas mal du tout, pour une première fois. Une vraie pointe de sagaie, fine, symétrique. Garde-la : Orven en aura besoin."],
  ],
  // ---------- quête 3 ----------
  'orven.m3': [
    ['orven', "Tala dit que tu as taillé une belle pointe. On verra si tu sais t'en servir."],
    ['orven', "Un grand cerf rôde dans la chênaie, au sud. Suis ses traces, sans bruit. Un chasseur lit la terre comme Maëla lit les étoiles : sabots, branches cassées, écorce frottée."],
    ['orven', "Quand tu le trouveras, lance ta sagaie. Et remercie son esprit : il nous donne sa chair, son cuir, ses bois et ses os pour l'hiver."],
  ],
  'chasse.fin': [
    ['narr', "Tu retiens ton souffle. Le cerf lève la tête, hume l'air… La sagaie part. Orven surgit des fourrés et achève le travail d'un geste sûr."],
    ['orven', "Bien. Très bien. Pose ta main sur lui. Merci, frère cerf, pour ce que tu nous donnes."],
    { do: [['fn', (api) => removeQuestDeer(api)]] },
  ],
  'orven.m3b': [
    ['orven', "Le clan mangera ce soir grâce à toi. Prends ce bois de cerf : on en fait des manches, des pics, des harpons."],
    ['orven', "… Je m'étais trompé sur toi, étranger. Maëla t'attend. Elle a dit que la pierre du couchant a besoin de bras."],
  ],
  // ---------- quête 4 ----------
  'maela.m4': [
    ['maela', "Tu as gagné le respect d'Orven. Ce n'est pas rien."],
    ['maela', "Écoute. L'homme gris a renversé la troisième pierre de l'alignement, celle qui porte la spirale. Depuis, les marées sont folles, et je fais de mauvais rêves."],
    ['maela', "Va voir les pierres. Lis-les. Puis dis-moi vers où regardait la pierre tombée. Si tu sais lire, tu sauras."],
  ],
  'kern.m4': [
    ['kern', "Redresser la pierre du couchant ? Il faudra des cordes en tilleul, des leviers et quatre bras de plus. Orven et moi, on vient."],
    ['kern', "Pousse quand je chante. Hooo… hisse !"],
  ],
  'menhir.up': [
    ['narr', "Les leviers grincent, les cordes se tendent. Kern chante, Orven pousse, et la grande pierre se relève lentement, face au couchant."],
    { do: [['fn', (api) => raiseMenhir(api)], ['flag', 'menhir_up'], ['rep', 15]] },
    ['maela', 'Elle regarde de nouveau le soleil mourir. Entends-tu ? La mer se calme.'],
  ],
  // ---------- quête 5 ----------
  'maela.m5': [
    ['maela', "Viens. Ce que je garde dort sous la table de pierre, là où dorment nos anciens."],
    ['maela', "L'homme gris a creusé de ce côté-ci, du mauvais côté. Il n'écoute pas la pierre. Toi, tu écoutes."],
  ],
  'dolmen.inside': [
    ['narr', "Sous la grande dalle, la chambre sent la terre froide. Maëla écarte une pierre plate. Dans un creux, enveloppé dans une peau de phoque, un éclat doré palpite."],
    { do: [['give', 'fragment-prehistoire'], ['flag', 'frag_pre']] },
    ['maela', "Il est à toi, porteur de la pierre qui tourne. Rapporte-le à la grande pierre. Et méfie-toi de l'homme gris."],
    ['narr', "En te relevant, ton pied heurte un petit objet rouge, enfoncé dans le sable. Lisse, brillant, totalement déplacé : un briquet en plastique."],
    { do: [['give', 'ana-briquet'], ['unlock', 'antiquite'], ['rep', 20]] },
    ['me', "Un briquet… ici, six mille ans avant son invention. L'homme gris voyage dans le temps, lui aussi."],
    ['voice', "Le deuxième éclat retrouve sa place. Le temps suivant t'appelle : là où l'on parle la langue de Rome, à Sainte-Marie."],
  ],
  // ---------- quêtes secondaires ----------
  'brann.offer': [
    ['brann', "Tu veux voir mes coquillages ? J'en fais un collier pour Maëla, mais il m'en manque cinq. Les plus beaux sont sur la grève, vers les rochers."],
    { choice: [
      { t: 'Je vais t\'aider à en trouver.', do: [['start', 'pre.s1']] },
      { t: 'Plus tard, Brann.', end: true },
    ] },
  ],
  'brann.s1': [
    ['brann', "Oh ! Une nasse, une littorine, et celui-là est tout rose ! Attends…"],
    ['brann', "Tiens. Celui-là, c'est pour toi. Comme ça, tu reviendras."],
  ],
  'kern.offer': [
    ['kern', "Ma pirogue fuit comme un panier percé. Il me faut de la résine pour calfater les fentes. Les rares pins de la pointe en pleurent quand il fait chaud."],
    { choice: [
      { t: "Je t'en rapporte trois larmes.", do: [['start', 'pre.s2']] },
      { t: 'Une autre fois.', end: true },
    ] },
  ],
  'kern.s2': [
    ['kern', "Bonne résine, bien collante. Je la fais chauffer avec un peu de cendre, et j'en bourre les fentes."],
    ['kern', "Voilà : elle flotte comme un canard. Elle est creusée dans un seul tronc de chêne, tu sais. Prends-la quand tu veux, au bord de l'eau."],
  ],
  'kern.chat': [['kern', (S) => (S.flag('pirogue_ok') ? 'La pirogue est au rivage. Ne va pas trop loin, le courant du Fier est traître.' : 'Les mulets sautent ce matin. Bonne pêche en vue.')]],
  'nea.offer': [
    ['nea', "Tu as des mains habiles, Tala le dit. Aide-moi : il me faut trois mottes d'argile grise, au bord du marais, à l'ouest. Je t'apprendrai à monter un vase."],
    { choice: [
      { t: "D'accord, j'y vais.", do: [['start', 'pre.s3']] },
      { t: 'Pas maintenant.', end: true },
    ] },
  ],
  'nea.s3': [
    ['nea', "Belle argile, fine, sans cailloux. On la pétrit avec du sable pour qu'elle ne se fende pas au feu."],
    ['nea', "Regarde : on roule des boudins, des colombins, et on les monte en spirale. On lisse avec un galet… et on décore avec l'ongle. À toi. Ensuite, au four."],
  ],
  'nea.vase': [
    ['nea', "Le feu a été bon : le vase est sorti noir et brillant. C'est le tien. Que veux-tu en faire ?"],
    { choice: [
      { t: "Je le garde précieusement.", do: [['give', 'vase-neolithique']], go: 'nea.keep' },
      { t: "Enterrons-le sous la hutte, pour ceux qui viendront bien plus tard.", do: [['flag', 'pre_vase'], ['xp', 'hist', 30]], go: 'nea.bury' },
    ] },
  ],
  'nea.keep': [['nea', 'Prends-en soin. Un vase, ça garde la mémoire des mains qui l\'ont fait.']],
  'nea.bury': [['nea', "Drôle d'idée… mais belle. Peut-être que dans mille hivers, quelqu'un le trouvera et pensera à nous."]],
  'nea.chat': [['nea', "L'argile, l'eau, le feu. Et la patience."]],
  'maela.offer': [
    ['maela', "Mes réserves de plantes sont vides. Rapporte-moi trois plantes qui soignent : la salicorne du marais, l'immortelle des dunes, la criste des rochers."],
    { choice: [
      { t: 'Je vais les cueillir.', do: [['start', 'pre.s4']] },
      { t: 'Plus tard.', end: true },
    ] },
  ],
  'maela.s4': [
    ['maela', "La salicorne, pour le sel du corps. L'immortelle, pour les toux d'hiver. La criste, pour l'appétit des malades. Tu as de bons yeux."],
    { do: [['codex', 'flore-salicorne'], ['codex', 'flore-immortelle']] },
  ],
  'maela.chat': [['maela', (S) => (S.done('pre.m5') ? "Que la pierre qui tourne te garde, voyageur. L'éclat est entre de bonnes mains." : 'Les pierres écoutent la mer. Écoute-les aussi.')]],
  'doran.offer': [
    ['doran', "Viens ce soir, quand la nuit sera tombée, t'asseoir près du feu. Je raconterai l'histoire de la pierre qui écoute la mer. Mais seulement la nuit : les histoires n'aiment pas le soleil."],
    { choice: [
      { t: "Je reviendrai ce soir.", do: [['start', 'pre.s5']] },
      { t: 'Peut-être.', end: true },
    ] },
  ],
  'doran.s5': [
    ['doran', "Assieds-toi. Le feu est bon. Écoute."],
    ['doran', "Avant nous, il y avait la forêt jusqu'à l'horizon, et la mer était loin, très loin. Puis la mer a monté, monté, et la forêt s'est noyée. Notre terre est devenue presque une île."],
    ['doran', "Les anciens ont eu peur d'oublier. Alors la première sage a posé sous la pointe une pierre qui écoute la mer. Chaque marée y laisse une trace, chaque saison un souvenir."],
    ['doran', "On dit que d'autres peuples viendront, et qu'ils y ajouteront leur pierre. Tant que les pierres tourneront ensemble, la terre se souviendra de nous."],
    { do: [['codex', 'legende-origine']] },
  ],
  'doran.chat': [['doran', (S) => (S.night() ? 'La nuit est belle pour les histoires.' : 'Reviens à la nuit, petit.')]],
  'orven.chat': [['orven', (S) => (S.done('pre.m3') ? 'Ta pointe était bien taillée. Reviens chasser quand tu veux.' : 'Les traces ne mentent jamais.')]],
  'tala.chat': [['tala', (S) => (S.done('pre.m2') ? "Ta pointe tient toujours ? Le silex, c'est comme l'amitié : ça se retouche." : 'Toc… toc…')]],
};

// Cerf de la quête de chasse : immobile dans la clairière jusqu'à la fin de la chasse
function spawnQuestDeer(api) {
  const s = api.world.spots.clairiere;
  if (!s || api.world.fauna.animals.some((a) => a.questDeer)) return;
  const a = api.world.fauna.spawn('deer', s.x + 1.5, s.z + 1, { locked: true, questDeer: true });
  a.obj.rotation.y = -Math.PI / 2;
}
function removeQuestDeer(api) {
  const f = api.world.fauna;
  const a = f.animals.find((x) => x.questDeer);
  if (a) { f.group.remove(a.obj); f.animals = f.animals.filter((x) => x !== a); }
}
function raiseMenhir(api) {
  const ref = api.world.townBuilder?.refs;
  if (!ref?.menhir) return;
  const m = ref.menhir;
  const t0 = performance.now();
  const startY = m.position.y;
  const wx = m.position.x + api.world.townBuilder.cx, wz = m.position.z + api.world.townBuilder.cz;
  const endY = heightAt(wx, wz) + ref.menhirH / 2 - 0.2;
  api.world.animated.push({
    obj: m, kind: 'custom',
    update: () => {
      const k = Math.min(1, (performance.now() - t0) / 3000);
      const e = k * k * (3 - 2 * k);
      m.rotation.z = (Math.PI / 2 - 0.08) * (1 - e);
      m.position.y = startY + (endY - startY) * e;
    },
  });
}

const quests = [
  { id: 'pre.m1', main: true, auto: true, chapter: 1, title: 'Le peuple de la Pointe', desc: 'Un campement de chasseurs-pêcheurs-paysans, au bord du Fier, six mille ans avant ton temps.',
    steps: [
      { id: 'orven', type: 'talk', npc: 'orven', dialogue: 'orven.m1', text: "Présente-toi à Orven, à l'entrée du campement." },
      { id: 'maela', type: 'talk', npc: 'maela', dialogue: 'maela.m1', text: 'Trouve Maëla, la sage du clan.' },
    ],
    rewards: { xpHist: 40, rep: 5 }, next: 'pre.m2' },
  { id: 'pre.m2', main: true, title: 'La pierre qui coupe', desc: "Apprends de Tala la taille du silex, la technique-reine des temps préhistoriques.",
    steps: [
      { id: 'tala', type: 'talk', npc: 'tala', dialogue: 'tala.m2', text: "Va voir Tala, la tailleuse de silex, à son atelier." },
      { id: 'silex', type: 'collect', item: 'silex', count: 3, text: 'Ramasse 3 rognons de silex sur la grève, à l\'est.', label: 'Ramasser le rognon de silex',
        spawns: [['plage-est', -2, 1], ['plage-est', 1, 0], ['plage-est', 3.5, 1.5], ['plage-est', -4.5, -0.5]] },
      { id: 'donner', type: 'deliver', npc: 'tala', item: 'silex', count: 3, dialogue: 'tala.m2b', text: 'Rapporte les silex à Tala.' },
      { id: 'tailler', type: 'interact', text: "Taille une pointe de sagaie sur la pierre d'atelier.", targets: [
        { key: 'taille', at: 'taille', label: 'Tailler le silex', anim: 'knap', duration: 3, give: 'pointe-silex', dialogue: 'tala.m2c', codex: 'metier-silex' },
      ] },
    ],
    rewards: { xpHist: 50, xpExpl: 20, rep: 10, money: 2 }, next: 'pre.m3' },
  { id: 'pre.m3', main: true, title: 'Sur la piste du cerf', desc: 'Orven veut voir si tu sais lire la terre comme un chasseur.',
    steps: [
      { id: 'orven', type: 'talk', npc: 'orven', dialogue: 'orven.m3', text: "Écoute les instructions d'Orven.", onDone: [['fn', (api) => spawnQuestDeer(api)]] },
      { id: 'traces', type: 'interact', text: 'Suis les traces du cerf dans la chênaie.', targets: [
        { key: 'tr1', at: 'trace1', label: 'Examiner les empreintes', anim: 'inspect', duration: 1.4, text: "Des empreintes de sabots fendus, profondes : un grand mâle, lourd. Elles filent vers le sud." },
        { key: 'tr2', at: 'trace2', label: 'Examiner les branches cassées', anim: 'inspect', duration: 1.4, text: "Des rameaux brisés à hauteur d'épaule, et des poils roux accrochés à l'écorce. Il est passé il y a peu." },
        { key: 'tr3', at: 'trace3', label: "Examiner l'écorce frottée", anim: 'inspect', duration: 1.4, text: "Un jeune chêne dont l'écorce a été arrachée : le cerf y a frotté ses bois. La clairière est toute proche." },
      ] },
      { id: 'chasse', type: 'interact', text: 'Approche du cerf dans la clairière et lance ta sagaie.', onStart: [['fn', (api) => spawnQuestDeer(api)]], targets: [
        { key: 'cerf', at: 'clairiere', label: 'Lancer la sagaie', requires: 'pointe-silex', anim: 'point', duration: 1.2, dialogue: 'chasse.fin', codex: 'faune-cerf' },
      ] },
      { id: 'orven2', type: 'talk', npc: 'orven', dialogue: 'orven.m3b', text: 'Retourne au campement voir Orven.' },
    ],
    rewards: { xpExpl: 60, rep: 15, items: ['bois-cerf'], money: 3 }, next: 'pre.m4' },
  { id: 'pre.m4', main: true, title: 'Les pierres qui parlent', desc: "L'homme gris a renversé une pierre de l'alignement. Il faut la redresser dans la bonne direction.",
    steps: [
      { id: 'maela', type: 'talk', npc: 'maela', dialogue: 'maela.m4', text: 'Parle à Maëla.' },
      { id: 'lire', type: 'interact', text: "Examine les pierres dressées de l'alignement.", targets: [
        { key: 'm0', at: 'menhir0', label: 'Lire la première pierre', anim: 'inspect', duration: 1, text: 'Une spirale gravée, tournée vers l\'ouest.' },
        { key: 'm1', at: 'menhir1', label: 'Lire la deuxième pierre', anim: 'inspect', duration: 1, text: "Deux spirales et une ligne ondulée : la mer. Elles regardent dans le même sens que la première." },
        { key: 'm3', at: 'menhir3', label: 'Lire la quatrième pierre', anim: 'inspect', duration: 1, text: "Un soleil à demi enfoncé sous des vagues. La gravure est tournée vers l'horizon de l'océan." },
      ] },
      { id: 'enigme', type: 'interact', text: 'Devant la pierre renversée, déduis sa direction.', targets: [
        { key: 'tombee', at: 'menhir2', label: 'Étudier la pierre renversée', riddle: 'r-couchant' },
      ] },
      { id: 'aide', type: 'talk', npc: 'kern', dialogue: 'kern.m4', text: 'Demande à Kern de venir t\'aider à la redresser.' },
      { id: 'lever', type: 'interact', text: 'Redresse la pierre du couchant.', targets: [
        { key: 'lever', at: 'menhir2', label: 'Redresser la pierre', anim: 'carry', duration: 2.5, dialogue: 'menhir.up' },
      ] },
    ],
    rewards: { xpHist: 70, rep: 15, money: 3 }, next: 'pre.m5' },
  { id: 'pre.m5', main: true, title: 'Le Fragment des Pierres levées', desc: 'Maëla est prête à te confier ce qu\'elle garde.',
    steps: [
      { id: 'maela', type: 'talk', npc: 'maela', dialogue: 'maela.m5', text: 'Retrouve Maëla.' },
      { id: 'dolmen', type: 'interact', text: 'Entre dans la chambre du dolmen avec Maëla.', targets: [
        { key: 'dolmen', at: 'dolmen', label: 'Entrer sous la table de pierre', anim: 'crouch', duration: 2, dialogue: 'dolmen.inside', codex: 'lieu-dolmen' },
      ] },
    ],
    rewards: { xpHist: 120, xpExpl: 40, rep: 20 } },

  // ---------- quêtes secondaires ----------
  { id: 'pre.s1', giver: 'brann', offer: 'brann.offer', title: 'Les coquillages de Brann', desc: 'Brann veut finir son collier pour Maëla.',
    steps: [
      { id: 'ramasser', type: 'collect', item: 'coquillage', count: 5, text: 'Ramasse 5 coquillages sur la grève.', label: 'Ramasser le coquillage',
        spawns: [['rivage', -6, -1], ['rivage', 3, -2], ['plage-ouest', 1, 1], ['plage-ouest', -4, 0], ['plage-est', 1, -1], ['plage-est', -5, 0.5]] },
      { id: 'donner', type: 'deliver', npc: 'brann', item: 'coquillage', count: 5, dialogue: 'brann.s1', text: 'Donne les coquillages à Brann.' },
    ],
    rewards: { xpExpl: 30, rep: 10, items: ['collier-coquillages'], money: 2 } },
  { id: 'pre.s2', giver: 'kern', offer: 'kern.offer', title: 'La pirogue de Kern', desc: 'Calfater la pirogue monoxyle de Kern.',
    steps: [
      { id: 'resine', type: 'collect', item: 'resine', count: 3, text: 'Récolte 3 larmes de résine sur les pins de la pointe.', label: 'Récolter la résine',
        spawns: [['pin1', 0, 0], ['pin2', 0, 0], ['pin3', 0, 0]] },
      { id: 'donner', type: 'deliver', npc: 'kern', item: 'resine', count: 3, dialogue: 'kern.s2', text: 'Rapporte la résine à Kern.' },
    ],
    rewards: { xpExpl: 40, rep: 10, money: 3, codex: ['vie-pirogue'] }, onComplete: [['flag', 'pirogue_ok']] },
  { id: 'pre.s3', giver: 'nea', offer: 'nea.offer', title: "L'argile de Néa", desc: 'Néa va t\'apprendre à façonner un vase.',
    requires: ['pre.m1'],
    steps: [
      { id: 'argile', type: 'collect', item: 'argile', count: 3, text: "Prends 3 mottes d'argile au bord du marais, à l'ouest.", label: "Extraire l'argile",
        spawns: [['marais', 0, 0], ['marais', 3, 1.5], ['marais', -3, 1]] },
      { id: 'donner', type: 'deliver', npc: 'nea', item: 'argile', count: 3, dialogue: 'nea.s3', text: "Apporte l'argile à Néa." },
      { id: 'four', type: 'interact', text: 'Cuis le vase dans le four de Néa.', targets: [
        { key: 'four', at: 'four', label: 'Enfourner le vase', anim: 'crouch', duration: 2.4, dialogue: 'nea.vase', codex: 'metier-potier' },
      ] },
    ],
    rewards: { xpHist: 40, rep: 10, money: 2 } },
  { id: 'pre.s4', giver: 'maela', offer: 'maela.offer', title: 'Les plantes de Maëla', desc: "Cueillir trois plantes qui soignent.",
    requires: ['pre.m2'],
    steps: [
      { id: 'cueillir', type: 'collect', item: 'herbe', count: 3, text: 'Cueille 3 plantes médicinales (marais, dunes, rochers).', label: 'Cueillir la plante',
        spawns: [['marais', -2, -2], ['spawn', -10, 4], ['plage-est', 4, 3]] },
      { id: 'donner', type: 'deliver', npc: 'maela', item: 'herbe', count: 3, dialogue: 'maela.s4', text: 'Apporte les plantes à Maëla.' },
    ],
    rewards: { xpHist: 30, rep: 10, money: 2 } },
  { id: 'pre.s5', giver: 'doran', offer: 'doran.offer', title: 'La veillée de Doran', desc: "Le vieux Doran raconte, la nuit, l'origine de la pierre qui écoute la mer.",
    steps: [
      { id: 'nuit', type: 'wait', until: (S) => S.night(), text: 'Attends la nuit (une heure de jeu = une minute, ou touche N).' },
      { id: 'ecouter', type: 'talk', npc: 'doran', dialogue: 'doran.s5', text: "Assieds-toi au feu et écoute Doran." },
    ],
    rewards: { xpHist: 60, rep: 5 } },
];

const codex = {
  'perso-maela': { cat: 'personnages', era: ERA, title: 'Maëla, la sage',
    text: "Gardienne des savoirs du clan de la Pointe : les plantes qui soignent, les chants, les alignements de pierres et le calendrier des saisons. Comme sa mère avant elle, elle garde un éclat de la « pierre qui écoute la mer »." },
  'perso-orven': { cat: 'personnages', era: ERA, title: 'Orven, le chasseur',
    text: "Meneur des chasses du clan, Orven connaît chaque sentier de la chênaie. Méfiant envers les étrangers depuis le passage de l'homme gris, il juge les gens à leurs actes." },
  'metier-silex': { cat: 'metiers', era: ERA, title: 'La taille du silex',
    text: "Le silex, roche très dure qui se casse en éclats coupants, fut pendant des centaines de milliers d'années la matière première des outils. On le taille par percussion (avec un galet ou un bois de cerf) puis par pression pour affûter les bords. Au Néolithique apparaissent les haches polies, frottées longuement sur des grès." },
  'vie-neolithique': { cat: 'histoire', era: ERA, title: 'Les premiers paysans de la côte',
    text: "Vers 5000 av. J.-C., l'agriculture et l'élevage gagnent la façade atlantique. Les hommes du Néolithique défrichent, sèment orge et blé, élèvent bœufs, moutons et chèvres, fabriquent des poteries et polissent des haches. Ils continuent pourtant à chasser, pêcher et ramasser les coquillages. Ils bâtissent aussi les premiers grands monuments de pierre : dolmens et menhirs." },
  'lieu-menhirs': { cat: 'lieux', era: ERA, title: 'Menhirs et alignements',
    text: "Les menhirs (« pierres longues » en breton) sont des blocs dressés seuls ou en alignements. Beaucoup sont orientés vers le lever ou le coucher du soleil aux solstices. Leur rôle exact reste mystérieux : calendrier, limite de territoire, lieu de culte ou de rassemblement." },
  'lieu-dolmen': { cat: 'lieux', era: ERA, title: 'Le dolmen',
    text: "Un dolmen (« table de pierre ») est une chambre funéraire faite de grandes dalles dressées supportant une table, autrefois recouverte d'un tertre de terre et de pierres. Les sépultures collectives du Néolithique y accueillaient les morts de plusieurs générations. La Charente-Maritime en conserve de nombreux." },
  'metier-potier': { cat: 'metiers', era: ERA, title: 'La poterie néolithique',
    text: "Les premières poteries sont montées à la main, sans tour, par colombins (boudins d'argile superposés) puis lissées. On les décore d'impressions d'ongle, de coquillage ou de cordelette, et on les cuit en meule ou en fosse. Elles servent à cuire, stocker les grains, ou accompagner les défunts." },
  'vie-pirogue': { cat: 'vie', era: ERA, title: 'La pirogue monoxyle',
    text: "Creusée dans un seul tronc (« mono-xyle »), souvent de chêne, la pirogue est l'embarcation la plus ancienne connue en Europe. On évide le bois au feu et à l'herminette, puis on calfate les fentes à la résine ou au brai. Elle permettait de pêcher, de traverser les bras de mer et de commercer d'île en île." },
  'vie-parure': { cat: 'vie', era: ERA, title: 'Parures de coquillages',
    text: "Coquillages percés, dents d'animaux, perles de pierre : les parures préhistoriques disent l'appartenance à un groupe et circulent sur de longues distances par échanges. Les coquillages de l'Atlantique se retrouvent parfois très loin à l'intérieur des terres." },
  'legende-origine': { cat: 'histoire', era: ERA, title: "L'origine de l'Horloge (récit de Doran)",
    text: "« Quand la mer a monté et noyé la forêt, notre terre est devenue presque une île. Les anciens ont eu peur d'oublier. Alors la première sage a posé sous la pointe une pierre qui écoute la mer. D'autres peuples viendront, et y ajouteront leur pierre. Tant que les pierres tourneront ensemble, la terre se souviendra de nous. »\n\nIl y a 10 000 ans, le niveau de la mer était plus bas de plusieurs dizaines de mètres : la côte charentaise s'étendait bien plus à l'ouest. La remontée des eaux a peu à peu dessiné les îles actuelles." },
};

export default {
  era: ERA, npcs, extras, items, shops, riddles, dialogues, quests, codex,
  onEnter(api) {
    // le cerf de la chasse reste dans la clairière si la quête est en cours
    const q = api.quests.st('pre.m3');
    if (q?.status === 'active' && q.step >= 1) spawnQuestDeer(api);
  },
};
