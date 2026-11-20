// Les utilisateurs d'un document collaboratif tels que l'awareness les donne.

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * @name brandColorOf
 * @description La couleur de marque d'un agent, donnée par le serveur dans
 * son awareness (`user.color`, ex. Claude) : une couleur hexadécimale
 * (#rgb ou #rrggbb), sinon null. Seul l'hexadécimal passe : la valeur finit
 * dans du CSS
 */
export function brandColorOf(user) {
    const color = typeof user?.color === 'string' ? user.color.trim() : '';
    return HEX_COLOR.test(color) ? color : null;
}
