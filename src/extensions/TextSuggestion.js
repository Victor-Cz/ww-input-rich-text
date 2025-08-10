import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'

const textSuggestionKey = new PluginKey('textSuggestion')

export const TextSuggestion = Extension.create({
  name: 'textSuggestion',

  addOptions() {
    return {
      suggestionText: null,
      position: 1,
      className: 'suggestion-label',
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    // Fonction qui crée le widget DOM avec les options capturées
    function createWidget() {
      // Vérifier si suggestionText existe avant de créer le widget
      if (!options.suggestionText) {
        return null
      }
      
      const span = document.createElement('span')
      span.className = options.className
      span.style.cssText = `
        color: var(--primary-color);
      `
      span.textContent = options.suggestionText
      return span
    }

    return [
      new Plugin({
        key: textSuggestionKey,

        state: {
          init(config, instance) {
            // 'instance.doc' est le document initial
            const widget = createWidget()
            
            // Ne créer la décoration que si le widget existe
            if (widget) {
              return DecorationSet.create(instance.doc, [
                Decoration.widget(options.position, widget),
              ])
            }
            
            // Retourner un DecorationSet vide si pas de widget
            return DecorationSet.empty
          },

          apply(tr, old) {
            return old.map(tr.mapping, tr.doc)
          },
        },

        props: {
          decorations(state) {
            return textSuggestionKey.getState(state)
          },
        },
      }),
    ]
  },
})
