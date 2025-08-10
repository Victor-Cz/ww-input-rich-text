import { Extension } from '@tiptap/core'

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  addCommands() {
    return {
      insertHello: () => ({ commands }) => {
        return commands.insertContent('Hello World')
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Ctrl-h': () => this.editor.commands.insertHello(),
    }
  },
})
