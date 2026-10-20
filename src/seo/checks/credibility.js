import { mapOffsetToPos } from '../extractors.js';
import { makeCheck, notApplicable, ratioScore } from '../result.js';
import { countWords, findListMatches } from '../textUtils.js';
import { classifyLinks } from './links.js';

// Catégorie "credibility" — faits, sources, citations, fraîcheur : ce qui rend
// un passage digne d'être cité (leviers mesurés par le papier GEO, KDD 2024) et
// le volet « confiance » d'E-E-A-T. Aucun mot-clé requis.
// Règle : ne rien récompenser qui s'invente — un chiffre non sourcé coûte plus
// cher qu'une absence de chiffre (sourcedFacts critique, factDensity standard).

export function credibilityChecks(context) {
    const { model, options, wordLists } = context;
    const facts = findFacts(model);
    return [
        factDensity(model, facts),
        sourcedFacts(model, facts, options.siteDomain, wordLists),
        quotations(model, wordLists),
        freshness(model, options),
        entityDensity(model),
    ];
}

// Fait chiffré : nombre suivi d'une unité, d'un %, d'une devise ou d'un
// dénombrement (« 3 jours », « 45 % », « 2 millions », « 1 200 clients »),
// devise avant le nombre (« $5 »), ou ratio (« 1 sur 3 »). Années seules et
// numérotation exclues (pas d'unité).
const NUMBER = String.raw`\d+(?:[.,   ]\d{3})*(?:[.,]\d+)?`;
const UNITS = [
    '%', '‰', '€', '\\$', '£', 'k€', 'm€', 'md€', 'k', 'km', 'kg', 'mg', 'ms', 'go', 'gb', 'mo', 'mb', '°c', '°f',
    'millions?', 'milliards?', 'mds?', 'thousands?', 'billions?', 'euros?', 'dollars?',
    'heures?', 'hours?', 'h', 'min', 'minutes?', 'secondes?', 'seconds?', 'jours?', 'days?',
    'semaines?', 'weeks?', 'mois', 'months?', 'ans', 'années', 'years?', 'fois', 'times', 'x',
    'points?', 'pts', 'personnes', 'people', 'users', 'utilisateurs', 'clients', 'customers',
    'entreprises', 'companies', 'salariés', 'employees',
].join('|');
const FACT_REGEX = new RegExp(
    String.raw`(?<![\p{L}\p{N}])(?:[$€£]\s?${NUMBER}|${NUMBER}\s?(?:${UNITS})|${NUMBER}\s(?:sur|out of)\s${NUMBER})(?![\p{L}\p{N}])`,
    'giu'
);

/** Faits chiffrés du modèle : [{ sentence, from, to }] (phrases hors titres et code). */
function findFacts(model) {
    const facts = [];
    for (const sentence of model.sentences) {
        for (const match of sentence.text.matchAll(FACT_REGEX)) {
            const start = sentence.startInBlock + match.index;
            facts.push({
                sentence,
                from: mapOffsetToPos(sentence.block, start),
                to: mapOffsetToPos(sentence.block, start + match[0].length),
            });
        }
    }
    return facts;
}

// Densité de faits chiffrés : cible 1 pour 150 mots — proportionnel.
// na si < 150 mots. value : nb de faits · target : nb visé (faits surlignés).
function factDensity(model, facts) {
    if (model.wordCount < 150) return notApplicable('factDensity', 'credibility', facts.length);
    const expected = Math.max(1, Math.round(model.wordCount / 150));
    const check = makeCheck('factDensity', 'credibility', ratioScore(facts.length, expected), facts.length,
        facts.map(({ from, to }) => ({ from, to })));
    check.target = expected;
    return check;
}

// Faits sourcés : une phrase chiffrée est sourcée si elle ou la suivante (même
// bloc) porte un lien externe ou une attribution (« selon », « d'après »,
// « according to », « étude »…). Score = % de phrases chiffrées sourcées.
// na sans fait chiffré. value : nb de phrases chiffrées orphelines (leurs
// chiffres sont surlignés).
function sourcedFacts(model, facts, siteDomain, wordLists) {
    const factSentences = [...new Set(facts.map(fact => fact.sentence))];
    if (!factSentences.length) return notApplicable('sourcedFacts', 'credibility', 0);

    const { external } = classifyLinks(model.links, siteDomain);
    const isSourced = sentence =>
        external.some(link => link.from < sentence.to && link.to > sentence.from)
        || findListMatches(sentence.text, wordLists.attributionWords).length > 0;

    const indexes = new Map(model.sentences.map((sentence, index) => [sentence, index]));
    const orphans = new Set(factSentences.filter(sentence => {
        if (isSourced(sentence)) return false;
        const next = model.sentences[indexes.get(sentence) + 1];
        return !(next && next.block === sentence.block && isSourced(next));
    }));
    const score = (1 - orphans.size / factSentences.length) * 100;
    return makeCheck('sourcedFacts', 'credibility', score, orphans.size,
        facts.filter(fact => orphans.has(fact.sentence)).map(({ from, to }) => ({ from, to })));
}

const QUOTE_REGEX = /[«“"]\s*([^«»“”"]+?)\s*[»”"]/g;

// Citation d'expert : un bloc de citation, ou un passage entre guillemets
// d'au moins 8 mots dont le bloc nomme sa source (attribution / verbe de
// parole). 100 si au moins une, sinon 0. na si < 600 mots.
// value : nb de citations (surlignées).
function quotations(model, wordLists) {
    if (model.wordCount < 600) return notApplicable('quotations', 'credibility', 0);
    const ranges = [];
    for (const block of model.blocks) {
        if (block.isCode || block.type === 'heading' || !block.text.trim()) continue;
        if (block.container === 'blockquote') {
            ranges.push({ from: block.from, to: block.to });
            continue;
        }
        if (!findListMatches(block.text, wordLists.attributionWords).length) continue;
        for (const match of block.text.matchAll(QUOTE_REGEX)) {
            if (countWords(match[1]) < 8) continue;
            ranges.push({
                from: mapOffsetToPos(block, match.index),
                to: mapOffsetToPos(block, match.index + match[0].length),
            });
        }
    }
    return makeCheck('quotations', 'credibility', ranges.length ? 100 : 0, ranges.length, ranges);
}

const YEAR_REGEX = /(?<![\p{L}\p{N}])(19[5-9]\d|20\d{2})(?![\p{L}\p{N}])/gu;

// Fraîcheur des données : part des années citées postérieures ou égales à
// l'année de référence − 2. Cible 50 % (un historique reste permis) —
// proportionnel. na sans année ou si le contenu est intemporel (`geoEvergreen`).
// Ne pas encourager à glisser l'année : la vraie fraîcheur est `dateModified`.
// value : % d'années récentes (années anciennes surlignées).
function freshness(model, options) {
    if (options.evergreen) return notApplicable('freshness', 'credibility');
    const years = [];
    for (const block of model.blocks) {
        if (block.isCode) continue;
        for (const match of block.text.matchAll(YEAR_REGEX)) {
            years.push({
                year: Number(match[1]),
                from: mapOffsetToPos(block, match.index),
                to: mapOffsetToPos(block, match.index + match[0].length),
            });
        }
    }
    if (!years.length) return notApplicable('freshness', 'credibility', 0);
    const old = years.filter(item => item.year < options.referenceYear - 2);
    const percent = Math.round(((years.length - old.length) / years.length) * 100);
    return makeCheck('freshness', 'credibility', ratioScore(percent, 50), percent,
        old.map(({ from, to }) => ({ from, to })));
}

const WORD_REGEX = /[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu;

// Densité d'entités : noms propres (mot à majuscule hors début de phrase —
// marques, organismes, lieux, personnes) pour 100 mots. Proxy bruité (d'où un
// poids minimal). Cible 1 pour 100 mots — proportionnel. na si < 150 mots.
// value : entités pour 100 mots (1 décimale).
function entityDensity(model) {
    if (model.wordCount < 150) return notApplicable('entityDensity', 'credibility', 0);
    let entities = 0;
    for (const sentence of model.sentences) {
        const words = sentence.text.match(WORD_REGEX) || [];
        for (let i = 1; i < words.length; i++) {
            if (words[i].length >= 2 && /^\p{Lu}/u.test(words[i])) entities++;
        }
    }
    const perHundred = Math.round((entities / model.wordCount) * 1000) / 10;
    return makeCheck('entityDensity', 'credibility', ratioScore(perHundred, 1), perHundred);
}
