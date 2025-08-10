import { Extension } from '@tiptap/core'
import { Decoration, DecorationSet } from 'prosemirror-view'
import { Plugin, PluginKey } from 'prosemirror-state'

const textSuggestionKey = new PluginKey('textSuggestion')

export const TextSuggestion = Extension.create({
  name: 'textSuggestion',

  addOptions() {
    return {
      suggestionText: null,
      position: 1,
      className: 'suggestion-label',
      color: 'var(--primary-color)',
      typeSpeed: 50, // Vitesse d'affichage en millisecondes
      enableProgressiveDisplay: true, // Activer l'affichage progressif
    }
  },

  addCommands() {
    return {
      updateSuggestion: (text, position) => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(textSuggestionKey, { 
            type: 'update', 
            text, 
            position: position || this.options.position 
          })
        }
        return true
      },

      clearSuggestion: () => ({ tr, dispatch }) => {
        if (dispatch) {
          tr.setMeta(textSuggestionKey, { type: 'clear' })
        }
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    const options = this.options

    // Fonction qui crée le widget DOM avec les options capturées
    function createWidget(text) {
      // Vérifier si suggestionText existe avant de créer le widget
      if (!text) {
        return null
      }
      
      const span = document.createElement('span')
      span.className = options.className
      span.style.cssText = `
        color: ${options.color} !important;
      `
      
      // Si l'affichage progressif est activé, afficher le texte chunk par chunk
      if (options.enableProgressiveDisplay) {
        span.textContent = ''
        
        // Diviser le texte en chunks de 5 mots en préservant les espaces
        const words = text.split(/(\s+)/).filter(word => word.length > 0)
        const chunks = []
        
        for (let i = 0; i < words.length; i += 5) {
          const chunkWords = words.slice(i, i + 5)
          const chunk = chunkWords.join(' ')
          
          // Ajouter un espace après le chunk (sauf pour le dernier)
          if (i + 5 < words.length) {
            chunks.push(chunk + ' ')
          } else {
            chunks.push(chunk)
          }
        }
        
        // Démarrer l'affichage progressif après un court délai
        setTimeout(() => {
          let index = 0
          const interval = setInterval(() => {
            if (index < chunks.length) {
              // Créer un span pour chaque chunk avec une transition
              const chunkSpan = document.createElement('span')
              chunkSpan.textContent = chunks[index]
              chunkSpan.style.cssText = `
                opacity: 0;
                transition: opacity 0.2s ease;
                display: inline-block;
                margin-right: 3px;
                margin-left: 3px;
              `
              
              span.appendChild(chunkSpan)
              
              // Déclencher la transition après un court délai
              setTimeout(() => {
                chunkSpan.style.opacity = '1'
              }, 10)
              
              index++
            } else {
              clearInterval(interval)
            }
          }, options.typeSpeed)
        }, 100) // Petit délai pour laisser le widget se rendre
      } else {
        // Affichage normal sans effet progressif
        span.textContent = text
      }
      
      return span
    }

    return [
      new Plugin({
        key: textSuggestionKey,

        state: {
          init(config, instance) {
            // 'instance.doc' est le document initial
            const widget = createWidget(options.suggestionText)
            
            // Ne créer la décoration que si le widget existe
            if (widget) {
              return DecorationSet.create(instance.doc, [
                Decoration.widget(options.position, widget),
              ])
            }
            
            // Retourner un DecorationSet vide si pas de widget
            return DecorationSet.empty
          },

          apply(tr, old) {
            const meta = tr.getMeta(textSuggestionKey)
            
            if (meta) {
              if (meta.type === 'update') {
                const widget = createWidget(meta.text)
                if (widget) {
                  return DecorationSet.create(tr.doc, [
                    Decoration.widget(meta.position, widget),
                  ])
                } else {
                  return DecorationSet.empty
                }
              } else if (meta.type === 'clear') {
                return DecorationSet.empty
              }
            }
            
            return old.map(tr.mapping, tr.doc)
          },
        },

        props: {
          decorations(state) {
            return textSuggestionKey.getState(state)
          },
        },
      }),
    ]
  },
})
