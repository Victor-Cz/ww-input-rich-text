import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'

const textSuggestionKey = new PluginKey('textSuggestion')

export const TextSuggestion = Extension.create({
  name: 'textSuggestion',

  addOptions() {
    return {
      // Texte de la suggestion à afficher
      suggestionText: 'Suggestion',
      // Position dans le document où afficher la suggestion (index)
      position: 1,
      // Style CSS optionnel
      className: 'suggestion-label',
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: textSuggestionKey,

        state: {
          init() {
            return DecorationSet.create(this.doc, [
              Decoration.widget(this.options.position, this.createWidget.bind(this)),
            ])
          },

          apply(tr, old) {
            // Met à jour la décoration si document modifié
            return old.map(tr.mapping, tr.doc)
          },
        },

        props: {
          decorations(state) {
            return textSuggestionKey.getState(state)
          },
        },

        createWidget() {
          const span = document.createElement('span')
          span.className = this.options.className
          span.style.cssText = `
            background: #eef;
            color: #336;
            border-radius: 3px;
            padding: 2px 6px;
            font-size: 0.85em;
            user-select: none;
            pointer-events: none;
            margin-left: 4px;
          `
          span.textContent = this.options.suggestionText
          return span
        },
      }),
    ]
  },
})
