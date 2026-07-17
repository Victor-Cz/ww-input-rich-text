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
| `seoLang` | Select | `en` (défaut) ou `fr` — listes de mots et messages |
| `seoExpectH1` | OnOff | Le H1 est-il écrit dans l'éditeur (off si la page le fournit) |
| `seoWordLists` | Object (binding) | Surcharge des listes : `{ stopWords, genericAnchors, powerWords, sentimentWords }` |

Les arrays acceptent aussi une chaîne séparée par des virgules. Le matching des
mots-clés tolère casse, accents et pluriels simples (s/x/es).

## Variable exposée `seo`

```js
{
  score: 78,          // score global 0-100 (formule Yoast, checks non applicables exclus)
  grade: 'orange',    // green (> 80) | orange (51-80) | red (≤ 50)
  scores: {           // sous-score 0-100 par catégorie (null si non applicable)
    structure, links, images, keyword, secondary,
    metaTitle, metaDescription, slug
  },
  checks: [           // un objet par check
    {
      id: 'keywordDensity',
      category: 'keyword',
      status: 'good',        // good | warning | bad | na
      score: 100,            // 0-100, null si na
      value: { occurrences: 8, density: 1.2 },  // valeur mesurée (forme propre à chaque check)
      matchCount: 8,         // nb d'occurrences surlignables dans l'éditeur
      message: 'La densité du mot-clé est bonne (8 occurrence(s)).',
    },
    // ...
  ],
  stats: {
    wordCount, charCount, sentenceCount, paragraphCount,
    headings: { h1, h2, h3, h4, h5, h6 }, lists, tables,
    images, imagesWithoutAlt, internalLinks, externalLinks,
    keywordOccurrences, keywordDensity, readingTimeMinutes
  }
}
```

## Check ids

- **structure** : `textLength`, `singleH1`, `headingHierarchy`,
  `subheadingDistribution`, `paragraphLength`, `structuredContent`,
  `centeredContent`
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
  et scrolle vers la première. Retourne `false` si le check n'a pas de portée
  textuelle (`matchCount: 0`). Le surlignage suit les éditions puis est effacé à
  la prochaine ré-analyse.
- **Clear SEO highlight** (`clearSeoHighlight()`) : efface le surlignage.

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
