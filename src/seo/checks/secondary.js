import { makeCheck, notApplicable } from '../result.js';
import { findPhrasesInModel } from '../extractors.js';
import { includesAnyPhrase } from '../textUtils.js';

// Catégorie "secondary" — nécessite `seoSecondaryKeywords`.
// Secondaires = sujets connexes distincts du mot-clé principal.

export function secondaryChecks(context) {
    const { model } = context;
    const secondaries = context.options.secondaryKeywords;
    if (!secondaries.length) {
        return ['secondaryPresence', 'secondaryInSubheadings', 'secondaryDensity']
            .map(id => notApplicable(id, 'secondary'));
    }
    return [
        secondaryPresence(model, secondaries),
        secondaryInSubheadings(model, secondaries),
        secondaryDensity(model, secondaries),
    ];
}

// Vert : ≥ 70 % des secondaires présents · orange : 30-70 % · rouge : < 30 %
function secondaryPresence(model, secondaries) {
    const found = secondaries.filter(keyword => findPhrasesInModel(model, [keyword]).length > 0);
    const percent = Math.round((found.length / secondaries.length) * 100);
    let score;
    if (percent >= 70) score = 9;
    else if (percent >= 30) score = 6;
    else score = 3;
    const ranges = found.length ? findPhrasesInModel(model, found) : [];
    return makeCheck(
        'secondaryPresence',
        'secondary',
        score,
        { percent, found: found.length, total: secondaries.length },
        ranges
    );
}

// Vert : ≥ 50 % des secondaires dans au moins un sous-titre · orange : 25-50 % · rouge : < 25 %
function secondaryInSubheadings(model, secondaries) {
    const subheadings = model.headings.filter(heading => heading.level >= 2);
    if (!subheadings.length) return notApplicable('secondaryInSubheadings', 'secondary', 0);

    const covered = secondaries.filter(keyword =>
        subheadings.some(heading => includesAnyPhrase(heading.text, [keyword]))
    );
    const percent = Math.round((covered.length / secondaries.length) * 100);
    let score;
    if (percent >= 50) score = 9;
    else if (percent >= 25) score = 6;
    else score = 3;

    const matchedHeadings = subheadings.filter(heading =>
        covered.some(keyword => includesAnyPhrase(heading.text, [keyword]))
    );
    return makeCheck(
        'secondaryInSubheadings',
        'secondary',
        score,
        { percent, covered: covered.length, total: secondaries.length },
        matchedHeadings.map(heading => ({ from: heading.from, to: heading.to }))
    );
}

// Anti-stuffing : un secondaire > 2,5 % de densité → rouge
function secondaryDensity(model, secondaries) {
    if (model.wordCount < 100) return notApplicable('secondaryDensity', 'secondary');
    const offenders = [];
    let offenderRanges = [];
    for (const keyword of secondaries) {
        const occurrences = findPhrasesInModel(model, [keyword]);
        const density = (occurrences.length / model.wordCount) * 100;
        if (density > 2.5) {
            offenders.push(keyword);
            offenderRanges = offenderRanges.concat(occurrences);
        }
    }
    return makeCheck('secondaryDensity', 'secondary', offenders.length ? 3 : 9, offenders, offenderRanges);
}
