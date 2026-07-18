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
 * Message d'un check selon son statut, avec interpolation `{value}` (valeur
 * mesurée) et `{target}` (objectif chiffré, ex. nombre d'images visé).
 * Un check peut porter un `messageKey` pour désambiguïser deux causes
 * partageant le même statut (ex. headingHierarchy : H1 manquant vs H1 multiples).
 */
export function getMessage(check, lang) {
    const locale = getLocale(lang);
    const entry = locale[check.id];
    if (!entry) return '';
    const template = pickTemplate(entry.messages, check, locale.defaultNa || '');
    return template.replace(/\{(value|target)(?:\.([a-zA-Z]+))?\}/g, (_, field, key) => {
        const base = field === 'target' ? check.target : check.value;
        const value = key ? base?.[key] : base;
        if (value === null || value === undefined) return '';
        if (Array.isArray(value)) return value.join(', ');
        return String(value);
    });
}

// Choisit le message. `messageKey` explicite prioritaire. Sinon, repli par
// SÉVÉRITÉ (jamais vers `good` depuis un statut négatif, jamais vers `good`
// depuis `na`) : un statut sans message dédié ne doit pas afficher « tout va bien ».
function pickTemplate(messages, check, defaultNa) {
    if (check.messageKey && messages[check.messageKey]) return messages[check.messageKey];
    switch (check.status) {
        case 'na':
            return messages.na || defaultNa;
        case 'bad':
            return messages.bad || messages.warning || messages.good || '';
        case 'warning':
            return messages.warning || messages.bad || messages.good || '';
        default:
            return messages.good || '';
    }
}
