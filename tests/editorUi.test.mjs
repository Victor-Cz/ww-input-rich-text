// État du menu natif et des variables states / history (cf. utils/editorUi)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { EMPTY_EDITOR_UI, readEditorUi, TEXT_TYPES, uiInputsChanged } from '../src/utils/editorUi.js';

const align = { textAlign: { default: 'left' } };
const schema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        paragraph: { group: 'block', content: 'inline*', attrs: align },
        heading: { group: 'block', content: 'inline*', attrs: { level: { default: 1 }, ...align } },
        blockquote: { group: 'block', content: 'paragraph+' },
        text: { group: 'inline' },
    },
    marks: {
        bold: {},
        link: { attrs: { href: {} }, inclusive: false },
        textStyle: { attrs: { color: { default: null } } },
    },
});
const t = (text, marks = []) => schema.text(text, marks);
const bold = schema.marks.bold.create();

// [1] « Titre » (h2) · [8] « Bonjour » (gras, couleur) « le monde » · [27] citation « Cité » centrée
const doc = schema.node('doc', null, [
    schema.node('heading', { level: 2 }, [t('Titre')]),
    schema.node('paragraph', null, [
        t('Bonjour', [bold, schema.marks.textStyle.create({ color: '#DC2626' })]),
        t(' le monde'),
    ]),
    schema.node('blockquote', null, [schema.node('paragraph', { textAlign: 'center' }, [t('Cité')])]),
]);
const at = (from, to = from) => EditorState.create({ doc, selection: TextSelection.create(doc, from, to) });

test('curseur dans un titre : type h2, aligné à gauche, rien de sélectionné', () => {
    const ui = readEditorUi(at(3));
    assert.equal(ui.textType, 2);
    assert.equal(TEXT_TYPES[ui.textType].tag, 'h2');
    assert.equal(ui.textAlign, 'left');
    assert.equal(ui.selectedText, '');
    assert.equal(ui.bold, false);
    assert.equal(ui.blockquote, false);
});

test('sélection en gras et en couleur : texte, gras, couleur', () => {
    const ui = readEditorUi(at(8, 15));
    assert.equal(ui.selectedText, 'Bonjour');
    assert.equal(ui.textType, 0);
    assert.equal(ui.bold, true);
    assert.equal(ui.textStyleColor, '#DC2626');
    assert.equal(ui.link, false);
    assert.equal(ui.table, false, 'type absent du schéma : inactif');
});

test('citation centrée, et historique fourni par l\'éditeur', () => {
    const ui = readEditorUi(at(30), { canUndo: true });
    assert.equal(ui.blockquote, true);
    assert.equal(ui.textAlign, 'center');
    assert.equal(ui.canUndo, true);
    assert.equal(ui.canRedo, false);
    assert.equal(Object.isFrozen(ui), true);
    assert.deepEqual(Object.keys(ui), Object.keys(EMPTY_EDITOR_UI), 'mêmes champs que l\'état vide');
});

test('marque en attente : le gras est actif au curseur', () => {
    const state = at(20);
    const withMark = state.apply(state.tr.addStoredMark(bold));
    assert.equal(readEditorUi(state).bold, false);
    assert.equal(readEditorUi(withMark).bold, true);
});

test("uiInputsChanged : document, sélection et marques en attente, pas le reste", () => {
    const state = at(20);
    assert.equal(uiInputsChanged(null, state), true);
    assert.equal(uiInputsChanged(state, state.apply(state.tr.setMeta('cursor', true))), false, 'transaction sans effet');
    assert.equal(uiInputsChanged(state, state.apply(state.tr.setSelection(TextSelection.create(doc, 21)))), true);
    assert.equal(uiInputsChanged(state, state.apply(state.tr.insertText('x'))), true);
    const marked = state.apply(state.tr.addStoredMark(bold));
    assert.equal(uiInputsChanged(state, marked), true);
    assert.equal(uiInputsChanged(marked, marked.apply(marked.tr.addStoredMark(bold))), false, 'mêmes marques');
});
