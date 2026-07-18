import { decreasingScore, makeCheck, notApplicable, ratioScore } from '../result.js';
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

// Match exact → 100 ; sinon proportionnel aux mots présents (tous dispersés → 60)
function metaTitleKeyword(title, phrases, stopWords) {
    if (!phrases.length) return notApplicable('metaTitleKeyword', 'metaTitle');
    const exact = phrases.some(phrase => findPhraseMatches(title, phrase).length > 0);
    if (exact) return makeCheck('metaTitleKeyword', 'metaTitle', 100, true);

    const words = contentWords(phrases[0], stopWords);
    const found = words.filter(word => findPhraseMatches(title, word).length > 0);
    if (!words.length || !found.length) return makeCheck('metaTitleKeyword', 'metaTitle', 0, false);
    const scattered = found.length === words.length;
    return makeCheck('metaTitleKeyword', 'metaTitle', (found.length / words.length) * 60, scattered ? 'scattered' : false);
}

// Mot-clé dans la première moitié du title → 100, puis décroît vers 40 en fin de title
function metaTitleKeywordPosition(title, phrases) {
    if (!phrases.length) return notApplicable('metaTitleKeywordPosition', 'metaTitle');
    const matches = phrases.flatMap(phrase => findPhraseMatches(title, phrase));
    if (!matches.length) return notApplicable('metaTitleKeywordPosition', 'metaTitle');
    const firstStart = Math.min(...matches.map(match => match.start));
    const fraction = firstStart / Math.max(1, title.length);
    const score = fraction <= 0.5 ? 100 : 100 - (fraction - 0.5) * 120;
    return makeCheck('metaTitleKeywordPosition', 'metaTitle', score, firstStart);
}

// Zone optimale ~40-60 caractères (approximation des 600 px Yoast) ;
// proportionnel en dessous, -5/caractère au-delà (tronqué en SERP)
function metaTitleLength(title) {
    const length = title.length;
    let score;
    if (length < 40) score = ratioScore(length, 40);
    else if (length <= 60) score = 100;
    else score = Math.max(0, 100 - (length - 60) * 5);
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
    // 2 signaux sur 3 suffisent (exiger les 3 pousserait au clickbait)
    return makeCheck('metaTitleAttractiveness', 'metaTitle', ratioScore(count, 2), signals);
}

function metaDescriptionChecks(options, phrases) {
    const description = (options.metaDescription || '').trim();
    if (!description) {
        return ['metaDescriptionLength', 'metaDescriptionKeyword'].map(id => notApplicable(id, 'metaDescription'));
    }

    const length = description.length;
    // Zone optimale 121-156 caractères ; proportionnel en dessous,
    // -8/caractère au-delà de 156 (tronquée en SERP)
    let lengthScore;
    if (length < 121) lengthScore = ratioScore(length, 121);
    else if (length <= 156) lengthScore = 100;
    else lengthScore = Math.max(0, 100 - (length - 156) * 8);
    const lengthCheck = makeCheck('metaDescriptionLength', 'metaDescription', lengthScore, length);

    if (!phrases.length) return [lengthCheck, notApplicable('metaDescriptionKeyword', 'metaDescription')];

    const occurrences = phrases.reduce((sum, phrase) => sum + findPhraseMatches(description, phrase).length, 0);
    // 1-2 occurrences → 100 ; absent → 0 ; -40 par occurrence au-delà de 2
    let keywordScore;
    if (occurrences === 0) keywordScore = 0;
    else if (occurrences <= 2) keywordScore = 100;
    else keywordScore = Math.max(0, 100 - (occurrences - 2) * 40);
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
        // Score = proportion des mots significatifs du mot-clé présents dans le slug
        const score = words.length ? (foundWords.length / words.length) * 100 : 0;
        checks.push(makeCheck('slugKeyword', 'slug', score, { found: foundWords.length, total: words.length }));
    } else {
        checks.push(notApplicable('slugKeyword', 'slug'));
    }

    // ≤ 75 caractères → 100, puis -2/caractère
    checks.push(makeCheck('slugLength', 'slug', decreasingScore(slug.length, 75, 125), slug.length));

    const stopSet = new Set(wordLists.stopWords);
    const slugWords = slugText.split(/\s+/).filter(Boolean);
    const clean =
        slug === slug.toLowerCase() &&
        !/[^a-z0-9\-/]/.test(slug.replace(/^\//, '')) &&
        !slugWords.some(word => stopSet.has(word));
    checks.push(makeCheck('slugClean', 'slug', clean ? 100 : 50, clean));

    return checks;
}
