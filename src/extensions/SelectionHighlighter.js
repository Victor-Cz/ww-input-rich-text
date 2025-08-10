import { Extension } from '@tiptap/core'

export const SelectionHighlighter = Extension.create({
  name: 'selectionHighlighter',

  onCreate() {
    // Ajouter un écouteur d'événement pour la sélection
    this.editor.on('selectionUpdate', ({ editor }) => {
      const { selection } = editor.state
      
      // Retirer tous les surlignages existants
      editor.commands.unsetMark('backgroundColor')
      
      // Appliquer le surlignage si il y a une sélection
      if (!selection.empty) {
        editor.commands.setMark('backgroundColor', '#ffeb3b')
      }
    })
  },
})
