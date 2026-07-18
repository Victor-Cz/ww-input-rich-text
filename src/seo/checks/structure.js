import { decreasingScore, makeCheck, notApplicable, ratioScore } from '../result.js';

// Catégorie "structure" — aucun mot-clé requis.

export function structureChecks(context) {
    const { model, options } = context;
    return [
        textLength(model),
        singleH1(model, options),
        headingHierarchy(model),
        subheadingDistribution(model),
        paragraphLength(model),
        structuredContent(model),
        centeredContent(model),
    ];
}

// Cible : 300 mots — score proportionnel en dessous (250 → 83)
function textLength(model) {
    const words = model.wordCount;
    return makeCheck('textLength', 'structure', ratioScore(words, 300), words);
}

// Binaire : exactement un H1 (si attendu) ou 0-1 H1 (sinon), tout écart = 0
function singleH1(model, options) {
    const h1Blocks = model.headings.filter(heading => heading.level === 1);
    const count = h1Blocks.length;
    let score;
    if (count >= 2) score = 0;
    else if (options.expectH1) score = count === 1 ? 100 : 0;
    else score = 100; // 0 ou 1 H1 : ok quand le titre de page est hors éditeur
    const ranges = count >= 2 ? h1Blocks.map(block => ({ from: block.from, to: block.to })) : [];
    const check = makeCheck('singleH1', 'structure', score, count, ranges);
    // Même statut 'bad' pour deux causes distinctes : message dédié au H1 manquant
    if (options.expectH1 && count === 0) check.messageKey = 'missing';
    return check;
}

// Rupture de hiérarchie : un titre saute plus d'un niveau (h2 → h4).
// Score = proportion de transitions valides.
function headingHierarchy(model) {
    const headings = model.headings;
    if (headings.length < 2) return notApplicable('headingHierarchy', 'structure', headings.length);
    const offenders = [];
    for (let i = 1; i < headings.length; i++) {
        if (headings[i].level > headings[i - 1].level + 1) offenders.push(headings[i]);
    }
    const transitions = headings.length - 1;
    return makeCheck(
        'headingHierarchy',
        'structure',
        (1 - offenders.length / transitions) * 100,
        offenders.length,
        offenders.map(block => ({ from: block.from, to: block.to }))
    );
}

// Seuils Yoast : bloc sans sous-titre > 350 mots rouge, 300-350 orange
function subheadingDistribution(model) {
    const hasSubheadings = model.headings.some(heading => heading.level >= 2);
    if (model.wordCount <= 300 && !hasSubheadings) {
        return notApplicable('subheadingDistribution', 'structure', model.wordCount);
    }

    // Découper le contenu en tronçons entre sous-titres (H2-H6)
    const stretches = [];
    let current = { words: 0, blocks: [] };
    for (const block of model.blocks) {
        if (block.type === 'heading' && block.level >= 2) {
            stretches.push(current);
            current = { words: 0, blocks: [] };
        } else if (!block.isCode) {
            current.words += block.words;
            current.blocks.push(block);
        }
    }
    stretches.push(current);

    const offenders = stretches.filter(stretch => stretch.words > 300);
    const worst = Math.max(0, ...stretches.map(stretch => stretch.words));

    const ranges = offenders.flatMap(stretch =>
        stretch.blocks.length
            ? [{ from: stretch.blocks[0].from, to: stretch.blocks[stretch.blocks.length - 1].to }]
            : []
    );
    // 100 jusqu'à 300 mots sans sous-titre, 0 à partir de 600
    return makeCheck('subheadingDistribution', 'structure', decreasingScore(worst, 300, 600), worst, ranges);
}

// Basé sur le pire paragraphe : 100 jusqu'à 150 mots, 0 à partir de 300
function paragraphLength(model) {
    if (!model.paragraphs.length) return notApplicable('paragraphLength', 'structure', 0);
    const worst = Math.max(...model.paragraphs.map(paragraph => paragraph.words));
    const offenders = model.paragraphs.filter(paragraph => paragraph.words > 150);
    return makeCheck(
        'paragraphLength',
        'structure',
        decreasingScore(worst, 150, 300),
        offenders.length,
        offenders.map(block => ({ from: block.from, to: block.to }))
    );
}

// Au moins une liste ou un tableau (featured snippets).
// value : nombre de listes + tableaux (détail dans stats).
function structuredContent(model) {
    const count = model.listCount + model.tableCount;
    if (model.wordCount < 300) return notApplicable('structuredContent', 'structure', count);
    return makeCheck('structuredContent', 'structure', count >= 1 ? 100 : 50, count);
}

// Yoast Premium : blocs de texte centrés > 50 caractères
function centeredContent(model) {
    const offenders = model.blocks.filter(block => block.align === 'center' && block.text.trim().length > 50);
    return makeCheck(
        'centeredContent',
        'structure',
        offenders.length ? 0 : 100,
        offenders.length,
        offenders.map(block => ({ from: block.from, to: block.to }))
    );
}
