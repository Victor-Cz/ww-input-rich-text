// Listes de mots par défaut pour l'analyse SEO / GEO.
// Surchargables via les propriétés du composant `seoWordLists`
// ({ stopWords, genericAnchors, powerWords, sentimentWords, transitionWords, complexWords })
// et `geoWordLists` (clés de GEO_FR ci-dessous).

const FR = {
    stopWords: [
        'le', 'la', 'les', 'l', 'un', 'une', 'des', 'du', 'de', 'd', 'au', 'aux',
        'ce', 'cet', 'cette', 'ces', 'mon', 'ma', 'mes', 'ton', 'ta', 'tes',
        'son', 'sa', 'ses', 'notre', 'nos', 'votre', 'vos', 'leur', 'leurs',
        'je', 'tu', 'il', 'elle', 'on', 'nous', 'vous', 'ils', 'elles',
        'et', 'ou', 'mais', 'donc', 'or', 'ni', 'car', 'que', 'qui', 'quoi',
        'dont', 'où', 'quand', 'comment', 'pourquoi', 'si', 'ne', 'pas', 'plus',
        'en', 'y', 'dans', 'sur', 'sous', 'avec', 'sans', 'pour', 'par', 'vers',
        'chez', 'entre', 'est', 'sont', 'être', 'avoir', 'a', 'ont', 'se', 's',
        'c', 'ça', 'cela', 'à', 'très', 'tout', 'tous', 'toute', 'toutes',
    ],
    genericAnchors: [
        'cliquez ici', 'cliquer ici', 'ici', 'en savoir plus', 'lire la suite',
        'lire plus', 'voir plus', 'plus d\'infos', 'plus d\'informations',
        'cet article', 'ce lien', 'lien', 'suite', 'découvrir', 'en lire plus',
    ],
    powerWords: [
        'gratuit', 'exclusif', 'secret', 'secrets', 'prouvé', 'garanti', 'facile',
        'simple', 'rapide', 'complet', 'ultime', 'essentiel', 'incontournable',
        'indispensable', 'efficace', 'puissant', 'nouveau', 'meilleur', 'meilleurs',
        'meilleure', 'meilleures', 'top', 'guide', 'astuces', 'conseils', 'erreurs',
        'immédiat', 'immédiatement', 'maintenant', 'aujourd\'hui', 'définitif',
        'révolutionnaire', 'surprenant', 'incroyable', 'unique', 'expert',
    ],
    sentimentWords: [
        'aimer', 'adorer', 'détester', 'peur', 'crainte', 'danger', 'risque',
        'succès', 'échec', 'gagner', 'perdre', 'réussir', 'rater', 'bonheur',
        'plaisir', 'douleur', 'frustration', 'espoir', 'rêve', 'cauchemar',
        'fantastique', 'terrible', 'horrible', 'magnifique', 'catastrophe',
        'inquiétant', 'rassurant', 'urgent', 'attention', 'alerte', 'piège',
        'stupéfiant', 'choquant', 'émouvant', 'passionnant', 'excitant',
    ],
    transitionWords: [
        'ainsi', 'alors', 'aussi', 'car', 'cependant', 'certes', 'd\'abord',
        'd\'ailleurs', 'de plus', 'de même', 'donc', 'du coup', 'en effet',
        'en fait', 'en outre', 'en revanche', 'enfin', 'ensuite', 'également',
        'finalement', 'mais', 'malgré', 'néanmoins', 'notamment', 'par ailleurs',
        'par conséquent', 'par exemple', 'parce que', 'pourtant', 'premièrement',
        'deuxièmement', 'troisièmement', 'puis', 'puisque', 'surtout', 'toutefois',
        'tandis que', 'tout d\'abord', 'en conclusion', 'en résumé', 'en bref',
        'autrement dit', 'c\'est-à-dire', 'd\'une part', 'd\'autre part',
        'grâce à', 'à cause de', 'afin de', 'afin que', 'pour que', 'avant tout',
        'en particulier', 'par la suite', 'au contraire', 'de ce fait',
        'en définitive', 'quant à', 'si bien que', 'de surcroît', 'qui plus est',
        'en somme', 'dès lors', 'bref', 'effectivement', 'désormais', 'or',
    ],
    complexWords: [],
};

const EN = {
    stopWords: [
        'the', 'a', 'an', 'and', 'or', 'but', 'so', 'nor', 'for', 'yet',
        'of', 'to', 'in', 'on', 'at', 'by', 'with', 'from', 'as', 'into',
        'about', 'between', 'through', 'during', 'before', 'after', 'above',
        'below', 'up', 'down', 'out', 'off', 'over', 'under', 'again',
        'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him', 'her',
        'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'this',
        'that', 'these', 'those', 'is', 'are', 'was', 'were', 'be', 'been',
        'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
        'can', 'could', 'not', 'no', 'what', 'which', 'who', 'when', 'where',
        'why', 'how', 'all', 'any', 'both', 'each', 'more', 'most', 'some',
        'such', 'only', 'very',
    ],
    genericAnchors: [
        'click here', 'here', 'read more', 'learn more', 'more', 'more info',
        'more information', 'this article', 'this link', 'link', 'see more',
        'find out more', 'check it out', 'this page', 'website',
    ],
    powerWords: [
        'free', 'exclusive', 'secret', 'secrets', 'proven', 'guaranteed', 'easy',
        'simple', 'quick', 'fast', 'complete', 'ultimate', 'essential', 'crucial',
        'effective', 'powerful', 'new', 'best', 'top', 'guide', 'tips', 'tricks',
        'mistakes', 'instant', 'instantly', 'now', 'today', 'definitive',
        'revolutionary', 'surprising', 'incredible', 'amazing', 'unique', 'expert',
    ],
    sentimentWords: [
        'love', 'hate', 'fear', 'scary', 'danger', 'dangerous', 'risk', 'risky',
        'success', 'failure', 'win', 'lose', 'winning', 'losing', 'happiness',
        'pleasure', 'pain', 'painful', 'frustration', 'frustrating', 'hope',
        'dream', 'nightmare', 'fantastic', 'terrible', 'horrible', 'beautiful',
        'catastrophe', 'worrying', 'reassuring', 'urgent', 'warning', 'alert',
        'trap', 'stunning', 'shocking', 'moving', 'exciting', 'thrilling',
    ],
    transitionWords: [
        'also', 'although', 'because', 'besides', 'but', 'consequently',
        'finally', 'first', 'firstly', 'second', 'secondly', 'third', 'thirdly',
        'for example', 'for instance', 'furthermore', 'hence', 'however',
        'in addition', 'in conclusion', 'in fact', 'in other words', 'in short',
        'in summary', 'indeed', 'instead', 'likewise', 'meanwhile', 'moreover',
        'nevertheless', 'nonetheless', 'next', 'on the other hand', 'otherwise',
        'similarly', 'so', 'still', 'therefore', 'thus', 'ultimately', 'whereas',
        'while', 'yet', 'above all', 'additionally', 'accordingly', 'after all',
        'afterwards', 'as a result', 'at first', 'at last', 'certainly',
        'eventually', 'further', 'generally', 'in contrast', 'in particular',
        'initially', 'lastly', 'notably', 'of course', 'overall', 'rather',
        'specifically', 'subsequently', 'then', 'to conclude', 'to sum up',
    ],
    complexWords: [],
};

// Listes GEO (surchargables via la propriété `geoWordLists`). Comparées sur le
// texte normalisé (minuscules, sans accent), bornées par des non-lettres.
const GEO_FR = {
    // Attribution d'un fait à une source, ou d'une citation à son auteur
    attributionWords: [
        'selon', 'd\'après', 'source', 'sources', 'étude', 'études', 'rapport', 'enquête',
        'sondage', 'baromètre', 'chiffres de', 'données de', 'publié par', 'publiée par',
        'statistiques', 'recensement', 'cité par', 'explique', 'affirme', 'souligne',
        'précise', 'déclare', 'indique', 'rappelle', 'estime',
    ],
    // Formules floues : affirmation sans sujet identifiable
    vagueWords: [
        'certains experts', 'certains spécialistes', 'de nombreux experts', 'les experts',
        'de nombreuses études', 'des études montrent', 'des études ont montré',
        'beaucoup de gens', 'la plupart des gens', 'on dit que', 'il semblerait',
        'il paraît que', 'il est généralement admis', 'tout le monde sait',
        'selon certains', 'certaines sources', 'de plus en plus de',
    ],
    // Début de section qui renvoie à un référent hors du passage. « Ce + nom »
    // et « Il » (souvent impersonnel) exclus : trop de faux positifs.
    anaphoraOpeners: [
        'cela', 'ceci', 'ce dernier', 'cette dernière', 'ces derniers', 'ces dernières',
        'celui-ci', 'celle-ci', 'ceux-ci', 'celles-ci', 'ils', 'elles',
    ],
    // Renvois explicites à une autre partie du texte
    backReferences: [
        'ci-dessus', 'plus haut', 'comme vu précédemment', 'comme vu plus haut',
        'comme indiqué précédemment', 'comme mentionné précédemment', 'comme évoqué',
        'comme expliqué plus haut', 'voir plus haut', 'la section précédente',
        'le paragraphe précédent', 'ci-avant',
    ],
    // Titres sans sujet, inutilisables comme ancre d'un passage extrait
    genericHeadings: [
        'introduction', 'conclusion', 'en résumé', 'résumé', 'en bref', 'pour conclure',
        'pour aller plus loin', 'le mot de la fin', 'notre avis', 'bilan', 'synthèse',
        'avantages', 'inconvénients', 'contexte', 'présentation', 'généralités', 'définition',
    ],
    // Signal d'un contenu procédural (attend une liste numérotée)
    procedureWords: ['étape', 'étapes', 'tutoriel', 'procédure', 'marche à suivre', 'pas à pas'],
    // Signal d'un contenu comparatif (attend un tableau)
    comparisonWords: ['vs', 'versus', 'comparatif', 'comparaison', 'différence entre', 'différences entre', 'ou bien', 'face à'],
    // Verbes qui introduisent une définition (« X est… »)
    definitionVerbs: [
        'est un', 'est une', 'est le', 'est la', 'sont des', 'sont les', 'désigne', 'désignent',
        'correspond à', 'correspondent à', 'se définit comme', 'consiste à', 'consiste en',
        'signifie', 'on appelle', 'regroupe', 'est l\'ensemble',
    ],
    // Mots interrogatifs en tête de titre
    questionWords: [
        'comment', 'pourquoi', 'quel', 'quelle', 'quels', 'quelles', 'qu\'est-ce', 'combien',
        'quand', 'où', 'qui', 'que', 'faut-il', 'peut-on', 'est-ce', 'doit-on', 'lequel', 'laquelle',
    ],
    // Sigles connus de tous, dispensés de développement
    knownAcronyms: [
        'seo', 'pdf', 'b2b', 'b2c', 'pme', 'tpe', 'eti', 'tva', 'url', 'html', 'css', 'api', 'ia',
        'faq', 'cv', 'rh', 'ceo', 'pdg', 'sas', 'sarl', 'eu', 'ue', 'usa', 'pib', 'cdi', 'cdd',
        'smic', 'rgpd', 'ttc', 'ht', 'sncf', 'tv', 'gps', 'id', 'ok', 'pc', 'it', 'ux', 'ui',
    ],
    // Marqueurs d'expérience propre (exposés en stats, hors score)
    experienceMarkers: [
        'nous avons testé', 'nous avons constaté', 'nous avons mesuré', 'dans notre cas',
        'chez nos clients', 'notre expérience', 'nos données', 'nous avons observé',
        'j\'ai testé', 'j\'ai constaté', 'en pratique, nous',
    ],
    // Bloc de résumé en tête de contenu
    takeawayMarkers: ['en bref', 'à retenir', 'l\'essentiel', 'ce qu\'il faut retenir', 'tl;dr', 'résumé', 'en résumé'],
};

const GEO_EN = {
    attributionWords: [
        'according to', 'source', 'sources', 'study', 'studies', 'report', 'survey', 'poll',
        'data from', 'figures from', 'published by', 'statistics', 'census', 'cited by',
        'says', 'said', 'explains', 'notes', 'states', 'reports', 'found that',
    ],
    vagueWords: [
        'some experts', 'many experts', 'experts say', 'many studies', 'studies show',
        'studies have shown', 'research shows', 'many people', 'most people', 'some say',
        'many believe', 'it is said', 'it is widely believed', 'it seems that', 'arguably',
        'everyone knows', 'some sources', 'more and more',
    ],
    // « This / It » seuls exclus (déterminant, impersonnel) : seulement suivis d'un verbe
    anaphoraOpeners: [
        'these', 'they', 'those', 'the latter', 'the former', 'this is', 'this means',
        'this makes', 'this allows', 'this helps', 'it is also', 'it also',
    ],
    backReferences: [
        'as mentioned above', 'as mentioned earlier', 'as discussed above', 'as noted above',
        'as we saw', 'as explained above', 'see above', 'the previous section',
        'the section above', 'mentioned before',
    ],
    genericHeadings: [
        'introduction', 'conclusion', 'summary', 'in summary', 'in short', 'final thoughts',
        'wrapping up', 'our take', 'overview', 'background', 'pros', 'cons', 'definition',
        'the bottom line', 'next steps',
    ],
    procedureWords: ['step', 'steps', 'how to', 'tutorial', 'procedure', 'step by step', 'walkthrough'],
    comparisonWords: ['vs', 'versus', 'comparison', 'compared', 'difference between', 'differences between'],
    definitionVerbs: [
        'is a', 'is an', 'is the', 'are a', 'are the', 'refers to', 'refer to', 'means',
        'is defined as', 'describes', 'consists of', 'stands for',
    ],
    questionWords: [
        'how', 'what', 'why', 'when', 'which', 'who', 'where', 'can', 'should', 'is', 'are',
        'does', 'do', 'will', 'whats', 'what\'s',
    ],
    knownAcronyms: [
        'seo', 'pdf', 'b2b', 'b2c', 'smb', 'url', 'html', 'css', 'api', 'ai', 'faq', 'cv', 'hr',
        'ceo', 'cfo', 'cto', 'llc', 'inc', 'us', 'usa', 'uk', 'eu', 'gdp', 'tv', 'gps', 'id',
        'ok', 'pc', 'it', 'ux', 'ui', 'vat', 'diy', 'roi',
    ],
    experienceMarkers: [
        'we tested', 'we found', 'we measured', 'in our case', 'our customers', 'our experience',
        'our data', 'we observed', 'i tested', 'i found', 'in our tests',
    ],
    takeawayMarkers: ['key takeaways', 'tl;dr', 'in short', 'in brief', 'summary', 'at a glance', 'the essentials'],
};

const LISTS = { fr: FR, en: EN };
const GEO_LISTS = { fr: GEO_FR, en: GEO_EN };

const SEO_KEYS = ['stopWords', 'genericAnchors', 'powerWords', 'sentimentWords', 'transitionWords', 'complexWords'];
const GEO_KEYS = Object.keys(GEO_FR);

// Mémoïsation : conserver l'identité des tableaux d'une analyse à l'autre, pour
// que les caches en aval (regex de liste, set de mots vides — des WeakMap sur
// ces tableaux) survivent entre deux analyses au lieu d'être reconstruits.
const NO_OVERRIDES_CACHE = { seo: {}, geo: {} }; // kind → lang → result
const OVERRIDES_CACHE = { seo: new WeakMap(), geo: new WeakMap() }; // kind → overrides → { lang → result }

/**
 * Retourne les listes de mots SEO pour une langue, fusionnées avec les
 * surcharges utilisateur (une liste fournie remplace la liste par défaut).
 */
export function getWordLists(lang, overrides) {
    return getLists('seo', LISTS, SEO_KEYS, lang, overrides);
}

/** Idem pour les listes GEO (surcharges : propriété `geoWordLists`). */
export function getGeoWordLists(lang, overrides) {
    return getLists('geo', GEO_LISTS, GEO_KEYS, lang, overrides);
}

function getLists(kind, lists, keys, lang, overrides) {
    if (!overrides) {
        const cache = NO_OVERRIDES_CACHE[kind];
        if (!cache[lang]) cache[lang] = buildWordLists(lists, keys, lang, null);
        return cache[lang];
    }
    let byLang = OVERRIDES_CACHE[kind].get(overrides);
    if (!byLang) {
        byLang = {};
        OVERRIDES_CACHE[kind].set(overrides, byLang);
    }
    if (!byLang[lang]) byLang[lang] = buildWordLists(lists, keys, lang, overrides);
    return byLang[lang];
}

function buildWordLists(lists, keys, lang, overrides) {
    const base = lists[lang] || lists.en;
    const result = {};
    for (const key of keys) {
        const override = overrides && Array.isArray(overrides[key]) && overrides[key].length ? overrides[key] : null;
        result[key] = (override || base[key]).map(word => String(word).toLowerCase());
    }
    return result;
}
