// Blocs prévus du plan : dans une note de section, une puce `[format] ce
// qu'il porte` annonce un bloc de l'article (checklist, tableau comparatif…),
// et `[image] ce qu'elle montre — capture` une image prévue.
// Le back de Search les écrit et les relit telles quelles (Search-Back,
// _shared/content/article_plan.ts) ; ici, on les reconnaît pour les montrer
// en badge (cf. extensions/BlocBadges). Le texte du document ne change pas.
import { SECTION_NOTE } from './sectionNotes.js';

/**
 * Les formats de bloc et leur libellé, repris du catalogue du back
 * (Search-Back, _shared/content/bloc_formats.ts) : un format ajouté là-bas
 * s'ajoute ici, sinon sa puce reste du texte.
 */
export const BLOC_LABELS = {
    tldr: { fr: 'Synthèse', en: 'Summary' },
    comparison_table: { fr: 'Tableau comparatif', en: 'Comparison table' },
    stat_highlight: { fr: 'Chiffre clé', en: 'Key figure' },
    case_study: { fr: 'Étude de cas', en: 'Case study' },
    quote_block: { fr: 'Citation', en: 'Quote' },
    numbered_procedure: { fr: 'Procédure', en: 'Step by step' },
    warning_block: { fr: 'Point de vigilance', en: 'Warning' },
    checklist: { fr: 'Checklist', en: 'Checklist' },
    glossary: { fr: 'Définition', en: 'Definition' },
    expert_tip: { fr: "Conseil d'expert", en: 'Expert tip' },
    faq: { fr: 'FAQ', en: 'FAQ' },
    pros_cons: { fr: 'Avantages et inconvénients', en: 'Pros and cons' },
    timeline: { fr: 'Chronologie', en: 'Timeline' },
    legal_reference: { fr: 'Référence légale', en: 'Legal reference' },
    before_after: { fr: 'Avant / après', en: 'Before / after' },
    key_takeaways: { fr: 'À retenir', en: 'Key takeaways' },
    process_flow: { fr: 'Arbre de décision', en: 'Decision tree' },
    pitfall_list: { fr: 'Pièges à éviter', en: 'Pitfalls' },
    verdict_criteria: { fr: 'Critères de choix', en: 'Decision criteria' },
    // Pas un bloc : une image prévue, « [image] ce qu'elle montre — capture »
    image: { fr: 'Image', en: 'Image' },
};

// `[format]` en tête de la puce, et les espaces qui le suivent
const PREFIX = /^\[([a-z_]+)\]\s*/;

/**
 * @name blocLabel
 * @description Le libellé d'un format dans la langue donnée (anglais par défaut)
 */
export function blocLabel(format, lang) {
    const labels = BLOC_LABELS[format];
    return labels ? labels[lang === 'fr' ? 'fr' : 'en'] : format;
}

/**
 * @name blocPrefixes
 * @description Les puces de notes qui annoncent un bloc : pour chacune, le
 * format, la plage du préfixe `[format] ` (from, to) et celle de son
 * paragraphe (start, end). Une puce dont le format est inconnu n'en est pas.
 */
export function blocPrefixes(doc) {
    const found = [];
    doc.descendants((node, pos) => {
        if (node.type.name !== SECTION_NOTE) return node.isBlock && !node.isTextblock;
        node.descendants((child, offset) => {
            if (child.type.name !== 'listItem') return true;
            const paragraph = child.firstChild;
            const text = paragraph?.type.name === 'paragraph' ? paragraph.firstChild : null;
            const match = text?.isText ? PREFIX.exec(text.text) : null;
            if (match && BLOC_LABELS[match[1]]) {
                // pos + 1 : l'intérieur de la note ; + offset + 1 : l'intérieur de la puce ; + 1 : du paragraphe
                const start = pos + 1 + offset + 1 + 1;
                found.push({
                    format: match[1],
                    from: start,
                    to: start + match[0].length,
                    start,
                    end: start + paragraph.content.size,
                });
            }
            return true;
        });
        return false;
    });
    return found;
}
