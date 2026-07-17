import { makeCheck, notApplicable } from '../result.js';
import { findPhrasesInBlock, findPhrasesInModel } from '../extractors.js';
import { contentWords, findPhraseMatches, includesAnyPhrase } from '../textUtils.js';

// Catégorie "keyword" — nécessite `seoKeyword`.
// Partout, « le mot-clé » = le principal OU un de ses synonymes (`context.phrases`),
// avec tolérance casse / accents / pluriels simples (voir textUtils).

export function keywordChecks(context) {
    const { model, phrases, wordLists } = context;
    if (!phrases.length) {
        return ['keyphraseLength', 'keywordInIntroduction', 'keywordDensity', 'keywordInSubheadings',
            'keywordDistribution', 'keywordInImageAlt', 'competingAnchor']
            .map(id => notApplicable(id, 'keyword'));
    }

    const occurrences = findPhrasesInModel(model, phrases);
    return [
        keyphraseLength(context.options.keyword, wordLists.stopWords),
        keywordInIntroduction(model, phrases, wordLists.stopWords),
        keywordDensity(model, occurrences),
        keywordInSubheadings(model, phrases),
        keywordDistribution(model, occurrences),
        keywordInImageAlt(model, phrases, wordLists.stopWords),
        competingAnchor(model, phrases),
    ];
}

// Yoast : 1-4 mots significatifs vert, 5-8 orange, > 8 rouge.
// 0 mot significatif (que des mots vides) : avertissement, hors score.
function keyphraseLength(keyword, stopWords) {
    const words = contentWords(keyword, stopWords);
    if (!words.length) {
        const check = notApplicable('keyphraseLength', 'keyword', 0);
        check.status = 'warning';
        return check;
    }
    let score;
    if (words.length <= 4) score = 9;
    else if (words.length <= 8) score = 6;
    else score = 3;
    return makeCheck('keyphraseLength', 'keyword', score, words.length);
}

// Yoast : phrase-clé complète dans le 1er paragraphe → vert ;
// tous les mots présents mais dispersés → orange ; sinon rouge.
function keywordInIntroduction(model, phrases, stopWords) {
    const intro = model.paragraphs.find(paragraph => paragraph.words > 0);
    if (!intro) return notApplicable('keywordInIntroduction', 'keyword');

    const fullMatches = findPhrasesInBlock(intro, phrases);
    if (fullMatches.length) {
        return makeCheck('keywordInIntroduction', 'keyword', 9, true, fullMatches);
    }

    const words = contentWords(phrases[0], stopWords);
    const wordsPresent = words.length > 0 && words.every(word => findPhraseMatches(intro.text, word).length > 0);
    if (wordsPresent) {
        const wordRanges = findPhrasesInBlock(intro, words);
        return makeCheck('keywordInIntroduction', 'keyword', 6, 'scattered', wordRanges);
    }
    return makeCheck('keywordInIntroduction', 'keyword', 3, false);
}

// Vert : 0,5-3 % · orange : trop faible ou 3-4 % · rouge : absent ou > 4 %
function keywordDensity(model, occurrences) {
    const words = model.wordCount;
    if (!words) return notApplicable('keywordDensity', 'keyword', 0);
    const count = occurrences.length;
    const ranges = occurrences;

    if (words < 100) {
        let score;
        if (count === 0) score = 3;
        else if (count <= 2) score = 9;
        else score = 2;
        return makeCheck('keywordDensity', 'keyword', score, { occurrences: count, density: null }, ranges);
    }

    const density = (count / words) * 100;
    let score;
    if (count === 0) score = 3;
    else if (density < 0.5) score = 6;
    else if (density <= 3) score = 9;
    else if (density <= 4) score = 6;
    else score = 2; // keyword stuffing
    return makeCheck(
        'keywordDensity',
        'keyword',
        score,
        { occurrences: count, density: Math.round(density * 100) / 100 },
        ranges
    );
}

// Yoast : 30-75 % des H2/H3 contiennent le mot-clé → vert ;
// > 0 % hors plage → orange (dont sur-optimisation) ; 0 % → rouge
function keywordInSubheadings(model, phrases) {
    const subheadings = model.headings.filter(heading => heading.level === 2 || heading.level === 3);
    if (!subheadings.length) return notApplicable('keywordInSubheadings', 'keyword', 0);

    const matched = subheadings.filter(heading => includesAnyPhrase(heading.text, phrases));
    const percent = Math.round((matched.length / subheadings.length) * 100);
    let score;
    if (percent >= 30 && percent <= 75) score = 9;
    else if (percent > 0) score = 6;
    else score = 3;
    return makeCheck(
        'keywordInSubheadings',
        'keyword',
        score,
        percent,
        matched.map(heading => ({ from: heading.from, to: heading.to }))
    );
}

// Yoast Premium (simplifié) : présence du mot-clé dans les 4 quarts du texte
function keywordDistribution(model, occurrences) {
    if (model.sentences.length < 15 || occurrences.length < 2) {
        return notApplicable('keywordDistribution', 'keyword', occurrences.length);
    }
    const textBlocks = model.blocks.filter(block => !block.isCode);
    const start = textBlocks[0].from;
    const end = textBlocks[textBlocks.length - 1].to;
    const span = Math.max(1, end - start);

    const quarters = new Set(
        occurrences.map(range => Math.min(3, Math.floor(((range.from - start) / span) * 4)))
    );
    let score;
    if (quarters.size >= 3) score = 9;
    else if (quarters.size === 2) score = 6;
    else score = 3;
    return makeCheck('keywordDistribution', 'keyword', score, quarters.size, occurrences);
}

// Yoast : ≥ 50 % des mots significatifs du mot-clé dans au moins un alt
function keywordInImageAlt(model, phrases, stopWords) {
    if (!model.images.length) return notApplicable('keywordInImageAlt', 'keyword', 0);

    const words = contentWords(phrases[0], stopWords);
    const matched = model.images.filter(image => {
        if (!image.alt) return false;
        if (includesAnyPhrase(image.alt, phrases)) return true;
        if (!words.length) return false;
        const found = words.filter(word => findPhraseMatches(image.alt, word).length > 0);
        return found.length / words.length >= 0.5;
    });

    const withAlt = model.images.filter(image => image.alt);
    let score;
    if (matched.length) score = 9;
    else if (withAlt.length) score = 6;
    else score = 3;
    return makeCheck(
        'keywordInImageAlt',
        'keyword',
        score,
        matched.length,
        matched.map(image => ({ from: image.from, to: image.to, node: true }))
    );
}

// Yoast "competing links" : un lien dont l'ancre contient le mot-clé
// détourne le signal vers une autre page (cannibalisation)
function competingAnchor(model, phrases) {
    if (!model.links.length) return notApplicable('competingAnchor', 'keyword', 0);
    const offenders = model.links.filter(link => includesAnyPhrase(link.text, phrases));
    return makeCheck(
        'competingAnchor',
        'keyword',
        offenders.length ? 2 : 9,
        offenders.length,
        offenders.map(link => ({ from: link.from, to: link.to }))
    );
}
