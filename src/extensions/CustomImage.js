/**
 * Custom Image extension for TipTap
 * Extends the base Image extension to support:
 * - Hybrid approach: data-image-id attribute + fallback src
 * - Integration with image mapping system
 * - Auto-generation of IDs for images without IDs when useImageLayout is enabled
 * - Figure/figcaption support for semantic image captions
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

    parseHTML() {
        return [
            {
                tag: 'img[src]',
                getAttrs: element => {
                    // Parse image directly
                    return {
                        src: element.getAttribute('src'),
                        alt: element.getAttribute('alt'),
                        title: element.getAttribute('title'),
                        'data-image-id': element.getAttribute('data-image-id'),
                        'data-position': element.getAttribute('data-position'),
                        caption: null,
                    };
                },
            },
            {
                tag: 'figure',
                getAttrs: element => {
                    const img = element.querySelector('img[src]');
                    const figcaption = element.querySelector('figcaption');

                    if (!img) return false; // Not a valid figure with image

                    return {
                        src: img.getAttribute('src'),
                        alt: img.getAttribute('alt'),
                        title: img.getAttribute('title'),
                        'data-image-id': img.getAttribute('data-image-id'),
                        'data-position': img.getAttribute('data-position'),
                        caption: figcaption ? figcaption.textContent : null,
                    };
                },
            },
        ];
    },

    renderHTML({ HTMLAttributes }) {
        const { caption, ...imgAttrs } = HTMLAttributes;

        // Remove null/undefined attributes
        Object.keys(imgAttrs).forEach(key => {
            if (imgAttrs[key] === null || imgAttrs[key] === undefined) {
                delete imgAttrs[key];
            }
        });

        // If there's a caption, wrap in figure
        if (caption) {
            return [
                'figure',
                {},
                ['img', imgAttrs],
                ['figcaption', {}, caption],
            ];
        }

        // Otherwise, just render the img
        return ['img', imgAttrs];
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
            'data-position': {
                default: null,
                parseHTML: element => element.getAttribute('data-position'),
                renderHTML: attributes => {
                    if (!attributes['data-position']) {
                        return {};
                    }
                    return {
                        'data-position': attributes['data-position'],
                    };
                },
            },
            caption: {
                default: null,
                parseHTML: element => {
                    // Check if the image is inside a <figure>
                    const figure = element.closest('figure');
                    if (figure) {
                        const figcaption = figure.querySelector('figcaption');
                        return figcaption ? figcaption.textContent : null;
                    }
                    return null;
                },
                renderHTML: attributes => {
                    // Caption is rendered via the figure wrapper, not as an attribute
                    return {};
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
             * @param {string} options.dataPosition - Image position (e.g., 'featured')
             * @param {string} options.caption - Figure caption text
             */
            setImageWithId: options => ({ commands }) => {
                return commands.insertContent({
                    type: this.name,
                    attrs: {
                        src: options.src,
                        'data-image-id': options.dataImageId || null,
                        'data-position': options.dataPosition || null,
                        alt: options.alt || '',
                        title: options.title || '',
                        caption: options.caption || null,
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
