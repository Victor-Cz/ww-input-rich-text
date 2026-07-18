// Locale française des checks SEO : title, description, et messages par
// statut (good / warning / bad, plus na pour certains checks).
// Les messages supportent l'interpolation {value} / {value.x}.
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
            description: 'Présence et optimisation des images et médias (attributs alt, ratio image / texte).',
        },
        keyword: {
            name: 'Mot-clé principal',
            description: 'Utilisation du mot-clé principal dans l’ensemble du contenu.',
        },
        secondary: {
            name: 'Mots-clés secondaires',
            description: 'Présence et répartition des mots-clés secondaires.',
        },
        metaTitle: {
            name: 'Meta title',
            description: 'Optimisation du meta title de la page (mot-clé, longueur, attractivité).',
        },
        metaDescription: {
            name: 'Meta description',
            description: 'Optimisation de la meta description de la page (mot-clé, longueur).',
        },
        slug: {
            name: 'Slug',
            description: 'Optimisation du slug de la page (mot-clé, longueur, propreté).',
        },
    },
    // Structure
    textLength: {
        title: 'Longueur du texte',
        description: 'Vérifie que le texte est assez long pour se positionner (300 mots minimum recommandés).',
        messages: {
            good: 'Le texte fait {value} mots, c’est suffisant.',
            warning: 'Le texte fait {value} mots, visez au moins 300 mots.',
            bad: 'Le texte fait {value} mots, c’est trop court pour bien se positionner.',
        },
    },
    singleH1: {
        title: 'Titre H1 unique',
        description: 'Vérifie que le contenu contient exactement un titre H1.',
        messages: {
            good: 'La structure H1 est correcte.',
            missing: 'Le contenu ne contient pas de H1 alors qu’un H1 est attendu : ajoutez un titre H1.',
            bad: 'Le contenu contient {value} H1 : il ne doit y en avoir qu’un.',
        },
    },
    headingHierarchy: {
        title: 'Hiérarchie des titres',
        description: 'Vérifie que les niveaux de titres se suivent sans saut (ex. pas de H2 → H4).',
        messages: {
            good: 'La hiérarchie des titres est cohérente.',
            warning: '{value} titre(s) sautent un niveau (ex. H2 → H4).',
        },
    },
    subheadingDistribution: {
        title: 'Répartition des sous-titres',
        description: 'Vérifie qu’aucune section ne dépasse 300 mots sans sous-titre.',
        messages: {
            good: 'Le texte est bien découpé par des sous-titres.',
            warning: 'Une section fait {value} mots sans sous-titre, ajoutez-en un.',
            bad: 'Une section fait {value} mots sans sous-titre : découpez-la.',
        },
    },
    paragraphLength: {
        title: 'Longueur des paragraphes',
        description: 'Vérifie qu’aucun paragraphe ne dépasse 150 mots, pour rester lisible.',
        messages: {
            good: 'Aucun paragraphe n’est trop long.',
            warning: '{value} paragraphe(s) dépassent 150 mots.',
            bad: '{value} paragraphe(s) dépassent 200 mots : raccourcissez-les.',
        },
    },
    structuredContent: {
        title: 'Contenu structuré',
        description: 'Vérifie la présence de listes ou de tableaux, favorables aux featured snippets.',
        messages: {
            good: 'Le contenu utilise des listes ou des tableaux.',
            warning: 'Ajoutez une liste ou un tableau (favorable aux featured snippets).',
        },
    },
    centeredContent: {
        title: 'Texte centré',
        description: 'Vérifie qu’aucun long bloc de texte n’est centré, ce qui nuit à la lisibilité.',
        messages: {
            good: 'Pas de long bloc de texte centré.',
            bad: '{value} bloc(s) de texte longs sont centrés, ce qui nuit à la lisibilité.',
        },
    },
    // Lisibilité
    sentenceLength: {
        title: 'Longueur des phrases',
        description: 'Vérifie la part de phrases trop longues (plus de 20 mots).',
        messages: {
            good: 'Les phrases ont une bonne longueur ({value} % de phrases longues).',
            warning: '{value} % des phrases dépassent 20 mots : visez 25 % maximum.',
            bad: '{value} % des phrases dépassent 20 mots : raccourcissez-les.',
            na: 'Texte trop court pour évaluer la longueur des phrases.',
        },
    },
    fleschReadingEase: {
        title: 'Facilité de lecture (Flesch)',
        description: 'Score de facilité de lecture Flesch adapté au français (0-100, plus c’est haut, plus c’est lisible).',
        messages: {
            good: 'Score Flesch de {value} : le texte est facile à lire.',
            warning: 'Score Flesch de {value} : le texte est assez difficile à lire.',
            bad: 'Score Flesch de {value} : le texte est difficile à lire, simplifiez-le.',
            na: 'Texte trop court pour calculer le score de lisibilité.',
        },
    },
    transitionWords: {
        title: 'Mots de transition',
        description: 'Vérifie que suffisamment de phrases contiennent un mot de transition (donc, ensuite, par exemple…).',
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
        messages: {
            good: 'Aucune répétition de débuts de phrases.',
            bad: '{value} phrases consécutives commencent par le même mot : variez vos débuts de phrases.',
            na: 'Texte trop court pour évaluer les débuts de phrases.',
        },
    },
    passiveVoice: {
        title: 'Voix passive',
        description: 'Vérifie la part de phrases à la voix passive (10 % maximum recommandé).',
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
        messages: {
            good: 'Le texte contient {value} lien(s) sortant(s).',
            warning: 'Tous les liens sortants sont en nofollow.',
            bad: 'Aucun lien sortant : ajoutez des liens vers des sources externes.',
        },
    },
    internalLinks: {
        title: 'Liens internes',
        description: 'Vérifie la présence de liens vers d’autres pages du site (maillage interne).',
        messages: {
            good: 'Le texte contient {value} lien(s) interne(s).',
            warning: 'Tous les liens internes sont en nofollow.',
            bad: 'Aucun lien interne : ajoutez des liens vers d’autres pages du site.',
        },
    },
    genericAnchors: {
        title: 'Ancres descriptives',
        description: 'Vérifie que les liens n’utilisent pas d’ancres génériques comme « cliquez ici ».',
        messages: {
            good: 'Les ancres de liens sont descriptives.',
            warning: '{value} lien(s) utilisent une ancre générique (« cliquez ici »…).',
        },
    },
    emptyLinks: {
        title: 'Liens vides',
        description: 'Vérifie qu’aucun lien n’est vide ou ne pointe vers « # ».',
        messages: {
            good: 'Aucun lien vide ou cassé.',
            bad: '{value} lien(s) sont vides ou pointent vers « # ».',
        },
    },
    // Images
    imagePresence: {
        title: 'Présence d’images',
        description: 'Vérifie que le contenu contient au moins une image ou un média.',
        messages: {
            good: 'Le contenu contient {value} image(s).',
            warning: 'Ajoutez des images : {value} seulement pour un texte long.',
            bad: 'Aucune image : ajoutez au moins un média.',
        },
    },
    imageAlt: {
        title: 'Attributs alt des images',
        description: 'Vérifie que chaque image possède un attribut alt (accessibilité et SEO).',
        messages: {
            good: 'Toutes les images ont un attribut alt.',
            warning: '{value} image(s) n’ont pas d’attribut alt.',
            bad: 'Aucune image n’a d’attribut alt.',
        },
    },
    imageRatio: {
        title: 'Ratio images / texte',
        description: 'Vérifie le nombre d’images par rapport à la longueur du texte (environ une par 500 mots).',
        messages: {
            good: 'Le ratio images / texte est bon.',
            warning: 'Ajoutez des images : environ une par 500 mots est recommandé.',
        },
    },
    // Mot-clé principal
    keyphraseLength: {
        title: 'Longueur du mot-clé',
        description: 'Vérifie que le mot-clé principal contient 1 à 4 mots significatifs.',
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
        messages: {
            good: 'Le mot-clé apparaît dans l’introduction.',
            warning: 'Les mots du mot-clé sont dans l’introduction mais dispersés.',
            bad: 'Le mot-clé n’apparaît pas dans l’introduction.',
        },
    },
    keywordDensity: {
        title: 'Densité du mot-clé',
        description: 'Vérifie que le mot-clé est assez présent, sans sur-optimisation (keyword stuffing).',
        messages: {
            good: 'La densité du mot-clé est bonne ({value.occurrences} occurrence(s)).',
            warning: 'Densité du mot-clé perfectible ({value.occurrences} occurrence(s)).',
            bad: 'Densité du mot-clé incorrecte : absent, ou sur-optimisé (keyword stuffing).',
        },
    },
    keywordInSubheadings: {
        title: 'Mot-clé dans les sous-titres',
        description: 'Vérifie que le mot-clé apparaît dans 30 à 75 % des sous-titres.',
        messages: {
            good: 'Le mot-clé apparaît dans {value} % des sous-titres.',
            warning: 'Le mot-clé apparaît dans {value} % des sous-titres (visez 30-75 %).',
            bad: 'Le mot-clé n’apparaît dans aucun sous-titre.',
        },
    },
    keywordDistribution: {
        title: 'Répartition du mot-clé',
        description: 'Vérifie que le mot-clé est réparti sur l’ensemble du texte, pas concentré en un seul endroit.',
        messages: {
            good: 'Le mot-clé est bien réparti dans le texte.',
            warning: 'Le mot-clé est inégalement réparti dans le texte.',
            bad: 'Le mot-clé est concentré dans une seule partie du texte.',
        },
    },
    keywordInImageAlt: {
        title: 'Mot-clé dans les alt d’images',
        description: 'Vérifie que le mot-clé apparaît dans l’attribut alt d’au moins une image.',
        messages: {
            good: 'Le mot-clé apparaît dans l’attribut alt de {value} image(s).',
            warning: 'Le mot-clé n’apparaît dans aucun attribut alt d’image.',
            bad: 'Les images n’ont pas d’attribut alt à optimiser.',
        },
    },
    competingAnchor: {
        title: 'Ancre concurrente',
        description: 'Vérifie qu’aucun lien sortant n’utilise le mot-clé comme ancre (risque de cannibalisation).',
        messages: {
            good: 'Aucun lien n’utilise le mot-clé comme ancre.',
            bad: '{value} lien(s) utilisent le mot-clé comme ancre (cannibalisation).',
        },
    },
    // Mots-clés secondaires
    secondaryPresence: {
        title: 'Présence des mots-clés secondaires',
        description: 'Vérifie que les mots-clés secondaires apparaissent dans le texte.',
        messages: {
            good: '{value.found}/{value.total} mots-clés secondaires sont présents.',
            warning: 'Seulement {value.found}/{value.total} mots-clés secondaires présents.',
            bad: 'Presque aucun mot-clé secondaire présent ({value.found}/{value.total}).',
        },
    },
    secondaryInSubheadings: {
        title: 'Secondaires dans les sous-titres',
        description: 'Vérifie que les mots-clés secondaires apparaissent dans des sous-titres.',
        messages: {
            good: '{value.covered}/{value.total} secondaires apparaissent dans un sous-titre.',
            warning: 'Peu de secondaires dans les sous-titres ({value.covered}/{value.total}).',
            bad: 'Les mots-clés secondaires n’apparaissent pas dans les sous-titres.',
        },
    },
    secondaryDensity: {
        title: 'Densité des secondaires',
        description: 'Vérifie qu’aucun mot-clé secondaire ne dépasse 2,5 % de densité (sur-optimisation).',
        messages: {
            good: 'Aucun mot-clé secondaire n’est sur-utilisé.',
            bad: 'Sur-optimisation : {value} dépassent 2,5 % de densité.',
        },
    },
    // Meta title
    metaTitleKeyword: {
        title: 'Mot-clé dans le meta title',
        description: 'Vérifie que le mot-clé principal est présent dans le meta title.',
        messages: {
            good: 'Le mot-clé est présent dans le meta title.',
            warning: 'Les mots du mot-clé sont dans le meta title mais séparés.',
            bad: 'Le mot-clé est absent du meta title.',
        },
    },
    metaTitleKeywordPosition: {
        title: 'Position du mot-clé dans le meta title',
        description: 'Vérifie que le mot-clé est placé au début du meta title.',
        messages: {
            good: 'Le mot-clé est au début du meta title.',
            warning: 'Placez le mot-clé dans la première moitié du meta title.',
        },
    },
    metaTitleLength: {
        title: 'Longueur du meta title',
        description: 'Vérifie que le meta title fait entre 40 et 60 caractères pour ne pas être tronqué en SERP.',
        messages: {
            good: 'Le meta title fait {value} caractères, c’est bon.',
            warning: 'Le meta title fait {value} caractères : visez 40-60.',
            bad: 'Le meta title fait {value} caractères : il sera tronqué en SERP.',
        },
    },
    metaTitleAttractiveness: {
        title: 'Attractivité du meta title',
        description: 'Vérifie que le meta title contient un chiffre, un power word ou un mot émotionnel.',
        messages: {
            good: 'Le meta title est attractif (chiffre, power word ou mot émotionnel).',
            warning: 'Renforcez le meta title : ajoutez un chiffre, un power word ou un mot émotionnel.',
            bad: 'Le meta title manque d’attractivité (ni chiffre, ni power word, ni émotion).',
        },
    },
    // Meta description
    metaDescriptionLength: {
        title: 'Longueur de la meta description',
        description: 'Vérifie que la meta description fait entre 121 et 156 caractères pour ne pas être tronquée.',
        messages: {
            good: 'La meta description fait {value} caractères, c’est bon.',
            warning: 'La meta description fait {value} caractères : visez 121-156.',
            bad: 'La meta description fait {value} caractères : elle sera tronquée.',
        },
    },
    metaDescriptionKeyword: {
        title: 'Mot-clé dans la meta description',
        description: 'Vérifie que le mot-clé apparaît 1 à 2 fois dans la meta description.',
        messages: {
            good: 'Le mot-clé apparaît {value} fois dans la meta description.',
            bad: 'Le mot-clé doit apparaître 1 à 2 fois dans la meta description (actuellement {value}).',
        },
    },
    // Slug
    slugKeyword: {
        title: 'Mot-clé dans le slug',
        description: 'Vérifie que le mot-clé principal est présent dans le slug de la page.',
        messages: {
            good: 'Le mot-clé est présent dans le slug.',
            warning: 'Le slug ne contient qu’une partie du mot-clé.',
            bad: 'Le mot-clé est absent du slug.',
        },
    },
    slugLength: {
        title: 'Longueur du slug',
        description: 'Vérifie que le slug ne dépasse pas 75 caractères.',
        messages: {
            good: 'Le slug fait {value} caractères, c’est bon.',
            warning: 'Le slug fait {value} caractères : visez 75 maximum.',
        },
    },
    slugClean: {
        title: 'Propreté du slug',
        description: 'Vérifie que le slug est en minuscules, avec des tirets, sans accents ni mots vides.',
        messages: {
            good: 'Le slug est propre (minuscules, tirets, pas de mots vides).',
            warning: 'Nettoyez le slug : minuscules, tirets, sans accents ni mots vides.',
        },
    },
};
