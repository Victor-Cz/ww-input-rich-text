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
 * - Cmd/Ctrl + clic ouvre le lien (handleClick de l'éditeur) ; l'infobulle
 *   native du lien (title) le dit, sous son adresse ;
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
                // L'adresse se modifie dans un vrai champ (il garde sa propre sélection :
                // une zone contenteditable perdait le focus dès que ProseMirror
                // réécrivait la sélection du document). Un <textarea> plutôt qu'un
                // <input> : l'adresse passe à la ligne, avec la police du texte
                const input = document.createElement('textarea');
                input.className = 'ww-link-reveal__url -editing';
                input.rows = 1;
                input.wrap = 'soft';
                input.spellcheck = false;
                input.placeholder = 'https://';
                input.value = editing.href || '';
                // Largeur de l'adresse (toute la ligne au-delà), hauteur de son contenu
                const fit = () => {
                    input.style.width = `min(100%, ${Math.max(12, input.value.length + 2)}ch)`;
                    input.style.height = 'auto';
                    input.style.height = `${input.scrollHeight}px`;
                };
                input.addEventListener('input', () => {
                    input.classList.remove('-invalid');
                    // Pas de saut de ligne ni d'espace dans une adresse
                    const clean = input.value.replace(/\s+/g, '');
                    if (clean !== input.value) input.value = clean;
                    fit();
                });
                input.addEventListener('keydown', event => {
                    // Les touches restent dans l'adresse, pas dans l'éditeur autour
                    event.stopPropagation();
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        commit(view, editing, input.value.trim(), input);
                    } else if (event.key === 'Escape') {
                        event.preventDefault();
                        cancel(view);
                        view.focus();
                    }
                });
                input.addEventListener('blur', () => cancel(view));
                wrap.appendChild(input);
                requestAnimationFrame(() => {
                    fit();
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
            return wrap;
        };

        // L'infobulle native d'un lien : son adresse, puis comment l'ouvrir
        const lang = typeof document !== 'undefined' ? String(document.documentElement?.lang || '') : '';
        const openHint = modifier + (lang.startsWith('fr') ? ' + clic pour ouvrir' : ' + click to open');
        const titleOf = href => (href ? href + '\n' : '') + openHint;

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
                            // Le survol montre l'adresse et comment ouvrir le lien (lecture seule comprise)
                            decorations.push(Decoration.inline(range.from, range.to, { title: titleOf(range.href) }));
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
