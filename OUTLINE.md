# Sommaire et section visible

Extension activable du composant rich text : expose le sommaire des titres
(h2/h3 par défaut), suit **au scroll** le titre de la section visible, et fournit
des actions pour naviguer d'un titre à l'autre.

Le sommaire est **calculé**, jamais écrit dans le document : aucun attribut `id`
n'est ajouté aux titres, la valeur HTML produite reste identique (important en
collaboration, où toute écriture serait diffusée aux autres éditeurs).

## Activation

Settings → **Headings outline** (`enableOutline`, off par défaut).
Désactivée : aucun suivi, `outline` à `[]`, `currentHeading` à `null`, propriétés
masquées.

| Propriété | Type | Rôle |
| --- | --- | --- |
| `outlineLevels` | Select | Niveaux retenus : `h2`, `h2h3` (défaut), `h1h2h3`, `all` |
| `outlineOffset` | Number (px) | Décale la ligne de détection : un titre devient la section visible quand il passe au-dessus d'elle. Augmenter la valeur si un en-tête fixe recouvre le haut du texte (le titre devient alors actif un peu plus tôt) |
| `outlineIndicator` | OnOff | Affiche un fil d'Ariane intégré (`H2 › H3`) épinglé au-dessus du texte. Laisser off pour construire son propre affichage depuis `currentHeading` |
| `outlineIndicatorColor` / `outlineIndicatorBgColor` | Color (style) | Couleur et fond du fil d'Ariane intégré |

Les titres **vides** sont ignorés (ni entrée de sommaire, ni frontière de
section). Le sommaire est recalculé de façon débouncée (~300 ms) pendant la
frappe ; la section visible est remesurée à chaque frame de scroll (rAF).

## Variables exposées

### `outline` (array) — la table des matières

```js
[
  { id: 'premiere-etape', index: 0, level: 2, text: 'Première étape', parentId: null,             active: false },
  { id: 'detail-a',       index: 1, level: 3, text: 'Détail A',       parentId: 'premiere-etape', active: true  },
]
```

- `id` : slug du texte (accents retirés, minuscules, tirets), suffixé `-2`, `-3`…
  en cas de doublon. Il change si le titre est renommé.
- `parentId` : titre de niveau supérieur le plus proche — permet d'indenter ou de
  regrouper la TOC.
- `active` : `true` sur la section visible, pour styliser l'entrée courante sans
  formule de comparaison.

### `currentHeading` (object|null) — la section visible

```js
{
  id: 'detail-a',
  index: 1,
  level: 3,
  text: 'Détail A',
  path: [                                    // ancêtres + le titre lui-même
    { id: 'premiere-etape', level: 2, text: 'Première étape' },
    { id: 'detail-a',       level: 3, text: 'Détail A' },
  ],
}
```

`null` tant que le scroll est au-dessus du premier titre. `path` donne
directement le fil d'Ariane « H2 › H3 ».

La section visible est le **dernier titre passé au-dessus de la ligne de
référence** : le haut de la zone de texte visible (haut de l'éditeur quand le
texte défile à l'intérieur, haut du viewport quand c'est la page qui défile),
décalé de `outlineOffset`.

## Événement

`heading:change` — au changement de section visible (et au renommage du titre
courant). Payload : `{ id, index, level, text, path }` ; valeurs vides quand
aucune section n'est visible.

## Actions

| Action | Arguments | Retour |
| --- | --- | --- |
| **Scroll to heading** | `Heading` (id, index ou texte exact) · `Place cursor in the heading` (OnOff) | `true` si le titre a été trouvé |
| **Scroll to next heading** | — | idem |
| **Scroll to previous heading** | — | idem |
| **Get outline** | — | le sommaire (même forme que la variable `outline`) |

Le scroll est fluide (`smooth`) et amène le titre sur la ligne de référence :
même repère que la détection, donc le titre ciblé devient bien la section
visible. Le conteneur défilé est détecté automatiquement (éditeur, wrapper
scrollable ou page).

## Exemple : table des matières cliquable

1. Un conteneur en boucle sur la variable `outline`.
2. Indentation via `item.level` (ou `item.parentId`), état actif via
   `item.active`.
3. Au clic : action **Scroll to heading** avec `item.id`.

Pour un affichage « vous êtes ici » sans construire de TOC, activer
`outlineIndicator` ou lier `currentHeading.text` / `currentHeading.path`.
