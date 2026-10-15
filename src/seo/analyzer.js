import { headingsChecks } from './checks/headings.js';
import { imagesChecks } from './checks/images.js';
import { keywordChecks } from './checks/keyword.js';
import { classifyLinks, linksChecks } from './checks/links.js';
import { metaChecks } from './checks/meta.js';
import { fleschReadingScore, readabilityChecks } from './checks/readability.js';
import { structureChecks } from './checks/structure.js';
import { extractModel, findKeywordInModel } from './extractors.js';
import { MATCHING_MODES } from './textUtils.js';
import { getCategoryLabels, getLabels, getMessage } from './i18n/index.js';
import { aggregateScore, capGrade, categoryScores, checkWeight, criticalIssues, gradeFromScore } from './scoring.js';
import { getWordLists } from './wordlists.js';

/**
 * Analyse SEO complète d'un document ProseMirror.
 *
 * @param {Node} doc - document ProseMirror (editor.state.doc)
 * @param {Object} rawOptions - { keyword, synonyms, secondaryKeywords, metaTitle,
 *   metaDescription, slug, siteDomain, lang, wordLists, expectH1, keywordMatching,
 *   secondaryMatching }
 * @returns {{ result: Object, rangesMap: Object }} - `result` est la valeur exposée
 *   dans la variable `seo` ; `rangesMap` associe chaque check id (et chaque id de
 *   mot-clé secondaire, `secondaryKeyword:<terme>`) à ses plages doc pour le
 *   surlignage (non exposé : positions volatiles).
 */
export function analyzeSeo(doc, rawOptions = {}) {
    const options = normalizeOptions(rawOptions);
    const wordLists = getWordLists(options.lang, options.wordLists);
    const model = extractModel(doc);

    const phrases = options.keyword ? [options.keyword, ...options.synonyms] : [];
    // Options de matching, partagées par tous les checks : une pour le mot-clé
    // principal (+ synonymes), une pour les secondaires — chacune son mode.
    const matchOptions = { stopWords: wordLists.stopWords, mode: options.keywordMatching };
    const secondaryMatchOptions = { stopWords: wordLists.stopWords, mode: options.secondaryMatching };
    // Occurrences du mot-clé (+ synonymes) dans tout le document, { count, ranges } :
    // calculées une seule fois, partagées entre les checks keyword et les stats.
    const keywordMatches = phrases.length
        ? findKeywordInModel(model, phrases, matchOptions)
        : { count: 0, ranges: [] };
    const context = { model, options, phrases, wordLists, matchOptions, secondaryMatchOptions, keywordMatches };

    const checks = [
        ...structureChecks(context),
        ...headingsChecks(context),
        ...readabilityChecks(context),
        ...linksChecks(context),
        ...imagesChecks(context),
        ...keywordChecks(context),
        ...metaChecks(context),
    ];

    const rangesMap = {};
    // Détail par mot-clé secondaire : chacun a sa propre entrée de surlignage,
    // pour cibler un seul terme avec highlightSeoCheck.
    const secondaryTerms = checks.find(check => check.id === 'secondaryKeywords')?.terms || [];
    for (const term of secondaryTerms) {
        rangesMap[secondaryKeywordId(term.term)] = term.ranges;
    }
    const exposedChecks = checks.map(check => {
        rangesMap[check.id] = check.ranges || [];
        const labels = getLabels(check.id, options.uiLang);
        // Par défaut une plage = une occurrence ; les checks du mot-clé principal
        // surlignent ses mots un par un et donnent leur propre compte.
        const matchCount = check.matchCount ?? (check.ranges || []).length;
        return {
            id: check.id,
            title: labels.title,
            description: labels.description,
            objective: labels.objective,
            category: check.category,
            status: check.status,
            score: typeof check.score === 'number' ? check.score : null,
            weight: checkWeight(check.id),
            value: check.value ?? null,
            target: check.target ?? null,
            matchCount,
            // L'action highlightSeoCheck a des occurrences à montrer dans l'éditeur
            clickable: matchCount > 0,
            message: getMessage(check, options.uiLang),
        };
    });

    const score = aggregateScore(checks);
    const scores = categoryScores(checks);
    const critical = criticalIssues(checks);
    const result = {
        score,
        // Un check critique en échec interdit le vert, quel que soit le score
        grade: capGrade(gradeFromScore(score), critical.length > 0),
        criticalIssues: critical,
        scores,
        categories: Object.entries(scores).map(([category, categoryScore]) => {
            const labels = getCategoryLabels(category, options.uiLang);
            const hasCritical = checks.some(
                check => check.category === category && critical.includes(check.id)
            );
            return {
                id: category,
                name: labels.name,
                description: labels.description,
                score: categoryScore,
                grade: capGrade(gradeFromScore(categoryScore), hasCritical),
            };
        }),
        checks: exposedChecks,
        stats: buildStats(model, options, keywordMatches),
        keywords: {
            main: phrases.length
                ? {
                      term: options.keyword,
                      occurrences: keywordMatches.count,
                      density: keywordDensity(keywordMatches, model),
                  }
                : null,
            secondary: secondaryTerms.map(({ term, count, found }) => ({
                // Identifiant accepté par highlightSeoCheck (surligne ce terme seul)
                id: secondaryKeywordId(term),
                term,
                count,
                found,
            })),
        },
    };

    return { result, rangesMap };
}

function secondaryKeywordId(term) {
    return `secondaryKeyword:${term}`;
}

// Densité du mot-clé principal (+ synonymes), en % arrondi à 2 décimales
function keywordDensity(keywordMatches, model) {
    return model.wordCount ? Math.round((keywordMatches.count / model.wordCount) * 10000) / 100 : 0;
}

function normalizeOptions(raw) {
    const lang = raw.lang === 'fr' ? 'fr' : 'en';
    return {
        keyword: cleanString(raw.keyword),
        synonyms: cleanStringArray(raw.synonyms),
        secondaryKeywords: cleanStringArray(raw.secondaryKeywords),
        metaTitle: cleanString(raw.metaTitle),
        metaDescription: cleanString(raw.metaDescription),
        siteDomain: cleanString(raw.siteDomain),
        lang,
        // Langue des textes exposés (title / description / message) —
        // 'auto' ou absent : suit la langue d'analyse.
        uiLang: raw.uiLang === 'fr' || raw.uiLang === 'en' ? raw.uiLang : lang,
        wordLists: raw.wordLists && typeof raw.wordLists === 'object' ? raw.wordLists : null,
        expectH1: !!raw.expectH1,
        // Correspondance des mots-clés : 'exact' | 'stopWords' | 'anyOrder'
        keywordMatching: MATCHING_MODES.includes(raw.keywordMatching) ? raw.keywordMatching : 'anyOrder',
        secondaryMatching: MATCHING_MODES.includes(raw.secondaryMatching) ? raw.secondaryMatching : 'exact',
    };
}

function cleanString(value) {
    return typeof value === 'string' ? value.trim() : '';
}

// Accepte un tableau ou une chaîne séparée par des virgules
function cleanStringArray(value) {
    if (typeof value === 'string') value = value.split(',');
    if (!Array.isArray(value)) return [];
    return value.map(item => String(item ?? '').trim()).filter(Boolean);
}

function buildStats(model, options, keywordMatches) {
    const headings = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
    for (const heading of model.headings) {
        const key = `h${heading.level}`;
        if (key in headings) headings[key]++;
    }

    const { external, internal } = classifyLinks(model.links, options.siteDomain);

    return {
        wordCount: model.wordCount,
        charCount: model.charCount,
        sentenceCount: model.sentences.length,
        paragraphCount: model.paragraphs.length,
        headings,
        lists: model.listCount,
        tables: model.tableCount,
        images: model.images.length,
        imagesWithoutAlt: model.images.filter(image => !image.alt).length,
        internalLinks: internal.length,
        externalLinks: external.length,
        keywordOccurrences: keywordMatches.count,
        keywordDensity: keywordDensity(keywordMatches, model),
        fleschScore: fleschReadingScore(model, options.lang),
        readingTimeMinutes: Math.max(1, Math.round(model.wordCount / 200)),
    };
}
