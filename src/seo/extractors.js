import { countWords, splitSentences, findPhraseMatches } from './textUtils.js';

// Extraction d'un modèle intermédiaire depuis le document ProseMirror,
// en une seule traversée. Toutes les positions sont des positions doc,
// directement utilisables pour les décorations de surlignage.

const LIST_TYPES = new Set(['bulletList', 'orderedList', 'taskList']);
const IMAGE_TYPES = new Set(['image', 'customImage']);

/**
 * Construit le modèle d'analyse :
 * {
 *   blocks:    [{ type, level, from, to, text, segments, words, align, inCodeBlock }]
 *   headings:  sous-ensemble de blocks (h1-h6)
 *   paragraphs: sous-ensemble de blocks (paragraphes hors code)
 *   sentences: [{ text, from, to, words, block }]
 *   links:     [{ from, to, href, rel, text }]
 *   images:    [{ from, to, src, alt }]
 *   listCount, tableCount, wordCount, charCount, fullText
 * }
 */
export function extractModel(doc) {
    const blocks = [];
    const links = [];
    const images = [];
    let listCount = 0;
    let tableCount = 0;

    doc.descendants((node, pos) => {
        const typeName = node.type.name;

        if (LIST_TYPES.has(typeName)) listCount++;
        if (typeName === 'table') tableCount++;

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
        });

        return false;
    });

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
        links: mergeAdjacentLinks(links),
        images,
        listCount,
        tableCount,
        wordCount: textBlocks.reduce((sum, block) => sum + block.words, 0),
        charCount: fullText.replace(/\s/g, '').length,
        fullText,
    };
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
 * Occurrences d'une des phrases-clés dans un bloc → plages doc.
 * `phrases` = [principal, ...synonymes].
 */
export function findPhrasesInBlock(block, phrases) {
    const ranges = [];
    for (const phrase of phrases || []) {
        for (const match of findPhraseMatches(block.text, phrase)) {
            ranges.push({
                from: mapOffsetToPos(block, match.start),
                to: mapOffsetToPos(block, match.end),
            });
        }
    }
    return dedupeRanges(ranges);
}

/** Occurrences dans tous les blocs texte du modèle. */
export function findPhrasesInModel(model, phrases) {
    const ranges = [];
    for (const block of model.blocks) {
        if (block.isCode) continue;
        ranges.push(...findPhrasesInBlock(block, phrases));
    }
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
