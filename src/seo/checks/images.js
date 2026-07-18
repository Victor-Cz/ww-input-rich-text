import { makeCheck, notApplicable } from '../result.js';

// Catégorie "images" — aucun mot-clé requis.

export function imagesChecks(context) {
    const { model } = context;
    return [imagePresence(model), imageAlt(model)];
}

// Présence ET quantité en un seul check : aucune image → 0 ; sinon, base 60
// + proportionnel au nombre attendu (~1 image par 500 mots, min 1).
// value : nombre d'images.
function imagePresence(model) {
    const count = model.images.length;
    if (!count) return makeCheck('imagePresence', 'images', 0, count);
    const expected = Math.max(1, Math.floor(model.wordCount / 500));
    const score = 60 + Math.min(1, count / expected) * 40;
    return makeCheck('imagePresence', 'images', score, count);
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
