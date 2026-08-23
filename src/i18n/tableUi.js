// Textes de l'UI des tableaux (poignées + menu d'actions).
//
// La langue suit celle de l'application WeWeb (`wwLib.wwLang.lang`), pas les
// réglages `seoLang` / `seoUiLang` qui ne concernent que l'analyse SEO. Repli
// sur l'anglais pour toute langue non traduite ici.

const TEXTS = {
    en: {
        columnGrip: 'Click for column actions — drag to move it',
        rowGrip: 'Click for row actions — drag to move it',
        addRowBefore: 'Insert row above',
        addRowAfter: 'Insert row below',
        addColumnBefore: 'Insert column left',
        addColumnAfter: 'Insert column right',
        deleteRow: 'Delete row',
        deleteColumn: 'Delete column',
        toggleHeaderRow: 'Header row',
        toggleHeaderColumn: 'Header column',
        deleteTable: 'Delete table',
    },
    fr: {
        columnGrip: 'Clic pour les actions de colonne — glisser pour la déplacer',
        rowGrip: 'Clic pour les actions de ligne — glisser pour la déplacer',
        addRowBefore: 'Insérer une ligne au-dessus',
        addRowAfter: 'Insérer une ligne en dessous',
        addColumnBefore: 'Insérer une colonne à gauche',
        addColumnAfter: 'Insérer une colonne à droite',
        deleteRow: 'Supprimer la ligne',
        deleteColumn: 'Supprimer la colonne',
        toggleHeaderRow: "Ligne d'en-tête",
        toggleHeaderColumn: "Colonne d'en-tête",
        deleteTable: 'Supprimer le tableau',
    },
};

/** Langue courante de l'app, normalisée ('fr-FR' → 'fr'). */
function currentLang() {
    if (typeof wwLib === 'undefined') return 'en';
    // Selon le contexte d'exécution, `lang` est une ref ou une chaîne.
    const lang = wwLib.wwLang?.lang?.value ?? wwLib.wwLang?.lang;
    return typeof lang === 'string' ? lang.slice(0, 2).toLowerCase() : 'en';
}

/** Dictionnaire complet dans la langue de l'app (anglais par défaut). */
export function getTableTexts() {
    return TEXTS[currentLang()] || TEXTS.en;
}
