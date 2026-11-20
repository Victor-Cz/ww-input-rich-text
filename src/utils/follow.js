// Suivre quelqu'un pendant qu'il écrit : le défilement accompagne le caret
// de l'agent (son texte qui se dévoile, cf. followAgentCaret) ou le curseur
// d'un collaborateur (action followUser), seulement quand il sort de la bande
// centrale de ce qui défile.

/** La clé de suivi de l'agent (Brispr, ou l'auteur d'une écriture du serveur) */
export const FOLLOW_AGENT = 'agent';

/**
 * @name insideBand
 * @description Le rectangle `rect` (coordonnées écran) est-il dans la bande
 * `band` ({ top, bottom }, fractions de la hauteur) de la zone visible
 * `viewport` ({ top, height }) ?
 */
export const insideBand = (rect, viewport, band) =>
    rect.top >= viewport.top + viewport.height * band.top &&
    rect.bottom <= viewport.top + viewport.height * band.bottom;

/**
 * @name bandScrollDelta
 * @description Le défilement (en px, négatif vers le haut) qui ramène
 * `rect` dans la bande `band` de `viewport` par le bord le plus proche :
 * son haut sur le haut de la bande s'il est au-dessus, son bas sur le bas de
 * la bande s'il est en dessous. 0 dans la bande
 */
export function bandScrollDelta(rect, viewport, band) {
    const top = viewport.top + viewport.height * band.top;
    const bottom = viewport.top + viewport.height * band.bottom;
    if (rect.top < top) return rect.top - top;
    if (rect.bottom > bottom) return rect.bottom - bottom;
    return 0;
}

/**
 * @name followedPresent
 * @description La personne suivie est-elle dans la liste des utilisateurs
 * (collaborationStatus.users) ? `agent` : un agent présent ; sinon un
 * utilisateur (pas un agent) de cet id
 */
export function followedPresent(users, key) {
    if (!key || !Array.isArray(users)) return false;
    if (key === FOLLOW_AGENT) return users.some(user => user?.agent);
    return users.some(user => user && !user.agent && user.id != null && String(user.id) === key);
}

/**
 * @name nextFollowing
 * @description Qui suivre après l'action « suivre » `requested` : la même
 * personne arrête le suivi ; soi-même (`localId`), une clé vide ou une
 * personne absente de `users` ne changent rien
 */
export function nextFollowing(current, requested, { localId = null, users = [] } = {}) {
    const key = requested == null ? '' : String(requested).trim();
    if (!key) return current ?? null;
    if (key === current) return null;
    if (localId != null && localId !== '' && key === String(localId)) return current ?? null;
    return followedPresent(users, key) ? key : current ?? null;
}

/**
 * @name movedCursorClient
 * @description Parmi les clients `changed` de l'awareness (`states` :
 * Map clientId → état), celui de l'utilisateur `userId` dont le curseur a
 * bougé depuis la dernière lecture (`seen` : Map clientId → curseur lu,
 * tenue à jour ici). La souris et le reste de l'état ne comptent pas. null
 * si aucun curseur de cet utilisateur n'a bougé, ou s'il n'en a plus
 */
export function movedCursorClient(states, changed, userId, seen) {
    let moved = null;
    for (const clientId of changed) {
        const state = states.get(clientId);
        if (state?.user?.id == null || String(state.user.id) !== userId) continue;
        const cursor = JSON.stringify(state.cursor ?? null);
        if (seen.get(clientId) === cursor) continue;
        seen.set(clientId, cursor);
        if (state.cursor) moved = clientId;
    }
    return moved;
}
