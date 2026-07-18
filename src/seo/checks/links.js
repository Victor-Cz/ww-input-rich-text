import { makeCheck, notApplicable, ratioScore } from '../result.js';
import { normalizeText } from '../textUtils.js';

// Catégorie "links" — aucun mot-clé requis.

export function linksChecks(context) {
    const { model, options, wordLists } = context;
    const classified = classifyLinks(model.links, options.siteDomain);
    return [
        outboundLinks(classified, model.wordCount),
        internalLinks(classified, model.wordCount),
        genericAnchors(model.links, wordLists.genericAnchors),
        emptyLinks(classified),
    ];
}

export function classifyLinks(links, siteDomain) {
    const domain = normalizeDomain(siteDomain);
    const external = [];
    const internal = [];
    const empty = [];

    for (const link of links) {
        const href = (link.href || '').trim();
        if (!href || href === '#') {
            empty.push(link);
            continue;
        }
        if (/^(mailto:|tel:)/i.test(href)) continue;

        const linkDomain = extractDomain(href);
        if (!linkDomain) {
            // URL relative ou ancre → interne
            internal.push(link);
        } else if (domain && linkDomain === domain) {
            internal.push(link);
        } else {
            external.push(link);
        }
    }
    return { external, internal, empty, all: links };
}

// Accepte un domaine nu ou une URL complète (https://www.monsite.com/page)
function normalizeDomain(domain) {
    if (!domain) return null;
    return String(domain)
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .split(':')[0] || null;
}

function extractDomain(href) {
    const match = /^https?:\/\/([^/]+)/i.exec(href);
    if (!match) return null;
    return match[1].toLowerCase().replace(/^www\./, '');
}

// Nombre de liens sortants vs attendu : 1 par ~1000 mots (minimum 1).
// Score proportionnel. value : nombre de liens sortants.
function outboundLinks({ external }, wordCount) {
    const expected = Math.max(1, Math.floor(wordCount / 1000));
    return makeCheck('outboundLinks', 'links', ratioScore(external.length, expected), external.length, toRanges(external));
}

// Nombre de liens internes vs attendu : 1 par ~500 mots (minimum 1).
// Score proportionnel. value : nombre de liens internes.
function internalLinks({ internal }, wordCount) {
    const expected = Math.max(1, Math.floor(wordCount / 500));
    return makeCheck('internalLinks', 'links', ratioScore(internal.length, expected), internal.length, toRanges(internal));
}

// Ancres non descriptives (« cliquez ici », « en savoir plus »…).
// Score = proportion d'ancres propres.
function genericAnchors(links, genericList) {
    if (!links.length) return notApplicable('genericAnchors', 'links', 0);
    const genericSet = new Set(genericList.map(anchor => normalizeText(anchor)));
    const offenders = links.filter(link => genericSet.has(normalizeText(link.text).trim()));
    const score = (1 - offenders.length / links.length) * 100;
    return makeCheck('genericAnchors', 'links', score, offenders.length, toRanges(offenders));
}

// Score = proportion de liens valides
function emptyLinks({ empty, all }) {
    if (!all.length) return notApplicable('emptyLinks', 'links', 0);
    const score = (1 - empty.length / all.length) * 100;
    return makeCheck('emptyLinks', 'links', score, empty.length, toRanges(empty));
}

function toRanges(links) {
    return links.map(link => ({ from: link.from, to: link.to }));
}
