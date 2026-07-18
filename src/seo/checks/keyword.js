import { findPhrasesInBlock, findPhrasesInModel } from '../extractors.js';
import { decreasingScore, makeCheck, notApplicable, ratioScore } from '../result.js';
import { contentWords, findPhraseMatches } from '../textUtils.js';

// Catégorie "keyword" — nécessite `seoKeyword`.
// Partout, « le mot-clé » = le principal OU un de ses synonymes (`context.phrases`),
// avec tolérance casse / accents / pluriels simples (voir textUtils).

export function keywordChecks(context) {
    const { model, phrases, wordLists } = context;
    const secondaryKeywordsCheck = secondaryKeywords(model, context.options.secondaryKeywords);
    if (!phrases.length) {
        return [
            ...['keyphraseLength', 'keywordInIntroduction', 'keywordDensity', 'keywordDistribution']
                .map(id => notApplicable(id, 'keyword')),
            secondaryKeywordsCheck,
        ];
    }

    const occurrences = findPhrasesInModel(model, phrases);
    return [
        keyphraseLength(context.options.keyword, wordLists.stopWords),
        keywordInIntroduction(model, phrases, wordLists.stopWords),
        keywordDensity(model, occurrences),
        keywordDistribution(model, occurrences),
        secondaryKeywordsCheck,
    ];
}

// Mots-clés secondaires : % de secondaires apparaissant dans le texte.
// Cible ≥ 70 %, proportionnel en dessous. na sans secondaires fournis.
// value : % des secondaires présents ; occurrences surlignables.
function secondaryKeywords(model, secondaries) {
    if (!secondaries.length) return notApplicable('secondaryKeywords', 'keyword');
    const found = secondaries.filter(keyword => findPhrasesInModel(model, [keyword]).length > 0);
    const percent = Math.round((found.length / secondaries.length) * 100);
    const ranges = found.length ? findPhrasesInModel(model, found) : [];
    return makeCheck('secondaryKeywords', 'keyword', ratioScore(percent, 70), percent, ranges);
}

// 1-4 mots significatifs = 100, puis -15 par mot au-delà.
// 0 mot significatif (que des mots vides) : avertissement dédié, hors score.
function keyphraseLength(keyword, stopWords) {
    const words = contentWords(keyword, stopWords);
    if (!words.length) {
        const check = notApplicable('keyphraseLength', 'keyword', 0);
        check.status = 'warning';
        check.messageKey = 'onlyStopwords';
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
