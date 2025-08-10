import { Extension } from '@tiptap/core'

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  addCommands() {
    return {
      selectFirstChars: () => ({ editor }) => {
        try {
          const { state, view } = editor;
          const { doc } = state;
          
          // Trouver le premier nœud de contenu textuel
          let startPos = 0;
          let endPos = 0;
          
          // Parcourir le document pour trouver le premier nœud de texte
          doc.descendants((node, pos) => {
            if (node.isText && startPos === 0) {
              startPos = pos;
              endPos = Math.min(pos + 10, pos + node.textContent.length);
              return false; // Arrêter la recherche
            }
          });
          
          // Si on a trouvé du texte, créer la sélection
          if (startPos < endPos) {
            const selection = state.selection.constructor.create(doc, startPos, endPos);
            const tr = state.tr.setSelection(selection);
            view.dispatch(tr);
          }
          
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
