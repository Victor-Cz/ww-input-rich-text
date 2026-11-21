// Document vide : état vide (useEmptyLayout) et variable isEmpty (cf. utils/emptyDoc)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Schema } from 'prosemirror-model';
import { isDocEmpty } from '../src/utils/emptyDoc.js';

const schema = new Schema({
    nodes: {
        doc: { content: 'frontmatter? block+' },
        frontmatter: { content: 'frontmatterField+' },
        frontmatterField: { content: 'text*', attrs: { key: { default: null } } },
        paragraph: { group: 'block', content: 'inline*' },
        heading: { group: 'block', content: 'inline*', attrs: { level: { default: 1 } } },
        bulletList: { group: 'block', content: 'listItem+' },
        listItem: { content: 'paragraph+' },
        image: { group: 'block', atom: true, attrs: { src: { default: null } } },
        hardBreak: { group: 'inline', inline: true },
        text: { group: 'inline' },
    },
});
const p = (...content) => schema.node('paragraph', null, content);
const doc = (...content) => schema.node('doc', null, content);
const field = (key, value) => schema.node('frontmatterField', { key }, value ? [schema.text(value)] : []);
const frontmatter = (...fields) => schema.node('frontmatter', null, fields);

test('un paragraphe vide : vide', () => {
    assert.equal(isDocEmpty(doc(p())), true);
});

test('du texte : pas vide', () => {
    assert.equal(isDocEmpty(doc(p(schema.text('Bonjour')))), false);
    assert.equal(isDocEmpty(doc(p(schema.text(' ')))), false);
});

test('un nœud atomique (image, saut de ligne) : pas vide', () => {
    assert.equal(isDocEmpty(doc(schema.node('image', { src: 'a.png' }))), false);
    assert.equal(isDocEmpty(doc(p(schema.node('hardBreak')))), false);
});

test('un autre bloc, même sans texte (titre, liste, plusieurs paragraphes) : pas vide', () => {
    assert.equal(isDocEmpty(doc(schema.node('heading', { level: 1 }))), false);
    assert.equal(isDocEmpty(doc(schema.node('bulletList', null, [schema.node('listItem', null, [p()])]))), false);
    assert.equal(isDocEmpty(doc(p(), p())), false);
});

test('le frontmatter est ignoré, rempli ou non', () => {
    assert.equal(isDocEmpty(doc(frontmatter(field('slug', 'mon-article'), field('metaTitle')), p())), true);
    assert.equal(isDocEmpty(doc(frontmatter(field('slug')), p())), true);
    assert.equal(isDocEmpty(doc(frontmatter(field('slug', 'mon-article')), p(schema.text('Texte')))), false);
});
