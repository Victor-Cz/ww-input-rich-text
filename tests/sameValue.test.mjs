// Égalités avant publication (cf. utils/sameValue)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sameValue, shallowEqual } from '../src/utils/sameValue.js';

test('sameValue : primitives par ===, objets et tableaux par leur JSON', () => {
    assert.equal(sameValue(3, 3), true);
    assert.equal(sameValue('a', 'b'), false);
    assert.equal(sameValue(null, null), true);
    assert.equal(sameValue(null, {}), false);
    assert.equal(sameValue(undefined, null), false);
    assert.equal(sameValue({ canUndo: false, canRedo: true }, { canUndo: false, canRedo: true }), true);
    assert.equal(sameValue({ canUndo: false }, { canUndo: true }), false);
    assert.equal(sameValue([{ id: 'a' }], [{ id: 'a' }]), true);
    assert.equal(sameValue([], {}), false);
    assert.equal(sameValue(0, '0'), false);
});

test('shallowEqual : mêmes clés, valeurs identiques', () => {
    const inner = { a: 1 };
    assert.equal(shallowEqual({ x: 1, y: inner }, { x: 1, y: inner }), true);
    assert.equal(shallowEqual({ x: 1, y: { a: 1 } }, { x: 1, y: { a: 1 } }), false, 'pas en profondeur');
    assert.equal(shallowEqual({ x: 1 }, { x: 1, y: undefined }), false);
    assert.equal(shallowEqual({ x: 1, y: undefined }, { x: 1, z: undefined }), false);
    assert.equal(shallowEqual(null, { x: 1 }), false);
});
