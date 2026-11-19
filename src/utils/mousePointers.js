// Souris des collaborateurs (MousePresence) : ce que chacun publie dans son
// état d'awareness, et la liste des souris à afficher. La position est ancrée
// au texte (position relative Yjs, à côté de laquelle est la souris) plus un
// petit décalage en pixels : les fenêtres n'ont pas la même largeur, un x/y
// brut ne tomberait pas sur le même mot d'un écran à l'autre.

/**
 * Le champ d'awareness de la souris, ou null :
 * - sur le texte : { anchor, dx, dy } (position relative Yjs + décalage) ;
 * - sur l'en-tête : { area: 'header', x, y } (pixels depuis le bord gauche de
 *   la colonne et le haut de l'en-tête, qui a la largeur max du texte)
 */
export const POINTER_FIELD = 'pointer';

/** Au plus un envoi par cet intervalle (ms) */
export const POINTER_THROTTLE_MS = 50;

const isFiniteNumber = value => typeof value === 'number' && Number.isFinite(value);

/** Une souris publiée bien formée (sur le texte ou sur l'en-tête) */
export const isPointer = value => {
    if (!value || typeof value !== 'object') return false;
    if (value.area === 'header') return isFiniteNumber(value.x) && isFiniteNumber(value.y);
    return !!value.anchor && typeof value.anchor === 'object' && isFiniteNumber(value.dx) && isFiniteNumber(value.dy);
};

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
            ...(pointer.area === 'header'
                ? { area: 'header', x: pointer.x, y: pointer.y }
                : { anchor: pointer.anchor, dx: pointer.dx, dy: pointer.dy }),
        });
    }
    return pointers.sort((a, b) => a.clientId - b.clientId);
}

/** Position dans les bornes du document */
export const clampPosition = (pos, size) => Math.max(0, Math.min(pos, size));
