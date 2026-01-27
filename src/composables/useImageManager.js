/**
 * Composable for managing image IDs and mapping in the rich text editor
 * Implements hybrid approach: stores both ID (data-image-id) and fallback URL (src)
 * Uses optimistic updates: local state updates immediately, then syncs with props
 */

import { ref, watch } from 'vue';

export function useImageManager(props, emit) {
    // Local reactive reference for optimistic updates
    // This updates immediately, before props are propagated by WeWeb
    const imageMapping = ref(props.content.imageMapping || {});

    // Sync with props when they change (from WeWeb)
    watch(
        () => props.content.imageMapping,
        (newValue) => {
            // Update local state when props change
            imageMapping.value = newValue || {};
        },
        { deep: true }
    );

    /**
     * Generate a unique ID for an image
     * Format: img_timestamp_random
     */
    const generateImageId = () => {
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 9);
        return `img_${timestamp}_${random}`;
    };

    /**
     * Add or update an image in the mapping
     * @param {string} id - Image ID
     * @param {Object} imageData - Image data (url, alt, title, etc.)
     * @param {boolean} isUpdate - Whether this is an update (true) or new entry (false)
     */
    const setImageData = (id, imageData, isUpdate = false) => {
        const newMapping = { ...imageMapping.value, [id]: imageData };

        // OPTIMISTIC UPDATE: Update local state immediately
        imageMapping.value = newMapping;

        // Emit to WeWeb (will update props asynchronously)
        emit('update:content:effect', { imageMapping: newMapping });

        // Emit appropriate event
        const eventName = isUpdate ? 'image:updated' : 'image:added';
        emit('trigger-event', {
            name: eventName,
            event: {
                imageId: id,
                url: imageData.url,
                alt: imageData.alt || '',
                title: imageData.title || '',
            },
        });
    };

    /**
     * Get image data from the mapping
     * @param {string} id - Image ID
     * @returns {Object|null} Image data or null if not found
     */
    const getImageData = (id) => {
        return imageMapping.value[id] || null;
    };

    /**
     * Remove an image from the mapping
     * @param {string} id - Image ID
     */
    const removeImageData = (id) => {
        const newMapping = { ...imageMapping.value };
        delete newMapping[id];

        // OPTIMISTIC UPDATE: Update local state immediately
        imageMapping.value = newMapping;

        // Emit to WeWeb
        emit('update:content:effect', { imageMapping: newMapping });

        // Emit event
        emit('trigger-event', {
            name: 'image:removed',
            event: { imageId: id },
        });
    };

    /**
     * Create a new image entry with ID
     * @param {string} url - Image URL (fallback)
     * @param {string} alt - Alt text
     * @param {string} title - Title text
     * @returns {Object} Image object with id and attributes
     */
    const createImageEntry = (url, alt = '', title = '') => {
        const id = generateImageId();
        const imageData = { url, alt, title, createdAt: new Date().toISOString() };

        setImageData(id, imageData);

        return {
            id,
            src: url, // Fallback URL
            alt,
            title,
        };
    };

    /**
     * Update an existing image entry
     * @param {string} id - Image ID
     * @param {string} url - New image URL
     * @param {string} alt - Alt text
     * @param {string} title - Title text
     */
    const updateImageEntry = (id, url, alt = '', title = '') => {
        const existingData = getImageData(id);
        const imageData = {
            ...existingData,
            url,
            alt,
            title,
            updatedAt: new Date().toISOString(),
        };

        setImageData(id, imageData, true); // true = isUpdate
    };

    /**
     * Extract image ID from HTML when pasting content with images
     * This helps maintain IDs when copy-pasting content
     * @param {string} html - HTML content
     * @returns {Array} Array of { id, url, alt, title }
     */
    const extractImageIdsFromHtml = (html) => {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const images = doc.querySelectorAll('img[data-image-id]');

        return Array.from(images).map(img => ({
            id: img.getAttribute('data-image-id'),
            url: img.getAttribute('src') || '',
            alt: img.getAttribute('alt') || '',
            title: img.getAttribute('title') || '',
        }));
    };

    /**
     * Import images from HTML and create missing mappings
     * @param {string} html - HTML content
     */
    const importImagesFromHtml = (html) => {
        const extractedImages = extractImageIdsFromHtml(html);

        extractedImages.forEach(({ id, url, alt, title }) => {
            // Only create mapping if it doesn't exist
            if (!getImageData(id)) {
                setImageData(id, {
                    url,
                    alt,
                    title,
                    importedAt: new Date().toISOString(),
                });
            }
        });
    };

    /**
     * Clean up orphaned image entries (IDs that are no longer in the document)
     * @param {Object} editorContent - TipTap editor JSON content
     */
    const cleanupOrphanedImages = (editorContent) => {
        if (!editorContent || !editorContent.content) return;

        // Collect all image IDs currently in the document
        const activeIds = new Set();

        const traverse = (node) => {
            if (node.type === 'image' && node.attrs && node.attrs['data-image-id']) {
                activeIds.add(node.attrs['data-image-id']);
            }
            if (node.content) {
                node.content.forEach(traverse);
            }
        };

        editorContent.content.forEach(traverse);

        // Remove mappings for IDs not in the document
        const currentIds = Object.keys(imageMapping.value);
        const orphanedIds = currentIds.filter(id => !activeIds.has(id));

        if (orphanedIds.length > 0) {
            const newMapping = { ...imageMapping.value };
            orphanedIds.forEach(id => delete newMapping[id]);

            // OPTIMISTIC UPDATE: Update local state immediately
            imageMapping.value = newMapping;

            // Emit to WeWeb
            emit('update:content:effect', { imageMapping: newMapping });
        }
    };

    return {
        imageMapping,
        generateImageId,
        setImageData,
        getImageData,
        removeImageData,
        createImageEntry,
        updateImageEntry,
        extractImageIdsFromHtml,
        importImagesFromHtml,
        cleanupOrphanedImages,
    };
}
