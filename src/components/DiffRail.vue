<template>
    <!-- Réglette des modifications : carte verticale du document affichée le
         long du bord droit de la zone de texte pendant une comparaison de
         versions. Un rectangle par ligne modifiée, à sa position relative dans
         le document (bicolore quand ajouts et retraits s'y côtoient). La
         position dans le document est déjà donnée par la barre de défilement
         native : la réglette ne montre que les modifications.
         Positionnement en `fixed` (coordonnées viewport) : jamais rognée par
         le scroll interne de l'éditeur ni par un conteneur en overflow. -->
    <div v-if="visible" class="ww-diff-rail" :style="railStyle">
        <button
            v-for="mark in marks"
            :key="mark.key"
            type="button"
            class="ww-diff-rail__mark"
            :style="mark.style"
            :title="mark.label"
            @click="scrollToMark(mark)"
        ></button>
    </div>
</template>

<script>
const RAIL_WIDTH = 10; // largeur des rectangles
const MARK_HEIGHT = 3; // hauteur d'un repère de ligne (doit suivre la valeur CSS)
const RAIL_INSET = 4; // écart entre la réglette et le bord droit de l'éditeur
const LINE_OVERLAP = 2; // px de chevauchement vertical à partir duquel deux fragments sont sur la même ligne
const LINE_MERGE = 1; // px entre deux repères projetés en deçà desquels ils n'en font qu'un

// Teintes sobres, dans l'esprit des indicateurs de diff GitHub
const DEFAULT_COLORS = { removed: '#cf222e', added: '#1a7f37' };

/**
 * Couleur du bloc. En mode « couleurs par auteur », elle est reprise du fond
 * appliqué au passage modifié (translucide dans le texte, plein ici) ; sinon
 * les deux teintes sobres ci-dessus, indépendantes du surlignage du texte.
 */
function markColor(el, type, colorMode) {
    if (colorMode === 'author') {
        const match = /^rgba?\(([^)]+)\)/.exec(el.style?.backgroundColor || '');
        if (match) {
            const [r, g, b] = match[1].split(',').map(part => parseFloat(part));
            if ([r, g, b].every(Number.isFinite)) return `rgb(${r}, ${g}, ${b})`;
        }
    }
    return DEFAULT_COLORS[type] || DEFAULT_COLORS.added;
}

/**
 * Fond du rectangle : la teinte de la nature du changement, ou les deux
 * moitiés (ajout à gauche, retrait à droite) quand la zone porte les deux.
 */
function bandBackground(colors) {
    const { added, removed } = colors;
    if (added && removed) return `linear-gradient(90deg, ${added} 0 50%, ${removed} 50% 100%)`;
    return added || removed || DEFAULT_COLORS.added;
}

/**
 * Rectangles ligne à ligne du contenu d'un élément : un passage modifié qui
 * court sur trois lignes en donne trois, comme les lignes d'un diff. Le
 * rectangle du bloc sert de repli (élément sans contenu sélectionnable).
 */
function lineRects(el) {
    try {
        const range = el.ownerDocument.createRange();
        range.selectNodeContents(el);
        const rects = Array.from(range.getClientRects()).filter(r => r.height > 0 && r.width > 0);
        if (rects.length) return rects;
    } catch {
        // Contenu non sélectionnable (nœud atomique) : repli ci-dessous
    }
    const rect = el.getBoundingClientRect();
    return rect.height ? [rect] : [];
}

export default {
    name: 'DiffRail',
    props: {
        editor: { type: Object, required: true },
        // Vrai pendant un aperçu/comparaison de version : hors de ce mode la
        // réglette n'a rien à montrer et ne mesure rien.
        active: { type: Boolean, default: false },
        // 'default' (teintes ajouté/retiré) ou 'author' (teinte par auteur)
        colorMode: { type: String, default: 'default' },
    },
    data() {
        return {
            rail: null, // { top, left, height } en coordonnées viewport
            marks: [],
        };
    },
    computed: {
        // Présente pendant tout le mode versionnage, même sans modification :
        // une réglette vide dit « rien à voir ailleurs », son apparition et sa
        // disparition ne dépendent pas du contenu du diff.
        visible() {
            return this.active && !!this.rail;
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
            this.marksDirty = true;
            this.$nextTick(this.scheduleMeasure);
        },
        // L'éditeur est recréé au rechargement du composant : les écouteurs
        // suivent la nouvelle instance
        editor() {
            this.detachListeners();
            this.rail = null;
            this.marks = [];
            this.marksDirty = true;
            this.attachListeners();
            this.$nextTick(this.scheduleMeasure);
        },
    },
    created() {
        // Hors data : ces champs pilotent le recalcul, ils ne sont pas rendus
        this.marksDirty = true;
        this.marksSignature = '';
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
            this.onDocChange = () => {
                this.marksDirty = true;
                this.scheduleMeasure();
            };
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
            this.editor.on('transaction', this.onDocChange);
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
            if (this.onDocChange) this.editor?.off?.('transaction', this.onDocChange);
            this.onDocChange = null;
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
                this.marksSignature = '';
                return;
            }

            const rect = dom.getBoundingClientRect();
            this.rail = { top: rect.top, left: rect.right - RAIL_INSET - RAIL_WIDTH, height: rect.height };

            // Les repères sont exprimés en px dans la réglette : le défilement
            // ne les déplace pas, seule la géométrie ci-dessus change. On ne
            // remesure les lignes qu'au changement de contenu ou de gabarit
            // (la largeur commande les retours à la ligne).
            const signature = `${dom.scrollHeight}|${Math.round(rect.height)}|${Math.round(rect.width)}|${this.colorMode}`;
            if (!this.marksDirty && signature === this.marksSignature) return;
            this.marksSignature = signature;
            this.marksDirty = false;
            this.marks = this.buildMarks(dom, rect);
        },

        // Un repère par ligne de texte modifiée, projeté sur la hauteur de la
        // réglette : trois lignes changées = trois traits.
        buildMarks(dom, rect) {
            const total = Math.max(dom.scrollHeight, 1);
            const scale = rect.height / total;

            const lines = [];
            for (const el of dom.querySelectorAll('[data-ychange-type]')) {
                // Un ancêtre déjà annoté (nœud entier ajouté/retiré) porte le repère
                if (el.parentElement?.closest('[data-ychange-type]')) continue;
                const type = el.getAttribute('data-ychange-type');
                const color = markColor(el, type, this.colorMode);
                const label = el.getAttribute('data-ychange-label') || '';
                for (const lineRect of lineRects(el)) {
                    lines.push({
                        top: lineRect.top - rect.top + dom.scrollTop,
                        bottom: lineRect.bottom - rect.top + dom.scrollTop,
                        type,
                        color,
                        label,
                    });
                }
            }
            lines.sort((a, b) => a.top - b.top);

            // Fragments qui se chevauchent = même ligne de texte : un ajout et
            // un retrait sur la même ligne donnent un repère bicolore
            const rows = [];
            let row = null;
            for (const line of lines) {
                if (row && line.top < row.bottom - LINE_OVERLAP) {
                    row.bottom = Math.max(row.bottom, line.bottom);
                    row.colors[line.type] = row.colors[line.type] || line.color;
                    if (line.label && !row.labels.includes(line.label)) row.labels.push(line.label);
                    continue;
                }
                row = {
                    top: line.top,
                    bottom: line.bottom,
                    colors: { [line.type]: line.color },
                    labels: line.label ? [line.label] : [],
                };
                rows.push(row);
            }

            const maxTop = Math.max(rect.height - MARK_HEIGHT, 0);
            const marks = [];
            let mark = null;
            for (const current of rows) {
                const key = Object.keys(current.colors).sort().join('+');
                let top = Math.min(Math.max(((current.top + current.bottom) / 2) * scale - MARK_HEIGHT / 2, 0), maxTop);
                if (mark) {
                    // Document long : des lignes voisines se projettent au même
                    // endroit — un bloc continu plutôt que des traits empilés
                    if (mark.colorKey === key && top <= mark.bottom + LINE_MERGE) {
                        mark.bottom = Math.max(mark.bottom, top + MARK_HEIGHT);
                        continue;
                    }
                    // Natures différentes : les repères restent distincts
                    top = Math.min(Math.max(top, mark.bottom), maxTop);
                }
                mark = {
                    top,
                    bottom: top + MARK_HEIGHT,
                    colorKey: key,
                    colors: current.colors,
                    labels: current.labels,
                    offset: current.top,
                };
                marks.push(mark);
            }

            return marks.map((item, key) => ({
                key,
                offset: item.offset,
                label: item.labels.join(' · '),
                style: {
                    top: `${item.top}px`,
                    height: `${item.bottom - item.top}px`,
                    background: bandBackground(item.colors),
                },
            }));
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
/* Réglette réduite à ses repères : ni piste, ni curseur de défilement —
   la barre de défilement native tient déjà ce rôle. */
.ww-diff-rail {
    position: fixed;
    pointer-events: none;
    z-index: 20;
    animation: ww-diff-rail-in 0.18s ease both;
}

/* Repères alignés sur le bord droit, débordant vers le texte ; ils
   s'allongent au survol plutôt que de s'épaissir. */
.ww-diff-rail__mark {
    position: absolute;
    right: 0;
    width: 100%;
    /* Hauteur réelle posée en style inline : un trait par ligne modifiée,
       ou un bloc continu quand elles se rejoignent à l'échelle de la réglette */
    min-height: 3px;
    padding: 0;
    border: none;
    border-radius: 2px;
    opacity: 0.85;
    cursor: pointer;
    pointer-events: auto;
    transition: width 0.14s ease, opacity 0.14s ease, box-shadow 0.14s ease;
}

/* Zone d'accroche plus large que le repère, sans l'épaissir visuellement */
.ww-diff-rail__mark::before {
    content: '';
    position: absolute;
    inset: -4px -6px;
}

.ww-diff-rail__mark:hover,
.ww-diff-rail__mark:focus-visible {
    width: 170%;
    opacity: 1;
    outline: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.16);
}

@keyframes ww-diff-rail-in {
    from {
        opacity: 0;
        transform: translateX(3px);
    }
    to {
        opacity: 1;
        transform: none;
    }
}

@media (prefers-reduced-motion: reduce) {
    .ww-diff-rail {
        animation: none;
    }

    .ww-diff-rail__mark {
        transition: none;
    }
}
</style>
