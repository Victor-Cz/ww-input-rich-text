import { findKeywordInBlock, findPhrasesInBlock } from '../extractors.js';
import { decreasingScore, makeCheck, notApplicable, ratioScore } from '../result.js';
import { contentWords, findListMatches, findPhraseMatches, hasKeyword, normalizeText } from '../textUtils.js';

// Catégorie "headings" — contenu des titres (H1-H6) : longueur et présence
// des mots-clés. La structure des titres (headingHierarchy — unicité du H1 +
// hiérarchie des niveaux — et subheadingDistribution) reste en catégorie "structure".

export function headingsChecks(context) {
    const { model, phrases, wordLists, matchOptions } = context;
    return [
        headingLength(model),
        keywordInH1(model, phrases, wordLists.stopWords, matchOptions),
        keywordInSubheadings(model, phrases, matchOptions),
        secondaryInSubheadings(model, context.options.secondaryKeywords, context.secondaryMatchOptions),
        questionHeadings(model, wordLists),
        descriptiveHeadings(model, wordLists),
    ];
}

// Titres formulés comme les requêtes (« Comment… ? », « What is… »).
// Cible 30 % des H2/H3 (pas 100 % : tout n'est pas une question) — proportionnel.
// na si < 3 sous-titres. value : % de sous-titres interrogatifs (surlignés).
function questionHeadings(model, wordLists) {
    const subheadings = model.headings.filter(heading => heading.level === 2 || heading.level === 3);
    if (subheadings.length < 3) return notApplicable('questionHeadings', 'headings', 0);
    const questions = subheadings.filter(heading => isQuestion(heading.text, wordLists.questionWords));
    const percent = Math.round((questions.length / subheadings.length) * 100);
    return makeCheck('questionHeadings', 'headings', ratioScore(percent, 30), percent,
        questions.map(heading => ({ from: heading.from, to: heading.to })));
}

export function isQuestion(text, questionWords) {
    const trimmed = text.trim();
    if (trimmed.endsWith('?')) return true;
    return findListMatches(trimmed, questionWords).some(match => match.start === 0);
}

// Titres porteurs de sens : un titre sert d'ancre au passage extrait, il doit
// nommer son sujet. Fautif : titre générique (« Introduction », « Avantages »)
// ou moins de 2 mots de contenu (« FAQ » toléré). Score = % de titres
// descriptifs. na sans sous-titre. value : nb de titres fautifs (surlignés).
function descriptiveHeadings(model, wordLists) {
    const subheadings = model.headings.filter(heading => heading.level >= 2);
    if (!subheadings.length) return notApplicable('descriptiveHeadings', 'headings', 0);
    const generic = new Set(wordLists.genericHeadings.map(heading => normalizeText(heading)));
    const offenders = subheadings.filter(heading => {
        const normalized = normalizeText(heading.text).replace(/[\s:?!.…]+$/u, '').trim();
        if (normalized === 'faq') return false;
        return generic.has(normalized) || contentWords(heading.text, wordLists.stopWords).length < 2;
    });
    const score = (1 - offenders.length / subheadings.length) * 100;
    return makeCheck('descriptiveHeadings', 'headings', score, offenders.length,
        offenders.map(heading => ({ from: heading.from, to: heading.to })));
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

// Mot-clé dans le titre H1 : trouvé → 100 ; une partie de ses mots seulement →
// proportionnel (max 60) ; absent → 0 (le H1 est surligné pour le localiser).
// na sans mot-clé ou sans H1. value : 'full' | 'scattered' | 'missing'
function keywordInH1(model, phrases, stopWords, matchOptions) {
    if (!phrases.length) return notApplicable('keywordInH1', 'headings');
    const h1 = model.headings.find(heading => heading.level === 1);
    if (!h1) return notApplicable('keywordInH1', 'headings');

    const fullMatch = findKeywordInBlock(h1, phrases, matchOptions);
    if (fullMatch.count) {
        return makeCheck('keywordInH1', 'headings', 100, 'full', fullMatch.ranges);
    }

    const words = contentWords(phrases[0], stopWords);
    const found = words.filter(word => findPhraseMatches(h1.text, word, matchOptions).length > 0);
    if (found.length) {
        const score = (found.length / words.length) * 60;
        return makeCheck('keywordInH1', 'headings', score, 'scattered', findPhrasesInBlock(h1, found, matchOptions));
    }
    return makeCheck('keywordInH1', 'headings', 0, 'missing', [{ from: h1.from, to: h1.to }]);
}

// Zone optimale 30-75 % des H2/H3 avec le mot-clé → 100 ; proportionnel en
// dessous ; au-delà, sur-optimisation : décroît doucement (plancher 50).
// na sans mot-clé ou sans sous-titre. value : % de sous-titres avec le mot-clé.
function keywordInSubheadings(model, phrases, matchOptions) {
    if (!phrases.length) return notApplicable('keywordInSubheadings', 'headings');
    const subheadings = model.headings.filter(heading => heading.level === 2 || heading.level === 3);
    if (!subheadings.length) return notApplicable('keywordInSubheadings', 'headings', 0);

    const matched = subheadings
        .map(heading => findKeywordInBlock(heading, phrases, matchOptions))
        .filter(match => match.count > 0);
    const percent = Math.round((matched.length / subheadings.length) * 100);
    let score;
    if (percent < 30) score = ratioScore(percent, 30);
    else if (percent <= 75) score = 100;
    else score = Math.max(50, 100 - (percent - 75) * 2);
    // Surligner les occurrences du mot-clé dans les sous-titres, pas le sous-titre entier
    const ranges = matched.flatMap(match => match.ranges);
    const check = makeCheck('keywordInSubheadings', 'headings', score, percent, ranges);
    // 'bad' couvre « aucun » (0 %) ET « trop peu » (1-29 %) : message dédié au 0 %
    if (matched.length === 0) check.messageKey = 'none';
    return check;
}

// Cible : ≥ 50 % des mots-clés secondaires dans au moins un sous-titre — proportionnel.
// na sans secondaires ou sans sous-titre. value : % de secondaires couverts.
function secondaryInSubheadings(model, secondaries, secondaryMatchOptions) {
    if (!secondaries.length) return notApplicable('secondaryInSubheadings', 'headings');
    const subheadings = model.headings.filter(heading => heading.level >= 2);
    if (!subheadings.length) return notApplicable('secondaryInSubheadings', 'headings', 0);

    const covered = secondaries.filter(keyword =>
        subheadings.some(heading => hasKeyword(heading.text, [keyword], secondaryMatchOptions))
    );
    const percent = Math.round((covered.length / secondaries.length) * 100);
    const score = ratioScore(percent, 50);

    // Surligner les occurrences des mots-clés secondaires dans les sous-titres,
    // pas le sous-titre entier
    const ranges = subheadings.flatMap(heading => findKeywordInBlock(heading, covered, secondaryMatchOptions).ranges);
    const check = makeCheck('secondaryInSubheadings', 'headings', score, percent, ranges);
    if (covered.length === 0) check.messageKey = 'none';
    return check;
}
