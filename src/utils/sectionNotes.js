// Notes de section (plan de l'article) : sous chaque titre du plan, ce que la
// section doit dire (paragraphes = l'objectif, puces = les points à couvrir).
// Elles vivent dans le document (Yjs) mais ne font pas partie de l'article :
// ni dans la valeur (HTML, Markdown), ni dans l'analyse SEO / GEO, ni dans le
// sommaire. Le serveur collab les retire aussi de `html_content`.
import { Fragment } from 'prosemirror-model';
import { TextSelection } from 'prosemirror-state';

export const SECTION_NOTE = 'sectionNote';

const isNote = node => node.type.name === SECTION_NOTE;

/**
 * @name withoutSectionNotes
 * @description Le fragment sans ses notes, à toute profondeur. Rend le même
 * fragment s'il n'en contient pas.
 */
export function withoutSectionNotes(fragment) {
    let changed = false;
    const children = [];
    fragment.forEach(child => {
        if (isNote(child)) {
            changed = true;
            return;
        }
        // Un bloc de texte ne contient que du texte et des nœuds en ligne
        if (child.isTextblock || child.isLeaf) {
            children.push(child);
            return;
        }
        const content = withoutSectionNotes(child.content);
        if (content !== child.content) changed = true;
        children.push(content === child.content ? child : child.copy(content));
    });
    return changed ? Fragment.fromArray(children) : fragment;
}

/**
 * @name exportedContent
 * @description Le contenu de l'article : le document sans le frontmatter
 * (exposé à part, variable frontmatter) ni les notes de section.
 */
export function exportedContent(doc) {
    const first = doc.firstChild;
    const content = first && first.type.name === 'frontmatter' ? doc.content.cut(first.nodeSize) : doc.content;
    return withoutSectionNotes(content);
}

/** Le paragraphe vide du curseur, enfant direct d'une note : { note, notePos }, null sinon */
function emptyParagraphInNote(state) {
    const { $cursor } = state.selection;
    if (!$cursor || $cursor.depth < 2 || $cursor.parent.content.size) return null;
    if ($cursor.parent.type.name !== 'paragraph') return null;
    const note = $cursor.node(-1);
    if (!isNote(note)) return null;
    return { note, notePos: $cursor.before(-1), $cursor };
}

/**
 * @name exitSectionNote
 * @description Entrée sur le paragraphe vide qui termine une note : la note
 * est isolante, rien n'en fait sortir d'office. Le paragraphe vide quitte la
 * note (une note vide garde le sien) et le curseur passe au paragraphe créé
 * juste après, pour écrire la section.
 */
export function exitSectionNote(state, dispatch) {
    const found = emptyParagraphInNote(state);
    if (!found) return false;
    const { note, notePos, $cursor } = found;
    if ($cursor.index(-1) !== note.childCount - 1) return false;
    if (dispatch) {
        const tr = state.tr;
        let after = notePos + note.nodeSize;
        if (note.childCount > 1) {
            tr.delete($cursor.before(), $cursor.after());
            after = tr.mapping.map(after);
        }
        tr.insert(after, state.schema.nodes.paragraph.create());
        tr.setSelection(TextSelection.create(tr.doc, after + 1)).scrollIntoView();
        dispatch(tr);
    }
    return true;
}

/**
 * @name deleteEmptySectionNote
 * @description Effacement dans une note vide (un seul paragraphe, vide) :
 * la note disparaît, le curseur va à la fin du bloc qui la précède.
 */
export function deleteEmptySectionNote(state, dispatch) {
    const found = emptyParagraphInNote(state);
    if (!found || found.note.childCount !== 1) return false;
    if (dispatch) {
        const { note, notePos } = found;
        const tr = state.tr.delete(notePos, notePos + note.nodeSize);
        const $pos = tr.doc.resolve(Math.min(notePos, tr.doc.content.size));
        tr.setSelection(TextSelection.near($pos, -1)).scrollIntoView();
        dispatch(tr);
    }
    return true;
}
