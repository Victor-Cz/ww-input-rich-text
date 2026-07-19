import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'

const seoHighlighterKey = new PluginKey('seoHighlighter')

// Surlignage SEO : contrairement à SelectionHighlighter (une seule plage),
// cette extension décore un ensemble de plages (toutes les occurrences d'un check).
export const SeoHighlighter = Extension.create({
  name: 'seoHighlighter',

  addOptions() {
    return {
      defaultColor: 'rgba(255, 200, 50, 0.45)',
    }
  },

  addProseMirrorPlugins() {
    const options = this.options
    return [
      new Plugin({
        key: seoHighlighterKey,

        state: {
          init() {
            return DecorationSet.empty
          },

          apply(tr, oldDecoSet) {
            const meta = tr.getMeta(seoHighlighterKey)

            if (!meta) {
              // Les décorations suivent les éditions du texte
              return oldDecoSet.map(tr.mapping, tr.doc)
            }

            const { ranges, color } = meta

            if (!Array.isArray(ranges) || !ranges.length) {
              return DecorationSet.empty
            }

            const highlightColor = color || options.defaultColor
            const docSize = tr.doc.content.size

            const decorations = []
            for (const range of ranges) {
              const from = Math.max(0, Math.min(range.from, docSize))
              const to = Math.max(from, Math.min(range.to, docSize))
              if (to <= from) continue

              if (range.node) {
                // Plage couvrant un nœud atomique (image…). La décoration ne peut
                // cibler que le DOM du nœud (le node-view-wrapper, pleine largeur) :
                // on passe la couleur en variable CSS et c'est ImageNode.vue qui
                // pose l'outline sur le conteneur image réel (.image-layout).
                decorations.push(
                  Decoration.node(from, to, {
                    class: 'seo-highlight',
                    style: `--seo-highlight-color: ${highlightColor};`,
                  })
                )
              } else {
                decorations.push(
                  Decoration.inline(from, to, {
                    class: 'seo-highlight',
                    style: `background-color: ${highlightColor}; border-radius: 2px;`,
                  })
                )
              }
            }

            return DecorationSet.create(tr.doc, decorations)
          },
        },

        props: {
          decorations(state) {
            return seoHighlighterKey.getState(state)
          },
        },
      }),
    ]
  },

  addCommands() {
    return {
      setSeoHighlights:
        (ranges, color) =>
        ({ state, dispatch }) => {
          if (dispatch) {
            dispatch(state.tr.setMeta(seoHighlighterKey, { ranges, color }))
          }
          return true
        },

      clearSeoHighlights:
        () =>
        ({ state, dispatch }) => {
          if (dispatch) {
            dispatch(state.tr.setMeta(seoHighlighterKey, { ranges: [] }))
          }
          return true
        },
    }
  },
})
