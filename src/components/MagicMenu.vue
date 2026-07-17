<template>
    <div class="magic-menu" :style="menuStyleVars">
        <!-- Barre d'actions quand une proposition est en attente -->
        <transition name="magic-fade">
            <div class="magic-proposal-actions" v-if="aiResponse && !isLoading">
                <button
                    type="button"
                    class="magic-chip magic-reject"
                    @mousedown.prevent
                    @click="rejectProposal"
                    :title="placeholders.cancelButtonTooltip"
                >
                    <div class="icon-x" aria-hidden="true"></div>
                    <span>{{ placeholders.cancelButton }}</span>
                </button>
                <button
                    type="button"
                    class="magic-chip magic-accept"
                    @mousedown.prevent
                    @click="validateProposal"
                    :title="placeholders.submitButtonTooltip"
                >
                    <div class="icon-check" aria-hidden="true"></div>
                    <span>{{ placeholders.submitButton }}</span>
                </button>
            </div>
        </transition>

        <!-- Wrapper : la dropdown doit être un frère de la pill, pas un enfant,
             sinon le backdrop-filter de la pill isole le backdrop des bulles
             et leur blur ne fonctionne pas -->
        <div class="magic-pill-zone" :class="{ 'is-focused': isFocused }">
            <transition name="magic-pop">
                <div class="magic-dropdown" v-show="isDropdownOpen">
                    <div
                        v-for="(type, key, index) in modificationTypes"
                        :key="key"
                        class="magic-dropdown-option"
                        :style="{ animationDelay: `${index * 40}ms` }"
                        @mousedown.prevent="selectModificationType(key)"
                    >
                        <div v-if="type.icon" :class="['magic-type-icon', getTypeIcon(type)]" aria-hidden="true"></div>
                        <span>{{ type.label }}</span>
                    </div>
                </div>
            </transition>

            <div class="magic-pill" :class="{ 'is-focused': isFocused, 'is-loading': isLoading }">
            <!-- Sélecteur de type de modification -->
            <div class="magic-type" v-if="typeCount > 0">
                <!-- mousedown.prevent : ne pas voler le focus de l'input (le blur
                     rétrécirait la pill et déplacerait le bouton avant le click) -->
                <button type="button" class="magic-type-header" @mousedown.prevent="toggleDropdown">
                    <div
                        :class="getSelectedTypeIcon() ? ['magic-type-icon', getSelectedTypeIcon()] : 'magic-type-icon icon-cog'"
                        aria-hidden="true"
                    ></div>
                    <span class="magic-type-label" v-if="showTypeLabel">{{ getSelectedTypeLabel() }}</span>
                    <div class="icon-chevron-down magic-chevron" :class="{ rotated: isDropdownOpen }" aria-hidden="true"></div>
                </button>
            </div>

            <input
                v-model="aiPrompt"
                type="text"
                class="magic-input"
                :placeholder="inputPlaceholder"
                :title="placeholders.promptInputTooltip"
                :disabled="isLoading || typeCount === 0"
                @keydown.enter.prevent="submitPrompt"
                @keydown.esc.prevent="onEscape"
                @focus="onInputFocus"
                @blur="onInputBlur"
            />

            <div class="magic-spinner" v-if="isLoading" :title="placeholders.processing"></div>
            <div class="magic-success icon-check-circle" v-else-if="showSuccessCheck" aria-hidden="true"></div>
            <button
                v-else
                type="button"
                class="magic-submit"
                :disabled="isSubmitDisabled"
                @mousedown.prevent
                @click="submitPrompt"
                :title="placeholders.submitButtonTooltip"
            >
                <div class="icon-arrow-sm-right magic-arrow" aria-hidden="true"></div>
            </button>
            </div>
        </div>
    </div>
</template>

<script>
export default {
    name: 'MagicMenu',
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
        // Couleur dédiée au bouton d'envoi, fallback sur la couleur primaire si vide
        buttonColor: {
            type: String,
            default: '',
        },
        // Afficher le label du type sélectionné dans le badge
        showTypeLabel: {
            type: Boolean,
            default: false,
        },
        // Index du type sélectionné par défaut dans la liste des types.
        // Vide/null : aucun type sélectionné par défaut (état neutre)
        defaultTypeIndex: {
            type: [Number, String],
            default: 0,
        },
        // Ouvrir automatiquement la liste des types quand l'input prend le focus :
        // 'yes' (toujours), 'no-type-selected' (seulement si aucun type sélectionné), 'no' (jamais).
        // Accepte aussi un booléen pour rétro-compatibilité
        showTypesOnFocus: {
            type: [String, Boolean],
            default: 'no',
        },
        customModificationTypes: {
            type: Array,
            default: () => [],
        },
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
                chooseTypePlaceholder: 'Select a type',
            }),
        },
    },
    computed: {
        menuStyleVars() {
            if (!this.buttonColor) {
                return {};
            }
            // Décliner le hover en 80% d'opacité seulement pour un hex simple #RRGGBB
            const isHex6 = /^#[0-9a-fA-F]{6}$/.test(this.buttonColor);
            return {
                '--magic-submit-color': this.buttonColor,
                '--magic-submit-color-hover': isHex6 ? `${this.buttonColor}CC` : this.buttonColor,
            };
        },
        modificationTypes() {
            const customTypes = {};
            if (this.customModificationTypes && Array.isArray(this.customModificationTypes)) {
                this.customModificationTypes.forEach(type => {
                    if (type.key && type.label) {
                        customTypes[type.key] = {
                            label: type.label,
                            defaultPrompt: type.defaultPrompt || '',
                            action: type.action || 'replace',
                            requireInput: type.requireInput !== undefined ? type.requireInput : true,
                            promptPlaceholder: type.promptPlaceholder || '',
                            icon: type.icon,
                        };
                    }
                });
            }
            return customTypes;
        },
        typeCount() {
            return Object.keys(this.modificationTypes).length;
        },
        isSubmitDisabled() {
            if (!this.selectedModificationType) {
                return true;
            }

            const selectedType = this.modificationTypes[this.selectedModificationType];
            if (!selectedType) {
                return true;
            }

            if (selectedType.requireInput === false) {
                return false;
            }

            return !this.aiPrompt.trim();
        },
        inputPlaceholder() {
            if (this.typeCount === 0) {
                return 'No modification types configured';
            }
            const type = this.selectedModificationType && this.modificationTypes[this.selectedModificationType];
            if (type && type.promptPlaceholder) {
                return type.promptPlaceholder;
            }
            return this.placeholders.promptInput;
        },
    },
    data() {
        return {
            aiPrompt: '',
            aiResponse: '',
            isFocused: false,
            storedSelection: null,
            storedSelectionRange: null,
            isLoading: false,
            selectedModificationType: null,
            isDropdownOpen: false,
            showSuccessCheck: false,
            lastMousedownInside: false,
            suppressFocusOpen: false,
        };
    },
    watch: {
        customModificationTypes: {
            immediate: true,
            handler() {
                // Garder un type valide sélectionné : le type à defaultTypeIndex sert de défaut
                const keys = Object.keys(this.modificationTypes);
                if (!this.selectedModificationType || !keys.includes(this.selectedModificationType)) {
                    this.selectedModificationType = this.getDefaultTypeKey();
                }
            },
        },
        defaultTypeIndex() {
            this.selectedModificationType = this.getDefaultTypeKey();
        },
    },
    mounted() {
        document.addEventListener('mousedown', this.onClickOutside);
    },
    beforeUnmount() {
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

        onClickOutside(event) {
            // Mémoriser si le mousedown a lieu dans le menu : le blur de l'input qui suit
            // immédiatement (clic sur submit, dropdown...) ne doit pas relâcher la sélection
            this.lastMousedownInside = !!(this.$el && this.$el.contains(event.target));
            setTimeout(() => {
                this.lastMousedownInside = false;
            }, 0);

            if (this.isDropdownOpen && this.$el && !this.$el.contains(event.target)) {
                this.isDropdownOpen = false;
            }
        },

        onInputFocus() {
            this.isFocused = true;
            this.captureSelection();

            // Ouvrir la liste des types au focus si demandé (sauf juste après une sélection)
            const mode = this.showTypesOnFocus === true ? 'yes' : this.showTypesOnFocus;
            const shouldOpen =
                mode === 'yes' || (mode === 'no-type-selected' && !this.selectedModificationType);
            if (shouldOpen && !this.suppressFocusOpen) {
                this.isDropdownOpen = true;
            }
            this.suppressFocusOpen = false;
        },

        onInputBlur(event) {
            this.isFocused = false;

            // Relâcher la sélection maintenue, sauf si le focus reste dans le menu
            // ou qu'une requête/proposition est en cours
            const related = event.relatedTarget;
            const stayingInside = (related && this.$el.contains(related)) || this.lastMousedownInside;
            if (!stayingInside) {
                this.isDropdownOpen = false;
                if (!this.isLoading && !this.aiResponse) {
                    this.releaseSelection();
                }
            }
        },

        releaseSelection() {
            this.storedSelection = null;
            this.storedSelectionRange = null;
            this.richEditor.commands.clearHighlight();
        },

        onEscape(event) {
            if (this.aiResponse) {
                this.rejectProposal();
            } else {
                this.aiPrompt = '';
                event.target.blur();
            }
        },

        // Mémoriser la sélection courante de l'éditeur au moment où l'input prend le focus
        captureSelection() {
            const { from, to } = this.richEditor.state.selection;

            if (from !== to) {
                this.storedSelection = this.richEditor.state.doc.textBetween(from, to);
                this.storedSelectionRange = { from, to };
                this.richEditor.commands.highlightRange(from, to);
            } else {
                this.storedSelection = null;
                this.storedSelectionRange = null;
                this.richEditor.commands.clearHighlight();
            }
        },

        // API identique à AiMenu pour l'action "Open AI Menu"
        openWithType(typeKey) {
            if (typeKey && this.modificationTypes[typeKey]) {
                this.selectedModificationType = typeKey;
            }

            this.captureSelection();

            this.$nextTick(() => {
                const input = this.$el.querySelector('.magic-input');
                if (input) {
                    input.focus();
                }
            });
        },

        selectModificationType(typeKey) {
            this.selectedModificationType = typeKey;
            this.isDropdownOpen = false;

            this.$nextTick(() => {
                const input = this.$el.querySelector('.magic-input');
                // Si l'input a déjà le focus, focus() ne déclenche aucun événement :
                // ne pas poser le flag, il avalerait la prochaine ouverture légitime
                if (input && document.activeElement !== input) {
                    // Ne pas rouvrir la dropdown via le focus qui suit la sélection
                    this.suppressFocusOpen = true;
                    input.focus();
                }
            });
        },

        submitPrompt() {
            if (!this.selectedModificationType) {
                this.isDropdownOpen = true;
                return;
            }

            if (this.isSubmitDisabled || this.isLoading) {
                return;
            }

            this.isLoading = true;

            const finalPrompt = this.buildFinalPrompt();
            const action = this.modificationTypes[this.selectedModificationType].action;

            this.$emit('ai-prompt', {
                prompt: finalPrompt,
                modificationType: this.selectedModificationType,
                action: action,
                selectedText: this.storedSelection,
                htmlValue: this.richEditor.getHTML(),
                timestamp: new Date().toISOString(),
            });

            this.aiPrompt = '';
        },

        buildFinalPrompt() {
            if (!this.selectedModificationType || !this.modificationTypes[this.selectedModificationType]) {
                return this.aiPrompt || '';
            }

            const basePrompt = this.modificationTypes[this.selectedModificationType].defaultPrompt;
            return this.aiPrompt ? `${basePrompt} : ${this.aiPrompt}` : basePrompt;
        },

        // API identique à AiMenu pour l'action "Set AI Response"
        setResponse(response) {
            this.displaySuggestion(response);

            this.isLoading = false;
            if (!response) {
                return;
            }
        },

        displaySuggestion(response) {
            if (!response) {
                return;
            }

            const position = this.getSuggestionPosition();
            const formattedResponse = this.formatSuggestionText(response, position);

            this.richEditor.commands.updateSuggestion(formattedResponse, position);

            const action = this.modificationTypes[this.selectedModificationType]?.action;
            if (action === 'replace' && this.storedSelectionRange) {
                this.richEditor.commands.setStrikeRanges([
                    { from: this.storedSelectionRange.from, to: this.storedSelectionRange.to },
                ]);
            } else if (action === 'replace-all') {
                this.richEditor.commands.setStrikeRanges([{ from: 0, to: this.getDocumentEnd() }]);
            }

            this.aiResponse = response;
        },

        getSuggestionPosition() {
            const action = this.modificationTypes[this.selectedModificationType]?.action;

            if (action === 'replace' && this.storedSelectionRange) {
                return this.storedSelectionRange.to;
            } else if (action === 'insert-before' && this.storedSelectionRange) {
                return this.storedSelectionRange.from;
            } else if (action === 'insert-after' && this.storedSelectionRange) {
                return this.storedSelectionRange.to;
            } else if (action === 'replace-all') {
                return this.getDocumentEnd();
            } else if (action === 'append') {
                return this.getDocumentEnd();
            } else if (action === 'prepend') {
                return 0;
            } else {
                return this.storedSelectionRange?.to || this.getDocumentEnd();
            }
        },

        validateProposal() {
            this.applyResponse(this.aiResponse);
        },

        rejectProposal() {
            this.resetState();
        },

        // Contrairement à AiMenu, le menu reste visible : on remet juste l'état à zéro
        resetState() {
            this.isFocused = false;
            this.isLoading = false;
            this.storedSelection = null;
            this.storedSelectionRange = null;
            this.isDropdownOpen = false;
            this.aiResponse = '';
            this.aiPrompt = '';
            this.showSuccessCheck = false;

            this.richEditor.commands.clearHighlight();
            this.richEditor.commands.clearSuggestion();
            this.richEditor.commands.clearStrike();
        },

        applyResponse(response) {
            const action = this.modificationTypes[this.selectedModificationType].action;

            const position = this.getSuggestionPosition();
            const formattedResponse = this.formatSuggestionText(response, position);

            switch (action) {
                case 'replace':
                    this.replaceSelection(formattedResponse);
                    break;
                case 'insert-before':
                    this.insertBeforeSelection(formattedResponse);
                    break;
                case 'insert-after':
                    this.insertAfterSelection(formattedResponse);
                    break;
                case 'replace-all':
                    this.replaceAllText(formattedResponse);
                    break;
                case 'append':
                    this.appendToEnd(formattedResponse);
                    break;
                case 'prepend':
                    this.prependToBeginning(formattedResponse);
                    break;
                default:
                    console.warn('Action non reconnue:', action);
                    this.replaceSelection(formattedResponse);
            }

            this.$emit('ai-suggestion-applied', {
                response: response,
                formattedResponse: formattedResponse,
                modificationType: this.selectedModificationType,
                action: action,
                selectedText: this.storedSelection,
                selectionRange: this.storedSelectionRange,
                htmlValue: this.richEditor.getHTML(),
                timestamp: new Date().toISOString(),
                position: position,
            });

            this.richEditor.commands.clearHighlight();
            this.richEditor.commands.clearSuggestion();
            this.richEditor.commands.clearStrike();
            this.aiResponse = '';

            this.showSuccessCheck = true;
            setTimeout(() => {
                this.resetState();
            }, 1500);
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

        formatSuggestionText(text, position) {
            if (!text || typeof text !== 'string') return text;

            let formattedText = text.trim();

            const doc = this.richEditor.state.doc;
            const beforeChar = position > 0 ? doc.textBetween(position - 1, position) : '';
            const afterChar = position < doc.content.size ? doc.textBetween(position, position + 1) : '';

            if (beforeChar && !this.isWhitespace(beforeChar) && !this.isPunctuation(beforeChar)) {
                formattedText = ' ' + formattedText;
            }
            if (afterChar && !this.isWhitespace(afterChar) && !this.isPunctuation(afterChar)) {
                formattedText += ' ';
            }

            return formattedText;
        },

        isWhitespace(char) {
            return /\s/.test(char);
        },

        isPunctuation(char) {
            return /[.,;:!?()[\]{}"'`]/.test(char);
        },

        getDocumentEnd() {
            const doc = this.richEditor.state.doc;
            const lastPos = doc.content.size;
            let textEnd = lastPos;
            for (let i = lastPos - 1; i >= 0; i--) {
                if (doc.textBetween(i, i + 1) !== '') {
                    textEnd = i + 1;
                    break;
                }
            }
            return textEnd;
        },

        getDefaultTypeKey() {
            // Index vide : pas de type par défaut
            if (this.defaultTypeIndex === null || this.defaultTypeIndex === undefined || this.defaultTypeIndex === '') {
                return null;
            }
            const index = Number(this.defaultTypeIndex);
            if (Number.isNaN(index)) {
                return null;
            }
            const keys = Object.keys(this.modificationTypes);
            return keys[index] ?? keys[0] ?? null;
        },

        getSelectedTypeLabel() {
            if (this.selectedModificationType && this.modificationTypes[this.selectedModificationType]) {
                return this.modificationTypes[this.selectedModificationType].label;
            }
            return this.placeholders.chooseTypePlaceholder || 'Select a type';
        },

        getSelectedTypeIcon() {
            if (this.selectedModificationType && this.modificationTypes[this.selectedModificationType]) {
                return this.getTypeIcon(this.modificationTypes[this.selectedModificationType]);
            }
            return null;
        },

        getTypeIcon(type) {
            const icon = type.icon;
            if (icon && icon.isWwObject && icon.type === 'ww-icon') {
                return icon.state?.icon || null;
            }
            return icon;
        },
    },
};
</script>

<style scoped>
/* Menu docké en bas de l'élément, toujours visible.
   Le texte de l'éditeur passe derrière : la pill flotte au-dessus du contenu. */
.magic-menu {
    position: absolute;
    bottom: 10px;
    left: 12px;
    right: 12px;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 8px;
    pointer-events: none;
}

.magic-menu > * {
    pointer-events: auto;
}

/* Easing "organique" avec léger rebond */
.magic-pill,
.magic-submit,
.magic-type-header,
.magic-chip {
    transition-timing-function: cubic-bezier(0.34, 1.56, 0.64, 1);
}

/* Zone : porte la largeur, le centrage et l'expansion au focus. Sert aussi
   d'ancre à la dropdown, qui doit rester hors de la pill (backdrop-filter) */
.magic-pill-zone {
    position: relative;
    width: min(100%, 400px);
    margin: 0 auto;
    transition: width 0.45s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.magic-pill-zone.is-focused {
    width: min(100%, 520px);
}

/* Pill compacte : gris léger + blur, s'anime au hover */
.magic-pill {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 3px 3px 3px 6px;
    border-radius: 999px;
    background: rgba(229, 231, 235, 0.5);
    backdrop-filter: blur(14px) saturate(1.3);
    -webkit-backdrop-filter: blur(14px) saturate(1.3);
    border: 1px solid rgba(0, 0, 0, 0.04);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
    box-sizing: border-box;
    transition:
        transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.3s ease,
        border-color 0.3s ease,
        box-shadow 0.3s ease;
}

.magic-pill:hover {
    background: rgba(240, 241, 243, 0.65);
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.07);
}

.magic-pill.is-focused {
    background: rgba(250, 250, 250, 0.75);
    border-color: rgba(0, 0, 0, 0.07);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.09);
}

.magic-input {
    flex: 1;
    min-width: 0;
    height: 26px;
    border: none;
    outline: none;
    background: transparent;
    font-size: 13px;
    color: #4b5563;
    font-family: var(--font-family);
}

.magic-input::placeholder {
    color: #9ca3af;
    transition: color 0.3s ease;
}

.magic-pill:hover .magic-input::placeholder {
    color: #6b7280;
}

.magic-input:disabled {
    cursor: not-allowed;
}

/* Bouton d'envoi rond, gris quand inactif, couleur primaire quand actif */
.magic-submit {
    width: 26px;
    height: 26px;
    flex-shrink: 0;
    border: none;
    border-radius: 50%;
    background: rgba(0, 0, 0, 0.06);
    color: #9ca3af;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition:
        transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.25s ease,
        color 0.25s ease;
}

.magic-submit:not(:disabled) {
    background: var(--magic-submit-color, var(--primary-color, #007bff));
    color: white;
}

.magic-submit:not(:disabled):hover {
    background: var(--magic-submit-color-hover, var(--primary-color-hover, #007bff));
    transform: scale(1.12);
}

.magic-submit:not(:disabled):active {
    transform: scale(0.92);
}

.magic-submit:disabled {
    cursor: not-allowed;
}

/* Flèche orientée vers le haut, petit nudge au hover de la pill */
.magic-arrow {
    transform: rotate(-90deg);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.magic-submit:not(:disabled):hover .magic-arrow {
    transform: rotate(-90deg) translateX(1px);
}

/* Sélecteur de type compact (la dropdown est ancrée sur la zone, pas sur le chip) */
.magic-type {
    position: static;
    flex-shrink: 0;
}

.magic-type-header {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 5px;
    border: none;
    border-radius: 999px;
    background: rgba(0, 0, 0, 0.04);
    color: #6b7280;
    cursor: pointer;
    transition:
        transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.25s ease;
}

.magic-type-header:hover {
    background: rgba(0, 0, 0, 0.08);
    transform: scale(1.08);
}

.magic-type-header:active {
    transform: scale(0.94);
}

.magic-type-icon {
    width: 14px;
    height: 14px;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
}

.magic-type-icon::before {
    font-size: 12px;
    line-height: 1;
}

.magic-type-label {
    font-size: 12px;
    color: #6b7280;
    white-space: nowrap;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    margin: 0 2px;
}

.magic-chevron {
    font-size: 10px;
    transform: rotate(180deg);
    transition: transform 0.2s ease;
}

.magic-chevron.rotated {
    transform: rotate(0deg);
}

/* Dropdown ouverte vers le haut : pas de conteneur, chaque option est une bulle
   indépendante empilée, façon suggestions de chat */
.magic-dropdown {
    position: absolute;
    bottom: calc(100% + 6px);
    left: 0;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
    z-index: 1001;
}

.magic-dropdown-option {
    display: flex;
    flex-direction: row;
    align-items: center;
    gap: 7px;
    width: fit-content;
    padding: 6px 14px;
    border-radius: 999px;
    background: rgba(122, 124, 130, 0.88);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    font-size: 13px;
    color: white;
    cursor: pointer;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    transition:
        background 0.2s ease,
        transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    animation: magic-bubble-in 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.magic-dropdown-option:hover {
    background: rgba(100, 102, 108, 0.92);
    transform: scale(1.04);
}

.magic-dropdown-option:active {
    transform: scale(0.97);
}

.magic-dropdown-option .magic-type-icon {
    color: white;
}

.magic-dropdown-option span {
    white-space: nowrap;
}

@keyframes magic-bubble-in {
    from {
        opacity: 0;
        transform: translateY(8px) scale(0.85);
    }
    to {
        opacity: 1;
        transform: translateY(0) scale(1);
    }
}

/* Chips accepter / refuser au-dessus de la pill (centrées comme elle) */
.magic-proposal-actions {
    display: flex;
    justify-content: center;
    gap: 6px;
}

.magic-chip {
    display: flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 999px;
    font-size: 12px;
    font-weight: 500;
    cursor: pointer;
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    transition:
        transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1),
        background 0.2s ease,
        box-shadow 0.2s ease;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.magic-chip:hover {
    transform: translateY(-2px) scale(1.03);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.magic-chip:active {
    transform: translateY(0) scale(0.97);
}

.magic-reject {
    background: rgba(244, 244, 245, 0.6);
    color: #6b7280;
}

.magic-reject:hover {
    background: rgba(228, 228, 231, 0.8);
}

.magic-accept {
    background: var(--primary-color, #007bff);
    color: white;
}

.magic-accept:hover {
    background: var(--primary-color-hover, #007bff);
}

/* Spinner de chargement */
.magic-spinner {
    width: 14px;
    height: 14px;
    margin: 6px;
    flex-shrink: 0;
    border: 2px solid rgba(0, 0, 0, 0.08);
    border-top: 2px solid var(--magic-submit-color, var(--primary-color, #007bff));
    border-radius: 50%;
    animation: magic-spin 1s linear infinite;
}

@keyframes magic-spin {
    0% {
        transform: rotate(0deg);
    }

    100% {
        transform: rotate(360deg);
    }
}

/* Check de succès */
.magic-success {
    margin: 5px 7px;
    color: var(--primary-color, #007bff);
    animation: magic-success-pop 300ms ease-out;
}

@keyframes magic-success-pop {
    0% {
        transform: scale(0.8);
        opacity: 0;
    }
    100% {
        transform: scale(1);
        opacity: 1;
    }
}

/* Transition d'apparition des chips */
.magic-fade-enter-active,
.magic-fade-leave-active {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.magic-fade-enter-from,
.magic-fade-leave-to {
    opacity: 0;
    transform: translateY(6px) scale(0.96);
}

/* Transition d'ouverture de la dropdown, ancrée en bas à gauche */
.magic-pop-enter-active {
    transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    transform-origin: bottom left;
}

.magic-pop-leave-active {
    transition: all 0.15s ease-in;
    transform-origin: bottom left;
}

.magic-pop-enter-from,
.magic-pop-leave-to {
    opacity: 0;
    transform: translateY(6px) scale(0.9);
}
</style>
