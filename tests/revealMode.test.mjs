import assert from 'node:assert/strict';
import { test } from 'node:test';
import { REVEAL_BLOCK_WORDS, revealAsBlock } from '../src/utils/revealMode.js';

test("auto : un remplacement d'un coup ; un ajout d'un bloc s'il est gros, mot à mot s'il est petit", () => {
    assert.equal(revealAsBlock('auto', { words: 1, replace: true }), true, 'un mot remplacé : d\'un coup');
    assert.equal(revealAsBlock('auto', { words: 3 }), false, 'un mot, une phrase');
    assert.equal(revealAsBlock('auto', { words: REVEAL_BLOCK_WORDS }), false);
    assert.equal(revealAsBlock('auto', { words: REVEAL_BLOCK_WORDS + 1 }), true, 'un long passage');
    assert.equal(revealAsBlock('auto', { words: 4, multiBlock: true }), true, 'plusieurs paragraphes');
    assert.equal(revealAsBlock(undefined, { words: 400 }), true, 'auto par défaut');
});

test('block et words forcent le mode', () => {
    assert.equal(revealAsBlock('block', { words: 1 }), true);
    assert.equal(revealAsBlock('words', { words: 400, multiBlock: true, replace: true }), false);
});
