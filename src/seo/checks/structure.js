import { makeCheck, notApplicable } from '../result.js';

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

// Seuils Yoast : vert ≥ 300 mots, orange 250-299, rouge < 250 (très mauvais < 100)
function textLength(model) {
    const words = model.wordCount;
    let score;
    if (words >= 300) score = 9;
    else if (words >= 250) score = 6;
    else if (words >= 100) score = 3;
    else score = 0;
    return makeCheck('textLength', 'structure', score, words);
}

function singleH1(model, options) {
    const h1Blocks = model.headings.filter(heading => heading.level === 1);
    const count = h1Blocks.length;
    let score;
    if (count >= 2) score = 1;
    else if (options.expectH1) score = count === 1 ? 9 : 3;
    else score = 9; // 0 ou 1 H1 : ok quand le titre de page est hors éditeur
    const ranges = count >= 2 ? h1Blocks.map(block => ({ from: block.from, to: block.to })) : [];
    return makeCheck('singleH1', 'structure', score, count, ranges);
}

// Rupture de hiérarchie : un titre saute plus d'un niveau (h2 → h4)
function headingHierarchy(model) {
    const headings = model.headings;
    if (headings.length < 2) return notApplicable('headingHierarchy', 'structure', headings.length);
    const offenders = [];
    for (let i = 1; i < headings.length; i++) {
        if (headings[i].level > headings[i - 1].level + 1) offenders.push(headings[i]);
    }
    return makeCheck(
        'headingHierarchy',
        'structure',
        offenders.length ? 6 : 9,
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
    let score;
    if (worst > 350) score = 3;
    else if (worst > 300) score = 6;
    else score = 9;

    const ranges = offenders.flatMap(stretch =>
        stretch.blocks.length
            ? [{ from: stretch.blocks[0].from, to: stretch.blocks[stretch.blocks.length - 1].to }]
            : []
    );
    return makeCheck('subheadingDistribution', 'structure', score, worst, ranges);
}

// Seuils Yoast : paragraphe > 200 mots rouge, 150-200 orange
function paragraphLength(model) {
    if (!model.paragraphs.length) return notApplicable('paragraphLength', 'structure', 0);
    const tooLong = model.paragraphs.filter(paragraph => paragraph.words > 200);
    const long = model.paragraphs.filter(paragraph => paragraph.words > 150 && paragraph.words <= 200);
    let score;
    if (tooLong.length) score = 3;
    else if (long.length) score = 6;
    else score = 9;
    const offenders = [...tooLong, ...long];
    return makeCheck(
        'paragraphLength',
        'structure',
        score,
        offenders.length,
        offenders.map(block => ({ from: block.from, to: block.to }))
    );
}

// Au moins une liste ou un tableau (featured snippets)
function structuredContent(model) {
    const count = model.listCount + model.tableCount;
    if (model.wordCount < 300) return notApplicable('structuredContent', 'structure', count);
    return makeCheck('structuredContent', 'structure', count >= 1 ? 9 : 6, {
        lists: model.listCount,
        tables: model.tableCount,
    });
}

// Yoast Premium : blocs de texte centrés > 50 caractères
function centeredContent(model) {
    const offenders = model.blocks.filter(block => block.align === 'center' && block.text.trim().length > 50);
    return makeCheck(
        'centeredContent',
        'structure',
        offenders.length ? 2 : 9,
        offenders.length,
        offenders.map(block => ({ from: block.from, to: block.to }))
    );
}
