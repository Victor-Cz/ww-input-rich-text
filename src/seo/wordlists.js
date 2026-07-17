// Listes de mots par défaut pour l'analyse SEO.
// Surchargables via la propriété `seoWordLists` du composant :
// { stopWords, genericAnchors, powerWords, sentimentWords, transitionWords, complexWords }

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

const LISTS = { fr: FR, en: EN };

/**
 * Retourne les listes de mots pour une langue, fusionnées avec les
 * surcharges utilisateur (une liste fournie remplace la liste par défaut).
 */
export function getWordLists(lang, overrides) {
    const base = LISTS[lang] || LISTS.en;
    const result = {};
    for (const key of ['stopWords', 'genericAnchors', 'powerWords', 'sentimentWords', 'transitionWords', 'complexWords']) {
        const override = overrides && Array.isArray(overrides[key]) && overrides[key].length ? overrides[key] : null;
        result[key] = (override || base[key]).map(word => String(word).toLowerCase());
    }
    return result;
}
