import { Extension } from '@tiptap/core'

export const SafeLinks = Extension.create({
  name: 'safeLinks',

  addOptions() {
    return {
      enabled: true,
    }
  },

  addProseMirrorPlugins() {
    return [
      new this.editor.view.state.plugins.constructor({
        props: {
          handleDOMEvents: {
            click: (view, event) => {
              // Si l'extension est désactivée, ne rien faire
              if (!this.options.enabled) {
                return false
              }

              const target = event.target

              // Vérifie si l'élément cliqué est (ou contient) un lien
              if (target && target.closest('a')) {
                // Bloquer si l'utilisateur ne maintient PAS Cmd (Mac) ou Ctrl (Win)
                if (!(event.metaKey || event.ctrlKey)) {
                  event.preventDefault()
                  return true // Empêche le comportement par défaut (ouvrir le lien)
                }
              }

              return false
            },
          },
        },
      }),
    ]
  },
})
