<template>
    <!-- Réglette des modifications : carte verticale du document affichée le
         long du bord droit de la zone de texte pendant une comparaison de
         versions. Chaque repère marque un passage ajouté/retiré à sa position
         relative dans le document ; la bande claire situe la partie visible.
         Positionnement en `fixed` (coordonnées viewport) : jamais rognée par
         le scroll interne de l'éditeur ni par un conteneur en overflow. -->
    <div v-if="visible" class="ww-diff-rail" :style="railStyle">
        <div v-if="viewport" class="ww-diff-rail__viewport" :style="viewport"></div>
        <button
            v-for="mark in marks"
            :key="mark.key"
            type="button"
            class="ww-diff-rail__mark"
            :style="{ top: mark.top + '%', height: mark.height + '%', backgroundColor: mark.color }"
            :title="mark.label"
            @click="scrollToMark(mark)"
        ></button>
    </div>
</template>

<script>
const RAIL_WIDTH = 4; // épaisseur du trait des repères
const RAIL_INSET = 6; // écart entre la réglette et le bord droit de l'éditeur
const MERGE_GAP = 0.6; // % de hauteur en deçà duquel deux repères fusionnent

const DEFAULT_COLORS = { removed: '#dc2626', added: '#16a34a' };

/**
 * Couleur pleine du repère, dérivée du fond appliqué au passage modifié
 * (translucide dans le texte, opaque sur la réglette). Couvre le mode
 * « couleurs par auteur » sans le rejouer ici.
 */
function markColor(el, type) {
    const match = /^rgba?\(([^)]+)\)/.exec(el.style?.backgroundColor || '');
    if (match) {
        const [r, g, b] = match[1].split(',').map(part => parseFloat(part));
        if ([r, g, b].every(Number.isFinite)) return `rgb(${r}, ${g}, ${b})`;
    }
    return DEFAULT_COLORS[type] || DEFAULT_COLORS.added;
}

export default {
    name: 'DiffRail',
    props: {
        editor: { type: Object, required: true },
        // Vrai pendant un aperçu/comparaison de version : hors de ce mode la
        // réglette n'a rien à montrer et ne mesure rien.
        active: { type: Boolean, default: false },
    },
    data() {
        return {
            rail: null, // { top, left, height } en coordonnées viewport
            marks: [],
            viewport: null, // style de la bande « partie visible », null si tout est visible
        };
    },
    computed: {
        visible() {
            return this.active && !!this.rail && this.marks.length > 0;
        },
        railStyle() {
            if (!this.rail) return null;
            return {
                top: `${this.rail.top}px`,
                left: `${this.rail.left}px`,
                height: `${this.rail.height}px`,
                width: `${RAIL_WIDTH}px`,
            };
        },
    },
    watch: {
        active() {
            this.$nextTick(this.scheduleMeasure);
        },
        // L'éditeur est recréé au rechargement du composant : les écouteurs
        // suivent la nouvelle instance
        editor() {
            this.detachListeners();
            this.rail = null;
            this.marks = [];
            this.attachListeners();
            this.$nextTick(this.scheduleMeasure);
        },
    },
    mounted() {
        this.attachListeners();
        this.scheduleMeasure();
    },
    beforeUnmount() {
        this.detachListeners();
    },
    methods: {
        attachListeners() {
            const dom = this.editor?.view?.dom;
            const document_ = dom?.ownerDocument;
            const win = document_?.defaultView;
            if (!document_ || !win) return;

            this.onViewChange = () => this.scheduleMeasure();
            // Capture : les événements scroll ne remontent pas, mais descendent
            // — un seul écouteur couvre le défilement interne de l'éditeur
            // comme celui de la page ou d'un wrapper intermédiaire.
            document_.addEventListener('scroll', this.onViewChange, { capture: true, passive: true });
            win.addEventListener('resize', this.onViewChange, { passive: true });
            if (win.ResizeObserver) {
                this.resizeObserver = new win.ResizeObserver(this.onViewChange);
                this.resizeObserver.observe(dom);
            }
            // Changement de version affichée : le rendu du diff passe par une
            // transaction ProseMirror
            this.editor.on('transaction', this.onViewChange);
            this.listeners = { document_, win };
        },

        detachListeners() {
            const attached = this.listeners;
            if (attached?.win && this.frame) {
                attached.win.cancelAnimationFrame(this.frame);
                this.frame = null;
            }
            this.resizeObserver?.disconnect();
            this.resizeObserver = null;
            if (this.onViewChange) this.editor?.off?.('transaction', this.onViewChange);
            if (attached && this.onViewChange) {
                attached.document_.removeEventListener('scroll', this.onViewChange, { capture: true });
                attached.win.removeEventListener('resize', this.onViewChange);
            }
            this.onViewChange = null;
            this.listeners = null;
        },

        scheduleMeasure() {
            const win = this.listeners?.win;
            if (!win || this.frame) return;
            // Hors comparaison, rien à mesurer tant qu'il n'y a rien à effacer
            if (!this.active && !this.rail) return;
            this.frame = win.requestAnimationFrame(() => {
                this.frame = null;
                this.measure();
            });
        },

        measure() {
            const dom = this.editor?.view?.dom;
            if (!this.active || !dom || !dom.isConnected) {
                this.rail = null;
                this.marks = [];
                this.viewport = null;
                return;
            }

            const rect = dom.getBoundingClientRect();
            const total = Math.max(dom.scrollHeight, 1);
            this.rail = { top: rect.top, left: rect.right - RAIL_INSET - RAIL_WIDTH, height: rect.height };

            const marks = [];
            let last = null;
            for (const el of dom.querySelectorAll('[data-ychange-type]')) {
                // Un ancêtre déjà annoté (nœud entier ajouté/retiré) porte le repère
                if (el.parentElement?.closest('[data-ychange-type]')) continue;
                const elRect = el.getBoundingClientRect();
                if (!elRect.height) continue;
                const type = el.getAttribute('data-ychange-type');
                const offset = elRect.top - rect.top + dom.scrollTop;
                const top = (offset / total) * 100;
                const height = (elRect.height / total) * 100;
                // Passages voisins de même nature : un seul repère continu
                if (last && last.type === type && top - (last.top + last.height) < MERGE_GAP) {
                    last.height = Math.max(last.height, top + height - last.top);
                    continue;
                }
                last = {
                    key: marks.length,
                    type,
                    top,
                    height,
                    offset,
                    color: markColor(el, type),
                    label: el.getAttribute('data-ychange-label') || '',
                };
                marks.push(last);
            }
            this.marks = marks;

            // Partie du document actuellement visible : scroll interne de
            // l'éditeur et/ou scroll de page, selon ce qui défile réellement
            const winHeight = this.listeners?.win?.innerHeight ?? rect.height;
            const from = dom.scrollTop + Math.max(0, -rect.top);
            const to = dom.scrollTop + Math.min(dom.clientHeight, winHeight - rect.top);
            this.viewport =
                to - from > 0 && to - from < total
                    ? { top: `${(from / total) * 100}%`, height: `${((to - from) / total) * 100}%` }
                    : null;
        },

        // Amène la modification dans le premier tiers de la zone visible
        scrollToMark(mark) {
            const dom = this.editor?.view?.dom;
            if (!dom) return;
            if (dom.scrollHeight > dom.clientHeight + 1) {
                dom.scrollTo({ top: Math.max(mark.offset - dom.clientHeight / 3, 0), behavior: 'smooth' });
                return;
            }
            const win = dom.ownerDocument?.defaultView;
            if (!win) return;
            const delta = dom.getBoundingClientRect().top + mark.offset - win.innerHeight / 3;
            win.scrollBy({ top: delta, behavior: 'smooth' });
        },
    },
};
</script>

<style scoped>
.ww-diff-rail {
    position: fixed;
    border-radius: 2px;
    background: rgba(0, 0, 0, 0.05);
    pointer-events: none;
    z-index: 20;
}

.ww-diff-rail__viewport {
    position: absolute;
    left: 0;
    width: 100%;
    min-height: 6px;
    border-radius: 2px;
    background: rgba(0, 0, 0, 0.1);
}

.ww-diff-rail__mark {
    position: absolute;
    left: 0;
    width: 100%;
    min-height: 4px;
    padding: 0;
    border: none;
    border-radius: 2px;
    opacity: 0.75;
    cursor: pointer;
    pointer-events: auto;
    transition: opacity 0.12s ease;
}

/* Zone d'accroche plus large que le trait, sans l'épaissir visuellement */
.ww-diff-rail__mark::before {
    content: '';
    position: absolute;
    inset: -3px -6px;
}

.ww-diff-rail__mark:hover {
    opacity: 1;
}
</style>
