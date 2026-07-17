import { makeCheck, notApplicable } from '../result.js';
import { contentWords, findPhraseMatches, normalizeText, splitWords } from '../textUtils.js';

// Catégories "metaTitle", "metaDescription", "slug" — scorées uniquement
// si les entrées correspondantes sont fournies. Pas de plages (hors éditeur).

export function metaChecks(context) {
    const { options, phrases, wordLists } = context;
    return [
        ...metaTitleChecks(options, phrases, wordLists),
        ...metaDescriptionChecks(options, phrases),
        ...slugChecks(options, phrases, wordLists),
    ];
}

function metaTitleChecks(options, phrases, wordLists) {
    const title = (options.metaTitle || '').trim();
    if (!title) {
        return ['metaTitleKeyword', 'metaTitleKeywordPosition', 'metaTitleLength', 'metaTitleAttractiveness']
            .map(id => notApplicable(id, 'metaTitle'));
    }
    return [
        metaTitleKeyword(title, phrases, wordLists.stopWords),
        metaTitleKeywordPosition(title, phrases),
        metaTitleLength(title),
        metaTitleAttractiveness(title, wordLists),
    ];
}

// Yoast : match exact → vert ; mots présents mais séparés → orange ; absent → rouge
function metaTitleKeyword(title, phrases, stopWords) {
    if (!phrases.length) return notApplicable('metaTitleKeyword', 'metaTitle');
    const exact = phrases.some(phrase => findPhraseMatches(title, phrase).length > 0);
    if (exact) return makeCheck('metaTitleKeyword', 'metaTitle', 9, true);

    const words = contentWords(phrases[0], stopWords);
    const allWords = words.length > 0 && words.every(word => findPhraseMatches(title, word).length > 0);
    return makeCheck('metaTitleKeyword', 'metaTitle', allWords ? 6 : 2, allWords ? 'scattered' : false);
}

// Rank Math : mot-clé dans la première moitié du title
function metaTitleKeywordPosition(title, phrases) {
    if (!phrases.length) return notApplicable('metaTitleKeywordPosition', 'metaTitle');
    const matches = phrases.flatMap(phrase => findPhraseMatches(title, phrase));
    if (!matches.length) return notApplicable('metaTitleKeywordPosition', 'metaTitle');
    const firstStart = Math.min(...matches.map(match => match.start));
    const inFirstHalf = firstStart <= title.length / 2;
    return makeCheck('metaTitleKeywordPosition', 'metaTitle', inFirstHalf ? 9 : 6, firstStart);
}

// ~40-60 caractères (approximation des 600 px Yoast)
function metaTitleLength(title) {
    const length = title.length;
    let score;
    if (length >= 40 && length <= 60) score = 9;
    else if (length < 40) score = 6;
    else score = 3;
    return makeCheck('metaTitleLength', 'metaTitle', score, length);
}

// Composite Rank Math : power word + mot à sentiment + chiffre.
// Vert dès 2 des 3 (exiger les 3 pousse au clickbait).
function metaTitleAttractiveness(title, wordLists) {
    const normalized = normalizeText(title);
    const titleWords = new Set(splitWords(normalized));
    const hasListWord = list => list.some(word => {
        const normalizedWord = normalizeText(word);
        return normalizedWord.includes(' ') ? normalized.includes(normalizedWord) : titleWords.has(normalizedWord);
    });

    const signals = {
        number: /\d/.test(title),
        powerWord: hasListWord(wordLists.powerWords),
        sentimentWord: hasListWord(wordLists.sentimentWords),
    };
    const count = Object.values(signals).filter(Boolean).length;
    let score;
    if (count >= 2) score = 9;
    else if (count === 1) score = 6;
    else score = 3;
    return makeCheck('metaTitleAttractiveness', 'metaTitle', score, signals);
}

function metaDescriptionChecks(options, phrases) {
    const description = (options.metaDescription || '').trim();
    if (!description) {
        return ['metaDescriptionLength', 'metaDescriptionKeyword'].map(id => notApplicable(id, 'metaDescription'));
    }

    const length = description.length;
    let lengthScore;
    if (length >= 121 && length <= 156) lengthScore = 9;
    else if (length <= 120 || length <= 160) lengthScore = 6;
    else lengthScore = 3;
    const lengthCheck = makeCheck('metaDescriptionLength', 'metaDescription', lengthScore, length);

    if (!phrases.length) return [lengthCheck, notApplicable('metaDescriptionKeyword', 'metaDescription')];

    const occurrences = phrases.reduce((sum, phrase) => sum + findPhraseMatches(description, phrase).length, 0);
    const keywordScore = occurrences >= 1 && occurrences <= 2 ? 9 : 3;
    return [lengthCheck, makeCheck('metaDescriptionKeyword', 'metaDescription', keywordScore, occurrences)];
}

function slugChecks(options, phrases, wordLists) {
    const slug = (options.slug || '').trim();
    if (!slug) {
        return ['slugKeyword', 'slugLength', 'slugClean'].map(id => notApplicable(id, 'slug'));
    }
    const slugText = normalizeText(slug).replace(/[-_/]+/g, ' ').trim();

    const checks = [];

    if (phrases.length) {
        const words = contentWords(phrases[0], wordLists.stopWords);
        const foundWords = words.filter(word => findPhraseMatches(slugText, word).length > 0);
        let score;
        if (words.length && foundWords.length === words.length) score = 9;
        else if (words.length && foundWords.length / words.length >= 0.5) score = 6;
        else score = 3;
        checks.push(makeCheck('slugKeyword', 'slug', score, { found: foundWords.length, total: words.length }));
    } else {
        checks.push(notApplicable('slugKeyword', 'slug'));
    }

    checks.push(makeCheck('slugLength', 'slug', slug.length <= 75 ? 9 : 6, slug.length));

    const stopSet = new Set(wordLists.stopWords);
    const slugWords = slugText.split(/\s+/).filter(Boolean);
    const clean =
        slug === slug.toLowerCase() &&
        !/[^a-z0-9\-/]/.test(slug.replace(/^\//, '')) &&
        !slugWords.some(word => stopSet.has(word));
    checks.push(makeCheck('slugClean', 'slug', clean ? 9 : 6, clean));

    return checks;
}
