// État du menu natif et des variables states / history, lu de l'état
// ProseMirror. Le menu appelait richEditor.isActive une trentaine de fois à
// chaque rendu, et le composant refaisait son rendu à chaque transaction
// (curseurs des autres, dévoilement de l'agent…) : l'état est maintenant lu
// une fois, seulement quand ce dont il dépend a changé (uiInputsChanged), et
// gardé tel quel (objet gelé) tant qu'il reste le même.
import { getAttributes, isActive } from '@tiptap/core';
import { Mark } from 'prosemirror-model';

/** Types de texte du sélecteur du menu : value = TAGS_MAP du composant */
export const TEXT_TYPES = Object.freeze([
    { label: 'Paragraph', value: 0, tag: 'p', node: 'paragraph' },
    { label: 'Heading 1', value: 1, tag: 'h1', node: 'heading', attrs: { level: 1 } },
    { label: 'Heading 2', value: 2, tag: 'h2', node: 'heading', attrs: { level: 2 } },
    { label: 'Heading 3', value: 3, tag: 'h3', node: 'heading', attrs: { level: 3 } },
    { label: 'Heading 4', value: 4, tag: 'h4', node: 'heading', attrs: { level: 4 } },
    { label: 'Heading 5', value: 5, tag: 'h5', node: 'heading', attrs: { level: 5 } },
    { label: 'Heading 6', value: 6, tag: 'h6', node: 'heading', attrs: { level: 6 } },
]);

const ALIGNMENTS = ['left', 'center', 'right', 'justify'];

/** L'état d'avant tout éditeur */
export const EMPTY_EDITOR_UI = Object.freeze({
    selectedText: '',
    textType: 0,
    textStyleColor: undefined,
    bold: false,
    italic: false,
    underline: false,
    strike: false,
    bulletList: false,
    orderedList: false,
    taskList: false,
    link: false,
    codeBlock: false,
    blockquote: false,
    textAlign: false,
    table: false,
    canUndo: false,
    canRedo: false,
});

/**
 * @name readEditorUi
 * @description L'état du menu pour un état ProseMirror (mêmes lectures que
 * editor.isActive / editor.getAttributes), avec canUndo / canRedo fournis par
 * l'éditeur. Objet gelé : comparé tel quel, jamais modifié.
 */
export function readEditorUi(state, { canUndo = false, canRedo = false } = {}) {
    const { from, to, empty } = state.selection;
    const active = (name, attrs) => isActive(state, name, attrs);
    return Object.freeze({
        selectedText: empty ? '' : state.doc.textBetween(from, to, ' ', ' '),
        // Le premier type actif, paragraphe sinon (comme le sélecteur)
        textType: TEXT_TYPES.find(type => active(type.node, type.attrs))?.value ?? 0,
        textStyleColor: getAttributes(state, 'textStyle').color,
        bold: active('bold'),
        italic: active('italic'),
        underline: active('underline'),
        strike: active('strike'),
        bulletList: active('bulletList'),
        orderedList: active('orderedList'),
        taskList: active('taskList'),
        link: active('link'),
        codeBlock: active('codeBlock'),
        blockquote: active('blockquote'),
        textAlign: ALIGNMENTS.find(align => active(null, { textAlign: align })) ?? false,
        table: active('table'),
        canUndo: !!canUndo,
        canRedo: !!canRedo,
    });
}

/**
 * @name uiInputsChanged
 * @description Vrai si l'état du menu peut avoir changé entre deux états
 * ProseMirror : document, sélection ou marques en attente. Les transactions
 * des curseurs des autres ou des décorations n'y touchent pas.
 */
export function uiInputsChanged(previous, next) {
    if (!previous) return true;
    if (previous.doc !== next.doc || !previous.selection.eq(next.selection)) return true;
    const a = previous.storedMarks;
    const b = next.storedMarks;
    if (a === b) return false;
    if (!a || !b) return true;
    return !Mark.sameSet(a, b);
}
