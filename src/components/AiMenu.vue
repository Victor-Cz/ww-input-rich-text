<template>
    <div
        class="bubble-menu"
        v-show="isVisible"
        :class="{ 'is-focused': isFocused }"
    >




                    <!-- Input pour les prompts AI -->
            <div class="ai-input-container" v-if="!isLoading">
                <div class="ai-input-wrapper">
                    <textarea
                        v-model="aiPrompt"
                        :placeholder="getPromptPlaceholder()"
                        class="ai-input"
                        @keyup.enter="submitPrompt"
                        @focus="onFocus"
                        @blur="onBlur"
                        rows="3"
                    ></textarea>
                    <div class="modification-type-dropdown">
                        <div class="dropdown-header" @click="toggleDropdown">
                            <div class="icon-collection" aria-hidden="true"></div>
                            <span>{{ getSelectedTypeLabel() }}</span>
                            <div class="icon-chevron-down" :class="{ 'rotated': isDropdownOpen }" aria-hidden="true"></div>
                        </div>
                        <div class="dropdown-options" v-show="isDropdownOpen">
                            <div
                                v-for="(type, key) in modificationTypes"
                                :key="key"
                                class="dropdown-option"
                                @click="selectModificationType(key)"
                            >
                                {{ type.label }}
                            </div>
                        </div>
                    </div>
                    <button
                        @click="submitPrompt"
                        class="ai-submit-button"
                        title="Envoyer le prompt"
                        :disabled="!aiPrompt.trim() || !selectedModificationType"
                    >
                        <div class="icon-arrow-sm-right" aria-hidden="true"></div>
                    </button>
                </div>
            </div>

        <!-- Affichage de la proposition AI -->
        <div class="ai-proposal-container" v-if="isProposal">
            <div class="proposal-header">
                <span class="proposal-label">Proposition AI :</span>
            </div>
            <div class="proposal-content">
                <input
                    :value="aiResponse"
                    type="text"
                    class="ai-proposal-input"
                    :readonly="isReadOnly"
                    @focus="onFocus"
                    @blur="onBlur"
                />
            </div>
            <div class="proposal-actions">
                <button
                    @click="validateProposal"
                    class="proposal-validate-button"
                    title="Valider la proposition"
                >
                    <i class="fas fa-check"></i>
                    Valider
                </button>
                <button
                    @click="rejectProposal"
                    class="proposal-reject-button"
                    title="Rejeter la proposition"
                >
                    <i class="fas fa-times"></i>
                    Rejeter
                </button>
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
    },
    data() {
        return {
            aiPrompt: '',
            aiResponse: '',
            isVisible: false,
            isFocused: false,
            hasSelection: false,
            storedSelection: null,
            storedSelectionRange: null,
            isLoading: false,
            isProposal: false,
            selectedModificationType: null,
            isDropdownOpen: false, // Pour contrôler l'ouverture/fermeture de la dropdown
            // Configuration des types de modifications
            modificationTypes: {
                modify: {
                    label: 'Modifier',
                    description: 'Améliorer ou corriger le texte sélectionné',
                    defaultPrompt: 'Améliore ce texte en gardant le même sens',
                    action: 'replace'
                },
                humanize: {
                    label: 'Humaniser',
                    description: 'Rendre le texte plus naturel et humain',
                    defaultPrompt: 'Rends ce texte plus naturel et humain',
                    action: 'replace'
                },
                extend: {
                    label: 'Rallonger',
                    description: 'Développer et enrichir le contenu',
                    defaultPrompt: 'Développe et enrichis ce texte',
                    action: 'replace'
                },
                shorten: {
                    label: 'Raccourcir',
                    description: 'Condense ce texte en gardant l\'essentiel',
                    defaultPrompt: 'Condense ce texte en gardant l\'essentiel',
                    action: 'replace'
                },
                formalize: {
                    label: 'Formaliser',
                    description: 'Rendre le texte plus formel et professionnel',
                    defaultPrompt: 'Rends ce texte plus formel et professionnel',
                    action: 'replace'
                },
                simplify: {
                    label: 'Simplifier',
                    description: 'Simplifie ce texte pour le rendre plus accessible',
                    defaultPrompt: 'Simplifie ce texte pour le rendre plus accessible',
                    action: 'replace'
                },
                translate: {
                    label: 'Traduire',
                    description: 'Traduire dans une autre langue',
                    defaultPrompt: 'Traduis ce texte en français',
                    action: 'replace'
                },
                custom: {
                    label: 'Personnalisé',
                    description: 'Prompt personnalisé',
                    defaultPrompt: '',
                    action: 'replace'
                }
            }
        };
    },
    mounted() {
        // Écouter les changements de sélection dans l'éditeur
        this.richEditor.on('selectionUpdate', this.onSelectionUpdate);

        // Écouter les clics en dehors du menu pour le masquer
        document.addEventListener('mousedown', this.onClickOutside);
    },
    beforeUnmount() {
        // Nettoyer les écouteurs
        this.richEditor.off('selectionUpdate', this.onSelectionUpdate);
        document.removeEventListener('mousedown', this.onClickOutside);
    },
    methods: {
        onSelectionUpdate() {
            // Ne traiter la sélection que si le menu est ouvert
            if (!this.isVisible) {
                return;
            }

            const { from, to } = this.richEditor.state.selection;
            this.hasSelection = from !== to;

            // Stocker le texte sélectionné quand il y en a un
            if (this.hasSelection) {
                this.storedSelection = this.richEditor.state.doc.textBetween(from, to);
                this.storedSelectionRange = { from, to };
                // Surligner le texte sélectionné
                this.highlightSelection();
            } else {
                this.storedSelection = null;
                this.storedSelectionRange = null;
                // Retirer le surlignage
                this.removeHighlight();
            }
        },
        updateVisibility() {
            // Le menu est visible seulement si il est explicitement ouvert
            // Ne plus dépendre de isFocused pour éviter les conflits
        },
        toggleDropdown() {
            this.isDropdownOpen = !this.isDropdownOpen;
        },
        submitPrompt() {
            if (this.aiPrompt.trim() && this.selectedModificationType) {
                this.isLoading = true;
                const { from, to } = this.richEditor.state.selection;
                if (from !== to) {
                    this.storedSelectionRange = { from, to };
                }
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
                this.$wwTriggerEvent('ai-prompt', {
                    prompt: finalPrompt,
                    modificationType: this.selectedModificationType,
                    action: action,
                    selectedText: this.storedSelection,
                    timestamp: new Date().toISOString()
                });
                this.aiPrompt = '';
            }
        },
        setResponse(response) {
            this.isLoading = false;
            if (!response) {
                console.log('AI Response received but no content to apply');
                return;
            }

            // Afficher la proposition au lieu de l'appliquer directement
            this.aiResponse = response;
            this.isProposal = true;
            console.log('AI Response displayed as proposal:', response);
        },
        validateProposal() {
            // Appliquer la proposition à l'éditeur
            this.applyResponse(this.aiResponse);

            // Réinitialiser et fermer le menu
            this.resetProposal();
            this.closeMenu();
            console.log('AI Proposal validated and applied:', this.aiResponse);
        },
        rejectProposal() {
            // Rejeter la proposition et fermer le menu
            this.resetProposal();
            this.closeMenu();
            console.log('AI Proposal rejected');
        },
        resetProposal() {
            this.aiResponse = '';
            this.isProposal = false;
        },
        closeMenu() {
            // Retirer le surlignage avant de fermer
            this.removeHighlight();
            
            this.isVisible = false;
            this.isFocused = false;
            this.storedSelection = null;
            this.storedSelectionRange = null;
            this.hasSelection = false;
            this.selectedModificationType = null;
            this.isDropdownOpen = false; // Fermer la dropdown
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
        resetSelectors() {
            this.selectedModificationType = null;
            this.aiPrompt = '';
        },
        openWithType(typeKey) {
            this.selectedModificationType = typeKey;
            this.isVisible = true;
            this.isFocused = true;
            this.updateVisibility();
        },
        onFocus() {
            // Ne rien faire lors du focus pour éviter la réouverture automatique
            // Le menu ne s'ouvre que via openMenu() ou openWithType()
        },
        onBlur() {
            // Ne pas fermer automatiquement le menu lors de la perte de focus
            // Le menu ne se fermera que via onClickOutside ou closeMenu explicite
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
            this.richEditor.chain().focus().insertContentAt(this.richEditor.state.doc.content.size, text).run();
        },
        prependToBeginning(text) {
            this.richEditor.chain().focus().insertContentAt(0, text).run();
        },
        selectModificationType(typeKey) {
            this.selectedModificationType = typeKey;
            this.isDropdownOpen = false; // Fermer la dropdown après sélection
            this.isVisible = true;
            this.isFocused = true;
        },
        
        openMenu() {
            this.isVisible = true;
            this.isFocused = true;
        },
        
        highlightSelection() {
            if (this.storedSelectionRange) {
                const { from, to } = this.storedSelectionRange;
                console.log('Highlighting selection:', { from, to });
                
                // Appliquer un surlignage jaune au texte sélectionné
                this.richEditor.chain()
                    .setTextSelection({ from, to })
                    .setMark('backgroundColor', '#ffeb3b')
                    .run();
                
                console.log('Highlight applied');
            }
        },
        
        removeHighlight() {
            if (this.storedSelectionRange) {
                const { from, to } = this.storedSelectionRange;
                // Retirer le surlignage
                this.richEditor.chain()
                    .setTextSelection({ from, to })
                    .unsetMark('backgroundColor')
                    .run();
            }
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
        }
    },
};
</script>

<style scoped>
.bubble-menu {
    position: relative;
    margin-top: 16px;
    margin-bottom: 32px;
    background: white;
    border: 1px solid #007bff;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    min-width: 300px;
    z-index: 1000;
}

.bubble-menu.is-focused {
    border-color: #007bff;
    box-shadow: 0 4px 16px rgba(0, 123, 255, 0.25);
}

.selected-text-display {
    margin-bottom: 16px;
    padding: 12px;
    background: #f8f9fa;
    border-radius: 6px;
    border-left: 4px solid #007bff;
}

.selected-text-label {
    font-size: 12px;
    font-weight: 600;
    color: #6c757d;
    margin-bottom: 4px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.selected-text-content {
    font-size: 14px;
    color: #495057;
    line-height: 1.4;
    word-break: break-word;
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
    gap: 8px;
    padding: 6px 10px;
    border: 1px solid #dee2e6;
    border-radius: 4px;
    font-size: 13px;
    color: #495057;
    background: #f8f9fa;
    cursor: pointer;
    transition: border-color 0.2s, box-shadow 0.2s;
    width: fit-content;
}

.dropdown-header:hover {
    border-color: #007bff;
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
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
    box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.1);
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
    padding: 12px 32px 32px 12px;
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
}

.ai-submit-button {
    position: absolute;
    bottom: 8px;
    right: 8px;
    padding: 8px 8px;
    background: #007bff;
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
    background: #6c757d;
    cursor: not-allowed;
}

.ai-submit-button:hover {
    background: #0056b3;
}

.ai-submit-button:active {
    background: #004085;
}

/* Styles pour la proposition AI */
.ai-proposal-container {
    margin-bottom: 16px;
}

.proposal-header {
    margin-bottom: 12px;
}

.proposal-label {
    font-size: 12px;
    font-weight: 600;
    color: #6c757d;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.proposal-content {
    margin-bottom: 16px;
}

.ai-proposal-input {
    width: 100%;
    padding: 10px 12px;
    border: 2px solid #8b5cf6;
    border-radius: 6px;
    font-size: 14px;
    color: #8b5cf6;
    background: #faf5ff;
    font-weight: 500;
}

.ai-proposal-input:focus {
    outline: none;
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
}

.proposal-actions {
    display: flex;
    gap: 8px;
}

.proposal-validate-button,
.proposal-reject-button {
    flex: 1;
    padding: 10px 16px;
    border: none;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
}

.proposal-validate-button {
    background: #10b981;
    color: white;
}

.proposal-validate-button:hover {
    background: #059669;
}

.proposal-validate-button:active {
    background: #047857;
}

.proposal-reject-button {
    background: #ef4444;
    color: white;
}

.proposal-reject-button:hover {
    background: #dc2626;
}

.proposal-reject-button:active {
    background: #b91c1c;
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
    border-top: 3px solid #007bff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
}

.ai-loading-text {
    font-size: 14px;
    color: #6c757d;
    font-weight: 500;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
</style>