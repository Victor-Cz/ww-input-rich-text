import { Extension, Mark } from '@tiptap/core';

/**
 * Support du rendu des versions Yjs (snapshot compare).
 *
 * Quand ySyncPlugin rend un document à un snapshot donné (comparaison de
 * versions), il annote le contenu ajouté/supprimé :
 * - sur le texte : une marque `ychange` avec { user, type, color }
 * - sur les nœuds : un attribut `ychange` avec la même forme
 * Ces deux extensions déclarent ce schéma et son rendu visuel.
 * Inertes en dehors du mode comparaison.
 */

const changeStyle = change => {
    if (!change || !change.type) return null;
    const color = change.color || {};
    if (change.type === 'removed') {
        return `background-color: ${color.light || '#ff525233'}; text-decoration: line-through; text-decoration-color: ${
            color.dark || '#ff5252'
        };`;
    }
    return `background-color: ${color.light || '#2bc21633'};`;
};

export const YChangeMark = Mark.create({
    name: 'ychange',
    inclusive: false,

    addAttributes() {
        return {
            user: { default: null },
            type: { default: null },
            color: { default: null },
        };
    },

    parseHTML() {
        return [{ tag: 'ychange' }];
    },

    renderHTML({ mark }) {
        const attrs = {
            'data-ychange-type': mark.attrs.type,
            'data-ychange-user': mark.attrs.user,
        };
        const style = changeStyle(mark.attrs);
        if (style) attrs.style = style;
        return ['ychange', attrs, 0];
    },
});

export const YChangeNodeAttrs = Extension.create({
    name: 'ychangeNodeAttrs',

    addGlobalAttributes() {
        return [
            {
                types: [
                    'paragraph',
                    'heading',
                    'blockquote',
                    'codeBlock',
                    'bulletList',
                    'orderedList',
                    'listItem',
                    'taskList',
                    'taskItem',
                    'table',
                    'tableRow',
                    'tableCell',
                    'tableHeader',
                    'horizontalRule',
                    'image',
                    'imageNode',
                    'customImage',
                ],
                attributes: {
                    ychange: {
                        default: null,
                        parseHTML: () => null,
                        renderHTML: attributes => {
                            if (!attributes.ychange) return {};
                            const attrs = {
                                'data-ychange-type': attributes.ychange.type,
                                'data-ychange-user': attributes.ychange.user,
                            };
                            const style = changeStyle(attributes.ychange);
                            if (style) attrs.style = style;
                            return attrs;
                        },
                    },
                },
            },
        ];
    },
});
