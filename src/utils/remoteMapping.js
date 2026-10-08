import { Mapping, StepMap } from 'prosemirror-transform';
import { ySyncPluginKey } from 'y-prosemirror';

// Correspondance des positions à travers une transaction, modifications
// distantes comprises.
//
// y-prosemirror applique chaque modification venue d'un autre participant en
// remplaçant le document entier (`_typeChanged` : `tr.replace(0, taille, doc)`).
// Sa `tr.mapping` envoie alors toute position au bord du document, et une
// décoration qui la suit disparaît. Pour ces transactions, la correspondance
// est rebâtie sur le diff des deux documents : seule la zone réellement
// changée bouge.

/** Vrai pour une transaction qui applique une modification distante (Yjs). */
export function isRemoteChange(tr) {
    return !!tr.getMeta(ySyncPluginKey)?.isChangeOrigin;
}

/**
 * Zone changée entre deux documents : `start`, fin dans l'ancien (`oldEnd`),
 * fin dans le nouveau (`newEnd`). null s'ils sont identiques.
 * Même recalage que prosemirror-view quand début et fin se recouvrent (texte
 * répété autour de la modification).
 */
export function changedRange(oldDoc, newDoc) {
    const start = oldDoc.content.findDiffStart(newDoc.content);
    if (start == null) return null;
    let { a: oldEnd, b: newEnd } = oldDoc.content.findDiffEnd(newDoc.content);
    if (oldEnd < start && oldDoc.content.size < newDoc.content.size) {
        newEnd = start + (newEnd - oldEnd);
        oldEnd = start;
    } else if (newEnd < start) {
        oldEnd = start + (oldEnd - newEnd);
        newEnd = start;
    }
    return { start, oldEnd, newEnd };
}

/**
 * Mapping à utiliser à la place de `tr.mapping` dans le `apply` d'un plugin :
 * le diff pour une modification distante, `tr.mapping` pour tout le reste.
 */
export function remoteAwareMapping(tr, oldDoc) {
    if (!isRemoteChange(tr)) return tr.mapping;
    const range = changedRange(oldDoc, tr.doc);
    // Un Mapping et non une StepMap seule : DecorationSet.map lit `mapping.maps`
    if (!range) return new Mapping();
    return new Mapping([new StepMap([range.start, range.oldEnd - range.start, range.newEnd - range.start])]);
}
