import { makeCheck, notApplicable } from '../result.js';
import { normalizeText } from '../textUtils.js';

// Catégorie "links" — aucun mot-clé requis.

export function linksChecks(context) {
    const { model, options, wordLists } = context;
    const classified = classifyLinks(model.links, options.siteDomain);
    return [
        outboundLinks(classified),
        internalLinks(classified),
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

function normalizeDomain(domain) {
    if (!domain) return null;
    return String(domain)
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .trim() || null;
}

function extractDomain(href) {
    const match = /^https?:\/\/([^/]+)/i.exec(href);
    if (!match) return null;
    return match[1].toLowerCase().replace(/^www\./, '');
}

function isNofollow(link) {
    return /\bnofollow\b/i.test(link.rel || '');
}

// Aucun lien sortant → 0, tous nofollow → 60, au moins un suivi → 100
function outboundLinks({ external }) {
    let score;
    if (!external.length) score = 0;
    else if (external.every(isNofollow)) score = 60;
    else score = 100;
    return makeCheck('outboundLinks', 'links', score, external.length, toRanges(external));
}

function internalLinks({ internal }) {
    let score;
    if (!internal.length) score = 0;
    else if (internal.every(isNofollow)) score = 60;
    else score = 100;
    return makeCheck('internalLinks', 'links', score, internal.length, toRanges(internal));
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
