import { Extension } from '@tiptap/core'
import { Plugin, Decoration, DecorationSet } from 'prosemirror-state'

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        state: {
          init() {
            return { decorations: DecorationSet.empty };
          },
          apply(tr, state) {
            return { decorations: state.decorations };
          },
        },
        props: {
          decorations(state) {
            return this.getState(state).decorations;
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      highlightFirstChars: () => ({ editor }) => {
        const { state, view } = editor;
        const { tr, doc } = state;
        
        // Calculer la position de fin (10 premiers caractères)
        const endPos = Math.min(10, doc.content.size);
        
        // Créer une décoration inline avec surlignage jaune
        const decoration = Decoration.inline(0, endPos, {
          style: 'background-color: #ffff00;'
        });
        
        // Créer un DecorationSet avec notre décoration
        const decorations = DecorationSet.create(doc, [decoration]);
        
        // Mettre à jour l'état du plugin avec les nouvelles décorations
        const newState = state.apply(tr.setMeta('decorations', decorations));
        
        // Dispatch la nouvelle vue
        view.dispatch(tr.setMeta('decorations', decorations));
        
        return true;
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Ctrl-h': () => this.editor.commands.highlightFirstChars(),
    }
  },
})
