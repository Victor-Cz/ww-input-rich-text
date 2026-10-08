/** Langue courante de l'app WeWeb, normalisée ('fr-FR' → 'fr'), anglais hors WeWeb. */
export function currentLang() {
    if (typeof wwLib === 'undefined') return 'en';
    // Selon le contexte d'exécution, `lang` est une ref ou une chaîne.
    const lang = wwLib.wwLang?.lang?.value ?? wwLib.wwLang?.lang;
    return typeof lang === 'string' ? lang.slice(0, 2).toLowerCase() : 'en';
}
