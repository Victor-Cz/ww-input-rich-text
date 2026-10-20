// Agrégation : moyenne des scores de checks (0-100) pondérée par importance,
// checks non applicables exclus. Un check critique en échec plafonne le
// grade global à orange, quel que soit le score.
// Paliers Rank Math : vert > 80 · orange 51-80 · rouge ≤ 50.
//
// Un seul catalogue de checks alimente deux scores, `seo` et `geo` : chaque
// check a un poids par score (0 = ne compte pas pour ce score, et n'y est pas
// exposé). Les catégories sont communes aux deux scores.

export const SCORE_KEYS = ['seo', 'geo'];
export const CRITICAL_WEIGHT = 4;
const STANDARD_WEIGHT = 2;

// Poids par check et par score : 4 = critique · 2 = standard · 1 = mineur · 0 = absent.
// Check absent de la table : { seo: 2, geo: 0 } (check SEO standard).
export const CHECK_WEIGHTS = {
    // --- SEO ---
    // Critiques : un échec compromet le référencement de la page
    textLength: { seo: 4 },
    headingHierarchy: { seo: 4 }, // unicité du H1 + hiérarchie des niveaux
    keywordInIntroduction: { seo: 4 },
    keywordDensity: { seo: 4 },
    metaTitleKeyword: { seo: 4 },
    // Mineurs : signaux secondaires ou bonus
    centeredContent: { seo: 1 },
    genericAnchors: { seo: 1 },
    emptyLinks: { seo: 1 },
    keyphraseLength: { seo: 1 },
    keywordDistribution: { seo: 1 },
    keywordInImageAlt: { seo: 1 },
    competingAnchor: { seo: 1 },
    secondaryInSubheadings: { seo: 1 },
    secondaryKeywords: { seo: 1 },
    metaTitleAttractiveness: { seo: 1 },
    consecutiveSentences: { seo: 1 },
    complexWords: { seo: 1 },

    // --- Partagés SEO + GEO ---
    subheadingDistribution: { seo: 2, geo: 2 }, // + longueur des passages (GEO)
    structuredContent: { seo: 1, geo: 2 }, // + format adapté à l'intention (GEO)
    outboundLinks: { seo: 2, geo: 1 },
    answerFirst: { seo: 1, geo: 2 },
    questionHeadings: { seo: 1, geo: 2 },
    descriptiveHeadings: { seo: 1, geo: 2 },
    vagueLanguage: { seo: 1, geo: 2 },
    definition: { seo: 1, geo: 2 },
    sourcedFacts: { seo: 2, geo: 4 },

    // --- GEO ---
    // Critique : questions cibles couvertes (na sans `geoQuestions`)
    questionCoverage: { geo: 4 },
    selfContained: { geo: 2 },
    entityPerSection: { geo: 2 },
    factDensity: { geo: 2 },
    keyTakeaways: { geo: 1 },
    acronymsDefined: { geo: 1 },
    quotations: { geo: 1 },
    freshness: { geo: 1 },
    entityDensity: { geo: 1 },
};

export function checkWeight(checkId, scoreKey = 'seo') {
    const weights = CHECK_WEIGHTS[checkId];
    if (!weights) return scoreKey === 'seo' ? STANDARD_WEIGHT : 0;
    return weights[scoreKey] ?? 0;
}

export function aggregateScore(checks, scoreKey = 'seo') {
    let points = 0;
    let total = 0;
    for (const check of checks) {
        const weight = checkWeight(check.id, scoreKey);
        if (typeof check.score !== 'number' || !weight) continue;
        points += check.score * weight;
        total += weight;
    }
    return total ? Math.round(points / total) : null;
}

/** Ids des checks critiques en échec (applicables uniquement) pour ce score. */
export function criticalIssues(checks, scoreKey = 'seo') {
    return checks
        .filter(check => typeof check.score === 'number' && check.status === 'bad'
            && checkWeight(check.id, scoreKey) === CRITICAL_WEIGHT)
        .map(check => check.id);
}

export function gradeFromScore(score) {
    if (score === null) return null;
    if (score > 80) return 'green';
    if (score > 50) return 'orange';
    return 'red';
}

/** Un check critique en échec interdit le vert. */
export function capGrade(grade, hasCriticalIssue) {
    if (grade === 'green' && hasCriticalIssue) return 'orange';
    return grade;
}

/** Sous-score par catégorie, sur les checks qui comptent pour ce score. */
export function categoryScores(checks, scoreKey = 'seo') {
    const categories = {};
    for (const check of checks) {
        if (!checkWeight(check.id, scoreKey)) continue;
        if (!categories[check.category]) categories[check.category] = [];
        categories[check.category].push(check);
    }
    const scores = {};
    for (const [category, categoryChecks] of Object.entries(categories)) {
        scores[category] = aggregateScore(categoryChecks, scoreKey);
    }
    return scores;
}
