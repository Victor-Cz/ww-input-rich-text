/**
 * URL sanitization utilities — protection against injection (XSS) attacks.
 *
 * Rich-text editors are a prime XSS target: a malicious URL such as
 * `javascript:alert(document.cookie)` placed in a link or an image source can
 * run arbitrary script when the value is later opened (`window.open`), bound to
 * an `<a href>`/`<img src>`, or re-rendered. These helpers normalize a URL and
 * reject any dangerous protocol BEFORE it is stored in the document, opened, or
 * rendered. Always sanitize at the input boundary (defense in depth) — never
 * trust that downstream rendering will strip the danger for you.
 */

// Protocols that can execute script or smuggle active content. Matched after
// stripping control/whitespace characters that browsers ignore when parsing a
// URL scheme (e.g. `java\tscript:` or `java\nscript:`).
const DANGEROUS_PROTOCOLS = ['javascript:', 'vbscript:', 'data:', 'file:', 'blob:'];

// Control and Unicode whitespace characters that browsers strip from URLs when
// resolving the protocol. Removing them prevents `java\tscript:` style bypasses.
// Built from a \u-escaped string so the source contains no literal control chars.
// Mirrors DOMPurify's ATTR_WHITESPACE regex.
// eslint-disable-next-line prefer-regex-literals
const ATTR_WHITESPACE = new RegExp(
    '[\\u0000-\\u0020\\u00A0\\u1680\\u180E\\u2000-\\u2029\\u205F\\u3000]',
    'g'
);

/**
 * Returns true when the URL uses a protocol we consider unsafe to open/render.
 * Relative URLs, fragments, mailto/tel/http(s)/ftp, etc. are considered safe.
 *
 * @param {string} url
 * @param {string[]} [extraDangerous] additional protocol prefixes to forbid
 * @returns {boolean}
 */
export function isDangerousUrl(url, extraDangerous = []) {
    if (typeof url !== 'string') return false;

    // Strip characters browsers ignore, then lowercase to normalize the scheme.
    const normalized = url.replace(ATTR_WHITESPACE, '').trim().toLowerCase();
    if (!normalized) return false;

    const blocked = [...DANGEROUS_PROTOCOLS, ...extraDangerous];
    return blocked.some(proto => normalized.startsWith(proto));
}

/**
 * Sanitizes a hyperlink URL. Returns the original (trimmed) URL when it is safe,
 * or an empty string when it uses a dangerous protocol. An empty string is the
 * caller's signal to skip creating/opening the link.
 *
 * @param {string} url
 * @returns {string} safe URL or '' when blocked
 */
export function sanitizeLinkUrl(url) {
    if (typeof url !== 'string') return '';
    const trimmed = url.trim();
    if (!trimmed) return '';
    if (isDangerousUrl(trimmed)) {
        // eslint-disable-next-line no-console
        console.warn('[sanitizeUrl] Blocked potentially malicious link URL:', trimmed);
        return '';
    }
    return trimmed;
}

/**
 * Sanitizes an image source. Same rules as links, but `data:image/*` URIs are
 * allowed because they are a legitimate (and inert) way to inline images.
 * `data:image/svg+xml` is rejected because SVG can carry inline <script>, and
 * any other `data:` payload (e.g. `data:text/html`) is rejected too.
 *
 * @param {string} src
 * @returns {string} safe src or '' when blocked
 */
export function sanitizeImageSrc(src) {
    if (typeof src !== 'string') return '';
    const trimmed = src.trim();
    if (!trimmed) return '';

    const normalized = trimmed.replace(ATTR_WHITESPACE, '').trim().toLowerCase();

    // Allow inline raster images, but NOT data:image/svg+xml which can carry
    // inline <script>. Everything else under data: is rejected below.
    if (normalized.startsWith('data:image/') && !normalized.startsWith('data:image/svg')) {
        return trimmed;
    }

    if (isDangerousUrl(trimmed)) {
        // eslint-disable-next-line no-console
        console.warn('[sanitizeUrl] Blocked potentially malicious image src:', trimmed);
        return '';
    }
    return trimmed;
}

/**
 * Safely opens a URL in a new tab, refusing dangerous protocols. Use everywhere
 * a (possibly attacker-controlled) link is opened programmatically.
 *
 * @param {string} url
 * @returns {boolean} true when the URL was opened, false when blocked
 */
export function safeOpenUrl(url) {
    const safe = sanitizeLinkUrl(url);
    if (!safe) return false;
    window.open(safe, '_blank', 'noopener,noreferrer');
    return true;
}
