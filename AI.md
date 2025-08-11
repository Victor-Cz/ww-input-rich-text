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

Vous pouvez personnaliser tous les textes affichés dans l'interface du menu AI. Les placeholders acceptent maintenant **deux types de valeurs** :

1. **Texte simple** : Pour une configuration rapide et simple
2. **Formules** : Pour le support multilingue et le contenu dynamique

#### Option 1 : Texte simple (recommandé pour débuter)

```json
{
  "promptInput": "Entrez votre prompt...",
  "processing": "Traitement en cours...",
  "submitButton": "Envoyer",
  "cancelButton": "Annuler",
  "noTypesMessage": "Aucun type de modification configuré"
}
```

#### Option 2 : Formules (pour le support multilingue)

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
- **`submitButton`** : Texte du bouton d'application (anciennement "Submit")
- **`cancelButton`** : Texte du bouton d'annulation
- **`noTypesMessage`** : Message affiché quand aucun type n'est configuré

### Tooltips disponibles

- **`promptInputTooltip`** : Tooltip du champ de saisie du prompt
- **`submitButtonTooltip`** : Tooltip du bouton d'application
- **`cancelButtonTooltip`** : Tooltip du bouton d'annulation

### Valeurs par défaut

Les valeurs par défaut sont maintenant du texte simple (sans guillemets) pour une configuration facile :

```json
{
  "promptInput": "Enter your prompt...",
  "processing": "Processing...",
  "submitButton": "Apply",
  "cancelButton": "Cancel",
  "noTypesMessage": "No modification types configured. Please configure at least one type in the settings.",
  "promptInputTooltip": "Enter your instructions for the AI",
  "submitButtonTooltip": "Apply the AI modification",
  "cancelButtonTooltip": "Cancel the current operation"
}
```

### Utilisation dans le code

Les placeholders sont utilisés directement dans le composant Vue :

```vue
<!-- Bouton d'annulation -->
<span class="button-label">{{ placeholders.cancelButton }}</span>

<!-- Bouton d'application -->
<span class="button-label">{{ placeholders.submitButton }}</span>

<!-- Placeholder du champ de saisie -->
<textarea :placeholder="placeholders.promptInput"></textarea>

<!-- Message de traitement -->
<div class="ai-loading-text">{{ placeholders.processing }}</div>

<!-- Message quand aucun type n'est configuré -->
<div class="no-types-text">{{ placeholders.noTypesMessage }}</div>
```

### Avantages de cette approche

1. **Simplicité maximale** : Utilisation directe de `{{ placeholders.propertyName }}`
2. **Système de binding natif** : La plateforme gère automatiquement l'évaluation des formules
3. **Performance optimale** : Pas de logique d'évaluation personnalisée
4. **Maintenance facile** : Code plus simple et plus fiable
5. **Support multilingue** : Formules évaluées automatiquement par le système de binding
6. **Flexibilité** : Texte simple ET formules supportés nativement

## Fonctionnement technique

### Système de binding automatique

Le composant utilise maintenant le système de binding natif de la plateforme :

```javascript
// Dans le composant Vue
props: {
    placeholders: {
        type: Object,
        default: () => ({
            promptInput: 'Enter your prompt...',
            processing: 'Processing...',
            submitButton: 'Apply',
            cancelButton: 'Cancel',
            noTypesMessage: 'No modification types configured...'
        })
    }
}
```

### Évaluation automatique

- **Texte simple** : Affiché directement
- **Formules** : Évaluées automatiquement par le système de binding de la plateforme
- **Valeurs dynamiques** : Mises à jour automatiquement

## Utilisation

Une fois configurés, vos types personnalisés apparaîtront dans le menu déroulant du menu AI, à côté des types par défaut. Les utilisateurs pourront :

1. Sélectionner le type de modification souhaité
2. Voir la description et le prompt par défaut
3. Ajouter des instructions supplémentaires si nécessaire
4. Soumettre leur demande à l'IA

## Triggers disponibles

### `ai-suggestion-applied`

Ce trigger est déclenché lorsqu'une suggestion AI est appliquée avec succès dans l'éditeur.

**Quand est-il déclenché ?**
- Après avoir cliqué sur le bouton de validation (✓) d'une suggestion AI
- Une fois que la modification a été appliquée dans l'éditeur

**Payload de l'événement :**
```json
{
  "response": "Texte brut de la réponse AI",
  "formattedResponse": "Texte formaté avec espaces intelligents",
  "modificationType": "summarize",
  "action": "replace",
  "selectedText": "Texte qui était sélectionné",
  "selectionRange": {
    "from": 10,
    "to": 50
  },
  "htmlValue": "Contenu total du document après application de la suggestion",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "position": 50
}
```

**Champs du payload :**
- **`response`** : La réponse brute de l'IA
- **`formattedResponse`** : La réponse formatée avec espaces intelligents
- **`modificationType`** : La clé du type de modification utilisé
- **`action`** : L'action appliquée (replace, insert-before, etc.)
- **`selectedText`** : Le texte qui était sélectionné (si applicable)
- **`selectionRange`** : La position de la sélection dans le document
- **`htmlValue`** : Le contenu total du document après application de la suggestion
- **`timestamp`** : Horodatage de l'application
- **`position`** : Position finale où le texte a été inséré

**Exemple d'utilisation dans WeWeb :**
```javascript
// Dans un workflow WeWeb
const eventData = event.event;

// Accéder aux informations de la suggestion appliquée
const aiResponse = eventData.response;
const modificationType = eventData.modificationType;
const selectedText = eventData.selectedText;
const htmlValue = eventData.htmlValue;

// Logique personnalisée après application de la suggestion
if (modificationType === 'summarize') {
    // Traitement spécifique pour les résumés
    console.log('Résumé appliqué:', aiResponse);
    console.log('Contenu total du document:', htmlValue);
    
    // Vérifier la longueur du document après modification
    if (htmlValue.length > 1000) {
        console.log('Document devenu trop long après résumé');
    }
}
```

### `ai-prompt`

Ce trigger est déclenché lorsqu'un prompt AI est soumis.

**Payload de l'événement :**
```json
{
  "prompt": "Prompt final envoyé à l'IA",
  "modificationType": "summarize",
  "action": "replace",
  "selectedText": "Texte sélectionné",
  "htmlValue": "Contenu total du document au moment de l'envoi du prompt",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Exemple d'utilisation dans WeWeb :**
```javascript
// Dans un workflow WeWeb
const eventData = event.event;

// Accéder aux informations du prompt
const prompt = eventData.prompt;
const modificationType = eventData.modificationType;
const htmlValue = eventData.htmlValue;

// Logique personnalisée avant envoi à l'IA
if (modificationType === 'summarize') {
    // Vérifier la longueur du document avant résumé
    if (htmlValue.length < 100) {
        console.log('Document trop court pour être résumé');
    } else {
        console.log('Document de', htmlValue.length, 'caractères envoyé pour résumé');
    }
}
```

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

# Configuration des Icônes pour les Types de Modification AI

## Vue d'ensemble

Le composant Rich Text avec menu AI permet maintenant de définir des icônes personnalisées pour chaque type de modification. Ces icônes s'affichent dans le menu déroulant des types de modification et dans l'en-tête de la dropdown.

## Configuration des Icônes

### 1. Dans les Paramètres du Composant

1. Activez le menu AI (`Enable AI Menu`)
2. Dans la section "Custom Modification Types", ajoutez ou modifiez un type
3. Utilisez le champ "Icon" pour définir l'icône du type

### 2. Types d'Icônes Supportés

#### Icônes WeWeb (Recommandé)
```javascript
{
    isWwObject: true,
    type: 'ww-icon',
    state: {
        name: 'Nom de l\'icône',
        icon: 'nom-de-l-icone'
    }
}
```

#### Icônes HTML/SVG (Support Legacy)
```html
<i class="fas fa-magic"></i>
```

### 3. Exemples d'Icônes WeWeb Populaires

- `magic` - Pour la reformulation
- `edit` - Pour l'édition
- `translate` - Pour la traduction
- `summarize` - Pour la résumé
- `expand` - Pour l'expansion
- `compress` - Pour la compression
- `sparkles` - Pour l'amélioration
- `lightbulb` - Pour les suggestions

## Exemple de Configuration Complète

```javascript
{
    key: 'rephrase',
    label: 'Reformuler',
    icon: {
        isWwObject: true,
        type: 'ww-icon',
        state: {
            name: 'Magic icon',
            icon: 'magic'
        }
    },
    defaultPrompt: 'Reformule ce texte avec un style différent',
    action: 'replace',
    requireInput: true
}
```

## Avantages des Icônes WeWeb

1. **Cohérence visuelle** - Utilise la bibliothèque d'icônes native de WeWeb
2. **Facilité d'utilisation** - Sélection simple dans l'interface
3. **Responsive** - S'adapte automatiquement aux différentes tailles d'écran
4. **Maintenance** - Pas besoin de gérer les dépendances externes
5. **Accessibilité** - Intégration native avec les fonctionnalités d'accessibilité

## Bonnes Pratiques

1. **Choisir des icônes intuitives** - L'icône doit représenter clairement l'action
2. **Maintenir la cohérence** - Utiliser un style d'icônes cohérent dans tout le projet
3. **Tester la visibilité** - S'assurer que l'icône est visible sur tous les fonds
4. **Limiter le nombre** - Ne pas surcharger l'interface avec trop d'icônes

## Support des Icônes Personnalisées

Si vous avez besoin d'icônes personnalisées non disponibles dans WeWeb, vous pouvez toujours utiliser le support HTML/SVG en définissant directement le code HTML dans le champ icon.

