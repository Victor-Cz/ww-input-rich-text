import { findKeywordInBlock, findKeywordInModel, findPhrasesInBlock, mergeRanges } from '../extractors.js';
import { decreasingScore, makeCheck, notApplicable, ratioScore } from '../result.js';
import { notePassage } from '../passages.js';
import { contentStems, contentWords, findListMatches, findPhraseMatches, hasKeyword } from '../textUtils.js';

// Catégorie "keyword" — nécessite `seoKeyword`.
// Partout, « le mot-clé » = le principal OU un de ses synonymes (`context.phrases`),
// avec tolérance casse / accents / pluriels simples (voir textUtils), trouvé
// selon le mode de correspondance réglé (findKeywordMatches).

export function keywordChecks(context) {
    // `keywordMatches` : calculées une fois dans analyzeSeo (partagées avec stats)
    const { model, phrases, wordLists, matchOptions, keywordMatches } = context;
    const secondaryKeywordsCheck = secondaryKeywords(
        model,
        context.options.secondaryKeywords,
        context.secondaryMatchOptions
    );
    const questionCoverageCheck = questionCoverage(model, context.options.questions, wordLists);
    if (!phrases.length) {
        return [
            ...['keyphraseLength', 'keywordInIntroduction', 'keywordDensity', 'keywordDistribution']
                .map(id => notApplicable(id, 'keyword')),
            secondaryKeywordsCheck,
            ...['definition', 'entityPerSection'].map(id => notApplicable(id, 'keyword')),
            questionCoverageCheck,
        ];
    }

    return [
        keyphraseLength(context.options.keyword, wordLists.stopWords),
        keywordInIntroduction(model, phrases, wordLists.stopWords, matchOptions),
        keywordDensity(model, keywordMatches),
        keywordDistribution(model, keywordMatches),
        secondaryKeywordsCheck,
        definition(model, phrases, wordLists, matchOptions),
        entityPerSection(context),
        questionCoverageCheck,
    ];
}

// Définition du sujet en tête : une phrase des ~150 premiers mots (hors titres)
// contient le mot-clé ET un verbe de définition (« est un », « désigne »,
// « refers to »…) → 100 ; mot-clé sans définition → 40 ; absent → 0.
// value : 'defined' | 'keywordOnly' | 'missing'
function definition(model, phrases, wordLists, matchOptions) {
    let words = 0;
    let keywordSentence = null;
    for (const sentence of model.sentences) {
        if (words >= 150) break;
        words += sentence.words;
        if (!hasKeyword(sentence.text, phrases, matchOptions)) continue;
        const range = { from: sentence.from, to: sentence.to };
        if (findListMatches(sentence.text, wordLists.definitionVerbs).length) {
            return makeCheck('definition', 'keyword', 100, 'defined', [range]);
        }
        if (!keywordSentence) keywordSentence = range;
    }
    if (keywordSentence) {
        const check = makeCheck('definition', 'keyword', 40, 'keywordOnly', [keywordSentence]);
        check.messageKey = 'keywordOnly';
        return check;
    }
    return makeCheck('definition', 'keyword', 0, 'missing');
}

// Sujet nommé dans chaque partie : une partie (H2 et ses sous-sections) extraite
// seule doit dire de quoi elle parle. Nommé = mot-clé trouvé, ou au moins la
// moitié de ses mots de contenu (« le logiciel » pour « logiciel de paie »).
// Cible 80 % des parties — proportionnel. na si < 2 H2.
// value : % de parties qui nomment le sujet ; H2 des parties muettes surlignés.
function entityPerSection(context) {
    const { model, phrases, matchOptions, wordLists } = context;
    const groups = [];
    for (const section of model.sections) {
        if (!section.heading) continue;
        if (section.heading.level === 2) groups.push({ heading: section.heading, sections: [section] });
        else if (groups.length) groups[groups.length - 1].sections.push(section);
    }
    if (groups.length < 2) return notApplicable('entityPerSection', 'keyword', 0);

    const keywordStems = phrases.map(phrase => [...contentStems(phrase, wordLists.stopWords)]);
    const namesSubject = section => {
        const blocks = [section.heading, ...section.blocks];
        if (blocks.some(block => findKeywordInBlock(block, phrases, matchOptions).count)) return true;
        const stems = contentStems(blocks.map(block => block.text).join('\n'), wordLists.stopWords);
        return keywordStems.some(list => list.length
            && list.filter(stem => stems.has(stem)).length >= Math.ceil(list.length / 2));
    };

    const muted = [];
    for (const group of groups) {
        let named = false;
        for (const section of group.sections) {
            const sectionNamed = namesSubject(section);
            notePassage(context, section, 'entityPerSection', sectionNamed ? 100 : 0);
            named = named || sectionNamed;
        }
        if (!named) muted.push(group.heading);
    }
    const percent = Math.round(((groups.length - muted.length) / groups.length) * 100);
    return makeCheck('entityPerSection', 'keyword', ratioScore(percent, 80), percent,
        muted.map(heading => ({ from: heading.from, to: heading.to })));
}

// Couverture des questions cibles (`geoQuestions`) : une question est couverte
// si une section (titre + contenu) en réunit au moins 75 % des mots de contenu
// (racines : casse, accents, flexions tolérés ; mots vides et interrogatifs
// ignorés). Score = % de questions couvertes. na sans questions.
// value : % couvertes · `terms` : détail par question (stats.uncoveredQuestions).
function questionCoverage(model, questions, wordLists) {
    if (!questions.length) {
        const check = notApplicable('questionCoverage', 'keyword');
        check.terms = [];
        return check;
    }
    const ignored = [...wordLists.stopWords, ...wordLists.questionWords];
    const sectionStems = model.sections.map(section =>
        contentStems([section.heading ? section.heading.text : '', ...section.blocks.map(block => block.text)].join('\n'), ignored)
    );
    const terms = questions.map(question => {
        const stems = [...contentStems(question, ignored)];
        if (!stems.length) return { question, covered: false };
        const needed = Math.ceil(stems.length * 0.75);
        const covered = sectionStems.some(set => stems.filter(stem => set.has(stem)).length >= needed);
        return { question, covered };
    });
    const percent = Math.round((terms.filter(term => term.covered).length / questions.length) * 100);
    const check = makeCheck('questionCoverage', 'keyword', percent, percent);
    check.terms = terms;
    return check;
}

// Mots-clés secondaires : % de secondaires apparaissant dans le texte.
// Cible ≥ 70 %, proportionnel en dessous. na sans secondaires fournis.
// value : % des secondaires présents ; occurrences surlignables.
// `terms` : détail terme par terme (exposé dans seo.keywords.secondary).
function secondaryKeywords(model, secondaries, secondaryMatchOptions) {
    if (!secondaries.length) {
        const check = notApplicable('secondaryKeywords', 'keyword');
        check.terms = [];
        return check;
    }
    const terms = secondaries.map(term => {
        const { count, ranges } = findKeywordInModel(model, [term], secondaryMatchOptions);
        return { term, count, found: count > 0, ranges };
    });
    const foundCount = terms.filter(term => term.found).length;
    const percent = Math.round((foundCount / secondaries.length) * 100);
    const ranges = mergeRanges(terms.flatMap(term => term.ranges));
    const check = makeCheck('secondaryKeywords', 'keyword', ratioScore(percent, 70), percent, ranges);
    check.terms = terms;
    return check;
}

// 1-4 mots significatifs = 100, puis -15 par mot au-delà.
// 0 mot significatif (que des mots vides) : avertissement dédié, hors score.
function keyphraseLength(keyword, stopWords) {
    const words = contentWords(keyword, stopWords);
    if (!words.length) {
        const check = notApplicable('keyphraseLength', 'keyword', 0);
        check.status = 'warning';
        check.messageKey = 'onlyStopwords';
        return check;
    }
    const score = words.length <= 4 ? 100 : 100 - (words.length - 4) * 15;
    return makeCheck('keyphraseLength', 'keyword', score, words.length);
}

// Mot-clé trouvé dans le 1er paragraphe → 100 ; sinon proportionnel aux
// mots significatifs présents (tous, mais pas réunis → 60).
// value : 'full' | 'scattered' | 'missing'
function keywordInIntroduction(model, phrases, stopWords, matchOptions) {
    const intro = model.paragraphs.find(paragraph => paragraph.words > 0);
    if (!intro) return notApplicable('keywordInIntroduction', 'keyword');

    const fullMatch = findKeywordInBlock(intro, phrases, matchOptions);
    if (fullMatch.count) {
        return makeCheck('keywordInIntroduction', 'keyword', 100, 'full', fullMatch.ranges);
    }

    const words = contentWords(phrases[0], stopWords);
    const found = words.filter(word => findPhraseMatches(intro.text, word, matchOptions).length > 0);
    if (found.length) {
        const wordRanges = findPhrasesInBlock(intro, found, matchOptions);
        const score = (found.length / words.length) * 60;
        return makeCheck('keywordInIntroduction', 'keyword', score, 'scattered', wordRanges);
    }
    return makeCheck('keywordInIntroduction', 'keyword', 0, 'missing');
}

// Zone optimale 0,5-3 % → 100 ; proportionnel en dessous (0,4 % → 80) ;
// au-delà, décroît jusqu'à 0 à 5 % (keyword stuffing).
// value : densité en % (occurrences via matchCount / stats).
function keywordDensity(model, keywordMatches) {
    const words = model.wordCount;
    if (!words) return notApplicable('keywordDensity', 'keyword', 0);
    const count = keywordMatches.count;
    const density = Math.round((count / words) * 10000) / 100;

    let score;
    if (words < 100) {
        // Texte court : la densité en % n'est pas significative, on compte les occurrences
        if (count === 0) score = 0;
        else if (count <= 2) score = 100;
        else score = Math.max(0, 100 - (count - 2) * 50);
    } else if (density < 0.5) score = ratioScore(density, 0.5);
    else if (density <= 3) score = 100;
    else score = decreasingScore(density, 3, 5);

    const check = makeCheck('keywordDensity', 'keyword', score, density, keywordMatches.ranges);
    check.matchCount = count;
    return check;
}

// Yoast Premium (simplifié) : présence du mot-clé dans les 4 quarts du texte
function keywordDistribution(model, keywordMatches) {
    const { count, ranges } = keywordMatches;
    if (model.sentences.length < 15 || count < 2) {
        return notApplicable('keywordDistribution', 'keyword', count);
    }
    const textBlocks = model.blocks.filter(block => !block.isCode);
    const start = textBlocks[0].from;
    const end = textBlocks[textBlocks.length - 1].to;
    const span = Math.max(1, end - start);

    const quarters = new Set(
        ranges.map(range => Math.min(3, Math.floor(((range.from - start) / span) * 4)))
    );
    // Présence dans 3 des 4 quarts du texte = bien réparti
    const score = ratioScore(quarters.size, 3);
    const check = makeCheck('keywordDistribution', 'keyword', score, quarters.size, ranges);
    check.matchCount = count;
    return check;
}
