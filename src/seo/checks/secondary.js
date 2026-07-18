import { findPhrasesInModel } from '../extractors.js';
import { makeCheck, notApplicable, ratioScore } from '../result.js';

// Catégorie "secondary" — nécessite `seoSecondaryKeywords`.
// Secondaires = sujets connexes distincts du mot-clé principal.
// (secondaryInSubheadings vit en catégorie "headings".)

export function secondaryChecks(context) {
    const { model } = context;
    const secondaries = context.options.secondaryKeywords;
    if (!secondaries.length) {
        return ['secondaryPresence', 'secondaryDensity'].map(id => notApplicable(id, 'secondary'));
    }
    return [
        secondaryPresence(model, secondaries),
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
