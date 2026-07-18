import { makeCheck, notApplicable, ratioScore } from '../result.js';
import { contentWords, findPhraseMatches, includesAnyPhrase } from '../textUtils.js';

// Catégorie "images" — mot-clé requis uniquement pour keywordInImageAlt.

export function imagesChecks(context) {
    const { model, phrases, wordLists } = context;
    return [
        imagePresence(model),
        imageAlt(model),
        keywordInImageAlt(model, phrases, wordLists.stopWords),
    ];
}

// Nombre d'images vs attendu : 1 image par ~500 mots (minimum 1).
// Score proportionnel : 2 images pour 4 attendues → 50. value : nombre d'images.
// messageKey 'none' quand il n'y a réellement aucune image (le statut 'bad'
// couvre aussi « trop peu d'images » avec 1+ image sur un texte long).
function imagePresence(model) {
    const count = model.images.length;
    const expected = Math.max(1, Math.floor(model.wordCount / 500));
    const check = makeCheck('imagePresence', 'images', ratioScore(count, expected), count);
    check.target = expected;
    if (count === 0) check.messageKey = 'none';
    return check;
}

// Yoast : ≥ 50 % des mots significatifs du mot-clé dans au moins un alt.
// na sans mot-clé ou sans image. value : nb d'images dont l'alt matche.
// 100 : mot-clé dans ≥ 1 alt · 50 (warning) : des alt existent mais sans le
// mot-clé · 0 (bad) : aucune image n'a d'alt
function keywordInImageAlt(model, phrases, stopWords) {
    if (!phrases.length || !model.images.length) return notApplicable('keywordInImageAlt', 'images', 0);

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
    else if (withAlt.length) score = 50;
    else score = 0;
    return makeCheck(
        'keywordInImageAlt',
        'images',
        score,
        matched.length,
        matched.map(image => ({ from: image.from, to: image.to, node: true }))
    );
}

// Score = proportion d'images avec attribut alt. value : nb d'alt manquants.
function imageAlt(model) {
    if (!model.images.length) return notApplicable('imageAlt', 'images', 0);
    const missing = model.images.filter(image => !image.alt);
    const score = (1 - missing.length / model.images.length) * 100;
    return makeCheck(
        'imageAlt',
        'images',
        score,
        missing.length,
        missing.map(image => ({ from: image.from, to: image.to, node: true }))
    );
}
