// Souris des collaborateurs (MousePresence) : ce que chacun publie dans son
// état d'awareness, et la liste des souris à afficher. La position est ancrée
// au texte (position relative Yjs, à côté de laquelle est la souris) plus un
// petit décalage en pixels : les fenêtres n'ont pas la même largeur, un x/y
// brut ne tomberait pas sur le même mot d'un écran à l'autre.

/** Le champ d'awareness de la souris : { anchor, dx, dy } ou null */
export const POINTER_FIELD = 'pointer';

/** Au plus un envoi par cet intervalle (ms) */
export const POINTER_THROTTLE_MS = 50;

const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);

/** Une souris publiée bien formée */
export const isPointer = value =>
    !!value &&
    typeof value === 'object' &&
    !!value.anchor &&
    typeof value.anchor === 'object' &&
    isFiniteNumber(value.dx) &&
    isFiniteNumber(value.dy);

/**
 * Les souris des autres, dans l'ordre des clients : celles des états qui ont
 * un utilisateur et une souris bien formée. L'écrivain du serveur (sans
 * souris) et le client local n'y sont pas
 */
export function remotePointers(states, localClientId) {
    const pointers = [];
    for (const [clientId, state] of states ?? []) {
        if (clientId === localClientId) continue;
        const pointer = state?.[POINTER_FIELD];
        if (!state?.user || !isPointer(pointer)) continue;
        pointers.push({
            clientId,
            name: String(state.user.name ?? ''),
            color: state.user.color || '#6B46C1',
            anchor: pointer.anchor,
            dx: pointer.dx,
            dy: pointer.dy,
        });
    }
    return pointers.sort((a, b) => a.clientId - b.clientId);
}

/** Position dans les bornes du document */
export const clampPosition = (pos, size) => Math.max(0, Math.min(pos, size));
