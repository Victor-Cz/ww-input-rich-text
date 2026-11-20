// Notes de section du plan : hors de la valeur, de l'analyse SEO et du
// sommaire ; Entrée en sort, effacer une note vide la supprime (cf. utils/sectionNotes)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { getSchema } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { frontmatterExtensions } from '../src/extensions/Frontmatter.js';
import { sectionExtensions } from '../src/extensions/Sections.js';
import { deleteEmptySectionNote, exitSectionNote, exportedContent, withoutSectionNotes } from '../src/utils/sectionNotes.js';
import { extractModel } from '../src/seo/extractors.js';
import { buildOutline } from '../src/utils/outline.js';

const schema = new Schema({
    nodes: {
        doc: { content: 'frontmatter? block+' },
        frontmatter: { content: 'paragraph' },
        paragraph: { group: 'block', content: 'inline*' },
        heading: { group: 'block', content: 'inline*', attrs: { level: { default: 1 } } },
        bulletList: { group: 'block', content: 'listItem+' },
        listItem: { content: 'paragraph block*' },
        blockquote: { group: 'block', content: 'block+' },
        sectionNote: { group: 'block', content: '(paragraph | bulletList)+', defining: true, isolating: true },
        text: { group: 'inline' },
    },
});
const p = text => schema.node('paragraph', null, text ? [schema.text(text)] : []);
const h = (level, text) => schema.node('heading', { level }, [schema.text(text)]);
const list = (...items) => schema.node('bulletList', null, items.map(text => schema.node('listItem', null, [p(text)])));
const note = (...content) => schema.node('sectionNote', null, content);
const texts = fragment => {
    const out = [];
    fragment.forEach(node => out.push(node.textContent));
    return out;
};

// Frontmatter · H1 · note d'intro · H2 · note (objectif + points) · texte · citation avec une note
const doc = schema.node('doc', null, [
    schema.node('frontmatter', null, [p('meta')]),
    h(1, 'Titre'),
    note(p('Annoncer le sujet')),
    h(2, 'Section'),
    note(p('Objectif'), list('Point un', 'Point deux')),
    p('Texte de la section'),
    schema.node('blockquote', null, [p('Cité'), note(p('Note cachée'))]),
]);

test('exportedContent : sans frontmatter ni notes, à toute profondeur', () => {
    const content = exportedContent(doc);
    assert.deepEqual(texts(content), ['Titre', 'Section', 'Texte de la section', 'Cité']);
    assert.equal(content.lastChild.childCount, 1);
});

test('withoutSectionNotes : le même fragment quand il n’y a pas de note', () => {
    const plain = schema.node('doc', null, [h(1, 'Titre'), schema.node('blockquote', null, [p('Cité')])]);
    assert.equal(withoutSectionNotes(plain.content), plain.content);
});

test('analyse SEO : les notes ne comptent ni dans le texte, ni dans les mots, ni dans les listes', () => {
    const model = extractModel(doc);
    assert.equal(model.fullText.includes('Objectif'), false);
    assert.equal(model.fullText.includes('Note cachée'), false);
    assert.equal(model.listCount, 0);
    // meta (frontmatter) exclue, Titre, Section, Texte de la section, Cité
    assert.equal(model.wordCount, 1 + 1 + 4 + 1);
});

test('sommaire : un titre glissé dans une note n’y entre pas', () => {
    const withHeading = schema.node('doc', null, [
        h(2, 'Section'),
        note(p('Objectif'), schema.node('bulletList', null, [schema.node('listItem', null, [p('Point'), h(3, 'Caché')])])),
    ]);
    assert.deepEqual(
        buildOutline(withHeading, [2, 3]).map(item => item.text),
        ['Section']
    );
});

test('schéma de l’éditeur : note et sectionId comme le serveur collab, rien de rendu pour l’identifiant', () => {
    const editorSchema = getSchema([StarterKit.configure({ document: false, history: false }), ...frontmatterExtensions(), ...sectionExtensions()]);
    const sectionNote = editorSchema.nodes.sectionNote;
    assert.equal(sectionNote.spec.content, '(paragraph | bulletList)+');
    assert.equal(sectionNote.spec.group, 'block');
    assert.equal(sectionNote.spec.defining, true);
    assert.equal(sectionNote.spec.isolating, true);
    assert.deepEqual(sectionNote.spec.parseDOM.map(rule => rule.tag), ['div[data-section-note]']);
    const noteNode = sectionNote.create(null, editorSchema.nodes.paragraph.create());
    assert.deepEqual(sectionNote.spec.toDOM(noteNode), ['div', { 'data-section-note': '' }, 0]);
    const heading = editorSchema.nodes.heading;
    assert.deepEqual(heading.spec.attrs.sectionId, { default: null });
    assert.deepEqual(heading.spec.toDOM(heading.create({ level: 2, sectionId: 'abc' })), ['h2', {}, 0]);
    const element = { getAttribute: name => (name === 'data-section-id' ? 'abc' : null), style: {} };
    assert.deepEqual(heading.spec.parseDOM[1].getAttrs(element), { level: 2, sectionId: 'abc' });
});

// --- Clavier ---

const stateAt = (d, pos) => EditorState.create({ doc: d, selection: TextSelection.create(d, pos) });
const run = (command, state) => {
    let next = null;
    const handled = command(state, tr => {
        next = state.apply(tr);
    });
    return { handled, next };
};
const blocks = d => {
    const out = [];
    d.forEach(node => out.push(node.type.name === 'sectionNote' ? `note(${texts(node.content).join('|')})` : node.textContent));
    return out;
};

test('exitSectionNote : Entrée sur le paragraphe vide qui termine la note en sort', () => {
    const d = schema.node('doc', null, [h(2, 'A'), note(p('Objectif'), p()), h(2, 'B')]);
    // [0] A (3) · [3] note : [4] « Objectif » (10) · [14] paragraphe vide
    const { handled, next } = run(exitSectionNote, stateAt(d, 15));
    assert.equal(handled, true);
    assert.deepEqual(blocks(next.doc), ['A', 'note(Objectif)', '', 'B']);
    assert.equal(next.selection.$from.parent.type.name, 'paragraph');
    assert.equal(next.selection.$from.depth, 1);
});

test('exitSectionNote : une note vide garde son paragraphe ; ailleurs, rien', () => {
    const empty = schema.node('doc', null, [h(2, 'A'), note(p())]);
    const { next } = run(exitSectionNote, stateAt(empty, 5));
    assert.deepEqual(blocks(next.doc), ['A', 'note()', '']);
    // Paragraphe non vide, ou vide mais pas le dernier de la note : Entrée normale
    const d = schema.node('doc', null, [h(2, 'A'), note(p(), p('Objectif'))]);
    assert.equal(run(exitSectionNote, stateAt(d, 5)).handled, false);
    assert.equal(run(exitSectionNote, stateAt(d, 8)).handled, false);
});

test('deleteEmptySectionNote : effacer dans une note vide la supprime', () => {
    const d = schema.node('doc', null, [h(2, 'A'), note(p()), p('texte')]);
    const { handled, next } = run(deleteEmptySectionNote, stateAt(d, 5));
    assert.equal(handled, true);
    assert.deepEqual(blocks(next.doc), ['A', 'texte']);
    assert.equal(next.selection.$from.parent.textContent, 'A');
    // Une note qui a du texte reste
    const full = schema.node('doc', null, [h(2, 'A'), note(p(), p('Objectif'))]);
    assert.equal(run(deleteEmptySectionNote, stateAt(full, 5)).handled, false);
});

test('deleteEmptySectionNote : la note seule dans le document laisse un paragraphe', () => {
    const d = schema.node('doc', null, [note(p())]);
    const { handled, next } = run(deleteEmptySectionNote, stateAt(d, 2));
    assert.equal(handled, true);
    assert.deepEqual(blocks(next.doc), ['']);
});
