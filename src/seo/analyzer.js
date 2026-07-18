import { headingsChecks } from './checks/headings.js';
import { imagesChecks } from './checks/images.js';
import { keywordChecks } from './checks/keyword.js';
import { classifyLinks, linksChecks } from './checks/links.js';
import { metaChecks } from './checks/meta.js';
import { fleschReadingScore, readabilityChecks } from './checks/readability.js';
import { structureChecks } from './checks/structure.js';
import { extractModel, findPhrasesInModel } from './extractors.js';
import { getCategoryLabels, getLabels, getMessage } from './i18n/index.js';
import { aggregateScore, capGrade, categoryScores, checkWeight, criticalIssues, gradeFromScore } from './scoring.js';
import { getWordLists } from './wordlists.js';

/**
 * Analyse SEO complète d'un document ProseMirror.
 *
 * @param {Node} doc - document ProseMirror (editor.state.doc)
 * @param {Object} rawOptions - { keyword, synonyms, secondaryKeywords, metaTitle,
 *   metaDescription, slug, siteDomain, lang, wordLists, expectH1 }
 * @returns {{ result: Object, rangesMap: Object }} - `result` est la valeur exposée
 *   dans la variable `seo` ; `rangesMap` associe chaque check id à ses plages doc
 *   pour le surlignage (non exposé : positions volatiles).
 */
export function analyzeSeo(doc, rawOptions = {}) {
    const options = normalizeOptions(rawOptions);
    const wordLists = getWordLists(options.lang, options.wordLists);
    const model = extractModel(doc);

    const phrases = options.keyword ? [options.keyword, ...options.synonyms] : [];
    const context = { model, options, phrases, wordLists };

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
    const exposedChecks = checks.map(check => {
        rangesMap[check.id] = check.ranges || [];
        const labels = getLabels(check.id, options.uiLang);
        const matchCount = (check.ranges || []).length;
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
        stats: buildStats(model, options, phrases),
    };

    return { result, rangesMap };
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

function buildStats(model, options, phrases) {
    const headings = { h1: 0, h2: 0, h3: 0, h4: 0, h5: 0, h6: 0 };
    for (const heading of model.headings) {
        const key = `h${heading.level}`;
        if (key in headings) headings[key]++;
    }

    const { external, internal } = classifyLinks(model.links, options.siteDomain);
    const keywordOccurrences = phrases.length ? findPhrasesInModel(model, phrases).length : 0;

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
        keywordOccurrences,
        keywordDensity: model.wordCount
            ? Math.round((keywordOccurrences / model.wordCount) * 10000) / 100
            : 0,
        fleschScore: fleschReadingScore(model, options.lang),
        readingTimeMinutes: Math.max(1, Math.round(model.wordCount / 200)),
    };
}
