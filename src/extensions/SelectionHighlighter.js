import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin } from 'prosemirror-state'

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  addOptions() {
    return {
      highlightColor: 'yellow',
      highlightStyle: 'background-color',
      getHighlightRange: null, // Fonction qui retourne { from, to } ou null
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, old) {
            // Utiliser la fonction personnalisée pour obtenir la plage à surligner
            const highlightRange = this.options.getHighlightRange ? 
              this.options.getHighlightRange(tr) : null
            
            if (!highlightRange) {
              return DecorationSet.empty
            }

            const deco = Decoration.inline(
              highlightRange.from,
              highlightRange.to,
              { style: `${this.options.highlightStyle}: ${this.options.highlightColor};` }
            )

            return DecorationSet.create(tr.doc, [deco])
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      })
    ]
  },
})
