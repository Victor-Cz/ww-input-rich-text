// Textes du menu IA qui ne sont pas réglables dans les placeholders, ou dont
// le placeholder est resté vide. Même règle de langue que les tableaux
// (`wwLib.wwLang.lang`), repli sur l'anglais.

import { currentLang } from './lang.js';

const TEXTS = {
    en: {
        targetLost: 'The selected passage was removed in the meantime: nothing was applied.',
    },
    fr: {
        targetLost: "Le passage sélectionné a été supprimé entre-temps : rien n'a été appliqué.",
    },
};

/** Dictionnaire complet dans la langue de l'app (anglais par défaut). */
export function getAiTexts() {
    return TEXTS[currentLang()] || TEXTS.en;
}
