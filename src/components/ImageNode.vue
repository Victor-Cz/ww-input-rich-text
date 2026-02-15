<template>
    <node-view-wrapper class="image-node-wrapper">
        <!-- Render wwLayout template when useImageLayout is enabled -->
        <div v-if="useImageLayout && layoutElement" class="image-layout" contenteditable="false">
            <wwLocalContext elementKey="image" :data="imageContextData">
                <wwObject v-bind="layoutElement" :data-image-id="imageId" />
            </wwLocalContext>
        </div>

        <!-- Fallback: figure with caption if caption exists -->
        <figure v-else-if="hasCaption" class="image-figure">
            <img
                :src="node.attrs.src"
                :alt="node.attrs.alt"
                :title="node.attrs.title"
                :data-image-id="imageId"
                :data-position="node.attrs['data-position']"
                :data-refresh="node.attrs['data-refresh']"
                class="fallback-image"
            />
            <figcaption contenteditable="true" @blur="updateCaption">{{ node.attrs.caption }}</figcaption>
        </figure>

        <!-- Fallback: simple image without caption -->
        <img
            v-else
            :src="node.attrs.src"
            :alt="node.attrs.alt"
            :title="node.attrs.title"
            :data-image-id="imageId"
            :data-position="node.attrs['data-position']"
            :data-refresh="node.attrs['data-refresh']"
            class="fallback-image"
        />
    </node-view-wrapper>
</template>

<script>
import { NodeViewWrapper, nodeViewProps } from '@tiptap/vue-3';

export default {
    name: 'ImageNode',
    components: {
        NodeViewWrapper,
    },
    props: nodeViewProps,
    inject: {
        useImageLayout: {
            from: 'useImageLayout',
            default: false,
        },
        imageLayoutElement: {
            from: 'imageLayoutElement',
            default: null,
        },
    },
    computed: {
        imageId() {
            return this.node.attrs['data-image-id'] || null;
        },
        hasCaption() {
            return this.node.attrs.caption && this.node.attrs.caption.trim() !== '';
        },
        imageContextData() {
            // Read all data directly from node attributes (HTML)
            // This makes the image data available via context.image in the template
            return {
                imageId: this.imageId,
                url: this.node.attrs.src || '',
                alt: this.node.attrs.alt || '',
                title: this.node.attrs.title || '',
                position: this.node.attrs['data-position'] || null,
                refresh: this.node.attrs['data-refresh'] || false,
                caption: this.node.attrs.caption || null,
            };
        },
        // Unwrap the injected computed for imageLayoutElement
        layoutElement() {
            // If imageLayoutElement is a computed ref, unwrap it
            const element = this.imageLayoutElement;
            return typeof element === 'function' ? element() : element;
        },
    },
    methods: {
        updateCaption(event) {
            const newCaption = event.target.textContent;
            this.updateAttributes({
                caption: newCaption || null,
            });
        },
    },
};
</script>

<style scoped>
.image-node-wrapper {
    display: block;
}

.image-layout {
    display: block;
}

.image-figure {
    display: block;
    margin: 1em 0;
}

.image-figure figcaption {
    margin-top: 0.5em;
    font-style: italic;
    color: #666;
    font-size: 0.9em;
}

.fallback-image {
    display: inline-block;
}
</style>
