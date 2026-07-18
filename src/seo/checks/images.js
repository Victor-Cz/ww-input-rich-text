import { makeCheck, notApplicable, ratioScore } from '../result.js';

// Catégorie "images" — aucun mot-clé requis.

export function imagesChecks(context) {
    const { model } = context;
    return [imagePresence(model), imageAlt(model)];
}

// Nombre d'images vs attendu : 1 image par ~500 mots (minimum 1).
// Score proportionnel : 2 images pour 4 attendues → 50. value : nombre d'images.
function imagePresence(model) {
    const count = model.images.length;
    const expected = Math.max(1, Math.floor(model.wordCount / 500));
    return makeCheck('imagePresence', 'images', ratioScore(count, expected), count);
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
