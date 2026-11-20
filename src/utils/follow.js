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
 * @name followScrollDuration
 * @description La durée (ms) d'un défilement de suivi de `distance` px : un
 * petit effet doux de près, à peine plus long de loin (on y arrive vite)
 */
export function followScrollDuration(distance) {
    return Math.round(Math.min(450, 160 + Math.abs(distance) * 0.12));
}

/** Décélération du défilement de suivi (0 → 1) */
export const easeOutCubic = t => 1 - Math.pow(1 - t, 3);

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
 * Combien de temps l'agent suivi peut s'absenter sans que le suivi s'arrête :
 * l'auteur du serveur disparaît de la liste 10 s après son dernier appel, et
 * un agent revient souvent après un moment de réflexion ou une question à la
 * personne. Au-delà, c'est une autre séance : on ne le suit plus
 */
export const AGENT_FOLLOW_GRACE_MS = 10 * 60 * 1000;

/**
 * @name nextAgentFollow
 * @description Le suivi de l'agent après un changement de la liste des
 * utilisateurs `users`, depuis `previous` ({ name, awaySince } ou null) :
 * - un agent présent : suivi, s'il porte le nom de celui qu'on suivait (un
 *   autre agent, « Claude • Paul » après « Claude • Victor », arrête le
 *   suivi) ; awaySince null ;
 * - aucun agent : suivi encore `grace` ms depuis son départ (awaySince), puis
 *   arrêté.
 * Rend le nouvel état, ou null quand le suivi s'arrête
 */
export function nextAgentFollow(previous, users, now, grace = AGENT_FOLLOW_GRACE_MS) {
    const agent = Array.isArray(users) ? users.find(user => user?.agent) : null;
    if (agent) {
        const name = agent.name ? String(agent.name) : '';
        if (previous?.name && name && previous.name !== name) return null;
        return { name: previous?.name || name, awaySince: null };
    }
    const awaySince = previous?.awaySince ?? now;
    return now - awaySince >= grace ? null : { name: previous?.name ?? '', awaySince };
}

/**
 * @name followedPresent
 * @description L'écran suivi est-il dans la liste des utilisateurs
 * (collaborationStatus.users) ? `agent` : un agent présent ; sinon la clé est
 * le `clientId` d'une connexion (un écran) d'un humain, autre que
 * `localClientId` : on suit un écran, jamais le sien
 */
export function followedPresent(users, key, localClientId = null) {
    if (!key || !Array.isArray(users)) return false;
    if (key === FOLLOW_AGENT) return users.some(user => user?.agent);
    return users.some(
        user =>
            user &&
            !user.agent &&
            user.clientId != null &&
            String(user.clientId) === key &&
            (localClientId == null || String(user.clientId) !== String(localClientId))
    );
}

/**
 * @name nextFollowing
 * @description Qui suivre après l'action « suivre » `requested` (le clientId
 * d'un écran, ou `agent`) : le même arrête le suivi ; une clé vide, son propre
 * écran ou un écran absent de `users` ne changent rien
 */
export function nextFollowing(current, requested, { users = [], localClientId = null } = {}) {
    const key = requested == null ? '' : String(requested).trim();
    if (!key) return current ?? null;
    if (key === current) return null;
    return followedPresent(users, key, localClientId) ? key : current ?? null;
}

/**
 * @name followedCursorMoved
 * @description Le curseur de l'écran suivi (`clientId`) a-t-il bougé parmi
 * les clients `changed` de l'awareness (`states` : Map clientId → état) depuis
 * la dernière lecture (`seen` : Map clientId → curseur lu, tenue à jour ici) ?
 * La souris et le reste de l'état ne comptent pas ; sans curseur, non
 */
export function followedCursorMoved(states, changed, clientId, seen) {
    if (clientId == null || !changed.includes(clientId)) return false;
    const state = states.get(clientId);
    const cursor = JSON.stringify(state?.cursor ?? null);
    if (seen.get(clientId) === cursor) return false;
    seen.set(clientId, cursor);
    return !!state?.cursor;
}
