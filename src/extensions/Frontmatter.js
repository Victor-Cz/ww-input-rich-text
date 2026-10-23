/**
 * Frontmatter.js
 *
 * OBJECTIF:
 * Métadonnées SEO (meta title, meta description) portées par le document lui-même,
 * dans un nœud placé en tête : elles suivent la collaboration (Yjs), l'historique de
 * versions et l'agent comme le reste du texte. Le serveur collab les écrit dans la
 * colonne `metadata` et les retire du HTML.
 *
 * Le nœud est optionnel dans le schéma (`frontmatter? block+`) : c'est le serveur collab
 * qui le crée. Une fois présent, il reste en tête et ne peut pas être supprimé
 * localement ; ses deux champs sont du texte brut, sans mise en forme.
 *
 * Doit rester identique à brispr-collab (lib/frontmatter.ts) : même noms de nœuds,
 * même contenu, même rendu HTML.
 *
 * @module extensions/Frontmatter
 */
import { Node, getHTMLFromFragment } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection } from '@tiptap/pm/state';

export const FRONTMATTER = 'frontmatter';
export const FRONTMATTER_TITLE = 'frontmatterTitle';
export const FRONTMATTER_DESCRIPTION = 'frontmatterDescription';
const FIELDS = new Set([FRONTMATTER_TITLE, FRONTMATTER_DESCRIPTION]);

const frontmatterKey = new PluginKey('frontmatter');

/** Document : le frontmatter, s'il existe, est toujours le premier enfant */
export const FrontmatterDocument = Node.create({
    name: 'doc',
    topNode: true,
    content: `${FRONTMATTER}? block+`,
});

const field = (name, key, placeholder) =>
    Node.create({
        name,
        content: 'text*',
        marks: '',
        defining: true,
        parseHTML: () => [{ tag: `div[data-fm="${key}"]` }],
        renderHTML: () => [
            'div',
            { 'data-fm': key, 'data-placeholder': placeholder, class: `rt-frontmatter-field rt-frontmatter-${key}` },
            0,
        ],
    });

export const FrontmatterTitle = field(FRONTMATTER_TITLE, 'title', 'Meta title');
export const FrontmatterDescription = field(FRONTMATTER_DESCRIPTION, 'description', 'Meta description');

/** Premier nœud du document s'il s'agit du frontmatter, sinon null */
export function frontmatterNode(doc) {
    const first = doc?.firstChild;
    return first && first.type.name === FRONTMATTER ? first : null;
}

/** { metaTitle, metaDescription } du document, null s'il n'a pas de frontmatter */
export function readFrontmatter(doc) {
    const node = frontmatterNode(doc);
    if (!node) return null;
    const meta = { metaTitle: '', metaDescription: '' };
    node.forEach(child => {
        if (child.type.name === FRONTMATTER_TITLE) meta.metaTitle = child.textContent;
        if (child.type.name === FRONTMATTER_DESCRIPTION) meta.metaDescription = child.textContent;
    });
    return meta;
}

/** HTML du document sans le frontmatter (contenu exporté, comme côté serveur) */
export function htmlWithoutFrontmatter(editor) {
    const { doc } = editor.state;
    const node = frontmatterNode(doc);
    if (!node) return editor.getHTML();
    return getHTMLFromFragment(doc.content.cut(node.nodeSize), editor.schema);
}

/** Champ (title / description) qui contient la sélection, null sinon */
function fieldAt($pos) {
    for (let depth = $pos.depth; depth > 0; depth--) {
        const node = $pos.node(depth);
        if (FIELDS.has(node.type.name)) return { node, depth };
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
    content: `${FRONTMATTER_TITLE} ${FRONTMATTER_DESCRIPTION}`,
    isolating: true,
    selectable: false,
    draggable: false,

    parseHTML: () => [{ tag: 'div[data-type="frontmatter"]' }],
    renderHTML: () => ['div', { 'data-type': 'frontmatter', class: 'rt-frontmatter' }, 0],

    addStorage() {
        // Export Markdown : le frontmatter n'est pas du contenu
        return { markdown: { serialize() {}, parse: {} } };
    },

    addCommands() {
        return {
            setFrontmatter:
                ({ metaTitle, metaDescription } = {}) =>
                ({ state, tr, dispatch }) => {
                    const node = frontmatterNode(state.doc);
                    if (!node) return false;
                    if (dispatch) {
                        // Du dernier au premier champ : les positions du premier restent valides
                        const fields = [];
                        node.forEach((child, offset) => fields.push({ child, pos: 1 + offset }));
                        for (const { child, pos } of fields.reverse()) {
                            const value = child.type.name === FRONTMATTER_TITLE ? metaTitle : metaDescription;
                            if (value == null) continue;
                            const text = String(value).replace(/\s*\n+\s*/g, ' ');
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
        // Entrée : titre → description → premier bloc du texte
        const enter = () => {
            const { state } = editor;
            const { $from } = state.selection;
            const found = fieldAt($from);
            if (!found) return false;
            // Titre : début de la description. Description : premier endroit éditable après le frontmatter
            const target =
                found.node.type.name === FRONTMATTER_TITLE
                    ? $from.after(found.depth) + 1
                    : frontmatterNode(state.doc).nodeSize;
            return editor.commands.command(({ tr }) => {
                tr.setSelection(TextSelection.near(tr.doc.resolve(target), 1)).scrollIntoView();
                return true;
            });
        };
        // Effacement : ne jamais fusionner un champ avec un autre, ni le texte avec la meta
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
        return [
            new Plugin({
                key: frontmatterKey,
                props: {
                    // Collage dans un champ : texte brut sur une ligne
                    handlePaste(view, event) {
                        if (!fieldAt(view.state.selection.$from)) return false;
                        const text = (event.clipboardData?.getData('text/plain') || '').replace(/\s*\n+\s*/g, ' ');
                        view.dispatch(view.state.tr.insertText(text));
                        return true;
                    },
                },
                // Un frontmatter supprimé localement (tout sélectionner + effacer…) est remis en tête,
                // avec son contenu. Les transactions venues de Yjs (y-sync$) font foi.
                appendTransaction(transactions, oldState, newState) {
                    if (!transactions.some(tr => tr.docChanged)) return null;
                    if (transactions.some(tr => tr.getMeta('y-sync$'))) return null;
                    const previous = frontmatterNode(oldState.doc);
                    if (!previous || frontmatterNode(newState.doc)) return null;
                    const tr = newState.tr.insert(0, previous);
                    // Garder le curseur dans le texte, après le frontmatter remis
                    const pos = Math.min(newState.selection.from + previous.nodeSize, tr.doc.content.size);
                    tr.setSelection(TextSelection.near(tr.doc.resolve(pos)));
                    return tr;
                },
            }),
        ];
    },
});

export const FrontmatterExtensions = [FrontmatterDocument, Frontmatter, FrontmatterTitle, FrontmatterDescription];
