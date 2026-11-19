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

test('clampToRect garde un point du texte et ramène une marge au bord le plus proche', async () => {
    const { clampToRect } = await import('../src/utils/mousePointers.js');
    const rect = { left: 100, top: 50, right: 500, bottom: 900 };
    assert.deepEqual(clampToRect(300, 400, rect), { x: 300, y: 400 });
    assert.deepEqual(clampToRect(20, 400, rect), { x: 101, y: 400 }, 'marge gauche');
    assert.deepEqual(clampToRect(800, 950, rect), { x: 499, y: 899 }, 'après la fin du texte');
    assert.deepEqual(clampToRect(10, 10, { left: 0, top: 0, right: 1, bottom: 1 }), { x: 0.5, y: 0.5 }, 'rectangle plus petit que la marge');
});
