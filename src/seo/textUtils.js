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

// Racinisation morphologique légère (fr + en). But : ramener les variations
// fléchies d'un mot (pluriels, féminins, conjugaisons courantes) à une racine
// commune, pour qu'elles comptent comme le mot-clé. Ce n'est PAS un lemmatiseur
// complet — on vise la tolérance, pas l'exactitude linguistique : quelques
// sur-racinisations (ex. « national » → « nation ») sont acceptées.
// Le texte est déjà normalisé (minuscules, sans accent) avant racinisation.
const MIN_STEM = 3;

// Terminaisons fléchies, de la plus longue à la plus courte (une seule est
// retirée, la plus longue applicable). Formes désaccentuées (é → e, ée → ee…).
const INFLECTIONS = [
    'aient', 'erent', 'irent',
    'ales', 'eaux',
    'aux', 'als', 'ons', 'ent', 'ait', 'ais', 'ing', 'ies', 'ied', 'ees',
    'al', 'er', 'ir', 'ez', 'ed', 'es', 'ee',
    's', 'x', 'e', 'y',
];

/** Racine d'un mot déjà normalisé : retire une terminaison fléchie si la racine
 *  restante garde au moins MIN_STEM caractères. */
export function stemWord(word) {
    if (word.length <= MIN_STEM) return word;
    for (const suffix of INFLECTIONS) {
        if (word.length - suffix.length >= MIN_STEM && word.endsWith(suffix)) {
            return word.slice(0, word.length - suffix.length);
        }
    }
    return word;
}

const TOKEN_REGEX = /[\p{L}\p{N}]+/gu;

/** Racines des mots d'une phrase-clé (ordre conservé). */
function stemPhrase(phrase) {
    return (normalizeText(phrase).match(TOKEN_REGEX) || []).map(stemWord);
}

/**
 * Trouve toutes les occurrences d'une phrase-clé dans un texte, en comparant
 * les racines (tolérance casse, accents, et variations fléchies / lemmatisées).
 * Une occurrence = une suite de tokens contigus dont les racines égalent, dans
 * l'ordre, celles de la phrase-clé. Retourne des index [start, end) dans le
 * texte d'origine (normalizeText préserve la longueur 1:1).
 */
export function findPhraseMatches(text, phrase) {
    const stems = stemPhrase(phrase);
    if (!stems.length) return [];

    const normalized = normalizeText(text);
    const tokens = [];
    for (const match of normalized.matchAll(TOKEN_REGEX)) {
        tokens.push({ start: match.index, end: match.index + match[0].length, stem: stemWord(match[0]) });
    }

    const matches = [];
    const n = stems.length;
    for (let i = 0; i + n <= tokens.length; i++) {
        let ok = true;
        for (let j = 0; j < n; j++) {
            if (tokens[i + j].stem !== stems[j]) {
                ok = false;
                break;
            }
        }
        if (ok) matches.push({ start: tokens[i].start, end: tokens[i + n - 1].end });
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
