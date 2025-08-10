import { Extension } from '@tiptap/core'

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  addCommands() {
    return {
      selectFirstChars: () => ({ editor }) => {
        try {
          console.log('SelectionHighlighter: Commande exécutée');
          
          // Utiliser la commande native de Tiptap pour sélectionner tout
          editor.commands.selectAll();
          
          console.log('SelectionHighlighter: Tout sélectionné');
          return true;
        } catch (error) {
          console.error('SelectionHighlighter error:', error);
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
