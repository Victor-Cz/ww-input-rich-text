// Blocs prévus du plan : une puce `[format] …` d'une note de section se montre
// en badge, sauf dans la puce du curseur (cf. utils/blocBadges, extensions/BlocBadges)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { blocBadgesPlugin } from '../src/extensions/BlocBadges.js';
import { BLOC_LABELS, blocLabel, blocPrefixes } from '../src/utils/blocBadges.js';

const schema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        paragraph: { group: 'block', content: 'inline*' },
        heading: { group: 'block', content: 'inline*', attrs: { level: { default: 1 } } },
        bulletList: { group: 'block', content: 'listItem+' },
        listItem: { content: 'paragraph block*' },
        sectionNote: { group: 'block', content: '(paragraph | bulletList)+', defining: true, isolating: true },
        text: { group: 'inline' },
    },
});
const p = text => schema.node('paragraph', null, text ? [schema.text(text)] : []);
const list = (...items) => schema.node('bulletList', null, items.map(text => schema.node('listItem', null, [p(text)])));
const note = (...content) => schema.node('sectionNote', null, content);

// H3 · note (but + un point, un bloc, un format inconnu) · texte avec un faux préfixe · liste hors note
const doc = schema.node('doc', null, [
    schema.node('heading', { level: 3 }, [schema.text('Les mentions')]),
    note(p('Le but'), list('Le numéro', '[checklist] Les pièces à réunir', '[à vérifier] Le SIRET')),
    p('[checklist] dans le texte'),
    list('[faq] hors note'),
    note(list('[key_takeaways] Les trois points')),
]);

test('blocPrefixes : les puces de notes à format connu, préfixe et paragraphe', () => {
    const found = blocPrefixes(doc);
    assert.deepEqual(
        found.map(item => item.format),
        ['checklist', 'key_takeaways']
    );
    assert.equal(doc.textBetween(found[0].from, found[0].to), '[checklist] ');
    assert.equal(doc.textBetween(found[0].start, found[0].end), '[checklist] Les pièces à réunir');
    assert.equal(doc.textBetween(found[1].from, found[1].to), '[key_takeaways] ');
});

test('blocLabel : le libellé dans la langue, anglais par défaut ; chaque format a les deux', () => {
    assert.equal(blocLabel('pitfall_list', 'fr'), 'Pièges à éviter');
    assert.equal(blocLabel('pitfall_list', 'de'), 'Pitfalls');
    assert.equal(blocLabel('inconnu', 'fr'), 'inconnu');
    for (const labels of Object.values(BLOC_LABELS)) assert.ok(labels.fr && labels.en);
});

const decorationsAt = (pos, editable) => {
    const plugin = blocBadgesPlugin({ editable: () => editable, lang: () => 'fr' });
    const state = EditorState.create({ doc, plugins: [plugin], selection: TextSelection.create(doc, pos) });
    return plugin.props.decorations.call(plugin, state).find();
};
const badges = decorations => decorations.filter(item => item.from === item.to).map(item => item.spec.key);

test('décorations : un badge et le préfixe masqué par bloc prévu', () => {
    const decorations = decorationsAt(2, true);
    assert.deepEqual(badges(decorations), ['bloc-checklist-Checklist', 'bloc-key_takeaways-À retenir']);
    const masked = decorations.filter(item => item.from !== item.to);
    assert.deepEqual(
        masked.map(item => doc.textBetween(item.from, item.to)),
        ['[checklist] ', '[key_takeaways] ']
    );
});

test('décorations : la puce du curseur montre son préfixe, sauf en lecture seule', () => {
    const [checklist] = blocPrefixes(doc);
    assert.deepEqual(badges(decorationsAt(checklist.end, true)), ['bloc-key_takeaways-À retenir']);
    assert.equal(badges(decorationsAt(checklist.end, false)).length, 2);
});
