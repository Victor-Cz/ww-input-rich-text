// Fabrique de résultats de check, sur l'échelle Yoast 0-9.
// score null = check non applicable (exclu du score global).

export function makeCheck(id, category, score, value, ranges = []) {
    return {
        id,
        category,
        score,
        status: statusFromScore(score),
        value,
        ranges,
    };
}

export function notApplicable(id, category, value = null) {
    return makeCheck(id, category, null, value);
}

function statusFromScore(score) {
    if (score === null || score === undefined) return 'na';
    if (score >= 7) return 'good';
    if (score >= 4) return 'warning';
    return 'bad';
}
