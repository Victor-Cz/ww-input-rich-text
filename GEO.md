# Analyse GEO / AEO

Pendant de l'[analyse SEO](SEO.md) : un **score de citabilité** — la capacité du
contenu à être retrouvé, extrait et cité par un moteur génératif (ChatGPT
Search, Perplexity, Claude, Google AI Overviews / AI Mode). Le GEO n'est pas un
module à part : il **étend le catalogue de checks SEO**, dans les mêmes
catégories, et produit un second score à partir de ce catalogue commun.

Tous les checks sont des **calculs déterministes sur le texte** (comptages,
motifs, listes de mots), instantanés, sans appel externe ni LLM. Les seuils
sont des hypothèses de départ à calibrer (voir [Calibration](#calibration)).

## GEO vs AEO

- **AEO** (Answer Engine Optimization) : être *la* réponse extraite — featured
  snippets, « Autres questions posées », assistants vocaux.
- **GEO** (Generative Engine Optimization) : être *cité* dans une réponse
  synthétisée à partir de plusieurs sources.

L'AEO est un sous-ensemble du GEO : **un seul score `geo`**.

## Ce que le score mesure — et ne mesure pas

| Niveau | Nature | Où |
| --- | --- | --- |
| Citabilité du contenu | on-page, déterministe, temps réel | **ce module** |
| Couverture sémantique, gain d'information | LLM / embeddings, asynchrone | phase 2 |
| Visibilité réelle (part de citations) | interrogation des moteurs | hors composant (ex. endpoints LLM de DataForSEO) |

Le score n'est **pas** une probabilité d'être cité : aucun moteur ne publie ses
critères, et le guide de Google sur l'IA dit qu'aucune réécriture « pour l'IA »
n'est nécessaire. La base empirique est le papier *GEO: Generative Engine
Optimization* (Aggarwal et al., KDD 2024 — statistiques, citations et sources :
jusqu'à +40 % de visibilité ; bourrage de mots-clés : inefficace) et la
mécanique connue des moteurs : la requête est éclatée en sous-questions, des
**passages** (pas des pages) sont récupérés, reclassés, puis cités.

## Principe directeur : ne rien récompenser qui s'invente

Le score sera lu par des humains **et visé par le générateur Brispr**. Un LLM
qui optimise un score fabrique ce que le score récompense. Donc :

- un chiffre **non sourcé** coûte plus cher qu'une absence de chiffre
  (`sourcedFacts` critique, `factDensity` standard) ;
- aucun marqueur déclaratif trivial à insérer (« nous avons testé ») n'entre
  dans le score ;
- les checks de **forme** (`answerFirst`, `subheadingDistribution`,
  `questionHeadings`) ne sont jamais critiques : ce sont des conseils de
  lisibilité, pas un moule.

## Activation

Settings → **GEO analysis** (`enableGeoAnalysis`, off par défaut). Indépendante
de l'analyse SEO : les deux partagent une seule analyse (débouncée ~500 ms,
import dynamique), chaque variable vaut `null` si son score est désactivé.

## Entrées

Partagées avec le SEO (visibles dès que l'une des deux analyses est active) :
`seoKeyword`, `seoKeywordSynonyms`, `seoKeywordMatching`, `seoLang`,
`seoUiLang`, `seoHighlightColor`, `seoWordLists` (mots vides), `seoSiteDomain`.

| Propriété | Type | Rôle |
| --- | --- | --- |
| `geoQuestions` | Array | Questions cibles (PAA, fan-out, prompts suivis). Côté Brispr, dérivables du plan de recherche et de la lecture des SERP |
| `geoEvergreen` | OnOff | Contenu intemporel : `freshness` na |
| `geoWordLists` | Object (binding) | Surcharge des listes GEO : `{ attributionWords, vagueWords, anaphoraOpeners, backReferences, genericHeadings, procedureWords, comparisonWords, definitionVerbs, questionWords, knownAcronyms, experienceMarkers, takeawayMarkers }` |

## Catalogue commun

Chaque check déclare un poids **par score** dans `CHECK_WEIGHTS`
([scoring.js](src/seo/scoring.js)) : 4 = critique · 2 = standard · 1 = mineur ·
0 = ne compte pas pour ce score (et n'y est pas exposé). Chaque score est la
moyenne pondérée de ses checks, plafonnée à `orange` par ses propres checks
critiques. Une catégorie sans check pour un score n'apparaît pas dans ce score
(`images` et `meta` sont absentes de `geo`).

Un check a **un seul score** : un check GEO n'a été fusionné dans un check SEO
que si la mesure et l'objectif étaient les mêmes.

### Données requises

| Données | Checks |
| --- | --- |
| Le texte seul | `answerFirst`, `subheadingDistribution`, `structuredContent`, `questionHeadings`, `descriptiveHeadings`, `factDensity`, `sourcedFacts`, `quotations`, `entityDensity` |
| + le mot-clé (na sans) | `definition`, `entityPerSection` ; `keyTakeaways` s'en sert s'il existe |
| + les listes de mots | `selfContained`, `vagueLanguage`, `acronymsDefined`, et le repérage d'attributions / procédures / comparaisons |
| + `geoQuestions` (na sans) | `questionCoverage` — critique : sans questions, le score perd son check le plus important |
| + `geoEvergreen` (facultatif) | `freshness` |

### Checks SEO existants modifiés

| Id | Changement | seo | geo |
| --- | --- | --- | --- |
| `subheadingDistribution` | Longueur des sections : 100 entre 80 et 300 mots, décroît jusqu'à 0 à 600, proportionnel sous 80 (introduction exemptée du plancher). Score = **moyenne des sections** (au lieu du pire passage) | 2 | 2 |
| `structuredContent` | Format adapté : titres procéduraux (« étapes », « how to »…) → liste numérotée ; comparatif (« vs », « comparatif »…) → tableau ; sans signal, ≥ 1 liste ou tableau | 1 | 2 |
| `outboundLinks` | Inchangé, compte aussi pour le GEO | 2 | 1 |

### Nouveaux checks

| Catégorie | Id | Heuristique | seo | geo |
| --- | --- | --- | --- | --- |
| structure | `answerFirst` | 1er bloc après chaque sous-titre : paragraphe de 30-80 mots, ou liste / tableau (éventuellement introduit par une phrase courte). Moyenne des sections ; na si < 2 sections | 1 | 2 |
| structure | `selfContained` | Sections ouvertes par un pronom de reprise (Cela, Ce dernier, Ils, These, The latter…) ou contenant un renvoi (« ci-dessus », « as mentioned above »). « Ce + nom », « Il », « This », « It » seuls exclus (faux positifs). Score = % de sections autonomes | 0 | 2 |
| structure | `keyTakeaways` | Bloc « En bref / À retenir / Key takeaways » avant le 1er sous-titre (ou comme 1er sous-titre) → 100 ; sinon intro ≤ 100 mots (décroît jusqu'à 0 à 250), plafonnée à 60 sans le mot-clé. na si < 300 mots | 0 | 1 |
| headings | `questionHeadings` | % de H2/H3 interrogatifs (« ? » ou mot interrogatif en tête). Cible 30 %. na si < 3 sous-titres | 1 | 2 |
| headings | `descriptiveHeadings` | Sous-titres génériques (Introduction, Avantages…) ou < 2 mots de contenu (« FAQ » toléré). Score = % de titres descriptifs | 1 | 2 |
| readability | `vagueLanguage` | % de phrases à formule floue. 100 jusqu'à 5 %, 0 à 20 % | 1 | 2 |
| readability | `acronymsDefined` | Sigles (2-6 majuscules/chiffres, ≥ 2 lettres) développés à leur 1re occurrence hors titres — parenthèse adjacente. Liste blanche `knownAcronyms` | 0 | 1 |
| keyword | `definition` | Une phrase des ~150 premiers mots contient le mot-clé ET un verbe de définition → 100 ; mot-clé sans définition → 40 | 1 | 2 |
| keyword | `entityPerSection` | % de parties (H2 + sous-sections) qui nomment le sujet : mot-clé, ou au moins la moitié de ses mots de contenu. Cible 80 %. na si < 2 H2 | 0 | 2 |
| keyword | `questionCoverage` | Une question est couverte si une section (titre + contenu) réunit ≥ 75 % de ses mots de contenu (racines ; mots vides et interrogatifs ignorés). Score = % couvertes | 0 | **4** |
| credibility | `sourcedFacts` | % de phrases chiffrées dont la phrase ou la suivante porte un lien externe ou une attribution | 2 | **4** |
| credibility | `factDensity` | Faits chiffrés (nombre + unité / % / devise / dénombrement, ratio « 1 sur 3 » ; années seules exclues). Cible 1 pour 150 mots. na si < 150 mots | 0 | 2 |
| credibility | `quotations` | Bloc de citation, ou ≥ 8 mots entre guillemets dans un bloc qui nomme sa source. na si < 600 mots | 0 | 1 |
| credibility | `freshness` | Part des années citées ≥ année courante − 2. Cible 50 %. na sans année ou si `geoEvergreen` | 0 | 1 |
| credibility | `entityDensity` | Mots à majuscule hors début de phrase, pour 100 mots. Cible 1. Proxy bruité, d'où le poids minimal | 0 | 1 |

**Retiré du score — `firstHand`** : les marqueurs « nous avons testé » sont
triviaux à insérer, donc de la fausse expérience garantie dans un contenu
généré. Leur nombre est exposé à titre indicatif (`geo.stats.experienceMarkers`).
À réintroduire quand le générateur pourra rattacher le passage à une source
vérifiée.

## Variable exposée `geo`

Même forme que `seo` (voir [SEO.md](SEO.md)), plus `passages` :

```js
{
  score, grade, criticalIssues, highlighting,
  scores: { structure, headings, readability, links, keyword, credibility },
  categories: [ /* id, name, description, score, grade */ ],
  checks: [ /* checks de poids GEO > 0 ; weight = poids GEO */ ],
  stats: {
    sections, questionHeadingsPercent, facts, unsourcedFactSentences,
    quotations, blockquotes, orderedLists, tables,
    questionsCovered, uncoveredQuestions,   // questions cibles non couvertes, en clair
    experienceMarkers,                      // indicatif, hors score
  },
  // Le contenu découpé comme un moteur le verrait : l'introduction puis une
  // section par sous-titre H2-H6. score = moyenne des checks évalués section
  // par section (answerFirst, subheadingDistribution, selfContained,
  // entityPerSection) ; issues = ceux sous 80.
  passages: [
    { id: 'passage:2', heading: 'Avantages', level: 2, words: 34, score: 36,
      issues: ['subheadingDistribution', 'selfContained', 'entityPerSection'] },
  ],
}
```

## Actions et trigger

- **Highlight SEO/GEO check** (`highlightSeoCheck(checkId, color?)`) accepte
  les ids des checks GEO et des passages (`geo.passages[].id` : surligne la
  section entière). **Clear SEO/GEO highlight** inchangé. `geo.highlighting`
  suit le même état que `seo.highlighting`.
- **On GEO score change** (`geo:change`) : `{ score, grade, scores }`.

## Hors du module

Prérequis du site, à vérifier une fois côté WeWeb, pas à scorer :

- les robots de **recherche IA** (OAI-SearchBot, Claude-SearchBot,
  PerplexityBot, Googlebot) ne sont pas bloqués — GPTBot, ClaudeBot et
  Google-Extended servent à l'entraînement et n'affectent pas les citations ;
- le contenu est dans le **HTML servi** (pré-rendu) : la plupart des robots IA
  n'exécutent pas le JS ;
- balisage `Article` / `BlogPosting` (auteur, `datePublished`, `dateModified`)
  au niveau de la page. Pas de FAQPage : les rich results FAQ ne sont plus
  affichés depuis mai 2026 ;
- le SEO reste un prérequis : les AI Overviews citent surtout des pages déjà
  bien classées.

Volontairement non mesurés : densité de mot-clé (le bourrage ne paie pas),
longueur totale (un moteur cite un passage), lisibilité (déjà dans le SEO).

## Architecture

- Catalogue commun dans `src/seo/` : nouveaux checks dans les modules de
  catégorie existants + `checks/credibility.js` ; poids par score dans
  `scoring.js` ; listes GEO dans `wordlists.js` (`getGeoWordLists`) ;
  `passages.js` ; textes dans `i18n/{fr,en}.js`.
- `extractors.js` : chaque bloc expose son `container` (`orderedList`, `list`,
  `table`, `blockquote`) ; le modèle expose `sections`.
- **Fonction pure partagée éditeur / générateur** : `analyzeModel(model, options)`
  → `{ seo, geo, rangesMap }` ne dépend que du modèle. `assembleModel({ blocks,
  links, images, counts })` construit ce modèle sans ProseMirror : un extracteur
  HTML côté Brispr-Server peut produire les mêmes blocs (positions en offsets
  de texte) et obtenir exactement le même score. Cet extracteur reste à écrire.

## Calibration

Pas de grille de référence équivalente à Yoast. Premier corpus : les articles
Brispr publiés et leurs notes GEO d'audit (60-65). Visibilité réelle mesurable
via les endpoints de suivi des mentions LLM de DataForSEO. D'ici là, les cibles
restent exposées en clair dans `objective`.

## Phase 2 — checks assistés par LLM

Asynchrones, déclenchés par action :

1. **gain d'information** face aux pages concurrentes — le critère que Google
   met en avant (contenu unique, de première main) ; prioritaire ;
2. génération des questions de fan-out depuis le mot-clé → `geoQuestions` ;
3. couverture par embeddings au lieu du matching lexical ;
4. simulation de citation : passages + requêtes soumis à un modèle.
