import { countWords, splitSentences, findKeywordMatches, findPhraseMatches } from './textUtils.js';

// Extraction d'un modèle intermédiaire depuis le document ProseMirror,
// en une seule traversée. Toutes les positions sont des positions doc,
// directement utilisables pour les décorations de surlignage.

const LIST_TYPES = new Set(['bulletList', 'orderedList', 'taskList']);
const IMAGE_TYPES = new Set(['image', 'customImage']);
// Conteneur d'un bloc (le plus proche) : distingue un paragraphe de liste, de
// tableau ou de citation d'un paragraphe libre.
const CONTAINER_TYPES = {
    orderedList: 'orderedList',
    bulletList: 'list',
    taskList: 'list',
    tableCell: 'table',
    tableHeader: 'table',
    blockquote: 'blockquote',
};

/**
 * Construit le modèle d'analyse :
 * {
 *   blocks:    [{ type, level, from, to, text, segments, words, align, isCode, container }]
 *              container : 'orderedList' | 'list' | 'table' | 'blockquote' | null
 *   headings:  sous-ensemble de blocks (h1-h6)
 *   paragraphs: sous-ensemble de blocks (paragraphes hors code)
 *   sentences: [{ text, from, to, words, block }]
 *   links:     [{ from, to, href, rel, text }]
 *   images:    [{ from, to, src, alt }]
 *   sections:  [{ heading, blocks, words, from, to }] — découpage aux titres H2-H6 ;
 *              la 1re (heading null) est l'introduction
 *   listCount, orderedListCount, tableCount, blockquoteCount, wordCount, charCount, fullText
 * }
 */
export function extractModel(doc) {
    const blocks = [];
    const links = [];
    const images = [];
    let listCount = 0;
    let orderedListCount = 0;
    let tableCount = 0;
    let blockquoteCount = 0;

    doc.descendants((node, pos) => {
        const typeName = node.type.name;

        if (LIST_TYPES.has(typeName)) listCount++;
        if (typeName === 'orderedList') orderedListCount++;
        if (typeName === 'table') tableCount++;
        if (typeName === 'blockquote') blockquoteCount++;

        if (IMAGE_TYPES.has(typeName)) {
            const src = (node.attrs?.src || '').trim();
            // Une image sans URL n'est pas rendue : on la considère absente.
            if (src) {
                images.push({
                    from: pos,
                    to: pos + node.nodeSize,
                    src,
                    alt: (node.attrs?.alt || '').trim(),
                    node: true,
                });
            }
            return false;
        }

        if (!node.isTextblock) return true;

        // Reconstituer le texte du bloc avec la correspondance offset texte → position doc
        const segments = [];
        let text = '';
        node.descendants((child, childPos) => {
            const absolutePos = pos + 1 + childPos;
            if (child.isText && child.text) {
                segments.push({ textStart: text.length, textEnd: text.length + child.text.length, from: absolutePos });
                collectLinkMarks(child, absolutePos, links);
                text += child.text;
            } else if (child.isLeaf) {
                // Nœud inline atomique (mention, hardBreak…) : placeholder pour
                // préserver la séparation des mots ; hors correspondance de position.
                text += typeName === 'hardBreak' ? '\n' : ' ';
            }
            return !child.isText;
        });

        // Un titre sans contenu n'est pas un titre : on l'ignore (n'entre ni
        // dans la hiérarchie, ni comme frontière de section).
        if (typeName === 'heading' && !text.trim()) return false;

        blocks.push({
            type: typeName,
            level: node.attrs?.level || null,
            from: pos,
            to: pos + node.nodeSize,
            text,
            segments,
            words: countWords(text),
            align: node.attrs?.textAlign || null,
            isCode: typeName === 'codeBlock',
            container: findContainer(doc, pos),
        });

        return false;
    });

    return assembleModel({
        blocks,
        links: mergeAdjacentLinks(links),
        images,
        counts: { listCount, orderedListCount, tableCount, blockquoteCount },
    });
}

/**
 * Assemble le modèle d'analyse à partir des blocs, liens et images extraits.
 * Indépendant de ProseMirror : un autre extracteur (HTML côté serveur…) peut
 * produire les mêmes entrées — positions en offsets de texte — et réutiliser
 * toute l'analyse.
 */
export function assembleModel({ blocks, links = [], images = [], counts = {} }) {
    const headings = blocks.filter(block => block.type === 'heading');
    const paragraphs = blocks.filter(block => block.type === 'paragraph');

    const sentences = [];
    for (const block of blocks) {
        if (block.isCode || block.type === 'heading') continue;
        for (const sentence of splitSentences(block.text)) {
            sentences.push({
                text: sentence.text,
                from: mapOffsetToPos(block, sentence.start),
                to: mapOffsetToPos(block, sentence.end),
                startInBlock: sentence.start,
                words: countWords(sentence.text),
                block,
            });
        }
    }

    const textBlocks = blocks.filter(block => !block.isCode);
    const fullText = textBlocks.map(block => block.text).join('\n');

    return {
        blocks,
        headings,
        paragraphs,
        sentences,
        links,
        images,
        sections: buildSections(blocks),
        listCount: counts.listCount || 0,
        orderedListCount: counts.orderedListCount || 0,
        tableCount: counts.tableCount || 0,
        blockquoteCount: counts.blockquoteCount || 0,
        wordCount: textBlocks.reduce((sum, block) => sum + block.words, 0),
        charCount: fullText.replace(/\s/g, '').length,
        fullText,
    };
}

function findContainer(doc, pos) {
    const $pos = doc.resolve(pos);
    for (let depth = $pos.depth; depth > 0; depth--) {
        const container = CONTAINER_TYPES[$pos.node(depth).type.name];
        if (container) return container;
    }
    return null;
}

// Sections = passages tels qu'un moteur les découperait : un titre H2-H6 et les
// blocs jusqu'au titre suivant. La 1re section (heading null) regroupe ce qui
// précède le 1er sous-titre (introduction, H1 exclu).
function buildSections(blocks) {
    const sections = [];
    let current = { heading: null, blocks: [] };
    for (const block of blocks) {
        if (block.type === 'heading' && block.level >= 2) {
            sections.push(current);
            current = { heading: block, blocks: [] };
        } else if (block.type !== 'heading' && !block.isCode) {
            current.blocks.push(block);
        }
    }
    sections.push(current);
    return sections
        .filter(section => section.heading || section.blocks.length)
        .map(section => {
            const first = section.heading || section.blocks[0];
            const last = section.blocks[section.blocks.length - 1] || section.heading;
            return {
                ...section,
                words: section.blocks.reduce((sum, block) => sum + block.words, 0),
                from: first.from,
                to: last.to,
            };
        });
}

function collectLinkMarks(textNode, absolutePos, links) {
    const linkMark = (textNode.marks || []).find(mark => mark.type.name === 'link');
    if (!linkMark) return;
    links.push({
        from: absolutePos,
        to: absolutePos + textNode.text.length,
        href: linkMark.attrs?.href || '',
        rel: linkMark.attrs?.rel || '',
        text: textNode.text,
    });
}

// Un lien dont le texte porte plusieurs marks (gras partiel…) arrive en
// plusieurs nœuds texte contigus : on les fusionne.
function mergeAdjacentLinks(links) {
    const merged = [];
    for (const link of links) {
        const previous = merged[merged.length - 1];
        if (previous && previous.to === link.from && previous.href === link.href) {
            previous.to = link.to;
            previous.text += link.text;
        } else {
            merged.push({ ...link });
        }
    }
    return merged;
}

/** Convertit un offset dans block.text en position doc via les segments. */
export function mapOffsetToPos(block, offset) {
    const segments = block.segments;
    if (!segments.length) return block.from + 1;
    for (const segment of segments) {
        if (offset < segment.textStart) return segment.from;
        if (offset <= segment.textEnd) return segment.from + (offset - segment.textStart);
    }
    const last = segments[segments.length - 1];
    return last.from + (last.textEnd - last.textStart);
}

/**
 * Mot-clé dans un bloc → { count, ranges } en positions doc, selon le mode de
 * correspondance `opts.mode` (voir findKeywordMatches). Un titre compte comme
 * une seule phrase.
 */
export function findKeywordInBlock(block, phrases, opts = {}) {
    const singleSentence = block.type === 'heading';
    const { count, ranges } = findKeywordMatches(block.text, phrases, { ...opts, singleSentence });
    return {
        count,
        ranges: ranges.map(range => ({
            from: mapOffsetToPos(block, range.start),
            to: mapOffsetToPos(block, range.end),
        })),
    };
}

/** Mot-clé dans tous les blocs texte du modèle → { count, ranges }. */
export function findKeywordInModel(model, phrases, opts = {}) {
    const result = { count: 0, ranges: [] };
    for (const block of model.blocks) {
        if (block.isCode) continue;
        const match = findKeywordInBlock(block, phrases, opts);
        result.count += match.count;
        result.ranges.push(...match.ranges);
    }
    return result;
}

/**
 * Occurrences exactes (mots contigus, dans l'ordre) d'une des phrases dans un
 * bloc → plages doc. Sert aux mots isolés du mot-clé (« en partie présent »).
 */
export function findPhrasesInBlock(block, phrases, opts = {}) {
    const ranges = [];
    for (const phrase of phrases || []) {
        for (const match of findPhraseMatches(block.text, phrase, opts)) {
            ranges.push({
                from: mapOffsetToPos(block, match.start),
                to: mapOffsetToPos(block, match.end),
            });
        }
    }
    return dedupeRanges(ranges);
}

/** Plages dédoublonnées et triées dans l'ordre du document. */
export function mergeRanges(ranges) {
    return dedupeRanges(ranges).sort((a, b) => a.from - b.from);
}

function dedupeRanges(ranges) {
    const seen = new Set();
    return ranges.filter(range => {
        const key = `${range.from}-${range.to}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}
