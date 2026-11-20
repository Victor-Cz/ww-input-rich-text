// Sections du plan de l'article : plages, cibles, déplacement en une
// transaction, identifiants des H2 / H3 (cf. utils/sections, extensions/Sections)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Schema } from 'prosemirror-model';
import { EditorState, NodeSelection, TextSelection } from 'prosemirror-state';
import { ySyncPluginKey } from 'y-prosemirror';
import { sectionIdsPlugin } from '../src/extensions/Sections.js';
import {
    documentSections,
    dropTargets,
    headingsWithoutId,
    moveSection,
    nearestTarget,
    sectionAround,
    sectionStartingAt,
    selectionAfterMove,
    stepTarget,
} from '../src/utils/sections.js';

const schema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        paragraph: { group: 'block', content: 'inline*' },
        heading: {
            group: 'block',
            content: 'inline*',
            attrs: { level: { default: 1 }, sectionId: { default: null } },
        },
        blockquote: { group: 'block', content: 'block+' },
        image: { group: 'block', atom: true },
        text: { group: 'inline' },
    },
});
const h = (level, text, sectionId = null) => schema.node('heading', { level, sectionId }, text ? [schema.text(text)] : []);
const p = text => schema.node('paragraph', null, text ? [schema.text(text)] : []);

// H1 · intro · A (H2) [a, A1 (H3) a1, A2 (H3) a2] · B (H2) [b] · C (H2) [C1 (H3) c1]
const blocks = [
    h(1, 'Titre'),
    p('intro'),
    h(2, 'A', 'a'),
    p('a'),
    h(3, 'A1', 'a1'),
    p('a1'),
    h(3, 'A2', 'a2'),
    p('a2'),
    h(2, 'B', 'b'),
    p('b'),
    h(2, 'C', 'c'),
    h(3, 'C1', 'c1'),
    p('c1'),
];
const doc = schema.node('doc', null, blocks);
// Position de premier niveau de chaque bloc
const at = [];
doc.forEach((_node, pos) => at.push(pos));
const titles = d => {
    const out = [];
    d.forEach(node => out.push(node.type.name === 'heading' ? `${'#'.repeat(node.attrs.level)} ${node.textContent}` : node.textContent));
    return out;
};

test('documentSections : un H2 va jusqu’au H2 suivant, un H3 jusqu’au H3 ou au H2 suivant', () => {
    const sections = documentSections(doc).map(({ level, from, to, parent }) => ({
        level,
        from,
        to,
        parent: parent && parent.from,
    }));
    assert.deepEqual(sections, [
        { level: 2, from: at[2], to: at[8], parent: null },
        { level: 3, from: at[4], to: at[6], parent: at[2] },
        { level: 3, from: at[6], to: at[8], parent: at[2] },
        { level: 2, from: at[8], to: at[10], parent: null },
        { level: 2, from: at[10], to: doc.content.size, parent: null },
        { level: 3, from: at[11], to: doc.content.size, parent: at[10] },
    ]);
});

test('documentSections : un H1 ou un H4 ne ferme rien, un titre imbriqué n’ouvre rien', () => {
    const other = schema.node('doc', null, [
        h(2, 'A'),
        h(1, 'Autre H1'),
        h(4, 'H4'),
        schema.node('blockquote', null, [h(2, 'Cité')]),
        h(2, 'B'),
    ]);
    const sections = documentSections(other);
    assert.equal(sections.length, 2);
    assert.deepEqual(titles(other.cut(sections[0].from, sections[0].to)), ['## A', '# Autre H1', '#### H4', 'Cité']);
});

test('sectionAround : la sous-section du curseur, sinon sa section ; rien dans l’introduction', () => {
    assert.equal(sectionAround(doc, at[1] + 1), null);
    assert.equal(sectionAround(doc, at[3] + 1).from, at[2]); // texte de A avant ses H3
    assert.equal(sectionAround(doc, at[2] + 1).from, at[2]); // titre de A
    assert.equal(sectionAround(doc, at[5] + 1).from, at[4]); // dans A1
    assert.equal(sectionAround(doc, at[12] + 1).from, at[11]); // dans C1
    assert.equal(sectionStartingAt(doc, at[8]).level, 2);
    assert.equal(sectionStartingAt(doc, at[9]), null);
});

test('dropTargets : H2 entre les sections H2, H3 entre les sous-sections de chaque H2', () => {
    const a = sectionStartingAt(doc, at[2]);
    assert.deepEqual(dropTargets(doc, a), [at[2], at[8], at[10], doc.content.size]);
    const a1 = sectionStartingAt(doc, at[4]);
    // A : avant A1, avant A2, fin de A · B (sans H3) : sa fin · C : avant C1, fin de C
    assert.deepEqual(dropTargets(doc, a1), [at[4], at[6], at[8], at[10], at[11], doc.content.size]);
});

test('dropTargets : des H3 avant le premier H2 (document sans H2…) se déplacent entre eux', () => {
    const onlyH3 = schema.node('doc', null, [h(1, 'T'), h(3, 'X'), p('x'), h(3, 'Y'), p('y')]);
    const pos = [];
    onlyH3.forEach((_node, offset) => pos.push(offset));
    const x = sectionStartingAt(onlyH3, pos[1]);
    assert.equal(x.parent, null);
    assert.deepEqual(dropTargets(onlyH3, x), [pos[1], pos[3], onlyH3.content.size]);
    assert.equal(stepTarget(onlyH3, x, 'down'), onlyH3.content.size);
    // Avec un H2 ensuite : la fin de l'introduction, puis les cibles du H2
    const mixed = schema.node('doc', null, [h(3, 'X'), h(2, 'A'), h(3, 'A1')]);
    assert.deepEqual(dropTargets(mixed, sectionStartingAt(mixed, 0)), [0, 3, 6, mixed.content.size]);
});

test('stepTarget : un cran plus haut ou plus bas, null en tête ou en fin', () => {
    const a = sectionStartingAt(doc, at[2]);
    const c = sectionStartingAt(doc, at[10]);
    assert.equal(stepTarget(doc, a, 'up'), null);
    assert.equal(stepTarget(doc, a, 'down'), at[10]); // après B
    assert.equal(stepTarget(doc, c, 'down'), null);
    assert.equal(stepTarget(doc, c, 'up'), at[8]); // avant B
    const a1 = sectionStartingAt(doc, at[4]);
    const a2 = sectionStartingAt(doc, at[6]);
    const c1 = sectionStartingAt(doc, at[11]);
    assert.equal(stepTarget(doc, a1, 'up'), null);
    assert.equal(stepTarget(doc, a2, 'down'), at[10]); // fin de B, qui n'a pas de H3
    assert.equal(stepTarget(doc, c1, 'up'), at[10]); // fin de B
    assert.equal(stepTarget(doc, c1, 'down'), null);
});

test('moveSection : un H2 descend avec ses sous-sections, en une suppression et une insertion', () => {
    const state = EditorState.create({ doc });
    const tr = state.tr;
    const a = sectionStartingAt(doc, at[2]);
    const start = moveSection(tr, a, stepTarget(doc, a, 'down'));
    assert.equal(tr.steps.length, 2);
    assert.deepEqual(titles(tr.doc), [
        '# Titre', 'intro', '## B', 'b', '## A', 'a', '### A1', 'a1', '### A2', 'a2', '## C', '### C1', 'c1',
    ]);
    assert.equal(tr.doc.nodeAt(start).textContent, 'A');
    assert.equal(tr.doc.nodeAt(start).attrs.sectionId, 'a');
});

test('moveSection : un H3 passe à la fin d’un H2 qui n’en a pas, puis remonte', () => {
    const state = EditorState.create({ doc });
    const tr = state.tr;
    const a2 = sectionStartingAt(doc, at[6]);
    const start = moveSection(tr, a2, stepTarget(doc, a2, 'down'));
    assert.deepEqual(titles(tr.doc), [
        '# Titre', 'intro', '## A', 'a', '### A1', 'a1', '## B', 'b', '### A2', 'a2', '## C', '### C1', 'c1',
    ]);
    const moved = sectionStartingAt(tr.doc, start);
    const back = state.apply(tr).tr;
    moveSection(back, moved, stepTarget(back.doc, moved, 'up'));
    assert.deepEqual(titles(back.doc), titles(doc));
});

test('moveSection : une cible dans la section ne bouge rien', () => {
    const tr = EditorState.create({ doc }).tr;
    const a = sectionStartingAt(doc, at[2]);
    assert.equal(moveSection(tr, a, a.from), null);
    assert.equal(moveSection(tr, a, a.to), null);
    assert.equal(tr.steps.length, 0);
});

test('selectionAfterMove : le curseur suit la section, sinon il va au début de son titre', () => {
    const state = EditorState.create({ doc });
    const a = sectionStartingAt(doc, at[2]);
    const inA1 = at[5] + 2; // « a|1 » (après le « a »)
    for (const [selection, expected] of [
        [TextSelection.create(doc, inA1), 'a1'],
        [TextSelection.create(doc, at[1] + 1), 'A'], // dans l'introduction : au titre
    ]) {
        const tr = state.tr;
        const start = moveSection(tr, a, stepTarget(doc, a, 'down'));
        const moved = selectionAfterMove(selection, a, start, tr.doc);
        assert.equal(moved.$from.parent.textContent, expected);
        if (expected === 'a1') assert.equal(moved.$from.parentOffset, 1);
        else assert.equal(moved.from, start + 1);
    }
    // Une image sélectionnée reste sélectionnée
    const withImage = schema.node('doc', null, [h(2, 'A'), schema.node('image'), h(2, 'B')]);
    const tr = EditorState.create({ doc: withImage }).tr;
    const first = sectionStartingAt(withImage, 0);
    const start = moveSection(tr, first, stepTarget(withImage, first, 'down'));
    const moved = selectionAfterMove(NodeSelection.create(withImage, 3), first, start, tr.doc);
    assert.ok(moved instanceof NodeSelection);
    assert.equal(moved.node.type.name, 'image');
});

test('nearestTarget : la cible la plus proche de l’ordonnée', () => {
    const points = [{ pos: 1, y: 100 }, { pos: 5, y: 200 }, { pos: 9, y: 300 }];
    assert.equal(nearestTarget(points, 140), 1);
    assert.equal(nearestTarget(points, 160), 5);
    assert.equal(nearestTarget(points, 900), 9);
    assert.equal(nearestTarget([], 10), null);
});

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
