// Agrégation : moyenne des scores de checks (0-100) pondérée par importance,
// checks non applicables exclus. Un check critique en échec plafonne le
// grade global à orange, quel que soit le score.
// Paliers Rank Math : vert > 80 · orange 51-80 · rouge ≤ 50.

export const CRITICAL_WEIGHT = 4;
const STANDARD_WEIGHT = 2;

// Poids par check : 4 = critique · 2 = standard (défaut) · 1 = mineur
export const CHECK_WEIGHTS = {
    // Critiques : un échec compromet le référencement de la page
    textLength: 4,
    singleH1: 4,
    keywordInIntroduction: 4,
    keywordDensity: 4,
    metaTitleKeyword: 4,
    // Mineurs : signaux secondaires ou bonus
    headingHierarchy: 1,
    structuredContent: 1,
    centeredContent: 1,
    genericAnchors: 1,
    emptyLinks: 1,
    keyphraseLength: 1,
    keywordDistribution: 1,
    keywordInImageAlt: 1,
    competingAnchor: 1,
    secondaryInSubheadings: 1,
    secondaryDensity: 1,
    metaTitleAttractiveness: 1,
    consecutiveSentences: 1,
    complexWords: 1,
};

export function checkWeight(checkId) {
    return CHECK_WEIGHTS[checkId] ?? STANDARD_WEIGHT;
}

export function aggregateScore(checks) {
    const applicable = checks.filter(check => typeof check.score === 'number');
    if (!applicable.length) return null;
    let points = 0;
    let total = 0;
    for (const check of applicable) {
        const weight = checkWeight(check.id);
        points += check.score * weight;
        total += weight;
    }
    return Math.round(points / total);
}

/** Ids des checks critiques en échec (applicables uniquement). */
export function criticalIssues(checks) {
    return checks
        .filter(check => typeof check.score === 'number' && check.status === 'bad' && checkWeight(check.id) === CRITICAL_WEIGHT)
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

export function categoryScores(checks) {
    const categories = {};
    for (const check of checks) {
        if (!categories[check.category]) categories[check.category] = [];
        categories[check.category].push(check);
    }
    const scores = {};
    for (const [category, categoryChecks] of Object.entries(categories)) {
        scores[category] = aggregateScore(categoryChecks);
    }
    return scores;
}
