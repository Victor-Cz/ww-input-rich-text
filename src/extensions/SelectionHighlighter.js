import { Extension } from '@tiptap/core'

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  onCreate() {
    console.log('SelectionHighlighter - Extension créée');
  },

  addProseMirrorPlugins() {
    console.log('SelectionHighlighter - addProseMirrorPlugins appelé');
    return []
  },
})
