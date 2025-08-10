import { VueRenderer } from '@tiptap/vue-3';
import { computePosition, flip, shift, offset } from '@floating-ui/dom';

import MentionList from './MentionList.vue';

export default {
    render: () => {
        let component;
        let popup;
        let popupElement;

        return {
            onStart: props => {
                component = new VueRenderer(MentionList, {
                    props,
                    editor: props.editor,
                });

                if (!props.clientRect) {
                    return;
                }

                // Create popup element
                popupElement = document.createElement('div');
                popupElement.style.position = 'absolute';
                popupElement.style.zIndex = '1000';
                popupElement.appendChild(component.element);
                document.body.appendChild(popupElement);

                // Position the popup
                this.updatePosition(props.clientRect);
            },

            onUpdate(props) {
                component.updateProps(props);

                if (!props.clientRect) {
                    return;
                }

                this.updatePosition(props.clientRect);
            },

            onKeyDown(props) {
                if (props.event.key === 'Escape') {
                    this.hidePopup();
                    return true;
                }

                return component.ref && component.ref.onKeyDown(props);
            },

            onExit() {
                this.hidePopup();
                component.destroy();
            },

            updatePosition(clientRect) {
                if (!popupElement) return;

                const referenceElement = {
                    getBoundingClientRect: () => ({
                        top: clientRect.top,
                        left: clientRect.left,
                        right: clientRect.right,
                        bottom: clientRect.bottom,
                        width: clientRect.width,
                        height: clientRect.height,
                    }),
                };

                computePosition(referenceElement, popupElement, {
                    placement: 'bottom-start',
                    middleware: [offset(4), flip(), shift()],
                }).then(({ x, y }) => {
                    Object.assign(popupElement.style, {
                        left: `${x}px`,
                        top: `${y}px`,
                    });
                });
            },

            hidePopup() {
                if (popupElement) {
                    popupElement.remove();
                    popupElement = null;
                }
            },
        };
    },
};
