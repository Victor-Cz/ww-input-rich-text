import { findPhrasesInBlock, findPhrasesInModel } from '../extractors.js';
import { decreasingScore, makeCheck, notApplicable, ratioScore } from '../result.js';
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

// 1-4 mots significatifs = 100, puis -15 par mot au-delà.
// 0 mot significatif (que des mots vides) : avertissement, hors score.
function keyphraseLength(keyword, stopWords) {
    const words = contentWords(keyword, stopWords);
    if (!words.length) {
        const check = notApplicable('keyphraseLength', 'keyword', 0);
        check.status = 'warning';
        return check;
    }
    const score = words.length <= 4 ? 100 : 100 - (words.length - 4) * 15;
    return makeCheck('keyphraseLength', 'keyword', score, words.length);
}

// Phrase-clé complète dans le 1er paragraphe → 100 ;
// sinon proportionnel aux mots significatifs présents (tous dispersés → 60).
// value : 'full' | 'scattered' | 'missing'
function keywordInIntroduction(model, phrases, stopWords) {
    const intro = model.paragraphs.find(paragraph => paragraph.words > 0);
    if (!intro) return notApplicable('keywordInIntroduction', 'keyword');

    const fullMatches = findPhrasesInBlock(intro, phrases);
    if (fullMatches.length) {
        return makeCheck('keywordInIntroduction', 'keyword', 100, 'full', fullMatches);
    }

    const words = contentWords(phrases[0], stopWords);
    const found = words.filter(word => findPhraseMatches(intro.text, word).length > 0);
    if (found.length) {
        const wordRanges = findPhrasesInBlock(intro, found);
        const score = (found.length / words.length) * 60;
        return makeCheck('keywordInIntroduction', 'keyword', score, 'scattered', wordRanges);
    }
    return makeCheck('keywordInIntroduction', 'keyword', 0, 'missing');
}

// Zone optimale 0,5-3 % → 100 ; proportionnel en dessous (0,4 % → 80) ;
// au-delà, décroît jusqu'à 0 à 5 % (keyword stuffing).
// value : densité en % (occurrences via matchCount / stats).
function keywordDensity(model, occurrences) {
    const words = model.wordCount;
    if (!words) return notApplicable('keywordDensity', 'keyword', 0);
    const count = occurrences.length;
    const ranges = occurrences;
    const density = Math.round((count / words) * 10000) / 100;

    if (words < 100) {
        // Texte court : la densité en % n'est pas significative, on compte les occurrences
        let score;
        if (count === 0) score = 0;
        else if (count <= 2) score = 100;
        else score = Math.max(0, 100 - (count - 2) * 50);
        return makeCheck('keywordDensity', 'keyword', score, density, ranges);
    }

    let score;
    if (density < 0.5) score = ratioScore(density, 0.5);
    else if (density <= 3) score = 100;
    else score = decreasingScore(density, 3, 5);
    return makeCheck('keywordDensity', 'keyword', score, density, ranges);
}

// Yoast : 30-75 % des H2/H3 contiennent le mot-clé → vert ;
// > 0 % hors plage → orange (dont sur-optimisation) ; 0 % → rouge
function keywordInSubheadings(model, phrases) {
    const subheadings = model.headings.filter(heading => heading.level === 2 || heading.level === 3);
    if (!subheadings.length) return notApplicable('keywordInSubheadings', 'keyword', 0);

    const matched = subheadings.filter(heading => includesAnyPhrase(heading.text, phrases));
    const percent = Math.round((matched.length / subheadings.length) * 100);
    // Zone optimale 30-75 % → 100 ; proportionnel en dessous ;
    // au-delà, sur-optimisation : décroît doucement (plancher 50)
    let score;
    if (percent < 30) score = ratioScore(percent, 30);
    else if (percent <= 75) score = 100;
    else score = Math.max(50, 100 - (percent - 75) * 2);
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
    // Présence dans 3 des 4 quarts du texte = bien réparti
    const score = ratioScore(quarters.size, 3);
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
    if (matched.length) score = 100;
    else if (withAlt.length) score = 30;
    else score = 0;
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
        offenders.length ? 0 : 100,
        offenders.length,
        offenders.map(link => ({ from: link.from, to: link.to }))
    );
}
