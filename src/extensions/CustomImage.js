/**
 * Custom Image extension for TipTap
 * Extends the base Image extension to support:
 * - Hybrid approach: data-image-id attribute + fallback src
 * - Integration with image mapping system
 * - Auto-generation of IDs for images without IDs when useImageLayout is enabled
 */

import Image from '@tiptap/extension-image';
import { VueNodeViewRenderer } from '@tiptap/vue-3';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import ImageNode from '../components/ImageNode.vue';

export const CustomImage = Image.extend({
    name: 'customImage',

    addOptions() {
        return {
            ...this.parent?.(),
            generateImageId: null, // Function to generate unique image ID
            useImageLayout: false, // Whether to use image layout system
        };
    },

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

    addProseMirrorPlugins() {
        const extension = this;

        return [
            new Plugin({
                key: new PluginKey('autoImageId'),
                appendTransaction(transactions, _oldState, newState) {
                    // Only process if useImageLayout is enabled
                    if (!extension.options.useImageLayout || !extension.options.generateImageId) {
                        return null;
                    }

                    // Check if any transaction added or modified nodes
                    const hasChanges = transactions.some(tr => tr.docChanged);
                    if (!hasChanges) {
                        return null;
                    }

                    const tr = newState.tr;
                    let modified = false;

                    // Traverse all nodes in the document
                    newState.doc.descendants((node, pos) => {
                        // Check if it's an image node without an ID
                        if ((node.type.name === 'image' || node.type.name === 'customImage') && !node.attrs['data-image-id']) {
                            // Generate unique ID
                            const imageId = extension.options.generateImageId();

                            // Update the node with the new ID
                            tr.setNodeMarkup(pos, null, {
                                ...node.attrs,
                                'data-image-id': imageId,
                            });

                            modified = true;
                        }
                    });

                    return modified ? tr : null;
                },
            }),
        ];
    },
});
