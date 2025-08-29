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

  // Pas de classe par défaut - on la gère dynamiquement

  addProseMirrorPlugins() {
    const options = this.options
    return [
      new Plugin({
        key: safeLinksKey,

        props: {
          handleDOMEvents: {
            click: (view, event) => {
              const target = event.target

              // Vérifie si l'élément cliqué est (ou contient) un lien
              if (target && target.closest('a')) {
                const link = target.closest('a')
                
                // Bloquer si l'utilisateur ne maintient PAS Cmd (Mac) ou Ctrl (Win)
                if (!(event.metaKey || event.ctrlKey) && options.enabled) {
                  event.preventDefault()
                  event.stopPropagation()
                  console.log('SafeLinks: Blocage du lien (pas de Cmd/Ctrl)')
                  return true // Empêche le comportement par défaut (ouvrir le lien)
                } else if (event.metaKey || event.ctrlKey) {
                  // Permettre l'ouverture du lien avec Cmd/Ctrl
                  console.log('SafeLinks: Ouverture du lien avec Cmd/Ctrl autorisée')
                  
                  // Ouvrir le lien dans un nouvel onglet
                  if (link && link.href) {
                    window.open(link.href, '_blank', 'noopener,noreferrer')
                  }
                  
                  return true // Empêche le comportement par défaut mais on a géré l'ouverture
                }
              }

              return false
            },
            
            // Gestionnaire pour le survol des liens
            mouseover: (view, event) => {
              const target = event.target
              if (target && target.closest('a')) {
                const link = target.closest('a')
                
                // Vérifier si une touche modifiée est pressée
                const hasModifier = view.state.applying || 
                  (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)
                
                if (!hasModifier) {
                  // Pas de modificateur = lien bloqué = curseur default
                  link.classList.add('safe-link')
                } else {
                  // Modificateur pressé = lien ouvert = curseur pointer
                  link.classList.remove('safe-link')
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
