// Couleur de marque d'un agent : seulement de l'hexadécimal (cf. utils/collabUsers)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { brandColorOf } from '../src/utils/collabUsers.js';

test('hexadécimal court ou long', () => {
    assert.equal(brandColorOf({ color: '#D97757' }), '#D97757');
    assert.equal(brandColorOf({ color: ' #abc ' }), '#abc');
});

test('rien sans couleur, ni pour une autre forme de couleur', () => {
    assert.equal(brandColorOf({}), null);
    assert.equal(brandColorOf(null), null);
    assert.equal(brandColorOf({ color: 'red' }), null);
    assert.equal(brandColorOf({ color: 'rgb(1, 2, 3)' }), null);
    assert.equal(brandColorOf({ color: '#12345' }), null);
    assert.equal(brandColorOf({ color: '#D97757; background: url(x)' }), null);
    assert.equal(brandColorOf({ color: 42 }), null);
});
