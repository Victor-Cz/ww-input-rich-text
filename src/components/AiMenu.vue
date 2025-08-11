<template>
    <div class="bubble-menu" v-show="isMenuVisible" :class="{ 'is-focused': isFocused, 'force-display': forceDisplay }">
        <!-- Input pour les prompts AI -->
        <div class="ai-input-container" v-if="!isLoading && Object.keys(modificationTypes).length > 0">
            <div class="ai-input-wrapper">
                <textarea v-model="aiPrompt" :placeholder="placeholders.promptInput" class="ai-input"
                    @keyup.enter="submitPrompt" @focus="onFocus" @blur="onBlur" rows="3"
                    :title="placeholders.promptInputTooltip"></textarea>
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
                    <button @click="rejectProposal" class="ai-reject-button" :title="placeholders.cancelButtonTooltip"
                        :disabled="!aiResponse" v-if="aiResponse">
                        <div class="icon-x" aria-hidden="true"></div>
                        <span class="button-label">{{ placeholders.cancelButton }}</span>
                    </button>
                    <button @click="validateProposal" class="ai-validate-button" :title="placeholders.submitButtonTooltip"
                        :disabled="!aiResponse" v-if="aiResponse">
                        <div class="icon-check" aria-hidden="true"></div>
                        <span class="button-label">{{ placeholders.submitButton }}</span>
                    </button>
                    <button @click="submitPrompt" class="ai-submit-button"
                        :disabled="isSubmitDisabled">
                        <div class="icon-arrow-sm-right" aria-hidden="true"></div>
                    </button>
                </div>
            </div>
        </div>

        <!-- Message quand aucun type n'est configuré -->
        <div class="ai-no-types-message" v-if="Object.keys(modificationTypes).length === 0">
            <div class="no-types-icon">⚠️</div>
            <div class="no-types-text">No modification types configured. Please configure at least one type in the settings.</div>
        </div>

        <!-- État de chargement -->
        <div class="ai-loading-container" v-if="isLoading">
            <div class="ai-loading-spinner"></div>
                            <div class="ai-loading-text">{{ placeholders.processing }}</div>
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
        // Nouvelle propriété pour les types de modification personnalisés
        customModificationTypes: {
            type: Array,
            default: () => [],
        },
        // Nouvelle propriété pour les placeholders personnalisés
        placeholders: {
            type: Object,
            default: () => ({
                promptInput: 'Enter your prompt...',
                processing: 'Processing...',
                submitButton: 'Apply',
                cancelButton: 'Cancel',
                promptInputTooltip: 'Enter your instructions for the AI',
                submitButtonTooltip: 'Apply the AI modification',
                cancelButtonTooltip: 'Cancel the current operation',
                chooseTypePlaceholder: 'Select a type'
            }),
        },
        // Nouvelle propriété pour forcer l'affichage dans l'éditeur
        forceDisplay: {
            type: Boolean,
            default: false,
        },
    },
    computed: {
        primaryColor() {
            return this.parameterAiMenuPrimaryColor || '#007bff';
        },
        // Computed property pour contrôler la visibilité du menu
        isMenuVisible() {
            // Détecter si on est dans l'éditeur WeWeb
            const isInEditor = typeof window.wwLib !== "undefined";
            
            // Si forceDisplay est activé ET qu'on est dans l'éditeur, le menu est toujours visible
            if (this.forceDisplay && isInEditor) {
                return true;
            }
            // Sinon, utiliser la logique normale
            return this.isVisible;
        },
        // Computed property pour récupérer les types de modification personnalisés
        modificationTypes() {
            const customTypes = {};
            if (this.customModificationTypes && Array.isArray(this.customModificationTypes)) {
                this.customModificationTypes.forEach(type => {
                    if (type.key && type.label) {
                        customTypes[type.key] = {
                            label: type.label,
                            defaultPrompt: type.defaultPrompt || '',
                            action: type.action || 'replace',
                            requireInput: type.requireInput !== undefined ? type.requireInput : true
                        };
                    }
                });
            }
            return customTypes;
        },
        isSubmitDisabled() {
            // Le bouton est désactivé si aucun type n'est sélectionné
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
            hasStarted: false,
            selectedModificationType: null,
            isDropdownOpen: false, // Pour contrôler l'ouverture/fermeture de la dropdown
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
        this.richEditor.commands.clearStrike();
    },
    methods: {
        toggleDropdown() {
            this.isDropdownOpen = !this.isDropdownOpen;
        },
        submitPrompt() {
            // Vérifier qu'un type est sélectionné avant de permettre la soumission
            if (!this.selectedModificationType) {
                // Si aucun type n'est sélectionné, ouvrir la dropdown pour forcer la sélection
                this.isDropdownOpen = true;
                return;
            }

            if (this.isSubmitDisabled) {
                return;
            }

            this.hasStarted = true;
            this.isLoading = true;

            const finalPrompt = this.buildFinalPrompt();
            const action = this.modificationTypes[this.selectedModificationType].action;


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
            // Utiliser TextSuggestion pour afficher la proposition dans l'éditeur
            this.displaySuggestion(response);

            this.isLoading = false;
            if (!response) {
                return;
            }
        },

        displaySuggestion(response) {
            // Afficher la suggestion uniquement si la popup est ouverte
            if (!this.isVisible) {
                return;
            }

            // Déterminer la position de la suggestion selon la méthode et la sélection
            const position = this.getSuggestionPosition();

            // Formater le texte de la suggestion avec des espaces intelligents
            const formattedResponse = this.formatSuggestionText(response, position);

            // Utiliser la commande updateSuggestion pour afficher la proposition
            this.richEditor.commands.updateSuggestion(formattedResponse, position);

            const action = this.modificationTypes[this.selectedModificationType]?.action;
            if (action === 'replace' && this.storedSelectionRange) {
                this.richEditor.commands.setStrikeRanges([{ from: this.storedSelectionRange.from, to: this.storedSelectionRange.to }]);
            } else if (action === 'replace-all') {
                this.richEditor.commands.setStrikeRanges([{ from: 0, to: this.getDocumentEnd() }]);
            }

            // Stocker la réponse pour validation ultérieure
            this.aiResponse = response;
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
                // Pour le remplacement global, placer à la fin du texte (même ligne)
                return this.getDocumentEnd();
            } else if (action === 'append') {
                // Pour l'ajout, placer à la fin
                return this.getDocumentEnd();
            } else if (action === 'prepend') {
                // Pour l'ajout au début, placer au début
                return 0;
            } else {
                // Par défaut, placer après la sélection ou à la fin
                return this.storedSelectionRange?.to || this.getDocumentEnd();
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
            this.closeMenu();
        },
        rejectProposal() {
            // Rejeter la proposition et fermer le menu
            this.richEditor.commands.clearSuggestion();
            this.richEditor.commands.clearHighlight();
            this.richEditor.commands.clearStrike();

            this.closeMenu();
        },
        hideMenu() {
            if (this.hasStarted) {
                return;
            }

            this.closeMenu();
        },
        closeMenu() {
            this.isVisible = false;
            this.isFocused = false;
            this.isLoading = false;
            this.hasStarted = false;
            this.storedSelection = null;
            this.storedSelectionRange = null;
            this.selectedModificationType = null;
            this.isDropdownOpen = false;
            this.aiResponse = '';
            this.aiPrompt = '';

            // Nettoyer le surlignage, la suggestion et le Strike lors de la fermeture du menu
            this.richEditor.commands.clearHighlight();
            this.richEditor.commands.clearSuggestion();
            this.richEditor.commands.clearStrike();
        },
        applyResponse(response) {
            const action = this.modificationTypes[this.selectedModificationType].action;

            // Formater le texte avec la même logique que pour l'affichage
            const position = this.getSuggestionPosition();
            const formattedResponse = this.formatSuggestionText(response, position);

            switch (action) {
                case 'replace': this.replaceSelection(formattedResponse); break;
                case 'insert-before': this.insertBeforeSelection(formattedResponse); break;
                case 'insert-after': this.insertAfterSelection(formattedResponse); break;
                case 'replace-all': this.replaceAllText(formattedResponse); break;
                case 'append': this.appendToEnd(formattedResponse); break;
                case 'prepend': this.prependToBeginning(formattedResponse); break;
                default: console.warn('Action non reconnue:', action); this.replaceSelection(formattedResponse);
            }
        },
        openWithType(typeKey) {
            // Permettre l'ouverture avec ou sans type spécifique
            this.selectedModificationType = typeKey || null;
            this.isVisible = true;
            this.isFocused = true;

            // Enregistrer la sélection initiale au montage
            const { from, to } = this.richEditor.state.selection;

            // Stocker le texte sélectionné et le surligner une seule fois
            if (from !== to) {
                this.storedSelection = this.richEditor.state.doc.textBetween(from, to);
                this.storedSelectionRange = { from, to };
                this.richEditor.commands.highlightRange(from, to);
            }
        },
        selectModificationType(typeKey) {
            this.selectedModificationType = typeKey;
            this.isDropdownOpen = false; // Fermer la dropdown après sélection
            this.isVisible = true;
            this.isFocused = true;
            
            // Focus sur l'input après la sélection du type
            this.$nextTick(() => {
                const textarea = this.$el.querySelector('.ai-input');
                if (textarea) {
                    textarea.focus();
                }
            });
        },

        // Méthode supprimée - maintenant gérée par les placeholders personnalisés

        buildFinalPrompt() {
            // Si aucun type n'est sélectionné ou si le type n'existe pas, retourner seulement le prompt utilisateur
            if (!this.selectedModificationType || !this.modificationTypes[this.selectedModificationType]) {
                return this.aiPrompt || '';
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
                this.richEditor.chain().focus().insertContentAt(from, text).run();
            }
        },

        insertAfterSelection(text) {
            if (this.storedSelectionRange) {
                const { to } = this.storedSelectionRange;
                this.richEditor.chain().focus().insertContentAt(to, text).run();
            }
        },

        replaceAllText(text) {
            this.richEditor.chain().focus().setContent(text).run();
        },

        appendToEnd(text) {
            const docSize = this.getDocumentEnd();
            this.richEditor.chain().focus().insertContentAt(docSize, text).run();
        },

        prependToBeginning(text) {
            this.richEditor.chain().focus().insertContentAt(0, text).run();
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

        // Méthode utilitaire pour obtenir la fin du document (fin du texte, pas fin absolue)
        getDocumentEnd() {
            const doc = this.richEditor.state.doc;
            const lastPos = doc.content.size;
            // Chercher la dernière position de texte (pas d'éléments de bloc)
            let textEnd = lastPos;
            for (let i = lastPos - 1; i >= 0; i--) {
                if (doc.textBetween(i, i + 1) !== '') {
                    textEnd = i + 1;
                    break;
                }
            }
            return textEnd;
        },

        onClickOutside(event) {
            // Ne fermer le menu que s'il est déjà ouvert et visible
            if (!this.isVisible) {
                return;
            }

            // Vérifier si le clic est en dehors du menu AI
            const aiMenuElement = this.$el;
            if (aiMenuElement && !aiMenuElement.contains(event.target)) {
                this.hideMenu();
            }
        },

        getSelectedTypeLabel() {
            if (this.selectedModificationType && this.modificationTypes[this.selectedModificationType]) {
                return this.modificationTypes[this.selectedModificationType].label;
            }
            return this.placeholders.chooseTypePlaceholder || 'Select a type';
        },
    },
};
</script>

<style scoped>
.bubble-menu {
    position: relative;
    margin-top: 8px;
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
    max-height: 76px;
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
    font-family: var(--font-family);
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
    background: var(--primary-color-inactive) !important;
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

.ai-submit-button {
    position: static;
    margin-left: 0;
}

/* État de chargement */
.ai-loading-container {
    display: flex;
    flex-direction: row;
    align-items: start;
    gap: 12px;
    padding: 12px;
}

.ai-loading-spinner {
    width: 18px;
    height: 18px;
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

/* Message quand aucun type n'est configuré */
.ai-no-types-message {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    padding: 24px;
    text-align: center;
}

.no-types-icon {
    font-size: 24px;
    opacity: 0.7;
}

.no-types-text {
    font-size: 14px;
    color: #6c757d;
    line-height: 1.4;
    max-width: 280px;
}
</style>