import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import { changedRange, isRemoteChange, remoteAwareMapping } from '../utils/remoteMapping.js';

// Dévoile, au fil de l'écriture, le texte que Brispr vient d'insérer dans le
// document partagé (rédaction en direct, sessions d'agent de brispr-collab).
//
// Le collab écrit le contenu réel, une zone par update ; l'animation se joue
// ici, dans le navigateur, pour rester régulière (des mots envoyés un à un par
// WebSocket arriveraient par à-coups). Le texte inséré est caché, puis montré
// par paquets de quelques mots, dans le langage visuel de TextSuggestion :
// fondu court et teinte qui s'estompe, caret « Brispr » en tête.
//
// Une insertion pure est mise en file ; la modification d'un texte déjà là
// (liens, espaces, image) n'est pas cachée, elle reçoit seulement l'encre.

export const agentRevealKey = new PluginKey('agentReveal');

const INK_MS = 1000;

/** Nombre de mots dans une plage du document */
function countWords(doc, from, to) {
    return doc.textBetween(from, to, ' ', ' ').split(/\s+/).filter(Boolean).length;
}

/**
 * Position après `count` mots depuis `from`, sans dépasser `to`. Un nœud
 * feuille non textuel (image) compte pour un mot.
 */
function advanceWords(doc, from, to, count) {
    let words = 0;
    let stop = null;
    doc.nodesBetween(from, to, (node, pos) => {
        if (stop !== null) return false;
        if (node.isText) {
            const start = Math.max(pos, from);
            const text = node.text.slice(start - pos, Math.min(pos + node.nodeSize, to) - pos);
            const word = /\S+\s*/g;
            let match;
            while ((match = word.exec(text))) {
                words++;
                if (words >= count) {
                    stop = start + match.index + match[0].length;
                    break;
                }
            }
            return false;
        }
        if (node.isLeaf) {
            words++;
            if (words >= count) stop = pos + node.nodeSize;
            return false;
        }
        return true;
    });
    return stop === null ? to : Math.min(stop, to);
}

/** Décorations d'une plage : nœuds entiers par nœud, texte par plage inline */
function rangeDecorations(doc, from, to, className, decorations) {
    doc.nodesBetween(from, to, (node, pos) => {
        const end = pos + node.nodeSize;
        if (pos >= from && end <= to && !node.isText) {
            decorations.push(
                node.isInline
                    ? Decoration.inline(pos, end, { class: className })
                    : Decoration.node(pos, end, { class: className })
            );
            return false;
        }
        if (node.isText) {
            decorations.push(Decoration.inline(Math.max(pos, from), Math.min(end, to), { class: className }));
        }
        return true;
    });
}

export const AgentReveal = Extension.create({
    name: 'agentReveal',

    addOptions() {
        return {
            label: 'Brispr',
            /** SVG de l'icône à côté du nom ('' : pas d'icône). La couleur vient de --brispr-color */
            icon: () => '',
            // Deux mots toutes les 50 ms : un peu plus posé que TextSuggestion
            tickMs: 50,
            wordsPerTick: 2,
            // L'animation ne traîne jamais plus loin derrière le contenu reçu
            maxLagMs: 10000,
            // Brispr parti : le reste se dévoile vite
            flushMs: 2000,
            /** Brispr est-il en train d'écrire (présence + document synchronisé) ? */
            shouldAnimate: () => false,
            onRevealingChange: () => {},
            /** Appelé après chaque paquet dévoilé, avec le caret (suivi du défilement) */
            onReveal: () => {},
        };
    },

    addProseMirrorPlugins() {
        const options = this.options;

        const caret = document.createElement('span');
        caret.className = 'brispr-caret';
        const caretLabel = document.createElement('span');
        caretLabel.className = 'brispr-caret__label';
        const caretIcon = document.createElement('span');
        caretIcon.className = 'brispr-caret__icon';
        caretLabel.append(caretIcon, options.label);
        caret.append(caretLabel);

        // L'icône peut arriver après coup (bibliothèque d'icônes asynchrone) :
        // relue à chaque mise à jour, réécrite seulement si elle a changé
        let caretIconSvg = null;
        const syncIcon = () => {
            const svg = options.icon() || '';
            if (svg === caretIconSvg) return;
            caretIconSvg = svg;
            caretIcon.innerHTML = svg;
        };

        return [
            new Plugin({
                key: agentRevealKey,

                state: {
                    init() {
                        return { pending: [], ink: [] };
                    },

                    apply(tr, value, oldState, newState) {
                        let { pending, ink } = value;
                        const now = Date.now();

                        if (tr.docChanged) {
                            const mapping = remoteAwareMapping(tr, oldState.doc);
                            pending = pending
                                .map(r => ({ from: mapping.map(r.from, 1), to: mapping.map(r.to, -1) }))
                                .filter(r => r.from < r.to);
                            ink = ink
                                .map(r => ({ ...r, from: mapping.map(r.from, 1), to: mapping.map(r.to, -1) }))
                                .filter(r => r.from < r.to);

                            if (isRemoteChange(tr) && options.shouldAnimate()) {
                                const change = changedRange(oldState.doc, newState.doc);
                                if (change && change.newEnd > change.start) {
                                    if (change.oldEnd === change.start) {
                                        // Insertion pure : à dévoiler. Collée à la fin d'une
                                        // plage en attente, elle la prolonge (texte ajouté
                                        // dans un bloc en cours d'écriture)
                                        const last = pending.find(r => r.to === change.start);
                                        if (last) last.to = change.newEnd;
                                        else pending = [...pending, { from: change.start, to: change.newEnd }];
                                    } else {
                                        ink = [...ink, { from: change.start, to: change.newEnd, until: now + INK_MS }];
                                    }
                                }
                            }
                        }

                        if (tr.getMeta(agentRevealKey) === 'tick') {
                            ink = ink.filter(r => r.until > now);
                            if (pending.length) {
                                const doc = newState.doc;
                                const remaining = pending.reduce((n, r) => n + countWords(doc, r.from, r.to), 0);
                                const lagMs = options.shouldAnimate() ? options.maxLagMs : options.flushMs;
                                let budget = Math.max(
                                    options.wordsPerTick,
                                    Math.ceil(remaining / (lagMs / options.tickMs))
                                );
                                pending = pending.map(r => ({ ...r }));
                                while (budget > 0 && pending.length) {
                                    const head = pending[0];
                                    const words = countWords(doc, head.from, head.to);
                                    const next = advanceWords(doc, head.from, head.to, budget);
                                    ink = [...ink, { from: head.from, to: next, until: now + INK_MS }];
                                    budget -= Math.max(1, Math.min(words, budget));
                                    head.from = next;
                                    if (head.from >= head.to) pending = pending.slice(1);
                                }
                            }
                        }

                        return pending === value.pending && ink === value.ink ? value : { pending, ink };
                    },
                },

                props: {
                    decorations(state) {
                        const { pending, ink } = agentRevealKey.getState(state);
                        if (!pending.length && !ink.length) return DecorationSet.empty;
                        const decorations = [];
                        for (const r of ink) rangeDecorations(state.doc, r.from, r.to, 'brispr-ink', decorations);
                        for (const r of pending) rangeDecorations(state.doc, r.from, r.to, 'brispr-pending', decorations);
                        if (pending.length) {
                            decorations.push(Decoration.widget(pending[0].from, caret, { key: 'brispr-caret', side: -1 }));
                        }
                        return DecorationSet.create(state.doc, decorations);
                    },
                },

                view(editorView) {
                    let timer = null;
                    let revealing = false;

                    const sync = () => {
                        const { pending, ink } = agentRevealKey.getState(editorView.state);
                        const busy = pending.length > 0 || ink.length > 0;
                        if (busy && !timer) {
                            timer = setInterval(() => {
                                editorView.dispatch(
                                    editorView.state.tr.setMeta(agentRevealKey, 'tick').setMeta('addToHistory', false)
                                );
                            }, options.tickMs);
                        } else if (!busy && timer) {
                            clearInterval(timer);
                            timer = null;
                        }
                        if (revealing !== pending.length > 0) {
                            revealing = pending.length > 0;
                            options.onRevealingChange(revealing);
                        }
                        if (revealing) {
                            syncIcon();
                            options.onReveal(caret);
                        }
                    };

                    return {
                        update: sync,
                        destroy() {
                            if (timer) clearInterval(timer);
                            if (revealing) options.onRevealingChange(false);
                        },
                    };
                },
            }),
        ];
    },
});
