import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'

const safeLinksKey = new PluginKey('safeLinks')

export const SafeLinks = Extension.create({
  name: 'safeLinks',

  addOptions() {
    return {
      enabled: true,
    }
  },

  addProseMirrorPlugins() {
    const options = this.options
    return [
      new Plugin({
        key: safeLinksKey,

        props: {
          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target

              // Vérifie si l’élément cliqué est (ou contient) un lien
              if (target && target.closest('a')) {
                // Bloquer si l’utilisateur ne maintient PAS Cmd (Mac) ou Ctrl (Win)
                if ((event.metaKey || event.ctrlKey) && options.enabled) {
                  // Permettre l'ouverture du lien avec Cmd/Ctrl
                  console.log('SafeLinks: Ouverture du lien avec Cmd/Ctrl autorisée')
                  
                  // Ouvrir le lien dans un nouvel onglet
                  const link = target.closest('a')
                  if (link && link.href) {
                    window.open(link.href, '_blank', 'noopener,noreferrer')
                  }
                  
                  return true // Empêche le comportement par défaut mais on a géré l'ouverture
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
