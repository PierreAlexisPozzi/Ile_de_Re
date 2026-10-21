// Contenu commun à toutes les époques : l'Astrolabe, les sept Fragments du
// Temps, les anachronismes semés par l'homme en gris, dialogues génériques,
// et les entrées du carnet sur la faune, la flore et l'histoire de l'île.

import { NPCS } from './registry.js';

const FRAG = [
  ['contemporaine', "Fragment d'Aujourd'hui", "Trouvé dans la niche de la vieille tour des Baleines. Il palpite au rythme des marées d'aujourd'hui."],
  ['prehistoire', 'Fragment des Pierres levées', "Gardé par Maëla sous la table du dolmen des Portes. Une spirale y est gravée, comme sur les menhirs."],
  ['antiquite', 'Fragment de Ratis', "Caché par Brennos dans l'ancien sanctuaire gaulois de Sainte-Marie. Une inscription latine court sur sa tranche."],
  ['moyenage', 'Fragment de la Clé de voûte', "Scellé par frère Anselme dans la clé de voûte de la salle capitulaire des Châteliers."],
  ['xvii', "Fragment de l'Horloger", "Dissimulé par maître Ambroise dans le mécanisme de l'horloge de l'église Saint-Martin."],
  ['xix', 'Fragment du Sel', "Enfoui par Jeanne Bouyer sous le plus vieux mulon de son marais, à Ars. Il en garde un goût de sel."],
  ['wwii', 'Fragment de la Mémoire', "Sauvé du béton par Hélène Garnier dans un blockhaus du Bois-Plage, une nuit de couvre-feu."],
];

const items = {
  astrolabe: { name: "L'Astrolabe des Marées", icon: '🧭', type: 'artefact', unique: true,
    desc: "Un disque de bronze à sept encoches, gravé de spirales et de marées. Il tiédit quand le temps se plie. (Touche T : voyager)" },
  coeur: { name: "Le Cœur de l'Horloge", icon: '💠', type: 'fragment', unique: true,
    desc: "La pièce centrale de l'Horloge des Marées, arrachée par Victor Lescure. Sans elle, les sept fragments ne peuvent tourner ensemble." },
  'ana-briquet': { name: 'Briquet en plastique', icon: '🔥', type: 'anachronisme', desc: "Trouvé sous le dolmen, vers 4500 av. J.-C. Un objet de 2020. Quelqu'un d'autre voyage dans le temps." },
  'ana-euro': { name: 'Pièce de 2 euros (2019)', icon: '🪙', type: 'anachronisme', desc: "Donnée en paiement à un marchand romain par « un étranger en manteau gris »." },
  'ana-stylo': { name: 'Stylo à bille', icon: '🖊', type: 'anachronisme', desc: "Perdu par un faux pèlerin au chantier des Châteliers, en 1190. Le capuchon porte les lettres « V.L. »." },
  'ana-montre': { name: 'Montre-bracelet', icon: '⌚', type: 'anachronisme', desc: "Tombée de la poche du « sieur de Grisval » en 1681. Au dos : « À Victor, pour ses 40 ans »." },
  'ana-ticket': { name: 'Ticket de métro parisien', icon: '🎫', type: 'anachronisme', desc: "Oublié par « M. Gris », négociant, dans les marais d'Ars en 1862. Composté en 2025." },
  'ana-smartphone': { name: 'Smartphone fêlé', icon: '📱', type: 'anachronisme', desc: "Abandonné dans un blockhaus en 1943. Fond d'écran : la vitrine d'une boutique, « Antiquités Lescure, Saint-Martin »." },
};
for (const [era, name, desc] of FRAG) {
  items['fragment-' + era] = { name: `Fragment — ${name}`, icon: '✦', type: 'fragment', unique: true, era, desc };
}

const dialogues = {
  _default: [
    ['npc', (S, ctx) => {
      const n = NPCS[ctx.npcId];
      const pool = typeof n?.barks === 'function' ? n.barks(S) : n?.barks;
      return pool?.length ? pool[Math.floor(Math.random() * pool.length)] : 'Bonne journée à toi.';
    }],
  ],
  _missing: [
    ['npc', (S, ctx) => `Il me faut encore ${Math.max(1, ctx.need - ctx.have)} de plus. Reviens quand tu les auras.`],
  ],
};

const codex = {
  'legende-horloge': { cat: 'histoire', title: "La légende de l'Horloge des Marées",
    text: "Selon une légende rapportée par les moines de l'abbaye des Châteliers, un mécanisme de pierre et de bronze dort sous la pointe des Baleines. Il ne compte pas les heures mais les marées et les siècles : tant qu'il tourne, l'île garde la mémoire de son passé.\n\nChaque époque en aurait confié une pièce — un « fragment » — à un gardien ou une gardienne. Les fragments ne prennent leur sens qu'ensemble, réunis autour du Cœur." },
  'histoire-ile': { cat: 'histoire', title: "L'Île de Ré en bref",
    text: "Longue de 30 km et large de 70 m à 5 km, l'Île de Ré ferme la baie de La Rochelle entre deux bras de mer : le pertuis Breton au nord, le pertuis d'Antioche au sud. Elle est faite de plusieurs îlots de calcaire réunis au fil des siècles par les sables et les marais.\n\nSon nom viendrait du gaulois « ratis », la fougère. Habitée dès le Néolithique, romanisée, convoitée par les Anglais au Moyen Âge, fortifiée par Vauban, enrichie par le sel et le vin, occupée en 1940-1945, elle est reliée au continent par un pont depuis 1988." },
  'lieu-pont': { cat: 'lieux', title: "Le pont de l'Île de Ré (1988)",
    text: "Long de 2 926 mètres, le pont relie l'île à La Rochelle depuis le 19 mai 1988. Sa courbe laisse passer les navires vers le port de La Pallice. Avant lui, on traversait par le bac depuis le XIXᵉ siècle, et avant le bac, en barque ou à la voile." },
  'histoire-formation-ile': { cat: 'histoire', title: "Comment l'île a pris sa forme",
    text: "Il y a 7 000 ans, la mer était plus basse de quelques mètres et l'estran bien plus vaste. Ré n'était alors qu'un chapelet de trois îles : l'île d'Ars à l'ouest (Ars, Saint-Clément, Les Portes), l'île de Loix au nord, et l'île de Ré proprement dite (Saint-Martin, La Flotte, Sainte-Marie). Les chenaux qui les séparaient, au Martray et au sud de Loix, se sont envasés au Moyen Âge ; les moines puis les sauniers les ont endigués pour y creuser des marais salants. À la fin du Moyen Âge, les trois îles n'en faisaient plus qu'une. Aujourd'hui, la côte sud recule sous l'effet de l'érosion, et le Martray ne mesure plus que 70 mètres de large à son point le plus étroit." },
  // ---- faune ----
  'faune-goeland': { cat: 'faune', title: 'Goélands et mouettes',
    text: "Le goéland argenté, grand oiseau gris et blanc au bec jaune taché de rouge, plane au-dessus des ports et des plages. La mouette rieuse, plus petite, porte un capuchon brun au printemps. Tous deux suivent les bateaux de pêche et nichent sur les îlots et les toits." },
  'faune-heron': { cat: 'faune', title: 'Le héron cendré',
    text: "Grand échassier gris (jusqu'à 1 mètre), le héron cendré chasse à l'affût, immobile dans les eaux peu profondes des marais et des fossés, avant de harponner poissons et grenouilles d'un coup de bec. En vol, il replie son cou en S." },
  'faune-aigrette': { cat: 'faune', title: "L'aigrette garzette",
    text: "Petit héron d'un blanc éclatant aux pattes noires et aux doigts jaunes, l'aigrette garzette arpente les vasières et les marais salants. Chassée au XIXᵉ siècle pour ses plumes qui ornaient les chapeaux, elle est aujourd'hui protégée et fréquente toute l'année le Fier d'Ars." },
  'faune-lapin': { cat: 'faune', title: 'Le lapin de garenne',
    text: "Les dunes et les friches de l'île abritent de nombreux lapins de garenne. Leurs terriers stabilisent parfois les dunes… ou les fragilisent. Au crépuscule, on les voit brouter au bord des chemins avant de détaler, la queue blanche dressée." },
  'faune-poissons': { cat: 'faune', title: 'Les poissons de l\'estran',
    text: "Mulets dorés, bars, soles, seiches et anguilles fréquentent les eaux peu profondes qui entourent l'île. À marée descendante, ils restent piégés dans les écluses à poissons. Le bar est aussi appelé « loup » sur la côte méditerranéenne." },
  'faune-cerf': { cat: 'faune', title: 'Le cerf élaphe',
    text: "Au Néolithique, des forêts de chênes couvraient une partie de l'île, encore rattachée par endroits au continent. Les cerfs élaphes, sangliers et aurochs y étaient chassés. Le bois de cerf servait à fabriquer manches d'outils, pics et harpons." },
  'faune-ane': { cat: 'faune', title: "L'âne en culotte",
    text: "Dans les marais salants, les sauniers utilisaient des ânes pour porter le sel. Pour les protéger des piqûres de moustiques et de taons, on leur enfilait des pantalons de toile, souvent rayés ou à carreaux : les célèbres « ânes en culotte », devenus l'emblème de l'île." },
  // ---- flore ----
  'flore-oyat': { cat: 'flore', title: "L'oyat",
    text: "Graminée aux longues feuilles enroulées, l'oyat pousse sur le sable des dunes. Ses racines profondes retiennent le sable que le vent voudrait emporter : on le plante pour fixer les dunes, protégées par des ganivelles (clôtures de châtaignier)." },
  'flore-pin': { cat: 'flore', title: 'Le pin maritime',
    text: "Les forêts de pins maritimes de l'île (Trousse-Chemise, le Lizay, la Combe à l'eau) ont été plantées au XIXᵉ siècle pour arrêter l'avancée des dunes qui menaçaient champs et villages. Leurs troncs penchés racontent la force des vents d'ouest." },
  'flore-vigne': { cat: 'flore', title: 'La vigne',
    text: "Introduite par les Romains, la vigne a longtemps été la seconde richesse de l'île après le sel. Au XIXᵉ siècle, elle couvrait la moitié des terres, avant que le phylloxéra ne la ravage vers 1880. On y produit aujourd'hui vins, pineau et cognac." },
  'flore-salicorne': { cat: 'flore', title: 'La salicorne',
    text: "Plante charnue des marais et des vasières, la salicorne pousse là où l'eau salée affleure. Verte au printemps, elle rougit à l'automne. On la mange en salade ou confite au vinaigre : on l'appelle aussi « haricot de mer »." },
  'flore-rose': { cat: 'flore', title: 'La rose trémière',
    text: "Emblème des ruelles rétaises, la rose trémière pousse au pied des murs chaulés, dans la moindre fente entre la façade et la chaussée. Ses hautes hampes fleuries — roses, pourpres, blanches — peuvent dépasser deux mètres." },
  'flore-immortelle': { cat: 'flore', title: "L'immortelle des dunes",
    text: "Petite plante aux fleurs jaunes et au parfum de curry, l'immortelle des dunes couvre le sable de juillet à septembre. Ses fleurs séchées gardent leur couleur : de là son nom." },
  'flore-chene': { cat: 'flore', title: 'Le chêne vert',
    text: "Le chêne vert, ou yeuse, garde ses feuilles toute l'année. Résistant au sel et au vent, il forme encore quelques bosquets sur l'île, souvenirs des forêts qui la couvraient avant que les hommes ne la défrichent pour le sel et la vigne." },
  'flore-tamaris': { cat: 'flore', title: 'Le tamaris',
    text: "Arbuste au feuillage plumeux et aux fleurs roses, le tamaris supporte les embruns et le sable : on le plante en haie au bord de la mer et des routes. Ses branches souples servaient aux vanniers." },
};

export default { era: null, items, dialogues, codex };
