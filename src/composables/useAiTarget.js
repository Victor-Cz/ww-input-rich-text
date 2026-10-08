import * as Y from 'yjs';
import { ySyncPluginKey, absolutePositionToRelativePosition, relativePositionToAbsolutePosition } from 'y-prosemirror';

/**
 * Plage visée par une demande au menu IA, suivie jusqu'à son application.
 *
 * Le LLM met plusieurs secondes à répondre et le document peut changer
 * entre-temps : un autre participant écrit, ou l'utilisateur lui-même (aucun
 * des deux menus ne bloque l'éditeur pendant la demande). Des positions
 * figées viseraient alors un autre texte.
 * - En collaboration : positions relatives Yjs, exactes quoi qu'il arrive
 *   autour de la plage, y compris quand y-prosemirror remplace le document.
 * - Sans collaboration : positions suivies à travers chaque transaction.
 *
 * Les deux bords excluent ce qui s'insère contre eux : un texte tapé juste
 * après la sélection pendant la demande n'est pas remplacé avec elle.
 *
 * @param {import('@tiptap/core').Editor} editor
 */
export function useAiTarget(editor) {
    // { mode: 'yjs', from, to, wasEmpty } | { mode: 'pm', from, to, wasEmpty }
    let target = null;
    let unsubscribe = null;

    const getBinding = () => ySyncPluginKey.getState(editor.state)?.binding ?? null;

    function capture(from, to) {
        release();
        const binding = getBinding();
        const wasEmpty = from === to;

        if (binding) {
            // Le bord droit est associé au dernier caractère de la plage
            // (assoc -1) quand c'est du texte, et non au caractère suivant :
            // une insertion juste après la sélection reste hors de la plage,
            // et la suppression de ce caractère ne déborde pas sur la suite.
            let relTo;
            if (to > from && editor.state.doc.textBetween(to - 1, to) !== '') {
                const last = absolutePositionToRelativePosition(to - 1, binding.type, binding.mapping);
                relTo = new Y.RelativePosition(last.type, last.tname, last.item, -1);
            } else {
                relTo = absolutePositionToRelativePosition(to, binding.type, binding.mapping);
            }
            target = {
                mode: 'yjs',
                from: absolutePositionToRelativePosition(from, binding.type, binding.mapping),
                to: relTo,
                wasEmpty,
            };
            return;
        }

        target = { mode: 'pm', from, to, wasEmpty };
        const onTransaction = ({ transaction }) => {
            if (!target || !transaction.docChanged) return;
            const nextFrom = transaction.mapping.map(target.from, 1);
            const nextTo = transaction.mapping.map(target.to, -1);
            target.from = nextFrom;
            target.to = Math.max(nextFrom, nextTo);
        };
        editor.on('transaction', onTransaction);
        unsubscribe = () => editor.off('transaction', onTransaction);
    }

    /**
     * Plage à jour : { from, to, lost }, ou null si rien n'est retenu.
     * `lost` : la plage n'était pas vide et ne contient plus rien (passage
     * supprimé entre-temps).
     */
    function range() {
        if (!target) return null;

        let from = target.from;
        let to = target.to;
        if (target.mode === 'yjs') {
            const binding = getBinding();
            if (!binding) return null;
            from = relativePositionToAbsolutePosition(binding.doc, binding.type, target.from, binding.mapping);
            to = relativePositionToAbsolutePosition(binding.doc, binding.type, target.to, binding.mapping);
            if (from === null || to === null) {
                return { from: from ?? 0, to: from ?? 0, lost: true };
            }
        }

        const size = editor.state.doc.content.size;
        from = Math.min(Math.max(from, 0), size);
        to = Math.min(Math.max(to, from), size);
        return { from, to, lost: !target.wasEmpty && from >= to };
    }

    function release() {
        unsubscribe?.();
        unsubscribe = null;
        target = null;
    }

    return { capture, range, release };
}
