<template>
    <div class="bubble-menu">
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
    },
    methods: {
        setLink() {
            const url = window.prompt('URL:')
            if (url) {
                this.richEditor.chain().focus().setLink({ href: url }).run()
            }
        },
    },
};
</script>

<style lang="scss" scoped>
.bubble-menu {
    display: flex;
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
    padding: 4px;
    gap: 2px;
    z-index: 1000;
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