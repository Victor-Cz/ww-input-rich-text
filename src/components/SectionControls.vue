<template>
    <!-- Racine sans surface : poignée, section tirée et ligne de dépôt sont en
         `fixed` (coordonnées viewport), comme les poignées des tableaux -->
    <div class="section-controls">
        <div v-if="sectionStyle" class="section-controls__section" :style="sectionStyle"></div>

        <button
            v-if="handleStyle"
            type="button"
            class="section-controls__handle"
            :class="{ '-active': !!drag }"
            :style="handleStyle"
            :aria-label="label"
            @mousedown.prevent="startDrag"
            @mouseenter="cancelHide"
            @mouseleave="scheduleHide"
        >
            <svg viewBox="0 0 10 16" width="10" height="16" aria-hidden="true">
                <circle cx="2.5" cy="3" r="1.4" />
                <circle cx="7.5" cy="3" r="1.4" />
                <circle cx="2.5" cy="8" r="1.4" />
                <circle cx="7.5" cy="8" r="1.4" />
                <circle cx="2.5" cy="13" r="1.4" />
                <circle cx="7.5" cy="13" r="1.4" />
            </svg>
        </button>

        <div v-if="dropStyle" class="section-controls__drop" :style="dropStyle"></div>
    </div>
</template>

<script>
// Poignée des sections du plan de l'article (cf. extensions/Sections) : au
// survol d'un H2 ou d'un H3, une poignée à sa gauche ; la glisser déplace la
// section en bloc (le H2 avec ses sous-sections, le H3 avec son texte). Un H2
// se pose entre les sections H2, un H3 entre les sous-sections, d'un H2 à
// l'autre aussi (utils/sections). Pas d'infobulle. Mesures de mise en page
// seulement quand le titre survolé change, au défilement, au redimensionnement
// et quand le document change, jamais à chaque mouvement de la souris.
import { currentLang } from '../i18n/lang.js';
import { applySectionMove } from '../extensions/Sections.js';
import { dropTargets, nearestTarget, sectionStartingAt } from '../utils/sections.js';

const HANDLE_WIDTH = 18;
const HANDLE_HEIGHT = 24;
const HANDLE_GAP = 6; // entre la poignée et le titre
const DRAG_THRESHOLD = 4; // px avant de considérer que l'on déplace (vs. simple clic)
const HIDE_DELAY = 150; // laisse le temps d'atteindre la poignée depuis le titre

export default {
    name: 'SectionControls',
    props: {
        editor: { type: Object, required: true },
    },
    data() {
        return {
            headingEl: null,
            handle: null, // { top, left } de la poignée
            drag: null,
        };
    },
    computed: {
        label() {
            return currentLang() === 'fr' ? 'Déplacer la section' : 'Move section';
        },
        handleStyle() {
            if (!this.handle) return null;
            return {
                top: `${this.handle.top}px`,
                left: `${this.handle.left}px`,
                width: `${HANDLE_WIDTH}px`,
                height: `${HANDLE_HEIGHT}px`,
            };
        },
        // La section tirée, en fond discret
        sectionStyle() {
            const drag = this.drag;
            if (!drag?.active || !drag.box || !drag.column) return null;
            return {
                top: `${drag.box.top - 4}px`,
                left: `${drag.column.left - 8}px`,
                width: `${drag.column.right - drag.column.left + 16}px`,
                height: `${drag.box.bottom - drag.box.top + 8}px`,
            };
        },
        // La ligne où la section sera posée (rien quand elle ne bougerait pas)
        dropStyle() {
            const drag = this.drag;
            if (!drag?.active || drag.target == null || !drag.section || !drag.column) return null;
            if (drag.target >= drag.section.from && drag.target <= drag.section.to) return null;
            const point = drag.points.find(item => item.pos === drag.target);
            if (!point) return null;
            return {
                top: `${point.y - 1}px`,
                left: `${drag.column.left}px`,
                width: `${drag.column.right - drag.column.left}px`,
            };
        },
    },
    watch: {
        // Éditeur rechargé (loadEditor) : le composant reste, les écouteurs changent d'éditeur
        editor(next, previous) {
            this.stopDrag();
            this.hide();
            this.detach(previous);
            this.attach(next);
        },
    },
    mounted() {
        this.attach(this.editor);
        window.addEventListener('scroll', this.onScroll, true);
        window.addEventListener('resize', this.onViewportChange);
    },
    beforeUnmount() {
        this.detach(this.editor);
        window.removeEventListener('scroll', this.onScroll, true);
        window.removeEventListener('resize', this.onViewportChange);
        this.stopDrag();
        clearTimeout(this.hideTimer);
        cancelAnimationFrame(this.measureFrame);
    },
    methods: {
        attach(editor) {
            const dom = editor?.view?.dom;
            if (!dom) return;
            dom.addEventListener('mousemove', this.onEditorMove);
            dom.addEventListener('mouseleave', this.scheduleHide);
            editor.on('update', this.onViewportChange);
        },
        detach(editor) {
            editor?.view?.dom?.removeEventListener('mousemove', this.onEditorMove);
            editor?.view?.dom?.removeEventListener('mouseleave', this.scheduleHide);
            editor?.off?.('update', this.onViewportChange);
        },

        /* Survol */

        onEditorMove(event) {
            if (this.drag) return;
            if (!this.editor.isEditable) {
                this.hide();
                return;
            }
            const heading = event.target instanceof Element ? event.target.closest('h2, h3') : null;
            // Seuls les titres de premier niveau ouvrent une section
            if (!heading || heading.parentElement !== this.editor.view.dom) {
                this.scheduleHide();
                return;
            }
            this.cancelHide();
            if (heading === this.headingEl && this.handle) return;
            this.headingEl = heading;
            this.measureHandle();
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
            this.headingEl = null;
            this.handle = null;
        },

        /* Géométrie (coordonnées viewport) */

        // Au défilement, la souris quitte le titre : la poignée s'en va (elle
        // suit la section pendant un glisser)
        onScroll() {
            if (this.drag?.active) this.onViewportChange();
            else if (!this.drag) this.hide();
        },
        onViewportChange() {
            if (!this.headingEl && !this.drag) return;
            cancelAnimationFrame(this.measureFrame);
            this.measureFrame = requestAnimationFrame(() => {
                if (this.drag?.active) this.measureDrag();
                else this.measureHandle();
            });
        },
        // Poignée centrée sur la première ligne du titre
        measureHandle() {
            const heading = this.headingEl;
            if (!heading?.isConnected) {
                this.hide();
                return;
            }
            const rect = heading.getBoundingClientRect();
            const style = getComputedStyle(heading);
            const lineHeight = parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.2 || HANDLE_HEIGHT;
            const paddingTop = parseFloat(style.paddingTop) || 0;
            this.handle = {
                top: rect.top + paddingTop + (lineHeight - HANDLE_HEIGHT) / 2,
                left: rect.left - HANDLE_WIDTH - HANDLE_GAP,
            };
        },
        rectAt(pos) {
            const dom = this.editor.view.nodeDOM(pos);
            if (!(dom instanceof Element)) return null;
            const rect = dom.getBoundingClientRect();
            // Bloc masqué (frontmatter) : sans place à l'écran
            return rect.height ? rect : null;
        },
        // Ordonnée d'une cible : entre le bloc qui la précède et celui qui la suit
        targetY(pos) {
            const { doc } = this.editor.state;
            const $pos = doc.resolve(pos);
            const before = $pos.nodeBefore ? this.rectAt(pos - $pos.nodeBefore.nodeSize) : null;
            const after = $pos.nodeAfter ? this.rectAt(pos) : null;
            if (before && after) return (before.bottom + after.top) / 2;
            if (after) return after.top - 4;
            if (before) return before.bottom + 4;
            return null;
        },
        // Section, cibles (avec leur ordonnée) et colonne de texte, relues du document
        measureTargets(heading) {
            const view = this.editor.view;
            if (!heading?.isConnected) return null;
            const $pos = view.state.doc.resolve(view.posAtDOM(heading, 0));
            if ($pos.depth < 1) return null;
            const section = sectionStartingAt(view.state.doc, $pos.before(1));
            if (!section) return null;
            const points = [];
            for (const pos of dropTargets(view.state.doc, section)) {
                const y = this.targetY(pos);
                if (y != null) points.push({ pos, y });
            }
            return { section, points };
        },
        measureDrag() {
            const drag = this.drag;
            if (!drag) return;
            const measured = this.measureTargets(drag.heading);
            if (!measured) {
                this.cancelDrag();
                return;
            }
            const view = this.editor.view;
            const { section, points } = measured;
            const rect = view.dom.getBoundingClientRect();
            const style = getComputedStyle(view.dom);
            const $end = view.state.doc.resolve(section.to);
            const first = this.rectAt(section.from);
            const last = $end.nodeBefore ? this.rectAt(section.to - $end.nodeBefore.nodeSize) : null;
            drag.section = section;
            drag.points = points;
            drag.column = {
                left: rect.left + (parseFloat(style.paddingLeft) || 0),
                right: rect.right - (parseFloat(style.paddingRight) || 0),
            };
            drag.box = first ? { top: first.top, bottom: (last || first).bottom } : null;
            drag.target = nearestTarget(points, drag.y);
        },

        /* Déplacement par glisser-déposer */

        startDrag(event) {
            if (event.button !== 0 || !this.headingEl || !this.editor.isEditable) return;
            this.drag = {
                heading: this.headingEl,
                startX: event.clientX,
                startY: event.clientY,
                y: event.clientY,
                active: false,
                section: null,
                points: [],
                column: null,
                box: null,
                target: null,
            };
            window.addEventListener('mousemove', this.onDragMove);
            window.addEventListener('mouseup', this.onDragEnd);
            window.addEventListener('keydown', this.onDragKey);
        },
        onDragMove(event) {
            const drag = this.drag;
            if (!drag) return;
            drag.y = event.clientY;
            if (!drag.active) {
                const moved = Math.abs(event.clientX - drag.startX) + Math.abs(event.clientY - drag.startY);
                if (moved < DRAG_THRESHOLD) return;
                drag.active = true;
                document.body.classList.add('ww-rich-text-section-dragging');
                this.measureDrag();
                return;
            }
            drag.target = nearestTarget(drag.points, event.clientY);
        },
        onDragKey(event) {
            if (event.key === 'Escape' && this.drag) this.cancelDrag();
        },
        onDragEnd(event) {
            const drag = this.drag;
            this.stopDrag();
            if (!drag?.active) return;
            // Le document a pu changer pendant le glisser (modification d'un
            // autre participant) : section et cibles relues avant de poser
            const measured = this.measureTargets(drag.heading);
            const target = measured && nearestTarget(measured.points, event.clientY);
            this.hide();
            if (target == null || !this.editor.isEditable) return;
            applySectionMove(this.editor, measured.section, target);
            this.editor.view.focus();
        },
        cancelDrag() {
            this.stopDrag();
            this.hide();
        },
        stopDrag() {
            this.drag = null;
            window.removeEventListener('mousemove', this.onDragMove);
            window.removeEventListener('mouseup', this.onDragEnd);
            window.removeEventListener('keydown', this.onDragKey);
            document.body.classList.remove('ww-rich-text-section-dragging');
        },
    },
};
</script>

<style scoped>
.section-controls {
    position: fixed;
    top: 0;
    left: 0;
    width: 0;
    height: 0;
    pointer-events: none;
    z-index: 30;
}

.section-controls__handle {
    position: fixed;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    border: none;
    border-radius: 4px;
    background: transparent;
    color: #a1a1aa;
    cursor: grab;
    pointer-events: auto;
    transition: background-color 0.12s ease, color 0.12s ease;
}

.section-controls__handle svg {
    display: block;
    fill: currentColor;
}

.section-controls__handle:hover,
.section-controls__handle.-active {
    background-color: rgba(0, 0, 0, 0.05);
    color: #61656d;
}

.section-controls__handle.-active {
    cursor: grabbing;
}

.section-controls__section {
    position: fixed;
    border-radius: 8px;
    background-color: rgba(0, 0, 0, 0.04);
    pointer-events: none;
}

.section-controls__drop {
    position: fixed;
    height: 2px;
    border-radius: 2px;
    background: var(--primary-color, #007bff);
    pointer-events: none;
}
</style>
