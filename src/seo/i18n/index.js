// i18n des checks SEO : une entrée par check et par locale
// ({ title, description, messages: { good / warning / bad / na } }),
// plus une entrée `categories` ({ name, description } par catégorie).
// L'id du check reste stable : l'utilisateur peut ignorer ces textes
// et fournir les siens côté WeWeb.

import en from './en.js';
import fr from './fr.js';

const LOCALES = { en, fr };

function getLocale(lang) {
    return LOCALES[lang] || LOCALES.en;
}

/** Titre, description et objectif statiques d'un check, localisés (en par défaut). */
export function getLabels(checkId, lang) {
    const entry = getLocale(lang)[checkId];
    if (!entry) return { title: '', description: '', objective: '' };
    return {
        title: entry.title || '',
        description: entry.description || '',
        objective: entry.objective || '',
    };
}

/** Nom et description statiques d'une catégorie, localisés (en par défaut). */
export function getCategoryLabels(categoryId, lang) {
    const entry = getLocale(lang).categories?.[categoryId];
    if (!entry) return { name: '', description: '' };
    return { name: entry.name || '', description: entry.description || '' };
}

/**
 * Message d'un check selon son statut, avec interpolation {value} / {value.x}.
 * Un check peut porter un `messageKey` pour désambiguïser deux causes
 * partageant le même statut (ex. singleH1 : H1 manquant vs H1 multiples).
 */
export function getMessage(check, lang) {
    const entry = getLocale(lang)[check.id];
    if (!entry) return '';
    const template =
        (check.messageKey && entry.messages[check.messageKey]) ||
        entry.messages[check.status] ||
        entry.messages.good ||
        '';
    return template.replace(/\{value(?:\.([a-zA-Z]+))?\}/g, (_, key) => {
        const value = key ? check.value?.[key] : check.value;
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    });
}
