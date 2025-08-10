import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'

const strikeKey = new PluginKey('textStrike')

export const TextStrike = Extension.create({
  name: 'textStrike',

  addOptions() {
    return {
      ranges: [], // [{ from: number, to: number }]
      className: 'text-strike', // optionnel, pour style CSS
      color: 'var(--primary-color)',
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    return [
      new Plugin({
        key: strikeKey,

        state: {
          init(config, instance) {
            const decorations = options.ranges.map(({ from, to }) =>
              Decoration.inline(from, to, {
                class: options.className,
                style: `text-decoration: line-through; !important; text-decoration-color: ${options.color} !important;`,
              }),
            )
            return DecorationSet.create(instance.doc, decorations)
          },

          apply(tr, old) {
            const meta = tr.getMeta(strikeKey)
            if (meta && Array.isArray(meta.ranges)) {
              const decorations = meta.ranges.map(({ from, to }) =>
                Decoration.inline(from, to, {
                  class: options.className,
                  style: `text-decoration: line-through; !important; text-decoration-color: ${options.color} !important;`,
                }),
              )
              return DecorationSet.create(tr.doc, decorations)
            }
            return old.map(tr.mapping, tr.doc)
          },
        },

        props: {
          decorations(state) {
            return strikeKey.getState(state)
          },
        },
      }),
    ]
  },

  addCommands() {
    return {
      setStrikeRanges:
        (ranges) =>
        ({ state, dispatch }) => {
          if (!dispatch) return false
          const tr = state.tr.setMeta(strikeKey, { ranges })
          dispatch(tr)
          return true
        },

      clearStrike:
        () =>
        ({ state, dispatch }) => {
          if (!dispatch) return false
          const tr = state.tr.setMeta(strikeKey, { ranges: [] })
          dispatch(tr)
          return true
        },
    }
  },
})
