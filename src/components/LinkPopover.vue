<template>
    <transition name="link-popover">
        <div v-if="isVisible && linkUrl" class="link-popover" :style="popoverStyle" ref="popover">
            <div class="link-popover__content">
                <a
                    :href="linkUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="link-popover__url"
                    @click.prevent="openLink"
                >
                    {{ truncatedUrl }}
                </a>
                <div class="link-popover__actions">
                    <button type="button" class="link-popover__button" @click="editLink" title="Modifier le lien">
                        <i class="fas fa-pen"></i>
                    </button>
                    <button
                        type="button"
                        class="link-popover__button link-popover__button--danger"
                        @click="removeLink"
                        title="Supprimer le lien"
                    >
                        <i class="fas fa-unlink"></i>
                    </button>
                </div>
            </div>
            <div class="link-popover__hint">{{ modifierKey }} + Clic pour ouvrir</div>
        </div>
    </transition>
</template>

<script>
export default {
    name: 'LinkPopover',
    props: {
        editor: {
            type: Object,
            required: true,
        },
        maxUrlLength: {
            type: Number,
            default: 40,
        },
    },
    data() {
        return {
            isVisible: false,
            linkUrl: null,
            linkElement: null,
            popoverPosition: { top: 0, left: 0 },
        };
    },
    computed: {
        truncatedUrl() {
            if (!this.linkUrl) return '';
            if (this.linkUrl.length <= this.maxUrlLength) return this.linkUrl;
            return this.linkUrl.substring(0, this.maxUrlLength) + '...';
        },
        modifierKey() {
            return navigator.userAgent.includes('Mac') ? 'Cmd' : 'Ctrl';
        },
        popoverStyle() {
            return {
                top: `${this.popoverPosition.top}px`,
                left: `${this.popoverPosition.left}px`,
            };
        },
    },
    mounted() {
        if (this.editor) {
            this.editor.on('selectionUpdate', this.handleSelectionUpdate);
            this.editor.on('blur', this.handleBlur);

            // On écoute le scroll sur absolument TOUT (grâce au paramètre true)
            window.addEventListener('scroll', this.handleScroll, true);

            // On écoute les changements de contenu (ex: ajout de ligne au-dessus)
            this.editor.on('transaction', this.handleScroll);
        }
        document.addEventListener('mousedown', this.handleClickOutside);
    },

    beforeUnmount() {
        if (this.editor) {
            this.editor.off('selectionUpdate', this.handleSelectionUpdate);
            this.editor.off('blur', this.handleBlur);
            this.editor.off('transaction', this.handleScroll);
        }
        // Nettoyage impératif des événements globaux
        window.removeEventListener('scroll', this.handleScroll, true);
        document.removeEventListener('mousedown', this.handleClickOutside);
    },
    methods: {
        handleScroll() {
            if (this.isVisible) {
                // requestAnimationFrame garantit que le calcul se fait en synchro avec l'écran
                window.requestAnimationFrame(() => {
                    this.updatePosition();
                });
            }
        },
        handleSelectionUpdate() {
            if (this.editor.isActive('link')) {
                const { href } = this.editor.getAttributes('link');
                this.linkUrl = href;

                // 1. On l'affiche d'abord (invisible mais présent dans le DOM)
                this.isVisible = true;

                // 2. On attend le prochain "tick" pour calculer la position avec les dimensions réelles
                this.$nextTick(() => {
                    this.updatePosition();
                });
            } else {
                this.isVisible = false;
                this.linkUrl = null;
            }
        },
        handleBlur() {
            // Petit délai pour permettre les clics sur le popover
            setTimeout(() => {
                if (!this.$refs.popover?.contains(document.activeElement)) {
                    this.isVisible = false;
                }
            }, 150);
        },
        handleClickOutside(event) {
            if (this.$refs.popover && !this.$refs.popover.contains(event.target)) {
                // Vérifier si le clic est dans l'éditeur sur un lien
                const clickedLink = event.target.closest('a');
                if (!clickedLink || !this.editor.view.dom.contains(clickedLink)) {
                    this.isVisible = false;
                }
            }
        },
        updatePosition() {
            if (!this.isVisible || !this.$refs.popover) return;

            const { view } = this.editor;
            const { from } = view.state.selection;

            try {
                const coords = view.coordsAtPos(from);
                const popover = this.$refs.popover;
                const popoverHeight = popover.offsetHeight;

                // On calcule la position finale
                const finalTop = coords.top - popoverHeight - 10;
                const finalLeft = coords.left;

                // On applique DIRECTEMENT au DOM pour une fluidité maximale
                popover.style.top = `${finalTop}px`;
                popover.style.left = `${finalLeft}px`;

                // On met aussi à jour la data pour la cohérence Vue
                this.popoverPosition = { top: finalTop, left: finalLeft };
            } catch (e) {
                // Au cas où la sélection Tiptap est temporairement perdue
            }
        },
        openLink() {
            if (this.linkUrl) {
                window.open(this.linkUrl, '_blank', 'noopener,noreferrer');
            }
        },
        editLink() {
            const newUrl = window.prompt('Modifier le lien:', this.linkUrl);

            if (newUrl === null) return; // Annulé

            if (newUrl === '') {
                // URL vide = supprimer le lien
                this.removeLink();
                return;
            }

            // Mettre à jour le lien
            this.editor.chain().focus().extendMarkRange('link').setLink({ href: newUrl }).run();

            this.linkUrl = newUrl;
        },
        removeLink() {
            this.editor.chain().focus().extendMarkRange('link').unsetLink().run();

            this.isVisible = false;
            this.linkUrl = null;
        },
    },
};
</script>

<style scoped>
.link-popover-enter-active,
.link-popover-leave-active {
    transition: all 0.15s ease;
}

.link-popover-enter-from,
.link-popover-leave-to {
    opacity: 0;
    transform: translateY(-4px);
}

.link-popover {
    position: fixed;
    z-index: 1000;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    padding: 8px 12px;
    min-width: 200px;
    max-width: 400px;
    transform: none;
    max-width: 90vw;
}

.link-popover__content {
    display: flex;
    align-items: center;
    gap: 8px;
}

.link-popover__url {
    flex: 1;
    color: var(--a-color, #007bff);
    text-decoration: none;
    font-size: 13px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.link-popover__url:hover {
    text-decoration: underline;
}

.link-popover__actions {
    display: flex;
    gap: 4px;
    flex-shrink: 0;
}

.link-popover__button {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border: none;
    border-radius: 6px;
    background: #f5f5f5;
    color: #666;
    cursor: pointer;
    transition: all 0.15s ease;
}

.link-popover__button:hover {
    background: #e8e8e8;
    color: #333;
}

.link-popover__button--danger:hover {
    background: #fee;
    color: #d00;
}

.link-popover__hint {
    margin-top: 6px;
    font-size: 11px;
    color: #999;
}
</style>
