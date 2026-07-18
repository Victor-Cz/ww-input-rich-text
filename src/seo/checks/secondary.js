import { findPhrasesInModel } from '../extractors.js';
import { makeCheck, notApplicable, ratioScore } from '../result.js';
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

// Cible : ≥ 70 % des secondaires présents — proportionnel en dessous
function secondaryPresence(model, secondaries) {
    const found = secondaries.filter(keyword => findPhrasesInModel(model, [keyword]).length > 0);
    const percent = Math.round((found.length / secondaries.length) * 100);
    const score = ratioScore(percent, 70);
    const ranges = found.length ? findPhrasesInModel(model, found) : [];
    // value : % des secondaires présents
    return makeCheck('secondaryPresence', 'secondary', score, percent, ranges);
}

// Cible : ≥ 50 % des secondaires dans au moins un sous-titre — proportionnel
function secondaryInSubheadings(model, secondaries) {
    const subheadings = model.headings.filter(heading => heading.level >= 2);
    if (!subheadings.length) return notApplicable('secondaryInSubheadings', 'secondary', 0);

    const covered = secondaries.filter(keyword =>
        subheadings.some(heading => includesAnyPhrase(heading.text, [keyword]))
    );
    const percent = Math.round((covered.length / secondaries.length) * 100);
    const score = ratioScore(percent, 50);

    const matchedHeadings = subheadings.filter(heading =>
        covered.some(keyword => includesAnyPhrase(heading.text, [keyword]))
    );
    // value : % des secondaires couverts par un sous-titre
    return makeCheck(
        'secondaryInSubheadings',
        'secondary',
        score,
        percent,
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
    // value : nb de secondaires en sur-densité (les occurrences sont surlignables)
    return makeCheck('secondaryDensity', 'secondary', offenders.length ? 0 : 100, offenders.length, offenderRanges);
}
