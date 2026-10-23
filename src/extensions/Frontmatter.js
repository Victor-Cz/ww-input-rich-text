/**
 * Frontmatter.js
 *
 * OBJECTIF:
 * Métadonnées (meta title, meta description, slug…) portées par le document lui-même,
 * dans un nœud placé en tête : elles suivent la collaboration (Yjs), l'historique de
 * versions et l'agent comme le reste du texte. Le serveur collab les écrit dans la
 * colonne `metadata` et les retire du HTML.
 *
 * Générique : le frontmatter est une suite de champs `frontmatterField`, chacun
 * identifié par sa clé (attribut `key`, la clé de la colonne `metadata`). La liste des
 * clés est fixée par le serveur collab, qui crée le nœud ; le plugin affiche les champs
 * qu'il trouve. Affiché, c'est un tableau clé / valeur (à la façon des propriétés
 * d'Obsidian) : libellé à gauche (option `labels`, la clé à défaut), valeur éditable
 * à droite (option `emptyText` quand elle est vide).
 *
 * Le nœud est optionnel dans le schéma (`frontmatter? block+`). Une fois présent, il
 * reste en tête et ne peut pas être supprimé localement ; ses champs sont du texte brut.
 *
 * Masqué par défaut (option `visible`) : le nœud n'est pas affiché et le curseur ne
 * peut pas y entrer ; les champs restent lisibles et modifiables par la variable
 * `frontmatter` et l'action `setFrontmatterField`.
 *
 * Doit rester identique à brispr-collab (lib/frontmatter.ts) : mêmes noms de nœuds,
 * même contenu, même rendu HTML.
 *
 * @module extensions/Frontmatter
 */
import { Node, getHTMLFromFragment } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

export const FRONTMATTER = 'frontmatter';
export const FRONTMATTER_FIELD = 'frontmatterField';

const frontmatterKey = new PluginKey('frontmatter');
const oneLine = value => String(value ?? '').replace(/\s*\n+\s*/g, ' ');

/** Document : le frontmatter, s'il existe, est toujours le premier enfant */
export const FrontmatterDocument = Node.create({
    name: 'doc',
    topNode: true,
    content: `${FRONTMATTER}? block+`,
});

/** Champ du frontmatter : texte brut, identifié par sa clé */
export const FrontmatterField = Node.create({
    name: FRONTMATTER_FIELD,
    content: 'text*',
    marks: '',
    defining: true,

    addOptions() {
        // { clé: libellé } et texte d'une valeur vide — getters possibles, relus à chaque rendu
        return { labels: {}, emptyText: 'Empty' };
    },

    addAttributes() {
        return {
            key: {
                default: null,
                parseHTML: element => element.getAttribute('data-key'),
                renderHTML: attributes => ({ 'data-key': attributes.key }),
            },
        };
    },

    parseHTML: () => [{ tag: 'div[data-fm-field]' }],

    renderHTML({ node, HTMLAttributes }) {
        const read = value => (typeof value === 'function' ? value() : value);
        const labels = read(this.options.labels) || {};
        const key = node.attrs.key;
        return [
            'div',
            {
                ...HTMLAttributes,
                'data-fm-field': '',
                'data-label': labels[key] || key || '',
                'data-placeholder': read(this.options.emptyText) || '',
                class: 'rt-frontmatter-field',
            },
            0,
        ];
    },
});

const isVisible = options => !!(typeof options.visible === 'function' ? options.visible() : options.visible);

/** Premier nœud du document s'il s'agit du frontmatter, sinon null */
export function frontmatterNode(doc) {
    const first = doc?.firstChild;
    return first && first.type.name === FRONTMATTER ? first : null;
}

/** { clé: valeur } du frontmatter, null si le document n'en a pas */
export function readFrontmatter(doc) {
    const node = frontmatterNode(doc);
    if (!node) return null;
    const values = {};
    node.forEach(child => {
        if (child.attrs.key) values[child.attrs.key] = child.textContent;
    });
    return values;
}

/** HTML du document sans le frontmatter (contenu exporté, comme côté serveur) */
export function htmlWithoutFrontmatter(editor) {
    const { doc } = editor.state;
    const node = frontmatterNode(doc);
    if (!node) return editor.getHTML();
    return getHTMLFromFragment(doc.content.cut(node.nodeSize), editor.schema);
}

/** Champ du frontmatter qui contient la position, null sinon */
function fieldAt($pos) {
    for (let depth = $pos.depth; depth > 0; depth--) {
        const node = $pos.node(depth);
        if (node.type.name === FRONTMATTER_FIELD) return { node, depth };
    }
    return null;
}

/** Le curseur est au début du premier bloc qui suit le frontmatter */
function atStartOfFirstBlock(state) {
    const { selection, doc } = state;
    const fm = frontmatterNode(doc);
    if (!fm || !selection.empty) return false;
    const { $from } = selection;
    return $from.parentOffset === 0 && $from.depth >= 1 && $from.before(1) === fm.nodeSize;
}

export const Frontmatter = Node.create({
    name: FRONTMATTER,
    content: `${FRONTMATTER_FIELD}+`,
    isolating: true,
    selectable: false,
    draggable: false,

    addOptions() {
        // Affiché dans l'éditeur (getter possible) ; masqué par défaut
        return { visible: false };
    },

    parseHTML: () => [{ tag: 'div[data-type="frontmatter"]' }],
    renderHTML() {
        const attrs = { 'data-type': 'frontmatter', class: 'rt-frontmatter' };
        if (!isVisible(this.options)) {
            attrs.class += ' rt-frontmatter--hidden';
            attrs.contenteditable = 'false';
        }
        return ['div', attrs, 0];
    },

    addStorage() {
        // Export Markdown : le frontmatter n'est pas du contenu
        return { markdown: { serialize() {}, parse: {} } };
    },

    addCommands() {
        return {
            // { clé: valeur } : seuls les champs existants et présents dans l'objet changent
            setFrontmatter:
                (values = {}) =>
                ({ state, tr, dispatch }) => {
                    const node = frontmatterNode(state.doc);
                    if (!node) return false;
                    if (dispatch) {
                        // Du dernier au premier champ : les positions des précédents restent valides
                        const fields = [];
                        node.forEach((child, offset) => fields.push({ child, pos: 1 + offset }));
                        for (const { child, pos } of fields.reverse()) {
                            if (!Object.prototype.hasOwnProperty.call(values, child.attrs.key)) continue;
                            const text = oneLine(values[child.attrs.key]);
                            if (text === child.textContent) continue;
                            const from = pos + 1;
                            const to = pos + child.nodeSize - 1;
                            if (text) tr.replaceWith(from, to, state.schema.text(text));
                            else tr.delete(from, to);
                        }
                    }
                    return true;
                },
        };
    },

    addKeyboardShortcuts() {
        const editor = this.editor;
        // Entrée : champ suivant, puis premier bloc du texte après le dernier champ
        const enter = () => {
            const { state } = editor;
            const { $from } = state.selection;
            const found = fieldAt($from);
            if (!found) return false;
            const fm = frontmatterNode(state.doc);
            const after = $from.after(found.depth);
            const target = after < fm.nodeSize - 1 ? after + 1 : fm.nodeSize;
            return editor.commands.command(({ tr }) => {
                tr.setSelection(TextSelection.near(tr.doc.resolve(target), 1)).scrollIntoView();
                return true;
            });
        };
        // Effacement : ne jamais fusionner deux champs, ni le texte avec le frontmatter
        const backspace = () => {
            const { state } = editor;
            const { $from, empty } = state.selection;
            if (!empty) return false;
            if (fieldAt($from) && $from.parentOffset === 0) return true;
            return atStartOfFirstBlock(state);
        };
        const del = () => {
            const { $from, empty } = editor.state.selection;
            if (!empty) return false;
            return !!fieldAt($from) && $from.parentOffset === $from.parent.content.size;
        };
        return {
            Enter: enter,
            'Shift-Enter': () => !!fieldAt(editor.state.selection.$from),
            Backspace: backspace,
            Delete: del,
        };
    },

    addProseMirrorPlugins() {
        const options = this.options;
        return [
            new Plugin({
                key: frontmatterKey,
                props: {
                    // Collage dans un champ : texte brut sur une ligne
                    handlePaste(view, event) {
                        if (!fieldAt(view.state.selection.$from)) return false;
                        const text = oneLine(event.clipboardData?.getData('text/plain'));
                        view.dispatch(view.state.tr.insertText(text));
                        return true;
                    },
                },
                // Un frontmatter supprimé localement (tout sélectionner + effacer…) est remis en tête,
                // avec son contenu. Les transactions venues de Yjs (y-sync$) font foi.
                appendTransaction(transactions, oldState, newState) {
                    const local = !transactions.some(tr => tr.getMeta('y-sync$'));
                    const previous = frontmatterNode(oldState.doc);
                    if (local && previous && !frontmatterNode(newState.doc) && transactions.some(tr => tr.docChanged)) {
                        const tr = newState.tr.insert(0, previous);
                        // Garder le curseur dans le texte, après le frontmatter remis
                        const pos = Math.min(newState.selection.from + previous.nodeSize, tr.doc.content.size);
                        tr.setSelection(TextSelection.near(tr.doc.resolve(pos)));
                        return tr;
                    }
                    // Masqué : le curseur ne peut pas entrer dans le frontmatter
                    const fm = frontmatterNode(newState.doc);
                    const { selection } = newState;
                    if (fm && !isVisible(options) && selection instanceof TextSelection && selection.from < fm.nodeSize) {
                        const start = newState.doc.resolve(fm.nodeSize);
                        // Entièrement dedans : au début du texte ; à cheval : rognée au texte
                        const next =
                            selection.to <= fm.nodeSize
                                ? TextSelection.near(start, 1)
                                : TextSelection.between(start, selection.$to);
                        return newState.tr.setSelection(next);
                    }
                    return null;
                },
            }),
        ];
    },
});

/** Extensions à ajouter à l'éditeur (avec StarterKit configuré `document: false`) */
export function frontmatterExtensions({ labels, emptyText, visible } = {}) {
    return [
        FrontmatterDocument,
        Frontmatter.configure({ visible }),
        FrontmatterField.configure({ labels, emptyText }),
    ];
}
