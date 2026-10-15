// Utilitaires texte purs pour l'analyse SEO.

/**
 * Normalise un caractère : minuscule, sans accent.
 * Préserve la longueur 1:1 pour que les index restent valides.
 */
function normalizeChar(char) {
    const decomposed = char.normalize('NFD');
    const base = decomposed[0] || char;
    const normalized = base.toLowerCase();
    return normalized.length === char.length ? normalized : char.toLowerCase();
}

// normalize('NFD') + toLowerCase par caractère est coûteux et le résultat est
// une fonction pure du caractère : mémoïsé (l'alphabet réel d'un document est
// petit, le plafond n'est là que pour borner les cas pathologiques).
const CHAR_CACHE = new Map();
const CHAR_CACHE_MAX = 5000;

/**
 * Normalise un texte caractère par caractère (même longueur que l'entrée),
 * pour pouvoir mapper les index de match vers les positions d'origine.
 */
export function normalizeText(text) {
    let result = '';
    for (const char of String(text)) {
        // `for...of` itère par code point ; les caractères hors BMP (émojis)
        // comptent pour 2 unités UTF-16, on préserve la longueur UTF-16.
        let normalized = CHAR_CACHE.get(char);
        if (normalized === undefined) {
            normalized = normalizeChar(char);
            if (CHAR_CACHE.size < CHAR_CACHE_MAX) CHAR_CACHE.set(char, normalized);
        }
        result += normalized;
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
// On couvre pluriels, féminins, -al/-aux, participes (-é) et présent (-e), plus
// les terminaisons anglaises. On EXCLUT volontairement les terminaisons verbales
// ambiguës (-ons, -ent, -ais, -ait) : elles collisionnent avec des noms très
// courants (soluti[ons], docum[ent]s, pal[ais]) et casseraient l'alignement
// singulier/pluriel des noms — de loin le cas dominant en SEO. Conséquence
// assumée : les formes conjuguées « optimisons / optimisent » ne se ramènent pas
// à « optimiser » (mais « optimise » et « optimisé » oui).
const INFLECTIONS = [
    'ales', 'eaux',
    'aux', 'als', 'ing', 'ies', 'ied', 'ees',
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

/** Tokens d'un texte avec racine et positions [start, end) dans le texte. */
function tokenizeStems(normalized) {
    const tokens = [];
    for (const match of normalized.matchAll(TOKEN_REGEX)) {
        tokens.push({ raw: match[0], start: match.index, end: match.index + match[0].length, stem: stemWord(match[0]) });
    }
    return tokens;
}

// Une analyse appelle findPhraseMatches pour chaque couple bloc × phrase-clé :
// le même texte de bloc serait re-normalisé et re-tokenisé des dizaines de fois
// par passe. Mémoïsé par texte (vidé au plafond : les textes évoluent à la frappe).
const TOKENIZE_CACHE = new Map();
const TOKENIZE_CACHE_MAX = 500;

function tokenizeCached(text) {
    let tokens = TOKENIZE_CACHE.get(text);
    if (tokens === undefined) {
        tokens = tokenizeStems(normalizeText(text));
        if (TOKENIZE_CACHE.size >= TOKENIZE_CACHE_MAX) TOKENIZE_CACHE.clear();
        TOKENIZE_CACHE.set(text, tokens);
    }
    return tokens;
}

// Set des mots vides normalisés, mémoïsé par identité du tableau (stable au
// sein d'une analyse : construit une fois au lieu d'une fois par appel).
const STOP_SET_CACHE = new WeakMap();
const EMPTY_STOP_SET = new Set();

function getStopSet(stopWords) {
    if (!Array.isArray(stopWords) || !stopWords.length) return EMPTY_STOP_SET;
    let set = STOP_SET_CACHE.get(stopWords);
    if (!set) {
        set = new Set(stopWords.map(word => normalizeText(word)));
        STOP_SET_CACHE.set(stopWords, set);
    }
    return set;
}

/**
 * Trouve toutes les occurrences d'une phrase-clé dans un texte, en comparant
 * les racines (tolérance casse, accents, et variations fléchies / lemmatisées).
 * Retourne des index [start, end) dans le texte d'origine (normalizeText
 * préserve la longueur 1:1).
 *
 * `opts.fullLemma` (avec `opts.stopWords`, mode 'stopWords' de findKeywordMatches) :
 * les mots vides (articles, prépositions, accords) sont ignorés des DEUX côtés,
 * et des mots vides peuvent s'intercaler entre les mots de contenu. Ainsi la
 * requête brute « comparatif solution verification identite » matche sa forme
 * naturelle « comparatif des solutions de vérification d'identité ». Sinon
 * (défaut), on exige une suite de tokens strictement contigus.
 */
export function findPhraseMatches(text, phrase, opts = {}) {
    const stopSet = opts.fullLemma ? getStopSet(opts.stopWords) : null;

    const phraseTokens = tokenizeCached(phrase);
    const stems = (stopSet ? phraseTokens.filter(token => !stopSet.has(token.raw)) : phraseTokens)
        .map(token => token.stem);
    if (!stems.length) return [];

    let tokens = tokenizeCached(text);
    // Mode complet : on matche sur la sous-suite des mots de contenu (les mots
    // vides intercalés sont sautés mais restent inclus dans la plage surlignée).
    if (stopSet) tokens = tokens.filter(token => !stopSet.has(token.raw));

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

// Racines uniques des mots significatifs d'une phrase-clé (mots vides retirés ;
// une phrase-clé faite uniquement de mots vides les garde tous).
function keyphraseStems(phrase, stopSet) {
    const tokens = tokenizeCached(phrase);
    const content = tokens.filter(token => !stopSet.has(token.raw));
    return [...new Set((content.length ? content : tokens).map(token => token.stem))];
}

// Modes de correspondance d'un mot-clé (réglables séparément pour le principal
// et pour les secondaires), du plus strict au plus souple.
export const MATCHING_MODES = ['exact', 'stopWords', 'anyOrder'];

/**
 * Trouve un mot-clé (le principal + ses synonymes, ou un secondaire) dans un
 * texte, selon `opts.mode` (racines comparées dans tous les cas : casse,
 * accents et flexions tolérés) :
 * - 'exact' (défaut) : l'expression telle quelle, mots contigus dans l'ordre ;
 * - 'stopWords' : idem, mais les mots vides (de, la, des…) sont ignorés des
 *   deux côtés (voir findPhraseMatches) ;
 * - 'anyOrder' : le mot-clé est une requête de recherche, pas une expression
 *   figée. Comme Yoast, une phrase le contient dès qu'elle réunit TOUS ses mots
 *   significatifs, dans n'importe quel ordre (mots vides ignorés). Ainsi
 *   « Indy synchronisation bancaire » est trouvé dans « la synchronisation
 *   bancaire d'Indy ». Une phrase compte autant d'occurrences que son mot le
 *   moins répété ; entre le principal et ses synonymes, on garde le meilleur.
 *   `opts.singleSentence` : texte court (titre, ancre, alt) traité comme une
 *   seule phrase, sinon le point de « vs. » ou « 2.5 » le couperait en deux.
 * Retourne { count, ranges } : index [start, end) dans le texte — l'expression
 * entière, ou en 'anyOrder' les mots trouvés (des mots qui se suivent formant
 * une seule plage).
 */
export function findKeywordMatches(text, phrases, opts = {}) {
    if (opts.mode !== 'anyOrder') {
        const phraseOptions = { stopWords: opts.stopWords, fullLemma: opts.mode === 'stopWords' };
        const seen = new Set();
        const ranges = (phrases || [])
            .flatMap(phrase => findPhraseMatches(text, phrase, phraseOptions))
            .filter(range => {
                const key = `${range.start}-${range.end}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .sort((a, b) => a.start - b.start);
        return { count: ranges.length, ranges };
    }

    const stopSet = getStopSet(opts.stopWords);
    const keyphrases = (phrases || []).map(phrase => keyphraseStems(phrase, stopSet)).filter(stems => stems.length);
    const result = { count: 0, ranges: [] };
    if (!keyphrases.length) return result;

    const tokens = tokenizeCached(text);
    let index = 0;
    const sentences = opts.singleSentence ? [{ start: 0, end: text.length }] : splitSentences(text);
    for (const sentence of sentences) {
        // Tokens et phrases sont dans l'ordre du texte : un seul parcours
        while (index < tokens.length && tokens[index].start < sentence.start) index++;
        const first = index;
        while (index < tokens.length && tokens[index].end <= sentence.end) index++;
        const sentenceTokens = tokens.slice(first, index);

        const stemCounts = new Map();
        for (const token of sentenceTokens) stemCounts.set(token.stem, (stemCounts.get(token.stem) || 0) + 1);
        let best = 0;
        const foundStems = new Set();
        for (const stems of keyphrases) {
            const occurrences = Math.min(...stems.map(stem => stemCounts.get(stem) || 0));
            if (!occurrences) continue;
            best = Math.max(best, occurrences);
            for (const stem of stems) foundStems.add(stem);
        }
        if (!best) continue;

        result.count += best;
        let previous = -2;
        for (let position = 0; position < sentenceTokens.length; position++) {
            const token = sentenceTokens[position];
            if (!foundStems.has(token.stem)) continue;
            if (position === previous + 1) result.ranges[result.ranges.length - 1].end = token.end;
            else result.ranges.push({ start: token.start, end: token.end });
            previous = position;
        }
    }
    return result;
}

/** Le mot-clé est-il dans ce texte court (titre, ancre, alt) ? */
export function hasKeyword(text, phrases, opts = {}) {
    return findKeywordMatches(text, phrases, { ...opts, singleSentence: true }).count > 0;
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

// Abréviations dont le point ne termine pas la phrase (fr + en), normalisées
// (minuscules, sans accent). « etc. » n'y est pas : il finit souvent une phrase
// (et ne coupe pas quand la suite reprend en minuscule).
const ABBREVIATIONS = new Set([
    'vs', 'cf', 'ex', 'v', 'p', 'pp', 'env', 'approx', 'av', 'apr', 'fig', 'ref', 'tel', 'art', 'chap', 'vol',
    'mme', 'mmes', 'mlle', 'mlles', 'mm', 'dr', 'pr', 'prof', 'st', 'ste', 'mr', 'mrs', 'ms', 'jr', 'sr',
    'e.g', 'i.e',
]);
// Fermants qui peuvent suivre la ponctuation finale (« il a dit "ok." Puis… »)
const CLOSING_CHARS = new Set(['"', '\'', '»', ')', ']', '”', '’']);

/**
 * Découpe un texte en phrases. Retourne [{ text, start, end }] avec
 * index dans le texte d'origine.
 * La ponctuation finale ne coupe que suivie d'un espace ou de la fin du texte
 * (« 2.5 », « indy.fr » restent entiers). Un point ou des points de suspension
 * ne coupent pas quand la suite reprend en minuscule (« etc. et »,
 * « hésite… puis »), ni un point après une abréviation (« vs. », « M. »).
 */
export function splitSentences(text) {
    const source = String(text);
    const sentences = [];
    let start = 0;
    for (const match of source.matchAll(/[.!?…]+/g)) {
        const end = match.index + match[0].length;
        if (!isSentenceEnd(source, match.index, end)) continue;
        pushSentence(sentences, source, start, end);
        start = end;
    }
    pushSentence(sentences, source, start, source.length);
    return sentences;
}

function pushSentence(sentences, source, from, to) {
    const raw = source.slice(from, to);
    const trimmed = raw.trim();
    if (!trimmed || !/[\p{L}\p{N}]/u.test(trimmed)) return;
    const leading = raw.length - raw.trimStart().length;
    sentences.push({ text: trimmed, start: from + leading, end: from + leading + trimmed.length });
}

// La ponctuation [punctStart, punctEnd) termine-t-elle une phrase ?
function isSentenceEnd(source, punctStart, punctEnd) {
    let next = punctEnd;
    while (next < source.length && CLOSING_CHARS.has(source[next])) next++;
    if (next >= source.length) return true;
    if (!/\s/.test(source[next])) {
        // Espace oublié entre deux phrases (« fin.Début »), mais pas « U.S.A. »
        return /\p{Ll}/u.test(source[punctStart - 1] || '') && /\p{Lu}/u.test(source[next]);
    }

    const punctuation = source.slice(punctStart, punctEnd);
    if (/[!?]/.test(punctuation)) return true;

    while (next < source.length && /\s/.test(source[next])) next++;
    if (next < source.length && /\p{Ll}/u.test(source[next])) return false;
    if (punctuation !== '.') return true;

    // Mot qui précède le point : « M. » (Monsieur — en majuscule seulement, pour
    // ne pas avaler « 10 m. ») ou une abréviation connue. Pas d'autre initiale :
    // « le plan B. Ensuite » doit couper.
    let wordStart = punctStart;
    while (wordStart > 0 && !/\s/.test(source[wordStart - 1])) wordStart--;
    const word = source.slice(wordStart, punctStart).replace(/^[^\p{L}\p{N}]+/u, '');
    if (word === 'M') return false;
    return !ABBREVIATIONS.has(normalizeText(word));
}
