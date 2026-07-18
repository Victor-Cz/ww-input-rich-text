import { decreasingScore, makeCheck, notApplicable, ratioScore } from '../result.js';

// Catégorie "structure" — aucun mot-clé requis.

export function structureChecks(context) {
    const { model, options } = context;
    return [
        textLength(model),
        headingHierarchy(model, options),
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

// Structure des titres : unicité du H1 (contrainte dure) + pas de saut de niveau
// (h2 → h4). Check critique.
// - ≥ 2 H1 → 0 (messageKey 'multipleH1'), H1 surlignés
// - H1 attendu mais absent → 0 (messageKey 'missingH1')
// - sinon : score = proportion de transitions de niveau valides
// value : nombre de problèmes (H1 en trop / manquant / sauts de niveau)
function headingHierarchy(model, options) {
    const headings = model.headings;
    const h1Blocks = headings.filter(heading => heading.level === 1);

    if (h1Blocks.length >= 2) {
        const check = makeCheck('headingHierarchy', 'structure', 0, h1Blocks.length,
            h1Blocks.map(block => ({ from: block.from, to: block.to })));
        check.messageKey = 'multipleH1';
        return check;
    }
    if (options.expectH1 && h1Blocks.length === 0) {
        const check = makeCheck('headingHierarchy', 'structure', 0, 0);
        check.messageKey = 'missingH1';
        return check;
    }

    // H1 correct : évaluer les sauts de niveau (aucun possible avec < 2 titres)
    if (headings.length < 2) return makeCheck('headingHierarchy', 'structure', 100, 0);
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

// Seuils Yoast : bloc sans sous-titre > 300 mots. 100 jusqu'à 300, 0 à 600.
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
