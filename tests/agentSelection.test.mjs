// Sélection de l'agent : auteurs du serveur, changements qui la touchent, plages, couleur (cf. utils/agentSelection)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
    concernsWriters,
    cssColor,
    MAX_AGENT_RANGES,
    rangesFrom,
    writerSelections,
} from '../src/utils/agentSelection.js';

const position = clock => ({ type: null, tname: 'default', item: { client: 1, clock }, assoc: 0 });
const range = (a, b) => ({ anchor: position(a), head: position(b) });

test('seuls les auteurs du serveur qui montrent une sélection, triés par client', () => {
    const states = new Map([
        [9, { user: { name: 'Claude • Victor', writer: true, color: '#D97757' }, selections: [range(1, 4)] }],
        [3, { user: { name: 'Victor', id: 'u1' }, selections: [range(1, 2)], cursor: {} }],
        [5, { user: { name: 'Search', writer: true }, selections: [range(5, 8), range(9, 12)] }],
        [7, { user: { name: 'Agent', writer: true } }],
        [8, { user: { name: 'Agent', writer: true }, selections: [] }],
    ]);
    assert.deepEqual(writerSelections(states), [
        { clientId: 5, color: null, selections: [range(5, 8), range(9, 12)] },
        { clientId: 9, color: '#D97757', selections: [range(1, 4)] },
    ]);
});

test('une plage sans ancre ou sans tête est ignorée, le nombre de plages est borné', () => {
    const states = new Map([
        [
            1,
            {
                user: { writer: true, color: 'red; background: url(x)' },
                selections: [{ anchor: position(1) }, { anchor: null, head: position(2) }, 'x', range(3, 4)],
            },
        ],
    ]);
    assert.deepEqual(writerSelections(states), [{ clientId: 1, color: null, selections: [range(3, 4)] }]);

    const many = Array.from({ length: MAX_AGENT_RANGES + 5 }, (_, index) => range(index, index + 1));
    const [entry] = writerSelections(new Map([[1, { user: { writer: true }, selections: many }]]));
    assert.equal(entry.selections.length, MAX_AGENT_RANGES);
    assert.deepEqual(writerSelections(undefined), []);
});

test('un changement touche la sélection : un auteur, ou un client qui en montrait une', () => {
    const states = new Map([
        [1, { user: { name: 'Victor' }, pointer: {} }],
        [2, { user: { name: 'Claude', writer: true } }],
    ]);
    assert.equal(concernsWriters(states, [1], new Set()), false);
    assert.equal(concernsWriters(states, [2], new Set()), true);
    // Parti : plus dans les états, mais il montrait une sélection
    assert.equal(concernsWriters(states, [3], new Set([3])), true);
    assert.equal(concernsWriters(states, [3], new Set()), false);
});

test('plages : triées, introuvables, vides et hors document ignorées, sens indifférent', () => {
    assert.deepEqual(
        rangesFrom(
            [
                { anchor: 20, head: 12, color: '#D97757' },
                { anchor: 3, head: 8, color: null },
                { anchor: null, head: 5, color: null },
                { anchor: 7, head: 7, color: null },
                { anchor: 90, head: 120, color: null },
                { anchor: 120, head: 140, color: null },
            ],
            100
        ),
        [
            { from: 3, to: 8, color: null },
            { from: 12, to: 20, color: '#D97757' },
            { from: 90, to: 100, color: null },
        ]
    );
});

test('couleur du paramètre : gardée si elle ne peut pas sortir de l’attribut style', () => {
    assert.equal(cssColor(' #7611FA '), '#7611FA');
    assert.equal(cssColor('var(--brand, #7611FA)'), 'var(--brand, #7611FA)');
    assert.equal(cssColor('rgb(118 17 250 / 80%)'), 'rgb(118 17 250 / 80%)');
    assert.equal(cssColor('red; background: blue'), null);
    assert.equal(cssColor('url(https://x)'), null);
    assert.equal(cssColor('"red"'), null);
    assert.equal(cssColor(''), null);
    assert.equal(cssColor(null), null);
});

test('contrat du serveur : une position relative sur le texte Yjs, en JSON, retombe sur le passage', async () => {
    const Y = await import('yjs');
    const { Schema } = await import('prosemirror-model');
    const { initProseMirrorDoc, relativePositionToAbsolutePosition } = await import('y-prosemirror');
    const schema = new Schema({
        nodes: { doc: { content: 'block+' }, paragraph: { group: 'block', content: 'text*' }, text: {} },
    });
    const ydoc = new Y.Doc();
    const fragment = ydoc.getXmlFragment('default');
    const paragraphs = ['Bonjour le monde', 'Deuxième ligne ici'].map(text => {
        const paragraph = new Y.XmlElement('paragraph');
        const content = new Y.XmlText();
        content.insert(0, text);
        paragraph.insert(0, [content]);
        return { paragraph, content };
    });
    fragment.insert(0, paragraphs.map(({ paragraph }) => paragraph));
    const { doc, meta } = initProseMirrorDoc(fragment, schema);

    // Ce que le serveur publie : « ligne » dans le second paragraphe, passé par le réseau
    const sent = index =>
        JSON.parse(JSON.stringify(Y.relativePositionToJSON(Y.createRelativePositionFromTypeIndex(paragraphs[1].content, index))));
    const [entry] = writerSelections(new Map([[4, { user: { writer: true }, selections: [{ anchor: sent(9), head: sent(14) }] }]]));
    const absolute = json => relativePositionToAbsolutePosition(ydoc, fragment, Y.createRelativePositionFromJSON(json), meta.mapping);
    const [range] = rangesFrom(
        entry.selections.map(({ anchor, head }) => ({ anchor: absolute(anchor), head: absolute(head), color: null })),
        doc.content.size
    );
    assert.equal(doc.textBetween(range.from, range.to), 'ligne');
});
