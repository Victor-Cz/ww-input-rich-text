import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { isMacPlatform, linkRangeAt, linkRanges, rangeForSelection, resolveHrefInput } from '../utils/linkReveal.js';

export const linkRevealKey = new PluginKey('linkReveal');

// Clic maintenu, en lecture seule, avant d'afficher la forme [texte](url)
const HOLD_MS = 300;

/**
 * Liens façon Markdown (paramètre linkEditing = inline), à la place de la
 * popup des liens :
 * - curseur ou sélection dans un lien (éditeur modifiable) : `[` avant le
 *   texte et `](url)` après, en décorations locales. Le document garde un vrai
 *   lien : rien n'est écrit, les autres collaborateurs ne voient rien ;
 * - clic sur l'adresse : un champ sur place. Entrée applique (adresse
 *   nettoyée, cf. utils/sanitizeUrl), Échap ou sortie du champ annule, une
 *   adresse vide retire le lien ;
 * - un petit ⌘ (Ctrl hors Mac) au bout de chaque lien : Cmd/Ctrl + clic
 *   l'ouvre (handleClick de l'éditeur) ;
 * - lecture seule : rien ne se modifie ; le survol montre l'adresse (title),
 *   un clic maintenu montre la forme [texte](url) tant qu'on maintient ;
 * - commande editLink (bouton Lien du menu) : ouvre le champ sur le lien du
 *   curseur, ou sur la sélection pour un nouveau lien ; le lien n'est posé
 *   qu'à l'Entrée (Échap ne laisse rien).
 * Inerte quand enabled() est faux.
 */
export const LinkReveal = Extension.create({
    name: 'linkReveal',

    addOptions() {
        return {
            enabled: () => false,
            /** L'éditeur est modifiable (sinon : lecture seule, rien ne s'édite) */
            editable: () => true,
        };
    },

    addCommands() {
        return {
            editLink:
                () =>
                ({ state, dispatch }) => {
                    const linkType = state.schema.marks.link;
                    if (!linkType) return false;
                    const { from, to, empty } = state.selection;
                    const range = rangeForSelection(state.doc, from, to, linkType);
                    let editing = null;
                    if (range) editing = { from: range.from, to: range.to, href: range.href, isNew: false };
                    else if (!empty) editing = { from, to, href: '', isNew: true };
                    if (!editing) return false;
                    if (dispatch) dispatch(state.tr.setMeta(linkRevealKey, { type: 'edit', editing }));
                    return true;
                },
        };
    },

    addProseMirrorPlugins() {
        const options = this.options;
        const modifier = isMacPlatform(typeof navigator !== 'undefined' ? navigator : null) ? '⌘' : 'Ctrl';
        let holdTimer = null;

        const enabled = () => {
            try {
                return !!options.enabled();
            } catch (e) {
                return false;
            }
        };

        const clearHold = view => {
            clearTimeout(holdTimer);
            holdTimer = null;
            if (linkRevealKey.getState(view.state)?.held) {
                view.dispatch(view.state.tr.setMeta(linkRevealKey, { type: 'release' }));
            }
        };

        // Applique l'adresse saisie (Entrée) : poser, retirer, ou refuser
        const commit = (view, editing, value, input) => {
            const linkType = view.state.schema.marks.link;
            const result = resolveHrefInput(value);
            if (result.action === 'reject') {
                input.classList.add('-invalid');
                return;
            }
            let tr = view.state.tr.setMeta(linkRevealKey, { type: 'stopEdit' });
            if (result.action === 'remove') {
                if (!editing.isNew) tr = tr.removeMark(editing.from, editing.to, linkType);
            } else {
                // Un lien existant garde ses autres attributs, seule l'adresse change
                const attrs = editing.isNew ? {} : findLinkAttrs(view.state.doc, editing.from, linkType);
                tr = tr
                    .removeMark(editing.from, editing.to, linkType)
                    .addMark(editing.from, editing.to, linkType.create({ ...attrs, href: result.href }));
            }
            view.dispatch(tr);
            view.focus();
        };

        const cancel = view => {
            if (!linkRevealKey.getState(view.state)?.editing) return;
            view.dispatch(view.state.tr.setMeta(linkRevealKey, { type: 'stopEdit' }));
        };

        // `[` devant le texte du lien
        const openWidget = () => {
            const span = document.createElement('span');
            span.className = 'ww-link-reveal__mark';
            span.textContent = '[';
            span.setAttribute('contenteditable', 'false');
            return span;
        };

        // `](url)` + ⌘ après le texte du lien ; le champ d'adresse en édition
        const closeWidget = (range, editing, canEdit) => view => {
            const wrap = document.createElement('span');
            wrap.className = 'ww-link-reveal__close';
            wrap.setAttribute('contenteditable', 'false');

            const openParen = document.createElement('span');
            openParen.className = 'ww-link-reveal__mark';
            openParen.textContent = '](';
            wrap.appendChild(openParen);

            if (editing) {
                const input = document.createElement('input');
                input.type = 'text';
                input.className = 'ww-link-reveal__input';
                input.value = editing.href || '';
                input.placeholder = 'https://';
                input.setAttribute('size', String(Math.max(12, (editing.href || '').length + 2)));
                input.addEventListener('input', () => {
                    input.classList.remove('-invalid');
                    input.setAttribute('size', String(Math.max(12, input.value.length + 2)));
                });
                input.addEventListener('keydown', event => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        commit(view, editing, input.value, input);
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        cancel(view);
                        view.focus();
                    }
                });
                input.addEventListener('blur', () => cancel(view));
                wrap.appendChild(input);
                requestAnimationFrame(() => {
                    input.focus();
                    input.select();
                });
            } else {
                const url = document.createElement('span');
                url.className = 'ww-link-reveal__url' + (canEdit ? ' -editable' : '');
                url.textContent = range.href;
                if (canEdit) {
                    url.addEventListener('mousedown', event => {
                        event.preventDefault();
                        view.dispatch(
                            view.state.tr.setMeta(linkRevealKey, {
                                type: 'edit',
                                editing: { from: range.from, to: range.to, href: range.href, isNew: false },
                            })
                        );
                    });
                }
                wrap.appendChild(url);
            }

            const closeParen = document.createElement('span');
            closeParen.className = 'ww-link-reveal__mark';
            closeParen.textContent = ')';
            wrap.appendChild(closeParen);
            if (!editing || !editing.isNew) wrap.appendChild(keyBadge());
            return wrap;
        };

        // Le petit ⌘ au bout d'un lien
        const keyBadge = () => {
            const key = document.createElement('span');
            key.className = 'ww-link-reveal__key';
            key.textContent = modifier;
            key.setAttribute('aria-hidden', 'true');
            key.setAttribute('contenteditable', 'false');
            return key;
        };

        return [
            new Plugin({
                key: linkRevealKey,
                state: {
                    init: () => ({ held: null, editing: null }),
                    apply(tr, value) {
                        let { held, editing } = value;
                        if (tr.docChanged) {
                            if (held) held = { ...held, from: tr.mapping.map(held.from), to: tr.mapping.map(held.to, -1) };
                            if (editing) {
                                editing = {
                                    ...editing,
                                    from: tr.mapping.map(editing.from),
                                    to: tr.mapping.map(editing.to, -1),
                                };
                                if (editing.to <= editing.from) editing = null;
                            }
                        }
                        const meta = tr.getMeta(linkRevealKey);
                        if (meta?.type === 'hold') held = meta.range;
                        if (meta?.type === 'release') held = null;
                        if (meta?.type === 'edit') editing = meta.editing;
                        if (meta?.type === 'stopEdit') editing = null;
                        return { held, editing };
                    },
                },
                props: {
                    decorations(state) {
                        if (!enabled()) return DecorationSet.empty;
                        const linkType = state.schema.marks.link;
                        if (!linkType) return DecorationSet.empty;
                        const { held, editing } = linkRevealKey.getState(state) || {};
                        const canEdit = !!options.editable();
                        const ranges = linkRanges(state.doc, linkType);

                        let active = null;
                        if (editing && canEdit) active = { from: editing.from, to: editing.to, href: editing.href };
                        else if (canEdit) {
                            const { from, to } = state.selection;
                            active = rangeForSelection(state.doc, from, to, linkType);
                        }
                        if (!active && held) active = linkRangeAt(state.doc, held.from, linkType);

                        const decorations = [];
                        for (const range of ranges) {
                            // Le survol montre l'adresse (lecture seule comprise)
                            decorations.push(Decoration.inline(range.from, range.to, { title: range.href }));
                            const isActive = active && active.from === range.from && active.to === range.to;
                            if (!isActive) {
                                decorations.push(
                                    Decoration.widget(range.to, keyBadge, {
                                        side: 1,
                                        key: `lr-key-${range.to}`,
                                        ignoreSelection: true,
                                    })
                                );
                            }
                        }
                        if (active) {
                            const isEditing = !!(editing && canEdit);
                            decorations.push(
                                Decoration.widget(active.from, openWidget, {
                                    side: -1,
                                    key: `lr-open-${active.from}`,
                                    ignoreSelection: true,
                                }),
                                Decoration.widget(active.to, closeWidget(active, isEditing ? editing : null, canEdit), {
                                    side: 1,
                                    key: `lr-close-${active.from}-${active.to}-${isEditing ? 'edit' : 'view'}-${active.href}`,
                                    ignoreSelection: true,
                                    // Le champ et l'adresse gardent leurs événements (frappe, clic)
                                    stopEvent: () => true,
                                })
                            );
                        }
                        return DecorationSet.create(state.doc, decorations);
                    },
                    handleDOMEvents: {
                        // Lecture seule : clic maintenu sur un lien = forme [texte](url)
                        mousedown: (view, event) => {
                            if (!enabled() || options.editable()) return false;
                            if (event.button !== 0 || event.metaKey || event.ctrlKey) return false;
                            const link = event.target?.closest?.('a');
                            if (!link || !view.dom.contains(link)) return false;
                            clearTimeout(holdTimer);
                            holdTimer = setTimeout(() => {
                                holdTimer = null;
                                const linkType = view.state.schema.marks.link;
                                let pos;
                                try {
                                    pos = view.posAtDOM(link, 0);
                                } catch (e) {
                                    return;
                                }
                                const range = linkRangeAt(view.state.doc, pos, linkType);
                                if (range) view.dispatch(view.state.tr.setMeta(linkRevealKey, { type: 'hold', range }));
                            }, HOLD_MS);
                            return false;
                        },
                        mouseup: view => {
                            clearHold(view);
                            return false;
                        },
                        mouseleave: view => {
                            clearHold(view);
                            return false;
                        },
                        dragstart: view => {
                            clearHold(view);
                            return false;
                        },
                    },
                },
                view: () => ({
                    destroy: () => clearTimeout(holdTimer),
                }),
            }),
        ];
    },
});

/** Les attributs du lien à la position pos (pour les garder en changeant l'adresse) */
function findLinkAttrs(doc, pos, linkType) {
    let attrs = {};
    doc.nodesBetween(pos, Math.min(pos + 1, doc.content.size), node => {
        const mark = node.isText ? node.marks.find(m => m.type === linkType) : null;
        if (mark) attrs = mark.attrs;
    });
    return attrs;
}

export default LinkReveal;
