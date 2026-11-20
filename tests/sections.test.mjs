// Sections du plan de l'article : identifiants des H2 / H3 (cf. utils/sections, extensions/Sections)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Schema } from 'prosemirror-model';
import { EditorState } from 'prosemirror-state';
import { ySyncPluginKey } from 'y-prosemirror';
import { sectionIdsPlugin } from '../src/extensions/Sections.js';
import { headingsWithoutId } from '../src/utils/sections.js';

const schema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        paragraph: { group: 'block', content: 'inline*' },
        heading: {
            group: 'block',
            content: 'inline*',
            attrs: { level: { default: 1 }, sectionId: { default: null } },
        },
        text: { group: 'inline' },
    },
});
const h = (level, text, sectionId = null) => schema.node('heading', { level, sectionId }, text ? [schema.text(text)] : []);
const p = text => schema.node('paragraph', null, text ? [schema.text(text)] : []);

test('headingsWithoutId : H2 / H3 sans identifiant ou en doublon (le premier le garde), ni H1 ni H4', () => {
    const d = schema.node('doc', null, [h(1, 'T'), h(2, 'A', 'x'), h(3, 'B'), h(2, 'C', 'x'), h(4, 'D')]);
    const positions = [];
    d.forEach((_node, pos) => positions.push(pos));
    assert.deepEqual(headingsWithoutId(d), [positions[2], positions[3]]);
});

test('headingsWithoutId : un titre vide attend d’avoir du texte', () => {
    const d = schema.node('doc', null, [h(2, 'A', 'x'), h(2, ''), h(3, '', 'x')]);
    assert.deepEqual(headingsWithoutId(d), []);
});

// --- Plugin des identifiants ---

let counter = 0;
const plugin = editable => sectionIdsPlugin({ editable: () => editable, newId: () => `id-${++counter}` });
const ids = d => {
    const out = [];
    d.forEach(node => node.type.name === 'heading' && out.push(node.attrs.sectionId));
    return out;
};
const base = schema.node('doc', null, [h(1, 'T'), h(2, 'A', 'x'), p('a')]);

test('sectionIdsPlugin : un H2 / H3 nouveau ou en doublon reçoit un identifiant, en une transaction ajoutée', () => {
    counter = 0;
    const state = EditorState.create({ doc: base, plugins: [plugin(true)] });
    const tr = state.tr.insert(base.content.size, [h(3, 'B'), h(2, 'C', 'x'), h(4, 'D')]);
    const { state: next, transactions } = state.applyTransaction(tr);
    assert.equal(transactions.length, 2);
    assert.deepEqual(ids(next.doc), [null, 'x', 'id-1', 'id-2', null]);
    // Rien à ajouter ensuite
    assert.equal(next.applyTransaction(next.tr.insertText('!', 2)).transactions.length, 1);
});

test('sectionIdsPlugin : rien pendant une composition (touche morte, IME), l’identifiant vient après', () => {
    counter = 0;
    let composing = true;
    const withComposition = sectionIdsPlugin({ editable: () => true, composing: () => composing, newId: () => `id-${++counter}` });
    const state = EditorState.create({ doc: base, plugins: [withComposition] });
    const during = state.apply(state.tr.insert(base.content.size, h(2, 'ê')));
    assert.deepEqual(ids(during.doc), [null, 'x', null]);
    composing = false;
    const after = during.apply(during.tr.insertText('t', during.doc.content.size - 1));
    assert.deepEqual(ids(after.doc), [null, 'x', 'id-1']);
});

test('sectionIdsPlugin : rien pour une modification venue de Yjs, ni en lecture seule', () => {
    counter = 0;
    const insert = state => state.tr.insert(base.content.size, h(2, 'B'));
    const remote = EditorState.create({ doc: base, plugins: [plugin(true)] });
    const fromYjs = insert(remote).setMeta(ySyncPluginKey, { isChangeOrigin: true });
    assert.deepEqual(ids(remote.apply(fromYjs).doc), [null, 'x', null]);
    const readonly = EditorState.create({ doc: base, plugins: [plugin(false)] });
    assert.deepEqual(ids(readonly.apply(insert(readonly)).doc), [null, 'x', null]);
});
