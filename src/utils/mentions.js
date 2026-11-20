/**
 * @name mentionIds
 * @description Les id des mentions du document, dans l'ordre (variable
 * mentions). Lu sur les nœuds, sans sérialiser le document en JSON.
 */
export function mentionIds(doc) {
    const ids = [];
    doc.descendants(node => {
        if (node.type.name !== 'mention') return true;
        ids.push(node.attrs.id);
        return false;
    });
    return ids;
}
