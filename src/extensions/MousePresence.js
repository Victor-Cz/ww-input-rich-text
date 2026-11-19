import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import * as Y from 'yjs';
import { absolutePositionToRelativePosition, relativePositionToAbsolutePosition, ySyncPluginKey } from 'y-prosemirror';
import { clampPosition, POINTER_FIELD, POINTER_THROTTLE_MS, remotePointers } from '../utils/mousePointers.js';

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
 * trouve désormais (écouté sur la fenêtre du texte : iframe dans WeWeb). Sur
 * l'en-tête de l'éditeur (titre, metas…), la souris est ancrée à sa colonne
 * ({ area: 'header', x, y }) et dessinée au même endroit chez les autres.
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
                        mouseleave: (_view, event) => {
                            handlers.leave(event);
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

                    // La zone qui défile (en-tête, menu collé, texte) et l'en-tête de l'éditeur
                    const scrollOf = () => view.dom.closest?.('.ww-rich-text__scroll') || null;
                    const headerOf = () => scrollOf()?.querySelector(':scope > .ww-rich-text__header') || null;
                    const inside = (rect, x, y) => x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;

                    // Bord gauche de la colonne de l'en-tête (sa marge intérieure retirée) :
                    // la même colonne que le texte, d'un écran à l'autre
                    const headerOrigin = header => {
                        const rect = header.getBoundingClientRect();
                        const style = (header.ownerDocument.defaultView || window).getComputedStyle(header);
                        return { left: rect.left + (parseFloat(style.paddingLeft) || 0), top: rect.top };
                    };

                    // La souris sur le texte (ancrée à un mot) ou sur l'en-tête (ancrée à sa colonne),
                    // d'après ce qui est SOUS elle : le menu collé en haut passe par-dessus le texte,
                    // la souris sur le menu reste ancrée au mot qu'il recouvre
                    const encodeAt = (x, y) => {
                        if (inside(view.dom.getBoundingClientRect(), x, y)) return encode(x, y);
                        const header = headerOf();
                        if (header && inside(header.getBoundingClientRect(), x, y)) {
                            const origin = headerOrigin(header);
                            return { area: 'header', x: Math.round(x - origin.left), y: Math.round(y - origin.top) };
                        }
                        return null;
                    };

                    const flush = () => {
                        timer = null;
                        lastSent = Date.now();
                        const event = lastEvent;
                        lastEvent = null;
                        if (!event || !options.enabled()) return;
                        try {
                            publish(encodeAt(event.clientX, event.clientY));
                        } catch {
                            publish(null);
                        }
                    };

                    // Le dernier point de la souris sur le texte : un défilement sans
                    // mouvement la fait passer sur d'autres mots, on la republie
                    let lastPoint = null;

                    const onMove = event => {
                        bindWindow();
                        if (!options.enabled()) return;
                        lastPoint = { clientX: event.clientX, clientY: event.clientY };
                        lastEvent = event;
                        if (timer) return;
                        timer = setTimeout(flush, Math.max(0, lastSent + POINTER_THROTTLE_MS - Date.now()));
                    };

                    const leave = () => {
                        lastPoint = null;
                        lastEvent = null;
                        clearTimeout(timer);
                        timer = null;
                        publish(null);
                    };

                    // Souris dans la zone qui défile hors du texte (en-tête, menu) : publiée
                    // comme sur le texte ; hors de la zone, retirée
                    const onDocMove = event => {
                        if (view.dom.contains(event.target)) return;
                        if (scrollOf()?.contains(event.target)) onMove(event);
                        else if (lastPoint) leave();
                    };

                    // Défilement : la souris immobile survole un autre endroit du texte
                    const onScroll = () => {
                        schedule();
                        if (!lastPoint || !options.enabled()) return;
                        lastEvent = lastPoint;
                        if (timer) return;
                        timer = setTimeout(flush, Math.max(0, lastSent + POINTER_THROTTLE_MS - Date.now()));
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
                        const header = headerOf();
                        for (const pointer of remotePointers(awareness.getStates(), awareness.clientID)) {
                            // Le point à l'écran : colonne de l'en-tête, ou mot du texte + décalage
                            let point = null;
                            if (pointer.area === 'header') {
                                if (header) {
                                    const origin = headerOrigin(header);
                                    point = { left: origin.left + pointer.x, top: origin.top + pointer.y };
                                }
                            } else {
                                try {
                                    const pos = relativePositionToAbsolutePosition(
                                        sync.doc,
                                        sync.type,
                                        Y.createRelativePositionFromJSON(pointer.anchor),
                                        sync.binding.mapping
                                    );
                                    if (pos !== null) {
                                        // Le coin du bloc ancré (cf. blockAt), sinon la position du texte
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
                    // rebranchés si son document change
                    let doc = null;
                    let win = null;
                    function bindWindow() {
                        const current = view.dom.isConnected ? view.dom.ownerDocument : null;
                        if (current === doc) return;
                        unbindWindow();
                        if (!current) return;
                        doc = current;
                        win = doc.defaultView || window;
                        doc.addEventListener('visibilitychange', onVisibility);
                        doc.addEventListener('mousemove', onDocMove, { passive: true });
                        win.addEventListener('resize', schedule);
                        win.addEventListener('scroll', onScroll, { capture: true, passive: true });
                    }
                    function unbindWindow() {
                        doc?.removeEventListener('visibilitychange', onVisibility);
                        doc?.removeEventListener('mousemove', onDocMove);
                        win?.removeEventListener('resize', schedule);
                        win?.removeEventListener('scroll', onScroll, { capture: true });
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
                    // Le texte quitté pour l'en-tête ou le menu : la souris reste (cf. onDocMove)
                    handlers.leave = event => {
                        if (event?.relatedTarget && scrollOf()?.contains(event.relatedTarget)) return;
                        leave();
                    };
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
