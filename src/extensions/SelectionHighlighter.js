import { Extension } from '@tiptap/core'

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  addCommands() {
    return {
      selectFirstChars: () => ({ editor }) => {
        try {
          const { state, view } = editor;
          const { doc } = state;
          
          // Calculer la position de fin (10 premiers caractères)
          const endPos = Math.min(10, doc.content.size);
          
          // Créer une sélection simple
          const selection = state.selection.constructor.create(doc, 0, endPos);
          
          // Appliquer la sélection
          const tr = state.tr.setSelection(selection);
          view.dispatch(tr);
          
          return true;
        } catch (error) {
          console.warn('SelectionHighlighter error:', error);
          return false;
        }
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Ctrl-h': () => this.editor.commands.selectFirstChars(),
    }
  },
})
