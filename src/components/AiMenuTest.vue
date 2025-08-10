<template>
    <div 
        class="bubble-menu" 
        v-show="isVisible"
        :class="{ 'has-focus': hasFocus }"
    >
        <!-- Input pour les prompts AI -->
        <div class="ai-input-container">
            <input
                v-model="aiPrompt"
                type="text"
                placeholder="Entrez votre prompt AI..."
                class="ai-input"
                @keyup.enter="submitPrompt"
                @focus="onInputFocus"
                @blur="onInputBlur"
            />
            <button
                @click="submitPrompt"
                class="ai-submit-button"
                title="Envoyer le prompt"
            >
                <i class="fas fa-magic"></i>
            </button>
        </div>
        
        <!-- Séparateur -->
        <div class="separator"></div>
        
        <!-- Bouton Gras -->
        <button
            class="bubble-menu__button"
            :class="{ 'is-active': richEditor.isActive('bold') }"
            @click="richEditor.chain().focus().toggleBold().run()"
            title="Gras"
        >
            <i class="fas fa-bold"></i>
        </button>
        <!-- Bouton Italique -->
        <button
            class="bubble-menu__button"
            :class="{ 'is-active': richEditor.isActive('italic') }"
            @click="richEditor.chain().focus().toggleItalic().run()"
            title="Italique"
        >
            <i class="fas fa-italic"></i>
        </button>
        <!-- Bouton Souligné -->
        <button
            class="bubble-menu__button"
            :class="{ 'is-active': richEditor.isActive('underline') }"
            @click="richEditor.chain().focus().toggleUnderline().run()"
            title="Souligné"
        >
            <i class="fas fa-underline"></i>
        </button>
        <!-- Bouton Barré -->
        <button
            class="bubble-menu__button"
            :class="{ 'is-active': richEditor.isActive('strike') }"
            @click="richEditor.chain().focus().toggleStrike().run()"
            title="Barré"
        >
            <i class="fas fa-strikethrough"></i>
        </button>
        <!-- Bouton Lien -->
        <button
            class="bubble-menu__button"
            :class="{ 'is-active': richEditor.isActive('link') }"
            @click="setLink"
            title="Lien"
        >
            <i class="fas fa-link"></i>
        </button>
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
        hasSelection: {
            type: Boolean,
            default: false,
        },
        selectedText: {
            type: String,
            default: '',
        },
    },
    data() {
        return {
            aiPrompt: '',
            isVisible: false,
            hasFocus: false,
        };
    },
    watch: {
        hasSelection(newValue) {
            if (newValue) {
                this.isVisible = true;
                this.maintainSelection();
            } else if (!this.hasFocus) {
                this.isVisible = false;
                this.clearSelectionHighlight();
            }
        },
        hasFocus(newValue) {
            if (!newValue && !this.hasSelection) {
                this.isVisible = false;
                this.clearSelectionHighlight();
            }
        },
    },
    methods: {
        setLink() {
            const url = window.prompt('URL:')
            if (url) {
                this.richEditor.chain().focus().setLink({ href: url }).run()
            }
        },
        submitPrompt() {
            if (this.aiPrompt.trim()) {
                // Déclencher l'événement WeWeb pour le prompt AI
                this.$wwTriggerEvent('ai-prompt-submitted', {
                    prompt: this.aiPrompt.trim(),
                    selection: this.selectedText || null
                });
                
                // Vider l'input
                this.aiPrompt = '';
            }
        },
        onInputFocus() {
            this.hasFocus = true;
            this.maintainSelection();
        },
        onInputBlur() {
            this.hasFocus = false;
        },
        maintainSelection() {
            if (this.hasSelection && this.richEditor) {
                // Maintenir la sélection active en ajoutant une classe au parent
                const parentElement = this.richEditor.view.dom.closest('.ww-rich-text');
                if (parentElement) {
                    parentElement.classList.add('has-ai-menu-open');
                }
            }
        },
        clearSelectionHighlight() {
            if (this.richEditor) {
                const parentElement = this.richEditor.view.dom.closest('.ww-rich-text');
                if (parentElement) {
                    parentElement.classList.remove('has-ai-menu-open');
                }
            }
        },
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
    padding: 8px;
    gap: 8px;
    z-index: 1000;
    min-width: 280px;

    &.has-focus {
        border-color: #3b82f6;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
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