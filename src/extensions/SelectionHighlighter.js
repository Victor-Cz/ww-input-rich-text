import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin } from 'prosemirror-state'

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, old) {
            // Récupérer le storedSelection depuis les métadonnées
            const storedSelection = tr.getMeta('storedSelection')
            
            if (!storedSelection) {
              return DecorationSet.empty
            }

            // Créer la décoration pour surligner le storedSelection
            const deco = Decoration.inline(
              storedSelection.from,
              storedSelection.to,
              { style: 'background-color: #ffeb3b;' }
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
