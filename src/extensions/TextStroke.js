import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'

const strokeKey = new PluginKey('textStroke')

export const TextStroke = Extension.create({
  name: 'textStroke',

  addOptions() {
    return {
      defaultStrokeColor: 'var(--primary-color)',
      defaultStrokeWidth: '1px',
      ranges: [], // [{ from: number, to: number, color?: string }]
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    return [
      new Plugin({
        key: strokeKey,

        state: {
          init(config, instance) {
            return DecorationSet.create(
              instance.doc,
              options.ranges.map(({ from, to, color }) =>
                Decoration.inline(from, to, {
                  style: `-webkit-text-stroke: ${options.defaultStrokeWidth} ${color || options.defaultStrokeColor};
                          text-stroke: ${options.defaultStrokeWidth} ${color || options.defaultStrokeColor};`,
                }),
              ),
            )
          },

          apply(tr, old) {
            const meta = tr.getMeta(strokeKey)
            if (meta && Array.isArray(meta.ranges)) {
              // Mise à jour avec nouveaux ranges
              const decorations = meta.ranges.map(({ from, to, color }) =>
                Decoration.inline(from, to, {
                  style: `-webkit-text-stroke: ${options.defaultStrokeWidth} ${color || options.defaultStrokeColor};
                          text-stroke: ${options.defaultStrokeWidth} ${color || options.defaultStrokeColor};`,
                }),
              )
              return DecorationSet.create(tr.doc, decorations)
            }
            // Sinon on remappe l'ancienne déco sur les changements du doc
            return old.map(tr.mapping, tr.doc)
          },
        },

        props: {
          decorations(state) {
            return strokeKey.getState(state)
          },
        },
      }),
    ]
  },

  addCommands() {
    return {
      setStrokeRanges:
        (ranges) =>
        ({ state, dispatch }) => {
          if (!dispatch) return false
          // ranges = [{ from, to, color? }, ...]
          const tr = state.tr.setMeta(strokeKey, { ranges })
          dispatch(tr)
          return true
        },

      clearStroke:
        () =>
        ({ state, dispatch }) => {
          if (!dispatch) return false
          const tr = state.tr.setMeta(strokeKey, { ranges: [] })
          dispatch(tr)
          return true
        },
    }
  },
})
