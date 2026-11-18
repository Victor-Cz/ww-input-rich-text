import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import * as Y from 'yjs';
import { absolutePositionToRelativePosition, relativePositionToAbsolutePosition, ySyncPluginKey } from 'y-prosemirror';
import { clampPosition, POINTER_FIELD, POINTER_THROTTLE_MS, remotePointers } from '../utils/mousePointers.js';

export const mousePresenceKey = new PluginKey('mousePresence');

// Flèche de souris, de la couleur du collaborateur
const ARROW =
    '<svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M1 1 L1 13 L4.5 9.8 L7 15 L9.2 14 L6.8 8.9 L11.5 8.9 Z" fill="currentColor" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';

/**
 * Souris des collaborateurs sur le texte (paramètre showMousePresence) : la
 * sienne est publiée dans l'awareness (champ `pointer`), celles des autres
 * sont dessinées par-dessus le texte, avec leur nom et leur couleur. La
 * position est ancrée au texte (cf. utils/mousePointers) : elle suit le mot
 * survolé quand le texte bouge, et se retrouve sur un écran d'une autre
 * largeur. Rien n'est publié ni dessiné quand enabled() est faux (paramètre
 * coupé, aperçu de version) ; la souris est retirée en quittant le texte ou
 * l'onglet.
 */
export const MousePresence = Extension.create({
    name: 'mousePresence',

    addOptions() {
        return {
            /** L'awareness du provider (peut changer à une reconnexion) */
            awareness: () => null,
            enabled: () => false,
        };
    },

    addProseMirrorPlugins() {
        const options = this.options;

        return [
            new Plugin({
                key: mousePresenceKey,

                view(view) {
                    const host = view.dom.parentElement;
                    if (!host) return {};
                    if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
                    const layer = document.createElement('div');
                    layer.className = 'ww-mouse-presence';
                    host.appendChild(layer);

                    const elements = new Map();
                    let awareness = null;
                    let frame = null;
                    let timer = null;
                    let lastSent = 0;
                    let lastEvent = null;
                    let published = false;

                    const syncState = () => {
                        const state = ySyncPluginKey.getState(view.state);
                        return state?.binding && state.type ? state : null;
                    };

                    // ----- La souris locale -----

                    const publish = pointer => {
                        if (!awareness) return;
                        if (!pointer && !published) return;
                        published = !!pointer;
                        awareness.setLocalStateField(POINTER_FIELD, pointer);
                    };

                    const encode = (x, y) => {
                        const sync = syncState();
                        if (!sync) return null;
                        const hit = view.posAtCoords({ left: x, top: y });
                        if (!hit) return null;
                        const base = view.coordsAtPos(hit.pos);
                        const relative = absolutePositionToRelativePosition(hit.pos, sync.type, sync.binding.mapping);
                        return {
                            anchor: Y.relativePositionToJSON(relative),
                            dx: Math.round(x - base.left),
                            dy: Math.round(y - base.top),
                        };
                    };

                    const flush = () => {
                        timer = null;
                        lastSent = Date.now();
                        const event = lastEvent;
                        lastEvent = null;
                        if (!event || !options.enabled()) return;
                        try {
                            publish(encode(event.clientX, event.clientY));
                        } catch {
                            publish(null);
                        }
                    };

                    const onMove = event => {
                        if (!options.enabled()) return;
                        lastEvent = event;
                        if (timer) return;
                        timer = setTimeout(flush, Math.max(0, lastSent + POINTER_THROTTLE_MS - Date.now()));
                    };

                    const leave = () => {
                        lastEvent = null;
                        clearTimeout(timer);
                        timer = null;
                        publish(null);
                    };

                    const onVisibility = () => {
                        if (document.visibilityState === 'hidden') leave();
                    };

                    // ----- Les souris des autres -----

                    const clear = () => {
                        elements.forEach(element => element.remove());
                        elements.clear();
                    };

                    const elementFor = clientId => {
                        let element = elements.get(clientId);
                        if (!element) {
                            element = document.createElement('div');
                            element.className = 'ww-mouse-presence__pointer';
                            element.innerHTML = ARROW;
                            const name = document.createElement('span');
                            name.className = 'ww-mouse-presence__name';
                            element.append(name);
                            layer.append(element);
                            elements.set(clientId, element);
                        }
                        return element;
                    };

                    const render = () => {
                        frame = null;
                        const sync = syncState();
                        if (!awareness || !sync || !options.enabled()) {
                            clear();
                            if (!options.enabled()) publish(null);
                            return;
                        }
                        const hostRect = host.getBoundingClientRect();
                        const size = view.state.doc.content.size;
                        const shown = new Set();
                        for (const pointer of remotePointers(awareness.getStates(), awareness.clientID)) {
                            let coords = null;
                            try {
                                const pos = relativePositionToAbsolutePosition(
                                    sync.doc,
                                    sync.type,
                                    Y.createRelativePositionFromJSON(pointer.anchor),
                                    sync.binding.mapping
                                );
                                if (pos !== null) coords = view.coordsAtPos(clampPosition(pos, size));
                            } catch {
                                coords = null;
                            }
                            if (!coords) continue;
                            const element = elementFor(pointer.clientId);
                            const x = coords.left + pointer.dx - hostRect.left + host.scrollLeft;
                            const y = coords.top + pointer.dy - hostRect.top + host.scrollTop;
                            element.style.transform = `translate(${x}px, ${y}px)`;
                            element.style.color = pointer.color;
                            const name = element.lastChild;
                            if (name.textContent !== pointer.name) name.textContent = pointer.name;
                            name.style.backgroundColor = pointer.color;
                            shown.add(pointer.clientId);
                        }
                        elements.forEach((element, clientId) => {
                            if (shown.has(clientId)) return;
                            element.remove();
                            elements.delete(clientId);
                        });
                    };

                    const schedule = () => {
                        bindAwareness();
                        if (!frame) frame = requestAnimationFrame(render);
                    };

                    // L'awareness du moment : un nouveau provider en apporte une autre
                    function bindAwareness() {
                        const current = options.awareness() || null;
                        if (current === awareness) return;
                        awareness?.off('change', schedule);
                        awareness = current;
                        published = false;
                        awareness?.on('change', schedule);
                    }

                    host.addEventListener('mousemove', onMove);
                    host.addEventListener('mouseleave', leave);
                    document.addEventListener('visibilitychange', onVisibility);
                    window.addEventListener('resize', schedule);
                    window.addEventListener('scroll', schedule, { capture: true, passive: true });
                    schedule();

                    return {
                        update: schedule,
                        destroy() {
                            leave();
                            awareness?.off('change', schedule);
                            if (frame) cancelAnimationFrame(frame);
                            host.removeEventListener('mousemove', onMove);
                            host.removeEventListener('mouseleave', leave);
                            document.removeEventListener('visibilitychange', onVisibility);
                            window.removeEventListener('resize', schedule);
                            window.removeEventListener('scroll', schedule, { capture: true });
                            clear();
                            layer.remove();
                        },
                    };
                },
            }),
        ];
    },
});
