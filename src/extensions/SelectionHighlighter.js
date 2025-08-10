import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'

// Déclarer la clé une seule fois ici
const selectionHighlighterKey = new PluginKey('selectionHighlighter')

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: selectionHighlighterKey,
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, old) {
            const storedSelection = tr.getMeta(selectionHighlighterKey)

            // Pas de nouvelle sélection → garder l'ancienne
            if (!storedSelection) {
              return old.map(tr.mapping, tr.doc)
            }

            // from/to null → supprimer le highlight
            if (storedSelection.from === null || storedSelection.to === null) {
              return DecorationSet.empty
            }

            // Créer la décoration
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
            return selectionHighlighterKey.getState(state)
          },
        },
      }),
    ]
  },

  addCommands() {
    return {
      highlightRange:
        (from, to) =>
        ({ state, dispatch }) => {
          const tr = state.tr.setMeta(selectionHighlighterKey, { from, to })
          dispatch(tr)
          return true
        },

      clearHighlight:
        () =>
        ({ state, dispatch }) => {
          const tr = state.tr.setMeta(selectionHighlighterKey, { from: null, to: null })
          dispatch(tr)
          return true
        },
    }
  },
})