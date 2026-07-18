import { findPhrasesInBlock } from '../extractors.js';
import { decreasingScore, makeCheck, notApplicable, ratioScore } from '../result.js';
import { contentWords, findPhraseMatches, includesAnyPhrase } from '../textUtils.js';

// Catégorie "headings" — contenu des titres (H1-H6) : longueur et présence
// des mots-clés. La structure des titres (headingHierarchy — unicité du H1 +
// hiérarchie des niveaux — et subheadingDistribution) reste en catégorie "structure".

export function headingsChecks(context) {
    const { model, phrases, wordLists } = context;
    return [
        headingLength(model),
        keywordInH1(model, phrases, wordLists.stopWords),
        keywordInSubheadings(model, phrases),
        secondaryInSubheadings(model, context.options.secondaryKeywords),
    ];
}

// Longueur des titres : un titre concis reste scannable. 100 jusqu'à 60
// caractères (pire titre), 0 à 100. value : nb de titres trop longs.
function headingLength(model) {
    if (!model.headings.length) return notApplicable('headingLength', 'headings', 0);
    const worst = Math.max(...model.headings.map(heading => heading.text.trim().length));
    const offenders = model.headings.filter(heading => heading.text.trim().length > 60);
    return makeCheck(
        'headingLength',
        'headings',
        decreasingScore(worst, 60, 100),
        offenders.length,
        offenders.map(heading => ({ from: heading.from, to: heading.to }))
    );
}

// Mot-clé dans le titre H1 : phrase complète → 100 ; mots dispersés →
// proportionnel (max 60) ; absent → 0 (le H1 est surligné pour le localiser).
// na sans mot-clé ou sans H1. value : 'full' | 'scattered' | 'missing'
function keywordInH1(model, phrases, stopWords) {
    if (!phrases.length) return notApplicable('keywordInH1', 'headings');
    const h1 = model.headings.find(heading => heading.level === 1);
    if (!h1) return notApplicable('keywordInH1', 'headings');

    const fullMatches = findPhrasesInBlock(h1, phrases);
    if (fullMatches.length) {
        return makeCheck('keywordInH1', 'headings', 100, 'full', fullMatches);
    }

    const words = contentWords(phrases[0], stopWords);
    const found = words.filter(word => findPhraseMatches(h1.text, word).length > 0);
    if (found.length) {
        const score = (found.length / words.length) * 60;
        return makeCheck('keywordInH1', 'headings', score, 'scattered', findPhrasesInBlock(h1, found));
    }
    return makeCheck('keywordInH1', 'headings', 0, 'missing', [{ from: h1.from, to: h1.to }]);
}

// Zone optimale 30-75 % des H2/H3 avec le mot-clé → 100 ; proportionnel en
// dessous ; au-delà, sur-optimisation : décroît doucement (plancher 50).
// na sans mot-clé ou sans sous-titre. value : % de sous-titres avec le mot-clé.
function keywordInSubheadings(model, phrases) {
    if (!phrases.length) return notApplicable('keywordInSubheadings', 'headings');
    const subheadings = model.headings.filter(heading => heading.level === 2 || heading.level === 3);
    if (!subheadings.length) return notApplicable('keywordInSubheadings', 'headings', 0);

    const matched = subheadings.filter(heading => includesAnyPhrase(heading.text, phrases));
    const percent = Math.round((matched.length / subheadings.length) * 100);
    let score;
    if (percent < 30) score = ratioScore(percent, 30);
    else if (percent <= 75) score = 100;
    else score = Math.max(50, 100 - (percent - 75) * 2);
    // Surligner les occurrences du mot-clé dans les sous-titres, pas le sous-titre entier
    const ranges = matched.flatMap(heading => findPhrasesInBlock(heading, phrases));
    return makeCheck('keywordInSubheadings', 'headings', score, percent, ranges);
}

// Cible : ≥ 50 % des mots-clés secondaires dans au moins un sous-titre — proportionnel.
// na sans secondaires ou sans sous-titre. value : % de secondaires couverts.
function secondaryInSubheadings(model, secondaries) {
    if (!secondaries.length) return notApplicable('secondaryInSubheadings', 'headings');
    const subheadings = model.headings.filter(heading => heading.level >= 2);
    if (!subheadings.length) return notApplicable('secondaryInSubheadings', 'headings', 0);

    const covered = secondaries.filter(keyword =>
        subheadings.some(heading => includesAnyPhrase(heading.text, [keyword]))
    );
    const percent = Math.round((covered.length / secondaries.length) * 100);
    const score = ratioScore(percent, 50);

    // Surligner les occurrences des mots-clés secondaires dans les sous-titres,
    // pas le sous-titre entier
    const ranges = subheadings.flatMap(heading => findPhrasesInBlock(heading, covered));
    return makeCheck('secondaryInSubheadings', 'headings', score, percent, ranges);
}
