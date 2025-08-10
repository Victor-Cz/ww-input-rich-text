<template>
    <div 
        class="bubble-menu" 
        v-show="isVisible"
        :class="{ 'is-focused': isFocused }"
    >
        <!-- Affichage du texte sélectionné -->
        <div v-if="storedSelection" class="selected-text-display">
            <div class="selected-text-label">Texte sélectionné :</div>
            <div class="selected-text-content">{{ storedSelection }}</div>
        </div>
        
        <!-- Sélecteur de type de modification -->
        <div class="modification-type-selector" v-if="!isLoading">
            <label class="type-label">Type de modification :</label>
            <select v-model="selectedModificationType" class="type-select">
                <option value="modify">Modifier</option>
                <option value="humanize">Humaniser</option>
                <option value="extend">Rallonger</option>
                <option value="shorten">Raccourcir</option>
                <option value="formalize">Formaliser</option>
                <option value="simplify">Simplifier</option>
                <option value="translate">Traduire</option>
                <option value="custom">Personnalisé</option>
            </select>
        </div>

        <!-- Sélecteur d'action pour le type choisi -->
        <div class="action-selector" v-if="!isLoading && selectedModificationType">
            <label class="action-label">Action :</label>
            <select v-model="selectedAction" class="action-select">
                <option value="replace">Remplacer la sélection</option>
                <option value="insert-before">Insérer avant</option>
                <option value="insert-after">Insérer après</option>
                <option value="replace-all">Remplacer tout le texte</option>
                <option value="append">Ajouter à la fin</option>
                <option value="prepend">Ajouter au début</option>
            </select>
        </div>

        <!-- Input pour les prompts AI -->
        <div class="ai-input-container" v-if="!isLoading && selectedModificationType && selectedAction">
            <input
                v-model="aiPrompt"
                type="text"
                :placeholder="getPromptPlaceholder()"
                class="ai-input"
                @keyup.enter="submitPrompt"
                @focus="onFocus"
                @blur="onBlur"
            />
            <button
                @click="submitPrompt"
                class="ai-submit-button"
                title="Envoyer le prompt"
            >
                <i class="fas fa-magic"></i>
            </button>
        </div>

        <!-- État de chargement -->
        <div class="ai-loading-container" v-if="isLoading">
            <div class="ai-loading-spinner"></div>
            <div class="ai-loading-text">Traitement en cours...</div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'AiMenu',
    props: {
        richEditor: {
            type: Object,
            required: true,
        },
    },
    data() {
        return {
            aiPrompt: '',
            isVisible: false,
            isFocused: false,
            hasSelection: false,
            storedSelection: null,
            storedSelectionRange: null, // Store selection coordinates
            isLoading: false,
            selectedModificationType: null,
            selectedAction: null,
            // Configuration des types de modifications
            modificationTypes: {
                modify: {
                    label: 'Modifier',
                    description: 'Améliorer ou corriger le texte sélectionné',
                    defaultPrompt: 'Améliore ce texte en gardant le même sens'
                },
                humanize: {
                    label: 'Humaniser',
                    description: 'Rendre le texte plus naturel et humain',
                    defaultPrompt: 'Rends ce texte plus naturel et humain'
                },
                extend: {
                    label: 'Rallonger',
                    description: 'Développer et enrichir le contenu',
                    defaultPrompt: 'Développe et enrichis ce texte'
                },
                shorten: {
                    label: 'Raccourcir',
                    description: 'Condenser le texte en gardant l\'essentiel',
                    defaultPrompt: 'Condense ce texte en gardant l\'essentiel'
                },
                formalize: {
                    label: 'Formaliser',
                    description: 'Rendre le texte plus formel et professionnel',
                    defaultPrompt: 'Rends ce texte plus formel et professionnel'
                },
                simplify: {
                    label: 'Simplifier',
                    description: 'Simplifier le langage et la structure',
                    defaultPrompt: 'Simplifie ce texte pour le rendre plus accessible'
                },
                translate: {
                    label: 'Traduire',
                    description: 'Traduire dans une autre langue',
                    defaultPrompt: 'Traduis ce texte en français'
                },
                custom: {
                    label: 'Personnalisé',
                    description: 'Prompt personnalisé',
                    defaultPrompt: ''
                }
            }
        };
    },
    mounted() {
        // Écouter les changements de sélection dans l'éditeur
        this.richEditor.on('selectionUpdate', this.onSelectionUpdate);
        
        // Écouter les clics en dehors du menu pour le masquer
        document.addEventListener('click', this.onClickOutside);
    },
    beforeUnmount() {
        // Nettoyer les écouteurs
        this.richEditor.off('selectionUpdate', this.onSelectionUpdate);
        document.removeEventListener('click', this.onClickOutside);
    },
    methods: {
        onSelectionUpdate() {
            const { from, to } = this.richEditor.state.selection;
            this.hasSelection = from !== to;
            
            // Stocker le texte sélectionné quand il y en a un
            if (this.hasSelection) {
                this.storedSelection = this.richEditor.state.doc.textBetween(from, to);
                this.storedSelectionRange = { from, to }; // Store selection coordinates
            } else {
                this.storedSelection = null;
                this.storedSelectionRange = null;
            }
            
            this.updateVisibility();
        },
        
        onFocus() {
            this.isFocused = true;
            this.updateVisibility();
            
            // Ajouter une classe au body pour maintenir la sélection
            if (this.hasSelection) {
                document.body.classList.add('ai-menu-focused');
            }
        },
        
        onBlur() {
            this.isFocused = false;
            this.updateVisibility();
            
            // Retirer la classe du body
            document.body.classList.remove('ai-menu-focused');
        },
        
        onClickOutside(event) {
            // Vérifier si le clic est en dehors du menu
            if (!this.$el.contains(event.target)) {
                this.isFocused = false;
                this.updateVisibility();
                document.body.classList.remove('ai-menu-focused');
            }
        },
        
        updateVisibility() {
            // Le menu est visible si du texte est sélectionné OU si le menu est focus
            this.isVisible = this.hasSelection || this.isFocused;
        },
        
        setLink() {
            const url = window.prompt('URL:')
            if (url) {
                this.richEditor.chain().focus().setLink({ href: url }).run()
            }
        },
        
        submitPrompt() {
            if (this.aiPrompt.trim() && this.selectedModificationType && this.selectedAction) {
                // Activer l'état de chargement
                this.isLoading = true;
                
                // Stocker la sélection actuelle pour pouvoir la modifier plus tard
                const { from, to } = this.richEditor.state.selection;
                if (from !== to) {
                    this.storedSelectionRange = { from, to };
                }
                
                // Construire le prompt final avec le type de modification
                const finalPrompt = this.buildFinalPrompt();
                
                // Log pour debug
                console.log('AI Prompt submitted:', {
                    prompt: finalPrompt,
                    modificationType: this.selectedModificationType,
                    action: this.selectedAction,
                    selectedText: this.storedSelection,
                    selectionRange: this.storedSelectionRange,
                    timestamp: new Date().toISOString()
                });
                
                // Déclencher l'événement WeWeb pour le prompt AI
                this.$wwTriggerEvent('ai-prompt', {
                    prompt: finalPrompt,
                    modificationType: this.selectedModificationType,
                    action: this.selectedAction,
                    selectedText: this.storedSelection,
                    timestamp: new Date().toISOString()
                });
                
                // Vider l'input
                this.aiPrompt = '';
            }
        },

        // Construire le prompt final en combinant le type et le prompt utilisateur
        buildFinalPrompt() {
            const typeConfig = this.modificationTypes[this.selectedModificationType];
            const userPrompt = this.aiPrompt.trim();
            
            if (this.selectedModificationType === 'custom') {
                return userPrompt;
            }
            
            // Combiner le prompt par défaut avec le prompt utilisateur
            if (userPrompt) {
                return `${typeConfig.defaultPrompt}. ${userPrompt}`;
            }
            
            return typeConfig.defaultPrompt;
        },

        // Méthode appelée par l'action WeWeb setResponse
        setResponse(response) {
            this.isLoading = false;
            
            if (!response) {
                console.log('AI Response received but no content to apply');
                return;
            }
            
            // Appliquer la réponse selon l'action sélectionnée
            this.applyResponse(response);
            
            // Nettoyer la sélection stockée
            this.storedSelection = null;
            this.storedSelectionRange = null;
            this.hasSelection = false;
            
            // Mettre à jour la visibilité
            this.updateVisibility();
            
            // Réinitialiser les sélecteurs
            this.resetSelectors();

            console.log('AI Response applied to editor:', response);
        },

        // Appliquer la réponse selon l'action sélectionnée
        applyResponse(response) {
            const action = this.selectedAction;
            
            switch (action) {
                case 'replace':
                    this.replaceSelection(response);
                    break;
                case 'insert-before':
                    this.insertBeforeSelection(response);
                    break;
                case 'insert-after':
                    this.insertAfterSelection(response);
                    break;
                case 'replace-all':
                    this.replaceAllText(response);
                    break;
                case 'append':
                    this.appendToEnd(response);
                    break;
                case 'prepend':
                    this.prependToBeginning(response);
                    break;
                default:
                    console.warn('Action non reconnue:', action);
                    this.replaceSelection(response); // Fallback
            }
        },

        // Remplacer la sélection
        replaceSelection(response) {
            if (this.storedSelectionRange) {
                const { from, to } = this.storedSelectionRange;
                this.richEditor.chain()
                    .focus()
                    .setTextSelection({ from, to })
                    .deleteSelection()
                    .insertContent(response)
                    .run();
            }
        },

        // Insérer avant la sélection
        insertBeforeSelection(response) {
            if (this.storedSelectionRange) {
                const { from } = this.storedSelectionRange;
                this.richEditor.chain()
                    .focus()
                    .setTextSelection(from)
                    .insertContent(response + ' ')
                    .run();
            }
        },

        // Insérer après la sélection
        insertAfterSelection(response) {
            if (this.storedSelectionRange) {
                const { to } = this.storedSelectionRange;
                this.richEditor.chain()
                    .focus()
                    .setTextSelection(to)
                    .insertContent(' ' + response)
                    .run();
            }
        },

        // Remplacer tout le texte
        replaceAllText(response) {
            this.richEditor.chain()
                .focus()
                .selectAll()
                .deleteSelection()
                .insertContent(response)
                .run();
        },

        // Ajouter à la fin
        appendToEnd(response) {
            const docSize = this.richEditor.state.doc.content.size;
            this.richEditor.chain()
                .focus()
                .setTextSelection(docSize)
                .insertContent('\n' + response)
                .run();
        },

        // Ajouter au début
        prependToBeginning(response) {
            this.richEditor.chain()
                .focus()
                .setTextSelection(0)
                .insertContent(response + '\n')
                .run();
        },

        // Réinitialiser les sélecteurs
        resetSelectors() {
            this.selectedModificationType = null;
            this.selectedAction = null;
            this.aiPrompt = '';
        },

        getPromptPlaceholder() {
            if (this.selectedModificationType === 'custom') {
                return 'Entrez votre prompt personnalisé...';
            }
            return `Entrez votre prompt pour ${this.selectedModificationType}...`;
        }
    },
};
</script>

<style lang="scss" scoped>
.bubble-menu {
    display: flex;
    flex-direction: column;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    padding: 12px;
    gap: 8px;
    z-index: 1000;
    min-width: 320px;
    max-width: 400px;
    transition: opacity 0.2s ease, visibility 0.2s ease;
    
    &:not(.is-focused) {
        opacity: 0.9;
    }
    
    &.is-focused {
        opacity: 1;
        border-color: #3b82f6;
        box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.1), 0 2px 4px -1px rgba(59, 130, 246, 0.06);
    }
}

// Affichage du texte sélectionné
.selected-text-display {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 8px;
    margin-bottom: 4px;
}

.selected-text-label {
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
}

.selected-text-content {
    font-size: 14px;
    color: #334155;
    line-height: 1.4;
    background: #f1f5f9;
    padding: 6px 8px;
    border-radius: 4px;
    border-left: 3px solid #3b82f6;
    max-height: 80px;
    overflow-y: auto;
    word-break: break-word;
}

// Styles globaux pour le body quand le menu AI est focalisé
:global(body.ai-menu-focused) {
    .ww-rich-text .ProseMirror {
        ::selection {
            background-color: rgba(59, 130, 246, 0.3) !important;
        }
        
        ::-moz-selection {
            background-color: rgba(59, 130, 246, 0.3) !important;
        }
    }
}

.modification-type-selector,
.action-selector {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
}

.type-label,
.action-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 2px;
}

.type-select,
.action-select {
    width: 100%;
    padding: 8px 10px;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 13px;
    outline: none;
    transition: all 0.2s ease;
    background: white;
    color: #374151;
    
    &:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        transform: translateY(-1px);
    }
    
    &:hover {
        border-color: #9ca3af;
    }
    
    option {
        padding: 8px;
        font-size: 13px;
    }
}

.ai-input-container {
    display: flex;
    gap: 4px;
    align-items: center;
}

.ai-input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid #d1d5db;
    border-radius: 4px;
    font-size: 14px;
    outline: none;
    transition: border-color 0.2s ease;
    
    &:focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    
    &::placeholder {
        color: #9ca3af;
    }
}

.ai-submit-button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: #3b82f6;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: white;
    
    &:hover {
        background: #2563eb;
        transform: translateY(-1px);
    }
    
    &:active {
        transform: translateY(0);
    }
    
    i {
        font-size: 14px;
    }
}

// État de chargement
.ai-loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 16px;
}

.ai-loading-spinner {
    width: 24px;
    height: 24px;
    border: 2px solid #e2e8f0;
    border-top: 2px solid #3b82f6;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.ai-loading-text {
    font-size: 14px;
    color: #64748b;
    font-weight: 500;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.separator {
    height: 1px;
    background: #e5e7eb;
    margin: 0 -4px;
}

.bubble-menu__button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    background: transparent;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    color: #64748b;

    &:hover {
        background: #f1f5f9;
        color: #334155;
    }

    &.is-active {
        background: #3b82f6;
        color: white;
    }

    i {
        font-size: 14px;
    }
}
</style>