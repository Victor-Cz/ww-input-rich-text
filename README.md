# Element component starter

This is an element for [weweb.io](https://www.weweb.io/).

## Installation

To run locally, first install all dependencies with `npm i`

## Start

To serve locally, run `npm run serve --port=[PORT]`, and then go to Weweb editor, open developper popup and add your custom element.

## Build

Before release, you can check build error by running `npm run build --name=my-element`

## Documentation

- [AI.md](AI.md) — AI menu (custom modification types, placeholders, triggers)
- [SEO.md](SEO.md) — SEO analysis extension (exposed `seo` variable, checks, highlight actions)
- [OUTLINE.md](OUTLINE.md) — Headings outline (exposed `outline` / `currentHeading` variables, scroll tracking, navigation actions)

## État vide

- `useEmptyLayout` (Settings) : tant que le document est vide, le conteneur « Empty state » du navigateur (`emptyLayoutElement`) s'affiche centré sur la zone de texte, à la place du placeholder. Il disparaît dès qu'il y a du contenu.
- Vide = le texte se réduit à un paragraphe vide (le frontmatter est ignoré). En collaboration, seulement une fois le document synchronisé.
- Un clic sur l'état vide place le curseur dans le texte, sauf sur un lien, un bouton ou un champ (`a`, `button`, `input`, `textarea`, `select`, `label`, `[role="button"]`) qu'il contient.
- `forceEmptyLayoutDisplay` (éditeur WeWeb seulement) : affiche toujours l'état vide, pour le construire.
- Variable `isEmpty` (lecture seule) : le même état vide, à binder dans la page.
