import { imagesChecks } from './checks/images.js';
import { keywordChecks } from './checks/keyword.js';
import { classifyLinks, linksChecks } from './checks/links.js';
import { metaChecks } from './checks/meta.js';
import { secondaryChecks } from './checks/secondary.js';
import { structureChecks } from './checks/structure.js';
import { extractModel, findPhrasesInModel } from './extractors.js';
import { getMessage } from './messages.js';
import { aggregateScore, categoryScores, gradeFromScore } from './scoring.js';
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
        ...linksChecks(context),
        ...imagesChecks(context),
        ...keywordChecks(context),
        ...secondaryChecks(context),
        ...metaChecks(context),
    ];

    const rangesMap = {};
    const exposedChecks = checks.map(check => {
        rangesMap[check.id] = check.ranges || [];
        return {
            id: check.id,
            category: check.category,
            status: check.status,
            score: typeof check.score === 'number' ? Math.round((check.score / 9) * 100) : null,
            value: check.value ?? null,
            matchCount: (check.ranges || []).length,
            message: getMessage(check, options.lang),
        };
    });

    const score = aggregateScore(checks);
    const result = {
        score,
        grade: gradeFromScore(score),
        scores: categoryScores(checks),
        checks: exposedChecks,
        stats: buildStats(model, options, phrases),
    };

    return { result, rangesMap };
}

function normalizeOptions(raw) {
    return {
        keyword: cleanString(raw.keyword),
        synonyms: cleanStringArray(raw.synonyms),
        secondaryKeywords: cleanStringArray(raw.secondaryKeywords),
        metaTitle: cleanString(raw.metaTitle),
        metaDescription: cleanString(raw.metaDescription),
        slug: cleanString(raw.slug),
        siteDomain: cleanString(raw.siteDomain),
        lang: raw.lang === 'fr' ? 'fr' : 'en',
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
        readingTimeMinutes: Math.max(1, Math.round(model.wordCount / 200)),
    };
}
