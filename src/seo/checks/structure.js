import { findKeywordInBlock, mapOffsetToPos } from '../extractors.js';
import { notePassage } from '../passages.js';
import { decreasingScore, makeCheck, notApplicable, ratioScore } from '../result.js';
import { findListMatches } from '../textUtils.js';

// Catégorie "structure" — aucun mot-clé requis (sauf keyTakeaways, qui s'en sert s'il existe).

export function structureChecks(context) {
    const { model, options } = context;
    return [
        textLength(model),
        headingHierarchy(model, options),
        subheadingDistribution(context),
        paragraphLength(model),
        structuredContent(context),
        centeredContent(model),
        answerFirst(context),
        selfContained(context),
        keyTakeaways(context),
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

// Longueur des sections (passages entre deux sous-titres) : 100 entre 80 et
// 300 mots ; décroît jusqu'à 0 à 600 (seuils Yoast — passage dilué) ;
// proportionnel sous 80 (GEO : trop peu de contexte pour être cité seul).
// L'introduction échappe au plancher ; les sections vides (titre suivi d'un
// sous-titre) sont ignorées. Score = moyenne des sections.
// value : nb de sections hors fourchette.
function subheadingDistribution(context) {
    const { model } = context;
    const hasSubheadings = model.headings.some(heading => heading.level >= 2);
    if (model.wordCount <= 300 && !hasSubheadings) {
        return notApplicable('subheadingDistribution', 'structure', 0);
    }

    const scored = model.sections
        .filter(section => section.words > 0)
        .map(section => {
            let score = 100;
            if (section.words > 300) score = decreasingScore(section.words, 300, 600);
            else if (section.words < 80 && section.heading) score = ratioScore(section.words, 80);
            notePassage(context, section, 'subheadingDistribution', score);
            return { section, score };
        });
    if (!scored.length) return notApplicable('subheadingDistribution', 'structure', 0);

    const offenders = scored.filter(item => item.score < 100);
    const average = scored.reduce((sum, item) => sum + item.score, 0) / scored.length;
    const check = makeCheck('subheadingDistribution', 'structure', average, offenders.length,
        offenders.map(item => sectionBodyRange(item.section)));
    // Message : la cause dominante (sections trop longues prioritaires)
    if (check.status !== 'good' && offenders.length) {
        check.messageKey = offenders.some(item => item.section.words > 300) ? 'tooLong' : 'tooShort';
    }
    return check;
}

// Réponse d'abord : le 1er bloc de chaque section titrée répond directement —
// paragraphe de 30-80 mots (proportionnel en dessous, décroît jusqu'à 0 à 160),
// ou liste / tableau, éventuellement introduit par une phrase courte.
// Sections sans contenu propre ignorées. na si < 2 sections titrées.
// value : nb de sections dont l'ouverture n'est pas une réponse directe.
function answerFirst(context) {
    const sections = context.model.sections.filter(section => section.heading && section.blocks.length);
    if (sections.length < 2) return notApplicable('answerFirst', 'structure', 0);

    let total = 0;
    const offenders = [];
    for (const section of sections) {
        const [first, second] = section.blocks;
        let score;
        if (isStructured(first)) score = 100;
        else if (first.words < 30) score = second && isStructured(second) ? 100 : ratioScore(first.words, 30);
        else if (first.words <= 80) score = 100;
        else score = decreasingScore(first.words, 80, 160);
        notePassage(context, section, 'answerFirst', score);
        total += score;
        if (score < 80) offenders.push({ from: first.from, to: first.to });
    }
    return makeCheck('answerFirst', 'structure', total / sections.length, offenders.length, offenders);
}

function isStructured(block) {
    return block.container === 'list' || block.container === 'orderedList' || block.container === 'table';
}

// Passages autonomes : une section ne doit pas dépendre du texte qui précède —
// ouverture par un pronom de reprise (Cela, Ce dernier, Ils, These…) ou renvoi
// explicite (« ci-dessus », « as mentioned above »). Score = % de sections
// sans dépendance. value : nb d'occurrences (surlignées).
function selfContained(context) {
    const { model, wordLists } = context;
    const sections = model.sections.filter(section => section.blocks.length);
    if (!sections.length || !sections.some(section => section.heading)) {
        return notApplicable('selfContained', 'structure', 0);
    }

    const ranges = [];
    let dependent = 0;
    for (const section of sections) {
        const before = ranges.length;
        const first = section.blocks[0];
        if (section.heading) {
            const leading = first.text.length - first.text.trimStart().length;
            const opener = findListMatches(first.text, wordLists.anaphoraOpeners).find(match => match.start === leading);
            if (opener) ranges.push(blockRange(first, opener));
        }
        for (const block of section.blocks) {
            for (const match of findListMatches(block.text, wordLists.backReferences)) {
                ranges.push(blockRange(block, match));
            }
        }
        const isDependent = ranges.length > before;
        if (isDependent) dependent++;
        if (section.heading) notePassage(context, section, 'selfContained', isDependent ? 0 : 100);
    }
    const score = (1 - dependent / sections.length) * 100;
    return makeCheck('selfContained', 'structure', score, ranges.length, ranges);
}

// Résumé en tête : bloc « En bref / À retenir / Key takeaways » avant le 1er
// sous-titre (ou comme 1er sous-titre) → 100 ; sinon introduction courte
// (≤ 100 mots, décroît jusqu'à 0 à 250) contenant le mot-clé (plafond 60 sans).
// na si < 300 mots. value : nb de mots de l'introduction.
function keyTakeaways(context) {
    const { model, wordLists, phrases, matchOptions } = context;
    if (model.wordCount < 300) return notApplicable('keyTakeaways', 'structure', 0);

    const intro = model.sections[0] && !model.sections[0].heading ? model.sections[0] : null;
    const firstHeaded = model.sections.find(section => section.heading);
    const candidates = [...(intro ? intro.blocks.map(block => block.text) : []), firstHeaded ? firstHeaded.heading.text : ''];
    if (candidates.some(text => findListMatches(text, wordLists.takeawayMarkers).length)) {
        return makeCheck('keyTakeaways', 'structure', 100, intro ? intro.words : 0);
    }
    if (!intro) {
        const check = makeCheck('keyTakeaways', 'structure', 0, 0);
        check.messageKey = 'noIntro';
        return check;
    }

    let score = intro.words <= 100 ? 100 : decreasingScore(intro.words, 100, 250);
    let missingKeyword = false;
    if (phrases.length && !intro.blocks.some(block => findKeywordInBlock(block, phrases, matchOptions).count)) {
        missingKeyword = true;
        score = Math.min(score, 60);
    }
    const check = makeCheck('keyTakeaways', 'structure', score, intro.words,
        score < 100 ? [sectionBodyRange(intro)] : []);
    if (missingKeyword && intro.words <= 100) check.messageKey = 'missingKeyword';
    return check;
}

function sectionBodyRange(section) {
    const blocks = section.blocks;
    return { from: blocks[0].from, to: blocks[blocks.length - 1].to };
}

function blockRange(block, match) {
    return { from: mapOffsetToPos(block, match.start), to: mapOffsetToPos(block, match.end) };
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

// Format adapté au contenu (featured snippets, extraction GEO) : un contenu
// procédural (titres « étapes », « how to »…) attend une liste numérotée, un
// comparatif (« vs », « comparatif »…) un tableau ; sans signal, au moins une
// liste ou un tableau. Attente manquée → 50 (partagé au prorata si deux).
// value : nombre de listes + tableaux (détail dans stats).
function structuredContent(context) {
    const { model, wordLists } = context;
    const count = model.listCount + model.tableCount;
    if (model.wordCount < 300) return notApplicable('structuredContent', 'structure', count);

    const headingsText = model.headings.map(heading => heading.text).join('\n');
    const procedural = findListMatches(headingsText, wordLists.procedureWords).length > 0;
    const comparative = findListMatches(headingsText, wordLists.comparisonWords).length > 0;
    const expectations = [];
    if (procedural) expectations.push(model.orderedListCount > 0);
    if (comparative) expectations.push(model.tableCount > 0);
    if (!expectations.length) expectations.push(count >= 1);

    const met = expectations.filter(Boolean).length;
    const check = makeCheck('structuredContent', 'structure', 50 + (50 * met) / expectations.length, count);
    if (procedural && !model.orderedListCount) check.messageKey = 'missingOrderedList';
    else if (comparative && !model.tableCount) check.messageKey = 'missingTable';
    return check;
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
