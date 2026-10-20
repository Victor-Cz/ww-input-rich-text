// Passages : le contenu découpé comme un moteur génératif le verrait (une
// section par sous-titre, voir extractors.buildSections). Les checks GEO qui
// évaluent section par section y notent leur score ; chaque passage expose la
// moyenne et la liste des checks en échec.

/** Note le score d'un check pour une section (appelé par les checks). */
export function notePassage(context, section, checkId, score) {
    if (!context.passageScores) context.passageScores = new Map();
    let scores = context.passageScores.get(section);
    if (!scores) {
        scores = {};
        context.passageScores.set(section, scores);
    }
    scores[checkId] = Math.round(Math.min(100, Math.max(0, score)));
}

export function passageId(index) {
    return `passage:${index}`;
}

/**
 * Passages exposés : { id, heading, words, score, issues } + plages de
 * surlignage (`rangesMap[id]` : la section entière). `issues` : checks dont le
 * score sur ce passage est < 80.
 */
export function buildPassages(context) {
    const passages = [];
    const ranges = {};
    context.model.sections.forEach((section, index) => {
        const scores = context.passageScores?.get(section) || {};
        const values = Object.values(scores);
        const id = passageId(index);
        ranges[id] = [{ from: section.from, to: section.to }];
        passages.push({
            id,
            heading: section.heading ? section.heading.text.trim() : null,
            level: section.heading ? section.heading.level : null,
            words: section.words,
            score: values.length ? Math.round(values.reduce((sum, value) => sum + value, 0) / values.length) : null,
            issues: Object.entries(scores).filter(([, score]) => score < 80).map(([checkId]) => checkId),
        });
    });
    return { passages, ranges };
}
