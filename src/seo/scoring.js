// Agrégation des scores : formule Yoast Σ scores / (n × 9) × 100,
// checks non applicables exclus du dénominateur.
// Paliers Rank Math : vert > 80 · orange 51-80 · rouge ≤ 50.

export function aggregateScore(checks) {
    const applicable = checks.filter(check => typeof check.score === 'number');
    if (!applicable.length) return null;
    const sum = applicable.reduce((total, check) => total + check.score, 0);
    return Math.round((sum / (applicable.length * 9)) * 100);
}

export function gradeFromScore(score) {
    if (score === null) return null;
    if (score > 80) return 'green';
    if (score > 50) return 'orange';
    return 'red';
}

export function categoryScores(checks) {
    const categories = {};
    for (const check of checks) {
        (categories[check.category] = categories[check.category] || []).push(check);
    }
    const scores = {};
    for (const [category, categoryChecks] of Object.entries(categories)) {
        scores[category] = aggregateScore(categoryChecks);
    }
    return scores;
}
