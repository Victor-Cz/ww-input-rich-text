import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';
import * as Y from 'yjs';
import { relativePositionToAbsolutePosition, ySyncPluginKey } from 'y-prosemirror';
import { remoteAwareMapping } from '../utils/remoteMapping.js';
import { concernsWriters, cssColor, rangesFrom, writerSelections } from '../utils/agentSelection.js';

export const agentSelectionKey = new PluginKey('agentSelection');

/** Nouveaux essais au plus, par sélection, tant qu'une position reste introuvable */
const MAX_RETRIES = 10;

/**
 * Sélection de l'agent (cf. utils/agentSelection) : les passages que
 * l'auteur d'une écriture du serveur montre sont surlignés à sa couleur de
 * marque (brandColor), sinon à celle du paramètre de l'agent. Pas de caret ;
 * visible aussi en lecture seule ; rien sur une version affichée (enabled).
 *
 * Coût : les positions relatives ne sont relues que quand l'état de
 * l'auteur change (signature comparée) ; sinon les décorations suivent les
 * transactions comme les autres. La souris et les curseurs des
 * collaborateurs ne coûtent qu'un test (concernsWriters). Une position
 * introuvable (document pas encore synchronisé, texte pas encore reçu) est
 * réessayée au prochain changement du document, au plus MAX_RETRIES fois.
 */
export const AgentSelection = Extension.create({
    name: 'agentSelection',

    addOptions() {
        return {
            /** L'awareness du provider (peut changer à une reconnexion) */
            awareness: () => null,
            /** La couleur du paramètre de l'agent, quand il n'a pas de couleur de marque */
            color: () => null,
            enabled: () => true,
            /** Appelé avec la première plage ({ from, to }) d'une nouvelle sélection affichée */
            onSelection: () => {},
        };
    },

    addProseMirrorPlugins() {
        const options = this.options;

        return [
            new Plugin({
                key: agentSelectionKey,

                state: {
                    init: () => DecorationSet.empty,
                    apply(tr, decorations, oldState) {
                        const next = tr.getMeta(agentSelectionKey);
                        if (next) return next.decorations;
                        if (decorations === DecorationSet.empty || !tr.docChanged) return decorations;
                        return decorations.map(remoteAwareMapping(tr, oldState.doc), tr.doc);
                    },
                },

                props: {
                    decorations: state => agentSelectionKey.getState(state),
                },

                view(view) {
                    let awareness = null;
                    // Ce que les auteurs montrent (cf. writerSelections), et sa signature
                    let entries = [];
                    let signature = '[]';
                    let shown = new Set();
                    let enabled = !!options.enabled();
                    let color = cssColor(options.color());
                    // Positions introuvables à réessayer, et combien de fois déjà
                    let pending = false;
                    let retries = 0;
                    // La sélection dont la première plage a été annoncée (onSelection)
                    let announced = null;
                    let frame = null;
                    let destroyed = false;

                    const resolve = (sync, json) => {
                        try {
                            return relativePositionToAbsolutePosition(
                                sync.doc,
                                sync.type,
                                Y.createRelativePositionFromJSON(json),
                                sync.binding.mapping
                            );
                        } catch {
                            return null;
                        }
                    };

                    const render = () => {
                        frame = null;
                        if (destroyed) return;
                        const sync = ySyncPluginKey.getState(view.state);
                        const visible = enabled ? entries : [];
                        const pairs = [];
                        let unresolved = false;
                        if (visible.length > 0 && !sync?.binding) {
                            unresolved = true;
                        } else {
                            for (const entry of visible) {
                                const tint = entry.color || color;
                                for (const range of entry.selections) {
                                    const anchor = resolve(sync, range.anchor);
                                    const head = resolve(sync, range.head);
                                    if (anchor === null || head === null) unresolved = true;
                                    pairs.push({ anchor, head, color: tint });
                                }
                            }
                        }
                        pending = unresolved && retries < MAX_RETRIES;

                        const ranges = rangesFrom(pairs, view.state.doc.content.size);
                        const current = agentSelectionKey.getState(view.state);
                        if (ranges.length > 0 || current !== DecorationSet.empty) {
                            const decorations =
                                ranges.length > 0
                                    ? DecorationSet.create(
                                          view.state.doc,
                                          ranges.map(({ from, to, color: tint }) =>
                                              Decoration.inline(from, to, {
                                                  class: 'ww-agent-selection',
                                                  ...(tint ? { style: `--ww-agent-selection-color: ${tint}` } : {}),
                                              })
                                          )
                                      )
                                    : DecorationSet.empty;
                            view.dispatch(
                                view.state.tr.setMeta(agentSelectionKey, { decorations }).setMeta('addToHistory', false)
                            );
                        }
                        if (ranges.length > 0 && announced !== signature) {
                            announced = signature;
                            options.onSelection({ from: ranges[0].from, to: ranges[0].to });
                        }
                    };

                    const schedule = () => {
                        if (!frame && !destroyed) frame = requestAnimationFrame(render);
                    };

                    // Relit ce que montrent les auteurs : rien à refaire si c'est la même chose
                    const read = () => {
                        entries = awareness ? writerSelections(awareness.getStates()) : [];
                        shown = new Set(entries.map(entry => entry.clientId));
                        const next = JSON.stringify(entries);
                        if (next === signature) return;
                        signature = next;
                        retries = 0;
                        schedule();
                    };

                    const onChange = ({ added, updated, removed }) => {
                        if (!awareness) return;
                        if (!concernsWriters(awareness.getStates(), [...added, ...updated, ...removed], shown)) return;
                        read();
                    };

                    // L'awareness du moment : un nouveau provider en apporte une autre
                    const bindAwareness = () => {
                        const current = options.awareness() || null;
                        if (current === awareness) return;
                        awareness?.off('change', onChange);
                        awareness = current;
                        awareness?.on('change', onChange);
                        read();
                    };

                    bindAwareness();

                    return {
                        update(_view, prevState) {
                            bindAwareness();
                            const nowEnabled = !!options.enabled();
                            const nowColor = cssColor(options.color());
                            if (nowEnabled !== enabled || nowColor !== color) {
                                enabled = nowEnabled;
                                color = nowColor;
                                if (entries.length > 0 || agentSelectionKey.getState(view.state) !== DecorationSet.empty) {
                                    schedule();
                                }
                            }
                            if (pending && view.state.doc !== prevState.doc) {
                                pending = false;
                                retries += 1;
                                schedule();
                            }
                        },
                        destroy() {
                            destroyed = true;
                            awareness?.off('change', onChange);
                            awareness = null;
                            if (frame) cancelAnimationFrame(frame);
                            frame = null;
                        },
                    };
                },
            }),
        ];
    },
});
