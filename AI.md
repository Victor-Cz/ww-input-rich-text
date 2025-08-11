---
name: ww-input-rich-text
description: A versatile rich text editor enabling text content creation with formatting options, headings, lists, tables, media, read-only mode, mention support, and output format selection. This is for editing rich text, not just rendering rich text.
keywords: rich text editor, text edition, customizable editor, mention feature, multi-language support, markdown input, advanced text input
---

#### ww-input-rich-text

***Purpose:***
A versatile rich text editor enabling text content creation with formatting options, headings, lists, tables, media, read-only mode, mention support, and output format selection. This is for editing rich text, not just rendering rich text.

***Features:***
- Hide the menu for a minimalistic render
- Use as readonly to display rich text content
- Enable features in the menu that make sense given the building context

***Properties:***
- readonly: boolean - Whether editor is read-only. Default: false
- editable: boolean - Whether editor is editable. Default: true
- initialValue: string - Initial content. Default: "". This is not multilang and must be a string.
- placeholder: string - Placeholder text. Default: "Type here...". This is not multilang and must be a string.
- enableMention: boolean - Enable mention feature. Default: false
- mentionChar: string - Mention trigger character. Default: "@"
- mentionAllowSpaces: boolean - Allow spaces in mentions. Default: false
- mentionListLength: number - Max mention suggestions. Default: 5
- mentionList: array - List of mention suggestions. Default: []
- mentionIdPath: string - Path to mention ID in data. Default: null
- mentionLabelPath: string - Path to mention label in data. Default: null
- autofocus: boolean - Auto focus editor. Default: false
- output: 'html' | 'markdown' - Output format. Default: "html"
- debounce: boolean - Debounce change event. Default: false
- debounceDelay: string - Debounce delay (1-5000ms). Default: "500ms"
- hideMenu: boolean - Hide formatting menu. Default: false
- wrapMenu: boolean - Wrap formatting menu. Default: false
- customMenu: boolean - Use custom menu. Default: false
- menuColor: string - Menu color. Default: "#000000ad"
- fieldName: string - Form field name. Default: ""
- customValidation: boolean - Enable custom validation. Default: false
- validation: string - Custom validation formula. Default: ""
- h1-h6: object - Heading styles (fontSize, fontFamily, fontWeight, etc.)
- p: object - Paragraph styles
- mention: object - Mention styles
- a: object - Link styles
- blockquote: object - Quote styles
- code: object - Code block styles
- img: object - Image styles
- checkbox: object - Checkbox styles
- table: object - Table styles

***Slots:***
- customMenuElement: (element) ww-div - Optional custom menu element

***Events:***
- change: Triggered when content changes. Payload: {value: string}
- initValueChange: Triggered when initial value changes. Payload: {value: string}
- mention:click: Triggered when clicking a mention. Payload: {mention: {id: string, label: string}}
- focus: Triggered when editor gets focus. Payload: {value: string} 
- blur: Triggered when editor loses focus. Payload: {value: string}

***Exposed Element Actions:***
- `focusEditor`: Focus the editor. No args allowed
- `setLink`: Set a link. Args: URL (Text)
- `setImage`: Set an image. Args: Source (Text), Alt (Text), Title (Text)
- `setTag`: Set text tag. Args: Tag (select: p, h1, h2, h3, h4, h5, h6)
- `toggleBold`: Toggle bold formatting. No args allowed
- `toggleItalic`: Toggle italic formatting. No args allowed
- `toggleUnderline`: Toggle underline. No args allowed
- `toggleStrike`: Toggle strikethrough. No args allowed
- `setTextAlign`: Set text alignment. Args: Alignment (select: left, center, right, justify)
- `setColor`: Set text color. Args: Color (color)
- `toggleBulletList`: Toggle bullet list. No args allowed
- `toggleOrderedList`: Toggle ordered list. No args allowed
- `toggleTaskList`: Toggle task list. No args allowed
- `toggleCodeBlock`: Toggle code block. No args allowed
- `toggleBlockquote`: Toggle blockquote. No args allowed
- `undo`: Undo last action. No args allowed
- `redo`: Redo last action. No args allowed
- `insertTable`: Insert table. No args allowed
- `insertRow`: Insert row. Args: Position (select: before, after)
- `insertColumn`: Insert column. Args: Position (select: before, after)
- `deleteRow`: Delete row. No args allowed
- `deleteColumn`: Delete column. No args allowed
- `deleteTable`: Delete table. No args allowed

***Exposed Variables:***
- value: string - Current editor content (path: variables['current_element_uid-value'])
- mentions: array - List of mentions in content (path: variables['current_element_uid-mentions'])
- states: object - Editor states (text formatting, alignment, etc) (path: variables['current_element_uid-states'])

# Menu AI - Types de modification personnalisés

## Vue d'ensemble

Le composant Rich Text Editor inclut un menu AI qui permet aux utilisateurs de modifier leur texte en utilisant l'intelligence artificielle. Par défaut, plusieurs types de modification sont disponibles, mais vous pouvez également configurer vos propres types personnalisés.

## Types de modification par défaut

Le menu AI n'inclut **aucun type de modification par défaut**. Tous les types de modification doivent être configurés par l'utilisateur dans les paramètres.

> **Note** : Cette approche permet une personnalisation complète du menu AI selon les besoins spécifiques de chaque projet ou utilisateur.
> 
> **Exemples disponibles** : Des exemples de types de modification sont disponibles en commentaires dans le code source (`src/components/AiMenu.vue`) pour vous aider à configurer vos propres types.

## Configuration des types de modification personnalisés

### Structure d'un type de modification

Chaque type de modification personnalisé doit avoir la structure suivante :

```json
{
  "key": "summarize",
  "label": "Résumer",
  "description": "Créer un résumé concis du texte sélectionné",
  "defaultPrompt": "Résume ce texte en gardant les points essentiels",
  "action": "replace",
  "requireInput": true
}
```

### Champs disponibles

- **`key`** : Identifiant unique du type (ex: "summarize", "rewrite", "translate")
- **`label`** : Nom affiché dans le menu déroulant
- **`description`** : Description de ce que fait ce type de modification
- **`defaultPrompt`** : Prompt par défaut pour l'IA
- **`action`** : Comment appliquer la réponse de l'IA
- **`requireInput`** : Si l'utilisateur doit fournir un input supplémentaire

### Actions disponibles

- **`replace`** : Remplacer la sélection
- **`replace-all`** : Remplacer tout le texte
- **`insert-before`** : Insérer avant la sélection
- **`insert-after`** : Insérer après la sélection
- **`append`** : Ajouter à la fin
- **`prepend`** : Ajouter au début

## Configuration des placeholders et messages

### Placeholders personnalisables

Vous pouvez personnaliser tous les textes affichés dans l'interface du menu AI. Les placeholders utilisent maintenant le type **Formula** pour permettre le support multilingue et le contenu dynamique.

```json
{
  "promptInput": "=wwLib.wwUtils.getText('ai.promptInput', { lang: wwLib.wwUtils.getCurrentLanguage() })",
  "processing": "=wwLib.wwUtils.getText('ai.processing', { lang: wwLib.wwUtils.getCurrentLanguage() })",
  "submitButton": "=wwLib.wwUtils.getText('ai.submitButton', { lang: wwLib.wwUtils.getCurrentLanguage() })",
  "cancelButton": "=wwLib.wwUtils.getText('ai.cancelButton', { lang: wwLib.wwUtils.getCurrentLanguage() })",
  "noTypesMessage": "=wwLib.wwUtils.getText('ai.noTypesMessage', { lang: wwLib.wwUtils.getCurrentLanguage() })"
}
```

### Support multilingue avec formules

#### Option 1 : Utilisation de wwLib.wwUtils.getText()

```javascript
// Français
=wwLib.wwUtils.getText('ai.promptInput', { lang: 'fr' })

// Anglais
=wwLib.wwUtils.getText('ai.promptInput', { lang: 'en' })

// Langue actuelle
=wwLib.wwUtils.getText('ai.promptInput', { lang: wwLib.wwUtils.getCurrentLanguage() })
```

#### Option 2 : Formules conditionnelles

```javascript
=wwLib.wwUtils.getCurrentLanguage() === 'fr' ? 'Entrez votre prompt...' : 'Enter your prompt...'
```

#### Option 3 : Utilisation de variables globales

```javascript
=wwLib.wwUtils.getText('ai.promptInput', { lang: wwLib.wwUtils.getCurrentLanguage() }) || 'Enter your prompt...'
```

### Champs disponibles

- **`promptInput`** : Placeholder du champ de saisie du prompt
- **`processing`** : Message affiché pendant le traitement par l'IA
- **`submitButton`** : Texte du bouton d'envoi
- **`cancelButton`** : Texte du bouton d'annulation
- **`noTypesMessage`** : Message affiché quand aucun type n'est configuré

### Valeurs par défaut

Les valeurs par défaut sont maintenant des chaînes de caractères entre guillemets pour éviter la confusion avec les formules :

```json
{
  "promptInput": "\"Enter your prompt...\"",
  "processing": "\"Processing...\"",
  "submitButton": "\"Submit\"",
  "cancelButton": "\"Cancel\"",
  "noTypesMessage": "\"No modification types configured. Please configure at least one type in the settings.\""
}
```

### Avantages des formules

1. **Support multilingue** : Changement automatique de langue selon la configuration
2. **Contenu dynamique** : Possibilité d'utiliser des variables et des conditions
3. **Flexibilité** : Intégration avec le système de gestion des langues de la plateforme
4. **Performance** : Évaluation à la demande, pas de surcharge au chargement

## Utilisation

Une fois configurés, vos types personnalisés apparaîtront dans le menu déroulant du menu AI, à côté des types par défaut. Les utilisateurs pourront :

1. Sélectionner le type de modification souhaité
2. Voir la description et le prompt par défaut
3. Ajouter des instructions supplémentaires si nécessaire
4. Soumettre leur demande à l'IA

## Bonnes pratiques

- **Clés uniques** : Assurez-vous que chaque clé est unique pour éviter les conflits
- **Labels clairs** : Utilisez des noms descriptifs et compréhensibles
- **Prompts précis** : Rédigez des prompts clairs pour obtenir de meilleurs résultats
- **Actions appropriées** : Choisissez l'action qui correspond le mieux au comportement souhaité
- **Validation** : Testez vos types personnalisés pour vous assurer qu'ils fonctionnent comme prévu

## Support

Si vous rencontrez des problèmes ou avez des questions sur la configuration des types de modification personnalisés, consultez la documentation de votre plateforme ou contactez le support technique.

## Exemple de configuration complète

Voici un exemple complet de configuration pour le menu AI :

### Types de modification personnalisés

```json
[
  {
    "key": "summarize",
    "label": "Résumer",
    "description": "Créer un résumé concis du texte sélectionné",
    "defaultPrompt": "Résume ce texte en gardant les points essentiels",
    "action": "replace",
    "requireInput": true
  },
  {
    "key": "academic",
    "label": "Style académique",
    "description": "Transformer le texte en style académique formel",
    "defaultPrompt": "Transforme ce texte en style académique formel et professionnel",
    "action": "replace",
    "requireInput": true
  },
  {
    "key": "simplify",
    "label": "Simplifier",
    "description": "Simplifier le texte pour le rendre plus accessible",
    "defaultPrompt": "Simplifie ce texte pour le rendre plus facile à comprendre",
    "action": "replace",
    "requireInput": false
  }
]
```

### Placeholders personnalisés

#### Configuration simple (texte statique)

```json
{
  "promptInput": "\"Entrez votre prompt personnalisé...\"",
  "processing": "\"L'IA traite votre demande...\"",
  "submitButton": "\"Envoyer à l'IA\"",
  "cancelButton": "\"Annuler\"",
  "noTypesMessage": "\"Aucun type de modification configuré. Veuillez configurer au moins un type dans les paramètres.\""
}
```

#### Configuration multilingue avancée (avec formules)

```json
{
  "promptInput": "=wwLib.wwUtils.getCurrentLanguage() === 'fr' ? 'Entrez votre prompt...' : 'Enter your prompt...'",
  "processing": "=wwLib.wwUtils.getCurrentLanguage() === 'fr' ? 'Traitement en cours...' : 'Processing...'",
  "submitButton": "=wwLib.wwUtils.getCurrentLanguage() === 'fr' ? 'Envoyer' : 'Submit'",
  "cancelButton": "=wwLib.wwUtils.getCurrentLanguage() === 'fr' ? 'Annuler' : 'Cancel'",
  "noTypesMessage": "=wwLib.wwUtils.getCurrentLanguage() === 'fr' ? 'Aucun type de modification configuré. Veuillez configurer au moins un type dans les paramètres.' : 'No modification types configured. Please configure at least one type in the settings.'"
}
```

#### Configuration avec système de traduction intégré

```json
{
  "promptInput": "=wwLib.wwUtils.getText('ai.promptInput', { lang: wwLib.wwUtils.getCurrentLanguage() }) || 'Enter your prompt...'",
  "processing": "=wwLib.wwUtils.getText('ai.processing', { lang: wwLib.wwUtils.getCurrentLanguage() }) || 'Processing...'",
  "submitButton": "=wwLib.wwUtils.getText('ai.submitButton', { lang: wwLib.wwUtils.getCurrentLanguage() }) || 'Submit'",
  "cancelButton": "=wwLib.wwUtils.getText('ai.cancelButton', { lang: wwLib.wwUtils.getCurrentLanguage() }) || 'Cancel'",
  "noTypesMessage": "=wwLib.wwUtils.getText('ai.noTypesMessage', { lang: wwLib.wwUtils.getCurrentLanguage() }) || 'No modification types configured. Please configure at least one type in the settings.'"
}
```

## Utilisation

