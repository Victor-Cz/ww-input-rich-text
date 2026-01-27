/**
 * Custom Image extension for TipTap
 * Extends the base Image extension to support:
 * - Hybrid approach: data-image-id attribute + fallback src
 * - Integration with image mapping system
 */

import Image from '@tiptap/extension-image';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import ImageNode from '../components/ImageNode.vue';

export const CustomImage = Image.extend({
    name: 'customImage',

    addNodeView() {
        return VueNodeViewRenderer(ImageNode);
    },

    addAttributes() {
        return {
            ...this.parent?.(),
            'data-image-id': {
                default: null,
                parseHTML: element => element.getAttribute('data-image-id'),
                renderHTML: attributes => {
                    if (!attributes['data-image-id']) {
                        return {};
                    }
                    return {
                        'data-image-id': attributes['data-image-id'],
                    };
                },
            },
        };
    },

    addCommands() {
        return {
            ...this.parent?.(),
            /**
             * Set image with ID support
             * @param {Object} options - Image options
             * @param {string} options.src - Image URL (fallback)
             * @param {string} options.dataImageId - Image ID
             * @param {string} options.alt - Alt text
             * @param {string} options.title - Title text
             */
            setImageWithId: options => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: {
                        src: options.src,
                        'data-image-id': options.dataImageId || null,
                        alt: options.alt || '',
                        title: options.title || '',
                    },
                });
            },
        };
    },
});
