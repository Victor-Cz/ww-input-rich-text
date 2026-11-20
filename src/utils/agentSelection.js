// Sélection de l'agent : les passages que l'auteur d'une écriture du serveur
// (un agent par MCP) montre à ceux qui ont le document ouvert, sans rien
// changer (select_article_text), ou qu'il s'apprête à remplacer puis vient
// d'écrire (edit_article_text). Le serveur les publie dans l'awareness du
// document lui-même : { user: { …, writer: true }, selections: [{ anchor,
// head }] }, positions relatives Yjs en JSON (cf. extensions/AgentSelection).

import { brandColorOf } from './collabUsers.js';

/** Le champ de l'awareness qui porte la sélection de l'agent */
export const SELECTIONS_FIELD = 'selections';

/** Au plus tant de plages lues par auteur : la valeur vient du réseau */
export const MAX_AGENT_RANGES = 200;

const isPosition = value => !!value && typeof value === 'object' && !Array.isArray(value);

/**
 * @name writerSelections
 * @description Les sélections des auteurs du serveur (`user.writer`) dans les
 * états de l'awareness (`states` : Map clientId → état), triées par client :
 * [{ clientId, color, selections: [{ anchor, head }] }]. `color` : la couleur
 * de marque de l'agent (cf. brandColorOf), sinon null. Une plage sans ancre
 * ou sans tête est ignorée ; un auteur sans plage n'apparaît pas
 */
export function writerSelections(states) {
    const entries = [];
    for (const [clientId, state] of states ?? []) {
        if (state?.user?.writer !== true) continue;
        const list = Array.isArray(state[SELECTIONS_FIELD]) ? state[SELECTIONS_FIELD] : [];
        const selections = list
            .filter(range => isPosition(range?.anchor) && isPosition(range?.head))
            .slice(0, MAX_AGENT_RANGES)
            .map(({ anchor, head }) => ({ anchor, head }));
        if (selections.length === 0) continue;
        entries.push({ clientId, color: brandColorOf(state.user), selections });
    }
    return entries.sort((a, b) => a.clientId - b.clientId);
}

/**
 * @name concernsWriters
 * @description Un changement de l'awareness (`changed` : les clients ajoutés,
 * modifiés ou partis) touche-t-il la sélection de l'agent ? Oui si l'un de ces
 * clients est un auteur du serveur, ou montrait une sélection (`shown` : Set
 * de clientId) : il vient peut-être de partir. La souris et les curseurs des
 * collaborateurs, eux, ne coûtent que ce test
 */
export function concernsWriters(states, changed, shown) {
    for (const clientId of changed) {
        if (shown.has(clientId)) return true;
        if (states?.get(clientId)?.user?.writer === true) return true;
    }
    return false;
}

/**
 * @name rangesFrom
 * @description Les plages à surligner, triées, d'après les positions
 * absolues lues (`pairs` : [{ anchor, head, color }], null pour une position
 * introuvable) dans un document de taille `size` : [{ from, to, color }].
 * Une plage introuvable, vide ou hors du document est ignorée
 */
export function rangesFrom(pairs, size) {
    const ranges = [];
    for (const { anchor, head, color } of pairs) {
        if (!Number.isInteger(anchor) || !Number.isInteger(head)) continue;
        const from = Math.max(0, Math.min(anchor, head, size));
        const to = Math.min(size, Math.max(anchor, head, 0));
        if (from >= to) continue;
        ranges.push({ from, to, color });
    }
    return ranges.sort((a, b) => a.from - b.from || a.to - b.to);
}

/**
 * @name cssColor
 * @description Une couleur venue d'un paramètre (hex, rgb(), var(--…),
 * nom…) qui peut aller dans un attribut style : null si elle pourrait en
 * sortir (point-virgule, accolades, guillemets…) ou charger quelque chose
 */
export function cssColor(value) {
    const color = typeof value === 'string' ? value.trim() : '';
    if (!color || color.length > 120) return null;
    if (/[;{}<>"'\\]|url\s*\(|expression\s*\(/i.test(color)) return null;
    return color;
}
