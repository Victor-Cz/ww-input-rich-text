# Analyse SEO

Extension activable du composant rich text : calcule en temps réel un score SEO
global et des scores détaillés sur le contenu de l'éditeur, sans aucun élément
visuel. La sortie est exposée dans une variable pour construire librement l'UI
côté WeWeb.

## Activation

Settings → **SEO analysis** (`enableSeoAnalysis`, off par défaut).
Désactivée : aucune analyse, variable `seo` à `null`, module non chargé
(import dynamique), propriétés masquées.

L'analyse tourne automatiquement : débouncée (~500 ms) à chaque modification du
contenu, immédiate quand une entrée SEO change.

## Entrées (propriétés bindables)

| Propriété | Type | Rôle |
| --- | --- | --- |
| `seoKeyword` | Text | Mot-clé principal (un seul) |
| `seoKeywordSynonyms` | Array | Variantes proches, équivalentes au principal dans tous les checks |
| `seoSecondaryKeywords` | Array | Mots-clés secondaires (sujets connexes), scorés à part |
| `seoMetaTitle` / `seoMetaDescription` | Text | Metas de la page, scorées si fournies (catégorie `meta`) |
| `seoSiteDomain` | Text | Domaine ou URL complète du site (`https://www.monsite.com/page` accepté) — distingue liens internes/externes ; les URL relatives sont internes |
| `seoLang` | Select | `en` (défaut) ou `fr` — langue d'analyse (listes de mots, seuils, heuristiques) |
| `seoUiLang` | Select | Langue des textes exposés (titles, descriptions, messages) — suit `seoLang` par défaut |
| `seoExpectH1` | OnOff | Le H1 est-il écrit dans l'éditeur (off si la page le fournit) |
| `seoHighlightColor` | Color | Couleur par défaut du surlignage (`highlightSeoCheck`) ; l'argument `Color` de l'action la surcharge par appel |
| `seoWordLists` | Object (binding) | Surcharge des listes : `{ stopWords, genericAnchors, powerWords, sentimentWords, transitionWords, complexWords }` |

Les arrays acceptent aussi une chaîne séparée par des virgules. Le matching des
mots-clés tolère casse, accents et pluriels simples (s/x/es).

## Scoring

- **Score par check : 0-100 continu**, proportionnel à la distance à l'objectif
  (exposé en clair dans la clé `objective`). Exemples : 250 mots pour une cible
  de 300 → 83 ; densité 0,4 % pour une zone optimale 0,5-3 % → 80 ; 1 image sans
  alt sur 2 → 50. Les checks binaires par nature (`singleH1`, `competingAnchor`,
  `centeredContent`…) donnent 0 ou 100.
- **Statut dérivé du score** : `good` ≥ 80 · `warning` 40-79 · `bad` < 40 ·
  `na` = non applicable (exclu du global).
- **Score global et par catégorie : moyenne pondérée** par l'importance du check
  (`weight`) : critique = 4 (`textLength`, `singleH1`, `keywordInIntroduction`,
  `keywordDensity`, `metaTitleKeyword`), standard = 2, mineur = 1.
- **Grade** : `green` > 80 · `orange` 51-80 · `red` ≤ 50 — mais un check
  **critique en échec plafonne le grade à `orange`** (global et catégorie),
  quel que soit le score ; ses ids sont listés dans `criticalIssues`.

## Variable exposée `seo`

```js
{
  score: 78,             // score global 0-100 (moyenne pondérée, checks na exclus)
  grade: 'orange',       // green (> 80) | orange (51-80) | red (≤ 50), plafonné si criticalIssues
  criticalIssues: ['singleH1'],   // checks critiques (weight 4) en échec
  scores: {              // sous-score 0-100 par catégorie (null si non applicable)
    structure, headings, readability, links, images, keyword, secondary, meta
  },
  categories: [          // les mêmes, avec labels localisés et grade plafonné
    { id: 'structure', name: 'Structure', description: '…', score: 77, grade: 'orange' },
    // ...
  ],
  checks: [              // un objet par check
    {
      id: 'keywordDensity',
      title: 'Densité du mot-clé',       // localisé (seoUiLang)
      description: 'Vérifie que…',       // localisé
      objective: 'Densité entre 0,5 et 3 %',  // la cible à atteindre, en clair (localisé)
      category: 'keyword',
      status: 'good',        // good | warning | bad | na
      score: 100,            // 0-100 continu, null si na
      weight: 4,             // importance dans la moyenne : 4 critique · 2 standard · 1 mineur
      value: 1.2,            // valeur mesurée — toujours un scalaire (nombre, chaîne ou booléen)
      matchCount: 8,         // nb d'occurrences surlignables dans l'éditeur
      clickable: true,       // l'action highlightSeoCheck a quelque chose à montrer
      message: 'La densité du mot-clé est bonne (1.2 %).',
    },
    // ...
  ],
  stats: {
    wordCount, charCount, sentenceCount, paragraphCount,
    headings: { h1, h2, h3, h4, h5, h6 }, lists, tables,
    images, imagesWithoutAlt, internalLinks, externalLinks,
    keywordOccurrences, keywordDensity, fleschScore, readingTimeMinutes
  }
}
```

## Check ids

- **structure** : `textLength`, `singleH1`, `paragraphLength`,
  `structuredContent`, `centeredContent`
- **headings** : `headingHierarchy`, `subheadingDistribution`, `keywordInH1`,
  `keywordInSubheadings`, `secondaryInSubheadings` (l'unicité du H1 reste en
  structure ; les checks mot-clé sont na sans mot-clé)
- **readability** : `sentenceLength`, `transitionWords`,
  `consecutiveSentences`, `passiveVoice`, `complexWords`
  (le score Flesch, composite de `sentenceLength` + `complexWords`, est
  disponible dans `stats.fleschScore` mais n'est pas un check)
- **links** : `outboundLinks`, `internalLinks`, `genericAnchors`, `emptyLinks`,
  `competingAnchor` (ancre = mot-clé ; na sans mot-clé)
- **images** : `imagePresence` (présence + quantité vs longueur du texte),
  `imageAlt`, `keywordInImageAlt` (na sans mot-clé)
- **keyword** : `keyphraseLength`, `keywordInIntroduction`, `keywordDensity`,
  `keywordDistribution`
- **secondary** : `secondaryPresence`, `secondaryDensity`
- **meta** : `metaTitleKeyword` (présence + position), `metaTitleLength`,
  `metaTitleAttractiveness`, `metaDescriptionLength`, `metaDescriptionKeyword`

## Actions

- **Highlight SEO check** (`highlightSeoCheck(checkId, color?)`) : surligne dans
  l'éditeur toutes les occurrences liées au check (mots, phrases, blocs, images)
  et scrolle vers la première. Retourne `false` si le check n'a rien à montrer —
  la clé `clickable` du check l'indique à l'avance (pour n'afficher l'« œil »
  que sur les checks concernés).
  Le surlignage est **persistant** : il suit les frappes en direct, puis ses
  plages sont **recalculées à chaque ré-analyse** — les occurrences corrigées
  disparaissent, les nouvelles apparaissent — jusqu'à `clearSeoHighlight` ou un
  highlight sur un autre check.
  Couleur : argument `Color` de l'action > propriété `seoHighlightColor` >
  défaut de l'extension (jaune translucide).
- **Clear SEO highlight** (`clearSeoHighlight()`) : désactive le mode et efface
  le surlignage.

## Trigger event

- **On SEO score change** (`seo:change`) : `{ score, grade, scores }` — émis à la
  première analyse puis à chaque changement de score ou de grade.

## Architecture

- `src/seo/` : analyseur pur (aucune dépendance), chargé en import dynamique —
  `analyzer.js` (orchestrateur), `extractors.js` (une traversée du doc
  ProseMirror → modèle avec positions), `checks/*.js` (un module par catégorie),
  `scoring.js`, `messages.js` (fr/en), `wordlists.js`, `textUtils.js`.
- `src/extensions/SeoHighlighter.js` : extension Tiptap de décorations
  multi-plages, inerte hors surlignage.
- Intégration unique dans `wwElement.vue` : variable `seo`, debounce, actions.

Les seuils suivent les grilles Yoast SEO (scoring officiel) et Rank Math.
