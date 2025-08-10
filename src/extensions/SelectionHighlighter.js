import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'

const selectionHighlighterKey = new PluginKey('selectionHighlighter')

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  addOptions() {
    return {
      defaultColor: '#ffeb3b', // couleur par défaut configurable
    }
  },

  addProseMirrorPlugins() {
    const options = this.options
    return [
      new Plugin({
        key: selectionHighlighterKey,

        state: {
          init() {
            return DecorationSet.empty
          },

          apply(tr, oldDecoSet, oldState, newState) {
            const meta = tr.getMeta(selectionHighlighterKey)

            if (!meta) {
              return oldDecoSet.map(tr.mapping, tr.doc)
            }

            const { from, to, color } = meta

            if (from == null || to == null || from >= to) {
              return DecorationSet.empty
            }

            // Utiliser la couleur passée ou la couleur par défaut depuis options
            const highlightColor = color || '#ffeb3b'

            const deco = Decoration.inline(from, to, {
              style: `background-color: ${highlightColor};`,
            })

            return DecorationSet.create(tr.doc, [deco])
          },
        },

        props: {
          decorations(state) {
            return selectionHighlighterKey.getState(state)
          },
        },
      }),
    ]
  },

  addCommands() {
    return {
      highlightRange:
        (start, end, color) =>
        ({ state, dispatch }) => {
          const docSize = state.doc.content.size
          const from = Math.max(1, Math.min(start, docSize))
          const to = Math.max(from + 1, Math.min(end, docSize))

          if (dispatch) {
            const tr = state.tr.setMeta(selectionHighlighterKey, { from, to, color })
            dispatch(tr)
          }
          return true
        },

      clearHighlight:
        () =>
        ({ state, dispatch }) => {
          if (dispatch) {
            const tr = state.tr.setMeta(selectionHighlighterKey, { from: null, to: null })
            dispatch(tr)
          }
          return true
        },
    }
  },
})
