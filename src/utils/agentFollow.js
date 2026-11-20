// Rédaction en direct : le défilement suit le caret de l'agent, seulement
// quand il sort de la bande centrale de ce qui défile (cf. followAgentCaret).

/**
 * @name insideBand
 * @description Le rectangle `rect` (coordonnées écran) est-il dans la bande
 * `band` ({ top, bottom }, fractions de la hauteur) de la zone visible
 * `viewport` ({ top, height }) ?
 */
export const insideBand = (rect, viewport, band) =>
    rect.top >= viewport.top + viewport.height * band.top &&
    rect.bottom <= viewport.top + viewport.height * band.bottom;
