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
            console.log('SelectionHighlighter - Plugin initialisé');
            return DecorationSet.empty
          },
          apply(tr, old) {
            // Récupérer le storedSelection depuis les métadonnées de la transaction
            const storedSelection = tr.getMeta('storedSelection')
            
            console.log('SelectionHighlighter - storedSelection:', storedSelection);
            
            if (!storedSelection) {
              return DecorationSet.empty
            }

            const deco = Decoration.inline(
              storedSelection.from,
              storedSelection.to,
              { style: 'background-color: yellow;' }
            )

            console.log('SelectionHighlighter - decoration créée:', deco);
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
