import { makeCheck, notApplicable, ratioScore } from '../result.js';
import { contentWords, findPhraseMatches, normalizeText, splitWords } from '../textUtils.js';

// Catégorie "meta" — meta title + meta description, scorés uniquement si
// les entrées correspondantes sont fournies. Pas de plages (hors éditeur).

export function metaChecks(context) {
    const { options, phrases, wordLists, matchOptions } = context;
    return [
        ...metaTitleChecks(options, phrases, wordLists, matchOptions),
        ...metaDescriptionChecks(options, phrases, matchOptions),
    ];
}

function metaTitleChecks(options, phrases, wordLists, matchOptions) {
    const title = (options.metaTitle || '').trim();
    if (!title) {
        return ['metaTitleKeyword', 'metaTitleLength', 'metaTitleAttractiveness'].map(id => notApplicable(id, 'meta'));
    }
    return [
        metaTitleKeyword(title, phrases, wordLists.stopWords, matchOptions),
        metaTitleLength(title),
        metaTitleAttractiveness(title, wordLists),
    ];
}

// Présence ET position en un seul check : match exact dans la 1re moitié → 100 ;
// exact mais tardif → 70 ; mots dispersés → proportionnel (tous → 60) ; absent → 0.
// value : 'start' | 'late' | 'scattered' | 'missing'
function metaTitleKeyword(title, phrases, stopWords, matchOptions) {
    if (!phrases.length) return notApplicable('metaTitleKeyword', 'meta');

    const matches = phrases.flatMap(phrase => findPhraseMatches(title, phrase, matchOptions));
    if (matches.length) {
        const firstStart = Math.min(...matches.map(match => match.start));
        const inFirstHalf = firstStart <= title.length / 2;
        const check = makeCheck('metaTitleKeyword', 'meta', inFirstHalf ? 100 : 70, inFirstHalf ? 'start' : 'late');
        if (!inFirstHalf) check.messageKey = 'late';
        return check;
    }

    const words = contentWords(phrases[0], stopWords);
    const found = words.filter(word => findPhraseMatches(title, word, matchOptions).length > 0);
    if (!words.length || !found.length) return makeCheck('metaTitleKeyword', 'meta', 0, 'missing');
    return makeCheck('metaTitleKeyword', 'meta', (found.length / words.length) * 60, 'scattered');
}

// Zone optimale ~40-60 caractères (approximation des 600 px Yoast). Hors zone,
// jamais "good" (plafonné à 79, 'warning') : proportionnel en dessous ('bad'
// jusqu'à 15), -5/caractère au-delà de 60 ('bad' dès 73, tronqué en SERP)
function metaTitleLength(title) {
    const length = title.length;
    let score;
    if (length < 40) score = Math.min(79, ratioScore(length, 40));
    else if (length <= 60) score = 100;
    else score = Math.min(79, 100 - (length - 60) * 5);
    const check = makeCheck('metaTitleLength', 'meta', score, length);
    if (length < 40) check.messageKey = 'tooShort';
    else if (length > 60 && check.status === 'warning') check.messageKey = 'tooLong';
    return check;
}

// value : nombre de signaux présents (0-3) parmi chiffre / power word / sentiment.
// 2 signaux sur 3 suffisent (exiger les 3 pousserait au clickbait).
function metaTitleAttractiveness(title, wordLists) {
    const normalized = normalizeText(title);
    const titleWords = new Set(splitWords(normalized));
    const hasListWord = list => list.some(word => {
        const normalizedWord = normalizeText(word);
        return normalizedWord.includes(' ') ? normalized.includes(normalizedWord) : titleWords.has(normalizedWord);
    });

    const count = [/\d/.test(title), hasListWord(wordLists.powerWords), hasListWord(wordLists.sentimentWords)]
        .filter(Boolean).length;
    return makeCheck('metaTitleAttractiveness', 'meta', ratioScore(count, 2), count);
}

function metaDescriptionChecks(options, phrases, matchOptions) {
    const description = (options.metaDescription || '').trim();
    if (!description) {
        return ['metaDescriptionLength', 'metaDescriptionKeyword'].map(id => notApplicable(id, 'meta'));
    }

    const length = description.length;
    // Zone optimale 121-156 caractères. Hors zone, jamais "good" (plafonné à 79,
    // 'warning') : proportionnel en dessous ('bad' jusqu'à 48), -8/caractère
    // au-delà de 156 ('bad' dès 164, tronquée en SERP)
    let lengthScore;
    if (length < 121) lengthScore = Math.min(79, ratioScore(length, 121));
    else if (length <= 156) lengthScore = 100;
    else lengthScore = Math.min(79, 100 - (length - 156) * 8);
    const lengthCheck = makeCheck('metaDescriptionLength', 'meta', lengthScore, length);
    if (length < 121) lengthCheck.messageKey = 'tooShort';
    else if (length > 156 && lengthCheck.status === 'warning') lengthCheck.messageKey = 'tooLong';

    if (!phrases.length) return [lengthCheck, notApplicable('metaDescriptionKeyword', 'meta')];

    const occurrences = phrases.reduce((sum, phrase) => sum + findPhraseMatches(description, phrase, matchOptions).length, 0);
    // 1-2 occurrences → 100 ; absent → 0 ; -40 par occurrence au-delà de 2
    let keywordScore;
    if (occurrences === 0) keywordScore = 0;
    else if (occurrences <= 2) keywordScore = 100;
    else keywordScore = Math.max(0, 100 - (occurrences - 2) * 40);
    return [lengthCheck, makeCheck('metaDescriptionKeyword', 'meta', keywordScore, occurrences)];
}
