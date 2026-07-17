// Messages par check et par statut (good / warning / bad), fr et en.
// L'id du check reste stable : l'utilisateur peut ignorer ces messages
// et fournir les siens côté WeWeb.

const MESSAGES = {
    // Structure
    textLength: {
        fr: {
            good: 'Le texte fait {value} mots, c’est suffisant.',
            warning: 'Le texte fait {value} mots, visez au moins 300 mots.',
            bad: 'Le texte fait {value} mots, c’est trop court pour bien se positionner.',
        },
        en: {
            good: 'The text is {value} words long, that is sufficient.',
            warning: 'The text is {value} words long, aim for at least 300 words.',
            bad: 'The text is {value} words long, that is too short to rank well.',
        },
    },
    singleH1: {
        fr: {
            good: 'La structure H1 est correcte.',
            warning: 'Le contenu ne contient pas de H1 alors qu’un H1 est attendu.',
            bad: 'Le contenu contient {value} H1 : il ne doit y en avoir qu’un.',
        },
        en: {
            good: 'The H1 structure is correct.',
            warning: 'The content has no H1 while one is expected.',
            bad: 'The content contains {value} H1 headings: there must be only one.',
        },
    },
    headingHierarchy: {
        fr: {
            good: 'La hiérarchie des titres est cohérente.',
            warning: '{value} titre(s) sautent un niveau (ex. H2 → H4).',
        },
        en: {
            good: 'The heading hierarchy is consistent.',
            warning: '{value} heading(s) skip a level (e.g. H2 → H4).',
        },
    },
    subheadingDistribution: {
        fr: {
            good: 'Le texte est bien découpé par des sous-titres.',
            warning: 'Une section fait {value} mots sans sous-titre, ajoutez-en un.',
            bad: 'Une section fait {value} mots sans sous-titre : découpez-la.',
        },
        en: {
            good: 'The text is well divided by subheadings.',
            warning: 'A section is {value} words long without a subheading, add one.',
            bad: 'A section is {value} words long without a subheading: split it up.',
        },
    },
    paragraphLength: {
        fr: {
            good: 'Aucun paragraphe n’est trop long.',
            warning: '{value} paragraphe(s) dépassent 150 mots.',
            bad: '{value} paragraphe(s) dépassent 200 mots : raccourcissez-les.',
        },
        en: {
            good: 'No paragraph is too long.',
            warning: '{value} paragraph(s) exceed 150 words.',
            bad: '{value} paragraph(s) exceed 200 words: shorten them.',
        },
    },
    structuredContent: {
        fr: {
            good: 'Le contenu utilise des listes ou des tableaux.',
            warning: 'Ajoutez une liste ou un tableau (favorable aux featured snippets).',
        },
        en: {
            good: 'The content uses lists or tables.',
            warning: 'Add a list or a table (good for featured snippets).',
        },
    },
    centeredContent: {
        fr: {
            good: 'Pas de long bloc de texte centré.',
            bad: '{value} bloc(s) de texte longs sont centrés, ce qui nuit à la lisibilité.',
        },
        en: {
            good: 'No long block of centered text.',
            bad: '{value} long text block(s) are center-aligned, which hurts readability.',
        },
    },
    // Liens
    outboundLinks: {
        fr: {
            good: 'Le texte contient {value} lien(s) sortant(s).',
            warning: 'Tous les liens sortants sont en nofollow.',
            bad: 'Aucun lien sortant : ajoutez des liens vers des sources externes.',
        },
        en: {
            good: 'The text contains {value} outbound link(s).',
            warning: 'All outbound links are nofollowed.',
            bad: 'No outbound links: add links to external sources.',
        },
    },
    internalLinks: {
        fr: {
            good: 'Le texte contient {value} lien(s) interne(s).',
            warning: 'Tous les liens internes sont en nofollow.',
            bad: 'Aucun lien interne : ajoutez des liens vers d’autres pages du site.',
        },
        en: {
            good: 'The text contains {value} internal link(s).',
            warning: 'All internal links are nofollowed.',
            bad: 'No internal links: add links to other pages of the site.',
        },
    },
    genericAnchors: {
        fr: {
            good: 'Les ancres de liens sont descriptives.',
            warning: '{value} lien(s) utilisent une ancre générique (« cliquez ici »…).',
        },
        en: {
            good: 'Link anchors are descriptive.',
            warning: '{value} link(s) use a generic anchor (“click here”…).',
        },
    },
    emptyLinks: {
        fr: {
            good: 'Aucun lien vide ou cassé.',
            bad: '{value} lien(s) sont vides ou pointent vers « # ».',
        },
        en: {
            good: 'No empty or broken links.',
            bad: '{value} link(s) are empty or point to “#”.',
        },
    },
    // Images
    imagePresence: {
        fr: {
            good: 'Le contenu contient {value} image(s).',
            warning: 'Ajoutez des images : {value} seulement pour un texte long.',
            bad: 'Aucune image : ajoutez au moins un média.',
        },
        en: {
            good: 'The content contains {value} image(s).',
            warning: 'Add more images: only {value} for a long text.',
            bad: 'No images: add at least one media element.',
        },
    },
    imageAlt: {
        fr: {
            good: 'Toutes les images ont un attribut alt.',
            warning: '{value} image(s) n’ont pas d’attribut alt.',
            bad: 'Aucune image n’a d’attribut alt.',
        },
        en: {
            good: 'All images have an alt attribute.',
            warning: '{value} image(s) are missing an alt attribute.',
            bad: 'No image has an alt attribute.',
        },
    },
    imageRatio: {
        fr: {
            good: 'Le ratio images / texte est bon.',
            warning: 'Ajoutez des images : environ une par 500 mots est recommandé.',
        },
        en: {
            good: 'The image / text ratio is good.',
            warning: 'Add images: about one per 500 words is recommended.',
        },
    },
    // Mot-clé principal
    keyphraseLength: {
        fr: {
            good: 'La longueur du mot-clé est bonne ({value} mots significatifs).',
            warning: 'Le mot-clé est long ({value} mots) : visez 1 à 4 mots significatifs.',
            bad: 'Le mot-clé est trop long ({value} mots).',
            na: 'Le mot-clé ne contient que des mots vides : choisissez un mot-clé plus spécifique.',
        },
        en: {
            good: 'The keyphrase length is good ({value} content words).',
            warning: 'The keyphrase is long ({value} words): aim for 1 to 4 content words.',
            bad: 'The keyphrase is too long ({value} words).',
            na: 'The keyphrase only contains function words: choose a more specific keyphrase.',
        },
    },
    keywordInIntroduction: {
        fr: {
            good: 'Le mot-clé apparaît dans l’introduction.',
            warning: 'Les mots du mot-clé sont dans l’introduction mais dispersés.',
            bad: 'Le mot-clé n’apparaît pas dans l’introduction.',
        },
        en: {
            good: 'The keyphrase appears in the introduction.',
            warning: 'The keyphrase words are in the introduction but scattered.',
            bad: 'The keyphrase does not appear in the introduction.',
        },
    },
    keywordDensity: {
        fr: {
            good: 'La densité du mot-clé est bonne ({value.occurrences} occurrence(s)).',
            warning: 'Densité du mot-clé perfectible ({value.occurrences} occurrence(s)).',
            bad: 'Densité du mot-clé incorrecte : absent, ou sur-optimisé (keyword stuffing).',
        },
        en: {
            good: 'The keyphrase density is good ({value.occurrences} occurrence(s)).',
            warning: 'The keyphrase density could be better ({value.occurrences} occurrence(s)).',
            bad: 'Bad keyphrase density: missing, or over-optimized (keyword stuffing).',
        },
    },
    keywordInSubheadings: {
        fr: {
            good: 'Le mot-clé apparaît dans {value} % des sous-titres.',
            warning: 'Le mot-clé apparaît dans {value} % des sous-titres (visez 30-75 %).',
            bad: 'Le mot-clé n’apparaît dans aucun sous-titre.',
        },
        en: {
            good: 'The keyphrase appears in {value}% of subheadings.',
            warning: 'The keyphrase appears in {value}% of subheadings (aim for 30-75%).',
            bad: 'The keyphrase does not appear in any subheading.',
        },
    },
    keywordDistribution: {
        fr: {
            good: 'Le mot-clé est bien réparti dans le texte.',
            warning: 'Le mot-clé est inégalement réparti dans le texte.',
            bad: 'Le mot-clé est concentré dans une seule partie du texte.',
        },
        en: {
            good: 'The keyphrase is evenly distributed throughout the text.',
            warning: 'The keyphrase is unevenly distributed.',
            bad: 'The keyphrase is concentrated in one part of the text.',
        },
    },
    keywordInImageAlt: {
        fr: {
            good: 'Le mot-clé apparaît dans l’attribut alt de {value} image(s).',
            warning: 'Le mot-clé n’apparaît dans aucun attribut alt d’image.',
            bad: 'Les images n’ont pas d’attribut alt à optimiser.',
        },
        en: {
            good: 'The keyphrase appears in the alt attribute of {value} image(s).',
            warning: 'The keyphrase does not appear in any image alt attribute.',
            bad: 'Images have no alt attribute to optimize.',
        },
    },
    competingAnchor: {
        fr: {
            good: 'Aucun lien n’utilise le mot-clé comme ancre.',
            bad: '{value} lien(s) utilisent le mot-clé comme ancre (cannibalisation).',
        },
        en: {
            good: 'No link uses the keyphrase as anchor text.',
            bad: '{value} link(s) use the keyphrase as anchor text (cannibalization).',
        },
    },
    // Mots-clés secondaires
    secondaryPresence: {
        fr: {
            good: '{value.found}/{value.total} mots-clés secondaires sont présents.',
            warning: 'Seulement {value.found}/{value.total} mots-clés secondaires présents.',
            bad: 'Presque aucun mot-clé secondaire présent ({value.found}/{value.total}).',
        },
        en: {
            good: '{value.found}/{value.total} secondary keywords are present.',
            warning: 'Only {value.found}/{value.total} secondary keywords present.',
            bad: 'Almost no secondary keywords present ({value.found}/{value.total}).',
        },
    },
    secondaryInSubheadings: {
        fr: {
            good: '{value.covered}/{value.total} secondaires apparaissent dans un sous-titre.',
            warning: 'Peu de secondaires dans les sous-titres ({value.covered}/{value.total}).',
            bad: 'Les mots-clés secondaires n’apparaissent pas dans les sous-titres.',
        },
        en: {
            good: '{value.covered}/{value.total} secondary keywords appear in a subheading.',
            warning: 'Few secondary keywords in subheadings ({value.covered}/{value.total}).',
            bad: 'Secondary keywords do not appear in subheadings.',
        },
    },
    secondaryDensity: {
        fr: {
            good: 'Aucun mot-clé secondaire n’est sur-utilisé.',
            bad: 'Sur-optimisation : {value} dépassent 2,5 % de densité.',
        },
        en: {
            good: 'No secondary keyword is overused.',
            bad: 'Over-optimization: {value} exceed 2.5% density.',
        },
    },
    // Meta title
    metaTitleKeyword: {
        fr: {
            good: 'Le mot-clé est présent dans le meta title.',
            warning: 'Les mots du mot-clé sont dans le meta title mais séparés.',
            bad: 'Le mot-clé est absent du meta title.',
        },
        en: {
            good: 'The keyphrase is present in the meta title.',
            warning: 'The keyphrase words are in the meta title but separated.',
            bad: 'The keyphrase is missing from the meta title.',
        },
    },
    metaTitleKeywordPosition: {
        fr: {
            good: 'Le mot-clé est au début du meta title.',
            warning: 'Placez le mot-clé dans la première moitié du meta title.',
        },
        en: {
            good: 'The keyphrase is at the beginning of the meta title.',
            warning: 'Place the keyphrase in the first half of the meta title.',
        },
    },
    metaTitleLength: {
        fr: {
            good: 'Le meta title fait {value} caractères, c’est bon.',
            warning: 'Le meta title fait {value} caractères : visez 40-60.',
            bad: 'Le meta title fait {value} caractères : il sera tronqué en SERP.',
        },
        en: {
            good: 'The meta title is {value} characters long, that is good.',
            warning: 'The meta title is {value} characters: aim for 40-60.',
            bad: 'The meta title is {value} characters: it will be truncated in SERPs.',
        },
    },
    metaTitleAttractiveness: {
        fr: {
            good: 'Le meta title est attractif (chiffre, power word ou mot émotionnel).',
            warning: 'Renforcez le meta title : ajoutez un chiffre, un power word ou un mot émotionnel.',
            bad: 'Le meta title manque d’attractivité (ni chiffre, ni power word, ni émotion).',
        },
        en: {
            good: 'The meta title is attractive (number, power word or sentiment word).',
            warning: 'Strengthen the meta title: add a number, power word or sentiment word.',
            bad: 'The meta title lacks appeal (no number, power word or sentiment word).',
        },
    },
    // Meta description
    metaDescriptionLength: {
        fr: {
            good: 'La meta description fait {value} caractères, c’est bon.',
            warning: 'La meta description fait {value} caractères : visez 121-156.',
            bad: 'La meta description fait {value} caractères : elle sera tronquée.',
        },
        en: {
            good: 'The meta description is {value} characters long, that is good.',
            warning: 'The meta description is {value} characters: aim for 121-156.',
            bad: 'The meta description is {value} characters: it will be truncated.',
        },
    },
    metaDescriptionKeyword: {
        fr: {
            good: 'Le mot-clé apparaît {value} fois dans la meta description.',
            bad: 'Le mot-clé doit apparaître 1 à 2 fois dans la meta description (actuellement {value}).',
        },
        en: {
            good: 'The keyphrase appears {value} time(s) in the meta description.',
            bad: 'The keyphrase should appear 1-2 times in the meta description (currently {value}).',
        },
    },
    // Slug
    slugKeyword: {
        fr: {
            good: 'Le mot-clé est présent dans le slug.',
            warning: 'Le slug ne contient qu’une partie du mot-clé.',
            bad: 'Le mot-clé est absent du slug.',
        },
        en: {
            good: 'The keyphrase is present in the slug.',
            warning: 'The slug only contains part of the keyphrase.',
            bad: 'The keyphrase is missing from the slug.',
        },
    },
    slugLength: {
        fr: {
            good: 'Le slug fait {value} caractères, c’est bon.',
            warning: 'Le slug fait {value} caractères : visez 75 maximum.',
        },
        en: {
            good: 'The slug is {value} characters long, that is good.',
            warning: 'The slug is {value} characters: aim for 75 max.',
        },
    },
    slugClean: {
        fr: {
            good: 'Le slug est propre (minuscules, tirets, pas de mots vides).',
            warning: 'Nettoyez le slug : minuscules, tirets, sans accents ni mots vides.',
        },
        en: {
            good: 'The slug is clean (lowercase, hyphens, no stop words).',
            warning: 'Clean up the slug: lowercase, hyphens, no accents or stop words.',
        },
    },
};

/** Message d'un check selon son statut, avec interpolation {value} / {value.x}. */
export function getMessage(check, lang) {
    const entry = MESSAGES[check.id];
    if (!entry) return '';
    const localized = entry[lang] || entry.en;
    const template = localized[check.status] || localized.good || '';
    return template.replace(/\{value(?:\.([a-zA-Z]+))?\}/g, (_, key) => {
        const value = key ? check.value?.[key] : check.value;
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    });
}
