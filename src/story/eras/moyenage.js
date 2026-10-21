// CHAPITRE 3 — MOYEN ÂGE, 1190 — La Flotte.
// Les moines blancs des Châteliers bâtissent leur abbaye ; pêcheurs et moines
// se disputent la dîme ; des voiles de pillards paraissent à l'horizon. Frère
// Anselme, maître d'œuvre et gardien, a scellé le fragment dans une clé de voûte.

import { look, SKIN, HAIR, EYES } from '../../characters/wardrobe.js';

const ERA = 'moyenage';

const npcs = [
  {
    id: 'anselme', name: 'Frère Anselme', title: "Moine cistercien, maître d'œuvre", codex: 'perso-anselme',
    look: look(ERA, 'monk', { age: 'old', hair: { style: 'tonsure', color: HAIR.grey }, eyes: EYES.blue }),
    home: 'abbaye',
    routine: [
      { from: 5, to: 7, at: ['abbaye', 1, 1], action: 'pray' },
      { from: 7, to: 12, at: 'grue', action: 'idle' },
      { from: 12, to: 14, at: ['abbaye', 1, 1], action: 'pray' },
      { from: 14, to: 19, at: 'capitulaire', action: 'read' },
      { from: 19, to: 5, at: ['abbaye', 1, 1], action: 'pray' },
    ],
    barks: ['Ora et labora : prie et travaille.', 'Chaque pierre a sa place, comme chaque homme.', 'La lumière doit entrer par l\'est.'],
    talk: 'anselme.chat',
  },
  {
    id: 'jean', name: 'Frère Jean', title: 'Moine infirmier',
    look: look(ERA, 'monk', { hair: { style: 'tonsure', color: HAIR.chestnut }, build: 'stout' }),
    home: 'jardin',
    routine: [{ from: 6, to: 18, at: 'jardin', action: 'crouch' }, { from: 18, to: 6, at: 'scriptorium', action: 'read' }],
    barks: ['La sauge guérit tout, ou presque.', 'Le vent a emporté mes pages !', 'Dieu soigne, le moine panse.'],
    talk: 'jean.chat',
  },
  {
    id: 'isabeau', name: 'Dame Isabeau', title: 'Drapière', codex: 'perso-isabeau',
    look: look(ERA, 'merchant'),
    home: 'etal-laine',
    routine: [{ from: 7, to: 18, at: 'etal-laine', action: 'idle' }, { from: 18, to: 7, at: ['place', -6, 4], action: 'idle' }],
    barks: ['Drap de Flandre, laine d\'Angleterre, toile d\'ici !', 'Les Anglais paient en bon argent.', 'Mon mari était marin. La mer l\'a gardé.'],
    talk: 'isabeau.chat',
  },
  {
    id: 'gautier', name: 'Gautier', title: 'Forgeron',
    look: look(ERA, 'smith'),
    home: 'forge:keeper',
    routine: [{ from: 6, to: 20, at: 'forge:keeper', action: 'hammer' }, { from: 20, to: 6, at: ['taverne', 1.5, -1.2], action: 'drink' }],
    barks: ['Battre le fer tant qu\'il est chaud !', 'Où est passé mon marteau ?', 'Un fer à cheval porte bonheur, si on le pend dans le bon sens.'],
    talk: 'gautier.chat',
  },
  {
    id: 'renaud', name: 'Renaud', title: 'Pêcheur', codex: 'metier-pecheur-med',
    look: look(ERA, 'fisherman'),
    home: 'quai',
    routine: [
      { from: 4, to: 10, at: 'quai', action: 'fish' },
      { from: 10, to: 15, at: 'etal-poisson', action: 'idle' },
      { from: 15, to: 21, at: 'quai', action: 'idle' },
      { from: 21, to: 4, at: ['taverne', -1, -1.4], action: 'drink' },
    ],
    barks: ['La mer est à tout le monde. Pas aux moines.', 'Bars, soles et seiches !', 'Mes filets sont plus vieux que moi.'],
    talk: 'renaud.chat',
  },
  {
    id: 'bertrand', name: 'Bertrand', title: 'Sergent du sire de Mauléon',
    look: look(ERA, 'sergeant'),
    home: 'tour-guet',
    routine: [{ from: 0, to: 24, at: 'tour-guet', action: 'guard' }],
    barks: ['Rien à l\'horizon… pour l\'instant.', 'Le sire de Mauléon veut un guet jour et nuit.', 'Les Anglais sont nos maîtres, mais pas nos amis.'],
    talk: 'bertrand.chat',
  },
  {
    id: 'aelis', name: 'Aélis', title: 'Fileuse',
    look: look(ERA, 'peasantwoman', { hair: { style: 'braids', color: HAIR.blond }, eyes: EYES.blue, face: { freckles: true }, hat: { type: 'coif', c: 0xf0ece0 } }),
    home: ['place', -6, 2.5],
    routine: [{ from: 7, to: 20, at: ['place', -6, 2.5], action: 'stir' }, { from: 20, to: 7, at: ['place', -6, 2.5], action: 'idle' }],
    barks: ['Tu as entendu ? Un pèlerin qui écrivait sans encre !', 'Le fuseau tourne, la langue aussi.', 'Les moines blancs ne parlent presque jamais.'],
    talk: 'aelis.chat',
  },
  {
    id: 'colin', name: 'Colin', title: 'Gamin du port',
    look: look(ERA, 'child'),
    home: ['eglise', -3, 2],
    routine: [{ from: 7, to: 20, at: ['eglise', -3, 2], action: 'play' }, { from: 20, to: 7, at: ['place', 3, 4], action: 'idle' }],
    barks: ['C\'est pas moi !', 'Tu viens d\'où, avec tes chausses bleues ?', 'Je serai marin, moi.'],
  },
  {
    id: 'guillaume', name: 'Guillaume', title: 'Pèlerin de Saint-Jacques',
    look: look(ERA, 'pilgrim', { age: 'old', hat: { type: 'pilgrim', c: 0x4a3a2a }, outfit: { top: { c: 0x5a4a32, p: 'wool' }, robe: { c: 0x5a4a32, p: 'wool', len: 0.9, flare: 0.7 }, cape: { c: 0x4a3a2a, p: 'wool', len: 1.0 } } }),
    home: 'porte',
    routine: [{ from: 0, to: 24, at: ['porte', 1.5, -1], action: 'idle' }],
    barks: ['Saint Jacques me garde.', 'Mes jambes sont vieilles, mais ma foi est jeune.'],
    talk: 'guillaume.chat',
  },
];

const extras = [
  { name: 'Paysan', look: look(ERA, 'peasant'), path: 'grandrue', barks: ['Dieu vous garde.', 'Le vin d\'Aunis sera bon cette année.'] },
  { name: 'Paysanne', look: look(ERA, 'peasantwoman', { props: { left: 'basket' } }), path: 'grandrue', barks: ['Belle journée pour le marché.', 'Les halles sont pleines !'] },
  { name: 'Marin', look: look(ERA, 'fisherman', { hat: { type: 'chaperon', c: 0x3a5a7a }, props: { right: null } }), path: 'port', action: 'carry', barks: ['Ce tonneau pèse un âne mort.', 'On part pour La Rochelle à la marée.'] },
  { name: 'Frère convers', look: look(ERA, 'monk', { outfit: { top: { c: 0x8a7a5a, p: 'wool' }, robe: { c: 0x8a7a5a, p: 'wool', len: 0.9, flare: 0.7 }, scapular: { c: 0x4a3a2a } } }), path: 'chantier', action: 'carry', barks: ['Encore une pierre…', 'Les frères convers travaillent, les moines de chœur prient.'] },
];

const items = {
  'pierre-taillee': { name: 'Pierre de taille', icon: '🧱', type: 'ressource', desc: 'Un bloc de calcaire équarri, marqué du signe du tailleur.' },
  marteau: { name: 'Marteau de forgeron', icon: '🔨', type: 'ressource', model: 'hammer', desc: 'Le marteau de Gautier, au manche usé par les années.' },
  'fer-a-cheval': { name: 'Fer à cheval', icon: '🧲', type: 'artefact', codex: 'metier-forgeron', desc: 'Forgé par Gautier en remerciement. Il porte bonheur, dit-il.' },
  'balle-laine': { name: 'Ballot de laine', icon: '🧶', type: 'ressource', model: 'wool', desc: 'Laine lavée et cardée, prête à partir pour les drapiers de Flandre.' },
  page: { name: 'Page de manuscrit', icon: '📄', type: 'ressource', model: 'page', desc: 'Une feuille de parchemin couverte d\'une écriture serrée.' },
  manuscrit: { name: 'Manuscrit des Châteliers', icon: '📜', type: 'document', codex: 'legende-horloge',
    desc: "Un cahier de parchemin enluminé par frère Jean. L'une des pages montre un disque à sept encoches.",
    read: "« De horologio maris. Sub promontorio Balaenarum quiescit machina quae non horas sed aestus et saecula numerat… »\n\nEn marge, la traduction de frère Jean : « De l'horloge de la mer. Sous la pointe des Baleines repose une machine qui ne compte pas les heures mais les marées et les siècles. Sept gardiens en tiennent les pièces. Qui porte le disque peut marcher dans le temps. »\n\nUn dessin : un disque à sept encoches, au centre une spirale. Exactement ton Astrolabe." },
  coquille: { name: 'Coquille Saint-Jacques', icon: '🐚', type: 'artefact', codex: 'vie-pelerinage', desc: 'L\'insigne des pèlerins de Compostelle, offert par Guillaume.' },
  'pain-bis': { name: 'Pain bis', icon: '🍞', type: 'consommable', desc: 'Pain de seigle et de froment cuit au four banal.', use: { stamina: 45, text: 'Dense et nourrissant.' } },
  cervoise: { name: 'Cervoise', icon: '🍺', type: 'consommable', desc: 'Bière d\'orge sans houblon.', use: { stamina: 35, text: 'Tiède et un peu aigre.' } },
  'hareng-saur': { name: 'Hareng saur', icon: '🐟', type: 'consommable', desc: 'Hareng salé et fumé.', use: { stamina: 40, text: 'Très salé !' } },
  'drap-bleu': { name: 'Aune de drap bleu', icon: '🧵', type: 'artefact', desc: 'Drap teint au pastel (guède), une couleur à la mode chez les riches.' },
};

const shops = {
  halles: { name: "Étal d'Isabeau", intro: 'Sous la charpente des halles, Isabeau déroule ses draps.', wares: [{ item: 'drap-bleu', price: 8 }] },
  poissonnerie: { name: 'Étal de Renaud', intro: 'Bars, soles, seiches et harengs, sur un lit d\'algues.', wares: [{ item: 'hareng-saur', price: 1 }] },
  boulanger: { name: 'Le four banal', intro: 'Chacun vient cuire son pain au four du seigneur, contre une redevance.', wares: [{ item: 'pain-bis', price: 1 }] },
  taverne: { name: 'Taverne Au Bon Port', sign: { text: 'Au Bon Port', sub: "Taverne · vin d'Aunis", style: 'gothic', icon: 'wine' }, intro: 'Odeur de feu de bois, de vin et de poisson grillé.', wares: [{ item: 'cervoise', price: 1 }] },
  forge: { name: 'Forge de Gautier', intro: 'Le soufflet ronfle, les étincelles volent.', wares: [{ item: 'fer-a-cheval', price: 4 }] },
};

const riddles = {
  'r-charte': {
    title: "La charte d'Eble de Mauléon (1156)",
    doc: "Ego Ebo de Malo Leone, dominus insulae Ree, do et concedo fratribus Cisterciensibus Beatae Mariae de Ree locum qui dicitur Castellarium, et decimam salis de omnibus salinis meis in insula…",
    q: "D'après la charte de fondation, sur quoi porte la dîme accordée aux moines ?",
    options: ['Sur le poisson pêché au port', 'Sur le sel des salines du seigneur', 'Sur le vin des vignes', 'Sur tout ce que produit l\'île'],
    answer: 1, hint: '« decimam salis de omnibus salinis » : le dixième du sel de toutes les salines.',
    success: "« Decimam salis » : la dîme du sel. La charte ne dit pas un mot du poisson ! Les moines réclamaient donc à Renaud plus que ce que le seigneur leur avait donné.",
    codex: 'vie-dime', xp: 45,
  },
  'r-simples': {
    title: 'Le jardin des simples',
    q: "Frère Jean te demande : « Laquelle de mes plantes donne-t-on contre la fièvre et les maux de ventre, et qui pousse au bord des marais ? »",
    options: ['La sauge', 'La menthe aquatique', 'La rose', 'Le lys'],
    answer: 1, hint: 'Elle aime l\'eau, et son parfum rafraîchit.',
    success: "La menthe aquatique, bien sûr. La sauge (« salvia », celle qui sauve) soigne la gorge ; la rose et le lys parent l'autel. Chaque monastère cultivait son jardin de « simples », les plantes médicinales.",
    codex: 'vie-simples', xp: 30,
  },
};

const dialogues = {
  'aelis.m1': [
    ['aelis', "Bonjour, voyageur ! Tu arrives par la route de Saint-Martin ? Tu as l'air perdu… et drôlement habillé, si je peux me permettre."],
    ['aelis', "Ici, c'est La Flotte : le port, les halles, et là-bas, à l'ouest, le grand chantier de l'abbaye des moines blancs, les Châteliers."],
    ['aelis', "Il se passe des choses bizarres, en ce moment. Un pèlerin est venu, avec un manteau gris. Il écrivait sur un parchemin avec un bâton qui faisait de l'encre tout seul ! Et il posait des questions sur la « clé » de l'abbaye."],
    ['aelis', "Frère Anselme l'a chassé du chantier. Si tu cherches quelque chose, c'est lui qu'il faut voir. Mais il ne parle pas beaucoup… les cisterciens gardent le silence."],
  ],
  'anselme.m2': [
    ['anselme', "Benedicite. Tu viens du port ? Tu cherches du travail, peut-être. Le chantier en manque toujours."],
    ['anselme', "Nous bâtissons Notre-Dame de Ré depuis trente-quatre ans. Je n'en verrai pas la fin. Les pierres viennent de la carrière, les hommes de partout, et Dieu donne le reste."],
    ['me', 'Je veux bien aider.'],
    ['anselme', "Porte trois pierres de taille depuis le tas, à l'entrée du chantier, jusqu'à la grue. Puis monte dans la roue : c'est en marchant dedans qu'on hisse les blocs. Comme un écureuil dans sa cage."],
  ],
  'anselme.m2b': [
    ['anselme', "Trois pierres hissées. Le mur nord gagne une assise. Tu as des jambes de jeune homme… ou de jeune femme ? Pardonne-moi, mes yeux sont vieux."],
    ['anselme', "Tu n'es pas venu pour la gloire de Dieu, je le sens. Tu portes quelque chose qui me rappelle un dessin du frère Jean. Nous en reparlerons, quand je saurai qui tu es vraiment."],
  ],
  'renaud.m3': [
    ['renaud', "Tu viens de la part des moines ? Alors va-t'en ! Ils veulent la dîme sur mon poisson. Un poisson sur dix ! Et l'hiver, je mange quoi, moi, des cailloux de leur chantier ?"],
    ['renaud', "Mon père n'a jamais payé de dîme sur le poisson. Mon grand-père non plus. Mais le cellérier de l'abbaye dit que c'est écrit."],
  ],
  'anselme.m3': [
    ['anselme', "Renaud est en colère… et la colère est un péché. Mais il a peut-être ses raisons. Le cellérier dit que la charte de fondation nous donne la dîme."],
    ['anselme', "La charte d'Eble de Mauléon est au scriptorium, dans le coffre près de l'entrée de l'église. Va la lire. Tu sais lire le latin ? Lis bien."],
  ],
  'renaud.m3b': [
    ['renaud', "Alors ? Qu'est-ce qu'elle dit, leur charte ?"],
    { choice: [
      { t: "La dîme ne porte que sur le sel. Les moines n'ont aucun droit sur ton poisson.", go: 'renaud.paix', best: true },
      { t: "C'est la loi, Renaud. Paie ce qu'on te demande.", go: 'renaud.conflit' },
    ] },
  ],
  'renaud.paix': [
    ['renaud', "Sur le sel ! Ha ! Je le savais. Que Dieu bénisse ceux qui savent lire."],
    ['renaud', "… Tu sais quoi ? Je ne leur dois rien. Mais leurs pauvres ont faim, à la porte de l'abbaye. Je leur porterai mes poissons du vendredi. De mon plein gré."],
    { do: [['flag', 'med_paix'], ['flag', 'med_charte'], ['rep', 20]] },
    ['anselme', "J'ai entendu. La vérité de la charte a rendu la paix au port. Le cellérier fera pénitence, et nous accepterons le poisson des pauvres avec gratitude."],
  ],
  'renaud.conflit': [
    ['renaud', "La loi ! Toujours la loi des puissants ! Très bien, je paierai. Mais ne compte plus sur moi, étranger."],
    { do: [['flag', 'med_conflit'], ['rep', -10]] },
  ],
  'bertrand.m4': [
    ['bertrand', "Là ! Tu vois ? Trois voiles noires, au nord, vers la pointe. Des pillards. Ils écument la côte depuis Pâques."],
    ['bertrand', "Si la ville paraît endormie, ils débarqueront. Si elle paraît prête, ils passeront leur chemin. Écoute bien : sonne la cloche de l'église, ferme la porte de la palissade, et allume le feu de la tour. Vite !"],
  ],
  'bertrand.m4b': [
    ['bertrand', "Regarde… Ils virent de bord ! Ils ont vu le feu, entendu la cloche, et compté les hommes sur le quai. Ils vont chercher une proie plus facile."],
    ['bertrand', "Le sire de Mauléon saura ton nom. Et les gens de La Flotte aussi."],
  ],
  'anselme.m5': [
    ['anselme', "Le port t'est reconnaissant. Moi aussi. Alors écoute, car je vais rompre le silence."],
    ['anselme', "Le disque que tu portes, frère Jean l'a dessiné d'après le récit d'un vieux pêcheur, il y a des années. Les anciens confiaient ses pièces à des gardiens. Mon prieur m'en a confié une, et je l'ai scellée là où personne ne la chercherait : dans la clé de voûte de la salle capitulaire."],
    ['anselme', "Le faux pèlerin a grimpé l'échafaudage, la nuit dernière. Il n'a pas su desceller la clé. Monte, toi, et prends-la. Doucement : la voûte ne tient que par elle."],
  ],
  'cle.voute': [
    ['narr', "Tu montes sur l'échafaudage. Au sommet de l'arc, la clé de voûte porte une spirale gravée. Tu fais jouer la petite pierre centrale, et un éclat doré glisse dans ta paume."],
    { do: [['give', 'fragment-moyenage'], ['flag', 'frag_med']] },
    ['narr', "Sur la planche de l'échafaudage, quelque chose roule sous ton pied : un stylo à bille en plastique. Sur le capuchon, deux lettres gravées : « V.L. »"],
    { do: [['give', 'ana-stylo'], ['unlock', 'xvii'], ['rep', 20]] },
    ['anselme', "Que Dieu garde ce que tu portes. La voûte tient toujours : c'est bon signe."],
    ['voice', "Le quatrième éclat retrouve sa place. Le temps suivant est celui du Roi-Soleil, à Saint-Martin, où un ingénieur dessine une étoile de pierre."],
  ],
  // ---------- secondaires ----------
  'gautier.offer': [
    ['gautier', "Mon marteau ! Disparu ! Sans lui je ne forge rien, et les chevaux du sire attendent leurs fers. Je parie que c'est encore ce galopin de Colin."],
    { choice: [{ t: 'Je vais le retrouver.', do: [['start', 'med.s1']] }, { t: 'Débrouille-toi.', end: true }] },
  ],
  'colin.hint': [['colin', "Le marteau ? … Bon, d'accord, je l'ai caché derrière l'église, dans les orties. C'était pour rire !"]],
  'gautier.s1': [
    ['gautier', "Mon marteau ! Je le reconnais entre mille. Attends un peu…"],
    ['gautier', "Tiens : un fer à cheval tout chaud, enfin, tiède. Pends-le les branches en haut, pour garder la chance."],
  ],
  'isabeau.offer': [
    ['isabeau', "Trois ballots de laine attendent sous les halles, et le bateau pour La Rochelle part à la marée. Mes valets sont aux vignes. Tu veux bien les porter à Renaud, sur le quai ?"],
    { choice: [{ t: "Bien sûr, Dame Isabeau.", do: [['start', 'med.s2']] }, { t: 'Plus tard.', end: true }] },
  ],
  'renaud.s2': [
    ['renaud', "La laine d'Isabeau ? Pose-la là, je la charge. Elle part pour La Rochelle, puis pour les drapiers de Flandre. Et le drap reviendra teint en bleu, trois fois plus cher !"],
  ],
  'jean.offer': [
    ['jean', "Malheur ! Le vent a emporté trois pages de mon manuscrit, celles que j'enluminais. Elles se sont envolées vers le chantier et la grue."],
    { choice: [{ t: 'Je vais les chercher.', do: [['start', 'med.s3']] }, { t: 'Le vent rend toujours ce qu\'il prend.', end: true }] },
  ],
  'jean.s3': [
    ['jean', "Mes pages ! Le dessin du disque est intact. Tu vois ? Je l'ai copié d'après le récit d'un vieux pêcheur, il y a longtemps…"],
    ['jean', "Garde ce cahier. Le scriptorium en fera une autre copie. Il me semble qu'il t'appartient plus qu'à moi."],
  ],
  'guillaume.offer': [
    ['guillaume', "Mon enfant, je marche depuis Paris vers Saint-Jacques de Compostelle, et je voudrais prier à l'abbaye avant de reprendre la mer. Mais mes yeux ne voient plus le chemin."],
    { choice: [{ t: 'Je vous y conduis.', do: [['start', 'med.s4']] }, { t: 'Désolé, je suis pressé.', end: true }] },
  ],
  'guillaume.s4': [
    ['guillaume', "L'abbaye… j'entends les moines chanter. Merci, mon enfant. Prends ma coquille : je l'ai ramassée sur la plage, en Galice, au premier voyage. Elle te protégera sur ta route."],
  ],
  'jean.offer2': [
    ['jean', "Tu as de bons yeux. Au jardin des simples, j'ai planté trois carrés de plantes qui soignent. Sauras-tu reconnaître celle qui calme la fièvre ?"],
    { choice: [{ t: 'Montrez-moi.', do: [['start', 'med.s5']] }, { t: 'Je ne suis pas herboriste.', end: true }] },
  ],
  'jean.s5': [['jean', "Bien. Tu ferais un bon frère infirmier. Ou un bon apothicaire, ce qui rapporte davantage."]],
  // ---------- conversations ----------
  'anselme.chat': [['anselme', (S) => (S.done('med.m5') ? 'Que Dieu te garde sur les routes du temps.' : 'Ora et labora : prie et travaille.')]],
  'jean.chat': [['jean', 'La sauge, la menthe, la camomille : Dieu a mis un remède dans chaque herbe.']],
  'isabeau.chat': [['isabeau', 'Drap de Flandre, laine d\'Angleterre, toile d\'ici !'], { do: [['shop', 'halles']] }],
  'gautier.chat': [['gautier', (S) => (S.done('med.s1') ? 'Mon marteau et moi, on ne se quitte plus.' : 'Battre le fer tant qu\'il est chaud !')]],
  'renaud.chat': [['renaud', (S) => (S.flag('med_paix') ? 'Grâce à toi, je pêche en paix. Les moines aussi, d\'ailleurs.' : 'La mer est à tout le monde. Pas aux moines.')]],
  'bertrand.chat': [['bertrand', 'Rien à l\'horizon… pour l\'instant.']],
  'aelis.chat': [['aelis', 'Le fuseau tourne, la langue aussi !']],
  'guillaume.chat': [['guillaume', 'Ultreïa ! Toujours plus loin, toujours plus haut.']],
};

const quests = [
  { id: 'med.m1', main: true, auto: true, chapter: 3, title: 'Le port de La Flotte', desc: "En 1190, l'île appartient aux rois d'Angleterre ; La Flotte vit du sel, du vin et de la pêche.",
    steps: [{ id: 'aelis', type: 'talk', npc: 'aelis', dialogue: 'aelis.m1', text: 'Parle à Aélis, la fileuse, près du puits de la place.' }],
    rewards: { xpHist: 40, money: 3, rep: 5 }, next: 'med.m2' },
  { id: 'med.m2', main: true, title: 'Pierre après pierre', desc: "Aider les moines blancs à bâtir l'abbaye des Châteliers.",
    steps: [
      { id: 'anselme', type: 'talk', npc: 'anselme', dialogue: 'anselme.m2', text: "Présente-toi à frère Anselme, sur le chantier de l'abbaye (à l'ouest)." },
      { id: 'porter', type: 'interact', text: 'Prends 3 pierres de taille sur le tas de la carrière.', targets: [
        { key: 'p1', at: ['carriere', -1.5, 0], label: 'Prendre une pierre de taille', anim: 'carry', duration: 1.2, give: 'pierre-taillee' },
        { key: 'p2', at: ['carriere', 0, 0], label: 'Prendre une pierre de taille', anim: 'carry', duration: 1.2, give: 'pierre-taillee' },
        { key: 'p3', at: ['carriere', 1.5, 0], label: 'Prendre une pierre de taille', anim: 'carry', duration: 1.2, give: 'pierre-taillee' },
      ] },
      { id: 'grue', type: 'interact', text: 'Hisse les pierres avec la grue à roue.', targets: [
        { key: 'roue', at: 'grue', label: 'Marcher dans la roue de la grue', requires: 'pierre-taillee', need: 3, consume: 'pierre-taillee', consumeN: 3, anim: 'carry', duration: 3.2,
          text: "Tu marches dans la grande roue de bois comme un écureuil dans sa cage. Le câble s'enroule, et les blocs montent un à un jusqu'au sommet du mur.", codex: 'vie-chantier' },
      ] },
      { id: 'anselme2', type: 'talk', npc: 'anselme', dialogue: 'anselme.m2b', text: 'Retourne voir frère Anselme.' },
    ],
    rewards: { xpExpl: 50, money: 4, rep: 10, codex: ['lieu-chateliers'] }, next: 'med.m3' },
  { id: 'med.m3', main: true, title: 'La dîme du poisson', desc: 'Pêcheurs et moines se disputent un impôt. Qui a raison ?',
    steps: [
      { id: 'renaud', type: 'talk', npc: 'renaud', dialogue: 'renaud.m3', text: 'Écoute Renaud, le pêcheur, sur le quai.' },
      { id: 'anselme', type: 'talk', npc: 'anselme', dialogue: 'anselme.m3', text: "Demande à frère Anselme ce que dit la charte." },
      { id: 'charte', type: 'interact', text: "Lis la charte de fondation de l'abbaye, au scriptorium.", targets: [
        { key: 'charte', at: 'scriptorium', label: 'Lire la charte de 1156', anim: 'read', duration: 1.4, riddle: 'r-charte' },
      ] },
      { id: 'verdict', type: 'talk', npc: 'renaud', dialogue: 'renaud.m3b', manual: false, text: 'Rapporte à Renaud ce que dit la charte.' },
    ],
    rewards: { xpHist: 70, money: 4 }, next: 'med.m4' },
  { id: 'med.m4', main: true, title: "Voiles à l'horizon", desc: 'Des navires de pillards approchent du port.',
    steps: [
      { id: 'bertrand', type: 'talk', npc: 'bertrand', dialogue: 'bertrand.m4', text: 'Rejoins le sergent Bertrand à la tour de guet du port.' },
      { id: 'alarme', type: 'interact', text: 'Sonne la cloche, ferme la porte et allume le feu de la tour.', targets: [
        { key: 'cloche', at: 'cloche', label: "Sonner la cloche de l'église", anim: 'carry', duration: 1.8, do: [['fn', (api) => api.audio?.bell(4)]], text: 'Le bourdon de l\'église sonne à toute volée. Les portes s\'ouvrent, les hommes accourent avec des fourches et des épieux.' },
        { key: 'porte', at: 'porte', label: 'Fermer la porte de la palissade', anim: 'carry', duration: 1.6, do: [['flag', 'med_porte']], text: 'Tu pousses le lourd vantail de chêne et tu glisses la barre. La palissade est close.' },
        { key: 'fanal', at: 'fanal', label: 'Allumer le feu de la tour', anim: 'stir', duration: 1.8, text: 'Le brasier s\'embrase au sommet de la tour : on doit le voir jusqu\'à Saint-Martin.' },
      ] },
      { id: 'bertrand2', type: 'talk', npc: 'bertrand', dialogue: 'bertrand.m4b', text: 'Retourne voir Bertrand à la tour.' },
    ],
    rewards: { xpExpl: 60, money: 6, rep: 25, codex: ['histoire-plantagenet'] }, next: 'med.m5' },
  { id: 'med.m5', main: true, title: 'La clé de voûte', desc: "Frère Anselme est prêt à révéler ce qu'il garde.",
    steps: [
      { id: 'anselme', type: 'talk', npc: 'anselme', dialogue: 'anselme.m5', text: "Retrouve frère Anselme." },
      { id: 'cle', type: 'interact', text: 'Monte jusqu\'à la clé de voûte de la salle capitulaire.', targets: [
        { key: 'cle', at: 'cle-voute', label: 'Desceller la clé de voûte', anim: 'hammer', duration: 2.4, dialogue: 'cle.voute', codex: 'vie-cle-voute' },
      ] },
    ],
    rewards: { xpHist: 120, xpExpl: 40, rep: 20 } },
  // ---------- secondaires ----------
  { id: 'med.s1', giver: 'gautier', offer: 'gautier.offer', title: 'Le marteau de Gautier', desc: 'Le forgeron a perdu son marteau.',
    steps: [
      { id: 'colin', type: 'talk', npc: 'colin', dialogue: 'colin.hint', text: 'Interroge Colin, le gamin du port, près de l\'église.' },
      { id: 'marteau', type: 'collect', item: 'marteau', count: 1, text: "Récupère le marteau caché derrière l'église.", label: 'Ramasser le marteau', spawns: [['eglise', 4.5, -14]] },
      { id: 'rendre', type: 'deliver', npc: 'gautier', item: 'marteau', count: 1, dialogue: 'gautier.s1', text: 'Rapporte le marteau à Gautier.' },
    ],
    rewards: { xpExpl: 25, money: 3, rep: 10, items: ['fer-a-cheval'] } },
  { id: 'med.s2', giver: 'isabeau', offer: 'isabeau.offer', title: "La laine d'Isabeau", desc: 'Porter la laine de la drapière jusqu\'au bateau.',
    steps: [
      { id: 'prendre', type: 'collect', item: 'balle-laine', count: 3, text: 'Prends les 3 ballots de laine sous les halles.', label: 'Charger le ballot',
        spawns: [['halles', -5.5, -3], ['halles', 5.5, -3], ['halles', 7.5, 0.5]] },
      { id: 'livrer', type: 'deliver', npc: 'renaud', item: 'balle-laine', count: 3, dialogue: 'renaud.s2', text: 'Porte la laine à Renaud, sur le quai.' },
    ],
    rewards: { xpExpl: 30, money: 5, rep: 10, codex: ['vie-commerce-med'] } },
  { id: 'med.s3', giver: 'jean', offer: 'jean.offer', title: 'Le manuscrit des Châteliers', desc: 'Le vent a dispersé les pages enluminées de frère Jean.',
    steps: [
      { id: 'pages', type: 'collect', item: 'page', count: 3, text: 'Retrouve 3 pages de manuscrit autour du chantier.', label: 'Ramasser la page',
        spawns: [['grue', -3, 3], ['abbaye', 6, 3], ['carriere', -4, -2], ['loge', -2, 3]] },
      { id: 'rendre', type: 'deliver', npc: 'jean', item: 'page', count: 3, dialogue: 'jean.s3', text: 'Rapporte les pages à frère Jean.' },
    ],
    rewards: { xpHist: 50, rep: 10, items: ['manuscrit'], codex: ['vie-scriptorium'] } },
  { id: 'med.s4', giver: 'guillaume', offer: 'guillaume.offer', title: 'Le pèlerin égaré', desc: 'Guider un vieux pèlerin jusqu\'à l\'abbaye.',
    steps: [
      { id: 'guider', type: 'escort', npc: 'guillaume', to: 'abbaye', r: 5, text: "Conduis Guillaume jusqu'à l'abbaye (il te suit).", onStart: [['follow', 'guillaume']] },
      { id: 'merci', type: 'talk', npc: 'guillaume', dialogue: 'guillaume.s4', text: 'Parle à Guillaume devant l\'abbaye.' },
    ],
    rewards: { xpExpl: 30, money: 2, rep: 10, items: ['coquille'] } },
  { id: 'med.s5', giver: 'jean', offer: 'jean.offer2', title: 'Le jardin des simples', desc: 'Reconnaître les plantes médicinales du frère infirmier.',
    requires: ['med.s3'],
    steps: [
      { id: 'jardin', type: 'interact', text: 'Observe les carrés du jardin des simples.', targets: [
        { key: 'j1', at: ['jardin', -3, -2], label: 'Examiner le premier carré', anim: 'inspect', duration: 1, text: 'Sauge officinale, aux feuilles duveteuses : pour la gorge et les plaies.' },
        { key: 'j2', at: ['jardin', -3, 0], label: 'Examiner le deuxième carré', anim: 'inspect', duration: 1, text: 'Menthe aquatique, au parfum frais : elle aime les bords des fossés.' },
        { key: 'j3', at: ['jardin', -3, 2], label: 'Examiner le troisième carré', anim: 'inspect', duration: 1, riddle: 'r-simples', text: 'Camomille, rose, lys… et une étiquette de bois : « contre la fièvre ? »' },
      ] },
      { id: 'jean', type: 'talk', npc: 'jean', dialogue: 'jean.s5', text: 'Donne ta réponse à frère Jean.' },
    ],
    rewards: { xpHist: 35, money: 2 } },
];

const codex = {
  'perso-anselme': { cat: 'personnages', era: ERA, title: 'Frère Anselme, cistercien',
    text: "Entré à l'abbaye à seize ans, Anselme a appris la taille de la pierre avant le latin. Maître d'œuvre du chantier des Châteliers, il parle peu, comme le veut la règle de saint Benoît, mais n'oublie rien." },
  'perso-isabeau': { cat: 'personnages', era: ERA, title: 'Dame Isabeau, drapière',
    text: "Veuve d'un marin disparu en mer, Isabeau a repris le commerce de son mari : laine de l'île vers la Flandre, draps teints vers La Rochelle et l'Angleterre. Les femmes marchandes étaient nombreuses dans les villes portuaires du Moyen Âge." },
  'lieu-chateliers': { cat: 'lieux', era: ERA, title: "L'abbaye des Châteliers",
    text: "Fondée en 1156 grâce aux dons d'Eble de Mauléon, seigneur de l'île, l'abbaye cistercienne Notre-Dame de Ré, dite des Châteliers, prospéra grâce au sel et au vin. Ravagée pendant la guerre de Cent Ans puis les guerres de Religion, elle fut démantelée vers 1623-1625 pour construire le fort de La Prée. Ses ruines se dressent encore entre La Flotte et Saint-Martin." },
  'vie-chantier': { cat: 'vie', era: ERA, title: 'Les chantiers des cathédrales',
    text: "Construire une église prenait des décennies. Tailleurs de pierre, maçons, charpentiers et manœuvres travaillaient sous la direction d'un maître d'œuvre. Les grues à roue (« cages d'écureuil »), actionnées par des hommes qui marchaient à l'intérieur, hissaient les blocs. Chaque tailleur gravait sa marque sur ses pierres pour être payé." },
  'vie-cle-voute': { cat: 'vie', era: ERA, title: 'La clé de voûte',
    text: "Dans un arc ou une voûte de pierre, la clé est le dernier bloc posé au sommet : elle bloque toutes les autres pierres, qui ne tiennent que par elle. D'où l'expression « clé de voûte » pour désigner l'élément essentiel d'un ensemble." },
  'vie-dime': { cat: 'vie', era: ERA, title: 'La dîme',
    text: "La dîme était un impôt versé à l'Église, en principe le dixième des récoltes ou des revenus. Elle servait à entretenir le clergé, les églises et les pauvres. Son étendue (sur quoi, combien) faisait l'objet de nombreuses disputes, souvent réglées en relisant les chartes." },
  'histoire-plantagenet': { cat: 'histoire', era: ERA, title: 'Ré sous les Plantagenêts',
    text: "En 1152, Aliénor d'Aquitaine épouse Henri Plantagenêt, futur roi d'Angleterre : l'Aquitaine, et avec elle l'île de Ré, passe sous la couronne anglaise. Jusqu'au XVᵉ siècle, l'île change plusieurs fois de mains entre Anglais et Français. Ses habitants s'enrichissent en vendant sel et vin aux marchands anglais et flamands." },
  'vie-feodalite': { cat: 'vie', era: ERA, title: 'Seigneurs et vassaux',
    text: "Au Moyen Âge, la terre appartient à des seigneurs liés entre eux par des serments de fidélité (vassalité). Le seigneur protège, rend la justice et perçoit des taxes : banalités (four, moulin, pressoir), péages, corvées. L'île de Ré dépendait des seigneurs de Mauléon puis de Thouars." },
  'metier-forgeron': { cat: 'metiers', era: ERA, title: 'Le forgeron',
    text: "Indispensable à chaque village, le forgeron fabrique et répare outils agricoles, clous, ferrures, armes et fers à cheval. Le fer est chauffé à la forge, battu sur l'enclume puis trempé dans l'eau. On croyait qu'un fer à cheval pendu les branches en haut retenait la chance." },
  'metier-pecheur-med': { cat: 'metiers', era: ERA, title: 'Les pêcheurs médiévaux',
    text: "Les pêcheurs de l'île utilisaient barques, lignes, filets et écluses à poissons. Le poisson, salé ou fumé, était très consommé les jours maigres imposés par l'Église (le vendredi et pendant le carême). Le hareng saur voyageait dans toute l'Europe." },
  'vie-commerce-med': { cat: 'vie', era: ERA, title: 'Sel, vin et laine',
    text: "Au XIIᵉ siècle, l'île exporte son sel et son vin vers l'Angleterre et la Flandre ; en retour arrivent draps, métaux et céréales. La Rochelle, fondée vers 1130, devient vite le grand port de la région." },
  'vie-scriptorium': { cat: 'vie', era: ERA, title: 'Le scriptorium',
    text: "Dans les monastères, le scriptorium est la salle où les moines copient à la main livres saints, chroniques et chartes, sur des parchemins de peau de mouton ou de veau. Les enlumineurs les décorent de lettrines peintes et parfois de feuilles d'or." },
  'vie-pelerinage': { cat: 'vie', era: ERA, title: 'Les pèlerins de Saint-Jacques',
    text: "Au Moyen Âge, des milliers de pèlerins marchaient vers Saint-Jacques-de-Compostelle, en Galice. Leur insigne était la coquille Saint-Jacques. Une des routes, la « via Turonensis », passait par Saintes ; certains embarquaient depuis les ports de la côte atlantique." },
  'vie-simples': { cat: 'vie', era: ERA, title: 'Le jardin des simples',
    text: "Les « simples » sont les plantes médicinales utilisées seules. Chaque monastère en cultivait un jardin, soigneusement ordonné en carrés, pour soigner les moines, les pèlerins et les pauvres : sauge, menthe, camomille, hysope, rue…" },
};

export default { era: ERA, npcs, extras, items, shops, riddles, dialogues, quests, codex };
