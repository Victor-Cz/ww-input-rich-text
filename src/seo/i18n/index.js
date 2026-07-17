// i18n des checks SEO : une entrée par check et par locale
// ({ title, description, messages: { good / warning / bad / na } }).
// L'id du check reste stable : l'utilisateur peut ignorer ces textes
// et fournir les siens côté WeWeb.

import en from './en.js';
import fr from './fr.js';

const LOCALES = { en, fr };

function getLocale(lang) {
    return LOCALES[lang] || LOCALES.en;
}

/** Titre et description statiques d'un check, localisés (en par défaut). */
export function getLabels(checkId, lang) {
    const entry = getLocale(lang)[checkId];
    if (!entry) return { title: '', description: '' };
    return { title: entry.title || '', description: entry.description || '' };
}

/** Message d'un check selon son statut, avec interpolation {value} / {value.x}. */
export function getMessage(check, lang) {
    const entry = getLocale(lang)[check.id];
    if (!entry) return '';
    const template = entry.messages[check.status] || entry.messages.good || '';
    return template.replace(/\{value(?:\.([a-zA-Z]+))?\}/g, (_, key) => {
        const value = key ? check.value?.[key] : check.value;
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    });
}
