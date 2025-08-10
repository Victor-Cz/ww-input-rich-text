import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'

const selectionHighlighterKey = new PluginKey('selectionHighlighter')

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: selectionHighlighterKey,

        state: {
          init() {
            // Au départ, pas de décorations
            return DecorationSet.empty
          },

          apply(tr, oldDecoSet, oldState, newState) {
            // On récupère la nouvelle plage à surligner depuis les métadonnées de la transaction
            const meta = tr.getMeta(selectionHighlighterKey)
            
            if (!meta) {
              // Si pas de nouvelle sélection, on met à jour la décoration en fonction des modifications du doc
              return oldDecoSet.map(tr.mapping, tr.doc)
            }

            const { from, to } = meta

            // Si from/to invalides, on retire toutes les décorations
            if (from == null || to == null || from >= to) {
              return DecorationSet.empty
            }

            // On crée la décoration pour surligner la plage
            const deco = Decoration.inline(from, to, {
              style: 'background-color: #ffeb3b;',
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
      highlightFirstChars:
        (count = 10) =>
        ({ state, dispatch }) => {
          // Sélectionner les premiers 'count' caractères dans le doc
          // On limite à la longueur du document pour éviter les erreurs
          const docSize = state.doc.content.size
          const from = 1 // position 1 = début du contenu (après le doc root)
          const to = Math.min(from + count, docSize)

          if (dispatch) {
            const tr = state.tr.setMeta(selectionHighlighterKey, { from, to })
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

  addKeyboardShortcuts() {
    return {
      'Ctrl-h': () => this.editor.commands.highlightFirstChars(10),
      'Mod-h': () => this.editor.commands.highlightFirstChars(10), // pour Mac (Cmd-h)
      'Ctrl-Shift-h': () => this.editor.commands.clearHighlight(),
    }
  },
})
