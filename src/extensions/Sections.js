/**
 * Sections.js
 *
 * OBJECTIF:
 * Le plan de l'article dans le document. Le serveur collab (Search) écrit le
 * plan dans l'article : chaque titre H2 / H3 du plan porte un identifiant
 * (`sectionId`) et est suivi d'une note grise (`sectionNote`) qui dit ce que
 * la section doit établir. On édite ce plan ici : renommer, ajouter, supprimer
 * les sections, modifier les notes.
 *
 * - SectionIds : l'attribut `sectionId` des titres (tous niveaux, utilisé sur
 *   H2 et H3). Lu de `data-section-id`, jamais rendu : le HTML de l'article et
 *   la valeur de l'éditeur restent propres ; il vit dans le Y.Doc. Un H2 / H3
 *   sans identifiant, ou avec celui d'un titre qui le précède, en reçoit un
 *   nouveau (uuid) — seulement pour une modification locale (pas celles
 *   venues de Yjs) et dans un éditeur modifiable ;
 * - SectionNote : le nœud de la note, `(paragraph | bulletList)+` — les
 *   paragraphes sont l'objectif, les puces les points à couvrir. Jamais dans
 *   la valeur (HTML, Markdown), l'analyse SEO / GEO ni le sommaire
 *   (cf. utils/sectionNotes). Entrée sur le paragraphe vide qui la termine en
 *   sort, effacer dans une note vide la supprime.
 *
 * Doit rester identique au schéma du serveur collab (Search-Server,
 * collab/article/schema.ts) : mêmes noms, même contenu, même rendu HTML. Un
 * nœud inconnu d'un côté disparaît du document partagé.
 *
 * @module extensions/Sections
 */
import { Extension, Node } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { isRemoteChange } from '../utils/remoteMapping.js';
import { deleteEmptySectionNote, exitSectionNote, SECTION_NOTE } from '../utils/sectionNotes.js';
import { headingsWithoutId } from '../utils/sections.js';

export const sectionIdsKey = new PluginKey('sectionIds');

/**
 * @name sectionIdsPlugin
 * @description Donne un identifiant aux H2 / H3 qui n'en ont pas (ou en
 * doublon), en une transaction ajoutée. `editable()` : l'éditeur est
 * modifiable ; `composing()` : une composition est en cours (touche morte,
 * IME) ; `newId()` : un nouvel identifiant.
 */
export function sectionIdsPlugin({ editable, composing = () => false, newId = () => crypto.randomUUID() }) {
    return new Plugin({
        key: sectionIdsKey,
        appendTransaction(transactions, _oldState, state) {
            if (!transactions.some(tr => tr.docChanged)) return null;
            // Le document partagé fait foi : ce qui vient de Yjs n'est pas retouché
            if (transactions.some(isRemoteChange) || !editable()) return null;
            // Changer un attribut redessine le titre et casserait la composition :
            // l'identifiant attend la transaction qui la termine
            if (composing()) return null;
            const missing = headingsWithoutId(state.doc);
            if (!missing.length) return null;
            const tr = state.tr;
            for (const pos of missing) tr.setNodeAttribute(pos, 'sectionId', newId());
            return tr;
        },
    });
}

export const SectionIds = Extension.create({
    name: 'sectionIds',

    addGlobalAttributes() {
        return [
            {
                types: ['heading'],
                attributes: {
                    sectionId: {
                        default: null,
                        // Entrée au milieu d'un titre : la seconde moitié n'en hérite pas
                        keepOnSplit: false,
                        parseHTML: element => element.getAttribute('data-section-id'),
                        renderHTML: () => ({}),
                    },
                },
            },
        ];
    },

    addProseMirrorPlugins() {
        const editor = this.editor;
        return [
            sectionIdsPlugin({
                editable: () => editor.isEditable,
                composing: () => !!editor.view?.composing,
            }),
        ];
    },
});

export const SectionNote = Node.create({
    name: SECTION_NOTE,
    group: 'block',
    content: '(paragraph | bulletList)+',
    defining: true,
    isolating: true,

    parseHTML: () => [{ tag: 'div[data-section-note]' }],
    renderHTML: () => ['div', { 'data-section-note': '' }, 0],

    addStorage() {
        // Export Markdown : la note n'est pas du contenu
        return { markdown: { serialize() {}, parse: {} } };
    },

    addKeyboardShortcuts() {
        const run = command => () => command(this.editor.state, this.editor.view.dispatch);
        return {
            Enter: run(exitSectionNote),
            Backspace: run(deleteEmptySectionNote),
        };
    },
});

/** Extensions du plan de l'article */
export function sectionExtensions() {
    return [SectionIds, SectionNote];
}
