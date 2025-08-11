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

### Étape 1 : Accéder aux paramètres

1. Sélectionnez votre composant Rich Text Editor
2. Dans le panneau de droite, allez dans la section "Settings"
3. Trouvez la section "AI Menu"

### Étape 2 : Configurer les types personnalisés

Dans le paramètre "Custom Modification Types", vous pouvez ajouter autant de types que vous le souhaitez. Chaque type doit avoir les propriétés suivantes :

#### Propriétés requises

- **Key (identifiant unique)** : Un identifiant unique pour ce type (ex: "summarize", "rewrite", "academic")
- **Display Label** : Le nom affiché dans le menu déroulant (ex: "Résumer", "Réécrire", "Style académique")

#### Propriétés optionnelles

- **Description** : Description de ce que fait ce type de modification
- **Default Prompt** : Le prompt par défaut pour l'IA
- **Action** : Comment la réponse de l'IA doit être appliquée au texte
- **Require User Input** : Si l'utilisateur doit fournir une saisie supplémentaire

### Étape 3 : Exemples de configuration

#### Exemple 1 : Type "Résumer"

```json
{
  "key": "summarize",
  "label": "Résumer",
  "description": "Condenser le texte en gardant les points essentiels",
  "defaultPrompt": "Résume ce texte en gardant les informations importantes",
  "action": "replace",
  "requireInput": false
}
```

#### Exemple 2 : Type "Style académique"

```json
{
  "key": "academic",
  "label": "Style académique",
  "description": "Transformer le texte en style académique formel",
  "defaultPrompt": "Transforme ce texte en style académique formel et professionnel",
  "action": "replace",
  "requireInput": true
}
```

#### Exemple 3 : Type "Corriger l'orthographe"

```json
{
  "key": "spellcheck",
  "label": "Corriger l'orthographe",
  "description": "Corriger les erreurs d'orthographe et de grammaire",
  "defaultPrompt": "Corrige les erreurs d'orthographe et de grammaire dans ce texte",
  "action": "replace",
  "requireInput": false
}
```

## Actions disponibles

L'action détermine comment la réponse de l'IA sera appliquée au texte :

- **replace** : Remplacer la sélection actuelle
- **replace-all** : Remplacer tout le texte
- **insert-before** : Insérer avant la sélection
- **insert-after** : Insérer après la sélection
- **append** : Ajouter à la fin du texte
- **prepend** : Ajouter au début du texte

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

