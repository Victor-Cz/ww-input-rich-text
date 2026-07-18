import { mapOffsetToPos } from '../extractors.js';
import { decreasingScore, makeCheck, notApplicable, ratioScore } from '../result.js';
import { countSyllables, escapeRegExp, normalizeText, splitWords } from '../textUtils.js';

// Catégorie "readability" — aucun mot-clé requis.
// Les checks par phrase s'appuient sur model.sentences (hors titres et code).

const MIN_SENTENCES = 5;

// Pas de check Flesch : le score Flesch est un composite de la longueur des
// phrases et de la complexité des mots, déjà testées par sentenceLength et
// complexWords — il reste disponible dans stats.fleschScore.
export function readabilityChecks(context) {
    const { model, options, wordLists } = context;
    const lang = options.lang;
    return [
        sentenceLength(model, lang),
        transitionWords(model, wordLists),
        consecutiveSentences(model),
        passiveVoice(model, lang),
        complexWords(model, lang, wordLists),
    ];
}

// Seuil Yoast par langue : une phrase est "longue" au-delà de 20 mots (fr) / 25 (en)
const LONG_SENTENCE_WORDS = { fr: 20, en: 25 };

function sentenceLength(model, lang) {
    if (model.sentences.length < MIN_SENTENCES) {
        return notApplicable('sentenceLength', 'readability', 0);
    }
    const limit = LONG_SENTENCE_WORDS[lang] || LONG_SENTENCE_WORDS.en;
    const longSentences = model.sentences.filter(sentence => sentence.words > limit);
    const percent = Math.round((longSentences.length / model.sentences.length) * 100);
    // 100 jusqu'à 25 % de phrases longues, 0 à partir de 50 %
    return makeCheck('sentenceLength', 'readability', decreasingScore(percent, 25, 50), percent, longSentences.map(toRange));
}

/**
 * Score Flesch reading ease (0-100), coefficients par langue
 * (en : Flesch original ; fr : adaptation Kandel-Moles/Kayser).
 * Retourne null si le texte est trop court pour être significatif.
 */
export function fleschReadingScore(model, lang) {
    if (!model.sentences.length) return null;
    const words = model.sentences.flatMap(sentence => splitWords(sentence.text));
    if (words.length < 50) return null;
    const syllables = words.reduce((sum, word) => sum + countSyllables(word, lang), 0);
    const wordsPerSentence = words.length / model.sentences.length;
    const syllablesPerWord = syllables / words.length;
    const raw = lang === 'fr'
        ? 207 - 1.015 * wordsPerSentence - 73.6 * syllablesPerWord
        : 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
    return Math.round(Math.min(100, Math.max(0, raw)));
}

function transitionWords(model, wordLists) {
    if (model.wordCount <= 200 || model.sentences.length < MIN_SENTENCES) {
        return notApplicable('transitionWords', 'readability', 0);
    }
    let withTransition = 0;
    const ranges = [];
    for (const sentence of model.sentences) {
        const matches = findListMatches(sentence.text, wordLists.transitionWords);
        if (!matches.length) continue;
        withTransition++;
        // Surligner les mots de transition eux-mêmes, pas la phrase entière
        for (const match of matches) {
            ranges.push({
                from: mapOffsetToPos(sentence.block, sentence.startInBlock + match.start),
                to: mapOffsetToPos(sentence.block, sentence.startInBlock + match.end),
            });
        }
    }
    const percent = Math.round((withTransition / model.sentences.length) * 100);
    // Cible : 30 % de phrases avec mot de transition
    return makeCheck('transitionWords', 'readability', ratioScore(percent, 30), percent, ranges);
}

// ≥ 3 phrases d'affilée commençant par le même mot
function consecutiveSentences(model) {
    const sentences = model.sentences;
    if (sentences.length < 3) return notApplicable('consecutiveSentences', 'readability', 0);
    const ranges = [];
    let longestRun = 0;
    let run = 1;
    for (let i = 1; i <= sentences.length; i++) {
        const previous = firstWord(sentences[i - 1]);
        const current = i < sentences.length ? firstWord(sentences[i]) : null;
        if (current && previous && current === previous) {
            run++;
            continue;
        }
        if (run >= 3) {
            for (let j = i - run; j < i; j++) ranges.push(toRange(sentences[j]));
            longestRun = Math.max(longestRun, run);
        }
        run = 1;
    }
    return makeCheck('consecutiveSentences', 'readability', ranges.length ? 0 : 100, longestRun, ranges);
}

// Heuristique voix passive : auxiliaire être/be suivi (adverbe toléré)
// d'un mot à terminaison de participe passé.
const PASSIVE = {
    fr: {
        auxiliaries: new Set([
            'suis', 'es', 'est', 'sommes', 'êtes', 'sont', 'étais', 'était',
            'étions', 'étiez', 'étaient', 'fut', 'furent', 'être', 'été',
            'sera', 'seront', 'serait', 'seraient', 'soit', 'soient',
        ]),
        adverbs: new Set(['pas', 'plus', 'jamais', 'déjà', 'souvent', 'toujours', 'bien', 'encore', 'très', 'peu']),
        isParticiple: word =>
            /(?:é|ée|és|ées)$/.test(word) || (word.length >= 4 && /(?:i|ie|is|ies|it|ite|its|ites|u|ue|us|ues)$/.test(word)),
    },
    en: {
        auxiliaries: new Set(['am', 'is', 'are', 'was', 'were', 'be', 'been', 'being']),
        adverbs: new Set(['not', 'never', 'often', 'always', 'also', 'still', 'usually', 'already']),
        isParticiple: word => (word.length >= 4 && word.endsWith('ed')) || EN_IRREGULAR_PARTICIPLES.has(word),
    },
};

const EN_IRREGULAR_PARTICIPLES = new Set([
    'done', 'made', 'given', 'taken', 'seen', 'known', 'found', 'shown',
    'written', 'built', 'sent', 'kept', 'left', 'lost', 'held', 'brought',
    'thought', 'bought', 'caught', 'taught', 'sold', 'told', 'paid', 'said',
    'read', 'set', 'put', 'chosen', 'driven', 'eaten', 'felt', 'gone',
    'grown', 'heard', 'hidden', 'hit', 'hurt', 'laid', 'led', 'meant',
    'met', 'spent', 'spoken', 'stolen', 'understood', 'won', 'worn',
    'broken', 'cut', 'drawn', 'forgotten',
]);

function passiveVoice(model, lang) {
    if (model.sentences.length < MIN_SENTENCES) {
        return notApplicable('passiveVoice', 'readability', 0);
    }
    const rules = PASSIVE[lang] || PASSIVE.en;
    const passiveSentences = model.sentences.filter(sentence => {
        const words = splitWords(sentence.text.toLowerCase());
        for (let i = 0; i < words.length - 1; i++) {
            if (!rules.auxiliaries.has(words[i])) continue;
            const next = rules.adverbs.has(words[i + 1]) ? words[i + 2] : words[i + 1];
            if (next && rules.isParticiple(next)) return true;
        }
        return false;
    });
    const percent = Math.round((passiveSentences.length / model.sentences.length) * 100);
    // 100 jusqu'à 10 % de phrases passives, 0 à partir de 25 %
    return makeCheck('passiveVoice', 'readability', decreasingScore(percent, 10, 25), percent, passiveSentences.map(toRange));
}

// Mot "complexe" : dans la liste utilisateur, ou long (≥ 8 lettres, ≥ 4 syllabes).
// Les mots capitalisés (noms propres probables) ne sont pas comptés complexes.
function complexWords(model, lang, wordLists) {
    if (model.wordCount < 100) return notApplicable('complexWords', 'readability', 0);
    const customList = new Set((wordLists.complexWords || []).map(word => normalizeText(word)));
    const ranges = [];
    let total = 0;
    let complex = 0;
    for (const block of model.blocks) {
        if (block.isCode) continue;
        const regex = /[\p{L}\p{N}''-]+/gu;
        for (let match = regex.exec(block.text); match !== null; match = regex.exec(block.text)) {
            const word = match[0];
            total++;
            if (/^\p{Lu}/u.test(word)) continue;
            const normalized = normalizeText(word);
            const isComplex = customList.has(normalized)
                || (normalized.length >= 8 && countSyllables(word, lang) >= 4);
            if (!isComplex) continue;
            complex++;
            ranges.push({
                from: mapOffsetToPos(block, match.index),
                to: mapOffsetToPos(block, match.index + word.length),
            });
        }
    }
    if (!total) return notApplicable('complexWords', 'readability', 0);
    const percent = Math.round((complex / total) * 100);
    // 100 jusqu'à 10 % de mots complexes, 0 à partir de 25 %
    return makeCheck('complexWords', 'readability', decreasingScore(percent, 10, 25), percent, ranges);
}

function toRange(sentence) {
    return { from: sentence.from, to: sentence.to };
}

function firstWord(sentence) {
    return splitWords(normalizeText(sentence.text))[0] || null;
}

/**
 * Toutes les occurrences d'un des mots/groupes de la liste dans un texte,
 * bornées par des non-lettres. Retourne des offsets [start, end) dans le texte
 * d'origine. Tolère les variantes d'apostrophe (' vs ') et d'espace.
 */
function findListMatches(text, words) {
    const cleaned = (words || [])
        .map(word =>
            escapeRegExp(normalizeText(word).trim())
                .replace(/['']/g, `[''']`)
                .replace(/ +/g, `[\\s\\u00A0]+`)
        )
        .filter(Boolean);
    if (!cleaned.length) return [];
    const regex = new RegExp(`(^|[^\\p{L}])(${cleaned.join('|')})(?=[^\\p{L}]|$)`, 'giu');
    const normalized = normalizeText(text);
    const matches = [];
    for (let match = regex.exec(normalized); match !== null; match = regex.exec(normalized)) {
        const start = match.index + match[1].length;
        matches.push({ start, end: start + match[2].length });
        if (regex.lastIndex === match.index) regex.lastIndex++;
    }
    return matches;
}
