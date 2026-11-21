// Document vide, au sens de l'état vide (useEmptyLayout) et de la variable
// isEmpty : le texte se réduit à un paragraphe vide, comme un éditeur neuf.
// Le frontmatter (meta title, slug… écrits par le serveur collab, masqués par
// défaut) n'est pas le texte : il est ignoré. editor.isEmpty ne suffit pas, il
// compte le frontmatter et tient pour vide un tableau ou une liste sans texte.
import { isNodeEmpty } from '@tiptap/core';

const FRONTMATTER = 'frontmatter'; // cf. extensions/Frontmatter

/**
 * @name isDocEmpty
 * @description true si le corps du document (hors frontmatter) n'est qu'un
 * paragraphe vide : ni texte, ni nœud atomique (image, mention, saut de
 * ligne…), ni autre bloc (titre, liste, tableau…).
 */
export function isDocEmpty(doc) {
    const body = [];
    doc.forEach(node => {
        if (node.type.name !== FRONTMATTER) body.push(node);
    });
    return body.length === 1 && body[0].type.name === 'paragraph' && isNodeEmpty(body[0]);
}
