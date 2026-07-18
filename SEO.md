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
| `seoMetaTitle` / `seoMetaDescription` | Text | Metas de la page, scorées si fournies |
| `seoSlug` | Text | Slug de la page, scoré si fourni |
| `seoSiteDomain` | Text | Domaine du site — distingue liens internes/externes (les URL relatives sont internes) |
| `seoLang` | Select | `en` (défaut) ou `fr` — langue d'analyse (listes de mots, seuils, heuristiques) |
| `seoUiLang` | Select | Langue des textes exposés (titles, descriptions, messages) — suit `seoLang` par défaut |
| `seoExpectH1` | OnOff | Le H1 est-il écrit dans l'éditeur (off si la page le fournit) |
| `seoWordLists` | Object (binding) | Surcharge des listes : `{ stopWords, genericAnchors, powerWords, sentimentWords, transitionWords, complexWords }` |

Les arrays acceptent aussi une chaîne séparée par des virgules. Le matching des
mots-clés tolère casse, accents et pluriels simples (s/x/es).

## Scoring

- **Score par check : 0-100 continu**, proportionnel à la distance à l'objectif.
  Exemples : 250 mots pour une cible de 300 → 83 ; densité 0,4 % pour une zone
  optimale 0,5-3 % → 80 ; 1 image sans alt sur 2 → 50. Les checks binaires par
  nature (`singleH1`, `competingAnchor`, `centeredContent`…) donnent 0 ou 100.
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
    structure, readability, links, images, keyword, secondary,
    metaTitle, metaDescription, slug
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
      category: 'keyword',
      status: 'good',        // good | warning | bad | na
      score: 100,            // 0-100 continu, null si na
      weight: 4,             // importance dans la moyenne : 4 critique · 2 standard · 1 mineur
      value: { occurrences: 8, density: 1.2 },  // valeur mesurée (forme propre à chaque check)
      matchCount: 8,         // nb d'occurrences surlignables dans l'éditeur
      clickable: true,       // l'action highlightSeoCheck a quelque chose à montrer
      message: 'La densité du mot-clé est bonne (8 occurrence(s)).',
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

- **structure** : `textLength`, `singleH1`, `headingHierarchy`,
  `subheadingDistribution`, `paragraphLength`, `structuredContent`,
  `centeredContent`
- **readability** : `sentenceLength`, `fleschReadingEase`, `transitionWords`,
  `consecutiveSentences`, `passiveVoice`, `complexWords`
- **links** : `outboundLinks`, `internalLinks`, `genericAnchors`, `emptyLinks`
- **images** : `imagePresence`, `imageAlt`, `imageRatio`
- **keyword** : `keyphraseLength`, `keywordInIntroduction`, `keywordDensity`,
  `keywordInSubheadings`, `keywordDistribution`, `keywordInImageAlt`,
  `competingAnchor`
- **secondary** : `secondaryPresence`, `secondaryInSubheadings`,
  `secondaryDensity`
- **metaTitle** : `metaTitleKeyword`, `metaTitleKeywordPosition`,
  `metaTitleLength`, `metaTitleAttractiveness`
- **metaDescription** : `metaDescriptionLength`, `metaDescriptionKeyword`
- **slug** : `slugKeyword`, `slugLength`, `slugClean`

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
