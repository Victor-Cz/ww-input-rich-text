import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  addProseMirrorPlugins() {
    return [
      new this.editor.view.state.Plugin({
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, old) {
            const { selection } = tr
            if (selection.empty) return DecorationSet.empty

            const deco = Decoration.inline(
              selection.from,
              selection.to,
              { style: 'background-color: yellow;' }
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
