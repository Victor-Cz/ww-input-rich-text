import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import * as Y from 'yjs';
import { absolutePositionToRelativePosition, relativePositionToAbsolutePosition, ySyncPluginKey } from 'y-prosemirror';
import {
    clampPosition,
    POINTER_FIELD,
    POINTER_THROTTLE_MS,
    remotePointers,
    SCROLL_SETTLE_MS,
    withinDeadZone,
} from '../utils/mousePointers.js';

export const mousePresenceKey = new PluginKey('mousePresence');

// Flèche de souris, de la couleur du collaborateur (même dessin que les curseurs du canevas d'Image)
const ARROW =
    '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M2 1.5 L15.5 8.2 L9.2 9.6 L6.6 15.8 Z" fill="currentColor" stroke="#fff" stroke-width="1.2" stroke-linejoin="round"/></svg>';

/**
 * Souris des collaborateurs sur le texte (paramètre showMousePresence) : la
 * sienne est publiée dans l'awareness (champ `pointer`), celles des autres
 * sont dessinées par-dessus le texte, avec leur nom et leur couleur. La
 * position est ancrée au bloc du texte survolé (paragraphe, titre…) : elle suit le bloc
 * survolé quand le texte bouge, et se retrouve sur un écran d'une autre
 * largeur. Rien n'est publié ni dessiné quand enabled() est faux (paramètre
 * coupé, aperçu de version) ; la souris est retirée en quittant le texte ou
 * l'onglet. Un défilement sans mouvement republie la souris là où elle se
 * trouve désormais, une fois posé (écouté sur la fenêtre du texte : iframe
 * dans WeWeb, seulement quand la souris est montrée). Hors du texte, et sur le
 * menu même collé par-dessus, la souris n'est pas publiée. Chaque envoi part
 * chez tous les participants : au plus un par POINTER_THROTTLE_MS, et pas
 * pour un tremblement de quelques pixels.
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
        // Les écouteurs de la vue (handleDOMEvents) passent par ici : la vue
        // naît sur un élément détaché, que <editor-content> vide ensuite dans
        // le sien, un écouteur posé à la création ne verrait rien
        const handlers = { move: () => {}, leave: () => {} };

        return [
            new Plugin({
                key: mousePresenceKey,

                props: {
                    handleDOMEvents: {
                        mousemove: (_view, event) => {
                            handlers.move(event);
                            return false;
                        },
                        mouseleave: () => {
                            handlers.leave();
                            return false;
                        },
                    },
                },

                view(view) {
                    const layer = document.createElement('div');
                    layer.className = 'ww-mouse-presence';

                    // Le conteneur du texte, relu à chaque rendu (cf. handlers) :
                    // le calque y est (re)placé
                    const hostOf = () => {
                        const host = view.dom.parentElement;
                        if (!host || !host.isConnected) return null;
                        if (layer.parentElement !== host) {
                            if (getComputedStyle(host).position === 'static') host.style.position = 'relative';
                            host.appendChild(layer);
                        }
                        return host;
                    };

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

                    // Le bloc du texte (paragraphe, titre, liste, image…) sous une position,
                    // et son rectangle à l'écran : la souris s'y ancre par son coin haut gauche.
                    // Ancrée à un caractère, elle sautait d'un bout à l'autre d'une ligne dès
                    // qu'un petit mouvement changeait le caractère le plus proche
                    const blockAt = pos => {
                        const doc = view.state.doc;
                        const $pos = doc.resolve(clampPosition(pos, doc.content.size));
                        if ($pos.depth < 1) return null;
                        const start = $pos.before(1);
                        const dom = view.nodeDOM(start);
                        if (!dom || dom.nodeType !== 1) return null;
                        return { start, rect: dom.getBoundingClientRect() };
                    };

                    const encode = (x, y) => {
                        const sync = syncState();
                        if (!sync) return null;
                        const hit = view.posAtCoords({ left: x, top: y });
                        if (!hit) return null;
                        const block = blockAt(hit.inside >= 0 ? hit.inside : hit.pos);
                        const pos = block ? block.start : hit.pos;
                        const base = block ? block.rect : view.coordsAtPos(hit.pos);
                        const relative = absolutePositionToRelativePosition(pos, sync.type, sync.binding.mapping);
                        return {
                            anchor: Y.relativePositionToJSON(relative),
                            dx: Math.round(x - base.left),
                            dy: Math.round(y - base.top),
                        };
                    };

                    // La barre du menu (collée en haut, elle passe par-dessus le texte)
                    const menuOf = () =>
                        view.dom.closest?.('.ww-rich-text__scroll')?.querySelector(':scope > .ww-rich-text__sticky') || null;
                    const inside = (rect, x, y) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

                    // La souris sur le texte seulement, d'après ce qui est sous elle : sur le
                    // menu (même collé par-dessus le texte) ou hors du texte, rien
                    const encodeAt = (x, y) => {
                        const barRect = menuOf()?.getBoundingClientRect();
                        if (barRect && barRect.height > 0 && inside(barRect, x, y)) return null;
                        if (!inside(view.dom.getBoundingClientRect(), x, y)) return null;
                        return encode(x, y);
                    };

                    // Le point (écran) de la souris publiée en dernier : la zone morte s'y mesure
                    let publishedPoint = null;

                    const flush = () => {
                        timer = null;
                        lastSent = Date.now();
                        const event = lastEvent;
                        lastEvent = null;
                        if (!event || !options.enabled()) return;
                        try {
                            const pointer = encodeAt(event.clientX, event.clientY);
                            publish(pointer);
                            publishedPoint = pointer ? { x: event.clientX, y: event.clientY } : null;
                        } catch {
                            publish(null);
                            publishedPoint = null;
                        }
                    };

                    const flushSoon = () => {
                        if (timer) return;
                        timer = setTimeout(flush, Math.max(0, lastSent + POINTER_THROTTLE_MS - Date.now()));
                    };

                    // Le dernier point de la souris sur le texte : un défilement sans
                    // mouvement la fait passer sur d'autres mots, on la republie
                    let lastPoint = null;

                    const onMove = event => {
                        bindWindow();
                        if (!options.enabled()) return;
                        lastPoint = { clientX: event.clientX, clientY: event.clientY };
                        lastEvent = lastPoint;
                        // Zone morte : un tremblement autour de la souris publiée ne part pas
                        if (published && withinDeadZone(publishedPoint, { x: event.clientX, y: event.clientY })) return;
                        flushSoon();
                    };

                    const leave = () => {
                        lastPoint = null;
                        lastEvent = null;
                        publishedPoint = null;
                        clearTimeout(timer);
                        timer = null;
                        publish(null);
                    };

                    // Défilement : les souris des autres sont replacées à chaque image (le
                    // texte peut défiler sous le calque, .ProseMirror sans en-tête), la
                    // sienne, immobile, survole un autre endroit du texte : republiée une
                    // fois le défilement posé, pas à chaque événement
                    let scrollTimer = null;
                    const afterScroll = () => {
                        scrollTimer = null;
                        if (!lastPoint || !options.enabled()) return;
                        lastEvent = lastPoint;
                        flushSoon();
                    };
                    const onScroll = () => {
                        schedule();
                        clearTimeout(scrollTimer);
                        scrollTimer = setTimeout(afterScroll, SCROLL_SETTLE_MS);
                    };

                    const onVisibility = () => {
                        if (view.dom.ownerDocument.visibilityState === 'hidden') leave();
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
                        const host = hostOf();
                        if (!awareness || !sync || !host || !options.enabled()) {
                            clear();
                            if (!options.enabled()) publish(null);
                            return;
                        }
                        const hostRect = host.getBoundingClientRect();
                        const size = view.state.doc.content.size;
                        const shown = new Set();
                        for (const pointer of remotePointers(awareness.getStates(), awareness.clientID)) {
                            // Le point à l'écran : coin du bloc ancré (cf. blockAt) + décalage
                            let point = null;
                            try {
                                const pos = relativePositionToAbsolutePosition(
                                    sync.doc,
                                    sync.type,
                                    Y.createRelativePositionFromJSON(pointer.anchor),
                                    sync.binding.mapping
                                );
                                if (pos !== null) {
                                    const block = view.nodeDOM(clampPosition(pos, size));
                                    const base =
                                        block && block.nodeType === 1
                                            ? block.getBoundingClientRect()
                                            : view.coordsAtPos(clampPosition(pos, size));
                                    point = { left: base.left + pointer.dx, top: base.top + pointer.dy };
                                }
                            } catch {
                                point = null;
                            }
                            if (!point) continue;
                            const isNew = !elements.has(pointer.clientId);
                            const element = elementFor(pointer.clientId);
                            const x = point.left - hostRect.left + host.scrollLeft;
                            const y = point.top - hostRect.top + host.scrollTop;
                            element.style.transform = `translate(${x}px, ${y}px)`;
                            if (isNew) {
                                // Une souris qui (re)paraît se pose directement à sa place : le
                                // lissage la ferait glisser depuis le coin du texte (0, 0)
                                element.style.transition = 'none';
                                void element.offsetWidth;
                                element.style.transition = '';
                            }
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
                        bindWindow();
                        bindAwareness();
                        if (!frame) frame = requestAnimationFrame(render);
                    };

                    // La fenêtre et le document du texte : dans l'éditeur WeWeb, la page vit
                    // dans une iframe, et la vue naît sur un élément détaché (document du
                    // code) avant d'y être placée. Branchés une fois le texte dans la page,
                    // rebranchés si son document change, et seulement quand la souris est
                    // montrée : sinon défilement, taille et visibilité n'ont rien à refaire
                    let doc = null;
                    let win = null;
                    function bindWindow() {
                        const current = view.dom.isConnected && options.enabled() ? view.dom.ownerDocument : null;
                        if (current === doc) return;
                        unbindWindow();
                        if (!current) return;
                        doc = current;
                        win = doc.defaultView || window;
                        doc.addEventListener('visibilitychange', onVisibility);
                        win.addEventListener('resize', schedule);
                        win.addEventListener('scroll', onScroll, { capture: true, passive: true });
                    }
                    function unbindWindow() {
                        doc?.removeEventListener('visibilitychange', onVisibility);
                        win?.removeEventListener('resize', schedule);
                        win?.removeEventListener('scroll', onScroll, { capture: true });
                        clearTimeout(scrollTimer);
                        scrollTimer = null;
                        doc = null;
                        win = null;
                    }

                    // L'awareness du moment : un nouveau provider en apporte une autre
                    function bindAwareness() {
                        const current = options.awareness() || null;
                        if (current === awareness) return;
                        awareness?.off('change', schedule);
                        awareness = current;
                        published = false;
                        awareness?.on('change', schedule);
                    }

                    handlers.move = onMove;
                    handlers.leave = leave;
                    schedule();

                    return {
                        update: schedule,
                        destroy() {
                            leave();
                            awareness?.off('change', schedule);
                            if (frame) cancelAnimationFrame(frame);
                            handlers.move = () => {};
                            handlers.leave = () => {};
                            unbindWindow();
                            clear();
                            layer.remove();
                        },
                    };
                },
            }),
        ];
    },
});
