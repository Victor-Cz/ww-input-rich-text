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

// Yoast : aucun lien sortant → rouge (3), tous nofollow → orange (7)
function outboundLinks({ external }) {
    let score;
    if (!external.length) score = 3;
    else if (external.every(isNofollow)) score = 7;
    else score = 9;
    return makeCheck('outboundLinks', 'links', score, external.length, toRanges(external));
}

function internalLinks({ internal }) {
    let score;
    if (!internal.length) score = 3;
    else if (internal.every(isNofollow)) score = 7;
    else score = 9;
    return makeCheck('internalLinks', 'links', score, internal.length, toRanges(internal));
}

// Ancres non descriptives (« cliquez ici », « en savoir plus »…)
function genericAnchors(links, genericList) {
    if (!links.length) return notApplicable('genericAnchors', 'links', 0);
    const genericSet = new Set(genericList.map(anchor => normalizeText(anchor)));
    const offenders = links.filter(link => genericSet.has(normalizeText(link.text).trim()));
    return makeCheck('genericAnchors', 'links', offenders.length ? 6 : 9, offenders.length, toRanges(offenders));
}

function emptyLinks({ empty, all }) {
    if (!all.length) return notApplicable('emptyLinks', 'links', 0);
    return makeCheck('emptyLinks', 'links', empty.length ? 3 : 9, empty.length, toRanges(empty));
}

function toRanges(links) {
    return links.map(link => ({ from: link.from, to: link.to }));
}
