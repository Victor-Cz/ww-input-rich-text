import { makeCheck, notApplicable } from '../result.js';

// Catégorie "images" — aucun mot-clé requis.

export function imagesChecks(context) {
    const { model } = context;
    return [imagePresence(model), imageAlt(model), imageRatio(model)];
}

// Yoast : ≥ 1 image → vert ; Rank Math : score max à 4 médias
function imagePresence(model) {
    const count = model.images.length;
    let score;
    if (count >= 4) score = 9;
    else if (count >= 1) score = model.wordCount > 1000 ? 7 : 9;
    else score = 3;
    return makeCheck('imagePresence', 'images', score, count);
}

function imageAlt(model) {
    if (!model.images.length) return notApplicable('imageAlt', 'images', 0);
    const missing = model.images.filter(image => !image.alt);
    let score;
    if (!missing.length) score = 9;
    else if (missing.length < model.images.length) score = 6;
    else score = 3;
    return makeCheck(
        'imageAlt',
        'images',
        score,
        missing.length,
        missing.map(image => ({ from: image.from, to: image.to, node: true }))
    );
}

// ~1 image par 500 mots au-delà de 300 mots
function imageRatio(model) {
    if (!model.images.length || model.wordCount < 300) {
        return notApplicable('imageRatio', 'images', model.images.length);
    }
    const expected = Math.floor(model.wordCount / 500);
    const score = model.images.length >= expected ? 9 : 6;
    return makeCheck('imageRatio', 'images', score, {
        images: model.images.length,
        expected: Math.max(1, expected),
    });
}
