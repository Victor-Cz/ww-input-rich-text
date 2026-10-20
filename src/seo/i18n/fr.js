// Locale française des checks SEO : title, description, objective (l'objectif
// à atteindre, en clair), et messages par statut (good / warning / bad, plus na
// pour certains checks). Les messages supportent l'interpolation {value}.
// La clé `categories` porte le nom / la description de chaque catégorie de checks.

export default {
    // Message par défaut pour un check non applicable sans message `na` dédié
    // (donnée manquante — mot-clé/meta non fournis — ou texte trop court).
    defaultNa: 'Non évalué : information manquante ou texte trop court.',
    categories: {
        structure: {
            name: 'Structure',
            description: 'Structure du contenu : longueur du texte, paragraphes et mise en forme.',
        },
        headings: {
            name: 'Titres',
            description: 'Contenu des titres (H1-H6) : longueur et présence des mots-clés (la structure des titres est en catégorie Structure).',
        },
        readability: {
            name: 'Lisibilité',
            description: 'Facilité de lecture du texte : longueur des phrases, vocabulaire, style.',
        },
        links: {
            name: 'Liens',
            description: 'Liens internes et sortants, et qualité de leurs ancres.',
        },
        images: {
            name: 'Images',
            description: 'Présence et optimisation des images et médias (attributs alt).',
        },
        keyword: {
            name: 'Mots-clés',
            description: 'Utilisation du mot-clé principal et des mots-clés secondaires dans le contenu.',
        },
        meta: {
            name: 'Metas',
            description: 'Optimisation du meta title et de la meta description de la page.',
        },
        credibility: {
            name: 'Crédibilité',
            description: 'Faits chiffrés et sourcés, citations, fraîcheur des données : ce qui rend un passage digne d’être cité.',
        },
    },
    // Structure
    textLength: {
        title: 'Longueur du texte',
        description: 'Vérifie que le texte est assez long pour se positionner (300 mots minimum recommandés).',
        objective: '≥ 300 mots',
        messages: {
            good: 'Le texte fait {value} mots, c’est suffisant.',
            warning: 'Le texte fait {value} mots, visez au moins 300 mots.',
            bad: 'Le texte fait {value} mots, c’est trop court pour bien se positionner.',
        },
    },
    headingHierarchy: {
        title: 'Structure des titres',
        description: 'Vérifie qu’il y a un seul titre H1 et que les niveaux se suivent sans saut (ex. pas de H2 → H4).',
        objective: 'Un seul H1, aucun saut de niveau',
        messages: {
            good: 'La structure des titres est cohérente.',
            warning: '{value} titre(s) sautent un niveau (ex. H2 → H4).',
            multipleH1: 'Le contenu contient {value} H1 : il ne doit y en avoir qu’un.',
            missingH1: 'Le contenu ne contient pas de H1 alors qu’un H1 est attendu : ajoutez un titre H1.',
        },
    },
    subheadingDistribution: {
        title: 'Longueur des sections',
        description: 'Vérifie que chaque section (texte entre deux sous-titres) fait entre 80 et 300 mots : assez pour être comprise seule, assez court pour rester ciblée.',
        objective: '80-300 mots par section',
        messages: {
            good: 'Les sections ont une bonne longueur.',
            warning: '{value} section(s) sortent de la fourchette 80-300 mots.',
            bad: '{value} section(s) sortent de la fourchette 80-300 mots : redécoupez le texte.',
            tooLong: '{value} section(s) hors fourchette, dont au moins une de plus de 300 mots sans sous-titre : découpez-la.',
            tooShort: '{value} section(s) font moins de 80 mots : étoffez-les ou fusionnez-les.',
        },
    },
    paragraphLength: {
        title: 'Longueur des paragraphes',
        description: 'Vérifie qu’aucun paragraphe ne dépasse 150 mots, pour rester lisible.',
        objective: '≤ 150 mots par paragraphe',
        messages: {
            good: 'Aucun paragraphe n’est trop long.',
            warning: '{value} paragraphe(s) dépassent 150 mots.',
            bad: '{value} paragraphe(s) dépassent 150 mots : raccourcissez-les.',
        },
    },
    structuredContent: {
        title: 'Format adapté',
        description: 'Vérifie que le format suit le contenu : liste numérotée pour une procédure, tableau pour un comparatif, sinon au moins une liste ou un tableau. Favorable aux featured snippets et à l’extraction par les moteurs IA.',
        objective: 'Liste numérotée (procédure), tableau (comparatif), sinon ≥ 1 liste ou tableau',
        messages: {
            good: 'Le format est adapté au contenu.',
            warning: 'Ajoutez une liste ou un tableau (favorable aux featured snippets).',
            missingOrderedList: 'Le contenu décrit une procédure : présentez les étapes en liste numérotée.',
            missingTable: 'Le contenu compare des options : ajoutez un tableau comparatif.',
        },
    },
    centeredContent: {
        title: 'Texte centré',
        description: 'Vérifie qu’aucun long bloc de texte n’est centré, ce qui nuit à la lisibilité.',
        objective: 'Aucun long bloc centré',
        messages: {
            good: 'Pas de long bloc de texte centré.',
            bad: '{value} bloc(s) de texte longs sont centrés, ce qui nuit à la lisibilité.',
        },
    },
    // Lisibilité
    sentenceLength: {
        title: 'Longueur des phrases',
        description: 'Vérifie la part de phrases trop longues (plus de 20 mots).',
        objective: '≤ 25 % de phrases longues',
        messages: {
            good: 'Les phrases ont une bonne longueur ({value} % de phrases longues).',
            warning: '{value} % des phrases dépassent 20 mots : visez 25 % maximum.',
            bad: '{value} % des phrases dépassent 20 mots : raccourcissez-les.',
            na: 'Texte trop court pour évaluer la longueur des phrases.',
        },
    },
    transitionWords: {
        title: 'Mots de transition',
        description: 'Vérifie que suffisamment de phrases contiennent un mot de transition (donc, ensuite, par exemple…).',
        objective: '≥ 30 % des phrases',
        messages: {
            good: '{value} % des phrases contiennent un mot de transition.',
            warning: 'Seulement {value} % des phrases contiennent un mot de transition (visez 30 %).',
            bad: '{value} % des phrases contiennent un mot de transition : ajoutez-en.',
            na: 'Texte trop court pour évaluer les mots de transition.',
        },
    },
    consecutiveSentences: {
        title: 'Débuts de phrases répétés',
        description: 'Vérifie qu’il n’y a pas 3 phrases consécutives ou plus commençant par le même mot.',
        objective: '< 3 débuts identiques d’affilée',
        messages: {
            good: 'Aucune répétition de débuts de phrases.',
            bad: '{value} phrases consécutives commencent par le même mot : variez vos débuts de phrases.',
            na: 'Texte trop court pour évaluer les débuts de phrases.',
        },
    },
    passiveVoice: {
        title: 'Voix passive',
        description: 'Vérifie la part de phrases à la voix passive (10 % maximum recommandé).',
        objective: '≤ 10 % de phrases passives',
        messages: {
            good: '{value} % des phrases sont à la voix passive, c’est bien.',
            warning: '{value} % des phrases sont à la voix passive : visez 10 % maximum.',
            bad: '{value} % des phrases sont à la voix passive : privilégiez la voix active.',
            na: 'Texte trop court pour évaluer la voix passive.',
        },
    },
    complexWords: {
        title: 'Mots complexes',
        description: 'Vérifie la part de mots longs ou complexes (10 % maximum recommandé).',
        objective: '≤ 10 % de mots complexes',
        messages: {
            good: '{value} % de mots complexes : le vocabulaire reste accessible.',
            warning: '{value} % de mots complexes : simplifiez le vocabulaire.',
            bad: '{value} % de mots complexes : le texte est difficile, simplifiez-le.',
            na: 'Texte trop court pour évaluer la complexité du vocabulaire.',
        },
    },
    // Liens
    outboundLinks: {
        title: 'Liens sortants',
        description: 'Vérifie le nombre de liens vers des sources externes : environ un par 1000 mots (minimum un).',
        objective: '≥ 1 lien externe par ~1000 mots',
        messages: {
            good: 'Le texte contient {value} lien(s) sortant(s), c’est suffisant.',
            warning: '{value} lien(s) sortant(s) pour ce volume de texte : visez-en {target}.',
            bad: 'Seulement {value} lien(s) sortant(s) : visez-en {target} vers des sources externes.',
            none: 'Aucun lien sortant : visez-en {target} vers des sources externes.',
        },
    },
    internalLinks: {
        title: 'Liens internes',
        description: 'Vérifie le nombre de liens vers d’autres pages du site : environ un par 1000 mots (minimum un).',
        objective: '≥ 1 lien interne par ~1000 mots',
        messages: {
            good: 'Le texte contient {value} lien(s) interne(s), c’est suffisant.',
            warning: '{value} lien(s) interne(s) pour ce volume de texte : visez-en {target}.',
            bad: 'Seulement {value} lien(s) interne(s) : visez-en {target} vers d’autres pages du site.',
            none: 'Aucun lien interne : visez-en {target} vers d’autres pages du site.',
        },
    },
    genericAnchors: {
        title: 'Ancres descriptives',
        description: 'Vérifie que les liens n’utilisent pas d’ancres génériques comme « cliquez ici ».',
        objective: 'Aucune ancre générique',
        messages: {
            good: 'Les ancres de liens sont descriptives.',
            warning: '{value} lien(s) utilisent une ancre générique (« cliquez ici »…).',
        },
    },
    emptyLinks: {
        title: 'Liens vides',
        description: 'Vérifie qu’aucun lien n’est vide ou ne pointe vers « # ».',
        objective: 'Aucun lien vide',
        messages: {
            good: 'Aucun lien vide ou cassé.',
            bad: '{value} lien(s) sont vides ou pointent vers « # ».',
        },
    },
    // Images
    imagePresence: {
        title: 'Nombre d’images',
        description: 'Vérifie le nombre d’images par rapport à la longueur du texte : environ une par 750 mots (minimum une).',
        objective: '≥ 1 image par ~750 mots',
        messages: {
            good: 'Le contenu contient {value} image(s), c’est suffisant.',
            warning: '{value} image(s) pour ce volume de texte : visez-en {target}.',
            bad: 'Seulement {value} image(s) pour ce volume de texte : visez-en {target}.',
            none: 'Aucune image : visez-en {target} pour ce volume de texte.',
        },
    },
    imageAlt: {
        title: 'Attributs alt des images',
        description: 'Vérifie que chaque image possède un attribut alt (accessibilité et SEO).',
        objective: 'Un alt sur chaque image',
        messages: {
            good: 'Toutes les images ont un attribut alt.',
            warning: '{value} image(s) n’ont pas d’attribut alt.',
            bad: '{value} image(s) n’ont pas d’attribut alt : renseignez-les.',
        },
    },
    // Mot-clé principal
    keyphraseLength: {
        title: 'Longueur du mot-clé',
        description: 'Vérifie que le mot-clé principal contient 1 à 4 mots significatifs.',
        objective: '1-4 mots significatifs',
        messages: {
            good: 'La longueur du mot-clé est bonne ({value} mots significatifs).',
            warning: 'Le mot-clé est long ({value} mots) : visez 1 à 4 mots significatifs.',
            bad: 'Le mot-clé est trop long ({value} mots).',
            onlyStopwords: 'Le mot-clé ne contient que des mots vides : choisissez un mot-clé plus spécifique.',
        },
    },
    headingLength: {
        title: 'Longueur des titres',
        description: 'Vérifie que les titres restent concis (60 caractères maximum recommandés).',
        objective: '≤ 60 caractères par titre',
        messages: {
            good: 'Les titres ont une bonne longueur.',
            warning: '{value} titre(s) sont un peu longs (> 60 caractères).',
            bad: '{value} titre(s) sont trop longs : raccourcissez-les.',
            na: 'Aucun titre dans le contenu.',
        },
    },
    keywordInH1: {
        title: 'Mot-clé dans le titre H1',
        description: 'Vérifie que le mot-clé principal apparaît dans le titre H1 du contenu.',
        objective: 'Mot-clé dans le H1',
        messages: {
            good: 'Le mot-clé apparaît dans le titre H1.',
            warning: 'Le mot-clé n’apparaît pas en entier dans le H1 (mots manquants ou séparés).',
            bad: 'Le mot-clé n’apparaît pas dans le titre H1.',
            na: 'Pas de titre H1 dans le contenu.',
        },
    },
    keywordInIntroduction: {
        title: 'Mot-clé dans l’introduction',
        description: 'Vérifie que le mot-clé principal apparaît dès le premier paragraphe.',
        objective: 'Mot-clé dans le 1er paragraphe',
        messages: {
            good: 'Le mot-clé apparaît dans l’introduction.',
            warning: 'Le mot-clé n’apparaît pas en entier dans l’introduction (mots manquants ou séparés).',
            bad: 'Le mot-clé n’apparaît pas dans l’introduction.',
        },
    },
    keywordDensity: {
        title: 'Densité du mot-clé',
        description: 'Vérifie que le mot-clé est assez présent, sans sur-optimisation (keyword stuffing).',
        objective: 'Densité entre 0,5 et 3 %',
        messages: {
            good: 'La densité du mot-clé est bonne ({value} %).',
            warning: 'Densité du mot-clé perfectible ({value} %) : visez 0,5 à 3 %.',
            bad: 'Densité du mot-clé incorrecte ({value} %) : absent, ou sur-optimisé (keyword stuffing).',
        },
    },
    keywordInSubheadings: {
        title: 'Mot-clé dans les sous-titres',
        description: 'Vérifie que le mot-clé apparaît dans 30 à 75 % des sous-titres.',
        objective: 'Dans 30-75 % des sous-titres',
        messages: {
            good: 'Le mot-clé apparaît dans {value} % des sous-titres.',
            warning: 'Le mot-clé apparaît dans {value} % des sous-titres (visez 30-75 %).',
            bad: 'Le mot-clé n’apparaît que dans {value} % des sous-titres (visez 30-75 %).',
            none: 'Le mot-clé n’apparaît dans aucun sous-titre.',
        },
    },
    keywordDistribution: {
        title: 'Répartition du mot-clé',
        description: 'Vérifie que le mot-clé est réparti sur l’ensemble du texte, pas concentré en un seul endroit.',
        objective: 'Présent dans ≥ 3 quarts du texte',
        messages: {
            good: 'Le mot-clé est bien réparti dans le texte.',
            warning: 'Le mot-clé est inégalement réparti dans le texte.',
            bad: 'Le mot-clé est concentré dans une seule partie du texte.',
        },
    },
    keywordInImageAlt: {
        title: 'Mot-clé dans les alt d’images',
        description: 'Vérifie que le mot-clé apparaît dans l’attribut alt d’au moins une image.',
        objective: 'Dans ≥ 1 attribut alt',
        messages: {
            good: 'Le mot-clé apparaît dans l’attribut alt de {value} image(s).',
            warning: 'Le mot-clé n’apparaît dans aucun attribut alt d’image.',
            bad: 'Les images n’ont pas d’attribut alt à optimiser.',
        },
    },
    competingAnchor: {
        title: 'Ancre concurrente',
        description: 'Vérifie qu’aucun lien sortant n’utilise le mot-clé comme ancre (risque de cannibalisation).',
        objective: 'Aucune ancre = mot-clé',
        messages: {
            good: 'Aucun lien n’utilise le mot-clé comme ancre.',
            bad: '{value} lien(s) utilisent le mot-clé comme ancre (cannibalisation).',
        },
    },
    secondaryKeywords: {
        title: 'Mots-clés secondaires',
        description: 'Vérifie que les mots-clés secondaires apparaissent dans le texte.',
        objective: '≥ 70 % des mots-clés secondaires présents',
        messages: {
            good: '{value} % des mots-clés secondaires sont présents.',
            warning: 'Seulement {value} % des mots-clés secondaires sont présents (visez 70 %).',
            bad: 'Presque aucun mot-clé secondaire présent ({value} %).',
        },
    },
    // Titres (catégorie headings)
    secondaryInSubheadings: {
        title: 'Mots-clés secondaires dans les sous-titres',
        description: 'Vérifie que les mots-clés secondaires apparaissent dans des sous-titres.',
        objective: '≥ 50 % des mots-clés secondaires dans un sous-titre',
        messages: {
            good: '{value} % des mots-clés secondaires apparaissent dans un sous-titre.',
            warning: 'Peu de mots-clés secondaires dans les sous-titres ({value} %).',
            bad: 'Trop peu de mots-clés secondaires dans les sous-titres ({value} %) : visez 50 %.',
            none: 'Les mots-clés secondaires n’apparaissent dans aucun sous-titre.',
        },
    },
    // Metas
    metaTitleKeyword: {
        title: 'Mot-clé dans le meta title',
        description: 'Vérifie que le mot-clé principal est présent au début du meta title.',
        objective: 'Mot-clé au début du title',
        messages: {
            good: 'Le mot-clé est présent au début du meta title.',
            late: 'Le mot-clé est dans le meta title : placez-le dans la première moitié.',
            warning: 'Le mot-clé n’apparaît pas en entier dans le meta title (mots manquants ou séparés).',
            bad: 'Le mot-clé est absent du meta title.',
        },
    },
    metaTitleLength: {
        title: 'Longueur du meta title',
        description: 'Vérifie que le meta title fait entre 40 et 60 caractères pour ne pas être tronqué en SERP.',
        objective: '40-60 caractères',
        messages: {
            good: 'Le meta title fait {value} caractères, c’est bon.',
            warning: 'Le meta title fait {value} caractères : visez 40-60.',
            tooShort: 'Le meta title fait {value} caractères : c’est trop court, visez au moins 40.',
            tooLong: 'Le meta title fait {value} caractères : c’est trop long, visez 60 maximum.',
            bad: 'Le meta title fait {value} caractères : il sera tronqué en SERP.',
        },
    },
    metaTitleAttractiveness: {
        title: 'Attractivité du meta title',
        description: 'Vérifie que le meta title contient un chiffre, un power word ou un mot émotionnel.',
        objective: '≥ 2 signaux sur 3 (chiffre, power word, émotion)',
        messages: {
            good: 'Le meta title est attractif ({value} signal/signaux sur 3).',
            warning: 'Renforcez le meta title : ajoutez un chiffre, un power word ou un mot émotionnel.',
            bad: 'Le meta title manque d’attractivité (ni chiffre, ni power word, ni émotion).',
        },
    },
    metaDescriptionLength: {
        title: 'Longueur de la meta description',
        description: 'Vérifie que la meta description fait entre 121 et 156 caractères pour ne pas être tronquée.',
        objective: '121-156 caractères',
        messages: {
            good: 'La meta description fait {value} caractères, c’est bon.',
            warning: 'La meta description fait {value} caractères : visez 121-156.',
            tooShort: 'La meta description fait {value} caractères : c’est trop court, visez au moins 121.',
            tooLong: 'La meta description fait {value} caractères : c’est trop long, visez 156 maximum.',
            bad: 'La meta description fait {value} caractères : elle sera tronquée.',
        },
    },
    metaDescriptionKeyword: {
        title: 'Mot-clé dans la meta description',
        description: 'Vérifie que le mot-clé apparaît 1 à 2 fois dans la meta description.',
        objective: '1-2 occurrences',
        messages: {
            good: 'Le mot-clé apparaît {value} fois dans la meta description.',
            warning: 'Le mot-clé apparaît {value} fois dans la meta description : 1 à 2 est idéal.',
            bad: 'Le mot-clé doit apparaître 1 à 2 fois dans la meta description (actuellement {value}).',
        },
    },
    // GEO — structure
    answerFirst: {
        title: 'Réponse d’abord',
        description: 'Vérifie que chaque section commence par une réponse directe : un paragraphe de 30 à 80 mots, ou une liste / un tableau.',
        objective: '1er paragraphe de 30-80 mots après chaque sous-titre',
        messages: {
            good: 'Les sections commencent par une réponse directe.',
            warning: '{value} section(s) ne commencent pas par une réponse directe de 30 à 80 mots.',
            bad: '{value} section(s) ne commencent pas par une réponse directe : ouvrez chaque section par la réponse, puis détaillez.',
            na: 'Pas assez de sections pour évaluer.',
        },
    },
    selfContained: {
        title: 'Passages autonomes',
        description: 'Vérifie que chaque section se comprend seule, sans renvoyer au texte qui précède (« Cela… », « comme vu plus haut »).',
        objective: 'Aucune section dépendante du contexte',
        messages: {
            good: 'Les sections se comprennent seules.',
            warning: '{value} renvoi(s) au contexte : nommez le sujet au lieu d’y faire référence.',
            bad: '{value} renvoi(s) au contexte : extraites seules, ces sections perdent leur sens.',
            na: 'Pas de section à évaluer.',
        },
    },
    keyTakeaways: {
        title: 'Résumé en tête',
        description: 'Vérifie que le contenu s’ouvre sur un résumé : bloc « En bref / À retenir », ou introduction courte contenant le mot-clé.',
        objective: 'Bloc « À retenir » ou intro ≤ 100 mots avec le mot-clé',
        messages: {
            good: 'Le contenu s’ouvre sur un résumé.',
            warning: 'L’introduction fait {value} mots : raccourcissez-la ou ajoutez un bloc « À retenir ».',
            bad: 'L’introduction fait {value} mots : ajoutez un bloc « À retenir » en tête.',
            missingKeyword: 'L’introduction est courte mais ne nomme pas le mot-clé.',
            noIntro: 'Le contenu commence directement par un sous-titre : ajoutez une introduction courte.',
        },
    },
    // GEO — titres
    questionHeadings: {
        title: 'Titres en questions',
        description: 'Vérifie qu’une partie des sous-titres reprend la forme des requêtes (« Comment… ? », « Quel… ? »).',
        objective: '≥ 30 % des H2/H3 en questions',
        messages: {
            good: '{value} % des sous-titres sont des questions.',
            warning: '{value} % des sous-titres sont des questions : visez 30 %.',
            bad: '{value} % des sous-titres sont des questions : reformulez-en quelques-uns comme une requête.',
            na: 'Pas assez de sous-titres pour évaluer.',
        },
    },
    descriptiveHeadings: {
        title: 'Titres descriptifs',
        description: 'Vérifie que chaque sous-titre nomme son sujet (pas d’« Introduction » ou d’« Avantages » seul).',
        objective: 'Aucun sous-titre générique',
        messages: {
            good: 'Les sous-titres sont descriptifs.',
            warning: '{value} sous-titre(s) génériques : précisez de quoi ils parlent.',
            bad: '{value} sous-titre(s) génériques : un titre doit nommer son sujet.',
            na: 'Pas de sous-titre à évaluer.',
        },
    },
    // GEO — lisibilité
    vagueLanguage: {
        title: 'Formules floues',
        description: 'Vérifie l’absence d’affirmations sans sujet identifiable (« certains experts », « des études montrent »).',
        objective: '≤ 5 % des phrases',
        messages: {
            good: 'Les affirmations sont précises.',
            warning: '{value} % des phrases contiennent une formule floue : nommez la source.',
            bad: '{value} % des phrases contiennent une formule floue : remplacez-les par des faits attribués.',
            na: 'Texte trop court pour évaluer.',
        },
    },
    acronymsDefined: {
        title: 'Sigles développés',
        description: 'Vérifie que chaque sigle est développé à sa première occurrence (hors sigles connus de tous).',
        objective: 'Tous les sigles développés',
        messages: {
            good: 'Les sigles sont développés.',
            warning: '{value} sigle(s) ne sont pas développés à leur première occurrence.',
            bad: '{value} sigle(s) ne sont pas développés : écrivez la forme longue entre parenthèses.',
            na: 'Aucun sigle à développer.',
        },
    },
    // GEO — mot-clé
    definition: {
        title: 'Définition du sujet',
        description: 'Vérifie que le sujet est défini dès le début (« X est… », « X désigne… »).',
        objective: 'Une définition dans les 150 premiers mots',
        messages: {
            good: 'Le sujet est défini dès le début.',
            keywordOnly: 'Le mot-clé apparaît au début, mais sans définition : écrivez « <mot-clé> est… ».',
            bad: 'Définissez le sujet dans les 150 premiers mots (« <mot-clé> est… »).',
        },
    },
    entityPerSection: {
        title: 'Sujet nommé par partie',
        description: 'Vérifie que chaque partie (H2) nomme le sujet, pour rester compréhensible une fois extraite.',
        objective: '≥ 80 % des parties nomment le sujet',
        messages: {
            good: '{value} % des parties nomment le sujet.',
            warning: '{value} % des parties nomment le sujet : nommez-le dans les autres.',
            bad: '{value} % des parties nomment le sujet : extraites seules, les autres ne disent pas de quoi elles parlent.',
            na: 'Pas assez de parties (H2) pour évaluer.',
        },
    },
    questionCoverage: {
        title: 'Questions couvertes',
        description: 'Vérifie que le contenu répond aux questions cibles fournies.',
        objective: '100 % des questions cibles couvertes',
        messages: {
            good: '{value} % des questions cibles sont couvertes.',
            warning: '{value} % des questions cibles sont couvertes : traitez les autres.',
            bad: '{value} % des questions cibles sont couvertes : ajoutez des sections qui y répondent.',
            na: 'Aucune question cible fournie.',
        },
    },
    // GEO — crédibilité
    sourcedFacts: {
        title: 'Faits sourcés',
        description: 'Vérifie que chaque chiffre est attribué à une source (lien externe ou « selon… »). Un chiffre non sourcé coûte plus cher qu’une absence de chiffre.',
        objective: 'Tous les chiffres sourcés',
        messages: {
            good: 'Les chiffres sont sourcés.',
            warning: '{value} phrase(s) chiffrées sans source.',
            bad: '{value} phrase(s) chiffrées sans source : citez la source ou retirez le chiffre.',
            na: 'Aucun chiffre à sourcer.',
        },
    },
    factDensity: {
        title: 'Faits chiffrés',
        description: 'Vérifie la présence de faits précis et chiffrés (pourcentages, montants, durées).',
        objective: '≈ 1 fait chiffré pour 150 mots',
        messages: {
            good: '{value} fait(s) chiffré(s) : c’est suffisant.',
            warning: '{value} fait(s) chiffré(s) pour {target} visés.',
            bad: '{value} fait(s) chiffré(s) pour {target} visés : ajoutez des données sourcées.',
        },
    },
    quotations: {
        title: 'Citations',
        description: 'Vérifie la présence d’au moins une citation attribuée (bloc de citation, ou propos entre guillemets avec sa source).',
        objective: '≥ 1 citation attribuée',
        messages: {
            good: 'Le contenu cite {value} source(s).',
            bad: 'Ajoutez une citation d’expert attribuée.',
        },
    },
    freshness: {
        title: 'Fraîcheur des données',
        description: 'Vérifie que les années citées sont récentes (≤ 2 ans) pour au moins la moitié.',
        objective: '≥ 50 % d’années récentes',
        messages: {
            good: 'Les données citées sont récentes.',
            warning: 'Seulement {value} % des années citées sont récentes : actualisez les données.',
            bad: 'Seulement {value} % des années citées sont récentes : les données semblent datées.',
            na: 'Aucune année citée, ou contenu intemporel.',
        },
    },
    entityDensity: {
        title: 'Entités nommées',
        description: 'Vérifie la présence de noms propres (marques, organismes, lieux, personnes), qui ancrent le contenu.',
        objective: '≥ 1 entité pour 100 mots',
        messages: {
            good: 'Le contenu nomme des entités précises.',
            warning: '{value} entité(s) pour 100 mots : nommez des acteurs précis.',
            bad: '{value} entité(s) pour 100 mots : le contenu reste générique.',
        },
    },
};
