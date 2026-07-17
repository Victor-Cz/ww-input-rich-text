// Utilitaires texte purs pour l'analyse SEO.

/**
 * Normalise un caractère : minuscule, sans accent.
 * Préserve la longueur 1:1 pour que les index restent valides.
 */
function normalizeChar(char) {
    const decomposed = char.normalize('NFD');
    const base = decomposed[0] || char;
    return base.toLowerCase();
}

/**
 * Normalise un texte caractère par caractère (même longueur que l'entrée),
 * pour pouvoir mapper les index de match vers les positions d'origine.
 */
export function normalizeText(text) {
    let result = '';
    for (const char of String(text)) {
        // `for...of` itère par code point ; les caractères hors BMP (émojis)
        // comptent pour 2 unités UTF-16, on préserve la longueur UTF-16.
        const normalized = normalizeChar(char);
        result += normalized.length === char.length ? normalized : char.toLowerCase();
    }
    return result;
}

export function escapeRegExp(text) {
    return String(text).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const WORD_SPLIT_REGEX = /[\s ]+/;

/** Découpe un texte en mots (tokens non vides). */
export function splitWords(text) {
    return String(text)
        .split(WORD_SPLIT_REGEX)
        .map(word => word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
        .filter(Boolean);
}

export function countWords(text) {
    return splitWords(text).length;
}

/** Mots significatifs d'une phrase-clé (sans mots vides). */
export function contentWords(phrase, stopWords) {
    const stopSet = new Set(stopWords || []);
    return splitWords(normalizeText(phrase)).filter(word => !stopSet.has(word));
}

/**
 * Construit une RegExp qui matche une phrase-clé dans un texte normalisé :
 * - mots séparés par espaces/tirets/apostrophes,
 * - tolérance pluriels simples fr/en (s, x, es) sur chaque mot,
 * - bornée par des non-lettres (pas de match au milieu d'un mot).
 */
export function buildPhraseRegex(phrase) {
    const words = splitWords(normalizeText(phrase));
    if (!words.length) return null;
    const body = words.map(word => `${escapeRegExp(word)}(?:es|s|x)?`).join(`[\\s\\u00A0''\\-]+`);
    return new RegExp(`(^|[^\\p{L}\\p{N}])(${body})(?=[^\\p{L}\\p{N}]|$)`, 'giu');
}

/**
 * Trouve toutes les occurrences d'une phrase-clé dans un texte.
 * Retourne des index [start, end) dans le texte d'origine.
 */
export function findPhraseMatches(text, phrase) {
    const regex = buildPhraseRegex(phrase);
    if (!regex) return [];
    const normalized = normalizeText(text);
    const matches = [];
    let match;
    while ((match = regex.exec(normalized)) !== null) {
        const start = match.index + match[1].length;
        matches.push({ start, end: start + match[2].length });
        // Éviter une boucle infinie sur un match vide
        if (regex.lastIndex === match.index) regex.lastIndex++;
    }
    return matches;
}

/** Au moins une occurrence d'une des phrases dans le texte. */
export function includesAnyPhrase(text, phrases) {
    return (phrases || []).some(phrase => findPhraseMatches(text, phrase).length > 0);
}

/**
 * Compte approximatif des syllabes d'un mot (groupes de voyelles sur le mot
 * normalisé, e muet final retiré). Suffisant pour un score Flesch indicatif.
 */
export function countSyllables(word, lang) {
    let cleaned = normalizeText(word).replace(/[^a-z]/g, '');
    if (!cleaned) return 0;
    if (cleaned.length > 2 && cleaned.endsWith('e') && !(lang === 'en' && cleaned.endsWith('le'))) {
        cleaned = cleaned.slice(0, -1);
    }
    const groups = cleaned.match(/[aeiouy]+/g);
    return Math.max(1, groups ? groups.length : 1);
}

/**
 * Découpe un texte en phrases. Retourne [{ text, start, end }] avec
 * index dans le texte d'origine.
 */
export function splitSentences(text) {
    const sentences = [];
    const regex = /[^.!?…]+[.!?…]*[\s ]*/g;
    let match;
    while ((match = regex.exec(String(text))) !== null) {
        const raw = match[0];
        const trimmed = raw.trim();
        if (!trimmed || !/[\p{L}\p{N}]/u.test(trimmed)) continue;
        const leading = raw.length - raw.trimStart().length;
        sentences.push({
            text: trimmed,
            start: match.index + leading,
            end: match.index + leading + trimmed.length,
        });
    }
    return sentences;
}
