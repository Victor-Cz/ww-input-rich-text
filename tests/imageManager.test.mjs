// Images du document : retirer un bloc image (deleteImageById) ou seulement vider son adresse (removeImageById)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deleteImageById, removeImageById } from '../src/composables/useImageManager.js';

// Un éditeur réduit à ce que lisent les fonctions : un document de nœuds à plat et une transaction
function fakeEditor(nodes) {
    const dispatched = [];
    let offset = 0;
    const placed = nodes.map(node => {
        const at = { node, pos: offset };
        offset += node.nodeSize;
        return at;
    });
    const tr = {
        steps: [],
        delete(from, to) {
            this.steps.push({ delete: [from, to] });
            return this;
        },
        setNodeMarkup(pos, type, attrs) {
            this.steps.push({ markup: [pos, attrs] });
            return this;
        },
    };
    return {
        dispatched,
        state: {
            tr,
            doc: {
                descendants(visit) {
                    for (const { node, pos } of placed) {
                        if (visit(node, pos) === false) break;
                    }
                },
            },
        },
        view: { dispatch: transaction => dispatched.push(transaction.steps.slice()) },
    };
}

const paragraph = { type: { name: 'paragraph' }, attrs: {}, nodeSize: 4 };
const image = id => ({ type: { name: 'customImage' }, attrs: { 'data-image-id': id, src: 'https://x/a.png' }, nodeSize: 1 });

test('deleteImageById retire le bloc entier, à sa place', () => {
    const editor = fakeEditor([paragraph, image('img_a'), paragraph, image('img_b')]);
    assert.equal(deleteImageById(editor, 'img_b'), true);
    assert.deepEqual(editor.dispatched, [[{ delete: [9, 10] }]]);
});

test('deleteImageById sans image correspondante ne touche à rien', () => {
    const editor = fakeEditor([paragraph, image('img_a')]);
    assert.equal(deleteImageById(editor, 'img_z'), false);
    assert.equal(deleteImageById(editor, ''), false);
    assert.equal(deleteImageById(null, 'img_a'), false);
    assert.deepEqual(editor.dispatched, []);
});

test("removeImageById, lui, garde le bloc et ne vide que l'adresse", () => {
    const editor = fakeEditor([paragraph, image('img_a')]);
    assert.equal(removeImageById(editor, 'img_a'), true);
    assert.equal(editor.dispatched[0][0].markup[1].src, '');
    assert.equal(editor.dispatched[0].some(step => step.delete), false);
});
