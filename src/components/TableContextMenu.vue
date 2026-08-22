<template>
    <div
        v-if="isOpen"
        ref="menu"
        class="table-menu"
        :style="style"
        @mousedown.prevent
        @contextmenu.prevent
    >
        <template v-for="(item, index) in items">
            <div v-if="item.separator" :key="`sep-${index}`" class="table-menu__separator"></div>
            <button
                v-else
                :key="item.key"
                type="button"
                class="table-menu__item"
                :class="{ '-danger': item.danger }"
                :disabled="item.disabled"
                @click="run(item)"
            >
                <i class="table-menu__icon" :class="item.icon"></i>
                <span>{{ item.label }}</span>
            </button>
        </template>
    </div>
</template>

<script>
import { computePosition, flip, shift, offset } from '@floating-ui/dom';
import { TextSelection } from '@tiptap/pm/state';
import { CellSelection } from '@tiptap/pm/tables';

// `axis` restreint l'action à un sens du tableau : une sélection de colonne ne
// peut ni supprimer une ligne (prosemirror-tables refuse : toutes les lignes
// sont sélectionnées) ni basculer la ligne d'en-tête, et inversement.
const ACTIONS = [
    { key: 'addRowBefore', axis: 'row', label: 'Insérer une ligne au-dessus', icon: 'fas fa-arrow-up' },
    { key: 'addRowAfter', axis: 'row', label: 'Insérer une ligne en dessous', icon: 'fas fa-arrow-down' },
    { key: 'addColumnBefore', axis: 'col', label: 'Insérer une colonne à gauche', icon: 'fas fa-arrow-left' },
    { key: 'addColumnAfter', axis: 'col', label: 'Insérer une colonne à droite', icon: 'fas fa-arrow-right' },
    { separator: true },
    { key: 'deleteRow', axis: 'row', label: 'Supprimer la ligne', icon: 'fas fa-minus' },
    { key: 'deleteColumn', axis: 'col', label: 'Supprimer la colonne', icon: 'fas fa-minus' },
    { separator: true },
    { key: 'toggleHeaderRow', axis: 'row', label: "Ligne d'en-tête", icon: 'fas fa-heading' },
    { key: 'toggleHeaderColumn', axis: 'col', label: "Colonne d'en-tête", icon: 'fas fa-heading' },
    { key: 'deleteTable', label: 'Supprimer le tableau', icon: 'fas fa-trash', danger: true },
];

/** Sens de la sélection courante : 'row', 'col', ou null (une seule cellule) */
function selectionAxis(selection) {
    if (!(selection instanceof CellSelection)) return null;
    const isColumn = selection.isColSelection();
    const isRow = selection.isRowSelection();
    // Tableau entier sélectionné : aucun sens ne prime, on montre tout.
    if (isColumn === isRow) return null;
    return isColumn ? 'col' : 'row';
}

/** Retire les séparateurs devenus orphelins après filtrage */
function trimSeparators(items) {
    const kept = [];
    for (const item of items) {
        if (item.separator && (!kept.length || kept[kept.length - 1].separator)) continue;
        kept.push(item);
    }
    while (kept.length && kept[kept.length - 1].separator) kept.pop();
    return kept;
}

export default {
    name: 'TableContextMenu',
    props: {
        editor: { type: Object, required: true },
        enabled: { type: Boolean, default: true },
    },
    data() {
        return {
            isOpen: false,
            items: [],
            style: { top: '0px', left: '0px' },
        };
    },
    watch: {
        enabled(value) {
            if (!value) this.close();
        },
    },
    mounted() {
        this.editor.view.dom.addEventListener('contextmenu', this.onContextMenu);
        document.addEventListener('mousedown', this.onDocumentMouseDown, true);
        window.addEventListener('scroll', this.close, true);
        window.addEventListener('resize', this.close);
        window.addEventListener('keydown', this.onKeyDown);
    },
    beforeUnmount() {
        this.editor?.view?.dom?.removeEventListener('contextmenu', this.onContextMenu);
        document.removeEventListener('mousedown', this.onDocumentMouseDown, true);
        window.removeEventListener('scroll', this.close, true);
        window.removeEventListener('resize', this.close);
        window.removeEventListener('keydown', this.onKeyDown);
    },
    methods: {
        onContextMenu(event) {
            if (!this.enabled) return;
            const cell = event.target instanceof Element ? event.target.closest('td, th') : null;
            if (!cell || !this.editor.view.dom.contains(cell)) return;
            event.preventDefault();
            this.focusCell(event);
            this.openAt(event);
        },
        /**
         * Place le curseur dans la cellule cliquée — un clic droit ne déplace pas
         * la sélection de lui-même — sauf si elle fait déjà partie d'une
         * sélection de cellules : les actions doivent alors porter sur tout le bloc.
         */
        focusCell(event) {
            const view = this.editor.view;
            const { state } = view;
            const found = view.posAtCoords({ left: event.clientX, top: event.clientY });
            if (!found) return;
            const selection = state.selection;
            if (selection instanceof CellSelection && found.pos >= selection.from && found.pos <= selection.to) return;
            view.dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(found.pos))));
        },
        /** Ouvre le menu à la position du curseur (appelable depuis les poignées) */
        openAt(event) {
            if (!this.enabled) return;
            const axis = selectionAxis(this.editor.state.selection);
            this.items = trimSeparators(
                ACTIONS.filter(action => !axis || !action.axis || action.axis === axis)
            ).map(action => (action.separator ? action : { ...action, disabled: !this.editor.can()[action.key]() }));
            this.isOpen = true;
            this.$nextTick(() => this.place(event.clientX, event.clientY));
        },
        async place(x, y) {
            const menu = this.$refs.menu;
            if (!menu) return;
            const anchor = {
                getBoundingClientRect: () => ({ width: 0, height: 0, x, y, top: y, left: x, right: x, bottom: y }),
            };
            const { x: left, y: top } = await computePosition(anchor, menu, {
                placement: 'right-start',
                strategy: 'fixed',
                middleware: [offset(2), flip(), shift({ padding: 8 })],
            });
            this.style = { top: `${top}px`, left: `${left}px` };
        },
        run(item) {
            if (item.disabled) return;
            this.editor.chain().focus()[item.key]().run();
            this.close();
        },
        close() {
            this.isOpen = false;
        },
        onDocumentMouseDown(event) {
            if (!this.isOpen) return;
            if (this.$refs.menu?.contains(event.target)) return;
            this.close();
        },
        onKeyDown(event) {
            if (event.key === 'Escape') this.close();
        },
    },
};
</script>

<style scoped>
.table-menu {
    position: fixed;
    z-index: 40;
    min-width: 220px;
    padding: 4px;
    background: white;
    border: 1px solid #e0e0e0;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    flex-direction: column;
}

.table-menu__item {
    display: flex;
    align-items: center;
    gap: 10px;
    width: 100%;
    padding: 6px 10px;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #1f2329;
    font-size: 13px;
    text-align: left;
    cursor: pointer;
}

.table-menu__item:hover:not(:disabled) {
    background: #f2f4f7;
}

.table-menu__item:disabled {
    opacity: 0.4;
    cursor: default;
}

.table-menu__item.-danger {
    color: #d64545;
}

.table-menu__icon {
    width: 14px;
    font-size: 11px;
    text-align: center;
    opacity: 0.7;
}

.table-menu__separator {
    height: 1px;
    margin: 4px 6px;
    background: #ebecf0;
}
</style>
