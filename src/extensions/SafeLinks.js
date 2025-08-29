import { Extension } from '@tiptap/core'

export const SafeLinks = Extension.create({
  name: 'safeLinks',

  addProseMirrorPlugins() {
    return [
      new this.editor.view.state.plugins.constructor({
        props: {
          handleDOMEvents: {
            click: (view, event) => {
              // Récupère la configuration depuis le composant parent
              const component = this.editor.view.dom.closest('.ww-rich-text')?.__vueParentComponent?.ctx
              const safeLinksEnabled = component?.content?.a?.enableSafeLinks !== false
              
              // Si les safelinks sont désactivés, ne rien faire
              if (!safeLinksEnabled) {
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
