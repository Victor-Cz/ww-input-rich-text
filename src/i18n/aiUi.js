// Textes du menu IA et de la rédaction en direct qui ne sont pas réglables
// dans les placeholders, ou dont le placeholder est resté vide. Même règle de langue que les tableaux
// (`wwLib.wwLang.lang`), repli sur l'anglais.

import { currentLang } from './lang.js';

const TEXTS = {
    en: {
        targetLost: 'The selected passage was removed in the meantime: nothing was applied.',
        followAgent: 'Follow {name}',
    },
    fr: {
        targetLost: "Le passage sélectionné a été supprimé entre-temps : rien n'a été appliqué.",
        followAgent: 'Suivre {name}',
    },
};

/** Dictionnaire complet dans la langue de l'app (anglais par défaut). */
export function getAiTexts() {
    return TEXTS[currentLang()] || TEXTS.en;
}
