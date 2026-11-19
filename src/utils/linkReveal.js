/**
 * Liens façon Markdown (paramètre linkEditing = inline) : la logique pure,
 * sans vue ni DOM, testée à part (cf. extensions/LinkReveal).
 *
 * - linkRanges : chaque lien du document, en plages continues (texte voisin
 *   portant le même lien = une seule plage) ;
 * - linkRangeAt : la plage du lien autour d'une position ;
 * - resolveHrefInput : ce que devient l'adresse saisie (poser, retirer,
 *   refuser) ;
 * - isMacPlatform : ⌘ ou Ctrl dans le symbole et l'ouverture.
 */
import { sanitizeLinkUrl } from './sanitizeUrl.js';

/** Le mark lien d'un nœud texte (ou null) */
function linkOf(node, linkType) {
    if (!node || !node.isText) return null;
    return node.marks.find(mark => mark.type === linkType) || null;
}

/**
 * @name linkRanges
 * @description Toutes les plages de lien du document : [{ from, to, href }],
 * dans l'ordre. Deux nœuds texte qui se suivent dans le même bloc avec la même
 * adresse (texte en gras au milieu d'un lien, par exemple) font une seule plage.
 */
export function linkRanges(doc, linkType) {
    const ranges = [];
    if (!doc || !linkType) return ranges;
    doc.descendants((node, pos) => {
        const mark = linkOf(node, linkType);
        if (!mark) return;
        const href = mark.attrs.href || '';
        const last = ranges[ranges.length - 1];
        if (last && last.to === pos && last.href === href) {
            last.to = pos + node.nodeSize;
        } else {
            ranges.push({ from: pos, to: pos + node.nodeSize, href });
        }
    });
    return ranges;
}

/**
 * @name linkRangeAt
 * @description La plage du lien qui contient pos, bornes comprises (le curseur
 * juste avant ou juste après le texte du lien compte comme dedans), ou null.
 * Un lien coupé par autre chose qu'un nœud texte reste deux plages.
 */
export function linkRangeAt(doc, pos, linkType) {
    return linkRanges(doc, linkType).find(range => pos >= range.from && pos <= range.to) || null;
}

/**
 * @name rangeForSelection
 * @description La plage du lien que la sélection [from, to] touche entièrement
 * (curseur ou sélection dans un même lien), ou null.
 */
export function rangeForSelection(doc, from, to, linkType) {
    const range = linkRangeAt(doc, from, linkType);
    if (!range) return null;
    return to >= range.from && to <= range.to ? range : null;
}

/**
 * @name resolveHrefInput
 * @description Ce que devient l'adresse saisie dans le champ :
 * - vide → { action: 'remove' } (le lien est retiré) ;
 * - dangereuse (javascript:, data:…) → { action: 'reject' } : rien ne change ;
 * - sinon → { action: 'set', href } (adresse nettoyée).
 */
export function resolveHrefInput(value) {
    const raw = typeof value === 'string' ? value.trim() : '';
    if (!raw) return { action: 'remove' };
    const href = sanitizeLinkUrl(raw);
    return href ? { action: 'set', href } : { action: 'reject' };
}

/**
 * @name isMacPlatform
 * @description Vrai sur Mac (⌘), faux ailleurs (Ctrl). Lit userAgentData si
 * le navigateur le fournit, sinon platform puis userAgent.
 */
export function isMacPlatform(nav) {
    if (!nav) return false;
    const platform = nav.userAgentData?.platform || nav.platform || nav.userAgent || '';
    return /mac|iphone|ipad|ipod/i.test(platform);
}
