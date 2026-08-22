<template>
    <!-- Racine sans surface : chaque poignée est positionnée en `fixed`
         (coordonnées viewport) pour ne jamais être rognée par le scroll
         horizontal du tableau ni par un conteneur en overflow. -->
    <div class="table-controls">
        <button
            v-if="columnGripStyle"
            type="button"
            class="table-controls__grip -column"
            :class="{ '-active': isDragging('col') }"
            :style="columnGripStyle"
            title="Glisser pour déplacer la colonne — clic pour la sélectionner"
            @mousedown.prevent="startGrip('col', $event)"
            @mouseenter="cancelHide"
            @mouseleave="scheduleHide"
            @contextmenu.prevent.stop="requestMenu('col', $event)"
        ></button>

        <button
            v-if="rowGripStyle"
            type="button"
            class="table-controls__grip -row"
            :class="{ '-active': isDragging('row') }"
            :style="rowGripStyle"
            title="Glisser pour déplacer la ligne — clic pour la sélectionner"
            @mousedown.prevent="startGrip('row', $event)"
            @mouseenter="cancelHide"
            @mouseleave="scheduleHide"
            @contextmenu.prevent.stop="requestMenu('row', $event)"
        ></button>

        <div v-if="dropStyle" class="table-controls__drop" :style="dropStyle"></div>
    </div>
</template>

<script>
import { CellSelection, TableMap, findTable, moveTableColumn, moveTableRow } from '@tiptap/pm/tables';

const GRIP_THICKNESS = 8; // épaisseur de la poignée
const GRIP_GAP = 3; // écart entre la poignée et le bord du tableau
const DRAG_THRESHOLD = 4; // px avant de considérer que l'on déplace (vs. simple clic)
const HIDE_DELAY = 150; // laisse le temps d'atteindre la poignée depuis le tableau

/** Index de colonne dans la grille (et non dans la liste des cellules) */
function gridColumnOf(cell) {
    let column = 0;
    for (const sibling of cell.parentElement.cells) {
        if (sibling === cell) break;
        column += sibling.colSpan || 1;
    }
    return column;
}

export default {
    name: 'TableControls',
    props: {
        editor: { type: Object, required: true },
        enabled: { type: Boolean, default: true },
    },
    emits: ['contextmenu'],
    data() {
        return {
            tableEl: null,
            hoverColumn: -1,
            hoverRow: -1,
            geometry: null,
            drag: null,
        };
    },
    computed: {
        columnGripStyle() {
            const column = this.geometry?.columns[this.hoverColumn];
            if (!column) return null;
            // Rognage sur la zone visible du wrapper : une colonne sortie du
            // cadre par le scroll horizontal ne doit pas flotter à côté.
            const { wrapper, table } = this.geometry;
            const left = Math.max(column.left, wrapper.left);
            const right = Math.min(column.left + column.width, wrapper.right);
            if (right - left < 6) return null;
            return {
                left: `${left}px`,
                width: `${right - left}px`,
                top: `${table.top - GRIP_GAP - GRIP_THICKNESS}px`,
                height: `${GRIP_THICKNESS}px`,
            };
        },
        rowGripStyle() {
            const row = this.geometry?.rows[this.hoverRow];
            if (!row) return null;
            const { table, wrapper } = this.geometry;
            return {
                top: `${row.top}px`,
                height: `${row.height}px`,
                left: `${Math.max(table.left - GRIP_GAP - GRIP_THICKNESS, wrapper.left - GRIP_THICKNESS)}px`,
                width: `${GRIP_THICKNESS}px`,
            };
        },
        dropStyle() {
            const drag = this.drag;
            if (!drag?.active || !drag.movable || !this.geometry || drag.to === drag.from) return null;
            const { table, wrapper, columns, rows } = this.geometry;
            if (drag.axis === 'col') {
                const column = columns[drag.to];
                if (!column) return null;
                const x = drag.to > drag.from ? column.left + column.width : column.left;
                if (x < wrapper.left || x > wrapper.right) return null;
                return {
                    left: `${x - 1}px`,
                    top: `${table.top - GRIP_GAP - GRIP_THICKNESS}px`,
                    width: '2px',
                    height: `${table.height + GRIP_GAP + GRIP_THICKNESS}px`,
                };
            }
            const row = rows[drag.to];
            if (!row) return null;
            const y = drag.to > drag.from ? row.top + row.height : row.top;
            return {
                top: `${y - 1}px`,
                left: `${table.left - GRIP_GAP - GRIP_THICKNESS}px`,
                height: '2px',
                width: `${table.width + GRIP_GAP + GRIP_THICKNESS}px`,
            };
        },
    },
    watch: {
        enabled(value) {
            if (!value) this.hide();
        },
    },
    mounted() {
        const dom = this.editor.view.dom;
        dom.addEventListener('mousemove', this.onEditorMove);
        dom.addEventListener('mouseleave', this.scheduleHide);
        window.addEventListener('scroll', this.onViewportChange, true);
        window.addEventListener('resize', this.onViewportChange);
        this.editor.on('update', this.onViewportChange);
    },
    beforeUnmount() {
        const dom = this.editor?.view?.dom;
        if (dom) {
            dom.removeEventListener('mousemove', this.onEditorMove);
            dom.removeEventListener('mouseleave', this.scheduleHide);
        }
        window.removeEventListener('scroll', this.onViewportChange, true);
        window.removeEventListener('resize', this.onViewportChange);
        this.editor?.off?.('update', this.onViewportChange);
        this.stopDrag();
        clearTimeout(this.hideTimer);
        cancelAnimationFrame(this.measureFrame);
    },
    methods: {
        isDragging(axis) {
            return this.drag?.axis === axis;
        },

        /* Survol */

        onEditorMove(event) {
            if (this.drag || !this.enabled) return;
            const cell = event.target instanceof Element ? event.target.closest('td, th') : null;
            const table = cell?.closest('table');
            if (!table || !this.editor.view.dom.contains(table)) {
                this.scheduleHide();
                return;
            }
            this.cancelHide();
            const sameTable = this.tableEl === table && this.geometry;
            this.tableEl = table;
            this.hoverRow = cell.parentElement.rowIndex;
            this.hoverColumn = gridColumnOf(cell);
            // Mesurer coûte une lecture de layout par cellule : inutile à chaque
            // mouvement, la géométrie ne bouge qu'au scroll, au resize ou à une
            // modification du document — tous déjà écoutés.
            if (!sameTable) this.measure();
        },
        scheduleHide() {
            if (this.drag) return;
            clearTimeout(this.hideTimer);
            this.hideTimer = setTimeout(this.hide, HIDE_DELAY);
        },
        cancelHide() {
            clearTimeout(this.hideTimer);
        },
        hide() {
            this.tableEl = null;
            this.geometry = null;
            this.hoverColumn = -1;
            this.hoverRow = -1;
        },

        /* Géométrie (coordonnées viewport) */

        onViewportChange() {
            if (!this.tableEl) return;
            cancelAnimationFrame(this.measureFrame);
            this.measureFrame = requestAnimationFrame(this.measure);
        },
        measure() {
            const table = this.tableEl;
            if (!table || !table.isConnected || !table.rows.length) {
                this.hide();
                return;
            }
            const rows = Array.from(table.rows);
            const wrapper = table.closest('.tableWrapper') || table;
            const columns = [];
            for (const cell of rows[0].cells) {
                const rect = cell.getBoundingClientRect();
                const span = cell.colSpan || 1;
                // Une cellule fusionnée couvre plusieurs colonnes de la grille :
                // on répartit sa largeur pour garder des index cohérents.
                for (let i = 0; i < span; i++) {
                    columns.push({ left: rect.left + (rect.width / span) * i, width: rect.width / span });
                }
            }
            this.geometry = {
                table: table.getBoundingClientRect(),
                wrapper: wrapper.getBoundingClientRect(),
                columns,
                rows: rows.map(row => {
                    const rect = row.getBoundingClientRect();
                    return { top: rect.top, height: rect.height };
                }),
                headerRow: Array.from(rows[0].cells).every(cell => cell.tagName === 'TH'),
            };
        },

        /* Sélection ligne / colonne */

        resolveTable() {
            const cell = this.tableEl?.querySelector('td, th');
            if (!cell) return null;
            const pos = this.editor.view.posAtDOM(cell, 0);
            if (pos < 0) return null;
            const found = findTable(this.editor.state.doc.resolve(pos));
            return found ? { node: found.node, start: found.start } : null;
        },
        selectAxis(axis, index) {
            const table = this.resolveTable();
            if (!table || index < 0) return false;
            const map = TableMap.get(table.node);
            if (axis === 'col' ? index >= map.width : index >= map.height) return false;
            const { doc } = this.editor.state;
            const resolve = (row, column) => doc.resolve(table.start + map.positionAt(row, column, table.node));
            const selection =
                axis === 'col'
                    ? CellSelection.colSelection(resolve(0, index), resolve(map.height - 1, index))
                    : CellSelection.rowSelection(resolve(index, 0), resolve(index, map.width - 1));
            this.editor.view.dispatch(this.editor.state.tr.setSelection(selection));
            return true;
        },

        /* Déplacement par glisser-déposer */

        startGrip(axis, event) {
            if (!this.geometry) return;
            const index = axis === 'col' ? this.hoverColumn : this.hoverRow;
            if (!this.selectAxis(axis, index)) return;
            this.drag = {
                axis,
                from: index,
                to: index,
                x: event.clientX,
                y: event.clientY,
                active: false,
                // La ligne d'en-tête reste en tête : ni déplaçable, ni dépassable.
                movable: !(axis === 'row' && index === 0 && this.geometry.headerRow),
            };
            window.addEventListener('mousemove', this.onDragMove);
            window.addEventListener('mouseup', this.onDragEnd);
            window.addEventListener('keydown', this.onDragKey);
            document.body.classList.add('ww-rich-text-table-dragging');
        },
        onDragMove(event) {
            const drag = this.drag;
            if (!drag?.movable) return;
            if (!drag.active) {
                const moved = Math.abs(event.clientX - drag.x) + Math.abs(event.clientY - drag.y);
                if (moved < DRAG_THRESHOLD) return;
                drag.active = true;
            }
            drag.to = this.targetIndex(drag.axis, event);
        },
        targetIndex(axis, event) {
            const { columns, rows, headerRow } = this.geometry;
            if (axis === 'col') {
                const index = columns.findIndex(column => event.clientX < column.left + column.width);
                return index === -1 ? columns.length - 1 : Math.max(index, 0);
            }
            const index = rows.findIndex(row => event.clientY < row.top + row.height);
            return Math.max(index === -1 ? rows.length - 1 : index, headerRow ? 1 : 0);
        },
        onDragKey(event) {
            if (event.key !== 'Escape' || !this.drag) return;
            this.drag.active = false;
            this.onDragEnd();
        },
        onDragEnd() {
            const drag = this.drag;
            this.stopDrag();
            if (!drag || !drag.active || !drag.movable || drag.to === drag.from) return;
            const command =
                drag.axis === 'col'
                    ? moveTableColumn({ from: drag.from, to: drag.to, select: true })
                    : moveTableRow({ from: drag.from, to: drag.to, select: true });
            command(this.editor.state, this.editor.view.dispatch);
            this.editor.view.focus();
            // Le déplacement reconstruit le tableau : on raccroche la poignée à
            // la ligne/colonne déplacée via la sélection que la commande pose.
            this.$nextTick(() => this.syncFromSelection(drag.axis, drag.to));
        },
        syncFromSelection(axis, index) {
            const { node } = this.editor.view.domAtPos(this.editor.state.selection.from);
            const element = node instanceof Element ? node : node?.parentElement;
            const table = element?.closest('table');
            if (!table) {
                this.hide();
                return;
            }
            this.tableEl = table;
            if (axis === 'col') this.hoverColumn = index;
            else this.hoverRow = index;
            this.measure();
        },
        stopDrag() {
            this.drag = null;
            window.removeEventListener('mousemove', this.onDragMove);
            window.removeEventListener('mouseup', this.onDragEnd);
            window.removeEventListener('keydown', this.onDragKey);
            document.body.classList.remove('ww-rich-text-table-dragging');
        },

        /* Menu contextuel : la poignée sélectionne d'abord sa ligne/colonne
           pour que les actions du menu portent bien dessus. */
        requestMenu(axis, event) {
            this.selectAxis(axis, axis === 'col' ? this.hoverColumn : this.hoverRow);
            this.$emit('contextmenu', event);
        },
    },
};
</script>

<style scoped>
.table-controls {
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 30;
}

.table-controls__grip {
    position: fixed;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: var(--table-border-color, #c7c7c7);
    opacity: 0.6;
    cursor: grab;
    pointer-events: auto;
    transition: opacity 0.12s ease, background-color 0.12s ease;
}

.table-controls__grip:hover,
.table-controls__grip.-active {
    background: var(--table-handle-color, #099af2);
    opacity: 1;
}

.table-controls__grip.-active {
    cursor: grabbing;
}

.table-controls__drop {
    position: fixed;
    background: var(--table-handle-color, #099af2);
    border-radius: 2px;
    pointer-events: none;
}
</style>
