/**
 * Domain helpers shared by the SEO link checks and the link rendering.
 *
 * A link is "internal" when it points to the site itself: relative URL, anchor,
 * or absolute URL on the configured domain. Internal links must stay ordinary
 * (`<a href>` with no `target`/`rel`) — `nofollow` would cut the internal
 * PageRank flow, and `_blank` piles up tabs during in-site navigation.
 * External links get `target="_blank"` + `rel="noopener noreferrer"`.
 */

/**
 * Accepts a bare domain or a full URL (https://www.monsite.com/page) and
 * returns the normalized host (lowercase, no scheme, no `www.`, no port/path).
 *
 * @param {string} domain
 * @returns {string|null}
 */
export function normalizeDomain(domain) {
    if (!domain) return null;
    return String(domain)
        .trim()
        .toLowerCase()
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0]
        .split(':')[0] || null;
}

/**
 * Host of an absolute http(s) URL, or null when the URL is relative.
 *
 * @param {string} href
 * @returns {string|null}
 */
export function extractDomain(href) {
    const match = /^https?:\/\/([^/]+)/i.exec(href);
    if (!match) return null;
    return match[1].toLowerCase().replace(/^www\./, '');
}

// Schemes that are neither internal nor external navigation: they never need
// target/rel.
const NON_NAVIGATION = /^(mailto:|tel:|sms:)/i;

/**
 * True when the link should be rendered as an ordinary in-site link (no
 * `target`, no `rel`). Covers relative URLs, anchors, mailto/tel, and absolute
 * URLs matching `siteDomain`.
 *
 * When `siteDomain` is not configured, falls back to the current host — correct
 * on the published site, inert inside the WeWeb editor (whose host is not the
 * site's), which is why configuring the domain is the reliable path.
 *
 * @param {string} href
 * @param {string} [siteDomain] bare domain or full URL
 * @returns {boolean}
 */
export function isInternalHref(href, siteDomain) {
    const url = typeof href === 'string' ? href.trim() : '';
    if (!url) return true;
    if (NON_NAVIGATION.test(url)) return true;

    // Protocol-relative (//example.com/page) resolves against the current
    // scheme, so it is an absolute link to that host.
    const protocolRelative = /^\/\/([^/]+)/.exec(url);
    const linkDomain = protocolRelative
        ? protocolRelative[1].toLowerCase().replace(/^www\./, '')
        : extractDomain(url);

    // Relative URL or anchor.
    if (!linkDomain) return true;

    const configured = normalizeDomain(siteDomain);
    if (configured) return linkDomain === configured;

    const currentHost = typeof window !== 'undefined' ? window?.location?.host : null;
    const fallback = normalizeDomain(currentHost);
    return fallback ? linkDomain === fallback : false;
}
