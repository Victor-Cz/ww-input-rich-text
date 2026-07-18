// Fabrique de résultats de check.
// Score continu 0-100 : 100 = objectif atteint, décroissance proportionnelle
// à la distance à l'objectif. score null = check non applicable (exclu du global).

export function makeCheck(id, category, score, value, ranges = []) {
    return {
        id,
        category,
        score: typeof score === 'number' ? clampScore(score) : score,
        status: statusFromScore(score),
        value,
        ranges,
    };
}

export function notApplicable(id, category, value = null) {
    return makeCheck(id, category, null, value);
}

function clampScore(score) {
    return Math.round(Math.min(100, Math.max(0, score)));
}

function statusFromScore(score) {
    if (score === null || score === undefined) return 'na';
    if (score >= 80) return 'good';
    if (score >= 40) return 'warning';
    return 'bad';
}

/** 100 tant que value ≥ target, sinon proportionnel (0 à zéro). */
export function ratioScore(value, target) {
    if (target <= 0) return 100;
    return Math.min(100, (value / target) * 100);
}

/** 100 tant que value ≤ good, décroît linéairement jusqu'à 0 à bad. */
export function decreasingScore(value, good, bad) {
    if (value <= good) return 100;
    if (value >= bad) return 0;
    return ((bad - value) / (bad - good)) * 100;
}
