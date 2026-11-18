// Souris des collaborateurs : ce qui s'affiche des états d'awareness
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { clampPosition, isPointer, remotePointers } from '../src/utils/mousePointers.js';

const anchor = { type: null, tname: 'default', item: { client: 1, clock: 3 }, assoc: 0 };

test("les souris des autres : ni la sienne, ni l'écrivain du serveur, ni une souris mal formée", () => {
    const states = new Map([
        [7, { user: { name: 'Moi', color: '#111' }, pointer: { anchor, dx: 1, dy: 2 } }],
        [9, { user: { name: 'Léa', color: '#DC2626' }, pointer: { anchor, dx: 4, dy: -3 } }],
        [3, { user: { name: 'Max' }, pointer: { anchor, dx: 0, dy: 0 } }],
        [4, { user: { name: 'Search', writer: true } }],
        [5, { user: { name: 'Bob' }, pointer: { anchor, dx: 'x', dy: 0 } }],
        [6, { pointer: { anchor, dx: 0, dy: 0 } }],
        [8, { user: { name: 'Zoé' }, pointer: null }],
    ]);
    const pointers = remotePointers(states, 7);
    assert.deepEqual(
        pointers.map(p => [p.clientId, p.name, p.color, p.dx, p.dy]),
        [
            [3, 'Max', '#6B46C1', 0, 0],
            [9, 'Léa', '#DC2626', 4, -3],
        ]
    );
});

test('forme et bornes', () => {
    assert.equal(isPointer({ anchor, dx: 0, dy: 0 }), true);
    assert.equal(isPointer({ anchor: null, dx: 0, dy: 0 }), false);
    assert.equal(isPointer({ anchor, dx: Infinity, dy: 0 }), false);
    assert.equal(clampPosition(-2, 10), 0);
    assert.equal(clampPosition(12, 10), 10);
    assert.equal(clampPosition(5, 10), 5);
});
