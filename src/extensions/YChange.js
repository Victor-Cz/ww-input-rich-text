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
 *
 * Options (via .configure) :
 * - colorMode : 'default' (vert = ajouté, rouge barré = retiré) ou
 *   'author' (teinte par auteur, fournie par ySyncPlugin)
 * - resolveAuthor : fonction id → nom affiché dans l'infobulle au survol
 */

const DEFAULT_ADDED = { light: '#16a34a2b', dark: '#16a34a' };
const DEFAULT_REMOVED = { light: '#dc26262b', dark: '#dc2626' };

const changeStyle = (change, colorMode) => {
    if (!change || !change.type) return null;
    const authorColor = colorMode === 'author' ? change.color : null;
    if (change.type === 'removed') {
        const color = authorColor || DEFAULT_REMOVED;
        return `background-color: ${color.light}; text-decoration: line-through; text-decoration-color: ${color.dark};`;
    }
    const color = authorColor || DEFAULT_ADDED;
    return `background-color: ${color.light};`;
};

const changeAttrs = (change, options) => {
    if (!change || !change.type) return {};
    const attrs = {
        'data-ychange-type': change.type,
    };
    if (change.user) attrs['data-ychange-user'] = change.user;
    const style = changeStyle(change, options.colorMode);
    if (style) attrs.style = style;
    // Infobulle toujours présente ; auteur ajouté quand il est connu
    // (le contenu écrit avant l'activation de l'attribution n'a pas d'auteur)
    const base = change.type === 'removed' ? 'Retiré' : 'Ajouté';
    const author = change.user && options.resolveAuthor ? options.resolveAuthor(change.user) : change.user;
    attrs.title = author ? `${base} par ${author}` : base;
    return attrs;
};

export const YChangeMark = Mark.create({
    name: 'ychange',
    inclusive: false,

    addOptions() {
        return {
            colorMode: 'default',
            resolveAuthor: user => user,
        };
    },

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
        return ['ychange', changeAttrs(mark.attrs, this.options), 0];
    },
});

export const YChangeNodeAttrs = Extension.create({
    name: 'ychangeNodeAttrs',

    addOptions() {
        return {
            colorMode: 'default',
            resolveAuthor: user => user,
        };
    },

    addGlobalAttributes() {
        const options = this.options;
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
                        renderHTML: attributes => changeAttrs(attributes.ychange, options),
                    },
                },
            },
        ];
    },
});
