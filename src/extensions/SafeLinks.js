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
                if (!(event.metaKey || event.ctrlKey) && options.enabled) {
                  event.preventDefault()
                  event.stopPropagation()
                  event.stopImmediatePropagation()
                  console.log('SafeLinks: Blocage du lien (pas de Cmd/Ctrl)')
                  
                  // Force le blocage en supprimant temporairement l'attribut href
                  const link = target.closest('a')
                  if (link) {
                    const originalHref = link.getAttribute('href')
                    link.removeAttribute('href')
                    setTimeout(() => {
                      if (originalHref) {
                        link.setAttribute('href', originalHref)
                      }
                    }, 100)
                  }
                  
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
