// Locale française des checks SEO : title, description, objective (l'objectif
// à atteindre, en clair), et messages par statut (good / warning / bad, plus na
// pour certains checks). Les messages supportent l'interpolation {value}.
// La clé `categories` porte le nom / la description de chaque catégorie de checks.

export default {
    categories: {
        structure: {
            name: 'Structure',
            description: 'Structure du contenu : longueur du texte, hiérarchie des titres, paragraphes et mise en forme.',
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
            name: 'Mot-clé principal',
            description: 'Utilisation du mot-clé principal dans l’ensemble du contenu.',
        },
        secondary: {
            name: 'Mots-clés secondaires',
            description: 'Présence et répartition des mots-clés secondaires.',
        },
        meta: {
            name: 'Metas',
            description: 'Optimisation du meta title et de la meta description de la page.',
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
    singleH1: {
        title: 'Titre H1 unique',
        description: 'Vérifie que le contenu contient exactement un titre H1.',
        objective: 'Un seul titre H1',
        messages: {
            good: 'La structure H1 est correcte.',
            missing: 'Le contenu ne contient pas de H1 alors qu’un H1 est attendu : ajoutez un titre H1.',
            bad: 'Le contenu contient {value} H1 : il ne doit y en avoir qu’un.',
        },
    },
    headingHierarchy: {
        title: 'Hiérarchie des titres',
        description: 'Vérifie que les niveaux de titres se suivent sans saut (ex. pas de H2 → H4).',
        objective: 'Aucun saut de niveau',
        messages: {
            good: 'La hiérarchie des titres est cohérente.',
            warning: '{value} titre(s) sautent un niveau (ex. H2 → H4).',
        },
    },
    subheadingDistribution: {
        title: 'Répartition des sous-titres',
        description: 'Vérifie qu’aucune section ne dépasse 300 mots sans sous-titre.',
        objective: '≤ 300 mots par section',
        messages: {
            good: 'Le texte est bien découpé par des sous-titres.',
            warning: 'Une section fait {value} mots sans sous-titre, ajoutez-en un.',
            bad: 'Une section fait {value} mots sans sous-titre : découpez-la.',
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
        title: 'Contenu structuré',
        description: 'Vérifie la présence de listes ou de tableaux, favorables aux featured snippets.',
        objective: '≥ 1 liste ou tableau',
        messages: {
            good: 'Le contenu utilise des listes ou des tableaux.',
            warning: 'Ajoutez une liste ou un tableau (favorable aux featured snippets).',
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
        description: 'Vérifie la présence de liens vers des sources externes suivis par les moteurs.',
        objective: '≥ 1 lien externe suivi',
        messages: {
            good: 'Le texte contient {value} lien(s) sortant(s).',
            warning: 'Tous les liens sortants sont en nofollow.',
            bad: 'Aucun lien sortant : ajoutez des liens vers des sources externes.',
        },
    },
    internalLinks: {
        title: 'Liens internes',
        description: 'Vérifie la présence de liens vers d’autres pages du site (maillage interne).',
        objective: '≥ 1 lien interne',
        messages: {
            good: 'Le texte contient {value} lien(s) interne(s).',
            warning: 'Tous les liens internes sont en nofollow.',
            bad: 'Aucun lien interne : ajoutez des liens vers d’autres pages du site.',
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
        title: 'Présence d’images',
        description: 'Vérifie que le contenu contient assez d’images pour son volume de texte (environ une par 500 mots).',
        objective: '≥ 1 image par ~500 mots',
        messages: {
            good: 'Le contenu contient {value} image(s), c’est suffisant.',
            warning: '{value} image(s) pour ce volume de texte : ajoutez-en.',
            bad: 'Aucune image : ajoutez au moins un média.',
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
            na: 'Le mot-clé ne contient que des mots vides : choisissez un mot-clé plus spécifique.',
        },
    },
    keywordInIntroduction: {
        title: 'Mot-clé dans l’introduction',
        description: 'Vérifie que le mot-clé principal apparaît dès le premier paragraphe.',
        objective: 'Mot-clé dans le 1er paragraphe',
        messages: {
            good: 'Le mot-clé apparaît dans l’introduction.',
            warning: 'Les mots du mot-clé sont dans l’introduction mais dispersés.',
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
            bad: 'Le mot-clé n’apparaît dans aucun sous-titre.',
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
    // Mots-clés secondaires
    secondaryPresence: {
        title: 'Présence des mots-clés secondaires',
        description: 'Vérifie que les mots-clés secondaires apparaissent dans le texte.',
        objective: '≥ 70 % des secondaires présents',
        messages: {
            good: '{value} % des mots-clés secondaires sont présents.',
            warning: 'Seulement {value} % des mots-clés secondaires sont présents (visez 70 %).',
            bad: 'Presque aucun mot-clé secondaire présent ({value} %).',
        },
    },
    secondaryInSubheadings: {
        title: 'Secondaires dans les sous-titres',
        description: 'Vérifie que les mots-clés secondaires apparaissent dans des sous-titres.',
        objective: '≥ 50 % dans un sous-titre',
        messages: {
            good: '{value} % des secondaires apparaissent dans un sous-titre.',
            warning: 'Peu de secondaires dans les sous-titres ({value} %).',
            bad: 'Les mots-clés secondaires n’apparaissent pas dans les sous-titres.',
        },
    },
    secondaryDensity: {
        title: 'Densité des secondaires',
        description: 'Vérifie qu’aucun mot-clé secondaire ne dépasse 2,5 % de densité (sur-optimisation).',
        objective: '≤ 2,5 % par secondaire',
        messages: {
            good: 'Aucun mot-clé secondaire n’est sur-utilisé.',
            bad: 'Sur-optimisation : {value} mot(s)-clé(s) secondaire(s) dépassent 2,5 % de densité.',
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
            warning: 'Les mots du mot-clé sont dans le meta title mais séparés.',
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
            bad: 'La meta description fait {value} caractères : elle sera tronquée.',
        },
    },
    metaDescriptionKeyword: {
        title: 'Mot-clé dans la meta description',
        description: 'Vérifie que le mot-clé apparaît 1 à 2 fois dans la meta description.',
        objective: '1-2 occurrences',
        messages: {
            good: 'Le mot-clé apparaît {value} fois dans la meta description.',
            bad: 'Le mot-clé doit apparaître 1 à 2 fois dans la meta description (actuellement {value}).',
        },
    },
};
