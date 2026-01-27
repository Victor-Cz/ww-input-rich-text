<template>
    <node-view-wrapper class="image-node-wrapper">
        <!-- Render wwLayout template when useImageLayout is enabled -->
        <div v-if="useImageLayout && layoutElement" class="image-layout" contenteditable="false">
            <wwLocalContext elementKey="image" :data="imageContextData">
                <wwObject v-bind="layoutElement" :data-image-id="imageId" />
            </wwLocalContext>
        </div>

        <!-- Fallback to standard image -->
        <img
            v-else
            :src="node.attrs.src"
            :alt="node.attrs.alt"
            :title="node.attrs.title"
            :data-image-id="imageId"
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
        getImageData: {
            from: 'getImageData',
            default: () => () => null,
        },
    },
    computed: {
        imageId() {
            return this.node.attrs['data-image-id'] || null;
        },
        imageData() {
            if (!this.imageId || !this.getImageData) return null;
            return this.getImageData(this.imageId);
        },
        imageContextData() {
            // Prepare image data for wwLocalContext
            // This makes the image data available via context.image in the template
            return {
                imageId: this.imageId,
                url: this.imageData?.url || this.node.attrs.src,
                alt: this.imageData?.alt || this.node.attrs.alt || '',
                title: this.imageData?.title || this.node.attrs.title || '',
                ...this.imageData, // Include any additional metadata
            };
        },
        // Unwrap the injected computed for imageLayoutElement
        layoutElement() {
            // If imageLayoutElement is a computed ref, unwrap it
            const element = this.imageLayoutElement;
            return typeof element === 'function' ? element() : element;
        },
    },
};
</script>

<style>
/* Remove scoped to allow WeWeb styles to properly apply */
.image-node-wrapper {
    display: inline-block;
}

.image-layout {
    display: inline-block;
}

.fallback-image {
    display: inline-block;
}

/* Ensure ProseMirror doesn't override WeWeb text styles */
.ProseMirror .image-layout .ww-text {
    font-size: inherit !important;
    color: inherit !important;
    line-height: inherit !important;
}
</style>
