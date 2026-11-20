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
// Onglet caché, personne ne regarde : rien n'est mis en file, et ce qui
// attendait se dévoile d'un coup (le minuteur s'arrête).

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
            /** Nom à côté du caret : un texte, ou une fonction relue à chaque dévoilement */
            label: 'Brispr',
            /** SVG de l'icône à côté du nom ('' : pas d'icône). La couleur vient de --brispr-color */
            icon: () => '',
            tickMs: 100,
            /** Vitesse de dévoilement, en mots par seconde */
            wordsPerSecond: () => 40,
            // L'animation ne traîne jamais plus loin derrière le contenu reçu
            maxLagMs: 10000,
            // Brispr parti : le reste se dévoile vite
            flushMs: 2000,
            /** Brispr est-il en train d'écrire (présence + document synchronisé) ? */
            shouldAnimate: () => false,
            /**
             * Vrai pour retenir le dévoilement (le texte attend, caché) : pendant
             * un défilement de suivi, pour qu'on voie l'écriture une fois arrivé
             */
            paused: () => false,
            /**
             * Comment apparaît un remplacement (une section écrite à la place de
             * sa note, une modification ciblée) : 'block' d'un bloc teinté, 'words'
             * mot à mot comme une insertion
             */
            replacements: () => 'block',
            onRevealingChange: () => {},
            /** Appelé après chaque paquet dévoilé, avec le caret (suivi du défilement) */
            onReveal: () => {},
            /**
             * Appelé à chaque changement de l'agent qui n'a pas de caret (un
             * remplacement : une section écrite à la place de sa note, une
             * modification ciblée), avec sa plage { from, to } (suivi du défilement)
             */
            onChange: () => {},
        };
    },

    addProseMirrorPlugins() {
        const options = this.options;

        // Compteur des changements de l'agent : identifie le dernier (state.last.at)
        let changeCount = 0;
        const caret = document.createElement('span');
        caret.className = 'brispr-caret';
        const caretLabel = document.createElement('span');
        caretLabel.className = 'brispr-caret__label';
        const caretIcon = document.createElement('span');
        caretIcon.className = 'brispr-caret__icon';
        const caretName = document.createTextNode('');
        caretLabel.append(caretIcon, caretName);
        caret.append(caretLabel);

        // Le nom de l'agent n'est connu qu'une fois qu'il écrit (serveur du
        // template : celui de l'écrivain) : relu à chaque dévoilement
        const syncLabel = () => {
            const label = String((typeof options.label === 'function' ? options.label() : options.label) ?? '');
            if (caretName.data !== label) caretName.data = label;
        };
        syncLabel();

        // L'icône peut arriver après coup (bibliothèque d'icônes asynchrone) :
        // relue à chaque mise à jour, réécrite seulement si elle a changé
        let caretIconSvg = null;
        const syncIcon = () => {
            const svg = options.icon() || '';
            if (svg === caretIconSvg) return;
            caretIconSvg = svg;
            caretIcon.innerHTML = svg;
        };

        // La vue, pour savoir si son onglet est caché (lu à chaque fois : la vue
        // peut changer de document, iframe de WeWeb)
        let pluginView = null;
        const hidden = () => !!pluginView?.dom.ownerDocument?.hidden;

        return [
            new Plugin({
                key: agentRevealKey,

                state: {
                    init() {
                        // credit : fraction de mot reportée d'un tick au suivant
                        // last : la plage du dernier changement de l'agent (cf. onChange)
                        return { pending: [], ink: [], credit: 0, last: null };
                    },

                    apply(tr, value, oldState, newState) {
                        let { pending, ink, credit, last } = value;
                        const now = Date.now();

                        if (tr.getMeta(agentRevealKey) === 'reveal-all') {
                            return pending.length || ink.length ? { pending: [], ink: [], credit: 0, last } : value;
                        }

                        if (tr.docChanged) {
                            // Rien en cours : pas de diff du document (modification distante) pour rien
                            if (pending.length || ink.length) {
                                const mapping = remoteAwareMapping(tr, oldState.doc);
                                pending = pending
                                    .map(r => ({ ...r, from: mapping.map(r.from, 1), to: mapping.map(r.to, -1) }))
                                    .filter(r => r.from < r.to);
                                ink = ink
                                    .map(r => ({ ...r, from: mapping.map(r.from, 1), to: mapping.map(r.to, -1) }))
                                    .filter(r => r.from < r.to);
                            }
                            if (last) {
                                const from = tr.mapping.map(last.from, 1);
                                const to = Math.max(from, tr.mapping.map(last.to, -1));
                                if (from !== last.from || to !== last.to) last = { ...last, from, to };
                            }

                            if (isRemoteChange(tr) && options.shouldAnimate() && !hidden()) {
                                const change = changedRange(oldState.doc, newState.doc);
                                if (change && change.newEnd > change.start) {
                                    last = {
                                        from: change.start,
                                        to: change.newEnd,
                                        insert: change.oldEnd === change.start,
                                        at: ++changeCount,
                                    };
                                    if (change.oldEnd === change.start) {
                                        // Insertion pure : à dévoiler. Collée à la fin d'une
                                        // plage en attente, elle la prolonge (texte ajouté
                                        // dans un bloc en cours d'écriture)
                                        const last = pending.find(r => r.to === change.start);
                                        if (last) last.to = change.newEnd;
                                        else pending = [...pending, { from: change.start, to: change.newEnd }];
                                    } else {
                                        // Remplacement (une section écrite à la place de sa
                                        // note, une modification ciblée) : le nouveau texte
                                        // apparaît d'un bloc, teinté, au prochain paquet, ou mot
                                        // à mot (cf. replacements) ; après un défilement de
                                        // suivi dans les deux cas (cf. paused)
                                        pending = [
                                            ...pending,
                                            {
                                                from: change.start,
                                                to: change.newEnd,
                                                ...(options.replacements() === 'words' ? {} : { block: true }),
                                            },
                                        ];
                                    }
                                }
                            }
                        }

                        if (tr.getMeta(agentRevealKey) === 'tick') {
                            ink = ink.filter(r => r.until > now);
                            // Les remplacements d'un bloc, d'un coup
                            if (pending.some(r => r.block) && !options.paused()) {
                                ink = [
                                    ...ink,
                                    ...pending.filter(r => r.block).map(r => ({ from: r.from, to: r.to, until: now + INK_MS })),
                                ];
                                pending = pending.filter(r => !r.block);
                            }
                            if (pending.length && !options.paused()) {
                                const doc = newState.doc;
                                const remaining = pending.reduce((n, r) => n + countWords(doc, r.from, r.to), 0);
                                const writing = options.shouldAnimate();
                                const lagMs = writing ? options.maxLagMs : options.flushMs;
                                // Mots de ce tick : la vitesse réglée, ou plus pour ne pas
                                // dépasser le retard permis (et au moins un par tick une
                                // fois Brispr parti). La fraction passe au tick suivant
                                // (moins d'un mot par tick aux vitesses lentes)
                                credit += Math.max(
                                    (options.wordsPerSecond() * options.tickMs) / 1000,
                                    (remaining * options.tickMs) / lagMs,
                                    writing ? 0 : 1
                                );
                                let budget = Math.floor(credit);
                                credit -= budget;
                                if (budget > 0) pending = pending.map(r => ({ ...r }));
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
                            // Tout est dévoilé : le prochain texte repart sans avance
                            if (!pending.length) credit = 0;
                        }

                        return pending === value.pending &&
                            ink === value.ink &&
                            credit === value.credit &&
                            last === value.last
                            ? value
                            : { pending, ink, credit, last };
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
                    pluginView = editorView;
                    let timer = null;
                    let revealing = false;
                    // Le dernier changement annoncé (onChange), par sa plage telle qu'elle est arrivée
                    let announced = null;

                    // Un paquet de mots ; onglet caché, tout d'un coup (et sync arrête le minuteur)
                    const tick = () => {
                        const meta = hidden() ? 'reveal-all' : 'tick';
                        editorView.dispatch(editorView.state.tr.setMeta(agentRevealKey, meta).setMeta('addToHistory', false));
                    };

                    const sync = () => {
                        const { pending, ink, last } = agentRevealKey.getState(editorView.state);
                        // Un remplacement n'a pas de caret : sa plage sert au suivi
                        if (last && !last.insert && last.at !== announced) {
                            announced = last.at;
                            options.onChange({ from: last.from, to: last.to });
                        }
                        const busy = pending.length > 0 || ink.length > 0;
                        if (busy && !timer) {
                            timer = setInterval(tick, options.tickMs);
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
                            syncLabel();
                            options.onReveal(caret);
                        }
                    };

                    return {
                        update: sync,
                        destroy() {
                            if (timer) clearInterval(timer);
                            if (revealing) options.onRevealingChange(false);
                            pluginView = null;
                        },
                    };
                },
            }),
        ];
    },
});
