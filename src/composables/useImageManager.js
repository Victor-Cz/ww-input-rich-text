/**
 * Image management utilities for TipTap rich text editor
 * Provides functions to manipulate images directly in the document
 */

/**
 * Generate a unique ID for an image
 * Format: img_timestamp_random
 */
export function generateImageId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `img_${timestamp}_${random}`;
}

/**
 * Update an image by ID in the TipTap document
 * @param {Editor} editor - TipTap editor instance
 * @param {string} imageId - Image ID to update
 * @param {string} url - New image URL
 * @param {string} alt - Alt text
 * @param {string} title - Title text
 * @returns {boolean} True if image was found and updated
 */
export function updateImageById(editor, imageId, url, alt = '', title = '') {
    if (!editor) return false;

    const { state, view } = editor;
    const { tr } = state;
    let updated = false;

    // Traverse the document to find the image with matching data-image-id
    state.doc.descendants((node, pos) => {
        if ((node.type.name === 'image' || node.type.name === 'customImage') &&
            node.attrs['data-image-id'] === imageId) {
            // Update the image attributes
            tr.setNodeMarkup(pos, null, {
                ...node.attrs,
                src: url,
                alt: alt || node.attrs.alt,
                title: title || node.attrs.title,
            });
            updated = true;
            return false; // Stop traversing
        }
    });

    // Apply the transaction if we found and updated the image
    if (updated) {
        view.dispatch(tr);
    }

    return updated;
}

/**
 * Get image data by ID from the TipTap document
 * @param {Editor} editor - TipTap editor instance
 * @param {string} imageId - Image ID to find
 * @returns {Object|null} Image data or null if not found
 */
export function getImageById(editor, imageId) {
    if (!editor) return null;

    let imageData = null;

    editor.state.doc.descendants((node) => {
        if ((node.type.name === 'image' || node.type.name === 'customImage') &&
            node.attrs['data-image-id'] === imageId) {
            imageData = {
                imageId: node.attrs['data-image-id'],
                url: node.attrs.src || '',
                alt: node.attrs.alt || '',
                title: node.attrs.title || '',
            };
            return false; // Stop traversing
        }
    });

    return imageData;
}

/**
 * Remove image by ID (clear its URL) in the TipTap document
 * @param {Editor} editor - TipTap editor instance
 * @param {string} imageId - Image ID to remove
 * @returns {boolean} True if image was found and cleared
 */
export function removeImageById(editor, imageId) {
    if (!editor) return false;

    const { state, view } = editor;
    const { tr } = state;
    let updated = false;

    // Traverse the document to find the image with matching data-image-id
    state.doc.descendants((node, pos) => {
        if ((node.type.name === 'image' || node.type.name === 'customImage') &&
            node.attrs['data-image-id'] === imageId) {
            // Clear the src attribute
            tr.setNodeMarkup(pos, null, {
                ...node.attrs,
                src: '',
            });
            updated = true;
            return false; // Stop traversing
        }
    });

    // Apply the transaction if we found and updated the image
    if (updated) {
        view.dispatch(tr);
    }

    return updated;
}

/**
 * Get all images from the TipTap document
 * @param {Editor} editor - TipTap editor instance
 * @returns {Object} Object mapping image IDs to image data
 */
export function getAllImages(editor) {
    if (!editor) return {};

    const images = {};

    editor.state.doc.descendants((node) => {
        if ((node.type.name === 'image' || node.type.name === 'customImage') &&
            node.attrs['data-image-id']) {
            const imageId = node.attrs['data-image-id'];
            images[imageId] = {
                imageId,
                url: node.attrs.src || '',
                alt: node.attrs.alt || '',
                title: node.attrs.title || '',
            };
        }
    });

    return images;
}

/**
 * Insert an empty image placeholder into the editor
 * @param {Editor} editor - TipTap editor instance
 * @returns {string|null} The generated image ID or null if failed
 */
export function insertEmptyImage(editor) {
    if (!editor) return null;

    // Generate a unique ID
    const imageId = generateImageId();

    // Insert into editor with empty URL
    editor.commands.setImageWithId({
        src: '',
        dataImageId: imageId,
        alt: '',
        title: '',
    });

    return imageId;
}
