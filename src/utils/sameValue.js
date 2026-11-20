// Égalités pour ne pas republier ce qui n'a pas changé : chaque publication
// d'une variable de composant réveille les bindings de WeWeb (et peut boucler
// avec eux), chaque nouvel objet d'état refait le rendu.

/**
 * @name sameValue
 * @description Même valeur publiée : === pour les primitives, même JSON pour
 * les objets et tableaux.
 */
export function sameValue(a, b) {
    if (a === b) return true;
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false;
    return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * @name shallowEqual
 * @description Mêmes clés, valeurs === une à une (objets plats).
 */
export function shallowEqual(a, b) {
    if (a === b) return true;
    if (!a || !b) return false;
    const keys = Object.keys(a);
    if (keys.length !== Object.keys(b).length) return false;
    return keys.every(key => Object.prototype.hasOwnProperty.call(b, key) && a[key] === b[key]);
}
