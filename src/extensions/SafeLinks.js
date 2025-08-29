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
          handleClickOn: (view, pos, event) => {
            // Si l'extension est désactivée, ne rien faire
            if (!options.enabled) {
              return false
            }

            const target = event.target

            // Vérifie si l'élément cliqué est (ou contient) un lien
            if (target && target.closest('a')) {
              console.log('SafeLinks: Clic sur un lien détecté')
              // Bloquer si l'utilisateur ne maintient PAS Cmd (Mac) ou Ctrl (Win)
              if (!(event.metaKey || event.ctrlKey)) {
                console.log('SafeLinks: Blocage du lien (pas de Cmd/Ctrl)')
                event.preventDefault()
                event.stopPropagation()
                event.stopImmediatePropagation()
                return true // Empêche le comportement par défaut (ouvrir le lien)
              } else {
                console.log('SafeLinks: Lien autorisé (Cmd/Ctrl enfoncé)')
              }
            }

            return false
          },
        },
      }),
    ]
  },
})
