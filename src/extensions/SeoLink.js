/**
 * Link extension with SEO-correct `target`/`rel`, computed per link.
 *
 * Tiptap's default is `target="_blank" rel="noopener noreferrer nofollow"` on
 * EVERY link. On internal links that is harmful: `nofollow` blocks the internal
 * PageRank flow (the very thing the internal-links SEO check rewards) and
 * `_blank` breaks in-site navigation.
 *
 * Since `target`/`rel` are mark attributes stored in the HTML, a config change
 * alone would only fix new links — legacy content would keep its `nofollow`
 * forever. Computing them at render time instead means stored values are
 * overridden on the fly, so existing content is normalized as it is rendered
 * and re-serialized.
 *
 * The href itself is never rewritten: an internal link keeps whatever URL the
 * author typed (absolute URLs stay absolute).
 */
import Link from '@tiptap/extension-link';
import { isInternalHref } from '../utils/linkDomain.js';

export const SeoLink = Link.extend({
    addOptions() {
        return {
            ...this.parent?.(),
            // Bare domain, full URL, or a getter (the site domain is bindable,
            // so reading it at render time keeps it in sync without a watcher).
            siteDomain: '',
            externalTarget: '_blank',
            externalRel: 'noopener noreferrer',
        };
    },

    renderHTML(props) {
        const rendered = this.parent(props);
        const attributes = rendered[1];
        if (!attributes || typeof attributes !== 'object') return rendered;

        const { siteDomain, externalTarget, externalRel } = this.options;
        const domain = typeof siteDomain === 'function' ? siteDomain() : siteDomain;

        if (isInternalHref(attributes.href, domain)) {
            // Ordinary in-site link: no target, no rel.
            delete attributes.target;
            delete attributes.rel;
        } else {
            attributes.target = externalTarget;
            // No `nofollow` by default: an editorial link to a quality source is
            // a positive signal. Reserve nofollow/sponsored for paid, affiliate
            // or untrusted links by overriding `externalRel`.
            attributes.rel = externalRel;
        }
        return rendered;
    },
});

export default SeoLink;
