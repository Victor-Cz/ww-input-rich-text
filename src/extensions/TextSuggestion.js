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
      color: 'var(--primary-color)',
    }
  },

  addCommands() {
    return {
      updateSuggestion: (text, position) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(textSuggestionKey, { 
            type: 'update', 
            text, 
            position: position || this.options.position 
          })
        }
        return true
      },

      clearSuggestion: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(textSuggestionKey, { type: 'clear' })
        }
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    // Fonction qui crée le widget DOM avec les options capturées
    function createWidget(text) {
      // Vérifier si suggestionText existe avant de créer le widget
      if (!text) {
        return null
      }
      
      const span = document.createElement('span')
      span.className = options.className
      span.style.cssText = `
        color: ${options.color} !important;
      `
      span.textContent = text
      return span
    }

    return [
      new Plugin({
        key: textSuggestionKey,

        state: {
          init(config, instance) {
            // 'instance.doc' est le document initial
            const widget = createWidget(options.suggestionText)
            
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
            const meta = tr.getMeta(textSuggestionKey)
            
            if (meta) {
              if (meta.type === 'update') {
                const widget = createWidget(meta.text)
                if (widget) {
                  return DecorationSet.create(tr.doc, [
                    Decoration.widget(meta.position, widget),
                  ])
                } else {
                  return DecorationSet.empty
                }
              } else if (meta.type === 'clear') {
                return DecorationSet.empty
              }
            }
            
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
