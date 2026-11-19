// Liens façon Markdown : plages de lien, adresse saisie, ⌘ ou Ctrl (cf. utils/linkReveal)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Schema } from 'prosemirror-model';
import { EditorState, TextSelection } from 'prosemirror-state';
import { LinkReveal, linkRevealKey } from '../src/extensions/LinkReveal.js';
import { isMacPlatform, linkRangeAt, linkRanges, rangeForSelection, resolveHrefInput } from '../src/utils/linkReveal.js';

const schema = new Schema({
    nodes: {
        doc: { content: 'block+' },
        paragraph: { group: 'block', content: 'inline*' },
        text: { group: 'inline' },
    },
    marks: {
        link: { attrs: { href: {} }, inclusive: false },
        bold: {},
    },
});
const link = href => schema.marks.link.create({ href });
const bold = schema.marks.bold.create();
const t = (text, marks = []) => schema.text(text, marks);

// « Voir [la doc] et [le site] » : positions dans le paragraphe à partir de 1
const doc = schema.node('doc', null, [
    schema.node('paragraph', null, [
        t('Voir '),
        t('la ', [link('https://a.fr')]),
        t('doc', [link('https://a.fr'), bold]),
        t(' et '),
        t('le site', [link('https://b.fr')]),
    ]),
    schema.node('paragraph', null, [t('rien')]),
]);

test('linkRanges : un lien coupé par du gras reste une seule plage, dans l\'ordre', () => {
    assert.deepEqual(linkRanges(doc, schema.marks.link), [
        { from: 6, to: 12, href: 'https://a.fr' },
        { from: 16, to: 23, href: 'https://b.fr' },
    ]);
});

test('linkRanges : deux liens voisins d\'adresses différentes restent séparés', () => {
    const two = schema.node('doc', null, [
        schema.node('paragraph', null, [t('a', [link('https://x.fr')]), t('b', [link('https://y.fr')])]),
    ]);
    assert.deepEqual(linkRanges(two, schema.marks.link), [
        { from: 1, to: 2, href: 'https://x.fr' },
        { from: 2, to: 3, href: 'https://y.fr' },
    ]);
});

test('linkRangeAt : bornes comprises, null hors lien', () => {
    assert.equal(linkRangeAt(doc, 6, schema.marks.link)?.href, 'https://a.fr');
    assert.equal(linkRangeAt(doc, 9, schema.marks.link)?.href, 'https://a.fr');
    assert.equal(linkRangeAt(doc, 12, schema.marks.link)?.href, 'https://a.fr');
    assert.equal(linkRangeAt(doc, 14, schema.marks.link), null);
    assert.equal(linkRangeAt(doc, 27, schema.marks.link), null);
});

test('rangeForSelection : la sélection doit rester dans un même lien', () => {
    assert.deepEqual(rangeForSelection(doc, 7, 11, schema.marks.link), { from: 6, to: 12, href: 'https://a.fr' });
    assert.equal(rangeForSelection(doc, 7, 18, schema.marks.link), null);
    assert.equal(rangeForSelection(doc, 2, 3, schema.marks.link), null);
});

test('resolveHrefInput : vide retire, dangereux refusé, sinon adresse nettoyée', () => {
    assert.deepEqual(resolveHrefInput(''), { action: 'remove' });
    assert.deepEqual(resolveHrefInput('   '), { action: 'remove' });
    assert.deepEqual(resolveHrefInput('javascript:alert(1)'), { action: 'reject' });
    assert.deepEqual(resolveHrefInput('java\tscript:alert(1)'), { action: 'reject' });
    assert.deepEqual(resolveHrefInput('data:text/html,x'), { action: 'reject' });
    assert.deepEqual(resolveHrefInput('  https://search.fr/a?b=1 '), { action: 'set', href: 'https://search.fr/a?b=1' });
    assert.deepEqual(resolveHrefInput('/blog/article'), { action: 'set', href: '/blog/article' });
    assert.deepEqual(resolveHrefInput(null), { action: 'remove' });
});

test('isMacPlatform : ⌘ sur Mac et iOS, Ctrl ailleurs', () => {
    assert.equal(isMacPlatform({ userAgentData: { platform: 'macOS' } }), true);
    assert.equal(isMacPlatform({ platform: 'MacIntel' }), true);
    assert.equal(isMacPlatform({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)' }), true);
    assert.equal(isMacPlatform({ platform: 'Win32' }), false);
    assert.equal(isMacPlatform({ userAgentData: { platform: 'Windows' }, userAgent: 'Mac' }), false);
    assert.equal(isMacPlatform(null), false);
});

// Le plugin : quelles décorations selon le curseur, la lecture seule et le clic maintenu

function pluginFor(editable) {
    const ext = LinkReveal.configure({ enabled: () => true, editable: () => editable });
    return ext.config.addProseMirrorPlugins.call({ options: ext.options })[0];
}
const decorationsAt = (plugin, selectionPos, metas = []) => {
    let state = EditorState.create({ doc, plugins: [plugin] });
    let tr = state.tr.setSelection(TextSelection.create(state.doc, selectionPos));
    for (const meta of metas) tr = tr.setMeta(linkRevealKey, meta);
    state = state.apply(tr);
    const set = plugin.props.decorations.call(plugin, state);
    return set.find().map(d => ({ from: d.from, to: d.to, key: d.spec.key || null, title: d.type.attrs?.title || null }));
};
const keys = decos => decos.map(d => d.key).filter(Boolean).map(k => k.replace(/-https.*/, ''));

test('modifiable, curseur dans un lien : [ avant, ](url) après ; adresse et ouverture au survol', () => {
    const decos = decorationsAt(pluginFor(true), 8);
    assert.deepEqual(keys(decos).sort(), ['lr-close-6-12-view', 'lr-open-6'].sort());
    const titles = decos.filter(d => d.title).map(d => d.title);
    assert.equal(titles.length, 2);
    assert.ok(titles[0].startsWith('https://a.fr\n') && /(⌘|Ctrl) \+ click to open$/.test(titles[0]));
    assert.ok(titles[1].startsWith('https://b.fr\n'));
});

test('modifiable, curseur hors lien : rien de révélé', () => {
    assert.deepEqual(keys(decorationsAt(pluginFor(true), 2)), []);
});

test('lecture seule : le curseur ne révèle rien, le clic maintenu si', () => {
    assert.deepEqual(keys(decorationsAt(pluginFor(false), 8)), []);
    const held = decorationsAt(pluginFor(false), 2, [{ type: 'hold', range: { from: 16, to: 23, href: 'https://b.fr' } }]);
    assert.deepEqual(keys(held).sort(), ['lr-close-16-23-view', 'lr-open-16'].sort());
});

test("édition : le champ d'adresse remplace l'url, jamais en lecture seule", () => {
    const editing = { type: 'edit', editing: { from: 6, to: 12, href: 'https://a.fr', isNew: false } };
    assert.ok(keys(decorationsAt(pluginFor(true), 2, [editing])).includes('lr-close-6-12-edit'));
    assert.ok(!keys(decorationsAt(pluginFor(false), 2, [editing])).some(k => k.includes('edit')));
});

test("une modification du texte avant le lien déplace la plage en cours d'édition", () => {
    const plugin = pluginFor(true);
    let state = EditorState.create({ doc, plugins: [plugin] });
    state = state.apply(state.tr.setMeta(linkRevealKey, { type: 'edit', editing: { from: 6, to: 12, href: 'https://a.fr', isNew: false } }));
    state = state.apply(state.tr.insertText('Oui. ', 1));
    assert.deepEqual(
        { from: linkRevealKey.getState(state).editing.from, to: linkRevealKey.getState(state).editing.to },
        { from: 11, to: 17 }
    );
    state = state.apply(state.tr.setMeta(linkRevealKey, { type: 'stopEdit' }));
    assert.equal(linkRevealKey.getState(state).editing, null);
});
