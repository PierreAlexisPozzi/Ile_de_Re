// ÉPOQUE CONTEMPORAINE — Phare des Baleines, été 2026.
// Prologue (l'Astrolabe), quêtes secondaires d'aujourd'hui et finale
// (la confrontation avec Victor Lescure et la remise en marche de l'Horloge).

import * as THREE from 'three';
import { look, SKIN, HAIR, EYES } from '../../characters/wardrobe.js';
import { heightAt } from '../../world/terrain.js';
import { S } from '../../core/state.js';

const ERA = 'contemporaine';

const npcs = [
  {
    id: 'elise', name: 'Élise Fournier', title: 'Archiviste du musée', codex: 'perso-elise',
    look: look(ERA, 'archivist'),
    home: 'musee',
    routine: [
      { from: 7, to: 12.5, at: 'musee', action: 'read' },
      { from: 12.5, to: 14, at: ['cafe', -2, -1.2], action: 'drink' },
      { from: 14, to: 21, at: 'musee', action: 'read' },
      { from: 21, to: 7, at: 'gardien', action: 'idle' },
    ],
    barks: ["Les archives ne mentent pas… sauf quand elles s'effacent.", 'Avez-vous vu la dalle aujourd\'hui ?', 'Prenez garde à vous, là-bas.'],
    talk: (S) => (S.done('fin.m3') ? 'elise.after' : S.done('pro.m4') ? 'elise.hub' : 'elise.hello'),
  },
  {
    id: 'paul', name: 'Paul Guérin', title: 'Pêcheur retraité', codex: 'perso-paul',
    look: look(ERA, 'oldfisher'),
    home: 'banc',
    routine: [
      { from: 7, to: 20, at: 'banc', action: 'sit', face: -Math.PI / 2 },
      { from: 20, to: 7, at: 'hameau', action: 'idle' },
    ],
    barks: ['La mer, ça se lit comme un livre.', 'De mon temps, on pêchait le bar à la ligne, ici même.', 'Regarde-moi ce ciel… la brume arrive.'],
    talk: 'paul.chat',
  },
  {
    id: 'yannick', name: 'Yannick Le Goff', title: 'Technicien des Phares et Balises', codex: 'metier-gardien',
    look: look(ERA, 'technician'),
    home: 'phare',
    routine: [{ from: 6, to: 22, at: 'phare', action: 'idle' }, { from: 22, to: 6, at: 'hameau', action: 'idle' }],
    barks: ['257 marches, chaque matin. Ça forge le mollet.', 'La lampe tourne, tout va bien.', "Le phare n'a plus de gardien depuis 2000… il a un technicien."],
    talk: 'yannick.chat',
  },
  {
    id: 'marin', name: 'Marin Delcourt', title: 'Loueur de vélos', codex: 'vie-velo',
    look: look(ERA, 'renter'),
    home: 'cycles:keeper',
    routine: [{ from: 8, to: 20, at: 'cycles:keeper', action: 'idle' }, { from: 20, to: 8, at: 'hameau', action: 'idle' }],
    barks: ["Cent kilomètres de pistes cyclables sur l'île !", 'Vélo électrique ? Non, ici on pédale.', 'Le vent d\'ouest, c\'est notre moteur… à l\'aller.'],
    talk: 'marin.chat',
  },
  {
    id: 'ines', name: 'Inès Barreau', title: 'Gérante du Café des Baleines',
    look: look(ERA, 'cafe'),
    home: 'cafe:keeper',
    routine: [{ from: 7, to: 23, at: 'cafe:keeper', action: 'idle' }, { from: 23, to: 7, at: 'hameau', action: 'idle' }],
    barks: ['Un café, une glace, une crêpe ?', "Hugo ! Ne t'éloigne pas !", 'La terrasse est pleine tous les étés.'],
    talk: 'ines.chat',
  },
  {
    id: 'hugo', name: 'Hugo', title: "Fils d'Inès, 9 ans",
    look: look(ERA, 'child'),
    home: ['pin', 1.6, 1.4],
    routine: [{ from: 8, to: 20, at: ['pin', 1.6, 1.4], action: 'play' }, { from: 20, to: 8, at: ['cafe', 1.5, -1], action: 'idle' }],
    barks: ['Mon cerf-volant… il est coincé là-haut !', "T'es un explorateur ? Pour de vrai ?", 'Le phare, il fait 57 mètres !'],
  },
  {
    id: 'sandra', name: 'Sandra Kessler', title: 'Photographe en vacances',
    look: look(ERA, 'tourist'),
    home: 'orientation',
    routine: [
      { from: 8, to: 12, at: ['orientation', 1, -2.5], action: 'idle' },
      { from: 12, to: 16, at: ['plage', 2, -2], action: 'idle' },
      { from: 16, to: 21, at: ['orientation', 1, -2.5], action: 'idle' },
      { from: 21, to: 8, at: 'hameau', action: 'idle' },
    ],
    barks: ['Cette lumière ! Les peintres avaient raison.', 'Encore une photo du phare…', 'Ich meine… quelle vue !'],
  },
  {
    id: 'chloe', name: 'Chloé Martin', title: 'Bénévole de la réserve naturelle', codex: 'lieu-lilleau',
    look: look(ERA, 'birder'),
    home: 'observatoire',
    routine: [{ from: 7, to: 20, at: 'observatoire', action: 'lookout' }, { from: 20, to: 7, at: 'hameau', action: 'idle' }],
    barks: ['Chut… une aigrette, juste là.', 'Ne marchez pas dans les vasières, s\'il vous plaît.', 'Les bernaches arrivent en octobre.'],
  },
  {
    id: 'gaelle', name: 'Gaëlle', title: 'Crêpière',
    look: look(ERA, 'cafe', { sex: 'f', skin: SKIN.fair, hair: { style: 'bun', color: HAIR.red }, outfit: { apron: { c: 0xf0ece2, p: 'linen', len: 0.6, bib: true }, top: { c: 0x2a5a8a, p: 'stripes', c2: 0xf0f0f0 } } }),
    home: 'creperie:keeper', routine: [{ from: 0, to: 24, at: 'creperie:keeper', action: 'stir' }],
    barks: ['Galette complète ? Une spécialité !', 'Le beurre salé, c\'est la vie.'],
  },
  {
    id: 'riviere', name: 'M. Rivière', title: 'Libraire-souvenirs',
    look: look(ERA, 'walker', { sex: 'm', hair: { style: 'fringe', color: HAIR.grey }, beard: { style: 'short', color: HAIR.white }, outfit: { top: { c: 0x6a4a3a, p: 'knit' } }, hat: null }),
    home: 'boutique:keeper', routine: [{ from: 0, to: 24, at: 'boutique:keeper', action: 'read' }],
    barks: ['Une carte ancienne ? J\'ai une belle reproduction de 1702.', 'Les livres sur Vauban partent comme des petits pains.'],
  },
  {
    id: 'lina', name: 'Lina', title: 'Glacière',
    look: look(ERA, 'tourist', { hat: null, glasses: false, sex: 'f', skin: SKIN.olive, hair: { style: 'ponytail', color: HAIR.dark }, outfit: { bag: null, top: { c: 0xe080a0, p: 'plain' } }, props: { right: null } }),
    home: 'glacier:keeper', routine: [{ from: 0, to: 24, at: 'glacier:keeper', action: 'idle' }],
    barks: ['Fraise, vanille, caramel au beurre salé…', 'La glace au sel de Ré, vous avez goûté ?'],
  },
  {
    id: 'lescure', name: 'Victor Lescure', title: 'Antiquaire à Saint-Martin', codex: 'perso-lescure',
    look: look(ERA, 'collector'),
    when: (S) => S.active('fin.m2') || (S.done('fin.m2') && S.val('ending') === 'gardien'),
    home: ['dalle', 2.5, -1.5],
    routine: [{ from: 0, to: 24, at: ['dalle', 2.5, -1.5], action: 'idle' }],
    barks: ['Le temps est une marchandise comme une autre.', '…'],
    talk: (S) => (S.done('fin.m2') ? 'lescure.after' : 'lescure.final'),
  },
];

const extras = [
  { name: 'Promeneuse', look: look(ERA, 'walker'), path: 'parvis', barks: ['Quelle belle journée !', 'On monte au phare ?'] },
  { name: 'Touriste', look: look(ERA, 'tourist', { sex: 'm', hair: { style: 'short', color: HAIR.brown }, hat: { type: 'cap', c: 0x2a4a8a } }), path: 'parvis', barks: ['Tu as pris la crème solaire ?', 'Regarde, le phare !'] },
  { name: 'Cycliste', look: look(ERA, 'cyclist'), path: 'route', speed: 2.6, barks: ['Attention, vélo !', 'Bonjour !'] },
  { name: 'Cycliste', look: look(ERA, 'cyclist', { sex: 'f', hair: { style: 'ponytail', color: HAIR.blond }, outfit: { top: { c: 0x2a8a4a } } }), path: 'route', speed: 2.4, barks: ['Encore 10 km jusqu\'à Ars !'] },
  { name: 'Baigneur', look: look(ERA, 'renter', { hat: { type: 'sunhat', c: 0xe0cc98, c2: 0xc0302a }, outfit: { top: { c: 0xf0f0f0 } } }), path: 'plage', barks: ["L'eau est bonne !", 'Marée basse à 14 h.'] },
];

const items = {
  'lettre-elise': { name: "Lettre d'Élise", icon: '✉', type: 'document', desc: "« Venez vite. L'île oublie. Je vous attendrai au musée du phare. — Élise Fournier »",
    read: "Phare des Baleines, le 2 juillet 2026.\n\nJ'ai suivi vos reportages sur les patrimoines oubliés. Je n'ai personne d'autre à qui écrire.\n\nIci, quelque chose ne va pas. Des noms disparaissent des plaques et des mémoires. Les registres des gardiens du phare ont des pages blanches que j'avais lues la semaine dernière.\n\nVenez vite. L'île oublie.\nJe vous attendrai au musée du phare.\n\nÉlise Fournier, archiviste" },
  'cle-tour': { name: 'Clé de la vieille tour', icon: '🗝', type: 'outil', desc: "Une grosse clé rouillée. Elle ouvre la salle basse de la tour des Baleines, fermée depuis 1987." },
  cerfvolant: { name: 'Cerf-volant rouge', icon: '🪁', type: 'ressource', desc: "Le cerf-volant d'Hugo, un peu déchiré par les aiguilles de pin." },
  dechet: { name: 'Déchet plastique', icon: '🧴', type: 'ressource', desc: "Bouteille, filet, bouchon… rejetés par la mer. Ils mettent des siècles à disparaître.", model: 'trash' },
  'carte-postale': { name: 'Carte postale du phare', icon: '🖼', type: 'document', desc: 'Le phare des Baleines vu de la plage de la Conche.' },
  'carte-1702': { name: "Carte de l'Isle de Ré, 1702 (reproduction)", icon: '🗺', type: 'carte', codex: 'carte-1702',
    desc: "Reproduction d'une carte de l'île dressée pour le roi en 1702 : villages, marais, forts et « tour des Baleines ».",
    read: "Sur la carte de 1702, l'île ressemble à un long poisson tourné vers l'ouest. On y lit : « Fort de la Prée », « St Martin, ville fortifiée », « Ars », « Les Portes », « Tour des Baleines ». Les marais salants couvrent tout le pourtour du Fier d'Ars, hachurés en carrés réguliers. Une main a ajouté à l'encre brune, près de la pointe : « Horologium Maris ? »" },
  'journal-sudouest': { name: 'Journal du jour', icon: '📰', type: 'document',
    desc: "La page locale du quotidien régional.",
    read: "ÎLE DE RÉ — Un antiquaire de Saint-Martin, Victor Lescure, a été aperçu à plusieurs reprises autour de la vieille tour des Baleines, fermée au public. « Je m'intéresse aux objets du temps », a-t-il seulement déclaré. Par ailleurs, plusieurs habitants signalent des « trous de mémoire » inexpliqués : la municipalité d'Ars a dû refaire une plaque de rue dont personne ne se rappelait le nom." },
  'livre-vauban': { name: 'Livre « Vauban et l\'île de Ré »', icon: '📘', type: 'document', codex: 'perso-vauban', desc: 'Un beau livre illustré sur les fortifications de Saint-Martin.' },
  'fleur-de-sel': { name: 'Fleur de sel de Ré', icon: '🧂', type: 'consommable', desc: "Les cristaux qui fleurissent à la surface des œillets les jours chauds et ventés." },
  cafe: { name: 'Café', icon: '☕', type: 'consommable', desc: 'Un petit noir, en terrasse.', use: { stamina: 40, text: 'Un café bien serré. Tu repars d\'un bon pas.' } },
  crepe: { name: 'Crêpe au sucre', icon: '🥞', type: 'consommable', desc: 'Beurre salé et sucre.', use: { stamina: 60, text: 'Délicieuse crêpe !' } },
  galette: { name: 'Galette complète', icon: '🥞', type: 'consommable', desc: 'Jambon, œuf, fromage.', use: { stamina: 100, text: 'Te voilà rassasié pour un bon moment.' } },
  glace: { name: 'Glace au caramel au sel de Ré', icon: '🍦', type: 'consommable', desc: 'La spécialité de Lina.', use: { stamina: 50, text: 'Fraîche et salée à la fois.' } },
  velo: { name: 'Vélo de location', icon: '🚲', type: 'outil', unique: true, desc: 'Un vélo hollandais avec panier. Touche B pour monter ou descendre (à ton époque, ou en 1943).' },
};

const shops = {
  cafe: { name: 'Café des Baleines', intro: "« Asseyez-vous où vous voulez ! » lance Inès.", sign: { text: 'Café des Baleines', sub: 'Glaces · Crêpes · Terrasse', style: 'modern', bg: '#1e4a6a', icon: 'coffee' },
    wares: [{ item: 'cafe', price: 2 }, { item: 'journal-sudouest', price: 2, note: 'La page locale parle d\'un antiquaire…' }] },
  creperie: { name: 'Crêperie La Conche', sign: { text: 'Crêperie La Conche', sub: 'Galettes de blé noir · Cidre', style: 'painted', bg: '#8a3a1a', icon: 'crepe' },
    wares: [{ item: 'crepe', price: 3 }, { item: 'galette', price: 6 }] },
  boutique: { name: 'Boutique du Phare', intro: "M. Rivière lève les yeux de son livre : « Cartes anciennes, souvenirs, et le meilleur sel du monde. »", sign: { text: 'Boutique du Phare', sub: 'Souvenirs · Livres · Fleur de sel', style: 'modern', bg: '#2e5a4a', icon: 'lighthouse' },
    wares: [{ item: 'carte-postale', price: 1 }, { item: 'carte-1702', price: 8 }, { item: 'fleur-de-sel', price: 5 }, { item: 'livre-vauban', price: 12 }] },
  glacier: { name: 'Glaces de la Pointe', sign: { text: 'Glaces', sub: 'Artisanales depuis 1972', style: 'modern', bg: '#c0507a', icon: 'icecream' },
    wares: [{ item: 'glace', price: 3 }] },
  cycles: { name: 'Cycles du Phare', intro: 'Des vélos alignés, des pneus qui sentent le neuf.', sign: { text: 'Cycles du Phare', sub: 'Location de vélos · Réparations', style: 'modern', bg: '#2a5aaa', icon: 'bicycle' },
    wares: [{ item: 'velo', price: 5, note: 'Location à la journée (touche B pour monter)' }] },
};

const dialogues = {
  'pro.opening': [
    ['narr', "Été 2026. Une lettre t'a conduit jusqu'à la pointe ouest de l'Île de Ré, au pied du phare des Baleines."],
    ['narr', "« Venez vite. L'île oublie. Je vous attendrai au musée du phare. — Élise Fournier, archiviste »"],
    { do: [['give', 'lettre-elise'], ['codex', 'histoire-ile']] },
    ['me', 'Le musée est dans les anciens logements des gardiens, juste à côté du grand phare. Allons-y.'],
  ],
  'elise.hello': [['elise', 'Ah, vous voilà ! Je vous attendais. Venez, approchez.']],
  'elise.m1': [
    ['elise', "Vous êtes venu ! Je n'y croyais plus. Élise Fournier — je m'occupe des archives du musée."],
    ['elise', "Je vous ai écrit parce que vos reportages sur les patrimoines oubliés m'ont touchée. Et parce que vous ne me prendrez peut-être pas pour une folle."],
    ['me', "Votre lettre disait : « l'île oublie ». Qu'est-ce que ça veut dire ?"],
    ['elise', "Depuis trois jours, des choses s'effacent. Le nom d'une ruelle d'Ars a disparu des plaques — et des mémoires. Personne ne s'en souvient."],
    ['elise', "Ce matin, les registres des gardiens du phare avaient des pages blanches. Des pages que j'avais lues la semaine dernière, de mes yeux."],
    { choice: [
      { t: 'Vous êtes sûre que ce n\'est pas la fatigue ?', go: 'elise.m1.doubt' },
      { t: 'Par où dois-je commencer ?', go: 'elise.m1.task' },
    ] },
  ],
  'elise.m1.doubt': [
    ['elise', "C'est ce que je me suis dit. Puis Paul, le vieux pêcheur, m'a raconté ce qu'il avait vu en mer. Et la vitrine du musée s'est mise à… hésiter."],
    { go: 'elise.m1.task' },
  ],
  'elise.m1.task': [
    ['elise', "Trois choses m'inquiètent. D'abord Paul, sur le banc près de la table d'orientation : il a vu la mer faire des choses impossibles."],
    ['elise', "Ensuite la vitrine du journal de 1945, devant le musée : la date change toute seule. Et enfin la vieille dalle gravée, entre le phare et la tour des Baleines."],
    ['elise', "Allez voir. Moi, je replonge dans les archives des moines des Châteliers : il y avait une légende… que je n'arrive plus à retrouver."],
  ],
  'paul.m2': [
    ['paul', "Ah, c'est toi que la petite Élise attendait. Assieds-toi, ou reste debout, à ton âge on a de bonnes jambes."],
    ['paul', 'Soixante ans que je regarde cette mer. Je la connais mieux que ma propre main. Eh bien hier, elle est montée alors qu\'elle devait descendre.'],
    ['paul', "Et dans la brume, j'ai vu passer une barque à voile carrée, comme dans les vieux livres d'histoire. Des hommes en tunique, dedans. Puis… plus rien. Pas un remous."],
    { choice: [
      { t: 'Vous êtes certain de ce que vous avez vu ?', go: 'paul.m2.sure' },
      { t: 'Merci, Paul. Je vais enquêter.', end: true },
    ] },
  ],
  'paul.m2.sure': [
    ['paul', "Mon ami, je n'ai pas bu une goutte. Et regarde l'horaire des marées sur l'affiche, et regarde la mer : elles ne sont plus d'accord. Ça, ce ne sont pas mes yeux."],
  ],
  'paul.chat': [
    ['paul', (S) => (S.done('xix.m6') ? "Tu sais, mon arrière-grand-père racontait que les Borel d'Ars menaient des gabarres de sel. J'aimerais en savoir plus…" : 'La mer, mon ami, ça se lit comme un livre. Encore faut-il savoir lire.')],
  ],
  'elise.m2': [
    ['elise', 'Alors ? … La dalle a vibré ? Vous en êtes sûr ?'],
    ['me', "Et il y avait un homme en manteau gris près de la tour. Il a disparu sous mes yeux."],
    ['elise', "Un manteau gris… Victor Lescure, l'antiquaire de Saint-Martin, en porte toujours un. Il est venu fouiner autour de la tour toute la semaine. Mais disparaître…"],
    ['elise', "J'ai retrouvé ma note. La légende parle d'une « Horloge des Marées » cachée sous la pointe ; la dalle en serait la porte. Et la vieille tour a une salle basse, fermée depuis des décennies."],
    ['elise', "Yannick, le technicien des Phares et Balises, garde la clé. Il est au pied du grand phare. Dites-lui que c'est moi qui vous envoie."],
  ],
  'yannick.m3': [
    ['yannick', "Élise vous envoie ? Elle m'a téléphoné. La clé de la vieille tour… Personne n'y est entré depuis 1987, vous savez."],
    ['yannick', 'Je veux bien vous la confier, mais je dois être sûr que vous respecterez les lieux. Une petite question de culture locale.'],
    ['yannick', 'En quelle année ce grand phare a-t-il été allumé pour la première fois ?'],
    { choice: [
      { t: 'En 1682, sous Louis XIV.', go: 'yannick.w1' },
      { t: 'En 1854, sous Napoléon III.', go: 'yannick.ok', best: true },
      { t: 'En 1945, après la guerre.', go: 'yannick.w2' },
    ] },
  ],
  'yannick.w1': [['yannick', "Presque ! 1682, c'est la vieille tour, celle que Vauban fit bâtir. Le grand phare est plus jeune. L'affiche près de la crêperie vous aidera."]],
  'yannick.w2': [['yannick', "Ah non ! En 1945, il était déjà vieux de presque un siècle. Allez lire l'affiche du phare, puis revenez me voir."]],
  'yannick.ok': [
    ['yannick', 'Exact : 1854. Son feu porte à cinquante kilomètres, jusqu\'aux îles d\'Oléron et d\'Yeu. Bon, voilà la clé. Elle est rouillée, forcez doucement.'],
    { do: [['give', 'cle-tour'], ['advance', 'pro.m3'], ['codex', 'lieu-phare']] },
    ['yannick', "Et si vous croisez l'antiquaire au manteau gris, dites-lui que la tour n'est pas à vendre."],
  ],
  'yannick.chat': [['yannick', (S) => (S.done('pro.m3') ? "La vieille tour ? Vous avez trouvé quelque chose ? … Non, ne me dites rien, je préfère dormir tranquille." : '257 marches jusqu\'à la lanterne. Je les monte chaque matin.')]],
  'tour.inside': [
    ['narr', "La porte cède dans un grincement. Une odeur de pierre froide et de sel. Une salle voûtée, ronde, éclairée par une seule meurtrière."],
    ['narr', 'Dans le mur, face à la mer, une niche. Au fond, quelque chose luit : un disque de bronze à sept encoches. Une seule est encore pleine, sertie d\'un éclat doré.'],
    { do: [['give', 'astrolabe'], ['give', 'fragment-contemporaine'], ['flag', 'has_astrolabe']] },
    ['voice', '… Gardien… enfin… Les sept éclats ont été arrachés à l\'Horloge. Le Cœur a été volé.'],
    ['voice', "Sans eux, les marées du temps se dérèglent. Chaque époque oublie ce qu'elle a été… et l'île tout entière s'effacera."],
    ['voice', 'Retrouve les fragments. Chacun dort chez un gardien, dans une ville et un temps de l\'île. Je te guiderai… à travers les marées.'],
    ['me', '… Ce disque vient de me parler. Il faut que je montre ça à Élise.'],
  ],
  'elise.m4': [
    ['elise', "Montrez-moi… Mon Dieu. C'est lui. L'Astrolabe des Marées, exactement comme sur le croquis du moine des Châteliers !"],
    ['elise', "Le manuscrit dit que l'Horloge fut commencée par les premiers habitants de l'île, et que chaque époque y ajouta sa pièce, confiée à un gardien."],
    ['me', "Il m'a parlé. Il dit que les fragments ont été arrachés, que le Cœur a été volé, et que l'île va oublier tout son passé."],
    ['elise', "Alors c'est ça, les pages blanches… Regardez : une encoche brille différemment. La spirale… c'est le symbole gravé sur les pierres levées du Néolithique."],
    ['elise', "Je ne sais pas comment ça fonctionne. Mais si l'Astrolabe peut vous emmener là-bas… il faut essayer."],
    { choice: [
      { t: 'Et si je ne reviens pas ?', go: 'elise.m4.fear' },
      { t: "J'y vais. Comment faire ?", go: 'elise.m4.go' },
    ] },
  ],
  'elise.m4.fear': [
    ['elise', "Le moine a écrit : « Qui tient l'Astrolabe revient toujours à son propre temps. » Je veux bien le croire. Et puis… je serai là."],
    { go: 'elise.m4.go' },
  ],
  'elise.m4.go': [
    ['elise', "Serrez-le contre vous et pensez au lieu. D'après le manuscrit, la première encoche mène aux Portes, au bord du Fier, au temps des pierres levées."],
    { do: [['unlock', 'prehistoire'], ['codex', 'legende-horloge']] },
    ['narr', "L'Astrolabe tiédit dans ta paume. (Appuie sur T pour ouvrir le portail temporel.)"],
  ],
  'elise.hub': [
    ['elise', (S) => {
      const n = S.fragments();
      if (n >= 7) return 'Les sept fragments… Vous les avez tous ! Il ne manque plus que le Cœur.';
      if (n >= 4) return `${n} fragments sur sept. Les pages blanches se remplissent de nouveau, une à une. Continuez !`;
      return `${n} fragment${n > 1 ? 's' : ''} sur sept. Chaque fois que vous revenez, les registres retrouvent des lignes.`;
    }],
    { choice: [
      { t: "Parlez-moi encore de la légende.", go: 'elise.legend' },
      { t: "Qu'y a-t-il dans l'exposition, dehors ?", go: 'elise.expo' },
      { t: 'À plus tard, Élise.', end: true },
    ] },
  ],
  'elise.legend': [
    ['elise', "Les moines appelaient l'Horloge « Horologium Maris ». Ils écrivent qu'elle ne compte pas les heures mais les marées et les siècles, et que chaque génération en garde une pièce."],
    ['elise', "Quand les pièces sont séparées, l'île perd la mémoire. Quand elles tournent ensemble, l'île se souvient. C'est presque… poétique."],
  ],
  'elise.expo': [
    ['elise', "L'exposition « Mémoires de Ré », devant le musée. C'est étrange : depuis vos voyages, des objets y apparaissent. Un vase, une charte, des plans… Je ne me souviens pas les avoir installés."],
    ['elise', "Je crois que ce que vous faites là-bas change ce qui nous est parvenu. Faites attention à vos choix."],
  ],
  // ---------- quêtes secondaires ----------
  'hugo.offer': [
    ['hugo', "Dis, t'es grand toi. Mon cerf-volant est coincé tout en haut du pin, là. Maman dit que c'est perdu…"],
    { choice: [
      { t: "Je vais essayer de le décrocher.", do: [['start', 'pro.s1']] },
      { t: 'Plus tard, Hugo.', end: true },
    ] },
  ],
  'hugo.s1': [
    ['hugo', "Mon cerf-volant ! Tu l'as eu ! T'es trop fort !"],
    ['hugo', 'Tiens, je te donne ma plus belle carte postale. Le phare, en vrai, il est encore plus beau.'],
  ],
  'sandra.offer': [
    ['sandra', "Excusez-moi… Vous avez l'air de connaître le coin. J'écris un livre de photos sur les patrimoines de la côte atlantique."],
    ['sandra', "Il me manque quatre images : le grand phare, la vieille tour, la table d'orientation, et une écluse à poissons, ces murets de pierre en arc sur l'estran. Je n'ose pas descendre sur les rochers."],
    { choice: [
      { t: "Je m'en charge, j'ai un appareil.", do: [['start', 'pro.s2']] },
      { t: 'Désolé, pas le temps.', end: true },
    ] },
  ],
  'sandra.s2': [
    ['sandra', 'Faites voir… Wunderbar ! La lumière sur la vieille tour est parfaite.'],
    ['sandra', "Les écluses à poissons, c'est fascinant : des pièges de pierre construits par les paysans, que la marée remplit et vide deux fois par jour. Prenez ceci pour votre peine."],
  ],
  'marin.offer': [
    ['marin', "Salut ! Un vélo ? C'est LE moyen de visiter l'île. Cent kilomètres de pistes, et presque pas une côte."],
    { choice: [
      { t: 'Je veux bien essayer.', do: [['start', 'pro.s3']] },
      { t: 'Une autre fois.', end: true },
    ] },
  ],
  'marin.s3a': [
    ['marin', "Cinq euros la journée, casque fourni. Achète-le dans la boutique — enfin, à moi, quoi. Puis fais une boucle jusqu'à l'observatoire de la réserve, par le chemin de terre."],
  ],
  'marin.s3b': [
    ['marin', "Alors, ça roule ? Sur l'île, on dit qu'il y a plus de vélos que d'habitants l'été. C'est vrai, je les ai comptés… à peu près."],
    ['marin', "Garde-le autant que tu veux, je te fais confiance. Touche B pour monter ou descendre."],
  ],
  'marin.chat': [['marin', (S) => (S.flag('velo') ? 'Le vélo te plaît ? Le vent d\'ouest t\'aidera au retour.' : 'Un vélo ? Viens me voir quand tu veux.')]],
  'chloe.offer': [
    ['chloe', "Bonjour ! Doucement, vous allez effrayer les oiseaux. Je recense les échassiers de la réserve pour le comptage de l'été."],
    ['chloe', "Si vous voyez un héron cendré et une aigrette garzette, observez-les sans les déranger et dites-le-moi : chaque observation compte."],
    { choice: [
      { t: "Je vais ouvrir l'œil.", do: [['start', 'pro.s4']] },
      { t: 'Je ne connais rien aux oiseaux…', end: true },
    ] },
  ],
  'chloe.s4': [
    ['chloe', "Un héron et une aigrette ! Notés. Les aigrettes avaient presque disparu de France à cause de la mode des plumes sur les chapeaux. Les revoir ici, c'est une victoire."],
  ],
  'ines.offer': [
    ['ines', "Vous allez à la plage ? Les grandes marées ont encore ramené des déchets. Si vous en ramassez cinq, je vous offre une galette, promis."],
    { choice: [
      { t: "D'accord, je m'en occupe.", do: [['start', 'pro.s5']] },
      { t: 'Pas maintenant.', end: true },
    ] },
  ],
  'ines.s5': [
    ['ines', "Merci ! Cinq déchets de moins pour les tortues et les oiseaux. Une bouteille met quatre cents ans à se dégrader, vous imaginez ?"],
    ['ines', 'Tenez, votre galette. Et revenez quand vous voulez.'],
  ],
  'ines.chat': [
    ['ines', (S) => (S.active('fin.m2') ? "Victor Lescure ? Il est passé ce matin, pâle comme un linge. Il est parti vers la vieille dalle." : 'Un café ? La terrasse est à vous.')],
    { do: [['shop', 'cafe']] },
  ],
  'paul.offer': [
    ['paul', "Dis donc… depuis quelques jours, un nom me revient. Borel. Auguste Borel, capitaine de gabarre à Ars. Mon arrière-grand-père en parlait comme d'un héros."],
    ['paul', "Les registres des gardiens du phare notaient tous les bateaux qui passaient la pointe. Tu voudrais bien jeter un œil pour moi ? Le registre est dans l'entrée de la maison des gardiens."],
    { choice: [
      { t: 'Bien sûr, Paul.', do: [['start', 'pro.s6']] },
      { t: 'Plus tard.', end: true },
    ] },
  ],
  'paul.s6': [
    ['paul', "« 14 août 1862, gabarre Sainte-Anne, patron A. Borel, d'Ars, chargée de sel pour Nantes. Mer belle. » … Il est là. Il existe."],
    ['paul', "Tu sais ce que ça veut dire, mon ami, de retrouver le nom de ceux qui t'ont précédé ? C'est un peu comme rentrer au port."],
  ],
  // ---------- finale ----------
  'elise.fin1': [
    ['elise', "Vous êtes revenu ! Les sept fragments… Les registres sont de nouveau pleins. Et j'ai trouvé autre chose."],
    ['elise', (S) => (S.done('xix.m6') && S.done('wwii.m6')
      ? "Jeanne Bouyer, saunière à Ars en 1862… c'était mon arrière-arrière-arrière-grand-mère. Et Hélène Garnier, l'infirmière du Bois-Plage en 1943 — ma grand-mère. Elles étaient gardiennes. Toute ma famille gardait l'Horloge, et je n'en savais rien."
      : "Les noms des gardiens reviennent dans les archives, un à un. Certains me sont étrangement familiers.")],
    ['me', "Il manque encore le Cœur. Et je crois savoir qui l'a."],
    ['elise', "Victor Lescure. Sa boutique de Saint-Martin est fermée depuis une semaine. Inès l'a vu ce matin ; il allait vers la dalle."],
    ['elise', "Faites attention. Un homme qui vole la mémoire d'une île n'a plus grand-chose à perdre."],
  ],
  'lescure.final': [
    ['lescure', "Ainsi, c'est vous. L'explorateur qui me devance à chaque époque. Le dolmen, la villa, l'abbaye, la citadelle… Toujours un pas devant moi."],
    ['me', "Vous avez arraché le Cœur de l'Horloge. L'île est en train d'oublier son passé."],
    ['lescure', "L'île a toujours oublié ce qui l'arrangeait ! Les Lescure étaient gardiens, jadis. Puis Ernest, mon aïeul, a été ruiné, chassé, effacé des registres d'Ars."],
    ['lescure', 'Avec le Cœur et les sept fragments, je peux réécrire une page. Une seule. Donnez-les-moi, et vous garderez votre précieuse mémoire.'],
    { choice: [
      { t: "Ernest n'a pas trahi. J'ai lu sa lettre, à Ars : il a lui-même confié le fragment à Jeanne.", if: (S) => S.flag('know_ernest'), go: 'lescure.truth' },
      { t: 'Vos traces sont partout : briquet, montre, ticket… Vous effacez votre propre famille.', if: (S) => S.anachronisms() >= 4, go: 'lescure.evidence' },
      { t: 'Jamais. Rendez-moi le Cœur.', go: 'lescure.refuse' },
    ] },
  ],
  'lescure.truth': [
    ['lescure', 'Sa lettre ? … Quelle lettre ?'],
    ['me', "« Je n'ai pu me résoudre à vendre la mémoire de l'île. Que Jeanne la garde mieux que moi. » Signé Ernest Lescure, Ars, 1862."],
    ['lescure', "… Toute ma vie, j'ai cru qu'on l'avait chassé. Il avait choisi. Il avait protégé l'Horloge."],
    ['lescure', "Alors c'est moi, le traître de la famille."],
    { choice: [{ t: "Il n'est pas trop tard. Aidez-nous à la remettre en marche.", go: 'lescure.reconcile' }] },
  ],
  'lescure.evidence': [
    ['lescure', 'Mes… traces ?'],
    ['me', "Un briquet sous le dolmen. Une pièce de deux euros chez un marchand romain. Votre montre gravée, à Saint-Martin en 1681. Chaque fragment arraché effaçait un peu plus la mémoire — jusqu'aux registres où figurait le nom des Lescure."],
    ['lescure', "Les pages blanches… les registres d'Ars… C'est moi qui effaçais Ernest."],
    { go: 'lescure.reconcile' },
  ],
  'lescure.reconcile': [
    ['lescure', "Prenez-le. Le Cœur de l'Horloge. Je l'ai porté bien trop longtemps."],
    { do: [['give', 'coeur'], ['flag', 'ending', 'gardien'], ['advance', 'fin.m2']] },
    ['lescure', "Je resterai, si Élise le veut bien. Quelqu'un doit veiller sur la dalle… et j'ai beaucoup à réparer."],
  ],
  'lescure.refuse': [
    ['lescure', 'Alors vous ne me laissez pas le choix.'],
    ['narr', "Lescure brandit le Cœur au-dessus de la dalle. Les sept encoches s'illuminent ; l'Astrolabe s'arrache presque de ta main, et le Cœur, comme aimanté, s'envole vers lui."],
    ['voice', "Celui qui vole la mémoire n'appartient plus à aucun temps…"],
    ['narr', "Un tourbillon de lumière grise engloutit l'antiquaire. Quand il retombe, il ne reste que son manteau sur la pierre… et le Cœur, à tes pieds."],
    { do: [['give', 'coeur'], ['flag', 'ending', 'efface'], ['advance', 'fin.m2']] },
  ],
  'lescure.after': [['lescure', "Je veille sur la dalle avec Élise. Chaque marée, je l'entends tourner. C'est un drôle de bruit, la mémoire."]],
  'fin.restore': [
    ['narr', 'Un à un, tu poses les sept fragments dans les encoches de la dalle. Le Cœur trouve sa place au centre, sur la spirale.'],
    { do: [['fn', (api) => raiseHorloge(api)]] },
    ['voice', "Les marées et les siècles tournent de nouveau ensemble. L'île se souvient."],
    ['voice', 'Merci, gardien. Regarde… regarde ce que tu as sauvé.'],
  ],
  'elise.after': [
    ['elise', (S) => (S.val('ending') === 'gardien'
      ? "Victor passe ses journées près de la dalle. Il a rouvert sa boutique : il rend les objets à leurs musées. On ne se refait pas… mais on peut se réparer."
      : "Parfois, dans la brume, je crois voir un homme en manteau gris sur la pointe. Puis il n'est plus là. L'île se souvient de lui, à sa façon.")],
    ['elise', "Les sept époques vous restent ouvertes. L'île a encore mille histoires à raconter : allez-y quand vous voulez."],
  ],
};

// L'Horloge des Marées surgit de la dalle (finale)
function raiseHorloge(api) {
  const s = api.world.spots['dalle-centre'];
  if (!s) return;
  const g = new THREE.Group();
  const bronze = new THREE.MeshStandardMaterial({ color: 0xc89a50, metalness: 0.85, roughness: 0.3, emissive: 0x6a4a10, emissiveIntensity: 0.4 });
  const gears = [];
  for (let k = 0; k < 4; k++) {
    const r = 1.6 - k * 0.32;
    const gear = new THREE.Group();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r, 0.09, 8, 40), bronze);
    gear.add(ring);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.2, 0.12), bronze);
      tooth.position.set(Math.cos(a) * (r + 0.12), Math.sin(a) * (r + 0.12), 0);
      gear.add(tooth);
    }
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2;
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.05, r, 0.05), bronze);
      spoke.position.set(Math.cos(a) * r / 2, Math.sin(a) * r / 2, 0);
      spoke.rotation.z = a - Math.PI / 2;
      gear.add(spoke);
    }
    gear.position.y = 2.2 + k * 0.05;
    gear.rotation.x = k % 2 ? 0.4 : -0.3;
    gear.rotation.y = k * 0.7;
    g.add(gear);
    gears.push(gear);
  }
  const heart = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 1), new THREE.MeshStandardMaterial({ color: 0xfff0c0, emissive: 0xffc860, emissiveIntensity: 1.6 }));
  heart.position.y = 2.2;
  g.add(heart);
  const light = new THREE.PointLight(0xffd080, 3, 18);
  light.position.y = 2.4;
  g.add(light);
  g.position.set(s.x, heightAt(s.x, s.z) - 3, s.z);
  g.userData.noBatch = true;
  api.world.eraGroup.add(g);
  const t0 = performance.now();
  api.world.animated.push({
    obj: g, kind: 'custom',
    update: (time) => {
      const k = Math.min(1, (performance.now() - t0) / 4000);
      g.position.y = heightAt(s.x, s.z) - 3 + 3 * (1 - (1 - k) ** 3);
      gears.forEach((ge, i) => { ge.rotation.z = time * (0.3 + i * 0.2) * (i % 2 ? -1 : 1); });
      heart.rotation.y = time;
    },
  });
}

const quests = [
  // ---------- prologue ----------
  { id: 'pro.m1', main: true, title: 'Un rendez-vous au bout de l\'île', desc: "Élise Fournier, archiviste du musée du phare, t'a appelé à l'aide.",
    steps: [{ id: 'elise', type: 'talk', npc: 'elise', dialogue: 'elise.m1', text: 'Retrouve Élise Fournier au musée du phare.' }],
    rewards: { xpExpl: 30 }, next: 'pro.m2' },
  { id: 'pro.m2', main: true, title: 'Les échos du phare', desc: "Enquête sur les étranges anomalies de la pointe des Baleines.",
    steps: [
      { id: 'paul', type: 'talk', npc: 'paul', dialogue: 'paul.m2', text: "Écoute Paul, le vieux pêcheur assis près de la table d'orientation." },
      { id: 'indices', type: 'interact', text: 'Examine la vitrine du journal et la dalle gravée.', targets: [
        { key: 'vitrine', at: 'vitrine', label: 'Examiner la vitrine du journal de 1945', anim: 'inspect', duration: 1.2, title: "L'Écho de Ré",
          text: "« L'Écho de Ré, 8 mai 1945 — L'île est libre ! » Sous tes yeux, l'encre frémit : 1945… 1944… 1943… puis de nouveau 1945. Comme si l'histoire hésitait à s'écrire." },
        { key: 'dalle', at: 'dalle', label: 'Examiner la dalle gravée', anim: 'crouch', duration: 1.6, title: 'La dalle aux sept encoches',
          text: "Une dalle de granit usée, gravée de sept encoches en étoile autour d'une spirale. Sous ta main, elle vibre comme un cœur qui bat trop vite.\n\nAu pied de la vieille tour, un homme en long manteau gris t'observe… Tu clignes des yeux : il n'y a plus personne.",
          do: [['flag', 'saw_grey']] },
      ] },
      { id: 'elise', type: 'talk', npc: 'elise', dialogue: 'elise.m2', text: 'Raconte tout à Élise.' },
    ],
    rewards: { xpHist: 40 }, next: 'pro.m3' },
  { id: 'pro.m3', main: true, title: 'La salle basse de la vieille tour', desc: "La clé de la tour des Baleines est entre les mains du technicien du phare.",
    steps: [
      { id: 'yannick', type: 'talk', npc: 'yannick', dialogue: 'yannick.m3', manual: true, text: 'Demande la clé de la vieille tour à Yannick, au pied du grand phare.' },
      { id: 'porte', type: 'interact', text: 'Ouvre la porte de la vieille tour des Baleines.', targets: [
        { key: 'porte', at: 'tour', label: 'Ouvrir la porte de la vieille tour', requires: 'cle-tour', anim: 'inspect', duration: 1.8, dialogue: 'tour.inside', codex: 'lieu-tour' },
      ] },
    ],
    rewards: { xpHist: 60, xpExpl: 30 }, next: 'pro.m4' },
  { id: 'pro.m4', main: true, anyEra: true, title: 'Le premier saut', desc: "L'Astrolabe des Marées peut te mener dans le passé de l'île.",
    steps: [
      { id: 'elise', type: 'talk', npc: 'elise', dialogue: 'elise.m4', text: "Montre l'Astrolabe à Élise." },
      { id: 'saut', type: 'wait', until: (S) => S.era === 'prehistoire', text: "Ouvre le portail temporel (T) et voyage au Néolithique, aux Portes." },
    ],
    rewards: { xpHist: 50 } },

  // ---------- quêtes secondaires d'aujourd'hui ----------
  { id: 'pro.s1', giver: 'hugo', offer: 'hugo.offer', title: 'Le cerf-volant d\'Hugo', desc: "Le cerf-volant d'Hugo s'est pris dans un grand pin.",
    steps: [
      { id: 'pin', type: 'interact', text: 'Décroche le cerf-volant du pin.', targets: [
        { key: 'pin', at: 'pin', label: 'Secouer le pin', anim: 'hammer', duration: 1.8, give: 'cerfvolant', text: "Tu secoues le tronc de toutes tes forces. Une pluie d'aiguilles… et le cerf-volant rouge descend en tournoyant." },
      ] },
      { id: 'rendre', type: 'deliver', npc: 'hugo', item: 'cerfvolant', dialogue: 'hugo.s1', text: 'Rends son cerf-volant à Hugo.' },
    ],
    rewards: { xpExpl: 25, money: 5, rep: 5, items: ['carte-postale'] } },
  { id: 'pro.s2', giver: 'sandra', offer: 'sandra.offer', title: 'Objectif patrimoine', desc: 'Photographie quatre lieux de la pointe pour le livre de Sandra.',
    steps: [
      { id: 'photos', type: 'photo', text: 'Photographie le phare, la vieille tour, la table d\'orientation et l\'écluse à poissons.', targets: [
        { key: 'ph-phare', at: ['phare', 2, 10], label: 'Photographier le grand phare', codex: 'lieu-phare' },
        { key: 'ph-tour', at: ['tour', 3, 5], label: 'Photographier la vieille tour', codex: 'lieu-tour' },
        { key: 'ph-table', at: ['orientation', 1, 2], label: "Photographier la table d'orientation" },
        { key: 'ph-ecluse', at: 'ecluse', label: "Photographier l'écluse à poissons", codex: 'lieu-ecluses' },
      ] },
      { id: 'sandra', type: 'talk', npc: 'sandra', dialogue: 'sandra.s2', text: 'Montre tes photos à Sandra.' },
    ],
    rewards: { xpExpl: 50, money: 15, rep: 5 } },
  { id: 'pro.s3', giver: 'marin', offer: 'marin.offer', title: 'En selle !', desc: 'Loue un vélo et fais une boucle jusqu\'à la réserve.',
    steps: [
      { id: 'info', type: 'talk', npc: 'marin', dialogue: 'marin.s3a', text: 'Écoute les conseils de Marin.' },
      { id: 'louer', type: 'collect', item: 'velo', count: 1, text: 'Loue un vélo aux Cycles du Phare (5 €).', onDone: [['flag', 'velo']] },
      { id: 'boucle', type: 'goto', at: 'observatoire', r: 5, text: "Roule jusqu'à l'observatoire de la réserve (touche B)." },
      { id: 'retour', type: 'talk', npc: 'marin', dialogue: 'marin.s3b', text: 'Reviens voir Marin.' },
    ],
    rewards: { xpExpl: 40, codex: ['vie-velo'] } },
  { id: 'pro.s4', giver: 'chloe', offer: 'chloe.offer', title: 'Les oiseaux du Lilleau', desc: 'Observe un héron cendré et une aigrette garzette pour le comptage de la réserve.',
    steps: [
      { id: 'obs', type: 'observe', fauna: ['heron', 'egret'], count: 2, text: 'Observe un héron et une aigrette (approche doucement, E).' },
      { id: 'chloe', type: 'talk', npc: 'chloe', dialogue: 'chloe.s4', text: 'Fais ton rapport à Chloé.' },
    ],
    rewards: { xpExpl: 40, money: 10, codex: ['faune-aigrette', 'faune-heron'] } },
  { id: 'pro.s5', giver: 'ines', offer: 'ines.offer', title: 'Plage propre', desc: 'Ramasse les déchets laissés par la marée sur la plage de la Conche.',
    steps: [
      { id: 'ramasser', type: 'collect', item: 'dechet', count: 5, text: 'Ramasse 5 déchets sur la plage.', spawns: [['plage', -5, 1], ['plage', 4, 2], ['plage', 9, 0], ['plage', -2, -3], ['plage', 12, 1], ['plage', -8, -2]] },
      { id: 'jeter', type: 'interact', text: 'Jette-les dans la poubelle de tri, en haut de la plage.', targets: [
        { key: 'bin', at: 'poubelle', label: 'Trier les déchets', consume: 'dechet', consumeN: 5, anim: 'inspect', duration: 1 },
      ] },
      { id: 'ines', type: 'talk', npc: 'ines', dialogue: 'ines.s5', text: 'Retourne voir Inès au café.' },
    ],
    rewards: { xpExpl: 35, rep: 10, items: ['galette'] } },
  { id: 'pro.s6', giver: 'paul', offer: 'paul.offer', title: 'Le nom du capitaine', desc: "Paul cherche la trace de son aïeul, capitaine de gabarre à Ars.",
    cond: (S) => S.done('xix.m6'),
    steps: [
      { id: 'registre', type: 'interact', text: 'Consulte le registre des gardiens du phare.', targets: [
        { key: 'reg', at: 'gardien', label: 'Feuilleter le registre des gardiens', anim: 'read', duration: 2,
          text: "Registre des passages, été 1862. D'une écriture penchée : « 14 août 1862, gabarre Sainte-Anne, patron A. Borel, d'Ars, chargée de sel pour Nantes. Mer belle. »" },
      ] },
      { id: 'paul', type: 'talk', npc: 'paul', dialogue: 'paul.s6', text: 'Annonce la nouvelle à Paul.' },
    ],
    rewards: { xpHist: 60, rep: 10 } },

  // ---------- finale ----------
  { id: 'fin.m1', main: true, auto: true, requires: ['wwii.m6'], title: 'Le retour de l\'explorateur', desc: 'Les sept fragments sont réunis. Il manque le Cœur.',
    steps: [{ id: 'elise', type: 'talk', npc: 'elise', dialogue: 'elise.fin1', text: 'Retrouve Élise au musée.' }],
    rewards: { xpHist: 50 }, next: 'fin.m2' },
  { id: 'fin.m2', main: true, title: "L'homme au manteau gris", desc: 'Victor Lescure attend près de la dalle.',
    steps: [{ id: 'lescure', type: 'talk', npc: 'lescure', dialogue: 'lescure.final', manual: true, text: 'Affronte Victor Lescure près de la dalle aux sept encoches.' }],
    rewards: { xpHist: 100 }, next: 'fin.m3' },
  { id: 'fin.m3', main: true, title: 'La Mémoire de Ré', desc: "Remets l'Horloge des Marées en marche.",
    steps: [{ id: 'dalle', type: 'interact', text: 'Replace les sept fragments et le Cœur dans la dalle.', targets: [
      { key: 'dalle', at: 'dalle', label: "Remettre l'Horloge en marche", requires: 'coeur', anim: 'crouch', duration: 2.2, dialogue: 'fin.restore' },
    ] }],
    rewards: { xpHist: 300, xpExpl: 100 },
    onComplete: [['fn', (api) => setTimeout(() => api.cinematic.play('finale', () => api.ui.credits()), 600)]] },
];

const codex = {
  'perso-elise': { cat: 'personnages', era: ERA, title: 'Élise Fournier, archiviste',
    text: "Née à Ars en 1974, Élise a grandi entre les marais salants de son arrière-grand-mère et les livres de son grand-père. Archiviste au musée du phare depuis vingt ans, elle connaît chaque registre des gardiens. Elle ignore encore que sa famille garde un secret plus ancien que le phare." },
  'perso-paul': { cat: 'personnages', era: ERA, title: 'Paul Guérin, pêcheur retraité',
    text: "Pêcheur au bar et à la seiche pendant cinquante ans depuis le port d'Ars, Paul passe ses journées sur le banc face au pertuis Breton. Il connaît les noms de tous les rochers de la pointe, et beaucoup d'histoires que personne n'a écrites." },
  'perso-lescure': { cat: 'personnages', era: ERA, title: "Victor Lescure, l'antiquaire",
    text: "Antiquaire à Saint-Martin, collectionneur d'« objets du temps », toujours vêtu d'un long manteau gris. Descendant d'une famille de négociants en sel d'Ars ruinée à la fin du XIXᵉ siècle, il a découvert dans le journal de son aïeul Ernest l'existence de l'Horloge des Marées." },
  'metier-gardien': { cat: 'metiers', era: ERA, title: 'Gardiens de phare',
    text: "Pendant près d'un siècle et demi, des gardiens se relayèrent au phare des Baleines : ils montaient chaque soir allumer la lampe, remontaient le mécanisme de rotation toutes les quelques heures et notaient le temps et les navires dans un registre. Le phare fut automatisé en 2000 ; des techniciens des Phares et Balises l'entretiennent aujourd'hui." },
  'lieu-phare': { cat: 'lieux', era: ERA, title: 'Le phare des Baleines',
    text: "Allumé en 1854, haut de 57 mètres et fort de 257 marches, le phare des Baleines éclaire l'entrée des pertuis. Sa tour octogonale en pierre de taille remplaça la vieille tour de 1682, trop courte. Son feu, visible à 50 km, avertit les marins des dangereux rochers des Baleineaux." },
  'lieu-tour': { cat: 'lieux', era: ERA, title: 'La tour des Baleines (1682)',
    text: "Construite sur ordre de Colbert d'après les recommandations de Vauban, la tour des Baleines portait à son sommet un feu de bois puis de charbon. Elle fut l'un des premiers phares de la côte atlantique. Désaffectée en 1854, elle sert aujourd'hui d'amer de jour aux marins." },
  'lieu-ecluses': { cat: 'lieux', era: ERA, title: 'Les écluses à poissons',
    text: "Sur l'estran rocheux de l'île, de longs murets de pierres sèches en arc de cercle forment des pièges à poissons : la mer les recouvre à marée haute, puis se retire en laissant les poissons prisonniers. Certaines remontent au Moyen Âge. Une centaine existaient au XIXᵉ siècle ; une quinzaine sont encore entretenues par des associations d'« éclusiers »." },
  'lieu-lilleau': { cat: 'lieux', era: ERA, title: 'Lilleau des Niges',
    text: "Réserve naturelle nationale depuis 1980, Lilleau des Niges s'étend au fond du Fier d'Ars sur d'anciens marais salants. Bernaches cravants, avocettes, échasses, spatules et aigrettes y trouvent refuge. La Ligue pour la protection des oiseaux en assure la gestion." },
  'vie-velo': { cat: 'vie', era: ERA, title: "L'île à vélo",
    text: "Avec plus de 100 km de pistes cyclables, l'Île de Ré est l'un des paradis du vélo en France. L'été, on y croise plus de bicyclettes que de voitures. Les pistes traversent marais, vignes, forêts et villages, presque sans dénivelé." },
  'vie-marees': { cat: 'vie', era: ERA, title: 'Les marées',
    text: "Deux fois par jour, la mer monte et descend sous l'attraction de la Lune et du Soleil. Le « coefficient » mesure l'amplitude de la marée : au-delà de 100, on parle de grande marée, et l'estran découvert s'étend sur des centaines de mètres autour de l'île." },
  'carte-1702': { cat: 'histoire', era: ERA, title: "La carte de l'Isle de Ré (1702)",
    text: "Dressées par les ingénieurs du roi, les cartes du début du XVIIIᵉ siècle montrent une île couverte de marais salants (en damier), de vignes et de petits bourgs. Forts et redoutes protègent les côtes face aux flottes anglaise et hollandaise." },
  'lieu-musee': { cat: 'lieux', era: ERA, title: 'Le musée du phare',
    text: "Installé dans les anciens logements des gardiens, le musée raconte la vie des hommes qui entretenaient le feu : registres, lampes, lentilles de Fresnel, uniformes, et un mécanisme d'horlogerie qui faisait tourner l'optique." },
};

export default {
  era: ERA, npcs, extras, items, shops, dialogues, quests, codex,
  onEnter(api) {
    // l'Horloge reste visible après la finale
    if (S.done('fin.m3')) raiseHorloge(api);
  },
};
