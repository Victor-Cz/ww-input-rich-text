import { findPhrasesInBlock } from '../extractors.js';
import { decreasingScore, makeCheck, notApplicable, ratioScore } from '../result.js';
import { contentWords, findPhraseMatches, includesAnyPhrase } from '../textUtils.js';

// Catégorie "headings" — hiérarchie et contenu des titres (H1-H6).
// L'unicité du H1 (singleH1) reste en catégorie "structure".

export function headingsChecks(context) {
    const { model, phrases, wordLists } = context;
    return [
        headingHierarchy(model),
        subheadingDistribution(model),
        keywordInH1(model, phrases, wordLists.stopWords),
        keywordInSubheadings(model, phrases),
        secondaryInSubheadings(model, context.options.secondaryKeywords),
    ];
}

// Rupture de hiérarchie : un titre saute plus d'un niveau (h2 → h4).
// Score = proportion de transitions valides.
function headingHierarchy(model) {
    const headings = model.headings;
    if (headings.length < 2) return notApplicable('headingHierarchy', 'headings', headings.length);
    const offenders = [];
    for (let i = 1; i < headings.length; i++) {
        if (headings[i].level > headings[i - 1].level + 1) offenders.push(headings[i]);
    }
    const transitions = headings.length - 1;
    return makeCheck(
        'headingHierarchy',
        'headings',
        (1 - offenders.length / transitions) * 100,
        offenders.length,
        offenders.map(block => ({ from: block.from, to: block.to }))
    );
}

// Seuils Yoast : bloc sans sous-titre > 300 mots. 100 jusqu'à 300, 0 à 600.
function subheadingDistribution(model) {
    const hasSubheadings = model.headings.some(heading => heading.level >= 2);
    if (model.wordCount <= 300 && !hasSubheadings) {
        return notApplicable('subheadingDistribution', 'headings', model.wordCount);
    }

    // Découper le contenu en tronçons entre sous-titres (H2-H6)
    const stretches = [];
    let current = { words: 0, blocks: [] };
    for (const block of model.blocks) {
        if (block.type === 'heading' && block.level >= 2) {
            stretches.push(current);
            current = { words: 0, blocks: [] };
        } else if (!block.isCode) {
            current.words += block.words;
            current.blocks.push(block);
        }
    }
    stretches.push(current);

    const offenders = stretches.filter(stretch => stretch.words > 300);
    const worst = Math.max(0, ...stretches.map(stretch => stretch.words));

    const ranges = offenders.flatMap(stretch =>
        stretch.blocks.length
            ? [{ from: stretch.blocks[0].from, to: stretch.blocks[stretch.blocks.length - 1].to }]
            : []
    );
    return makeCheck('subheadingDistribution', 'headings', decreasingScore(worst, 300, 600), worst, ranges);
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
    return makeCheck(
        'keywordInSubheadings',
        'headings',
        score,
        percent,
        matched.map(heading => ({ from: heading.from, to: heading.to }))
    );
}

// Cible : ≥ 50 % des secondaires dans au moins un sous-titre — proportionnel.
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

    const matchedHeadings = subheadings.filter(heading =>
        covered.some(keyword => includesAnyPhrase(heading.text, [keyword]))
    );
    return makeCheck(
        'secondaryInSubheadings',
        'headings',
        score,
        percent,
        matchedHeadings.map(heading => ({ from: heading.from, to: heading.to }))
    );
}
