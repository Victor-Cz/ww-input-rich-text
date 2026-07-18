import { makeCheck, notApplicable, ratioScore } from '../result.js';

// Catégorie "images" — aucun mot-clé requis.

export function imagesChecks(context) {
    const { model } = context;
    return [imagePresence(model), imageAlt(model), imageRatio(model)];
}

// Aucune image → 0 ; une seule sur un texte long → 70 ; sinon 100
function imagePresence(model) {
    const count = model.images.length;
    let score;
    if (!count) score = 0;
    else if (model.wordCount > 1000 && count < 2) score = 70;
    else score = 100;
    return makeCheck('imagePresence', 'images', score, count);
}

// Score = proportion d'images avec attribut alt
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

// ~1 image par 500 mots au-delà de 300 mots — score proportionnel
function imageRatio(model) {
    if (!model.images.length || model.wordCount < 300) {
        return notApplicable('imageRatio', 'images', model.images.length);
    }
    const expected = Math.max(1, Math.floor(model.wordCount / 500));
    return makeCheck('imageRatio', 'images', ratioScore(model.images.length, expected), {
        images: model.images.length,
        expected,
    });
}
