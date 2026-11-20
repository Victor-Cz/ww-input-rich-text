// Curseurs des collaborateurs (CollaborationCursor) : une awareness filtrée.
//
// Le plugin de curseurs de y-prosemirror dispatche une transaction
// ProseMirror à chaque `change` de l'awareness, et l'extension de Tiptap
// relit la liste des utilisateurs à chaque `update`. Or l'awareness change
// aussi pour ce qui ne les regarde pas : la souris des collaborateurs (champ
// `pointer`, plusieurs fois par seconde et par participant), le
// renouvellement périodique de chaque état. La façade ne leur transmet un
// événement que si le curseur ou l'utilisateur d'un client a changé, ou si un
// client arrive ou part ; lectures et écritures passent telles quelles à
// l'awareness réelle.
//
// L'extension n'enlève jamais son écouteur (chaque éditeur rechargé en
// laissait un, et l'éditeur avec) : destroy(), appelé avec l'éditeur, les
// retire tous. Après destroy(), les écritures passent encore (le plugin efface
// son curseur en se détruisant, après l'éditeur).

/** Les champs de l'awareness que lisent les curseurs */
export const CURSOR_FIELDS = ['cursor', 'user'];

const keyOf = state => JSON.stringify(CURSOR_FIELDS.map(field => state?.[field] ?? null));

/**
 * @name createCursorAwareness
 * @description L'awareness réelle vue par les curseurs : mêmes lectures et
 * écritures, événements `change` et `update` seulement quand un curseur ou un
 * utilisateur change (ou qu'un client arrive ou part).
 */
export function createCursorAwareness(awareness) {
    const listeners = new Map([
        ['change', new Set()],
        ['update', new Set()],
    ]);
    // Curseur et utilisateur de chaque client, tels que vus en dernier
    const keys = new Map();
    for (const [clientId, state] of awareness.getStates()) keys.set(clientId, keyOf(state));

    // `update` suit chaque `change` de l'awareness, sur tous les clients touchés
    const onUpdate = ({ added, updated, removed }, origin) => {
        let changed = added.length > 0 || removed.length > 0;
        for (const clientId of removed) keys.delete(clientId);
        const states = awareness.getStates();
        for (const clientId of [...added, ...updated]) {
            const key = keyOf(states.get(clientId));
            if (keys.get(clientId) === key) continue;
            keys.set(clientId, key);
            changed = true;
        }
        if (!changed) return;
        const change = { added, updated, removed };
        for (const event of ['change', 'update']) {
            for (const listener of [...listeners.get(event)]) listener(change, origin);
        }
    };
    awareness.on('update', onUpdate);

    return {
        get clientID() {
            return awareness.clientID;
        },
        get states() {
            return awareness.states;
        },
        getStates: () => awareness.getStates(),
        getLocalState: () => awareness.getLocalState(),
        setLocalState: state => awareness.setLocalState(state),
        setLocalStateField: (field, value) => awareness.setLocalStateField(field, value),
        on(event, listener) {
            listeners.get(event)?.add(listener);
        },
        off(event, listener) {
            listeners.get(event)?.delete(listener);
        },
        destroy() {
            awareness.off('update', onUpdate);
            listeners.forEach(set => set.clear());
            keys.clear();
        },
    };
}
