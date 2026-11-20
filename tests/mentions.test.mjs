// Les mentions du document (cf. utils/mentions)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Schema } from 'prosemirror-model';
import { mentionIds } from '../src/utils/mentions.js';

const schema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        paragraph: { group: 'block', content: 'inline*' },
        bulletList: { group: 'block', content: 'listItem+' },
        listItem: { content: 'paragraph+' },
        mention: { group: 'inline', inline: true, atom: true, attrs: { id: { default: null }, label: { default: null } } },
        text: { group: 'inline' },
    },
});
const mention = id => schema.node('mention', { id, label: id });
const p = (...content) => schema.node('paragraph', null, content);

test("les id des mentions dans l'ordre, listes comprises", () => {
    const doc = schema.node('doc', null, [
        p(schema.text('Salut '), mention('lea'), schema.text(' et '), mention('max')),
        schema.node('bulletList', null, [schema.node('listItem', null, [p(mention('zoe'))])]),
        p(schema.text('rien')),
    ]);
    assert.deepEqual(mentionIds(doc), ['lea', 'max', 'zoe']);
    assert.deepEqual(mentionIds(schema.node('doc', null, [p()])), []);
});
