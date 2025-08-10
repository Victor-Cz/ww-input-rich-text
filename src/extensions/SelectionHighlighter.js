import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  addProseMirrorPlugins() {
    const key = new PluginKey('selectionHighlighter')

    return [
      new Plugin({
        key,
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, old) {
            const storedSelection = tr.getMeta(key)

            // Si pas de nouvelle sélection => garder l'ancienne
            if (!storedSelection) {
              return old.map(tr.mapping, tr.doc)
            }

            // Si from et to sont null, retirer le surlignage
            if (storedSelection.from === null || storedSelection.to === null) {
              return DecorationSet.empty
            }

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
            return key.getState(state)
          },
        },
      })
    ]
  },

  addCommands() {
    return {
      highlightRange:
        (from, to) =>
        ({ state, dispatch }) => {
          const tr = state.tr.setMeta(key, { from, to })
          dispatch(tr)
          return true
        },
    }
  },
})
