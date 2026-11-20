import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';

export const linkOpenCursorKey = new PluginKey('linkOpenCursor');

/** Classe posée sur le texte tant que ⌘ (Mac) ou Ctrl est enfoncé */
export const LINK_OPEN_CLASS = '-link-open';

const isModifier = event => event.key === 'Meta' || event.key === 'Control';

/**
 * Curseur des liens : un simple clic place le curseur dans le texte, seul
 * ⌘ + clic (Ctrl + clic) ouvre le lien. La main n'apparaît donc sur un lien
 * que pendant que ⌘ est enfoncé : la classe -link-open est posée sur le
 * texte (cf. le style des liens dans wwElement.vue). Les touches sont
 * écoutées sur le document du texte (iframe dans l'éditeur WeWeb), branché
 * une fois le texte dans la page.
 */
export const LinkOpenCursor = Extension.create({
    name: 'linkOpenCursor',

    addProseMirrorPlugins() {
        // La vue naît sur un élément détaché : les écouteurs de la vue passent
        // par ici, branchés à son premier passage dans la page (cf. MousePresence)
        const handlers = { move: () => {} };

        return [
            new Plugin({
                key: linkOpenCursorKey,

                props: {
                    handleDOMEvents: {
                        mousemove: (_view, event) => {
                            handlers.move(event);
                            return false;
                        },
                    },
                },

                view(view) {
                    const set = on => view.dom.classList.toggle(LINK_OPEN_CLASS, on);

                    const onKeyDown = event => {
                        if (isModifier(event)) set(true);
                    };
                    const onKeyUp = event => {
                        if (isModifier(event)) set(false);
                    };
                    const onBlur = () => set(false);

                    let doc = null;
                    let win = null;
                    const unbind = () => {
                        doc?.removeEventListener('keydown', onKeyDown, true);
                        doc?.removeEventListener('keyup', onKeyUp, true);
                        win?.removeEventListener('blur', onBlur);
                        doc = null;
                        win = null;
                    };
                    const bind = () => {
                        const current = view.dom.isConnected ? view.dom.ownerDocument : null;
                        if (current === doc) return;
                        unbind();
                        if (!current) return;
                        doc = current;
                        win = doc.defaultView || window;
                        doc.addEventListener('keydown', onKeyDown, true);
                        doc.addEventListener('keyup', onKeyUp, true);
                        win.addEventListener('blur', onBlur);
                    };

                    // La souris dit aussi si ⌘ est tenu (enfoncé hors de la page)
                    handlers.move = event => {
                        bind();
                        set(event.metaKey || event.ctrlKey);
                    };

                    return {
                        update: bind,
                        destroy() {
                            handlers.move = () => {};
                            unbind();
                            set(false);
                        },
                    };
                },
            }),
        ];
    },
});
