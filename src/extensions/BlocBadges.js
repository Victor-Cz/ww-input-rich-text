/**
 * BlocBadges.js
 *
 * OBJECTIF:
 * Les blocs prévus du plan en badges. Dans une note de section, une puce
 * `[checklist] Les pièces à réunir` annonce un bloc de l'article (cf.
 * utils/blocBadges) : le préfixe `[checklist] ` s'affiche en badge
 * « Checklist », dans la langue de l'app. Décorations locales seulement : le
 * document garde son texte, les autres collaborateurs et le serveur ne voient
 * rien changer.
 *
 * Curseur dans la puce (éditeur modifiable) : le préfixe revient en clair,
 * pour changer le format à la main, comme un lien revient en [texte](url)
 * (cf. extensions/LinkReveal). Un format inconnu reste du texte.
 *
 * @module extensions/BlocBadges
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { currentLang } from '../i18n/lang.js';
import { blocLabel, blocPrefixes } from '../utils/blocBadges.js';

export const blocBadgesKey = new PluginKey('blocBadges');

/**
 * @name blocBadgesPlugin
 * @description Le badge de chaque bloc prévu, et son préfixe masqué, sauf
 * dans la puce du curseur quand l'éditeur est modifiable. `editable()` :
 * l'éditeur est modifiable ; `lang()` : la langue des libellés.
 */
export function blocBadgesPlugin({ editable, lang = () => 'en' }) {
    // Les puces d'un document, relues seulement quand il change
    let cached = { doc: null, prefixes: [] };
    const prefixesOf = doc => {
        if (cached.doc !== doc) cached = { doc, prefixes: blocPrefixes(doc) };
        return cached.prefixes;
    };

    return new Plugin({
        key: blocBadgesKey,
        props: {
            decorations(state) {
                const prefixes = prefixesOf(state.doc);
                if (!prefixes.length) return DecorationSet.empty;
                const { from, to } = state.selection;
                const canEdit = !!editable();
                const language = lang();
                const decorations = [];
                for (const prefix of prefixes) {
                    // La puce du curseur montre son préfixe, pour le modifier
                    if (canEdit && from <= prefix.end && to >= prefix.start) continue;
                    const label = blocLabel(prefix.format, language);
                    decorations.push(
                        Decoration.widget(prefix.from, () => badge(label, prefix.format), {
                            side: -1,
                            key: `bloc-${prefix.format}-${label}`,
                            ignoreSelection: true,
                        }),
                        Decoration.inline(prefix.from, prefix.to, { class: 'ww-bloc-badge__raw' })
                    );
                }
                return DecorationSet.create(state.doc, decorations);
            },
        },
    });
}

/** Le badge d'un bloc : son libellé, son format au survol */
function badge(label, format) {
    const span = document.createElement('span');
    span.className = 'ww-bloc-badge';
    span.textContent = label;
    span.title = `[${format}]`;
    span.setAttribute('contenteditable', 'false');
    return span;
}

export const BlocBadges = Extension.create({
    name: 'blocBadges',

    addProseMirrorPlugins() {
        const editor = this.editor;
        return [blocBadgesPlugin({ editable: () => editor.isEditable, lang: currentLang })];
    },
});

export default BlocBadges;
