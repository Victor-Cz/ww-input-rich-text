import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'

const textSuggestionKey = new PluginKey('textSuggestion')

export const TextSuggestion = Extension.create({
  name: 'textSuggestion',

  addOptions() {
    return {
      suggestionText: 'Suggestion',
      position: 1,
      className: 'suggestion-label',
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    // Fonction qui crée le widget DOM avec les options capturées
    function createWidget() {
      const span = document.createElement('span')
      span.className = options.className
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
      span.textContent = options.suggestionText
      return span
    }

    return [
      new Plugin({
        key: textSuggestionKey,

        state: {
          init(config, instance) {
            // 'instance.doc' est le document initial
            return DecorationSet.create(instance.doc, [
              Decoration.widget(options.position, createWidget),
            ])
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
