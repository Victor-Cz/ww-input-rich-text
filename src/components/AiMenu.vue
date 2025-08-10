<template>
    <div class="bubble-menu" v-show="isVisible" :class="{ 'is-focused': isFocused }">




        <!-- Input pour les prompts AI -->
        <div class="ai-input-container" v-if="!isLoading">
            <div class="ai-input-wrapper">
                <textarea v-model="aiPrompt" :placeholder="getPromptPlaceholder()" class="ai-input"
                    @keyup.enter="submitPrompt" @focus="onFocus" @blur="onBlur" rows="3"></textarea>
                <div class="modification-type-dropdown">
                    <div class="dropdown-header" @click="toggleDropdown">
                        <div class="icon-cog" aria-hidden="true"></div>
                        <span>{{ getSelectedTypeLabel() }}</span>
                        <div class="icon-chevron-down" :class="{ 'rotated': isDropdownOpen }" aria-hidden="true"></div>
                    </div>
                    <div class="dropdown-options" v-show="isDropdownOpen">
                        <div v-for="(type, key) in modificationTypes" :key="key" class="dropdown-option"
                            @click="selectModificationType(key)">
                            {{ type.label }}
                        </div>
                    </div>
                </div>
                <div class="ai-action-buttons">
                    <button @click="rejectProposal" class="ai-reject-button" title="Rejeter la proposition"
                        :disabled="!aiResponse" v-if="aiResponse">
                        <div class="icon-x" aria-hidden="true"></div>
                        <span class="button-label">Discard</span>
                    </button>
                    <button @click="validateProposal" class="ai-validate-button" title="Valider la proposition"
                        :disabled="!aiResponse" v-if="aiResponse">
                        <div class="icon-check" aria-hidden="true"></div>
                        <span class="button-label">Apply</span>
                    </button>
                    <button @click="submitPrompt" class="ai-submit-button" title="Envoyer le prompt"
                        :disabled="isSubmitDisabled">
                        <div class="icon-arrow-sm-right" aria-hidden="true"></div>
                    </button>
                </div>
            </div>
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
        isReadOnly: {
            type: Boolean,
            default: true,
        },
        parameterAiMenuPrimaryColor: {
            type: String,
            default: '#007bff',
        },
    },
    computed: {
        primaryColor() {
            return this.parameterAiMenuPrimaryColor || '#007bff';
        },
        isSubmitDisabled() {
            if (!this.selectedModificationType) {
                return true;
            }

            const selectedType = this.modificationTypes[this.selectedModificationType];
            if (!selectedType) {
                return true;
            }

            // Si requireInput est false, le bouton peut être actif même sans input
            if (selectedType.requireInput === false) {
                return false;
            }

            // Par défaut, requireInput est true, donc l'input est requis
            return !this.aiPrompt.trim();
        },
    },
    data() {
        return {
            aiPrompt: '',
            aiResponse: '',
            isVisible: false,
            isFocused: false,
            storedSelection: null,
            storedSelectionRange: null,
            isLoading: false,
            selectedModificationType: null,
            isDropdownOpen: false, // Pour contrôler l'ouverture/fermeture de la dropdown
            // Configuration des types de modifications
            modificationTypes: {
                modify: {
                    label: 'Modifier',
                    description: 'Améliorer ou corriger le texte sélectionné',
                    defaultPrompt: 'Améliore ce texte en gardant le même sens',
                    action: 'replace',
                    requireInput: true
                },
                humanize: {
                    label: 'Humaniser',
                    description: 'Rendre le texte plus naturel et humain',
                    defaultPrompt: 'Rends ce texte plus naturel et humain',
                    action: 'replace',
                    requireInput: false
                },
                extend: {
                    label: 'Rallonger',
                    description: 'Développer et enrichir le contenu',
                    defaultPrompt: 'Développe et enrichis ce texte',
                    action: 'replace',
                    requireInput: true
                },
                shorten: {
                    label: 'Raccourcir',
                    description: 'Condense ce texte en gardant l\'essentiel',
                    defaultPrompt: 'Condense ce texte en gardant l\'essentiel',
                    action: 'replace',
                    requireInput: true
                },
                formalize: {
                    label: 'Formaliser',
                    description: 'Rendre le texte plus formel et professionnel',
                    defaultPrompt: 'Rends ce texte plus formel et professionnel',
                    action: 'replace',
                    requireInput: true
                },
                simplify: {
                    label: 'Simplifier',
                    description: 'Simplifie ce texte pour le rendre plus accessible',
                    defaultPrompt: 'Simplifie ce texte pour le rendre plus accessible',
                    action: 'replace',
                    requireInput: true
                },
                translate: {
                    label: 'Traduire',
                    description: 'Traduire dans une autre langue',
                    defaultPrompt: 'Traduis ce texte en français',
                    action: 'replace',
                    requireInput: true
                },
                custom: {
                    label: 'Personnalisé',
                    description: 'Prompt personnalisé',
                    defaultPrompt: '',
                    action: 'replace',
                    requireInput: true
                }
            }
        };
    },
    mounted() {
        // Écouter les clics en dehors du menu pour le masquer
        document.addEventListener('mousedown', this.onClickOutside);
    },
    beforeUnmount() {
        // Nettoyer les écouteurs
        document.removeEventListener('mousedown', this.onClickOutside);

        this.storedSelection = null;
        this.storedSelectionRange = null;
        this.richEditor.commands.clearHighlight();
        this.richEditor.commands.clearSuggestion();
    },
    methods: {
        toggleDropdown() {
            this.isDropdownOpen = !this.isDropdownOpen;
        },
        submitPrompt() {
            if (this.isSubmitDisabled) {
                return;
            }

            this.isLoading = true;

            const finalPrompt = this.buildFinalPrompt();
            const action = this.modificationTypes[this.selectedModificationType].action;
            console.log('AI Prompt submitted:', {
                prompt: finalPrompt,
                modificationType: this.selectedModificationType,
                action: action,
                selectedText: this.storedSelection,
                selectionRange: this.storedSelectionRange,
                timestamp: new Date().toISOString()
            });

            // Émettre l'événement vers le composant parent
            this.$emit('ai-prompt', {
                prompt: finalPrompt,
                modificationType: this.selectedModificationType,
                action: action,
                selectedText: this.storedSelection,
                timestamp: new Date().toISOString()
            });

            this.aiPrompt = '';
        },
        setResponse(response) {
            this.isLoading = false;
            if (!response) {
                console.log('AI Response received but no content to apply');
                return;
            }

            // Utiliser TextSuggestion pour afficher la proposition dans l'éditeur
            this.displaySuggestion(response);
            console.log('AI Response displayed as suggestion:', response);
        },

        displaySuggestion(response) {
            // Déterminer la position de la suggestion selon la méthode et la sélection
            const position = this.getSuggestionPosition();

            // Formater le texte de la suggestion avec des espaces intelligents
            const formattedResponse = this.formatSuggestionText(response, position);

            // Utiliser la commande updateSuggestion pour afficher la proposition
            this.richEditor.commands.updateSuggestion(formattedResponse, position);

            const action = this.modificationTypes[this.selectedModificationType]?.action;
            if (action === 'replace' && this.storedSelectionRange) {
                this.richEditor.commands.setStrike(this.storedSelectionRange.from, this.storedSelectionRange.to);
            } else if (action === 'replace-all') {
                this.richEditor.commands.setStrike(0, this.richEditor.state.doc.content.size);
            }

            // Stocker la réponse pour validation ultérieure et s'assurer que Vue prend en compte la mise à jour
            this.$nextTick(() => {
                this.aiResponse = response;
                console.log('aiResponse set to:', this.aiResponse);
            });
        },

        getSuggestionPosition() {
            const action = this.modificationTypes[this.selectedModificationType]?.action;

            if (action === 'replace' && this.storedSelectionRange) {
                // Pour le remplacement, placer après la sélection
                return this.storedSelectionRange.to;
            } else if (action === 'insert-before' && this.storedSelectionRange) {
                // Pour l'insertion avant, placer avant la sélection
                return this.storedSelectionRange.from;
            } else if (action === 'insert-after' && this.storedSelectionRange) {
                // Pour l'insertion après, placer après la sélection
                return this.storedSelectionRange.to;
            } else if (action === 'replace-all') {
                // Pour le remplacement global, placer à la fin
                return this.richEditor.state.doc.content.size;
            } else if (action === 'append') {
                // Pour l'ajout, placer à la fin
                return this.richEditor.state.doc.content.size;
            } else if (action === 'prepend') {
                // Pour l'ajout au début, placer au début
                return 0;
            } else {
                // Par défaut, placer après la sélection ou à la fin
                return this.storedSelectionRange?.to || this.richEditor.state.doc.content.size;
            }
        },

        validateProposal() {
            // Effacer la suggestion
            this.richEditor.commands.clearSuggestion();
            this.richEditor.commands.clearHighlight();
            this.richEditor.commands.clearStrike();

            // Appliquer la proposition à l'éditeur
            this.applyResponse(this.aiResponse);

            // Réinitialiser et fermer le menu
            this.resetProposal();
            this.closeMenu();
            console.log('AI Proposal validated and applied:', this.aiResponse);
        },
        rejectProposal() {
            // Rejeter la proposition et fermer le menu
            this.richEditor.commands.clearSuggestion();
            this.richEditor.commands.clearHighlight();
            this.richEditor.commands.clearStrike();

            this.resetProposal();
            this.closeMenu();
            console.log('AI Proposal rejected');
        },
        resetProposal() {
            this.aiResponse = '';
        },
        closeMenu() {
            this.isVisible = false;
            this.isFocused = false;
            this.storedSelection = null;
            this.storedSelectionRange = null;
            this.selectedModificationType = null;
            this.isDropdownOpen = false; // Fermer la dropdown

            // Nettoyer le surlignage, la suggestion et le Strike lors de la fermeture du menu
            this.richEditor.commands.clearHighlight();
            this.richEditor.commands.clearSuggestion();
            this.richEditor.commands.clearStrike();
        },
        applyResponse(response) {
            const action = this.modificationTypes[this.selectedModificationType].action;
            switch (action) {
                case 'replace': this.replaceSelection(response); break;
                case 'insert-before': this.insertBeforeSelection(response); break;
                case 'insert-after': this.insertAfterSelection(response); break;
                case 'replace-all': this.replaceAllText(response); break;
                case 'append': this.appendToEnd(response); break;
                case 'prepend': this.prependToBeginning(response); break;
                default: console.warn('Action non reconnue:', action); this.replaceSelection(response);
            }
        },
        openWithType(typeKey) {
            this.selectedModificationType = typeKey;
            this.isVisible = true;
            this.isFocused = true;

            // Enregistrer la sélection initiale au montage
            const { from, to } = this.richEditor.state.selection;

            // Stocker le texte sélectionné et le surligner une seule fois
            if (from !== to) {
                this.storedSelection = this.richEditor.state.doc.textBetween(from, to);
                this.storedSelectionRange = { from, to };
                console.log('AiMenu - Sélection enregistrée et surlignée:', { from, to });
                this.richEditor.commands.highlightRange(from, to);
            }
        },
        selectModificationType(typeKey) {
            this.selectedModificationType = typeKey;
            this.isDropdownOpen = false; // Fermer la dropdown après sélection
            this.isVisible = true;
            this.isFocused = true;
        },

        getPromptPlaceholder() {
            if (this.selectedModificationType && this.modificationTypes[this.selectedModificationType]) {
                return this.modificationTypes[this.selectedModificationType].defaultPrompt;
            }
            return 'Entrez votre prompt...';
        },

        buildFinalPrompt() {
            if (this.selectedModificationType === 'custom') {
                return this.aiPrompt;
            }
            const basePrompt = this.modificationTypes[this.selectedModificationType].defaultPrompt;
            return this.aiPrompt ? `${basePrompt} : ${this.aiPrompt}` : basePrompt;
        },

        replaceSelection(text) {
            if (this.storedSelectionRange) {
                const { from, to } = this.storedSelectionRange;
                this.richEditor.chain().focus().deleteRange({ from, to }).insertContent(text).run();
            }
        },

        insertBeforeSelection(text) {
            if (this.storedSelectionRange) {
                const { from } = this.storedSelectionRange;
                const formattedText = this.formatTextWithSpaces(text, 'before', from);
                this.richEditor.chain().focus().insertContentAt(from, formattedText).run();
            }
        },

        insertAfterSelection(text) {
            if (this.storedSelectionRange) {
                const { to } = this.storedSelectionRange;
                const formattedText = this.formatTextWithSpaces(text, 'after', to);
                this.richEditor.chain().focus().insertContentAt(to, formattedText).run();
            }
        },

        replaceAllText(text) {
            this.richEditor.chain().focus().setContent(text).run();
        },

        appendToEnd(text) {
            const docSize = this.richEditor.state.doc.content.size;
            const formattedText = this.formatTextWithSpaces(text, 'append', docSize);
            this.richEditor.chain().focus().insertContentAt(docSize, formattedText).run();
        },

        prependToBeginning(text) {
            const formattedText = this.formatTextWithSpaces(text, 'prepend', 0);
            this.richEditor.chain().focus().insertContentAt(0, formattedText).run();
        },

        // Méthode pour formater le texte avec des espaces intelligents
        formatTextWithSpaces(text, position, insertPos) {
            if (!text || typeof text !== 'string') return text;

            let formattedText = text.trim(); // Supprimer les espaces en début/fin

            // Obtenir le contexte autour de la position d'insertion
            const doc = this.richEditor.state.doc;
            const beforeChar = insertPos > 0 ? doc.textBetween(insertPos - 1, insertPos) : '';
            const afterChar = insertPos < doc.content.size ? doc.textBetween(insertPos, insertPos + 1) : '';

            switch (position) {
                case 'before':
                    // Insertion avant la sélection
                    if (beforeChar && !this.isWhitespace(beforeChar) && !this.isPunctuation(beforeChar)) {
                        formattedText += ' '; // Ajouter un espace si pas d'espace avant
                    }
                    if (afterChar && !this.isWhitespace(afterChar) && !this.isPunctuation(afterChar)) {
                        formattedText = ' ' + formattedText; // Ajouter un espace si pas d'espace après
                    }
                    break;

                case 'after':
                    // Insertion après la sélection
                    if (beforeChar && !this.isWhitespace(beforeChar) && !this.isPunctuation(beforeChar)) {
                        formattedText = ' ' + formattedText; // Ajouter un espace si pas d'espace avant
                    }
                    if (afterChar && !this.isWhitespace(afterChar) && !this.isPunctuation(afterChar)) {
                        formattedText += ' '; // Ajouter un espace si pas d'espace après
                    }
                    break;

                case 'prepend':
                    // Insertion au début du document
                    if (afterChar && !this.isWhitespace(afterChar) && !this.isPunctuation(afterChar)) {
                        formattedText += ' '; // Ajouter un espace si pas d'espace après
                    }
                    break;

                case 'append':
                    // Insertion à la fin du document
                    if (beforeChar && !this.isWhitespace(beforeChar) && !this.isPunctuation(beforeChar)) {
                        formattedText = ' ' + formattedText; // Ajouter un espace si pas d'espace avant
                    }
                    break;
            }

            return formattedText;
        },

        // Méthode pour formater le texte de suggestion avec des espaces intelligents
        formatSuggestionText(text, position) {
            if (!text || typeof text !== 'string') return text;

            let formattedText = text.trim(); // Supprimer les espaces en début/fin

            // Obtenir le contexte autour de la position d'insertion
            const doc = this.richEditor.state.doc;
            const beforeChar = position > 0 ? doc.textBetween(position - 1, position) : '';
            const afterChar = position < doc.content.size ? doc.textBetween(position, position + 1) : '';

            // Ajouter des espaces selon le contexte
            if (beforeChar && !this.isWhitespace(beforeChar) && !this.isPunctuation(beforeChar)) {
                formattedText = ' ' + formattedText; // Espace avant si nécessaire
            }
            if (afterChar && !this.isWhitespace(afterChar) && !this.isPunctuation(afterChar)) {
                formattedText += ' '; // Espace après si nécessaire
            }

            return formattedText;
        },

        // Méthodes utilitaires pour analyser le contexte
        isWhitespace(char) {
            return /\s/.test(char);
        },

        isPunctuation(char) {
            return /[.,;:!?()[\]{}"'`]/.test(char);
        },

        onClickOutside(event) {
            // Ne fermer le menu que s'il est déjà ouvert et visible
            if (!this.isVisible) {
                return;
            }

            // Vérifier si le clic est en dehors du menu AI
            const aiMenuElement = this.$el;
            if (aiMenuElement && !aiMenuElement.contains(event.target)) {
                // Fermer le menu si on clique en dehors
                this.closeMenu();
            }
        },

        getSelectedTypeLabel() {
            if (this.selectedModificationType && this.modificationTypes[this.selectedModificationType]) {
                return this.modificationTypes[this.selectedModificationType].label;
            }
            return 'Choisir un type';
        },
    },
};
</script>

<style scoped>
.bubble-menu {
    position: relative;
    margin-top: 16px;
    margin-bottom: 32px;
    background: white;
    border: 1px solid var(--primary-color);
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 300px;
    z-index: 1000;
}

.bubble-menu.is-focused {
    border-color: var(--primary-color);
    box-shadow: 0 4px 16px var(--primary-color-40);
}

.modification-type-dropdown {
    position: absolute;
    bottom: 8px;
    left: 8px;
    z-index: 1001;
}

.dropdown-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 8px;
    border-radius: 8px;
    font-size: 13px;
    color: #495057;
    background: #f8f9fa;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
    width: fit-content;
}

.dropdown-header:hover {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 2px var(--primary-color-1A);
}

.dropdown-header div {
    transition: transform 0.2s;
}

.dropdown-header div.rotated {
    transform: rotate(180deg);
}

.dropdown-options {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border: 1px solid #dee2e6;
    border-radius: 12px;
    background: white;
    overflow: hidden;
    z-index: 1000;
    padding: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    min-width: 180px;
    min-height: 100px;
    background: white;
}

.dropdown-option {
    padding: 5px 8px;
    border-radius: 8px;
    font-size: 14px;
    color: #495057;
    background: white;
    text-align: left;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
}

.dropdown-option:hover {
    background: rgb(238, 238, 238);
}

.dropdown-option:focus {
    background: rgb(238, 238, 238);
    box-shadow: 0 0 0 3px var(--primary-color-1A);
}

.ai-input-container {
    display: flex;
    width: 100%;
    height: 100%;
}

.ai-input-wrapper {
    position: relative;
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
}

.ai-input {
    flex: 1;
    padding: 12px 12px 48px 12px;
    border-radius: 12px;
    font-size: 14px;
    color: #495057;
    text-align: left;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    resize: none;
    vertical-align: top;
    border: none;
    background: none;
    outline: none;
    transition: outline 0.2s;
}

.ai-input:focus {
    outline: 2px solid var(--primary-color);
    border: none;
}

.ai-submit-button {
    position: absolute;
    bottom: 8px;
    right: 8px;
    padding: 8px 8px;
    background: var(--primary-color);
    color: white;
    border: none;
    border-radius: 9px;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 40px;
    height: 32px;
    z-index: 1001;
}

.ai-submit-button:disabled {
    background: var(--primary-color-inactive);
    cursor: not-allowed;
}

.ai-submit-button:hover {
    background: var(--primary-color-hover);
}

.ai-submit-button:active {
    background: var(--primary-color-active);
}

/* Conteneur des boutons d'action */
.ai-action-buttons {
    position: absolute;
    bottom: 8px;
    right: 8px;
    display: flex;
    gap: 6px;
    align-items: center;
    z-index: 1001;
}

/* Boutons de validation et rejet */
.ai-validate-button,
.ai-reject-button {
    padding: 8px 12px;
    border: none;
    border-radius: 9px;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    min-width: 70px;
    height: 32px;
    font-size: 13px;
    font-weight: 500;
}

.button-label {
    white-space: nowrap;
    user-select: none;
}

.ai-validate-button {
    background: var(--primary-color);
    color: white;
}

.ai-validate-button:hover:not(:disabled) {
    background: var(--primary-color-hover);
}

.ai-validate-button:active:not(:disabled) {
    background: var(--primary-color-active);
}

.ai-validate-button:disabled {
    background: var(--primary-color-inactive);
    cursor: not-allowed;
    opacity: 0.6;
}

.ai-reject-button {
    background: #f8f9fa;
    color: #495057;
}

.ai-reject-button:hover:not(:disabled) {
    background: #e9ecef;
}

.ai-reject-button:active:not(:disabled) {
    background: #dee2e6;
}

.ai-reject-button:disabled {
    background: #f8f9fa;
    color: #adb5bd;
    cursor: not-allowed;
    opacity: 0.6;
}

/* Ajuster la position du bouton submit */
.ai-submit-button {
    position: static;
    margin-left: 0;
}

/* État de chargement */
.ai-loading-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 20px;
}

.ai-loading-spinner {
    width: 24px;
    height: 24px;
    border: 3px solid #e5e7eb;
    border-top: 3px solid var(--primary-color);
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.ai-loading-text {
    font-size: 14px;
    color: #6c757d;
    font-weight: 500;
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}
</style>